// ---------------------------------------------------------------------------
// W8 efficacy metrics derivation.
//
// Every number here is derived from Nightwatch-observed state: the runtime
// action log / hypothesis set / candidate set, the tool-session history
// (inspected sources + reproduction receipts), and the existing benchmark
// score. Nothing is taken from model prose, and no hidden ground truth is
// read: the caller passes the already-computed benchmark outcome.
//
// Pure functions. No fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import type { BenchmarkOutcome } from '../agentProtocol/benchmark';
import { BENCHMARK_OUTCOMES } from '../agentProtocol/benchmark';
import type { AgentTerminationReason } from '../agentProtocol/intents';
import type { AgentActionRecord, AgentRuntimeState } from '../agentProtocol/runtime';
import type { BenchmarkVerificationTier } from '../benchmark/score';
import type { LocalInvestigationHistory } from '../localInvestigation/types';
import {
  EFFICACY_METRICS_VERSION,
  type EfficacyAggregate,
  type EfficacyCaseMetrics,
  type EfficacyComparison,
  type EfficacyContextMode,
} from './types';

/** Result classes that mean the reproduction request never reached a provider. */
const REPRODUCTION_REFUSAL_CLASSES: ReadonlySet<string> = new Set([
  'UNSAFE_INTENT',
  'MALFORMED_ARGUMENTS',
  'ADAPTER_UNAVAILABLE',
  'UNKNOWN_TOOL',
  'UNAUTHORIZED_ENVIRONMENT',
  'TOOL_ERROR',
  'DEDUPED_REPEAT',
]);

export interface DeriveEfficacyCaseInput {
  readonly caseId: string;
  readonly mode: EfficacyContextMode;
  readonly state: AgentRuntimeState;
  readonly terminationReason: AgentTerminationReason;
  /** Tool-session history when the run used the shared session executor. */
  readonly history: LocalInvestigationHistory | null;
  readonly negativeControl: boolean;
  readonly outcome: BenchmarkOutcome;
  readonly verifiedTier: BenchmarkVerificationTier;
  readonly exactRediscovery: boolean;
  readonly leaked: readonly string[];
}

function turnOrdinals(actionLog: readonly AgentActionRecord[]): ReadonlyMap<string, number> {
  const ordinals = new Map<string, number>();
  for (const record of actionLog) {
    if (!ordinals.has(record.turnId)) ordinals.set(record.turnId, ordinals.size + 1);
  }
  return ordinals;
}

function firstTurnMatching(
  actionLog: readonly AgentActionRecord[],
  ordinals: ReadonlyMap<string, number>,
  predicate: (record: AgentActionRecord) => boolean,
): number | null {
  for (const record of actionLog) {
    if (predicate(record)) return ordinals.get(record.turnId) ?? null;
  }
  return null;
}

/** Evidence refs minted by an inspected SOURCE_FILE read: the only refs that ground a reproduction. */
function inspectedSourceRefs(
  actionLog: readonly AgentActionRecord[],
  history: LocalInvestigationHistory | null,
): ReadonlySet<string> {
  const refs = new Set<string>();
  if (history !== null) {
    for (const entry of history.inspectedSources) refs.add(entry.evidenceRef);
    return refs;
  }
  for (const record of actionLog) {
    if (record.toolId === 'INSPECT_SOURCE_SURFACE' && record.resultClass === 'SOURCE_FILE') {
      for (const ref of record.evidenceRefs) refs.add(ref);
    }
  }
  return refs;
}

