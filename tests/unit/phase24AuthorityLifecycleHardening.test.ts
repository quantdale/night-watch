import { expect, test } from '@playwright/test';
import {
  buildPhase24CandidateInvalidationLedger,
  buildPhase24CandidatePortfolio,
  createPhase24Dossier,
  createPhase24ReplayPlan,
  prioritizePhase24Portfolio,
  routePhase24OwnerProvenance,
  validatePhase24DossierAgainstPortfolio,
  validatePhase24PortfolioSelection,
  validatePhase24ReplayPlanAgainstCandidate,
  type Phase24CandidateInput,
} from '../../src/core/phase24';

const SOURCE_A = { repoId: 'approved/repo-a', sha: 'a'.repeat(40), evidenceDigest: 'ev:sha256:' + '1'.repeat(24) } as const;
const SOURCE_B = { repoId: 'approved/repo-b', sha: 'b'.repeat(40), evidenceDigest: 'ev:sha256:' + '2'.repeat(24) } as const;
const SOURCE_B_NEXT = { repoId: 'approved/repo-b', sha: 'c'.repeat(40), evidenceDigest: 'ev:sha256:' + '3'.repeat(24) } as const;

function candidate(id: string, overrides: Partial<Phase24CandidateInput> = {}): Phase24CandidateInput {
  return {
    surfaceKey: `authority.${id}.read`,
    targetId: `authority.${id}.read`,
    product: 'synthetic-authority',
    source: SOURCE_A,
    sourceAvailable: true,
    sourceSnapshotMatches: true,
    relevantFiles: [`src/${id}.php`],
    route: { endpointId: `authority.endpoint.${id}`, method: 'GET', routeTemplate: `/authority/${id}`, transport: 'SYNTHETIC' },
    routeIdentityProven: true,
    contract: { contractId: `authority.contract.${id}`, requestDigest: 'request:sha256:' + '4'.repeat(24), responseDigest: 'response:sha256:' + '5'.repeat(24), version: 'v1' },
    contractIdentityProven: true,
    behaviorOwner: { repository: 'synthetic-authority', packageName: 'fixtures', component: id, confidence: 'HIGH' },
    behaviorOwnerProven: true,
    sourceVersion: 'CURRENT',
    semanticExpectationId: `authority.expectation.${id}`,
    semanticContractProven: true,
    semanticPreconditions: ['SOURCE_CURRENT'],
    semanticPreconditionsBound: true,
    materialClass: 'COLLECTION',
    authRequirement: 'NONE',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification: 'NONE',
    readOnlySuitable: true,
    projectionSafe: true,
    replay: { strategy: 'FIRST_REPLAY', planIdentity: `authority.replay.${id}`, maxContexts: 2, prerequisites: ['SOURCE_CURRENT'] },
    expectedEvidenceValue: 'HIGH',
    selectionPriority: 10,
    anticipatedInvariantCount: 2,
    ...overrides,
  };
}

function portfolio(...candidates: readonly Phase24CandidateInput[]) {
  return buildPhase24CandidatePortfolio({ candidates });
}

function untypedLedger(input: Record<string, unknown>) {
  return buildPhase24CandidateInvalidationLedger(input as never) as unknown as {
    readonly records: readonly Record<string, unknown>[];
    readonly changedCandidateIds: readonly string[];
    readonly newlyEligibleCandidateIds: readonly string[];
    readonly staleCandidateIds: readonly string[];
    readonly replayInvalidatedCandidateIds: readonly string[];
    readonly dossierInvalidatedCandidateIds: readonly string[];
  };
}

