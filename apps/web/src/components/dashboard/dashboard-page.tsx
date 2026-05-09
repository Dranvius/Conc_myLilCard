'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  ContactRound,
  FileClock,
  Hospital,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard } from './metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate, titleize } from '@/lib/format';
import type { DashboardData } from '@/lib/types';

const pieColors = [
  '#0f6c8d',
  '#22c55e',
  '#f59e0b',
  '#2563eb',
  '#ef4444',
  '#64748b',
];

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => apiRequest<DashboardData>('/metrics/dashboard'),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel ejecutivo"
        title="Dashboard comercial y operativo"
        description="Visibilidad de cartera, ventas, facturación y servicio técnico por unidad de negocio."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Empresas"
          value={String(data.totals.companies)}
          accent="rgba(15,108,141,0.24)"
        />
        <MetricCard
          label="Contactos"
          value={String(data.totals.contacts)}
          accent="rgba(37,99,235,0.18)"
        />
        <MetricCard
          label="Oportunidades abiertas"
          value={String(data.totals.openOpportunities)}
          accent="rgba(245,158,11,0.18)"
        />
        <MetricCard
          label="Ventas cerradas"
          value={String(data.totals.closedSales)}
          accent="rgba(34,197,94,0.18)"
        />
        <MetricCard
          label="Facturas pendientes"
          value={String(data.totals.pendingInvoices)}
          accent="rgba(239,68,68,0.16)"
        />
        <MetricCard
          label="Órdenes abiertas"
          value={String(data.totals.openServiceOrders)}
          accent="rgba(99,102,241,0.16)"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                Ventas por unidad de negocio
              </h3>
              <p className="text-sm text-muted">
                Montos cerrados acumulados por línea comercial.
              </p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesByBusinessUnit}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="businessUnit"
                  tick={{ fill: '#5b6b7f', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#5b6b7f', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Bar
                  dataKey="totalAmount"
                  radius={[14, 14, 0, 0]}
                  fill="#0f6c8d"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Propuestas por estado</h3>
              <p className="text-sm text-muted">
                Cómo se está comportando el embudo de propuestas.
              </p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.proposalsByStatus}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={62}
                  outerRadius={102}
                  paddingAngle={4}
                >
                  {data.proposalsByStatus.map((item, index) => (
                    <Cell
                      key={item.status}
                      fill={pieColors[index % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${Number(value ?? 0)} propuestas`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Oportunidades por etapa</h3>
              <p className="text-sm text-muted">
                Distribución actual del pipeline.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {data.opportunitiesByStage.map((item, index) => (
              <div
                key={item.stage}
                className="rounded-3xl bg-surface-muted p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {titleize(item.stage)}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((item.count / Math.max(...data.opportunitiesByStage.map((stage) => stage.count), 1)) * 100, 8)}%`,
                      background: pieColors[index % pieColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <Hospital className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ranking comercial</h3>
              <p className="text-sm text-muted">
                Vendedores con mayor volumen cerrado.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {data.sellerRanking.length ? (
              data.sellerRanking.map((item, index) => (
                <div
                  key={item.userId}
                  className="flex items-center justify-between rounded-3xl bg-surface-muted p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      #{index + 1} {item.sellerName}
                    </p>
                    <p className="text-sm text-muted">
                      {item.totalSales} ventas cerradas
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(item.totalAmount)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin ranking disponible"
                description="Todavía no hay ventas cerradas para consolidar el ranking."
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <ContactRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Actividad reciente</h3>
              <p className="text-sm text-muted">
                Eventos relevantes registrados por la auditoría.
              </p>
            </div>
          </div>
          <DataTable
            data={data.recentActivity}
            columns={[
              {
                key: 'action',
                header: 'Acción',
                render: (item) => (
                  <span className="font-medium">{titleize(item.action)}</span>
                ),
              },
              {
                key: 'entity',
                header: 'Entidad',
                render: (item) => titleize(item.entity),
              },
              {
                key: 'actorName',
                header: 'Responsable',
                render: (item) => item.actorName ?? 'Sistema',
              },
              {
                key: 'createdAt',
                header: 'Fecha',
                render: (item) => formatDate(item.createdAt),
              },
            ]}
            emptyState={
              <EmptyState
                title="Sin actividad reciente"
                description="Aún no hay eventos de auditoría disponibles."
              />
            }
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-soft p-3 text-primary">
              <FileClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Valor total vendido</h3>
              <p className="text-sm text-muted">
                Acumulado de ventas cerradas registradas.
              </p>
            </div>
          </div>
          <p className="text-4xl font-semibold text-foreground">
            {formatCurrency(data.totals.totalSoldValue)}
          </p>
          <div className="mt-6 rounded-[28px] bg-surface-muted p-4">
            <p className="text-sm font-medium text-foreground">
              Resumen rápido
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>Oportunidades abiertas: {data.totals.openOpportunities}</li>
              <li>Facturas pendientes: {data.totals.pendingInvoices}</li>
              <li>Órdenes abiertas: {data.totals.openServiceOrders}</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
