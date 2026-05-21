// Shared fetch helpers used by manifest.ts and denylist.ts.
//
// Both consumer-side fetchers need:
//   - Multi-source retry with exponential backoff
//   - file:// URL test seam so unit tests don't need HTTP servers
//   - Atomic cache write (temp + rename) for parallel-CI safety
//
// Extracted here to keep manifest/denylist focused on their domain logic
// (state machine, signature verification, TTL) and to make the retry/
// cache behavior verifiable in one place.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface FetchRetryOptions {
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Fetch a URL with retry + exponential backoff. Supports a `file://`
 * test seam: tests pass file:// URLs and the function reads the local
 * filesystem instead of invoking the real network stack.
 */
export async function fetchWithRetry(url: string, opts: FetchRetryOptions): Promise<string> {
  if (url.startsWith('file://')) {
    const path = url.slice('file://'.length);
    try {
      return readFileSync(path, 'utf8');
    } catch (e) {
      throw new Error(
        `HTTP 404 (file not found): ${path}${e instanceof Error ? ` — ${e.message}` : ''}`,
      );
    }
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

/**
 * Atomic write: temp file in same dir, then rename. Prevents readers
 * from observing a half-written JSON when CI runs in parallel and one
 * worker is mid-write while another is reading the cache.
 */
export function writeCacheAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  // pid + millisecond timestamp is not unique under high parallelism (two
  // forked workers in the same process with the same monotonic clock can
  // collide). Adding 8 random bytes makes the temp name effectively unique.
  const suffix = randomBytes(8).toString('hex');
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${suffix}`;
  writeFileSync(tmp, body, 'utf8');
  renameSync(tmp, path);
}
