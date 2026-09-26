// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — five-change extension C3: fresh real-source
// re-evaluation + additive admission guard (FIVE_CHANGE_IMPLEMENTATION_EXTENSION
// Change 3).
//
// Re-runs the COMPLETE approved read-only target inventory against a freshly
// resolved disposable exact snapshot (remote SHA resolved live from GitHub,
// snapshot HEAD verified equal), records the per-target before/after table
// against the prior exact snapshot's recorded normalized evidence, classifies
// source-SHA movement with the C4 drift layer, reproduces B1-B5 at the fresh
// SHA, and proves no silent admission/strengthening occurred (zero uplift is a
// valid result). Fresh-source-dependent rows are availability-gated on the
// disposable snapshot; drift semantics and registry guards run unconditionally.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { buildCoverageInventory } from '../../src/oracles/expectations/coverageInventory';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { classifyInventoryDrift } from '../../src/oracles/expectations/extract/contractDrift';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import type { RealSourceCurrentness, RealSourceReader } from '../../src/oracles/expectations/recipes/types';
import { createRealSourceSyntheticState } from '../helpers/phase11a3Fixtures';

const FRESH_ROOT = '/tmp/nightwatch-ripple-snapshot-85e400a8';
const FRESH_SHA = '85e400a8b32fc23c05464033a2a6d5fff2a2890c';
const PRIOR_SHA = 'e026c85522d201724033f024456da3efa17fe07a';

// Recorded analyzerProbe[0] identities measured at the PRIOR exact snapshot
// (e026c855). Safe derived evidence only (digests + status); these constants
// make the before/after comparison a permanent regression independent of /tmp.
const RECORDED_PRIOR_PROBES: readonly {
  targetId: string;
  status: string;
  evidenceDigest: string;
}[] = [
  { targetId: 'ripple.account-inventory.read', status: 'PROVEN', evidenceDigest: 'ev:sha256:749f330240ca4f04e1a39e8b' },
  { targetId: 'ripple.billing-group-exchange.read', status: 'PROVEN', evidenceDigest: 'ev:sha256:0af4332879a60b55f198da64' },
  { targetId: 'ripple.billing-groups-legacy.read', status: 'AMBIGUOUS', evidenceDigest: 'ev:sha256:76839939200be0da547fbc4d' },
  { targetId: 'ripple.billing-groups.read', status: 'AMBIGUOUS', evidenceDigest: 'ev:sha256:76839939200be0da547fbc4d' },
  { targetId: 'ripple.common-exchange.read', status: 'PROVEN', evidenceDigest: 'ev:sha256:2c29dbd38cdb210468050311' },
  { targetId: 'ripple.payer-exchange.read', status: 'PROVEN', evidenceDigest: 'ev:sha256:4f3b2860f4bdad10c6a3b0d2' },
];

function freshReader(): RealSourceReader {
  return {
    readFile(repoId: string, relativePath: string): string | null {
      if (repoId !== 'mobingilabs/ripple-api') return null;
      if (relativePath.includes('..') || relativePath.includes('\\')) return null;
      try {
        return fs.readFileSync(path.join(FRESH_ROOT, relativePath), 'utf8');
      } catch {
        return null;
      }
    },
  };
}

function freshCurrentness(sha: string): RealSourceCurrentness {
  return {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      return repoId === 'mobingilabs/ripple-api' ? { repoId, sha } : null;
    },
  };
}

function freshAvailable(): boolean {
  return fs.existsSync(path.join(FRESH_ROOT, '.git'));
}

function buildFreshInventory(sha: string) {
  return buildCoverageInventory({
    reader: freshReader(),
    currentness: freshCurrentness(sha),
    snapshot: { repoId: 'mobingilabs/ripple-api', sha },
    remoteSha: sha,
    canonicalUnchanged: true,
  });
}

