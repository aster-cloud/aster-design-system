/**
 * 00 Foundations / Brand
 *
 * Wordmark identity surface. Reviewers approve brand presence here:
 * wordmark variants, sizes, and light/dark behavior. Component-level
 * concerns (Button, Alert, DataTable, ...) live in their own component
 * stories under 01-06 groups.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardBody, Wordmark } from '@aster-cloud/ui';

function BrandIdentity() {
  return (
    <main className="min-h-screen bg-bg p-12 text-fg">
      <section className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-6">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Aster Design System
          </p>
          <h1 className="font-display text-6xl font-semibold leading-tight tracking-tighter text-fg">
            Brand
          </h1>
          <p className="max-w-2xl font-sans text-lg leading-relaxed text-fg-muted">
            Wordmark variants in product (
            <Wordmark variant="product" size="sm" />) and developer (
            <Wordmark variant="dev" size="sm" />) contexts. Toggle the theme
            from the toolbar to verify light and dark presence.
          </p>
        </header>

        <Card>
          <CardBody className="grid grid-cols-1 gap-10 p-10 md:grid-cols-3">
            <WordmarkColumn label="default">
              <Wordmark size="lg" />
              <Wordmark size="xl" />
            </WordmarkColumn>
            <WordmarkColumn label="product">
              <Wordmark variant="product" size="md" />
              <Wordmark variant="product" size="lg" />
              <Wordmark variant="product" size="xl" />
            </WordmarkColumn>
            <WordmarkColumn label="dev">
              <Wordmark variant="dev" size="md" />
              <Wordmark variant="dev" size="lg" />
              <Wordmark variant="dev" size="xl" />
            </WordmarkColumn>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}

function WordmarkColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <span className="font-mono text-xs text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

const meta = {
  title: '00 Foundations/Brand',
  component: BrandIdentity,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Approve brand identity, wordmark sizing, and light/dark brand presence. Component behavior is reviewed in component stories under 01–06.',
      },
    },
  },
} satisfies Meta<typeof BrandIdentity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Identity: Story = {};
