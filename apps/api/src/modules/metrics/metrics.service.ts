import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  OpportunityStage,
  SaleStatus,
  ServiceOrderStatus,
  type LeadSource,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadScoringService } from '../opportunities/lead-scoring.service';
import { ActivityFeedQueryDto } from './dto/activity-feed-query.dto';
import { AdvancedForecastQueryDto } from './dto/advanced-forecast-query.dto';
import { CommercialSlaQueryDto } from './dto/commercial-sla-query.dto';
import { ForecastAccuracyQueryDto } from './dto/forecast-accuracy-query.dto';
import { LeadSourcePerformanceQueryDto } from './dto/lead-source-performance-query.dto';

type MetricsOpportunity = Prisma.SalesOpportunityGetPayload<{
  include: {
    company: {
      select: {
        id: true;
        name: true;
        city: true;
      };
    };
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    businessUnit: {
      select: {
        id: true;
        name: true;
      };
    };
    activities: {
      select: {
        id: true;
        type: true;
        dueDate: true;
        completedAt: true;
        createdAt: true;
        updatedAt: true;
      };
    };
    sales: {
      select: {
        id: true;
        status: true;
        totalAmount: true;
        closedAt: true;
      };
    };
    stageHistory: {
      select: {
        id: true;
        fromStage: true;
        toStage: true;
        changedAt: true;
      };
    };
  };
}>;

type CommercialSnapshot = Awaited<
  ReturnType<LeadScoringService['enrichOpportunities']>
>[number] & {
  companyName: string;
  companyCity: string | null;
  ownerName: string;
  businessUnitName: string;
  firstContactAt: string | null;
  firstContactHours: number | null;
  closedRealValue: number;
  closeDate: string | null;
  cycleToCloseDays: number | null;
  hasFutureActivity: boolean;
  hasOverdueActivity: boolean;
  hasCompletedActivity: boolean;
  followUpCompliance:
    | 'OVERDUE'
    | 'DUE_TODAY'
    | 'NO_NEXT_ACTIVITY'
    | 'ON_TRACK';
  raw: MetricsOpportunity;
};

