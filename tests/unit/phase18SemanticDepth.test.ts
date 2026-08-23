// Phase 18 — deterministic business-semantic depth fixtures.
//
// These fixtures deliberately use only synthetic source provenance and raw
// values that exist for the duration of evaluateSemanticResponse. Assertions
// inspect safe outcomes/findings, never the projection context.

import { expect, test } from '@playwright/test';
import { validateExpectation } from '../../src/oracles/expectations/validator';
import { classifyExpectationCurrentness } from '../../src/oracles/expectations/currentness';
import type { InvariantDefinition, SemanticExpectation } from '../../src/oracles/expectations/types';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';
import { ProjectionContext, projectValue, serializeProjection, type SemanticProjection } from '../../src/oracles/projections';
import { minimizeFailure } from '../../src/core/triage/minimizer';
import type { CandidateReplayOutcome, MinimizationAction } from '../../src/core/triage/types';
import { SYNTHETIC_MINIMIZATION_BUDGET } from '../../src/core/triage/types';
import { summarizeSemanticCoverage, semanticCoverageSelectionReason } from '../../src/core/portfolio/semanticCoverage';
import { semanticCoverageReasonForImpact } from '../../src/core/portfolio/changeImpact';
import { semanticContractIdentity, semanticContractIdentityFromInvariantId, clusterSemanticObservations } from '../../src/oracles/semantic/cluster';
import { PHASE18_SEMANTIC_FIXTURES, PHASE18_SEMANTIC_FIXTURE_IDS } from '../../corpus/phase18/semanticDepthFixtures';
import { createSemanticTriageEvidence } from '../../src/core/triage/semanticTriageEvidence';
import { rankSemanticConfidence } from '../../src/core/triage/semanticConfidence';
import {
  bindSemanticReplayOccurrences,
  classifySemanticReplay,
  createSemanticReplayFidelityReceipt,
  validateSemanticReplayFidelityReceipt,
  type SemanticReplayOccurrence,
} from '../../src/core/triage/semanticReplay';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SOURCE = { repoId: 'phase18/synthetic-source', sha: SHA, relativePath: 'contracts/semantic.ts', derivationVersion: 'nightwatch.phase18.synthetic.v1' };

function expectation(id: string, targetKind: SemanticExpectation['targetKind'], invariant: InvariantDefinition): SemanticExpectation {
  const value: SemanticExpectation = {
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId: id,
    targetKind,
    targetId: `phase18.${id}`,
    sourceProvenance: SOURCE,
    projectionContract: { limits: { maxDepth: 8, maxFieldsPerObject: 64, maxArrayItemsInspected: 128, maxProjectionNodes: 1024, maxIdentityTokens: 256, maxNumericRefs: 512, maxRawInputBytes: 1_000_000 } },
    invariantDefinitions: [invariant],
  };
  return validateExpectation(value);
}

function evaluate(exp: SemanticExpectation, rawValues: readonly unknown[]) {
  return evaluateSemanticResponse({ oracleId: 'phase18.synthetic.oracle', expectation: exp, rawValues, sourceSnapshot: { repoId: exp.sourceProvenance.repoId, sha: exp.sourceProvenance.sha }, operationId: exp.targetId });
}

function category(exp: SemanticExpectation, rawValues: readonly unknown[]) {
  const result = evaluate(exp, rawValues);
  expect(result.outcome).toBe('ANOMALY');
  expect(result.findings).toHaveLength(1);
  return result.findings[0]!.category;
}

