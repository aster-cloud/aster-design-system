/**
 * PageHeader — the title block at the top of a dashboard page.
 *
 * Solves the "6 different h1 styles across the dashboard" inconsistency
 * problem by collapsing them into one primitive. Always renders:
 *
 *   - title    Fraunces 3xl semi-bold tracking-tight  (semantic h1)
 *   - subtitle text-sm fg-muted, optional
 *   - action   right-aligned slot for the primary CTA (New Policy, etc.)
 *   - breadcrumbs slot above the title (pass <Breadcrumbs /> directly)
 *
 * On mobile (<sm) the action slides under the title rather than crowding
 * the row. The composition makes "page with just title" trivial and
 * "page with breadcrumb + title + action" still one component call.
 */
import * as React from 'react';
import { cn } from './utils.js';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Renders to the right of the title on sm+, beneath on mobile. */
  action?: React.ReactNode;
  /** Renders above the title — pass a <Breadcrumbs /> here. */
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      {breadcrumbs}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
