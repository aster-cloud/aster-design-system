// Regression tests for the 8 critical blind spots flagged by the
// Critical-1..6 + improvement pass on 2026-05-21.
//
// Each block names the original finding it pins down so future
// reviewers can trace assertions back to their motivation.

import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createReleaseManifest,
  transitionManifest,
  sha256Hex,
} from '../../src/manifest-writer.js';
import { createDenylist } from '../../src/denylist-writer.js';
import { fetchAndVerifyManifest, ManifestSignatureError } from '../../src/manifest.js';
import { fetchDenylist, DenylistSignatureError, DenylistStaleError } from '../../src/denylist.js';
import { findTermMatches } from '../../src/scanner.js';
import type { Match } from '../../src/schema.js';

const STUB_TRUST = { trustedKeysPem: ['STUB'] };

const stubSign = async (payload: string) =>
  `stub-sig-${sha256Hex(payload).slice(0, 16)}`;

const baseInput = {
  version: '1.0.0',
  localesVersion: 1,
  initiator: 'alice@aster',
  npmIntegrity: 'sha512-' + 'a'.repeat(86) + '==',
  mavenJarSha256: 'b'.repeat(64),
  glossaryExportSha256: 'c'.repeat(64),
  consumers: [
    { repo: 'aster-cloud', tier: 'official' as const },
  ],
};

function mockCdn(): { dir: string; publish: (name: string, body: string) => string } {
  const dir = mkdtempSync(`${tmpdir()}/regression-cdn-`);
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    publish(name, body) {
      writeFileSync(join(dir, name), body, 'utf8');
      return `file://${join(dir, name)}`;
    },
  };
}

async function publishPromotedManifest() {
  let m = await createReleaseManifest(baseInput, stubSign);
  for (const s of [
    'rc-validating', 'rc-validated', 'npm-promoting', 'npm-published',
    'maven-releasing', 'maven-released', 'promoted',
  ] as const) {
    m = await transitionManifest(m, s, 'ci', stubSign);
  }
  return m;
}

// ─── Regression 1: signature tampering must be rejected ───

