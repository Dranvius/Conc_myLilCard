import type { CookieOptions } from 'express';

export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

function normalizeCookieDomain(value?: string) {
  if (!value) {
    return undefined;
  }

  let normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes('://')) {
    try {
      normalized = new URL(normalized).hostname;
    } catch {
      return undefined;
    }
  }

  normalized = normalized.replace(/:\d+$/, '').trim().toLowerCase();

  if (!normalized || normalized === 'localhost') {
    return undefined;
  }

  return normalized;
}

export function buildCookieOptions(maxAgeMs: number): CookieOptions {
  const domain = normalizeCookieDomain(process.env.COOKIE_DOMAIN);

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain,
    path: '/',
    maxAge: maxAgeMs,
  };
}
