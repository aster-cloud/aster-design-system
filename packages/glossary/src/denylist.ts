// Denylist fetcher + checker for the consumer-side
// `verify-release-manifest` CI flow (plan §3.6 + §8.7).
//
// v7 differences from manifest cache:
//   - TTL is **1 hour** (vs 24h for manifest), so a newly-denylisted
//     version reaches consumers fast.
//   - Stale cache → fail-closed (manifest is fail-open within TTL).
//   - Multi-source mandatory: workflow fetches every configured source
//     and uses the highest valid signed `updated-at` (H4 hardening).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DenylistSchema, type Denylist } from './schema.js';
import { canonicalize } from './manifest-writer.js';
import { signedDenylistProjection } from './denylist-writer.js';
import {
  PRODUCTION_TRUST_STORE,
  isStubTrustStore,
  verifyEd25519,
  verifyStub,
  type TrustStore,
} from './trust-store.js';
import { fetchWithRetry, writeCacheAtomic } from './fetch-utils.js';

const DENYLIST_CACHE_TTL_MS = 60 * 60 * 1000; // 1h (v7 — fail-closed when stale)

export interface DenylistFetchOptions {
  sources: ReadonlyArray<string>;
  cacheDir?: string;
  timeoutMs?: number;
  maxRetries?: number;
  nowMs?: () => number;
  /** Trust store for signature verification. Defaults to PRODUCTION_TRUST_STORE. */
  trust?: TrustStore;
}

export type DenylistFetchOutcome =
  | { state: 'fresh'; denylist: Denylist; source: string }
  | { state: 'cached-fresh'; denylist: Denylist; cachedAt: number };

export class DenylistStaleError extends Error {
  constructor(public readonly cachedAt: number, public readonly nowMs: number) {
    super(
      `[glossary/denylist] denylist source unreachable for >1h (cached at ${new Date(
        cachedAt,
      ).toISOString()}, now ${new Date(nowMs).toISOString()}); refusing to validate against potentially-outdated denylist`,
    );
    this.name = 'DenylistStaleError';
  }
}

export class DenylistedVersionError extends Error {
  constructor(
    public readonly version: string,
    public readonly reason: string,
    public readonly replacement: string,
  ) {
    super(
      `[glossary/denylist] version ${version} denylisted: ${reason}; upgrade to ${replacement}`,
    );
    this.name = 'DenylistedVersionError';
  }
}

export class DenylistSignatureError extends Error {
  constructor(public readonly source: string, public readonly reason: string) {
    super(`[glossary/denylist] signature verification failed for ${source}: ${reason}`);
    this.name = 'DenylistSignatureError';
  }
}

function assertDenylistSignature(d: Denylist, source: string, trust: TrustStore): void {
  const { signature, ...unsigned } = d;
  const payload = canonicalize(signedDenylistProjection(unsigned));
  if (isStubTrustStore(trust)) {
    if (!verifyStub(payload, signature)) {
      throw new DenylistSignatureError(source, 'stub signature mismatch');
    }
    return;
  }
  const result = verifyEd25519(payload, signature, trust);
  if (!result.ok) {
    throw new DenylistSignatureError(source, result.reason ?? 'unknown');
  }
}

export async function fetchDenylist(opts: DenylistFetchOptions): Promise<DenylistFetchOutcome> {
  if (opts.sources.length < 1) {
    throw new Error('[glossary/denylist] sources must be non-empty');
  }
  const now = (opts.nowMs ?? Date.now)();
  const cacheDir = opts.cacheDir ?? join(process.cwd(), '.glossary', 'cache');
  const cacheFile = join(cacheDir, 'denylist.json');
  const trust = opts.trust ?? PRODUCTION_TRUST_STORE;

  // H4: fetch every configured source and prefer the highest valid signed updated-at.
  // "Valid" = signature verifies against the bundled trust store. Sources
  // that fail to verify are discarded with an error, not silently trusted.
  const fetched: Array<{ denylist: Denylist; source: string }> = [];
  const errors: string[] = [];
  for (const baseUrl of opts.sources) {
    const url = baseUrl.endsWith('denylist.json')
      ? baseUrl
      : baseUrl.endsWith('/')
        ? `${baseUrl}denylist.json`
        : `${baseUrl}/denylist.json`;
    try {
      const body = await fetchWithRetry(url, {
        timeoutMs: opts.timeoutMs ?? 30000,
        maxRetries: opts.maxRetries ?? 3,
      });
      const parsed = DenylistSchema.parse(JSON.parse(body));
      assertDenylistSignature(parsed, url, trust);
      fetched.push({ denylist: parsed, source: url });
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (fetched.length > 0) {
    // Prefer highest valid signed updated-at (all entries here have already
    // passed signature verification above).
    fetched.sort((a, b) =>
      new Date(b.denylist['updated-at']).getTime() - new Date(a.denylist['updated-at']).getTime(),
    );
    const winner = fetched[0]!;
    writeCacheAtomic(cacheFile, JSON.stringify(winner.denylist));
    return { state: 'fresh', denylist: winner.denylist, source: winner.source };
  }

  // All sources failed; try cache.
  if (existsSync(cacheFile)) {
    const cachedAt = statSync(cacheFile).mtimeMs;
    if (now - cachedAt <= DENYLIST_CACHE_TTL_MS) {
      const denylist = DenylistSchema.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
      assertDenylistSignature(denylist, 'cache', trust);
      return { state: 'cached-fresh', denylist, cachedAt };
    }
    throw new DenylistStaleError(cachedAt, now);
  }

  throw new Error(
    `[glossary/denylist] all sources failed and no cache; errors: ${errors.join('; ')}`,
  );
}

export function assertVersionNotDenylisted(denylist: Denylist, version: string): void {
  const entry = denylist.entries.find((e) => e['package-version'] === version);
  if (entry) {
    throw new DenylistedVersionError(version, entry.reason, entry.replacement);
  }
}

// fetchWithRetry + writeCacheAtomic now live in fetch-utils.ts (shared with manifest.ts).
