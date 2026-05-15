# Aster Design System

Shared brand tokens and UI primitives consumed by both `aster-cloud` (SaaS) and
`aster-lang-dev` (developer portal). The goal is **100% visual identity**
between the two sites — same colors, typography, spacing rhythm — so users move
between marketing → docs → product without "did I just leave the site?"
friction.

## Packages

| Package | Role | Consumers |
|---|---|---|
| `@aster-cloud/tokens` | CSS variables + JS/TS exports of the brand system (color/typography/spacing/radius/shadow/motion). Output formats: `tokens.css`, `tokens.js`, `tokens.d.ts`. No framework dependencies. | aster-cloud (via Tailwind config), aster-lang-dev (via VitePress theme override) |
| `@aster-cloud/ui` | React component primitives (Button, Card, Input, Dialog, …) built on top of `@aster-cloud/tokens`. Uses `class-variance-authority` for variants. | aster-cloud only — aster-lang-dev is Vue/VitePress and consumes only the tokens. |

## Brand basics

- **Primary**: deep violet `#6D28D9` family — "authority, structured thought"
- **Accent**: electric blue `#0EA5E9` family — "AI/streaming/interactivity"
- **Display type**: `Fraunces` (variable serif, free) — wordmark + headings
- **UI type**: `Inter` (variable sans) — body, controls
- **Code type**: `JetBrains Mono` — editor, code blocks

## Workflow

1. Develop tokens/components in `packages/`.
2. Preview in `apps/storybook` (`pnpm storybook`).
3. Bump version in `packages/*/package.json`, commit, then tag `vX.Y.Z`.
   The `Publish` workflow fires on tag push and ships both packages to
   GitHub Packages.

## Publishing

Packages live on **public npm** under the `@aster-cloud` scope — the same
scope that already publishes `@aster-cloud/aster-lang-ts`. Public visibility
is fine: design tokens aren't IP, and it means consumer apps need zero
registry configuration.

Tag-driven release:

```bash
# 1. Bump versions in packages/tokens + packages/ui
# 2. Commit + tag
git tag v0.1.1
git push origin v0.1.1
```

The `Publish` workflow fires on the tag and ships both packages.
Required: `NPM_TOKEN` GitHub secret with `publish` access to the
`@aster-cloud` scope on npmjs.org.

Manual publish (only if CI is broken):

```bash
npm login --scope=@aster-cloud --registry=https://registry.npmjs.org
pnpm build
pnpm --filter @aster-cloud/tokens publish --no-git-checks --access=public
pnpm --filter @aster-cloud/ui     publish --no-git-checks --access=public
```

## Consuming from aster-cloud / aster-lang-dev

```bash
pnpm add @aster-cloud/tokens     # in aster-lang-dev (tokens only)
pnpm add @aster-cloud/tokens @aster-cloud/ui   # in aster-cloud
```

No `.npmrc`, no auth, no token env vars. The scope resolves on default
public npm.

## Why a separate repo (not a monorepo with the apps)

aster-cloud and aster-lang-dev each have their own git history and CI cadence;
forcing them into a top-level monorepo would mean rewriting both deploy paths
mid-redesign. A separate published package gives us version pinning,
independent release cycles, and the option to ship the system externally.
