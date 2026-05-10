import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async awardPoints(userId: string, points: number, reason: string, metadata?: any) {
    this.logger.log(`Awarding ${points} points to user ${userId} for ${reason}`);
    
    return this.prisma.$transaction(async (tx) => {
      // 1. Record point action
      await tx.pointAction.create({
        data: { userId, points, reason, metadata },
      });

      // 2. Update user stats
      const stats = await tx.userStats.upsert({
        where: { userId },
        update: {
          points: { increment: points },
        },
        create: {
          userId,
          points,
          level: 1,
        },
      });

      // Update level based on points (simple formula: level = floor(points / 500) + 1)
      const newLevel = Math.floor(stats.points / 500) + 1;
      if (newLevel !== stats.level) {
        await tx.userStats.update({
          where: { userId },
          data: { level: newLevel },
        });
      }

      // 3. Check for specific achievement badges
      await this.checkAndAwardBadges(userId, tx);

      return stats;
    });
  }

  private async checkAndAwardBadges(userId: string, tx: any) {
    const stats = await tx.userStats.findUnique({ where: { userId } });
    
    // Achievement: First Sale Won
    if (stats.opportunitiesWon >= 1) {
      await this.grantBadge(userId, 'FIRST_WIN', tx);
    }

    // Achievement: Points Milestone
    if (stats.points >= 1000) {
      await this.grantBadge(userId, 'ELITE_SELLER', tx);
    }
    
    // Achievement: Activity Milestone
    if (stats.activitiesDone >= 50) {
      await this.grantBadge(userId, 'PRODUCTIVE_AGENT', tx);
    }
  }

  private async grantBadge(userId: string, badgeName: string, tx: any) {
    const badge = await tx.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return;

    await tx.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id },
    });
  }

  async getLeaderboard() {
    return this.prisma.userStats.findMany({
      orderBy: { points: 'desc' },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      take: 10,
    });
  }

  async getUserProfile(userId: string) {
    return this.prisma.userStats.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            badges: { include: { badge: true } },
            pointActions: { take: 5, orderBy: { createdAt: 'desc' } },
          }
        }
      }
    });
  }
}
