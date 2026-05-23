import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreHorizontal } from 'lucide-react';
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  IconButton,
} from '@aster-cloud/ui';

const meta = {
  title: '04 Navigation/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    align: { control: 'select', options: ['left', 'right'] },
  },
  args: {
    align: 'right',
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Click-to-open menu attached to a trigger. Click outside or Esc closes; items are keyboard-navigable through the natural tab order. The dropdown surface defaults to align="right" to anchor under "⋯" row-action triggers.',
      },
    },
  },
  decorators: [(Story) => <div className="h-72"><Story /></div>],
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const Trigger = (
  <IconButton aria-label="Row actions" size="sm">
    <MoreHorizontal className="size-4" aria-hidden />
  </IconButton>
);

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Standard action menu. Verify trigger, menu placement, item spacing, and keyboard affordance.' } },
  },
  render: (args) => (
    <Dropdown {...args} trigger={Trigger}>
      <DropdownItem onSelect={() => {}}>Edit policy</DropdownItem>
      <DropdownItem onSelect={() => {}}>Duplicate</DropdownItem>
      <DropdownItem onSelect={() => {}}>Archive</DropdownItem>
    </Dropdown>
  ),
};

export const WithLabels: Story = {
  parameters: {
    docs: { description: { story: 'Grouped menu with labels and separators. Verify scanability.' } },
  },
  render: (args) => (
    <Dropdown {...args} trigger={Trigger}>
      <DropdownLabel>Policy</DropdownLabel>
      <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
      <DropdownItem onSelect={() => {}}>Duplicate</DropdownItem>
      <DropdownSeparator />
      <DropdownLabel>Lifecycle</DropdownLabel>
      <DropdownItem onSelect={() => {}}>Archive</DropdownItem>
      <DropdownItem onSelect={() => {}} variant="danger">
        Delete
      </DropdownItem>
    </Dropdown>
  ),
};

export const DestructiveItem: Story = {
  parameters: {
    docs: { description: { story: 'Menu with destructive action. Verify danger tone is clear without dominating the menu.' } },
  },
  render: (args) => (
    <Dropdown {...args} trigger={Trigger}>
      <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
      <DropdownItem onSelect={() => {}} disabled>
        Duplicate (disabled)
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem onSelect={() => {}} variant="danger">
        Delete policy
      </DropdownItem>
    </Dropdown>
  ),
};

export const LongContent: Story = {
  parameters: {
    docs: { description: { story: 'Long item labels. Verify menu width, truncation, and alignment.' } },
  },
  render: (args) => (
    <Dropdown {...args} trigger={Trigger}>
      <DropdownItem onSelect={() => {}}>Request compliance review</DropdownItem>
      <DropdownItem onSelect={() => {}}>
        Publish to all production tenants
      </DropdownItem>
      <DropdownItem onSelect={() => {}}>
        Export decision trace for the last 24 hours
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem onSelect={() => {}} variant="danger">
        Archive policy and revoke version history
      </DropdownItem>
    </Dropdown>
  ),
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side. Sign-off view for trigger + menu surface.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-8">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <Dropdown trigger={Trigger}>
            <DropdownItem onSelect={() => {}}>Edit</DropdownItem>
            <DropdownItem onSelect={() => {}}>Duplicate</DropdownItem>
            <DropdownSeparator />
            <DropdownItem onSelect={() => {}} variant="danger">
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      ))}
    </div>
  ),
};
