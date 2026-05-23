import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Label } from '@aster-cloud/ui';

const SIZES = ['sm', 'md', 'lg'] as const;

const meta = {
  title: '02 Forms/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Policy name',
    disabled: false,
    size: 'md',
    state: 'default',
  },
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: SIZES },
    state: { control: 'select', options: ['default', 'invalid'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'search', 'number'] },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single-line text field. Heights align with Button so label + input + action rows share one baseline grid.',
      },
    },
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Standard text input. Verify border, placeholder contrast, height, and focus ring.',
      },
    },
  },
};

export const Sizes: Story = {
  parameters: {
    docs: {
      description: { story: 'All density options. Verify baseline alignment when stacked.' },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-3">
      {SIZES.map((s) => (
        <Input key={s} {...args} size={s} placeholder={`size=${s}`} />
      ))}
    </div>
  ),
};

export const Invalid: Story = {
  args: { state: 'invalid', defaultValue: 'not-an-email', placeholder: 'you@example.com' },
  parameters: {
    docs: {
      description: { story: 'Invalid state. Verify rose border + brand-tinted focus ring.' },
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Loan eligibility v3.2' },
  parameters: {
    docs: {
      description: { story: 'Unavailable field. Verify the field reads as inactive without hiding its value.' },
    },
  },
};

export const WithLabel: Story = {
  parameters: {
    docs: {
      description: { story: 'Input with Label. The expected form composition; uses htmlFor association.' },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="policy-name">Policy name</Label>
      <Input id="policy-name" {...args} />
      <p className="text-xs text-fg-muted">Used as the module identifier in audit logs.</p>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    defaultValue:
      'Request compliance review and publish changes for the Loan Eligibility module',
    placeholder:
      'Long localized placeholder text that exceeds the visible field width',
  },
  parameters: {
    docs: {
      description: { story: 'Long value and placeholder. Verify horizontal overflow handling.' },
    },
  },
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: {
      description: { story: 'Light and dark side by side. Sign-off view for theme parity.' },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <div className="flex flex-col gap-3">
            <Input placeholder="Default" aria-label={`Default input (${theme})`} />
            <Input state="invalid" defaultValue="not-an-email" placeholder="Invalid" aria-label={`Invalid input (${theme})`} />
            <Input disabled defaultValue="Disabled" aria-label={`Disabled input (${theme})`} />
          </div>
        </div>
      ))}
    </div>
  ),
};
