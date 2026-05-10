import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatLeadScore, formatLeadSource } from '@/lib/crm';
import { formatCurrency } from '@/lib/format';
import type { Opportunity } from '@/lib/types';

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: {
      type: 'Opportunity',
      opportunity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/opportunities/${opportunity.id}`)}
      className={`cursor-grab border bg-card p-3 text-card-foreground shadow-sm hover:border-primary ${
        isDragging ? 'z-50 ring-2 ring-primary' : ''
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="text-sm font-medium">{opportunity.title}</div>
        {opportunity.leadScore ? (
          <StatusBadge
            value={opportunity.leadScore}
            label={formatLeadScore(opportunity.leadScore)}
          />
        ) : null}
      </div>
      <div className="mb-2 text-xs text-muted">{opportunity.company?.name}</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {opportunity.source ? (
          <StatusBadge
            value={opportunity.source}
            label={formatLeadSource(opportunity.source)}
          />
        ) : null}
        {opportunity.isStale ? (
          <StatusBadge
            value={
              opportunity.staleSeverity === 'critical'
                ? 'STALE_CRITICAL'
                : 'STALE_WARNING'
            }
            label={`${opportunity.daysWithoutMovement ?? 0} dias sin mover`}
          />
        ) : null}
      </div>
      <div className="border-border flex items-center justify-between border-t pt-2">
        <span className="text-xs font-semibold text-primary">
          {formatCurrency(opportunity.estimatedValue)}
        </span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
          {opportunity.probability}%
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted">
        {opportunity.nextActivityAt
          ? `Proximo seguimiento: ${new Date(opportunity.nextActivityAt).toLocaleDateString('es-CO')}`
          : 'Sin proximo seguimiento'}
      </div>
    </Card>
  );
}
