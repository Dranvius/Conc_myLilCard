import { titleize } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  LEAD: 'bg-sky-100 text-sky-700',
  INACTIVE: 'bg-slate-200 text-slate-700',
  ARCHIVED: 'bg-slate-200 text-slate-600',
  WON: 'bg-emerald-100 text-emerald-700',
  LOST: 'bg-rose-100 text-rose-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  PROPOSAL_SENT: 'bg-cyan-100 text-cyan-700',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-indigo-100 text-indigo-700',
  NEW: 'bg-slate-100 text-slate-700',
  SENT: 'bg-cyan-100 text-cyan-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-slate-200 text-slate-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  OPEN: 'bg-sky-100 text-sky-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-cyan-100 text-cyan-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        statusStyles[value] ?? 'bg-slate-100 text-slate-700',
      )}
    >
      {titleize(value)}
    </span>
  );
}
