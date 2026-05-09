import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import {
  CreateProposalDto,
  ProposalItemInputDto,
} from './dto/create-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProposalQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      status: query.status || undefined,
      opportunityId: query.opportunityId || undefined,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              title: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          opportunity: {
            include: {
              company: true,
              businessUnit: true,
            },
          },
          items: true,
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.proposal.findUniqueOrThrow({
      where: { id },
      include: {
        opportunity: {
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
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  private async buildItems(items: ProposalItemInputDto[]) {
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.productId),
        },
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    return items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const unitPrice = item.unitPrice ?? Number(product.unitPrice);
      const discount = item.discount ?? 0;
      const total = unitPrice * item.quantity - discount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount,
        total,
      };
    });
  }

  async create(createProposalDto: CreateProposalDto) {
    const items = await this.buildItems(createProposalDto.items);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = createProposalDto.taxRate ?? 19;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({
        data: {
          opportunityId: createProposalDto.opportunityId,
          code: createProposalDto.code,
          title: createProposalDto.title,
          status: createProposalDto.status,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          validUntil: createProposalDto.validUntil
            ? new Date(createProposalDto.validUntil)
            : null,
          notes: createProposalDto.notes,
        },
      });

      await tx.proposalItem.createMany({
        data: items.map((item) => ({
          proposalId: proposal.id,
          ...item,
        })),
      });

      return tx.proposal.findUniqueOrThrow({
        where: { id: proposal.id },
        include: {
          opportunity: {
            include: {
              company: true,
              businessUnit: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async update(id: string, updateProposalDto: UpdateProposalDto) {
    const currentProposal = await this.prisma.proposal.findUniqueOrThrow({ where: { id } });
    
    const items = updateProposalDto.items
      ? await this.buildItems(updateProposalDto.items)
      : null;
      
    const subtotal = items
      ? items.reduce((sum, item) => sum + item.total, 0)
      : Number(currentProposal.subtotal);
      
    const taxRate = updateProposalDto.taxRate ?? Number(currentProposal.taxRate);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    return this.prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id },
        data: {
          opportunityId: updateProposalDto.opportunityId,
          code: updateProposalDto.code,
          title: updateProposalDto.title,
          status: updateProposalDto.status,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          validUntil: updateProposalDto.validUntil
            ? new Date(updateProposalDto.validUntil)
            : undefined,
          notes: updateProposalDto.notes,
        },
      });

      if (items) {
        await tx.proposalItem.deleteMany({
          where: { proposalId: id },
        });
        await tx.proposalItem.createMany({
          data: items.map((item) => ({
            proposalId: id,
            ...item,
          })),
        });
      }

      return tx.proposal.findUniqueOrThrow({
        where: { id },
        include: {
          opportunity: {
            include: {
              company: true,
              businessUnit: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  updateStatus(id: string, updateProposalStatusDto: UpdateProposalStatusDto) {
    return this.prisma.proposal.update({
      where: { id },
      data: {
        status: updateProposalStatusDto.status,
      },
      include: {
        opportunity: {
          include: {
            company: true,
            businessUnit: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
