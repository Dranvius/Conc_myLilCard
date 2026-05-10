import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-border/80 bg-surface shadow-[var(--shadow)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}
