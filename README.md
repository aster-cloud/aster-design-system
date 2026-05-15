# Aster Design System

Shared brand tokens and UI primitives consumed by both `aster-cloud` (SaaS) and
`aster-lang-dev` (developer portal). The goal is **100% visual identity**
between the two sites — same colors, typography, spacing rhythm — so users move
between marketing → docs → product without "did I just leave the site?"
friction.

## Packages

| Package | Role | Consumers |
|---|---|---|
| `@aster/tokens` | CSS variables + JS/TS exports of the brand system (color/typography/spacing/radius/shadow/motion). Output formats: `tokens.css`, `tokens.js`, `tokens.d.ts`. No framework dependencies. | aster-cloud (via Tailwind config), aster-lang-dev (via VitePress theme override) |
| `@aster/ui` | React component primitives (Button, Card, Input, Dialog, …) built on top of `@aster/tokens`. Uses `class-variance-authority` for variants. | aster-cloud only — aster-lang-dev is Vue/VitePress and consumes only the tokens. |

## Brand basics

- **Primary**: deep violet `#6D28D9` family — "authority, structured thought"
- **Accent**: electric blue `#0EA5E9` family — "AI/streaming/interactivity"
- **Display type**: `Fraunces` (variable serif, free) — wordmark + headings
- **UI type**: `Inter` (variable sans) — body, controls
- **Code type**: `JetBrains Mono` — editor, code blocks

## Workflow

1. Develop tokens/components in `packages/`.
2. Preview in `apps/storybook` (`pnpm storybook`).
3. Once a token/component lands, bump its package version, publish, and pin
   from the consumer apps.

## Why a separate repo (not a monorepo with the apps)

aster-cloud and aster-lang-dev each have their own git history and CI cadence;
forcing them into a top-level monorepo would mean rewriting both deploy paths
mid-redesign. A separate published package gives us version pinning,
independent release cycles, and the option to ship the system externally.
