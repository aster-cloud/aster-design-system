// Unit tests for the BCP-47 locale-utils shared with consumers.

import { describe, expect, it } from 'vitest';
import {
  parseLocaleTag,
  matchLocaleSegment,
  localeFromPathSegment,
  stripLocaleSegment,
  shortLocaleTokens,
} from '../../src/locale-utils.js';
import type { Locale } from '../../src/schema.js';

const locales: Locale[] = [
  { id: 'en-US', role: 'backbone', bcp47: 'en-US' },
  { id: 'zh-CN', bcp47: 'zh-Hans-CN' },
  { id: 'de-DE', bcp47: 'de-DE' },
];

describe('parseLocaleTag', () => {
  it('parses simple language tag', () => {
    expect(parseLocaleTag('en')).toMatchObject({ language: 'en' });
  });
  it('parses language-region', () => {
    expect(parseLocaleTag('zh-CN')).toMatchObject({ language: 'zh', region: 'CN' });
  });
  it('parses language-script', () => {
    expect(parseLocaleTag('zh-Hans')).toMatchObject({ language: 'zh', script: 'Hans' });
  });
  it('parses language-script-region', () => {
    expect(parseLocaleTag('zh-Hant-TW')).toMatchObject({
      language: 'zh',
      script: 'Hant',
      region: 'TW',
    });
  });
  it('parses UN M.49 numeric region', () => {
    expect(parseLocaleTag('es-419')).toMatchObject({ language: 'es', region: '419' });
  });
  it('captures variant in rest', () => {
    expect(parseLocaleTag('de-DE-1996')).toMatchObject({
      language: 'de',
      region: 'DE',
      rest: '1996',
    });
  });
  it('rejects empty input', () => {
    expect(parseLocaleTag('')).toBeNull();
  });
  it('rejects non-language primary subtag', () => {
    expect(parseLocaleTag('123')).toBeNull();
    expect(parseLocaleTag('toolong')).toBeNull();
  });
  it('is case-insensitive on input but canonical on output', () => {
    const got = parseLocaleTag('ZH-hans-tw');
    expect(got).toMatchObject({ language: 'zh', script: 'Hans', region: 'TW' });
  });
});

describe('matchLocaleSegment', () => {
  it('matches by full tag, not just primary subtag', () => {
    expect(matchLocaleSegment('zh-CN', locales)).toBe('zh-CN');
    expect(matchLocaleSegment('de-DE', locales)).toBe('de-DE');
  });
  it('returns null when full tag does not match a registered locale', () => {
    // zh-TW would NOT match zh-CN even though they share the primary subtag.
    expect(matchLocaleSegment('zh-TW', locales)).toBeNull();
  });
  it('returns null for non-locale segments', () => {
    expect(matchLocaleSegment('api', locales)).toBeNull();
    expect(matchLocaleSegment('getting-started', locales)).toBeNull();
  });
  it('falls back to primary subtag when unambiguous', () => {
    // Only zh-CN registered → bare `zh` resolves to zh-CN.
    expect(matchLocaleSegment('zh', locales)).toBe('zh-CN');
    expect(matchLocaleSegment('de', locales)).toBe('de-DE');
  });
  it('does NOT match when input has extra variant subtags (R3 regression)', () => {
    // de-DE-1996 has a `rest` variant; de-DE does not. They must NOT match.
    expect(matchLocaleSegment('de-DE-1996', locales)).toBeNull();
  });
  it('returns null on ambiguous primary subtag', () => {
    const ambiguous = [
      { id: 'zh-CN', bcp47: 'zh-Hans-CN' },
      { id: 'zh-TW', bcp47: 'zh-Hant-TW' },
    ] as const;
    // Bare `zh` is ambiguous when both zh-CN and zh-TW are registered.
    expect(matchLocaleSegment('zh', ambiguous as any)).toBeNull();
    // Explicit tags still work.
    expect(matchLocaleSegment('zh-CN', ambiguous as any)).toBe('zh-CN');
    expect(matchLocaleSegment('zh-TW', ambiguous as any)).toBe('zh-TW');
  });
});

describe('localeFromPathSegment', () => {
  it('reads locale immediately after rootDir', () => {
    expect(localeFromPathSegment('docs/zh-CN/intro.md', 'docs', locales)).toBe('zh-CN');
  });
  it('resolves bare primary subtag when unambiguous', () => {
    // `docs/zh/intro.md` resolves to zh-CN because that's the only zh-* registered.
    expect(localeFromPathSegment('docs/zh/intro.md', 'docs', locales)).toBe('zh-CN');
  });
  it('returns null when next segment is not a registered locale', () => {
    expect(localeFromPathSegment('docs/api/intro.md', 'docs', locales)).toBeNull();
  });
  it('returns null when path is outside rootDir', () => {
    expect(localeFromPathSegment('messages/en-US.json', 'docs', locales)).toBeNull();
  });
});

describe('stripLocaleSegment', () => {
  it('strips a registered-locale segment', () => {
    expect(stripLocaleSegment('docs/zh-CN/on-prem/intro.md', 'docs', locales)).toBe(
      'docs/on-prem/intro.md',
    );
  });
  it('strips a bare primary-subtag segment when unambiguous', () => {
    expect(stripLocaleSegment('docs/zh/on-prem/intro.md', 'docs', locales)).toBe(
      'docs/on-prem/intro.md',
    );
  });
  it('leaves unrecognized segments intact', () => {
    expect(stripLocaleSegment('docs/api/intro.md', 'docs', locales)).toBe('docs/api/intro.md');
  });
  it('does NOT strip an ambiguous bare primary subtag (returns input)', () => {
    const ambiguous = [
      { id: 'zh-CN', bcp47: 'zh-Hans-CN' },
      { id: 'zh-TW', bcp47: 'zh-Hant-TW' },
    ] as any;
    // `docs/zh/` is ambiguous — must be left alone so collisions surface elsewhere.
    expect(stripLocaleSegment('docs/zh/intro.md', 'docs', ambiguous)).toBe('docs/zh/intro.md');
    // Explicit tags still strip.
    expect(stripLocaleSegment('docs/zh-CN/intro.md', 'docs', ambiguous)).toBe('docs/intro.md');
  });
  it('leaves docs/de-DE-1996/ intact when only de-DE is registered (R3 regression)', () => {
    expect(stripLocaleSegment('docs/de-DE-1996/intro.md', 'docs', locales)).toBe(
      'docs/de-DE-1996/intro.md',
    );
  });
  it('returns the input when path is outside rootDir', () => {
    expect(stripLocaleSegment('other/intro.md', 'docs', locales)).toBe('other/intro.md');
  });
});

describe('shortLocaleTokens', () => {
  it('produces primary-subtag set with no ambiguity for distinct languages', () => {
    const { tokens, ambiguous } = shortLocaleTokens(locales);
    expect(tokens).toEqual(new Set(['en', 'zh', 'de']));
    expect(ambiguous).toEqual(new Set());
  });
  it('flags ambiguous primary subtags when two locales share it', () => {
    const ambiguousLocales: Locale[] = [
      { id: 'zh-CN', bcp47: 'zh-Hans-CN' },
      { id: 'zh-TW', bcp47: 'zh-Hant-TW' },
    ];
    const { tokens, ambiguous } = shortLocaleTokens(ambiguousLocales);
    expect(tokens).toEqual(new Set(['zh']));
    expect(ambiguous).toEqual(new Set(['zh']));
  });
});
