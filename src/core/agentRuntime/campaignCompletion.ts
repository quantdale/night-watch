// ---------------------------------------------------------------------------
// R6-01 — the CAMPAIGN-level successful-completion decision.
//
// THE DEFECT THIS CLOSES. `evaluateYieldCampaignEvidence` requires a receipt
// whose `campaignTermination` is `COMPLETED_SUCCESSFULLY`, and that value is
// derived from the campaign result's `terminationReason` via
// `campaignTerminationOf`. But `runCampaignLoop` had six exits and every one of
// them was a FAILURE class (BUDGET_EXHAUSTED, CANCELLED, PAUSED, SAFETY_BLOCKED,
// NO_PROGRESS). `COMPLETE_WITH_FINDING` / `COMPLETE_NO_FINDING` existed only as
// PER-INVESTIGATION reasons, so the campaign lane could never produce the value
// its own certification evaluator demanded. Condition #3 was unreachable by
// construction, and a perfectly healthy provider could not qualify.
//
// THE FIX IS NOT A RELABEL. A campaign is complete only when a HOST-COMPUTED set
// of finite, objective criteria holds over its whole investigation population.
// The decision is derived from counters the campaign engine already maintains,
// never from a model claim, a caller flag, or a single investigation's outcome.
//
// WHY A FINITE PLAN IS REQUIRED. The loop is otherwise open-ended: it ends on
// budget, cancellation, a safety block, or three consecutive empty
// investigations (CAMPAIGN_STAGNATION_LIMIT). None of those is "finished". A
// campaign therefore declares, BEFORE it starts, how many investigations it
// intends to run (`expectedInvestigations`); having run them all is the only
// honest meaning of "finished", and remaining budget is what makes "finished"
// different from "gave up".
//
// SAFETY POSTURE. Pure data + arithmetic: no fs, network, clock, child process,
// model, or AI authority. Every refusal is fail-closed: an unknown, missing or
// malformed input refuses completion rather than defaulting toward success.
// ---------------------------------------------------------------------------

export const CAMPAIGN_COMPLETION_VERSION = 'nightwatch.campaign-completion.v1' as const;

/**
 * The smallest population that can evidence a campaign rather than a single
 * investigation. One investigation is not a campaign, and it is exactly the
 * single-case shortcut that must never qualify (the release rule that a
 * campaign is never accepted solely because one investigation completed).
 */
export const MIN_CAMPAIGN_INVESTIGATIONS = 2 as const;

/**
 * The largest declarable investigation plan. A campaign plan is a finite
 * commitment the operator can state before the run; an unbounded plan is not a
 * plan, and the budget ceilings already bound real consumption far below this.
 */
export const MAX_CAMPAIGN_INVESTIGATIONS = 64 as const;

/**
 * Every investigation termination that means the campaign is NOT finished:
 * the population still contains a case that ran out of room, was cut off, or
 * failed. `COMPLETE_WITH_FINDING` / `COMPLETE_NO_FINDING` are the only reasons
 * that leave the campaign eligible, and they are populated only when a case
 * reached its own declared end.
 */
export const CAMPAIGN_NON_COMPLETING_TERMINATIONS = [
  'NO_PROGRESS',
  'BUDGET_EXHAUSTED',
  'PAUSED',
  'CANCELLED',
  'SAFETY_BLOCKED',
  'REASONER_FAILURE',
] as const;

/** Reasons why a campaign is refused successful completion. */
export const CAMPAIGN_COMPLETION_REFUSALS = [
  /** No declared plan, so "finished" has no meaning. */
  'NO_DECLARED_PLAN',
  /** Fewer investigations than the minimum population. */
  'INSUFFICIENT_INVESTIGATIONS',
  /** The declared plan was not exhausted. */
  'PLAN_NOT_EXHAUSTED',
  /** At least one investigation did not reach a completion reason. */
  'UNCOMPLETED_INVESTIGATION',
  /** Every investigation stopped for a non-completing reason. */
  'NO_COMPLETED_INVESTIGATION',
  /** The campaign ended by the stagnation guard, not by exhausting its plan. */
  'ISOLATED_STAGNATION_TERMINATION',
  /** A failed provider call existed anywhere in the campaign. */
  'PROVIDER_DEGRADED',
  /** No tool action ever executed: the campaign never touched the source. */
  'NO_SOURCE_ACTION',
] as const;
export type CampaignCompletionRefusal = (typeof CAMPAIGN_COMPLETION_REFUSALS)[number];

export interface CampaignCompletionEvidence {
  /** Investigations the campaign declared it would run, before it started. */
  readonly expectedInvestigations: number | null;
  readonly investigationsStarted: number;
  readonly investigationsCompleted: number;
  /** Per-reason counts across the whole population. */
  readonly terminationCounts: Readonly<Record<string, number>>;
  /** Derived provider class for the whole campaign. */
  readonly providerTerminationClass: string;
  /** Executed tool actions: nonzero proves the campaign actually inspected source. */
  readonly sourceActions: number;
  /** True when the loop is asking because the stagnation guard tripped. */
  readonly terminatedOnStagnation: boolean;
  /**
   * R6-04: true when a suspended investigation had already recorded a provider
   * failure. Retiring its `PAUSED` placeholder when it finishes must never hide
   * that failure from the population verdict.
   */
  readonly suspendedProviderFailure?: boolean;
}

