// ---------------------------------------------------------------------------
// Autonomous AgentRuntime state machine freeze.
// Lane A implements the loop. Lane H is merged into Lane A.
// This module is types + budget arithmetic only. No I/O.
// ---------------------------------------------------------------------------

import { AGENT_BUDGET_VERSION, AGENT_CHECKPOINT_VERSION, AGENT_RUNTIME_STATE_VERSION } from './versions';
import type { ReproductionSurfaceEntry } from '../reproductionSurface/contracts';

export { AGENT_BUDGET_VERSION, AGENT_CHECKPOINT_VERSION, AGENT_RUNTIME_STATE_VERSION };

export const AGENT_PHASES = [
  'PLAN',
  'OBSERVE',
  'ANALYZE',
  'HYPOTHESIZE',
  'VERIFY',
  'TRIAGE',
  'REPLAN',
] as const;
export type AgentPhase = (typeof AGENT_PHASES)[number];

export const AGENT_RUNTIME_STATUSES = [
  'READY',
  'RUNNING',
  'PAUSED',
  'CHECKPOINTING',
  'TERMINATED',
] as const;
export type AgentRuntimeStatus = (typeof AGENT_RUNTIME_STATUSES)[number];

export const AGENT_BUDGET_CEILINGS = {
  HOUR_1: 3_600_000,
  HOUR_4: 14_400_000,
  HOUR_8: 28_800_000,
  OVERNIGHT: 43_200_000,
} as const;
export type AgentBudgetCeilingName = keyof typeof AGENT_BUDGET_CEILINGS;

export interface AgentBudgetPolicy {
  readonly schemaVersion: typeof AGENT_BUDGET_VERSION;
  readonly ceilingName: AgentBudgetCeilingName;
  readonly wallTimeMs: number;
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  /**
   * Lane D: executor-reported pre-truncation tool result bytes get their own
   * ceiling. `outputBytes` charges provider transport only, so a tool-heavy
   * local campaign is bounded by this dimension instead of tripping the
   * model-output guard on source reads it never generated.
   */
  readonly toolPayloadBytes: number;
  readonly toolActions: number;
  readonly perActionTimeoutMs: number;
  readonly candidateCap: number;
  readonly retries: number;
  readonly consecutiveFailures: number;
  readonly providerFailures: number;
}

export interface AgentBudgetUsage {
  readonly wallTimeMs: number;
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  /** Cumulative executor-reported pre-truncation tool result bytes. */
  readonly toolPayloadBytes: number;
  readonly toolActions: number;
  readonly candidateCount: number;
  readonly retries: number;
  readonly consecutiveFailures: number;
  readonly providerFailures: number;
}

export interface AgentBudgetSnapshot {
  readonly policy: AgentBudgetPolicy;
  readonly usage: AgentBudgetUsage;
}

/**
 * W9 frozen vocabulary: host-owned disposition of a FAILED tool action.
 *
 * W8 collapsed every `ok:false` executor result into one `TOOL_ERROR` class
 * and treated any repeat of that fingerprint as permanently exhausted. That
 * is correct for a deterministic refusal (malformed arguments, unapproved
 * path, ungrounded reproduction) and wrong for a transient one (a file
 * rotated between index and read, a provider that threw on a filesystem
 * race, a stale-HEAD re-check). The disposition is set by the EXECUTOR, never
 * by the reasoner and never derived from model-supplied argument text.
 */
export const ACTION_FAILURE_DISPOSITIONS = [
  'DETERMINISTIC_TERMINAL',
  'ENVIRONMENT_BLOCKED',
  'TRANSIENT_RETRYABLE',
] as const;
export type ActionFailureDisposition = (typeof ACTION_FAILURE_DISPOSITIONS)[number];
/**
 * Strict host-owned disposition guard. Only the three frozen values pass;
 * everything else (including null/undefined/unknown strings) is rejected.
 * The executor is the sole authority: reasoner intents never carry this
 * field and validate.ts never reads it from model output.
 */
export function isActionFailureDisposition(value: unknown): value is ActionFailureDisposition {
  return typeof value === 'string' && (ACTION_FAILURE_DISPOSITIONS as readonly string[]).includes(value);
}

/**
 * Fail-closed normalization for executor-supplied dispositions. Valid frozen
 * values are kept; absent or unknown values become undefined (callers read
 * absence as DETERMINISTIC_TERMINAL, preserving W8 exhaustion exactly).
 */
export function normalizeActionFailureDisposition(value: unknown): ActionFailureDisposition | undefined {
  return isActionFailureDisposition(value) ? value : undefined;
}

