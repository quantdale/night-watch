// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A03) — RESOLUTION / CURRENTNESS / DRIFT platform
// convergence: composed source-contract MOVEMENT classification (permanent
// unit proof).
//
// Pins classifySourceContractMovement end-to-end over the REAL production
// recipes and the lifecycle registry, plus composeSourceContractMovements:
//
//   - SHA-only movement with identical normalized evidence remains
//     SEMANTICALLY_STABLE — never stale, never drifted;
//   - changed evidence splits into classified drift
//     (COMPATIBLE / BREAKING / PROVABILITY_LOST / PROVABILITY_GAINED);
//   - derivation-version movement splits even at an identical SHA and
//     identical evidence;
//   - STALE / UNAVAILABLE on either side caps the pair fail-closed: a stale
//     or unavailable observation NEVER becomes current or stable;
//   - mixed-currentness composition stays blocked
//     (MIXED_CURRENTNESS_BLOCKED, forced-STALE overall);
//   - determinism (>= 3 repeats deep-equal), DTO minimality, privacy-safe
//     serialization, and fail-closed input validation.
//
// Synthetic source only: the repository-owned fixture text mechanically
// satisfying every extractor of the admitted real recipes, served through
// the bounded in-memory map source. No DEV, no real product, no network.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  SOURCE_CONTRACT_MOVEMENT_VERSION,
  classifySourceContractMovement,
  composeSourceContractMovements,
  observationFromFamilyRecord,
  unifiedFromMovementClass,
} from '../../src/oracles/expectations/lifecycle/sourceContractMovement';
import type {
  ComposedSourceContractMovement,
  SourceContractMovementClass,
  SourceContractMovementClassification,
  SourceContractObservation,
} from '../../src/oracles/expectations/lifecycle/sourceContractMovement';
import { terminalContractFamilyForTarget } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import { resolveSourceContract } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type {
  ComposedSourceContractResolution,
  FamilyResolutionRecord,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import { deriveRealSourceExpectation } from '../../src/oracles/expectations/admission';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { getRealSourceRecipe } from '../../src/oracles/expectations/recipes/registry';
import type { ContractAnalysis, AnalyzerBlockerCode, AnalyzerFact } from '../../src/oracles/expectations/extract/analyzer';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import type { MapSource } from '../helpers/phase9a1Fixtures';
import {
  accountFixture as realAccountFixture,
  billingGroupFixture as realBillingGroupFixture,
  exchangeRateFixture as realExchangeRateFixture,
  REAL_SOURCE_FIXTURE_REPO,
  REAL_SOURCE_FIXTURE_SHA,
  routingFixture as realRoutingFixture,
} from '../helpers/phase11a3Fixtures';

const REPO = REAL_SOURCE_FIXTURE_REPO;
const SHA = REAL_SOURCE_FIXTURE_SHA;
const OTHER_SHA = 'dddddddddddddddddddddddddddddddddddddddd';

const COMMON = 'ripple.common-exchange.read';
const PAYER = 'ripple.payer-exchange.read';

const FILES = {
  'src/App/Handler/ExchangeRate.php': realExchangeRateFixture,
  'src/App/Handler/Account.php': realAccountFixture,
  'src/App/Handler/BillingGroup.php': realBillingGroupFixture,
  'src/App/Route/Config/Routing.yaml': realRoutingFixture,
};

function freshMap(): MapSource {
  return createMapSource([{ repoId: REPO, sha: SHA, files: FILES }]);
}

function resolveFrom(
  map: MapSource,
  targetId: string,
  extra?: {
    snapshot?: { repoId: string; sha: string } | null;
  },
): ComposedSourceContractResolution {
  return resolveSourceContract({
    targetId,
    reader: map.reader,
    currentness: map.currentness,
    snapshot: extra?.snapshot !== undefined ? extra.snapshot : { repoId: REPO, sha: SHA },
  });
}

function terminalFamilyIdOf(targetId: string): string {
  const outcome = terminalContractFamilyForTarget(targetId);
  if (!outcome.ok) throw new Error(`no terminal family for ${targetId}: ${outcome.reason}`);
  return outcome.family.familyId;
}

function terminalRecordOf(resolution: ComposedSourceContractResolution, targetId: string): FamilyResolutionRecord {
  const familyId = terminalFamilyIdOf(targetId);
  const record = resolution.families.find((candidate) => candidate.familyId === familyId);
  if (record === undefined) throw new Error(`terminal family ${familyId} missing from resolution`);
  return record;
}

/** Bridge the terminal record of a fresh resolution into an observation. */
function terminalObservationOf(
  map: MapSource,
  targetId: string,
  sourceSha: string,
  extra?: { snapshot?: { repoId: string; sha: string } | null },
): SourceContractObservation {
  const resolution = resolveFrom(map, targetId, extra);
  return observationFromFamilyRecord({
    record: terminalRecordOf(resolution, targetId),
    sourceSha,
  });
}

const DIGEST_A = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const DIGEST_B = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
const VERSION_V1 = 'nightwatch.synthetic.derivation.v1';
const VERSION_V2 = 'nightwatch.synthetic.derivation.v2';

function observation(overrides: Partial<SourceContractObservation> = {}): SourceContractObservation {
  return {
    targetId: 'synthetic.target.read',
    sourceSha: SHA,
    evidenceDigest: DIGEST_A,
    derivationVersion: VERSION_V1,
    currentness: 'CURRENT',
    ...overrides,
  };
}

function mkAnalysis(
  status: ContractAnalysis['status'],
  facts: readonly AnalyzerFact[],
  blockerCode: AnalyzerBlockerCode | null = null,
): ContractAnalysis {
  return {
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language: 'php',
    symbol: null,
    status,
    proofClass: facts[0]?.proofClass ?? null,
    facts,
    blockerCode,
    safeEvidence: JSON.stringify({ status, facts }),
  };
}

const FACT_STRING: AnalyzerFact = { proofClass: 'SCALAR_TYPE_FROM_CAST', fieldName: 'x', allowedTypes: ['STRING'] };
const FACT_NUMBER_ONLY: AnalyzerFact = { proofClass: 'SCALAR_TYPE_FROM_CAST', fieldName: 'x', allowedTypes: ['NUMBER'] };

const ALL_MOVEMENT_CLASSES: readonly SourceContractMovementClass[] = [
  'SEMANTICALLY_STABLE',
  'EVIDENCE_DRIFTED_COMPATIBLE',
  'EVIDENCE_DRIFTED_BREAKING',
  'PROVABILITY_LOST',
  'PROVABILITY_GAINED',
  'DERIVATION_VERSION_MOVED',
  'SOURCE_STALE',
  'SOURCE_UNAVAILABLE',
  'NO_EVALUABLE_CONTRACT',
];

// ---------------------------------------------------------------------------

test.describe('Phase 15P A03 — classifySourceContractMovement (resolution x currentness x drift)', () => {
  test('version constant is pinned', () => {
    expect(SOURCE_CONTRACT_MOVEMENT_VERSION).toBe('nightwatch.source-contract-movement.v1');
  });

  test('SHA-only movement + identical evidence is SEMANTICALLY_STABLE (not stale, not drifted)', () => {
    // Baseline at SHA; then ONLY the snapshot advances (files byte-identical):
    // a fresh explicit re-derivation reproduces the SAME normalized evidence.
    const map = freshMap();
    const previous = terminalObservationOf(map, COMMON, SHA);
    map.setSha(REPO, OTHER_SHA);
    const current = terminalObservationOf(map, COMMON, OTHER_SHA, {
      snapshot: { repoId: REPO, sha: OTHER_SHA },
    });

    expect(previous.currentness).toBe('CURRENT');
    expect(current.currentness).toBe('CURRENT');
    expect(previous.sourceSha).toBe(SHA);
    expect(current.sourceSha).toBe(OTHER_SHA);
    expect(previous.evidenceDigest).toBe(current.evidenceDigest);
    expect(previous.evidenceDigest).not.toBeNull();

    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementVersion).toBe(SOURCE_CONTRACT_MOVEMENT_VERSION);
    expect(classification.movementClass).toBe('SEMANTICALLY_STABLE');
    // Not stale, not drifted: the underlying Phase-14 class records the pure
    // SHA movement, and the unified category stays success-floor PROVEN.
    expect(classification.drift.driftClass).toBe('EVIDENCE_UNCHANGED_SHA_MOVED');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('PROVEN');
    expect(classification.currentnessCeiling).toBe('CURRENT');
  });

  test('changed evidence splits: both sides current -> EVIDENCE_DRIFTED_COMPATIBLE', () => {
    // The payer field gains a second string-key subscript: the type-flow
    // pattern still admits derivation, but subscriptAssignments participates
    // in the canonical evidence digest, so the digest moves.
    const mutated = realExchangeRateFixture.replace(
      "        $exchange_rate['rate_usd'] = 1.0;",
      "        $exchange_rate['rate_usd'] = 1.0;\n        $exchange_rate['rate_eur'] = 2.0;",
    );
    const map = freshMap();
    const previous = terminalObservationOf(map, PAYER, SHA);

    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', mutated);
    map.setSha(REPO, OTHER_SHA); // committed movement: content + snapshot together
    const current = terminalObservationOf(map, PAYER, OTHER_SHA, {
      snapshot: { repoId: REPO, sha: OTHER_SHA },
    });

    expect(previous.currentness).toBe('CURRENT');
    expect(current.currentness).toBe('CURRENT');
    expect(current.evidenceDigest).not.toBeNull();
    expect(current.evidenceDigest).not.toBe(previous.evidenceDigest);

    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('EVIDENCE_DRIFTED_COMPATIBLE');
    expect(classification.drift.driftClass).toBe('EVIDENCE_CHANGED_COMPATIBLE');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('PARTIAL');
    expect(classification.drift.prevDigest).not.toBe(classification.drift.currDigest);
  });

  test('changed evidence splits: proven fact/type removed -> EVIDENCE_DRIFTED_BREAKING', () => {
    const classification = classifySourceContractMovement({
      previous: observation({
        evidenceDigest: DIGEST_A,
        analysis: mkAnalysis('PROVEN', [FACT_STRING]),
      }),
      current: observation({
        evidenceDigest: DIGEST_B,
        analysis: mkAnalysis('PROVEN', [FACT_NUMBER_ONLY]),
      }),
    });
    expect(classification.movementClass).toBe('EVIDENCE_DRIFTED_BREAKING');
    expect(classification.drift.driftClass).toBe('EVIDENCE_CHANGED_BREAKING');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('UNSUPPORTED');
  });

  test('provability flips split: PROVABILITY_LOST and PROVABILITY_GAINED', () => {
    const lost = classifySourceContractMovement({
      previous: observation({ analysis: mkAnalysis('PROVEN', [FACT_STRING]) }),
      current: observation({ evidenceDigest: DIGEST_B, analysis: mkAnalysis('AMBIGUOUS', []) }),
    });
    expect(lost.movementClass).toBe('PROVABILITY_LOST');
    expect(lost.drift.driftClass).toBe('CONTRACT_BECAME_AMBIGUOUS');
    expect(unifiedFromMovementClass(lost.movementClass).category).toBe('AMBIGUOUS');

    const gained = classifySourceContractMovement({
      previous: observation({ analysis: mkAnalysis('AMBIGUOUS', []) }),
      current: observation({ evidenceDigest: DIGEST_B, analysis: mkAnalysis('PROVEN', [FACT_STRING]) }),
    });
    expect(gained.movementClass).toBe('PROVABILITY_GAINED');
    expect(gained.drift.driftClass).toBe('CONTRACT_BECAME_PROVABLE');
    expect(unifiedFromMovementClass(gained.movementClass).category).toBe('PROVEN');
  });

  test('derivation-version movement splits even at identical SHA and identical evidence', () => {
    const classification = classifySourceContractMovement({
      previous: observation({ derivationVersion: VERSION_V1 }),
      current: observation({ derivationVersion: VERSION_V2 }),
    });
    // Same SHA, same digest, both CURRENT — yet the pair is NOT stable.
    expect(classification.movementClass).toBe('DERIVATION_VERSION_MOVED');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
    expect(classification.drift.driftClass).toBe('DERIVATION_VERSION_CHANGED');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('PARTIAL');

    // Real-record variant: clone a bridged terminal record with an upgraded
    // derivation version; the split survives the bridge.
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON);
    const record = terminalRecordOf(resolution, COMMON);
    const previous = observationFromFamilyRecord({ record, sourceSha: SHA });
    const upgraded = observationFromFamilyRecord({
      record: { ...record, derivationVersion: VERSION_V2 },
      sourceSha: SHA,
    });
    const viaBridge = classifySourceContractMovement({ previous, current: upgraded });
    expect(viaBridge.movementClass).toBe('DERIVATION_VERSION_MOVED');
  });

  test('neither side evaluable -> NO_EVALUABLE_CONTRACT floor (never success-looking)', () => {
    const classification = classifySourceContractMovement({
      previous: observation({ sourceSha: null, evidenceDigest: null, derivationVersion: null, currentness: 'NOT_APPLICABLE' }),
      current: observation({ sourceSha: null, evidenceDigest: null, derivationVersion: null, currentness: 'NOT_APPLICABLE' }),
    });
    expect(classification.movementClass).toBe('NO_EVALUABLE_CONTRACT');
    expect(classification.currentnessCeiling).toBe('NOT_APPLICABLE');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('NOT_APPLICABLE');
  });
});

