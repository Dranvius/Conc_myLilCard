import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ActivityType,
  CompanyStatus,
  LeadSource,
  NotificationType,
  OpportunityStage,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CaptchaService } from '../auth/captcha.service';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';
import { throwPotentialDuplicate } from '../duplicates/potential-duplicate';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentService } from './assignment.service';
import { PublicLeadDto } from './dto/public-lead.dto';

@Injectable()
export class LeadCaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly captchaService: CaptchaService,
    private readonly assignmentService: AssignmentService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  private getNextBusinessDayAtNine() {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    date.setDate(date.getDate() + 1);

    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  }

  async captureLead(input: PublicLeadDto, ipAddress?: string) {
    const captchaValid = await this.captchaService.verifyToken(
      input.captchaToken,
    );
    if (!captchaValid) {
      throw new UnauthorizedException('Captcha validation failed');
    }

    const duplicates =
      await this.duplicateDetectionService.findPublicLeadDuplicates(input);
    if (duplicates.length && !input.allowPotentialDuplicate) {
      throwPotentialDuplicate('el lead publico', duplicates);
    }

    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: input.businessUnitId },
      select: { id: true, name: true },
    });
    if (!businessUnit) {
      throw new BadRequestException('Unidad de negocio invalida');
    }

    const source = input.source ?? LeadSource.WEB_FORM;
    const assignment = await this.assignmentService.assignNextOpportunityOwner({
      businessUnitId: input.businessUnitId,
      leadSource: source,
      city: input.city,
      country: input.country,
      estimatedValue: input.estimatedValue,
      probability: input.estimatedValue ? 25 : 15,
    });
    const followUpDueDate = this.getNextBusinessDayAtNine();

    const result = await this.prisma.$transaction(async (tx) => {
      const existingCompany = input.taxId
        ? await tx.company.findFirst({
            where: {
              taxId: input.taxId,
              deletedAt: null,
            },
          })
        : await tx.company.findFirst({
            where: {
              name: input.companyName,
              businessUnitId: input.businessUnitId,
              deletedAt: null,
            },
          });

      const company =
        existingCompany ??
        (await tx.company.create({
          data: {
            name: input.companyName,
            legalName: input.legalName,
            taxId: input.taxId,
            email: input.email,
            phone: input.phone,
            city: input.city,
            country: input.country,
            businessUnitId: input.businessUnitId,
            status: CompanyStatus.LEAD,
          },
        }));

      const existingContact = await tx.contact.findFirst({
        where: {
          companyId: company.id,
          email: input.email.toLowerCase(),
          deletedAt: null,
        },
      });

      const contact = existingContact
        ? await tx.contact.update({
            where: { id: existingContact.id },
            data: {
              firstName: input.firstName,
              lastName: input.lastName,
              position: input.position ?? existingContact.position,
              phone: input.phone ?? existingContact.phone,
              source: existingContact.source ?? source,
            },
          })
        : await tx.contact.create({
            data: {
              companyId: company.id,
              firstName: input.firstName,
              lastName: input.lastName,
              position: input.position,
              email: input.email.toLowerCase(),
              phone: input.phone,
              source,
            },
          });

      const opportunity = await tx.salesOpportunity.create({
        data: {
          companyId: company.id,
          contactId: contact.id,
          ownerId: assignment.user.id,
          businessUnitId: input.businessUnitId,
          title: input.title,
          stage: OpportunityStage.NEW,
          estimatedValue: input.estimatedValue ?? 0,
          probability: input.estimatedValue ? 25 : 15,
          expectedCloseDate: null,
          source,
          notes: input.message,
          stageChangedAt: new Date(),
        },
      });

      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: opportunity.id,
          toStage: OpportunityStage.NEW,
          metadata: {
            origin: 'public-lead',
          },
        },
      });

      const activity = await tx.activity.create({
        data: {
          type: ActivityType.TASK,
          subject: 'Contactar lead captado desde formulario publico',
          description:
            input.message ??
            'Lead captado externamente y asignado para seguimiento comercial.',
          companyId: company.id,
          contactId: contact.id,
          opportunityId: opportunity.id,
          userId: assignment.user.id,
          dueDate: followUpDueDate,
        },
      });

      return { company, contact, opportunity, activity };
    });

    await this.notificationsService.create({
      userId: assignment.user.id,
      title: 'Nuevo lead asignado',
      message: `${input.companyName} fue asignada automaticamente para seguimiento comercial.`,
      type: NotificationType.PUBLIC_LEAD,
      referenceType: 'SalesOpportunity',
      referenceId: result.opportunity.id,
      dedupeKey: `public-lead:${result.opportunity.id}`,
    });

    await this.auditLogsService.create({
      action: duplicates.length
        ? 'PUBLIC_LEAD_CAPTURED_DUPLICATE_OVERRIDE'
        : 'PUBLIC_LEAD_CAPTURED',
      entity: 'SalesOpportunity',
      entityId: result.opportunity.id,
      metadata: {
        source,
        company: result.company.name,
        contactEmail: result.contact.email,
        ownerId: assignment.user.id,
        businessUnit: businessUnit.name,
        duplicateIds: duplicates.map((item) => item.id),
      },
      ipAddress,
    });

    await this.auditLogsService.create({
      userId: assignment.user.id,
      action: 'OPPORTUNITY_AUTO_ASSIGNED',
      entity: 'SalesOpportunity',
      entityId: result.opportunity.id,
      metadata: {
        scopeKey: assignment.scopeKey,
        fallbackScope: assignment.usedFallbackScope,
        strategy: assignment.strategy,
        reason: assignment.reason,
        ruleId: assignment.ruleId,
      },
      ipAddress,
    });

    return {
      success: true,
      message: 'Lead registrado correctamente.',
      data: {
        opportunityId: result.opportunity.id,
        contactId: result.contact.id,
        companyId: result.company.id,
      },
    };
  }
}
