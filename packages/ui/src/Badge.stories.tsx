import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@aster-cloud/ui';

const VARIANTS = [
  'neutral',
  'primary',
  'accent',
  'success',
  'warning',
  'danger',
  'neutral-solid',
  'primary-solid',
  'accent-solid',
  'success-solid',
  'warning-solid',
  'danger-solid',
  'outline',
] as const;

const meta = {
  title: '03 Feedback/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Active',
    variant: 'neutral',
  },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    children: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Compact status pill. Subtle variants for table cells and metadata; solid variants for the single highest-priority status in a row.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Baseline subtle badge. Verify height, radius, and label readability.' } },
  },
};

export const Variants: Story = {
  args: { variant: undefined },
  parameters: {
    docs: { description: { story: 'Subtle, solid, and outline tones together. Compare status meaning and contrast.' } },
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((v) => (
        <Badge key={v} variant={v}>
          {v}
        </Badge>
      ))}
    </div>
  ),
};

export const LongContent: Story = {
  args: { children: 'Pending compliance manager approval', variant: 'warning' },
  parameters: {
    docs: {
      description: {
        story:
          'Long status label. The component is whitespace-nowrap; the container width forces horizontal overflow or wraps in the parent layout.',
      },
    },
  },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side for every tone. Sign-off view for theme parity.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
