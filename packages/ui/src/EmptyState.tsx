/**
 * EmptyState — "nothing here yet" placeholder for list / collection pages.
 *
 * Replaces the per-page hand-drawn SVG + ad-hoc "No items" copy. One
 * primitive, one visual rhythm, optional action so the empty state
 * doubles as the first onboarding nudge ("Create your first policy").
 *
 * Composition:
 *   <EmptyState
 *     icon={<FileText />}
 *     title="No policies yet"
 *     description="Create your first policy to start automating decisions."
 *     action={<Button>Create policy</Button>}
 *   />
 */
import * as React from 'react';
import { cn } from './utils.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-bg-subtle px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-bg text-fg-muted">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
