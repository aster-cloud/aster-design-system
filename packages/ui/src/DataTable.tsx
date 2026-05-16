/**
 * DataTable — opinionated table wrapper.
 *
 * The dashboard's hand-rolled tables broke on mobile (overflow-hidden
 * cuts off columns, no caption, missing aria-busy on loading). This
 * primitive bakes in:
 *
 *   - overflow-x-auto wrapper so rows scroll horizontally on narrow
 *     viewports rather than truncating
 *   - aria-busy when loading=true
 *   - explicit empty + loading slots (callers don't need to special-
 *     case the body)
 *   - subtle row striping + token borders
 *
 * The component is generic over row type. Columns declare the cell
 * renderer + optional header (string) + an optional className for
 * column-specific alignment.
 *
 * Why not a full sortable / paginated / filterable table:
 *   Sorting is rarely needed in dashboards where the upstream API
 *   already orders by recency / status. Pagination lives outside this
 *   primitive — pass already-paginated `rows`. Filtering is
 *   ListSearchInput's job.
 */
import * as React from 'react';
import { cn } from './utils.js';

export interface DataTableColumn<Row> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Receives the full row + index. */
  cell: (row: Row, index: number) => React.ReactNode;
  /** Tailwind class for the <th> + <td> in this column (e.g. text-right). */
  className?: string;
  /** Visually hides the header (still readable by SR). */
  srHeader?: boolean;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** Optional row id extractor for React key — defaults to index. */
  getRowKey?: (row: Row, index: number) => string | number;
  loading?: boolean;
  /** Rendered in the body when rows.length === 0 (and not loading). */
  emptyState?: React.ReactNode;
  /** Optional row click handler → makes the row keyboard-actionable. */
  onRowClick?: (row: Row, index: number) => void;
  className?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey = (_, i) => i,
  loading = false,
  emptyState,
  onRowClick,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border bg-bg shadow-sm',
        className,
      )}
    >
      <table
        aria-busy={loading || undefined}
        className="min-w-full divide-y divide-border"
      >
        <thead className="bg-bg-subtle">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted',
                  col.className,
                )}
              >
                {col.srHeader ? (
                  <span className="sr-only">{col.header}</span>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading && rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-fg-muted"
              >
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState ?? (
                  <div className="px-4 py-8 text-center text-sm text-fg-muted">
                    No data
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row, i);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'bg-bg',
                  onRowClick && 'cursor-pointer hover:bg-bg-subtle focus-visible:outline-none focus-visible:bg-bg-subtle',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-fg',
                      col.className,
                    )}
                  >
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
