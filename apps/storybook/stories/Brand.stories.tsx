/**
 * The "Brand" story is the single source of visual truth for W1.
 *
 * It renders, on one page, every token-system decision so reviewers can
 * see in one scroll:
 *   - Wordmark in all variants × sizes
 *   - Color ramps (violet, sky, zinc) plus the semantic role tokens
 *   - Typography pairing (Fraunces display + Inter sans + JetBrains Mono)
 *   - The first three primitives (Button, Card) in every variant
 *
 * If this page looks right, the rest of W2-W6 inherits a correct baseline.
 */
import type { Meta, StoryObj } from '@storybook/react';
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter,
  Wordmark,
} from '@aster-cloud/ui';

const violetSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const skySteps   = violetSteps;
const zincSteps  = violetSteps;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-16 rounded-md border border-border"
        style={{ background: value }}
        aria-label={`${name}: ${value}`}
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
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-xl font-semibold tracking-tight text-fg">
        {scaleName}
      </h3>
      <div className="grid grid-cols-11 gap-2">
        {violetSteps.map((step) => (
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

const BrandShowcase = () => (
  <div className="min-h-screen bg-bg p-12">
    <div className="mx-auto flex max-w-7xl flex-col gap-16">
      {/* ===== Header ===== */}
      <header className="flex flex-col gap-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
          Aster Design System · v0.1.0
        </p>
        <h1 className="font-display text-7xl font-semibold leading-tight tracking-tighter text-fg">
          Brand baseline
        </h1>
        <p className="max-w-2xl font-sans text-lg leading-relaxed text-fg-muted">
          A single source of visual truth shared between <Wordmark variant="product" size="sm" />
          {' '}and <Wordmark variant="dev" size="sm" />. Every color, type style, and
          primitive on this page is a token — change it once, change it everywhere.
        </p>
      </header>

      {/* ===== Wordmark ===== */}
      <section className="flex flex-col gap-6">
        <SectionHeading eyebrow="01 — Wordmark" title="Aster set in Fraunces" />
        <Card>
          <CardBody className="grid grid-cols-1 gap-10 p-10 md:grid-cols-3">
            <div className="flex flex-col items-start gap-4">
              <span className="font-mono text-xs text-fg-subtle">default · lg</span>
              <Wordmark size="lg" />
              <span className="font-mono text-xs text-fg-subtle">default · xl</span>
              <Wordmark size="xl" />
            </div>
            <div className="flex flex-col items-start gap-4">
              <span className="font-mono text-xs text-fg-subtle">product · md</span>
              <Wordmark variant="product" size="md" />
              <span className="font-mono text-xs text-fg-subtle">product · lg</span>
              <Wordmark variant="product" size="lg" />
              <span className="font-mono text-xs text-fg-subtle">product · xl</span>
              <Wordmark variant="product" size="xl" />
            </div>
            <div className="flex flex-col items-start gap-4">
              <span className="font-mono text-xs text-fg-subtle">dev · md</span>
              <Wordmark variant="dev" size="md" />
              <span className="font-mono text-xs text-fg-subtle">dev · lg</span>
              <Wordmark variant="dev" size="lg" />
              <span className="font-mono text-xs text-fg-subtle">dev · xl</span>
              <Wordmark variant="dev" size="xl" />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* ===== Color ===== */}
      <section className="flex flex-col gap-8">
        <SectionHeading eyebrow="02 — Color" title="Three ramps, four roles" />
        <Ramp scaleName="Violet · primary" prefix="violet" />
        <Ramp scaleName="Sky · accent"     prefix="sky" />
        <Ramp scaleName="Zinc · neutral"   prefix="zinc" />
        <div>
          <h3 className="mb-3 font-display text-xl font-semibold tracking-tight text-fg">
            Semantic roles
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="primary"  value="var(--aster-primary)" />
            <Swatch name="accent"   value="var(--aster-accent)" />
            <Swatch name="success"  value="var(--aster-success)" />
            <Swatch name="warning"  value="var(--aster-warning)" />
            <Swatch name="danger"   value="var(--aster-danger)" />
            <Swatch name="bg"       value="var(--aster-bg)" />
            <Swatch name="fg"       value="var(--aster-fg)" />
            <Swatch name="border"   value="var(--aster-border)" />
          </div>
        </div>
      </section>

      {/* ===== Typography ===== */}
      <section className="flex flex-col gap-6">
        <SectionHeading eyebrow="03 — Typography" title="Fraunces · Inter · JetBrains Mono" />
        <Card>
          <CardBody className="flex flex-col gap-8 p-10">
            <div>
              <span className="font-mono text-xs text-fg-subtle">display-xl · Fraunces 600</span>
              <p className="font-display text-7xl font-semibold leading-tight tracking-tighter text-fg">
                Govern policy in your own language.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-fg-subtle">display-lg · Fraunces 600</span>
              <p className="font-display text-5xl font-semibold leading-snug tracking-tight text-fg">
                A modern engine for human-readable rules.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-fg-subtle">display-md · Fraunces 600</span>
              <p className="font-display text-3xl font-semibold leading-snug tracking-tight text-fg">
                Compile natural language into deterministic decisions.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-fg-subtle">body · Inter 400</span>
              <p className="max-w-prose font-sans text-base leading-relaxed text-fg-muted">
                Aster reads policies written by humans — compliance officers, risk
                analysts, product managers — and runs them as code. No more
                translating intent into engineer-speak: the rule and the spec are
                the same artifact.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-fg-subtle">code · JetBrains Mono 400</span>
              <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 font-mono text-sm leading-normal text-fg">
{`Module aster.finance.loan.

Rule evaluate(applicant) given:
  applicant has income >= 50000 USD.
  applicant has credit_score >= 680.
  applicant has employment_years >= 2.
  decide approve.`}
              </pre>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* ===== Buttons ===== */}
      <section className="flex flex-col gap-6">
        <SectionHeading eyebrow="04 — Buttons" title="One CTA system, six variants" />
        <Card>
          <CardBody className="grid grid-cols-1 gap-6 p-10 md:grid-cols-3">
            <ButtonRow label="primary"     variant="primary" />
            <ButtonRow label="secondary"   variant="secondary" />
            <ButtonRow label="ghost"       variant="ghost" />
            <ButtonRow label="outline"     variant="outline" />
            <ButtonRow label="accent"      variant="accent" />
            <ButtonRow label="destructive" variant="destructive" />
          </CardBody>
        </Card>
      </section>

      {/* ===== Card example ===== */}
      <section className="flex flex-col gap-6">
        <SectionHeading eyebrow="05 — Cards" title="Composable surface primitive" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Loan eligibility v3.2</CardTitle>
              <CardDescription>Last deployed 2 hours ago · 1.2M decisions today</CardDescription>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-fg-muted">
                The rule has approved 78% of applicants in the last 24 hours.
                Decision trace is available on every call.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="primary" size="sm">Open editor</Button>
              <Button variant="ghost"   size="sm">View trace</Button>
            </CardFooter>
          </Card>
          <Card className="bg-primary-subtle">
            <CardHeader>
              <CardTitle>AI assistant is online</CardTitle>
              <CardDescription>
                Describe your policy in plain English — Aster drafts CNL for you.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="accent" size="sm">Try the assistant</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  </div>
);

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </span>
      <h2 className="font-display text-4xl font-semibold leading-snug tracking-tight text-fg">
        {title}
      </h2>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent' | 'destructive';

function ButtonRow({ label, variant }: { label: string; variant: ButtonVariant }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="font-mono text-xs text-fg-subtle">{label}</span>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant={variant} size="sm">Small</Button>
        <Button variant={variant} size="md">Medium</Button>
        <Button variant={variant} size="lg">Large</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant={variant} size="md" disabled>Disabled</Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof BrandShowcase> = {
  title: '00 — Brand / Baseline',
  component: BrandShowcase,
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Baseline: StoryObj<typeof BrandShowcase> = {};
