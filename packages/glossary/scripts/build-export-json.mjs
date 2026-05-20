#!/usr/bin/env node
// Emit dist/glossary.export.json — the flat key-value bundle consumed by
// the Java reader + bundled into the Maven artifact.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGlossary } from '../dist/loader.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '..', 'src');
const distRoot = join(here, '..', 'dist');

const glossary = loadGlossary({ rootDir: srcRoot });
mkdirSync(distRoot, { recursive: true });
writeFileSync(
  join(distRoot, 'glossary.export.json'),
  JSON.stringify(glossary, null, 2),
  'utf8',
);

console.log(
  `[build-export-json] wrote ${Object.keys(glossary.terms).length} terms × ${glossary.locales.length} locales (localesVersion=${glossary.localesVersion})`,
);
