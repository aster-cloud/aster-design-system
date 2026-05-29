/**
 * Alert — banner-style status communication.
 *
 * Use cases:
 *   - info     "Your policy is in draft" — explanatory, non-blocking
 *   - success  "Saved." — confirmation after an action
 *   - warning  "Trial ends in 3 days" — needs attention, doesn't block
 *   - danger   "Could not save. Check your input." — error feedback
 *
 * Why this is separate from Toast: Alerts are *layout* elements that
 * persist as part of the page. Toasts are *transient overlays* that
 * float in/out. Don't reach for an Alert when a Toast is right.
 *
 * Composition: AlertTitle + AlertDescription so the icon/color/layout
 * stays consistent across pages and only the words change.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from './utils.js';

const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'flex gap-3',
    'font-sans text-sm',
  ].join(' '),
  {
    variants: {
      /*
       * Each variant rides the token chain so light/dark swaps stay
       * tied to one source of truth (packages/tokens/src/tokens.css):
       *   bg-{tone}-subtle  → light: tone-50 | dark: alpha tint of tone-500
       *   text-{tone}       → light: tone-700 | dark: tone-500
       * Both pairings clear WCAG AA in either theme. The border step
       * uses raw ramp classes (sky-200, emerald-200, ...) with explicit
       * dark: overrides because Tailwind's opacity modifier (`/30`) does
       * not apply to semantic tokens routed through CSS variables.
       *
       * R30+ audit P2 follow-up: long-term move is to add
       * --border-info-subtle / --border-success-subtle etc. tokens in
       * tokens.css so this whole block can become
       *   border-border-info-subtle dark:border-border-info-subtle
       * Tracked as R31 nice-to-have. Current raw-ramp form is the only
       * working pattern until the token surface grows.
       */
      variant: {
        info:    'border-sky-200 bg-accent-subtle text-accent dark:border-sky-900/50',
        success: 'border-emerald-200 bg-success-subtle text-success dark:border-emerald-900/50',
        warning: 'border-amber-200 bg-warning-subtle text-warning dark:border-amber-900/50',
        danger:  'border-rose-200 bg-danger-subtle text-danger dark:border-rose-900/50',
      },
    },
    defaultVariants: { variant: 'info' },
  }
);

const iconMap = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger:  XCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Hide the default leading icon — rare, useful for compact rows. */
  hideIcon?: boolean;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', hideIcon, children, ...props }, ref) => {
    const Icon = iconMap[variant ?? 'info'];
    return (
      <div
        ref={ref}
        role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {!hideIcon && <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />}
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-snug tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm leading-relaxed [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';
