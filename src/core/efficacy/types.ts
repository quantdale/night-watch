// ---------------------------------------------------------------------------
// W8 efficacy measurement vocabulary.
//
// Pure data. This module measures OUTCOMES of an autonomous investigation
// (distinct targets, grounded hypotheses, verification, mechanical
// reproduction, admission, false positives) — never activity volume.
//
// No hidden benchmark ground truth may enter any type declared here that is
// reachable from reasoner-visible state. These records are harness-side
// reporting only.
// ---------------------------------------------------------------------------

import type { BenchmarkOutcome } from '../agentProtocol/benchmark';
import type { AgentTerminationReason } from '../agentProtocol/intents';
import type { BenchmarkVerificationTier } from '../benchmark/score';

export const EFFICACY_METRICS_VERSION = 'nightwatch.efficacy-metrics.v1' as const;
export const EFFICACY_CORPUS_REPORT_VERSION = 'nightwatch.efficacy-corpus-report.v1' as const;

/**
 * Which reasoner-visible request surface the investigator was given.
 *
 * `W7_BASELINE` projects every turn request down to the exact W7 observation
 * field set, so a before/after comparison runs the SAME investigator policy,
 * the SAME corpus and the SAME substrate at one commit. `W8_MEMORY` passes the
 * request through untouched.
 */
export const EFFICACY_CONTEXT_MODES = ['W7_BASELINE', 'W8_MEMORY'] as const;
export type EfficacyContextMode = (typeof EFFICACY_CONTEXT_MODES)[number];

/** Per-case outcome record. Every field is mechanically derived, never asserted by a model. */
export interface EfficacyCaseMetrics {
  readonly schemaVersion: typeof EFFICACY_METRICS_VERSION;
  readonly caseId: string;
  readonly mode: EfficacyContextMode;
  readonly terminationReason: AgentTerminationReason;
  readonly negativeControl: boolean;

  // Activity (context for the outcome numbers, never a success signal).
  readonly reasonerCalls: number;
  readonly toolActions: number;
  readonly turns: number;

  // Target selection quality.
  readonly uniqueSourceTargets: number;
  readonly sourceReadAttempts: number;
  readonly repeatSourceReads: number;
  /** repeatSourceReads / sourceReadAttempts, 0 when no read was attempted. */
  readonly repeatTargetRate: number;
  readonly indexRequests: number;
  readonly redundantIndexRequests: number;
  readonly dedupedRepeatActions: number;

  // Evidence and hypothesis progression.
  readonly evidenceGained: number;
  readonly hypothesesFormed: number;
  readonly groundedHypotheses: number;
  readonly verificationReadyHypotheses: number;
  readonly disprovedHypotheses: number;

  // Verification / reproduction.
  readonly reproductionAttempts: number;
  readonly groundedReproductionAttempts: number;
  readonly refusedReproductionAttempts: number;
  readonly mechanicalReproductions: number;

  // Admission and correctness.
  readonly candidatesProposed: number;
  readonly candidatesAdmitted: number;
  readonly falsePositive: boolean;
  readonly outcome: BenchmarkOutcome;
  readonly verifiedTier: BenchmarkVerificationTier;
  readonly exactRediscovery: boolean;
  readonly leaked: readonly string[];

  // Cost-to-progress (turn ordinals, 1-based; null when never reached).
  readonly turnsToFirstEvidence: number | null;
  readonly turnsToFirstGroundedHypothesis: number | null;
  readonly turnsToFirstReproduction: number | null;
  readonly turnsToFirstCandidate: number | null;

  readonly stagnationTerminated: boolean;
}

export interface EfficacyAggregate {
  readonly cases: number;
  readonly negativeControls: number;
  readonly reasonerCalls: number;
  readonly toolActions: number;
  readonly uniqueSourceTargets: number;
  readonly repeatSourceReads: number;
  readonly repeatTargetRate: number;
  readonly redundantIndexRequests: number;
  readonly dedupedRepeatActions: number;
  readonly evidenceGained: number;
  readonly hypothesesFormed: number;
  readonly groundedHypotheses: number;
  readonly verificationReadyHypotheses: number;
  readonly disprovedHypotheses: number;
  readonly reproductionAttempts: number;
  readonly groundedReproductionAttempts: number;
  readonly refusedReproductionAttempts: number;
  readonly mechanicalReproductions: number;
  readonly candidatesProposed: number;
  readonly candidatesAdmitted: number;
  readonly falsePositives: number;
  readonly exactRediscoveries: number;
  readonly verifiedRootCauseRediscoveries: number;
  readonly stagnationTerminations: number;
  readonly stagnationRate: number;
  readonly leakedCases: number;
  readonly outcomeCounts: Readonly<Record<BenchmarkOutcome, number>>;
}

export interface EfficacyCorpusReport {
  readonly schemaVersion: typeof EFFICACY_CORPUS_REPORT_VERSION;
  readonly mode: EfficacyContextMode;
  readonly investigatorId: string;
  readonly corpusIds: readonly string[];
  readonly cases: readonly EfficacyCaseMetrics[];
  readonly aggregate: EfficacyAggregate;
}

/** Signed deltas of the outcome metrics that matter. Positive = W8 better, except where noted. */
export interface EfficacyComparison {
  readonly baseline: EfficacyAggregate;
  readonly candidate: EfficacyAggregate;
  readonly uniqueSourceTargetsDelta: number;
  /** Negative is better. */
  readonly repeatTargetRateDelta: number;
  /** Negative is better. */
  readonly redundantIndexRequestsDelta: number;
  readonly groundedHypothesesDelta: number;
  readonly verificationReadyHypothesesDelta: number;
  readonly groundedReproductionAttemptsDelta: number;
  readonly mechanicalReproductionsDelta: number;
  readonly candidatesAdmittedDelta: number;
  /** Must be <= 0 for the comparison to be acceptable. */
  readonly falsePositivesDelta: number;
  /** Negative is better. */
  readonly stagnationRateDelta: number;
  readonly exactRediscoveriesDelta: number;
  readonly verifiedRootCauseRediscoveriesDelta: number;
  /** Must be 0: leakage may never increase. */
  readonly leakedCasesDelta: number;
}
