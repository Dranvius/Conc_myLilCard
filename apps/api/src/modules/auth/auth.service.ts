import bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../common/selects/user.select';
import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';

function parseJwtExpiryToSeconds(value: string) {
  const normalized = value.trim().toLowerCase();
  const amount = Number.parseInt(normalized, 10);

  if (normalized.endsWith('d')) return amount * 24 * 60 * 60;
  if (normalized.endsWith('h')) return amount * 60 * 60;
  if (normalized.endsWith('m')) return amount * 60;
  return amount;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
  ) {}

  async login(loginDto: LoginDto) {
    const captchaValid = await this.captchaService.verifyToken(
      loginDto.captchaToken,
    );
    if (!captchaValid) {
      throw new UnauthorizedException('Captcha validation failed');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        businessUnit: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = user.role.permissions.map(
      (item) => item.permission.key,
    );
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      businessUnitId: user.businessUnitId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: parseJwtExpiryToSeconds(
          process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        ),
      }),
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: parseJwtExpiryToSeconds(
            process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
          ),
        },
      ),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, 12),
      },
    });

    const publicUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });

    return {
      user: publicUser,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async getCurrentUser(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicUserSelect,
    });
  }

  async refreshSession(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
    }>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!refreshMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const permissions = user.role.permissions.map(
      (item) => item.permission.key,
    );
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      businessUnitId: user.businessUnitId,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: parseJwtExpiryToSeconds(
          process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        ),
      }),
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: parseJwtExpiryToSeconds(
            process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
          ),
        },
      ),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(newRefreshToken, 12),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return { success: true };
  }
}
