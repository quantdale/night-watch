import { expect, test } from '@playwright/test';
import {
  buildPhase24CandidateInvalidationLedger,
  buildPhase24CandidatePortfolio,
  buildPhase24NoContactRehearsal,
  analyzePhase24SourceSnapshot,
  classifyPhase24Ci,
  classifyPhase24Replay,
  createPhase24CrossCandidateExpectation,
  createPhase24Dossier,
  createPhase24Manifest,
  createPhase24ReplayPlan,
  createPhase24SemanticExpectation,
  diagnosePhase24Readiness,
  evaluatePhase24CrossCandidateRelation,
  evaluatePhase24SemanticExpectation,
  minimizePhase24Failure,
  prioritizePhase24Portfolio,
  routePhase24OwnerProvenance,
  validatePhase24CandidateInvalidationLedger,
  validatePhase24CandidatePortfolio,
  validatePhase24Dossier,
  validatePhase24Manifest,
  validatePhase24Minimization,
  validatePhase24NoContactRehearsal,
  validatePhase24PortfolioSelection,
  validatePhase24SourceSnapshotAnalysis,
  type Phase24CandidateInput,
  type Phase24CiObservation,
  type Phase24ManifestInput,
  type Phase24SemanticObservation,
} from '../../src/core/phase24';

const HEAD = 'a'.repeat(40);
const SOURCE_A = { repoId: 'approved/ripple-api', sha: 'b'.repeat(40), evidenceDigest: 'ev:sha256:' + 'c'.repeat(24) } as const;
const SOURCE_B = { repoId: 'approved/ripple-api', sha: 'd'.repeat(40), evidenceDigest: 'ev:sha256:' + 'e'.repeat(24) } as const;

function candidate(id: string, overrides: Partial<Phase24CandidateInput> = {}): Phase24CandidateInput {
  return {
    surfaceKey: `ripple.${id}.read`,
    targetId: `ripple.${id}.read`,
    product: 'ripple',
    source: SOURCE_A,
    sourceAvailable: true,
    relevantFiles: [`src/${id.replaceAll('.', '/')}.php`],
    route: { endpointId: `endpoint.${id}`, method: 'GET', routeTemplate: `/api/${id.replaceAll('.', '/')}`, transport: 'HTTP_API' },
    routeIdentityProven: true,
    contract: { contractId: `contract.${id}`, requestDigest: 'request:sha256:' + '1'.repeat(24), responseDigest: 'response:sha256:' + '2'.repeat(24), version: 'v1' },
    contractIdentityProven: true,
    behaviorOwner: { repository: 'approved/ripple-api', packageName: 'billing', component: id, confidence: 'HIGH' },
    behaviorOwnerProven: true,
    sourceVersion: 'CURRENT',
    semanticExpectationId: `expectation.${id}`,
    semanticContractProven: true,
    semanticPreconditions: ['SOURCE_CURRENT', 'READ_ONLY'],
    semanticPreconditionsBound: true,
    materialClass: 'COLLECTION',
    authRequirement: 'OWNER_EXTERNAL_PATH',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification: 'NONE',
    readOnlySuitable: true,
    projectionSafe: true,
    replay: { strategy: 'FIRST_REPLAY', planIdentity: 'replay-plan:sha256:' + '3'.repeat(24), maxContexts: 2, prerequisites: ['SOURCE_CURRENT'] },
    expectedEvidenceValue: 'HIGH',
    selectionPriority: 10,
    anticipatedInvariantCount: 3,
    ...overrides,
  };
}

function gateBinding() {
  return {
    receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1' as const,
    receiptDigest: 'receipt:sha256:' + '4'.repeat(24),
    gateDefinitionDigest: 'sha256:' + '5'.repeat(64),
    gitHead: HEAD,
    finalResult: 'PASS' as const,
  };
}

