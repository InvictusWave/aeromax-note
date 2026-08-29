import * as React from 'react';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className = '', ...props }, ref) => <label ref={ref} className={`block text-sm font-medium text-ink ${className}`} {...props} />);
Label.displayName = 'Label';
