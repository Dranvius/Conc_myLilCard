import {
  Injectable,
  InternalServerErrorException,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import {
  NotificationType,
  OpportunityStage,
  Prisma,
  type SalesOpportunity,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';
import { throwPotentialDuplicate } from '../duplicates/potential-duplicate';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentService } from './assignment.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { FollowUpInboxQueryDto } from './dto/follow-up-inbox-query.dto';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';
import { UpdateOpportunityStageDto } from './dto/update-opportunity-stage.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { LeadScoringService } from './lead-scoring.service';

type OpportunityListItem = Prisma.SalesOpportunityGetPayload<{
  include: {
    company: true;
    contact: true;
    owner: {
      select: {
        id: true;
        name: true;
      };
    };
    businessUnit: true;
    _count: {
      select: {
        proposals: true;
        sales: true;
      };
    };
  };
}>;

type OpportunityDetailItem = Prisma.SalesOpportunityGetPayload<{
  include: {
    company: true;
    contact: true;
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    businessUnit: true;
    proposals: {
      include: {
        items: {
          include: {
            product: true;
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
    sales: {
      include: {
        owner: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    stageHistory: {
      include: {
        changedBy: {
          select: {
            id: true;
            name: true;
          };
        };
      };
      orderBy: {
        changedAt: 'desc';
      };
    };
  };
}>;

type InboxItem = Awaited<
  ReturnType<LeadScoringService['enrichOpportunities']>
>[number] & {
  daysSinceLastContact: number | null;
  followUpState:
    | 'OVERDUE'
    | 'TODAY'
    | 'UPCOMING'
    | 'NO_NEXT_ACTIVITY'
    | 'NO_RECENT_CONTACT'
    | 'NO_RESPONSE'
    | 'STALE'
    | 'NEW_LEAD'
    | 'ON_TRACK';
  actionRecommended: string;
};

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly assignmentService: AssignmentService,
    private readonly leadScoringService: LeadScoringService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  private buildWhere(
    query: Pick<
      OpportunityQueryDto,
      'stage' | 'ownerId' | 'businessUnitId' | 'companyId' | 'source' | 'search'
    >,
  ): Prisma.SalesOpportunityWhereInput {
    return {
      stage: query.stage || undefined,
      ownerId: query.ownerId || undefined,
      businessUnitId: query.businessUnitId || undefined,
      companyId: query.companyId || undefined,
      source: query.source || undefined,
      OR: query.search
        ? [
            {
              title: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              company: {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              contact: {
                OR: [
                  {
                    firstName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    lastName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          ]
        : undefined,
    };
  }

  private getDaysDifference(from: Date, to?: string | Date | null) {
    if (!to) {
      return null;
    }

    const target = to instanceof Date ? to : new Date(to);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((from.getTime() - target.getTime()) / msPerDay));
  }

  private isToday(value?: string | null) {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  private isUpcoming(value?: string | null) {
    if (!value) {
      return false;
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return new Date(value) > end;
  }

  private buildInboxItem(
    opportunity: Awaited<ReturnType<LeadScoringService['enrichOpportunities']>>[number],
  ): InboxItem {
    const now = new Date();
    const daysSinceLastContact = this.getDaysDifference(
      now,
      opportunity.lastActivityAt,
    );
    const hasNoNextActivity = !opportunity.nextActivityAt;
    const hasNoRecentContact =
      daysSinceLastContact === null || daysSinceLastContact >= 7;
    const isNewLead =
      opportunity.stage === OpportunityStage.NEW &&
      opportunity.totalActivitiesCount === 0;
    const noResponse =
      [OpportunityStage.NEW, OpportunityStage.CONTACTED].includes(
        opportunity.stage as OpportunityStage,
      ) &&
      (daysSinceLastContact ?? opportunity.daysWithoutMovement ?? 0) >= 5 &&
      hasNoNextActivity;

    let followUpState: InboxItem['followUpState'] = 'ON_TRACK';
    let actionRecommended = 'Mantener seguimiento segun el plan actual.';

    if (opportunity.overdueActivitiesCount > 0) {
      followUpState = 'OVERDUE';
      actionRecommended = 'Registrar contacto y reprogramar la siguiente accion.';
    } else if (this.isToday(opportunity.nextActivityAt)) {
      followUpState = 'TODAY';
      actionRecommended = 'Ejecutar la actividad programada hoy.';
    } else if (this.isUpcoming(opportunity.nextActivityAt)) {
      followUpState = 'UPCOMING';
      actionRecommended = 'Confirmar la proxima actividad y preparar contexto.';
    } else if (isNewLead) {
      followUpState = 'NEW_LEAD';
      actionRecommended = 'Realizar el primer contacto comercial.';
    } else if (noResponse) {
      followUpState = 'NO_RESPONSE';
      actionRecommended = 'Intentar un nuevo canal o marcar sin respuesta.';
    } else if (opportunity.isStale) {
      followUpState = 'STALE';
      actionRecommended = 'Mover etapa o depurar la oportunidad estancada.';
    } else if (hasNoNextActivity) {
      followUpState = 'NO_NEXT_ACTIVITY';
      actionRecommended = 'Programar la siguiente actividad antes de cerrar el dia.';
    } else if (hasNoRecentContact) {
      followUpState = 'NO_RECENT_CONTACT';
      actionRecommended = 'Reactivar el seguimiento con llamada o correo.';
    }

    return {
      ...opportunity,
      daysSinceLastContact,
      followUpState,
      actionRecommended,
    };
  }

  private matchesInboxBucket(
    item: InboxItem,
    query: FollowUpInboxQueryDto,
    currentUser: AuthUser,
  ) {
    if (query.onlyPriority && !['P0', 'P1'].includes(item.leadScore)) {
      return false;
    }

    switch (query.bucket) {
      case 'overdue':
        return item.overdueActivitiesCount > 0;
      case 'today':
        return this.isToday(item.nextActivityAt);
      case 'upcoming':
        return this.isUpcoming(item.nextActivityAt);
      case 'no_next_activity':
        return !item.nextActivityAt;
      case 'no_recent_contact':
        return item.daysSinceLastContact === null || item.daysSinceLastContact >= 7;
      case 'no_response':
        return item.followUpState === 'NO_RESPONSE';
      case 'stale':
        return item.isStale;
      case 'new_leads':
        return item.followUpState === 'NEW_LEAD';
      case 'mine':
        return item.ownerId === currentUser.sub;
      case 'high_priority':
        return ['P0', 'P1'].includes(item.leadScore);
      default:
        return true;
    }
  }

  private buildInboxSummary(items: InboxItem[], currentUserId: string) {
    return {
      overdue: items.filter((item) => item.overdueActivitiesCount > 0).length,
      today: items.filter((item) => this.isToday(item.nextActivityAt)).length,
      upcoming: items.filter((item) => this.isUpcoming(item.nextActivityAt))
        .length,
      noNextActivity: items.filter((item) => !item.nextActivityAt).length,
      noRecentContact: items.filter(
        (item) => item.daysSinceLastContact === null || item.daysSinceLastContact >= 7,
      ).length,
      noResponse: items.filter((item) => item.followUpState === 'NO_RESPONSE')
        .length,
      stale: items.filter((item) => item.isStale).length,
      newLeads: items.filter((item) => item.followUpState === 'NEW_LEAD').length,
      mine: items.filter((item) => item.ownerId === currentUserId).length,
      highPriority: items.filter((item) => ['P0', 'P1'].includes(item.leadScore))
        .length,
    };
  }

  private async createStageHistory(
    tx: Prisma.TransactionClient,
    params: {
      opportunityId: string;
      fromStage?: OpportunityStage | null;
      toStage: OpportunityStage;
      changedById?: string;
      metadata?: Prisma.JsonValue;
    },
  ) {
    return tx.opportunityStageHistory.create({
      data: {
        opportunityId: params.opportunityId,
        fromStage: params.fromStage ?? null,
        toStage: params.toStage,
        changedById: params.changedById ?? null,
        metadata: params.metadata,
      },
    });
  }

  async findMany(query: OpportunityQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = this.buildWhere(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOpportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          businessUnit: true,
          _count: {
            select: {
              proposals: true,
              sales: true,
            },
          },
        },
      }),
      this.prisma.salesOpportunity.count({ where }),
    ]);
    const enrichedData = await this.leadScoringService.enrichOpportunities(data);

    return {
      data: enrichedData,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const opportunity: OpportunityDetailItem =
      await this.prisma.salesOpportunity.findUniqueOrThrow({
        where: { id },
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          businessUnit: true,
          proposals: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          sales: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          stageHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              changedAt: 'desc',
            },
          },
        },
      });
    const [enriched] = await this.leadScoringService.enrichOpportunities([
      opportunity,
    ]);

    return enriched;
  }

  async findFollowUpInbox(
    query: FollowUpInboxQueryDto,
    currentUser: AuthUser,
  ) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const isRestricted =
      currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER';

    const opportunities: OpportunityListItem[] =
      await this.prisma.salesOpportunity.findMany({
        where: {
          ...this.buildWhere({
            stage: query.stage,
            ownerId: isRestricted ? currentUser.sub : query.ownerId,
            businessUnitId: query.businessUnitId,
            companyId: undefined,
            source: query.source,
            search: query.search,
          }),
          stage: query.stage || {
            notIn: [OpportunityStage.WON, OpportunityStage.LOST],
          },
        },
        orderBy: [{ stageChangedAt: 'asc' }, { createdAt: 'desc' }],
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          businessUnit: true,
          _count: {
            select: {
              proposals: true,
              sales: true,
            },
          },
        },
      });

    const enriched = await this.leadScoringService.enrichOpportunities(
      opportunities,
    );
    const inboxItems = enriched.map((item) => this.buildInboxItem(item));
    const summary = this.buildInboxSummary(inboxItems, currentUser.sub);
    const filtered = inboxItems.filter((item) =>
      this.matchesInboxBucket(item, query, currentUser),
    );

    return {
      data: filtered.slice(skip, skip + limit),
      meta: buildPaginationMeta(page, limit, filtered.length),
      summary,
    };
  }

  async create(
    createOpportunityDto: CreateOpportunityDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const duplicates =
      await this.duplicateDetectionService.findOpportunityDuplicates(
        createOpportunityDto,
      );
    if (duplicates.length && !createOpportunityDto.allowPotentialDuplicate) {
      throwPotentialDuplicate('la oportunidad', duplicates);
    }

    const company = await this.prisma.company.findUnique({
      where: { id: createOpportunityDto.companyId },
      select: {
        id: true,
        city: true,
        country: true,
      },
    });

    const assignment = createOpportunityDto.ownerId
      ? null
      : await this.assignmentService.assignNextOpportunityOwner({
          businessUnitId: createOpportunityDto.businessUnitId,
          leadSource: createOpportunityDto.source,
          city: company?.city,
          country: company?.country,
          estimatedValue: createOpportunityDto.estimatedValue,
          probability: createOpportunityDto.probability,
        });
    const ownerId = createOpportunityDto.ownerId ?? assignment?.user.id;
    if (!ownerId) {
      throw new InternalServerErrorException(
        'No se pudo resolver un responsable para la oportunidad.',
      );
    }

    const opportunity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesOpportunity.create({
        data: {
          ownerId,
          companyId: createOpportunityDto.companyId,
          contactId: createOpportunityDto.contactId,
          businessUnitId: createOpportunityDto.businessUnitId,
          title: createOpportunityDto.title,
          stage: createOpportunityDto.stage,
          estimatedValue: createOpportunityDto.estimatedValue,
          probability: createOpportunityDto.probability,
          notes: createOpportunityDto.notes,
          source: createOpportunityDto.source,
          lostReason: createOpportunityDto.lostReason,
          lostReasonNotes: createOpportunityDto.lostReasonNotes,
          expectedCloseDate: createOpportunityDto.expectedCloseDate
            ? new Date(createOpportunityDto.expectedCloseDate)
            : null,
          stageChangedAt: new Date(),
        },
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          businessUnit: true,
        },
      });

      await this.createStageHistory(tx, {
        opportunityId: created.id,
        toStage: created.stage,
        changedById: actorUserId,
        metadata: {
          origin: 'create',
        },
      });

      return created;
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: duplicates.length
        ? 'OPPORTUNITY_CREATED_DUPLICATE_OVERRIDE'
        : 'OPPORTUNITY_CREATED',
      entity: 'SalesOpportunity',
      entityId: opportunity.id,
      metadata: {
        company: opportunity.company.name,
        stage: opportunity.stage,
        source: opportunity.source,
        estimatedValue: opportunity.estimatedValue,
        duplicateIds: duplicates.map((item) => item.id),
      },
      ipAddress,
    });

    if (assignment) {
      await this.notificationsService.create({
        userId: assignment.user.id,
        title: 'Nueva oportunidad asignada',
        message: `${opportunity.title} fue asignada automaticamente para seguimiento.`,
        type: NotificationType.OPPORTUNITY_ASSIGNED,
        referenceType: 'SalesOpportunity',
        referenceId: opportunity.id,
        dedupeKey: `opportunity-assigned:${opportunity.id}:auto`,
      });

      await this.auditLogsService.create({
        userId: assignment.user.id,
        action: 'OPPORTUNITY_AUTO_ASSIGNED',
        entity: 'SalesOpportunity',
        entityId: opportunity.id,
        metadata: {
          scopeKey: assignment.scopeKey,
          fallbackScope: assignment.usedFallbackScope,
          ownerId: assignment.user.id,
          strategy: assignment.strategy,
          reason: assignment.reason,
          ruleId: assignment.ruleId,
        },
        ipAddress,
      });
    }

    this.logger.log(
      JSON.stringify({
        event: 'opportunity.created',
        opportunityId: opportunity.id,
        assignedUserId: ownerId,
      }),
    );

    const [enriched] = await this.leadScoringService.enrichOpportunities([
      opportunity,
    ]);
    return enriched;
  }

  async update(
    id: string,
    updateOpportunityDto: UpdateOpportunityDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const existingOpportunity =
      await this.prisma.salesOpportunity.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          stage: true,
          ownerId: true,
          title: true,
        },
      });

    const stageChanged =
      updateOpportunityDto.stage !== undefined &&
      updateOpportunityDto.stage !== existingOpportunity.stage;
    const ownerChanged =
      updateOpportunityDto.ownerId !== undefined &&
      updateOpportunityDto.ownerId !== existingOpportunity.ownerId;

    const opportunity = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOpportunity.update({
        where: { id },
        data: {
          ...updateOpportunityDto,
          expectedCloseDate: updateOpportunityDto.expectedCloseDate
            ? new Date(updateOpportunityDto.expectedCloseDate)
            : updateOpportunityDto.expectedCloseDate === null
              ? null
              : undefined,
          stageChangedAt: stageChanged ? new Date() : undefined,
          lostReason:
            updateOpportunityDto.stage &&
            updateOpportunityDto.stage !== OpportunityStage.LOST
              ? null
              : updateOpportunityDto.lostReason,
          lostReasonNotes:
            updateOpportunityDto.stage &&
            updateOpportunityDto.stage !== OpportunityStage.LOST
              ? null
              : updateOpportunityDto.lostReasonNotes,
        },
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          businessUnit: true,
        },
      });

      if (stageChanged && updateOpportunityDto.stage) {
        await this.createStageHistory(tx, {
          opportunityId: id,
          fromStage: existingOpportunity.stage,
          toStage: updateOpportunityDto.stage,
          changedById: actorUserId,
          metadata: {
            origin: 'update',
          },
        });
      }

      return updated;
    });

    if (stageChanged) {
      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'OPPORTUNITY_STAGE_CHANGED',
        entity: 'SalesOpportunity',
        entityId: id,
        metadata: {
          previousStage: existingOpportunity.stage,
          nextStage: opportunity.stage,
        },
        ipAddress,
      });
    }

    if (ownerChanged && updateOpportunityDto.ownerId) {
      await this.notificationsService.create({
        userId: updateOpportunityDto.ownerId,
        title: 'Oportunidad reasignada',
        message: `${existingOpportunity.title} fue reasignada a tu cartera.`,
        type: NotificationType.OPPORTUNITY_ASSIGNED,
        referenceType: 'SalesOpportunity',
        referenceId: id,
      });

      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'OPPORTUNITY_REASSIGNED',
        entity: 'SalesOpportunity',
        entityId: id,
        metadata: {
          previousOwnerId: existingOpportunity.ownerId,
          nextOwnerId: updateOpportunityDto.ownerId,
        },
        ipAddress,
      });
    }

    const [enriched] = await this.leadScoringService.enrichOpportunities([
      opportunity,
    ]);
    return enriched;
  }

  async updateStage(
    id: string,
    updateStageDto: UpdateOpportunityStageDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const existingOpportunity =
      await this.prisma.salesOpportunity.findUniqueOrThrow({
        where: { id },
        select: {
          stage: true,
        },
      });

    const opportunity = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOpportunity.update({
        where: { id },
        data: {
          stage: updateStageDto.stage,
          stageChangedAt:
            updateStageDto.stage !== existingOpportunity.stage
              ? new Date()
              : undefined,
          lostReason:
            updateStageDto.stage === OpportunityStage.LOST
              ? (updateStageDto.lostReason ?? null)
              : null,
          lostReasonNotes:
            updateStageDto.stage === OpportunityStage.LOST
              ? (updateStageDto.lostReasonNotes ?? null)
              : null,
        },
        include: {
          company: true,
          businessUnit: true,
        },
      });

      if (updateStageDto.stage !== existingOpportunity.stage) {
        await this.createStageHistory(tx, {
          opportunityId: id,
          fromStage: existingOpportunity.stage,
          toStage: updateStageDto.stage,
          changedById: actorUserId,
          metadata: {
            origin: 'kanban',
          },
        });
      }

      return updated;
    });

    if (updateStageDto.stage !== existingOpportunity.stage) {
      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'OPPORTUNITY_STAGE_CHANGED',
        entity: 'SalesOpportunity',
        entityId: id,
        metadata: {
          previousStage: existingOpportunity.stage,
          nextStage: updateStageDto.stage,
          company: opportunity.company.name,
          businessUnit: opportunity.businessUnit.name,
        },
        ipAddress,
      });
    }

    if (
      updateStageDto.stage === OpportunityStage.WON ||
      updateStageDto.stage === OpportunityStage.LOST
    ) {
      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'OPPORTUNITY_CLOSED',
        entity: 'SalesOpportunity',
        entityId: id,
        metadata: {
          stage: updateStageDto.stage,
          company: opportunity.company.name,
          businessUnit: opportunity.businessUnit.name,
        },
        ipAddress,
      });
    }

    this.logger.log(
      JSON.stringify({
        event: 'opportunity.stage.changed',
        opportunityId: id,
        previousStage: existingOpportunity.stage,
        nextStage: updateStageDto.stage,
      }),
    );

    const [enriched] = await this.leadScoringService.enrichOpportunities([
      opportunity,
    ]);
    return enriched;
  }

  async exportToExcel(
    query: OpportunityQueryDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const where = this.buildWhere(query);
    const opportunities = await this.prisma.salesOpportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        contact: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        businessUnit: true,
      },
    });
    const enriched = await this.leadScoringService.enrichOpportunities(
      opportunities,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Oportunidades');

    worksheet.columns = [
      { header: 'Titulo', key: 'title', width: 32 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Contacto', key: 'contact', width: 26 },
      { header: 'Responsable', key: 'owner', width: 24 },
      { header: 'Unidad de negocio', key: 'businessUnit', width: 24 },
      { header: 'Etapa', key: 'stage', width: 18 },
      { header: 'Origen', key: 'source', width: 18 },
      { header: 'Score', key: 'leadScore', width: 10 },
      { header: 'Valor score', key: 'leadScoreValue', width: 12 },
      { header: 'Valor estimado', key: 'estimatedValue', width: 18 },
      { header: 'Probabilidad', key: 'probability', width: 14 },
      { header: 'Dias sin movimiento', key: 'daysWithoutMovement', width: 18 },
      { header: 'Proxima actividad', key: 'nextActivityAt', width: 22 },
      { header: 'Cierre esperado', key: 'expectedCloseDate', width: 20 },
      { header: 'Creada', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F6C8D' },
    };

    enriched.forEach((opportunity) => {
      worksheet.addRow({
        title: opportunity.title,
        company: opportunity.company?.name ?? 'N/A',
        contact: opportunity.contact
          ? `${opportunity.contact.firstName} ${opportunity.contact.lastName}`
          : 'N/A',
        owner: opportunity.owner?.name ?? 'Sin responsable',
        businessUnit: opportunity.businessUnit?.name ?? 'N/A',
        stage: opportunity.stage,
        source: opportunity.source ?? 'N/A',
        leadScore: opportunity.leadScore,
        leadScoreValue: opportunity.leadScoreValue,
        estimatedValue: Number(opportunity.estimatedValue),
        probability: `${opportunity.probability}%`,
        daysWithoutMovement: opportunity.daysWithoutMovement,
        nextActivityAt: opportunity.nextActivityAt ?? 'Sin seguimiento',
        expectedCloseDate: opportunity.expectedCloseDate ?? 'N/A',
        createdAt: opportunity.createdAt.toISOString(),
      });
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'OPPORTUNITIES_EXPORTED',
      entity: 'SalesOpportunity',
      entityId: 'bulk-export',
      metadata: {
        total: enriched.length,
        filters: query,
      },
      ipAddress,
    });

    this.logger.log(
      JSON.stringify({
        event: 'opportunities.export.completed',
        total: enriched.length,
      }),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return new StreamableFile(Buffer.from(buffer));
  }
}
