/**
 * ConfirmDialog — branded confirmation modal.
 *
 * Replaces window.confirm() across consumers — confirm() is OS-styled,
 * not i18n-aware, and breaks brand. This component:
 *   - native <dialog> with showModal() for proper focus trap + Esc
 *   - three variants (danger / warning / info) drive icon + button color
 *   - isLoading shows an inline spinner so async confirms don't look stuck
 *
 * Composition is intentional: callers control title / description /
 * labels so the dialog is fully i18n-ready.
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { cn } from './utils.js';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Use ElementType so lucide-react's ForwardRefExoticComponent (with
// its 'aria-hidden'?: Booleanish signature) satisfies the field.
const variantConfig: Record<
  ConfirmDialogVariant,
  {
    Icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    confirmButton: string;
  }
> = {
  danger: {
    Icon: AlertTriangle,
    iconBg: 'bg-danger-subtle',
    iconColor: 'text-danger',
    confirmButton: 'bg-danger text-danger-fg hover:bg-rose-700',
  },
  warning: {
    Icon: HelpCircle,
    iconBg: 'bg-warning-subtle',
    iconColor: 'text-warning',
    confirmButton: 'bg-warning text-warning-fg hover:opacity-90',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-primary-subtle',
    iconColor: 'text-primary',
    confirmButton: 'bg-primary text-primary-fg hover:bg-primary-hover',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const { Icon, iconBg, iconColor, confirmButton } = variantConfig[variant];

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen && !dlg.open) {
      dlg.showModal();
      // Defer focus so the dialog has actually mounted.
      setTimeout(() => cancelRef.current?.focus(), 0);
    } else if (!isOpen && dlg.open) {
      dlg.close();
    }
  }, [isOpen]);

  // Esc → cancel (unless loading, when we want to keep the modal up
  // until the in-flight action resolves).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        // Backdrop click closes; click inside the panel doesn't.
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
      onClose={() => onCancel()}
      className={cn(
        'm-0 w-full max-w-md rounded-xl border border-border bg-bg p-0 shadow-2xl',
        'backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm',
        'fixed left-1/2 top-[20vh] -translate-x-1/2',
      )}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              iconBg,
            )}
          >
            <Icon aria-hidden className={cn('size-5', iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-fg"
            >
              {title}
            </h3>
            <div
              id="confirm-dialog-description"
              className="mt-1 text-sm text-fg-muted"
            >
              {description}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelRef}
            disabled={isLoading}
            onClick={onCancel}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-medium text-fg',
              'transition-colors hover:bg-bg-subtle',
              'focus-visible:outline-none focus-visible:shadow-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm',
              'transition-colors',
              'focus-visible:outline-none focus-visible:shadow-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              confirmButton,
            )}
          >
            {isLoading && (
              <svg
                aria-hidden
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="4"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
