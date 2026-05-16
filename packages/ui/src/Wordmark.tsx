/**
 * Aster wordmark — text-based logo set in Fraunces.
 *
 * Why text + Fraunces:
 *   Fraunces is a variable serif with adjustable optical size and "soft"
 *   axes — sharp terminals at small sizes for crispness, softer at large
 *   sizes for editorial warmth. Letter-spacing is set tighter than
 *   display headings (-0.04em) so the wordmark reads as a *unit*
 *   (Stripe / Notion / Linear convention).
 *
 * Variants:
 *   - default   "Aster"
 *   - product   "Aster cloud" — for aster-cloud headers
 *   - dev       "Aster lang"  — for aster-lang-dev headers
 *
 * Tones:
 *   - auto      (default) primary text uses --color-fg (near-black on
 *               light, near-white on dark), suffix uses --color-primary.
 *               Picks up theme via token cascade — correct on bg-bg /
 *               bg-bg-subtle / bg-bg-muted surfaces.
 *   - inverted  "Aster" forces white, suffix forces violet-300. Designed
 *               for dark surfaces that don't switch with theme — e.g.
 *               marketing footers, hero overlays, the dunning banner.
 *               Prevents the "auto" cascade from resolving fg=black on
 *               a hand-painted dark surface.
 */
import * as React from 'react';
import { cn } from './utils.js';

type WordmarkVariant = 'default' | 'product' | 'dev';
type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';
type WordmarkTone = 'auto' | 'inverted';

export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: WordmarkVariant;
  size?: WordmarkSize;
  tone?: WordmarkTone;
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
  tone = 'auto',
  label,
  className,
  ...props
}) => {
  const suffix = variant === 'product' ? 'cloud' : variant === 'dev' ? 'lang' : null;
  const a11y =
    label ??
    (variant === 'product' ? 'Aster Cloud' : variant === 'dev' ? 'Aster Lang' : 'Aster');

  const mainTone = tone === 'inverted' ? 'text-white' : 'text-fg';
  // violet-300 carries enough brightness on a true-dark surface to read
  // distinctly without losing brand recognition.
  const suffixTone = tone === 'inverted' ? 'text-violet-300' : 'text-primary';

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
          'font-display font-semibold tracking-tightest',
          mainTone,
          sizeClasses[size]
        )}
      >
        Aster
      </span>
      {suffix && (
        <span
          aria-hidden="true"
          className={cn(
            'font-mono font-normal tracking-tight',
            suffixTone,
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
