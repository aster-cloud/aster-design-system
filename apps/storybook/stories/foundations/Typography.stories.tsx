/**
 * 00 Foundations / Typography
 *
 * Type family loading, hierarchy, readability across long-form and
 * compact UI content. Three stories:
 *   - Families   verify each face loaded and pairs cleanly
 *   - Scale      display-xl/lg/md/body usage
 *   - Code       JetBrains Mono for code blocks
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardBody } from '@aster-cloud/ui';

function Surface({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg p-12 text-fg">{children}</div>;
}

function Families() {
  return (
    <Surface>
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Typography
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight">Families</h1>
        </header>
        <Card>
          <CardBody className="grid grid-cols-1 gap-8 p-10 md:grid-cols-3">
            <FamilyColumn label="Fraunces · display">
              <p className="font-display text-3xl font-semibold tracking-tight">Aa Bb Cc</p>
              <p className="font-display text-base">0123456789</p>
            </FamilyColumn>
            <FamilyColumn label="Inter · sans">
              <p className="font-sans text-3xl font-semibold tracking-tight">Aa Bb Cc</p>
              <p className="font-sans text-base">0123456789</p>
            </FamilyColumn>
            <FamilyColumn label="JetBrains Mono · code">
              <p className="font-mono text-3xl font-semibold tracking-tight">Aa Bb Cc</p>
              <p className="font-mono text-base">0123456789</p>
            </FamilyColumn>
          </CardBody>
        </Card>
      </div>
    </Surface>
  );
}

function FamilyColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-xs text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

function Scale() {
  return (
    <Surface>
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Typography
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight">Scale</h1>
        </header>
        <Card>
          <CardBody className="flex flex-col gap-8 p-10">
            <ScaleRow label="display-xl · Fraunces 600">
              <p className="font-display text-7xl font-semibold leading-tight tracking-tighter">
                Govern policy in your own language.
              </p>
            </ScaleRow>
            <ScaleRow label="display-lg · Fraunces 600">
              <p className="font-display text-5xl font-semibold leading-snug tracking-tight">
                A modern engine for human-readable rules.
              </p>
            </ScaleRow>
            <ScaleRow label="display-md · Fraunces 600">
              <p className="font-display text-3xl font-semibold leading-snug tracking-tight">
                Compile natural language into deterministic decisions.
              </p>
            </ScaleRow>
            <ScaleRow label="body · Inter 400">
              <p className="max-w-prose font-sans text-base leading-relaxed text-fg-muted">
                Aster reads policies written by humans — compliance officers, risk
                analysts, product managers — and runs them as code. No more
                translating intent into engineer-speak: the rule and the spec are
                the same artifact.
              </p>
            </ScaleRow>
          </CardBody>
        </Card>
      </div>
    </Surface>
  );
}

function ScaleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-mono text-xs text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

function Code() {
  return (
    <Surface>
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
            Typography
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight">Code</h1>
        </header>
        <Card>
          <CardBody className="flex flex-col gap-3 p-10">
            <span className="font-mono text-xs text-fg-subtle">code · JetBrains Mono 400</span>
            <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 font-mono text-sm leading-normal text-fg">
{`Module aster.finance.loan.

Rule evaluate(applicant) given:
  applicant has income >= 50000 USD.
  applicant has credit_score >= 680.
  applicant has employment_years >= 2.
  decide approve.`}
            </pre>
          </CardBody>
        </Card>
      </div>
    </Surface>
  );
}

const meta = {
  title: '00 Foundations/Typography',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Approve type family loading, hierarchy, and readability across long-form and compact UI content.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const FamiliesStory: Story = { name: 'Families', render: () => <Families /> };
export const ScaleStory: Story = { name: 'Scale', render: () => <Scale /> };
export const CodeStory: Story = { name: 'Code', render: () => <Code /> };
