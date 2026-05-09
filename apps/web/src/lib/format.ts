import { format } from 'date-fns';

export function formatCurrency(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'Sin fecha';
  return format(new Date(value), 'dd/MM/yyyy');
}

export function titleize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}
