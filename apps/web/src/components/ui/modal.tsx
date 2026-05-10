'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && mounted) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-full flex flex-col pointer-events-none">
        <Card className="flex flex-col shadow-2xl overflow-hidden pointer-events-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]">
          <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-border/40 shrink-0 bg-surface z-10">
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

          <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 bg-surface">
            {children}
          </div>

          {footer ? (
            <div className="p-6 pt-4 flex justify-end gap-3 border-t border-border/40 shrink-0 bg-surface z-10">
              {footer}
            </div>
          ) : null}
        </Card>
      </div>
    </div>,
    document.body
  );
}