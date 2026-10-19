// ---------------------------------------------------------------------------
// R6-02 — preserved per-investigation campaign diagnostics.
//
// WHY THIS EXISTS. The first real provider campaign terminated NO_PROGRESS with
// 10 NO_PROGRESS investigations, and NOTHING could say how many of them hit the
// per-investigation TURN LIMIT and how many tripped the REPEATED-ACTION
// stagnation guard. Both map to the same `NO_PROGRESS` reason, and the campaign
// deletes its checkpoint on a stagnation exit, so the distinction was destroyed
// by the time anyone asked. The four NONZERO_EXIT provider failures were
// equally unrecoverable: the print adapter collapses a timeout, an auth error,
// a harness crash and an unparseable response into one exit code.
//
// This module makes those distinctions survive the run. It reads only the
// action log the runtime already persists and classifies it deterministically;
// it never invents a cause it cannot evidence, and an unrecognised shape is
// reported as UNKNOWN rather than guessed.
//
// SAFETY POSTURE. Pure data + arithmetic: no fs, network, clock, child process,
// model, or AI authority. Records contain enum classes, counts, digests and
// bounded identifiers only — never raw provider text, arguments, or prompts.
// ---------------------------------------------------------------------------

export const CAMPAIGN_DIAGNOSTICS_VERSION = 'nightwatch.campaign-diagnostics.v1' as const;

/**
 * The runtime records this exact pair on the STAGNATION path only
 * (`AgentRuntime.run`: intentKind 'NO_PROGRESS', resultClass
 * 'NO_PROGRESS_DETECTED'). Its presence is therefore hard evidence that a
 * NO_PROGRESS termination came from the repeated-action guard rather than from
 * the turn cap, which is the discrimination the earlier campaign lost.
 */
const STAGNATION_INTENT = 'NO_PROGRESS';
const STAGNATION_RESULT_CLASS = 'NO_PROGRESS_DETECTED';
const FAILED_CALL_INTENT = 'REASONER_CALL';
const SOURCE_ACTION_INTENT = 'CALL_TOOL';
const FAILURE_CLASS_PREFIX = 'REASONER_';
const DRIVER_THROW_CLASS = 'DRIVER_THROW';
const CLASS_KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

/** Why one investigation stopped. Every value is evidenced, never inferred. */
export const INVESTIGATION_TERMINATION_CAUSES = [
  /** The investigation reached its own declared end (WITH/WITHOUT finding). */
  'COMPLETED',
  /** The per-investigation turn cap was reached. */
  'TURN_LIMIT',
  /** The repeated-action stagnation guard tripped inside the investigation. */
  'REPEATED_ACTION',
  /** A budget dimension was exhausted (safe-termination checkpoint). */
  'BUDGET_EXHAUSTED',
  /** A permanent provider failure class stopped the investigation. */
  'PROVIDER_FAILURE',
  'SAFETY_BLOCKED',
  'CANCELLED',
  'PAUSED',
  /** The action log was insufficient to establish a cause. */
  'UNKNOWN',
] as const;
export type InvestigationTerminationCause = (typeof INVESTIGATION_TERMINATION_CAUSES)[number];

export interface InvestigationDiagnostic {
  readonly investigationId: string;
  readonly terminationReason: string;
  readonly terminationCause: InvestigationTerminationCause;
  /** Turns the investigation actually used (distinct turn ids in its log). */
  readonly turnsUsed: number;
  /** The per-investigation turn cap it ran under. */
  readonly turnLimit: number;
  /** True only when the evidence proves the stagnation guard fired. */
  readonly stoppedOnRepeatedAction: boolean;
  /** True only when turnsUsed reached the cap. */
  readonly hitTurnLimit: boolean;
  readonly providerFailures: number;
  readonly providerFailureClasses: Readonly<Record<string, number>>;
  readonly toolActions: number;
  readonly reasonerCalls: number;
}

export interface CampaignDiagnosticsInput {
  readonly investigationId: string;
  readonly terminationReason: string;
  readonly turnLimit: number;
  readonly actionLog: readonly {
    readonly intentKind: string;
    readonly resultClass: string;
    readonly turnId?: string;
    readonly evidenceRefs?: readonly string[];
  }[];
}

/**
 * Classify one finished investigation from its own action log. Deterministic and
 * conservative: whenever two explanations are possible the cause is UNKNOWN.
 */
