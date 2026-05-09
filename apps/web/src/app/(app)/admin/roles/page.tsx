'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import type { Role } from '@/lib/types';

export default function AdminRolesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => apiRequest<Role[]>('/roles'),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[340px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Roles"
        description="Consulta roles y permisos disponibles dentro del sistema."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {data.length ? (
          data.map((role) => (
            <Card key={role.id} className="p-6">
              <h3 className="text-lg font-semibold">{role.name}</h3>
              <p className="mt-2 text-sm text-muted">
                {role.description || 'Sin descripción'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.permissions?.map((permission) => (
                  <span
                    key={permission.permission.id}
                    className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted"
                  >
                    {permission.permission.key}
                  </span>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Sin roles"
            description="No hay roles configurados en este entorno."
          />
        )}
      </div>
    </div>
  );
}
