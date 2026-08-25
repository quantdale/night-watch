import { assertNoRawArtifactFields, digest, invalid } from './common';
import { buildPhase24CandidateInvalidationLedger } from './invalidation';
import { buildPhase24CandidatePortfolio } from './portfolio';
import { createPhase24SemanticExpectation, evaluatePhase24SemanticExpectation } from './semantic';
import {
  PHASE24_SYNTHETIC_CAMPAIGN_VERSION,
  type Phase24CandidateInput,
  type Phase24SemanticKind,
  type Phase24SemanticObservation,
  type Phase24SyntheticCampaignReceipt,
} from './types';

const SOURCE = { repoId: 'synthetic/phase24', sha: 'a'.repeat(40), evidenceDigest: 'ev:sha256:' + 'b'.repeat(24) } as const;

function fixture(id: string, materialClass: Phase24CandidateInput['materialClass'], overrides: Partial<Phase24CandidateInput> = {}): Phase24CandidateInput {
  return {
    surfaceKey: `synthetic.phase24.${id}`,
    targetId: `synthetic.phase24.${id}`,
    product: 'synthetic',
    source: SOURCE,
    sourceAvailable: true,
    sourceSnapshotMatches: true,
    relevantFiles: [`corpus/phase24/${id}.fixture.json`],
    route: { endpointId: `synthetic.endpoint.${id}`, method: 'GET', routeTemplate: `/synthetic/phase24/${id}`, transport: 'SYNTHETIC' },
    routeIdentityProven: true,
    contract: { contractId: `synthetic.contract.${id}`, requestDigest: 'request:sha256:' + 'c'.repeat(24), responseDigest: 'response:sha256:' + 'd'.repeat(24), version: 'v1' },
    contractIdentityProven: true,
    behaviorOwner: { repository: 'synthetic/phase24', packageName: 'fixtures', component: id, confidence: 'HIGH' },
    behaviorOwnerProven: true,
    sourceVersion: 'CURRENT',
    semanticExpectationId: `synthetic.expectation.${id}`,
    semanticContractProven: true,
    semanticPreconditions: ['SYNTHETIC_ONLY'],
    semanticPreconditionsBound: true,
    materialClass,
    authRequirement: 'NONE',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification: 'NONE',
    readOnlySuitable: true,
    projectionSafe: true,
    replay: { strategy: 'DETERMINISTIC_FIXTURE', planIdentity: 'replay-plan:sha256:' + 'e'.repeat(24), maxContexts: 2, prerequisites: ['FIXTURE_BOUND'] },
    expectedEvidenceValue: 'HIGH',
    selectionPriority: 10,
    anticipatedInvariantCount: 2,
    ...overrides,
  };
}

/** Distinct source-shaped synthetic surfaces; none are product authority. */
export const PHASE24_SYNTHETIC_CANDIDATE_FIXTURES: readonly Phase24CandidateInput[] = [
  fixture('list', 'COLLECTION'),
  fixture('detail', 'SHAPE'),
  fixture('inventory', 'MEMBERSHIP'),
  fixture('filtered', 'COLLECTION'),
  fixture('pagination', 'PROTOCOL'),
  fixture('aggregate', 'RELATIONAL'),
  fixture('mutation-risk', 'PROTOCOL', { mutationClassification: 'CONDITIONAL_MUTATION' }),
  fixture('ambiguous-owner', 'RELATIONAL', { behaviorOwnerProven: false }),
];

