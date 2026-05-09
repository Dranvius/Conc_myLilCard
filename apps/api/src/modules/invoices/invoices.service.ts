import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findMany(query: InvoiceQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      companyId: query.companyId || undefined,
      OR: query.search
        ? [
            {
              invoiceNumber: {
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
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          sale: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        sale: {
          include: {
            opportunity: {
              include: {
                businessUnit: true,
              },
            },
          },
        },
      },
    });
  }

  create(createInvoiceDto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        ...createInvoiceDto,
        issuedAt: new Date(createInvoiceDto.issuedAt),
        dueDate: new Date(createInvoiceDto.dueDate),
        paidAt: createInvoiceDto.paidAt
          ? new Date(createInvoiceDto.paidAt)
          : null,
      },
      include: {
        company: true,
        sale: true,
      },
    });
  }

  async updateStatus(
    id: string,
    updateInvoiceStatusDto: UpdateInvoiceStatusDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: updateInvoiceStatusDto.status,
        paidAt:
          updateInvoiceStatusDto.status === InvoiceStatus.PAID
            ? updateInvoiceStatusDto.paidAt
              ? new Date(updateInvoiceStatusDto.paidAt)
              : new Date()
            : undefined,
      },
      include: {
        company: true,
      },
    });

    await this.auditLogsService.create({
      userId: actorUserId,
      action: 'INVOICE_UPDATED',
      entity: 'Invoice',
      entityId: invoice.id,
      metadata: {
        status: invoice.status,
        invoiceNumber: invoice.invoiceNumber,
      },
      ipAddress,
    });

    return invoice;
  }
}
