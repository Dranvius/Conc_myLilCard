'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { AISummary } from '@/components/ai/AISummary';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatLeadScore, formatLeadSource } from '@/lib/crm';
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
      <Link
        href="/opportunities"
        className="flex w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a oportunidades
      </Link>
      <PageHeader
        eyebrow="Detalle comercial"
        title={data.title}
        description={`${data.company?.name ?? 'Sin empresa'} · Responsable: ${data.owner?.name ?? 'No asignado'}`}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <AISummary opportunityId={data.id} />
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Informacion general</h3>
              <StatusBadge value={data.stage} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.leadScore ? (
                <StatusBadge
                  value={data.leadScore}
                  label={formatLeadScore(data.leadScore)}
                />
              ) : null}
              {data.source ? (
                <StatusBadge
                  value={data.source}
                  label={formatLeadSource(data.source)}
                />
              ) : null}
              {data.isStale ? (
                <StatusBadge
                  value={
                    data.staleSeverity === 'critical'
                      ? 'STALE_CRITICAL'
                      : 'STALE_WARNING'
                  }
                  label={`${data.daysWithoutMovement ?? 0} dias sin mover`}
                />
              ) : null}
              {data.overdueActivitiesCount ? (
                <StatusBadge
                  value="OVERDUE"
                  label={`${data.overdueActivitiesCount} seguimientos vencidos`}
                />
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 text-sm text-muted md:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">
                  Valor estimado:
                </span>{' '}
                {formatCurrency(data.estimatedValue)}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Probabilidad:
                </span>{' '}
                {data.probability}%
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Cierre esperado:
                </span>{' '}
                {formatDate(data.expectedCloseDate)}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Ultima actividad:
                </span>{' '}
                {formatDate(data.lastActivityAt)}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Proxima actividad:
                </span>{' '}
                {formatDate(data.nextActivityAt)}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Dias sin movimiento:
                </span>{' '}
                {data.daysWithoutMovement ?? 0}
              </p>
              <p className="md:col-span-2">
                <span className="font-medium text-foreground">Notas:</span>{' '}
                {data.notes || 'Sin notas'}
              </p>
            </div>
            {data.leadScoreReasons?.length ? (
              <div className="mt-6 rounded-3xl bg-surface-muted p-4">
                <p className="text-sm font-semibold text-foreground">
                  Explicacion del score
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {data.leadScoreReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
                  description="Aun no existen propuestas asociadas a esta oportunidad."
                />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Historial de etapas</h3>
            <div className="mt-4 space-y-3">
              {data.stageHistory?.length ? (
                data.stageHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-3xl bg-surface-muted p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {entry.fromStage ? `${entry.fromStage} -> ` : ''}
                          {entry.toStage}
                        </p>
                        <p className="text-xs text-muted">
                          {entry.changedBy?.name
                            ? `Por ${entry.changedBy.name}`
                            : 'Cambio registrado por el sistema'}
                        </p>
                      </div>
                      <p className="text-xs text-muted">
                        {formatDate(entry.changedAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Sin historial de etapas"
                  description="Aun no hay transiciones registradas para esta oportunidad."
                />
              )}
            </div>
          </Card>
        </div>

        <div>
          <ActivityTimeline
            opportunityId={data.id}
            companyId={data.companyId}
            contactId={data.contactId ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
