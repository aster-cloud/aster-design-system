// Release-manifest writer used by the release pipeline (plan §8.1).
//
// Server-side ONLY — runs in the publish workflow, not in consumer
// CI. Produces signed `releases/<version>.json` files that consumers
// verify via `manifest.ts` + bundled trust store.
//
// State machine:
//   prepared → rc-validating → rc-validated → npm-promoting →
//   npm-published → maven-releasing → maven-released → promoted
//
// Any transition can also go to `failed` (terminal); recovery is via
// out-of-band denylist (see `denylist-writer.ts`).
//
// Signature covers `signedProjection()` — a deterministic projection
// over the IMMUTABLE fields (version, localesVersion, state,
// transitions, checksums, consumers[].repo, consumers[].tier). The
// mutable tracking field `consumers[].lockfile-pr` is OUTSIDE the
// signed projection, so `recordLockfilePr()` can update it without
// re-signing. The verifier in `manifest.ts` uses the same projection.
//
// Signing is pluggable: production passes a KMS-backed Ed25519 signer,
// tests pass an in-process keypair signer.

import { createHash } from 'node:crypto';
import { ReleaseManifestSchema, type ReleaseManifest } from './schema.js';

export type ReleaseState = ReleaseManifest['state'];

export interface NewReleaseInput {
  version: string;
  localesVersion: number;
  initiator: string;
  npmIntegrity: string;
  mavenJarSha256: string;
  glossaryExportSha256: string;
  consumers: Array<{ repo: string; tier: 'official' | 'community' }>;
}

export interface SignFn {
  (payload: string): Promise<string>;
}

/**
 * Deterministic signed projection — covers the immutable subset of a
 * manifest. Used by both signer (server-side) and verifier (consumer-side)
 * so they always hash the same bytes.
 *
 * Excludes:
 *   - `consumers[].lockfile-pr` and `consumers[].merged-at` (mutable tracking)
 *   - `signature` itself
 */
export function signedProjection(m: Omit<ReleaseManifest, 'signature'>): unknown {
  return {
    version: m.version,
    localesVersion: m.localesVersion,
    state: m.state,
    transitions: m.transitions,
    checksums: m.checksums,
    consumers: m.consumers.map((c) => ({ repo: c.repo, tier: c.tier })),
  };
}

export async function createReleaseManifest(input: NewReleaseInput, sign: SignFn): Promise<ReleaseManifest> {
  const now = new Date().toISOString();
  const unsigned: Omit<ReleaseManifest, 'signature'> = {
    version: input.version,
    localesVersion: input.localesVersion,
    state: 'prepared',
    transitions: [{ to: 'prepared', at: now, by: input.initiator }],
    checksums: {
      'npm-integrity': input.npmIntegrity,
      'maven-jar-sha256': input.mavenJarSha256,
      'glossary-export-sha256': input.glossaryExportSha256,
    },
    consumers: input.consumers.map((c) => ({
      repo: c.repo,
      tier: c.tier,
      'lockfile-pr': null,
    })),
  };
  const signature = await sign(canonicalize(signedProjection(unsigned)));
  return ReleaseManifestSchema.parse({ ...unsigned, signature });
}

const VALID_TRANSITIONS: Record<ReleaseState, ReleaseState[]> = {
  prepared: ['rc-validating', 'failed'],
  'rc-validating': ['rc-validated', 'failed'],
  'rc-validated': ['npm-promoting', 'failed'],
  'npm-promoting': ['npm-published', 'failed'],
  'npm-published': ['maven-releasing', 'failed'],
  'maven-releasing': ['maven-released', 'failed'],
  'maven-released': ['promoted', 'failed'],
  promoted: [],
  failed: [],
};

export class ReleaseStateError extends Error {
  constructor(from: ReleaseState, to: ReleaseState) {
    super(`[manifest-writer] invalid transition: ${from} → ${to}`);
    this.name = 'ReleaseStateError';
  }
}

export async function transitionManifest(
  manifest: ReleaseManifest,
  to: ReleaseState,
  by: string,
  sign: SignFn,
): Promise<ReleaseManifest> {
  const valid = VALID_TRANSITIONS[manifest.state];
  if (!valid.includes(to)) {
    throw new ReleaseStateError(manifest.state, to);
  }
  const next: Omit<ReleaseManifest, 'signature'> = {
    ...manifest,
    state: to,
    transitions: [...manifest.transitions, { to, at: new Date().toISOString(), by }],
  };
  // Re-sign (state + transitions array changed, both inside signedProjection).
  const signature = await sign(canonicalize(signedProjection(next)));
  return ReleaseManifestSchema.parse({ ...next, signature });
}

export function recordLockfilePr(
  manifest: ReleaseManifest,
  repo: string,
  prUrl: string,
  mergedAt?: string,
): ReleaseManifest {
  // No re-signing: `lockfile-pr` and `merged-at` are mutable tracking fields
  // OUTSIDE `signedProjection()`. The existing signature still verifies
  // against the unchanged immutable subset.
  return ReleaseManifestSchema.parse({
    ...manifest,
    consumers: manifest.consumers.map((c) =>
      c.repo === repo ? { ...c, 'lockfile-pr': prUrl, 'merged-at': mergedAt ?? c['merged-at'] ?? null } : c,
    ),
  });
}

/** Canonical JSON for signing — sorted keys, no whitespace. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/** SHA-256 of a string. Used by the publish workflow to checksum artifacts. */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}
