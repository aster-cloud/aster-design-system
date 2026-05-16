/**
 * Skeleton — content-shape placeholder while data loads.
 *
 * One animation, one color (bg-muted in light, zinc-800 in dark).
 * All variation comes from consumer sizing utilities. Pulse instead
 * of shimmer keeps it GPU-cheap when 20+ skeletons stack.
 */
import * as React from 'react';
import { cn } from './utils.js';

export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'animate-pulse rounded-md bg-bg-muted dark:bg-zinc-800',
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';