function manifestInput(portfolio: ReturnType<typeof buildPhase24CandidatePortfolio>, selectedCandidateIds = portfolio.eligibleCandidateIds): Phase24ManifestInput {
  return {
    nightwatchSha: HEAD,
    environment: 'DEV',
    portfolio,
    selectedCandidateIds,
    semanticExpectationDigest: 'semantic-plan:sha256:' + '6'.repeat(24),
    replayPlanDigest: 'replay-batch:sha256:' + '7'.repeat(24),
    containment: {
      version: 'containment.v2',
      loopbackProxyRequired: true,
      externalContactAllowed: false,
      mutationAllowed: false,
      rawPersistenceAllowed: false,
      localDestinationClass: 'OWNER_LOCAL_ONLY',
    },
    policy: {
      version: 'owner-policy.v1',
      digest: 'policy:sha256:' + '8'.repeat(24),
      operationClass: 'READ_ONLY',
      ownerScopeStatus: 'FROZEN_BY_OWNER',
    },
    qualityGate: gateBinding(),
    operatorAuthorization: 'EXTERNAL_CI_REQUIRED',
  };
}

function portfolio() {
  return buildPhase24CandidatePortfolio({ candidates: [candidate('common-exchange'), candidate('payer-exchange'), candidate('account-inventory')] });
}

