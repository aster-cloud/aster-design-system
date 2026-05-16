/**
 * Select — native <select> dropdown, styled to match Input.
 *
 * Native instead of a Radix/Headless combobox because 90% of selects
 * are short (≤ 10 options). Native gets iOS/Android wheel pickers
 * for free, full keyboard nav, and zero runtime JS.
 *
 * Heights match Input so a side-by-side label+input+select row
 * stays baseline-aligned.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { cn } from './utils.js';

const selectVariants = cva(
  [
    'flex w-full appearance-none rounded-md border bg-bg pr-9 text-fg',
    'font-sans',
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-ring',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-muted',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 pl-2.5 text-xs',
        md: 'h-10 pl-3 text-sm',
        lg: 'h-12 pl-4 text-base',
      },
      state: {
        default: 'border-border',
        invalid: 'border-danger focus-visible:border-danger',
      },
    },
    defaultVariants: { size: 'md', state: 'default' },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, state, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(selectVariants({ size, state }), className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
);
Select.displayName = 'Select';