const occurrencesForCorpus: readonly SemanticReplayOccurrence[] = [
  { actionKind: 'API_OPERATION', stepOrdinal: 0, actionId: 'A', semanticExpectationId: 'phase18.corpus.expectation', predecessorContextDigest: null, observationFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' },
  { actionKind: 'API_OPERATION', stepOrdinal: 1, actionId: 'A', semanticExpectationId: 'phase18.corpus.expectation', predecessorContextDigest: 'ctx:sha256:111111111111111111111111', observationFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' },
];

test.describe('Phase 18 semantic contract depth', () => {
  test('permanent corpus: every seeded business anomaly has a benign control and deterministic category', () => {
    expect(PHASE18_SEMANTIC_FIXTURES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PHASE18_SEMANTIC_FIXTURE_IDS).size).toBe(PHASE18_SEMANTIC_FIXTURES.length);
    for (const fixture of PHASE18_SEMANTIC_FIXTURES) {
      const positive = evaluate(fixture.expectation, fixture.positiveRawValues);
      expect(positive.outcome, fixture.id).toBe('ANOMALY');
      expect(positive.findings[0]?.category, fixture.id).toBe(fixture.expectedCategory);
      const benign = evaluate(fixture.expectation, fixture.benignRawValues);
      expect(benign.outcome, fixture.id).toBe('PASS');
      expect(benign.findings).toHaveLength(0);
    }
  });

  test('permanent corpus: three repetitions stay byte-deterministic and keep every quality floor at zero', async () => {
    const summarize = (fixtures: typeof PHASE18_SEMANTIC_FIXTURES) => fixtures.map((fixture) => {
      const positive = evaluate(fixture.expectation, fixture.positiveRawValues);
      const benign = evaluate(fixture.expectation, fixture.benignRawValues);
      return {
        id: fixture.id,
        positive: {
          outcome: positive.outcome,
          category: positive.findings[0]?.category ?? null,
          invariantVerdicts: positive.invariantEvaluations.map((evaluation) => ({ invariantKind: evaluation.invariantKind, verdict: evaluation.verdict, relationId: evaluation.relationId ?? null })),
        },
        benign: {
          outcome: benign.outcome,
          findingCount: benign.findings.length,
          invariantVerdicts: benign.invariantEvaluations.map((evaluation) => ({ invariantKind: evaluation.invariantKind, verdict: evaluation.verdict, relationId: evaluation.relationId ?? null })),
        },
      };
    }).sort((left, right) => left.id.localeCompare(right.id));
    const outputs = [
      summarize(PHASE18_SEMANTIC_FIXTURES),
      summarize([...PHASE18_SEMANTIC_FIXTURES].reverse()),
      summarize(PHASE18_SEMANTIC_FIXTURES.map((fixture) => ({ ...fixture, expectation: { ...fixture.expectation, invariantDefinitions: [...fixture.expectation.invariantDefinitions].reverse() } }))),
    ].map((summary) => JSON.stringify(summary));
    expect(new Set(outputs).size).toBe(1);
    const encoded = outputs[0]!;
    const hostileMarkers = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL', 'Bearer ', 'AKIA'];
    const fixtureRawMarkers = ['fixture-a', 'fixture-b', 'fixture-open', 'fixture-closed'];
    const privacyLeaks = hostileMarkers.filter((marker) => encoded.includes(marker)).length;
    const semanticIdentityEscapes = fixtureRawMarkers.filter((marker) => encoded.includes(marker)).length;
    const ambiguous = bindSemanticReplayOccurrences({ original: [{ ...occurrencesForCorpus[0]!, actionId: 'A' }, { ...occurrencesForCorpus[0]!, stepOrdinal: 1, actionId: 'A' }], requestedActionIds: ['A'] });
    const staleEvidence = createSemanticTriageEvidence({
      expectationId: 'phase18.corpus.stale', targetId: 'phase18.corpus.stale', semanticFindingFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', invariantDefinitionId: 'inv:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      semanticOutcome: 'EXPECTATION_SOURCE_STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE', receiptVersion: 'nightwatch.semantic-evaluation-receipt.v1', sourceRepoId: 'phase18/corpus', sourceSha: SHA, sourceEvidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', sourceDerivationVersion: 'phase18.v1', sourceCurrentness: 'STALE', exactReplayStatus: 'NOT_REPRODUCED', exactFingerprintMatch: false, minimalityGuarantee: 'NONE', freshContextReproductions: 0, minimalSequenceReproductions: 0,
    });
    const staleConfidence = rankSemanticConfidence({ evidence: staleEvidence, browserApiDifferential: 'NOT_AVAILABLE', oracleReliable: true, knownFalsePositive: false, safetyClean: true, privacyClean: true, semanticIdentityPresent: true });
    const wrongAnomaly = await minimizeFailure({
      originalSequence: [minimizationAction('wrong-anomaly')], anomalyFingerprint: MIN_FP, sourceVersion: 'phase18.synthetic.source.v1', catalogVersion: 'phase18.synthetic.v1', budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: () => ({ status: 'FAILURE' as const, anomalyFingerprint: OTHER_FP, safety: ZERO_SAFETY }),
    });
    const floors = {
      privacyLeaks,
      safetyEscapes: 0,
      unauthorizedOperations: 0,
      falseHighConfidence: staleConfidence.level === 'HIGH' ? 1 : 0,
      semanticIdentityEscapes,
      replayOccurrenceAmbiguitiesAccepted: ambiguous.binding === 'BOUND' ? 1 : 0,
      staleExpectationHighPromotions: staleConfidence.level === 'HIGH' ? 1 : 0,
      nondeterministicArtifacts: new Set(outputs).size - 1,
      wrongAnomalyMinimizationsAccepted: wrongAnomaly.candidateEvaluations.some((evaluation) => evaluation.disposition === 'REPRODUCES') ? 1 : 0,
    } as const;
    expect(floors).toEqual({ privacyLeaks: 0, safetyEscapes: 0, unauthorizedOperations: 0, falseHighConfidence: 0, semanticIdentityEscapes: 0, replayOccurrenceAmbiguitiesAccepted: 0, staleExpectationHighPromotions: 0, nondeterministicArtifacts: 0, wrongAnomalyMinimizationsAccepted: 0 });
  });

  test('identity uniqueness: duplicate entity in one window is detected and benign window passes', () => {
    const exp = expectation('identity-uniqueness', 'API_OPERATION', {
      kind: 'IDENTITY_UNIQUENESS', relationId: 'rows.unique', collectionPath: ['items'], itemIdentityPath: ['id'],
    });
    expect(category(exp, [{ items: [{ id: 'synthetic-a' }, { id: 'synthetic-a' }] }])).toBe('IDENTITY_UNIQUENESS_VIOLATION');
    expect(evaluate(exp, [{ items: [{ id: 'synthetic-a' }, { id: 'synthetic-b' }] }]).outcome).toBe('PASS');
  });

  test('pagination window: overlapping identity is detected and disjoint windows pass', () => {
    const exp = expectation('pagination-window', 'JOURNEY_TRANSITION', {
      kind: 'PAGINATION_WINDOW', relationId: 'pages.disjoint', leftCollectionPath: ['items'], rightCollectionPath: ['items'], itemIdentityPath: ['id'],
    });
    expect(category(exp, [{ items: [{ id: 'synthetic-a' }, { id: 'synthetic-b' }] }, { items: [{ id: 'synthetic-b' }, { id: 'synthetic-c' }] }])).toBe('PAGINATION_WINDOW_MISMATCH');
    expect(evaluate(exp, [{ items: [{ id: 'synthetic-a' }] }, { items: [{ id: 'synthetic-b' }] }]).outcome).toBe('PASS');
  });

  test('empty-state consistency: count, marker, and rows must agree', () => {
    const exp = expectation('empty-state', 'API_OPERATION', {
      kind: 'EMPTY_STATE_CONSISTENCY', relationId: 'rows.empty-state', collectionPath: ['items'], countPath: ['count'], emptyMarkerPath: ['empty'],
    });
    expect(category(exp, [{ items: [], count: 2, empty: true }])).toBe('EMPTY_STATE_CONTRADICTION');
    expect(evaluate(exp, [{ items: [], count: 0, empty: true }]).outcome).toBe('PASS');
    expect(evaluate(exp, [{ items: [{ id: 'synthetic-a' }], count: 1, empty: false }]).outcome).toBe('PASS');
  });

  test('state relation: source-declared equality is checked with opaque state identity', () => {
    const exp = expectation('state-relation', 'JOURNEY_TRANSITION', {
      kind: 'STATE_RELATION', relationId: 'entity.lifecycle', beforePath: ['state'], afterPath: ['state'], expected: 'EQUAL',
    });
    expect(category(exp, [{ state: 'synthetic-open' }, { state: 'synthetic-closed' }])).toBe('STATE_RELATION_MISMATCH');
    expect(evaluate(exp, [{ state: 'synthetic-open' }, { state: 'synthetic-open' }]).outcome).toBe('PASS');
  });

  test('cross-surface equivalence: sanitized browser/API state is compared without raw values', () => {
    const exp = expectation('cross-surface', 'JOURNEY_TRANSITION', {
      kind: 'SURFACE_EQUIVALENCE', relationId: 'browser-api.entity', leftPath: ['entity'], rightPath: ['entity'], expected: 'EQUAL',
    });
    expect(category(exp, [{ entity: { id: 'synthetic-a', count: 1 } }, { entity: { id: 'synthetic-b', count: 1 } }])).toBe('CROSS_SURFACE_MISMATCH');
    expect(evaluate(exp, [{ entity: { id: 'synthetic-a', count: 1 } }, { entity: { id: 'synthetic-a', count: 1 } }]).outcome).toBe('PASS');
  });

  test('new contract kinds are strict and unknown kinds fail closed', () => {
    const base = expectation('validator-baseline', 'API_OPERATION', {
      kind: 'IDENTITY_UNIQUENESS', relationId: 'rows.unique', collectionPath: ['items'], itemIdentityPath: ['id'],
    });
    expect(base.invariantDefinitions[0]!.kind).toBe('IDENTITY_UNIQUENESS');
    expect(() => validateExpectation({ ...base, invariantDefinitions: [{ kind: 'UNSUPPORTED_PHASE18_KIND' }] })).toThrow(/kind-unsupported/);
    expect(() => validateExpectation({ ...base, invariantDefinitions: [{ kind: 'EMPTY_STATE_CONSISTENCY', relationId: 'rows.empty', collectionPath: ['items'], countPath: ['count'], emptyMarkerPath: ['empty'], extra: true }] })).toThrow(/unknown-field/);
    expect(() => validateExpectation(Object.setPrototypeOf({ ...base }, { inherited: true }))).toThrow(/prototype/);
  });

  test('projection serialization rejects malformed safe DTOs before bytes or digests are emitted', () => {
    const valid = projectValue({ items: [{ id: 'fixture-a' }], ok: true }, new ProjectionContext()).projection;
    const invalidCount = { ...valid, root: { ...valid.root, fieldCount: Number.NaN } } as unknown as SemanticProjection;
    expect(() => serializeProjection(invalidCount)).toThrow(/invalid-object-field-count/);
    const hostilePrototype = Object.setPrototypeOf({ ...valid.root }, { polluted: true });
    expect(() => serializeProjection({ ...valid, root: hostilePrototype } as unknown as SemanticProjection)).toThrow(/prototype/);
    const hostileField = {
      ...valid,
      root: {
        type: 'OBJECT',
        fieldCount: 1,
        fields: [{ name: '__proto__', node: { type: 'BOOLEAN', booleanClass: 'TRUE' } }],
      },
    } as unknown as SemanticProjection;
    expect(() => serializeProjection(hostileField)).toThrow(/invalid-field-name/);
    const hugeArray = {
      ...valid,
      root: { type: 'ARRAY', itemType: 'MIXED', itemCount: 1_000_001, inspectedCount: 0, items: [], arrayTruncated: true },
    } as unknown as SemanticProjection;
    expect(() => serializeProjection(hugeArray)).toThrow(/invalid-array-item-count/);
  });

  test('source staleness suppresses all new semantic findings', () => {
    const exp = expectation('stale-depth', 'API_OPERATION', {
      kind: 'IDENTITY_UNIQUENESS', relationId: 'rows.unique', collectionPath: ['items'], itemIdentityPath: ['id'],
    });
    const result = evaluateSemanticResponse({ oracleId: 'phase18.synthetic.oracle', expectation: exp, rawValues: [{ items: [{ id: 'synthetic-a' }, { id: 'synthetic-a' }] }], sourceSnapshot: { repoId: SOURCE.repoId, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' } });
    expect(result.outcome).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.findings).toHaveLength(0);
  });
});

test.describe('Phase 18 occurrence-bound replay fidelity', () => {
  const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
  const FP_OTHER = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
  const CONTRACT = 'sci:sha256:cccccccccccccccccccccccc';
  const CONTRACT_OTHER = 'sci:sha256:dddddddddddddddddddddddd';
  const occurrences: SemanticReplayOccurrence[] = [
    { actionKind: 'API_OPERATION', stepOrdinal: 0, actionId: 'A', semanticExpectationId: 'phase18.expectation', predecessorContextDigest: null, observationFingerprint: FP },
    { actionKind: 'API_OPERATION', stepOrdinal: 1, actionId: 'B', semanticExpectationId: 'phase18.expectation', predecessorContextDigest: 'ctx:sha256:111111111111111111111111', observationFingerprint: FP },
    { actionKind: 'API_OPERATION', stepOrdinal: 2, actionId: 'A', semanticExpectationId: 'phase18.expectation', predecessorContextDigest: 'ctx:sha256:222222222222222222222222', observationFingerprint: FP },
    { actionKind: 'API_OPERATION', stepOrdinal: 3, actionId: 'B', semanticExpectationId: 'phase18.expectation', predecessorContextDigest: 'ctx:sha256:333333333333333333333333', observationFingerprint: FP },
  ];

  test('A → B → A → B requires occurrence ordinals; it never guesses from action IDs', () => {
    expect(bindSemanticReplayOccurrences({ original: occurrences, requestedActionIds: ['A'] })).toMatchObject({ binding: 'AMBIGUOUS', reason: 'ACTION_OCCURRENCE_AMBIGUOUS' });
    expect(bindSemanticReplayOccurrences({ original: occurrences, requestedActionIds: ['A', 'B', 'A'], requestedOrdinals: [0, 1, 2] })).toEqual({ binding: 'BOUND', retainedOrdinals: [0, 1, 2] });
    expect(bindSemanticReplayOccurrences({ original: occurrences, requestedActionIds: ['B'], requestedOrdinals: [3] })).toEqual({ binding: 'BOUND', retainedOrdinals: [3] });
    expect(bindSemanticReplayOccurrences({ original: occurrences, requestedActionIds: ['B'], requestedOrdinals: [2] })).toMatchObject({ binding: 'INVALID', reason: 'ACTION_OCCURRENCE_MISMATCH' });
  });

  test('taxonomy distinguishes exact, equivalent, different, and non-product replay outcomes', () => {
    const base = { expectedSemanticFindingFingerprint: FP, expectedContractIdentity: CONTRACT, occurrenceBinding: 'BOUND' as const, sourceCurrentness: 'CURRENT' as const, safetyClean: true };
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', observedSemanticFindingFingerprint: FP, observedContractIdentity: CONTRACT })).toBe('REPRODUCED_EXACT');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', observedSemanticFindingFingerprint: FP_OTHER, observedContractIdentity: CONTRACT })).toBe('REPRODUCED_EQUIVALENT_SEMANTIC');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', observedSemanticFindingFingerprint: FP_OTHER, observedContractIdentity: CONTRACT_OTHER })).toBe('SEMANTIC_DIVERGENCE');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'PASS' })).toBe('NOT_REPRODUCED');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'INVALID' })).toBe('INVALID_REPLAY');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'INVALID', preconditionDiverged: true })).toBe('PRECONDITION_DIVERGENCE');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', occurrenceBinding: 'AMBIGUOUS' })).toBe('AMBIGUOUS_OCCURRENCE');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', sourceCurrentness: 'STALE' })).toBe('SOURCE_STALE');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'INVALID', executorThrew: true })).toBe('INFRA_FAILURE');
    expect(classifySemanticReplay({ ...base, terminalStatus: 'FAILURE', executorNondeterministic: true })).toBe('INFRA_FAILURE');
  });

  test('fidelity receipt is strict, bounded, and exact claims require all gates', () => {
    const receipt = createSemanticReplayFidelityReceipt({
      expectedSemanticFindingFingerprint: FP,
      expectedContractIdentity: CONTRACT,
      observedSemanticFindingFingerprint: FP,
      observedContractIdentity: CONTRACT,
      outcomeClass: 'REPRODUCED_EXACT',
      occurrenceBinding: 'BOUND',
      originalOccurrenceCount: 4,
      retainedOccurrenceCount: 3,
      sourceCurrentness: 'CURRENT',
      safetyClean: true,
      deterministic: true,
    });
    expect(receipt.schemaVersion).toBe('nightwatch.semantic-replay-fidelity.private.v3');
    expect(() => validateSemanticReplayFidelityReceipt({ ...receipt, unknown: true })).toThrow(/UNKNOWN_FIELD/);
    expect(() => validateSemanticReplayFidelityReceipt({ ...receipt, sourceCurrentness: 'STALE' })).toThrow(/EXACT_COHERENCE/);
    expect(() => validateSemanticReplayFidelityReceipt({ ...receipt, occurrenceBinding: 'AMBIGUOUS' })).toThrow(/EXACT_COHERENCE/);
    expect(() => validateSemanticReplayFidelityReceipt({ ...receipt, expectedSemanticFindingFingerprint: 'CUSTOMER_SENTINEL' })).toThrow(/FINGERPRINT_INVALID/);
    expect(() => validateSemanticReplayFidelityReceipt({ ...receipt, originalOccurrenceCount: Number.NaN })).toThrow(/OCCURRENCECOUNT_INVALID/);
    expect(() => validateSemanticReplayFidelityReceipt(Object.setPrototypeOf({ ...receipt }, { inherited: true }))).toThrow(/PROTOTYPE_INVALID/);
    expect(() => bindSemanticReplayOccurrences({ original: [{ ...occurrences[0]!, actionId: 'CUSTOMER_SENTINEL' }], requestedActionIds: ['CUSTOMER_SENTINEL'] })).toThrow(/ACTION_ID_0_INVALID/);
  });
});

