import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText } from 'lucide-react';
import { Button, EmptyState } from '@aster-cloud/ui';

const meta = {
  title: '03 Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No policies yet',
    description: 'Create your first policy to start automating decisions.',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '"Nothing here yet" placeholder for list and collection pages. Doubles as the first onboarding nudge when an action slot is provided.',
      },
    },
  },
  decorators: [(Story) => <div className="w-[560px] max-w-full p-6"><Story /></div>],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Baseline empty state. Verify hierarchy, spacing, and muted tone.' } },
  },
};

export const WithIcon: Story = {
  args: {
    icon: <FileText aria-hidden className="size-6" />,
  },
  parameters: {
    docs: { description: { story: 'With leading icon. Verify the icon circle pairs with the title hierarchy.' } },
  },
};

export const WithAction: Story = {
  args: {
    icon: <FileText aria-hidden className="size-6" />,
    action: <Button size="sm">Create policy</Button>,
  },
  parameters: {
    docs: { description: { story: 'Onboarding nudge. Verify CTA placement below the description.' } },
  },
};

export const LongContent: Story = {
  args: {
    title: 'No matching policies for the selected filters',
    description:
      'Try widening the date range, clearing the status filter, or searching by policy name instead. The empty state should remain compact even with long copy.',
    action: <Button size="sm" variant="outline">Reset filters</Button>,
  },
  parameters: {
    docs: { description: { story: 'Long title and description. Verify wrapping and layout stability.' } },
  },
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side. Sign-off view for empty surface and text contrast.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <EmptyState
            icon={<FileText aria-hidden className="size-6" />}
            title="No policies yet"
            description="Create your first policy to start automating decisions."
            action={<Button size="sm">Create policy</Button>}
          />
        </div>
      ))}
    </div>
  ),
};
