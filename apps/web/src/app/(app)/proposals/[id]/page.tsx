'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Proposal } from '@/lib/types';

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['proposal-detail', params.id],
    queryFn: () => apiRequest<Proposal>(`/proposals/${params.id}`),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documento comercial"
        title={data.title}
        description={`${data.code} · ${data.opportunity?.company?.name ?? 'Sin empresa'}`}
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resumen</h3>
            <StatusBadge value={data.status} />
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Válida hasta:</span>{' '}
              {formatDate(data.validUntil)}
            </p>
            <p>
              <span className="font-medium text-foreground">Total:</span>{' '}
              {formatCurrency(data.totalAmount)}
            </p>
            <p>
              <span className="font-medium text-foreground">Notas:</span>{' '}
              {data.notes || 'Sin notas'}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Items</h3>
          <div className="mt-4 space-y-3">
            {data.items?.length ? (
              data.items.map((item) => (
                <div key={item.id} className="rounded-3xl bg-surface-muted p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {item.product?.name ?? 'Producto'}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {item.quantity} x {formatCurrency(item.unitPrice)} · Desc:{' '}
                    {formatCurrency(item.discount)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin items"
                description="Esta propuesta no tiene productos asociados."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
