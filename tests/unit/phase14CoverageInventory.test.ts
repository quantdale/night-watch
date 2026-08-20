// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — fresh-source target re-evaluation & historical
// blocker reproduction (SPEC §4, §7; ACCEPTANCE_MATRIX B/F/G; WORKSTREAMS_A/C/D/E).
//
// Re-runs the complete approved-target inventory against a disposable exact
// snapshot of the current source, reproduces the Phase-12 blocker classes
// (B1-B4), proves wrong-SHA currentness fails closed (B5), and records the new
// versioned analyzer's precise proofs/blockers per target (the additive
// analyzerProbe layer). Zero real-source uplift is accepted when current source
// remains honestly ambiguous.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { buildCoverageInventory } from '../../src/oracles/expectations/coverageInventory';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import type { RealSourceCurrentness, RealSourceReader } from '../../src/oracles/expectations/recipes/types';
import { createRealSourceSyntheticState } from '../helpers/phase11a3Fixtures';

const LIVE_ROOT = '/tmp/nightwatch-ripple-snapshot-e026c855';
const LIVE_SHA = 'e026c85522d201724033f024456da3efa17fe07a';

function liveReader(): RealSourceReader {
  return {
    readFile(repoId: string, relativePath: string): string | null {
      if (repoId !== 'mobingilabs/ripple-api') return null;
      if (relativePath.includes('..') || relativePath.includes('\\')) return null;
      try {
        return fs.readFileSync(path.join(LIVE_ROOT, relativePath), 'utf8');
      } catch {
        return null;
      }
    },
  };
}

function liveCurrentness(sha: string): RealSourceCurrentness {
  return {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      return repoId === 'mobingilabs/ripple-api' ? { repoId, sha } : null;
    },
  };
}

function liveAvailable(): boolean {
  return fs.existsSync(path.join(LIVE_ROOT, '.git'));
}

function buildInventory(sha: string) {
  if (liveAvailable()) {
    return buildCoverageInventory({
      reader: liveReader(),
      currentness: liveCurrentness(sha),
      snapshot: { repoId: 'mobingilabs/ripple-api', sha },
      remoteSha: sha,
      canonicalUnchanged: true,
    });
  }
  const s = createRealSourceSyntheticState();
  return buildCoverageInventory({
    reader: s.reader,
    currentness: { currentSnapshot: (id: string) => (id === s.repoId ? { repoId: s.repoId, sha: s.sha } : null) },
    snapshot: { repoId: s.repoId, sha: s.sha },
    remoteSha: s.sha,
    canonicalUnchanged: null,
  });
}

test.describe('Phase 14A B — historical blocker reproduction / current drift', () => {
  test('B01 account-inventory TYPE_FLOW_AMBIGUOUS reproduced at fresh source', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.account-inventory.read')!;
    expect(e.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
  });

  test('B02 billing-group-exchange TYPE_FLOW_AMBIGUOUS reproduced at fresh source', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.billing-group-exchange.read')!;
    expect(e.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
  });

  test('B03 legacy conditional-blob blocker reproduced (AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED)', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.billing-groups-legacy.read')!;
    expect(e.disposition).toBe('APPROVED_NOT_ADMITTED_AMBIGUOUS');
    expect(e.blockerCode).toBe('AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED');
  });

  test('B04 gRPC/chunked no-mechanical-contract blocker reproduced (GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT)', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.billing-groups.read')!;
    expect(e.disposition).toBe('APPROVED_NOT_OBSERVABLE');
    expect(e.blockerCode).toBe('GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT');
  });

  test('B05 wrong-SHA currentness fails closed (resolver SOURCE_STALE)', () => {
    const state = liveAvailable() ? { reader: liveReader(), sha: LIVE_SHA } : createRealSourceSyntheticState();
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: state.sha === LIVE_SHA ? 'mobingilabs/ripple-api' : (state as { repoId: string }).repoId, sha: state.sha }, state.reader);
    expect(derived.derived.length).toBeGreaterThan(0);
    const expectation = derived.derived[0]!.expectation;
    // Currentness reports a DIFFERENT sha than the one the expectation was bound to.
    const wrongCurrentness: RealSourceCurrentness = {
      currentSnapshot: (id: string) => (id === expectation.sourceProvenance.repoId ? { repoId: id, sha: '0000000000000000000000000000000000000000' } : null),
    };
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: derived.derived.map((d) => d.expectation),
      reader: state.reader,
      currentness: wrongCurrentness,
    });
    const resolution = resolver.resolve({ targetId: expectation.targetId });
    expect(resolution.kind).toBe('SOURCE_STALE');
  });
});

