# Aster Design System — Storybook

Browsable showcase of `@aster-cloud/ui` components and `@aster-cloud/tokens`
foundations. Deployed to Cloudflare Pages on every push to `main`; PRs get
a preview URL.

## Local development

```sh
# From the repo root — REQUIRED on a fresh checkout because Storybook
# imports @aster-cloud/ui and @aster-cloud/tokens from their built dist/.
pnpm install
pnpm build

# Then start Storybook
pnpm --filter storybook dev   # http://localhost:6006
```

Skipping `pnpm build` will fail with "Cannot find module
`@aster-cloud/ui`" or a blank token theme because the workspace `exports`
field points at `dist/`.

## Story sidebar layout

```
00 Foundations
  Brand            wordmark + identity
  Color            ramps, semantic roles, theme compare
  Typography       families, scale, code

01 Actions          Button
02 Forms            Input, Select
03 Feedback         Alert, Badge, EmptyState
04 Navigation       Dropdown, PageHeader
05 Data             DataTable
06 Overlays         ConfirmDialog
```

Component stories live next to their source (e.g.
`packages/ui/src/Button.stories.tsx`). When you add a component, add the
story file beside it — `tsconfig.json` and `package.json` are configured
to exclude `*.stories.*` from the published npm tarball.

## Accessibility

`@storybook/addon-a11y` is wired in. The Accessibility panel runs axe
against WCAG 2.1 AA rules on every story. Per-story rule disables (e.g.
`color-contrast` on raw palette swatches) live in the story file
`parameters.a11y.config.rules`.
