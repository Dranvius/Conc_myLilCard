import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(q: string, limit = 5) {
    if (!q || q.length < 2) {
      return { companies: [], contacts: [], opportunities: [], products: [] };
    }

    const [companies, contacts, opportunities, products] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { taxId: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, taxId: true },
      }),
      this.prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: { select: { name: true } },
        },
      }),
      this.prisma.salesOpportunity.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: {
          id: true,
          title: true,
          stage: true,
          company: { select: { name: true } },
        },
      }),
      this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
        },
      }),
    ]);

    return { companies, contacts, opportunities, products };
  }
}
