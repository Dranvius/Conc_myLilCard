'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns, Download, LayoutList, Plus, SquarePen } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PotentialDuplicateModal } from '@/components/forms/potential-duplicate-modal';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiList } from '@/hooks/use-api-list';
import {
  useBusinessUnits,
  useCompanies,
  useUsers,
} from '@/hooks/use-reference-data';
import { downloadApiFile, apiRequest } from '@/lib/api-client';
import {
  formatLeadScore,
  formatLeadSource,
  leadSourceOptions,
  opportunityStages,
} from '@/lib/crm';
import {
  getPotentialDuplicates,
  isPotentialDuplicateError,
} from '@/lib/duplicates';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Opportunity, Paged, PotentialDuplicate } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const schema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  ownerId: z.string().optional(),
  businessUnitId: z.string().min(1, 'Selecciona la unidad'),
  title: z.string().min(2, 'Ingresa un titulo'),
  stage: z.string().min(1, 'Selecciona la etapa'),
  estimatedValue: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [view, setView] = useState<'table' | 'board'>('board');
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    PotentialDuplicate[]
  >([]);
  const [pendingValues, setPendingValues] = useState<
    z.infer<typeof schema> | null
  >(null);
  const { data, isLoading } = useApiList<Paged<Opportunity>>(
    ['opportunities', search, stage, source, businessUnitId],
    '/opportunities',
    {
      search,
      stage,
      source,
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
      setPendingValues(null);
      setDuplicateCandidates([]);
    },
    onError: (error, values) => {
      if (isPotentialDuplicateError(error)) {
        setPendingValues(values);
        setDuplicateCandidates(getPotentialDuplicates(error));
      }
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
      {
        name: 'source',
        label: 'Origen del lead',
        type: 'select' as const,
        options: leadSourceOptions.map((item) => ({
          value: item,
          label: formatLeadSource(item),
        })),
      },
      { name: 'title', label: 'Titulo' },
      {
        name: 'stage',
        label: 'Etapa',
        type: 'select' as const,
        options: opportunityStages.map((item) => ({
          value: item,
          label: item,
        })),
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

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage) params.set('stage', stage);
    if (source) params.set('source', source);
    if (businessUnitId) params.set('businessUnitId', businessUnitId);
    await downloadApiFile(
      `/opportunities/export/excel?${params.toString()}`,
      'oportunidades.xlsx',
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Oportunidades"
        description="Gestiona el pipeline comercial con score, origen, alertas de estancamiento y seguimiento visible."
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md bg-muted p-1">
              <Button
                variant={view === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setView('board')}
              >
                <Columns className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setView('table')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear oportunidad
            </Button>
          </div>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-5">
        <Input
          placeholder="Buscar por titulo, empresa o contacto"
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
          {opportunityStages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          <option value="">Todos los origenes</option>
          {leadSourceOptions.map((item) => (
            <option key={item} value={item}>
              {formatLeadSource(item)}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setBusinessUnitId('');
            setStage('');
            setSource('');
          }}
        >
          Limpiar filtros
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : view === 'board' ? (
        <KanbanBoard
          data={data?.data ?? []}
          onUpdate={() =>
            queryClient.invalidateQueries({ queryKey: ['opportunities'] })
          }
        />
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
              key: 'score',
              header: 'Prioridad',
              render: (item) => (
                <div className="space-y-2">
                  {item.leadScore ? (
                    <StatusBadge
                      value={item.leadScore}
                      label={formatLeadScore(item.leadScore)}
                    />
                  ) : (
                    <span className="text-xs text-muted">Sin score</span>
                  )}
                  {item.isStale ? (
                    <StatusBadge
                      value={
                        item.staleSeverity === 'critical'
                          ? 'STALE_CRITICAL'
                          : 'STALE_WARNING'
                      }
                      label={`${item.daysWithoutMovement ?? 0} dias sin mover`}
                    />
                  ) : null}
                </div>
              ),
            },
            {
              key: 'stage',
              header: 'Etapa',
              render: (item) => (
                <div className="space-y-2">
                  <StatusBadge value={item.stage} />
                  {item.source ? (
                    <StatusBadge
                      value={item.source}
                      label={formatLeadSource(item.source)}
                    />
                  ) : null}
                </div>
              ),
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
              header: 'Seguimiento',
              render: (item) => (
                <div>
                  <p>{item.owner?.name || 'Sin responsable'}</p>
                  <p className="text-xs text-muted">
                    {item.nextActivityAt
                      ? `Proxima: ${formatDate(item.nextActivityAt)}`
                      : 'Sin proxima actividad'}
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
        description="Si dejas el responsable vacio, RespiraCRM asignara la oportunidad automaticamente."
        schema={schema}
        fields={fields}
        defaultValues={{
          companyId: editing?.companyId ?? '',
          ownerId: editing?.ownerId ?? '',
          businessUnitId: editing?.businessUnitId ?? businessUnitId ?? '',
          title: editing?.title ?? '',
          stage: editing?.stage ?? 'NEW',
          estimatedValue: Number(editing?.estimatedValue ?? 0),
          probability: editing?.probability ?? 50,
          expectedCloseDate: editing?.expectedCloseDate
            ? editing.expectedCloseDate.slice(0, 10)
            : '',
          notes: editing?.notes ?? '',
          source: editing?.source ?? '',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear oportunidad'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />

      <PotentialDuplicateModal
        open={duplicateCandidates.length > 0}
        duplicates={duplicateCandidates}
        title="Posibles oportunidades duplicadas"
        loading={mutation.isPending}
        onClose={() => {
          setDuplicateCandidates([]);
          setPendingValues(null);
        }}
        onContinue={async () => {
          if (!pendingValues) {
            return;
          }

          await mutation.mutateAsync({
            ...pendingValues,
            allowPotentialDuplicate: true,
          } as z.infer<typeof schema>);
        }}
      />
    </div>
  );
}
