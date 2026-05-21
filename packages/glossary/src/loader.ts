// loadGlossary() — reads YAML files under terms/, locales.yaml, validates
// against the Zod schemas in schema.ts, applies cross-term business
// rules (homonym collision detection, alias-vs-translation cycles,
// every term covers every locale), returns a frozen Glossary object.
//
// Throws GlossaryValidationError on any violation. Callers (scanner,
// CI scripts, Java exporter) treat the throw as fail-closed.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  GlossarySchema,
  LocalesFileSchema,
  TermsFileSchema,
  type Glossary,
  type Term,
  type Locale,
} from './schema.js';

export class GlossaryValidationError extends Error {
  constructor(
    message: string,
    public readonly details: ReadonlyArray<string> = [],
  ) {
    super(`[glossary] ${message}\n  - ${details.join('\n  - ')}`);
    this.name = 'GlossaryValidationError';
  }
}

export interface LoadGlossaryOptions {
  /** Override the default `src/` root (used by tests). */
  rootDir?: string;
}

/**
 * Load + validate the glossary from disk.
 * Defaults to reading from the package's own `src/` directory so
 * consumers using a bundled glossary.export.json don't pay this cost
 * at runtime — they should use `loadFromExport()` instead.
 */
export function loadGlossary(opts: LoadGlossaryOptions = {}): Glossary {
  const root = opts.rootDir ?? resolve(dirname(new URL(import.meta.url).pathname), '..', 'src');
  const localesPath = join(root, 'locales.yaml');
  if (!existsSync(localesPath)) {
    throw new GlossaryValidationError(`locales.yaml not found at ${localesPath}`);
  }
  const localesRaw = parseYaml(readFileSync(localesPath, 'utf8'));
  const localesParsed = LocalesFileSchema.safeParse(localesRaw);
  if (!localesParsed.success) {
    throw new GlossaryValidationError(
      'locales.yaml failed schema validation',
      localesParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }

  const termsDir = join(root, 'terms');
  if (!existsSync(termsDir)) {
    throw new GlossaryValidationError(`terms/ directory not found at ${termsDir}`);
  }
  const termFiles = readdirSync(termsDir).filter((f) => f.endsWith('.yaml'));
  if (termFiles.length === 0) {
    throw new GlossaryValidationError(`no term files in ${termsDir}`);
  }

  const allTerms: Record<string, Term> = {};
  const issues: string[] = [];

  for (const file of termFiles) {
    const filePath = join(termsDir, file);
    const raw = parseYaml(readFileSync(filePath, 'utf8'));
    const parsed = TermsFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push(`${file}: ${issue.path.join('.')}: ${issue.message}`);
      }
      continue;
    }
    for (const [id, term] of Object.entries(parsed.data.terms)) {
      if (id !== term.id) {
        issues.push(`${file}: term key "${id}" does not match term.id "${term.id}"`);
      }
      if (allTerms[id]) {
        issues.push(`${file}: duplicate term id "${id}" (also defined elsewhere)`);
      } else {
        allTerms[id] = term;
      }
    }
  }

  // Cross-cutting business rules. Pure Zod can't express these.
  const locales = localesParsed.data.locales.map((l) => l.id);
  const backboneLocale = localesParsed.data.locales.find((l) => l.role === 'backbone')!.id;

  for (const [id, term] of Object.entries(allTerms)) {
    // 1. Every term covers every locale.
    for (const loc of locales) {
      if (!(loc in term.translations)) {
        issues.push(`${id}: missing translation for locale "${loc}"`);
      }
    }
    // 2. user-facing terms must have non-empty translations after trim
    //    (schema.min(1) only catches the empty string; whitespace-only slips through).
    if (term['user-facing']) {
      for (const loc of locales) {
        const t = term.translations[loc];
        if (!t || t.trim().length === 0) {
          issues.push(`${id}: user-facing term has empty/whitespace-only translation for "${loc}"`);
        }
      }
    }
    // 3. Backbone translation must exist.
    if (!term.translations[backboneLocale]) {
      issues.push(`${id}: backbone-locale "${backboneLocale}" translation missing`);
    }
    // 4. reviewed-regex patterns must compile + not match the empty string
    //    (empty-match patterns like `.*?` or `^` deadlock the scanner's
    //    `while (re.exec())` loop because lastIndex doesn't advance).
    if (term.match.mode === 'reviewed-regex') {
      for (const loc of locales) {
        const pattern = term.translations[loc];
        if (!pattern) continue;
        validateRegex(issues, `${id}: reviewed-regex pattern for "${loc}"`, pattern, term.match['case-sensitive']);
      }
    }
    // 4b. forbidden-alias regex validation is INDEPENDENT of term.match.mode.
    //     A phrase term can carry a reviewed-regex alias; that alias's regex
    //     must still be validated at load time. (Round-2 codex finding: the
    //     check was previously nested inside the `term.match.mode ===
    //     'reviewed-regex'` branch, so phrase-mode terms slipped through.)
    for (const [loc, aliases] of Object.entries(term['forbidden-aliases'])) {
      for (const alias of aliases) {
        if (alias.match.mode !== 'reviewed-regex') continue;
        validateRegex(
          issues,
          `${id}: forbidden-alias[${loc}] regex "${alias.text}"`,
          alias.text,
          alias.match['case-sensitive'],
        );
      }
    }
  }

  // 4. Cross-cycle: a translation must not appear as another term's forbidden-alias text.
  type LocalAlias = { termId: string; locale: string; text: string };
  const allAliases: LocalAlias[] = [];
  for (const [id, term] of Object.entries(allTerms)) {
    for (const [locale, aliases] of Object.entries(term['forbidden-aliases'])) {
      for (const a of aliases) {
        allAliases.push({ termId: id, locale, text: a.text });
      }
    }
  }
  for (const [id, term] of Object.entries(allTerms)) {
    for (const [locale, translation] of Object.entries(term.translations)) {
      const colliding = allAliases.find(
        (a) => a.termId !== id && a.locale === locale && normalizeForCompare(a.text) === normalizeForCompare(translation),
      );
      if (colliding) {
        issues.push(
          `${id}: translation[${locale}]="${translation}" collides with ${colliding.termId}.forbidden-aliases[${locale}]`,
        );
      }
    }
  }

  // 5. Homonym integrity: two terms whose translation strings collide in any locale
  //    must both declare distinct `sense` + `disambiguation`.
  for (let i = 0; i < Object.keys(allTerms).length; i++) {
    const ids = Object.keys(allTerms);
    for (let j = i + 1; j < ids.length; j++) {
      const a = allTerms[ids[i]!]!;
      const b = allTerms[ids[j]!]!;
      for (const loc of locales) {
        if (
          a.translations[loc] &&
          b.translations[loc] &&
          normalizeForCompare(a.translations[loc]!) === normalizeForCompare(b.translations[loc]!)
        ) {
          if (!a.sense || !b.sense || a.sense === b.sense) {
            issues.push(
              `homonym collision: "${a.translations[loc]}" used by both ${a.id} and ${b.id} in ${loc} without distinct senses`,
            );
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new GlossaryValidationError('term files failed validation', issues);
  }

  const glossary = GlossarySchema.parse({
    version: 1,
    localesVersion: localesParsed.data.localesVersion,
    locales: localesParsed.data.locales,
    terms: allTerms,
  });

  return Object.freeze(glossary);
}

/** Load from the flat key-value export bundled with the package. Fast path. */
export function loadFromExport(exportPath: string): Glossary {
  if (!existsSync(exportPath)) {
    throw new GlossaryValidationError(`export-json not found at ${exportPath}`);
  }
  const raw = JSON.parse(readFileSync(exportPath, 'utf8'));
  const parsed = GlossarySchema.safeParse(raw);
  if (!parsed.success) {
    throw new GlossaryValidationError(
      'glossary.export.json failed schema validation',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }
  return Object.freeze(parsed.data);
}

function normalizeForCompare(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Compile a reviewed-regex pattern at load time. Fails the loader if:
 *   - the pattern is malformed (SyntaxError) — would have crashed the scanner
 *   - the pattern matches the empty string — would deadlock the
 *     `while (re.exec())` loop because `lastIndex` never advances
 *
 * `caseSensitive=false` mirrors the scanner's `giu` flag set.
 */
function validateRegex(
  issues: string[],
  label: string,
  pattern: string,
  caseSensitive: boolean,
): void {
  let re: RegExp;
  try {
    re = new RegExp(pattern, caseSensitive ? 'gu' : 'giu');
  } catch (e) {
    issues.push(`${label} failed to compile: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (re.test('')) {
    issues.push(`${label} matches empty string — would deadlock scanner (refusing to load)`);
  }
}

// Re-exports for convenience
export type { Glossary, Term, Locale };
