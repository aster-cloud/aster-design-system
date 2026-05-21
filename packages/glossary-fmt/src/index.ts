// @aster-cloud/glossary-fmt — block-id formatter/linter for glossary
// markdown surfaces. Implements plan §1.5 + §1.5.1 + §1.5.2.
//
// CLI subcommands:
//   glossary-fmt insert <doc-tree>            — first-time annotation; never recomputes existing IDs
//   glossary-fmt sync <en-file> <target-file> — mirror backbone block IDs to target locale
//   glossary-fmt lint <doc-tree>              — validate every marker has a block-map entry and vice versa
//   glossary-fmt move-file <old> <new>        — atomic path rename in sidecar + git mv
//   glossary-fmt rename-block <old-id> <new-id>
//
// The block-map sidecar lives at `<doc-tree>/.glossary/block-map.json`.
// IDs are insert-once: once assigned they live in the sidecar and are
// never regenerated from content. A heading rename or paragraph rewrite
// does not change the ID — the marker stays put.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, RootContent, Heading, Paragraph } from 'mdast';
import { BlockMapSchema, type BlockMap } from '@aster-cloud/glossary/schema';

export const FMT_CONFIG_VERSION = 1;

export interface FmtConfig {
  /** Min characters for a paragraph to count as a block (skip stubs). */
  paragraphMinChars: number;
  /** Include list items as separate blocks. */
  includeListItems: boolean;
  /** Include table rows as separate blocks (excluding header row). */
  includeTableRows: boolean;
  /** Include admonition blocks of these kinds. */
  admonitionKinds: ReadonlyArray<string>;
}

export const DEFAULT_FMT_CONFIG: FmtConfig = {
  paragraphMinChars: 40,
  includeListItems: true,
  includeTableRows: false, // tables are usually data; opt-in per surface
  admonitionKinds: ['note', 'warning', 'tip', 'caution', 'danger'],
};

// ───────── Block-map I/O ─────────

export function blockMapPath(docTree: string): string {
  return join(docTree, '.glossary', 'block-map.json');
}

export function loadBlockMap(docTree: string): BlockMap {
  const path = blockMapPath(docTree);
  if (!existsSync(path)) {
    return { version: 1, 'fmt-config-version': FMT_CONFIG_VERSION, blocks: {} };
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return BlockMapSchema.parse(raw);
}

export function saveBlockMap(docTree: string, map: BlockMap): void {
  const path = blockMapPath(docTree);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(map, null, 2), 'utf8');
}

// ───────── ID generation (§1.5.1, v7) ─────────

