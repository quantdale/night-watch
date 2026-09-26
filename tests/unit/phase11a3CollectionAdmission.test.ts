// ---------------------------------------------------------------------------
// Nightwatch Phase 11A.3 — real-source collection admission matrix (SPEC §22).
//
// Permanently proves the gap (M0) and its closure (M1-M7) using the ACTUAL
// production real-source recipes through the real admission bridge + the new
// collection admission transform. The decisive later-row / partial-coverage
// proofs run the collection expectation through deriveRealSourceExpectation ->
// deriveCollectionWideRealSourceExpectation -> resolver -> semantic evaluator
// -> receipt -> Phase 9B acceptance, never through the Phase 11 synthetic
// fixture helper.
//
// Synthetic source only (repository-owned fixtures). No DEV, no real product.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  deriveRealSourceExpectation,
  deriveRealSourceExpectations,
} from '../../src/oracles/expectations/admission';
import {
  deriveCollectionWideRealSourceExpectation,
  deriveCollectionWideRealSourceExpectations,
  REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  REAL_SOURCE_COLLECTION_EXPECTATION_IDS,
} from '../../src/oracles/expectations/collectionAdmission';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import type { DerivedRealSourceExpectation } from '../../src/oracles/expectations/admission';
import type { RealSourceCurrentness, RealSourceExpectationRecipe, RealSourceReader } from '../../src/oracles/expectations/recipes/types';
import { evaluateSemanticResponse } from '../../src/oracles/semantic';
import {
  buildSemanticEvaluationReceipt,
} from '../../src/oracles/semantic/receipts';
import {
  comparePhase9bReplaySummaries,
  evaluatePhase9bAcceptance,
  summarizePhase9bPass,
} from '../../src/core/phase9b/summary';
import type { SemanticExpectation } from '../../src/oracles/expectations/types';
import {
  SENTINEL,
  exchangePartialCoverageValid129,
  exchangeWithMissingMonth,
  generateExchangeArray,
} from '../../corpus/phase11/response-fixtures';
import {
  createCollectionExpectation,
  createCollectionItemContract,
  PHASE11_FIXTURE_SHA,
  PHASE11_PROVENANCE,
} from '../../corpus/phase11/source-fixture/phase11Fixtures';
import {
  accountFixture,
  billingGroupFixture,
  createRealSourceSyntheticState,
  exchangeRateFixture,
  REAL_SOURCE_FIXTURE_REPO,
  routingFixture,
} from '../helpers/phase11a3Fixtures';

const ORACLE_ID = 'oracle.semantic.phase11a3.collection-admission';
const JOURNEY_ID = 'phase11a3.synthetic.journey';
const STEP_ID = 'phase11a3.synthetic.step';
const OTHER_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

// ---------------------------------------------------------------------------
// Derivation helpers.
// ---------------------------------------------------------------------------

interface DerivedRealState {
  reader: RealSourceReader;
  sha: string;
  repoId: string;
  historical: readonly DerivedRealSourceExpectation[];
  collection: ReturnType<typeof deriveCollectionWideRealSourceExpectations>;
}

function deriveRealState(): DerivedRealState {
  const state = createRealSourceSyntheticState();
  const report = deriveRealSourceExpectations(
    REAL_SOURCE_EXPECTATION_RECIPES,
    { repoId: state.repoId, sha: state.sha },
    state.reader,
  );
  const collection = deriveCollectionWideRealSourceExpectations(report.derived);
  return { reader: state.reader, sha: state.sha, repoId: state.repoId, historical: report.derived, collection };
}

function historicalByTarget(state: DerivedRealState, targetId: string): DerivedRealSourceExpectation {
  const found = state.historical.find((d) => d.recipe.targetId === targetId);
  if (found === undefined) throw new Error(`no historical derivation for ${targetId}`);
  return found;
}

function collectionByTarget(state: DerivedRealState, targetId: string): SemanticExpectation {
  const found = state.collection.derived.find((d) => d.recipe.targetId === targetId);
  if (found === undefined) throw new Error(`no collection derivation for ${targetId}`);
  return found.expectation;
}

