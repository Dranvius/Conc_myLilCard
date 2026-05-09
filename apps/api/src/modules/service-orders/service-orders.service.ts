import { Injectable } from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { AssignServiceOrderDto } from './dto/assign-service-order.dto';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';
import { UpdateServiceOrderStatusDto } from './dto/update-service-order-status.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findMany(query: ServiceOrderQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      priority: query.priority || undefined,
      assignedOperatorId: query.assignedOperatorId || undefined,
      companyId: query.companyId || undefined,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              type: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              company: {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          contact: true,
          sale: true,
          assignedOperator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.serviceOrder.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        contact: true,
        sale: {
          include: {
            company: true,
          },
        },
        assignedOperator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviews: true,
      },
    });
  }

  async create(
    createServiceOrderDto: CreateServiceOrderDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const serviceOrder = await this.prisma.serviceOrder.create({
      data: {
        ...createServiceOrderDto,
        status: createServiceOrderDto.status ?? ServiceOrderStatus.OPEN,
        scheduledAt: createServiceOrderDto.scheduledAt
          ? new Date(createServiceOrderDto.scheduledAt)
          : null,
      },
      include: {
        company: true,
        contact: true,
        sale: true,
        assignedOperator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'SERVICE_ORDER_CREATED',
      entity: 'ServiceOrder',
      entityId: serviceOrder.id,
      metadata: {
        code: serviceOrder.code,
        company: serviceOrder.company.name,
      },
      ipAddress,
    });

    return serviceOrder;
  }

  update(id: string, updateServiceOrderDto: UpdateServiceOrderDto) {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        ...updateServiceOrderDto,
        scheduledAt: updateServiceOrderDto.scheduledAt
          ? new Date(updateServiceOrderDto.scheduledAt)
          : undefined,
      },
      include: {
        company: true,
        contact: true,
        sale: true,
        assignedOperator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  updateStatus(
    id: string,
    updateServiceOrderStatusDto: UpdateServiceOrderStatusDto,
  ) {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        status: updateServiceOrderStatusDto.status,
        completedAt:
          updateServiceOrderStatusDto.status === ServiceOrderStatus.COMPLETED
            ? new Date()
            : undefined,
      },
      include: {
        company: true,
        assignedOperator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async assign(id: string, assignServiceOrderDto: AssignServiceOrderDto) {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        assignedOperatorId: assignServiceOrderDto.assignedOperatorId,
        status: ServiceOrderStatus.ASSIGNED,
      },
      include: {
        company: true,
        assignedOperator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
