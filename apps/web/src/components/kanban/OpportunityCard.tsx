import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
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
      className={`p-3 cursor-grab hover:border-primary border shadow-sm bg-card text-card-foreground ${
        isDragging ? 'z-50 ring-2 ring-primary' : ''
      }`}
    >
      <div className="font-medium text-sm mb-1">{opportunity.title}</div>
      <div className="text-xs text-muted mb-2">{opportunity.company?.name}</div>
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
        <span className="text-xs font-semibold text-primary">
          {formatCurrency(opportunity.estimatedValue)}
        </span>
        <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
          {opportunity.probability}%
        </span>
      </div>
    </Card>
  );
}
