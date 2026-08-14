// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — deterministic declarative evaluator.
//
// The evaluator owns validation, allowlist resolution, duplicate detection,
// execution, coverage, safety, privacy, and result truth. Candidate data can
// never supply executable behavior; the fixed registry descriptors below are
// interpreted by this module's bounded structural code.
// ---------------------------------------------------------------------------

import { performance } from 'node:perf_hooks';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import {
  SELFDEV_BASELINE_COVERAGE,
  SELFDEV_BASELINE_EQUIVALENT_FINGERPRINT,
  SELFDEV_COVERAGE_CLASSES,
  assertSelfDevCoverageClaims,
  assertSelfDevSourceRefs,
  resolveSelfDevAction,
  resolveSelfDevActions,
  resolveSelfDevAssertions,
  resolveSelfDevFixture,
  type SelfDevActionDescriptor,
  type SelfDevAssertionDescriptor,
  type SelfDevFixtureDescriptor,
  type SelfDevStateId,
} from './registry';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_BUDGET,
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_EVALUATION_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevCandidate,
  type SelfDevCoverageDelta,
  type SelfDevEvaluation,
  type SelfDevExecutionSummary,
  type SelfDevReasonCode,
  type SelfDevResultClass,
  type SelfDevSafetyVector,
} from './types';
import {
  candidateDigestFor,
  candidateEquivalentFingerprint,
  evaluationIdFor,
  isSelfDevValidationError,
  resultClassForValidation,
  SelfDevRegistryError,
  validateCandidate as validateCandidateDto,
  validateEvaluation,
} from './validation';
import { sha256Digest } from './canonical';

export class SelfDevSessionBudgetError extends Error {
  constructor() {
    super('SELFDEV_SESSION_CANDIDATE_BUDGET_EXCEEDED');
    this.name = 'SelfDevSessionBudgetError';
  }
}

interface EvaluationState {
  readonly candidateIds: Set<string>;
  readonly equivalentFingerprints: Set<string>;
  readonly coveredCoverage: Set<string>;
}

interface ExecutionResult {
  readonly summary: SelfDevExecutionSummary;
  readonly coverage: readonly string[];
}

export interface SelfDevEvaluatorOptions {
  readonly clock?: () => number;
}

function safeBaseSha(value: unknown): string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value) ? value : '0'.repeat(40);
}

function rejectionMetadata(value: unknown): { readonly candidateId: string; readonly candidateDigest: string; readonly baseNightwatchSha: string } {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    const candidateId = typeof raw.candidateId === 'string' && /^candidate:[0-9a-f]{64}$/.test(raw.candidateId) ? raw.candidateId : 'candidate:' + '0'.repeat(64);
    const candidateDigest = typeof raw.candidateDigest === 'string' && /^sha256:[0-9a-f]{64}$/.test(raw.candidateDigest)
      ? raw.candidateDigest
      : candidateId.startsWith('candidate:')
        ? `sha256:${candidateId.slice('candidate:'.length)}`
        : 'sha256:' + '0'.repeat(64);
    return { candidateId, candidateDigest, baseNightwatchSha: safeBaseSha(raw.baseNightwatchSha) };
  }
  return { candidateId: 'candidate:' + '0'.repeat(64), candidateDigest: 'sha256:' + '0'.repeat(64), baseNightwatchSha: '0'.repeat(40) };
}

function zeroVector(): SelfDevSafetyVector {
  return { ...ZERO_SELFDEV_SAFETY_VECTOR };
}

function isZeroVector(vector: SelfDevSafetyVector): boolean {
  return Object.values(vector).every((value) => value === 0);
}

export class SelfDevEvaluator {
  private readonly clock: () => number;
  private readonly state: EvaluationState = {
    candidateIds: new Set(),
    equivalentFingerprints: new Set([SELFDEV_BASELINE_EQUIVALENT_FINGERPRINT]),
    coveredCoverage: new Set(SELFDEV_BASELINE_COVERAGE),
  };

  constructor(options: SelfDevEvaluatorOptions = {}) {
    this.clock = options.clock ?? (() => performance.now());
  }

  validateCandidate(value: unknown): SelfDevCandidate {
    return validateCandidateDto(value);
  }

  checkDuplicate(candidate: SelfDevCandidate): boolean {
    return this.state.candidateIds.has(candidate.candidateId)
      || this.state.equivalentFingerprints.has(candidateEquivalentFingerprint(candidate));
  }

