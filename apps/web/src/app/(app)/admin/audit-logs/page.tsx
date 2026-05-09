'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { formatDate, titleize } from '@/lib/format';
import type { AuditLog, Paged } from '@/lib/types';

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useApiList<Paged<AuditLog>>(
    ['admin-audit', search],
    '/admin/audit-logs',
    {
      search,
      limit: 100,
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Auditoría"
        description="Consulta acciones críticas registradas por el backend."
      />

      <Input
        placeholder="Buscar por acción, entidad o id"
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
              key: 'action',
              header: 'Acción',
              render: (item) => titleize(item.action),
            },
            {
              key: 'entity',
              header: 'Entidad',
              render: (item) => item.entity,
            },
            {
              key: 'user',
              header: 'Usuario',
              render: (item) => item.user?.name ?? 'Sistema',
            },
            {
              key: 'date',
              header: 'Fecha',
              render: (item) => formatDate(item.createdAt),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin eventos"
              description="No hay auditoría disponible para mostrar."
            />
          }
        />
      )}
    </div>
  );
}
