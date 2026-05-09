import { ServiceOrderStatus } from '@prisma/client';
import { ServiceOrdersService } from './service-orders.service';

describe('ServiceOrdersService', () => {
  it('assigns an operator and updates the status to ASSIGNED', async () => {
    const prisma = {
      serviceOrder: {
        update: jest.fn().mockResolvedValue({
          id: 'order-1',
          assignedOperatorId: 'user-operator',
          status: ServiceOrderStatus.ASSIGNED,
        }),
      },
    };

    const auditLogsService = {
      create: jest.fn(),
    };

    const service = new ServiceOrdersService(
      prisma as never,
      auditLogsService as never,
    );

    const result = await service.assign('order-1', {
      assignedOperatorId: 'user-operator',
    });

    expect(prisma.serviceOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: {
          assignedOperatorId: 'user-operator',
          status: ServiceOrderStatus.ASSIGNED,
        },
      }),
    );
    expect(result.status).toBe(ServiceOrderStatus.ASSIGNED);
  });
});