  resolveFixture(fixtureId: string): SelfDevFixtureDescriptor {
    return resolveSelfDevFixture(fixtureId);
  }

  resolveActions(actionIds: readonly string[]): readonly SelfDevActionDescriptor[] {
    return resolveSelfDevActions(actionIds);
  }

  resolveAssertions(assertionIds: readonly string[]): readonly SelfDevAssertionDescriptor[] {
    return resolveSelfDevAssertions(assertionIds);
  }

  evaluateCandidate(value: unknown): SelfDevEvaluation {
    const started = this.clock();
    let candidate: SelfDevCandidate;
    try {
      candidate = this.validateCandidate(value);
    } catch (error) {
      if (isSelfDevValidationError(error)) return this.produceRejected(value, resultClassForValidation(error), error.reasonCode, error.category === 'SAFETY' ? 'FAIL' : error.category === 'PRIVACY' ? 'FAIL' : 'NOT_CHECKED');
      return this.produceRejected(value, 'REJECTED_SCHEMA', 'SCHEMA_INVALID', 'NOT_CHECKED');
    }

    let fixture: SelfDevFixtureDescriptor;
    try {
      fixture = this.resolveFixture(candidate.fixtureId);
      assertSelfDevSourceRefs(candidate.sourceRefs);
      assertSelfDevCoverageClaims(candidate.coverageClaims);
    } catch (error) {
      if (error instanceof SelfDevRegistryError) {
        const resultClass: SelfDevResultClass = error.reasonCode === 'UNKNOWN_ACTION'
          ? 'REJECTED_UNKNOWN_ACTION'
          : error.reasonCode === 'UNKNOWN_ASSERTION'
            ? 'REJECTED_UNKNOWN_ASSERTION'
            : 'REJECTED_SCOPE';
        return this.produceRejected(candidate, resultClass, error.reasonCode, 'PASS');
      }
      return this.produceRejected(candidate, 'REJECTED_SCOPE', 'SCOPE_INVALID', 'PASS');
    }

    let actions: readonly SelfDevActionDescriptor[];
    try {
      actions = this.resolveActions(candidate.actionIds);
    } catch (error) {
      if (error instanceof SelfDevRegistryError) return this.produceRejected(candidate, 'REJECTED_UNKNOWN_ACTION', 'UNKNOWN_ACTION', 'PASS');
      return this.produceRejected(candidate, 'REJECTED_UNKNOWN_ACTION', 'UNKNOWN_ACTION', 'PASS');
    }

    let assertions: readonly SelfDevAssertionDescriptor[];
    try {
      assertions = this.resolveAssertions(candidate.assertionIds);
    } catch (error) {
      if (error instanceof SelfDevRegistryError) return this.produceRejected(candidate, 'REJECTED_UNKNOWN_ASSERTION', 'UNKNOWN_ASSERTION', 'PASS');
      return this.produceRejected(candidate, 'REJECTED_UNKNOWN_ASSERTION', 'UNKNOWN_ASSERTION', 'PASS');
    }

    const equivalentFingerprint = candidateEquivalentFingerprint(candidate);
    const semanticDuplicate = this.state.candidateIds.has(candidate.candidateId);
    const equivalentDuplicate = this.state.equivalentFingerprints.has(equivalentFingerprint);
    if (semanticDuplicate || equivalentDuplicate) {
      this.state.candidateIds.add(candidate.candidateId);
      this.state.equivalentFingerprints.add(equivalentFingerprint);
      return this.produceEvaluation(candidate, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'DUPLICATE',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'PASS',
        privacyStatus: 'PASS', coverageDelta: { added: [], count: 0 }, execution: null,
        reasonCode: semanticDuplicate ? 'DUPLICATE_SEMANTIC_IDENTITY' : 'DUPLICATE_COVERAGE',
        resultClass: 'REJECTED_DUPLICATE',
      });
    }

