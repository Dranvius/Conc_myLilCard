import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  OpportunityStage,
  SaleStatus,
  ServiceOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      companies,
      contacts,
      openOpportunities,
      closedSales,
      totalSoldValue,
      pendingInvoices,
      openServiceOrders,
    ] = await Promise.all([
      this.prisma.company.count({
        where: { deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { deletedAt: null },
      }),
      this.prisma.salesOpportunity.count({
        where: {
          stage: {
            notIn: [OpportunityStage.WON, OpportunityStage.LOST],
          },
        },
      }),
      this.prisma.sale.count({
        where: { status: SaleStatus.CLOSED },
      }),
      this.prisma.sale.aggregate({
        where: { status: SaleStatus.CLOSED },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.count({
        where: {
          status: {
            in: [
              InvoiceStatus.DRAFT,
              InvoiceStatus.ISSUED,
              InvoiceStatus.OVERDUE,
            ],
          },
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          status: {
            notIn: [ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED],
          },
        },
      }),
    ]);

    const [
      opportunitiesByStage,
      proposalsByStatus,
      recentActivity,
      salesByBusinessUnitRaw,
      sellerRankingRaw,
    ] = await Promise.all([
      this.prisma.salesOpportunity.groupBy({
        by: ['stage'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.proposal.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.sale.findMany({
        where: {
          status: SaleStatus.CLOSED,
        },
        include: {
          opportunity: {
            include: {
              businessUnit: true,
            },
          },
        },
      }),
      this.prisma.sale.groupBy({
        by: ['ownerId'],
        where: {
          status: SaleStatus.CLOSED,
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: sellerRankingRaw.map((item) => item.ownerId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const salesByBusinessUnitMap = new Map<
      string,
      {
        businessUnit: string;
        totalSales: number;
        totalAmount: number;
      }
    >();

    for (const sale of salesByBusinessUnitRaw) {
      const key = sale.opportunity.businessUnit.name;
      const current = salesByBusinessUnitMap.get(key) ?? {
        businessUnit: key,
        totalSales: 0,
        totalAmount: 0,
      };

      current.totalSales += 1;
      current.totalAmount += Number(sale.totalAmount);
      salesByBusinessUnitMap.set(key, current);
    }

    return {
      totals: {
        companies,
        contacts,
        openOpportunities,
        closedSales,
        totalSoldValue: Number(totalSoldValue._sum.totalAmount ?? 0),
        pendingInvoices,
        openServiceOrders,
      },
      opportunitiesByStage: opportunitiesByStage.map((item) => ({
        stage: item.stage,
        count: item._count._all,
      })),
      salesByBusinessUnit: Array.from(salesByBusinessUnitMap.values()),
      proposalsByStatus: proposalsByStatus.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      sellerRanking: sellerRankingRaw
        .map((item) => ({
          userId: item.ownerId,
          sellerName:
            users.find((user) => user.id === item.ownerId)?.name ??
            'Sin nombre',
          totalSales: item._count._all,
          totalAmount: Number(item._sum.totalAmount ?? 0),
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        action: item.action,
        entity: item.entity,
        createdAt: item.createdAt.toISOString(),
        actorName: item.user?.name ?? null,
      })),
    };
  }
}
