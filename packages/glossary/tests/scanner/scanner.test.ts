// Scanner unit tests — adversarial fixtures + cross-locale comparator.

import { describe, expect, it } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGlossary } from '../../src/loader.js';
import { findTermMatches, scan, extractGlossaryBlocks, flattenJsonStrings } from '../../src/scanner.js';
import type { Match } from '../../src/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..', '..', 'src');
const glossary = loadGlossary({ rootDir: srcRoot });

describe('findTermMatches — adversarial', () => {
  const phrase: Match = {
    mode: 'phrase',
    'case-sensitive': false,
    boundary: 'unicode-word',
    normalize: ['case', 'width', 'punctuation', 'whitespace'],
  };

  it('matches phrase in straight ASCII', () => {
    expect(findTermMatches('use envelope encryption today', 'envelope encryption', phrase)).toHaveLength(1);
  });

  it('respects word boundary (no partial match in middle of identifier)', () => {
    expect(
      findTermMatches('the envelopeencryption thing', 'envelope encryption', phrase),
    ).toHaveLength(0);
  });

  it('does not match Unicode-confusable Cyrillic look-alikes', () => {
    // "Кek" with Cyrillic К should NOT match literal "KEK"
    const literal: Match = { mode: 'literal', 'case-sensitive': true, boundary: 'none', normalize: [] };
    expect(findTermMatches('Кek is used', 'KEK', literal)).toHaveLength(0);
  });

  it('handles zero-width space without splitting phrase', () => {
    // ZWSP between words → with `whitespace` normalize, scanner should still match
    expect(findTermMatches('envelope​ encryption is safe', 'envelope encryption', phrase)).toHaveLength(1);
  });

  it('matches in zh with normalized punctuation', () => {
    const zhPhrase = { ...phrase };
    expect(findTermMatches('使用 信封加密 是安全的', '信封加密', zhPhrase)).toHaveLength(1);
  });
});

describe('flattenJsonStrings', () => {
  it('flattens nested objects to key paths', () => {
    const flat = flattenJsonStrings({ admin: { license: { telemetry: { heading: 'Telemetry' } } } });
    expect(flat).toEqual([{ keyPath: 'admin.license.telemetry.heading', value: 'Telemetry' }]);
  });
  it('handles arrays', () => {
    const flat = flattenJsonStrings({ tags: ['a', 'b'] });
    expect(flat).toEqual([
      { keyPath: 'tags[0]', value: 'a' },
      { keyPath: 'tags[1]', value: 'b' },
    ]);
  });
});

describe('extractGlossaryBlocks', () => {
  it('extracts paired blocks', () => {
    const md = `
heading

<!-- glossary:block id=opt-in -->
The on-prem deployment sends a weekly batch.
<!-- /glossary:block -->

filler

<!-- glossary:block id=opt-out -->
Default state.
<!-- /glossary:block -->
`;
    const blocks = extractGlossaryBlocks(md);
    expect(blocks.map((b) => b.id)).toEqual(['opt-in', 'opt-out']);
    expect(blocks[0]!.text).toContain('weekly batch');
  });

  it('skips fenced code inside blocks', () => {
    const md = `
<!-- glossary:block id=x -->
prose
\`\`\`yaml
envelope-encryption: secret
\`\`\`
more prose
<!-- /glossary:block -->
`;
    const blocks = extractGlossaryBlocks(md);
    expect(blocks[0]!.text).toContain('prose');
    expect(blocks[0]!.text).not.toContain('envelope-encryption: secret');
  });
});

describe('scan — JSON forbidden-alias detection', () => {
  it('flags 封套加密 (zh forbidden alias) in messages/zh.json', () => {
    const result = scan(
      {
        jsonSurfaces: [
          {
            path: 'messages/zh.json',
            locale: 'zh-CN',
            content: { feature: { intro: '使用 封套加密 保护数据' } },
          },
        ],
      },
      { glossary, strict: true },
    );
    const alias = result.issues.find((i) => i.rule === 'forbidden-alias');
    expect(alias).toBeDefined();
    expect(alias!.termId).toBe('envelope-encryption');
    expect(alias!.anchor).toBe('feature.intro');
  });
});