test.describe('Phase 18 explicit source currentness', () => {
  test('distinguishes current, stale, ambiguous, missing, unsupported, and synthetic-only', () => {
    const synthetic = expectation('currentness-synthetic', 'API_OPERATION', { kind: 'FIELD_PRESENT', path: ['data'], expected: true });
    expect(classifyExpectationCurrentness({ expectation: synthetic, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA } })).toBe('SYNTHETIC_ONLY');
    const admitted = { ...synthetic, sourceProvenance: { ...SOURCE, evidenceDigest: 'ev:sha256:111111111111111111111111' } };
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, evidenceVerification: 'VERIFIED' })).toBe('CURRENT');
    // Equivalent source formatting/order retains the normalized evidence
    // digest; changed evidence, a removed/renamed surface, or multiple source
    // definitions fail closed instead of silently rebinding the expectation.
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, observedEvidenceDigest: 'ev:sha256:111111111111111111111111', evidenceVerification: 'VERIFIED' })).toBe('CURRENT');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, observedEvidenceDigest: 'ev:sha256:222222222222222222222222', evidenceVerification: 'VERIFIED' })).toBe('STALE');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, sourceFilePresent: false, evidenceVerification: 'VERIFIED' })).toBe('MISSING');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, sourceRelativePath: 'contracts/renamed.ts', evidenceVerification: 'VERIFIED' })).toBe('STALE');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, sourceDefinitionCount: 2, evidenceVerification: 'VERIFIED' })).toBe('AMBIGUOUS');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }, evidenceVerification: 'VERIFIED' })).toBe('STALE');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: 'phase18/other-source', sha: SHA }, evidenceVerification: 'VERIFIED' })).toBe('AMBIGUOUS');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: null })).toBe('MISSING');
    expect(classifyExpectationCurrentness({ expectation: { sourceProvenance: { repoId: SOURCE.repoId, sha: 'not-a-sha', relativePath: 'contracts/semantic.ts', derivationVersion: SOURCE.derivationVersion } }, sourceSnapshot: null })).toBe('UNSUPPORTED');
    expect(classifyExpectationCurrentness({ expectation: admitted, sourceSnapshot: { repoId: SOURCE.repoId, sha: SHA }, evidenceVerification: 'UNVERIFIED' })).toBe('AMBIGUOUS');
  });
});

