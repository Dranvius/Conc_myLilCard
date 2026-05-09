import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditLogQueryDto } from '../audit-logs/dto/audit-log-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getSummary() {
    const [
      users,
      activeUsers,
      companies,
      products,
      openServiceOrders,
      issuedInvoices,
      totalSales,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.product.count(),
      this.prisma.serviceOrder.count({
        where: {
          status: {
            in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
          },
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: {
            in: ['ISSUED', 'OVERDUE'],
          },
        },
      }),
      this.prisma.sale.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      users,
      activeUsers,
      companies,
      products,
      openServiceOrders,
      issuedInvoices,
      totalSales: Number(totalSales._sum.totalAmount ?? 0),
    };
  }

  getAuditLogs(query: AuditLogQueryDto) {
    return this.auditLogsService.findMany(query);
  }

  async getUsersStatus() {
    const roles = await this.prisma.role.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      totalUsers: roles.reduce((acc, role) => acc + role.users.length, 0),
      activeUsers: roles.reduce(
        (acc, role) => acc + role.users.filter((user) => user.isActive).length,
        0,
      ),
      byRole: roles.map((role) => ({
        role: role.name,
        totalUsers: role.users.length,
        activeUsers: role.users.filter((user) => user.isActive).length,
        inactiveUsers: role.users.filter((user) => !user.isActive).length,
      })),
      recentUsers: (
        await this.prisma.user.findMany({
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        })
      ).map((user) => ({
        ...user,
        roleName: user.role.name,
      })),
    };
  }

  async getSystemHealth() {
    const startedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'connected',
      latencyMs: Date.now() - startedAt,
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
