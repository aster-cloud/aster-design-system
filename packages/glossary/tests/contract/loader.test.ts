// Contract tests for loadGlossary() — schema invariants, cross-cutting
// business rules, homonym integrity, alias cycles.

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadGlossary, GlossaryValidationError } from '../../src/loader.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..', '..', 'src');

describe('loadGlossary (real glossary)', () => {
  it('loads the 38 seed terms successfully', () => {
    const g = loadGlossary({ rootDir: srcRoot });
    expect(g.localesVersion).toBe(1);
    expect(g.locales.map((l) => l.id).sort()).toEqual(['de-DE', 'en-US', 'zh-CN']);
    expect(Object.keys(g.terms).length).toBeGreaterThanOrEqual(38);
  });

  it('every term has all three locales', () => {
    const g = loadGlossary({ rootDir: srcRoot });
    for (const [id, t] of Object.entries(g.terms)) {
      for (const loc of ['en-US', 'zh-CN', 'de-DE']) {
        expect(t.translations[loc], `${id} missing ${loc}`).toBeTruthy();
      }
    }
  });

  it('every user-facing term has non-empty translations', () => {
    const g = loadGlossary({ rootDir: srcRoot });
    for (const [id, t] of Object.entries(g.terms)) {
      if (!t['user-facing']) continue;
      for (const loc of ['en-US', 'zh-CN', 'de-DE']) {
        expect(t.translations[loc]!.trim().length, `${id}.${loc}`).toBeGreaterThan(0);
      }
    }
  });

  it('every term id is kebab-case lowercase and matches its file key', () => {
    const g = loadGlossary({ rootDir: srcRoot });
    for (const [id, t] of Object.entries(g.terms)) {
      expect(id).toBe(t.id);
      expect(id).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });
});

describe('loadGlossary (synthetic violations)', () => {
  function tmp() {
    return mkdtempSync(`${tmpdir()}/glossary-test-`);
  }

  function writeFixture(dir: string, files: Record<string, string>) {
    mkdirSync(`${dir}/terms`, { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      const path = name === 'locales.yaml' ? `${dir}/locales.yaml` : `${dir}/terms/${name}`;
      writeFileSync(path, body, 'utf8');
    }
  }

  const minLocales = `
version: 1
localesVersion: 1
locales:
  - id: en-US
    role: backbone
    bcp47: en-US
  - id: zh-CN
    bcp47: zh-Hans-CN
`;

  it('rejects missing translation', () => {
    const dir = tmp();
    writeFixture(dir, {
      'locales.yaml': minLocales,
      'a.yaml': `
version: 1
terms:
  foo:
    id: foo
    category: test
    part-of-speech: noun
    user-facing: true
    definition: x
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations:
      en-US: foo
    match: { mode: phrase, normalize: [whitespace] }
`,
    });
    expect(() => loadGlossary({ rootDir: dir })).toThrow(GlossaryValidationError);
  });

  it('rejects raw-string forbidden alias (must be {text,match})', () => {
    const dir = tmp();
    writeFixture(dir, {
      'locales.yaml': minLocales,
      'a.yaml': `
version: 1
terms:
  foo:
    id: foo
    category: test
    part-of-speech: noun
    user-facing: true
    definition: x
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations:
      en-US: foo
      zh-CN: 富
    match: { mode: phrase }
    forbidden-aliases:
      zh-CN:
        - 错译  # raw string — should fail
`,
    });
    expect(() => loadGlossary({ rootDir: dir })).toThrow(GlossaryValidationError);
  });

  it('rejects homonym collision without distinct senses', () => {
    const dir = tmp();
    writeFixture(dir, {
      'locales.yaml': minLocales,
      'a.yaml': `
version: 1
terms:
  foo-a:
    id: foo-a
    category: test
    part-of-speech: noun
    user-facing: true
    definition: A
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations: { en-US: foo, zh-CN: 富 }
    match: { mode: phrase }
  foo-b:
    id: foo-b
    category: test
    part-of-speech: noun
    user-facing: true
    definition: B
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations: { en-US: foo, zh-CN: 富 }
    match: { mode: phrase }
`,
    });
    expect(() => loadGlossary({ rootDir: dir })).toThrow(GlossaryValidationError);
  });

  it('rejects alias-vs-translation cycle', () => {
    const dir = tmp();
    writeFixture(dir, {
      'locales.yaml': minLocales,
      'a.yaml': `
version: 1
terms:
  foo:
    id: foo
    category: test
    part-of-speech: noun
    user-facing: true
    definition: A
    sense: a.sense
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations: { en-US: foo, zh-CN: 富 }
    match: { mode: phrase }
  bar:
    id: bar
    category: test
    part-of-speech: noun
    user-facing: true
    definition: B
    sense: b.sense
    lifecycle: { status: active, since-version: 1, backbone-revision: 1 }
    translations: { en-US: bar, zh-CN: 巴 }
    match: { mode: phrase }
    forbidden-aliases:
      zh-CN:
        - text: 富  # collides with foo's translation
          match: { mode: phrase }
`,
    });
    expect(() => loadGlossary({ rootDir: dir })).toThrow(GlossaryValidationError);
  });

  it('rejects backbone-revision > 1 without change-type', () => {
    const dir = tmp();
    writeFixture(dir, {
      'locales.yaml': minLocales,
      'a.yaml': `
version: 1
terms:
  foo:
    id: foo
    category: test
    part-of-speech: noun
    user-facing: true
    definition: x
    lifecycle: { status: active, since-version: 1, backbone-revision: 2 }
    translations: { en-US: foo, zh-CN: 富 }
    match: { mode: phrase }
`,
    });
    expect(() => loadGlossary({ rootDir: dir })).toThrow(GlossaryValidationError);
  });
});
