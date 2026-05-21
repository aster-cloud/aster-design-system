// AST-aware scanner for cross-locale terminology enforcement.
//
// Three pieces (plan §4.1):
//   (a) Surface adapters — extract scannable string regions from JSON,
//       Markdown, etc. AST-aware: JSON adapter knows key paths;
//       Markdown adapter walks remark AST + pairs blocks via §1.5
//       block-IDs; skip fenced code, link URLs, frontmatter.
//   (b) Term matcher — `literal | phrase | reviewed-regex` per term;
//       `Intl.Segmenter` for unicode word boundaries; normalization
//       (case/width/punctuation/whitespace).
//   (c) Cross-locale comparator — for each backbone match, look up
//       the corresponding target-locale segment by JSON key path or
//       Markdown block-id and assert presence of registered translation.
//
// `applies-to` is REPORTING-ONLY (plan §1.4); never excludes scanning.

import { readFileSync } from 'node:fs';
import { parse as parseYamlString } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Heading, Paragraph, Text, RootContent } from 'mdast';
import type { Glossary, Term, LocaleId, Match, ForbiddenAlias } from './schema.js';

// ───────── Public types ─────────

export interface ScanIssue {
  severity: 'error' | 'warning';
  rule:
    | 'forbidden-alias'
    | 'glossary-completeness'
    | 'term-mention-parity'
    | 'surface-coverage'
    | 'backbone-revision-freshness'
    | 'untranslated-tokens'
    | 'orphan-block'
    | 'missing-block-pair';
  surfacePath: string;
  locale?: LocaleId;
  termId?: string;
  detail: string;
  /** Original key-path or block-id for human navigation. */
  anchor?: string;
}

export interface ScanResult {
  issues: ReadonlyArray<ScanIssue>;
  errorCount: number;
  warningCount: number;
}

export interface ScanConfig {
  /** Glossary instance to validate against. */
  glossary: Glossary;
  /** Backbone locale id (default: glossary.locales[].role==='backbone'). */
  backboneLocale?: LocaleId;
  /** Product names / technical strings to skip during term matching. */
  untranslatedTokens?: ReadonlyArray<string>;
  /** When true, every warning counts as an error (CI `--strict`). */
  strict?: boolean;
}

// ───────── Term matcher ─────────

/** Returns positions in `haystack` where `term`'s translation for `locale` appears under its match rules. */
export function findTermMatches(
  haystack: string,
  needle: string,
  match: Match,
): Array<{ start: number; end: number }> {
  if (haystack.length === 0 || needle.length === 0) return [];
  const matches: Array<{ start: number; end: number }> = [];

  if (match.mode === 'literal') {
    let i = 0;
    const cmpHay = match['case-sensitive'] ? haystack : haystack.toLowerCase();
    const cmpNeedle = match['case-sensitive'] ? needle : needle.toLowerCase();
    while (true) {
      const idx = cmpHay.indexOf(cmpNeedle, i);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + needle.length });
      i = idx + needle.length;
    }
    return matches;
  }

  if (match.mode === 'reviewed-regex') {
    if (!match['regex-rationale']) {
      throw new Error(`reviewed-regex without rationale: needle=${needle.slice(0, 20)}`);
    }
    const flags = match['case-sensitive'] ? 'gu' : 'giu';
    let re: RegExp;
    try {
      re = new RegExp(needle, flags);
    } catch (e) {
      // Should never happen — loader.ts validates at load time. Defensive
      // fallback: surface as no matches rather than crashing the entire scan.
      return matches;
    }
    let m: RegExpExecArray | null;
    let iterations = 0;
    const maxIterations = haystack.length + 1;  // upper bound: one match per position max
    while ((m = re.exec(haystack)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0]!.length });
      // Empty-match guard: force lastIndex forward so we don't spin.
      if (m[0]!.length === 0) re.lastIndex++;
      if (++iterations > maxIterations) {
        // Pathological regex (loader should have caught this). Bail out.
        break;
      }
    }
    return matches;
  }

  // phrase mode: Unicode word-boundary aware.
  const normalize = (s: string) => applyNormalize(s, match.normalize ?? []);
  const normHay = normalize(haystack);
  const normNeedle = normalize(needle);
  const cmpHay = match['case-sensitive'] ? normHay : normHay.toLowerCase();
  const cmpNeedle = match['case-sensitive'] ? normNeedle : normNeedle.toLowerCase();
  // Pre-compute the boundary set ONCE per haystack. Without this, every
  // candidate position rebuilt the Intl.Segmenter from scratch (O(N²)).
  const boundaries = match.boundary === 'none' ? null : computeBoundarySet(cmpHay);
  let i = 0;
  while (true) {
    const idx = cmpHay.indexOf(cmpNeedle, i);
    if (idx === -1) break;
    let pass = true;
    if (boundaries) {
      const startIsBoundary = isWordBoundary(cmpHay, idx, boundaries);
      const endIsBoundary = isWordBoundary(cmpHay, idx + cmpNeedle.length, boundaries);
      pass = startIsBoundary && endIsBoundary;
    }
    if (pass) {
      // Positions reported in the NORMALIZED string. surfacePath + anchor
      // are how humans navigate to the actual location; that's by design.
      matches.push({ start: idx, end: idx + cmpNeedle.length });
    }
    i = idx + Math.max(1, cmpNeedle.length);
  }
  return matches;
}

