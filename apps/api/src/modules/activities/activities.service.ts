import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: { companyId?: string; opportunityId?: string; contactId?: string }) {
    const activities = await this.prisma.activity.findMany({
      where: {
        companyId: filters.companyId || undefined,
        opportunityId: filters.opportunityId || undefined,
        contactId: filters.contactId || undefined,
      },
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

    return activities.map(a => ({
      ...a,
      title: a.subject,
      date: a.completedAt || a.createdAt,
      createdBy: a.user,
    }));
  }

  async create(createActivityDto: CreateActivityDto, userId: string) {
    const activity = await this.prisma.activity.create({
      data: {
        type: createActivityDto.type,
        subject: createActivityDto.title,
        description: createActivityDto.description,
        completedAt: new Date(createActivityDto.date),
        companyId: createActivityDto.companyId,
        opportunityId: createActivityDto.opportunityId,
        contactId: createActivityDto.contactId,
        userId: userId,
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

    return {
      ...activity,
      title: activity.subject,
      date: activity.completedAt || activity.createdAt,
      createdBy: activity.user,
    };
  }
}
