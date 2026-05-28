# Changelog — @aster-cloud/ui

All notable changes to this package are documented here. Semantic versioning
([semver.org](https://semver.org)) is followed.

## [Unreleased]

## [0.3.0] — 2026-05-22

### Changed
- Bumped from `0.2.0` alongside `@aster-cloud/tokens@0.2.0`.
  **Non-breaking; bump tracks tokens semver for downstream clarity.**

### Added
- Component-adjacent Storybook stories for P0 components (Button, Input,
  Card, Container, Toaster).
- Axe-core a11y gates in Storybook CI (Chromatic).
- Visual-diff baselines committed for default + dark themes.

### Migration notes (0.2.0 → 0.3.0)
- No API change. Consumers can update transitively.
- Pair with `@aster-cloud/tokens@^0.2.0` (CSS variable contract is identical).

## [0.2.0]

### Added
- Renamed package scope from internal to `@aster-cloud/ui`.
- First public npm publish.
- Components: `Button`, `Input`, `Card`, `Container`, `Toaster`. All use
  `@aster-cloud/tokens` for color/spacing/typography.
- CVA-based variants for `Button` (3 intents × 3 sizes × disabled).
- Focus-visible ring via `shadow-ring` design token (no raw `outline`).

## [0.1.0]
### Added
- Initial scaffold inside `aster-design-system` monorepo bootstrap.

[Unreleased]: https://github.com/aster-cloud/aster-design-system/compare/ui-v0.3.0...HEAD
[0.3.0]: https://github.com/aster-cloud/aster-design-system/compare/ui-v0.2.0...ui-v0.3.0
[0.2.0]: https://github.com/aster-cloud/aster-design-system/compare/ui-v0.1.0...ui-v0.2.0
