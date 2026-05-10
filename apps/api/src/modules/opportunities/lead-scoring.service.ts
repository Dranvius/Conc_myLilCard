import { Injectable } from '@nestjs/common';
import {
  LeadSource,
  OpportunityStage,
  type SalesOpportunity,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface OpportunityCommercialInsights {
  leadScore: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  leadScoreValue: number;
  leadScoreReasons: string[];
  daysWithoutMovement: number;
  isStale: boolean;
  staleSeverity: 'warning' | 'critical' | null;
  lastActivityAt: string | null;
  nextActivityAt: string | null;
  openActivitiesCount: number;
  overdueActivitiesCount: number;
  totalActivitiesCount: number;
}

type OpportunityBase = Pick<
  SalesOpportunity,
  | 'id'
  | 'stage'
  | 'stageChangedAt'
  | 'updatedAt'
  | 'estimatedValue'
  | 'probability'
  | 'source'
  | 'contactId'
>;

type ActivitySnapshot = {
  opportunityId: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

type ActivitySummary = {
  lastActivityAt: Date | null;
  nextActivityAt: Date | null;
  openActivitiesCount: number;
  overdueActivitiesCount: number;
  totalActivitiesCount: number;
};

@Injectable()
export class LeadScoringService {
  constructor(private readonly prisma: PrismaService) {}

  private getDaysDifference(from: Date, to: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((from.getTime() - to.getTime()) / msPerDay));
  }

  private summarizeActivities(
    activities: ActivitySnapshot[],
    now: Date,
  ): ActivitySummary {
    const openActivities = activities.filter(
      (activity) => !activity.completedAt,
    );
    const overdueActivities = openActivities.filter(
      (activity) =>
        activity.dueDate && activity.dueDate.getTime() < now.getTime(),
    );

    const completedDates = activities
      .map((activity) => activity.completedAt ?? activity.createdAt)
      .sort((left, right) => right.getTime() - left.getTime());

    const nextActivity = openActivities
      .filter((activity) => activity.dueDate)
      .sort((left, right) => {
        const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })[0];

    return {
      lastActivityAt: completedDates[0] ?? null,
      nextActivityAt: nextActivity?.dueDate ?? null,
      openActivitiesCount: openActivities.length,
      overdueActivitiesCount: overdueActivities.length,
      totalActivitiesCount: activities.length,
    };
  }

  private buildScore(
    opportunity: OpportunityBase,
    summary: ActivitySummary,
    daysWithoutMovement: number,
  ) {
    if (
      opportunity.stage === OpportunityStage.WON ||
      opportunity.stage === OpportunityStage.LOST
    ) {
      return {
        score: 5,
        priority: 'P4' as const,
        reasons: [
          'La oportunidad ya está cerrada y su prioridad operativa es baja.',
        ],
      };
    }

    let score = 0;
    const reasons: string[] = [];
    const estimatedValue = Number(opportunity.estimatedValue);

    const sourceWeight: Record<LeadSource, number> = {
      WEB_FORM: 18,
      REFERRAL: 16,
      CONGRESS: 14,
      WHATSAPP: 12,
      SOCIAL_MEDIA: 10,
      PHONE: 10,
      COLD_CALL: 6,
      OTHER: 4,
    };

    if (opportunity.source) {
      score += sourceWeight[opportunity.source];
      reasons.push(`Origen ${opportunity.source} aporta intención comercial.`);
    } else {
      score += 2;
      reasons.push('Falta clasificar el origen del lead y requiere revisión.');
    }

    if (estimatedValue >= 20000000) {
      score += 18;
      reasons.push('Monto estimado alto para el pipeline actual.');
    } else if (estimatedValue >= 10000000) {
      score += 14;
      reasons.push('Monto estimado relevante para priorizar seguimiento.');
    } else if (estimatedValue >= 5000000) {
      score += 10;
    } else if (estimatedValue >= 1000000) {
      score += 6;
    } else {
      score += 2;
    }

    if (opportunity.probability >= 80) {
      score += 20;
      reasons.push('La probabilidad declarada es muy alta.');
    } else if (opportunity.probability >= 60) {
      score += 14;
    } else if (opportunity.probability >= 40) {
      score += 8;
    } else if (opportunity.probability >= 20) {
      score += 4;
    }

    const stageWeight: Record<OpportunityStage, number> = {
      NEW: 3,
      CONTACTED: 6,
      QUALIFIED: 10,
      PROPOSAL_SENT: 13,
      NEGOTIATION: 16,
      WON: 0,
      LOST: 0,
    };
    score += stageWeight[opportunity.stage];

    if (summary.totalActivitiesCount >= 5) {
      score += 8;
      reasons.push(
        'Existe tracción comercial con varias interacciones registradas.',
      );
    } else if (summary.totalActivitiesCount >= 2) {
      score += 4;
    } else if (summary.totalActivitiesCount === 0) {
      score -= 6;
      reasons.push('No tiene actividades registradas todavía.');
    }

    if (opportunity.contactId) {
      score += 4;
    } else {
      score -= 4;
      reasons.push(
        'No tiene contacto asociado, lo que reduce calidad del lead.',
      );
    }

    if (summary.nextActivityAt) {
      score += 8;
      reasons.push('Ya tiene un próximo seguimiento programado.');
    } else {
      score -= 10;
      reasons.push('No tiene una próxima actividad programada.');
    }

    if (summary.overdueActivitiesCount > 0) {
      score += 12;
      reasons.push(
        'Tiene actividades vencidas que requieren atención inmediata.',
      );
    }

    if (daysWithoutMovement > 14) {
      score += 14;
      reasons.push(`Lleva ${daysWithoutMovement} días sin mover etapa.`);
    } else if (daysWithoutMovement > 7) {
      score += 8;
      reasons.push(`Lleva ${daysWithoutMovement} días sin mover etapa.`);
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    const priority =
      normalizedScore >= 80
        ? 'P0'
        : normalizedScore >= 65
          ? 'P1'
          : normalizedScore >= 50
            ? 'P2'
            : normalizedScore >= 35
              ? 'P3'
              : 'P4';

    return {
      score: normalizedScore,
      priority,
      reasons,
    };
  }

  async enrichOpportunities<T extends OpportunityBase>(opportunities: T[]) {
    if (!opportunities.length) {
      return [] as Array<T & OpportunityCommercialInsights>;
    }

    const now = new Date();
    const activities = await this.prisma.activity.findMany({
      where: {
        opportunityId: {
          in: opportunities.map((opportunity) => opportunity.id),
        },
      },
      select: {
        opportunityId: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const groupedActivities = new Map<string, ActivitySnapshot[]>();
    for (const activity of activities) {
      if (!activity.opportunityId) {
        continue;
      }

      const current = groupedActivities.get(activity.opportunityId) ?? [];
      current.push(activity);
      groupedActivities.set(activity.opportunityId, current);
    }

    return opportunities.map((opportunity) => {
      const summary = this.summarizeActivities(
        groupedActivities.get(opportunity.id) ?? [],
        now,
      );
      const stageAnchor = opportunity.stageChangedAt ?? opportunity.updatedAt;
      const daysWithoutMovement = this.getDaysDifference(now, stageAnchor);
      const staleSeverity =
        daysWithoutMovement >= 14
          ? 'critical'
          : daysWithoutMovement >= 7
            ? 'warning'
            : null;
      const score = this.buildScore(opportunity, summary, daysWithoutMovement);

      return {
        ...opportunity,
        leadScore: score.priority,
        leadScoreValue: score.score,
        leadScoreReasons: score.reasons,
        daysWithoutMovement,
        isStale: staleSeverity !== null,
        staleSeverity,
        lastActivityAt: summary.lastActivityAt?.toISOString() ?? null,
        nextActivityAt: summary.nextActivityAt?.toISOString() ?? null,
        openActivitiesCount: summary.openActivitiesCount,
        overdueActivitiesCount: summary.overdueActivitiesCount,
        totalActivitiesCount: summary.totalActivitiesCount,
      };
    });
  }
}