function applyNormalize(s: string, ops: ReadonlyArray<'case' | 'width' | 'punctuation' | 'whitespace'>): string {
  let out = s.normalize('NFC');
  // Always strip zero-width and bidi marks — they are never semantic
  // and are a known adversarial-input vector.
  out = out.replace(/[​-‏‪-‮⁠﻿]/g, '');
  if (ops.includes('width')) {
    // Fullwidth → halfwidth for ASCII range
    out = out.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  }
  if (ops.includes('whitespace')) {
    out = out.replace(/\s+/g, ' ').trim();
  }
  if (ops.includes('punctuation')) {
    // Normalize common Unicode punctuation to ASCII equivalents
    out = out
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‐-―]/g, '-')
      .replace(/　/g, ' '); // ideographic space
  }
  // case is handled by caller (compare lowercased) — listed for completeness
  return out;
}

// Cache of segment-boundary indices per string. Building this is the
// expensive Unicode work; reusing it across many `isWordBoundary` calls
// for the same haystack turns the previous O(N²) scan into O(N + matches).
const boundaryCache = new WeakMap<object, Set<number>>();

function getBoundarySet(s: string): Set<number> {
  // String keys can't go in WeakMap; we wrap in a holder. But strings are
  // primitives — for the common case of scanning the same string repeatedly
  // within one findTermMatches call, we instead memoize per-call using a
  // module-private cache. To keep this simple and avoid the WeakMap trap,
  // use a Map keyed by string identity (the JS engine interns short strings).
  // For long strings the cache miss cost is one segmentation per call.
  return computeBoundarySet(s);
}

function computeBoundarySet(s: string): Set<number> {
  const set = new Set<number>();
  set.add(0);
  set.add(s.length);
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
    for (const it of seg.segment(s) as Iterable<{ index: number }>) {
      set.add(it.index);
    }
  } else {
    const word = /[a-zA-Z0-9_]/;
    for (let i = 1; i < s.length; i++) {
      if (word.test(s[i - 1]!) !== word.test(s[i]!)) set.add(i);
    }
  }
  return set;
}

function isWordBoundary(s: string, idx: number, cache?: Set<number>): boolean {
  if (idx === 0 || idx === s.length) return true;
  const boundaries = cache ?? getBoundarySet(s);
  return boundaries.has(idx);
}

// ───────── JSON surface adapter ─────────

export interface JsonString {
  keyPath: string;
  value: string;
}

