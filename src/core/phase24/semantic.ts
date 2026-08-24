import {
  assertBoundedBoolean,
  assertBoundedInteger,
  assertId,
  assertNoRawArtifactFields,
  assertSourceIdentity,
  DIGEST_RE,
  digest,
  invalid,
} from './common';
import {
  PHASE24_CROSS_CANDIDATE_VERSION,
  PHASE24_SEMANTIC_VERSION,
  type Phase24CrossCandidateEvaluation,
  type Phase24CrossCandidateExpectation,
  type Phase24CrossCandidateObservation,
  type Phase24CrossCandidateOutcome,
  type Phase24SemanticEvaluation,
  type Phase24SemanticExpectation,
  type Phase24SemanticKind,
  type Phase24SemanticObservation,
  type Phase24SemanticOutcome,
  type Phase24SourceIdentity,
} from './types';

const SEMANTIC_OBSERVATION_VERSION = 'nightwatch.phase24-safe-semantic-observation.v1' as const;
const CROSS_OBSERVATION_VERSION = 'nightwatch.phase24-safe-cross-candidate-observation.v1' as const;
const SEMANTIC_KINDS: readonly Phase24SemanticKind[] = [
  'TOTALS_CONTRADICTORY', 'MISSING_MEMBERS', 'DUPLICATE_LOGICAL_ENTITIES', 'IMPOSSIBLE_STATE_TRANSITION',
  'UNIT_INCONSISTENT', 'PAGINATION_NON_MONOTONIC', 'FILTER_LEAKAGE', 'SORT_INSTABILITY',
  'LIST_DETAIL_DISAGREEMENT', 'MALFORMED_BOUNDED_AGGREGATE', 'CROSS_FIELD_CONTRADICTION', 'IDENTITY_INSTABILITY',
];

function validateExpectation(expectation: Phase24SemanticExpectation): void {
  assertNoRawArtifactFields(expectation);
  if (expectation.schemaVersion !== PHASE24_SEMANTIC_VERSION || !/^semantic-expectation:sha256:[0-9a-f]{24}$/.test(expectation.deterministicDigest)) invalid('SEMANTIC_EXPECTATION_HEADER');
  assertId(expectation.expectationId, 'EXPECTATION');
  assertId(expectation.candidateId, 'CANDIDATE');
  assertId(expectation.invariantId, 'INVARIANT');
  if (!SEMANTIC_KINDS.includes(expectation.kind)) invalid('SEMANTIC_KIND');
  assertSourceIdentity(expectation.source, 'EXPECTATION');
  assertId(expectation.contractId, 'CONTRACT');
  if (expectation.preconditions.length > 16 || expectation.preconditions.some((code) => typeof code !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(code))) invalid('SEMANTIC_PRECONDITIONS');
  if (!DIGEST_RE.test(expectation.provenanceDigest)) invalid('SEMANTIC_PROVENANCE');
  const core = {
    schemaVersion: expectation.schemaVersion,
    expectationId: expectation.expectationId,
    candidateId: expectation.candidateId,
    invariantId: expectation.invariantId,
    kind: expectation.kind,
    source: expectation.source,
    contractId: expectation.contractId,
    preconditions: expectation.preconditions,
    provenanceDigest: expectation.provenanceDigest,
  };
  if (expectation.deterministicDigest !== digest('semantic-expectation:', core)) invalid('SEMANTIC_EXPECTATION_DIGEST');
}

export function createPhase24SemanticExpectation(input: {
  readonly expectationId: string;
  readonly candidateId: string;
  readonly invariantId: string;
  readonly kind: Phase24SemanticKind;
  readonly source: Phase24SourceIdentity;
  readonly contractId: string;
  readonly preconditions: readonly string[];
  readonly provenanceDigest: string;
}): Phase24SemanticExpectation {
  assertNoRawArtifactFields(input);
  const core = { schemaVersion: PHASE24_SEMANTIC_VERSION, ...input, preconditions: [...input.preconditions].sort((left, right) => left.localeCompare(right)) };
  const expectation: Phase24SemanticExpectation = { ...core, deterministicDigest: digest('semantic-expectation:', core) };
  validateExpectation(expectation);
  return expectation;
}

function allowedKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) invalid(`${label}_FIELDS`);
}

function allowedKeysSubset(value: object, expected: readonly string[], label: string): void {
  const actual = Object.keys(value);
  if (actual.some((key) => !expected.includes(key))) invalid(`${label}_FIELDS`);
}

function count(value: unknown, label: string): asserts value is number {
  assertBoundedInteger(value, label, 0, 1_000_000);
}

function validateSemanticObservation(observation: Phase24SemanticObservation): void {
  assertNoRawArtifactFields(observation);
  if (observation.schemaVersion !== SEMANTIC_OBSERVATION_VERSION) invalid('SEMANTIC_OBSERVATION_SCHEMA');
  allowedKeysSubset(observation, ['schemaVersion', 'applicable', 'totals', 'membership', 'transition', 'units', 'pagination', 'filter', 'sort', 'listDetail', 'aggregate', 'crossField', 'identity'], 'SEMANTIC_OBSERVATION');
  assertBoundedBoolean(observation.applicable, 'SEMANTIC_APPLICABLE');
  if (observation.totals !== undefined) {
    allowedKeys(observation.totals, ['declaredCount', 'observedCount', 'totalConsistent'], 'TOTALS');
    count(observation.totals.declaredCount, 'DECLARED_COUNT');
    count(observation.totals.observedCount, 'OBSERVED_COUNT');
    assertBoundedBoolean(observation.totals.totalConsistent, 'TOTAL_CONSISTENT');
  }
  if (observation.membership !== undefined) {
    allowedKeys(observation.membership, ['expectedCount', 'observedCount', 'missingCount', 'duplicateCount'], 'MEMBERSHIP');
    count(observation.membership.expectedCount, 'EXPECTED_COUNT');
    count(observation.membership.observedCount, 'OBSERVED_COUNT');
    count(observation.membership.missingCount, 'MISSING_COUNT');
    count(observation.membership.duplicateCount, 'DUPLICATE_COUNT');
  }
  const booleans: readonly [keyof Phase24SemanticObservation, string][] = [
    ['transition', 'TRANSITION'], ['units', 'UNITS'], ['pagination', 'PAGINATION'], ['sort', 'SORT'], ['identity', 'IDENTITY'],
  ];
  for (const [key, label] of booleans) {
    const item = observation[key] as { readonly transitionAllowed?: boolean; readonly compatible?: boolean; readonly monotonic?: boolean; readonly stable?: boolean } | undefined;
    if (item !== undefined) {
      const field = key === 'transition' ? 'transitionAllowed' : key === 'units' ? 'compatible' : key === 'pagination' ? 'monotonic' : key === 'sort' ? 'stable' : 'stable';
      allowedKeys(item, [field], label);
      assertBoundedBoolean(item[field as keyof typeof item], label);
    }
  }
  if (observation.filter !== undefined) {
    allowedKeys(observation.filter, ['leakedCount'], 'FILTER');
    count(observation.filter.leakedCount, 'LEAKED_COUNT');
  }
  if (observation.listDetail !== undefined) {
    allowedKeys(observation.listDetail, ['disagreementCount'], 'LIST_DETAIL');
    count(observation.listDetail.disagreementCount, 'DISAGREEMENT_COUNT');
  }
  if (observation.aggregate !== undefined) {
    allowedKeys(observation.aggregate, ['schemaValid', 'bounded'], 'AGGREGATE');
    assertBoundedBoolean(observation.aggregate.schemaValid, 'AGGREGATE_SCHEMA');
    assertBoundedBoolean(observation.aggregate.bounded, 'AGGREGATE_BOUND');
  }
  if (observation.crossField !== undefined) {
    allowedKeys(observation.crossField, ['violationCount'], 'CROSS_FIELD');
    count(observation.crossField.violationCount, 'VIOLATION_COUNT');
  }
}