test.describe('Phase 14A C3 — fresh-source inventory at the newly resolved SHA', () => {
  test.skip(() => !freshAvailable(), `requires disposable exact snapshot at ${FRESH_ROOT}`);

  test('C3-01 inventory covers exactly the approved registry targets (no new targets)', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    expect(inv.entries).toHaveLength(APPROVED_READ_ONLY_TARGET_IDS.length);
    expect(inv.entries.map((e) => e.targetId)).toEqual([...APPROVED_READ_ONLY_TARGET_IDS].sort());
    expect(inv.metrics.approvedTargetCount).toBe(6);
  });

  test('C3-02 B1-B4 historical blockers reproduce at the fresh SHA', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    const byId = new Map(inv.entries.map((e) => [e.targetId, e]));
    // B1
    expect(byId.get('ripple.account-inventory.read')!.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
    // B2
    expect(byId.get('ripple.billing-group-exchange.read')!.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
    // B3
    expect(byId.get('ripple.billing-groups-legacy.read')!.disposition).toBe('APPROVED_NOT_ADMITTED_AMBIGUOUS');
    expect(byId.get('ripple.billing-groups-legacy.read')!.blockerCode).toBe('AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED');
    // B4
    expect(byId.get('ripple.billing-groups.read')!.disposition).toBe('APPROVED_NOT_OBSERVABLE');
    expect(byId.get('ripple.billing-groups.read')!.blockerCode).toBe('GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT');
  });

  test('C3-03 four admitted targets remain admitted; historical/collection IDs and recipe versions preserved', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    const byId = new Map(inv.entries.map((e) => [e.targetId, e]));
    for (const id of ['ripple.common-exchange.read', 'ripple.payer-exchange.read', 'ripple.account-inventory.read', 'ripple.billing-group-exchange.read']) {
      const e = byId.get(id)!;
      expect(e.disposition).toBe('APPROVED_AND_ADMITTED_COLLECTION');
      expect(e.historicalExpectationId).not.toBeNull();
      expect(e.collectionExpectationId).not.toBeNull();
    }
    expect(byId.get('ripple.account-inventory.read')!.historicalExpectationId).toBe('ripple.account-inventory.read.real-source-shape');
    expect(byId.get('ripple.billing-group-exchange.read')!.historicalExpectationId).toBe('ripple.billing-group-exchange.read.real-source-shape');
    expect(byId.get('ripple.common-exchange.read')!.historicalExpectationId).toBe('ripple.common-exchange.read.real-source-deep');
    expect(byId.get('ripple.payer-exchange.read')!.historicalExpectationId).toBe('ripple.payer-exchange.read.real-source-deep');
    expect(byId.get('ripple.account-inventory.read')!.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
    expect(byId.get('ripple.billing-group-exchange.read')!.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
    expect(byId.get('ripple.common-exchange.read')!.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v2');
    expect(byId.get('ripple.payer-exchange.read')!.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v2');
  });

  test('C3-04 every entry carries exact provenance and a probe or blocker (before/after record complete)', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    for (const e of inv.entries) {
      expect(e.sourceSha).toBe(FRESH_SHA);
      if (e.disposition === 'APPROVED_AND_ADMITTED_COLLECTION') {
        expect(e.sourceRepo).toBe('mobingilabs/ripple-api');
        expect(e.sourcePath).toMatch(/^src\/App\/Handler\/.+\.php$/);
        expect(e.sourceSymbol).not.toBeNull();
        expect(e.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      } else {
        expect(e.blockerCode).not.toBeNull();
      }
      expect(e.analyzerProbe!.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('C3-05 zero uplift: no new contract admitted, no depth uplifted, registry unchanged', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    expect(inv.metrics.newContractsAdded).toBe(0);
    expect(inv.metrics.existingContractsDepthUplifted).toBe(0);
    expect(APPROVED_READ_ONLY_TARGET_IDS).toHaveLength(6);
  });

  test('C3-06 deterministic repeats >=3 identical fresh inventory', () => {
    const a = buildFreshInventory(FRESH_SHA);
    const b = buildFreshInventory(FRESH_SHA);
    const c = buildFreshInventory(FRESH_SHA);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(b)).toBe(JSON.stringify(c));
  });

  test('C3-07 privacy: no sentinels or local paths leak into the fresh inventory', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    const text = JSON.stringify(inv);
    expect(text).not.toContain('sk-');
    expect(text).not.toContain('AKIA');
    expect(text).not.toContain('/home/');
    expect(text).not.toContain('/tmp/');
  });
});

test.describe('Phase 14A C3 — SHA-movement drift vs recorded prior evidence', () => {
  test('C3-08 pure drift semantics: identical digests across SHA movement never fragment identity', () => {
    // Recorded prior probes vs themselves under a moved SHA context: the C4
    // layer must classify EVIDENCE_UNCHANGED_SHA_MOVED, not a contract change.
    const classifications = classifyInventoryDrift(
      { entries: RECORDED_PRIOR_PROBES.map((p) => ({ targetId: p.targetId, analyzerProbe: [{ status: p.status, evidenceDigest: p.evidenceDigest }] })) },
      { entries: RECORDED_PRIOR_PROBES.map((p) => ({ targetId: p.targetId, analyzerProbe: [{ status: p.status, evidenceDigest: p.evidenceDigest }] })) },
      { sourceAvailable: true, sourceStale: false },
    );
    expect(classifications).toHaveLength(6);
    for (const c of classifications) expect(c.driftClass).toBe('EVIDENCE_UNCHANGED_SHA_MOVED');
  });

  test('C3-09 changed evidence must not silently merge (compatible/breaking split)', () => {
    const base = { targetId: 'ripple.common-exchange.read', analyzerProbe: [{ status: 'PROVEN', evidenceDigest: 'ev:sha256:2c29dbd38cdb210468050311' }] };
    const movedType = { targetId: 'ripple.common-exchange.read', analyzerProbe: [{ status: 'PROVEN', evidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' }] };
    const becameAmbiguous = { targetId: 'ripple.common-exchange.read', analyzerProbe: [{ status: 'AMBIGUOUS', evidenceDigest: 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' }] };
    const compatible = classifyInventoryDrift({ entries: [base] }, { entries: [movedType] }, { sourceAvailable: true, sourceStale: false });
    expect(compatible[0]!.driftClass).toBe('EVIDENCE_CHANGED_COMPATIBLE');
    const ambiguous = classifyInventoryDrift({ entries: [base] }, { entries: [becameAmbiguous] }, { sourceAvailable: true, sourceStale: false });
    expect(ambiguous[0]!.driftClass).toBe('CONTRACT_BECAME_AMBIGUOUS');
  });
});

test.describe('Phase 14A C3 — live SHA-movement classification + currentness at fresh source', () => {
  test.skip(() => !freshAvailable(), `requires disposable exact snapshot at ${FRESH_ROOT}`);

  test('C3-10 live drift vs recorded prior probes: all six EVIDENCE_UNCHANGED_SHA_MOVED', () => {
    const inv = buildFreshInventory(FRESH_SHA);
    const classifications = classifyInventoryDrift(
      { entries: RECORDED_PRIOR_PROBES.map((p) => ({ targetId: p.targetId, analyzerProbe: [{ status: p.status, evidenceDigest: p.evidenceDigest }] })) },
      inv,
      { sourceAvailable: true, sourceStale: false },
    );
    expect(classifications).toHaveLength(6);
    for (const c of classifications) {
      expect(c.driftClass).toBe('EVIDENCE_UNCHANGED_SHA_MOVED');
    }
  });

  test('C3-11 resolver resolves every derived expectation against the correct fresh SHA', () => {
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: 'mobingilabs/ripple-api', sha: FRESH_SHA }, freshReader());
    expect(derived.derived.length).toBeGreaterThan(0);
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: derived.derived.map((d) => d.expectation),
      reader: freshReader(),
      currentness: freshCurrentness(FRESH_SHA),
    });
    for (const d of derived.derived) {
      expect(resolver.resolve({ targetId: d.expectation.targetId }).kind).toBe('RESOLVED');
    }
  });

  test('C3-12 B5 wrong-SHA currentness fails closed at the fresh SHA (resolver SOURCE_STALE)', () => {
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: 'mobingilabs/ripple-api', sha: FRESH_SHA }, freshReader());
    const expectation = derived.derived[0]!.expectation;
    const wrongCurrentness: RealSourceCurrentness = {
      currentSnapshot: (id: string) => (id === expectation.sourceProvenance.repoId ? { repoId: id, sha: '0000000000000000000000000000000000000000' } : null),
    };
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: derived.derived.map((d) => d.expectation),
      reader: freshReader(),
      currentness: wrongCurrentness,
    });
    expect(resolver.resolve({ targetId: expectation.targetId }).kind).toBe('SOURCE_STALE');
  });

  test('C3-13 missing source never certifies CURRENT (inventory fails closed STALE/UNAVAILABLE)', () => {
    // A reader that cannot see any source file makes every recipe derivation
    // fail: no target may remain admitted or claim CURRENT currentness.
    const emptyReader: RealSourceReader = { readFile: () => null };
    const inv = buildCoverageInventory({
      reader: emptyReader,
      currentness: freshCurrentness(FRESH_SHA),
      snapshot: { repoId: 'mobingilabs/ripple-api', sha: FRESH_SHA },
      remoteSha: FRESH_SHA,
      canonicalUnchanged: true,
    });
    expect(inv.entries).toHaveLength(6);
    for (const e of inv.entries) {
      expect(e.disposition === 'APPROVED_AND_ADMITTED_COLLECTION').toBe(false);
      expect(e.evidenceDigest).toBeNull();
      expect(e.currentness).not.toBe('CURRENT');
      expect(['STALE', 'UNAVAILABLE', 'NOT_APPLICABLE']).toContain(e.currentness);
      expect(['SOURCE_STALE', 'SOURCE_UNAVAILABLE', 'NOT_APPLICABLE']).toContain(e.resolverState);
    }
  });
});

test.describe('Phase 14A C3 — synthetic fallback sanity (no snapshot present)', () => {
  test('C3-14 synthetic fallback still derives and resolves without real source', () => {
    if (freshAvailable()) return; // only meaningful in environments without the snapshot
    const s = createRealSourceSyntheticState();
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: s.repoId, sha: s.sha }, s.reader);
    expect(derived.derived.length).toBeGreaterThan(0);
  });
});

