import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
} from '@aster-cloud/ui';

interface PolicyRow {
  id: string;
  name: string;
  owner: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  updatedAt: string;
}

const SAMPLE_ROWS: PolicyRow[] = [
  { id: 'p1', name: 'Loan eligibility v3.2', owner: 'Risk team', status: 'published', updatedAt: '2 hours ago' },
  { id: 'p2', name: 'KYC tier upgrade', owner: 'Compliance', status: 'review', updatedAt: 'Yesterday' },
  { id: 'p3', name: 'AML transaction screen', owner: 'Compliance', status: 'published', updatedAt: '3 days ago' },
  { id: 'p4', name: 'Insurance auto-quote', owner: 'Insurance product', status: 'draft', updatedAt: 'A week ago' },
  { id: 'p5', name: 'Refund approval', owner: 'Support', status: 'archived', updatedAt: 'A month ago' },
];

const LONG_ROWS: PolicyRow[] = [
  {
    id: 'long1',
    name: 'Loan eligibility — Pending compliance manager approval and risk-team sign-off (v3.2)',
    owner: 'Risk + Compliance joint working group',
    status: 'review',
    updatedAt: '2 hours ago',
  },
  ...SAMPLE_ROWS.slice(1),
];

function statusBadge(status: PolicyRow['status']) {
  switch (status) {
    case 'draft':
      return <Badge variant="neutral">Draft</Badge>;
    case 'review':
      return <Badge variant="warning">In review</Badge>;
    case 'published':
      return <Badge variant="success">Published</Badge>;
    case 'archived':
      return <Badge variant="outline">Archived</Badge>;
  }
}

const COLUMNS: DataTableColumn<PolicyRow>[] = [
  { key: 'name', header: 'Policy', cell: (r) => r.name },
  { key: 'owner', header: 'Owner', cell: (r) => r.owner },
  { key: 'status', header: 'Status', cell: (r) => statusBadge(r.status) },
  { key: 'updated', header: 'Updated', cell: (r) => r.updatedAt, className: 'text-right' },
];

const meta = {
  title: '05 Data/DataTable',
  component: DataTable<PolicyRow>,
  tags: ['autodocs'],
  args: {
    columns: COLUMNS,
    rows: SAMPLE_ROWS,
    loading: false,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Opinionated table wrapper with built-in horizontal overflow, aria-busy on loading, and explicit empty/loading slots. Generic over row type.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg p-8">
        <div className="mx-auto max-w-5xl">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof DataTable<PolicyRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Standard table with realistic rows. Verify density, column alignment, borders, and row readability.' } },
  },
};

export const Loading: Story = {
  args: { loading: true, rows: [] },
  parameters: {
    docs: { description: { story: 'Loading state with no rows. Verify aria-busy on <table> and loading copy placement.' } },
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    emptyState: (
      <div className="px-4 py-12">
        <EmptyState
          title="No policies yet"
          description="Create your first policy to start automating decisions."
          action={<Button size="sm">Create policy</Button>}
        />
      </div>
    ),
  },
  parameters: {
    docs: { description: { story: 'Empty state inside table body. Verify the empty slot has enough visual weight.' } },
  },
};

export const ClickableRows: Story = {
  args: {
    onRowClick: (row) => {
      // eslint-disable-next-line no-console
      console.log('row clicked', row.id);
    },
  },
  parameters: {
    docs: { description: { story: 'Keyboard- and pointer-actionable rows. Tab → Enter / Space activates. Verify hover and focus-visible.' } },
  },
};

export const LongContent: Story = {
  args: { rows: LONG_ROWS },
  parameters: {
    docs: { description: { story: 'Long names and dense cells. Verify overflow behavior; the wrapper scrolls horizontally on narrow viewports.' } },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg p-8">
        <div className="mx-auto max-w-3xl">
          <Story />
        </div>
      </div>
    ),
  ],
};

export const NarrowViewport: Story = {
  parameters: {
    docs: { description: { story: 'Mobile-width table (320px). Verify columns scroll horizontally rather than clipping.' } },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg p-4">
        <div className="mx-auto w-[320px]">
          <Story />
        </div>
      </div>
    ),
  ],
};

export const ThemeCompare: Story = {
  parameters: {
    forceRootTheme: 'light',
    docs: { description: { story: 'Light and dark side by side. Sign-off view for header, borders, rows, hover, and focus.' } },
  },
  render: () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} data-theme={theme} className="bg-bg p-6">
          <p className="mb-4 font-mono text-xs text-fg-subtle">{theme}</p>
          <DataTable columns={COLUMNS} rows={SAMPLE_ROWS.slice(0, 3)} />
        </div>
      ))}
    </div>
  ),
};
