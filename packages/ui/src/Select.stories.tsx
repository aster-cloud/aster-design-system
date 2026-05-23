import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label, Select } from '@aster-cloud/ui';

const SIZES = ['sm', 'md', 'lg'] as const;

const meta = {
  title: '02 Forms/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    disabled: false,
    size: 'md',
    state: 'default',
    defaultValue: 'draft',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    size: { control: 'select', options: SIZES },
    state: { control: 'select', options: ['default', 'invalid'] },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Native select styled to match Input. Heights align so a label + input + select row stays baseline-aligned. Use a combobox primitive for long or filterable option lists.',
      },
    },
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const STATUS_OPTIONS = (
  <>
    <option value="draft">Draft</option>
    <option value="review">In review</option>
    <option value="published">Published</option>
    <option value="archived">Archived</option>
  </>
);

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Baseline select. Verify trigger height, text alignment, border, and focus state.',
      },
    },
  },
  render: (args) => <Select {...args}>{STATUS_OPTIONS}</Select>,
};

export const Sizes: Story = {
  parameters: {
    docs: { description: { story: 'All density options. Verify baseline alignment when stacked.' } },
  },
  render: (args) => (
    <div className="flex flex-col gap-3">
      {SIZES.map((s) => (
        <Select key={s} {...args} size={s}>
          {STATUS_OPTIONS}
        </Select>
      ))}
    </div>
  ),
};

export const Invalid: Story = {
  args: { state: 'invalid' },
  parameters: {
    docs: { description: { story: 'Invalid state. Verify rose border on trigger.' } },
  },
  render: (args) => <Select {...args}>{STATUS_OPTIONS}</Select>,
};

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: { description: { story: 'Unavailable select. Verify legibility while clearly inactive.' } },
  },
  render: (args) => <Select {...args}>{STATUS_OPTIONS}</Select>,
};

export const WithLabel: Story = {
  parameters: {
    docs: { description: { story: 'Select with Label. Expected form composition.' } },
  },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="policy-status">Status</Label>
      <Select id="policy-status" {...args}>
        {STATUS_OPTIONS}
      </Select>
    </div>
  ),
};

export const LongOptions: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Long option labels. Verify truncation behavior and trigger width.',
      },
    },
  },
  render: (args) => (
    <Select {...args} defaultValue="long">
      <option value="short">Draft</option>
      <option value="long">
        Pending compliance manager approval and risk-team sign-off
      </option>
      <option value="published">Published to all tenants</option>
    </Select>
  ),
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side. Sign-off view for theme parity.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <div className="flex flex-col gap-3">
            <Select defaultValue="draft">{STATUS_OPTIONS}</Select>
            <Select state="invalid" defaultValue="draft">
              {STATUS_OPTIONS}
            </Select>
            <Select disabled defaultValue="draft">
              {STATUS_OPTIONS}
            </Select>
          </div>
        </div>
      ))}
    </div>
  ),
};
