#!/usr/bin/env node
// glossary-fmt CLI — see ../README.md for usage.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  blockMapPath,
  loadBlockMap,
  saveBlockMap,
  lintBlockMap,
  moveFileInBlockMap,
  renameBlock,
} from './index.js';

const args = process.argv.slice(2);
const subcommand = args[0];

switch (subcommand) {
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
    console.error('usage: glossary-fmt <lint|move-file|rename-block> ...');
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