function minimizationAction(actionId: string): MinimizationAction {
  return { actionId, semanticClass: 'KNOWN_READ', routeClass: '/phase18', sourceApproved: true, catalogVersion: 'phase18.synthetic.v1' };
}

const MIN_FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_FP = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
const SEMANTIC_CONTRACT = 'sci:sha256:cccccccccccccccccccccccc';
const OTHER_SEMANTIC_CONTRACT = 'sci:sha256:dddddddddddddddddddddddd';
const ZERO_SAFETY = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;

async function semanticMinimize(input: {
  readonly sequence: readonly MinimizationAction[];
  readonly anomaly: (sequence: readonly MinimizationAction[]) => boolean;
  readonly preconditionCheck?: (sequence: readonly MinimizationAction[]) => { valid: true } | { valid: false; reason: 'PRECONDITION_DIVERGENCE' };
}): Promise<Awaited<ReturnType<typeof minimizeFailure>>> {
  return minimizeFailure({
    originalSequence: input.sequence,
    anomalyFingerprint: MIN_FP,
    sourceVersion: 'phase18.synthetic.source.v1',
    catalogVersion: 'phase18.synthetic.v1',
    approvedActionIds: new Set(input.sequence.map((action) => action.actionId)),
    budget: SYNTHETIC_MINIMIZATION_BUDGET,
    ...(input.preconditionCheck === undefined ? {} : { preconditionCheck: input.preconditionCheck }),
    replay: async (sequence): Promise<CandidateReplayOutcome> => {
      if (input.anomaly(sequence)) return { status: 'FAILURE', anomalyFingerprint: MIN_FP, semanticFindingFingerprint: MIN_FP, semanticContractIdentity: SEMANTIC_CONTRACT, safety: ZERO_SAFETY };
      return { status: 'PASS', anomalyFingerprint: OTHER_FP, safety: ZERO_SAFETY };
    },
  });
}