function semanticResult(
  expectation: Phase24SemanticExpectation,
  outcome: Phase24SemanticOutcome,
  inspectedCategoryCount: number,
  violatingCategoryCount: number,
  sanitizedReasonCode: string,
): Phase24SemanticEvaluation {
  const findingCount: 0 | 1 = outcome === 'VIOLATED' ? 1 : 0;
  const core = {
    schemaVersion: PHASE24_SEMANTIC_VERSION,
    expectationId: expectation.expectationId,
    invariantId: expectation.invariantId,
    kind: expectation.kind,
    source: expectation.source,
    outcome,
    findingCount,
    inspectedCategoryCount,
    violatingCategoryCount,
    sanitizedReasonCode,
  } as const;
  return { ...core, deterministicDigest: digest('semantic-evaluation:', core) };
}

function booleanOutcome(value: boolean | undefined, passCode: string, violationCode: string): { readonly outcome: Phase24SemanticOutcome; readonly reason: string; readonly violations: number } {
  if (value === undefined) return { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 };
  return value ? { outcome: 'PASS', reason: passCode, violations: 0 } : { outcome: 'VIOLATED', reason: violationCode, violations: 1 };
}

/** Evaluate a declarative expectation using only bounded category projections. */
export function evaluatePhase24SemanticExpectation(input: { readonly expectation: Phase24SemanticExpectation; readonly observation: Phase24SemanticObservation }): Phase24SemanticEvaluation {
  validateExpectation(input.expectation);
  validateSemanticObservation(input.observation);
  const { expectation, observation } = input;
  if (!observation.applicable) return semanticResult(expectation, 'NOT_APPLICABLE', 0, 0, 'PRECONDITION_NOT_APPLICABLE');
  let result: { readonly outcome: Phase24SemanticOutcome; readonly reason: string; readonly violations: number };
  switch (expectation.kind) {
    case 'TOTALS_CONTRADICTORY': result = booleanOutcome(observation.totals?.totalConsistent, 'TOTALS_CONSISTENT', 'TOTALS_CONTRADICTORY'); break;
    case 'MISSING_MEMBERS': result = observation.membership === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.membership.missingCount === 0 ? { outcome: 'PASS', reason: 'MEMBERS_PRESENT', violations: 0 } : { outcome: 'VIOLATED', reason: 'MEMBERS_MISSING', violations: 1 }; break;
    case 'DUPLICATE_LOGICAL_ENTITIES': result = observation.membership === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.membership.duplicateCount === 0 ? { outcome: 'PASS', reason: 'IDENTITIES_UNIQUE', violations: 0 } : { outcome: 'VIOLATED', reason: 'DUPLICATE_IDENTITIES', violations: 1 }; break;
    case 'IMPOSSIBLE_STATE_TRANSITION': result = booleanOutcome(observation.transition?.transitionAllowed, 'STATE_TRANSITION_ALLOWED', 'IMPOSSIBLE_STATE_TRANSITION'); break;
    case 'UNIT_INCONSISTENT': result = booleanOutcome(observation.units?.compatible, 'UNITS_COMPATIBLE', 'UNIT_INCONSISTENCY'); break;
    case 'PAGINATION_NON_MONOTONIC': result = booleanOutcome(observation.pagination?.monotonic, 'PAGINATION_MONOTONIC', 'PAGINATION_NON_MONOTONIC'); break;
    case 'FILTER_LEAKAGE': result = observation.filter === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.filter.leakedCount === 0 ? { outcome: 'PASS', reason: 'FILTER_SUBSET_HOLDS', violations: 0 } : { outcome: 'VIOLATED', reason: 'FILTER_LEAKAGE', violations: 1 }; break;
    case 'SORT_INSTABILITY': result = booleanOutcome(observation.sort?.stable, 'SORT_STABLE', 'SORT_INSTABILITY'); break;
    case 'LIST_DETAIL_DISAGREEMENT': result = observation.listDetail === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.listDetail.disagreementCount === 0 ? { outcome: 'PASS', reason: 'LIST_DETAIL_AGREE', violations: 0 } : { outcome: 'VIOLATED', reason: 'LIST_DETAIL_DISAGREEMENT', violations: 1 }; break;
    case 'MALFORMED_BOUNDED_AGGREGATE': result = observation.aggregate === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.aggregate.schemaValid && observation.aggregate.bounded ? { outcome: 'PASS', reason: 'AGGREGATE_VALID', violations: 0 } : { outcome: 'VIOLATED', reason: 'AGGREGATE_MALFORMED_OR_UNBOUNDED', violations: 1 }; break;
    case 'CROSS_FIELD_CONTRADICTION': result = observation.crossField === undefined ? { outcome: 'INTERNAL_ERROR', reason: 'ORACLE_INPUT_MISSING', violations: 0 } : observation.crossField.violationCount === 0 ? { outcome: 'PASS', reason: 'CROSS_FIELDS_CONSISTENT', violations: 0 } : { outcome: 'VIOLATED', reason: 'CROSS_FIELD_CONTRADICTION', violations: 1 }; break;
    case 'IDENTITY_INSTABILITY': result = booleanOutcome(observation.identity?.stable, 'IDENTITY_STABLE', 'IDENTITY_INSTABILITY'); break;
  }
  return semanticResult(expectation, result.outcome, 1, result.violations, result.reason);
}

