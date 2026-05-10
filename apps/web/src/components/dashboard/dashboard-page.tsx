'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  ContactRound,
  FileClock,
  Hospital,
  ListTodo,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { MetricCard } from './metric-card';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate, titleize } from '@/lib/format';
import type {
  ActivityFeedItem,
  ActivityItem,
  LeadSourcePerformanceResponse,
  DashboardData,
} from '@/lib/types';

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
    refetchInterval: 30000,
  });

  const { data: feedData, isLoading: loadingFeed } = useQuery({
    queryKey: ['dashboard-activity-feed'],
    queryFn: () =>
      apiRequest<{ data: ActivityFeedItem[] }>(
        '/metrics/activity-feed?limit=8',
      ),
    refetchInterval: 30000,
  });

  const { data: followUps = [], isLoading: loadingFollowUps } = useQuery({
    queryKey: ['dashboard-follow-ups'],
    queryFn: () => apiRequest<ActivityItem[]>('/activities/follow-ups?limit=6'),
    refetchInterval: 30000,
  });

  const { data: sourcePerformance, isLoading: loadingSourcePerformance } =
    useQuery({
      queryKey: ['dashboard-lead-source-performance'],
      queryFn: () =>
        apiRequest<LeadSourcePerformanceResponse>(
          '/metrics/lead-source-performance',
        ),
      refetchInterval: 60000,
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
        description="Visibilidad de cartera, ventas, facturacion, servicio tecnico y seguimiento comercial en refresco automatico."
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
          label="Ordenes abiertas"
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
                Montos cerrados acumulados por linea comercial.
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
                Como se esta comportando el embudo de propuestas.
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
                Distribucion actual del pipeline.
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
                description="Todavia no hay ventas cerradas para consolidar el ranking."
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
              <h3 className="text-lg font-semibold">Feed comercial</h3>
              <p className="text-sm text-muted">
                Eventos recientes de auditoria y seguimiento comercial.
              </p>
            </div>
          </div>
          {loadingFeed ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <DataTable
              data={feedData?.data ?? []}
              columns={[
                {
                  key: 'title',
                  header: 'Evento',
                  render: (item) => (
                    <div>
                      <p className="font-medium">{titleize(item.title)}</p>
                      <p className="text-xs text-muted">{item.description}</p>
                    </div>
                  ),
                },
                {
                  key: 'source',
                  header: 'Fuente',
                  render: (item) => <StatusBadge value={item.source} />,
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
                  description="Aun no hay eventos comerciales consolidados."
                />
              }
            />
          )}
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
              Resumen rapido
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>Oportunidades abiertas: {data.totals.openOpportunities}</li>
              <li>Facturas pendientes: {data.totals.pendingInvoices}</li>
              <li>Ordenes abiertas: {data.totals.openServiceOrders}</li>
            </ul>
          </div>
          <div className="mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-primary-soft p-3 text-primary">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Seguimientos abiertos</h3>
                <p className="text-sm text-muted">
                  Tareas y reuniones programadas del equipo comercial.
                </p>
              </div>
            </div>
            {loadingFollowUps ? (
              <Skeleton className="h-[220px] w-full" />
            ) : followUps.length ? (
              <div className="space-y-3">
                {followUps.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-border bg-surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(item.dueDate ?? item.date)}
                        </p>
                      </div>
                      {item.isOverdue ? (
                        <StatusBadge value="OVERDUE" label="Vencida" />
                      ) : (
                        <StatusBadge value="PLANNED" label="Programada" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin seguimientos abiertos"
                description="No hay tareas ni reuniones pendientes en este momento."
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-primary-soft p-3 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Conversion por origen</h3>
            <p className="text-sm text-muted">
              Canales con mejor activacion, cierre y calidad comercial.
            </p>
          </div>
        </div>
        {loadingSourcePerformance ? (
          <Skeleton className="h-[220px] w-full" />
        ) : sourcePerformance?.bySource.length ? (
          <DataTable
            data={sourcePerformance.bySource.slice(0, 6)}
            columns={[
              {
                key: 'source',
                header: 'Origen',
                render: (item) => <StatusBadge value={item.source} />,
              },
              {
                key: 'leads',
                header: 'Leads',
                render: (item) => (
                  <div>
                    <p className="font-medium">{item.leads}</p>
                    <p className="text-xs text-muted">
                      {item.leadToOpportunityPct}% activados
                    </p>
                  </div>
                ),
              },
              {
                key: 'wonPct',
                header: 'Cierre',
                render: (item) => `${item.wonPct}%`,
              },
              {
                key: 'avgLeadScore',
                header: 'Score prom.',
                render: (item) => item.avgLeadScore.toFixed(1),
              },
              {
                key: 'closedRealValue',
                header: 'Monto cerrado',
                render: (item) => formatCurrency(item.closedRealValue),
              },
            ]}
            emptyState={
              <EmptyState
                title="Sin datos por origen"
                description="Todavia no hay suficientes leads para consolidar esta vista."
              />
            }
          />
        ) : (
          <EmptyState
            title="Sin datos por origen"
            description="Todavia no hay suficientes leads para consolidar esta vista."
          />
        )}
      </Card>
    </div>
  );
}
