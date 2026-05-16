/**
 * Toast helpers + branded Toaster wrapper around `sonner`.
 *
 * Consumers should:
 *   1. Mount <Toaster /> ONCE in their root layout
 *   2. Call `toast(...)` / `toast.success(...)` / `toast.error(...)` /
 *      `toast.promise(...)` from anywhere
 *
 * Why wrap sonner: we want a single brand-default style (position,
 * spacing, theme integration) and one import path so consumers don't
 * have to remember sonner's existence. When we later migrate off
 * sonner, the package surface stays stable.
 *
 * Theme: 'system' follows prefers-color-scheme — combined with
 * next-themes flipping data-theme on <html>, this lands the toast
 * theme correctly in nearly every setup.
 */
'use client';

import { Toaster as SonnerToaster } from 'sonner';
import type { ComponentProps } from 'react';

export type ToasterProps = ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{ className: 'font-sans' }}
      {...props}
    />
  );
}

// Re-export sonner's `toast` directly through the package surface so
// consumers have one import path. The `export ... from` form avoids
// inlining sonner's deep type aliases (some aren't exported and would
// break declaration emit on our side).
export { toast } from 'sonner';
