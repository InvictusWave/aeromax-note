import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const badgeVariants: Record<string, string> = {
  default: 'border-transparent bg-ink text-white shadow-xs',
  secondary: 'border-transparent bg-mist text-slate-700',
  destructive: 'border-transparent bg-red-500/10 text-red-700',
  outline: 'border-line text-ink',
  success: 'border-emerald-500/20 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-500/20 bg-amber-50 text-amber-800',
};

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={twMerge(
        'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  );
}

export default Badge;
