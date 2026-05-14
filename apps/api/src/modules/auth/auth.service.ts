import bcrypt from 'bcrypt';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../../common/selects/user.select';
import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Esta cuenta usa inicio de sesión con Google',
      );
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

  async register(dto: RegisterDto) {
    const captchaValid = await this.captchaService.verifyToken(dto.captchaToken);
    if (!captchaValid) {
      throw new UnauthorizedException('Captcha validation failed');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const defaultRole = await this.prisma.role.findFirst({
      where: { name: 'SALES' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!defaultRole) {
      throw new InternalServerErrorException(
        'Default role not found. Please run the seed script.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        passwordHash,
        roleId: defaultRole.id,
      },
    });

    const permissions = defaultRole.permissions.map(
      (item) => item.permission.key,
    );
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: defaultRole.name,
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
        { sub: user.id, email: user.email },
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
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
    });

    const publicUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });

    return {
      user: publicUser,
      tokens: { accessToken, refreshToken },
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

  /**
   * Login/registro vía Google OAuth.
   * - Si existe usuario con ese googleId → login directo
   * - Si existe usuario con ese email → vincula la cuenta (agrega googleId)
   * - Si no existe → crea nuevo usuario con rol SALES
   */
  async loginWithGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const email = profile.email.toLowerCase();

    // 1) Buscar por googleId primero
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    // 2) Si no se encontró, buscar por email (vinculación automática)
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });

      if (byEmail) {
        // Cuenta existente: vincular Google
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl,
          },
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        });
      }
    }

    // 3) Si todavía no existe, crear nuevo usuario con rol SALES
    if (!user) {
      const defaultRole = await this.prisma.role.findFirst({
        where: { name: 'SALES' },
        include: {
          permissions: { include: { permission: true } },
        },
      });
      if (!defaultRole) {
        throw new InternalServerErrorException(
          'Default role not found. Please run the seed script.',
        );
      }

      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email,
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          authProvider: 'GOOGLE',
          roleId: defaultRole.id,
        },
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está deshabilitada');
    }

    // 4) Generar tokens
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
        { sub: user.id, email: user.email },
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
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
    });

    return {
      tokens: { accessToken, refreshToken },
    };
  }
}
