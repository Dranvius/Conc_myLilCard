import { Injectable } from '@nestjs/common';
import { OpportunityStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityQueryDto } from './dto/opportunity-query.dto';
import { UpdateOpportunityStageDto } from './dto/update-opportunity-stage.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findMany(query: OpportunityQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      stage: query.stage || undefined,
      ownerId: query.ownerId || undefined,
      businessUnitId: query.businessUnitId || undefined,
      companyId: query.companyId || undefined,
      OR: query.search
        ? [
            {
              title: {
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
      this.prisma.salesOpportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          contact: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
          businessUnit: true,
          _count: {
            select: {
              proposals: true,
              sales: true,
            },
          },
        },
      }),
      this.prisma.salesOpportunity.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.salesOpportunity.findUniqueOrThrow({
      where: { id },
      include: {
        company: true,
        contact: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        businessUnit: true,
        proposals: {
          include: {
            items: {
              include: {
                product: true,
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
          },
        },
      },
    });
  }

  create(createOpportunityDto: CreateOpportunityDto) {
    return this.prisma.salesOpportunity.create({
      data: {
        ...createOpportunityDto,
        expectedCloseDate: createOpportunityDto.expectedCloseDate
          ? new Date(createOpportunityDto.expectedCloseDate)
          : null,
      },
      include: {
        company: true,
        contact: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        businessUnit: true,
      },
    });
  }

  update(id: string, updateOpportunityDto: UpdateOpportunityDto) {
    return this.prisma.salesOpportunity.update({
      where: { id },
      data: {
        ...updateOpportunityDto,
        expectedCloseDate: updateOpportunityDto.expectedCloseDate
          ? new Date(updateOpportunityDto.expectedCloseDate)
          : updateOpportunityDto.expectedCloseDate === null
            ? null
            : undefined,
      },
      include: {
        company: true,
        contact: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        businessUnit: true,
      },
    });
  }

  async updateStage(
    id: string,
    updateStageDto: UpdateOpportunityStageDto,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const opportunity = await this.prisma.salesOpportunity.update({
      where: { id },
      data: {
        stage: updateStageDto.stage,
      },
      include: {
        company: true,
        businessUnit: true,
      },
    });

    if (
      updateStageDto.stage === OpportunityStage.WON ||
      updateStageDto.stage === OpportunityStage.LOST
    ) {
      await this.auditLogsService.create({
        userId: actorUserId,
        action: 'OPPORTUNITY_CLOSED',
        entity: 'SalesOpportunity',
        entityId: id,
        metadata: {
          stage: updateStageDto.stage,
          company: opportunity.company.name,
          businessUnit: opportunity.businessUnit.name,
        },
        ipAddress,
      });
    }

    return opportunity;
  }
}
