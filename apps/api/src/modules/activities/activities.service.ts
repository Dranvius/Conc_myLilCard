import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ActivityFollowUpQueryDto } from './dto/activity-follow-up-query.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private formatActivity(
    activity: Prisma.ActivityGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    }>,
  ) {
    const now = new Date();
    const isCompleted = Boolean(activity.completedAt);
    const referenceDate =
      activity.completedAt ?? activity.dueDate ?? activity.createdAt;
    const isOverdue =
      !isCompleted &&
      Boolean(activity.dueDate) &&
      (activity.dueDate?.getTime() ?? 0) < now.getTime();

    return {
      ...activity,
      title: activity.subject,
      date: referenceDate.toISOString(),
      createdBy: activity.user,
      status: isCompleted ? 'COMPLETED' : 'PLANNED',
      dueDate: activity.dueDate?.toISOString() ?? null,
      completedAt: activity.completedAt?.toISOString() ?? null,
      isOverdue,
    };
  }

  private resolveCreateStatus(createActivityDto: CreateActivityDto) {
    if (createActivityDto.status) {
      return createActivityDto.status;
    }

    return createActivityDto.type === ActivityType.TASK ||
      createActivityDto.type === ActivityType.MEETING
      ? 'PLANNED'
      : 'COMPLETED';
  }

  private sortActivities(
    left: { completedAt: Date | null; dueDate: Date | null; createdAt: Date },
    right: { completedAt: Date | null; dueDate: Date | null; createdAt: Date },
  ) {
    const leftTime =
      left.completedAt?.getTime() ??
      left.dueDate?.getTime() ??
      left.createdAt.getTime();
    const rightTime =
      right.completedAt?.getTime() ??
      right.dueDate?.getTime() ??
      right.createdAt.getTime();

    return rightTime - leftTime;
  }

  async findMany(filters: {
    companyId?: string;
    opportunityId?: string;
    contactId?: string;
    status?: string;
  }) {
    const now = new Date();
    const where: Prisma.ActivityWhereInput = {
      companyId: filters.companyId || undefined,
      opportunityId: filters.opportunityId || undefined,
      contactId: filters.contactId || undefined,
    };

    if (filters.status === 'open') {
      where.completedAt = null;
    }
    if (filters.status === 'completed') {
      where.completedAt = { not: null };
    }
    if (filters.status === 'overdue') {
      where.completedAt = null;
      where.dueDate = { lt: now };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return activities
      .sort((left, right) => this.sortActivities(left, right))
      .map((activity) => this.formatActivity(activity));
  }

  async findFollowUps(query: ActivityFollowUpQueryDto, currentUser: AuthUser) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const isRestricted =
      currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER';

    const where: Prisma.ActivityWhereInput = {
      completedAt: null,
      dueDate: { not: null },
      opportunityId: query.opportunityId || undefined,
      userId: isRestricted ? currentUser.sub : query.userId || undefined,
    };

    if (query.status === 'overdue') {
      where.dueDate = { lt: now };
    }
    if (query.status === 'today') {
      where.dueDate = { gte: startOfDay, lte: endOfDay };
    }
    if (query.status === 'upcoming') {
      where.dueDate = { gt: endOfDay };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      take: query.limit ?? 20,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
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
        opportunity: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return activities.map((activity) => this.formatActivity(activity));
  }

  async create(
    createActivityDto: CreateActivityDto,
    userId: string,
    ipAddress?: string,
  ) {
    const parsedDate = new Date(createActivityDto.date);
    const status = this.resolveCreateStatus(createActivityDto);
    const activity = await this.prisma.activity.create({
      data: {
        type: createActivityDto.type,
        subject: createActivityDto.title,
        description: createActivityDto.description,
        dueDate: status === 'PLANNED' ? parsedDate : null,
        completedAt: status === 'COMPLETED' ? parsedDate : null,
        companyId: createActivityDto.companyId,
        opportunityId: createActivityDto.opportunityId,
        contactId: createActivityDto.contactId,
        userId,
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

    await this.auditLogsService.create({
      userId,
      action: 'ACTIVITY_CREATED',
      entity: 'Activity',
      entityId: activity.id,
      metadata: {
        type: activity.type,
        status,
        opportunityId: activity.opportunityId,
        companyId: activity.companyId,
        contactId: activity.contactId,
      },
      ipAddress,
    });

    return this.formatActivity(activity);
  }

  async complete(
    id: string,
    userId: string,
    completeActivityDto: CompleteActivityDto,
    ipAddress?: string,
  ) {
    const completedAt = completeActivityDto.completedAt
      ? new Date(completeActivityDto.completedAt)
      : new Date();

    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        completedAt,
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

    await this.auditLogsService.create({
      userId,
      action: 'ACTIVITY_COMPLETED',
      entity: 'Activity',
      entityId: activity.id,
      metadata: {
        type: activity.type,
        dueDate: activity.dueDate,
        completedAt,
      },
      ipAddress,
    });

    return this.formatActivity(activity);
  }
}
