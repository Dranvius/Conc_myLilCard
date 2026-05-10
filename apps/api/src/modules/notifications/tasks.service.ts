import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    setTimeout(() => {
      void this.runAutomatedChecks();
    }, 30000);
    setInterval(() => {
      void this.runAutomatedChecks();
    }, 3600000);
  }

  private getDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  async runAutomatedChecks() {
    this.logger.log('Iniciando revision automatica de vencimientos...');

    try {
      await Promise.all([
        this.checkOverdueInvoices(),
        this.checkExpiringProposals(),
        this.checkDueActivities(),
      ]);
      this.logger.log('Revision automatica completada con exito.');
    } catch (error) {
      this.logger.error('Error en la revision automatica:', error);
    }
  }

  private async checkOverdueInvoices() {
    const today = new Date();
    const dateKey = this.getDateKey(today);
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        sale: {
          select: { ownerId: true },
        },
        company: {
          select: { name: true },
        },
      },
    });

    for (const invoice of overdueInvoices) {
      await this.notifications.create({
        userId: invoice.sale.ownerId,
        title: 'Factura vencida',
        message: `La factura ${invoice.invoiceNumber} de ${invoice.company.name} ha vencido. Total: $${Number(invoice.total)}.`,
        type: NotificationType.INVOICE_OVERDUE,
        referenceType: 'Invoice',
        referenceId: invoice.id,
        dedupeKey: `invoice-overdue:${invoice.id}:${dateKey}`,
      });
    }
  }

  private async checkExpiringProposals() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = this.getDateKey(tomorrow);
    const expiringProposals = await this.prisma.proposal.findMany({
      where: {
        validUntil: {
          gte: now,
          lte: tomorrow,
        },
        status: 'SENT',
      },
      include: {
        opportunity: {
          select: {
            ownerId: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    for (const proposal of expiringProposals) {
      await this.notifications.create({
        userId: proposal.opportunity.ownerId,
        title: 'Propuesta por vencer',
        message: `La propuesta ${proposal.code} para ${proposal.opportunity.company.name} vence manana. Hazle seguimiento.`,
        type: NotificationType.PROPOSAL_EXPIRING,
        referenceType: 'Proposal',
        referenceId: proposal.id,
        dedupeKey: `proposal-expiring:${proposal.id}:${dateKey}`,
      });
    }
  }

  private async checkDueActivities() {
    const now = new Date();
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const activities = await this.prisma.activity.findMany({
      where: {
        completedAt: null,
        dueDate: {
          lte: endOfTomorrow,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    for (const activity of activities) {
      if (!activity.dueDate) {
        continue;
      }

      const isOverdue = activity.dueDate.getTime() < now.getTime();
      const dueKey = this.getDateKey(activity.dueDate);
      const title = isOverdue ? 'Seguimiento vencido' : 'Seguimiento pendiente';
      const type = isOverdue
        ? NotificationType.ACTIVITY_OVERDUE
        : NotificationType.ACTIVITY_DUE;
      const relatedLabel =
        activity.opportunity?.title ??
        activity.company?.name ??
        activity.subject;

      await this.notifications.create({
        userId: activity.userId,
        title,
        message: `${activity.subject} requiere atencion para ${relatedLabel}.`,
        type,
        referenceType: 'Activity',
        referenceId: activity.id,
        dedupeKey: `${isOverdue ? 'activity-overdue' : 'activity-due'}:${activity.id}:${dueKey}`,
      });
    }
  }
}
