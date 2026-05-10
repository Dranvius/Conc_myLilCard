import * as React from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-strong',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-muted',
  ghost:
    'bg-transparent text-muted hover:bg-surface-muted hover:text-foreground',
  danger: 'bg-danger text-white hover:bg-red-700',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
