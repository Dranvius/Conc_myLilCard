import { titleize } from '@/lib/format';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  P0: 'bg-rose-100 text-rose-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-amber-100 text-amber-700',
  P3: 'bg-sky-100 text-sky-700',
  P4: 'bg-slate-100 text-slate-700',
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
  WEB_FORM: 'bg-sky-100 text-sky-700',
  REFERRAL: 'bg-emerald-100 text-emerald-700',
  CONGRESS: 'bg-indigo-100 text-indigo-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  SOCIAL_MEDIA: 'bg-cyan-100 text-cyan-700',
  PHONE: 'bg-blue-100 text-blue-700',
  COLD_CALL: 'bg-slate-100 text-slate-700',
  OTHER: 'bg-stone-100 text-stone-700',
  PLANNED: 'bg-sky-100 text-sky-700',
  STALE_WARNING: 'bg-amber-100 text-amber-700',
  STALE_CRITICAL: 'bg-rose-100 text-rose-700',
  TODAY: 'bg-amber-100 text-amber-700',
  UPCOMING: 'bg-sky-100 text-sky-700',
  NO_NEXT_ACTIVITY: 'bg-slate-200 text-slate-700',
  NO_RECENT_CONTACT: 'bg-orange-100 text-orange-700',
  NO_RESPONSE: 'bg-rose-100 text-rose-700',
  STALE: 'bg-rose-100 text-rose-700',
  NEW_LEAD: 'bg-indigo-100 text-indigo-700',
  ON_TRACK: 'bg-emerald-100 text-emerald-700',
};

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        statusStyles[value] ?? 'bg-slate-100 text-slate-700',
      )}
    >
      {label ?? titleize(value)}
    </span>
  );
}
