import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../common/utils/pagination';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ContactQueryDto) {
    const { page, limit, skip } = resolvePagination(query.page, query.limit);

    const where = {
      companyId: query.companyId || undefined,
      deletedAt: null,
      OR: query.search
        ? [
            {
              firstName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
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
            {
              position: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              taxId: true,
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  findOne(id: string) {
    return this.prisma.contact.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        company: true,
      },
    });
  }

  create(createContactDto: CreateContactDto) {
    return this.prisma.contact.create({
      data: createContactDto,
      include: {
        company: true,
      },
    });
  }

  update(id: string, updateContactDto: UpdateContactDto) {
    return this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
      include: {
        company: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }
}