function evaluateCollection(body: unknown, expectation: SemanticExpectation, sha: string | null): ReturnType<typeof evaluateSemanticResponse> {
  return evaluateSemanticResponse({
    oracleId: ORACLE_ID,
    expectation,
    rawValues: [body],
    sourceSnapshot: sha === null ? null : { repoId: expectation.sourceProvenance.repoId, sha },
    journeyId: JOURNEY_ID,
    stepId: STEP_ID,
    operationId: expectation.targetId,
  });
}

function commonWithBadExchangeRate(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) {
      return { month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, exchange_rate: SENTINEL.WRONG_TYPE };
    }
    return { month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, exchange_rate: { usd: 1.0 + i * 0.01 } };
  });
}

function payerWithOutsideExchangeRate(rowIndex: number, totalItems: number): unknown[] {
  // Real-source-shaped payer rows: id, vendor, name, exchange_rate all present.
  // The defect is exchange_rate set to a non-ARRAY/non-OBJECT scalar.
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) {
      return { id: `id-${i}`, vendor: 'aws', name: `name-${i}`, exchange_rate: SENTINEL.WRONG_TYPE };
    }
    return { id: `id-${i}`, vendor: 'aws', name: `name-${i}`, exchange_rate: { usd: 1.0 + i * 0.01 } };
  });
}

function collectLeaks(value: unknown): string[] {
  const text = JSON.stringify(value);
  const sentinels = [SENTINEL.MONTH, SENTINEL.RATE, SENTINEL.NAME, SENTINEL.ID, SENTINEL.NUMBER, String(SENTINEL.WRONG_TYPE)];
  return sentinels.filter((s) => text.includes(s));
}

// ===========================================================================
// M0 — reproduce the integration gap (positional item-0 only; no collection).
// ===========================================================================

