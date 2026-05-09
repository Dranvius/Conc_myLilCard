'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CaptchaField } from './captcha-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api-client';

const schema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  captchaToken: z.string().min(1, 'Completa la validación CAPTCHA'),
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      captchaToken: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      toast.success('Sesión iniciada correctamente');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión',
      );
    }
  });

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#0f6c8d_0%,#084c61_100%)] px-10 py-12 text-white lg:flex lg:flex-col">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          <Activity className="h-4 w-4" />
          RespiraCRM
        </div>
        <div className="mt-14 max-w-xl">
          <h1 className="text-5xl font-semibold leading-tight">
            Gestión comercial y operativa para soluciones respiratorias.
          </h1>
          <p className="mt-6 text-lg text-white/75">
            Centraliza pipeline, propuestas, órdenes de servicio, facturas y
            supervisión interna con una experiencia tipo SaaS corporativa.
          </p>
        </div>
        <div className="mt-auto grid gap-4 md:grid-cols-3">
          {[
            [
              'Empresas y contactos',
              'Gestión B2B con trazabilidad por unidad de negocio.',
            ],
            [
              'Ventas y propuestas',
              'Control de etapas, montos, aprobación y cierre.',
            ],
            [
              'Operación clínica',
              'Órdenes de servicio, revisiones y seguimiento.',
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-sm text-white/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 md:px-8">
        <Card className="w-full max-w-xl p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Inicio de sesión
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Bienvenido a RespiraCRM
            </h2>
            <p className="mt-2 text-sm text-muted">
              Usa tus credenciales administrativas o comerciales para ingresar.
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <Field
              label="Correo electrónico"
              error={form.formState.errors.email?.message}
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-11"
                  placeholder="admin@respiracrm.local"
                  {...form.register('email')}
                />
              </div>
            </Field>

            <Field
              label="Contraseña"
              error={form.formState.errors.password?.message}
            >
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-11"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  {...form.register('password')}
                />
              </div>
            </Field>

            <CaptchaField
              value={form.watch('captchaToken')}
              error={form.formState.errors.captchaToken?.message}
              onChange={(token) =>
                form.setValue('captchaToken', token, { shouldValidate: true })
              }
            />

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Validando acceso...'
                : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 rounded-3xl bg-primary-soft/60 p-4 text-sm text-primary-strong">
            Credenciales seed:
            <span className="ml-2 font-mono">
              admin@respiracrm.local / Admin12345!
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
