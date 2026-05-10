'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type {
  AdvancedForecastResponse,
  CommercialSlaResponse,
  ForecastAccuracyResponse,
  LeadSourcePerformanceResponse,
} from '@/lib/types';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const from = `${currentYear}-01-01`;
  const to = `${currentYear}-12-31`;

  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ['metrics-pipeline-conversion'],
    queryFn: () => apiRequest<any[]>('/metrics/pipeline-conversion'),
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['metrics-sales-by-period', currentYear],
    queryFn: () =>
      apiRequest<any[]>(`/metrics/sales-by-period?year=${currentYear}`),
  });

  const { data: forecastData, isLoading: loadingForecast } = useQuery({
    queryKey: ['metrics-forecast'],
    queryFn: () => apiRequest<any[]>('/metrics/forecast'),
  });

  const { data: sellersData, isLoading: loadingSellers } = useQuery({
    queryKey: ['metrics-sellers'],
    queryFn: () => apiRequest<any[]>('/metrics/sellers'),
  });

  const { data: forecastAccuracy, isLoading: loadingAccuracy } = useQuery({
    queryKey: ['metrics-forecast-accuracy', currentYear],
    queryFn: () =>
      apiRequest<ForecastAccuracyResponse>(
        `/metrics/forecast-accuracy?from=${from}&to=${to}`,
      ),
  });

  const { data: commercialSla, isLoading: loadingSla } = useQuery({
    queryKey: ['metrics-commercial-sla', from, to],
    queryFn: () =>
      apiRequest<CommercialSlaResponse>(
        `/metrics/commercial-sla?from=${from}&to=${to}`,
      ),
  });

  const { data: leadSourcePerformance, isLoading: loadingLeadSource } =
    useQuery({
      queryKey: ['metrics-lead-source-performance', from, to],
      queryFn: () =>
        apiRequest<LeadSourcePerformanceResponse>(
          `/metrics/lead-source-performance?from=${from}&to=${to}`,
        ),
    });

  const { data: advancedForecast, isLoading: loadingAdvancedForecast } =
    useQuery({
      queryKey: ['metrics-forecast-advanced', from, to],
      queryFn: () =>
        apiRequest<AdvancedForecastResponse>(
          `/metrics/forecast-advanced?from=${from}&to=${to}`,
        ),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes avanzados"
        description="Analiza el rendimiento del equipo, proyecciones de ventas, conversion y precision comercial."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-6 text-lg font-semibold">
            Conversion de oportunidades
          </h3>
          <div className="h-[300px]">
            {loadingPipeline ? (
              <div className="flex h-full items-center justify-center text-muted">
                Cargando...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    opacity={0.5}
                  />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar
                    dataKey="value"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    <LabelList
                      dataKey="value"
                      position="right"
                      fill="#6B7280"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 text-lg font-semibold">
            Ventas cerradas ({currentYear})
          </h3>
          <div className="h-[300px]">
            {loadingSales ? (
              <div className="flex h-full items-center justify-center text-muted">
                Cargando...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(value) => `$${value / 1000000}M`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      'Total',
                    ]}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 text-lg font-semibold">
            Pronostico ponderado ({currentYear})
          </h3>
          <div className="h-[300px]">
            {loadingForecast ? (
              <div className="flex h-full items-center justify-center text-muted">
                Cargando...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={forecastData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(value) => `$${value / 1000000}M`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      'Valor ponderado',
                    ]}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Bar
                    dataKey="expectedValue"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-6 text-lg font-semibold">
            Productividad por vendedor
          </h3>
          <div className="overflow-x-auto">
            {loadingSellers ? (
              <div className="py-12 text-center text-muted">Cargando</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="rounded-tl-lg px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3 text-center">Oportunidades</th>
                    <th className="px-4 py-3 text-center">Ventas cerradas</th>
                    <th className="rounded-tr-lg px-4 py-3 text-right">
                      Total vendido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sellersData?.map((seller) => (
                    <tr
                      key={seller.id}
                      className="border-b border-border/50 hover:bg-muted/20 last:border-0"
                    >
                      <td className="flex items-center gap-2 px-4 py-3 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                          {seller.name.charAt(0)}
                        </div>
                        {seller.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {seller.opportunities}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-green-600">
                        {seller.closedSales}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(seller.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  {sellersData?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No hay datos de vendedores para mostrar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              Precision del forecast por vendedor
            </h3>
            <p className="text-sm text-muted">
              Comparacion entre valor ponderado estimado y monto cerrado real.
            </p>
          </div>
          {forecastAccuracy ? (
            <div className="grid gap-2 text-right text-sm">
              <p className="font-semibold text-foreground">
                Precision global: {forecastAccuracy.summary.accuracyPct}%
              </p>
              <p className="text-muted">
                Ponderado:{' '}
                {formatCurrency(forecastAccuracy.summary.weightedValue)}
              </p>
              <p className="text-muted">
                Cerrado real:{' '}
                {formatCurrency(forecastAccuracy.summary.closedRealValue)}
              </p>
            </div>
          ) : null}
        </div>
        {loadingAccuracy ? (
          <Skeleton className="h-[320px] w-full" />
        ) : forecastAccuracy ? (
          <DataTable
            data={forecastAccuracy.bySeller}
            columns={[
              {
                key: 'ownerName',
                header: 'Vendedor',
                render: (item) => item.ownerName,
              },
              {
                key: 'weightedValue',
                header: 'Forecast',
                render: (item) => formatCurrency(item.weightedValue),
              },
              {
                key: 'closedRealValue',
                header: 'Real',
                render: (item) => formatCurrency(item.closedRealValue),
              },
              {
                key: 'differenceValue',
                header: 'Diferencia',
                render: (item) => formatCurrency(item.differenceValue),
              },
              {
                key: 'accuracyPct',
                header: 'Precision',
                render: (item) => `${item.accuracyPct}%`,
              },
            ]}
            emptyState={
              <EmptyState
                title="Sin datos de forecast"
                description="No hay oportunidades suficientes para calcular precision en el rango actual."
              />
            }
          />
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Primer contacto</p>
          {loadingSla ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {commercialSla?.summary.avgFirstContactHours ?? 0} h
              </p>
              <p className="mt-2 text-sm text-muted">
                {commercialSla?.summary.firstContactWithin24hPct ?? 0}% dentro
                de 24 horas.
              </p>
            </>
          )}
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Seguimientos vencidos</p>
          {loadingSla ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {commercialSla?.summary.overdueActivities ?? 0}
              </p>
              <p className="mt-2 text-sm text-muted">
                {commercialSla?.summary.withoutNextActivity ?? 0} oportunidades
                sin proxima actividad.
              </p>
            </>
          )}
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">
            Cumplimiento de seguimiento
          </p>
          {loadingSla ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {commercialSla?.summary.completedOnTimePct ?? 0}%
              </p>
              <p className="mt-2 text-sm text-muted">
                {commercialSla?.summary.completedOnTime ?? 0} actividades a
                tiempo, {commercialSla?.summary.completedLate ?? 0} tardias.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Riesgo comercial</h3>
            <p className="text-sm text-muted">
              Oportunidades con riesgo por abandono, seguimiento o estancamiento.
            </p>
          </div>
          {loadingSla ? (
            <Skeleton className="h-[320px] w-full" />
          ) : commercialSla ? (
            <DataTable
              data={commercialSla.atRisk}
              columns={[
                {
                  key: 'title',
                  header: 'Oportunidad',
                  render: (item) => (
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted">{item.companyName}</p>
                    </div>
                  ),
                },
                {
                  key: 'stage',
                  header: 'Etapa',
                  render: (item) => item.stage,
                },
                {
                  key: 'overdueActivitiesCount',
                  header: 'Vencidas',
                  render: (item) => item.overdueActivitiesCount,
                },
                {
                  key: 'ownerName',
                  header: 'Responsable',
                  render: (item) => item.ownerName,
                },
              ]}
              emptyState={
                <EmptyState
                  title="Sin riesgos relevantes"
                  description="El seguimiento comercial esta estable en el rango consultado."
                />
              }
            />
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Tiempo por etapa</h3>
            <p className="text-sm text-muted">
              Duracion promedio observada en cada paso del pipeline.
            </p>
          </div>
          {loadingSla ? (
            <Skeleton className="h-[320px] w-full" />
          ) : commercialSla?.stageDuration.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={commercialSla.stageDuration}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} dias`, 'Promedio']} />
                <Bar dataKey="avgDaysInStage" fill="#0f6c8d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="Sin historial suficiente"
              description="Todavia no hay transiciones de etapa suficientes para esta vista."
            />
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Conversion por LeadSource</h3>
            <p className="text-sm text-muted">
              Calidad del canal desde captacion hasta cierre y abandono.
            </p>
          </div>
          {leadSourcePerformance ? (
            <div className="text-right text-sm text-muted">
              <p>Leads analizados: {leadSourcePerformance.summary.leads}</p>
              <p>
                Score promedio: {leadSourcePerformance.summary.avgLeadScore.toFixed(1)}
              </p>
            </div>
          ) : null}
        </div>
        {loadingLeadSource ? (
          <Skeleton className="h-[320px] w-full" />
        ) : leadSourcePerformance ? (
          <DataTable
            data={leadSourcePerformance.bySource}
            columns={[
              {
                key: 'source',
                header: 'Origen',
                render: (item) => item.source,
              },
              {
                key: 'leads',
                header: 'Leads',
                render: (item) => item.leads,
              },
              {
                key: 'leadToOpportunityPct',
                header: 'Activacion',
                render: (item) => `${item.leadToOpportunityPct}%`,
              },
              {
                key: 'wonPct',
                header: 'Ganadas',
                render: (item) => `${item.wonPct}%`,
              },
              {
                key: 'avgFirstContactHours',
                header: 'Primer contacto',
                render: (item) => `${item.avgFirstContactHours} h`,
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
                description="Aun no hay suficiente actividad para comparar canales."
              />
            }
          />
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Forecast avanzado por fuente</h3>
            <p className="text-sm text-muted">
              Comparacion entre lo ponderado y lo realmente cerrado por canal.
            </p>
          </div>
          {loadingAdvancedForecast ? (
            <Skeleton className="h-[320px] w-full" />
          ) : advancedForecast ? (
            <DataTable
              data={advancedForecast.bySource}
              columns={[
                {
                  key: 'label',
                  header: 'Fuente',
                  render: (item) => item.label,
                },
                {
                  key: 'weightedValue',
                  header: 'Forecast',
                  render: (item) => formatCurrency(item.weightedValue),
                },
                {
                  key: 'closedRealValue',
                  header: 'Real',
                  render: (item) => formatCurrency(item.closedRealValue),
                },
                {
                  key: 'accuracyPct',
                  header: 'Precision',
                  render: (item) => `${item.accuracyPct}%`,
                },
              ]}
              emptyState={
                <EmptyState
                  title="Sin forecast avanzado"
                  description="No hay datos suficientes para este comparativo."
                />
              }
            />
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Tendencia mensual</h3>
            <p className="text-sm text-muted">
              Forecast ponderado frente a cierre real consolidado.
            </p>
          </div>
          {loadingAdvancedForecast ? (
            <Skeleton className="h-[320px] w-full" />
          ) : advancedForecast?.monthlyTrend.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={advancedForecast.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Line
                  type="monotone"
                  dataKey="weightedForecast"
                  stroke="#0f6c8d"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="closedRealValue"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="Sin tendencia disponible"
              description="Todavia no hay suficientes meses con datos combinados."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
