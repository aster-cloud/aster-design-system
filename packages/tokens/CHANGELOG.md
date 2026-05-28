# Changelog — @aster-cloud/tokens

All notable changes to this package are documented here. Semantic versioning
([semver.org](https://semver.org)) is followed.

## [Unreleased]

## [0.2.0] — 2026-05-22

### Changed
- Bumped from `0.1.0`. **Non-breaking color additions and a11y polish; no
  semantic token names changed.**

### Added
- Chromatic a11y polish: 92 violations resolved across Storybook P0 stories.
  Token contrast pairs now verified against WCAG AA targets (4.5:1 small text,
  3:1 large text) for both light and dark surface mappings.
- Reverted experimental violet-700 primary shift; stayed on violet-600 as the
  accent base.

### Migration notes (0.1.0 → 0.2.0)
- No changes required. Token names, exports, and CSS variable contracts are
  identical to 0.1.0; consumers can update transitively.

## [0.1.0] — 2026-W1 baseline

### Added
- Initial public release on npm under `@aster-cloud` scope (migrated from
  GitHub Packages).
- Token scales for `violet`, `sky`, `emerald`, `amber`, `rose`, `zinc`
  (50–950 each).
- Semantic surface mappings: `bg`, `bg-muted`, `bg-subtle`, `fg`, `fg-muted`,
  `fg-subtle`, `border`, `border-muted`, `primary`, `accent`, `success`,
  `warning`, `danger`.
- CSS variable wiring via `tokens.css`; Tailwind preset via
  `tailwind-preset.js`.
- Light + dark mode parity via `[data-theme]` attribute selector.
- ESM + CJS dual output; types via `index.d.ts`.

[Unreleased]: https://github.com/aster-cloud/aster-design-system/compare/tokens-v0.2.0...HEAD
[0.2.0]: https://github.com/aster-cloud/aster-design-system/compare/tokens-v0.1.0...tokens-v0.2.0
[0.1.0]: https://github.com/aster-cloud/aster-design-system/releases/tag/tokens-v0.1.0
