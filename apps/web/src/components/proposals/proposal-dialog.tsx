'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import type { Opportunity, Product, Proposal } from '@/lib/types';

export const proposalSchema = z.object({
  opportunityId: z.string().min(1, 'Selecciona una oportunidad'),
  code: z.string().min(1, 'Ingresa el código'),
  title: z.string().min(1, 'Ingresa el título'),
  status: z.string().min(1, 'Selecciona un estado'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Selecciona un producto'),
        quantity: z.coerce.number().min(1),
        unitPrice: z.coerce.number().min(0),
        discount: z.coerce.number().min(0),
      }),
    )
    .min(1, 'Agrega al menos un item'),
});

type ProposalValues = z.infer<typeof proposalSchema>;

function getDefaultValues(initial?: Proposal): ProposalValues {
  return {
    opportunityId: initial?.opportunityId ?? '',
    code: initial?.code ?? '',
    title: initial?.title ?? '',
    status: initial?.status ?? 'DRAFT',
    validUntil: initial?.validUntil ? initial.validUntil.slice(0, 10) : '',
    notes: initial?.notes ?? '',
    items: initial?.items?.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
    })) ?? [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
  };
}

export function ProposalDialog({
  open,
  opportunities,
  products,
  initial,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  opportunities: Opportunity[];
  products: Product[];
  initial?: Proposal | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: ProposalValues) => Promise<unknown>;
}) {
  const form = useForm<ProposalValues>({
    resolver: zodResolver(proposalSchema as any) as any,
    defaultValues: getDefaultValues(initial ?? undefined),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(initial ?? undefined));
    }
  }, [form, initial, open]);

  const watchedItems = form.watch('items');

  const total = useMemo(
    () =>
      watchedItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) * Number(item.unitPrice || 0) -
          Number(item.discount || 0),
        0,
      ),
    [watchedItems],
  );

  return (
    <Modal
      open={open}
      title={initial ? 'Editar propuesta' : 'Nueva propuesta'}
      description="Agrega productos, descuentos y vigencia para armar una propuesta comercial real."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="proposal-form" type="submit" disabled={loading}>
            {loading
              ? 'Guardando...'
              : initial
                ? 'Guardar cambios'
                : 'Crear propuesta'}
          </Button>
        </>
      }
    >
      <form
        id="proposal-form"
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Oportunidad"
            error={form.formState.errors.opportunityId?.message}
          >
            <Select {...form.register('opportunityId')}>
              <option value="">Selecciona una oportunidad</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Código" error={form.formState.errors.code?.message}>
            <Input {...form.register('code')} />
          </Field>
          <Field label="Título" error={form.formState.errors.title?.message}>
            <Input {...form.register('title')} />
          </Field>
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <Select {...form.register('status')}>
              {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field
            label="Vigencia"
            error={form.formState.errors.validUntil?.message}
          >
            <Input type="date" {...form.register('validUntil')} />
          </Field>
        </div>

        <Field label="Notas" error={form.formState.errors.notes?.message}>
          <Textarea {...form.register('notes')} />
        </Field>

        <div className="rounded-[28px] border border-border bg-surface-muted p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">
                Items de propuesta
              </h4>
              <p className="text-sm text-muted">
                El total se calcula en línea con cantidad, precio y descuento.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                append({
                  productId: '',
                  quantity: 1,
                  unitPrice: 0,
                  discount: 0,
                })
              }
            >
              Agregar item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-3xl bg-white p-4 md:grid-cols-[2fr_0.8fr_1fr_1fr_auto]"
              >
                <Field
                  label="Producto"
                  error={
                    form.formState.errors.items?.[index]?.productId?.message
                  }
                >
                  <Select
                    {...form.register(`items.${index}.productId`)}
                    onChange={(event) => {
                      const product = products.find(
                        (item) => item.id === event.target.value,
                      );
                      form.setValue(
                        `items.${index}.productId`,
                        event.target.value,
                        { shouldValidate: true },
                      );
                      if (product) {
                        form.setValue(
                          `items.${index}.unitPrice`,
                          Number(product.unitPrice),
                          { shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Cantidad"
                  error={
                    form.formState.errors.items?.[index]?.quantity?.message
                  }
                >
                  <Input
                    type="number"
                    {...form.register(`items.${index}.quantity`)}
                  />
                </Field>
                <Field
                  label="Precio"
                  error={
                    form.formState.errors.items?.[index]?.unitPrice?.message
                  }
                >
                  <Input
                    type="number"
                    {...form.register(`items.${index}.unitPrice`)}
                  />
                </Field>
                <Field
                  label="Descuento"
                  error={
                    form.formState.errors.items?.[index]?.discount?.message
                  }
                >
                  <Input
                    type="number"
                    {...form.register(`items.${index}.discount`)}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => remove(index)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-primary-soft/70 px-5 py-4">
          <p className="text-sm text-primary-strong">Total estimado</p>
          <p className="mt-1 text-2xl font-semibold text-primary-strong">
            {formatCurrency(total)}
          </p>
        </div>
      </form>
    </Modal>
  );
}
