import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-ink text-white shadow-xs hover:bg-slate-900',
  outline: 'border border-line bg-white text-ink shadow-xs hover:bg-slate-50',
  secondary: 'bg-mist text-ink hover:bg-slate-200/80',
  ghost: 'hover:bg-slate-100 hover:text-ink',
  link: 'text-leaf underline-offset-4 hover:underline p-0 h-auto',
  destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-700',
};

const sizeStyles: Record<string, string> = {
  default: 'min-h-11 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-xs rounded-lg',
  lg: 'min-h-12 px-6 text-base rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const classes = twMerge(
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 select-none',
      variantStyles[variant] || variantStyles.default,
      sizeStyles[size] || sizeStyles.default,
      className
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: twMerge(classes, (children.props as any).className),
        ref,
        ...props,
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
