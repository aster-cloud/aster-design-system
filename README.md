# Aster Design System

Shared brand tokens and UI primitives consumed by both `aster-cloud` (SaaS) and
`aster-lang-dev` (developer portal). The goal is **100% visual identity**
between the two sites — same colors, typography, spacing rhythm — so users move
between marketing → docs → product without "did I just leave the site?"
friction.

## Packages

| Package | Role | Published to npm? | Consumers |
|---|---|---|---|
| `@aster-cloud/tokens` | CSS variables + JS/TS exports of the brand system (color/typography/spacing/radius/shadow/motion). No framework dependencies. Build output: `dist/esm/` (ESM + `.d.ts`), `dist/cjs/` (CommonJS + `.d.ts`), `dist/tokens.css`. Subpath exports: `.` (token objects, default export is the Tailwind preset), `./tokens.css`, `./tailwind-preset`. | Yes | aster-cloud (via `./tailwind-preset`), aster-lang-dev (via `./tokens.css` in the VitePress theme override) |
| `@aster-cloud/ui` | React component primitives (Button, Card, Input, Dialog, …) built on top of `@aster-cloud/tokens`. Uses `class-variance-authority` for variants. ESM-only `dist/`. | Yes | aster-cloud only — aster-lang-dev is Vue/VitePress and consumes only the tokens. |
| `@aster-cloud/glossary` | Single source of truth for cross-locale terminology (`src/terms/`, `src/locales.yaml`) plus the scanner library. Subpath exports: `./loader`, `./scanner`, `./manifest`, `./denylist`, `./schema`, `./locale-utils`, `./export-json`, `./locales`. Published with npm provenance. | Yes | aster-cloud `check-glossary`, aster-lang-dev `check-locale-parity` |
| `@aster-cloud/glossary-fmt` | Formatter + linter CLI (`glossary-fmt`) for `glossary:block` markers in Markdown. Depends on `@aster-cloud/glossary`. | **No — workspace-only.** It has no step in `publish.yml` and does not exist on the registry; its `publishConfig` is not a publish decision. | This repo only |

## Brand basics

- **Primary**: deep violet `#6D28D9` family — "authority, structured thought"
- **Accent**: electric blue `#0EA5E9` family — "AI/streaming/interactivity"
- **Display type**: `Fraunces` (variable serif, free) — wordmark + headings
- **UI type**: `Inter` (variable sans) — body, controls
- **Code type**: `JetBrains Mono` — editor, code blocks

## Workflow

1. Develop tokens/components/glossary in `packages/`.
2. Preview in `apps/storybook` (`pnpm storybook`).
3. Bump the version of each package you changed in `packages/*/package.json`,
   commit, then tag `vX.Y.Z`. The `Publish` workflow fires on tag push, runs
   the quality gate (build → typecheck → Storybook story tests in chromium),
   then publishes `@aster-cloud/tokens`, `@aster-cloud/ui` and
   `@aster-cloud/glossary` to **public npm**. A package whose version is
   already on the registry is skipped, so a ui-only bump does not force a
   tokens or glossary bump.

## Publishing

Packages live on **public npm** under the `@aster-cloud` scope — the same
scope that already publishes `@aster-cloud/aster-lang-ts`. Public visibility
is fine: design tokens aren't IP, and it means consumer apps need zero
registry configuration.

Tag-driven release:

```bash
# 1. Bump versions in packages/tokens, packages/ui and/or packages/glossary
# 2. Commit + tag
git tag v0.1.1
git push origin v0.1.1
```

The `Publish` workflow (`.github/workflows/publish.yml`) fires on the tag and
ships the three packages in dependency order: tokens → ui → glossary. It can
also be started by hand (`workflow_dispatch`) to republish without retagging.
Required: `NPM_TOKEN` GitHub secret with `publish` access to the
`@aster-cloud` scope on npmjs.org. The job runs with `id-token: write` because
`@aster-cloud/glossary` sets `publishConfig.provenance: true` and npm mints the
attestation from the GitHub Actions OIDC identity.

Manual publish (only if CI is broken):

```bash
npm login --scope=@aster-cloud --registry=https://registry.npmjs.org
pnpm build
pnpm --filter @aster-cloud/tokens   publish --no-git-checks --access=public
pnpm --filter @aster-cloud/ui       publish --no-git-checks --access=public
# glossary opts into provenance (publishConfig.provenance: true), which npm
# can only mint from a CI OIDC identity. A local publish must switch it off.
pnpm --filter @aster-cloud/glossary publish --no-git-checks --access=public --provenance=false
```

`@aster-cloud/glossary-fmt` is **not** part of either path: it is currently
workspace-only (consumed inside this repo via `workspace:*`) and is not
published to npm. Do not add it to the commands above unless that changes.

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
