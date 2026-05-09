import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ReviewQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);
    const where = {
      companyId: query.companyId || undefined,
      serviceOrderId: query.serviceOrderId || undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          serviceOrder: true,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  create(createReviewDto: CreateReviewDto) {
    return this.prisma.review.create({
      data: createReviewDto,
      include: {
        company: true,
        serviceOrder: true,
      },
    });
  }
}
