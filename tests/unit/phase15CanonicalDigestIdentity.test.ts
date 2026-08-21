// ---------------------------------------------------------------------------
// Nightwatch Phase 15 — canonical digest identity core (workstream C).
//
// Pins the converged stable-JSON + SHA-256 identity helpers
// (src/core/identity/canonicalDigest.ts) byte-for-byte against a TEST-LOCAL
// reference copy of the historical Class-A private algorithm, and proves the
// canonical helper reproduces the live platform identity paths
// (`inv:` / `sci:` / `sc:` from src/oracles/semantic/cluster.ts and the
// `ev:sha256:<24>` evidence-digest format) exactly.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  CANONICAL_DIGEST_HELPERS_VERSION,
  isEvidenceDigest,
  isSourceSha,
  prefixedDigest24,
  sha256Hex,
  stableJsonSorted,
} from '../../src/core/identity/canonicalDigest';
import {
  SEMANTIC_CLUSTER_VERSION,
  SEMANTIC_CONTRACT_IDENTITY_VERSION,
  semanticClusterKey,
  semanticContractIdentity,
  semanticInvariantDefinitionId,
} from '../../src/oracles/semantic/cluster';
import type { InvariantDefinition } from '../../src/oracles/expectations/types';

// ---------------------------------------------------------------------------
// TEST-LOCAL reference copy of the historical Class-A algorithm (as it lived
// in aiReview/util.ts, triage/dossier.ts, triage/dossierV2.ts,
// triage/clustering.ts, oracles/semantic/cluster.ts, journeys/fingerprint.ts).
// This copy is intentionally NOT imported from src — it is the frozen
// historical behavior this workstream must converge without changing.
// ---------------------------------------------------------------------------

function legacyStableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(legacyStableJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${legacyStableJson(item)}`).join(',')}}`;
}

function legacyDigest24(value: unknown): string {
  return createHash('sha256').update(legacyStableJson(value), 'utf8').digest('hex').slice(0, 24);
}

const CORPUS: readonly { readonly label: string; readonly value: unknown }[] = [
  { label: 'empty object', value: {} },
  { label: 'empty array', value: [] },
  { label: 'nested objects', value: { z: { b: 1, a: { y: [1, { c: true }] } }, a: null } },
  { label: 'arrays keep element order', value: [3, 1, 2, ['b', 'a'], [{ k: 2 }, { k: 1 }]] },
  { label: 'deeply nested empties', value: { a: [[], {}, [[]], [{}]] } },
  { label: 'unicode keys ä vs z', value: { 'ä': 1, 'z': 2 } },
  { label: 'case keys a vs B', value: { 'a': 1, 'B': 2 } },
  { label: 'numeric-looking keys 10 vs 9', value: { '10': 1, '9': 2 } },
  { label: 'mixed tricky key set', value: { 'ä': 1, 'z': 2, 'a': 3, 'B': 4, '10': 5, '9': 6, '_': 7 } },
  { label: 'nested undefined value', value: { outer: { k: undefined }, b: 1 } },
  { label: 'array containing undefined', value: [undefined, 1] },
  { label: 'null vs absent', value: { n: null } },
  { label: 'scalar numbers', value: { zero: 0, negZero: -0, big: 1e21, frac: 0.1, neg: -42 } },
  { label: 'non-finite numbers', value: { nan: NaN, inf: Infinity, negInf: -Infinity } },
  { label: 'booleans', value: { t: true, f: false } },
  { label: 'strings needing escapes', value: { q: 'quo"te', nl: 'li\nne', tab: 't\tab', back: 'back\\slash', uni: 'ünïcodé ✓' } },
  { label: 'long string value', value: { long: 'x'.repeat(10000) } },
  { label: 'long unicode key', value: { ['κ'.repeat(500)]: 'v' } },
  { label: 'array of objects with overlapping keys', value: [{ b: 1, a: 2 }, { d: 3, c: 4 }] },
];

