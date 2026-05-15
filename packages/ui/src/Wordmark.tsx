/**
 * Aster wordmark — text-based logo set in Fraunces.
 *
 * Why text + Fraunces:
 *   You picked "wordmark" over a graphic logomark in the brand brief.
 *   Fraunces is a variable serif with adjustable optical size and "soft"
 *   axes, so we can render the wordmark with sharp terminals (soft=0) at
 *   small sizes for crispness, and softer terminals at large sizes for
 *   editorial warmth.
 *
 *   Letter-spacing is set tighter than display headings (-0.04em) so the
 *   wordmark reads as a *unit*, not running prose. This is the standard
 *   wordmark trick (think Stripe, Notion, Linear).
 *
 * Variants:
 *   - default   "Aster"
 *   - product   "Aster <span>cloud</span>" — for aster-cloud headers
 *   - dev       "Aster <span>lang</span>"  — for aster-lang-dev headers
 *
 * Sizes follow display scale (sm/md/lg/xl). The product/dev suffix renders
 * in JetBrains Mono at a slightly smaller size for textural contrast — the
 * suffix says "this is the developer/product surface" without needing a
 * separate logomark per property.
 */
import * as React from 'react';
import { cn } from './utils.js';

type WordmarkVariant = 'default' | 'product' | 'dev';
type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: WordmarkVariant;
  size?: WordmarkSize;
  /** ARIA label override; defaults derive from variant. */
  label?: string;
}

const sizeClasses: Record<WordmarkSize, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
};

const suffixSizeClasses: Record<WordmarkSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

export const Wordmark: React.FC<WordmarkProps> = ({
  variant = 'default',
  size = 'md',
  label,
  className,
  ...props
}) => {
  const suffix = variant === 'product' ? 'cloud' : variant === 'dev' ? 'lang' : null;
  const a11y =
    label ??
    (variant === 'product' ? 'Aster Cloud' : variant === 'dev' ? 'Aster Lang' : 'Aster');

  return (
    <span
      aria-label={a11y}
      role="img"
      className={cn('inline-flex items-baseline gap-1.5 select-none', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'font-display font-semibold tracking-tightest text-fg',
          sizeClasses[size]
        )}
      >
        Aster
      </span>
      {suffix && (
        <span
          aria-hidden="true"
          className={cn(
            'font-mono font-normal tracking-tight text-primary',
            suffixSizeClasses[size]
          )}
        >
          {suffix}
        </span>
      )}
    </span>
  );
};
Wordmark.displayName = 'Wordmark';