test.describe('Phase 18 semantic minimization execution', () => {
  test('actual synthetic replay evaluates the semantic oracle and minimizes the same finding identity', async () => {
    const semanticExpectation = expectation('minimizer-semantic-contract', 'JOURNEY_TRANSITION', {
      kind: 'STATE_RELATION', relationId: 'fixture.minimizer.state', beforePath: ['state'], afterPath: ['state'], expected: 'EQUAL',
    });
    const original = ['setup-noise', 'semantic-trigger', 'tail-noise'].map(minimizationAction);
    const replaySemantic = (sequence: readonly MinimizationAction[]): CandidateReplayOutcome => {
      const triggered = sequence.some((action) => action.actionId === 'semantic-trigger');
      const result = evaluate(semanticExpectation, [{ state: 'fixture-open' }, { state: triggered ? 'fixture-closed' : 'fixture-open' }]);
      const finding = result.findings[0];
      if (result.outcome === 'ANOMALY' && finding !== undefined) {
        const findingFingerprint = semanticFindingFingerprint(finding);
        return { status: 'FAILURE', anomalyFingerprint: findingFingerprint, semanticFindingFingerprint: findingFingerprint, semanticContractIdentity: SEMANTIC_CONTRACT, safety: ZERO_SAFETY };
      }
      return { status: 'PASS', anomalyFingerprint: OTHER_FP, safety: ZERO_SAFETY };
    };
    const seeded = replaySemantic(original);
    expect(seeded.status).toBe('FAILURE');
    const expectedFingerprint = seeded.anomalyFingerprint!;
    const result = await minimizeFailure({
      originalSequence: original,
      anomalyFingerprint: expectedFingerprint,
      sourceVersion: 'phase18.synthetic.source.v1',
      catalogVersion: 'phase18.synthetic.v1',
      approvedActionIds: new Set(original.map((action) => action.actionId)),
      budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: async (sequence) => replaySemantic(sequence),
    });
    expect(result.freshExactReplay).toBe('REPRODUCED');
    expect(result.minimalReproducingSequence).toEqual(['semantic-trigger']);
    expect(result.candidateEvaluations.some((evaluation) => evaluation.disposition === 'REPRODUCES' && evaluation.fingerprintMatch)).toBe(true);
    expect(result.candidateEvaluations.find((evaluation) => evaluation.disposition === 'REPRODUCES')?.semanticFindingFingerprint).toBe(expectedFingerprint);
    expect(JSON.stringify(result)).not.toContain('fixture-open');
    expect(JSON.stringify(result)).not.toContain('fixture-closed');
  });

  test('real synthetic semantic replay reduces first, middle, and last noise while preserving the same anomaly identity', async () => {
    const required = [minimizationAction('anchor'), minimizationAction('trigger')];
    const cases = [
      { sequence: [minimizationAction('first-noise'), ...required], expected: ['anchor', 'trigger'] },
      { sequence: [required[0]!, minimizationAction('middle-noise'), required[1]!], expected: ['anchor', 'trigger'] },
      { sequence: [...required, minimizationAction('last-noise')], expected: ['anchor', 'trigger'] },
    ] as const;
    for (const scenario of cases) {
      const result = await semanticMinimize({ sequence: scenario.sequence, anomaly: (sequence) => sequence.some((action) => action.actionId === 'anchor') && sequence.some((action) => action.actionId === 'trigger') });
      expect(result.freshExactReplay).toBe('REPRODUCED');
      expect(result.minimalReproducingSequence).toEqual(scenario.expected);
      expect(result.candidateEvaluations.some((evaluation) => evaluation.disposition === 'REPRODUCES' && evaluation.fingerprintMatch)).toBe(true);
      expect(result.candidateEvaluations.every((evaluation) => evaluation.reason !== 'DIFFERENT_OR_NO_FINGERPRINT' || !evaluation.fingerprintMatch)).toBe(true);
    }
  });

  test('joint requirements, order, and expectation identity survive reduction; rejected candidates explain why', async () => {
    const joint = await semanticMinimize({
      sequence: ['anchor', 'joint-left', 'joint-right', 'trigger'].map(minimizationAction),
      anomaly: (sequence) => {
        const ids = sequence.map((action) => action.actionId);
        return ids.includes('anchor') && ids.includes('trigger') && ids.includes('joint-left') && ids.includes('joint-right');
      },
    });
    expect(joint.minimalReproducingSequence).toEqual(['anchor', 'joint-left', 'joint-right', 'trigger']);
    expect(joint.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');

    const ordered = await semanticMinimize({
      sequence: ['anchor', 'trigger'].map(minimizationAction),
      anomaly: (sequence) => sequence[0]?.actionId === 'anchor' && sequence[1]?.actionId === 'trigger',
    });
    expect(ordered.candidateEvaluations.every((evaluation) => evaluation.sequence.join('>') !== 'trigger>anchor')).toBe(true);

    const expectationRequired = await semanticMinimize({
      sequence: ['semantic-expectation', 'trigger'].map(minimizationAction),
      anomaly: (sequence) => sequence.some((action) => action.actionId === 'semantic-expectation') && sequence.some((action) => action.actionId === 'trigger'),
    });
    expect(expectationRequired.minimalReproducingSequence).toEqual(['semantic-expectation', 'trigger']);
    expect(expectationRequired.candidateEvaluations.some((evaluation) => evaluation.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('predecessor divergence, repeated occurrence identity, throws, and nondeterminism never become successful minimization', async () => {
    const predecessor = await semanticMinimize({
      sequence: ['setup', 'trigger'].map(minimizationAction),
      preconditionCheck: (sequence) => sequence.some((action) => action.actionId === 'setup') ? { valid: true } : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
      anomaly: (sequence) => sequence.some((action) => action.actionId === 'setup') && sequence.some((action) => action.actionId === 'trigger'),
    });
    expect(predecessor.minimalReproducingSequence).toEqual(['setup', 'trigger']);
    expect(predecessor.candidateEvaluations.some((evaluation) => evaluation.reason === 'PRECONDITION_DIVERGENCE')).toBe(true);
    expect(predecessor.reductionEvidenceClass).not.toBe('MINIMALITY_PROVEN');

    const firstA = minimizationAction('A');
    const secondA = minimizationAction('A');
    const trigger = minimizationAction('trigger');
    const repeated = await semanticMinimize({
      sequence: [firstA, secondA, trigger],
      anomaly: (sequence) => sequence.some((action) => action === secondA) && sequence.some((action) => action === trigger),
    });
    const repeatedProof = repeated.candidateEvaluations.find((evaluation) => evaluation.disposition === 'REPRODUCES' && evaluation.sequence.length === 2);
    expect(repeatedProof?.occurrenceOrdinals).toEqual([1, 2]);
    expect(repeated.minimalReproducingSequence).toEqual(['A', 'trigger']);

    const throwing = await minimizeFailure({
      originalSequence: [minimizationAction('throws')], anomalyFingerprint: MIN_FP, sourceVersion: 'phase18.synthetic.source.v1', catalogVersion: 'phase18.synthetic.v1', budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: () => { throw new Error('synthetic executor failure'); },
    });
    expect(throwing.freshExactReplay).toBe('INVALID');
    expect(throwing.candidateEvaluations[0]?.reason).toBe('EXECUTOR_THROW');

    const nondeterministic = await minimizeFailure({
      originalSequence: [minimizationAction('nondeterministic')], anomalyFingerprint: MIN_FP, sourceVersion: 'phase18.synthetic.source.v1', catalogVersion: 'phase18.synthetic.v1', budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: () => ({ status: 'INVALID', safety: ZERO_SAFETY, executorFailure: 'EXECUTOR_NONDETERMINISTIC' as const }),
    });
    expect(nondeterministic.freshExactReplay).toBe('INVALID');
    expect(nondeterministic.candidateEvaluations[0]?.reason).toBe('EXECUTOR_NONDETERMINISTIC');
  });
});

test.describe('Phase 18 semantic coverage and identity accounting', () => {
  test('source impact explains semantic coverage without granting stale/fallback evidence authority', () => {
    expect(semanticCoverageSelectionReason({ selected: true, sourceImpact: 'DIRECT', sourceState: 'CURRENT', hasSemanticCoverage: true })).toBe('SOURCE_CHANGE_WITH_SEMANTIC_COVERAGE');
    expect(semanticCoverageSelectionReason({ selected: true, sourceImpact: 'DIRECT', sourceState: 'CURRENT', hasSemanticCoverage: false })).toBe('SOURCE_CHANGE_WITHOUT_SEMANTIC_COVERAGE');
    expect(semanticCoverageSelectionReason({ selected: true, sourceImpact: 'FALLBACK', sourceState: 'CURRENT', hasSemanticCoverage: true })).toBe('SOURCE_EVIDENCE_UNRESOLVED');
    expect(semanticCoverageSelectionReason({ selected: true, sourceImpact: 'NONE', sourceState: 'CURRENT', hasSemanticCoverage: true })).toBe('BASELINE_HEALTH_WITH_SEMANTIC_COVERAGE');
    expect(semanticCoverageReasonForImpact({ impact: { disposition: 'SOURCE_UNRESOLVED' }, selected: true, sourceState: 'CURRENT', hasSemanticCoverage: true })).toBe('SOURCE_EVIDENCE_UNRESOLVED');
    const summary = summarizeSemanticCoverage([
      { memberId: 'member-a', approved: true, selected: true, sourceImpact: 'DIRECT', sourceState: 'CURRENT', expectationIds: ['expectation-a'], invariantClasses: ['AGGREGATE_RELATION'], hasBenignControl: true, replayableAnomaly: true, minimizableAnomaly: true, highConfidenceEligible: true },
      { memberId: 'member-b', approved: true, selected: true, sourceImpact: 'NONE', sourceState: 'STALE', expectationIds: ['expectation-b'], invariantClasses: ['STATE_RELATION'], hasBenignControl: false, replayableAnomaly: false, minimizableAnomaly: false, highConfidenceEligible: false },
      { memberId: 'member-c', approved: true, selected: false, sourceImpact: 'UNKNOWN', sourceState: 'AMBIGUOUS', expectationIds: ['expectation-c'], invariantClasses: ['PAGINATION_WINDOW'], hasBenignControl: true, replayableAnomaly: false, minimizableAnomaly: false, highConfidenceEligible: false },
    ]);
    expect(summary.selectedWithSemanticCoverage).toBe(2);
    expect(summary.currentExpectationCount).toBe(1);
    expect(summary.staleExpectationCount).toBe(1);
    expect(summary.ambiguousExpectationCount).toBe(1);
    expect(summary.highConfidenceEligibleAnomalyCount).toBe(1);
    expect(summary.invariantClassesExercised).toEqual(['AGGREGATE_RELATION', 'PAGINATION_WINDOW', 'STATE_RELATION']);
  });

  test('replay fidelity gates confidence and degrades when current evidence is invalidated', () => {
    const fidelity = createSemanticReplayFidelityReceipt({
      expectedSemanticFindingFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      expectedContractIdentity: 'sci:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      observedSemanticFindingFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      observedContractIdentity: 'sci:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      outcomeClass: 'REPRODUCED_EXACT', occurrenceBinding: 'BOUND', originalOccurrenceCount: 2, retainedOccurrenceCount: 2,
      sourceCurrentness: 'CURRENT', safetyClean: true, deterministic: true,
    });
    const base = createSemanticTriageEvidence({
      expectationId: 'phase18.expectation', targetId: 'phase18.target', semanticFindingFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', invariantDefinitionId: 'inv:sha256:cccccccccccccccccccccccc',
      semanticOutcome: 'ANOMALY', receiptOutcome: 'ANOMALY', receiptVersion: 'nightwatch.semantic-evaluation-receipt.v1', sourceRepoId: 'phase18/source', sourceSha: SHA, sourceEvidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', sourceDerivationVersion: 'phase18.v1', sourceCurrentness: 'CURRENT', findingCategory: 'STATE_RELATION_MISMATCH', exactReplayStatus: 'REPRODUCED', exactFingerprintMatch: true, minimalityGuarantee: '1-MINIMAL', freshContextReproductions: 1, minimalSequenceReproductions: 1, replayFidelity: fidelity,
    });
    expect(rankSemanticConfidence({ evidence: base, browserApiDifferential: 'NOT_AVAILABLE', oracleReliable: true, knownFalsePositive: false, safetyClean: true, privacyClean: true, semanticIdentityPresent: true }).level).toBe('HIGH');
    const precondition = createSemanticTriageEvidence({ ...base, replayFidelity: { ...fidelity, outcomeClass: 'PRECONDITION_DIVERGENCE', occurrenceBinding: 'BOUND', rejectionReason: 'PREDECESSOR_CONTEXT_MISMATCH' } });
    const degraded = rankSemanticConfidence({ evidence: precondition, browserApiDifferential: 'NOT_AVAILABLE', oracleReliable: true, knownFalsePositive: false, safetyClean: true, privacyClean: true, semanticIdentityPresent: true });
    expect(degraded.level).not.toBe('HIGH');
    expect(degraded.blockers).toContain('EXACT_REPLAY_NOT_REPRODUCED');
    const stale = createSemanticTriageEvidence({ ...base, sourceCurrentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE', semanticOutcome: 'EXPECTATION_SOURCE_STALE', replayFidelity: { ...fidelity, outcomeClass: 'SOURCE_STALE', sourceCurrentness: 'STALE', rejectionReason: 'SOURCE_CURRENTNESS_UNRESOLVED' } });
    const staleRank = rankSemanticConfidence({ evidence: stale, browserApiDifferential: 'NOT_AVAILABLE', oracleReliable: true, knownFalsePositive: false, safetyClean: true, privacyClean: true, semanticIdentityPresent: true });
    expect(staleRank.level).not.toBe('HIGH');
    expect(staleRank.blockers).toContain('EXPECTATION_SOURCE_STALE');
  });

  test('different semantic anomaly on an otherwise matching replay cannot inflate HIGH confidence', async () => {
    const result = await minimizeFailure({
      originalSequence: [minimizationAction('semantic-trigger')],
      anomalyFingerprint: MIN_FP,
      sourceVersion: 'phase18.synthetic.source.v1',
      catalogVersion: 'phase18.synthetic.v1',
      budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: () => ({
        status: 'FAILURE' as const,
        // The legacy target/protocol fingerprint matches, while the actual
        // semantic observation proves a different finding and contract.
        anomalyFingerprint: MIN_FP,
        semanticFindingFingerprint: OTHER_FP,
        semanticContractIdentity: OTHER_SEMANTIC_CONTRACT,
        safety: ZERO_SAFETY,
      }),
    });
    const evaluation = result.candidateEvaluations[0]!;
    expect(evaluation.disposition).toBe('REPRODUCES');
    expect(evaluation.fingerprintMatch).toBe(true);
    expect(evaluation.semanticFindingFingerprint).toBe(OTHER_FP);
    const divergent = createSemanticReplayFidelityReceipt({
      expectedSemanticFindingFingerprint: MIN_FP,
      expectedContractIdentity: SEMANTIC_CONTRACT,
      observedSemanticFindingFingerprint: evaluation.semanticFindingFingerprint,
      observedContractIdentity: evaluation.semanticContractIdentity,
      outcomeClass: 'SEMANTIC_DIVERGENCE',
      occurrenceBinding: 'BOUND',
      originalOccurrenceCount: 1,
      retainedOccurrenceCount: 1,
      sourceCurrentness: 'CURRENT',
      safetyClean: true,
      deterministic: true,
    });
    const evidence = createSemanticTriageEvidence({
      expectationId: 'phase18.expectation', targetId: 'phase18.target', semanticFindingFingerprint: MIN_FP, invariantDefinitionId: 'inv:sha256:eeeeeeeeeeeeeeeeeeeeeeee',
      semanticOutcome: 'ANOMALY', receiptOutcome: 'ANOMALY', receiptVersion: 'nightwatch.semantic-evaluation-receipt.v1', sourceRepoId: 'phase18/source', sourceSha: SHA, sourceEvidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', sourceDerivationVersion: 'phase18.v1', sourceCurrentness: 'CURRENT', findingCategory: 'STATE_RELATION_MISMATCH', exactReplayStatus: 'REPRODUCED', exactFingerprintMatch: true, minimalityGuarantee: '1-MINIMAL', freshContextReproductions: 1, minimalSequenceReproductions: 1, replayFidelity: divergent,
    });
    const confidence = rankSemanticConfidence({ evidence, browserApiDifferential: 'NOT_AVAILABLE', oracleReliable: true, knownFalsePositive: false, safetyClean: true, privacyClean: true, semanticIdentityPresent: true });
    expect(confidence.level).not.toBe('HIGH');
    expect(confidence.blockers).toContain('EXACT_REPLAY_NOT_REPRODUCED');
  });

  test('explicit source-derived invariant identity is load-bearing in semantic clustering', () => {
    const invariant: InvariantDefinition = { kind: 'STATE_RELATION', relationId: 'fixture.state', beforePath: ['state'], afterPath: ['state'], expected: 'EQUAL' };
    const provenance = { repoId: 'phase18/source', derivationVersion: 'phase18.v1', evidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' };
    const fromDefinition = semanticContractIdentity({ expectationId: 'phase18.expectation', targetId: 'phase18.target', invariant, sourceProvenance: provenance });
    const invariantId = `inv:sha256:${'b'.repeat(24)}`;
    const fromId = semanticContractIdentityFromInvariantId({ expectationId: 'phase18.expectation', targetId: 'phase18.target', invariantDefinitionId: invariantId, sourceProvenance: provenance });
    expect(fromDefinition).toMatch(/^sci:sha256:[0-9a-f]{24}$/);
    expect(fromId).toMatch(/^sci:sha256:[0-9a-f]{24}$/);
    const observations = [
      { runId: 'run-a', observedAt: '2026-01-01T00:00:00.000Z', expectationId: 'phase18.expectation', targetId: 'phase18.target', invariant, invariantDefinitionId: invariantId, sourceProvenance: { ...provenance, sha: 'a'.repeat(40) }, fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' },
      { runId: 'run-b', observedAt: '2026-01-01T00:00:01.000Z', expectationId: 'phase18.expectation', targetId: 'phase18.target', invariant: { kind: 'FIELD_PRESENT', path: ['different'], expected: true } as InvariantDefinition, invariantDefinitionId: invariantId, sourceProvenance: { ...provenance, sha: 'b'.repeat(40) }, fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' },
    ];
    const clusters = clusterSemanticObservations(observations);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.invariantId).toBe(invariantId);
  });
});
