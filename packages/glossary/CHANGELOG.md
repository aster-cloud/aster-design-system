# Changelog — @aster-cloud/glossary

All notable changes to this package are documented here. Semantic versioning
([semver.org](https://semver.org)) is followed.

## [Unreleased]

## [0.1.3] — 2026-10-25

### Fixed
- Installing the package under a path containing a space or a URL-reserved
  character (`%`, `#`) made `import '@aster-cloud/glossary'` throw
  `locales.yaml not found at …%20…`: the default root was derived from
  `URL.pathname` without decoding. `loader` and `fetchWithRetry` now convert
  `file:` URLs with `fileURLToPath`. (#16)

### Removed
- The `./terms` subpath export. It was a trailing-slash directory mapping
  (Node DEP0166) that could not resolve any file under current Node, and no
  known consumer imported it. The YAML files under `src/terms/` are still
  published; load them through `./loader`. (#19)
