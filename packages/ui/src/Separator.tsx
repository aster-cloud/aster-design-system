/**
 * Separator — semantic divider line.
 *
 * Two orientations. Vertical requires the parent to have explicit
 * height. `decorative` (default true) sets role="presentation" so
 * screen readers don't announce a separator between every card
 * section.
 */
import * as React from 'react';
import { cn } from './utils.js';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'presentation' : 'separator'}
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';
