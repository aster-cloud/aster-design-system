/**
 * 00 Foundations / Color
 *
 * Token review surface. Three stories:
 *   - Ramps          raw violet/sky/zinc scales (color-contrast axe rule
 *                    is intentionally disabled — these are palette swatches,
 *                    not approved text/background pairings)
 *   - SemanticRoles  the role tokens components actually consume
 *   - ThemeCompare   side-by-side light/dark for the role tokens, the
 *                    sign-off view for theme parity
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

const ramp = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      {/*
        role="img" lets the swatch carry aria-label without tripping
        axe-core's aria-prohibited-attr rule (a bare <div> cannot host
        aria-label without a valid role). The label is the swatch's
        whole accessible name so SR users know which step they're on.
      */}
      <div
        role="img"
        aria-label={`${name}: ${value}`}
        className="h-16 rounded-md border border-border"
        style={{ background: value }}
      />
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-fg">{name}</span>
        <span className="font-mono text-xs text-fg-subtle">{value}</span>
      </div>
    </div>
  );
}

function Ramp({ scaleName, prefix }: { scaleName: string; prefix: string }) {
  return (
    // <h2> (not <h3>) so the page heading order stays h1 → h2 with no
    // skipped levels. The visual size is controlled by Tailwind, not the
    // semantic level — axe's heading-order rule checks the DOM order.
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
        {scaleName}
      </h2>
      <div className="grid grid-cols-11 gap-2">
        {ramp.map((step) => (
          <Swatch
            key={step}
            name={`${step}`}
            value={`var(--aster-color-${prefix}-${step})`}
          />
        ))}
      </div>
    </section>
  );
}

function Surface({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg p-12 text-fg">{children}</div>;
}

const ROLE_PAIRS: Array<{
  name: string;
  bg: string;
  fg: string;
  sample: string;
}> = [
  { name: 'fg on bg', bg: 'var(--aster-bg)', fg: 'var(--aster-fg)', sample: 'Aa' },
  { name: 'fg-muted on bg', bg: 'var(--aster-bg)', fg: 'var(--aster-fg-muted)', sample: 'Aa' },
  { name: 'fg on bg-subtle', bg: 'var(--aster-bg-subtle)', fg: 'var(--aster-fg)', sample: 'Aa' },
  { name: 'fg on bg-muted', bg: 'var(--aster-bg-muted)', fg: 'var(--aster-fg)', sample: 'Aa' },
  { name: 'primary-fg on primary', bg: 'var(--aster-primary)', fg: 'var(--aster-primary-fg)', sample: 'Save' },
  { name: 'primary on primary-subtle', bg: 'var(--aster-primary-subtle)', fg: 'var(--aster-primary)', sample: 'Save' },
  { name: 'accent-fg on accent', bg: 'var(--aster-accent)', fg: 'var(--aster-accent-fg)', sample: 'Live' },
  { name: 'success-fg on success', bg: 'var(--aster-success)', fg: 'var(--aster-success-fg)', sample: 'Saved' },
  { name: 'warning-fg on warning', bg: 'var(--aster-warning)', fg: 'var(--aster-warning-fg)', sample: 'Heads up' },
  { name: 'danger-fg on danger', bg: 'var(--aster-danger)', fg: 'var(--aster-danger-fg)', sample: 'Delete' },
];

function RolePair({ name, bg, fg, sample }: (typeof ROLE_PAIRS)[number]) {
  // data-testid lets the CssCheck story locate the primary swatch
  // deterministically and assert the resolved CSS variable value.
  const testId = `role-pair-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1">
      <div
        data-testid={testId}
        className="flex h-16 items-center justify-center rounded-md border border-border font-sans text-sm font-semibold"
        style={{ background: bg, color: fg }}
      >
        {sample}
      </div>
      <span className="font-mono text-xs text-fg">{name}</span>
    </div>
  );
}

function SemanticRolesPanel() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ROLE_PAIRS.map((p) => (
        <RolePair key={p.name} {...p} />
      ))}
    </div>
  );
}

function RampsPage() {
  return (
    <Surface>
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <header>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Color
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-fg">
            Ramps
          </h1>
        </header>
        <Ramp scaleName="Violet · primary" prefix="violet" />
        <Ramp scaleName="Sky · accent" prefix="sky" />
        <Ramp scaleName="Zinc · neutral" prefix="zinc" />
      </div>
    </Surface>
  );
}

function SemanticRolesPage() {
  return (
    <Surface>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Color
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-fg">
            Semantic roles
          </h1>
          <p className="max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
            Actual foreground-on-background pairings, not raw swatches.
            Use the Accessibility panel here to verify contrast for each
            role pair in both light and dark themes.
          </p>
        </header>
        <SemanticRolesPanel />
      </div>
    </Surface>
  );
}

function ThemeComparePage() {
  return (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      <div data-theme="light" className="bg-bg p-12 text-fg">
        <p className="mb-4 font-mono text-xs text-fg-subtle">light</p>
        <SemanticRolesPanel />
      </div>
      <div data-theme="dark" className="bg-bg p-12 text-fg">
        <p className="mb-4 font-mono text-xs text-fg-subtle">dark</p>
        <SemanticRolesPanel />
      </div>
    </div>
  );
}

const meta = {
  title: '00 Foundations/Color',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Token review. Use Ramps for palette inspection, SemanticRoles for the consumer-facing role tokens, and ThemeCompare for sign-off across light/dark.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Ramps: Story = {
  render: () => <RampsPage />,
  parameters: {
    docs: {
      description: {
        story:
          'Raw palette ramps. The color-contrast a11y rule is disabled on this story because swatches are not text-on-background pairings — contrast is evaluated on Semantic roles and component stories instead.',
      },
    },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};

export const SemanticRoles: Story = {
  render: () => <SemanticRolesPage />,
  parameters: {
    docs: {
      description: {
        story:
          'Approve the role tokens components consume. Toggle the theme toolbar to verify dark-mode parity.',
      },
    },
  },
};

/**
 * Token-loading smoke test for the whole project.
 *
 * Asserts that the `primary-fg on primary` swatch renders with the
 * resolved CSS variable `--aster-primary` = `#7c3aed` (violet-600 =
 * `rgb(124, 58, 237)`). If this fails, the Tailwind preset isn't
 * resolving `var(--aster-*)` references, or `@aster-cloud/tokens/tokens.css`
 * hasn't loaded — either case silently breaks theme switching across
 * the whole system.
 *
 * One CssCheck is enough for the whole project; subsequent components
 * inherit the same preset/token guarantee.
 */
export const CssCheck: Story = {
  render: () => <SemanticRolesPage />,
  parameters: {
    docs: {
      description: {
        story:
          'Proves the token CSS + Tailwind preset are wired. Reads the resolved background of the `primary-fg on primary` swatch and asserts it equals `rgb(124, 58, 237)` (= `--aster-primary` = violet-600).',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const swatch = await canvas.findByTestId('role-pair-primary-fg-on-primary');
    await expect(getComputedStyle(swatch).backgroundColor).toBe(
      'rgb(124, 58, 237)',
    );
  },
};

export const ThemeCompare: Story = {
  render: () => <ThemeComparePage />,
  parameters: {
    forceRootTheme: 'light',
    docs: {
      description: {
        story:
          'Sign-off view: light and dark side by side for the semantic role tokens. The global theme toolbar does not affect this story because each column carries its own data-theme.',
      },
    },
  },
};
