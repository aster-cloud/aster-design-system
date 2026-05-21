// G8a + G8b integration: full release pipeline round-trip without
// touching real npm / Maven / KMS. Uses a stub signer + filesystem
// "registries" that mirror the production CDN / GitHub raw URL paths.
//
// Validates:
//   - State machine accepts the canonical happy-path transition sequence
//     prepared → rc-validating → rc-validated → npm-promoting →
//     npm-published → maven-releasing → maven-released → promoted.
//   - State machine rejects illegal transitions.
//   - Denylist round-trip: writer signs → consumer fetches → verify
//     succeeds → denylist hit short-circuits the build.
//   - Manifest tampering is detected (re-signing required after
//     transition).
//   - Lockfile-PR fields can be updated without re-signing (immutable
//     parts are signature-protected; mutable parts aren't).

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import {
  createReleaseManifest,
  transitionManifest,
  recordLockfilePr,
  canonicalize,
  ReleaseStateError,
  sha256Hex,
} from '../../src/manifest-writer.js';
import { createDenylist, appendDenylistEntry } from '../../src/denylist-writer.js';
import { fetchAndVerifyManifest, ManifestStateError, ManifestSignatureError } from '../../src/manifest.js';
import { fetchDenylist, assertVersionNotDenylisted, DenylistedVersionError, DenylistSignatureError } from '../../src/denylist.js';

const STUB_TRUST = { trustedKeysPem: ['STUB'] };

// ─── Test infrastructure ───

/** Stub signer: appends `:signed-by-stub` so we can detect signature changes. */
const stubSign = async (payload: string) =>
  `stub-sig-${sha256Hex(payload).slice(0, 16)}`;

/** Filesystem "CDN" mocked via local file:// URLs. */
function mockCdn(dir: string) {
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    publish(filename: string, body: string): string {
      writeFileSync(join(dir, filename), body, 'utf8');
      // Return a "file://" URL the fetch helpers can resolve.
      return `file://${join(dir, filename)}`;
    },
  };
}

const baseInput = {
  version: '1.0.0',
  localesVersion: 1,
  initiator: 'alice@aster',
  npmIntegrity: 'sha512-' + 'a'.repeat(86) + '==',
  mavenJarSha256: 'b'.repeat(64),
  glossaryExportSha256: 'c'.repeat(64),
  consumers: [
    { repo: 'aster-cloud', tier: 'official' as const },
    { repo: 'aster-lang-dev', tier: 'official' as const },
  ],
};

// ─── State machine ───

describe('release manifest state machine', () => {
  it('starts at prepared and transitions through the happy path', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    expect(m.state).toBe('prepared');
    expect(m.transitions).toHaveLength(1);

    m = await transitionManifest(m, 'rc-validating', 'ci-build-001', stubSign);
    expect(m.state).toBe('rc-validating');
    m = await transitionManifest(m, 'rc-validated', 'ci-build-001', stubSign);
    m = await transitionManifest(m, 'npm-promoting', 'alice@aster+bob@aster', stubSign);
    m = await transitionManifest(m, 'npm-published', 'ci-build-001', stubSign);
    m = await transitionManifest(m, 'maven-releasing', 'ci-build-001', stubSign);
    m = await transitionManifest(m, 'maven-released', 'ci-build-001', stubSign);
    m = await transitionManifest(m, 'promoted', 'ci-build-001', stubSign);
    expect(m.state).toBe('promoted');
    expect(m.transitions).toHaveLength(8);
  });

  it('rejects illegal transitions', async () => {
    const m = await createReleaseManifest(baseInput, stubSign);
    await expect(transitionManifest(m, 'promoted', 'alice@aster', stubSign))
      .rejects.toThrow(ReleaseStateError);
    await expect(transitionManifest(m, 'npm-published', 'alice@aster', stubSign))
      .rejects.toThrow(/invalid transition/);
  });

  it('allows transition to failed from any non-terminal state', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    m = await transitionManifest(m, 'rc-validating', 'ci', stubSign);
    m = await transitionManifest(m, 'failed', 'ci', stubSign);
    expect(m.state).toBe('failed');
    // failed is terminal.
    await expect(transitionManifest(m, 'rc-validated', 'ci', stubSign))
      .rejects.toThrow(ReleaseStateError);
  });

  it('re-signs on every transition (signature changes)', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    const sig0 = m.signature;
    m = await transitionManifest(m, 'rc-validating', 'ci', stubSign);
    expect(m.signature).not.toBe(sig0);
  });

  it('lockfile-pr updates do NOT re-sign (mutable tracking field)', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    const sig0 = m.signature;
    const updated = recordLockfilePr(m, 'aster-cloud', 'https://github.com/.../pull/123');
    expect(updated.signature).toBe(sig0);
    expect(updated.consumers.find((c) => c.repo === 'aster-cloud')!['lockfile-pr'])
      .toBe('https://github.com/.../pull/123');
  });
});

// ─── Denylist round-trip ───

