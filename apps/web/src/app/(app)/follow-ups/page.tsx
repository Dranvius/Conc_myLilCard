'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Phone, SquarePen, UserRound, Workflow } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useBusinessUnits, useUsers } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import {
  formatLeadScore,
  formatLeadSource,
  leadSourceOptions,
  opportunityStages,
} from '@/lib/crm';
import { formatCurrency, formatDate, titleize } from '@/lib/format';
import type {
  FollowUpInboxItem,
  FollowUpInboxResponse,
  PotentialDuplicate,
} from '@/lib/types';

const activitySchema = z.object({
  type: z.string().min(1, 'Selecciona el tipo'),
  title: z.string().min(2, 'Ingresa un resumen'),
  date: z.string().min(1, 'Selecciona fecha y hora'),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'COMPLETED']).default('COMPLETED'),
});

const quickFilters = [
  { key: '', label: 'Todo lo abierto', summaryKey: null },
  { key: 'overdue', label: 'Vencidas', summaryKey: 'overdue' },
  { key: 'today', label: 'Hoy', summaryKey: 'today' },
  { key: 'upcoming', label: 'Proximas', summaryKey: 'upcoming' },
  { key: 'no_next_activity', label: 'Sin proxima actividad', summaryKey: 'noNextActivity' },
  { key: 'no_recent_contact', label: 'Sin contacto reciente', summaryKey: 'noRecentContact' },
  { key: 'no_response', label: 'Sin respuesta', summaryKey: 'noResponse' },
  { key: 'stale', label: 'Estancadas', summaryKey: 'stale' },
  { key: 'new_leads', label: 'Nuevos sin contacto', summaryKey: 'newLeads' },
  { key: 'mine', label: 'Asignadas a mi', summaryKey: 'mine' },
  { key: 'high_priority', label: 'P0/P1', summaryKey: 'highPriority' },
] as const;

