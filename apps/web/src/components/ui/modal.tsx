'use client';

import type { ReactNode } from 'react';
import { Button } from './button';
import { Card } from './card';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 pb-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="px-6 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="p-6 pt-4 flex justify-end gap-3 shrink-0">{footer}</div>
        ) : null}
      </Card>
    </div>
  );
}
