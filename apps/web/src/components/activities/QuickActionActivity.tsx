'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog, type DialogField } from '@/components/forms/entity-dialog';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { useCompanies, useContacts, useOpportunities } from '@/hooks/use-reference-data';

const schema = z.object({
  type: z.string().min(1, 'Selecciona el tipo'),
  title: z.string().min(2, 'Ingresa un título'),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  date: z.string().min(1, 'Selecciona la fecha'),
  description: z.string().optional(),
});

export function QuickActionActivity() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: opportunities = [] } = useOpportunities();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload = {
        ...values,
        date: new Date(values.date).toISOString(),
        companyId: values.companyId || undefined,
        contactId: values.contactId || undefined,
        opportunityId: values.opportunityId || undefined,
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

  const fields = useMemo(
    () => [
      {
        name: 'type',
        label: 'Tipo de actividad',
        type: 'select' as const,
        options: [
          { value: 'CALL', label: 'Llamada' },
          { value: 'MEETING', label: 'Reunión' },
          { value: 'EMAIL', label: 'Correo' },
          { value: 'WHATSAPP', label: 'WhatsApp' },
          { value: 'TASK', label: 'Tarea' },
          { value: 'NOTE', label: 'Nota interna' },
        ],
      },
      { name: 'title', label: 'Resumen o Título' },
      {
        name: 'companyId',
        label: 'Empresa relacionada (Opcional)',
        type: 'select' as const,
        options: [{ value: '', label: 'Ninguna' }, ...companies.map((c) => ({ value: c.id, label: c.name }))],
      },
      {
        name: 'contactId',
        label: 'Contacto relacionado (Opcional)',
        type: 'select' as const,
        options: [{ value: '', label: 'Ninguno' }, ...contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))],
      },
      {
        name: 'opportunityId',
        label: 'Oportunidad relacionada (Opcional)',
        type: 'select' as const,
        options: [{ value: '', label: 'Ninguna' }, ...opportunities.map((o) => ({ value: o.id, label: o.title }))],
      },
      { name: 'date', label: 'Fecha y hora', type: 'datetime-local' as any },
      { name: 'description', label: 'Detalles / Notas', type: 'textarea' as const },
    ] as any[],
    [companies, contacts, opportunities]
  );

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        className="hidden md:flex gap-2 rounded-full shadow-md bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white border-0"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        <span className="font-semibold tracking-wide">Registro rápido</span>
      </Button>

      {/* Mobile Floating Button */}
      <Button
        variant="primary"
        size="lg"
        className="md:hidden fixed bottom-6 right-6 flex items-center justify-center h-14 w-14 p-0 rounded-full shadow-xl bg-gradient-to-r from-primary to-indigo-600 border-0 z-50"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      <EntityDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registro rápido"
        description="Registra una llamada, nota o reunión en 15 segundos."
        schema={schema}
        fields={fields}
        defaultValues={{
          type: 'CALL',
          title: '',
          companyId: '',
          contactId: '',
          opportunityId: '',
          date: new Date().toISOString().slice(0, 16),
          description: '',
        }}
        submitLabel="Guardar actividad"
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values as z.infer<typeof schema>)}
      />
    </>
  );
}
