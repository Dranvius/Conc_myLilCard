'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Opportunity, Proposal } from '@/lib/types';

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['opportunity-detail', params.id],
    queryFn: () =>
      apiRequest<Opportunity & { proposals?: Proposal[] }>(
        `/opportunities/${params.id}`,
      ),
  });

  const stageMutation = useMutation({
    mutationFn: (stage: string) =>
      apiRequest(`/opportunities/${params.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['opportunity-detail', params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detalle comercial"
        title={data.title}
        description={`${data.company?.name ?? 'Sin empresa'} · Responsable: ${data.owner?.name ?? 'No asignado'}`}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Información general</h3>
            <StatusBadge value={data.stage} />
          </div>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">
                Valor estimado:
              </span>{' '}
              {formatCurrency(data.estimatedValue)}
            </p>
            <p>
              <span className="font-medium text-foreground">Probabilidad:</span>{' '}
              {data.probability}%
            </p>
            <p>
              <span className="font-medium text-foreground">
                Cierre esperado:
              </span>{' '}
              {formatDate(data.expectedCloseDate)}
            </p>
            <p>
              <span className="font-medium text-foreground">Notas:</span>{' '}
              {data.notes || 'Sin notas'}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {['NEGOTIATION', 'WON', 'LOST'].map((stage) => (
              <Button
                key={stage}
                variant="secondary"
                onClick={() => stageMutation.mutate(stage)}
              >
                Mover a {stage}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Propuestas relacionadas</h3>
          <div className="mt-4 space-y-3">
            {data.proposals?.length ? (
              data.proposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}`}
                  className="block rounded-3xl bg-surface-muted p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{proposal.title}</p>
                    <StatusBadge value={proposal.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {proposal.code} · {formatCurrency(proposal.totalAmount)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Sin propuestas"
                description="Aún no existen propuestas asociadas a esta oportunidad."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
