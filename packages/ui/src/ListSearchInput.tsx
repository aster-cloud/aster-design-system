/**
 * ListSearchInput — compact inline list-filter input.
 *
 * Distinct from a global search / command palette: this filters the
 * current dataset in place (rows of a list page). Leading search
 * icon + trailing clear button; the clear button only renders when
 * there's text so the idle state stays minimal.
 */
'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './utils.js';

export interface ListSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** ARIA label for screen readers — defaults to placeholder. */
  ariaLabel?: string;
  className?: string;
}

export function ListSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: ListSearchInputProps) {
  return (
    <div
      className={cn(
        'relative inline-flex w-full max-w-sm items-center',
        className,
      )}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 size-4 text-fg-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? 'Search'}
        className={cn(
          'w-full rounded-md border border-border bg-bg pl-9 pr-9 py-2',
          'text-sm text-fg placeholder:text-fg-subtle',
          'transition-colors duration-fast',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-ring',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className={cn(
            'absolute right-2 inline-flex size-6 items-center justify-center rounded',
            'text-fg-muted hover:text-fg hover:bg-bg-subtle',
            'focus-visible:outline-none focus-visible:shadow-ring',
          )}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
