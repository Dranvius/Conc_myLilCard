'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CaptchaField } from '@/components/auth/captcha-field';
import { PotentialDuplicateModal } from '@/components/forms/potential-duplicate-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api-client';
import { formatLeadSource, leadSourceOptions } from '@/lib/crm';
import {
  getPotentialDuplicates,
  isPotentialDuplicateError,
} from '@/lib/duplicates';
import type { BusinessUnit, PotentialDuplicate } from '@/lib/types';

const leadSchema = z.object({
  businessUnitId: z.string().min(1, 'Selecciona una unidad de negocio'),
  companyName: z.string().min(2, 'Ingresa el nombre de la empresa'),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  firstName: z.string().min(1, 'Ingresa el nombre'),
  lastName: z.string().min(1, 'Ingresa el apellido'),
  position: z.string().optional(),
  email: z.string().email('Ingresa un correo valido'),
  phone: z.string().optional(),
  title: z.string().min(2, 'Describe brevemente la oportunidad'),
  message: z.string().optional(),
  source: z.string().optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
  captchaToken: z.string().min(1, 'Completa la verificacion'),
});

type LeadFormValues = z.infer<typeof leadSchema>;
type LeadFormInput = z.input<typeof leadSchema>;

export default function PublicLeadPage() {
  const [submitted, setSubmitted] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    PotentialDuplicate[]
  >([]);
  const [pendingValues, setPendingValues] = useState<LeadFormValues | null>(
    null,
  );
  const form = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      businessUnitId: '',
      companyName: '',
      legalName: '',
      taxId: '',
      city: '',
      country: 'Colombia',
      firstName: '',
      lastName: '',
      position: '',
      email: '',
      phone: '',
      title: '',
      message: '',
      source: 'WEB_FORM',
      estimatedValue: undefined,
      captchaToken: '',
    },
  });

  const { data: businessUnits = [], isLoading } = useQuery({
    queryKey: ['public-business-units'],
    queryFn: () =>
      apiRequest<BusinessUnit[]>('/public/business-units', { skipRetry: true }),
  });

  const mutation = useMutation({
    mutationFn: (values: LeadFormValues) =>
      apiRequest('/public/leads', {
        method: 'POST',
        body: JSON.stringify(values),
        skipRetry: true,
      }),
    onSuccess: () => {
      setSubmitted(true);
      form.reset({
        businessUnitId: '',
        companyName: '',
        legalName: '',
        taxId: '',
        city: '',
        country: 'Colombia',
        firstName: '',
        lastName: '',
        position: '',
        email: '',
        phone: '',
        title: '',
        message: '',
        source: 'WEB_FORM',
        estimatedValue: undefined,
        captchaToken: '',
      });
      setDuplicateCandidates([]);
      setPendingValues(null);
    },
    onError: (error, values) => {
      if (isPotentialDuplicateError(error)) {
        setPendingValues(values);
        setDuplicateCandidates(getPotentialDuplicates(error));
      }
    },
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Captura externa
          </p>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Solicita asesoria comercial con RespiraCRM
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted">
              Registra tu necesidad y el sistema asignara automaticamente un
              responsable comercial para dar seguimiento a la oportunidad.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground">
                Flujo habilitado
              </p>
              <p className="mt-2 text-sm text-muted">
                Captura externa, clasificacion inicial, asignacion automatica y
                seguimiento programado.
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground">
                Respuesta comercial
              </p>
              <p className="mt-2 text-sm text-muted">
                Un ejecutivo recibe el lead y se agenda una tarea de contacto
                para el siguiente dia habil.
              </p>
            </Card>
          </div>
          <p className="text-sm text-muted">
            ¿Ya tienes acceso interno?{' '}
            <Link href="/login" className="font-semibold text-primary">
              Inicia sesion
            </Link>
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {submitted ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                Lead registrado correctamente
              </h2>
              <p className="text-sm text-muted">
                El equipo comercial de RespiraCRM ya tiene la oportunidad en
                seguimiento.
              </p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="secondary"
                className="w-full"
              >
                Registrar otro lead
              </Button>
            </div>
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit(async (values) =>
                mutation.mutateAsync(values),
              )}
            >
              <div className="md:col-span-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Formulario de lead
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Completa los datos minimos para crear empresa, contacto y
                  oportunidad en RespiraCRM.
                </p>
              </div>

              <Field
                label="Unidad de negocio"
                error={form.formState.errors.businessUnitId?.message}
              >
                <Select
                  {...form.register('businessUnitId')}
                  disabled={isLoading}
                >
                  <option value="">Selecciona una unidad</option>
                  {businessUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Origen"
                error={form.formState.errors.source?.message}
              >
                <Select {...form.register('source')}>
                  {leadSourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {formatLeadSource(source)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Empresa"
                error={form.formState.errors.companyName?.message}
              >
                <Input {...form.register('companyName')} />
              </Field>

              <Field
                label="Razon social"
                error={form.formState.errors.legalName?.message}
              >
                <Input {...form.register('legalName')} />
              </Field>

              <Field
                label="NIT / Tax ID"
                error={form.formState.errors.taxId?.message}
              >
                <Input {...form.register('taxId')} />
              </Field>

              <Field label="Ciudad" error={form.formState.errors.city?.message}>
                <Input {...form.register('city')} />
              </Field>

              <Field
                label="Pais"
                error={form.formState.errors.country?.message}
              >
                <Input {...form.register('country')} />
              </Field>

              <Field
                label="Valor estimado"
                error={form.formState.errors.estimatedValue?.message}
              >
                <Input type="number" {...form.register('estimatedValue')} />
              </Field>

              <Field
                label="Nombre"
                error={form.formState.errors.firstName?.message}
              >
                <Input {...form.register('firstName')} />
              </Field>

              <Field
                label="Apellido"
                error={form.formState.errors.lastName?.message}
              >
                <Input {...form.register('lastName')} />
              </Field>

              <Field
                label="Cargo"
                error={form.formState.errors.position?.message}
              >
                <Input {...form.register('position')} />
              </Field>

              <Field
                label="Telefono"
                error={form.formState.errors.phone?.message}
              >
                <Input {...form.register('phone')} />
              </Field>

              <Field
                label="Correo"
                error={form.formState.errors.email?.message}
              >
                <Input type="email" {...form.register('email')} />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Oportunidad"
                  error={form.formState.errors.title?.message}
                >
                  <Input
                    {...form.register('title')}
                    placeholder="Ej. Renovacion de equipos respiratorios"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Mensaje"
                  error={form.formState.errors.message?.message}
                >
                  <Textarea
                    {...form.register('message')}
                    placeholder="Describe brevemente la necesidad comercial o tecnica"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <CaptchaField
                  value={form.watch('captchaToken')}
                  error={form.formState.errors.captchaToken?.message}
                  onChange={(value) =>
                    form.setValue('captchaToken', value, {
                      shouldValidate: true,
                    })
                  }
                />
              </div>

              {mutation.error ? (
                <p className="md:col-span-2 text-sm text-danger">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : 'No fue posible registrar el lead'}
                </p>
              ) : null}

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Registrando...' : 'Enviar lead'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
      <PotentialDuplicateModal
        open={duplicateCandidates.length > 0}
        duplicates={duplicateCandidates}
        title="Ya existe un lead o cuenta similar"
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
          } as LeadFormValues);
        }}
      />
    </main>
  );
}
