'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen } from 'lucide-react';
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
import { useCompanies, useSales, useUsers } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Paged, ServiceOrder } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const schema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  saleId: z.string().optional(),
  assignedOperatorId: z.string().optional(),
  code: z.string().min(1, 'Ingresa el código'),
  type: z.string().min(1, 'Ingresa el tipo'),
  priority: z.string().min(1, 'Selecciona la prioridad'),
  status: z.string().optional(),
  description: z.string().min(3, 'Describe la orden'),
  scheduledAt: z.string().optional(),
});

export default function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const { data, isLoading } = useApiList<Paged<ServiceOrder>>(
    ['service-orders', search, status],
    '/service-orders',
    {
      search,
      status,
      limit: 100,
    },
  );
  const { data: companies = [] } = useCompanies();
  const { data: sales = [] } = useSales();
  const { data: users = [] } = useUsers();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => {
      const payload = cleanPayload(values);
      if (editing) {
        return apiRequest(`/service-orders/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return apiRequest('/service-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const fields = useMemo(
    () => [
      {
        name: 'companyId',
        label: 'Empresa',
        type: 'select' as const,
        options: companies.map((company) => ({
          value: company.id,
          label: company.name,
        })),
      },
      {
        name: 'saleId',
        label: 'Venta asociada',
        type: 'select' as const,
        options: sales.map((sale) => ({
          value: sale.id,
          label: sale.company?.name ?? sale.id,
        })),
      },
      {
        name: 'assignedOperatorId',
        label: 'Operador',
        type: 'select' as const,
        options: users.map((user) => ({ value: user.id, label: user.name })),
      },
      { name: 'code', label: 'Código' },
      { name: 'type', label: 'Tipo de servicio' },
      {
        name: 'priority',
        label: 'Prioridad',
        type: 'select' as const,
        options: priorities.map((item) => ({ value: item, label: item })),
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select' as const,
        options: statuses.map((item) => ({ value: item, label: item })),
      },
      { name: 'scheduledAt', label: 'Programada para', type: 'date' as const },
      { name: 'description', label: 'Descripción', type: 'textarea' as const },
    ],
    [companies, sales, users],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación técnica"
        title="Órdenes de servicio"
        description="Asigna operadores, controla prioridad y seguimiento de ejecución."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear orden
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Input
          placeholder="Buscar por código, tipo o empresa"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setStatus('');
          }}
        >
          Limpiar
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[360px] w-full" />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={[
            {
              key: 'order',
              header: 'Orden',
              render: (item) => (
                <div>
                  <Link
                    href={`/service-orders/${item.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {item.code}
                  </Link>
                  <p className="text-xs text-muted">{item.type}</p>
                </div>
              ),
            },
            {
              key: 'company',
              header: 'Empresa',
              render: (item) => item.company?.name ?? 'Sin empresa',
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => (
                <div className="space-y-2">
                  <StatusBadge value={item.status} />
                  <StatusBadge value={item.priority} />
                </div>
              ),
            },
            {
              key: 'operator',
              header: 'Operador',
              render: (item) => item.assignedOperator?.name ?? 'No asignado',
            },
            {
              key: 'date',
              header: 'Programación',
              render: (item) => formatDate(item.scheduledAt || item.createdAt),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (item) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(item);
                      setOpen(true);
                    }}
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const operatorId =
                        users.find((user) => user.role.name === 'OPERATOR')
                          ?.id || users[0]?.id;
                      if (!operatorId) return;
                      await apiRequest(`/service-orders/${item.id}/assign`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          assignedOperatorId: operatorId,
                        }),
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['service-orders'],
                      });
                    }}
                  >
                    Asignar
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin órdenes"
              description="Aún no existen órdenes de servicio registradas."
            />
          }
        />
      )}

      <EntityDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Editar orden' : 'Nueva orden de servicio'}
        description="Relaciona la orden con empresa, venta y operador cuando aplique."
        schema={schema}
        fields={fields}
        defaultValues={{
          companyId: editing?.companyId ?? '',
          saleId: editing?.saleId ?? '',
          assignedOperatorId: editing?.assignedOperatorId ?? '',
          code: editing?.code ?? '',
          type: editing?.type ?? '',
          priority: editing?.priority ?? 'MEDIUM',
          status: editing?.status ?? 'OPEN',
          description: editing?.description ?? '',
          scheduledAt: editing?.scheduledAt
            ? editing.scheduledAt.slice(0, 10)
            : '',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear orden'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