export interface CampaignCompletionVerdict {
  readonly schemaVersion: typeof CAMPAIGN_COMPLETION_VERSION;
  /** True only when EVERY criterion holds. Never true with a refusal. */
  readonly complete: boolean;
  /** True when the completed campaign admitted at least one finding. */
  readonly withFinding: boolean;
  readonly refusals: readonly CampaignCompletionRefusal[];
  /**
   * The completion reason to report when `complete` is true, else null. This is
   * the ONLY place a campaign-level COMPLETE_* reason is minted, and it is
   * minted from arithmetic over the population.
   */
  readonly terminationReason: 'COMPLETE_WITH_FINDING' | 'COMPLETE_NO_FINDING' | null;
  readonly expectedInvestigations: number | null;
  readonly investigationsStarted: number;
  readonly investigationsCompleted: number;
}

function countOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * Derive the campaign completion verdict. Fail-closed by construction: anything
 * that cannot be proven refuses completion.
 */
export function evaluateCampaignCompletion(evidence: CampaignCompletionEvidence): CampaignCompletionVerdict {
  const refusals: CampaignCompletionRefusal[] = [];
  const expected = integerOrNull(evidence.expectedInvestigations);
  const started = countOf(evidence.investigationsStarted);
  const completed = countOf(evidence.investigationsCompleted);
  const counts = evidence.terminationCounts ?? {};
  const withFindingCount = countOf(counts['COMPLETE_WITH_FINDING']);
  const withoutFindingCount = countOf(counts['COMPLETE_NO_FINDING']);
  const completedInvestigations = withFindingCount + withoutFindingCount;
  const sourceActions = countOf(evidence.sourceActions);

  // 1. A plan must exist. Without one, "finished" is undefined and the only
  //    honest verdict is a refusal.
  if (expected === null || expected < MIN_CAMPAIGN_INVESTIGATIONS) {
    refusals.push('NO_DECLARED_PLAN');
  }
  // 2. A campaign needs a real population. This is the anti-single-case rule.
  if (started < MIN_CAMPAIGN_INVESTIGATIONS || completed < MIN_CAMPAIGN_INVESTIGATIONS) {
    refusals.push('INSUFFICIENT_INVESTIGATIONS');
  }
  // 3. Every declared slot must actually have run. A campaign that stopped
  //    early has not finished; it was cut short.
  if (expected !== null && started < expected) refusals.push('PLAN_NOT_EXHAUSTED');
  // 4. Started == completed: nothing was left suspended mid-flight.
  if (completed < started) refusals.push('UNCOMPLETED_INVESTIGATION');
  // 5. At least one investigation must have reached its own declared end.
  if (completedInvestigations < 1) refusals.push('NO_COMPLETED_INVESTIGATION');
  // 6. No investigation in the population may have stopped for a non-completing
  //    reason. This is what keeps NO_PROGRESS, BUDGET_EXHAUSTED, PAUSED,
  //    SAFETY_BLOCKED, CANCELLED and REASONER_FAILURE strictly distinct: any one
  //    of them anywhere in the campaign refuses completion outright.
  for (const reason of CAMPAIGN_NON_COMPLETING_TERMINATIONS) {
    if (countOf(counts[reason]) > 0) {
      refusals.push('UNCOMPLETED_INVESTIGATION');
      break;
    }
  }
  // 7. The stagnation guard is a giving-up exit, never a completion.
  if (evidence.terminatedOnStagnation) refusals.push('ISOLATED_STAGNATION_TERMINATION');
  // 8. A degraded provider can never qualify, and this is not forgivable: one
  //    failed provider call anywhere in the campaign refuses completion.
  if (evidence.providerTerminationClass !== 'VALID_PROVIDER_RUN') refusals.push('PROVIDER_DEGRADED');
  // R6-04: a provider failure recorded before a suspension is equally
  // disqualifying, even though its PAUSED placeholder was retired on completion.
  if (evidence.suspendedProviderFailure === true) refusals.push('PROVIDER_DEGRADED');
  // 9. A campaign that never executed a tool action did not hunt anything.
  if (sourceActions < 1) refusals.push('NO_SOURCE_ACTION');

  const unique = [...new Set(refusals)];
  const complete = unique.length === 0;
  const withFinding = withFindingCount > 0;
  return Object.freeze({
    schemaVersion: CAMPAIGN_COMPLETION_VERSION,
    complete,
    withFinding,
    refusals: Object.freeze(unique),
    terminationReason: complete ? (withFinding ? 'COMPLETE_WITH_FINDING' : 'COMPLETE_NO_FINDING') : null,
    expectedInvestigations: expected,
    investigationsStarted: started,
    investigationsCompleted: completed,
  });
}
