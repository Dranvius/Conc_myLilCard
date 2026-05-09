import { Injectable } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findMany(query: SaleQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      ownerId: query.ownerId || undefined,
      companyId: query.companyId || undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          opportunity: {
            include: {
              businessUnit: true,
            },
          },
          proposal: true,
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.sale.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        opportunity: {
          include: {
            company: true,
            businessUnit: true,
          },
        },
        proposal: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        invoices: true,
        serviceOrders: true,
      },
    });
  }

  async create(
    createSaleDto: CreateSaleDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const opportunity = await this.prisma.salesOpportunity.findUniqueOrThrow({
      where: { id: createSaleDto.opportunityId },
      include: {
        company: true,
      },
    });

    const proposal = createSaleDto.proposalId
      ? await this.prisma.proposal.findUniqueOrThrow({
          where: { id: createSaleDto.proposalId },
        })
      : null;

    const status = createSaleDto.status ?? SaleStatus.CONFIRMED;
    const totalAmount =
      createSaleDto.totalAmount ??
      Number(proposal?.totalAmount ?? opportunity.estimatedValue);

    const sale = await this.prisma.sale.create({
      data: {
        opportunityId: opportunity.id,
        proposalId: proposal?.id ?? null,
        companyId: opportunity.companyId,
        ownerId: createSaleDto.ownerId ?? actorUserId ?? opportunity.ownerId,
        status,
        totalAmount,
        closedAt:
          status === SaleStatus.CLOSED
            ? createSaleDto.closedAt
              ? new Date(createSaleDto.closedAt)
              : new Date()
            : null,
      },
      include: {
        company: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        opportunity: {
          include: {
            businessUnit: true,
          },
        },
        proposal: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: sale.id,
      metadata: {
        status: sale.status,
        totalAmount,
        company: sale.company.name,
      },
      ipAddress,
    });

    return sale;
  }

  updateStatus(id: string, updateSaleStatusDto: UpdateSaleStatusDto) {
    return this.prisma.sale.update({
      where: { id },
      data: {
        status: updateSaleStatusDto.status,
        closedAt:
          updateSaleStatusDto.status === SaleStatus.CLOSED
            ? new Date()
            : undefined,
      },
      include: {
        company: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        opportunity: {
          include: {
            businessUnit: true,
          },
        },
      },
    });
  }
}
