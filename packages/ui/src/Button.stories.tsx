import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { Button } from '@aster-cloud/ui';

const VARIANTS = ['primary', 'secondary', 'ghost', 'outline', 'accent', 'destructive'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

const meta = {
  title: '01 Actions/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save policy',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: SIZES },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Primary action element. Six variants × three sizes share one token system — same surface across hover, active, disabled, and focus states.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Baseline CTA. Verify fill, text color, radius, focus ring, and default size.',
      },
    },
  },
};

export const Variants: Story = {
  args: { variant: undefined },
  parameters: {
    docs: {
      description: {
        story:
          'All six intents in a row. Compare visual hierarchy and the prominence of destructive and accent variants.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {VARIANTS.map((v) => (
        <Button key={v} {...args} variant={v}>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  args: { size: undefined },
  parameters: {
    docs: {
      description: {
        story: 'All density options. Verify touch target and label alignment.',
      },
    },
  },
  render: (args) => (
    <div className="flex items-end gap-3">
      {SIZES.map((s) => (
        <Button key={s} {...args} size={s}>
          Size {s}
        </Button>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state. Verify opacity keeps labels readable while clearly non-interactive.',
      },
    },
  },
};

export const InteractiveStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Resting, hover, and focus side by side. Hover is simulated by applying the hover utility classes inline; focus uses autoFocus so the brand-tinted shadow-ring is visible without manual tabbing. P1 will replace this with addon-interactions play() + addon-pseudo-states for true CSS pseudo-class coverage.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <Row label="resting">
        <Button variant="primary">Save policy</Button>
      </Row>
      <Row label="hover (forced)">
        {/* Apply the hover utilities directly so reviewers see the hover
            surface without mouse interaction. */}
        <Button variant="primary" className="!bg-primary-hover">
          Save policy
        </Button>
      </Row>
      <Row label="focus (autoFocus → shadow-ring)">
        <Button variant="primary" autoFocus>
          Save policy
        </Button>
      </Row>
      <Row label="active (forced)">
        <Button variant="primary" className="!bg-primary-active">
          Save policy
        </Button>
      </Row>
    </div>
  ),
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-48 font-mono text-xs text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

export const WithIcon: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Icon plus label. Verify spacing and icon-text baseline alignment.',
      },
    },
  },
  render: (args) => (
    <Button {...args}>
      <Plus aria-hidden className="size-4" />
      New policy
    </Button>
  ),
};

export const LongContent: Story = {
  args: { children: 'Request compliance review and publish changes' },
  parameters: {
    docs: {
      description: {
        story: 'Stress test for long localized labels. The button should not clip or collapse.',
      },
    },
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: {
      description: {
        story: 'Light and dark side by side for all variants. Sign-off view for theme parity.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <div className="flex flex-wrap gap-3">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
