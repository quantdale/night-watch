// ---------------------------------------------------------------------------
// Nightwatch Phase 18 — bounded semantic coverage accounting.
//
// This is a pure accounting/selection explanation layer. It consumes an
// already-approved portfolio view and sanitized semantic campaign facts; it
// never selects an unauthorized target or grants execution authority. Source
// impact is evidence of relevance only when it is current and non-fallback.
// ---------------------------------------------------------------------------

import { campaignDigest } from '../campaign/identity';

export const SEMANTIC_COVERAGE_VERSION = 'nightwatch.semantic-coverage.private.v1' as const;

export type SemanticCoverageSourceState = 'CURRENT' | 'STALE' | 'AMBIGUOUS' | 'MISSING' | 'SYNTHETIC_ONLY';
export type SemanticCoverageImpact = 'DIRECT' | 'SHARED' | 'TRANSITIVE' | 'FALLBACK' | 'NONE' | 'UNKNOWN';
export type SemanticCoverageSelectionReason =
  | 'SOURCE_CHANGE_WITH_SEMANTIC_COVERAGE'
  | 'SOURCE_CHANGE_WITHOUT_SEMANTIC_COVERAGE'
  | 'BASELINE_HEALTH_WITH_SEMANTIC_COVERAGE'
  | 'BASELINE_HEALTH_WITHOUT_SEMANTIC_COVERAGE'
  | 'SOURCE_EVIDENCE_UNRESOLVED'
  | 'NOT_SELECTED';

export interface SemanticCoverageMemberFact {
  readonly memberId: string;
  readonly approved: boolean;
  readonly selected: boolean;
  readonly sourceImpact: SemanticCoverageImpact;
  readonly sourceState: SemanticCoverageSourceState;
  readonly expectationIds: readonly string[];
  readonly invariantClasses: readonly string[];
  readonly hasBenignControl: boolean;
  readonly replayableAnomaly: boolean;
  readonly minimizableAnomaly: boolean;
  readonly highConfidenceEligible: boolean;
}

export interface SemanticCoverageSummary {
  readonly schemaVersion: typeof SEMANTIC_COVERAGE_VERSION;
  readonly approvedMemberCount: number;
  readonly selectedMemberCount: number;
  readonly selectedWithSemanticCoverage: number;
  readonly selectedSourceChangeRelevant: number;
  readonly selectedBaselineHealth: number;
  readonly selectedWithoutSemanticCoverage: number;
  readonly currentExpectationCount: number;
  readonly staleExpectationCount: number;
  readonly ambiguousExpectationCount: number;
  readonly syntheticOnlyExpectationCount: number;
  readonly invariantClassesExercised: readonly string[];
  readonly anomalyClassesWithBenignControls: readonly string[];
  readonly replayableSemanticAnomalyCount: number;
  readonly minimizableSemanticAnomalyCount: number;
  readonly highConfidenceEligibleAnomalyCount: number;
  readonly deterministicDigest: string;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SAFE_TOKEN_RE = /^[A-Z0-9][A-Z0-9_.:-]{0,79}$/;
const MAX_MEMBERS = 512;
const MAX_EXPECTATIONS_PER_MEMBER = 32;
const MAX_CLASSES_PER_MEMBER = 32;

function assertSafeId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value) || /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) {
    throw new Error(`SEMANTIC_COVERAGE_${field}_INVALID`);
  }
}

function assertSafeToken(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_TOKEN_RE.test(value) || /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) throw new Error(`SEMANTIC_COVERAGE_${field}_INVALID`);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function assertBoundedCount(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_MEMBERS) throw new Error(`SEMANTIC_COVERAGE_${field}_INVALID`);
}

/** Explain why an approved member was selected, without treating stale or
 * fallback source evidence as proof of semantic impact. */
export function semanticCoverageSelectionReason(input: {
  readonly selected: boolean;
  readonly sourceImpact: SemanticCoverageImpact;
  readonly sourceState: SemanticCoverageSourceState;
  readonly hasSemanticCoverage: boolean;
}): SemanticCoverageSelectionReason {
  if (!input.selected) return 'NOT_SELECTED';
  if (input.sourceImpact === 'FALLBACK' || input.sourceImpact === 'UNKNOWN' || input.sourceState !== 'CURRENT') {
    return 'SOURCE_EVIDENCE_UNRESOLVED';
  }
  if (input.sourceImpact === 'DIRECT' || input.sourceImpact === 'SHARED' || input.sourceImpact === 'TRANSITIVE') {
    return input.hasSemanticCoverage ? 'SOURCE_CHANGE_WITH_SEMANTIC_COVERAGE' : 'SOURCE_CHANGE_WITHOUT_SEMANTIC_COVERAGE';
  }
  return input.hasSemanticCoverage ? 'BASELINE_HEALTH_WITH_SEMANTIC_COVERAGE' : 'BASELINE_HEALTH_WITHOUT_SEMANTIC_COVERAGE';
}

