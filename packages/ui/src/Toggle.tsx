/**
 * Toggle — accessible on/off switch (NOT a checkbox).
 *
 * Use for binary settings where the active state has an *immediate*
 * effect (locale detection on/off, dark mode, feature flag). Don't
 * use for "I agree to terms" — that's a Checkbox (also a different
 * affordance for a different mental model).
 *
 * Built as a button with role="switch" so screen readers announce
 * "switch, on/off" rather than "checkbox, checked/not checked".
 */
import * as React from 'react';
import { cn } from './utils.js';

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Required — switches must have an accessible label. */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:shadow-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-bg-muted',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none inline-block size-5 transform rounded-full bg-bg shadow ring-0',
          'transition-transform duration-fast ease-standard',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
