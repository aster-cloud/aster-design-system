// Bundled trust store for signature verification.
//
// Ships with the package; consumers never contact a keyserver. To rotate:
// add the new public key, keep the old one for a grace period covering
// any in-flight `promoted` manifest signed under the old key, then
// remove the old key in the next major.
//
// Production keys are Ed25519 SPKI in PEM. Tests inject keys via
// `verifyWith({ trustedKeysPem })` rather than mutating this module.

import { createHash, createPublicKey, verify as nodeVerify } from 'node:crypto';

export interface TrustStore {
  /** Public keys in PEM (SPKI) format. Verification accepts any. */
  trustedKeysPem: ReadonlyArray<string>;
}

/**
 * Bundled production keys. Empty in this repo because the contract is
 * still pre-rollout; CI populates this from a Vault-managed file at
 * publish time. Until populated, `verifyEd25519()` fails closed.
 */
export const PRODUCTION_TRUST_STORE: TrustStore = {
  trustedKeysPem: [],
};

export interface VerifyResult {
  ok: boolean;
  /** PEM of the key that succeeded, or null on failure. */
  matchedKey: string | null;
  /** Human-readable reason on failure. */
  reason?: string;
}

/**
 * Verify an Ed25519 signature against every key in the trust store.
 * Signature is expected as base64. Payload is the canonical JSON bytes.
 *
 * Returns `{ ok: true }` if ANY key verifies. `{ ok: false }` if all fail
 * or the trust store is empty (fail-closed).
 */
export function verifyEd25519(
  payload: string,
  signatureB64: string,
  trust: TrustStore,
): VerifyResult {
  if (trust.trustedKeysPem.length === 0) {
    return { ok: false, matchedKey: null, reason: 'trust store is empty (fail-closed)' };
  }
  const payloadBytes = Buffer.from(payload, 'utf8');
  const sigBytes = Buffer.from(signatureB64, 'base64');
  for (const pem of trust.trustedKeysPem) {
    try {
      const key = createPublicKey(pem);
      // Ed25519 uses the algorithm-encoded key; Node's verify(null, ...) selects
      // the algorithm from the key.
      if (nodeVerify(null, payloadBytes, key, sigBytes)) {
        return { ok: true, matchedKey: pem };
      }
    } catch {
      // Malformed key in trust store or wrong-curve signature → try next.
      continue;
    }
  }
  return { ok: false, matchedKey: null, reason: `no trusted key verified the signature` };
}

/**
 * Test-only ergonomic check: accept a non-Ed25519 stub signature format
 * (`stub-sig-<sha-prefix>`) when the trust store contains the literal
 * sentinel `STUB`. Used by integration tests so they don't have to
 * juggle real keypairs.
 */
export function isStubTrustStore(trust: TrustStore): boolean {
  return trust.trustedKeysPem.length === 1 && trust.trustedKeysPem[0] === 'STUB';
}

export function verifyStub(payload: string, signature: string): boolean {
  // Mirrors the test stub in release-pipeline.test.ts: `stub-sig-<sha256(payload).slice(0,16)>`.
  const expected = `stub-sig-${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`;
  return signature === expected;
}
