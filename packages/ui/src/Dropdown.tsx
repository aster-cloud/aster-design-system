/**
 * Dropdown — click-to-open disclosure popover attached to a trigger.
 *
 * Used for user menus, row actions ("⋯" in tables), and per-card
 * action overflows. Stays purposefully small (no Radix popper, no
 * nested submenus) — when we need a full combobox / autocomplete,
 * that's a separate primitive.
 *
 * Accessibility — this is an *honest disclosure*, not an ARIA `menu`.
 * We deliberately do NOT set `role="menu"` / `role="menuitem"`, because
 * the WAI-ARIA APG menu pattern mandates roving-tabindex arrow-key
 * navigation, focus-into-menu-on-open, and focus-restore-on-close.
 * Claiming the role without that behavior misleads screen-reader users
 * (they hear "menu", press arrows, and nothing happens). Instead the
 * trigger is a disclosure button (`aria-expanded`) and the items are
 * plain buttons reachable via the natural tab order.
 *
 * Behavior:
 *   - Click the trigger to toggle open/closed
 *   - Click outside to close (mousedown listener so it fires before the
 *     trigger's onClick on the next render)
 *   - Esc to close, returning focus to the trigger
 *   - Selecting an item closes the popover and returns focus to the trigger
 *
 * Composition:
 *   <Dropdown trigger={<IconButton aria-label="Actions"><Ellipsis /></IconButton>}>
 *     <DropdownItem onSelect={...}>Edit</DropdownItem>
 *     <DropdownSeparator />
 *     <DropdownItem onSelect={...} variant="danger">Delete</DropdownItem>
 *   </Dropdown>
 */
'use client';

import * as React from 'react';
import { cn } from './utils.js';

export interface DropdownProps {
  trigger: React.ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    'aria-expanded'?: boolean;
  }>;
  children: React.ReactNode;
  /** Default 'right'; flip to 'left' near right edge. */
  align?: 'left' | 'right';
  className?: string;
}

interface DropdownContextValue {
  close: () => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  /** Move focus back to the trigger button (the element we tagged with
   *  aria-expanded). Used when the user dismisses via keyboard or by
   *  selecting an item — not on outside-click, where stealing focus
   *  would be surprising. */
  const focusTrigger = React.useCallback(() => {
    wrapperRef.current
      ?.querySelector<HTMLElement>('[aria-expanded]')
      ?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        focusTrigger();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, focusTrigger]);

  const triggerEl = React.cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      trigger.props.onClick?.(e);
      setOpen((v) => !v);
    },
    'aria-expanded': open,
  });

  const close = React.useCallback(() => {
    setOpen(false);
    focusTrigger();
  }, [focusTrigger]);

  return (
    <div ref={wrapperRef} className="relative inline-block">
      {triggerEl}
      {open && (
        <DropdownContext.Provider value={{ close }}>
          <div
            className={cn(
              'absolute z-50 mt-2 w-48 rounded-md border border-border bg-bg py-1 shadow-lg',
              'ring-1 ring-black/5 dark:ring-white/10',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              className,
            )}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

export interface DropdownItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  /** Fires after click; receives nothing, returns nothing. Called after
   *  the menu closes so the parent can navigate freely. */
  onSelect?: () => void;
  variant?: 'default' | 'danger';
}

export function DropdownItem({
  onSelect,
  variant = 'default',
  className,
  disabled,
  children,
  ...props
}: DropdownItemProps) {
  const ctx = React.useContext(DropdownContext);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        ctx?.close();
        onSelect?.();
      }}
      className={cn(
        'block w-full px-4 py-2 text-left text-sm transition-colors',
        'focus:outline-none focus-visible:bg-bg-subtle',
        variant === 'danger'
          ? 'text-danger hover:bg-danger-subtle'
          : 'text-fg hover:bg-bg-subtle',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-border', className)}
    />
  );
}

export function DropdownLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle',
        className,
      )}
    >
      {children}
    </div>
  );
}
