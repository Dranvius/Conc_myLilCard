'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useBusinessUnits, useRoles } from '@/hooks/use-reference-data';
import { apiRequest } from '@/lib/api-client';
import type { CurrentUser, Paged } from '@/lib/types';

const schema = z.object({
  name: z.string().min(2, 'Ingresa el nombre'),
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  roleId: z.string().min(1, 'Selecciona un rol'),
  businessUnitId: z.string().optional(),
  isActive: z.string().optional(),
});

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CurrentUser | null>(null);
  const { data, isLoading } = useApiList<Paged<CurrentUser>>(
    ['admin-users', search],
    '/users',
    {
      search,
      limit: 100,
    },
  );
  const { data: roles = [] } = useRoles();
  const { data: businessUnits = [] } = useBusinessUnits();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => {
      const payload = {
        ...values,
        isActive: values.isActive === 'false' ? false : true,
      };

      if (editing) {
        return apiRequest(`/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      return apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const fields = useMemo(
    () => [
      { name: 'name', label: 'Nombre' },
      { name: 'email', label: 'Correo', type: 'email' as const },
      { name: 'password', label: 'Contraseña', type: 'password' as const },
      {
        name: 'roleId',
        label: 'Rol',
        type: 'select' as const,
        options: roles.map((role) => ({ value: role.id, label: role.name })),
      },
      {
        name: 'businessUnitId',
        label: 'Unidad',
        type: 'select' as const,
        options: businessUnits.map((unit) => ({
          value: unit.id,
          label: unit.name,
        })),
      },
      {
        name: 'isActive',
        label: 'Estado',
        type: 'select' as const,
        options: [
          { value: 'true', label: 'Activo' },
          { value: 'false', label: 'Inactivo' },
        ],
      },
    ],
    [businessUnits, roles],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Usuarios"
        description="Gestiona activación, rol y cobertura por unidad de negocio."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear usuario
          </Button>
        }
      />

      <Input
        placeholder="Buscar por nombre o correo"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={[
            {
              key: 'user',
              header: 'Usuario',
              render: (item) => (
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">{item.email}</p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Rol',
              render: (item) => item.role.name,
            },
            {
              key: 'unit',
              header: 'Unidad',
              render: (item) => item.businessUnit?.name ?? 'Global',
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => (
                <StatusBadge value={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
                      await apiRequest(`/users/${item.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !item.isActive }),
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['admin-users'],
                      });
                    }}
                  >
                    {item.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin usuarios"
              description="Todavía no hay usuarios para administrar."
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
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        description="Define el rol de acceso y su alcance operativo."
        schema={schema}
        fields={fields}
        defaultValues={{
          name: editing?.name ?? '',
          email: editing?.email ?? '',
          password: '',
          roleId: editing?.roleId ?? '',
          businessUnitId: editing?.businessUnitId ?? '',
          isActive: String(editing?.isActive ?? true),
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear usuario'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