test.describe('Phase 24 source-qualified portfolio and invalidation', () => {
  test('derives a bounded portfolio from one exact source snapshot without rebinding drift', () => {
    const analysis = analyzePhase24SourceSnapshot({
      snapshot: SOURCE_A,
      surfaces: [
        candidate('snapshot-list'),
        candidate('snapshot-drift', { source: SOURCE_B }),
        candidate('snapshot-mutation', { mutationClassification: 'MUTATION' }),
      ],
    });
    validatePhase24SourceSnapshotAnalysis(analysis);
    expect(analysis.discoveredSurfaceKeys).toHaveLength(3);
    expect(analysis.eligibleSurfaceKeys).toHaveLength(1);
    expect(analysis.excludedSurfaceKeys).toHaveLength(2);
    const drift = analysis.portfolio.candidates.find((item) => item.surfaceKey.endsWith('snapshot-drift.read'));
    expect(drift?.source).toEqual(SOURCE_B);
    expect(drift?.reasonCodes).toContain('SOURCE_SNAPSHOT_MISMATCH');
    expect(drift?.exclusionReasons[0]).toMatchObject({ permanent: false, futureSourceCanMakeEligible: true });
    expect(analyzePhase24SourceSnapshot({ snapshot: SOURCE_A, surfaces: [candidate('snapshot-list'), candidate('snapshot-drift', { source: SOURCE_B }), candidate('snapshot-mutation', { mutationClassification: 'MUTATION' })] }).deterministicDigest).toBe(analysis.deterministicDigest);
    expect(analyzePhase24SourceSnapshot({ snapshot: SOURCE_B, surfaces: [candidate('snapshot-list'), candidate('snapshot-drift', { source: SOURCE_B }), candidate('snapshot-mutation', { mutationClassification: 'MUTATION' })] }).deterministicDigest).not.toBe(analysis.deterministicDigest);
  });

  test('classifies a diverse source-derived portfolio with complete positive and exclusion reason codes', () => {
    const result = buildPhase24CandidatePortfolio({ candidates: [
      candidate('eligible'),
      candidate('mutation', { mutationClassification: 'MUTATION' }),
      candidate('unbound-route', { route: null, routeIdentityProven: false }),
      candidate('auth', { authRequirement: 'INLINE_SECRET' }),
      candidate('unsupported', { replay: { strategy: 'UNSUPPORTED', planIdentity: 'replay-plan:sha256:' + '9'.repeat(24), maxContexts: 2, prerequisites: [] } }),
    ] });
    validatePhase24CandidatePortfolio(result);
    expect(result.eligibleCount).toBe(1);
    expect(result.excludedCount).toBe(4);
    const eligible = result.candidates.find((item) => item.targetId.includes('.eligible.'));
    expect(eligible?.reasonCodes).toContain('ELIGIBLE_ROUTE_IDENTITY_BOUND');
    const mutation = result.candidates.find((item) => item.targetId.includes('.mutation.'));
    expect(mutation?.exclusionReasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MUTATION_REQUIRED', permanent: true, futureSourceCanMakeEligible: false }),
    ]));
    const auth = result.candidates.find((item) => item.targetId.includes('.auth.'));
    expect(auth?.reasonCodes).toContain('INLINE_SECRET_AUTH_FORBIDDEN');
    expect(result.reasonCodeCoverage).toContain('REPLAY_UNSUPPORTED');
  });

  test('canonicalizes candidate order and keeps stable surface identity across source SHA changes', () => {
    const first = buildPhase24CandidatePortfolio({ candidates: [candidate('a'), candidate('b')] });
    const second = buildPhase24CandidatePortfolio({ candidates: [candidate('b'), candidate('a')] });
    expect(second.deterministicDigest).toBe(first.deterministicDigest);
    const moved = buildPhase24CandidatePortfolio({ candidates: [candidate('a', { source: SOURCE_B }) , candidate('b')] });
    expect(moved.deterministicDigest).not.toBe(first.deterministicDigest);
    expect(moved.candidates.find((item) => item.targetId.endsWith('.a'))?.candidateId).toBe(first.candidates.find((item) => item.targetId.endsWith('.a'))?.candidateId);
  });

  test('joins source changes into deterministic stale, newly-safe, replay, and dossier invalidation states', () => {
    const prior = buildPhase24CandidatePortfolio({ candidates: [candidate('stable'), candidate('promoted', { mutationClassification: 'MUTATION' }), candidate('replay', { replay: { strategy: 'FIRST_REPLAY', planIdentity: 'replay-plan:sha256:' + 'a'.repeat(24), maxContexts: 2, prerequisites: [] } })] });
    const current = buildPhase24CandidatePortfolio({ candidates: [
      candidate('stable', { source: SOURCE_B }),
      candidate('promoted'),
      candidate('replay', { replay: { strategy: 'FIRST_REPLAY', planIdentity: 'replay-plan:sha256:' + 'b'.repeat(24), maxContexts: 2, prerequisites: [] }, behaviorOwner: { repository: 'approved/ripple-api', packageName: 'billing', component: 'new-owner', confidence: 'HIGH' } }),
    ] });
    const ledger = buildPhase24CandidateInvalidationLedger({ prior, current });
    validatePhase24CandidateInvalidationLedger(ledger);
    expect(ledger.newlyEligibleCandidateIds).toHaveLength(1);
    expect(ledger.staleCandidateIds).toHaveLength(1);
    // Phase 25 makes source evidence changes invalidate every dependent
    // replay/dossier assumption, even when the semantic contract shape is
    // unchanged. The replay-plan and owner changes add their own invalidation
    // cases to that source-evidence case.
    expect(ledger.replayInvalidatedCandidateIds).toHaveLength(2);
    expect(ledger.dossierInvalidatedCandidateIds).toHaveLength(2);
    expect(ledger.records.find((record) => record.surfaceKey.endsWith('.stable.read'))?.state).toBe('SOURCE_CHANGED');
    expect(ledger.records.find((record) => record.surfaceKey.endsWith('.promoted.read'))?.state).toBe('NEWLY_ELIGIBLE');
    expect(ledger.records.find((record) => record.surfaceKey.endsWith('.replay.read'))?.state).toBe('REPLAY_PLAN_INVALIDATED');
  });

  test('prioritizes eligible surfaces by explainable score while preserving material diversity', () => {
    const candidates = buildPhase24CandidatePortfolio({ candidates: [
      candidate('collection', { materialClass: 'COLLECTION', selectionPriority: 50 }),
      candidate('membership', { materialClass: 'MEMBERSHIP', selectionPriority: 50 }),
      candidate('protocol', { materialClass: 'PROTOCOL', selectionPriority: 1 }),
      candidate('excluded', { materialClass: 'RELATIONAL', mutationClassification: 'MUTATION' }),
    ] });
    const selection = prioritizePhase24Portfolio({ portfolio: candidates, maxCandidates: 2 });
    validatePhase24PortfolioSelection(selection, candidates);
    expect(selection.selectedCandidateIds).toHaveLength(2);
    expect(selection.rows.filter((row) => row.selected).map((row) => row.reasonCode)).toEqual(expect.arrayContaining(['MATERIAL_DIVERSITY']));
    expect(selection.rows.find((row) => row.candidateId === candidates.candidates.find((item) => item.targetId.includes('.excluded.'))?.candidateId)?.reasonCode).toBe('SOURCE_QUALIFICATION_EXCLUDED');
  });
});