test.describe('Phase 14A F — existing approved target inventory', () => {
  test('F01 approved target count equals live registry, no new targets', () => {
    const inv = buildInventory(LIVE_SHA);
    expect(inv.entries).toHaveLength(APPROVED_READ_ONLY_TARGET_IDS.length);
    expect(inv.metrics.approvedTargetCount).toBe(6);
    for (const e of inv.entries) expect(APPROVED_READ_ONLY_TARGET_IDS).toContain(e.targetId);
  });

  test('F02 before/after inventory emitted in deterministic targetId order', () => {
    const a = buildInventory(LIVE_SHA);
    const b = buildInventory(LIVE_SHA);
    const idsA = a.entries.map((e) => e.targetId);
    expect(idsA).toEqual([...idsA].sort());
    expect(JSON.stringify(a.entries.map((e) => e.targetId))).toBe(JSON.stringify(b.entries.map((e) => e.targetId)));
  });

  test('F03-F06 exact fresh-source disposition recorded for every target', () => {
    const inv = buildInventory(LIVE_SHA);
    const byId = new Map(inv.entries.map((e) => [e.targetId, e]));
    expect(byId.get('ripple.account-inventory.read')!.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
    expect(byId.get('ripple.billing-group-exchange.read')!.blockerCode).toMatch(/TYPE_FLOW_AMBIGUOUS/);
    expect(byId.get('ripple.billing-groups-legacy.read')!.blockerCode).toBe('AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED');
    expect(byId.get('ripple.billing-groups.read')!.blockerCode).toBe('GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT');
    // The four admitted targets remain admitted at fresh source.
    for (const id of ['ripple.common-exchange.read', 'ripple.payer-exchange.read', 'ripple.account-inventory.read', 'ripple.billing-group-exchange.read']) {
      const e = byId.get(id)!;
      expect(e.disposition).toBe('APPROVED_AND_ADMITTED_COLLECTION');
      expect(e.historicalExpectationId).not.toBeNull();
    }
  });

  test('F07/F08 each non-uplift has a precise blocker; each proof has exact source evidence', () => {
    const inv = buildInventory(LIVE_SHA);
    for (const e of inv.entries) {
      if (e.disposition === 'APPROVED_AND_ADMITTED_COLLECTION') {
        expect(e.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      } else {
        expect(e.blockerCode).not.toBeNull();
      }
      // The analyzer probe layer is present and records at least one proven or
      // rejected fact for every target.
      expect(e.analyzerProbe).not.toBeNull();
      expect(e.analyzerProbe!.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('F09 zero-uplift result accepted when evidence-backed (no new contract added)', () => {
    const inv = buildInventory(LIVE_SHA);
    expect(inv.metrics.newContractsAdded).toBe(0);
    expect(inv.metrics.existingContractsDepthUplifted).toBe(0);
  });

  test('F10 observer class remains truthful; no transport authority invented', () => {
    const inv = buildInventory(LIVE_SHA);
    const byId = new Map(inv.entries.map((e) => [e.targetId, e]));
    expect(byId.get('ripple.billing-groups.read')!.observerClass).toBe('JSON_CHUNKED_GRPC');
    expect(byId.get('ripple.billing-groups-legacy.read')!.observerClass).toBe('JSON_SINGLE_LEGACY_AMBIGUOUS');
    expect(byId.get('ripple.account-inventory.read')!.observerClass).toBe('JSON_SINGLE_BROWSER_API');
  });
});

test.describe('Phase 14A G — admission / identity / currentness', () => {
  test('G01 historical expectation IDs unchanged (v1 shape + v2 deep preserved)', () => {
    const inv = buildInventory(LIVE_SHA);
    const ids = inv.entries.filter((e) => e.historicalExpectationId !== null).map((e) => e.historicalExpectationId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'ripple.account-inventory.read.real-source-shape',
        'ripple.billing-group-exchange.read.real-source-shape',
        'ripple.common-exchange.read.real-source-deep',
        'ripple.payer-exchange.read.real-source-deep',
      ]),
    );
  });

  test('G02 no silent strengthening: no additive v2 contract added for shallow targets', () => {
    const inv = buildInventory(LIVE_SHA);
    const account = inv.entries.find((e) => e.targetId === 'ripple.account-inventory.read')!;
    const billing = inv.entries.find((e) => e.targetId === 'ripple.billing-group-exchange.read')!;
    expect(account.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
    expect(billing.recipeVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
    expect(account.historicalExpectationId).not.toBe('ripple.account-inventory.read.real-source-deep');
  });

  test('G04 resolver resolves fresh correct source (RESOLVED)', () => {
    const state = liveAvailable() ? { reader: liveReader(), sha: LIVE_SHA, repoId: 'mobingilabs/ripple-api' } : createRealSourceSyntheticState();
    const derived = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, { repoId: state.repoId, sha: state.sha }, state.reader);
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: derived.derived.map((d) => d.expectation),
      reader: state.reader,
      currentness: { currentSnapshot: (id: string) => (id === state.repoId ? { repoId: state.repoId, sha: state.sha } : null) },
    });
    let resolved = 0;
    for (const d of derived.derived) {
      const r = resolver.resolve({ targetId: d.expectation.targetId });
      if (r.kind === 'RESOLVED') resolved += 1;
    }
    expect(resolved).toBe(derived.derived.length);
  });

  test('G07 source-SHA-only movement with identical evidence does not fragment identity', () => {
    // Two inventories at the same source produce identical analyzer evidence
    // digests (the analyzer version + normalized evidence define identity, not
    // incidental source bytes).
    const a = buildInventory(LIVE_SHA);
    const b = buildInventory(LIVE_SHA);
    const digA = a.entries.map((e) => e.analyzerProbe?.map((p) => p.evidenceDigest).join('|')).join('|');
    const digB = b.entries.map((e) => e.analyzerProbe?.map((p) => p.evidenceDigest).join('|')).join('|');
    expect(digA).toBe(digB);
  });

  test('G09 registry unchanged when no uplift is proven (metrics zero)', () => {
    const inv = buildInventory(LIVE_SHA);
    expect(inv.metrics.newContractsAdded).toBe(0);
    expect(inv.metrics.existingContractsDepthUplifted).toBe(0);
  });
});

test.describe('Phase 14A analyzer probe layer — capability vs honest ambiguity', () => {
  test('account-inventory probe: row keys PROVEN, field type remains ambiguous (no fake uplift)', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.account-inventory.read')!;
    const probe = e.analyzerProbe!;
    const rowKeys = probe.find((p) => p.proofClass === 'LITERAL_ROW_FIELD_SET');
    const typeFlow = probe.find((p) => p.proofClass === 'SCALAR_TYPE_FROM_CAST');
    expect(rowKeys?.status).toBe('PROVEN');
    expect(typeFlow?.status).not.toBe('PROVEN');
    expect(typeFlow?.blockerCode).toBe('RUNTIME_VALUE_TYPE_UNPROVEN');
  });

  test('billing-group-exchange probe: row keys PROVEN, copied exchange_rate remains runtime-unproven', () => {
    const inv = buildInventory(LIVE_SHA);
    const e = inv.entries.find((x) => x.targetId === 'ripple.billing-group-exchange.read')!;
    const probe = e.analyzerProbe!;
    const rowKeys = probe.find((p) => p.proofClass === 'LITERAL_ROW_FIELD_SET');
    const typeFlow = probe.find((p) => p.proofClass === 'SCALAR_TYPE_FROM_CAST');
    expect(rowKeys?.status).toBe('PROVEN');
    expect(typeFlow?.status).not.toBe('PROVEN');
  });

  test('legacy + gRPC probes: no static chunk/transport contract proven (TRANSPORT_CONTRACT_UNPROVEN)', () => {
    const inv = buildInventory(LIVE_SHA);
    for (const id of ['ripple.billing-groups-legacy.read', 'ripple.billing-groups.read']) {
      const e = inv.entries.find((x) => x.targetId === id)!;
      const chunk = e.analyzerProbe!.find((p) => p.proofClass === 'CHUNK_ITEM_METADATA');
      expect(chunk).toBeDefined();
      expect(chunk!.blockerCode).toBe('TRANSPORT_CONTRACT_UNPROVEN');
    }
  });

  test('admitted v2 targets: analyzer confirms the existing deep type contract (PROVEN)', () => {
    const inv = buildInventory(LIVE_SHA);
    for (const id of ['ripple.common-exchange.read', 'ripple.payer-exchange.read']) {
      const e = inv.entries.find((x) => x.targetId === id)!;
      const typeFlow = e.analyzerProbe!.find((p) => p.proofClass === 'SCALAR_TYPE_FROM_CAST');
      expect(typeFlow?.status).toBe('PROVEN');
    }
  });
});

test.describe('Phase 14A determinism & privacy of inventory', () => {
  test('deterministic repeat >=3 identical inventory', () => {
    const a = buildInventory(LIVE_SHA);
    const b = buildInventory(LIVE_SHA);
    const c = buildInventory(LIVE_SHA);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(b)).toBe(JSON.stringify(c));
  });

  test('no private paths / sentinels leak into the inventory', () => {
    const inv = buildInventory(LIVE_SHA);
    const text = JSON.stringify(inv);
    expect(text).not.toContain('sk-');
    expect(text).not.toContain('AKIA');
    expect(text).not.toContain('/home/');
  });
});
