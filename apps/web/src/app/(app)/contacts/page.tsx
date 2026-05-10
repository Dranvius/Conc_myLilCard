'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, Plus, SquarePen, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PotentialDuplicateModal } from '@/components/forms/potential-duplicate-modal';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiList } from '@/hooks/use-api-list';
import { useCompanies } from '@/hooks/use-reference-data';
import { apiRequest, downloadApiFile } from '@/lib/api-client';
import { formatLeadSource, leadSourceOptions } from '@/lib/crm';
import {
  getPotentialDuplicates,
  isPotentialDuplicateError,
} from '@/lib/duplicates';
import type { Contact, Paged, PotentialDuplicate } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const contactSchema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  firstName: z.string().min(1, 'Ingresa el nombre'),
  lastName: z.string().min(1, 'Ingresa el apellido'),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [source, setSource] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [viewing, setViewing] = useState<Contact | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    PotentialDuplicate[]
  >([]);
  const [pendingValues, setPendingValues] = useState<
    z.infer<typeof contactSchema> | null
  >(null);
  const { data, isLoading } = useApiList<Paged<Contact>>(
    ['contacts', search, companyId, source],
    '/contacts',
    {
      search,
      companyId,
      source,
      limit: 100,
    },
  );
  const { data: companies = [] } = useCompanies();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof contactSchema>) => {
      const payload = cleanPayload(values);
      if (editing) {
        return apiRequest(`/contacts/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return apiRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
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
      { name: 'firstName', label: 'Nombre' },
      { name: 'lastName', label: 'Apellido' },
      { name: 'position', label: 'Cargo' },
      { name: 'email', label: 'Correo', type: 'email' as const },
      { name: 'phone', label: 'Telefono' },
      {
        name: 'source',
        label: 'Origen',
        type: 'select' as const,
        options: leadSourceOptions.map((item) => ({
          value: item,
          label: formatLeadSource(item),
        })),
      },
      { name: 'notes', label: 'Notas', type: 'textarea' as const },
    ],
    [companies],
  );

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (companyId) params.set('companyId', companyId);
    if (source) params.set('source', source);
    await downloadApiFile(
      `/contacts/export/excel?${params.toString()}`,
      'contactos.xlsx',
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relaciones B2B"
        title="Contactos"
        description="Centraliza responsables de compra, clinicos y operacion por empresa."
        action={
          <div className="flex gap-2">
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
              <Plus className="h-4 w-4" />
              Crear contacto
            </Button>
          </div>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <Input
          placeholder="Buscar por nombre, cargo o correo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
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
            setCompanyId('');
            setSource('');
          }}
        >
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
              key: 'name',
              header: 'Contacto',
              render: (item) => (
                <div>
                  <p className="font-semibold">
                    {item.firstName} {item.lastName}
                  </p>
                  <p className="text-xs text-muted">
                    {item.position || 'Sin cargo'}
                  </p>
                </div>
              ),
            },
            {
              key: 'company',
              header: 'Empresa',
              render: (item) => item.company?.name ?? 'Sin empresa',
            },
            {
              key: 'source',
              header: 'Origen',
              render: (item) =>
                item.source ? (
                  <StatusBadge
                    value={item.source}
                    label={formatLeadSource(item.source)}
                  />
                ) : (
                  <span className="text-xs text-muted">Sin origen</span>
                ),
            },
            {
              key: 'contact',
              header: 'Canales',
              render: (item) => (
                <div className="text-xs text-muted">
                  <p>{item.email || 'Sin correo'}</p>
                  <p>{item.phone || 'Sin telefono'}</p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (item) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(item)}
                    title="Ver detalle y actividades"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                  </Button>
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
                      if (!window.confirm(`¿Eliminar a ${item.firstName}?`)) {
                        return;
                      }
                      await apiRequest(`/contacts/${item.id}`, {
                        method: 'DELETE',
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['contacts'],
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin contactos"
              description="Registra los primeros referentes comerciales o clinicos."
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
        title={editing ? 'Editar contacto' : 'Nuevo contacto'}
        description="Asocia cada contacto con su empresa, rol y origen dentro de la cuenta."
        schema={contactSchema}
        fields={fields}
        defaultValues={{
          companyId: editing?.companyId ?? companyId ?? '',
          firstName: editing?.firstName ?? '',
          lastName: editing?.lastName ?? '',
          position: editing?.position ?? '',
          email: editing?.email ?? '',
          phone: editing?.phone ?? '',
          notes: editing?.notes ?? '',
          source: editing?.source ?? '',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear contacto'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? `Historial: ${viewing.firstName} ${viewing.lastName}`
            : 'Detalle'
        }
        description={
          viewing?.position
            ? `${viewing.position} en ${viewing.company?.name || 'Sin empresa'}`
            : viewing?.company?.name || ''
        }
      >
        {viewing ? (
          <div className="flex flex-col gap-6 py-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  Correo
                </span>
                <span className="font-medium">
                  {viewing.email || 'No registrado'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  Telefono
                </span>
                <span className="font-medium">
                  {viewing.phone || 'No registrado'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  Origen
                </span>
                <div className="mt-1">
                  {viewing.source ? (
                    <StatusBadge
                      value={viewing.source}
                      label={formatLeadSource(viewing.source)}
                    />
                  ) : (
                    <span className="font-medium">No registrado</span>
                  )}
                </div>
              </div>
              {viewing.notes ? (
                <div className="col-span-2">
                  <span className="block text-xs font-semibold uppercase text-muted-foreground">
                    Notas
                  </span>
                  <p className="text-muted">{viewing.notes}</p>
                </div>
              ) : null}
            </div>

            <ActivityTimeline
              contactId={viewing.id}
              companyId={viewing.companyId}
            />
          </div>
        ) : null}
      </Modal>

      <PotentialDuplicateModal
        open={duplicateCandidates.length > 0}
        duplicates={duplicateCandidates}
        title="Posibles contactos duplicados"
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
          } as z.infer<typeof contactSchema>);
        }}
      />
    </div>
  );
}