    let execution: ExecutionResult;
    try {
      execution = this.executeCandidate(candidate, fixture, actions);
    } catch {
      return this.produceEvaluation(candidate, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
        executionStatus: 'EXECUTED', regressionStatus: 'FAIL', safetyStatus: 'PASS',
        privacyStatus: 'PASS', coverageDelta: { added: [], count: 0 }, execution: null,
        reasonCode: 'FIXTURE_TRANSITION_INVALID', resultClass: 'EVALUATION_FAILED',
      });
    }

    const added = this.measureCoverageDelta(execution.coverage);
    const assertionsPass = this.evaluateAssertions(assertions, execution.summary);
    const overBudget = this.clock() - started > SELFDEV_BUDGET.maxCandidateRuntimeMs;
    const safetyPass = isZeroVector(candidate.safety);
    if (overBudget) {
      return this.produceEvaluation(candidate, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
        executionStatus: 'EXECUTED', regressionStatus: 'FAIL', safetyStatus: safetyPass ? 'PASS' : 'FAIL',
        privacyStatus: 'PASS', coverageDelta: added, execution: execution.summary,
        reasonCode: 'CANDIDATE_EVALUATION_BUDGET_EXCEEDED', resultClass: 'EVALUATION_FAILED',
      });
    }
    if (!assertionsPass) {
      return this.produceEvaluation(candidate, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
        executionStatus: 'EXECUTED', regressionStatus: 'FAIL', safetyStatus: 'PASS',
        privacyStatus: 'PASS', coverageDelta: added, execution: execution.summary,
        reasonCode: 'ASSERTION_FAILED', resultClass: 'EVALUATION_FAILED',
      });
    }
    if (added.count === 0) {
      this.state.candidateIds.add(candidate.candidateId);
      this.state.equivalentFingerprints.add(equivalentFingerprint);
      return this.produceEvaluation(candidate, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'DUPLICATE',
        executionStatus: 'EXECUTED', regressionStatus: 'PASS', safetyStatus: 'PASS',
        privacyStatus: 'PASS', coverageDelta: added, execution: execution.summary,
        reasonCode: 'DUPLICATE_COVERAGE', resultClass: 'REJECTED_DUPLICATE',
      });
    }

    this.state.candidateIds.add(candidate.candidateId);
    this.state.equivalentFingerprints.add(equivalentFingerprint);
    for (const coverageClass of added.added) this.state.coveredCoverage.add(coverageClass);
    return this.produceEvaluation(candidate, {
      validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
      executionStatus: 'EXECUTED', regressionStatus: 'PASS', safetyStatus: 'PASS',
      privacyStatus: 'PASS', coverageDelta: added, execution: execution.summary,
      reasonCode: 'VALIDATION_OK', resultClass: 'EVALUATED_PASS_NOT_ADOPTED',
    });
  }

  evaluateSession(values: readonly unknown[]): readonly SelfDevEvaluation[] {
    assertOwnerPolicyAllows('SELF_DEVELOPMENT_SYNTHETIC_EVALUATION');
    if (values.length > SELFDEV_BUDGET.maxCandidatesPerSession) throw new SelfDevSessionBudgetError();
    const started = this.clock();
    const results: SelfDevEvaluation[] = [];
    for (const value of values) {
      if (this.clock() - started > SELFDEV_BUDGET.maxSessionRuntimeMs) {
        results.push(this.produceRejected(value, 'EVALUATION_FAILED', 'SESSION_EVALUATION_BUDGET_EXCEEDED', 'NOT_CHECKED'));
      } else {
        results.push(this.evaluateCandidate(value));
      }
    }
    return results;
  }

  measureCoverageDelta(coverage: readonly string[]): SelfDevCoverageDelta {
    const added = [...new Set(coverage)].filter((coverageClass) => !this.state.coveredCoverage.has(coverageClass)).sort();
    return { added, count: added.length };
  }

  executeCandidate(candidate: SelfDevCandidate, fixture: SelfDevFixtureDescriptor, actions: readonly SelfDevActionDescriptor[]): ExecutionResult {
    let currentState: SelfDevStateId = fixture.initialStateId;
    let transitionClass = 'READ_ONLY_SEQUENCE';
    let oracleClass: 'STRUCTURAL_STABLE' = 'STRUCTURAL_STABLE';
    const coverage = new Set<string>();
    const transitionClasses: string[] = [];
    for (const action of actions) {
      if (action.fromStateId !== currentState) throw new Error('SELFDEV_FIXTURE_TRANSITION_INVALID');
      currentState = action.toStateId;
      transitionClass = action.transitionClass;
      transitionClasses.push(action.transitionClass);
      oracleClass = action.oracleClass;
      for (const coverageClass of action.coverageClasses) coverage.add(coverageClass);
    }
    const stableFingerprint = sha256Digest({
      fixtureId: candidate.fixtureId,
      initialStateId: fixture.initialStateId,
      actionIds: [...candidate.actionIds],
      transitionClasses,
      finalStateId: currentState,
      oracleClass,
    });
    return {
      summary: {
        initialStateId: fixture.initialStateId,
        finalStateId: currentState,
        transitionClass,
        oracleClass,
        stableFingerprint,
      },
      coverage: [...coverage].filter((coverageClass) => SELFDEV_COVERAGE_CLASSES.includes(coverageClass as (typeof SELFDEV_COVERAGE_CLASSES)[number])).sort(),
    };
  }

  private evaluateAssertions(assertions: readonly SelfDevAssertionDescriptor[], execution: SelfDevExecutionSummary): boolean {
    return assertions.every((assertion) => {
      if (assertion.assertionClass === 'EXPECTED_STATE_ID') return assertion.expectedValue === execution.finalStateId;
      if (assertion.assertionClass === 'EXPECTED_TRANSITION_CLASS') return assertion.expectedValue === execution.transitionClass;
      if (assertion.assertionClass === 'EXPECTED_ORACLE_CLASS') return assertion.expectedValue === execution.oracleClass;
      if (assertion.assertionClass === 'EXPECTED_STABLE_FINGERPRINT') return execution.stableFingerprint.startsWith(assertion.expectedValue);
      if (assertion.assertionClass === 'EXPECTED_SAFETY_VECTOR') return assertion.expectedValue === 'ZERO';
      return false;
    });
  }

  private produceRejected(value: unknown, resultClass: SelfDevResultClass, reasonCode: SelfDevReasonCode, gate: 'PASS' | 'FAIL' | 'NOT_CHECKED'): SelfDevEvaluation {
    const metadata = rejectionMetadata(value);
    return this.produceEvaluation({
      schemaVersion: SELFDEV_CANDIDATE_SCHEMA_VERSION,
      candidateId: metadata.candidateId,
      candidateKind: SELFDEV_CANDIDATE_KIND,
      generatorClass: SELFDEV_PROPOSER_CLASS,
      baseNightwatchSha: metadata.baseNightwatchSha,
      fixtureId: 'selfdev.rejected',
      targetSurface: 'LOCAL_SYNTHETIC',
      title: 'Rejected synthetic candidate',
      rationaleClass: 'BOUNDARY_REGRESSION',
      actionIds: [], assertionIds: [], coverageClaims: [], sourceRefs: [],
      safety: zeroVector(), publication: SELFDEV_PUBLICATION, adoptionAuthority: 'NONE',
    } as SelfDevCandidate, {
      validationStatus: resultClass === 'REJECTED_SCHEMA' || resultClass === 'REJECTED_SAFETY' || resultClass === 'REJECTED_PRIVACY' ? 'REJECTED' : 'PASS',
      scopeStatus: resultClass === 'REJECTED_SCOPE' ? 'REJECTED' : 'NOT_CHECKED',
      duplicateStatus: 'NOT_CHECKED', executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN',
      safetyStatus: resultClass === 'REJECTED_SAFETY' ? 'FAIL' : resultClass === 'REJECTED_PRIVACY' ? 'PASS' : gate,
      privacyStatus: resultClass === 'REJECTED_PRIVACY' ? 'FAIL' : resultClass === 'REJECTED_SAFETY' ? 'PASS' : gate,
      coverageDelta: { added: [], count: 0 }, execution: null, reasonCode, resultClass,
    }, metadata.candidateDigest);
  }

  private produceEvaluation(candidate: SelfDevCandidate, fields: Omit<SelfDevEvaluation, 'schemaVersion' | 'evaluationId' | 'candidateId' | 'candidateDigest' | 'baseNightwatchSha' | 'candidateKind' | 'adoptionStatus' | 'publication' | 'sourceWrites' | 'gitWrites' | 'externalCalls' | 'safetyVector'>, candidateDigestOverride?: string): SelfDevEvaluation {
    const base = {
      ...fields,
      schemaVersion: SELFDEV_EVALUATION_SCHEMA_VERSION,
      candidateId: candidate.candidateId,
      candidateDigest: candidateDigestOverride ?? candidateDigestFor(candidate),
      baseNightwatchSha: safeBaseSha(candidate.baseNightwatchSha),
      candidateKind: SELFDEV_CANDIDATE_KIND,
      adoptionStatus: SELFDEV_ADOPTION_STATUS,
      publication: SELFDEV_PUBLICATION,
      sourceWrites: 0 as const,
      gitWrites: 0 as const,
      externalCalls: 0 as const,
      safetyVector: zeroVector(),
    } satisfies Omit<SelfDevEvaluation, 'evaluationId'>;
    const evaluation = { ...base, evaluationId: evaluationIdFor(base) };
    return validateEvaluation(evaluation);
  }
}
