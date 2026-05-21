// Locale-tag parsing utilities shared by core scanner and consumer drivers.
//
// Goals:
//   - Robust BCP-47 parsing covering the shapes our consumers actually hit:
//     `xx`, `xx-XX`, `xx-Xxxx`, `xx-Xxxx-XX`, `xx-XX-variant`, `xxx-XXX`.
//   - Distinguish two locales that share a primary subtag but differ on
//     region/script (e.g. `zh-CN` vs `zh-TW`, `pt-BR` vs `pt-PT`).
//   - Provide a single source of truth so consumers stop hand-rolling regexes.
//
// We deliberately do NOT implement full RFC 5646 — Aster only registers
// locales it actually ships, and the loader catches anything weirder via the
// glossary's `LocaleIdSchema`.

import type { Locale, LocaleId } from './schema.js';

export interface ParsedLocale {
  /** Original input, NFKC-normalised + lowercased for stable comparison. */
  normalized: string;
  /** ISO 639 language code (2-3 lowercase letters). */
  language: string;
  /** Optional ISO 15924 script subtag (4 letters, capitalized in canonical form). */
  script?: string;
  /** Optional region subtag (ISO 3166-1 alpha-2 or UN M.49 numeric). */
  region?: string;
  /** Remaining variants / extensions, lowercased, joined by '-'. */
  rest?: string;
}

/**
 * Parse a BCP-47-ish locale tag into its primary subtags. Returns `null` if
 * the tag doesn't even have a valid language subtag — callers should treat
 * that as a contract violation, not silently fall back.
 *
 * Accepted shapes (case-insensitive on input, canonical case on output):
 *   en              → { language: 'en' }
 *   en-US           → { language: 'en', region: 'US' }
 *   zh-Hans         → { language: 'zh', script: 'Hans' }
 *   zh-Hant-TW      → { language: 'zh', script: 'Hant', region: 'TW' }
 *   es-419          → { language: 'es', region: '419' }     // UN M.49 numeric
 *   de-DE-1996      → { language: 'de', region: 'DE', rest: '1996' }
 */
