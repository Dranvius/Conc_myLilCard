import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { OpportunityCard } from './OpportunityCard';
import type { Opportunity } from '@/lib/types';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';

const stageConfig = [
  { id: 'NEW', label: 'NUEVA' },
  { id: 'CONTACTED', label: 'CONTACTADA' },
  { id: 'QUALIFIED', label: 'CALIFICADA' },
  { id: 'PROPOSAL_SENT', label: 'PROPUESTA ENV.' },
  { id: 'NEGOTIATION', label: 'NEGOCIACIÓN' },
  { id: 'WON', label: 'GANADA' },
  { id: 'LOST', label: 'PERDIDA' },
];

export function KanbanBoard({
  data,
  onUpdate,
}: {
  data: Opportunity[];
  onUpdate: () => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const opportunities = useMemo(
    () =>
      data.map((item) =>
        overrides[item.id]
          ? {
              ...item,
              stage: overrides[item.id],
            }
          : item,
      ),
    [data, overrides],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const opportunityId = active.id as string;
    const activeStage = opportunities.find((item) => item.id === opportunityId)?.stage;
    
    // Si soltó sobre otra tarjeta, obtener la etapa de esa tarjeta, si soltó sobre la columna, obtener el id de la columna
    let targetStage = over.id as string;
    if (over.data.current?.type === 'Opportunity') {
      targetStage = over.data.current.opportunity.stage;
    }

    if (activeStage && activeStage !== targetStage) {
      setOverrides((current) => ({
        ...current,
        [opportunityId]: targetStage,
      }));

      try {
        await apiRequest(`/opportunities/${opportunityId}/stage`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: targetStage }),
        });
        toast.success('Etapa actualizada');
        setOverrides((current) => {
          const next = { ...current };
          delete next[opportunityId];
          return next;
        });
        onUpdate();
      } catch {
        toast.error('Error al actualizar etapa');
        setOverrides((current) => {
          const next = { ...current };
          delete next[opportunityId];
          return next;
        });
      }
    }
  };

  const activeOpportunity = activeId
    ? opportunities.find((item) => item.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] w-full max-w-[calc(100vw-340px)]">
        {stageConfig.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage.id}
            label={stage.label}
            opportunities={opportunities.filter((o) => o.stage === stage.id)}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeOpportunity ? (
          <OpportunityCard opportunity={activeOpportunity} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
