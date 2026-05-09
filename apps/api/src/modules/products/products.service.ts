import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProductQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      businessUnitId: query.businessUnitId || undefined,
      isActive:
        typeof query.isActive === 'boolean' ? query.isActive : undefined,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              sku: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              category: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          businessUnit: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        businessUnit: true,
      },
    });
  }

  create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
      include: {
        businessUnit: true,
      },
    });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        businessUnit: true,
      },
    });
  }

  updateStatus(id: string, updateProductStatusDto: UpdateProductStatusDto) {
    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: updateProductStatusDto.isActive,
      },
      include: {
        businessUnit: true,
      },
    });
  }
}
