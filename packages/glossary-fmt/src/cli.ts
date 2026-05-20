#!/usr/bin/env node
// glossary-fmt CLI — see ../README.md for usage.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import {
  blockMapPath,
  loadBlockMap,
  saveBlockMap,
  lintBlockMap,
  moveFileInBlockMap,
  renameBlock,
  planInsertions,
  generateBlockId,
  DEFAULT_FMT_CONFIG,
  FMT_CONFIG_VERSION,
  type BlockMap,
} from './index.js';

const args = process.argv.slice(2);
const subcommand = args[0];

switch (subcommand) {
  case 'insert': {
    const docTree = args[1];
    const dryRun = args.includes('--dry-run');
    if (!docTree) {
      console.error('usage: glossary-fmt insert <doc-tree> [--dry-run]');
      process.exit(2);
    }
    const result = runInsert(docTree, dryRun);
    console.log(
      `[insert] ${dryRun ? 'DRY RUN — would annotate' : 'annotated'} ${result.totalInserted} blocks across ${result.fileCount} files`,
    );
    if (!dryRun) {
      console.log(`[insert] block-map: ${result.totalInserted} new entries in ${blockMapPath(docTree)}`);
    }
    break;
  }
  case 'lint': {
    const docTree = args[1] ?? '.';
    const files = collectMarkdown(docTree);
    const issues = lintBlockMap(docTree, files);
    for (const i of issues) {
      console.error(`[${i.severity}] ${i.filePath}: ${i.detail}`);
    }
    process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
  }
  case 'move-file': {
    const docTree = args[1];
    const oldPath = args[2];
    const newPath = args[3];
    if (!docTree || !oldPath || !newPath) {
      console.error('usage: glossary-fmt move-file <doc-tree> <old-path> <new-path>');
      process.exit(2);
    }
    const map = loadBlockMap(docTree);
    const next = moveFileInBlockMap(map, oldPath, newPath);
    saveBlockMap(docTree, next);
    console.log(`[move-file] block-map updated: ${oldPath} → ${newPath}`);
    break;
  }
  case 'rename-block': {
    const docTree = args[1];
    const oldId = args[2];
    const newId = args[3];
    if (!docTree || !oldId || !newId) {
      console.error('usage: glossary-fmt rename-block <doc-tree> <old-id> <new-id>');
      process.exit(2);
    }
    const map = loadBlockMap(docTree);
    const next = renameBlock(map, oldId, newId);
    saveBlockMap(docTree, next);
    console.log(`[rename-block] ${oldId} → ${newId} (old id now alias-of)`);
    break;
  }
  default:
    console.error('usage: glossary-fmt <insert|lint|move-file|rename-block> ...');
    process.exit(2);
}

function collectMarkdown(root: string): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith('.md')) {
        out.push({ path: relative(root, p), content: readFileSync(p, 'utf8') });
      }
    }
  };
  walk(root);
  return out;
}

interface InsertResult {
  totalInserted: number;
  fileCount: number;
}

function runInsert(docTree: string, dryRun: boolean): InsertResult {
  const files = collectMarkdown(docTree);
  const initialMap = loadBlockMap(docTree);
  const map: BlockMap = JSON.parse(JSON.stringify(initialMap));
  const taken = new Set(Object.keys(map.blocks));
  const now = new Date().toISOString();
  let totalInserted = 0;

  for (const file of files) {
    const plans = planInsertions(file.content, DEFAULT_FMT_CONFIG);
    if (plans.length === 0) continue;

    // Two-pass: assign IDs, then rewrite the file line-by-line so we can
    // splice in markers without invalidating line numbers from later plans.
    const lines = file.content.split('\n');
    // Track per-plan {startLine, endLine, id}. We process from BOTTOM to TOP so
    // earlier-line splices don't shift later-line positions.
    const inserts: Array<{ startLine: number; endLine: number; id: string }> = [];

    for (const plan of plans) {
      if (plan.existingId) {
        continue; // already annotated; leave alone
      }
      // Per-(file, heading, node-type) seq counter — count blocks already
      // generated in THIS file for the same (heading-slug, node-type) so the
      // sequence number is stable when re-running on a half-annotated file.
      const ctxBlocks = inserts.length;
      const id = generateBlockId(file.path, plan.headingTrail, plan.nodeType, ctxBlocks + 1, taken);
      taken.add(id);
      inserts.push({ startLine: plan.startLine, endLine: plan.endLine, id });
      map.blocks[id] = {
        'created-at': now,
        'created-by': 'glossary-fmt insert v0.1.0',
        occurrences: { [file.path]: { 'line-hint': plan.startLine } },
        'alias-of': null,
      };
      totalInserted++;
    }

    if (inserts.length === 0) continue;

    // Apply splices from bottom up.
    inserts.sort((a, b) => b.startLine - a.startLine);
    for (const ins of inserts) {
      // Insert closing marker AFTER endLine (1-indexed).
      lines.splice(ins.endLine, 0, '<!-- /glossary:block -->');
      // Insert opening marker BEFORE startLine.
      lines.splice(ins.startLine - 1, 0, `<!-- glossary:block id=${ins.id} -->`);
    }

    if (!dryRun) {
      writeFileSync(join(docTree, file.path), lines.join('\n'), 'utf8');
    }
  }

  if (!dryRun && totalInserted > 0) {
    saveBlockMap(docTree, map);
  }

  return { totalInserted, fileCount: files.length };
}
