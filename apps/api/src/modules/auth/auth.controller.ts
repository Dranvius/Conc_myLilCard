import { Body, Controller, Get, Ip, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildCookieOptions,
} from '../../common/utils/cookies';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

function parseDurationToMs(value: string) {
  const normalized = value.trim().toLowerCase();
  const amount = Number.parseInt(normalized, 10);

  if (normalized.endsWith('d')) {
    return amount * 24 * 60 * 60 * 1000;
  }
  if (normalized.endsWith('h')) {
    return amount * 60 * 60 * 1000;
  }
  if (normalized.endsWith('m')) {
    return amount * 60 * 1000;
  }
  return amount * 1000;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión con email, password y captcha' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() _ip: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    const accessMaxAge = parseDurationToMs(
      process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    );
    const refreshMaxAge = parseDurationToMs(
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    );

    response.cookie(
      ACCESS_COOKIE_NAME,
      result.tokens.accessToken,
      buildCookieOptions(accessMaxAge),
    );
    response.cookie(
      REFRESH_COOKIE_NAME,
      result.tokens.refreshToken,
      buildCookieOptions(refreshMaxAge),
    );

    return result.user;
  }

  @Post('logout')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.sub);
    response.clearCookie(ACCESS_COOKIE_NAME, buildCookieOptions(0));
    response.clearCookie(REFRESH_COOKIE_NAME, buildCookieOptions(0));
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar sesión con refresh token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    const tokens = await this.authService.refreshSession(refreshToken);
    const accessMaxAge = parseDurationToMs(
      process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    );
    const refreshMaxAge = parseDurationToMs(
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    );

    response.cookie(
      ACCESS_COOKIE_NAME,
      tokens.accessToken,
      buildCookieOptions(accessMaxAge),
    );
    response.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      buildCookieOptions(refreshMaxAge),
    );

    return { success: true };
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Obtener el usuario autenticado actual' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getCurrentUser(user.sub);
  }
}
