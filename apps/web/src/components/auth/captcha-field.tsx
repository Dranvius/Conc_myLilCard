'use client';

import HCaptcha from '@hcaptcha/react-hcaptcha';
import ReCAPTCHA from 'react-google-recaptcha';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getCaptchaProvider } from '@/lib/captcha';

export function CaptchaField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
  const provider = getCaptchaProvider();

  if (!siteKey) {
    return (
      <Field label="CAPTCHA" error={error}>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Usa dev-token en desarrollo"
        />
      </Field>
    );
  }

  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface-muted/60 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        Verificación anti-bot
      </p>
      {provider === 'recaptcha' ? (
        <ReCAPTCHA
          sitekey={siteKey}
          onChange={(token) => onChange(token ?? '')}
        />
      ) : (
        <HCaptcha
          sitekey={siteKey}
          onVerify={(token) => onChange(token)}
          onExpire={() => onChange('')}
        />
      )}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