test.describe('Phase 24 manifest and no-contact rehearsal', () => {
  test('binds all semantic inputs and canonicalizes selected candidate order', () => {
    const candidates = portfolio();
    const reversed = [...candidates.eligibleCandidateIds].reverse();
    const first = createPhase24Manifest(manifestInput(candidates, reversed));
    const second = createPhase24Manifest(manifestInput(candidates, candidates.eligibleCandidateIds));
    validatePhase24Manifest(first);
    expect(first.manifestId).toBe(second.manifestId);
    expect(first.selectedCandidates.map((item) => item.candidateId)).toEqual([...candidates.eligibleCandidateIds].sort());
    const changedPolicy = createPhase24Manifest({ ...manifestInput(candidates), policy: { ...manifestInput(candidates).policy, digest: 'policy:sha256:' + 'f'.repeat(24) } });
    expect(changedPolicy.manifestId).not.toBe(first.manifestId);
    const changedExpectation = createPhase24Manifest({ ...manifestInput(candidates), semanticExpectationDigest: 'semantic-plan:sha256:' + '0'.repeat(24) });
    expect(changedExpectation.manifestId).not.toBe(first.manifestId);
    const sourceChangedPortfolio = buildPhase24CandidatePortfolio({ candidates: [candidate('common-exchange', { source: SOURCE_B }), candidate('payer-exchange'), candidate('account-inventory')] });
    const sourceChanged = createPhase24Manifest(manifestInput(sourceChangedPortfolio));
    expect(sourceChanged.manifestId).not.toBe(first.manifestId);
    const changedGate = createPhase24Manifest({ ...manifestInput(candidates), qualityGate: { ...gateBinding(), gateDefinitionDigest: 'sha256:' + '9'.repeat(64) } });
    expect(changedGate.manifestId).not.toBe(first.manifestId);
    const changedReplayPortfolio = buildPhase24CandidatePortfolio({ candidates: [candidate('common-exchange', { replay: { strategy: 'FIRST_REPLAY', planIdentity: 'replay-plan:sha256:' + '9'.repeat(24), maxContexts: 2, prerequisites: ['SOURCE_CURRENT'] } }), candidate('payer-exchange'), candidate('account-inventory')] });
    expect(createPhase24Manifest(manifestInput(changedReplayPortfolio)).manifestId).not.toBe(first.manifestId);
    expect(() => createPhase24Manifest({ ...manifestInput(candidates), selectedCandidateIds: ['candidate:sha256:' + '0'.repeat(24)] })).toThrow(/SELECTED_CANDIDATE_MISSING/);
    expect(() => createPhase24Manifest({ ...manifestInput(candidates), environment: 'PRODUCTION' as never })).toThrow(/MANIFEST_HEAD_OR_ENVIRONMENT/);
  });

  test('rehearses manifest to candidate, action, oracle, replay, dossier, and teardown with zero contact', () => {
    const candidates = portfolio();
    const manifest = createPhase24Manifest(manifestInput(candidates));
    const receipt = buildPhase24NoContactRehearsal({ manifest, portfolio: candidates });
    validatePhase24NoContactRehearsal(receipt);
    expect(receipt).toMatchObject({ candidateCount: 3, browserActionCount: 3, oracleCount: 3, replayPlanCount: 3, dossierRouteCount: 3, externalContactCount: 0, mutationCount: 0, rawPersistenceCount: 0, teardownComplete: true, result: 'PASS' });
  });

  test('fails closed when a selected candidate is omitted or its semantic binding is stale', () => {
    const candidates = portfolio();
    const manifest = createPhase24Manifest(manifestInput(candidates));
    const changed = buildPhase24CandidatePortfolio({ candidates: [candidate('common-exchange', { semanticExpectationId: 'expectation.changed' }), candidate('payer-exchange'), candidate('account-inventory')] });
    expect(() => buildPhase24NoContactRehearsal({ manifest, portfolio: changed })).toThrow(/REHEARSAL_PORTFOLIO_STALE/);
    expect(() => createPhase24Manifest({ ...manifestInput(candidates), selectedCandidateIds: [candidates.candidates.find((item) => item.eligibility === 'EXCLUDED')?.candidateId ?? 'missing'] })).toThrow(/SELECTED_CANDIDATE_(MISSING|NOT_EXECUTABLE)/);
  });
});

function semanticExpectation(kind: Parameters<typeof createPhase24SemanticExpectation>[0]['kind']) {
  return createPhase24SemanticExpectation({ expectationId: `expectation.${kind}`, candidateId: 'candidate:semantic', invariantId: `invariant.${kind}`, kind, source: SOURCE_A, contractId: 'contract.semantic', preconditions: ['SOURCE_CURRENT'], provenanceDigest: 'provenance:sha256:' + 'a'.repeat(24) });
}