function slugify(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export function generateBlockId(
  filePath: string,
  headingTrail: string[],
  nodeType: string,
  seq: number,
  taken: ReadonlySet<string>,
): string {
  const fileSlug = slugify(basename(filePath, extname(filePath)));
  const headingSlug = headingTrail.length > 0 ? slugify(headingTrail[headingTrail.length - 1]!) : 'intro';
  let candidate = `${fileSlug}-${headingSlug}-${nodeType}-${seq}`;
  let discriminator = 1;
  while (taken.has(candidate)) {
    discriminator++;
    candidate = `${fileSlug}-${headingSlug}-${nodeType}-${seq}-${discriminator}`;
  }
  return candidate;
}

// ───────── Insert (first-time annotation) ─────────

export interface InsertResult {
  filePath: string;
  inserted: number;
  unchanged: number;
  /** Lines containing newly-inserted markers, for human review. */
  insertedAt: ReadonlyArray<number>;
}

/** Scan a Markdown file's AST and emit insertion plans. */
export interface InsertionPlan {
  startLine: number;
  endLine: number;
  nodeType: 'paragraph' | 'list-item' | 'table-row' | 'admonition' | 'blockquote';
  headingTrail: string[];
  /** Existing block-id if marker already present; null if needs insertion. */
  existingId: string | null;
}

export function planInsertions(markdown: string, config: FmtConfig = DEFAULT_FMT_CONFIG): InsertionPlan[] {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const plans: InsertionPlan[] = [];
  const headingTrail: string[] = [];

  for (const child of tree.children) {
    if (child.type === 'heading') {
      const h = child as Heading;
      const text = h.children
        .map((c) => (c.type === 'text' ? c.value : ''))
        .join('');
      // Maintain a depth-keyed heading stack; replace at h.depth.
      headingTrail.length = Math.max(0, h.depth - 1);
      headingTrail.push(text);
      continue;
    }
    if (child.type === 'paragraph') {
      const p = child as Paragraph;
      const text = textOf(p);
      if (text.length < config.paragraphMinChars) continue;
      plans.push({
        startLine: p.position?.start.line ?? 1,
        endLine: p.position?.end.line ?? 1,
        nodeType: 'paragraph',
        headingTrail: [...headingTrail],
        existingId: null,
      });
    }
    if (child.type === 'list' && config.includeListItems) {
      for (const item of child.children) {
        plans.push({
          startLine: item.position?.start.line ?? 1,
          endLine: item.position?.end.line ?? 1,
          nodeType: 'list-item',
          headingTrail: [...headingTrail],
          existingId: null,
        });
      }
    }
    if (child.type === 'blockquote') {
      plans.push({
        startLine: child.position?.start.line ?? 1,
        endLine: child.position?.end.line ?? 1,
        nodeType: 'blockquote',
        headingTrail: [...headingTrail],
        existingId: null,
      });
    }
  }

  // Detect existing markers and link them to plans.
  const existingMarkers = [...markdown.matchAll(/<!--\s*glossary:block\s+id=([a-z0-9-]+)\s*-->/g)];
  for (const m of existingMarkers) {
    const line = markdown.slice(0, m.index!).split('\n').length;
    const plan = plans.find((p) => p.startLine === line + 1 || p.startLine === line);
    if (plan) plan.existingId = m[1]!;
  }

  return plans;
}

function textOf(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { children?: unknown[]; value?: string };
  if (!n.children) return n.value ?? '';
  return n.children.map((c) => textOf(c)).join('');
}

// ───────── Lint ─────────

export interface LintIssue {
  severity: 'error' | 'warning';
  filePath: string;
  detail: string;
}

export function lintBlockMap(
  docTree: string,
  markdownFiles: ReadonlyArray<{ path: string; content: string }>,
): LintIssue[] {
  const map = loadBlockMap(docTree);
  const issues: LintIssue[] = [];

  // Every marker has a block-map entry.
  for (const file of markdownFiles) {
    const markers = [...file.content.matchAll(/<!--\s*glossary:block\s+id=([a-z0-9-]+)\s*-->/g)];
    const closers = [...file.content.matchAll(/<!--\s*\/glossary:block\s*-->/g)];
    if (markers.length !== closers.length) {
      issues.push({
        severity: 'error',
        filePath: file.path,
        detail: `marker/closer count mismatch: ${markers.length} open, ${closers.length} close`,
      });
    }
    const seen = new Set<string>();
    for (const m of markers) {
      const id = m[1]!;
      if (seen.has(id)) {
        issues.push({
          severity: 'error',
          filePath: file.path,
          detail: `duplicate marker id "${id}" in single file`,
        });
      }
      seen.add(id);
      if (!map.blocks[id]) {
        issues.push({
          severity: 'error',
          filePath: file.path,
          detail: `orphan marker "${id}" — no entry in block-map.json`,
        });
      }
    }
  }

  // Every block-map entry has a marker. Build a single Set of all marker
  // ids across all files (one extraction per file, not per block-id) so
  // the check is O(B + sum(markers)) instead of O(B·F) regex compiles.
  const allMarkerIds = new Set<string>();
  for (const file of markdownFiles) {
    for (const m of file.content.matchAll(/<!--\s*glossary:block\s+id=([a-z0-9][a-z0-9-]*)\s*-->/g)) {
      allMarkerIds.add(m[1]!);
    }
  }
  for (const id of Object.keys(map.blocks)) {
    if (!allMarkerIds.has(id)) {
      issues.push({
        severity: 'error',
        filePath: blockMapPath(docTree),
        detail: `block-map entry "${id}" has no matching marker in any file`,
      });
    }
  }

  return issues;
}

// ───────── Move file ─────────

export function moveFileInBlockMap(map: BlockMap, oldPath: string, newPath: string): BlockMap {
  const next: BlockMap = { ...map, blocks: { ...map.blocks } };
  for (const [id, entry] of Object.entries(next.blocks)) {
    const occAtOld = entry.occurrences[oldPath];
    if (occAtOld) {
      const { [oldPath]: _drop, ...rest } = entry.occurrences;
      next.blocks[id] = {
        ...entry,
        occurrences: { ...rest, [newPath]: occAtOld },
      };
    }
  }
  return next;
}

// ───────── Rename block ─────────

export function renameBlock(
  map: BlockMap,
  oldId: string,
  newId: string,
  nowIso: string = new Date().toISOString(),
): BlockMap {
  if (!map.blocks[oldId]) {
    throw new Error(`renameBlock: id "${oldId}" not found in block-map`);
  }
  if (map.blocks[newId]) {
    throw new Error(`renameBlock: target id "${newId}" already exists`);
  }
  const next: BlockMap = { ...map, blocks: { ...map.blocks } };
  next.blocks[newId] = { ...map.blocks[oldId]! };
  next.blocks[oldId] = {
    ...map.blocks[oldId]!,
    'alias-of': newId,
    'created-at': nowIso,
  };
  return next;
}

// Re-exports
export type { BlockMap } from '@aster-cloud/glossary/schema';
