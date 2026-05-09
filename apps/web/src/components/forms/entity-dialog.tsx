'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { type DefaultValues, type FieldValues, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface DialogField {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'email'
    | 'number'
    | 'textarea'
    | 'select'
    | 'date'
    | 'password';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export function EntityDialog({
  open,
  title,
  description,
  schema,
  fields,
  defaultValues,
  submitLabel,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  schema: z.ZodTypeAny;
  fields: DialogField[];
  defaultValues: DefaultValues<FieldValues>;
  submitLabel: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<unknown>;
}) {
  const form = useForm<FieldValues>({
    resolver: zodResolver(schema as any) as any,
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, open]);

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="entity-dialog-form" disabled={loading}>
            {loading ? 'Guardando...' : submitLabel}
          </Button>
        </>
      }
    >
      <form
        id="entity-dialog-form"
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
          form.reset(defaultValues);
        })}
      >
        {fields.map((field) => {
          const error = form.formState.errors[field.name]?.message as
            | string
            | undefined;
          const commonProps = form.register(field.name);

          if (field.type === 'textarea') {
            return (
              <div key={field.name as string} className="md:col-span-2">
                <Field label={field.label} error={error}>
                  <Textarea placeholder={field.placeholder} {...commonProps} />
                </Field>
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <Field
                key={field.name as string}
                label={field.label}
                error={error}
              >
                <Select {...commonProps}>
                  <option value="">Selecciona una opción</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          }

          return (
            <Field key={field.name as string} label={field.label} error={error}>
              <Input
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                {...commonProps}
              />
            </Field>
          );
        })}
      </form>
    </Modal>
  );
}