/**
 * Strict finite retry budget for one action fingerprint whose failures are
 * classified transient. Exceeding it exhausts the fingerprint exactly like a
 * deterministic refusal, so a flapping environment cannot spin forever.
 */
export const TRANSIENT_ACTION_RETRY_BUDGET = 2 as const;

export const AGENT_BYTE_LEDGER_VERSION = 'nightwatch.agent-byte-ledger.v1' as const;

/**
 * W9 exact component byte accounting. `AgentBudgetUsage` remains the
 * authoritative cumulative budget surface. This ledger explains those totals
 * and separately measures bytes that are useful evidence but are not charged.
 *
 * Charged input:
 *   legacyInputBytes + renderedInputBytes
 * Charged output (provider transport only):
 *   legacyOutputBytes + providerResponseBytes + providerStderrBytes
 * Charged tool payload:
 *   legacyToolPayloadBytes + toolResultBytes
 *
 * `reasonerOutputBytes` is the canonical parsed response. It is the same
 * document already represented by providerResponseBytes and is therefore
 * measured, never charged twice. `requestMemoryBytes`,
 * `requestUntrustedBytes`, `toolEnvelopeBytes`, and `checkpointBytes` are also
 * measured-only. Checkpoint bytes count exact generated/persisted UTF-8
 * documents according to the checkpoint codec's non-recursive fixed point.
 *
 * Legacy fields carry otherwise unattributable cumulative usage from a valid
 * pre-W9 checkpoint. They prevent resume from inventing component attribution
 * while preserving exact cumulative totals.
 */
export interface AgentByteLedger {
  readonly schemaVersion: typeof AGENT_BYTE_LEDGER_VERSION;
  readonly legacyInputBytes: number;
  readonly legacyOutputBytes: number;
  /**
   * Lane D: unattributable pre-restore tool payload, mirroring the legacy
   * input/output carry. Present so all three charged identities reconcile
   * exactly after every resume path; zero on fresh runs.
   */
  readonly legacyToolPayloadBytes: number;
  readonly renderedInputBytes: number;
  readonly requestMemoryBytes: number;
  readonly requestUntrustedBytes: number;
  /** Raw provider stdout bytes: the CLI transport response. */
  readonly providerResponseBytes: number;
  readonly providerStderrBytes: number;
  /** Canonical parsed reasoner response bytes; measured, not charged twice. */
  readonly reasonerOutputBytes: number;
  /** Executor-reported pre-truncation output bytes; charged to tool payload. */
  readonly toolResultBytes: number;
  /** Serialized bounded untrusted envelopes produced by tools; measured. */
  readonly toolEnvelopeBytes: number;
  /** Exact bytes of checkpoint documents generated or persisted. */
  readonly checkpointBytes: number;
}

export const ZERO_AGENT_BYTE_LEDGER: AgentByteLedger = Object.freeze({
  schemaVersion: AGENT_BYTE_LEDGER_VERSION,
  legacyInputBytes: 0,
  legacyOutputBytes: 0,
  legacyToolPayloadBytes: 0,
  renderedInputBytes: 0,
  requestMemoryBytes: 0,
  requestUntrustedBytes: 0,
  providerResponseBytes: 0,
  providerStderrBytes: 0,
  reasonerOutputBytes: 0,
  toolResultBytes: 0,
  toolEnvelopeBytes: 0,
  checkpointBytes: 0,
});

/** Component-wise sum. Used to fold per-investigation ledgers into a campaign total. */
export function addAgentByteLedgers(a: AgentByteLedger, b: AgentByteLedger): AgentByteLedger {
  return {
    schemaVersion: AGENT_BYTE_LEDGER_VERSION,
    legacyInputBytes: a.legacyInputBytes + b.legacyInputBytes,
    legacyOutputBytes: a.legacyOutputBytes + b.legacyOutputBytes,
    legacyToolPayloadBytes: a.legacyToolPayloadBytes + b.legacyToolPayloadBytes,
    renderedInputBytes: a.renderedInputBytes + b.renderedInputBytes,
    requestMemoryBytes: a.requestMemoryBytes + b.requestMemoryBytes,
    requestUntrustedBytes: a.requestUntrustedBytes + b.requestUntrustedBytes,
    providerResponseBytes: a.providerResponseBytes + b.providerResponseBytes,
    providerStderrBytes: a.providerStderrBytes + b.providerStderrBytes,
    reasonerOutputBytes: a.reasonerOutputBytes + b.reasonerOutputBytes,
    toolResultBytes: a.toolResultBytes + b.toolResultBytes,
    toolEnvelopeBytes: a.toolEnvelopeBytes + b.toolEnvelopeBytes,
    checkpointBytes: a.checkpointBytes + b.checkpointBytes,
  };
}

