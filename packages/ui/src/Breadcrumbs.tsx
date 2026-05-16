/**
 * Breadcrumbs primitive.
 *
 * Used at the top of dashboard sub-pages so users can step back one
 * level without diving into the browser's history.
 *
 * Routing decoupling:
 *   The design-system package can't depend on any consumer's routing
 *   library (Next.js Link, react-router Link, etc.). Pass `linkComponent`
 *   to render intermediate items with whichever Link your app uses; if
 *   omitted, falls back to plain <a href>. The final item is always
 *   rendered as plain text (current page).
 *
 * a11y: rendered as <nav aria-label="Breadcrumb"> with an inner <ol> so
 * screen readers announce trail order. The current page uses
 * aria-current="page".
 */
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './utils.js';

export interface BreadcrumbItem {
  label: string;
  /** Omit on the final/current item; the row will render plain text. */
  href?: string;
}

/** Subset of anchor props that any framework's Link should accept. */
export type BreadcrumbLinkComponent = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  /** Routing-aware link component. Falls back to <a> if omitted. */
  linkComponent?: BreadcrumbLinkComponent;
  className?: string;
}

const DefaultAnchor: BreadcrumbLinkComponent = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function Breadcrumbs({
  items,
  linkComponent: LinkComponent = DefaultAnchor,
  className,
}: BreadcrumbsProps) {
  // Filter accidental empty items so server-side props that conditionally
  // include intermediate crumbs don't render dangling chevrons.
  const cleaned = items.filter((i) => i.label);
  if (cleaned.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {cleaned.map((item, i) => {
          const isLast = i === cleaned.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-fg-subtle"
                  aria-hidden
                />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'truncate',
                    isLast ? 'font-medium text-fg' : 'text-fg-muted',
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <LinkComponent
                  href={item.href}
                  className="truncate text-fg-muted transition-colors hover:text-fg"
                >
                  {item.label}
                </LinkComponent>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