describe('scan — pairKey diagnostics (Round-2 fix)', () => {
  it('emits surface-coverage warning when pairKey is missing (non-strict)', () => {
    const result = scan(
      {
        markdownSurfaces: [
          {
            path: 'docs/intro.md',
            locale: 'en-US',
            // pairKey intentionally omitted
            content: '<!-- glossary:block id=x -->\nUse envelope encryption.\n<!-- /glossary:block -->',
          },
        ],
      },
      { glossary, strict: false },
    );
    const warn = result.issues.find(
      (i) => i.rule === 'surface-coverage' && i.detail.includes('lacks explicit pairKey'),
    );
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe('warning');
  });

  it('escalates missing pairKey to error under strict', () => {
    const result = scan(
      {
        markdownSurfaces: [
          {
            path: 'docs/intro.md',
            locale: 'en-US',
            content: '<!-- glossary:block id=x -->\nUse envelope encryption.\n<!-- /glossary:block -->',
          },
        ],
      },
      { glossary, strict: true },
    );
    const issue = result.issues.find(
      (i) => i.rule === 'surface-coverage' && i.detail.includes('lacks explicit pairKey'),
    );
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('error');
  });

  it('emits error on pairKey collision (two surfaces same pairKey + locale)', () => {
    const result = scan(
      {
        markdownSurfaces: [
          {
            path: 'docs/intro.md',
            locale: 'en-US',
            pairKey: 'intro',
            content: '<!-- glossary:block id=x -->\nfirst.\n<!-- /glossary:block -->',
          },
          {
            path: 'docs/duplicate-intro.md',
            locale: 'en-US',
            pairKey: 'intro', // collision!
            content: '<!-- glossary:block id=y -->\nsecond.\n<!-- /glossary:block -->',
          },
        ],
      },
      { glossary, strict: true },
    );
    const err = result.issues.find(
      (i) => i.rule === 'surface-coverage' && i.detail.includes('already mapped'),
    );
    expect(err).toBeDefined();
    expect(err!.severity).toBe('error');
  });
});

describe('scan — explicit pairKey pairing (Critical-5 regression)', () => {
  it('does not falsely pair same-named files in different directories', () => {
    // Without explicit pairKey, the old basename heuristic would have
    // matched docs/api/intro.md ↔ docs/policy/zh/intro.md.
    const result = scan(
      {
        markdownSurfaces: [
          {
            path: 'docs/api/intro.md',
            locale: 'en-US',
            pairKey: 'api/intro',
            content: '<!-- glossary:block id=x -->\nUse envelope encryption today.\n<!-- /glossary:block -->',
          },
          {
            path: 'docs/policy/zh/intro.md',
            locale: 'zh-CN',
            pairKey: 'policy/intro', // different pair — must NOT be matched
            content: '<!-- glossary:block id=x -->\n使用未注册的术语\n<!-- /glossary:block -->',
          },
        ],
      },
      { glossary, strict: true },
    );
    const parityFindings = result.issues.filter((i) => i.rule === 'term-mention-parity');
    expect(parityFindings).toHaveLength(0);
  });

  it('uses pairKey to pair surfaces explicitly across directories', () => {
    const result = scan(
      {
        markdownSurfaces: [
          {
            path: 'docs/intro.md',
            locale: 'en-US',
            pairKey: 'intro',
            content: '<!-- glossary:block id=x -->\nUse envelope encryption to protect data.\n<!-- /glossary:block -->',
          },
          {
            path: 'docs/zh/intro.md',
            locale: 'zh-CN',
            pairKey: 'intro',
            content: '<!-- glossary:block id=x -->\n使用加密来保护数据。\n<!-- /glossary:block -->',
          },
        ],
      },
      { glossary, strict: true },
    );
    const parity = result.issues.find(
      (i) => i.rule === 'term-mention-parity' && i.termId === 'envelope-encryption',
    );
    expect(parity).toBeDefined();
    expect(parity!.locale).toBe('zh-CN');
  });
});

describe('scan — cross-locale term-mention parity', () => {
  it('flags missing zh translation when en mentions the term', () => {
    const result = scan(
      {
        jsonSurfaces: [
          {
            path: 'messages/en.json',
            locale: 'en-US',
            content: { feature: { intro: 'Use envelope encryption to protect data' } },
          },
          {
            path: 'messages/zh.json',
            locale: 'zh-CN',
            content: { feature: { intro: '使用加密来保护数据' } }, // missing 信封加密
          },
        ],
      },
      { glossary, strict: true },
    );
    const parity = result.issues.find((i) => i.rule === 'term-mention-parity');
    expect(parity).toBeDefined();
    expect(parity!.termId).toBe('envelope-encryption');
    expect(parity!.locale).toBe('zh-CN');
  });

  it('passes when zh uses the registered translation', () => {
    const result = scan(
      {
        jsonSurfaces: [
          {
            path: 'messages/en.json',
            locale: 'en-US',
            content: { feature: { intro: 'Use envelope encryption to protect data' } },
          },
          {
            path: 'messages/zh.json',
            locale: 'zh-CN',
            content: { feature: { intro: '使用 信封加密 保护数据' } },
          },
        ],
      },
      { glossary, strict: true },
    );
    const issue = result.issues.find(
      (i) => i.rule === 'term-mention-parity' && i.termId === 'envelope-encryption',
    );
    expect(issue).toBeUndefined();
  });
});