test.describe('Phase 11A.3 M0: gap reproduction', () => {
  test('real-source derivation returns positional item-0 invariants, not collection', () => {
    const state = deriveRealState();
    expect(state.historical).toHaveLength(4);
    // No current collection expectation is produced by the historical API.
    const hasCollectionId = state.historical.some((d) => d.expectation.expectationId.endsWith('real-source-collection'));
    expect(hasCollectionId).toBe(false);
    // Every item invariant is positional (path begins with the item index '0').
    for (const derived of state.historical) {
      const itemInvariants = derived.expectation.invariantDefinitions.filter(
        (inv) => 'path' in inv && inv.path.length > 0,
      );
      for (const inv of itemInvariants) {
        expect((inv as unknown as { path: string[] }).path[0]).toBe('0');
      }
      // No COLLECTION_ITEM_CONTRACT exists in the historical output.
      const hasCollectionContract = derived.expectation.invariantDefinitions.some(
        (inv) => inv.kind === 'COLLECTION_ITEM_CONTRACT',
      );
      expect(hasCollectionContract).toBe(false);
    }
  });

  test('historical IDs are the legacy positional identities (unchanged)', () => {
    const state = deriveRealState();
    const ids = state.historical.map((d) => d.expectation.expectationId).sort();
    expect(ids).toEqual([
      'ripple.account-inventory.read.real-source-shape',
      'ripple.billing-group-exchange.read.real-source-shape',
      'ripple.common-exchange.read.real-source-deep',
      'ripple.payer-exchange.read.real-source-deep',
    ]);
  });

  test('Phase 11 collection expectations come from the fixture helper, not the real bridge', () => {
    // The Phase 11 matrix builds its collection expectations with the synthetic
    // fixture helper and a NON-real-source derivation version.
    const fixtureExpectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      [createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' })],
    );
    expect(fixtureExpectation.sourceProvenance.derivationVersion).toBe('nightwatch.expectation-derivation.v1');
    expect(fixtureExpectation.sourceProvenance.evidenceDigest).toBeUndefined();
    // The real bridge produces a distinct derivation version + evidence digest.
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    expect(collection.sourceProvenance.derivationVersion).toBe(REAL_SOURCE_COLLECTION_DERIVATION_VERSION);
    expect(collection.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
  });
});

// ===========================================================================
// M1/M2/M3 — collection bridge derives the four distinct current IDs.
// ===========================================================================

test.describe('Phase 11A.3 M1-M3: collection derivation', () => {
  test('all four recipes derive a collection expectation with the fixed ID', () => {
    const state = deriveRealState();
    expect(state.collection.failures).toHaveLength(0);
    expect(state.collection.derived).toHaveLength(4);
    for (const targetId of [
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
    ]) {
      const id = REAL_SOURCE_COLLECTION_EXPECTATION_IDS[targetId];
      const derived = state.collection.derived.find((d) => d.collectionExpectationId === id);
      expect(derived, `collection derivation for ${targetId}`).toBeDefined();
      expect(derived!.expectation.expectationId).toBe(id);
      expect(derived!.expectation.targetId).toBe(targetId);
    }
  });

  test('historical IDs are preserved alongside the new collection IDs', () => {
    const state = deriveRealState();
    expect(historicalByTarget(state, 'ripple.common-exchange.read').expectation.expectationId).toBe(
      'ripple.common-exchange.read.real-source-deep',
    );
    expect(collectionByTarget(state, 'ripple.common-exchange.read').expectationId).toBe(
      'ripple.common-exchange.read.real-source-collection',
    );
  });

  test('root ARRAY invariant preserved exactly once; no positional item-0 remains', () => {
    const state = deriveRealState();
    for (const targetId of [
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
    ]) {
      const historical = historicalByTarget(state, targetId).expectation;
      const collection = collectionByTarget(state, targetId);
      // Root invariant count (path []) is preserved exactly once.
      const histRoots = historical.invariantDefinitions.filter((inv) => 'path' in inv && inv.path.length === 0);
      const collRoots = collection.invariantDefinitions.filter((inv) => 'path' in inv && inv.path.length === 0);
      expect(collRoots).toHaveLength(histRoots.length);
      expect(collRoots[0]).toEqual({ kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' });
      // No positional item-0 invariant remains in the collection expectation.
      const positionalItem0 = collection.invariantDefinitions.filter(
        (inv) => 'path' in inv && (inv as unknown as { path: string[] }).path[0] === '0',
      );
      expect(positionalItem0).toHaveLength(0);
    }
  });

  test('every transformable item invariant becomes a COLLECTION_ITEM_CONTRACT', () => {
    const state = deriveRealState();
    for (const targetId of [
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
    ]) {
      const historical = historicalByTarget(state, targetId).expectation;
      const collection = collectionByTarget(state, targetId);
      const histItemCount = historical.invariantDefinitions.filter(
        (inv) => 'path' in inv && inv.path.length > 0,
      ).length;
      const collItemCount = collection.invariantDefinitions.filter(
        (inv) => inv.kind === 'COLLECTION_ITEM_CONTRACT',
      ).length;
      expect(collItemCount).toBe(histItemCount);
      expect(collection.invariantDefinitions).toHaveLength(historical.invariantDefinitions.length);
    }
  });

  test('common-exchange collection preserves deep OBJECT type; payer preserves ARRAY|OBJECT set', () => {
    const state = deriveRealState();
    const common = collectionByTarget(state, 'ripple.common-exchange.read');
    const exchangeRateContracts = common.invariantDefinitions.filter(
      (inv) => inv.kind === 'COLLECTION_ITEM_CONTRACT' && inv.itemInvariantKind === 'TYPE_MATCH' && inv.itemRelativePath[0] === 'exchange_rate',
    );
    expect(exchangeRateContracts).toHaveLength(1);
    expect((exchangeRateContracts[0] as { itemExpectedType: string }).itemExpectedType).toBe('OBJECT');

    const payer = collectionByTarget(state, 'ripple.payer-exchange.read');
    const payerTypeContracts = payer.invariantDefinitions.filter(
      (inv) => inv.kind === 'COLLECTION_ITEM_CONTRACT' && inv.itemInvariantKind === 'TYPE_IN_SET' && inv.itemRelativePath[0] === 'exchange_rate',
    );
    expect(payerTypeContracts).toHaveLength(1);
    expect((payerTypeContracts[0] as { itemAllowedTypes: readonly string[] }).itemAllowedTypes).toEqual(['ARRAY', 'OBJECT']);
  });

  test('source SHA, evidence digest preserved; derivation version distinct', () => {
    const state = deriveRealState();
    for (const targetId of [
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
    ]) {
      const historical = historicalByTarget(state, targetId).expectation;
      const collection = collectionByTarget(state, targetId);
      expect(collection.sourceProvenance.sha).toBe(historical.sourceProvenance.sha);
      expect(collection.sourceProvenance.evidenceDigest).toBe(historical.sourceProvenance.evidenceDigest);
      expect(collection.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      expect(collection.sourceProvenance.derivationVersion).toBe(REAL_SOURCE_COLLECTION_DERIVATION_VERSION);
      expect(collection.sourceProvenance.derivationVersion).not.toBe(historical.sourceProvenance.derivationVersion);
    }
  });
});

// ===========================================================================
// §8 — fail-closed transform rules.
// ===========================================================================

test.describe('Phase 11A.3 §8: fail-closed transforms', () => {
  function baseHistorical(targetId: string): DerivedRealSourceExpectation {
    const state = deriveRealState();
    return historicalByTarget(state, targetId);
  }

  test('wrong recipe/expectation target rejected (TARGET_MISMATCH)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const payerRecipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.payer-exchange.read')!;
    const result = deriveCollectionWideRealSourceExpectation({ recipe: payerRecipe, historical });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_TARGET_MISMATCH');
  });

  test('wrong item index rejected (ITEM_INDEX_MISMATCH)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const badExpectation: SemanticExpectation = {
      ...historical.expectation,
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' },
        { kind: 'FIELD_PRESENT', path: ['5', 'month'], expected: true },
      ],
    };
    const badDerived: DerivedRealSourceExpectation = { ...historical, expectation: badExpectation };
    const result = deriveCollectionWideRealSourceExpectation({ recipe: historical.recipe, historical: badDerived });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH');
  });

  test('unsupported invariant kind rejected (UNSUPPORTED_INVARIANT)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const badExpectation: SemanticExpectation = {
      ...historical.expectation,
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' },
        { kind: 'CARDINALITY_MATCH', path: ['0', 'exchange_rate'], min: 1 } as never,
      ],
    };
    const badDerived: DerivedRealSourceExpectation = { ...historical, expectation: badExpectation };
    const result = deriveCollectionWideRealSourceExpectation({ recipe: historical.recipe, historical: badDerived });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT');
  });

  test('missing evidence digest rejected (PROOF_MISSING)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const badExpectation: SemanticExpectation = {
      ...historical.expectation,
      sourceProvenance: { ...historical.expectation.sourceProvenance, evidenceDigest: undefined },
    };
    const badDerived: DerivedRealSourceExpectation = { ...historical, expectation: badExpectation };
    const result = deriveCollectionWideRealSourceExpectation({ recipe: historical.recipe, historical: badDerived });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_PROOF_MISSING');
  });

  test('strict expectation validation enforced (INVALID on overflow)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const manyFields: string[] = [];
    for (let i = 0; i < 33; i++) manyFields.push(`f${i}`);
    const badExpectation: SemanticExpectation = {
      ...historical.expectation,
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' },
        ...manyFields.map((f) => ({ kind: 'FIELD_PRESENT' as const, path: ['0', f], expected: true })),
      ],
    };
    const badDerived: DerivedRealSourceExpectation = { ...historical, expectation: badExpectation };
    const result = deriveCollectionWideRealSourceExpectation({ recipe: historical.recipe, historical: badDerived });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_INVALID');
  });

  test('unknown target recipe rejected (UNKNOWN_TARGET)', () => {
    const historical = baseHistorical('ripple.common-exchange.read');
    const unknownRecipe: RealSourceExpectationRecipe = {
      ...historical.recipe,
      recipeId: 'recipe.unknown',
      targetId: 'ripple.unknown.read',
    };
    const result = deriveCollectionWideRealSourceExpectation({ recipe: unknownRecipe, historical });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('COLLECTION_ADMISSION_UNKNOWN_TARGET');
  });
});

