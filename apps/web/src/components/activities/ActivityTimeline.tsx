import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Calendar, Mail, MessageCircle, CheckSquare, Plus } from 'lucide-react';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { EntityDialog } from '@/components/forms/entity-dialog';

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  companyId?: string;
  opportunityId?: string;
  contactId?: string;
  createdBy?: { id: string; name: string };
}

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
  MEETING: 'Reunión',
  EMAIL: 'Correo',
  WHATSAPP: 'WhatsApp',
  TASK: 'Tarea',
};

const schema = z.object({
  type: z.string().min(1, 'Selecciona el tipo'),
  title: z.string().min(2, 'Ingresa un título'),
  description: z.string().optional(),
  date: z.string().min(1, 'Selecciona la fecha'),
});

export function ActivityTimeline({ opportunityId, companyId, contactId }: { opportunityId?: string; companyId?: string; contactId?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const queryParams = new URLSearchParams();
  if (opportunityId) queryParams.append('opportunityId', opportunityId);
  if (companyId) queryParams.append('companyId', companyId);
  if (contactId) queryParams.append('contactId', contactId);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', opportunityId, companyId, contactId],
    queryFn: () => apiRequest<Activity[]>(`/activities?${queryParams.toString()}`),
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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold">Historial de seguimiento</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar actividad
        </Button>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {activities.length === 0 && (
          <p className="text-center text-sm text-muted">Aún no hay actividades registradas.</p>
        )}
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type as keyof typeof activityIcons] || CheckSquare;
          const colors = activityColors[activity.type as keyof typeof activityColors] || activityColors.TASK;
          
          return (
            <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${colors}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{activity.title}</span>
                  <span className="text-xs text-muted">{formatDate(activity.date)}</span>
                </div>
                <div className="text-xs text-muted mb-2 font-medium">
                  {activityLabels[activity.type as keyof typeof activityLabels]} 
                  {activity.createdBy ? ` · Por ${activity.createdBy.name}` : ''}
                </div>
                {activity.description && (
                  <p className="text-sm text-muted/90">{activity.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar actividad"
        description="Agrega un registro de seguimiento (Llamada, WhatsApp, Reunión...)."
        schema={schema}
        fields={[
          {
            name: 'type',
            label: 'Tipo de actividad',
            type: 'select',
            options: Object.entries(activityLabels).map(([value, label]) => ({ value, label })),
          },
          { name: 'title', label: 'Resumen o Título' },
          { name: 'date', label: 'Fecha y hora', type: 'datetime-local' as any },
          { name: 'description', label: 'Detalles / Notas', type: 'textarea' },
        ]}
        defaultValues={{
          type: 'CALL',
          title: '',
          date: new Date().toISOString().slice(0, 16),
          description: '',
        }}
        submitLabel="Guardar actividad"
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values as z.infer<typeof schema>)}
      />
    </Card>
  );
}
