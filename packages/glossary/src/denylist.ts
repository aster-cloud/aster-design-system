// Denylist fetcher + checker for the consumer-side
// `verify-release-manifest` CI flow (plan §3.6 + §8.7).
//
// v7 differences from manifest cache:
//   - TTL is **1 hour** (vs 24h for manifest), so a newly-denylisted
//     version reaches consumers fast.
//   - Stale cache → fail-closed (manifest is fail-open within TTL).
//   - Multi-source mandatory: workflow fetches every configured source
//     and uses the highest valid signed `updated-at` (H4 hardening).

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DenylistSchema, type Denylist } from './schema.js';

const DENYLIST_CACHE_TTL_MS = 60 * 60 * 1000; // 1h (v7 — fail-closed when stale)

export interface DenylistFetchOptions {
  sources: ReadonlyArray<string>;
  cacheDir?: string;
  timeoutMs?: number;
  maxRetries?: number;
  nowMs?: () => number;
}

export type DenylistFetchOutcome =
  | { state: 'fresh'; denylist: Denylist; source: string }
  | { state: 'cached-fresh'; denylist: Denylist; cachedAt: number }
  | { state: 'cached-stale-error'; cachedAt: number; reason: string };

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

export async function fetchDenylist(opts: DenylistFetchOptions): Promise<DenylistFetchOutcome> {
  if (opts.sources.length < 1) {
    throw new Error('[glossary/denylist] sources must be non-empty');
  }
  const now = (opts.nowMs ?? Date.now)();
  const cacheDir = opts.cacheDir ?? join(process.cwd(), '.glossary', 'cache');
  const cacheFile = join(cacheDir, 'denylist.json');

  // H4: fetch every configured source and prefer the highest valid signed updated-at.
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
      fetched.push({ denylist: parsed, source: url });
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (fetched.length > 0) {
    // Prefer highest valid signed updated-at.
    fetched.sort((a, b) =>
      new Date(b.denylist['updated-at']).getTime() - new Date(a.denylist['updated-at']).getTime(),
    );
    const winner = fetched[0]!;
    writeCache(cacheFile, JSON.stringify(winner.denylist));
    return { state: 'fresh', denylist: winner.denylist, source: winner.source };
  }

  // All sources failed; try cache.
  if (existsSync(cacheFile)) {
    const cachedAt = statSync(cacheFile).mtimeMs;
    if (now - cachedAt <= DENYLIST_CACHE_TTL_MS) {
      const denylist = DenylistSchema.parse(JSON.parse(readFileSync(cacheFile, 'utf8')));
      return { state: 'cached-fresh', denylist, cachedAt };
    }
    return {
      state: 'cached-stale-error',
      cachedAt,
      reason: `denylist source unreachable for ${Math.round(
        (now - cachedAt) / 60000,
      )}min; cache stale (>1h); fail-closed`,
    };
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

async function fetchWithRetry(
  url: string,
  opts: { timeoutMs: number; maxRetries: number },
): Promise<string> {
  // Test seam: file:// URLs read directly.
  if (url.startsWith('file://')) {
    const { readFileSync, existsSync } = await import('node:fs');
    const path = url.slice('file://'.length);
    if (!existsSync(path)) throw new Error(`HTTP 404 (file not found): ${path}`);
    return readFileSync(path, 'utf8');
  }

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

function writeCache(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
}
