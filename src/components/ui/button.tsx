
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles =
      variant === 'destructive'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white';
    return (
      <button
        ref={ref}
        className={cn('px-4 py-2 rounded-xl font-medium transition', variantStyles, className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
