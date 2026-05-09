import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

interface CreateAuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as object | undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async findMany(query: AuditLogQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);

    const where = {
      entity: query.entity || undefined,
      action: query.action || undefined,
      userId: query.userId || undefined,
      OR: query.search
        ? [
            {
              entity: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              action: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              entityId: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
