import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className="absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-70 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">{label}</p>
          <ArrowUpRight className="h-4 w-4 text-muted" />
        </div>
        <p className="mt-6 text-3xl font-semibold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
