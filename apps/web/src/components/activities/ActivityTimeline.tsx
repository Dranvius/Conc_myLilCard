'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckSquare,
  Mail,
  MessageCircle,
  Phone,
  Plus,
} from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { ActivityItem } from '@/lib/types';

const activityIcons = {
  CALL: Phone,
  MEETING: Calendar,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  TASK: CheckSquare,
};

const activityColors = {
  CALL: 'bg-blue-100 text-blue-600',
  MEETING: 'bg-purple-100 text-purple-600',
  EMAIL: 'bg-slate-100 text-slate-600',
  WHATSAPP: 'bg-green-100 text-green-600',
  TASK: 'bg-orange-100 text-orange-600',
};

const activityLabels = {
  CALL: 'Llamada',
  MEETING: 'Reunion',
  EMAIL: 'Correo',
  WHATSAPP: 'WhatsApp',
  TASK: 'Tarea',
};

const schema = z.object({
  type: z.string().min(1, 'Selecciona el tipo'),
  title: z.string().min(2, 'Ingresa un titulo'),
  description: z.string().optional(),
  date: z.string().min(1, 'Selecciona la fecha'),
  status: z.enum(['PLANNED', 'COMPLETED']).default('COMPLETED'),
});

export function ActivityTimeline({
  opportunityId,
  companyId,
  contactId,
}: {
  opportunityId?: string;
  companyId?: string;
  contactId?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryParams = new URLSearchParams();
  if (opportunityId) queryParams.append('opportunityId', opportunityId);
  if (companyId) queryParams.append('companyId', companyId);
  if (contactId) queryParams.append('contactId', contactId);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', opportunityId, companyId, contactId],
    queryFn: () =>
      apiRequest<ActivityItem[]>(`/activities?${queryParams.toString()}`),
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        ...values,
        date: new Date(values.date).toISOString(),
        opportunityId,
        companyId,
        contactId,
      };
      return apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (activityId: string) =>
      apiRequest(`/activities/${activityId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  return (
    <Card className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Historial de seguimiento</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar actividad
        </Button>
      </div>

      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent md:before:mx-auto md:before:translate-x-0">
        {activities.length === 0 && (
          <p className="text-center text-sm text-muted">
            Aun no hay actividades registradas.
          </p>
        )}
        {activities.map((activity) => {
          const Icon =
            activityIcons[activity.type as keyof typeof activityIcons] ??
            CheckSquare;
          const colors =
            activityColors[activity.type as keyof typeof activityColors] ??
            activityColors.TASK;

          return (
            <div
              key={activity.id}
              className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
            >
              <div
                className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-background shadow-sm md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${colors}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="w-[calc(100%-4rem)] rounded-xl border border-border bg-card p-4 shadow-sm md:w-[calc(50%-2.5rem)]">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {activity.title}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(activity.date)}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                  <span>
                    {
                      activityLabels[
                        activity.type as keyof typeof activityLabels
                      ]
                    }
                    {activity.createdBy
                      ? ` · Por ${activity.createdBy.name}`
                      : ''}
                  </span>
                  {activity.status ? (
                    <StatusBadge
                      value={activity.status}
                      label={
                        activity.status === 'PLANNED'
                          ? 'Programada'
                          : 'Completada'
                      }
                    />
                  ) : null}
                  {activity.isOverdue ? (
                    <StatusBadge value="OVERDUE" label="Vencida" />
                  ) : null}
                </div>
                {activity.description ? (
                  <p className="text-sm text-muted/90">
                    {activity.description}
                  </p>
                ) : null}
                {activity.status === 'PLANNED' ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      {activity.dueDate
                        ? `Seguimiento programado para ${formatDate(activity.dueDate)}`
                        : 'Seguimiento pendiente'}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={completeMutation.isPending}
                      onClick={() => completeMutation.mutate(activity.id)}
                    >
                      Marcar completada
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar actividad"
        description="Agrega un registro de seguimiento o programa el proximo paso comercial."
        schema={schema}
        fields={[
          {
            name: 'type',
            label: 'Tipo de actividad',
            type: 'select',
            options: Object.entries(activityLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          { name: 'title', label: 'Resumen o titulo' },
          {
            name: 'status',
            label: 'Estado',
            type: 'select',
            options: [
              { value: 'COMPLETED', label: 'Completada' },
              { value: 'PLANNED', label: 'Programada' },
            ],
          },
          {
            name: 'date',
            label: 'Fecha y hora',
            type: 'datetime-local' as any,
          },
          { name: 'description', label: 'Detalles / Notas', type: 'textarea' },
        ]}
        defaultValues={{
          type: 'CALL',
          title: '',
          status: 'COMPLETED',
          date: new Date().toISOString().slice(0, 16),
          description: '',
        }}
        submitLabel="Guardar actividad"
        loading={mutation.isPending}
        onSubmit={async (values) =>
          mutation.mutateAsync(values as z.infer<typeof schema>)
        }
      />
    </Card>
  );
}