/** Exact cumulative charged-input identity. */
export function chargedInputBytes(ledger: AgentByteLedger): number {
  return ledger.legacyInputBytes + ledger.renderedInputBytes;
}

/** Exact cumulative charged-output identity (provider transport only). */
export function chargedOutputBytes(ledger: AgentByteLedger): number {
  return ledger.legacyOutputBytes + ledger.providerResponseBytes + ledger.providerStderrBytes;
}

/** Exact cumulative charged-tool-payload identity. */
export function chargedToolPayloadBytes(ledger: AgentByteLedger): number {
  return ledger.legacyToolPayloadBytes + ledger.toolResultBytes;
}

/** Build honest attribution for a valid pre-W9 cumulative budget snapshot. */
export function legacyAgentByteLedger(
  inputBytes: number,
  outputBytes: number,
  toolPayloadBytes = 0,
): AgentByteLedger {
  return {
    ...ZERO_AGENT_BYTE_LEDGER,
    legacyInputBytes: inputBytes,
    legacyOutputBytes: outputBytes,
    legacyToolPayloadBytes: toolPayloadBytes,
  };
}
export const AGENT_BYTE_LEDGER_COUNT_KEYS = [
  'legacyInputBytes',
  'legacyOutputBytes',
  'legacyToolPayloadBytes',
  'renderedInputBytes',
  'requestMemoryBytes',
  'requestUntrustedBytes',
  'providerResponseBytes',
  'providerStderrBytes',
  'reasonerOutputBytes',
  'toolResultBytes',
  'toolEnvelopeBytes',
  'checkpointBytes',
] as const;

/**
 * Fail-closed ledger guard for checkpoint parsing. Present-but-malformed
 * ledgers are corrupt; absence is handled as pre-W9 compatibility.
 */
export function isAgentByteLedger(value: unknown): value is AgentByteLedger {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== AGENT_BYTE_LEDGER_VERSION) return false;
  for (const key of AGENT_BYTE_LEDGER_COUNT_KEYS) {
    const entry = record[key];
    if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry < 0) return false;
  }
  return true;
}

export const ZERO_AGENT_BUDGET_USAGE: AgentBudgetUsage = Object.freeze({
  wallTimeMs: 0,
  reasonerCalls: 0,
  inputBytes: 0,
  outputBytes: 0,
  toolPayloadBytes: 0,
  toolActions: 0,
  candidateCount: 0,
  retries: 0,
  consecutiveFailures: 0,
  providerFailures: 0,
});
/**
 * Lane D calibration from the w9-live-1 owner-local campaign (19 reasoner
 * calls in 282 s with ledger renderedInputBytes=231425,
 * providerResponseBytes=7169, providerStderrBytes=0, toolResultBytes=2950229):
 *
 *   measured per call: input 231425/19 = 12_181 B, transport 7169/19 = 378 B,
 *   tool payload 2950229/19 = 155_276 B.
 *
 * Turn-rate assumption: model latency dominates at ~15 s/call observed, so
 * calls scale with wall time at roughly wall/18s: 200 / 800 / 1600 / 2400
 * calls for HOUR_1 / HOUR_4 / HOUR_8 / OVERNIGHT (12 h). Per-call costs are
 * rounded UP from measured (input 12_200, transport 380, payload 156_000)
 * with a further x2 headroom, then rounded up to clean numbers. Result: at
 * observed pace every tier carries 10-20x the evidence in each byte
 * dimension, so campaigns are bounded by wall time and reasonerCalls, while
 * a runaway model emitting ~100 KB/call still trips the transport ceiling
 * on its second turn.
 */
