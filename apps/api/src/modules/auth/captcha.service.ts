import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  async verifyToken(token: string) {
    const provider = (process.env.CAPTCHA_PROVIDER ?? '').toLowerCase();
    const secret = process.env.CAPTCHA_SECRET_KEY;

    if (!token) {
      return false;
    }

    if (!provider || !secret) {
      const isDevBypass =
        process.env.NODE_ENV !== 'production' && token === 'dev-token';
      if (isDevBypass) {
        this.logger.warn(
          'CAPTCHA running in development bypass mode with dev-token.',
        );
      }
      return isDevBypass;
    }

    const endpoint =
      provider === 'recaptcha'
        ? 'https://www.google.com/recaptcha/api/siteverify'
        : 'https://hcaptcha.com/siteverify';

    const body = new URLSearchParams({
      secret,
      response: token,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return Boolean(result.success);
  }
}