// ===========================================================================
// M4 — resolver / currentness.
// ===========================================================================

function makeMutableRealSource(initialSha: string): {
  reader: RealSourceReader;
  currentness: RealSourceCurrentness;
  setSha(sha: string): void;
  setFile(relativePath: string, content: string): void;
  setAvailable(available: boolean): void;
} {
  const seededFiles: Record<string, string> = {
    'src/App/Handler/ExchangeRate.php': exchangeRateFixture,
    'src/App/Handler/Account.php': accountFixture,
    'src/App/Handler/BillingGroup.php': billingGroupFixture,
    'src/App/Route/Config/Routing.yaml': routingFixture,
  };
  let sha = initialSha;
  let available = true;
  const reader: RealSourceReader = {
    readFile(id: string, relativePath: string): string | null {
      if (id !== REAL_SOURCE_FIXTURE_REPO || !available) return null;
      if (relativePath.includes('..') || relativePath.includes('\\')) return null;
      return seededFiles[relativePath] ?? null;
    },
  };
  const currentness: RealSourceCurrentness = {
    currentSnapshot(id: string) {
      return available ? { repoId: id, sha } : null;
    },
  };
  return {
    reader,
    currentness,
    setSha: (s: string) => { sha = s; },
    setFile: (p: string, c: string) => { seededFiles[p] = c; },
    setAvailable: (a: boolean) => { available = a; },
  };
}

