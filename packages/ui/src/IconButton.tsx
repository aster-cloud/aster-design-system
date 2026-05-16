/**
 * IconButton — square icon-only button.
 *
 * Why this is separate from Button:
 *   - Icon-only buttons MUST have an aria-label; the type system enforces
 *     it here instead of relying on per-call discipline.
 *   - Square footprint that follows touch-target guidance: sm=32, md=40
 *     (minimum recommended for desktop), lg=44 (mobile minimum).
 *   - Same variant palette as Button so a "ghost" icon button matches a
 *     "ghost" text button visually.
 *
 * Use a real Button (with label + icon prop) when the icon is decorative;
 * use IconButton when the icon IS the affordance.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-md',
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:shadow-ring',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
        secondary: 'bg-zinc-200 text-zinc-900 border border-border-strong hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        ghost: 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
        outline: 'border border-border text-fg hover:bg-bg-subtle',
        destructive: 'bg-danger text-danger-fg hover:bg-rose-700 shadow-sm',
      },
      size: {
        sm: 'size-8 [&_svg]:size-3.5',
        md: 'size-10 [&_svg]:size-4',
        lg: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Required — icon-only controls must have an accessible name. */
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
