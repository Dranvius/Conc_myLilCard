'use client';

import { useQuery } from '@tanstack/react-query';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import type { CurrentUser } from '@/lib/types';

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings-me'],
    queryFn: () => apiRequest<CurrentUser>('/auth/me'),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Cuenta y seguridad"
        description="Resumen de tu sesión actual y alcance operativo dentro de RespiraCRM."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Perfil</h3>
              <p className="text-sm text-muted">
                Datos básicos y unidad de cobertura.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Nombre:</span>{' '}
              {data.name}
            </p>
            <p>
              <span className="font-medium text-foreground">Correo:</span>{' '}
              {data.email}
            </p>
            <p>
              <span className="font-medium text-foreground">Rol:</span>{' '}
              {data.role.name}
            </p>
            <p>
              <span className="font-medium text-foreground">Unidad:</span>{' '}
              {data.businessUnit?.name ?? 'Global'}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Seguridad</h3>
              <p className="text-sm text-muted">
                La sesión usa cookies httpOnly y refresco controlado desde
                backend.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>Autenticación mediante JWT con cookies seguras.</p>
            <p>Validación CAPTCHA integrada para el login.</p>
            <p>Permisos y roles resueltos desde la API.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
