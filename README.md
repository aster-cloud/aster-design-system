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

Packages live on GitHub Packages under the `@aster-cloud` scope. CI uses
`GITHUB_TOKEN` for auth — no PAT required because the repo owner matches
the scope.

To cut a release locally (mirror of what CI does):

```bash
# 1. Bump versions in packages/tokens + packages/ui
# 2. Commit + tag
git tag v0.1.1
git push origin v0.1.1
```

Manual publish (only if CI is broken):

```bash
# Auth: create a classic PAT with `write:packages` + `read:packages` scopes
# Export it as GITHUB_TOKEN (.npmrc reads from env).
export GITHUB_TOKEN=ghp_xxx
pnpm build
pnpm --filter @aster-cloud/tokens publish --no-git-checks --access=restricted
pnpm --filter @aster-cloud/ui     publish --no-git-checks --access=restricted
```

## Consuming from aster-cloud / aster-lang-dev

Both consumer apps need an `.npmrc` so pnpm knows where to fetch the
scope from:

```
@aster-cloud:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

In dev: set `GITHUB_TOKEN` in your shell. In CI: pass it via the
workflow's `secrets.GITHUB_TOKEN` (or a PAT secret if the consumer repo
lives outside the `aster-cloud` org).

Then standard install works:

```bash
pnpm add @aster-cloud/tokens @aster-cloud/ui
```

## Why a separate repo (not a monorepo with the apps)

aster-cloud and aster-lang-dev each have their own git history and CI cadence;
forcing them into a top-level monorepo would mean rewriting both deploy paths
mid-redesign. A separate published package gives us version pinning,
independent release cycles, and the option to ship the system externally.