test.describe('Phase 15P A03 — fail-closed currentness ceiling', () => {
  test('current -> stale with IDENTICAL evidence: SOURCE_STALE, never stable', () => {
    // The snapshot moves WITHOUT a fresh re-derivation: the bound expectation
    // keeps its exact evidence digest, yet the pair can never certify
    // stability across the stale interval.
    const map = freshMap();
    const previous = terminalObservationOf(map, COMMON, SHA);
    map.setSha(REPO, OTHER_SHA);
    const staleResolution = resolveFrom(map, COMMON); // currentness disagrees with the bound snapshot
    expect(staleResolution.kind).toBe('STALE');
    const current = observationFromFamilyRecord({
      record: terminalRecordOf(staleResolution, COMMON),
      sourceSha: OTHER_SHA,
    });

    expect(current.currentness).toBe('STALE');
    expect(current.evidenceDigest).toBe(previous.evidenceDigest); // identical evidence

    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('SOURCE_STALE');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
    expect(classification.currentnessCeiling).toBe('STALE');
    expect(classification.drift.driftClass).toBe('SOURCE_STALE');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('STALE');
  });

  test('current -> unavailable: SOURCE_UNAVAILABLE ceiling', () => {
    const map = freshMap();
    const previous = terminalObservationOf(map, COMMON, SHA);
    const nullCurrentness = { currentSnapshot: () => null };
    const unavailable = resolveSourceContract({
      targetId: COMMON,
      reader: map.reader,
      currentness: nullCurrentness,
      snapshot: { repoId: REPO, sha: SHA },
    });
    expect(unavailable.kind).toBe('SOURCE_UNAVAILABLE');
    const current = observationFromFamilyRecord({
      record: terminalRecordOf(unavailable, COMMON),
      sourceSha: null,
    });

    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('SOURCE_UNAVAILABLE');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
    expect(classification.currentnessCeiling).toBe('UNAVAILABLE');
    expect(unifiedFromMovementClass(classification.movementClass).category).toBe('UNAVAILABLE');
  });

  test('asymmetric ceiling: stale -> current with identical evidence NEVER upgrades', () => {
    const previous = observation({ currentness: 'STALE' });
    const current = observation({ currentness: 'CURRENT' }); // same sha/digest/version
    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('SOURCE_STALE');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
    expect(classification.currentnessCeiling).toBe('STALE');
  });

  test('asymmetric ceiling: unavailable -> current NEVER upgrades', () => {
    const previous = observation({ currentness: 'UNAVAILABLE' });
    const current = observation({ currentness: 'CURRENT' });
    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('SOURCE_UNAVAILABLE');
    expect(classification.currentnessCeiling).toBe('UNAVAILABLE');
  });

  test('ceiling outranks content semantics: stale side + version movement stays SOURCE_STALE', () => {
    const classification = classifySourceContractMovement({
      previous: observation({ currentness: 'STALE', derivationVersion: VERSION_V1 }),
      current: observation({ currentness: 'CURRENT', derivationVersion: VERSION_V2 }),
    });
    expect(classification.movementClass).toBe('SOURCE_STALE');
    expect(classification.movementClass).not.toBe('DERIVATION_VERSION_MOVED');
  });

  test('same-SHA content edit splits on evidence identity, not SHA equality', () => {
    // resolveSourceContract derives FRESH at the given snapshot, so a
    // same-SHA content edit re-admits with a different evidence digest while
    // both sides stay CURRENT: the movement classifier must key on the
    // normalized evidence identity (never raw SHA equality) and split.
    const mutated = realExchangeRateFixture.replace(
      "        $exchange_rate['rate_usd'] = 1.0;",
      "        $exchange_rate['rate_usd'] = 1.0;\n        $exchange_rate['rate_eur'] = 2.0;",
    );
    const map = freshMap();
    const previous = terminalObservationOf(map, PAYER, SHA);
    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', mutated);
    const current = terminalObservationOf(map, PAYER, SHA); // SAME snapshot sha

    expect(current.currentness).toBe('CURRENT');
    expect(current.sourceSha).toBe(previous.sourceSha);
    expect(current.evidenceDigest).not.toBe(previous.evidenceDigest);

    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('EVIDENCE_DRIFTED_COMPATIBLE');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
  });

  test('dirty-tree same-SHA edit: the phase-10 resolver goes STALE and caps the pair', () => {
    // Low-level surface (pre-bound expectation, phase10Currentness matrix C):
    // content changes under an unchanged snapshot -> SOURCE_STALE. The pair
    // classification must honor that ceiling even with identical digests and
    // an identical SHA on both sides.
    const mutated = realExchangeRateFixture.replace(
      "        $exchange_rate['rate_usd'] = 1.0;",
      "        $exchange_rate['rate_usd'] = 1.0;\n        $exchange_rate['rate_eur'] = 2.0;",
    );
    const map = freshMap();
    const recipe = getRealSourceRecipe(PAYER);
    if (recipe === null) throw new Error('missing payer recipe');
    const derived = deriveRealSourceExpectation(recipe, SHA, map.reader);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const boundDigest = derived.derived.evidenceDigest;

    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', mutated);
    const stale = createRealSourceResolver({
      recipes: [recipe],
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    }).resolve({ targetId: PAYER });
    expect(stale.kind).toBe('SOURCE_STALE');

    const previous = observation({ targetId: PAYER, evidenceDigest: boundDigest });
    const current = observation({ targetId: PAYER, evidenceDigest: boundDigest, currentness: 'STALE' });
    const classification = classifySourceContractMovement({ previous, current });
    expect(classification.movementClass).toBe('SOURCE_STALE');
    expect(classification.movementClass).not.toBe('SEMANTICALLY_STABLE');
    expect(classification.currentnessCeiling).toBe('STALE');
  });
});

