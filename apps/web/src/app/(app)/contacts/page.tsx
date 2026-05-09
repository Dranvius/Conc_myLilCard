'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useCompanies } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import type { Contact, Paged } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const contactSchema = z.object({
  companyId: z.string().min(1, 'Selecciona una empresa'),
  firstName: z.string().min(1, 'Ingresa el nombre'),
  lastName: z.string().min(1, 'Ingresa el apellido'),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const { data, isLoading } = useApiList<Paged<Contact>>(
    ['contacts', search, companyId],
    '/contacts',
    {
      search,
      companyId,
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
      { name: 'phone', label: 'Teléfono' },
      { name: 'notes', label: 'Notas', type: 'textarea' as const },
    ],
    [companies],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relaciones B2B"
        title="Contactos"
        description="Centraliza responsables de compra, clínicos y operación por empresa."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear contacto
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-3">
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
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setCompanyId('');
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
              key: 'contact',
              header: 'Canales',
              render: (item) => (
                <div className="text-xs text-muted">
                  <p>{item.email || 'Sin correo'}</p>
                  <p>{item.phone || 'Sin teléfono'}</p>
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
                      if (!window.confirm(`¿Eliminar a ${item.firstName}?`))
                        return;
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
              description="Registra los primeros referentes comerciales o clínicos."
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
        description="Asocia cada contacto con su empresa y rol dentro de la cuenta."
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
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear contacto'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
