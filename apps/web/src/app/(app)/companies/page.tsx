'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, SquarePen, Trash2, MapPin } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
import { PotentialDuplicateModal } from '@/components/forms/potential-duplicate-modal';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table';
import { useApiList } from '@/hooks/use-api-list';
import { useBusinessUnits } from '@/hooks/use-reference-data';
import { apiRequest, downloadApiFile } from '@/lib/api-client';
import {
  getPotentialDuplicates,
  isPotentialDuplicateError,
} from '@/lib/duplicates';
import type { Company, Paged, PotentialDuplicate } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const companySchema = z.object({
  name: z.string().min(2, 'Ingresa el nombre'),
  legalName: z.string().optional(),
  taxId: z.string().min(3, 'Ingresa el NIT'),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  businessUnitId: z.string().min(1, 'Selecciona la unidad'),
  status: z.string().min(1, 'Selecciona el estado'),
});

const statusOptions = ['LEAD', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    PotentialDuplicate[]
  >([]);
  const [pendingValues, setPendingValues] = useState<
    z.infer<typeof companySchema> | null
  >(null);
  const { data, isLoading } = useApiList<Paged<Company>>(
    ['companies', search, status, businessUnitId],
    '/companies',
    { search, status, businessUnitId, limit: 100 },
  );
  const { data: businessUnits = [] } = useBusinessUnits();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof companySchema>) => {
      const payload = cleanPayload(values);
      if (editing) {
        return apiRequest(`/companies/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return apiRequest('/companies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      setOpen(false);
      setEditing(null);
      setPendingValues(null);
      setDuplicateCandidates([]);
    },
    onError: (error, values) => {
      if (isPotentialDuplicateError(error)) {
        setPendingValues(values);
        setDuplicateCandidates(getPotentialDuplicates(error));
      }
    },
  });

  const companyFields = useMemo(
    () => [
      { name: 'name', label: 'Nombre comercial' },
      { name: 'legalName', label: 'Razón social' },
      { name: 'taxId', label: 'NIT / Tax ID' },
      { name: 'phone', label: 'Teléfono' },
      { name: 'email', label: 'Correo', type: 'email' as const },
      { name: 'website', label: 'Sitio web' },
      { name: 'address', label: 'Dirección' },
      { name: 'city', label: 'Ciudad' },
      { name: 'country', label: 'País' },
      {
        name: 'businessUnitId',
        label: 'Unidad de negocio',
        type: 'select' as const,
        options: businessUnits.map((unit) => ({
          value: unit.id,
          label: unit.name,
        })),
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select' as const,
        options: statusOptions.map((item) => ({ value: item, label: item })),
      },
    ],
    [businessUnits],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestión comercial"
        title="Empresas"
        description="Administra cuentas, datos fiscales y la relación por unidad de negocio."
        action={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={async () => {
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                if (status) params.set('status', status);
                if (businessUnitId)
                  params.set('businessUnitId', businessUnitId);
                await downloadApiFile(
                  `/companies/export/excel?${params.toString()}`,
                  'empresas.xlsx',
                );
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
            <Link href="/companies/map">
              <Button variant="secondary" className="gap-2">
                <MapPin className="h-4 w-4" />
                Ver Mapa
              </Button>
            </Link>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear empresa
            </Button>
          </div>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <Input
          placeholder="Buscar por nombre, NIT, ciudad o correo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={businessUnitId}
          onChange={(event) => setBusinessUnitId(event.target.value)}
        >
          <option value="">Todas las unidades</option>
          {businessUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setStatus('');
            setBusinessUnitId('');
          }}
        >
          Limpiar filtros
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={[
            {
              key: 'name',
              header: 'Empresa',
              render: (item) => (
                <div>
                  <Link
                    href={`/companies/${item.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {item.legalName || item.taxId}
                  </p>
                </div>
              ),
            },
            {
              key: 'unit',
              header: 'Unidad',
              render: (item) => item.businessUnit?.name ?? 'Sin unidad',
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => <StatusBadge value={item.status} />,
            },
            {
              key: 'contact',
              header: 'Ubicación',
              render: (item) => (
                <div>
                  <p>{item.city || 'Sin ciudad'}</p>
                  <p className="text-xs text-muted">
                    {item.email || item.phone || 'Sin contacto'}
                  </p>
                </div>
              ),
            },
            {
              key: 'metrics',
              header: 'Relación',
              render: (item) => (
                <div className="text-xs text-muted">
                  <p>{item._count?.contacts ?? 0} contactos</p>
                  <p>{item._count?.opportunities ?? 0} oportunidades</p>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (item) => (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(item);
                      setOpen(true);
                    }}
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!window.confirm(`¿Archivar ${item.name}?`)) return;
                      await apiRequest(`/companies/${item.id}`, {
                        method: 'DELETE',
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['companies'],
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="No hay empresas registradas"
              description="Crea la primera cuenta para empezar a gestionar pipeline y servicio."
            />
          }
        />
      )}

      <EntityDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Editar empresa' : 'Nueva empresa'}
        description="Mantén el maestro de cuentas corporativas actualizado."
        schema={companySchema}
        fields={companyFields}
        defaultValues={{
          name: editing?.name ?? '',
          legalName: editing?.legalName ?? '',
          taxId: editing?.taxId ?? '',
          phone: editing?.phone ?? '',
          email: editing?.email ?? '',
          website: editing?.website ?? '',
          address: editing?.address ?? '',
          city: editing?.city ?? '',
          country: editing?.country ?? 'Colombia',
          businessUnitId: editing?.businessUnit?.id ?? businessUnitId ?? '',
          status: editing?.status ?? 'LEAD',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear empresa'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />

      <PotentialDuplicateModal
        open={duplicateCandidates.length > 0}
        duplicates={duplicateCandidates}
        title="Posibles empresas duplicadas"
        loading={mutation.isPending}
        onClose={() => {
          setDuplicateCandidates([]);
          setPendingValues(null);
        }}
        onContinue={async () => {
          if (!pendingValues) {
            return;
          }

          await mutation.mutateAsync({
            ...pendingValues,
            allowPotentialDuplicate: true,
          } as z.infer<typeof companySchema>);
        }}
      />
    </div>
  );
}
