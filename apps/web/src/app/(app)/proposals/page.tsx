'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  ProposalDialog,
  proposalSchema,
} from '@/components/proposals/proposal-dialog';
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
import { useOpportunities, useProducts } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type { Paged, Proposal } from '@/lib/types';

export default function ProposalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const { data, isLoading } = useApiList<Paged<Proposal>>(
    ['proposals', search, status],
    '/proposals',
    {
      search,
      status,
      limit: 100,
    },
  );
  const { data: opportunities = [] } = useOpportunities();
  const { data: products = [] } = useProducts();

  const mutation = useMutation({
    mutationFn: (values: typeof proposalSchema._output) => {
      if (editing) {
        return apiRequest(`/proposals/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
      }
      return apiRequest('/proposals', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setOpen(false);
      setEditing(null);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Oferta comercial"
        title="Propuestas"
        description="Construye propuestas con productos, descuentos y vigencia comercial."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear propuesta
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Input
          placeholder="Buscar por código o título"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((item) => (
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
              key: 'proposal',
              header: 'Propuesta',
              render: (item) => (
                <div>
                  <Link
                    href={`/proposals/${item.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted">{item.code}</p>
                </div>
              ),
            },
            {
              key: 'opportunity',
              header: 'Oportunidad',
              render: (item) => item.opportunity?.title || 'Sin oportunidad',
            },
            {
              key: 'amount',
              header: 'Monto',
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => <StatusBadge value={item.status} />,
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
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const next =
                        item.status === 'ACCEPTED' ? 'SENT' : 'ACCEPTED';
                      await apiRequest(`/proposals/${item.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: next }),
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['proposals'],
                      });
                    }}
                  >
                    {item.status === 'ACCEPTED' ? 'Revertir' : 'Aceptar'}
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin propuestas"
              description="Agrega una propuesta para acompañar oportunidades calificadas."
            />
          }
        />
      )}

      <ProposalDialog
        open={open}
        opportunities={opportunities}
        products={products}
        initial={editing}
        loading={mutation.isPending}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
