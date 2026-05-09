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
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useCompanies, useSales } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice, Paged } from '@/lib/types';

const invoiceSchema = z.object({
  saleId: z.string().min(1, 'Selecciona una venta'),
  companyId: z.string().min(1, 'Selecciona una empresa'),
  invoiceNumber: z.string().min(1, 'Ingresa el número'),
  status: z.string().min(1, 'Selecciona el estado'),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
  issuedAt: z.string().min(1, 'Ingresa la fecha de emisión'),
  dueDate: z.string().min(1, 'Ingresa la fecha de vencimiento'),
});

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useApiList<Paged<Invoice>>(
    ['invoices', status],
    '/invoices',
    {
      status,
      limit: 100,
    },
  );
  const { data: companies = [] } = useCompanies();
  const { data: sales = [] } = useSales();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof invoiceSchema>) =>
      apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setOpen(false);
    },
  });

  const fields = useMemo(
    () => [
      {
        name: 'saleId',
        label: 'Venta',
        type: 'select' as const,
        options: sales.map((sale) => ({
          value: sale.id,
          label: sale.company?.name ?? sale.id,
        })),
      },
      {
        name: 'companyId',
        label: 'Empresa',
        type: 'select' as const,
        options: companies.map((company) => ({
          value: company.id,
          label: company.name,
        })),
      },
      { name: 'invoiceNumber', label: 'Número de factura' },
      {
        name: 'status',
        label: 'Estado',
        type: 'select' as const,
        options: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'].map(
          (item) => ({ value: item, label: item }),
        ),
      },
      { name: 'subtotal', label: 'Subtotal', type: 'number' as const },
      { name: 'tax', label: 'Impuesto', type: 'number' as const },
      { name: 'total', label: 'Total', type: 'number' as const },
      { name: 'issuedAt', label: 'Emitida el', type: 'date' as const },
      { name: 'dueDate', label: 'Vence el', type: 'date' as const },
    ],
    [companies, sales],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facturación"
        title="Facturas"
        description="Administra emisión, vencimiento y recaudo de facturación asociada a ventas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Crear factura
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-2">
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'].map((item) => (
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
              key: 'invoice',
              header: 'Factura',
              render: (item) => (
                <div>
                  <p className="font-semibold">{item.invoiceNumber}</p>
                  <p className="text-xs text-muted">{item.company?.name}</p>
                </div>
              ),
            },
            {
              key: 'dates',
              header: 'Fechas',
              render: (item) => (
                <div className="text-xs text-muted">
                  <p>Emisión: {formatDate(item.issuedAt)}</p>
                  <p>Vence: {formatDate(item.dueDate)}</p>
                </div>
              ),
            },
            {
              key: 'total',
              header: 'Total',
              render: (item) => formatCurrency(item.total),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => <StatusBadge value={item.status} />,
            },
            {
              key: 'action',
              header: 'Acción',
              render: (item) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const next = item.status === 'PAID' ? 'ISSUED' : 'PAID';
                    await apiRequest(`/invoices/${item.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: next }),
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ['invoices'],
                    });
                  }}
                >
                  {item.status === 'PAID' ? 'Revertir pago' : 'Marcar pagada'}
                </Button>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin facturas"
              description="Crea una factura para vincularla al ciclo de ventas."
            />
          }
        />
      )}

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva factura"
        description="Asocia la factura con una venta real para reflejar métricas financieras."
        schema={invoiceSchema}
        fields={fields}
        defaultValues={{
          saleId: '',
          companyId: '',
          invoiceNumber: '',
          status: 'ISSUED',
          subtotal: 0,
          tax: 0,
          total: 0,
          issuedAt: new Date().toISOString().slice(0, 10),
          dueDate: new Date().toISOString().slice(0, 10),
        }}
        submitLabel="Crear factura"
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