/** Flattens a JSON object to (key-path, string-value) pairs. ICU placeholder names are stripped. */
export function flattenJsonStrings(obj: unknown, prefix = ''): JsonString[] {
  const out: JsonString[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      out.push({ keyPath: path, value: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${path}[${i}]`));
      return;
    }
    if (node !== null && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(obj, prefix);
  return out;
}

// ───────── Markdown surface adapter (block-paired) ─────────

export interface MarkdownBlock {
  id: string;
  text: string;
  startLine: number;
}

/** Extract `<!-- glossary:block id=X -->` … `<!-- /glossary:block -->` pairs from Markdown text. */
export function extractGlossaryBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const re = /<!--\s*glossary:block\s+id=([a-z0-9][a-z0-9-]*)\s*-->([\s\S]*?)<!--\s*\/glossary:block\s*-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const startLine = markdown.slice(0, m.index).split('\n').length;
    blocks.push({
      id: m[1]!,
      text: extractProseFromMarkdownBlock(m[2]!),
      startLine,
    });
  }
  return blocks;
}

/** Strip code fences, link URLs, inline code from a Markdown block; keep prose only. */
function extractProseFromMarkdownBlock(md: string): string {
  // Parse via remark and walk text nodes only, skipping code/link nodes.
  const tree = unified().use(remarkParse).parse(md) as Root;
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') {
      return 'skip' as const;
    }
    if (node.type === 'link') {
      // Walk children but skip the URL.
      return undefined;
    }
    if (node.type === 'text') {
      parts.push((node as Text).value);
    }
    return undefined;
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ───────── Main scanner ─────────

export interface JsonSurfaceInput {
  /** e.g. "messages/en.json" */
  path: string;
  /** Locale id (BCP-47-ish) inferred from filename or frontmatter. */
  locale: LocaleId;
  /** Raw JSON content. */
  content: unknown;
  /**
   * Explicit pairing key. Surfaces sharing the same `pairKey` are
   * considered locale siblings (e.g. messages/en.json + messages/de.json
   * → both `pairKey: 'messages'`). When omitted, the scanner falls back
   * to the legacy basename-prefix heuristic but emits a one-time warning
   * on the first surface lacking `pairKey`.
   */
  pairKey?: string;
}

export interface MarkdownSurfaceInput {
  path: string;
  locale: LocaleId;
  content: string;
  /**
   * Explicit pairing key. See {@link JsonSurfaceInput.pairKey}. For
   * Markdown the natural pairKey is the relative path stripped of the
   * locale directory: e.g. `docs/intro.md` and `docs/zh/intro.md` both
   * use `pairKey: 'intro.md'` or whatever stable identifier the caller
   * chooses. Falls back to basename equality with a warning.
   */
  pairKey?: string;
}

export interface ScanInput {
  jsonSurfaces?: ReadonlyArray<JsonSurfaceInput>;
  markdownSurfaces?: ReadonlyArray<MarkdownSurfaceInput>;
}

export function scan(input: ScanInput, config: ScanConfig): ScanResult {
  const backbone = config.backboneLocale ?? findBackbone(config.glossary);
  const issues: ScanIssue[] = [];
  const jsonByPath = new Map<string, Map<string, string>>();
  const mdByPath = new Map<string, MarkdownBlock[]>();

  passGlossaryCompleteness(config, issues);
  passJsonForbiddenAlias(input, config, jsonByPath, issues);
  passMarkdownForbiddenAlias(input, config, mdByPath, issues);
  passJsonTermParity(input, config, backbone, jsonByPath, issues);
  passMarkdownBlockParity(input, config, backbone, mdByPath, issues);
  passBackboneRevisionFreshness(config, backbone, issues);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return { issues, errorCount, warningCount };
}

function passGlossaryCompleteness(config: ScanConfig, issues: ScanIssue[]): void {
  for (const t of Object.values(config.glossary.terms)) {
    for (const loc of config.glossary.locales) {
      if (!(loc.id in t.translations)) {
        issues.push({
          severity: 'error',
          rule: 'glossary-completeness',
          surfacePath: '(glossary)',
          termId: t.id,
          locale: loc.id,
          detail: `term "${t.id}" missing translation for locale "${loc.id}"`,
        });
      }
    }
  }
}

function passJsonForbiddenAlias(
  input: ScanInput,
  config: ScanConfig,
  jsonByPath: Map<string, Map<string, string>>,
  issues: ScanIssue[],
): void {
  for (const surf of input.jsonSurfaces ?? []) {
    const flat = flattenJsonStrings(surf.content);
    jsonByPath.set(surf.path, new Map(flat.map((s) => [s.keyPath, s.value])));
    for (const { keyPath, value } of flat) {
      for (const term of Object.values(config.glossary.terms)) {
        const aliases = term['forbidden-aliases']?.[surf.locale] ?? [];
        for (const alias of aliases) {
          if (findTermMatches(value, alias.text, alias.match).length === 0) continue;
          issues.push({
            severity: 'error',
            rule: 'forbidden-alias',
            surfacePath: surf.path,
            locale: surf.locale,
            termId: term.id,
            anchor: keyPath,
            detail: `forbidden alias "${alias.text}" of term "${term.id}" found in ${surf.locale} (use "${term.translations[surf.locale] ?? '???'}")`,
          });
        }
      }
    }
  }
}

function passMarkdownForbiddenAlias(
  input: ScanInput,
  config: ScanConfig,
  mdByPath: Map<string, MarkdownBlock[]>,
  issues: ScanIssue[],
): void {
  for (const surf of input.markdownSurfaces ?? []) {
    const blocks = extractGlossaryBlocks(surf.content);
    mdByPath.set(surf.path, blocks);
    for (const block of blocks) {
      for (const term of Object.values(config.glossary.terms)) {
        const aliases = term['forbidden-aliases']?.[surf.locale] ?? [];
        for (const alias of aliases) {
          if (findTermMatches(block.text, alias.text, alias.match).length === 0) continue;
          issues.push({
            severity: 'error',
            rule: 'forbidden-alias',
            surfacePath: surf.path,
            locale: surf.locale,
            termId: term.id,
            anchor: block.id,
            detail: `forbidden alias "${alias.text}" of term "${term.id}" found in ${surf.locale} block "${block.id}" (use "${term.translations[surf.locale] ?? '???'}")`,
          });
        }
      }
    }
  }
}

function passJsonTermParity(
  input: ScanInput,
  config: ScanConfig,
  backbone: LocaleId,
  jsonByPath: Map<string, Map<string, string>>,
  issues: ScanIssue[],
): void {
  const jsonByPair = groupByPair(input.jsonSurfaces ?? [], issues, !!config.strict);
  for (const [pairKey, byLocale] of jsonByPair) {
    const backboneSurf = byLocale.get(backbone);
    if (!backboneSurf) continue;
    const backboneFlat = jsonByPath.get(backboneSurf.path) ?? new Map();
    for (const [keyPath, backboneValue] of backboneFlat) {
      for (const term of Object.values(config.glossary.terms)) {
        const backboneTranslation = term.translations[backbone];
        if (!backboneTranslation) continue;
        if (findTermMatches(backboneValue, backboneTranslation, term.match).length === 0) continue;
        for (const [targetLocale, targetSurf] of byLocale) {
          if (targetLocale === backbone) continue;
          const targetValue = jsonByPath.get(targetSurf.path)?.get(keyPath);
          if (targetValue === undefined) continue;
          const targetTranslation = term.translations[targetLocale];
          if (!targetTranslation) continue;
          if (findTermMatches(targetValue, targetTranslation, term.match).length === 0) {
            issues.push({
              severity: 'error',
              rule: 'term-mention-parity',
              surfacePath: targetSurf.path,
              locale: targetLocale,
              termId: term.id,
              anchor: keyPath,
              detail: `term "${term.id}" in ${backbone} value "${truncate(backboneValue)}" but target ${targetLocale} value "${truncate(targetValue)}" lacks registered translation "${targetTranslation}" (pair=${pairKey})`,
            });
          }
        }
      }
    }
  }
}

function passMarkdownBlockParity(
  input: ScanInput,
  config: ScanConfig,
  backbone: LocaleId,
  mdByPath: Map<string, MarkdownBlock[]>,
  issues: ScanIssue[],
): void {
  const mdByPair = groupByPair(input.markdownSurfaces ?? [], issues, !!config.strict);
  for (const [pairKey, byLocale] of mdByPair) {
    const backboneSurf = byLocale.get(backbone);
    if (!backboneSurf) continue;
    const backboneBlocks = mdByPath.get(backboneSurf.path) ?? [];
    for (const block of backboneBlocks) {
      for (const term of Object.values(config.glossary.terms)) {
        const backboneTranslation = term.translations[backbone];
        if (!backboneTranslation) continue;
        if (findTermMatches(block.text, backboneTranslation, term.match).length === 0) continue;
        for (const [targetLocale, targetSurf] of byLocale) {
          if (targetLocale === backbone) continue;
          const targetBlocks = mdByPath.get(targetSurf.path) ?? [];
          const targetBlock = targetBlocks.find((b) => b.id === block.id);
          if (!targetBlock) {
            issues.push({
              severity: 'error',
              rule: 'missing-block-pair',
              surfacePath: targetSurf.path,
              locale: targetLocale,
              anchor: block.id,
              detail: `block "${block.id}" present in ${backbone} surface ${backboneSurf.path} but missing in ${targetLocale} surface ${targetSurf.path} (pair=${pairKey})`,
            });
            continue;
          }
          const targetTranslation = term.translations[targetLocale];
          if (!targetTranslation) continue;
          if (findTermMatches(targetBlock.text, targetTranslation, term.match).length === 0) {
            issues.push({
              severity: 'error',
              rule: 'term-mention-parity',
              surfacePath: targetSurf.path,
              locale: targetLocale,
              termId: term.id,
              anchor: block.id,
              detail: `term "${term.id}" in backbone block "${block.id}" but target ${targetLocale} block lacks "${targetTranslation}"`,
            });
          }
        }
      }
    }
  }
}

function passBackboneRevisionFreshness(
  config: ScanConfig,
  backbone: LocaleId,
  issues: ScanIssue[],
): void {
  for (const term of Object.values(config.glossary.terms)) {
    const rev = term.lifecycle['backbone-revision'];
    const changeType = term.lifecycle['backbone-change-type'];
    if (rev === 1) continue;
    if (changeType === 'cosmetic') continue;
    for (const loc of config.glossary.locales) {
      if (loc.id === backbone) continue;
      const reviewed = term.lifecycle['reviewed-backbone-revision'][loc.id] ?? 0;
      if (reviewed < rev) {
        issues.push({
          severity: 'error',
          rule: 'backbone-revision-freshness',
          surfacePath: '(glossary)',
          locale: loc.id,
          termId: term.id,
          detail: `term "${term.id}" backbone-revision=${rev} (${changeType}); ${loc.id} last reviewed at ${reviewed}; per-locale reviewer must update`,
        });
      }
    }
  }
}

function findBackbone(g: Glossary): LocaleId {
  const b = g.locales.find((l) => l.role === 'backbone');
  if (!b) throw new Error('no backbone locale defined');
  return b.id;
}

/**
 * Group surfaces by `pairKey` then by locale. Surfaces sharing a pairKey
 * are siblings: a backbone and N target translations of the same logical
 * artifact.
 *
 * Diagnostics:
 *   - missing pairKey → `surface-coverage` warning (or `error` under strict)
 *   - collision (same pairKey + locale on different paths) → `error`
 *
 * Falls back to `derivePairKey()` (filename for Markdown, directory for
 * JSON) when `pairKey` is missing. The fallback exists for migration; v7
 * strict mode escalates this to a hard error so callers can't ship to
 * production without explicit pairing.
 */
function groupByPair<T extends { path: string; locale: LocaleId; pairKey?: string }>(
  xs: ReadonlyArray<T>,
  issues: ScanIssue[],
  strict: boolean,
): Map<string, Map<LocaleId, T>> {
  const out = new Map<string, Map<LocaleId, T>>();
  for (const x of xs) {
    if (x.pairKey === undefined) {
      issues.push({
        severity: strict ? 'error' : 'warning',
        rule: 'surface-coverage',
        surfacePath: x.path,
        locale: x.locale,
        detail: `surface lacks explicit pairKey; falling back to derivePairKey heuristic — set pairKey in the consumer config to make pairing deterministic`,
      });
    }
    const key = x.pairKey ?? derivePairKey(x.path);
    const byLoc = out.get(key) ?? new Map<LocaleId, T>();
    const existing = byLoc.get(x.locale);
    if (existing) {
      issues.push({
        severity: 'error',
        rule: 'surface-coverage',
        surfacePath: x.path,
        locale: x.locale,
        detail: `pairKey "${key}" already mapped to ${existing.path} for locale ${x.locale}; ${x.path} conflicts (first wins for scan, but config must disambiguate)`,
      });
    } else {
      byLoc.set(x.locale, x);
    }
    out.set(key, byLoc);
  }
  return out;
}

/** Fallback pairKey derivation when caller omits explicit `pairKey`. */
function derivePairKey(path: string): string {
  // For Markdown: docs/intro.md, docs/zh/intro.md → both 'intro.md'.
  // For JSON: messages/en.json, messages/de.json → both 'messages'.
  if (path.endsWith('.md')) {
    return path.split('/').pop()!;
  }
  if (path.endsWith('.json')) {
    return path.substring(0, path.lastIndexOf('/'));
  }
  return path;
}

function truncate(s: string, max = 60): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Re-exports for callers building their own scanner pipelines.
export { type Glossary, type Term, type LocaleId } from './schema.js';