type SnapshotFilter = {
  from?: Date;
  to?: Date;
  ownerId?: string;
  businessUnitId?: string;
  source?: LeadSource;
  stage?: OpportunityStage;
  useCreatedRange?: boolean;
  includeForecastOrClosedRange?: boolean;
};

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadScoringService: LeadScoringService,
  ) {}

  private readonly stageOrder: OpportunityStage[] = [
    OpportunityStage.NEW,
    OpportunityStage.CONTACTED,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL_SENT,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.WON,
    OpportunityStage.LOST,
  ];

  private resolveRange(query: { from?: string; to?: string }) {
    const from = query.from
      ? new Date(query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();
    return { from, to };
  }

  private computeAccuracy(expectedValue: number, actualValue: number) {
    if (expectedValue <= 0) {
      return actualValue <= 0 ? 100 : 0;
    }

    const delta = Math.abs(actualValue - expectedValue);
    return Math.max(0, Math.round(100 - (delta / expectedValue) * 100));
  }

  private computeHoursDifference(start: Date, end?: Date | null) {
    if (!end) {
      return null;
    }

    return Math.round(((end.getTime() - start.getTime()) / 36e5) * 10) / 10;
  }

  private computeDaysDifference(start: Date, end?: Date | null) {
    if (!end) {
      return null;
    }

    return Math.round(((end.getTime() - start.getTime()) / 864e5) * 10) / 10;
  }

  private average(values: Array<number | null | undefined>) {
    const normalized = values.filter(
      (value): value is number => typeof value === 'number' && !Number.isNaN(value),
    );
    if (!normalized.length) {
      return 0;
    }

    return Math.round(
      (normalized.reduce((total, value) => total + value, 0) / normalized.length) * 10,
    ) / 10;
  }

  private buildSnapshotWhere(filters: SnapshotFilter): Prisma.SalesOpportunityWhereInput {
    const sharedWhere: Prisma.SalesOpportunityWhereInput = {
      ownerId: filters.ownerId || undefined,
      businessUnitId: filters.businessUnitId || undefined,
      source: filters.source || undefined,
      stage: filters.stage || undefined,
    };

    if (filters.includeForecastOrClosedRange && filters.from && filters.to) {
      return {
        ...sharedWhere,
        OR: [
          {
            expectedCloseDate: {
              gte: filters.from,
              lte: filters.to,
            },
          },
          {
            sales: {
              some: {
                status: SaleStatus.CLOSED,
                closedAt: {
                  gte: filters.from,
                  lte: filters.to,
                },
              },
            },
          },
        ],
      };
    }

    if (filters.useCreatedRange && filters.from && filters.to) {
      return {
        ...sharedWhere,
        createdAt: {
          gte: filters.from,
          lte: filters.to,
        },
      };
    }

    return sharedWhere;
  }

  private async getCommercialSnapshots(filters: SnapshotFilter) {
    const opportunities = await this.prisma.salesOpportunity.findMany({
      where: this.buildSnapshotWhere(filters),
      include: {
        company: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        businessUnit: {
          select: {
            id: true,
            name: true,
          },
        },
        activities: {
          select: {
            id: true,
            type: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        sales: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            closedAt: true,
          },
        },
        stageHistory: {
          select: {
            id: true,
            fromStage: true,
            toStage: true,
            changedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const enriched = await this.leadScoringService.enrichOpportunities(opportunities);
    const opportunityMap = new Map(opportunities.map((item) => [item.id, item]));
    const now = new Date();

    return enriched.map((item) => {
      const raw = opportunityMap.get(item.id)!;
      const completedActivities = raw.activities
        .filter((activity) => activity.completedAt)
        .sort(
          (left, right) =>
            (left.completedAt?.getTime() ?? 0) -
            (right.completedAt?.getTime() ?? 0),
        );
      const firstContactDate = completedActivities[0]?.completedAt ?? null;
      const closedSales = raw.sales.filter(
        (sale) => sale.status === SaleStatus.CLOSED && sale.closedAt,
      );
      const closeDate =
        closedSales
          .map((sale) => sale.closedAt)
          .filter((value): value is Date => Boolean(value))
          .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
      const closedRealValue = closedSales.reduce(
        (total, sale) => total + Number(sale.totalAmount),
        0,
      );
      const hasFutureActivity = raw.activities.some(
        (activity) =>
          !activity.completedAt &&
          activity.dueDate &&
          activity.dueDate.getTime() >= now.getTime(),
      );
      const hasOverdueActivity = raw.activities.some(
        (activity) =>
          !activity.completedAt &&
          activity.dueDate &&
          activity.dueDate.getTime() < now.getTime(),
      );

      return {
        ...item,
        companyName: raw.company.name,
        companyCity: raw.company.city,
        ownerName: raw.owner.name,
        businessUnitName: raw.businessUnit.name,
        firstContactAt: firstContactDate?.toISOString() ?? null,
        firstContactHours: this.computeHoursDifference(
          raw.createdAt,
          firstContactDate,
        ),
        closedRealValue,
        closeDate: closeDate?.toISOString() ?? null,
        cycleToCloseDays: this.computeDaysDifference(raw.createdAt, closeDate),
        hasFutureActivity,
        hasOverdueActivity,
        hasCompletedActivity: completedActivities.length > 0,
        followUpCompliance: hasOverdueActivity
          ? 'OVERDUE'
          : !item.nextActivityAt
            ? 'NO_NEXT_ACTIVITY'
            : this.isToday(item.nextActivityAt)
              ? 'DUE_TODAY'
              : 'ON_TRACK',
        raw,
      };
    });
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

  private buildStageDurationSummary(snapshots: CommercialSnapshot[]) {
    const accumulator = new Map<
      string,
      {
        stage: string;
        opportunities: number;
        avgDaysInStage: number;
      }
    >();

    for (const snapshot of snapshots) {
      const history = [...snapshot.raw.stageHistory].sort(
        (left, right) => left.changedAt.getTime() - right.changedAt.getTime(),
      );

      if (!history.length) {
        const current = accumulator.get(snapshot.stage) ?? {
          stage: snapshot.stage,
          opportunities: 0,
          avgDaysInStage: 0,
        };
        current.opportunities += 1;
        current.avgDaysInStage +=
          this.computeDaysDifference(snapshot.raw.createdAt, snapshot.raw.updatedAt) ?? 0;
        accumulator.set(snapshot.stage, current);
        continue;
      }

      history.forEach((entry, index) => {
        const nextEntry = history[index + 1];
        const endDate =
          nextEntry?.changedAt ??
          snapshot.raw.updatedAt ??
          snapshot.raw.stageChangedAt ??
          new Date();
        const current = accumulator.get(entry.toStage) ?? {
          stage: entry.toStage,
          opportunities: 0,
          avgDaysInStage: 0,
        };
        current.opportunities += 1;
        current.avgDaysInStage +=
          this.computeDaysDifference(entry.changedAt, endDate) ?? 0;
        accumulator.set(entry.toStage, current);
      });
    }

    return this.stageOrder
      .map((stage) => accumulator.get(stage))
      .filter(
        (
          item,
        ): item is {
          stage: string;
          opportunities: number;
          avgDaysInStage: number;
        } => Boolean(item),
      )
      .map((item) => ({
        ...item,
        avgDaysInStage: Math.round((item.avgDaysInStage / item.opportunities) * 10) / 10,
      }));
  }

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

  async getPipelineConversion() {
    const opps = await this.prisma.salesOpportunity.findMany({
      select: { stage: true },
    });
    const counts = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0,
    };

    for (const opp of opps) {
      if (counts[opp.stage] !== undefined) {
        counts[opp.stage] += 1;
      }
    }

    return [
      { name: 'NUEVA', value: counts.NEW },
      { name: 'CONTACTADA', value: counts.CONTACTED },
      { name: 'CALIFICADA', value: counts.QUALIFIED },
      { name: 'PROPUESTA ENV.', value: counts.PROPOSAL_SENT },
      { name: 'NEGOCIACION', value: counts.NEGOTIATION },
      { name: 'GANADA', value: counts.WON },
    ];
  }

  async getSalesByPeriod(year: number) {
    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.CLOSED,
        closedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      select: { closedAt: true, totalAmount: true },
    });

    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const result = months.map((month) => ({
      month,
      totalAmount: 0,
      count: 0,
    }));

    for (const sale of sales) {
      if (!sale.closedAt) {
        continue;
      }

      const monthIndex = sale.closedAt.getMonth();
      result[monthIndex].totalAmount += Number(sale.totalAmount);
      result[monthIndex].count += 1;
    }

    return result;
  }

  async getForecast() {
    const opps = await this.prisma.salesOpportunity.findMany({
      where: {
        stage: { notIn: [OpportunityStage.WON, OpportunityStage.LOST] },
        expectedCloseDate: { not: null },
      },
      select: {
        expectedCloseDate: true,
        estimatedValue: true,
        probability: true,
      },
    });

    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const currentYear = new Date().getFullYear();
    const result = months.map((month) => ({ month, expectedValue: 0 }));

    for (const opp of opps) {
      if (
        opp.expectedCloseDate &&
        opp.expectedCloseDate.getFullYear() === currentYear
      ) {
        const monthIndex = opp.expectedCloseDate.getMonth();
        const weighted = Number(opp.estimatedValue) * (opp.probability / 100);
        result[monthIndex].expectedValue += weighted;
      }
    }

    return result;
  }

  async getForecastAccuracy(query: ForecastAccuracyQueryDto) {
    const { from, to } = this.resolveRange(query);
    const snapshots = await this.getCommercialSnapshots({
      from,
      to,
      ownerId: query.ownerId,
      includeForecastOrClosedRange: true,
    });

    const items = snapshots.map((snapshot) => {
      const estimatedValue = Number(snapshot.estimatedValue);
      const weightedValue = Number(
        (estimatedValue * snapshot.probability) / 100,
      );

      return {
        opportunityId: snapshot.id,
        opportunityTitle: snapshot.title,
        companyName: snapshot.companyName,
        ownerId: snapshot.ownerId,
        ownerName: snapshot.ownerName,
        estimatedValue,
        probability: snapshot.probability,
        weightedValue,
        closedRealValue: snapshot.closedRealValue,
        differenceValue: snapshot.closedRealValue - weightedValue,
        accuracyPct: this.computeAccuracy(
          weightedValue,
          snapshot.closedRealValue,
        ),
        expectedCloseDate: snapshot.expectedCloseDate?.toISOString() ?? null,
      };
    });

    const bySellerMap = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        opportunities: number;
        estimatedValue: number;
        weightedValue: number;
        closedRealValue: number;
      }
    >();

    for (const item of items) {
      const current = bySellerMap.get(item.ownerId) ?? {
        ownerId: item.ownerId,
        ownerName: item.ownerName,
        opportunities: 0,
        estimatedValue: 0,
        weightedValue: 0,
        closedRealValue: 0,
      };

      current.opportunities += 1;
      current.estimatedValue += item.estimatedValue;
      current.weightedValue += item.weightedValue;
      current.closedRealValue += item.closedRealValue;
      bySellerMap.set(item.ownerId, current);
    }

    const bySeller = Array.from(bySellerMap.values())
      .map((item) => ({
        ...item,
        differenceValue: item.closedRealValue - item.weightedValue,
        accuracyPct: this.computeAccuracy(
          item.weightedValue,
          item.closedRealValue,
        ),
      }))
      .sort((left, right) => right.closedRealValue - left.closedRealValue);

    const totals = items.reduce(
      (accumulator, item) => {
        accumulator.estimatedValue += item.estimatedValue;
        accumulator.weightedValue += item.weightedValue;
        accumulator.closedRealValue += item.closedRealValue;
        return accumulator;
      },
      {
        estimatedValue: 0,
        weightedValue: 0,
        closedRealValue: 0,
      },
    );

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        opportunities: items.length,
        ...totals,
        differenceValue: totals.closedRealValue - totals.weightedValue,
        accuracyPct: this.computeAccuracy(
          totals.weightedValue,
          totals.closedRealValue,
        ),
      },
      bySeller,
      items,
    };
  }

  async getCommercialSla(query: CommercialSlaQueryDto) {
    const { from, to } = this.resolveRange(query);
    const abandonedAfterDays = query.abandonedAfterDays ?? 10;
    const snapshots = await this.getCommercialSnapshots({
      from,
      to,
      ownerId: query.ownerId,
      businessUnitId: query.businessUnitId,
      source: query.source,
      useCreatedRange: true,
    });

    const atRisk = snapshots
      .filter((snapshot) => {
        const daysWithoutContact = snapshot.lastActivityAt
          ? this.computeDaysDifference(
              new Date(snapshot.lastActivityAt),
              new Date(),
            )
          : null;
        return (
          snapshot.hasOverdueActivity ||
          !snapshot.nextActivityAt ||
          snapshot.isStale ||
          (!snapshot.hasCompletedActivity && snapshot.stage === OpportunityStage.NEW) ||
          ((daysWithoutContact ?? 0) >= abandonedAfterDays &&
            !snapshot.hasFutureActivity)
        );
      })
      .map((snapshot) => ({
        opportunityId: snapshot.id,
        title: snapshot.title,
        companyName: snapshot.companyName,
        ownerName: snapshot.ownerName,
        stage: snapshot.stage,
        leadScore: snapshot.leadScore,
        daysWithoutMovement: snapshot.daysWithoutMovement,
        nextActivityAt: snapshot.nextActivityAt,
        lastActivityAt: snapshot.lastActivityAt,
        overdueActivitiesCount: snapshot.overdueActivitiesCount,
        followUpCompliance: snapshot.followUpCompliance,
      }))
      .slice(0, 20);

    const allActivities = snapshots.flatMap((snapshot) => snapshot.raw.activities);
    const completedWithDueDate = allActivities.filter(
      (activity) => activity.completedAt && activity.dueDate,
    );
    const completedOnTime = completedWithDueDate.filter(
      (activity) =>
        (activity.completedAt?.getTime() ?? Number.MAX_SAFE_INTEGER) <=
        (activity.dueDate?.getTime() ?? 0),
    ).length;
    const completedLate = completedWithDueDate.length - completedOnTime;

    const bySellerMap = new Map<
      string,
      {
        ownerId: string;
        ownerName: string;
        opportunities: number;
        firstContactHours: Array<number | null>;
        overdueActivities: number;
        withoutNextActivity: number;
        stale: number;
      }
    >();

    const bySourceMap = new Map<
      string,
      {
        source: string;
        opportunities: number;
        firstContactHours: Array<number | null>;
        overdueActivities: number;
      }
    >();

    for (const snapshot of snapshots) {
      const seller = bySellerMap.get(snapshot.ownerId) ?? {
        ownerId: snapshot.ownerId,
        ownerName: snapshot.ownerName,
        opportunities: 0,
        firstContactHours: [],
        overdueActivities: 0,
        withoutNextActivity: 0,
        stale: 0,
      };
      seller.opportunities += 1;
      seller.firstContactHours.push(snapshot.firstContactHours);
      seller.overdueActivities += snapshot.overdueActivitiesCount;
      seller.withoutNextActivity += snapshot.nextActivityAt ? 0 : 1;
      seller.stale += snapshot.isStale ? 1 : 0;
      bySellerMap.set(snapshot.ownerId, seller);

      const sourceKey = snapshot.source ?? 'UNSPECIFIED';
      const source = bySourceMap.get(sourceKey) ?? {
        source: sourceKey,
        opportunities: 0,
        firstContactHours: [],
        overdueActivities: 0,
      };
      source.opportunities += 1;
      source.firstContactHours.push(snapshot.firstContactHours);
      source.overdueActivities += snapshot.overdueActivitiesCount;
      bySourceMap.set(sourceKey, source);
    }

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        opportunities: snapshots.length,
        avgFirstContactHours: this.average(
          snapshots.map((snapshot) => snapshot.firstContactHours),
        ),
        firstContactWithin24hPct: snapshots.length
          ? Math.round(
              (snapshots.filter(
                (snapshot) =>
                  snapshot.firstContactHours !== null &&
                  snapshot.firstContactHours <= 24,
              ).length /
                snapshots.length) *
                100,
            )
          : 0,
        abandonedOpportunities: snapshots.filter(
          (snapshot) =>
            ((snapshot.lastActivityAt
              ? this.computeDaysDifference(
                  new Date(snapshot.lastActivityAt),
                  new Date(),
                )
              : snapshot.daysWithoutMovement) ?? 0) >= abandonedAfterDays &&
            !snapshot.hasFutureActivity,
        ).length,
        withoutNextActivity: snapshots.filter((snapshot) => !snapshot.nextActivityAt)
          .length,
        overdueActivities: snapshots.reduce(
          (total, snapshot) => total + snapshot.overdueActivitiesCount,
          0,
        ),
        completedOnTime,
        completedLate,
        completedOnTimePct: completedWithDueDate.length
          ? Math.round((completedOnTime / completedWithDueDate.length) * 100)
          : 0,
        uncontactedLeads: snapshots.filter(
          (snapshot) =>
            !snapshot.hasCompletedActivity &&
            snapshot.stage === OpportunityStage.NEW,
        ).length,
      },
      bySeller: Array.from(bySellerMap.values())
        .map((item) => ({
          ownerId: item.ownerId,
          ownerName: item.ownerName,
          opportunities: item.opportunities,
          avgFirstContactHours: this.average(item.firstContactHours),
          overdueActivities: item.overdueActivities,
          withoutNextActivity: item.withoutNextActivity,
          stale: item.stale,
        }))
        .sort((left, right) => right.opportunities - left.opportunities),
      bySource: Array.from(bySourceMap.values())
        .map((item) => ({
          source: item.source,
          opportunities: item.opportunities,
          avgFirstContactHours: this.average(item.firstContactHours),
          overdueActivities: item.overdueActivities,
        }))
        .sort((left, right) => right.opportunities - left.opportunities),
      stageDuration: this.buildStageDurationSummary(snapshots),
      atRisk,
    };
  }

  async getLeadSourcePerformance(query: LeadSourcePerformanceQueryDto) {
    const { from, to } = this.resolveRange(query);
    const snapshots = await this.getCommercialSnapshots({
      from,
      to,
      ownerId: query.ownerId,
      businessUnitId: query.businessUnitId,
      source: query.source,
      stage: query.stage,
      useCreatedRange: true,
    });

    const bySourceMap = new Map<
      string,
      {
        source: string;
        leads: number;
        managedOpportunities: number;
        won: number;
        estimatedValue: number;
        closedRealValue: number;
        firstContactHours: Array<number | null>;
        cycleToCloseDays: Array<number | null>;
        leadScoreValues: number[];
        abandoned: number;
      }
    >();

    for (const snapshot of snapshots) {
      const sourceKey = snapshot.source ?? 'UNSPECIFIED';
      const current = bySourceMap.get(sourceKey) ?? {
        source: sourceKey,
        leads: 0,
        managedOpportunities: 0,
        won: 0,
        estimatedValue: 0,
        closedRealValue: 0,
        firstContactHours: [],
        cycleToCloseDays: [],
        leadScoreValues: [],
        abandoned: 0,
      };
      current.leads += 1;
      current.managedOpportunities +=
        snapshot.stage !== OpportunityStage.NEW || snapshot.totalActivitiesCount > 0
          ? 1
          : 0;
      current.won += snapshot.stage === OpportunityStage.WON ? 1 : 0;
      current.estimatedValue += Number(snapshot.estimatedValue);
      current.closedRealValue += snapshot.closedRealValue;
      current.firstContactHours.push(snapshot.firstContactHours);
      current.cycleToCloseDays.push(snapshot.cycleToCloseDays);
      current.leadScoreValues.push(snapshot.leadScoreValue);
      current.abandoned += snapshot.isStale || !snapshot.nextActivityAt ? 1 : 0;
      bySourceMap.set(sourceKey, current);
    }

    const bySource = Array.from(bySourceMap.values())
      .map((item) => ({
        source: item.source,
        leads: item.leads,
        opportunities: item.managedOpportunities,
        leadToOpportunityPct: item.leads
          ? Math.round((item.managedOpportunities / item.leads) * 100)
          : 0,
        wonCount: item.won,
        wonPct: item.leads ? Math.round((item.won / item.leads) * 100) : 0,
        estimatedValue: item.estimatedValue,
        closedRealValue: item.closedRealValue,
        avgTicket: item.won ? Math.round(item.closedRealValue / item.won) : 0,
        avgFirstContactHours: this.average(item.firstContactHours),
        avgCloseDays: this.average(item.cycleToCloseDays),
        avgLeadScore: this.average(item.leadScoreValues),
        abandonmentRatePct: item.leads
          ? Math.round((item.abandoned / item.leads) * 100)
          : 0,
      }))
      .sort((left, right) => right.closedRealValue - left.closedRealValue);

    const summary = {
      leads: snapshots.length,
      estimatedValue: snapshots.reduce(
        (total, snapshot) => total + Number(snapshot.estimatedValue),
        0,
      ),
      closedRealValue: snapshots.reduce(
        (total, snapshot) => total + snapshot.closedRealValue,
        0,
      ),
      avgFirstContactHours: this.average(
        snapshots.map((snapshot) => snapshot.firstContactHours),
      ),
      avgCloseDays: this.average(
        snapshots.map((snapshot) => snapshot.cycleToCloseDays),
      ),
      avgLeadScore: this.average(
        snapshots.map((snapshot) => snapshot.leadScoreValue),
      ),
    };

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary,
      bySource,
    };
  }

  async getAdvancedForecast(query: AdvancedForecastQueryDto) {
    const { from, to } = this.resolveRange(query);
    const snapshots = await this.getCommercialSnapshots({
      from,
      to,
      ownerId: query.ownerId,
      businessUnitId: query.businessUnitId,
      source: query.source,
      includeForecastOrClosedRange: true,
    });

    const groupItems = <T extends string>(
      keyResolver: (snapshot: CommercialSnapshot) => T,
      labelResolver: (snapshot: CommercialSnapshot) => string,
    ) => {
      const map = new Map<
        T,
        {
          key: T;
          label: string;
          opportunities: number;
          estimatedValue: number;
          weightedValue: number;
          closedRealValue: number;
        }
      >();

      for (const snapshot of snapshots) {
        const key = keyResolver(snapshot);
        const current = map.get(key) ?? {
          key,
          label: labelResolver(snapshot),
          opportunities: 0,
          estimatedValue: 0,
          weightedValue: 0,
          closedRealValue: 0,
        };
        current.opportunities += 1;
        current.estimatedValue += Number(snapshot.estimatedValue);
        current.weightedValue +=
          Number(snapshot.estimatedValue) * (snapshot.probability / 100);
        current.closedRealValue += snapshot.closedRealValue;
        map.set(key, current);
      }

      return Array.from(map.values()).map((item) => ({
        ...item,
        differenceValue: item.closedRealValue - item.weightedValue,
        accuracyPct: this.computeAccuracy(
          item.weightedValue,
          item.closedRealValue,
        ),
      }));
    };

    const monthlyMap = new Map<
      string,
      {
        month: string;
        weightedForecast: number;
        closedRealValue: number;
      }
    >();

    for (const snapshot of snapshots) {
      if (snapshot.expectedCloseDate) {
        const monthKey = snapshot.expectedCloseDate.toISOString().slice(0, 7);
        const current = monthlyMap.get(monthKey) ?? {
          month: monthKey,
          weightedForecast: 0,
          closedRealValue: 0,
        };
        current.weightedForecast +=
          Number(snapshot.estimatedValue) * (snapshot.probability / 100);
        monthlyMap.set(monthKey, current);
      }

      if (snapshot.closeDate) {
        const monthKey = snapshot.closeDate.slice(0, 7);
        const current = monthlyMap.get(monthKey) ?? {
          month: monthKey,
          weightedForecast: 0,
          closedRealValue: 0,
        };
        current.closedRealValue += snapshot.closedRealValue;
        monthlyMap.set(monthKey, current);
      }
    }

    const summary = snapshots.reduce(
      (accumulator, snapshot) => {
        accumulator.estimatedValue += Number(snapshot.estimatedValue);
        accumulator.weightedValue +=
          Number(snapshot.estimatedValue) * (snapshot.probability / 100);
        accumulator.closedRealValue += snapshot.closedRealValue;
        return accumulator;
      },
      {
        estimatedValue: 0,
        weightedValue: 0,
        closedRealValue: 0,
      },
    );

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        opportunities: snapshots.length,
        ...summary,
        differenceValue: summary.closedRealValue - summary.weightedValue,
        accuracyPct: this.computeAccuracy(
          summary.weightedValue,
          summary.closedRealValue,
        ),
      },
      bySeller: groupItems(
        (snapshot) => snapshot.ownerId,
        (snapshot) => snapshot.ownerName,
      ).sort((left, right) => right.closedRealValue - left.closedRealValue),
      byStage: groupItems(
        (snapshot) => snapshot.stage,
        (snapshot) => snapshot.stage,
      ),
      bySource: groupItems(
        (snapshot) => snapshot.source ?? 'UNSPECIFIED',
        (snapshot) => snapshot.source ?? 'UNSPECIFIED',
      ),
      byBusinessUnit: groupItems(
        (snapshot) => snapshot.businessUnitId,
        (snapshot) => snapshot.businessUnitName,
      ),
      monthlyTrend: Array.from(monthlyMap.values()).sort((left, right) =>
        left.month.localeCompare(right.month),
      ),
    };
  }

  async getActivityFeed(query: ActivityFeedQueryDto) {
    const { from, to } = this.resolveRange(query);
    const take = query.limit ?? 25;

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        userId: query.userId || undefined,
        entity: query.entity || undefined,
        action: query.eventType || undefined,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      take,
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
    });

    const activities = await this.prisma.activity.findMany({
      where: {
        userId: query.userId || undefined,
        ...(query.entity && query.entity !== 'Activity'
          ? { id: '__no_match__' }
          : {}),
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      take,
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
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    const auditItems = auditLogs.map((item) => ({
      id: `audit-${item.id}`,
      source: 'AUDIT',
      eventType: item.action,
      entity: item.entity,
      entityId: item.entityId,
      title: item.action,
      description: item.entity,
      actorName: item.user?.name ?? 'Sistema',
      createdAt: item.createdAt.toISOString(),
    }));

    const activityItems = activities
      .filter((item) => !query.eventType || item.type === query.eventType)
      .map((item) => ({
        id: `activity-${item.id}`,
        source: 'ACTIVITY',
        eventType: item.type,
        entity: 'Activity',
        entityId: item.id,
        title: item.subject,
        description:
          item.opportunity?.title ??
          item.company?.name ??
          (item.contact
            ? `${item.contact.firstName} ${item.contact.lastName}`
            : 'Seguimiento comercial'),
        actorName: item.user?.name ?? 'Sistema',
        createdAt: item.createdAt.toISOString(),
        dueDate: item.dueDate?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
      }));

    const data = [...auditItems, ...activityItems]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, take);

    return {
      data,
      meta: {
        total: data.length,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    };
  }

  async getSellers() {
    const sellers = await this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        ownedOpportunities: { select: { id: true } },
        sales: {
          where: { status: SaleStatus.CLOSED },
          select: { totalAmount: true },
        },
      },
    });

    return sellers
      .map((seller) => {
        const totalAmount = seller.sales.reduce(
          (accumulator, sale) => accumulator + Number(sale.totalAmount),
          0,
        );

        return {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          opportunities: seller.ownedOpportunities.length,
          closedSales: seller.sales.length,
          totalAmount,
        };
      })
      .sort((left, right) => right.totalAmount - left.totalAmount)
      .filter((seller) => seller.opportunities > 0 || seller.closedSales > 0);
  }
}
