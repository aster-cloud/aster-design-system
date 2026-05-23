import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertDescription, AlertTitle } from '@aster-cloud/ui';

const VARIANTS = ['info', 'success', 'warning', 'danger'] as const;

const meta = {
  title: '03 Feedback/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: {
    variant: 'info',
    hideIcon: false,
  },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    hideIcon: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Banner-style status communication. Use for persistent page-level messages; reach for Toast when the message is transient.',
      },
    },
  },
  decorators: [(Story) => <div className="w-[640px] max-w-full p-6"><Story /></div>],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE_TITLE = 'Your policy is in draft';
const SAMPLE_DESC = 'Publish the policy to start running evaluations against production tenants.';

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: 'Informational alert. Verify icon, border, tone, and body hierarchy.' },
    },
  },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>{SAMPLE_TITLE}</AlertTitle>
      <AlertDescription>{SAMPLE_DESC}</AlertDescription>
    </Alert>
  ),
};

export const Variants: Story = {
  args: { variant: undefined },
  parameters: {
    docs: { description: { story: 'All four tones stacked. Compare urgency and contrast.' } },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      {VARIANTS.map((v) => (
        <Alert key={v} variant={v}>
          <AlertTitle>{titleFor(v)}</AlertTitle>
          <AlertDescription>{descFor(v)}</AlertDescription>
        </Alert>
      ))}
    </div>
  ),
};

export const WithoutIcon: Story = {
  args: { hideIcon: true },
  parameters: {
    docs: { description: { story: 'Compact alert without leading icon. Verify tone remains clear.' } },
  },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Saved.</AlertTitle>
      <AlertDescription>Your changes will be available to all tenants on the next request.</AlertDescription>
    </Alert>
  ),
};

export const LongContent: Story = {
  parameters: {
    docs: { description: { story: 'Long title and multi-line description. Verify wrapping and spacing.' } },
  },
  render: () => (
    <Alert variant="warning">
      <AlertTitle>
        Trial ends in 3 days — review your subscription and confirm payment details
      </AlertTitle>
      <AlertDescription>
        Your tenant will keep read-only access to historical decisions, but new policy
        evaluations will be paused until the subscription is renewed. Contact{' '}
        <a href="mailto:hello@aster-lang.dev" className="underline">hello@aster-lang.dev</a>{' '}
        if you need a grace period.
      </AlertDescription>
    </Alert>
  ),
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side for all variants. Sign-off view for theme parity.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <div className="flex flex-col gap-3">
            {VARIANTS.map((v) => (
              <Alert key={v} variant={v}>
                <AlertTitle>{titleFor(v)}</AlertTitle>
                <AlertDescription>{descFor(v)}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

function titleFor(v: (typeof VARIANTS)[number]) {
  switch (v) {
    case 'info':
      return 'Your policy is in draft';
    case 'success':
      return 'Saved.';
    case 'warning':
      return 'Trial ends in 3 days';
    case 'danger':
      return 'Could not save. Check your input.';
  }
}

function descFor(v: (typeof VARIANTS)[number]) {
  switch (v) {
    case 'info':
      return 'Publish the policy to start running evaluations against production tenants.';
    case 'success':
      return 'Your changes will be available to all tenants on the next request.';
    case 'warning':
      return 'Renew the subscription to keep policy evaluations running.';
    case 'danger':
      return 'The credit score field expects an integer between 300 and 850.';
  }
}