test.describe('Phase 15 — canonical digest identity core', () => {
  test('declares the frozen helper version', () => {
    expect(CANONICAL_DIGEST_HELPERS_VERSION).toBe('nightwatch.canonical-digest.v1');
  });

  test('stableJsonSorted is byte-identical to the historical Class-A algorithm over the corpus', () => {
    for (const entry of CORPUS) {
      expect(stableJsonSorted(entry.value), `stable JSON bytes for: ${entry.label}`).toBe(legacyStableJson(entry.value));
      expect(prefixedDigest24('pin', entry.value), `digest bytes for: ${entry.label}`).toBe(`pin:sha256:${legacyDigest24(entry.value)}`);
    }
  });

  test('object keys sort by localeCompare, which differs from code-unit .sort()', () => {
    // localeCompare says 'a' < 'B' while code-unit order says 'B' < 'a'.
    expect('a'.localeCompare('B')).toBeLessThan(0);
    expect(stableJsonSorted({ B: 2, a: 1 })).toBe('{"a":1,"B":2}');
    expect([...['B', 'a']].sort()).toEqual(['B', 'a']); // code-unit .sort() would flip it
    // localeCompare says 'ä' < 'z' while code-unit order says 'z' < 'ä'.
    expect('ä'.localeCompare('z')).toBeLessThan(0);
    expect(stableJsonSorted({ z: 2, 'ä': 1 })).toBe('{"ä":1,"z":2}');
    // Numeric-looking keys: localeCompare agrees with code-unit order here ('10' < '9').
    expect('10'.localeCompare('9')).toBeLessThan(0);
    expect(stableJsonSorted({ '9': 2, '10': 1 })).toBe('{"10":1,"9":2}');
  });

  test('undefined values render as the literal text undefined (historical quirk preserved)', () => {
    expect(stableJsonSorted({ k: undefined })).toBe('{"k":undefined}');
    expect(stableJsonSorted({ a: undefined, b: 1 })).toBe('{"a":undefined,"b":1}');
    // Array join coerces undefined elements to empty strings — shared quirk.
    expect(stableJsonSorted([undefined, 1])).toBe(legacyStableJson([undefined, 1]));
    // Top-level undefined propagates as the VALUE undefined (typed string),
    // exactly like the historical scalar branch returning JSON.stringify(undefined).
    expect((stableJsonSorted as (v: unknown) => unknown)(undefined)).toBe(undefined);
    expect((legacyStableJson as (v: unknown) => unknown)(undefined)).toBe(undefined);
  });

  test('prefixedDigest24 pins prefix + :sha256: + 24 lowercase hex chars', () => {
    const digest = prefixedDigest24('inv', { b: 2, a: 1 });
    expect(digest).toMatch(/^inv:sha256:[0-9a-f]{24}$/);
    expect(digest).toBe(`inv:sha256:${createHash('sha256').update(legacyStableJson({ b: 2, a: 1 }), 'utf8').digest('hex').slice(0, 24)}`);
    for (const prefix of ['fp', 'candidate', 'cluster', 'cluster-key', 'sci', 'sc']) {
      expect(prefixedDigest24(prefix, CORPUS[2]!.value)).toMatch(new RegExp(`^${prefix}:sha256:[0-9a-f]{24}$`));
    }
    // Different prefixes over the same payload stay distinct; same prefix+payload is equal.
    expect(prefixedDigest24('x', { v: 1 })).not.toBe(prefixedDigest24('y', { v: 1 }));
    expect(prefixedDigest24('x', { v: 1 })).toBe(prefixedDigest24('x', { v: 1 }));
  });

  test('same input yields identical digests across repeated calls (stability pin)', () => {
    for (const entry of CORPUS) {
      const first = prefixedDigest24('stab', entry.value);
      for (let i = 0; i < 3; i += 1) expect(prefixedDigest24('stab', entry.value), `stability for: ${entry.label}`).toBe(first);
      expect(stableJsonSorted(entry.value), `string stability for: ${entry.label}`).toBe(stableJsonSorted(entry.value));
    }
  });

  test('sha256Hex matches the node:crypto reference with full 64 lowercase hex', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe(createHash('sha256').update('', 'utf8').digest('hex'));
    expect(sha256Hex(legacyStableJson(CORPUS[2]!.value))).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex('ünïcodé')).toBe(createHash('sha256').update('ünïcodé', 'utf8').digest('hex'));
  });

  test('isEvidenceDigest accept/reject matrix (ev:sha256:<24>)', () => {
    expect(isEvidenceDigest('ev:sha256:0123456789abcdef01234567')).toBe(true);
    expect(isEvidenceDigest(`ev:sha256:${'a'.repeat(24)}`)).toBe(true);
    expect(isEvidenceDigest(`ev:sha256:${'f'.repeat(23)}`)).toBe(false); // 23 hex
    expect(isEvidenceDigest(`ev:sha256:${'f'.repeat(25)}`)).toBe(false); // 25 hex
    expect(isEvidenceDigest(`ev:sha256:${'F'.repeat(24)}`)).toBe(false); // uppercase rejected
    expect(isEvidenceDigest(`ev:sha256:${'g'.repeat(24)}`)).toBe(false); // non-hex rejected
    expect(isEvidenceDigest(`EV:SHA256:${'a'.repeat(24)}`)).toBe(false); // case-sensitive scheme
    expect(isEvidenceDigest(`fp:sha256:${'a'.repeat(24)}`)).toBe(false); // wrong prefix
    expect(isEvidenceDigest(`ev:sha256:${'a'.repeat(40)}`)).toBe(false); // sha-length hex rejected
    expect(isEvidenceDigest('ev:sha256:')).toBe(false);
    expect(isEvidenceDigest('')).toBe(false);
    expect(isEvidenceDigest(null)).toBe(false);
    expect(isEvidenceDigest(undefined)).toBe(false);
    expect(isEvidenceDigest(12345)).toBe(false);
    expect(isEvidenceDigest({})).toBe(false);
  });

  test('isSourceSha accept/reject matrix (<40 hex>)', () => {
    expect(isSourceSha('0123456789abcdef0123456789abcdef01234567')).toBe(true);
    expect(isSourceSha('a'.repeat(40))).toBe(true);
    expect(isSourceSha('a'.repeat(39))).toBe(false);
    expect(isSourceSha('a'.repeat(41))).toBe(false);
    expect(isSourceSha('A'.repeat(40))).toBe(false); // uppercase rejected
    expect(isSourceSha(`ev:sha256:${'a'.repeat(24)}`)).toBe(false); // prefixed form rejected
    expect(isSourceSha(`${'a'.repeat(39)}g`)).toBe(false); // non-hex rejected
    expect(isSourceSha('')).toBe(false);
    expect(isSourceSha(null)).toBe(false);
    expect(isSourceSha(undefined)).toBe(false);
    expect(isSourceSha(0xdeadbeef)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Historical-ID compatibility: the live semantic cluster identity path must
  // be reproducible byte-for-byte through the canonical helpers.
  // -------------------------------------------------------------------------

  const fieldPresent: InvariantDefinition = { kind: 'FIELD_PRESENT', path: ['data', 'items'], expected: true };
  const fieldAbsent: InvariantDefinition = { kind: 'FIELD_ABSENT', path: ['debug', 'trace'] };
  const provenance = {
    repoId: 'mobingilabs/ripple-api',
    derivationVersion: 'nightwatch.real-source-expectation-derivation.v2',
    evidenceDigest: 'ev:sha256:0123456789abcdef01234567',
  };

  test('semanticInvariantDefinitionId equals the prefixedDigest24 of its payload', () => {
    const invId = semanticInvariantDefinitionId(fieldPresent);
    expect(invId).toMatch(/^inv:sha256:[0-9a-f]{24}$/);
    expect(invId).toBe(prefixedDigest24('inv', {
      version: SEMANTIC_CONTRACT_IDENTITY_VERSION,
      invariant: { kind: 'FIELD_PRESENT', path: ['data', 'items'], expected: true },
    }));
    const absentId = semanticInvariantDefinitionId(fieldAbsent);
    expect(absentId).toMatch(/^inv:sha256:[0-9a-f]{24}$/);
    expect(absentId).toBe(prefixedDigest24('inv', {
      version: SEMANTIC_CONTRACT_IDENTITY_VERSION,
      invariant: { kind: 'FIELD_ABSENT', path: ['debug', 'trace'] },
    }));
    expect(absentId).not.toBe(invId);
  });

  test('semanticContractIdentity equals the prefixedDigest24 of its payload', () => {
    const invId = semanticInvariantDefinitionId(fieldPresent);
    const sci = semanticContractIdentity({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: provenance,
    });
    expect(sci).toMatch(/^sci:sha256:[0-9a-f]{24}$/);
    expect(sci).toBe(prefixedDigest24('sci', {
      version: SEMANTIC_CONTRACT_IDENTITY_VERSION,
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariantId: invId,
      derivationVersion: provenance.derivationVersion,
      evidenceDigest: provenance.evidenceDigest,
      repoId: provenance.repoId,
    }));
  });

  test('missing evidenceDigest normalizes to null inside the contract identity payload', () => {
    const sciNoDigest = semanticContractIdentity({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: { repoId: provenance.repoId, derivationVersion: provenance.derivationVersion },
    });
    expect(sciNoDigest).toBe(prefixedDigest24('sci', {
      version: SEMANTIC_CONTRACT_IDENTITY_VERSION,
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariantId: semanticInvariantDefinitionId(fieldPresent),
      derivationVersion: provenance.derivationVersion,
      evidenceDigest: null,
      repoId: provenance.repoId,
    }));
    expect(sciNoDigest).not.toBe(semanticContractIdentity({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: provenance,
    }));
  });

  test('semanticClusterKey equals the prefixedDigest24 of its payload and composes the sci', () => {
    const sci = semanticContractIdentity({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: provenance,
    });
    const sck = semanticClusterKey({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: provenance,
    });
    expect(sck).toMatch(/^sc:sha256:[0-9a-f]{24}$/);
    expect(sck).toBe(prefixedDigest24('sc', { version: SEMANTIC_CLUSTER_VERSION, sci }));
    // Identity is sensitive to the evidence digest even though the SHA is not part of these inputs.
    expect(semanticClusterKey({
      expectationId: 'fixture15.common.read',
      targetId: 'fixture15.target.exchange.read',
      invariant: fieldPresent,
      sourceProvenance: { ...provenance, evidenceDigest: 'ev:sha256:ffffffffffffffffffffffff' },
    })).not.toBe(sck);
  });
});