test.describe('Phase 24 deterministic semantic and cross-candidate oracles', () => {
  test('covers contradiction archetypes with benign, violating, and not-applicable outcomes', () => {
    const cases: readonly { readonly kind: Parameters<typeof createPhase24SemanticExpectation>[0]['kind']; readonly observation: Phase24SemanticObservation; readonly outcome: 'PASS' | 'VIOLATED' | 'NOT_APPLICABLE' }[] = [
      { kind: 'TOTALS_CONTRADICTORY', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, totals: { declaredCount: 3, observedCount: 2, totalConsistent: false } }, outcome: 'VIOLATED' },
      { kind: 'MISSING_MEMBERS', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, membership: { expectedCount: 3, observedCount: 3, missingCount: 0, duplicateCount: 0 } }, outcome: 'PASS' },
      { kind: 'DUPLICATE_LOGICAL_ENTITIES', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, membership: { expectedCount: 3, observedCount: 4, missingCount: 0, duplicateCount: 1 } }, outcome: 'VIOLATED' },
      { kind: 'IMPOSSIBLE_STATE_TRANSITION', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, transition: { transitionAllowed: true } }, outcome: 'PASS' },
      { kind: 'UNIT_INCONSISTENT', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, units: { compatible: false } }, outcome: 'VIOLATED' },
      { kind: 'PAGINATION_NON_MONOTONIC', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, pagination: { monotonic: true } }, outcome: 'PASS' },
      { kind: 'FILTER_LEAKAGE', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, filter: { leakedCount: 1 } }, outcome: 'VIOLATED' },
      { kind: 'SORT_INSTABILITY', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, sort: { stable: false } }, outcome: 'VIOLATED' },
      { kind: 'LIST_DETAIL_DISAGREEMENT', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, listDetail: { disagreementCount: 0 } }, outcome: 'PASS' },
      { kind: 'MALFORMED_BOUNDED_AGGREGATE', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, aggregate: { schemaValid: true, bounded: false } }, outcome: 'VIOLATED' },
      { kind: 'CROSS_FIELD_CONTRADICTION', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, crossField: { violationCount: 0 } }, outcome: 'PASS' },
      { kind: 'IDENTITY_INSTABILITY', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: false }, outcome: 'NOT_APPLICABLE' },
    ];
    for (const item of cases) expect(evaluatePhase24SemanticExpectation({ expectation: semanticExpectation(item.kind), observation: item.observation }).outcome).toBe(item.outcome);
    expect(() => evaluatePhase24SemanticExpectation({ expectation: semanticExpectation('TOTALS_CONTRADICTORY'), observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, totals: { declaredCount: 3, observedCount: 2, totalConsistent: false }, customer: 'CUSTOMER_SENTINEL' } as never })).toThrow(/RAW/);
  });

  test('evaluates cross-candidate relations only against exact paired source identities', () => {
    const expectation = createPhase24CrossCandidateExpectation({ relationId: 'relation.list-detail', relation: 'LIST_DETAIL_MEMBERSHIP', leftCandidateId: 'candidate:list', rightCandidateId: 'candidate:detail', leftSource: SOURCE_A, rightSource: SOURCE_A, leftContractId: 'contract.list', rightContractId: 'contract.detail', provenanceDigest: 'relation-proof:sha256:' + 'b'.repeat(24) });
    const violated = evaluatePhase24CrossCandidateRelation({ expectation, currentLeftSource: SOURCE_A, currentRightSource: SOURCE_A, observation: { schemaVersion: 'nightwatch.phase24-safe-cross-candidate-observation.v1', applicable: true, leftCount: 3, rightCount: 2, missingCount: 1, leakedCount: 0, contradictionCount: 0, totalConsistent: true } });
    expect(violated.outcome).toBe('VIOLATED');
    const stale = evaluatePhase24CrossCandidateRelation({ expectation, currentLeftSource: SOURCE_B, currentRightSource: SOURCE_A, observation: { schemaVersion: 'nightwatch.phase24-safe-cross-candidate-observation.v1', applicable: true, leftCount: 3, rightCount: 3, missingCount: 0, leakedCount: 0, contradictionCount: 0, totalConsistent: true } });
    expect(stale.outcome).toBe('SOURCE_STALE');
  });
});