const BUDGET_REASONER_CALLS: Record<AgentBudgetCeilingName, number> = {
  HOUR_1: 200,
  HOUR_4: 800,
  HOUR_8: 1600,
  OVERNIGHT: 2400,
};
// calls x 12_200 B x 2 headroom: 4_880_000 / 19_520_000 / 39_040_000 / 58_560_000.
const BUDGET_INPUT_BYTES: Record<AgentBudgetCeilingName, number> = {
  HOUR_1: 5_000_000,
  HOUR_4: 20_000_000,
  HOUR_8: 40_000_000,
  OVERNIGHT: 60_000_000,
};
// calls x 380 B x 2 headroom: 152_000 / 608_000 / 1_216_000 / 1_824_000.
const BUDGET_OUTPUT_BYTES: Record<AgentBudgetCeilingName, number> = {
  HOUR_1: 160_000,
  HOUR_4: 640_000,
  HOUR_8: 1_280_000,
  OVERNIGHT: 1_920_000,
};
// calls x 156_000 B x 2 headroom: 62_400_000 / 249_600_000 / 499_200_000 / 748_800_000.
const BUDGET_TOOL_PAYLOAD_BYTES: Record<AgentBudgetCeilingName, number> = {
  HOUR_1: 64_000_000,
  HOUR_4: 256_000_000,
  HOUR_8: 512_000_000,
  OVERNIGHT: 768_000_000,
};
// Tool actions track calls at the pre-existing HOUR_1 ratio (2 actions per
// call); longer tiers scale proportionally so the count guard never binds a
// healthy campaign before wall time or reasonerCalls do.
const BUDGET_TOOL_ACTIONS: Record<AgentBudgetCeilingName, number> = {
  HOUR_1: 400,
  HOUR_4: 1600,
  HOUR_8: 3200,
  OVERNIGHT: 4800,
};

export function defaultAgentBudgetPolicy(ceilingName: AgentBudgetCeilingName): AgentBudgetPolicy {
  return {
    schemaVersion: AGENT_BUDGET_VERSION,
    ceilingName,
    wallTimeMs: AGENT_BUDGET_CEILINGS[ceilingName],
    reasonerCalls: BUDGET_REASONER_CALLS[ceilingName],
    inputBytes: BUDGET_INPUT_BYTES[ceilingName],
    outputBytes: BUDGET_OUTPUT_BYTES[ceilingName],
    toolPayloadBytes: BUDGET_TOOL_PAYLOAD_BYTES[ceilingName],
    toolActions: BUDGET_TOOL_ACTIONS[ceilingName],
    perActionTimeoutMs: 120_000,
    candidateCap: 20,
    retries: 8,
    consecutiveFailures: 6,
    providerFailures: 8,
  };
}

export type BudgetExhaustionDecision = 'CONTINUE' | 'SAFE_TERMINATION_CHECKPOINT';

export function classifyBudgetExhaustion(policy: AgentBudgetPolicy, usage: AgentBudgetUsage): BudgetExhaustionDecision {
  if (usage.wallTimeMs >= policy.wallTimeMs) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.reasonerCalls >= policy.reasonerCalls) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.inputBytes >= policy.inputBytes) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.outputBytes >= policy.outputBytes) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.toolPayloadBytes >= policy.toolPayloadBytes) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.toolActions >= policy.toolActions) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.candidateCount >= policy.candidateCap) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.retries >= policy.retries) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.consecutiveFailures >= policy.consecutiveFailures) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.providerFailures >= policy.providerFailures) return 'SAFE_TERMINATION_CHECKPOINT';
  return 'CONTINUE';
}

export interface AgentHypothesis {
  readonly hypothesisId: string;
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
  readonly status: 'OPEN' | 'SUPPORTED' | 'DISPROVED';
}

export interface AgentActionRecord {
  readonly turnId: string;
  readonly phase: AgentPhase;
  readonly intentKind: string;
  readonly toolId: string | null;
  readonly argumentDigest: string | null;
  readonly resultClass: string;
  readonly evidenceRefs: readonly string[];
  /**
   * W8: the authoritative subject of the action as reported by the executor —
   * an approved source path, a reproduction source path, or a proposal
   * candidate id. Never raw arguments and never model-supplied text that the
   * executor did not confirm. Absent on pre-W8 checkpoints.
   */
  readonly target?: string | null;
  /**
   * W8: bounded salient symbols the executor extracted from material the
   * reasoner already received for this target, so a stateless turn can recall
   * what it found. Never raw source text.
   */
  readonly salient?: readonly string[];
  /**
   * W9: host-owned disposition of a FAILED action. Absent on successes and on
   * pre-W9 checkpoints (absence is read as DETERMINISTIC_TERMINAL, preserving
   * W8 exhaustion behavior exactly).
   */
  readonly disposition?: ActionFailureDisposition | null;
}

