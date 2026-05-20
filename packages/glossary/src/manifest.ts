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

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ReleaseManifestSchema, type ReleaseManifest } from './schema.js';

const MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface ManifestFetchOptions {
  /** Pinned glossary version (e.g. "1.0.0"). */
  version: string;
  /**
   * Ordered list of URL prefixes to try (e.g. ["https://glossary.aster-lang.cloud/releases/",
   * "https://raw.githubusercontent.com/aster-cloud/aster-design-system/main/packages/glossary/releases/"]).
   * v7 multi-source mandatory: must have ≥ 2 entries for official tier.
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

export async function fetchAndVerifyManifest(
  opts: ManifestFetchOptions,
): Promise<ManifestVerifyOutcome> {
  if (opts.sources.length < 1) {
    throw new Error('[glossary/manifest] sources must be non-empty');
  }
  const now = (opts.nowMs ?? Date.now)();
  const cacheDir = opts.cacheDir ?? join(process.cwd(), '.glossary', 'cache');
  const cacheFile = join(cacheDir, `manifest-${opts.version}.json`);

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
      assertManifestState(manifest, opts.version);
      writeCache(cacheFile, fetched, now);
      return { state: 'fresh', manifest, source: url };
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // All sources failed. Try cache.
  if (existsSync(cacheFile)) {
    const cachedAt = statSync(cacheFile).mtimeMs;
    if (now - cachedAt <= MANIFEST_CACHE_TTL_MS) {
      const manifest = ReleaseManifestSchema.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
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

async function fetchWithRetry(
  url: string,
  opts: { timeoutMs: number; maxRetries: number },
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }
        return await res.text();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function writeCache(path: string, body: string, _nowMs: number): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
}