test.describe('Phase 24 replay, minimization, dossier, and operator diagnostics', () => {
  test('keeps replay divergence classes distinct and minimizes only invariant-preserving units', () => {
    const plan = createPhase24ReplayPlan({ candidateId: 'candidate:replay', occurrenceIdentity: 'occurrence.first', source: SOURCE_A, semanticContractId: 'contract.replay', expectationId: 'expectation.replay', sanitizedObservationDigest: 'observation:sha256:' + 'c'.repeat(24), executionPrerequisites: ['SOURCE_CURRENT'] });
    expect(classifyPhase24Replay({ plan, facts: { replayAttempted: true, sourceExact: true, authReady: true, environmentAuthorized: true, prerequisitesStable: true, sameInvariantObserved: true, semanticContractStillValid: true } }).classification).toBe('DETERMINISTIC_REPRODUCTION');
    expect(classifyPhase24Replay({ plan, facts: { replayAttempted: true, sourceExact: true, authReady: false, environmentAuthorized: true, prerequisitesStable: true, sameInvariantObserved: false, semanticContractStillValid: true } }).classification).toBe('AUTH_DIVERGENCE');
    expect(classifyPhase24Replay({ plan, facts: { replayAttempted: true, sourceExact: false, authReady: true, environmentAuthorized: true, prerequisitesStable: true, sameInvariantObserved: false, semanticContractStillValid: true } }).classification).toBe('SOURCE_DRIFT');
    const minimized = minimizePhase24Failure({ findingIdentity: 'finding:totals', invariantId: 'invariant.totals', originalUnits: [
      { kind: 'STEP', identity: 'step.setup', preservesInvariant: false, preservesBugClass: false },
      { kind: 'STEP', identity: 'step.observe', preservesInvariant: true, preservesBugClass: true },
      { kind: 'REQUEST_PARAMETER', identity: 'param.filter', preservesInvariant: true, preservesBugClass: true },
      { kind: 'EVIDENCE_FIELD', identity: 'field.count', preservesInvariant: true, preservesBugClass: true },
    ], removableUnits: [
      { kind: 'REQUEST_PARAMETER', identity: 'param.filter', preservesInvariant: true, preservesBugClass: true },
      { kind: 'EVIDENCE_FIELD', identity: 'field.count', preservesInvariant: true, preservesBugClass: true },
    ], replayConfirmationCount: 2, provenance: SOURCE_A });
    validatePhase24Minimization(minimized);
    expect(minimized.removedUnitIdentities).toEqual(['field.count', 'param.filter']);
    expect(minimized.preservedInvariant).toBe(true);
    expect(minimized.minimizedComplexity.STEP).toBe(2);
  });

  test('routes component ownership without guessing people and emits structured private dossier fields', () => {
    const owner = routePhase24OwnerProvenance({ owner: { repository: 'approved/ripple-api', packageName: 'billing', component: 'exchange', confidence: 'HIGH' }, ownerProven: true });
    expect(owner.resolution).toBe('EXACT_COMPONENT');
    const ambiguous = routePhase24OwnerProvenance({ owner: { repository: 'approved/ripple-api', packageName: 'billing', component: 'exchange', confidence: 'AMBIGUOUS' }, ownerProven: true });
    expect(ambiguous.resolution).toBe('AMBIGUOUS_COMPONENT');
    const dossier = createPhase24Dossier({ findingKind: 'TOTALS_CONTRADICTORY', invariantId: 'invariant.totals', candidateIds: ['candidate:totals'], sourceContracts: [{ ...SOURCE_A, contractId: 'contract.totals' }], implementationFiles: ['src/billing/exchange.php'], ownership: owner, replayClassification: 'DETERMINISTIC_REPRODUCTION', minimized: true, changedAssumptionCodes: ['SOURCE_CHANGED'], discardedEvidenceCodes: ['RAW_VALUES_DISCARDED', 'SCREENSHOTS_DISCARDED'], additionalConfirmationCode: 'REPEAT_IN_FRESH_CONTEXT', findingCount: 1 });
    validatePhase24Dossier(dossier);
    expect(JSON.stringify(dossier)).not.toContain('CUSTOMER_SENTINEL');
    expect(dossier.privacy.destinationClass).toBe('OWNER_LOCAL_ONLY');
  });

  test('makes exact readiness blockers and CI states explicit', () => {
    const observation: Phase24CiObservation = { currentHead: HEAD, expectedWorkflow: 'Nightwatch hardening', requiredJob: 'Executable quality gate', run: { headSha: HEAD, workflow: 'Nightwatch hardening', status: 'completed', conclusion: 'failure' }, requiredJobObservation: { name: 'Executable quality gate', steps: [], conclusion: 'failure' }, gateReceipt: null };
    const ci = classifyPhase24Ci(observation);
    expect(ci.state).toBe('ZERO_STEP_PLATFORM_BLOCK');
    const readiness = diagnosePhase24Readiness({ externalCi: ci, sourceCurrent: false, manifestCurrent: false, authReady: false, containmentReady: false, qualityGateMatches: false, sourceIdentityMatches: false, environmentAuthorized: false });
    expect(readiness.state).toBe('BLOCKED');
    expect(readiness.blockerCodes).toEqual(expect.arrayContaining(['EXTERNAL_CI_NOT_GREEN', 'SOURCE_STALE', 'MANIFEST_STALE', 'AUTH_NOT_READY', 'CONTAINMENT_NOT_READY', 'QUALITY_GATE_MISMATCH', 'SOURCE_IDENTITY_MISMATCH', 'ENVIRONMENT_NOT_AUTHORIZED']));
    const green = classifyPhase24Ci({ ...observation, run: { ...observation.run!, conclusion: 'success' }, requiredJobObservation: { name: 'Executable quality gate', steps: [{ status: 'completed', conclusion: 'success' }], conclusion: 'success' }, gateReceipt: { finalResult: 'PASS', gateDefinitionDigest: 'sha256:' + 'a'.repeat(64), expectedGateDefinitionDigest: 'sha256:' + 'a'.repeat(64) } });
    expect(green.state).toBe('EXACT_HEAD_GREEN');
    const cases: readonly [string, Phase24CiObservation][] = [
      ['NO_RUN', { ...observation, run: null }],
      ['QUEUED', { ...observation, run: { ...observation.run!, status: 'queued' } }],
      ['RUNNING', { ...observation, run: { ...observation.run!, status: 'in_progress' } }],
      ['WRONG_WORKFLOW', { ...observation, run: { ...observation.run!, workflow: 'Other workflow' } }],
      ['WRONG_SHA', { ...observation, run: { ...observation.run!, headSha: 'b'.repeat(40) } }],
      ['CANCELLED', { ...observation, run: { ...observation.run!, conclusion: 'cancelled' } }],
      ['WRONG_JOB', { ...observation, requiredJobObservation: { ...observation.requiredJobObservation!, name: 'Other job' } }],
      ['INCOMPLETE_STEPS', { ...observation, requiredJobObservation: { ...observation.requiredJobObservation!, steps: null } }],
      ['AMBIGUOUS', { ...observation, requiredJobObservation: { name: 'Executable quality gate', steps: [{ status: 'completed', conclusion: 'success' }], conclusion: 'success' }, gateReceipt: null }],
      ['EXACT_HEAD_TEST_FAILURE', { ...observation, requiredJobObservation: { name: 'Executable quality gate', steps: [{ status: 'completed', conclusion: 'failure' }], conclusion: 'failure' }, gateReceipt: { finalResult: 'TEST_FAILURE', gateDefinitionDigest: 'sha256:' + 'a'.repeat(64), expectedGateDefinitionDigest: 'sha256:' + 'a'.repeat(64) } }],
      ['INFRASTRUCTURE_FAILURE', { ...observation, requiredJobObservation: { name: 'Executable quality gate', steps: [{ status: 'completed', conclusion: 'failure' }], conclusion: 'failure' }, gateReceipt: { finalResult: 'INFRA_FAILURE', gateDefinitionDigest: 'sha256:' + 'a'.repeat(64), expectedGateDefinitionDigest: 'sha256:' + 'a'.repeat(64) } }],
    ];
    for (const [expected, input] of cases) expect(classifyPhase24Ci(input).state).toBe(expected);
    const ready = diagnosePhase24Readiness({ externalCi: green, sourceCurrent: true, manifestCurrent: true, authReady: true, containmentReady: true, qualityGateMatches: true, sourceIdentityMatches: true, environmentAuthorized: true });
    expect(ready.state).toBe('READY');
  });
});