export function deriveEfficacyCaseMetrics(input: DeriveEfficacyCaseInput): EfficacyCaseMetrics {
  const state = input.state;
  const actionLog = state.actionLog;
  const ordinals = turnOrdinals(actionLog);
  const history = input.history;

  const observedRefs = new Set(state.evidenceRefs);
  const sourceRefs = inspectedSourceRefs(actionLog, history);

  const sourceActions = actionLog.filter((record) => record.toolId === 'INSPECT_SOURCE_SURFACE');
  const indexRequests = sourceActions.filter((record) => record.resultClass === 'SOURCE_INDEX').length;

  const dedupedRepeatActions = actionLog.filter((record) => record.resultClass === 'DEDUPED_REPEAT').length;
  // A read attempt is any INSPECT_SOURCE_SURFACE action that was not the
  // bounded-index call: successful reads, refusals, and deduplicated repeats.
  const sourceReadAttempts = sourceActions.length - indexRequests;
  const uniqueSourceTargets =
    history !== null
      ? new Set(history.inspectedSources.map((entry) => entry.path)).size
      : new Set(
        sourceActions
          .filter((record) => record.resultClass === 'SOURCE_FILE')
          .map((record) => record.argumentDigest ?? ''),
      ).size;
  const repeatSourceReads = Math.max(0, sourceReadAttempts - uniqueSourceTargets);
  const repeatTargetRate = sourceReadAttempts === 0 ? 0 : repeatSourceReads / sourceReadAttempts;

  const hypotheses = state.hypotheses;
  const groundedHypotheses = hypotheses.filter((item) =>
    item.evidenceRefs.some((ref) => observedRefs.has(ref)),
  ).length;
  const verificationReadyHypotheses = hypotheses.filter((item) =>
    item.evidenceRefs.some((ref) => sourceRefs.has(ref)),
  ).length;
  const disprovedHypotheses = hypotheses.filter((item) => item.status === 'DISPROVED').length;

  const reproductionActions = actionLog.filter((record) => record.toolId === 'RERUN_SAFE_REPRODUCTION');
  const refusedReproductionAttempts = reproductionActions.filter((record) =>
    REPRODUCTION_REFUSAL_CLASSES.has(record.resultClass),
  ).length;
  const groundedReproductionAttempts =
    history !== null
      ? history.reproductions.length
      : reproductionActions.length - refusedReproductionAttempts;
  const mechanicalReproductions =
    history !== null
      ? history.reproductions.filter((receipt) => receipt.verdict === 'REPRODUCED').length
      : reproductionActions.filter((record) => record.resultClass === 'REPRODUCED').length;

  const candidatesProposed = actionLog.filter((record) => record.resultClass === 'CANDIDATE_PROPOSED').length;

  return {
    schemaVersion: EFFICACY_METRICS_VERSION,
    caseId: input.caseId,
    mode: input.mode,
    terminationReason: input.terminationReason,
    negativeControl: input.negativeControl,

    reasonerCalls: state.budget.usage.reasonerCalls,
    toolActions: state.budget.usage.toolActions,
    turns: ordinals.size,

    uniqueSourceTargets,
    sourceReadAttempts,
    repeatSourceReads,
    repeatTargetRate,
    indexRequests,
    redundantIndexRequests: Math.max(0, indexRequests - 1),
    dedupedRepeatActions,

    evidenceGained: state.evidenceRefs.length,
    hypothesesFormed: hypotheses.length,
    groundedHypotheses,
    verificationReadyHypotheses,
    disprovedHypotheses,

    reproductionAttempts: reproductionActions.length,
    groundedReproductionAttempts,
    refusedReproductionAttempts,
    mechanicalReproductions,

    candidatesProposed,
    candidatesAdmitted: state.candidateIds.length,
    falsePositive: input.outcome === 'FALSE_POSITIVE',
    outcome: input.outcome,
    verifiedTier: input.verifiedTier,
    exactRediscovery: input.exactRediscovery,
    leaked: Object.freeze([...input.leaked]),

    turnsToFirstEvidence: firstTurnMatching(actionLog, ordinals, (record) => record.evidenceRefs.length > 0),
    turnsToFirstGroundedHypothesis: firstTurnMatching(
      actionLog,
      ordinals,
      (record) =>
        record.intentKind === 'FORM_HYPOTHESIS' &&
        record.resultClass === 'HYPOTHESIS_FORMED' &&
        record.evidenceRefs.some((ref) => observedRefs.has(ref)),
    ),
    turnsToFirstReproduction: firstTurnMatching(
      actionLog,
      ordinals,
      (record) => record.toolId === 'RERUN_SAFE_REPRODUCTION' && record.resultClass === 'REPRODUCED',
    ),
    turnsToFirstCandidate: firstTurnMatching(
      actionLog,
      ordinals,
      (record) => record.resultClass === 'CANDIDATE_PROPOSED',
    ),

    stagnationTerminated: input.terminationReason === 'NO_PROGRESS',
  };
}

function zeroOutcomeCounts(): Record<BenchmarkOutcome, number> {
  const counts = {} as Record<BenchmarkOutcome, number>;
  for (const outcome of BENCHMARK_OUTCOMES) counts[outcome] = 0;
  return counts;
}