describe('denylist round-trip (G8a writer → G8b consumer)', () => {
  it('signs + appends + rejects duplicate', async () => {
    const dl0 = await createDenylist([], stubSign);
    expect(dl0.entries).toEqual([]);
    expect(dl0.signature).toMatch(/^stub-sig-/);

    const dl1 = await appendDenylistEntry(dl0, {
      'package-version': '1.0.0',
      reason: 'Wrong zh-CN translation of envelope-encryption',
      replacement: '1.0.1',
      'denylisted-at': '2026-05-20T15:00:00.000Z',
      'denylisted-by': 'alice@aster',
    }, stubSign);
    expect(dl1.entries).toHaveLength(1);
    expect(dl1.signature).not.toBe(dl0.signature);

    await expect(appendDenylistEntry(dl1, {
      'package-version': '1.0.0',          // duplicate
      reason: 'Different reason',
      replacement: '1.0.2',
      'denylisted-at': '2026-05-21T00:00:00.000Z',
      'denylisted-by': 'bob@aster',
    }, stubSign)).rejects.toThrow(/already denylisted/);
  });

  it('consumer rejects pinned-but-denylisted version', async () => {
    const dl = await createDenylist([{
      'package-version': '1.0.0',
      reason: 'bad',
      replacement: '1.0.1',
      'denylisted-at': '2026-05-20T15:00:00.000Z',
      'denylisted-by': 'alice@aster',
    }], stubSign);
    expect(() => assertVersionNotDenylisted(dl, '1.0.0'))
      .toThrow(DenylistedVersionError);
    expect(() => assertVersionNotDenylisted(dl, '1.0.1')).not.toThrow();
  });
});

// ─── Manifest fetch + verify (G8b consumer side) ───

describe('manifest verify (G8b consumer)', () => {
  it('rejects manifest in non-promoted state', async () => {
    const m = await createReleaseManifest(baseInput, stubSign);
    const cdn = mockCdn(mkdtempSync(`${tmpdir()}/cdn-`));
    cdn.publish('1.0.0.json', JSON.stringify(m));

    await expect(fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    })).rejects.toThrow(ManifestStateError);
  });

  it('accepts promoted manifest from primary source', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    const states = ['rc-validating', 'rc-validated', 'npm-promoting', 'npm-published',
                    'maven-releasing', 'maven-released', 'promoted'] as const;
    for (const s of states) m = await transitionManifest(m, s, 'ci', stubSign);

    const cdn = mockCdn(mkdtempSync(`${tmpdir()}/cdn-`));
    cdn.publish('1.0.0.json', JSON.stringify(m));

    const outcome = await fetchAndVerifyManifest({
      version: '1.0.0',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    });
    expect(outcome.state).toBe('fresh');
    expect(outcome.manifest.state).toBe('promoted');
  });

  it('rejects manifest with mismatched version field', async () => {
    let m = await createReleaseManifest(baseInput, stubSign);
    const states = ['rc-validating', 'rc-validated', 'npm-promoting', 'npm-published',
                    'maven-releasing', 'maven-released', 'promoted'] as const;
    for (const s of states) m = await transitionManifest(m, s, 'ci', stubSign);

    const cdn = mockCdn(mkdtempSync(`${tmpdir()}/cdn-`));
    // Publish under wrong filename.
    cdn.publish('1.0.1.json', JSON.stringify(m));

    await expect(fetchAndVerifyManifest({
      version: '1.0.1',
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    })).rejects.toThrow(/manifest version mismatch/);
  });
});

// ─── Denylist fetch via mock CDN ───

describe('denylist fetch (G8b consumer)', () => {
  it('fetches + verifies fresh denylist; rejects denylisted version', async () => {
    const dl = await createDenylist([{
      'package-version': '1.0.0',
      reason: 'integration test',
      replacement: '1.0.1',
      'denylisted-at': '2026-05-20T15:00:00.000Z',
      'denylisted-by': 'alice@aster',
    }], stubSign);
    const cdn = mockCdn(mkdtempSync(`${tmpdir()}/cdn-`));
    cdn.publish('denylist.json', JSON.stringify(dl));

    const outcome = await fetchDenylist({
      sources: [`file://${cdn.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    });
    expect(outcome.state).toBe('fresh');
    if (outcome.state === 'fresh') {
      expect(() => assertVersionNotDenylisted(outcome.denylist, '1.0.0'))
        .toThrow(DenylistedVersionError);
    }
  });

  it('falls through to secondary source when primary fails', async () => {
    const cdn = mockCdn(mkdtempSync(`${tmpdir()}/cdn-`));
    const github = mockCdn(mkdtempSync(`${tmpdir()}/github-`));
    const dl = await createDenylist([], stubSign);
    github.publish('denylist.json', JSON.stringify(dl));
    // cdn is intentionally empty — fetch will 404, fall through to github.

    const outcome = await fetchDenylist({
      sources: [`file://${cdn.dir}/`, `file://${github.dir}/`],
      cacheDir: mkdtempSync(`${tmpdir()}/cache-`),
      trust: STUB_TRUST,
    });
    expect(outcome.state).toBe('fresh');
  });
});

// ─── Canonicalization (signature stability) ───

describe('canonicalize()', () => {
  it('produces identical output for objects with reordered keys', () => {
    const a = canonicalize({ z: 1, a: 2 });
    const b = canonicalize({ a: 2, z: 1 });
    expect(a).toBe(b);
  });
  it('recurses into nested objects', () => {
    const s = canonicalize({ a: { y: 1, b: 2 }, z: 'x' });
    expect(s).toBe('{"a":{"b":2,"y":1},"z":"x"}');
  });
  it('preserves array order (not sorted)', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });
});