test.describe('Phase 15P A03 — composeSourceContractMovements', () => {
  function stableMember(targetId: string): SourceContractMovementClassification {
    return classifySourceContractMovement({
      previous: observation({ targetId }),
      current: observation({ targetId }),
    });
  }
  function staleMember(targetId: string): SourceContractMovementClassification {
    return classifySourceContractMovement({
      previous: observation({ targetId, currentness: 'CURRENT' }),
      current: observation({ targetId, currentness: 'STALE' }),
    });
  }

  test('mixed CURRENT/STALE ceilings stay blocked with a forced-STALE overall', () => {
    const composed: ComposedSourceContractMovement = composeSourceContractMovements([
      stableMember('synthetic.a.read'),
      staleMember('synthetic.b.read'),
    ]);
    expect(composed.kind).toBe('MIXED_CURRENTNESS_BLOCKED');
    expect(composed.movementClass).toBeNull();
    expect(composed.overall.category).toBe('STALE');
    expect(composed.overall.sourceVocabulary).toBe('real-source-resolution');
    expect(composed.overall.sourceValue).toBe('SOURCE_STALE');
  });

  test('mixed CURRENT/UNAVAILABLE ceilings stay blocked too', () => {
    const unavailableMember = classifySourceContractMovement({
      previous: observation({ targetId: 'synthetic.c.read' }),
      current: observation({ targetId: 'synthetic.c.read', currentness: 'UNAVAILABLE' }),
    });
    const composed = composeSourceContractMovements([stableMember('synthetic.a.read'), unavailableMember]);
    expect(composed.kind).toBe('MIXED_CURRENTNESS_BLOCKED');
    expect(composed.movementClass).toBeNull();
    expect(composed.overall.category).toBe('STALE');
  });

  test('uniform stable members compose to SEMANTICALLY_STABLE / PROVEN', () => {
    const composed = composeSourceContractMovements([
      stableMember('synthetic.a.read'),
      stableMember('synthetic.b.read'),
    ]);
    expect(composed.kind).toBe('COMPOSED');
    expect(composed.movementClass).toBe('SEMANTICALLY_STABLE');
    expect(composed.overall.category).toBe('PROVEN');
  });

  test('uniform stale members compose to SOURCE_STALE / STALE', () => {
    const composed = composeSourceContractMovements([
      staleMember('synthetic.a.read'),
      staleMember('synthetic.b.read'),
    ]);
    expect(composed.kind).toBe('COMPOSED');
    expect(composed.movementClass).toBe('SOURCE_STALE');
    expect(composed.overall.category).toBe('STALE');
  });

  test('agreeing ceilings with differing movement classes take the severity-max', () => {
    const breakingMember = classifySourceContractMovement({
      previous: observation({
        targetId: 'synthetic.c.read',
        analysis: mkAnalysis('PROVEN', [FACT_STRING]),
      }),
      current: observation({
        targetId: 'synthetic.c.read',
        evidenceDigest: DIGEST_B,
        analysis: mkAnalysis('PROVEN', [FACT_NUMBER_ONLY]),
      }),
    });
    const composed = composeSourceContractMovements([stableMember('synthetic.a.read'), breakingMember]);
    expect(composed.kind).toBe('COMPOSED');
    expect(composed.movementClass).toBe('EVIDENCE_DRIFTED_BREAKING');
    expect(composed.overall.category).toBe('UNSUPPORTED');
  });

  test('empty composition composes to the NO_EVALUABLE_CONTRACT floor', () => {
    const composed = composeSourceContractMovements([]);
    expect(composed.kind).toBe('COMPOSED');
    expect(composed.movementClass).toBe('NO_EVALUABLE_CONTRACT');
    expect(composed.overall.category).toBe('NOT_APPLICABLE');
  });

  test('all-NOT_APPLICABLE members agree through the EMPTY path to the floor', () => {
    const floorMember = classifySourceContractMovement({
      previous: observation({ targetId: 'synthetic.a.read', sourceSha: null, evidenceDigest: null, derivationVersion: null, currentness: 'NOT_APPLICABLE' }),
      current: observation({ targetId: 'synthetic.a.read', sourceSha: null, evidenceDigest: null, derivationVersion: null, currentness: 'NOT_APPLICABLE' }),
    });
    const composed = composeSourceContractMovements([floorMember, floorMember]);
    expect(composed.kind).toBe('COMPOSED');
    expect(composed.movementClass).toBe('NO_EVALUABLE_CONTRACT');
    expect(composed.overall.category).toBe('NOT_APPLICABLE');
  });

  test('bridged real member + crafted stale member stay blocked (end-to-end mix)', () => {
    const map = freshMap();
    const bridged = terminalObservationOf(map, COMMON, SHA);
    const bridgedStable = classifySourceContractMovement({ previous: bridged, current: bridged });
    expect(bridgedStable.movementClass).toBe('SEMANTICALLY_STABLE');

    const composed = composeSourceContractMovements([bridgedStable, staleMember('synthetic.b.read')]);
    expect(composed.kind).toBe('MIXED_CURRENTNESS_BLOCKED');
    expect(composed.overall.category).toBe('STALE');
  });
});

