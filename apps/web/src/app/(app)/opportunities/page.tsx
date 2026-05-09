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
import {
  useBusinessUnits,
  useCompanies,
  useUsers,
} from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type { Opportunity, Paged } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const stages = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
];

const schema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  ownerId: z.string().min(1, 'Selecciona un responsable'),
  businessUnitId: z.string().min(1, 'Selecciona la unidad'),
  title: z.string().min(2, 'Ingresa un título'),
  stage: z.string().min(1, 'Selecciona la etapa'),
  estimatedValue: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const { data, isLoading } = useApiList<Paged<Opportunity>>(
    ['opportunities', search, stage, businessUnitId],
    '/opportunities',
    {
      search,
      stage,
      businessUnitId,
      limit: 100,
    },
  );
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const { data: businessUnits = [] } = useBusinessUnits();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = cleanPayload(values);
      if (editing) {
        return apiRequest(`/opportunities/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return apiRequest('/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
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
        name: 'ownerId',
        label: 'Vendedor responsable',
        type: 'select' as const,
        options: users.map((user) => ({ value: user.id, label: user.name })),
      },
      {
        name: 'businessUnitId',
        label: 'Unidad de negocio',
        type: 'select' as const,
        options: businessUnits.map((unit) => ({
          value: unit.id,
          label: unit.name,
        })),
      },
      { name: 'title', label: 'Título' },
      {
        name: 'stage',
        label: 'Etapa',
        type: 'select' as const,
        options: stages.map((item) => ({ value: item, label: item })),
      },
      {
        name: 'estimatedValue',
        label: 'Valor estimado',
        type: 'number' as const,
      },
      {
        name: 'probability',
        label: 'Probabilidad (%)',
        type: 'number' as const,
      },
      {
        name: 'expectedCloseDate',
        label: 'Cierre esperado',
        type: 'date' as const,
      },
      { name: 'notes', label: 'Notas', type: 'textarea' as const },
    ],
    [businessUnits, companies, users],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Oportunidades"
        description="Gestiona las etapas comerciales desde el primer contacto hasta el cierre."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear oportunidad
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <Input
          placeholder="Buscar por título o empresa"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={businessUnitId}
          onChange={(event) => setBusinessUnitId(event.target.value)}
        >
          <option value="">Todas las unidades</option>
          {businessUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </Select>
        <Select
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          <option value="">Todas las etapas</option>
          {stages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setBusinessUnitId('');
            setStage('');
          }}
        >
          Limpiar filtros
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={[
            {
              key: 'title',
              header: 'Oportunidad',
              render: (item) => (
                <div>
                  <Link
                    href={`/opportunities/${item.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted">{item.company?.name}</p>
                </div>
              ),
            },
            {
              key: 'stage',
              header: 'Etapa',
              render: (item) => <StatusBadge value={item.stage} />,
            },
            {
              key: 'value',
              header: 'Valor estimado',
              render: (item) => (
                <div>
                  <p className="font-medium">
                    {formatCurrency(item.estimatedValue)}
                  </p>
                  <p className="text-xs text-muted">
                    Probabilidad: {item.probability}%
                  </p>
                </div>
              ),
            },
            {
              key: 'owner',
              header: 'Responsable',
              render: (item) => (
                <div>
                  <p>{item.owner?.name || 'Sin responsable'}</p>
                  <p className="text-xs text-muted">
                    {item.businessUnit?.name}
                  </p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (item) => (
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
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin oportunidades"
              description="Crea las primeras oportunidades para empezar a medir pipeline."
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
        title={editing ? 'Editar oportunidad' : 'Nueva oportunidad'}
        description="Cada oportunidad queda asociada a empresa, unidad y responsable."
        schema={schema}
        fields={fields}
        defaultValues={{
          companyId: editing?.companyId ?? '',
          ownerId: editing?.ownerId ?? users[0]?.id ?? '',
          businessUnitId: editing?.businessUnitId ?? businessUnitId ?? '',
          title: editing?.title ?? '',
          stage: editing?.stage ?? 'NEW',
          estimatedValue: Number(editing?.estimatedValue ?? 0),
          probability: editing?.probability ?? 50,
          expectedCloseDate: editing?.expectedCloseDate
            ? editing.expectedCloseDate.slice(0, 10)
            : '',
          notes: editing?.notes ?? '',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear oportunidad'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
