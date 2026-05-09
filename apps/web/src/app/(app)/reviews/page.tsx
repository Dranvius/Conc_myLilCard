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
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useCompanies, useServiceOrders } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import type { Paged, Review } from '@/lib/types';

const schema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  serviceOrderId: z.string().optional(),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
});

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApiList<Paged<Review>>(
    ['reviews', companyId],
    '/reviews',
    {
      companyId,
      limit: 100,
    },
  );
  const { data: companies = [] } = useCompanies();
  const { data: serviceOrders = [] } = useServiceOrders();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setOpen(false);
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
        name: 'serviceOrderId',
        label: 'Orden asociada',
        type: 'select' as const,
        options: serviceOrders.map((order) => ({
          value: order.id,
          label: order.code,
        })),
      },
      { name: 'rating', label: 'Calificación (1-5)', type: 'number' as const },
      { name: 'comment', label: 'Comentario', type: 'textarea' as const },
    ],
    [companies, serviceOrders],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voz del cliente"
        title="Reseñas"
        description="Registra percepción de clientes sobre servicio, soporte y operación."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva reseña
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-2">
        <Select
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
        >
          <option value="">Todas las empresas</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => setCompanyId('')}>
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
              render: (item) => item.company?.name ?? 'Sin empresa',
            },
            {
              key: 'order',
              header: 'Orden',
              render: (item) => item.serviceOrder?.code ?? 'Sin orden',
            },
            {
              key: 'rating',
              header: 'Rating',
              render: (item) => `${item.rating}/5`,
            },
            {
              key: 'comment',
              header: 'Comentario',
              render: (item) => item.comment || 'Sin comentario',
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin reseñas"
              description="Todavía no hay feedback registrado en el sistema."
            />
          }
        />
      )}

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar reseña"
        description="Asocia la reseña a una empresa y opcionalmente a una orden de servicio."
        schema={schema}
        fields={fields}
        defaultValues={{
          companyId: '',
          serviceOrderId: '',
          rating: 5,
          comment: '',
        }}
        submitLabel="Guardar reseña"
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
