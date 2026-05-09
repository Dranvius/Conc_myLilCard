import { UsersService } from './users.service';

describe('UsersService', () => {
  it('creates a user and writes an audit log', async () => {
    const prisma = {
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Laura Quiroga',
          email: 'laura@respira.local',
          roleId: 'role-sales',
          businessUnitId: 'bu-1',
          isActive: true,
        }),
      },
    };

    const auditLogsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const service = new UsersService(
      prisma as never,
      auditLogsService as never,
    );

    const result = await service.create(
      {
        name: 'Laura Quiroga',
        email: 'LAURA@RESPIRA.LOCAL',
        password: 'Admin12345!',
        roleId: 'role-sales',
        businessUnitId: 'bu-1',
        isActive: true,
      },
      'admin-user',
      '127.0.0.1',
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'laura@respira.local',
          passwordHash: expect.any(String),
        }),
      }),
    );
    expect(auditLogsService.create).toHaveBeenCalled();
    expect(result.email).toBe('laura@respira.local');
  });
});
