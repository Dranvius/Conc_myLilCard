import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EmailSequencesService {
  private readonly logger = new Logger(EmailSequencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async enrollContact(params: {
    contactId: string;
    sequenceId: string;
    opportunityId?: string;
  }) {
    const sequence = await this.prisma.emailSequence.findUniqueOrThrow({
      where: { id: params.sequenceId },
      include: { steps: true },
    });

    const enrolment = await this.prisma.emailSequenceEnrolment.upsert({
      where: {
        sequenceId_contactId: {
          sequenceId: params.sequenceId,
          contactId: params.contactId,
        },
      },
      update: {
        status: 'ACTIVE',
        currentStep: 1,
        opportunityId: params.opportunityId,
      },
      create: {
        sequenceId: params.sequenceId,
        contactId: params.contactId,
        opportunityId: params.opportunityId,
        status: 'ACTIVE',
        currentStep: 1,
      },
    });

    // Clear any previous scheduled steps
    await this.prisma.emailSequenceEnrolmentStep.deleteMany({
      where: { enrolmentId: enrolment.id, sentAt: null },
    });

    // Schedule the first step
    const firstStep = sequence.steps.find((s) => s.stepOrder === 1);
    if (firstStep) {
      const scheduledAt = new Date();
      // First step usually sent immediately or after small delay
      scheduledAt.setHours(scheduledAt.getHours() + firstStep.delayHours);

      await this.prisma.emailSequenceEnrolmentStep.create({
        data: {
          enrolmentId: enrolment.id,
          stepId: firstStep.id,
          scheduledAt,
        },
      });
    }

    return enrolment;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledEmails() {
    const now = new Date();
    const pendingSteps = await this.prisma.emailSequenceEnrolmentStep.findMany({
      where: {
        sentAt: null,
        scheduledAt: { lte: now },
        enrolment: { status: 'ACTIVE' },
      },
      include: {
        enrolment: {
          include: {
            sequence: { include: { steps: true } },
          },
        },
        step: { include: { template: true } },
      },
    });

    if (!pendingSteps.length) return;

    this.logger.log(`Processing ${pendingSteps.length} scheduled emails...`);

    for (const pending of pendingSteps) {
      try {
        const contact = await this.prisma.contact.findUnique({
          where: { id: pending.enrolment.contactId },
        });

        if (!contact?.email) {
          throw new Error(`Contact ${pending.enrolment.contactId} has no email`);
        }

        const subject = pending.step.template.subject.replace(/{{name}}/g, contact.firstName);
        const body = pending.step.template.body.replace(/{{name}}/g, contact.firstName);

        await this.mailService.sendMail(
          contact.email,
          subject,
          body,
        );

        await this.prisma.emailSequenceEnrolmentStep.update({
          where: { id: pending.id },
          data: { sentAt: new Date() },
        });

        // Schedule next step
        const nextOrder = pending.step.stepOrder + 1;
        const nextStep = pending.enrolment.sequence.steps.find(
          (s) => s.stepOrder === nextOrder,
        );

        if (nextStep) {
          const nextScheduledAt = new Date();
          nextScheduledAt.setHours(nextScheduledAt.getHours() + nextStep.delayHours);

          await this.prisma.emailSequenceEnrolmentStep.create({
            data: {
              enrolmentId: pending.enrolmentId,
              stepId: nextStep.id,
              scheduledAt: nextScheduledAt,
            },
          });

          await this.prisma.emailSequenceEnrolment.update({
            where: { id: pending.enrolmentId },
            data: { currentStep: nextOrder },
          });
        } else {
          // No more steps
          await this.prisma.emailSequenceEnrolment.update({
            where: { id: pending.enrolmentId },
            data: { status: 'COMPLETED' },
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to send email for step ${pending.id}:`, error);
        await this.prisma.emailSequenceEnrolmentStep.update({
          where: { id: pending.id },
          data: { error: error.message || 'Unknown error' },
        });
      }
    }
  }
}
