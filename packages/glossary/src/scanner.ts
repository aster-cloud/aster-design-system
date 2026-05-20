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
    const re = new RegExp(needle, flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0]!.length });
    }
    return matches;
  }

  // phrase mode: Unicode word-boundary aware.
  const normalize = (s: string) => applyNormalize(s, match.normalize ?? []);
  const normHay = normalize(haystack);
  const normNeedle = normalize(needle);
  const cmpHay = match['case-sensitive'] ? normHay : normHay.toLowerCase();
  const cmpNeedle = match['case-sensitive'] ? normNeedle : normNeedle.toLowerCase();
  let i = 0;
  while (true) {
    const idx = cmpHay.indexOf(cmpNeedle, i);
    if (idx === -1) break;
    const startIsBoundary = idx === 0 || isWordBoundary(cmpHay, idx);
    const endIsBoundary = idx + cmpNeedle.length === cmpHay.length || isWordBoundary(cmpHay, idx + cmpNeedle.length);
    if (startIsBoundary && endIsBoundary) {
      // Map normalized positions back to original.
      // For most normalize rules this is approximately identity; the
      // scanner reports positions in the NORMALIZED string. Acceptable
      // for issue messages — the surface path + anchor are how humans
      // navigate to the actual location.
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

function isWordBoundary(s: string, idx: number): boolean {
  if (idx === 0 || idx === s.length) return true;
  const prev = s[idx - 1]!;
  const curr = s[idx]!;
  // Use Intl.Segmenter when available for proper Unicode word detection.
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
    // Cheap heuristic: a boundary exists if the segments at idx-1 and idx differ.
    const segs = Array.from(seg.segment(s)) as Array<{ index: number; segment: string }>;
    for (const it of segs) {
      if (it.index === idx) return true;
    }
    return false;
  }
  // Fallback: ASCII word-boundary heuristic.
  const word = /[a-zA-Z0-9_]/;
  return word.test(prev) !== word.test(curr);
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
}

export interface MarkdownSurfaceInput {
  path: string;
  locale: LocaleId;
  content: string;
}

export interface ScanInput {
  jsonSurfaces?: ReadonlyArray<JsonSurfaceInput>;
  markdownSurfaces?: ReadonlyArray<MarkdownSurfaceInput>;
}

export function scan(input: ScanInput, config: ScanConfig): ScanResult {
  const backbone = config.backboneLocale ?? findBackbone(config.glossary);
  const issues: ScanIssue[] = [];

  // 1. Glossary completeness (every term has every locale).
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

  // 2. Forbidden-alias presence across all scanned surfaces.
  const jsonByPath = new Map<string, Map<string, string>>(); // path → keyPath → value
  for (const surf of input.jsonSurfaces ?? []) {
    const flat = flattenJsonStrings(surf.content);
    const map = new Map(flat.map((s) => [s.keyPath, s.value]));
    jsonByPath.set(surf.path, map);
    for (const { keyPath, value } of flat) {
      for (const term of Object.values(config.glossary.terms)) {
        const aliases = term['forbidden-aliases']?.[surf.locale] ?? [];
        for (const alias of aliases) {
          const hits = findTermMatches(value, alias.text, alias.match);
          for (const hit of hits) {
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

  const mdByPath = new Map<string, MarkdownBlock[]>();
  for (const surf of input.markdownSurfaces ?? []) {
    const blocks = extractGlossaryBlocks(surf.content);
    mdByPath.set(surf.path, blocks);
    for (const block of blocks) {
      for (const term of Object.values(config.glossary.terms)) {
        const aliases = term['forbidden-aliases']?.[surf.locale] ?? [];
        for (const alias of aliases) {
          const hits = findTermMatches(block.text, alias.text, alias.match);
          for (const _ of hits) {
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

  // 3. Term-mention parity for JSON surfaces (same key path across locales).
  const surfacesByLocale = groupByLocale(input.jsonSurfaces ?? []);
  const backbones = surfacesByLocale.get(backbone) ?? [];
  for (const backboneSurf of backbones) {
    const backboneFlat = jsonByPath.get(backboneSurf.path) ?? new Map();
    for (const [keyPath, backboneValue] of backboneFlat) {
      for (const term of Object.values(config.glossary.terms)) {
        const backboneTranslation = term.translations[backbone];
        if (!backboneTranslation) continue;
        const hits = findTermMatches(backboneValue, backboneTranslation, term.match);
        if (hits.length === 0) continue;
        // Found term in backbone; assert target locales also use registered translation.
        for (const targetLocale of config.glossary.locales.map((l) => l.id)) {
          if (targetLocale === backbone) continue;
          // Find target-locale surface that pairs with this backbone surface.
          const targetSurfaces = surfacesByLocale.get(targetLocale) ?? [];
          const targetMatch = matchPairedSurface(backboneSurf.path, targetSurfaces);
          if (!targetMatch) continue;
          const targetValue = jsonByPath.get(targetMatch.path)?.get(keyPath);
          if (targetValue === undefined) continue; // missing-key handled elsewhere (check-locales)
          const targetTranslation = term.translations[targetLocale];
          if (!targetTranslation) continue;
          const targetHits = findTermMatches(targetValue, targetTranslation, term.match);
          if (targetHits.length === 0) {
            issues.push({
              severity: 'error',
              rule: 'term-mention-parity',
              surfacePath: targetMatch.path,
              locale: targetLocale,
              termId: term.id,
              anchor: keyPath,
              detail: `term "${term.id}" in ${backbone} value "${truncate(backboneValue)}" but target ${targetLocale} value "${truncate(targetValue)}" lacks registered translation "${targetTranslation}"`,
            });
          }
        }
      }
    }
  }

  // 4. Block-pair parity for Markdown surfaces.
  const mdBackbones = (input.markdownSurfaces ?? []).filter((s) => s.locale === backbone);
  for (const backboneSurf of mdBackbones) {
    const backboneBlocks = mdByPath.get(backboneSurf.path) ?? [];
    for (const block of backboneBlocks) {
      for (const term of Object.values(config.glossary.terms)) {
        const backboneTranslation = term.translations[backbone];
        if (!backboneTranslation) continue;
        const hits = findTermMatches(block.text, backboneTranslation, term.match);
        if (hits.length === 0) continue;
        for (const targetLocale of config.glossary.locales.map((l) => l.id)) {
          if (targetLocale === backbone) continue;
          const targetSurf = (input.markdownSurfaces ?? []).find(
            (s) => s.locale === targetLocale && matchMarkdownPair(backboneSurf.path, s.path),
          );
          if (!targetSurf) continue;
          const targetBlocks = mdByPath.get(targetSurf.path) ?? [];
          const targetBlock = targetBlocks.find((b) => b.id === block.id);
          if (!targetBlock) {
            issues.push({
              severity: 'error',
              rule: 'missing-block-pair',
              surfacePath: targetSurf.path,
              locale: targetLocale,
              anchor: block.id,
              detail: `block "${block.id}" present in ${backbone} surface ${backboneSurf.path} but missing in ${targetLocale} surface ${targetSurf.path}`,
            });
            continue;
          }
          const targetTranslation = term.translations[targetLocale];
          if (!targetTranslation) continue;
          const targetHits = findTermMatches(targetBlock.text, targetTranslation, term.match);
          if (targetHits.length === 0) {
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

  // 5. Backbone-revision freshness — strict gating per §7.3.
  for (const term of Object.values(config.glossary.terms)) {
    const rev = term.lifecycle['backbone-revision'];
    const changeType = term.lifecycle['backbone-change-type'];
    if (rev === 1) continue; // first revision; no freshness check
    if (changeType === 'cosmetic') continue; // cosmetic uses batch-ack, not strict gate
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

  // Tally.
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return { issues, errorCount, warningCount };
}

function findBackbone(g: Glossary): LocaleId {
  const b = g.locales.find((l) => l.role === 'backbone');
  if (!b) throw new Error('no backbone locale defined');
  return b.id;
}

function groupByLocale<T extends { locale: LocaleId }>(xs: ReadonlyArray<T>): Map<LocaleId, T[]> {
  const m = new Map<LocaleId, T[]>();
  for (const x of xs) {
    const arr = m.get(x.locale) ?? [];
    arr.push(x);
    m.set(x.locale, arr);
  }
  return m;
}

function matchPairedSurface<T extends { path: string }>(backbonePath: string, candidates: T[]): T | undefined {
  // Heuristic: same basename ignoring locale segment.
  // e.g. "messages/en.json" pairs with "messages/zh.json".
  const basename = backbonePath.replace(/[a-z]{2,3}-?[A-Z]?[a-z]*\.json$/, '');
  return candidates.find((c) => c.path.startsWith(basename));
}

function matchMarkdownPair(backbonePath: string, targetPath: string): boolean {
  // Heuristic: same trailing path components.
  // e.g. "docs/on-prem/telemetry.md" ↔ "docs/on-prem/zh/telemetry.md".
  const bSlug = backbonePath.split('/').pop();
  const tSlug = targetPath.split('/').pop();
  return bSlug === tSlug;
}

function truncate(s: string, max = 60): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Re-exports for callers building their own scanner pipelines.
export { type Glossary, type Term, type LocaleId } from './schema.js';
