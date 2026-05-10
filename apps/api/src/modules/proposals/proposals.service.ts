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
import { NotificationsService } from '../notifications/notifications.service';
import { CPQService } from '../cpq/cpq.service';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cpqService: CPQService,
  ) {}

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

  private async buildItems(items: ProposalItemInputDto[], companyId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.productId),
        },
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    // Get automatic discounts from CPQ engine
    const cpqResults = await this.cpqService.calculateAutomaticDiscounts({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? Number(productMap.get(item.productId)?.unitPrice ?? 0),
      })),
      companyId,
    });

    return items.map((item, index) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const unitPrice = item.unitPrice ?? Number(product.unitPrice);
      
      // Use manual discount if provided, otherwise use automatic discount from CPQ
      const automaticDiscount = cpqResults[index].automaticDiscount;
      const discount = item.discount ?? automaticDiscount;
      
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
    const opportunity = await this.prisma.salesOpportunity.findUniqueOrThrow({
      where: { id: createProposalDto.opportunityId },
      select: { companyId: true },
    });

    const items = await this.buildItems(
      createProposalDto.items,
      opportunity.companyId,
    );
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
    const currentProposal = await this.prisma.proposal.findUniqueOrThrow({
      where: { id },
    });

    const opportunity = await this.prisma.salesOpportunity.findUniqueOrThrow({
      where: { id: updateProposalDto.opportunityId ?? currentProposal.opportunityId },
      select: { companyId: true },
    });

    const items = updateProposalDto.items
      ? await this.buildItems(updateProposalDto.items, opportunity.companyId)
      : null;

    const subtotal = items
      ? items.reduce((sum, item) => sum + item.total, 0)
      : Number(currentProposal.subtotal);
    const taxRate =
      updateProposalDto.taxRate ?? Number(currentProposal.taxRate);
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

  async updateStatus(
    id: string,
    updateProposalStatusDto: UpdateProposalStatusDto,
  ) {
    const proposal = await this.prisma.proposal.update({
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

    if (updateProposalStatusDto.status === 'ACCEPTED') {
      await this.notifications.create({
        userId: proposal.opportunity.ownerId,
        title: 'Propuesta aceptada',
        message: `La propuesta comercial ${proposal.code} dirigida a ${proposal.opportunity.company.name} ha sido aprobada.`,
      });
    }

    return proposal;
  }
}
