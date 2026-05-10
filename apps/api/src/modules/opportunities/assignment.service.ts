import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { LeadSource, OpportunityStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Assignee = {
  id: string;
  name: string;
  email: string;
  businessUnitId: string | null;
};

export interface AssignmentResult {
  user: Assignee;
  scopeKey: string;
  usedFallbackScope: boolean;
  strategy: 'RULE' | 'ROUND_ROBIN';
  reason: string;
  ruleId?: string;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseTargetUserIds(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private buildScopeKey(
    entityType: string,
    roleName: string,
    businessUnitId?: string | null,
    suffix?: string,
  ) {
    return [
      entityType,
      roleName,
      businessUnitId ?? 'GLOBAL',
      suffix ?? 'DEFAULT',
    ].join(':');
  }

  private async findEligibleUsers(
    roleName: string,
    businessUnitId?: string | null,
    targetUserIds?: string[],
  ) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(targetUserIds?.length
          ? {
              id: {
                in: targetUserIds,
              },
            }
          : {}),
        role: {
          name: roleName,
        },
        ...(businessUnitId
          ? {
              OR: [{ businessUnitId }, { businessUnitId: null }],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        businessUnitId: true,
      },
    });
  }

  private matchesRule(
    rule: {
      businessUnitId: string | null;
      leadSource: LeadSource | null;
      city: string | null;
      country: string | null;
      minEstimatedValue: Prisma.Decimal | null;
      maxEstimatedValue: Prisma.Decimal | null;
      minProbability: number | null;
      maxProbability: number | null;
      priorityBand: string | null;
    },
    params: {
      businessUnitId?: string | null;
      leadSource?: LeadSource | null;
      city?: string | null;
      country?: string | null;
      estimatedValue?: number | null;
      probability?: number | null;
      leadScore?: string | null;
    },
  ) {
    if (rule.businessUnitId && rule.businessUnitId !== params.businessUnitId) {
      return false;
    }
    if (rule.leadSource && rule.leadSource !== params.leadSource) {
      return false;
    }
    if (
      rule.city &&
      rule.city.trim().toLowerCase() !== (params.city ?? '').trim().toLowerCase()
    ) {
      return false;
    }
    if (
      rule.country &&
      rule.country.trim().toLowerCase() !==
        (params.country ?? '').trim().toLowerCase()
    ) {
      return false;
    }

    const estimatedValue = params.estimatedValue ?? null;
    if (
      rule.minEstimatedValue &&
      (estimatedValue === null ||
        estimatedValue < Number(rule.minEstimatedValue))
    ) {
      return false;
    }
    if (
      rule.maxEstimatedValue &&
      (estimatedValue === null ||
        estimatedValue > Number(rule.maxEstimatedValue))
    ) {
      return false;
    }

    const probability = params.probability ?? null;
    if (
      rule.minProbability !== null &&
      rule.minProbability !== undefined &&
      (probability === null || probability < rule.minProbability)
    ) {
      return false;
    }
    if (
      rule.maxProbability !== null &&
      rule.maxProbability !== undefined &&
      (probability === null || probability > rule.maxProbability)
    ) {
      return false;
    }

    if (
      rule.priorityBand &&
      params.leadScore &&
      rule.priorityBand !== params.leadScore
    ) {
      return false;
    }

    return true;
  }

  private async selectBalancedUser(
    users: Assignee[],
    scopeKey: string,
    roleName: string,
    businessUnitId?: string | null,
  ) {
    const loadByOwner = await this.prisma.salesOpportunity.groupBy({
      by: ['ownerId'],
      where: {
        ownerId: {
          in: users.map((user) => user.id),
        },
        stage: {
          notIn: [OpportunityStage.WON, OpportunityStage.LOST],
        },
      },
      _count: {
        _all: true,
      },
    });

    const loadMap = new Map(
      loadByOwner.map((item) => [item.ownerId, item._count._all]),
    );
    const minimumLoad = Math.min(
      ...users.map((user) => loadMap.get(user.id) ?? 0),
    );
    const lowestLoadUsers = users.filter(
      (user) => (loadMap.get(user.id) ?? 0) === minimumLoad,
    );

    const cursor = await this.prisma.assignmentCursor.upsert({
      where: { scopeKey },
      update: {},
      create: {
        scopeKey,
        entityType: 'OPPORTUNITY',
        roleName,
        businessUnitId: businessUnitId ?? null,
      },
    });

    const previousIndex = lowestLoadUsers.findIndex(
      (user) => user.id === cursor.lastUserId,
    );
    const nextIndex =
      previousIndex >= 0 ? (previousIndex + 1) % lowestLoadUsers.length : 0;
    const nextUser = lowestLoadUsers[nextIndex];

    await this.prisma.assignmentCursor.update({
      where: { scopeKey },
      data: {
        lastUserId: nextUser.id,
      },
    });

    return nextUser;
  }

  async assignNextOpportunityOwner(params: {
    businessUnitId?: string | null;
    roleName?: string;
    leadSource?: LeadSource | null;
    city?: string | null;
    country?: string | null;
    estimatedValue?: number | null;
    probability?: number | null;
    leadScore?: string | null;
  }): Promise<AssignmentResult> {
    const roleName = params.roleName ?? 'SALES';
    const rules = await this.prisma.assignmentRule.findMany({
      where: {
        entityType: 'OPPORTUNITY',
        isActive: true,
        OR: [
          { businessUnitId: params.businessUnitId ?? undefined },
          { businessUnitId: null },
        ],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    const matchedRule = rules.find((rule) => this.matchesRule(rule, params));
    if (matchedRule) {
      const targetUserIds = this.parseTargetUserIds(matchedRule.targetUserIds);
      const eligibleRuleUsers = await this.findEligibleUsers(
        matchedRule.roleName,
        matchedRule.businessUnitId ?? params.businessUnitId,
        targetUserIds,
      );

      if (eligibleRuleUsers.length) {
        const scopeKey = this.buildScopeKey(
          'OPPORTUNITY',
          matchedRule.roleName,
          matchedRule.businessUnitId ?? params.businessUnitId,
          `RULE:${matchedRule.id}`,
        );
        const user = await this.selectBalancedUser(
          eligibleRuleUsers,
          scopeKey,
          matchedRule.roleName,
          matchedRule.businessUnitId ?? params.businessUnitId,
        );

        this.logger.log(
          JSON.stringify({
            event: 'assignment.rule.applied',
            ruleId: matchedRule.id,
            scopeKey,
            userId: user.id,
            businessUnitId: params.businessUnitId ?? null,
            leadSource: params.leadSource ?? null,
          }),
        );

        return {
          user,
          scopeKey,
          usedFallbackScope: false,
          strategy: 'RULE',
          reason: `Asignado por regla ${matchedRule.name}`,
          ruleId: matchedRule.id,
        };
      }
    }

    const scopedUsers = await this.findEligibleUsers(
      roleName,
      params.businessUnitId,
    );
    const globalUsers =
      params.businessUnitId && scopedUsers.length === 0
        ? await this.findEligibleUsers(roleName)
        : [];

    const eligibleUsers = scopedUsers.length ? scopedUsers : globalUsers;
    if (!eligibleUsers.length) {
      throw new ServiceUnavailableException(
        'No hay usuarios comerciales activos disponibles para asignacion automatica.',
      );
    }

    const effectiveBusinessUnitId =
      scopedUsers.length > 0 ? (params.businessUnitId ?? null) : null;
    const scopeKey = this.buildScopeKey(
      'OPPORTUNITY',
      roleName,
      effectiveBusinessUnitId,
      'ROUND_ROBIN',
    );
    const nextUser = await this.selectBalancedUser(
      eligibleUsers,
      scopeKey,
      roleName,
      effectiveBusinessUnitId,
    );

    this.logger.log(
      JSON.stringify({
        event: 'assignment.round_robin.applied',
        scopeKey,
        userId: nextUser.id,
        usedFallbackScope: scopedUsers.length === 0 && Boolean(params.businessUnitId),
      }),
    );

    return {
      user: nextUser,
      scopeKey,
      usedFallbackScope:
        scopedUsers.length === 0 && Boolean(params.businessUnitId),
      strategy: 'ROUND_ROBIN',
      reason:
        scopedUsers.length === 0 && Boolean(params.businessUnitId)
          ? 'Asignado por round robin global'
          : 'Asignado por round robin de la unidad comercial',
    };
  }
}
