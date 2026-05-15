/**
 * Aster Button — the first real component test of the token system.
 *
 * Variants:
 *   - primary    violet 600 fill, white text — the default CTA
 *   - secondary  zinc 100 fill, zinc 900 text — neutral action
 *   - ghost      transparent fill, hover surface — toolbar / nav
 *   - outline    border-only, primary text — secondary on light surfaces
 *   - accent     sky 500 fill — AI/live actions (rare; reserve for streaming/AI panel)
 *   - destructive rose 600 fill — delete / revoke
 *
 * Sizes:
 *   - sm  h-8 / px-3 / text-xs (compact toolbars)
 *   - md  h-10 / px-4 / text-sm (default)
 *   - lg  h-12 / px-6 / text-base (marketing hero CTAs)
 *
 * Implementation notes:
 *   - Built with cva so variant×size combinations are exhaustive at the
 *     type level — consumers can't accidentally request "destructive-xs".
 *   - Uses Tailwind utilities that resolve through @aster/tokens' preset
 *     (`bg-primary`, `text-primary-fg`, etc.). The component is therefore
 *     unstyled without the preset wired up — that's by design: the preset
 *     IS the contract.
 *   - Focus rings use `shadow-ring` (token: 0 0 0 3px violet/35%) instead
 *     of Tailwind's `ring-*` so the ring color stays in sync with brand
 *     even when consumers customize ring offset.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans font-medium',
    'rounded-lg',
    'transition-colors duration-fast ease-standard',
    'focus-visible:outline-none focus-visible:shadow-ring',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-primary-fg',
          'hover:bg-primary-hover',
          'active:bg-primary-active',
          'shadow-sm hover:shadow-brand',
        ].join(' '),
        secondary: [
          'bg-zinc-100 text-zinc-900',
          'hover:bg-zinc-200 active:bg-zinc-300',
          'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        ].join(' '),
        ghost: [
          'bg-transparent text-fg',
          'hover:bg-bg-muted',
        ].join(' '),
        outline: [
          'bg-transparent text-primary border border-border',
          'hover:bg-primary-subtle hover:border-primary',
        ].join(' '),
        accent: [
          'bg-accent text-accent-fg',
          'hover:bg-accent-hover',
          'shadow-sm',
        ].join(' '),
        destructive: [
          'bg-danger text-danger-fg',
          'hover:bg-rose-700 active:bg-rose-800',
          'shadow-sm',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