test.describe('Phase 24 authority lifecycle adversarial matrix', () => {
  test('does not treat omitted snapshot-match proof as eligibility evidence', () => {
    const omitted = candidate('omitted');
    delete (omitted as { sourceSnapshotMatches?: boolean }).sourceSnapshotMatches;
    const result = portfolio(omitted);
    expect(result.candidates[0]?.eligibility).toBe('EXCLUDED');
    expect(result.candidates[0]?.reasonCodes).toContain('SOURCE_SNAPSHOT_MISMATCH');
    expect(portfolio(candidate('asserted', { sourceSnapshotMatches: true })).eligibleCount).toBe(1);
    expect(portfolio(candidate('mismatch', { sourceSnapshotMatches: false })).eligibleCount).toBe(0);
  });

  test('keeps stable logical identity distinct from changed source incarnation', () => {
    const prior = portfolio(candidate('stable', { source: SOURCE_A }));
    const current = portfolio(candidate('stable', { source: SOURCE_B }));
    const priorId = prior.candidates[0]!.candidateId;
    const currentId = current.candidates[0]!.candidateId;
    expect(currentId).toBe(priorId);
    const ledger = untypedLedger({
      prior,
      current,
      sourceAvailability: [
        { repoId: SOURCE_A.repoId, available: true },
        { repoId: SOURCE_B.repoId, available: true },
      ],
    });
    expect(ledger.records[0]).toMatchObject({ priorCandidateId: priorId, currentCandidateId: currentId, replayInvalidated: true, dossierAssumptionsInvalidated: true });
    expect(ledger.records[0]?.staleArtifactKeys).toEqual(expect.arrayContaining([`replay:${priorId}`, `dossier:${priorId}`]));
  });

  test('retains both identities when one surface changes candidate identity', () => {
    const prior = portfolio(candidate('identity', { route: { endpointId: 'authority.endpoint.identity', method: 'GET', routeTemplate: '/authority/identity', transport: 'SYNTHETIC' } }));
    const current = portfolio(candidate('identity', { route: { endpointId: 'authority.endpoint.identity.v2', method: 'GET', routeTemplate: '/authority/identity-v2', transport: 'SYNTHETIC' } }));
    const priorId = prior.candidates[0]!.candidateId;
    const currentId = current.candidates[0]!.candidateId;
    expect(currentId).not.toBe(priorId);
    const ledger = untypedLedger({
      prior,
      current,
      sourceAvailability: [{ repoId: SOURCE_A.repoId, available: true }],
    });
    expect(ledger.records[0]).toMatchObject({ candidateId: currentId, priorCandidateId: priorId, currentCandidateId: currentId, replayInvalidated: true, dossierAssumptionsInvalidated: true });
    expect(ledger.changedCandidateIds).toEqual(expect.arrayContaining([priorId, currentId]));
    expect(ledger.replayInvalidatedCandidateIds).toEqual(expect.arrayContaining([priorId, currentId]));
    expect(ledger.dossierInvalidatedCandidateIds).toEqual(expect.arrayContaining([priorId, currentId]));
    expect(ledger.staleCandidateIds).toEqual(expect.arrayContaining([priorId, currentId]));
  });

  test('isolates partial repository unavailability and invalidates recovery at a new incarnation', () => {
    const prior = portfolio(
      candidate('available', { source: SOURCE_A }),
      candidate('unavailable', { source: SOURCE_B }),
    );
    const unavailable = portfolio(
      candidate('available', { source: SOURCE_A }),
      candidate('unavailable', { source: SOURCE_B, sourceAvailable: false }),
    );
    const unavailableLedger = untypedLedger({
      prior,
      current: portfolio(candidate('available', { source: SOURCE_A })),
      sourceAvailability: [
        { repoId: SOURCE_A.repoId, available: true },
        { repoId: SOURCE_B.repoId, available: false },
      ],
    });
    const removedLedger = untypedLedger({
      prior,
      current: portfolio(candidate('available', { source: SOURCE_A })),
      sourceAvailability: [
        { repoId: SOURCE_A.repoId, available: true },
        { repoId: SOURCE_B.repoId, available: true },
      ],
    });
    expect(removedLedger.records.find((record) => record.surfaceKey === 'authority.unavailable.read')?.state).toBe('CONTRACT_REMOVED');
    expect(unavailableLedger.records.find((record) => record.surfaceKey === 'authority.available.read')?.state).toBe('CURRENT');
    expect(unavailableLedger.records.find((record) => record.surfaceKey === 'authority.unavailable.read')?.state).toBe('SOURCE_UNAVAILABLE');

    const recoveredLedger = untypedLedger({
      prior: unavailable,
      current: portfolio(candidate('available', { source: SOURCE_A }), candidate('unavailable', { source: SOURCE_B_NEXT })),
      sourceAvailability: [
        { repoId: SOURCE_A.repoId, available: true },
        { repoId: SOURCE_B.repoId, available: true },
      ],
    });
    const recovered = recoveredLedger.records.find((record) => record.surfaceKey === 'authority.unavailable.read');
    expect(recovered).toMatchObject({ state: 'SOURCE_RECOVERED', replayInvalidated: true, dossierAssumptionsInvalidated: true });
    expect(recovered?.staleArtifactKeys).toEqual(expect.arrayContaining([`selection:authority.unavailable.read` ]));
  });

  test('requires an explicit per-repository availability map and rejects duplicate surfaces', () => {
    const prior = portfolio(candidate('required-map'));
    const current = portfolio(candidate('required-map'));
    expect(() => buildPhase24CandidateInvalidationLedger({ prior, current } as never)).toThrow(/INVALIDATION_SOURCE_AVAILABILITY/);
    const duplicate = candidate('duplicate');
    expect(() => portfolio(candidate('first'), { ...duplicate, surfaceKey: 'authority.first.read' })).toThrow(/DUPLICATE_SURFACE/);
  });

  test('rejects old replay, dossier, and selection artifacts against a changed current portfolio', () => {
    const priorPortfolio = portfolio(candidate('artifact', { source: SOURCE_A }));
    const currentPortfolio = portfolio(candidate('artifact', { source: SOURCE_B }));
    const prior = priorPortfolio.candidates[0]!;
    const current = currentPortfolio.candidates[0]!;
    const replayPlan = createPhase24ReplayPlan({
      candidateId: prior.candidateId,
      candidateDecisionDigest: prior.deterministicDigest,
      occurrenceIdentity: 'authority.artifact.first',
      source: prior.source!,
      semanticContractId: prior.contract!.contractId,
      expectationId: prior.semanticExpectationId,
      sanitizedObservationDigest: 'observation:sha256:' + '4'.repeat(24),
      executionPrerequisites: ['SOURCE_CURRENT'],
    });
    expect(() => validatePhase24ReplayPlanAgainstCandidate({ plan: replayPlan, candidate: current })).toThrow(/REPLAY_CANDIDATE_STALE/);

    const ownership = routePhase24OwnerProvenance({ owner: prior.behaviorOwner, ownerProven: prior.behaviorOwnerProven });
    const dossier = createPhase24Dossier({
      findingKind: 'TOTALS_CONTRADICTORY',
      invariantId: 'authority.artifact.invariant',
      candidateIds: [prior.candidateId],
      candidateDecisionBindings: [{ candidateId: prior.candidateId, decisionDigest: prior.deterministicDigest }],
      sourceContracts: [{ ...prior.source!, contractId: prior.contract!.contractId }],
      implementationFiles: prior.relevantFiles,
      ownership,
      replayClassification: 'SOURCE_DRIFT',
      minimized: false,
      changedAssumptionCodes: ['SOURCE_CHANGED'],
      discardedEvidenceCodes: ['RAW_VALUES_DISCARDED'],
      additionalConfirmationCode: 'OWNER_REVIEW_REQUIRED',
      findingCount: 0,
    });
    expect(() => validatePhase24DossierAgainstPortfolio({ dossier, portfolio: currentPortfolio })).toThrow(/DOSSIER_CANDIDATE_STALE/);

    const selection = prioritizePhase24Portfolio({ portfolio: priorPortfolio, maxCandidates: 1 });
    expect(() => validatePhase24PortfolioSelection(selection, currentPortfolio)).toThrow(/SELECTION_HEADER/);
  });
});