export function aggregateEfficacyMetrics(cases: readonly EfficacyCaseMetrics[]): EfficacyAggregate {
  const outcomeCounts = zeroOutcomeCounts();
  let sourceReadAttempts = 0;
  const totals = {
    reasonerCalls: 0,
    toolActions: 0,
    uniqueSourceTargets: 0,
    repeatSourceReads: 0,
    redundantIndexRequests: 0,
    dedupedRepeatActions: 0,
    evidenceGained: 0,
    hypothesesFormed: 0,
    groundedHypotheses: 0,
    verificationReadyHypotheses: 0,
    disprovedHypotheses: 0,
    reproductionAttempts: 0,
    groundedReproductionAttempts: 0,
    refusedReproductionAttempts: 0,
    mechanicalReproductions: 0,
    candidatesProposed: 0,
    candidatesAdmitted: 0,
    falsePositives: 0,
    exactRediscoveries: 0,
    verifiedRootCauseRediscoveries: 0,
    stagnationTerminations: 0,
    leakedCases: 0,
    negativeControls: 0,
  };
  for (const item of cases) {
    outcomeCounts[item.outcome] += 1;
    sourceReadAttempts += item.sourceReadAttempts;
    totals.reasonerCalls += item.reasonerCalls;
    totals.toolActions += item.toolActions;
    totals.uniqueSourceTargets += item.uniqueSourceTargets;
    totals.repeatSourceReads += item.repeatSourceReads;
    totals.redundantIndexRequests += item.redundantIndexRequests;
    totals.dedupedRepeatActions += item.dedupedRepeatActions;
    totals.evidenceGained += item.evidenceGained;
    totals.hypothesesFormed += item.hypothesesFormed;
    totals.groundedHypotheses += item.groundedHypotheses;
    totals.verificationReadyHypotheses += item.verificationReadyHypotheses;
    totals.disprovedHypotheses += item.disprovedHypotheses;
    totals.reproductionAttempts += item.reproductionAttempts;
    totals.groundedReproductionAttempts += item.groundedReproductionAttempts;
    totals.refusedReproductionAttempts += item.refusedReproductionAttempts;
    totals.mechanicalReproductions += item.mechanicalReproductions;
    totals.candidatesProposed += item.candidatesProposed;
    totals.candidatesAdmitted += item.candidatesAdmitted;
    if (item.falsePositive) totals.falsePositives += 1;
    if (item.exactRediscovery) totals.exactRediscoveries += 1;
    if (item.verifiedTier === 'VERIFIED_ROOT_CAUSE_REDISCOVERY') totals.verifiedRootCauseRediscoveries += 1;
    if (item.stagnationTerminated) totals.stagnationTerminations += 1;
    if (item.leaked.length > 0) totals.leakedCases += 1;
    if (item.negativeControl) totals.negativeControls += 1;
  }
  return {
    cases: cases.length,
    negativeControls: totals.negativeControls,
    reasonerCalls: totals.reasonerCalls,
    toolActions: totals.toolActions,
    uniqueSourceTargets: totals.uniqueSourceTargets,
    repeatSourceReads: totals.repeatSourceReads,
    repeatTargetRate: sourceReadAttempts === 0 ? 0 : totals.repeatSourceReads / sourceReadAttempts,
    redundantIndexRequests: totals.redundantIndexRequests,
    dedupedRepeatActions: totals.dedupedRepeatActions,
    evidenceGained: totals.evidenceGained,
    hypothesesFormed: totals.hypothesesFormed,
    groundedHypotheses: totals.groundedHypotheses,
    verificationReadyHypotheses: totals.verificationReadyHypotheses,
    disprovedHypotheses: totals.disprovedHypotheses,
    reproductionAttempts: totals.reproductionAttempts,
    groundedReproductionAttempts: totals.groundedReproductionAttempts,
    refusedReproductionAttempts: totals.refusedReproductionAttempts,
    mechanicalReproductions: totals.mechanicalReproductions,
    candidatesProposed: totals.candidatesProposed,
    candidatesAdmitted: totals.candidatesAdmitted,
    falsePositives: totals.falsePositives,
    exactRediscoveries: totals.exactRediscoveries,
    verifiedRootCauseRediscoveries: totals.verifiedRootCauseRediscoveries,
    stagnationTerminations: totals.stagnationTerminations,
    stagnationRate: cases.length === 0 ? 0 : totals.stagnationTerminations / cases.length,
    leakedCases: totals.leakedCases,
    outcomeCounts: Object.freeze(outcomeCounts),
  };
}

export function compareEfficacy(
  baseline: EfficacyAggregate,
  candidate: EfficacyAggregate,
): EfficacyComparison {
  return {
    baseline,
    candidate,
    uniqueSourceTargetsDelta: candidate.uniqueSourceTargets - baseline.uniqueSourceTargets,
    repeatTargetRateDelta: candidate.repeatTargetRate - baseline.repeatTargetRate,
    redundantIndexRequestsDelta: candidate.redundantIndexRequests - baseline.redundantIndexRequests,
    groundedHypothesesDelta: candidate.groundedHypotheses - baseline.groundedHypotheses,
    verificationReadyHypothesesDelta:
      candidate.verificationReadyHypotheses - baseline.verificationReadyHypotheses,
    groundedReproductionAttemptsDelta:
      candidate.groundedReproductionAttempts - baseline.groundedReproductionAttempts,
    mechanicalReproductionsDelta: candidate.mechanicalReproductions - baseline.mechanicalReproductions,
    candidatesAdmittedDelta: candidate.candidatesAdmitted - baseline.candidatesAdmitted,
    falsePositivesDelta: candidate.falsePositives - baseline.falsePositives,
    stagnationRateDelta: candidate.stagnationRate - baseline.stagnationRate,
    exactRediscoveriesDelta: candidate.exactRediscoveries - baseline.exactRediscoveries,
    verifiedRootCauseRediscoveriesDelta:
      candidate.verifiedRootCauseRediscoveries - baseline.verifiedRootCauseRediscoveries,
    leakedCasesDelta: candidate.leakedCases - baseline.leakedCases,
  };
}
