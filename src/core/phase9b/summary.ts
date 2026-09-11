// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — normalized safe semantic pass summaries (SPEC §24,
// §25, §36, §48, §49, §50).
//
// Each DEV observation (FIRST / REPLAY) is reduced to a SAFE summary:
// categorical counts per receipt outcome, invariant counts, and finding
// fingerprints — never raw values, never bodies, never query strings. The
// replay comparison compares only normalized safe fields (never receiptId
// equality, never raw values).
//
// DECISIVE (§25): a receipt is decisive when (outcome is PASS and
// invariantPassCount > 0) or the outcome is ANOMALY. A PARTIAL_COVERAGE
// receipt is INCOMPLETE coverage and must never be counted as decisive solely
// because some inspected invariants passed — partial coverage != full semantic
// acceptance. NOT_APPLICABLE-only, NO_EXPECTATION, PARTIAL_COVERAGE, and zero
// receipts are never decisive.
//
// This module is PURE: no network, no fs, no persistence (hardening-guarded).
// ---------------------------------------------------------------------------

// Phase 15P A15 convergence: evidence-digest validation reuses the canonical helper
// (byte-equivalent to the retired inline regex incl. null/non-string handling).
import { isEvidenceDigest } from '../../core/identity/canonicalDigest';
import type { SemanticEvaluationReceipt, SemanticEvidenceAcceptanceClass, SemanticReceiptOutcome } from '../../oracles/semantic/receipts';
import { DEFAULT_SEMANTIC_EVIDENCE_ACCEPTANCE_CLASS } from '../../oracles/semantic/receipts';
import { semanticFindingFingerprint, type SemanticOracleFinding } from '../../oracles/semantic';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
const PHASE_9B_SUMMARY_VERSION = 'nightwatch.phase9b-pass-summary.v1' as const;

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type Phase9bPassId = 'first' | 'replay';

