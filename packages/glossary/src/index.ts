// Public entrypoint for @aster-cloud/glossary.
//
// Consumers typically do:
//   import { glossary } from '@aster-cloud/glossary';
//   const term = glossary.terms['envelope-encryption'];
//
// Heavier paths (scanner, manifest verification, denylist fetching)
// are not auto-loaded; consumers import from `./scanner`, `./manifest`,
// `./denylist` as needed.

import { loadGlossary } from './loader.js';
import type { Glossary } from './schema.js';

// Eager-load at module init. If validation fails, this throws synchronously
// during the consumer's `import` — fail-closed is the contract.
export const glossary: Glossary = loadGlossary();

// Re-exports for convenience.
export * from './schema.js';
export { loadGlossary, loadFromExport, validateGlossaryExportShape, GlossaryValidationError } from './loader.js';
export {
  parseLocaleTag,
  matchLocaleSegment,
  localeFromPathSegment,
  stripLocaleSegment,
  shortLocaleTokens,
  type ParsedLocale,
} from './locale-utils.js';
