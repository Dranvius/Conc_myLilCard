'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Company } from '@/lib/types';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['company-detail', params.id],
    queryFn: () =>
      apiRequest<Company & Record<string, unknown>>(`/companies/${params.id}`),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[520px] w-full" />;
  }

  const company = data as Company & {
    contacts?: Array<{
      id: string;
      firstName: string;
      lastName: string;
      position?: string;
      email?: string;
    }>;
    opportunities?: Array<{
      id: string;
      title: string;
      stage: string;
      estimatedValue: number | string;
    }>;
    sales?: Array<{ id: string; status: string; totalAmount: number | string }>;
    serviceOrders?: Array<{ id: string; code: string; status: string }>;
    invoices?: Array<{
      id: string;
      invoiceNumber: string;
      total: number | string;
      status: string;
    }>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title={company.name}
        description={`${company.legalName || company.taxId} · ${company.businessUnit?.name ?? 'Sin unidad'}`}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Información general</h3>
            <StatusBadge value={company.status} />
          </div>
          <div className="mt-5 grid gap-4 text-sm text-muted md:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">NIT:</span>{' '}
              {company.taxId}
            </p>
            <p>
              <span className="font-medium text-foreground">Correo:</span>{' '}
              {company.email || 'No registrado'}
            </p>
            <p>
              <span className="font-medium text-foreground">Teléfono:</span>{' '}
              {company.phone || 'No registrado'}
            </p>
            <p>
              <span className="font-medium text-foreground">Ciudad:</span>{' '}
              {company.city || 'No registrada'}
            </p>
            <p>
              <span className="font-medium text-foreground">Dirección:</span>{' '}
              {company.address || 'No registrada'}
            </p>
            <p>
              <span className="font-medium text-foreground">Creada:</span>{' '}
              {formatDate(company.createdAt)}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Relación comercial</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-surface-muted p-4">
              <p className="text-sm text-muted">Oportunidades</p>
              <p className="mt-2 text-2xl font-semibold">
                {company.opportunities?.length ?? 0}
              </p>
            </div>
            <div className="rounded-3xl bg-surface-muted p-4">
              <p className="text-sm text-muted">Ventas</p>
              <p className="mt-2 text-2xl font-semibold">
                {company.sales?.length ?? 0}
              </p>
            </div>
            <div className="rounded-3xl bg-surface-muted p-4">
              <p className="text-sm text-muted">Órdenes</p>
              <p className="mt-2 text-2xl font-semibold">
                {company.serviceOrders?.length ?? 0}
              </p>
            </div>
            <div className="rounded-3xl bg-surface-muted p-4">
              <p className="text-sm text-muted">Facturas</p>
              <p className="mt-2 text-2xl font-semibold">
                {company.invoices?.length ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Contactos asociados</h3>
          <div className="mt-4 space-y-3">
            {company.contacts?.length ? (
              company.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-3xl bg-surface-muted p-4 text-sm"
                >
                  <p className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="text-muted">
                    {contact.position || 'Sin cargo'} ·{' '}
                    {contact.email || 'Sin correo'}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin contactos"
                description="No hay contactos vinculados a esta empresa."
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold">Oportunidades y ventas</h3>
          <div className="mt-4 space-y-3">
            {company.opportunities?.length ? (
              company.opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="rounded-3xl bg-surface-muted p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{opportunity.title}</p>
                    <StatusBadge value={opportunity.stage} />
                  </div>
                  <p className="mt-2 text-muted">
                    Valor estimado: {formatCurrency(opportunity.estimatedValue)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sin oportunidades"
                description="Aún no hay pipeline para esta cuenta."
              />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <ActivityTimeline companyId={company.id} />
      </div>
    </div>
  );
}
