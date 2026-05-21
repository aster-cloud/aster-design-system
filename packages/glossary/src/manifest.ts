// Release manifest reader + verifier used by consumer-side
// `verify-release-manifest` CI check (plan §8.7).
//
// Fetches the manifest from a configurable URL (default CDN, fallback
// GitHub raw). Caches successful fetches with TTL discipline:
//   - manifest cache: 24h (manifests never retroactively change once
//     `promoted`)
//   - denylist cache: 1h, fail-closed when stale (see denylist.ts)
//
// Network failure with fresh cache → warning, CI passes.
// Network failure with stale cache → error, CI fails.
//
// Manifest signatures are verified against a bundled trust store
// (public keys shipped with the package). Tampering requires forging
// GPG; consumers never contact an external keyserver.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ReleaseManifestSchema, type ReleaseManifest } from './schema.js';
import { canonicalize, signedProjection } from './manifest-writer.js';
import {
  PRODUCTION_TRUST_STORE,
  isStubTrustStore,
  verifyEd25519,
  verifyStub,
  type TrustStore,
} from './trust-store.js';
import { fetchWithRetry, writeCacheAtomic } from './fetch-utils.js';

const MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface ManifestFetchOptions {
  /** Pinned glossary version (e.g. "1.0.0"). */
  version: string;
  /**
   * Ordered list of URL prefixes to try (e.g. ["https://glossary.aster-lang.cloud/releases/",
   * "https://raw.githubusercontent.com/aster-cloud/aster-design-system/main/packages/glossary/releases/"]).
   * Official-tier callers must pass ≥2 entries; the writer-side
   * coverage-matrix CI gate enforces this — runtime accepts ≥1 to keep
   * the consumer flexible (e.g. testing with a local file:// source).
   */
  sources: ReadonlyArray<string>;
  /** Cache directory; default `<cwd>/.glossary/cache`. */
  cacheDir?: string;
  /** Per-fetch timeout in ms. Default 10000 connect + 30000 read. */
  timeoutMs?: number;
  /** Max retries per source. Default 3 with exponential backoff. */
  maxRetries?: number;
  /** Override clock for testing. */
  nowMs?: () => number;
  /** Trust store used to verify the signature. Defaults to PRODUCTION_TRUST_STORE. */
  trust?: TrustStore;
}

export type ManifestVerifyOutcome =
  | { state: 'fresh'; manifest: ReleaseManifest; source: string }
  | { state: 'cached-fresh'; manifest: ReleaseManifest; cachedAt: number }
  | { state: 'cached-stale-error'; cachedAt: number; reason: string };

export class ManifestUnreachableError extends Error {
  constructor(message: string, public readonly attempted: ReadonlyArray<string>) {
    super(`[glossary/manifest] ${message}; attempted: ${attempted.join(', ')}`);
    this.name = 'ManifestUnreachableError';
  }
}

export class ManifestStateError extends Error {
  constructor(public readonly state: string, public readonly version: string) {
    super(
      `[glossary/manifest] version ${version} not yet promoted (state=${state}); manual bump bypasses release gating`,
    );
    this.name = 'ManifestStateError';
  }
}

export class ManifestSignatureError extends Error {
  constructor(public readonly version: string, public readonly reason: string) {
    super(`[glossary/manifest] signature verification failed for ${version}: ${reason}`);
    this.name = 'ManifestSignatureError';
  }
}

function assertManifestSignature(
  manifest: ReleaseManifest,
  version: string,
  trust: TrustStore,
): void {
  const { signature, ...unsigned } = manifest;
  const payload = canonicalize(signedProjection(unsigned));
  if (isStubTrustStore(trust)) {
    if (!verifyStub(payload, signature)) {
      throw new ManifestSignatureError(version, 'stub signature mismatch');
    }
    return;
  }
  const result = verifyEd25519(payload, signature, trust);
  if (!result.ok) {
    throw new ManifestSignatureError(version, result.reason ?? 'unknown');
  }
}

export async function fetchAndVerifyManifest(
  opts: ManifestFetchOptions,
): Promise<ManifestVerifyOutcome> {
  if (opts.sources.length < 1) {
    throw new Error('[glossary/manifest] sources must be non-empty');
  }
  const now = (opts.nowMs ?? Date.now)();
  const cacheDir = opts.cacheDir ?? join(process.cwd(), '.glossary', 'cache');
  const cacheFile = join(cacheDir, `manifest-${opts.version}.json`);
  const trust = opts.trust ?? PRODUCTION_TRUST_STORE;

  // Try each source in order.
  const errors: string[] = [];
  for (const baseUrl of opts.sources) {
    const url = baseUrl.endsWith('/') ? `${baseUrl}${opts.version}.json` : `${baseUrl}/${opts.version}.json`;
    try {
      const fetched = await fetchWithRetry(url, {
        timeoutMs: opts.timeoutMs ?? 30000,
        maxRetries: opts.maxRetries ?? 3,
      });
      const manifest = ReleaseManifestSchema.parse(JSON.parse(fetched));
      // Order: signature → state. State error and signature error are both
      // CONTENT errors; either should short-circuit the source loop because
      // every mirror serves the same content.
      assertManifestSignature(manifest, opts.version, trust);
      assertManifestState(manifest, opts.version);
      writeCacheAtomic(cacheFile, fetched);
      return { state: 'fresh', manifest, source: url };
    } catch (err) {
      if (err instanceof ManifestStateError) throw err;
      if (err instanceof ManifestSignatureError) throw err;
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // All sources failed. Try cache.
  if (existsSync(cacheFile)) {
    const cachedAt = statSync(cacheFile).mtimeMs;
    if (now - cachedAt <= MANIFEST_CACHE_TTL_MS) {
      const manifest = ReleaseManifestSchema.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
      assertManifestSignature(manifest, opts.version, trust);
      assertManifestState(manifest, opts.version);
      return { state: 'cached-fresh', manifest, cachedAt };
    }
    return {
      state: 'cached-stale-error',
      cachedAt,
      reason: `manifest source unreachable for ${Math.round((now - cachedAt) / 60000)}min; cache stale (>24h)`,
    };
  }

  throw new ManifestUnreachableError(
    'all manifest sources failed and no cache',
    errors,
  );
}

function assertManifestState(manifest: ReleaseManifest, version: string): void {
  if (manifest.version !== version) {
    throw new Error(`manifest version mismatch: requested ${version}, got ${manifest.version}`);
  }
  if (manifest.state !== 'promoted') {
    throw new ManifestStateError(manifest.state, version);
  }
}

// fetchWithRetry and writeCacheAtomic now live in fetch-utils.ts (shared
// with denylist.ts). See that file for the implementation.
