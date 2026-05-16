/**
 * Spinner — inline loading indicator.
 *
 * Pure SVG, no JS animation library. Three sizes line up with Button
 * heights so a Spinner inside a button fits the same baseline.
 *
 * Use cases:
 *   - Inside a button while a mutation is in flight
 *   - Centered in a card while content is loading (when Skeleton is
 *     too verbose, e.g. small inline widgets)
 *   - As the spinning leading icon on a toast
 */
import * as React from 'react';
import { cn } from './utils.js';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-8',
};

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  label?: string;
}

export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
  ...props
}: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin text-current', sizeClasses[size], className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
