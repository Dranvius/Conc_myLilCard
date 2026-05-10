'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();

  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ['metrics-pipeline-conversion'],
    queryFn: () => apiRequest<any[]>('/metrics/pipeline-conversion'),
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['metrics-sales-by-period', currentYear],
    queryFn: () => apiRequest<any[]>(`/metrics/sales-by-period?year=${currentYear}`),
  });

  const { data: forecastData, isLoading: loadingForecast } = useQuery({
    queryKey: ['metrics-forecast'],
    queryFn: () => apiRequest<any[]>('/metrics/forecast'),
  });

  const { data: sellersData, isLoading: loadingSellers } = useQuery({
    queryKey: ['metrics-sellers'],
    queryFn: () => apiRequest<any[]>('/metrics/sellers'),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Reportes Avanzados" 
        description="Analiza el rendimiento del equipo, proyecciones de ventas y conversión."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* A. Conversión del pipeline */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Conversión de Oportunidades</h3>
          <div className="h-[300px]">
            {loadingPipeline ? (
              <div className="flex h-full items-center justify-center text-muted">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" fill="#6B7280" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* B. Ventas por período */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Ventas Cerradas ({currentYear})</h3>
          <div className="h-[300px]">
            {loadingSales ? (
              <div className="flex h-full items-center justify-center text-muted">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `$${value / 1000000}M`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Total']}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Line type="monotone" dataKey="totalAmount" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* C. Pronóstico weighted pipeline */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Pronóstico Ponderado (Pipeline Cerrando en {currentYear})</h3>
          <div className="h-[300px]">
            {loadingForecast ? (
              <div className="flex h-full items-center justify-center text-muted">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `$${value / 1000000}M`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value ?? 0)),
                      'Valor Ponderado',
                    ]}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Bar dataKey="expectedValue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* D. Productividad por vendedor */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Productividad por Vendedor</h3>
          <div className="overflow-x-auto">
            {loadingSellers ? (
              <div className="py-12 text-center text-muted">Cargando...</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Vendedor</th>
                    <th className="px-4 py-3 text-center">Oportunidades</th>
                    <th className="px-4 py-3 text-center">Ventas Cerradas</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Total Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {sellersData?.map((seller, idx) => (
                    <tr key={seller.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                          {seller.name.charAt(0)}
                        </div>
                        {seller.name}
                      </td>
                      <td className="px-4 py-3 text-center">{seller.opportunities}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{seller.closedSales}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(seller.totalAmount)}</td>
                    </tr>
                  ))}
                  {sellersData?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No hay datos de vendedores para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
