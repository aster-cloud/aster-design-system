import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { Button, PageHeader } from '@aster-cloud/ui';

const meta = {
  title: '04 Navigation/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Policies',
    subtitle: 'Manage policy versions and approvals across tenants.',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Title block at the top of a dashboard page. Always renders a single h1; on mobile the action slides under the title rather than crowding the row.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg p-8">
        <div className="mx-auto max-w-6xl">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Standard page heading. Verify title hierarchy and subtitle width.' } },
  },
};

export const WithAction: Story = {
  args: {
    action: (
      <Button>
        <Plus aria-hidden className="size-4" /> New policy
      </Button>
    ),
  },
  parameters: {
    docs: { description: { story: 'Header with primary action. Verify action alignment and responsive collapse.' } },
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    breadcrumbs: (
      <nav aria-label="Breadcrumb" className="text-xs text-fg-muted">
        <ol className="flex gap-1">
          <li>Dashboard</li>
          <li>/</li>
          <li>Policies</li>
        </ol>
      </nav>
    ),
    action: <Button>New policy</Button>,
  },
  parameters: {
    docs: { description: { story: 'Header with breadcrumbs above the title. Verify spacing rhythm above the h1.' } },
  },
};

export const LongContent: Story = {
  args: {
    title:
      'Loan eligibility — Pending compliance manager approval and risk-team sign-off',
    subtitle:
      'Once compliance signs off, this policy will be promoted to production tenants on the next deployment window.',
    action: <Button>Request review</Button>,
  },
  parameters: {
    docs: {
      description: { story: 'Long title and subtitle. Verify wrapping and no overlap with the action column.' },
    },
  },
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side. Sign-off view for heading and action row.' } },
  },
  /*
   * Each column is wrapped in <section aria-label> so the inner
   * <header> from PageHeader no longer maps to a top-level banner
   * landmark. Without the sectioning ancestor, axe flags both
   * <header>s as duplicate-banner / landmark-unique violations.
   */
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <section
          key={theme}
          aria-label={`Theme preview (${theme})`}
          data-theme={theme}
          className="bg-bg p-8"
        >
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <PageHeader
            title="Policies"
            subtitle="Manage policy versions and approvals across tenants."
            action={<Button>New policy</Button>}
          />
        </section>
      ))}
    </div>
  ),
};