// D-10 / D-11 / D-12 — the two live describes above are gated on hard-coded
// /tmp disposable snapshots with no tracked creator (their skips are declared
// in the canonical allowlist and visible in the shard skip reports). These
// synthetic twins always run and prove the same mechanisms over an injected
// reader, independent of any /tmp snapshot.

test.describe('Phase 14A C3 — synthetic twins for the declared /tmp-snapshot skips', () => {
  test('synthetic twin — the inventory is registry-driven and never invents targets from an empty source', () => {
    const inv = buildCoverageInventory({
      reader: { readFile: () => null },
      currentness: freshCurrentness(FRESH_SHA),
      snapshot: { repoId: 'mobingilabs/ripple-api', sha: FRESH_SHA },
      remoteSha: FRESH_SHA,
      canonicalUnchanged: true,
    });
    // Approved count comes from the registry, not from discovered files: an
    // empty (or hostile) snapshot can approve nothing and invent no target.
    expect(inv.metrics.approvedTargetCount).toBe(APPROVED_READ_ONLY_TARGET_IDS.length);
    expect(inv.entries.length).toBeLessThanOrEqual(APPROVED_READ_ONLY_TARGET_IDS.length);
    for (const entry of inv.entries) expect(APPROVED_READ_ONLY_TARGET_IDS).toContain(entry.targetId);
    // An absent source can produce no evidence: nothing may claim a digest it did not read.
    expect(inv.entries.every((entry) => entry.evidenceDigest === null)).toBe(true);
  });

  test('synthetic twin — the resolver resolves at the matching SHA and fails closed on a wrong one', () => {
    const s = createRealSourceSyntheticState();
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: s.repoId, sha: s.sha }, s.reader);
    expect(derived.derived.length).toBeGreaterThan(0);
    const expectations = derived.derived.map((item) => item.expectation);
    const matching = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations,
      reader: s.reader,
      currentness: { currentSnapshot: (id: string) => (id === s.repoId ? { repoId: id, sha: s.sha } : null) },
    });
    for (const item of derived.derived) {
      expect(matching.resolve({ targetId: item.expectation.targetId }).kind).toBe('RESOLVED');
    }
    // B5 mechanism (C3-12): currentness that disagrees with the expectation's
    // SHA must refuse, never resolve fresh.
    const stale = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations,
      reader: s.reader,
      currentness: { currentSnapshot: (id: string) => (id === s.repoId ? { repoId: id, sha: '0'.repeat(40) } : null) },
    });
    for (const item of derived.derived) {
      expect(stale.resolve({ targetId: item.expectation.targetId }).kind).toBe('SOURCE_STALE');
    }
  });
});