export interface Phase9bSemanticSummary {
  readonly schemaVersion: typeof PHASE_9B_SUMMARY_VERSION;
  readonly passId: Phase9bPassId;
  /** The selected acceptance target identity. */
  readonly targetId: string;
  /** Receipts carrying this expectation id (may be null when unresolved). */
  readonly expectationId: string | null;
  /** Source identity of the evaluated expectation (from receipt provenance). */
  readonly sourceRepoId: string | null;
  readonly sourceSha: string | null;
  readonly evidenceDigest: string | null;
  /** Selected-target receipts that resolved an expectation. */
  readonly resolvedExpectationCount: number;
  /** Selected-target receipts. */
  readonly receiptCount: number;
  readonly passCount: number;
  readonly anomalyCount: number;
  readonly notApplicableCount: number;
  readonly noExpectationCount: number;
  readonly sourceStaleCount: number;
  readonly sourceUnavailableCount: number;
  readonly invalidInputCount: number;
  readonly projectionLimitExceededCount: number;
  readonly internalErrorCount: number;
  /** Selected-target partial-coverage receipts (collection-wide incomplete
   *  coverage). Never silent inside a generic failure count — explicit and
   *  categorical. PARTIAL_COVERAGE must never certify full acceptance. */
  readonly partialCoverageCount: number;
  /** Selected-target semantic findings. */
  readonly findingCount: number;
  /** Deterministic safe fingerprints of the selected-target findings. */
  readonly findingFingerprints: readonly string[];
  readonly findingCategories: readonly string[];
  /** Group 11 (F-10): the acceptance classes present among the selected-target
   *  receipts. A receipt that predates the field counts as LOCAL_SYNTHETIC.
   *  A DEV acceptance assertion requires exactly ['CONTAINED_DEV']. */
  readonly evidenceAcceptanceClasses: readonly SemanticEvidenceAcceptanceClass[];
  /** Invariant totals across selected-target receipts (safe counts). */
  readonly invariantTotal: number;
  readonly invariantPassCount: number;
  readonly invariantNaCount: number;
  readonly invariantViolationCount: number;
  /** Receipts that are semantically decisive (invariantPassCount > 0 or
   *  ANOMALY) — the acceptance gate per SPEC §25. */
  readonly decisiveEvaluationCount: number;
  /** Ledger totals across ALL evaluated responses (context-wide). */
  readonly ledgerReceiptCount: number;
  readonly ledgerOverflow: boolean;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase9bSummaryInput {
  readonly passId: Phase9bPassId;
  readonly receipts: readonly SemanticEvaluationReceipt[];
  /** All receipts recorded context-wide (may exceed the selected-target set). */
  readonly ledgerReceiptCount: number;
  readonly ledgerOverflow: boolean;
  readonly findings: readonly SemanticOracleFinding[];
  readonly targetId: string;
}

function outcomeCounts(receipts: readonly SemanticEvaluationReceipt[]): Record<SemanticReceiptOutcome, number> {
  const counts: Record<SemanticReceiptOutcome, number> = {
    PASS: 0,
    ANOMALY: 0,
    NOT_APPLICABLE: 0,
    NO_EXPECTATION: 0,
    EXPECTATION_SOURCE_STALE: 0,
    EXPECTATION_SOURCE_UNAVAILABLE: 0,
    INVALID_INPUT: 0,
    PROJECTION_LIMIT_EXCEEDED: 0,
    INTERNAL_ERROR: 0,
    PARTIAL_COVERAGE: 0,
  };
  for (const receipt of receipts) counts[receipt.outcome] += 1;
  return counts;
}

/** Reduce one pass's semantic evaluation ledger to a safe normalized summary.
 *  Scoped to the selected target; context-wide totals are reported as
 *  ledgerReceiptCount / ledgerOverflow. Never includes raw values. */
export function summarizePhase9bPass(input: Phase9bSummaryInput): Phase9bSemanticSummary {
  const selected = input.receipts.filter((receipt) => receipt.targetId === input.targetId);
  const counts = outcomeCounts(selected);
  const resolved = selected.filter((receipt) => receipt.expectationId !== undefined);
  const firstResolved = resolved[0];
  const provenance = firstResolved?.sourceProvenance;
  const selectedFindings = input.findings.filter(
    (finding) => finding.expectationId === (firstResolved?.expectationId ?? undefined)
  );
  const fingerprints = [...new Set(selectedFindings.map((finding) => semanticFindingFingerprint(finding)))].sort();
  const categories = [...new Set(selectedFindings.map((finding) => finding.category))].sort();
  const evidenceAcceptanceClasses = [
    ...new Set(selected.map((receipt) => receipt.acceptanceClass ?? DEFAULT_SEMANTIC_EVIDENCE_ACCEPTANCE_CLASS)),
  ].sort();
  let invariantTotal = 0;
  let invariantPassCount = 0;
  let invariantNaCount = 0;
  let invariantViolationCount = 0;
  for (const receipt of selected) {
    invariantTotal += receipt.invariantTotal;
    invariantPassCount += receipt.invariantPassCount;
    invariantNaCount += receipt.invariantNaCount;
    invariantViolationCount += receipt.invariantViolationCount;
  }
  const decisiveEvaluationCount = selected.filter(
    (receipt) =>
      (receipt.outcome === 'PASS' && receipt.invariantPassCount > 0) ||
      receipt.outcome === 'ANOMALY'
  ).length;
  return {
    schemaVersion: PHASE_9B_SUMMARY_VERSION,
    passId: input.passId,
    targetId: input.targetId,
    expectationId: firstResolved?.expectationId ?? null,
    sourceRepoId: provenance?.repoId ?? null,
    sourceSha: provenance?.sha ?? null,
    evidenceDigest: provenance?.evidenceDigest ?? null,
    resolvedExpectationCount: resolved.length,
    receiptCount: selected.length,
    passCount: counts.PASS,
    anomalyCount: counts.ANOMALY,
    notApplicableCount: counts.NOT_APPLICABLE,
    noExpectationCount: counts.NO_EXPECTATION,
    sourceStaleCount: counts.EXPECTATION_SOURCE_STALE,
    sourceUnavailableCount: counts.EXPECTATION_SOURCE_UNAVAILABLE,
    invalidInputCount: counts.INVALID_INPUT,
    projectionLimitExceededCount: counts.PROJECTION_LIMIT_EXCEEDED,
    internalErrorCount: counts.INTERNAL_ERROR,
    partialCoverageCount: counts.PARTIAL_COVERAGE,
    findingCount: selectedFindings.length,
    findingFingerprints: fingerprints,
    findingCategories: categories,
    evidenceAcceptanceClasses,
    invariantTotal,
    invariantPassCount,
    invariantNaCount,
    invariantViolationCount,
    decisiveEvaluationCount,
    ledgerReceiptCount: input.ledgerReceiptCount,
    ledgerOverflow: input.ledgerOverflow,
  };
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase9bReplayComparison {
  readonly pass: boolean;
  readonly mismatches: readonly string[];
}

/** Compare the FIRST and REPLAY summaries on normalized safe fields only.
 *  receiptId equality is deliberately NOT required (run-local safe metadata
 *  may differ); raw values never participate. */
export function comparePhase9bReplaySummaries(
  first: Phase9bSemanticSummary,
  replay: Phase9bSemanticSummary
): Phase9bReplayComparison {
  const mismatches: string[] = [];
  const compare = (label: string, a: unknown, b: unknown): void => {
    if (a !== b) mismatches.push(`${label}: ${String(a)} != ${String(b)}`);
  };
  compare('targetId', first.targetId, replay.targetId);
  compare('expectationId', first.expectationId, replay.expectationId);
  compare('sourceRepoId', first.sourceRepoId, replay.sourceRepoId);
  compare('sourceSha', first.sourceSha, replay.sourceSha);
  compare('evidenceDigest', first.evidenceDigest, replay.evidenceDigest);
  compare('outcome PASS count', first.passCount, replay.passCount);
  compare('outcome ANOMALY count', first.anomalyCount, replay.anomalyCount);
  compare('outcome NOT_APPLICABLE count', first.notApplicableCount, replay.notApplicableCount);
  compare('outcome PARTIAL_COVERAGE count', first.partialCoverageCount, replay.partialCoverageCount);
  compare('invariantTotal', first.invariantTotal, replay.invariantTotal);
  compare('invariantPassCount', first.invariantPassCount, replay.invariantPassCount);
  compare('invariantNaCount', first.invariantNaCount, replay.invariantNaCount);
  compare('invariantViolationCount', first.invariantViolationCount, replay.invariantViolationCount);
  compare('finding fingerprints', JSON.stringify(first.findingFingerprints), JSON.stringify(replay.findingFingerprints));
  compare('evidence acceptance classes', JSON.stringify(first.evidenceAcceptanceClasses), JSON.stringify(replay.evidenceAcceptanceClasses));
  return { pass: mismatches.length === 0, mismatches };
}

export interface Phase9bAcceptanceChecks {
  readonly pass: boolean;
  readonly failures: readonly string[];
}

/** One-pass acceptance gate (SPEC §25, §49, §50): a pass is proven only with
 *  resolved expectation + receipt + decisive evaluation, zero hard outcomes
 *  on the selected target, zero partial-coverage (incomplete) receipts, and
 *  the exact expectation/source binding. PARTIAL_COVERAGE never certifies full
 *  acceptance — partial coverage != full semantic acceptance. */
export function evaluatePhase9bAcceptance(
  summary: Phase9bSemanticSummary,
  expected: { expectationId: string; approvedSha: string }
): Phase9bAcceptanceChecks {
  const failures: string[] = [];
  if (summary.resolvedExpectationCount < 1) failures.push('resolved expectations < 1');
  if (summary.receiptCount < 1) failures.push('semantic receipts < 1');
  if (summary.decisiveEvaluationCount < 1) failures.push('decisive evaluations < 1');
  if (summary.noExpectationCount !== 0) failures.push(`NO_EXPECTATION count ${summary.noExpectationCount} != 0`);
  if (summary.sourceStaleCount !== 0) failures.push(`SOURCE_STALE count ${summary.sourceStaleCount} != 0`);
  if (summary.sourceUnavailableCount !== 0) failures.push(`SOURCE_UNAVAILABLE count ${summary.sourceUnavailableCount} != 0`);
  if (summary.invalidInputCount !== 0) failures.push(`INVALID_INPUT count ${summary.invalidInputCount} != 0`);
  if (summary.projectionLimitExceededCount !== 0) failures.push(`PROJECTION_LIMIT_EXCEEDED count ${summary.projectionLimitExceededCount} != 0`);
  if (summary.internalErrorCount !== 0) failures.push(`INTERNAL_ERROR count ${summary.internalErrorCount} != 0`);
  if (summary.partialCoverageCount !== 0) failures.push(`PARTIAL_COVERAGE count ${summary.partialCoverageCount} != 0`);
  if (summary.expectationId !== expected.expectationId) failures.push(`expectationId ${summary.expectationId} != ${expected.expectationId}`);
  if (summary.sourceSha !== expected.approvedSha) failures.push(`source SHA ${summary.sourceSha} != ${expected.approvedSha}`);
  if (!isEvidenceDigest(summary.evidenceDigest)) {
    failures.push('source evidence digest missing or malformed');
  }
  return { pass: failures.length === 0, failures };
}
