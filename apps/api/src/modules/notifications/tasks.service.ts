import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
    // Ejecutar la primera revisión a los 30 segundos de iniciar el servidor
    setTimeout(() => this.runAutomatedChecks(), 30000);

    // Luego, ejecutar cada 1 hora (3600000 ms)
    setInterval(() => this.runAutomatedChecks(), 3600000);
  }

  async runAutomatedChecks() {
    this.logger.log('Iniciando revisión automática de vencimientos...');
    
    try {
      await Promise.all([
        this.checkOverdueInvoices(),
        this.checkExpiringProposals(),
      ]);
      this.logger.log('Revisión automática completada con éxito.');
    } catch (error) {
      this.logger.error('Error en la revisión automática:', error);
    }
  }

  private async checkOverdueInvoices() {
    const today = new Date();
    
    // Buscar facturas vencidas que no hayan sido notificadas hoy
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: {
        sale: {
          select: { ownerId: true }
        },
        company: {
          select: { name: true }
        }
      }
    });

    for (const invoice of overdueInvoices) {
      // Evitar duplicar notificaciones (podríamos marcar la factura o revisar logs)
      // Por ahora, enviamos la notificación al dueño de la venta
      await this.notifications.create({
        userId: invoice.sale.ownerId,
        title: '🔴 Factura Vencida',
        message: `La factura ${invoice.invoiceNumber} de ${invoice.company.name} ha vencido. Total: $${invoice.total}.`,
      });
    }
  }

  private async checkExpiringProposals() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Buscar propuestas que vencen mañana y están en estado SENT (Enviadas)
    const expiringProposals = await this.prisma.proposal.findMany({
      where: {
        validUntil: {
          gte: new Date(),
          lte: tomorrow,
        },
        status: 'SENT',
      },
      include: {
        opportunity: {
          select: { 
            ownerId: true,
            company: { select: { name: true } }
          }
        }
      }
    });

    for (const proposal of expiringProposals) {
      await this.notifications.create({
        userId: proposal.opportunity.ownerId,
        title: '⏳ Propuesta por Vencer',
        message: `La propuesta ${proposal.code} para ${proposal.opportunity.company.name} vence mañana. ¡Hazle seguimiento!`,
      });
    }
  }
}