test.describe('Phase 15P A03 — observationFromFamilyRecord bridge + validation', () => {
  test('bridge maps a real family record faithfully', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON);
    const record = terminalRecordOf(resolution, COMMON);
    const observed = observationFromFamilyRecord({ record, sourceSha: SHA });
    expect(observed.targetId).toBe(record.familyId);
    expect(observed.sourceSha).toBe(SHA);
    expect(observed.evidenceDigest).toBe(record.evidenceDigest);
    expect(observed.derivationVersion).toBe(record.derivationVersion);
    expect(observed.currentness).toBe(record.currentnessClass);
  });

  test('bridge rejects a malformed record SHA (fail-closed)', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON);
    const record = terminalRecordOf(resolution, COMMON);
    expect(() =>
      observationFromFamilyRecord({ record, sourceSha: 'not-a-valid-sha' }),
    ).toThrow('MOVEMENT_INVALID_SOURCE_SHA:record');
  });

  test('malformed observation inputs are rejected before any evaluation', () => {
    expect(() =>
      classifySourceContractMovement({
        previous: observation({ sourceSha: 'nope' }),
        current: observation(),
      }),
    ).toThrow('MOVEMENT_INVALID_SOURCE_SHA:previous');

    expect(() =>
      classifySourceContractMovement({
        previous: observation(),
        current: observation({ evidenceDigest: 'ev:sha256:short' }),
      }),
    ).toThrow('MOVEMENT_INVALID_EVIDENCE_DIGEST:current');

    expect(() =>
      classifySourceContractMovement({
        previous: observation(),
        current: observation({ currentness: 'MAYBE' as unknown as SourceContractObservation['currentness'] }),
      }),
    ).toThrow('MOVEMENT_UNKNOWN_CURRENTNESS:MAYBE');

    expect(() =>
      classifySourceContractMovement({
        previous: observation({ targetId: 'synthetic.one.read' }),
        current: observation({ targetId: 'synthetic.two.read' }),
      }),
    ).toThrow('MOVEMENT_TARGET_MISMATCH');
  });

  test('privacy sentinel in a caller-supplied derivation version is rejected', () => {
    expect(() =>
      classifySourceContractMovement({
        previous: observation(),
        current: observation({ derivationVersion: `${VERSION_V2} PRIVACY_SENTINEL leak` }),
      }),
    ).toThrow('MOVEMENT_PRIVACY_SENTINEL_REJECTED:current.derivationVersion');
  });
});

