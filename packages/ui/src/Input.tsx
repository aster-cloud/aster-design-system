/**
 * Input — text/number/email/password field.
 *
 * Heights aligned with Button so a label+input+button row sits on
 * the same baseline grid: sm=32, md=40, lg=48 px.
 *
 * Focus ring: shadow-ring is a brand-tinted token (violet @ 35%),
 * so the keyboard-focus outline lands on-brand without us repeating
 * the color.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const inputVariants = cva(
  [
    'flex w-full rounded-md border bg-bg text-fg',
    'placeholder:text-fg-subtle',
    'font-sans',
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-ring',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-muted',
    'file:border-0 file:bg-transparent file:font-medium file:text-fg',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: 'border-border',
        invalid: 'border-danger focus-visible:border-danger focus-visible:shadow-ring-danger',
      },
    },
    defaultVariants: { size: 'md', state: 'default' },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ size, state }), className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';
