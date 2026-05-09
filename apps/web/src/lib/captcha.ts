export function getCaptchaProvider() {
  return (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? 'hcaptcha').toLowerCase();
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}
