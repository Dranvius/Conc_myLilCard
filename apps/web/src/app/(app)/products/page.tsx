'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen } from 'lucide-react';
import { z } from 'zod';
import { EntityDialog } from '@/components/forms/entity-dialog';
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
import { apiRequest } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type { Paged, Product } from '@/lib/types';
import { cleanPayload } from '@/lib/utils';

const productSchema = z.object({
  businessUnitId: z.string().min(1, 'Selecciona una unidad'),
  name: z.string().min(1, 'Ingresa el nombre'),
  sku: z.string().min(1, 'Ingresa el SKU'),
  category: z.string().min(1, 'Ingresa la categoría'),
  description: z.string().optional(),
  unitPrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  isActive: z.string().optional(),
});

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [isActive, setIsActive] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const { data, isLoading } = useApiList<Paged<Product>>(
    ['products', search, businessUnitId, isActive],
    '/products',
    {
      search,
      businessUnitId,
      isActive,
      limit: 100,
    },
  );
  const { data: businessUnits = [] } = useBusinessUnits();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof productSchema>) => {
      const payload = {
        ...cleanPayload(values),
        isActive:
          values.isActive === '' ? undefined : values.isActive === 'true',
      };

      if (editing) {
        return apiRequest(`/products/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      return apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          isActive: payload.isActive ?? true,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const fields = useMemo(
    () => [
      {
        name: 'businessUnitId',
        label: 'Unidad de negocio',
        type: 'select' as const,
        options: businessUnits.map((unit) => ({
          value: unit.id,
          label: unit.name,
        })),
      },
      { name: 'name', label: 'Nombre del producto' },
      { name: 'sku', label: 'SKU' },
      { name: 'category', label: 'Categoría' },
      { name: 'unitPrice', label: 'Precio unitario', type: 'number' as const },
      { name: 'stock', label: 'Stock', type: 'number' as const },
      {
        name: 'isActive',
        label: 'Estado',
        type: 'select' as const,
        options: [
          { value: 'true', label: 'Activo' },
          { value: 'false', label: 'Inactivo' },
        ],
      },
      { name: 'description', label: 'Descripción', type: 'textarea' as const },
    ],
    [businessUnits],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portafolio"
        title="Productos"
        description="Controla equipos, insumos y referencias comerciales por unidad de negocio."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear producto
          </Button>
        }
      />

      <Card className="grid gap-3 p-4 md:grid-cols-4">
        <Input
          placeholder="Buscar por SKU, nombre o categoría"
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
          value={isActive}
          onChange={(event) => setIsActive(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch('');
            setBusinessUnitId('');
            setIsActive('');
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
              key: 'product',
              header: 'Producto',
              render: (item) => (
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">{item.sku}</p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Categoría',
              render: (item) => (
                <div>
                  <p>{item.category}</p>
                  <p className="text-xs text-muted">
                    {item.businessUnit?.name}
                  </p>
                </div>
              ),
            },
            {
              key: 'price',
              header: 'Precio',
              render: (item) => formatCurrency(item.unitPrice),
            },
            {
              key: 'stock',
              header: 'Stock',
              render: (item) => item.stock,
            },
            {
              key: 'status',
              header: 'Estado',
              render: (item) => (
                <StatusBadge value={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
                      await apiRequest(`/products/${item.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !item.isActive }),
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['products'],
                      });
                    }}
                  >
                    {item.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              ),
            },
          ]}
          emptyState={
            <EmptyState
              title="Sin productos"
              description="Agrega referencias para empezar a cotizar y vender."
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
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        description="Define precios, stock y unidad de negocio para el portafolio comercial."
        schema={productSchema}
        fields={fields}
        defaultValues={{
          businessUnitId: editing?.businessUnitId ?? businessUnitId ?? '',
          name: editing?.name ?? '',
          sku: editing?.sku ?? '',
          category: editing?.category ?? '',
          description: editing?.description ?? '',
          unitPrice: Number(editing?.unitPrice ?? 0),
          stock: editing?.stock ?? 0,
          isActive: editing ? String(editing.isActive) : 'true',
        }}
        submitLabel={editing ? 'Guardar cambios' : 'Crear producto'}
        loading={mutation.isPending}
        onSubmit={async (values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