export function parseLocaleTag(tag: string): ParsedLocale | null {
  if (typeof tag !== 'string' || tag.length === 0) return null;
  const normalized = tag.normalize('NFKC').trim().toLowerCase();
  const parts = normalized.split('-').filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  const language = parts[0]!;
  if (!/^[a-z]{2,3}$/.test(language)) return null;

  let i = 1;
  let script: string | undefined;
  let region: string | undefined;
  const restParts: string[] = [];

  if (i < parts.length && /^[a-z]{4}$/.test(parts[i]!)) {
    script = capitalize(parts[i]!);
    i++;
  }
  if (i < parts.length && /^([a-z]{2}|[0-9]{3})$/.test(parts[i]!)) {
    region = parts[i]!.toUpperCase();
    i++;
  }
  while (i < parts.length) {
    restParts.push(parts[i]!);
    i++;
  }

  return {
    normalized,
    language,
    script,
    region,
    rest: restParts.length ? restParts.join('-') : undefined,
  };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Test whether a path segment names one of the registered locales.
 *
 * Match strategy:
 *   1. Exact full-tag match (`zh-CN` segment vs `zh-CN` locale id) wins.
 *   2. If the segment is bare (primary subtag only, e.g. `zh`) and EXACTLY ONE
 *      registered locale shares that primary subtag, return that locale.
 *      This preserves the legacy `docs/zh/` layout while disambiguating
 *      when both `zh-CN` and `zh-TW` are registered (in which case the
 *      bare `zh` segment returns null — caller must use the explicit tag).
 *   3. Otherwise null.
 */
export function matchLocaleSegment(
  segment: string,
  registeredLocales: ReadonlyArray<Locale>,
): LocaleId | null {
  const parsed = parseLocaleTag(segment);
  if (!parsed) return null;

  // 1. Exact full-tag match — every subtag must agree including variants
  //    (`rest`). Without the rest check, `de-DE-1996` would falsely match
  //    `de-DE` and a stray `docs/de-DE-1996/` directory could be stripped
  //    as if it were a registered locale.
  for (const loc of registeredLocales) {
    const reg = parseLocaleTag(loc.id);
    if (!reg) continue;
    if (
      reg.language === parsed.language &&
      reg.script === parsed.script &&
      reg.region === parsed.region &&
      reg.rest === parsed.rest
    ) {
      return loc.id;
    }
  }

  // 2. Bare primary subtag → unambiguous fallback only.
  if (parsed.script === undefined && parsed.region === undefined && !parsed.rest) {
    const candidates = registeredLocales.filter((loc) => {
      const reg = parseLocaleTag(loc.id);
      return reg !== null && reg.language === parsed.language;
    });
    if (candidates.length === 1) return candidates[0]!.id;
  }
  return null;
}

/**
 * Try to read a locale from the first path segment after `<rootDir>/`, e.g.
 * `docs/zh-CN/intro.md` → `zh-CN`. Returns the matching registered LocaleId
 * or `null` if no segment matches.
 *
 * Returns null (not the backbone) when no match is found — the caller decides
 * whether that means "treat as backbone" or "raise a typo warning".
 */
export function localeFromPathSegment(
  path: string,
  rootDir: string,
  registeredLocales: ReadonlyArray<Locale>,
): LocaleId | null {
  const rootWithSlash = rootDir.endsWith('/') ? rootDir : rootDir + '/';
  if (!path.startsWith(rootWithSlash)) return null;
  const after = path.slice(rootWithSlash.length);
  const slash = after.indexOf('/');
  if (slash <= 0) return null;
  const segment = after.slice(0, slash);
  return matchLocaleSegment(segment, registeredLocales);
}

/**
 * Strip a registered-locale directory segment immediately after `<rootDir>/`
 * from a path. Used by consumers to derive a stable `pairKey` so cross-locale
 * mirrors share the same key. Unrecognized segments are left intact —
 * `docs/api/intro.md` stays `docs/api/intro.md`.
 */
export function stripLocaleSegment(
  path: string,
  rootDir: string,
  registeredLocales: ReadonlyArray<Locale>,
): string {
  const rootWithSlash = rootDir.endsWith('/') ? rootDir : rootDir + '/';
  if (!path.startsWith(rootWithSlash)) return path;
  const after = path.slice(rootWithSlash.length);
  const slash = after.indexOf('/');
  if (slash <= 0) return path;
  const segment = after.slice(0, slash);
  if (matchLocaleSegment(segment, registeredLocales) === null) return path;
  return rootWithSlash + after.slice(slash + 1);
}

/**
 * Set of short language tokens (primary subtags) drawn from registered
 * locales. Useful for legacy `docs/<short>/...` layouts where the locale
 * directory uses only the primary subtag (e.g. `docs/zh/foo.md` rather than
 * `docs/zh-CN/foo.md`).
 *
 * When two registered locales share a primary subtag (e.g. zh-CN and
 * zh-TW), the short-token form is ambiguous and the function records both;
 * callers using shortLocaleTokens should treat ambiguous matches as warnings.
 */
export function shortLocaleTokens(
  registeredLocales: ReadonlyArray<Locale>,
): { tokens: Set<string>; ambiguous: Set<string> } {
  const counts = new Map<string, number>();
  for (const loc of registeredLocales) {
    const parsed = parseLocaleTag(loc.id);
    if (!parsed) continue;
    counts.set(parsed.language, (counts.get(parsed.language) ?? 0) + 1);
  }
  const tokens = new Set(counts.keys());
  const ambiguous = new Set<string>();
  for (const [token, count] of counts) {
    if (count > 1) ambiguous.add(token);
  }
  return { tokens, ambiguous };
}