test.describe('Phase 15P A03 — privacy, vocabulary boundedness, determinism', () => {
  test('serialized classifications carry categorical values only (no sentinels)', () => {
    const classification = classifySourceContractMovement({
      previous: observation({ analysis: mkAnalysis('PROVEN', [FACT_STRING]) }),
      current: observation({ evidenceDigest: DIGEST_B, analysis: mkAnalysis('PROVEN', [FACT_NUMBER_ONLY]) }),
    });
    const serialized = JSON.stringify(classification);
    expect(serialized).not.toContain('sk-');
    expect(serialized).not.toContain('AKIA');
    expect(serialized).not.toContain('password=');
    expect(serialized).not.toContain('Bearer ');
    expect(serialized).not.toContain('PRIVACY_SENTINEL');
  });

  test('movement vocabulary is bounded and every class lands in the unified categories', () => {
    for (const movementClass of ALL_MOVEMENT_CLASSES) {
      const unified = unifiedFromMovementClass(movementClass);
      expect(unified.sourceVocabulary).toBe('source-contract-movement');
      expect(unified.sourceValue).toBe(movementClass);
      expect([
        'PROVEN',
        'AMBIGUOUS',
        'UNSUPPORTED',
        'STALE',
        'UNAVAILABLE',
        'PARTIAL',
        'NOT_APPLICABLE',
      ]).toContain(unified.category);
    }
  });

  test('classification DTO shape is minimal and pinned', () => {
    const classification = classifySourceContractMovement({
      previous: observation(),
      current: observation({ evidenceDigest: DIGEST_B }),
    });
    expect(Object.keys(classification).sort()).toEqual([
      'current',
      'currentnessCeiling',
      'drift',
      'movementClass',
      'movementVersion',
      'previous',
      'targetId',
    ]);
    expect(Object.keys(composeSourceContractMovements([classification])).sort()).toEqual([
      'kind',
      'movementClass',
      'movementVersion',
      'overall',
    ]);
  });

  test('determinism: >= 3 repeats deep-equal (pair, composition, end-to-end)', () => {
    // Pair-level: identical inputs, three runs, byte-identical output.
    const inputs = {
      previous: observation({ analysis: mkAnalysis('PROVEN', [FACT_STRING]) }),
      current: observation({ evidenceDigest: DIGEST_B, analysis: mkAnalysis('PROVEN', [FACT_STRING, FACT_NUMBER_ONLY]) }),
    };
    const pairRuns = new Set(
      Array.from({ length: 3 }, () => JSON.stringify(classifySourceContractMovement(inputs))),
    );
    expect(pairRuns.size).toBe(1);

    // Composition-level.
    const member = classifySourceContractMovement(inputs);
    const composeRuns = new Set(
      Array.from({ length: 3 }, () => JSON.stringify(composeSourceContractMovements([member, member]))),
    );
    expect(composeRuns.size).toBe(1);

    // End-to-end through the real recipes: three independent resolutions of
    // the same source state produce identical observations and identical
    // classifications.
    const e2eRuns = new Set(
      Array.from({ length: 3 }, () => {
        const map = freshMap();
        const previous = terminalObservationOf(map, COMMON, SHA);
        map.setSha(REPO, OTHER_SHA);
        const current = terminalObservationOf(map, COMMON, OTHER_SHA, {
          snapshot: { repoId: REPO, sha: OTHER_SHA },
        });
        return JSON.stringify(classifySourceContractMovement({ previous, current }));
      }),
    );
    expect(e2eRuns.size).toBe(1);
    const sample = JSON.parse([...e2eRuns][0]!) as { movementClass: string };
    expect(sample.movementClass).toBe('SEMANTICALLY_STABLE');
  });
});
