import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.businessUnit.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
