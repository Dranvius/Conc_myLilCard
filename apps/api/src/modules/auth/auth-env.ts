function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getFrontendUrl() {
  return trimTrailingSlash(
    process.env.FRONTEND_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000',
  );
}

export function getGoogleCallbackUrl() {
  return (
    process.env.GOOGLE_CALLBACK_URL ??
    `${getFrontendUrl()}/backend/api/auth/google/callback`
  );
}