describe('signature integrity (Critical-2 regression)', () => {
  it('rejects a manifest whose state has been tampered with', async () => {
    const m = await publishPromotedManifest();
    // Forge: flip state back to 'prepared' to look fresher; keep signature unchanged.
    const tampered = { ...m, state: 'prepared' as const };
    const cdn = mockCdn();
    cdn.publish('1.0.0.json', JSON.stringify(tampered));
    await expect(fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    })).rejects.toThrow(ManifestSignatureError);
  });

  it('rejects denylist cache tampering on cached-fresh path', async () => {
    const dl = await createDenylist([{
      'package-version': '1.0.0',
      reason: 'test',
      replacement: '1.0.1',
      'denylisted-at': '2026-05-20T15:00:00.000Z',
      'denylisted-by': 'alice@aster',
    }], stubSign);
    const cdn = mockCdn();
    cdn.publish('denylist.json', JSON.stringify(dl));
    const cacheDir = mkdtempSync(`${tmpdir()}/cache-`);
    // Prime cache.
    await fetchDenylist({
      sources: [`file://${cdn.dir}/`],
      cacheDir,
      trust: STUB_TRUST,
    });
    // Tamper cache (add unsigned entry).
    const { writeFileSync, readFileSync } = await import('node:fs');
    const cacheFile = join(cacheDir, 'denylist.json');
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
    cached.entries.push({
      'package-version': '999.999.999',
      reason: 'attacker-added',
      replacement: '0.0.0',
      'denylisted-at': '2026-05-20T20:00:00.000Z',
      'denylisted-by': 'mallory@evil',
    });
    writeFileSync(cacheFile, JSON.stringify(cached), 'utf8');
    // CDN unreachable so cache path is exercised.
    await expect(fetchDenylist({
      sources: ['file:///nonexistent/'],
      cacheDir,
      trust: STUB_TRUST,
    })).rejects.toThrow(DenylistSignatureError);
  });

  it('rejects denylist where entries have been swapped', async () => {
    const dl = await createDenylist([{
      'package-version': '1.0.0',
      reason: 'test',
      replacement: '1.0.1',
      'denylisted-at': '2026-05-20T15:00:00.000Z',
      'denylisted-by': 'alice@aster',
    }], stubSign);
    // Forge: add a new entry without re-signing.
    const tampered = {
      ...dl,
      entries: [...dl.entries, {
        'package-version': '2.0.0',
        reason: 'attacker-added',
        replacement: '0.0.0',
        'denylisted-at': '2026-05-20T16:00:00.000Z',
        'denylisted-by': 'mallory@evil',
      }],
    };
    const cdn = mockCdn();
    cdn.publish('denylist.json', JSON.stringify(tampered));
    await expect(fetchDenylist({
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    })).rejects.toThrow();
  });

  it('verifies a real (untampered) promoted manifest', async () => {
    const m = await publishPromotedManifest();
    const cdn = mockCdn();
    cdn.publish('1.0.0.json', JSON.stringify(m));
    const outcome = await fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    });
    expect(outcome.state).toBe('fresh');
  });

  it('verifies signature on cached-fresh path (source fails, cache hot)', async () => {
    const m = await publishPromotedManifest();
    const cdn = mockCdn();
    cdn.publish('1.0.0.json', JSON.stringify(m));
    const cacheDir = mkdtempSync(`${tmpdir()}/cache-`);
    // First call: populates cache from CDN.
    await fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir,
      trust: STUB_TRUST,
    });
    // Second call: CDN unreachable (bogus dir), but cache should serve.
    const outcome = await fetchAndVerifyManifest({
      version: '1.0.0',
      sources: ['file:///nonexistent/'],
      cacheDir,
      trust: STUB_TRUST,
    });
    expect(outcome.state).toBe('cached-fresh');
  });

  it('rejects cached manifest where cache file was tampered', async () => {
    const m = await publishPromotedManifest();
    const cdn = mockCdn();
    cdn.publish('1.0.0.json', JSON.stringify(m));
    const cacheDir = mkdtempSync(`${tmpdir()}/cache-`);
    await fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir,
      trust: STUB_TRUST,
    });
    // Tamper the cache file directly.
    const { writeFileSync, readFileSync } = await import('node:fs');
    const cacheFile = join(cacheDir, 'manifest-1.0.0.json');
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
    cached.state = 'prepared';  // signature no longer matches
    writeFileSync(cacheFile, JSON.stringify(cached), 'utf8');
    // CDN unreachable so cache path is exercised.
    await expect(fetchAndVerifyManifest({
      version: '1.0.0',
      sources: ['file:///nonexistent/'],
      cacheDir,
      trust: STUB_TRUST,
    })).rejects.toThrow(ManifestSignatureError);
  });

  it('fail-closes when trust store is empty', async () => {
    const m = await publishPromotedManifest();
    const cdn = mockCdn();
    cdn.publish('1.0.0.json', JSON.stringify(m));
    await expect(fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      // PRODUCTION_TRUST_STORE is empty in this repo; explicit empty also fails.
      trust: { trustedKeysPem: [] },
    })).rejects.toThrow(/empty.*fail-closed/);
  });
});

// ─── Regression 2: reviewed-regex empty-match cannot deadlock ───

describe('reviewed-regex safety (Critical-3 regression)', () => {
  it('terminates on empty-match regex .*?', () => {
    // Should not deadlock — if it does, vitest's default timeout will catch it.
    const start = Date.now();
    const match: Match = {
      mode: 'reviewed-regex',
      'case-sensitive': false,
      boundary: 'none',
      normalize: [],
      'regex-rationale': 'regression test',
    };
    const result = findTermMatches('hello world', '.*?', match);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // should be near-instant
    expect(Array.isArray(result)).toBe(true);
  });

  it('terminates on regex that matches at every position', () => {
    const start = Date.now();
    const match: Match = {
      mode: 'reviewed-regex',
      'case-sensitive': false,
      boundary: 'none',
      normalize: [],
      'regex-rationale': 'regression test',
    };
    findTermMatches('abcdef', '(?=.)', match);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it('returns no matches on malformed regex without crashing', () => {
    const match: Match = {
      mode: 'reviewed-regex',
      'case-sensitive': false,
      boundary: 'none',
      normalize: [],
      'regex-rationale': 'regression test',
    };
    // loader is supposed to catch this at load time; scanner is defensive.
    expect(() => findTermMatches('abc', '[unclosed', match)).not.toThrow();
  });
});

// ─── Regression 3: phrase mode honors boundary: 'none' ───

describe('phrase boundary: none honored (Codex finding)', () => {
  it('matches inside identifier when boundary: none', () => {
    const match: Match = {
      mode: 'phrase',
      'case-sensitive': false,
      boundary: 'none',
      normalize: [],
    };
    expect(findTermMatches('xenvelopeY', 'envelope', match).length).toBe(1);
  });

  it('rejects inside identifier when boundary: unicode-word', () => {
    const match: Match = {
      mode: 'phrase',
      'case-sensitive': false,
      boundary: 'unicode-word',
      normalize: [],
    };
    expect(findTermMatches('xenvelopeY', 'envelope', match).length).toBe(0);
  });
});