function validateCrossExpectation(expectation: Phase24CrossCandidateExpectation): void {
  assertNoRawArtifactFields(expectation);
  if (expectation.schemaVersion !== PHASE24_CROSS_CANDIDATE_VERSION || !/^cross-expectation:sha256:[0-9a-f]{24}$/.test(expectation.deterministicDigest)) invalid('CROSS_EXPECTATION_HEADER');
  assertId(expectation.relationId, 'RELATION');
  assertId(expectation.leftCandidateId, 'LEFT_CANDIDATE');
  assertId(expectation.rightCandidateId, 'RIGHT_CANDIDATE');
  assertId(expectation.leftContractId, 'LEFT_CONTRACT');
  assertId(expectation.rightContractId, 'RIGHT_CONTRACT');
  assertSourceIdentity(expectation.leftSource, 'LEFT_SOURCE');
  assertSourceIdentity(expectation.rightSource, 'RIGHT_SOURCE');
  if (!['LIST_DETAIL_MEMBERSHIP', 'FILTERED_SUBSET', 'SUMMARY_MEMBERS', 'PAYER_EXCHANGE_LINK', 'INVENTORY_ACCOUNT_LINK'].includes(expectation.relation)) invalid('CROSS_RELATION');
  if (!DIGEST_RE.test(expectation.provenanceDigest)) invalid('CROSS_PROVENANCE');
  const core = {
    schemaVersion: expectation.schemaVersion,
    relationId: expectation.relationId,
    relation: expectation.relation,
    leftCandidateId: expectation.leftCandidateId,
    rightCandidateId: expectation.rightCandidateId,
    leftSource: expectation.leftSource,
    rightSource: expectation.rightSource,
    leftContractId: expectation.leftContractId,
    rightContractId: expectation.rightContractId,
    provenanceDigest: expectation.provenanceDigest,
  };
  if (expectation.deterministicDigest !== digest('cross-expectation:', core)) invalid('CROSS_EXPECTATION_DIGEST');
}

export function createPhase24CrossCandidateExpectation(input: Omit<Phase24CrossCandidateExpectation, 'schemaVersion' | 'deterministicDigest'>): Phase24CrossCandidateExpectation {
  assertNoRawArtifactFields(input);
  const core = { schemaVersion: PHASE24_CROSS_CANDIDATE_VERSION, ...input };
  const expectation: Phase24CrossCandidateExpectation = { ...core, deterministicDigest: digest('cross-expectation:', core) };
  validateCrossExpectation(expectation);
  return expectation;
}

