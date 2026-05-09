import type { ReactNode } from 'react';
import { Card } from './card';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted">{description}</p>
      </div>
      {action}
    </Card>
  );
}
