import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={twMerge('rounded-2xl border border-line bg-white shadow-soft', className)}>{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-ink">{children}</label>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
  <input ref={ref} {...props} className={twMerge('min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-slate-400 sm:text-[15px]', className)} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
  <textarea ref={ref} {...props} className={twMerge('min-h-24 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink placeholder:text-slate-400 sm:text-[15px]', className)} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', ...props }, ref) => (
  <select ref={ref} {...props} className={twMerge('min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink sm:text-[15px]', className)} />
));
Select.displayName = 'Select';

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={twMerge('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50', className)}>
      {children}
    </button>
  );
}

export { Pagination } from '@/components/pagination';
export { FluidTabs } from '@/components/fluid-tabs';
export { TimedUndoAction } from '@/components/timed-undo-action';
export { DiscreteTabs } from '@/components/discrete-tabs';
export { MorphingDiscoveryBar, type Category } from '@/components/morphing-discovery-bar';
export { Badge } from '@/components/base-ui/badge';
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/base-ui/tooltip';