export function classifyInvestigation(input: CampaignDiagnosticsInput): InvestigationDiagnostic {
  const log = input.actionLog;
  const turnsUsed = new Set(
    log.map((record) => (typeof record.turnId === 'string' ? record.turnId : '')).filter((id) => id.length > 0),
  ).size;
  const stagnationRecorded = log.some(
    (record) => record.intentKind === STAGNATION_INTENT && record.resultClass === STAGNATION_RESULT_CLASS,
  );
  const hitTurnLimit = turnsUsed >= input.turnLimit && input.turnLimit > 0;
  const providerFailureClasses: Record<string, number> = {};
  let providerFailures = 0;
  let toolActions = 0;
  let reasonerCalls = 0;
  for (const record of log) {
    if (record.intentKind === SOURCE_ACTION_INTENT) toolActions += 1;
    if (record.intentKind !== FAILED_CALL_INTENT) continue;
    reasonerCalls += 1;
    const raw = String(record.resultClass);
    const key =
      raw === DRIVER_THROW_CLASS
        ? DRIVER_THROW_CLASS
        : raw.startsWith(FAILURE_CLASS_PREFIX)
          ? raw.slice(FAILURE_CLASS_PREFIX.length)
          : null;
    if (key === null || key.length === 0 || !CLASS_KEY_RE.test(key)) continue;
    providerFailures += 1;
    providerFailureClasses[key] = (providerFailureClasses[key] ?? 0) + 1;
  }
  return Object.freeze({
    investigationId: input.investigationId,
    terminationReason: input.terminationReason,
    terminationCause: causeOf(input.terminationReason, stagnationRecorded, hitTurnLimit),
    turnsUsed,
    turnLimit: input.turnLimit,
    stoppedOnRepeatedAction: stagnationRecorded,
    hitTurnLimit,
    providerFailures,
    providerFailureClasses: Object.freeze(
      Object.fromEntries(Object.entries(providerFailureClasses).sort(([a], [b]) => a.localeCompare(b))),
    ),
    toolActions,
    reasonerCalls,
  });
}

function causeOf(
  terminationReason: string,
  stagnationRecorded: boolean,
  hitTurnLimit: boolean,
): InvestigationTerminationCause {
  if (terminationReason === 'COMPLETE_WITH_FINDING' || terminationReason === 'COMPLETE_NO_FINDING') return 'COMPLETED';
  if (terminationReason === 'BUDGET_EXHAUSTED') return 'BUDGET_EXHAUSTED';
  if (terminationReason === 'REASONER_FAILURE') return 'PROVIDER_FAILURE';
  if (terminationReason === 'SAFETY_BLOCKED') return 'SAFETY_BLOCKED';
  if (terminationReason === 'CANCELLED') return 'CANCELLED';
  if (terminationReason === 'PAUSED') return 'PAUSED';
  if (terminationReason === 'NO_PROGRESS') {
    // The guard's own persisted record outranks the turn count: the runtime
    // checks the cap BEFORE running a turn and the guard AFTER, so a log that
    // carries the guard's record is proof the guard is what stopped it.
    if (stagnationRecorded) return 'REPEATED_ACTION';
    if (hitTurnLimit) return 'TURN_LIMIT';
    return 'UNKNOWN';
  }
  return 'UNKNOWN';
}

/** How many investigations ended for each reason, across a whole campaign. */
export function summarizeTerminationCauses(
  diagnostics: readonly InvestigationDiagnostic[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const entry of diagnostics) counts[entry.terminationCause] = (counts[entry.terminationCause] ?? 0) + 1;
  return Object.freeze(
    Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  );
}

/**
 * Launch parameters, recorded so a run is reproducible and auditable without
 * the operator's shell history. Values are the ones the process actually
 * resolved, not the ones a document claims.
 */
export interface CampaignLaunchParameters {
  readonly ceilingName: string;
  readonly maxTurns: number;
  readonly wallClockCeilingMs: number;
  readonly expectedInvestigations: number | null;
  readonly investigationScope: readonly string[] | null;
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly providerFailures: number;
}

/** Runtime usage accounting, so a run's consumption is measurable after the fact. */
export interface CampaignUsageAccounting {
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly toolPayloadBytes: number;
  readonly toolActions: number;
  readonly providerFailures: number;
  readonly wallTimeMs: number;
}
