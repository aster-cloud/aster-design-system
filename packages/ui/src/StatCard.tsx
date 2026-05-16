/**
 * StatCard — single key metric block.
 *
 * One-line label, big number, optional delta, optional helper text.
 * Used on dashboard summaries (Executions this month, Active policies,
 * etc.). Token-driven so light/dark just works; the optional `tone`
 * lets a card carry status color when the number itself encodes a
 * health signal ("8 / 10 PII fields detected" might be warning).
 */
import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from './utils.js';

export type StatCardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

export interface StatCardProps {
  label: React.ReactNode;
  /** Main metric. Strings are auto-styled; pass JSX for richer formatting. */
  value: React.ReactNode;
  /** Optional small helper line under the value (e.g. "of 1,000 limit"). */
  hint?: React.ReactNode;
  /** Optional delta with direction; renders an inline trend arrow. */
  delta?: {
    direction: 'up' | 'down' | 'flat';
    label: React.ReactNode;
  };
  /** Optional leading icon — replaces the default circle on the right. */
  icon?: React.ReactNode;
  tone?: StatCardTone;
  className?: string;
}

const toneClasses: Record<StatCardTone, { value: string; iconBg: string }> = {
  neutral: { value: 'text-fg',     iconBg: 'bg-bg-muted text-fg-muted' },
  primary: { value: 'text-fg',     iconBg: 'bg-primary-subtle text-primary' },
  success: { value: 'text-success',iconBg: 'bg-success-subtle text-success' },
  warning: { value: 'text-warning',iconBg: 'bg-warning-subtle text-warning' },
  danger:  { value: 'text-danger', iconBg: 'bg-danger-subtle text-danger' },
};

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  tone = 'neutral',
  className,
}: StatCardProps) {
  const TrendIcon =
    delta?.direction === 'up'
      ? TrendingUp
      : delta?.direction === 'down'
        ? TrendingDown
        : Minus;
  const styles = toneClasses[tone];

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
            {label}
          </p>
          <p
            className={cn(
              'mt-1 font-display text-3xl font-semibold tabular-nums leading-tight',
              styles.value,
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
          {delta && (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                delta.direction === 'up' && 'text-success',
                delta.direction === 'down' && 'text-danger',
                delta.direction === 'flat' && 'text-fg-muted',
              )}
            >
              <TrendIcon aria-hidden className="size-3.5" />
              {delta.label}
            </p>
          )}
        </div>
        {icon && (
          <div
            aria-hidden
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              styles.iconBg,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
