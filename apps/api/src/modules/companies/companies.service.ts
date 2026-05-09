import { Injectable } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: CompanyQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      businessUnitId: query.businessUnitId || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              legalName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              taxId: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              city: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          businessUnit: true,
          _count: {
            select: {
              contacts: true,
              opportunities: true,
              sales: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.company.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        businessUnit: true,
        contacts: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        opportunities: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        sales: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            opportunity: {
              select: {
                businessUnit: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        serviceOrders: {
          include: {
            assignedOperator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        invoices: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  create(createCompanyDto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: createCompanyDto,
      include: {
        businessUnit: true,
      },
    });
  }

  update(id: string, updateCompanyDto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
      include: {
        businessUnit: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: CompanyStatus.ARCHIVED,
      },
    });

    return { success: true };
  }
}
