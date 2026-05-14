export function getCaptchaProvider() {
  return (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? 'hcaptcha').toLowerCase();
}

export function getApiBaseUrl() {
  // En el servidor (SSR), usar la URL interna del contenedor/red Docker.
  // En el navegador, usar la URL pública (localhost u origen externo).
  if (typeof window === 'undefined') {
    return (
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000'
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}