function sourceCurrent(expected: Phase24SourceIdentity, observed: Phase24SourceIdentity | null): boolean {
  return observed !== null && expected.repoId === observed.repoId && expected.sha === observed.sha && expected.evidenceDigest === observed.evidenceDigest;
}

function crossResult(input: {
  readonly expectation: Phase24CrossCandidateExpectation;
  readonly outcome: Phase24CrossCandidateOutcome;
  readonly inspected: number;
  readonly violations: number;
  readonly freshness: 'CURRENT_EXACT' | 'SOURCE_STALE' | 'UNKNOWN';
}): Phase24CrossCandidateEvaluation {
  const core = {
    schemaVersion: PHASE24_CROSS_CANDIDATE_VERSION,
    relationId: input.expectation.relationId,
    relation: input.expectation.relation,
    leftCandidateId: input.expectation.leftCandidateId,
    rightCandidateId: input.expectation.rightCandidateId,
    outcome: input.outcome,
    findingCount: input.outcome === 'VIOLATED' ? 1 as const : 0 as const,
    inspectedCategoryCount: input.inspected,
    violatingCategoryCount: input.violations,
    freshness: input.freshness,
  } as const;
  return { ...core, deterministicDigest: digest('cross-evaluation:', core) };
}

function validateCrossObservation(observation: Phase24CrossCandidateObservation): void {
  assertNoRawArtifactFields(observation);
  if (observation.schemaVersion !== CROSS_OBSERVATION_VERSION) invalid('CROSS_OBSERVATION_SCHEMA');
  const keys = Object.keys(observation).sort();
  if (JSON.stringify(keys) !== JSON.stringify(['applicable', 'contradictionCount', 'leakedCount', 'leftCount', 'missingCount', 'rightCount', 'schemaVersion', 'totalConsistent'].sort())) invalid('CROSS_OBSERVATION_FIELDS');
  assertBoundedBoolean(observation.applicable, 'CROSS_APPLICABLE');
  assertBoundedBoolean(observation.totalConsistent, 'CROSS_TOTAL');
  for (const [key, value] of Object.entries(observation)) if (key.endsWith('Count')) count(value, `CROSS_${key.toUpperCase()}`);
}

/** Evaluate a relation only when both source contracts are still exact. */
export function evaluatePhase24CrossCandidateRelation(input: {
  readonly expectation: Phase24CrossCandidateExpectation;
  readonly observation: Phase24CrossCandidateObservation;
  readonly currentLeftSource: Phase24SourceIdentity | null;
  readonly currentRightSource: Phase24SourceIdentity | null;
}): Phase24CrossCandidateEvaluation {
  validateCrossExpectation(input.expectation);
  validateCrossObservation(input.observation);
  const freshness = sourceCurrent(input.expectation.leftSource, input.currentLeftSource) && sourceCurrent(input.expectation.rightSource, input.currentRightSource) ? 'CURRENT_EXACT' as const : 'SOURCE_STALE' as const;
  if (freshness === 'SOURCE_STALE') return crossResult({ expectation: input.expectation, outcome: 'SOURCE_STALE', inspected: 0, violations: 0, freshness });
  if (!input.observation.applicable) return crossResult({ expectation: input.expectation, outcome: 'NOT_APPLICABLE', inspected: 0, violations: 0, freshness });
  let violates = false;
  switch (input.expectation.relation) {
    case 'LIST_DETAIL_MEMBERSHIP': violates = input.observation.missingCount > 0; break;
    case 'FILTERED_SUBSET': violates = input.observation.leakedCount > 0; break;
    case 'SUMMARY_MEMBERS': violates = !input.observation.totalConsistent; break;
    case 'PAYER_EXCHANGE_LINK':
    case 'INVENTORY_ACCOUNT_LINK': violates = input.observation.contradictionCount > 0; break;
  }
  return crossResult({ expectation: input.expectation, outcome: violates ? 'VIOLATED' : 'PASS', inspected: 2, violations: violates ? 1 : 0, freshness });
}
