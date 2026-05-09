'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield, UserCog, Activity } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';

export default function AdminPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => apiRequest<Record<string, number>>('/admin/summary'),
  });
  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () =>
      apiRequest<{ status: string; latencyMs: number; environment: string }>(
        '/admin/system-health',
      ),
  });
  const { data: usersStatus, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-status'],
    queryFn: () =>
      apiRequest<{
        totalUsers: number;
        activeUsers: number;
        byRole: Array<{
          role: string;
          totalUsers: number;
          activeUsers: number;
        }>;
      }>('/admin/users-status'),
  });

  if (
    loadingSummary ||
    loadingHealth ||
    loadingUsers ||
    !summary ||
    !health ||
    !usersStatus
  ) {
    return <Skeleton className="h-[420px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Centro de control"
        description="Supervisa uso, salud del sistema y comportamiento general de la plataforma."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Usuarios"
          value={String(summary.users)}
          accent="rgba(15,108,141,0.18)"
        />
        <MetricCard
          label="Usuarios activos"
          value={String(summary.activeUsers)}
          accent="rgba(34,197,94,0.18)"
        />
        <MetricCard
          label="Empresas"
          value={String(summary.companies)}
          accent="rgba(37,99,235,0.18)"
        />
        <MetricCard
          label="Órdenes abiertas"
          value={String(summary.openServiceOrders)}
          accent="rgba(245,158,11,0.18)"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Salud del sistema</h3>
              <p className="text-sm text-muted">
                Estado de conectividad y ambiente actual.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Estado:</span>{' '}
              {health.status}
            </p>
            <p>
              <span className="font-medium text-foreground">
                Base de datos:
              </span>{' '}
              conectada
            </p>
            <p>
              <span className="font-medium text-foreground">Latencia:</span>{' '}
              {health.latencyMs} ms
            </p>
            <p>
              <span className="font-medium text-foreground">Ambiente:</span>{' '}
              {health.environment}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                Distribución de usuarios
              </h3>
              <p className="text-sm text-muted">
                Estado por rol y adopción de la plataforma.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {usersStatus.byRole.map((item) => (
              <div key={item.role} className="rounded-3xl bg-surface-muted p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.role}</p>
                  <p className="text-sm text-primary">
                    {item.activeUsers}/{item.totalUsers} activos
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary-soft p-3 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              Indicadores administrativos
            </h3>
            <p className="text-sm text-muted">
              Resumen adicional para seguimiento del sistema.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-sm text-muted">Productos</p>
            <p className="mt-2 text-2xl font-semibold">{summary.products}</p>
          </div>
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-sm text-muted">Facturas emitidas</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.issuedInvoices}
            </p>
          </div>
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-sm text-muted">Total ventas</p>
            <p className="mt-2 text-2xl font-semibold">{summary.totalSales}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