const followUpStateLabels: Record<string, string> = {
  OVERDUE: 'Vencida',
  TODAY: 'Hoy',
  UPCOMING: 'Proxima',
  NO_NEXT_ACTIVITY: 'Sin proxima',
  NO_RECENT_CONTACT: 'Sin contacto',
  NO_RESPONSE: 'Sin respuesta',
  STALE: 'Estancada',
  NEW_LEAD: 'Nuevo lead',
  ON_TRACK: 'En curso',
};

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState('');
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<FollowUpInboxItem | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityDefaults, setActivityDefaults] = useState({
    type: 'CALL',
    title: '',
    date: new Date().toISOString().slice(0, 16),
    description: '',
    status: 'COMPLETED' as 'PLANNED' | 'COMPLETED',
  });
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');

  const { data: users = [] } = useUsers();
  const { data: businessUnits = [] } = useBusinessUnits();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (bucket) params.set('bucket', bucket);
    if (search) params.set('search', search);
    if (ownerId) params.set('ownerId', ownerId);
    if (businessUnitId) params.set('businessUnitId', businessUnitId);
    if (source) params.set('source', source);
    params.set('limit', '25');
    return params.toString();
  }, [bucket, businessUnitId, ownerId, search, source]);

  const { data, isLoading } = useQuery({
    queryKey: ['follow-up-inbox', queryString],
    queryFn: () =>
      apiRequest<FollowUpInboxResponse>(
        `/opportunities/follow-up-inbox?${queryString}`,
      ),
  });

  const activityMutation = useMutation({
    mutationFn: (values: z.infer<typeof activitySchema>) => {
      if (!selected) {
        return Promise.reject(new Error('Selecciona una oportunidad.'));
      }

      return apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          date: new Date(values.date).toISOString(),
          companyId: selected.companyId,
          contactId: selected.contactId,
          opportunityId: selected.id,
        }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['follow-up-inbox'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
      ]);
      setActivityOpen(false);
    },
  });

  const stageMutation = useMutation({
    mutationFn: (nextStage: string) => {
      if (!selected) {
        return Promise.reject(new Error('Selecciona una oportunidad.'));
      }

      return apiRequest(`/opportunities/${selected.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: nextStage }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['follow-up-inbox'] });
      setSelected(null);
    },
  });

  const ownerMutation = useMutation({
    mutationFn: (nextOwnerId: string) => {
      if (!selected) {
        return Promise.reject(new Error('Selecciona una oportunidad.'));
      }

      return apiRequest(`/opportunities/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['follow-up-inbox'] });
      setSelected(null);
    },
  });

  const handleOpenActivity = (
    opportunity: FollowUpInboxItem,
    preset: Partial<typeof activityDefaults>,
  ) => {
    setSelected(opportunity);
    setActivityDefaults({
      type: preset.type ?? 'CALL',
      title: preset.title ?? '',
      date: preset.date ?? new Date().toISOString().slice(0, 16),
      description: preset.description ?? '',
      status: preset.status ?? 'COMPLETED',
    });
    setActivityOpen(true);
  };

  const handleMarkNoResponse = async (opportunity: FollowUpInboxItem) => {
    setSelected(opportunity);
    await activityMutation.mutateAsync({
      type: 'NOTE',
      title: 'Lead sin respuesta',
      date: new Date().toISOString().slice(0, 16),
      description: 'Se registró intento de contacto sin respuesta.',
      status: 'COMPLETED',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacion diaria"
        title="Bandeja de seguimiento comercial"
        description="Vista accionable para priorizar llamadas, programar proximos pasos y corregir oportunidades en riesgo."
      />

      <Card className="grid gap-3 p-4 md:grid-cols-5">
        <input
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none ring-0"
          placeholder="Buscar por oportunidad, empresa o responsable"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
          <option value="">Todos los responsables</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
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
        <Select value={source} onChange={(event) => setSource(event.target.value)}>
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
            setBucket('');
            setSearch('');
            setOwnerId('');
            setBusinessUnitId('');
            setSource('');
          }}
        >
          Limpiar filtros
        </Button>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickFilters.map((filter) => (
          <button
            key={filter.key || 'all'}
            type="button"
            className={`rounded-3xl border p-4 text-left transition ${
              bucket === filter.key
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-white hover:border-primary/30'
            }`}
            onClick={() => setBucket(filter.key)}
          >
            <p className="text-sm font-semibold text-foreground">{filter.label}</p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {filter.summaryKey
                ? data?.summary[filter.summaryKey] ?? 0
                : data?.meta.total ?? 0}
            </p>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : data?.data.length ? (
        <DataTable
          data={data.data}
          columns={[
            {
              key: 'opportunity',
              header: 'Cuenta',
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
              key: 'priority',
              header: 'Prioridad',
              render: (item) => (
                <div className="space-y-2">
                  <StatusBadge
                    value={item.leadScore ?? 'P4'}
                    label={formatLeadScore(item.leadScore)}
                  />
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
              key: 'followUp',
              header: 'Seguimiento',
              render: (item) => (
                <div className="space-y-2">
                  <StatusBadge
                    value={item.followUpState}
                    label={followUpStateLabels[item.followUpState]}
                  />
                  <p className="text-xs text-muted">
                    {item.nextActivityAt
                      ? `Proxima: ${formatDate(item.nextActivityAt)}`
                      : 'Sin proxima actividad'}
                  </p>
                  <p className="text-xs text-muted">
                    {item.daysSinceLastContact === null
                      ? 'Sin contacto registrado'
                      : `${item.daysSinceLastContact} dias desde el ultimo contacto`}
                  </p>
                </div>
              ),
            },
            {
              key: 'pipeline',
              header: 'Pipeline',
              render: (item) => (
                <div className="space-y-2">
                  <StatusBadge value={item.stage} />
                  <p className="text-xs text-muted">
                    {formatCurrency(item.estimatedValue)} • {item.probability}%
                  </p>
                  <p className="text-xs text-muted">
                    Responsable: {item.owner?.name ?? 'Sin responsable'}
                  </p>
                </div>
              ),
            },
            {
              key: 'recommendation',
              header: 'Accion recomendada',
              render: (item) => (
                <p className="max-w-xs text-sm text-muted">
                  {item.actionRecommended}
                </p>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleOpenActivity(item, {
                        type: 'CALL',
                        title: `Llamada a ${item.company?.name ?? item.title}`,
                        status: 'COMPLETED',
                      })
                    }
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Llamada
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleOpenActivity(item, {
                        type: 'TASK',
                        title: `Seguimiento pendiente: ${item.title}`,
                        status: 'PLANNED',
                      })
                    }
                  >
                    <CalendarCheck2 className="mr-2 h-4 w-4" />
                    Programar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelected(item);
                      setSelectedStage(item.stage);
                      setSelectedOwnerId(item.ownerId);
                    }}
                  >
                    Gestionar
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={<div />}
        />
      ) : (
        <EmptyState
          title="Sin seguimientos pendientes"
          description="No hay oportunidades que coincidan con los filtros actuales."
        />
      )}

      <EntityDialog
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title={
          selected ? `Registrar actividad para ${selected.title}` : 'Registrar actividad'
        }
        description="Usa esta accion rapida para registrar contacto o dejar programado el siguiente paso."
        schema={activitySchema}
        fields={[
          {
            name: 'type',
            label: 'Tipo',
            type: 'select',
            options: [
              { value: 'CALL', label: 'Llamada' },
              { value: 'EMAIL', label: 'Correo' },
              { value: 'WHATSAPP', label: 'WhatsApp' },
              { value: 'MEETING', label: 'Reunion' },
              { value: 'TASK', label: 'Tarea' },
              { value: 'NOTE', label: 'Nota' },
            ],
          },
          {
            name: 'status',
            label: 'Estado',
            type: 'select',
            options: [
              { value: 'COMPLETED', label: 'Completada' },
              { value: 'PLANNED', label: 'Programada' },
            ],
          },
          { name: 'title', label: 'Resumen' },
          {
            name: 'date',
            label: 'Fecha y hora',
            type: 'datetime-local',
          },
          { name: 'description', label: 'Notas', type: 'textarea' },
        ]}
        defaultValues={activityDefaults}
        submitLabel="Guardar actividad"
        loading={activityMutation.isPending}
        onSubmit={async (values) => activityMutation.mutateAsync(values)}
      />

      <Modal
        open={!!selected && !activityOpen}
        onClose={() => setSelected(null)}
        title={selected ? `Gestionar ${selected.title}` : 'Gestionar seguimiento'}
        description={
          selected
            ? `${selected.company?.name ?? 'Cuenta'} • ${followUpStateLabels[selected.followUpState]}`
            : ''
        }
      >
        {selected ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm font-semibold text-foreground">Contexto</p>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  <p>Etapa actual: {titleize(selected.stage)}</p>
                  <p>Score: {formatLeadScore(selected.leadScore)}</p>
                  <p>
                    Ultima actividad:{' '}
                    {selected.lastActivityAt
                      ? formatDate(selected.lastActivityAt)
                      : 'Sin registro'}
                  </p>
                  <p>
                    Proxima actividad:{' '}
                    {selected.nextActivityAt
                      ? formatDate(selected.nextActivityAt)
                      : 'Sin programar'}
                  </p>
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold text-foreground">
                  Accion recomendada
                </p>
                <p className="mt-3 text-sm text-muted">
                  {selected.actionRecommended}
                </p>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-3xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">Mover etapa</p>
                </div>
                <Select
                  value={selectedStage}
                  onChange={(event) => setSelectedStage(event.target.value)}
                >
                  {opportunityStages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <Button
                  className="w-full"
                  disabled={stageMutation.isPending || selectedStage === selected.stage}
                  onClick={() => stageMutation.mutate(selectedStage)}
                >
                  Guardar etapa
                </Button>
              </div>

              <div className="space-y-3 rounded-3xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-foreground">Cambiar responsable</p>
                </div>
                <Select
                  value={selectedOwnerId}
                  onChange={(event) => setSelectedOwnerId(event.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
                <Button
                  className="w-full"
                  disabled={ownerMutation.isPending || selectedOwnerId === selected.ownerId}
                  onClick={() => ownerMutation.mutate(selectedOwnerId)}
                >
                  Guardar responsable
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  handleOpenActivity(selected, {
                    type: 'CALL',
                    title: `Llamada a ${selected.company?.name ?? selected.title}`,
                    status: 'COMPLETED',
                  })
                }
              >
                Registrar llamada
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  handleOpenActivity(selected, {
                    type: 'NOTE',
                    title: `Nota de seguimiento: ${selected.title}`,
                    status: 'COMPLETED',
                  })
                }
              >
                Registrar nota
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  handleOpenActivity(selected, {
                    type: 'TASK',
                    title: `Proxima accion: ${selected.title}`,
                    status: 'PLANNED',
                  })
                }
              >
                Crear tarea
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  stageMutation.mutate(
                    selected.stage === 'NEW' ? 'CONTACTED' : selected.stage,
                  )
                }
              >
                Marcar contactado
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleMarkNoResponse(selected)}
              >
                Marcar sin respuesta
              </Button>
              <Link href={`/opportunities/${selected.id}`}>
                <Button>Ir al detalle 360</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
