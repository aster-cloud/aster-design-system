// Release-manifest writer used by the release pipeline (plan §8.1).
//
// Server-side ONLY — runs in the publish workflow, not in consumer
// CI. Produces signed `releases/<version>.json` files that consumers
// verify via `manifest.ts` + KMS public key bundled in the package.
//
// State machine:
//   prepared → rc-validating → rc-validated → npm-promoting →
//   npm-published → maven-releasing → maven-released → promoted
//
// Any transition can also go to `failed` (terminal); recovery is via
// out-of-band denylist (see `denylist-writer.ts`).
//
// Signing is intentionally pluggable: in production the `sign` argument
// hits KMS via OIDC. In tests we pass a stub.

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
  const signature = await sign(canonicalize(unsigned));
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
  // Re-sign (transitions array changed, so signature must regenerate).
  const signature = await sign(canonicalize(next));
  return ReleaseManifestSchema.parse({ ...next, signature });
}

export function recordLockfilePr(
  manifest: ReleaseManifest,
  repo: string,
  prUrl: string,
  mergedAt?: string,
): ReleaseManifest {
  // Updating consumer rows does NOT re-sign the manifest by design — the
  // signature covers the immutable parts (version, state, transitions,
  // checksums). consumer.lockfile-pr is a tracking field; tampering with
  // it doesn't change what the contract authorizes.
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
