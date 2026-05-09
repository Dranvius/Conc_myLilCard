import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('builds dashboard metrics from prisma aggregates', async () => {
    const prisma = {
      company: { count: jest.fn().mockResolvedValue(12) },
      contact: { count: jest.fn().mockResolvedValue(34) },
      salesOpportunity: {
        count: jest.fn().mockResolvedValue(5),
        groupBy: jest
          .fn()
          .mockResolvedValue([{ stage: 'NEGOTIATION', _count: { _all: 3 } }]),
      },
      sale: {
        count: jest.fn().mockResolvedValue(7),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { totalAmount: 9900000 } }),
        findMany: jest.fn().mockResolvedValue([
          {
            totalAmount: 9900000,
            opportunity: {
              businessUnit: {
                name: 'Medical',
              },
            },
          },
        ]),
        groupBy: jest.fn().mockResolvedValue([
          {
            ownerId: 'user-1',
            _count: { _all: 4 },
            _sum: { totalAmount: 9900000 },
          },
        ]),
      },
      invoice: { count: jest.fn().mockResolvedValue(2) },
      serviceOrder: { count: jest.fn().mockResolvedValue(4) },
      proposal: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ status: 'SENT', _count: { _all: 2 } }]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'log-1',
            action: 'SALE_CREATED',
            entity: 'Sale',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            user: { id: 'user-1', name: 'Laura' },
          },
        ]),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-1', name: 'Laura' }]),
      },
    };

    const service = new MetricsService(prisma as never);
    const result = await service.getDashboard();

    expect(result.totals.companies).toBe(12);
    expect(result.totals.totalSoldValue).toBe(9900000);
    expect(result.salesByBusinessUnit[0].businessUnit).toBe('Medical');
    expect(result.sellerRanking[0].sellerName).toBe('Laura');
  });
});
