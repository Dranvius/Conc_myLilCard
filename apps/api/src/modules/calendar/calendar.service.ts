import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'OPPORTUNITY' | 'ACTIVITY' | 'SERVICE_ORDER' | 'INVOICE';
  entityId: string;
  color: string;
};

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(from: Date, to: Date, userId: string, role: string): Promise<CalendarEvent[]> {
    // If the user is an admin or manager, they might see all events.
    // For now, let's filter by the user's scope if they are a regular sales rep.
    const isRestricted = role !== 'ADMIN' && role !== 'MANAGER';
    
    const events: CalendarEvent[] = [];

    // 1. Opportunities (expected close dates)
    const opportunities = await this.prisma.salesOpportunity.findMany({
      where: {
        expectedCloseDate: { gte: from, lte: to },
        ...(isRestricted ? { ownerId: userId } : {}),
      },
      include: { company: true },
    });

    for (const opp of opportunities) {
      if (opp.expectedCloseDate) {
        events.push({
          id: `opp-${opp.id}`,
          title: `Cierre: ${opp.title} (${opp.company.name})`,
          start: opp.expectedCloseDate,
          end: opp.expectedCloseDate,
          type: 'OPPORTUNITY',
          entityId: opp.id,
          color: opp.probability >= 70 ? '#22C55E' : opp.probability >= 40 ? '#F59E0B' : '#EF4444',
        });
      }
    }

    // 2. Activities (Meetings, Tasks)
    const activities = await this.prisma.activity.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        ...(isRestricted ? { userId } : {}),
      },
    });

    for (const act of activities) {
      if (act.dueDate) {
        let color = '#6366F1'; // Default Indigo
        if (act.type === 'MEETING') color = '#8B5CF6'; // Violet
        else if (act.type === 'TASK') color = '#3B82F6'; // Blue
        
        events.push({
          id: `act-${act.id}`,
          title: `${act.type === 'MEETING' ? 'Reunión' : 'Tarea'}: ${act.subject}`,
          start: act.dueDate,
          // If meeting, maybe add 1 hour to end time
          end: act.type === 'MEETING' ? new Date(act.dueDate.getTime() + 60 * 60 * 1000) : act.dueDate,
          type: 'ACTIVITY',
          entityId: act.id,
          color,
        });
      }
    }

    // 3. Service Orders (Scheduled visits)
    const serviceOrders = await this.prisma.serviceOrder.findMany({
      where: {
        scheduledAt: { gte: from, lte: to },
        ...(isRestricted ? { assignedOperatorId: userId } : {}),
      },
      include: { company: true },
    });

    for (const so of serviceOrders) {
      if (so.scheduledAt) {
        events.push({
          id: `so-${so.id}`,
          title: `Visita: ${so.code} (${so.company.name})`,
          start: so.scheduledAt,
          end: new Date(so.scheduledAt.getTime() + 2 * 60 * 60 * 1000), // 2 hours approx
          type: 'SERVICE_ORDER',
          entityId: so.id,
          color: '#06B6D4', // Cyan
        });
      }
    }

    // 4. Invoices (Due dates)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { notIn: ['PAID', 'CANCELLED'] },
        ...(isRestricted ? { sale: { ownerId: userId } } : {}),
      },
      include: { company: true },
    });

    for (const inv of invoices) {
      events.push({
        id: `inv-${inv.id}`,
        title: `Cobro: ${inv.invoiceNumber} (${inv.company.name})`,
        start: inv.dueDate,
        end: inv.dueDate,
        type: 'INVOICE',
        entityId: inv.id,
        color: '#F59E0B', // Amber
      });
    }

    return events;
  }
}
