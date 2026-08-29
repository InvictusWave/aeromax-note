import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', children, ...props }, ref) => <div className="relative"><select ref={ref} {...props} className={twMerge('min-h-11 w-full appearance-none rounded-xl border border-line bg-white px-3.5 pr-10 text-base text-ink shadow-sm transition-all focus:border-leaf focus:ring-2 focus:ring-leaf/10 sm:text-[15px]', className)}>{children}</select><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌄</span></div>);
NativeSelect.displayName = 'NativeSelect';