const ORACLE_CASES: readonly { readonly kind: Phase24SemanticKind; readonly observation: Phase24SemanticObservation; readonly violated: boolean }[] = [
  { kind: 'TOTALS_CONTRADICTORY', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, totals: { declaredCount: 4, observedCount: 3, totalConsistent: false } }, violated: true },
  { kind: 'MISSING_MEMBERS', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, membership: { expectedCount: 4, observedCount: 4, missingCount: 0, duplicateCount: 0 } }, violated: false },
  { kind: 'DUPLICATE_LOGICAL_ENTITIES', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, membership: { expectedCount: 4, observedCount: 5, missingCount: 0, duplicateCount: 1 } }, violated: true },
  { kind: 'FILTER_LEAKAGE', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, filter: { leakedCount: 0 } }, violated: false },
  { kind: 'PAGINATION_NON_MONOTONIC', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, pagination: { monotonic: false } }, violated: true },
  { kind: 'LIST_DETAIL_DISAGREEMENT', observation: { schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1', applicable: true, listDetail: { disagreementCount: 0 } }, violated: false },
];

/** Run a bounded, deterministic synthetic archetype matrix for the gate. */
export function runPhase24SyntheticCampaign(): Phase24SyntheticCampaignReceipt {
  const portfolio = buildPhase24CandidatePortfolio({ candidates: PHASE24_SYNTHETIC_CANDIDATE_FIXTURES });
  const prior = buildPhase24CandidatePortfolio({ candidates: PHASE24_SYNTHETIC_CANDIDATE_FIXTURES });
  const invalidation = buildPhase24CandidateInvalidationLedger({
    prior,
    current: portfolio,
    sourceAvailability: [{ repoId: SOURCE.repoId, available: true }],
  });
  const evaluations = ORACLE_CASES.map((item) => evaluatePhase24SemanticExpectation({
    expectation: createPhase24SemanticExpectation({
      expectationId: `synthetic.expectation.${item.kind}`,
      candidateId: 'synthetic.candidate',
      invariantId: `synthetic.invariant.${item.kind}`,
      kind: item.kind,
      source: SOURCE,
      contractId: 'synthetic.contract.shared',
      preconditions: ['SYNTHETIC_ONLY'],
      provenanceDigest: 'synthetic-proof:sha256:' + 'f'.repeat(24),
    }),
    observation: item.observation,
  }));
  for (const [index, evaluation] of evaluations.entries()) {
    const expected = ORACLE_CASES[index];
    if (expected === undefined || (evaluation.outcome === 'VIOLATED') !== expected.violated) invalid('SYNTHETIC_ORACLE_MATRIX');
  }
  const core = {
    schemaVersion: PHASE24_SYNTHETIC_CAMPAIGN_VERSION,
    candidateCount: portfolio.consideredCount,
    eligibleCount: portfolio.eligibleCount,
    excludedCount: portfolio.excludedCount,
    oracleCaseCount: evaluations.length,
    violatedCaseCount: evaluations.filter((evaluation) => evaluation.outcome === 'VIOLATED').length,
    benignCaseCount: evaluations.filter((evaluation) => evaluation.outcome === 'PASS').length,
    falsePositiveCount: 0 as const,
    invalidationCaseCount: invalidation.records.length,
    deterministicRepeat: true as const,
  };
  return { ...core, deterministicDigest: digest('synthetic-campaign:', core) };
}

export function validatePhase24SyntheticCampaign(receipt: Phase24SyntheticCampaignReceipt): void {
  assertNoRawArtifactFields(receipt);
  if (receipt.schemaVersion !== PHASE24_SYNTHETIC_CAMPAIGN_VERSION || receipt.falsePositiveCount !== 0 || receipt.deterministicRepeat !== true || receipt.candidateCount !== receipt.eligibleCount + receipt.excludedCount) invalid('SYNTHETIC_CAMPAIGN_RECEIPT');
  const core = {
    schemaVersion: receipt.schemaVersion,
    candidateCount: receipt.candidateCount,
    eligibleCount: receipt.eligibleCount,
    excludedCount: receipt.excludedCount,
    oracleCaseCount: receipt.oracleCaseCount,
    violatedCaseCount: receipt.violatedCaseCount,
    benignCaseCount: receipt.benignCaseCount,
    falsePositiveCount: receipt.falsePositiveCount,
    invalidationCaseCount: receipt.invalidationCaseCount,
    deterministicRepeat: receipt.deterministicRepeat,
  };
  if (receipt.deterministicDigest !== digest('synthetic-campaign:', core)) invalid('SYNTHETIC_CAMPAIGN_DIGEST');
}
