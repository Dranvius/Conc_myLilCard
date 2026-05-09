import bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let jwtService: JwtService;
  let captchaService: CaptchaService;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    } as unknown as JwtService;

    captchaService = {
      verifyToken: jest.fn().mockResolvedValue(true),
    } as unknown as CaptchaService;

    service = new AuthService(prisma as never, jwtService, captchaService);
  });

  it('logs in a valid user and stores the refresh token hash', async () => {
    const passwordHash = await bcrypt.hash('Admin12345!', 4);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@respiracrm.local',
      passwordHash,
      businessUnitId: null,
      isActive: true,
      role: {
        name: 'ADMIN',
        permissions: [
          {
            permission: {
              key: 'users.read',
            },
          },
        ],
      },
      businessUnit: null,
    });

    prisma.user.update.mockResolvedValue({});
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@respiracrm.local',
      isActive: true,
      roleId: 'role-1',
      businessUnitId: null,
      role: { id: 'role-1', name: 'ADMIN', permissions: [] },
      businessUnit: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login({
      email: 'admin@respiracrm.local',
      password: 'Admin12345!',
      captchaToken: 'dev-token',
    });

    expect(captchaService.verifyToken).toHaveBeenCalledWith('dev-token');
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          refreshTokenHash: expect.any(String),
        },
      }),
    );
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'invalid@respiracrm.local',
        password: 'wrong-password',
        captchaToken: 'dev-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
