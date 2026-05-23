import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  ConfirmDialog,
  type ConfirmDialogVariant,
} from '@aster-cloud/ui';

const VARIANTS: ConfirmDialogVariant[] = ['danger', 'warning', 'info'];

interface HarnessProps {
  variant?: ConfirmDialogVariant;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  /** Starts the dialog open on mount. Defaults to false so multi-instance
   *  stories (Variants, ThemeCompare) never auto-open more than one
   *  native <dialog> at a time. */
  initialOpen?: boolean;
  /** Label for the trigger button so multi-Harness stories disambiguate. */
  triggerLabel?: string;
}

function Harness({
  variant = 'danger',
  title = 'Archive policy?',
  description = 'Archived policies stop receiving evaluations but remain in the audit log. You can restore them within 30 days.',
  confirmLabel,
  cancelLabel,
  isLoading = false,
  initialOpen = false,
  triggerLabel = 'Open dialog',
}: HarnessProps) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="flex min-h-[12rem] items-center justify-center">
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <ConfirmDialog
        isOpen={open}
        variant={variant}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        isLoading={isLoading}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}

const meta = {
  title: '06 Overlays/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    isLoading: { control: 'boolean' },
    title: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Branded confirmation modal. Uses native <dialog> with showModal() for focus trap + Esc. Stories use a Harness with a trigger button so reviewers control when the modal opens — multi-instance stories never auto-open the dialog to avoid native top-layer conflicts.',
      },
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'danger',
    title: 'Archive policy?',
    confirmLabel: 'Archive',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Standard danger confirmation; opens on mount so reviewers can immediately verify modal surface, title hierarchy, body copy, and action order. Press Esc, click backdrop, or use Cancel/Confirm to dismiss.',
      },
    },
  },
  render: (args) => (
    <Harness
      variant={args.variant}
      title={args.title}
      description={args.description as string | undefined}
      confirmLabel={args.confirmLabel}
      cancelLabel={args.cancelLabel}
      isLoading={args.isLoading}
      initialOpen
    />
  ),
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Three triggers — danger / warning / info. Open each in turn to compare icon and confirm-button color. Only one dialog is ever open at a time because each Harness starts closed.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-3">
      {VARIANTS.map((v) => (
        <div key={v}>
          <p className="mb-2 font-mono text-xs text-fg-subtle">{v}</p>
          <Harness
            variant={v}
            triggerLabel={`Open ${v}`}
            title={
              v === 'danger'
                ? 'Delete policy?'
                : v === 'warning'
                ? 'Unsaved changes'
                : 'Publish policy?'
            }
            description={
              v === 'danger'
                ? 'This action cannot be undone. Decision history will be retained for audit.'
                : v === 'warning'
                ? 'You have unsaved changes. Discard them and continue?'
                : 'The policy will be available to all production tenants on the next request.'
            }
            confirmLabel={
              v === 'danger' ? 'Delete' : v === 'warning' ? 'Discard' : 'Publish'
            }
          />
        </div>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  args: { isLoading: true, confirmLabel: 'Archiving…' },
  parameters: {
    docs: {
      description: {
        story:
          'In-flight confirmation. Opens on mount so reviewers can immediately verify the spinner, disabled buttons, and that Esc is suppressed while loading.',
      },
    },
  },
  render: (args) => (
    <Harness
      variant={args.variant}
      title={args.title}
      description={args.description as string | undefined}
      confirmLabel={args.confirmLabel}
      isLoading
      initialOpen
    />
  ),
};

export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Long title and body. Opens on mount so reviewers can verify wrapping, max width, and action placement without clicking.',
      },
    },
  },
  render: () => (
    <Harness
      variant="danger"
      title="Delete policy and revoke all version history?"
      description="This will permanently remove every version of this policy, decision-trace history, and tenant bindings. The action is logged in the audit trail for compliance review but cannot be reversed. Contact hello@aster-lang.dev if you need to recover historical evaluations within the next 7 days."
      confirmLabel="Permanently delete"
      initialOpen
    />
  ),
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: {
      description: {
        story:
          'Light and dark side by side. Click "Open danger" in each column to compare modal surface, overlay, and confirm-button tones across themes. Each column carries its own data-theme attribute so the dialog adopts the column theme, not the global toolbar theme.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <Harness triggerLabel={`Open in ${theme}`} />
        </div>
      ))}
    </div>
  ),
};