test.describe('Phase 11A.3 M4/§18: resolver and currentness', () => {
  test('historical resolver resolves historical ID; collection resolver resolves collection ID', () => {
    const state = deriveRealState();
    const commonRecipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const historical = historicalByTarget(state, 'ripple.common-exchange.read');
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');

    const historyResolver = createRealSourceResolver({
      recipes: [commonRecipe],
      expectations: [historical.expectation],
      reader: state.reader,
      currentness: { currentSnapshot: () => ({ repoId: state.repoId, sha: state.sha }) },
    });
    const historyResolution = historyResolver.resolve({ targetId: 'ripple.common-exchange.read' });
    expect(historyResolution.kind).toBe('RESOLVED');
    if (historyResolution.kind === 'RESOLVED') {
      expect(historyResolution.expectation.expectationId).toBe('ripple.common-exchange.read.real-source-deep');
    }

    const collectionResolver = createRealSourceResolver({
      recipes: [commonRecipe],
      expectations: [collection],
      reader: state.reader,
      currentness: { currentSnapshot: () => ({ repoId: state.repoId, sha: state.sha }) },
    });
    const collectionResolution = collectionResolver.resolve({ targetId: 'ripple.common-exchange.read' });
    expect(collectionResolution.kind).toBe('RESOLVED');
    if (collectionResolution.kind === 'RESOLVED') {
      expect(collectionResolution.expectation.expectationId).toBe('ripple.common-exchange.read.real-source-collection');
    }
  });

  test('currentness A-E for a real-source-derived collection expectation', () => {
    const state = deriveRealState();
    const commonRecipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const src = makeMutableRealSource(state.sha);

    // A: same SHA + same evidence => RESOLVED.
    const resolverA = createRealSourceResolver({
      recipes: [commonRecipe], expectations: [collection], reader: src.reader, currentness: src.currentness,
    });
    expect(resolverA.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('RESOLVED');

    // B: current SHA changed => SOURCE_STALE.
    const srcB = makeMutableRealSource(OTHER_SHA);
    const resolverB = createRealSourceResolver({
      recipes: [commonRecipe], expectations: [collection], reader: srcB.reader, currentness: srcB.currentness,
    });
    expect(resolverB.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_STALE');

    // C: source unavailable => SOURCE_UNAVAILABLE.
    const srcC = makeMutableRealSource(state.sha);
    srcC.setAvailable(false);
    const resolverC = createRealSourceResolver({
      recipes: [commonRecipe], expectations: [collection], reader: srcC.reader, currentness: srcC.currentness,
    });
    expect(resolverC.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_UNAVAILABLE');

    // D: same SHA but evidence re-extraction changes => SOURCE_STALE.
    const srcD = makeMutableRealSource(state.sha);
    srcD.setFile('src/App/Handler/ExchangeRate.php', '<?php\nclass X { function getCommonExchangeRate($v) { $res = [["exchange_rate"=>$v]]; return $res; } }');
    const resolverD = createRealSourceResolver({
      recipes: [commonRecipe], expectations: [collection], reader: srcD.reader, currentness: srcD.currentness,
    });
    expect(resolverD.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_STALE');

    // E: unrelated source change, unchanged evidence => RESOLVED.
    const srcE = makeMutableRealSource(state.sha);
    srcE.setFile('src/App/Handler/ExchangeRate.php', '<?php\n// unrelated comment added\nnamespace App\\Handler;\nclass ExchangeRate { function getCommonExchangeRate($vendor): array { $res = []; $exchange_rate = []; if (empty($exchange_rate)) { $exchange_rate = (object)$exchange_rate; } $res[] = [\'month\' => $month, \'exchange_rate\' => $exchange_rate]; return $res; } function getAccountExchangeForMonth($month): array { $res = []; $exchange_rate = []; $exchange_rate[\'rate_usd\'] = 1.0; $res[] = [\'id\'=>$v[\'id\'],\'vendor\'=>$v[\'vendor\'],\'name\'=>$v[\'name\'],\'exchange_rate\'=>$exchange_rate]; return $res; } }');
    const resolverE = createRealSourceResolver({
      recipes: [commonRecipe], expectations: [collection], reader: srcE.reader, currentness: srcE.currentness,
    });
    expect(resolverE.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('RESOLVED');
  });
});

// ===========================================================================
// M5 — real-source-derived later-row detection + partial-coverage truth.
// ===========================================================================

test.describe('Phase 11A.3 M5: real-source-derived later-row + partial coverage', () => {
  test('common later-row: historical positional baseline MISSES, collection DETECTS', () => {
    const state = deriveRealState();
    const historical = historicalByTarget(state, 'ripple.common-exchange.read').expectation;
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const body = commonWithBadExchangeRate(57, 58);

    const histResult = evaluateCollection(body, historical, state.sha);
    expect(histResult.outcome).toBe('PASS');
    expect(histResult.findings).toHaveLength(0);

    const collResult = evaluateCollection(body, collection, state.sha);
    expect(collResult.outcome).toBe('ANOMALY');
    const ev = collResult.invariantEvaluations.find(
      (e) => e.invariantKind === 'COLLECTION_ITEM_CONTRACT' && e.coverageState === 'VIOLATION',
    );
    expect(ev, 'a collection contract must be VIOLATED').toBeDefined();
    expect(ev!.firstViolationOrdinal).toBe(57);
    // Finding count bounded by invariant definition, not row count.
    expect(collResult.findings).toHaveLength(1);
  });

  test('common later-row missing field: historical MISSES, collection DETECTS', () => {
    const state = deriveRealState();
    const historical = historicalByTarget(state, 'ripple.common-exchange.read').expectation;
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const body = exchangeWithMissingMonth(57, 58);

    expect(evaluateCollection(body, historical, state.sha).outcome).toBe('PASS');
    const collResult = evaluateCollection(body, collection, state.sha);
    expect(collResult.outcome).toBe('ANOMALY');
    const ev = collResult.invariantEvaluations.find(
      (e) => e.invariantKind === 'COLLECTION_ITEM_CONTRACT' && e.coverageState === 'VIOLATION',
    );
    expect(ev, 'a collection contract must be VIOLATED').toBeDefined();
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('payer later-row invalid type detected via real-source-derived collection expectation', () => {
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.payer-exchange.read');
    const body = payerWithOutsideExchangeRate(1, 2);
    const result = evaluateCollection(body, collection, state.sha);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(
      (e) => e.invariantKind === 'COLLECTION_ITEM_CONTRACT' && e.coverageState === 'VIOLATION',
    );
    expect(ev, 'a payer collection contract must be VIOLATED').toBeDefined();
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('>128 real-source-derived rows => PARTIAL_COVERAGE through receipt + Phase 9B acceptance', () => {
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const body = generateExchangeArray(130);
    const result = evaluateCollection(body, collection, state.sha);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find((e) => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);

    const receipt = buildSemanticEvaluationReceipt({
      oracleId: ORACLE_ID,
      targetId: collection.targetId,
      outcome: 'PARTIAL_COVERAGE',
      expectationId: collection.expectationId,
      sourceProvenance: collection.sourceProvenance,
      invariantTotal: 1,
      invariantPassCount: 1,
      invariantNaCount: 0,
      invariantViolationCount: 0,
      findingCount: 0,
      coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION',
      inspectedItemCount: 128,
      violatingItemCount: 0,
      journeyId: JOURNEY_ID,
      stepId: STEP_ID,
      operationId: collection.targetId,
    });
    expect(receipt.outcome).toBe('PARTIAL_COVERAGE');

    const summary = summarizePhase9bPass({
      passId: 'first',
      receipts: [receipt],
      ledgerReceiptCount: 1,
      ledgerOverflow: false,
      findings: [],
      targetId: collection.targetId,
    });
    const acceptance = evaluatePhase9bAcceptance(summary, {
      expectationId: collection.expectationId,
      approvedSha: state.sha,
    });
    expect(acceptance.pass).toBe(false);
    expect(acceptance.failures.some((f) => f.includes('PARTIAL_COVERAGE'))).toBe(true);
  });

  test('replay comparison detects partial vs full mismatch', () => {
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');

    const passReceipt = buildSemanticEvaluationReceipt({
      oracleId: ORACLE_ID,
      targetId: collection.targetId,
      outcome: 'PASS',
      expectationId: collection.expectationId,
      sourceProvenance: collection.sourceProvenance,
      invariantTotal: 1,
      invariantPassCount: 1,
      invariantNaCount: 0,
      invariantViolationCount: 0,
      findingCount: 0,
      journeyId: JOURNEY_ID,
      stepId: STEP_ID,
      operationId: collection.targetId,
    });
    const partialReceipt = buildSemanticEvaluationReceipt({
      oracleId: ORACLE_ID,
      targetId: collection.targetId,
      outcome: 'PARTIAL_COVERAGE',
      expectationId: collection.expectationId,
      sourceProvenance: collection.sourceProvenance,
      invariantTotal: 1,
      invariantPassCount: 1,
      invariantNaCount: 0,
      invariantViolationCount: 0,
      findingCount: 0,
      coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION',
      inspectedItemCount: 128,
      violatingItemCount: 0,
      journeyId: JOURNEY_ID,
      stepId: STEP_ID,
      operationId: collection.targetId,
    });

    const first = summarizePhase9bPass({
      passId: 'first', receipts: [passReceipt], ledgerReceiptCount: 1, ledgerOverflow: false, findings: [], targetId: collection.targetId,
    });
    const replay = summarizePhase9bPass({
      passId: 'replay', receipts: [partialReceipt], ledgerReceiptCount: 1, ledgerOverflow: false, findings: [], targetId: collection.targetId,
    });
    const comparison = comparePhase9bReplaySummaries(first, replay);
    expect(comparison.pass).toBe(false);
    expect(comparison.mismatches.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// M8 — owner-local current-source canary: derive the four collection
// expectations against the real disposable read-only sibling checkout
// when present, otherwise fail-closed derivation surface.
// ===========================================================================

import { DEFAULT_SIBLING_ROOT, createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { liveSourceTestRoot } from '../helpers/liveSourceTestAuthority';

test.describe('Phase 11A.3 M8/§12/§25: current-source canary (owner-local)', () => {
  test('live sibling checkout derives >= 1 real-source collection expectation', () => {
    const root = require('node:fs').existsSync(liveSourceTestRoot()) ? liveSourceTestRoot() : null;
    if (root === null) {
      // CI: no sibling checkout available — fail-closed to synthetic proof.
      const state = createRealSourceSyntheticState();
      const report = deriveRealSourceExpectations(
        REAL_SOURCE_EXPECTATION_RECIPES,
        { repoId: state.repoId, sha: state.sha },
        state.reader,
      );
      const coll = deriveCollectionWideRealSourceExpectations(report.derived);
      expect(coll.derived.length).toBeGreaterThanOrEqual(1);
      return;
    }
    const access = createSiblingSourceAccess(root);
    const snapshot = access.currentness.currentSnapshot('mobingilabs/ripple-api');
    expect(snapshot).not.toBeNull();
    if (snapshot === null) return;

    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === 'mobingilabs/ripple-api'),
      snapshot,
      access.reader,
    );
    expect(report.failures).toHaveLength(0);
    const coll = deriveCollectionWideRealSourceExpectations(report.derived);
    expect(coll.derived.length).toBeGreaterThanOrEqual(1);
    expect(coll.failures).toHaveLength(0);

    for (const derived of coll.derived) {
      expect(derived.expectation.expectationId).toMatch(/\.real-source-collection$/);
      expect(derived.expectation.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      expect(derived.expectation.sourceProvenance.sha).toBe(snapshot.sha);
      expect(derived.expectation.sourceProvenance.derivationVersion).toBe(REAL_SOURCE_COLLECTION_DERIVATION_VERSION);
    }
  });
});

// ===========================================================================
// M7/sentinel — privacy, determinism, target-set stability.
// ===========================================================================

test.describe('Phase 11A.3 M7: privacy, determinism, authority stability', () => {
  test('real-source-derived later-row evaluation leaks zero sentinels', () => {
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const body = commonWithBadExchangeRate(1, 3);
    const result = evaluateCollection(body, collection, state.sha);
    expect(result.outcome).toBe('ANOMALY');
    expect(collectLeaks(result)).toHaveLength(0);
    expect(collectLeaks(result.findings)).toHaveLength(0);
    expect(collectLeaks(result.invariantEvaluations)).toHaveLength(0);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('/home/');
    expect(serialized).not.toContain('/tmp/');
  });

  test('repeated collection derivation is deterministic', () => {
    const state1 = deriveRealState();
    const state2 = deriveRealState();
    const c1 = collectionByTarget(state1, 'ripple.common-exchange.read');
    const c2 = collectionByTarget(state2, 'ripple.common-exchange.read');
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
    expect(c1.invariantDefinitions).toEqual(c2.invariantDefinitions);
    expect(c1.sourceProvenance.evidenceDigest).toBe(c2.sourceProvenance.evidenceDigest);
  });

  test('approved read-only target set unchanged', () => {
    expect([...APPROVED_READ_ONLY_TARGET_IDS].sort()).toEqual([
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
      'ripple.billing-groups-legacy.read',
      'ripple.billing-groups.read',
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
    ]);
  });

  test('DEV-reachable target set unchanged', () => {
    expect([...DEV_REACHABLE_RECIPE_TARGET_IDS].sort()).toEqual([
      'ripple.account-inventory.read',
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
    ]);
  });

  test('129 valid rows => PARTIAL_COVERAGE receipt remains non-pass', () => {
    const state = deriveRealState();
    const collection = collectionByTarget(state, 'ripple.common-exchange.read');
    const body = exchangePartialCoverageValid129();
    const result = evaluateCollection(body, collection, state.sha);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    expect(result.outcome).not.toBe('PASS');
    const ev = result.invariantEvaluations.find((e) => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
  });
});