export function summarizeSemanticCoverage(facts: readonly SemanticCoverageMemberFact[]): SemanticCoverageSummary {
  if (!Array.isArray(facts)) throw new Error('SEMANTIC_COVERAGE_FACTS_NOT_ARRAY');
  if (facts.length > MAX_MEMBERS) throw new Error('SEMANTIC_COVERAGE_MEMBER_COUNT_INVALID');
  const memberIds = new Set<string>();
  const approved = facts.filter((fact) => fact.approved);
  const selected = approved.filter((fact) => fact.selected);
  const allInvariantClasses: string[] = [];
  const controlledClasses: string[] = [];
  let currentExpectationCount = 0;
  let staleExpectationCount = 0;
  let ambiguousExpectationCount = 0;
  let syntheticOnlyExpectationCount = 0;
  let selectedWithSemanticCoverage = 0;
  let selectedSourceChangeRelevant = 0;
  let selectedBaselineHealth = 0;
  let selectedWithoutSemanticCoverage = 0;
  let replayableSemanticAnomalyCount = 0;
  let minimizableSemanticAnomalyCount = 0;
  let highConfidenceEligibleAnomalyCount = 0;

  for (const fact of facts) {
    if (fact === null || typeof fact !== 'object' || (Object.getPrototypeOf(fact) !== Object.prototype && Object.getPrototypeOf(fact) !== null)) throw new Error('SEMANTIC_COVERAGE_MEMBER_FACT_PROTOTYPE_INVALID');
    assertSafeId(fact.memberId, 'MEMBER_ID');
    if (memberIds.has(fact.memberId)) throw new Error('SEMANTIC_COVERAGE_DUPLICATE_MEMBER');
    memberIds.add(fact.memberId);
    if (typeof fact.approved !== 'boolean' || typeof fact.selected !== 'boolean' || typeof fact.hasBenignControl !== 'boolean' || typeof fact.replayableAnomaly !== 'boolean' || typeof fact.minimizableAnomaly !== 'boolean' || typeof fact.highConfidenceEligible !== 'boolean') throw new Error('SEMANTIC_COVERAGE_BOOLEAN_INVALID');
    if (!['DIRECT', 'SHARED', 'TRANSITIVE', 'FALLBACK', 'NONE', 'UNKNOWN'].includes(fact.sourceImpact)) throw new Error('SEMANTIC_COVERAGE_IMPACT_INVALID');
    if (!['CURRENT', 'STALE', 'AMBIGUOUS', 'MISSING', 'SYNTHETIC_ONLY'].includes(fact.sourceState)) throw new Error('SEMANTIC_COVERAGE_SOURCE_STATE_INVALID');
    if (!Array.isArray(fact.expectationIds) || !Array.isArray(fact.invariantClasses)) throw new Error('SEMANTIC_COVERAGE_MEMBER_FACT_ARRAY_INVALID');
    if (fact.expectationIds.length > MAX_EXPECTATIONS_PER_MEMBER || fact.invariantClasses.length > MAX_CLASSES_PER_MEMBER) throw new Error('SEMANTIC_COVERAGE_MEMBER_FACT_UNBOUNDED');
    for (const id of fact.expectationIds) assertSafeId(id, 'EXPECTATION_ID');
    for (const kind of fact.invariantClasses) assertSafeToken(kind, 'INVARIANT_CLASS');
    allInvariantClasses.push(...fact.invariantClasses);
    if (fact.hasBenignControl) controlledClasses.push(...fact.invariantClasses);
    if (fact.sourceState === 'CURRENT') currentExpectationCount += fact.expectationIds.length;
    if (fact.sourceState === 'STALE') staleExpectationCount += fact.expectationIds.length;
    if (fact.sourceState === 'AMBIGUOUS' || fact.sourceState === 'MISSING') ambiguousExpectationCount += fact.expectationIds.length;
    if (fact.sourceState === 'SYNTHETIC_ONLY') syntheticOnlyExpectationCount += fact.expectationIds.length;
    if (!fact.approved || !fact.selected) continue;
    const hasCoverage = fact.expectationIds.length > 0 && fact.invariantClasses.length > 0;
    if (hasCoverage) selectedWithSemanticCoverage += 1;
    if (fact.sourceImpact === 'DIRECT' || fact.sourceImpact === 'SHARED' || fact.sourceImpact === 'TRANSITIVE') selectedSourceChangeRelevant += 1;
    if (fact.sourceImpact === 'NONE') selectedBaselineHealth += 1;
    if (!hasCoverage) selectedWithoutSemanticCoverage += 1;
    if (fact.replayableAnomaly) replayableSemanticAnomalyCount += 1;
    if (fact.minimizableAnomaly) minimizableSemanticAnomalyCount += 1;
    if (fact.highConfidenceEligible) highConfidenceEligibleAnomalyCount += 1;
  }

  const invariantClassesExercised = sortedUnique(allInvariantClasses);
  const anomalyClassesWithBenignControls = sortedUnique(controlledClasses);
  const summaryCore = {
    schemaVersion: SEMANTIC_COVERAGE_VERSION,
    approvedMemberCount: approved.length,
    selectedMemberCount: selected.length,
    selectedWithSemanticCoverage,
    selectedSourceChangeRelevant,
    selectedBaselineHealth,
    selectedWithoutSemanticCoverage,
    currentExpectationCount,
    staleExpectationCount,
    ambiguousExpectationCount,
    syntheticOnlyExpectationCount,
    invariantClassesExercised,
    anomalyClassesWithBenignControls,
    replayableSemanticAnomalyCount,
    minimizableSemanticAnomalyCount,
    highConfidenceEligibleAnomalyCount,
  };
  for (const [field, value] of Object.entries(summaryCore)) {
    if (field.endsWith('Count') || field === 'approvedMemberCount' || field === 'selectedMemberCount') assertBoundedCount(value, field);
  }
  return {
    ...summaryCore,
    deterministicDigest: `scov:sha256:${campaignDigest(summaryCore).slice(0, 24)}`,
  };
}
