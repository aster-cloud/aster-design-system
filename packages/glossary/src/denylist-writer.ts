// Out-of-band denylist writer (plan §3.6 v6 fix).
//
// Produces `releases/denylist.json` files signed by the
// `glossary-release-eng-key` (Vault). Consumers fetch via
// `denylist.ts` from CDN/GitHub raw with 1h fail-closed cache.
//
// Signature covers `signedDenylistProjection()` — version, updated-at,
// entries. The verifier in `denylist.ts` re-runs the same projection.
//
// NOT bundled into the next release artifact — the denylist must
// propagate within minutes, not at the cadence of the next package
// version. This decouples bad-release recovery from release timing.

import { DenylistSchema, type Denylist, type DenylistEntry } from './schema.js';
import type { SignFn } from './manifest-writer.js';
import { canonicalize } from './manifest-writer.js';

/** Deterministic projection used by both signer and verifier. */
export function signedDenylistProjection(d: Omit<Denylist, 'signature'>): unknown {
  return {
    version: d.version,
    'updated-at': d['updated-at'],
    entries: d.entries,
  };
}

export async function createDenylist(
  entries: DenylistEntry[],
  sign: SignFn,
  now: Date = new Date(),
): Promise<Denylist> {
  const unsigned: Omit<Denylist, 'signature'> = {
    version: 1,
    'updated-at': now.toISOString(),
    entries,
  };
  const signature = await sign(canonicalize(signedDenylistProjection(unsigned)));
  return DenylistSchema.parse({ ...unsigned, signature });
}

export async function appendDenylistEntry(
  current: Denylist,
  entry: DenylistEntry,
  sign: SignFn,
  now: Date = new Date(),
): Promise<Denylist> {
  // Refuse duplicate package-version entries (the original record is
  // canonical; if the reason needs updating, the human edits the
  // existing record manually + re-signs).
  const existing = current.entries.find((e) => e['package-version'] === entry['package-version']);
  if (existing) {
    throw new Error(
      `[denylist-writer] version ${entry['package-version']} already denylisted (denylisted-at=${existing['denylisted-at']})`,
    );
  }
  const updated: Omit<Denylist, 'signature'> = {
    version: 1,
    'updated-at': now.toISOString(),
    entries: [...current.entries, entry],
  };
  const signature = await sign(canonicalize(signedDenylistProjection(updated)));
  return DenylistSchema.parse({ ...updated, signature });
}
