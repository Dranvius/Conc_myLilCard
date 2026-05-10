import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { OpportunityCard } from './OpportunityCard';
import type { Opportunity } from '@/lib/types';

interface KanbanColumnProps {
  stage: string;
  label: string;
  opportunities: Opportunity[];
}

export function KanbanColumn({ stage, label, opportunities }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: 'Column',
      stage,
    },
  });

  return (
    <div className="flex flex-col bg-muted/30 rounded-lg border border-border w-[300px] shrink-0 h-full">
      <div className="p-3 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-lg">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs bg-background text-foreground px-2 py-0.5 rounded-full border border-border shadow-sm">
          {opportunities.length}
        </span>
      </div>
      
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 flex flex-col gap-2 min-h-[150px] transition-colors rounded-b-lg overflow-y-auto ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext
          items={opportunities.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
