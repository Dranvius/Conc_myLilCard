'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Review, ServiceOrder } from '@/lib/types';

export default function ServiceOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['service-order-detail', params.id],
    queryFn: () =>
      apiRequest<ServiceOrder & { reviews?: Review[] }>(
        `/service-orders/${params.id}`,
      ),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[480px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Servicio técnico"
        title={data.code}
        description={`${data.company?.name ?? 'Sin empresa'} · ${data.type}`}
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Estado operativo</h3>
            <StatusBadge value={data.status} />
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Prioridad:</span>{' '}
              {data.priority}
            </p>
            <p>
              <span className="font-medium text-foreground">Operador:</span>{' '}
              {data.assignedOperator?.name || 'Sin asignar'}
            </p>
            <p>
              <span className="font-medium text-foreground">Programada:</span>{' '}
              {formatDate(data.scheduledAt)}
            </p>
            <p>
              <span className="font-medium text-foreground">Completada:</span>{' '}
              {formatDate(data.completedAt)}
            </p>
            <p>
              <span className="font-medium text-foreground">Descripción:</span>{' '}
              {data.description}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Historial básico y reseñas</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl bg-surface-muted p-4 text-sm">
              <p className="font-semibold">Creación de orden</p>
              <p className="text-muted">
                Registrada el {formatDate(data.createdAt)}
              </p>
            </div>
            {data.reviews?.length ? (
              data.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-3xl bg-surface-muted p-4 text-sm"
                >
                  <p className="font-semibold">
                    Calificación: {review.rating}/5
                  </p>
                  <p className="text-muted">
                    {review.comment || 'Sin comentario'}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin reseñas"
                description="Todavía no hay feedback asociado a esta orden."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
