'use client';

import { useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Configurar date-fns para react-big-calendar en Español
const locales = {
  es: es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'OPPORTUNITY' | 'ACTIVITY' | 'SERVICE_ORDER' | 'INVOICE';
  entityId: string;
  color: string;
};

// Componente para darle estilo personalizado a cada evento
const CustomEvent = ({ event }: { event: CalendarEvent }) => (
  <div
    className="flex h-full w-full flex-col justify-center overflow-hidden rounded px-1.5 py-0.5 text-xs font-medium text-white shadow-sm"
    style={{ backgroundColor: event.color }}
    title={event.title}
  >
    <span className="truncate">{event.title}</span>
  </div>
);

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Obtener eventos del backend
  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      // Pedir eventos de -1 mes a +2 meses para tener un buen rango en caché
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setMonth(to.getMonth() + 2);
      
      const res = await apiRequest<{ data: any[] }>(
        `/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      
      // Convertir strings a fechas reales de JavaScript para react-big-calendar
      return res.data.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      })) as CalendarEvent[];
    },
  });

  const events = data || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Calendario"
        description="Visualiza tus cierres estimados, actividades y mantenimientos programados."
      />

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {/* Leyenda de colores */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#22C55E]" />
            <span className="text-muted-foreground">Cierres (Alta Prob.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
            <span className="text-muted-foreground">Cierres (Media Prob.) / Facturas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
            <span className="text-muted-foreground">Cierres (Baja Prob.)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#8B5CF6]" />
            <span className="text-muted-foreground">Reuniones</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#3B82F6]" />
            <span className="text-muted-foreground">Tareas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#06B6D4]" />
            <span className="text-muted-foreground">Mantenimientos</span>
          </div>
        </div>

        {/* Calendario */}
        <div className="h-[700px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <BigCalendar
              localizer={localizer}
              events={events}
              date={date}
              view={view}
              // @ts-expect-error - View type mismatches slightly in strict mode
              onView={(newView) => setView(newView)}
              onNavigate={(newDate) => setDate(newDate)}
              culture="es"
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'No hay eventos en este rango.',
              }}
              components={{
                event: CustomEvent,
              }}
              onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
              // Quitar estilos por defecto que interfieren con nuestro CustomEvent
              eventPropGetter={() => ({
                style: {
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                },
              })}
              popup
            />
          )}
        </div>
      </div>

      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Detalle del Evento'}
      >
        {selectedEvent && (
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Tipo de Evento</span>
                <span className="font-medium text-foreground">
                  {selectedEvent.type === 'OPPORTUNITY' && 'Cierre de Oportunidad'}
                  {selectedEvent.type === 'ACTIVITY' && 'Actividad (Reunión/Tarea)'}
                  {selectedEvent.type === 'SERVICE_ORDER' && 'Mantenimiento Programado'}
                  {selectedEvent.type === 'INVOICE' && 'Vencimiento de Factura'}
                </span>
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fecha Planificada</span>
                <span className="font-medium text-foreground">
                  {format(selectedEvent.start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Link
                href={
                  selectedEvent.type === 'OPPORTUNITY'
                    ? `/opportunities/${selectedEvent.entityId}`
                    : selectedEvent.type === 'SERVICE_ORDER'
                    ? `/service-orders/${selectedEvent.entityId}`
                    : selectedEvent.type === 'INVOICE'
                    ? `/invoices/${selectedEvent.entityId}`
                    : '#'
                }
              >
                <Button>Ver Detalles Completos</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Estilos globales para react-big-calendar para que combine con Tailwind */}
      <style dangerouslySetInnerHTML={{__html: `
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar button {
          border-radius: 0.5rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          color: #475569;
          border-color: #e2e8f0;
        }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
          background-color: #f1f5f9;
          color: #0f172a;
          box-shadow: none;
        }
        .rbc-toolbar button:hover {
          background-color: #f8fafc;
        }
        .rbc-header {
          padding: 0.5rem;
          font-weight: 600;
          color: #334155;
          text-transform: capitalize;
        }
        .rbc-today {
          background-color: #f8fafc;
        }
        .rbc-event {
          background-color: transparent !important;
        }
      `}} />
    </div>
  );
}