export interface AgentRuntimeState {
  readonly schemaVersion: typeof AGENT_RUNTIME_STATE_VERSION;
  readonly campaignId: string;
  readonly status: AgentRuntimeStatus;
  readonly phase: AgentPhase;
  readonly hypotheses: readonly AgentHypothesis[];
  readonly actionLog: readonly AgentActionRecord[];
  readonly evidenceRefs: readonly string[];
  readonly candidateIds: readonly string[];
  readonly budget: AgentBudgetSnapshot;
  /**
   * W8: approved targets this investigation has learned about (from bounded
   * index enumerations and confirmed actions). Deduplicated, insertion
   * ordered, capped by the runtime. Empty on pre-W8 checkpoints.
   */
  readonly knownTargets: readonly string[];
  /**
   * W10: host-derived reproduction capability for approved source paths this
   * investigation enumerated. Absent on pre-W10 checkpoints, which resume with
   * no capability knowledge rather than a fabricated one.
   */
  readonly reproductionSurface?: readonly ReproductionSurfaceEntry[];
  /**
   * W9: component byte accounting explaining `budget.usage.inputBytes` and
   * `budget.usage.outputBytes`. Absent on pre-W9 checkpoints.
   */
  readonly byteLedger?: AgentByteLedger;
  readonly terminationReason: string | null;
}

export interface AgentCheckpoint {
  readonly schemaVersion: typeof AGENT_CHECKPOINT_VERSION;
  readonly campaignId: string;
  readonly state: AgentRuntimeState;
  readonly resumeCursor: string;
}

export const NO_PROGRESS_REPEAT_LIMIT = 3 as const;

export function actionFingerprint(record: Pick<AgentActionRecord, 'intentKind' | 'toolId' | 'argumentDigest'>): string {
  return `${record.intentKind}|${record.toolId ?? ''}|${record.argumentDigest ?? ''}`;
}

export function detectRepeatedAction(
  history: readonly AgentActionRecord[],
  next: Pick<AgentActionRecord, 'intentKind' | 'toolId' | 'argumentDigest'>,
  limit: number = NO_PROGRESS_REPEAT_LIMIT,
): boolean {
  const fingerprint = actionFingerprint(next);
  let streak = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (actionFingerprint(history[index]!) !== fingerprint) break;
    streak += 1;
    if (streak >= limit) return true;
  }
  return false;
}

/**
 * W9 disposition-aware exhaustion. A tool call is deterministic in its own
 * host-computed argument digest within one session, so a justified re-check
 * always carries different arguments and therefore a different fingerprint.
 *
 * Counting is over TOTAL prior executions of the same fingerprint across the
 * whole history (never a consecutive streak): an unrelated action between
 * attempts does not reset the budget, and a changed canonical digest is a
 * fresh fingerprint. DEDUPED_REPEAT discards are not executions but prove a
 * fingerprint already exhausted.
 *
 * - DETERMINISTIC_TERMINAL / ENVIRONMENT_BLOCKED (including absent/legacy
 *   dispositions, which read as DETERMINISTIC_TERMINAL): execute once, then
 *   exhaust. Preserves W8 behavior exactly for pre-W9 records.
 * - TRANSIENT_RETRYABLE: execute at most TRANSIENT_ACTION_RETRY_BUDGET total
 *   attempts for the fingerprint, then exhaust like a deterministic refusal.
 * - Successes (any non-TOOL_ERROR class) never exhaust.
 */
export const EXHAUSTED_ACTION_RESULT_CLASSES: readonly string[] = ['TOOL_ERROR', 'DEDUPED_REPEAT'] as const;

export function detectExhaustedAction(
  history: readonly AgentActionRecord[],
  next: Pick<AgentActionRecord, 'intentKind' | 'toolId' | 'argumentDigest'>,
): boolean {
  const fingerprint = actionFingerprint(next);
  let transientFailures = 0;
  for (const record of history) {
    if (actionFingerprint(record) !== fingerprint) continue;
    if (record.resultClass === 'DEDUPED_REPEAT') return true;
    if (record.resultClass !== 'TOOL_ERROR') continue;
    const disposition = normalizeActionFailureDisposition(record.disposition ?? null) ?? 'DETERMINISTIC_TERMINAL';
    if (disposition === 'DETERMINISTIC_TERMINAL' || disposition === 'ENVIRONMENT_BLOCKED') return true;
    transientFailures += 1;
    if (transientFailures >= TRANSIENT_ACTION_RETRY_BUDGET) return true;
  }
  return false;
}

export function detectNoProgress(history: readonly AgentActionRecord[], windowSize: number = 6): boolean {
  if (history.length < windowSize) return false;
  const window = history.slice(-windowSize);
  const producedEvidence = window.some((record) => record.evidenceRefs.length > 0 || record.resultClass === 'CANDIDATE_PROPOSED' || record.resultClass === 'CANDIDATE_REJECTED');
  if (producedEvidence) return false;
  const fingerprints = window.map((record) => actionFingerprint(record));
  return fingerprints.every((value) => value === fingerprints[0]);
}
