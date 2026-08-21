// ---------------------------------------------------------------------------
// Nightwatch Phase 15 — canonical stable-JSON + SHA-256 digest identity core.
//
// Single converged implementation of the historical private stable-JSON /
// digest helpers (recursive object-key sort via localeCompare, arrays
// element-wise in order, scalars via JSON.stringify, no undefined-value
// filtering, no cycle detection). Outputs are byte-identical to the retired
// private copies behind the platform's `inv:` / `sci:` / `sc:` / `fp:` /
// `candidate:` / `cluster:` identity prefixes.
//
// Preserved quirk: JSON.stringify(undefined) is the VALUE undefined, so a
// nested undefined renders as the literal text `undefined` (unquoted) and a
// top-level undefined input propagates as a non-string return, exactly like
// the historical helpers.
//
// Pure: node:crypto only; no fs/network/child-process/DB/AI/selfDev.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

export const CANONICAL_DIGEST_HELPERS_VERSION = 'nightwatch.canonical-digest.v1' as const;

const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;

export function stableJsonSorted(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonSorted).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJsonSorted(item)}`).join(',')}}`;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function prefixedDigest24(prefix: string, value: unknown): string {
  return `${prefix}:sha256:${sha256Hex(stableJsonSorted(value)).slice(0, 24)}`;
}

export function isEvidenceDigest(value: unknown): boolean {
  return typeof value === 'string' && EVIDENCE_DIGEST_RE.test(value);
}

export function isSourceSha(value: unknown): boolean {
  return typeof value === 'string' && SOURCE_SHA_RE.test(value);
}
