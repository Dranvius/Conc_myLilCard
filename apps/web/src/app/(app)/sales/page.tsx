'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useOpportunities, useUsers } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Paged, Sale } from '@/lib/types';

const saleSchema = z.object({
  opportunityId: z.string().min(1, 'Selecciona una oportunidad'),
  ownerId: z.string().optional(),
  proposalId: z.string().optional(),
  status: z.string().optional(),
  totalAmount: z.coerce.number().min(0).optional(),
});

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApiList<Paged<Sale>>(
    ['sales', search, status],
    '/sales',
    {
      status,
      limit: 100,
    },
  );
  const { data: opportunities = [] } = useOpportunities();
  const { data: users = [] } = useUsers();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof saleSchema>) =>
      apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      setOpen(false);
    },
  });

  const fields = useMemo(
    () => [
      {
        name: 'opportunityId',
        label: 'Oportunidad',
        type: 'select' as const,
        options: opportunities.map((opportunity) => ({
          value: opportunity.id,
          label: opportunity.title,
        })),
      },
      {
        name: 'ownerId',
        label: 'Vendedor',
        type: 'select' as const,
        options: users.map((user) => ({ value: user.id, label: user.name })),
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select' as const,
        options: ['PENDING', 'CONFIRMED', 'CLOSED', 'CANCELLED'].map(
          (item) => ({ value: item, label: item }),
        ),
      },
      { name: 'totalAmount', label: 'Monto total', type: 'number' as const },
    ],
    [opportunities, users],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cierres"
        title="Ventas"
        description="Registra cierres comerciales desde oportunidades o propuestas aceptadas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar venta
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Input
          placeholder="Filtra desde las vistas relacionadas"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {['PENDING', 'CONFIRMED', 'CLOSED', 'CANCELLED'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => setStatus('')}>
          Limpiar
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={[
            {
              key: 'company',
              header: 'Empresa',
              render: (item) => (
                <div>
                  <p className="font-semibold">{item.company?.name}</p>
                  <p className="text-xs text-muted">
                    {item.opportunity?.businessUnit?.name}
                  </p>
                </div>
              ),
            },
            {
              key: 'owner',
              header: 'Vendedor',
              render: (item) => item.owner?.name || 'No asignado',
            },
            {
              key: 'total',
              header: 'Monto',
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => <StatusBadge value={item.status} />,
            },
            {
              key: 'date',
              header: 'Fecha',
              render: (item) => formatDate(item.closedAt || item.createdAt),
            },
            {
              key: 'quick-status',
              header: 'Acción',
              render: (item) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const next =
                      item.status === 'CLOSED' ? 'CONFIRMED' : 'CLOSED';
                    await apiRequest(`/sales/${item.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: next }),
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ['sales'],
                    });
                  }}
                >
                  {item.status === 'CLOSED' ? 'Reabrir' : 'Cerrar'}
                </Button>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin ventas"
              description="Cierra una oportunidad para verla reflejada aquí."
            />
          }
        />
      )}

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar venta"
        description="Convierte una oportunidad activa en venta confirmada o cerrada."
        schema={saleSchema}
        fields={fields}
        defaultValues={{
          opportunityId: '',
          ownerId: users[0]?.id ?? '',
          proposalId: '',
          status: 'CONFIRMED',
          totalAmount: 0,
        }}
        submitLabel="Registrar venta"
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
