// ---------------------------------------------------------------------------
// W10 live campaign yield — mechanically derived, never hand-counted.
//
// WHY THIS EXISTS
// The fixed-corpus `W10YieldMetrics` measures a simulated policy comparison.
// A real campaign's yield was, until now, only recoverable by a human reading
// a checkpoint, and that is exactly how a wrong claim gets published: an early
// reading of the first W10 live run reported "zero reproduction attempts"
// because it counted admitted reproductions instead of attempts, when the run
// had in fact attempted six and executed four.
//
// So the campaign derives its own yield from the action log it already keeps.
// Every field below is a count over records the runtime wrote at the moment
// the action resolved; nothing here is reported by a reasoner, and nothing
// here grants authority. Verdict vocabulary is the frozen session vocabulary:
// an unrecognized verdict is counted as an errored attempt, never as an
// execution and never as a qualifying reproduction.
//
// Pure data. No fs/network/process authority in this module.
// ---------------------------------------------------------------------------

import type { ReproductionSurfaceEntry } from './contracts';

export const CAMPAIGN_YIELD_METRICS_VERSION =
  'nightwatch.w10-campaign-yield.v1' as const;

/** The only tool that can attempt a reproduction. */
export const REPRODUCTION_TOOL_ID = 'RERUN_SAFE_REPRODUCTION' as const;

/**
 * Verdicts that mean the host actually ran the target. `ENVIRONMENT_BLOCKED`
 * is deliberately absent: a missing local prerequisite is not an execution.
 */
const EXECUTED_VERDICTS: ReadonlySet<string> = new Set([
  'REPRODUCED',
  'REPRODUCED_CURRENT_FAILURE',
  'NOT_REPRODUCED',
  'INCONCLUSIVE',
]);

/** The only verdict that is a qualifying current-source reproduction. */
const QUALIFYING_VERDICT = 'REPRODUCED_CURRENT_FAILURE' as const;

/** Deterministic refusal: the inspected source has no executable target. */
const NO_TARGET_VERDICT = 'NOT_AVAILABLE' as const;

const ENVIRONMENT_BLOCKED_VERDICT = 'ENVIRONMENT_BLOCKED' as const;

/** Minimal action shape this derivation needs; a superset is accepted. */
export interface CampaignYieldAction {
  readonly toolId: string | null;
  readonly resultClass: string;
  readonly target?: string | null;
}

export interface CampaignYieldMetrics {
  readonly schemaVersion: typeof CAMPAIGN_YIELD_METRICS_VERSION;
  /** Classified sources the campaign carried at termination. */
  readonly visibleSources: number;
  readonly visibleExecutableSources: number;
  readonly visibleExecutableTargets: number;
  readonly visibleRepositories: number;
  readonly reproductionAttempts: number;
  /** Attempts the host actually executed. */
  readonly executedAttempts: number;
  /** Attempts refused because the source maps to no executable target. */
  readonly notAvailableAttempts: number;
  readonly environmentBlockedAttempts: number;
  /** Attempts that failed before producing a verdict (tool/adapter errors). */
  readonly erroredAttempts: number;
  readonly qualifyingReproductions: number;
  /**
   * Attempts against a source this campaign already proved has no executable
   * target. Nonzero means the loop paid twice for the same known refusal.
   */
  readonly repeatedUnsupportedAttempts: number;
  readonly distinctAttemptedTargets: number;
  readonly distinctExecutedTargets: number;
  /** 1-based attempt ordinal of the first execution; null when none executed. */
  readonly attemptsToFirstExecutedReproduction: number | null;
  /** 1-based action-log ordinal of that same attempt; null when none executed. */
  readonly actionsToFirstExecutedReproduction: number | null;
}

export interface CampaignYieldInput {
  readonly actionLog: readonly CampaignYieldAction[];
  readonly surface: readonly ReproductionSurfaceEntry[];
}

function repositoryOf(sourcePath: string): string {
  const separator = sourcePath.indexOf(':');
  return separator > 0 ? sourcePath.slice(0, separator) : sourcePath;
}

/**
 * Fold one campaign's action log and carried capability into bounded counts.
 * Pure: the output is a function of the input alone.
 */
export function deriveCampaignYieldMetrics(input: CampaignYieldInput): CampaignYieldMetrics {
  const executableRepositories = new Set<string>();
  const executableTargets = new Set<string>();
  let visibleExecutableSources = 0;
  const repositories = new Set<string>();
  for (const entry of input.surface) {
    repositories.add(repositoryOf(entry.sourcePath));
    if (entry.readiness !== 'EXECUTABLE_NOW') continue;
    visibleExecutableSources += 1;
    executableRepositories.add(repositoryOf(entry.sourcePath));
    if (entry.targetId !== null) executableTargets.add(entry.targetId);
  }

  let reproductionAttempts = 0;
  let executedAttempts = 0;
  let notAvailableAttempts = 0;
  let environmentBlockedAttempts = 0;
  let erroredAttempts = 0;
  let qualifyingReproductions = 0;
  let repeatedUnsupportedAttempts = 0;
  let attemptsToFirst: number | null = null;
  let actionsToFirst: number | null = null;
  const attemptedTargets = new Set<string>();
  const executedTargets = new Set<string>();
  // Keyed by the attempted source, not by refusal class: two different sources
  // that both lack a vendor directory are two first attempts, not a repeat.
  const provenUnsupported = new Set<string>();

  input.actionLog.forEach((record, index) => {
    if (record.toolId !== REPRODUCTION_TOOL_ID) return;
    reproductionAttempts += 1;
    const target = typeof record.target === 'string' && record.target.length > 0 ? record.target : null;
    if (target !== null) attemptedTargets.add(target);
    if (record.resultClass === NO_TARGET_VERDICT) {
      notAvailableAttempts += 1;
      if (target !== null) {
        if (provenUnsupported.has(target)) repeatedUnsupportedAttempts += 1;
        else provenUnsupported.add(target);
      }
      return;
    }
    if (record.resultClass === ENVIRONMENT_BLOCKED_VERDICT) {
      environmentBlockedAttempts += 1;
      return;
    }
    if (!EXECUTED_VERDICTS.has(record.resultClass)) {
      erroredAttempts += 1;
      return;
    }
    executedAttempts += 1;
    if (target !== null) executedTargets.add(target);
    if (record.resultClass === QUALIFYING_VERDICT) qualifyingReproductions += 1;
    if (attemptsToFirst === null) {
      attemptsToFirst = reproductionAttempts;
      actionsToFirst = index + 1;
    }
  });

  return {
    schemaVersion: CAMPAIGN_YIELD_METRICS_VERSION,
    visibleSources: input.surface.length,
    visibleExecutableSources,
    visibleExecutableTargets: executableTargets.size,
    visibleRepositories: repositories.size,
    reproductionAttempts,
    executedAttempts,
    notAvailableAttempts,
    environmentBlockedAttempts,
    erroredAttempts,
    qualifyingReproductions,
    repeatedUnsupportedAttempts,
    distinctAttemptedTargets: attemptedTargets.size,
    distinctExecutedTargets: executedTargets.size,
    attemptsToFirstExecutedReproduction: attemptsToFirst,
    actionsToFirstExecutedReproduction: actionsToFirst,
  };
}

/** Executed-attempt share, or null when nothing was attempted. */
export function executedAttemptRate(metrics: CampaignYieldMetrics): number | null {
  if (metrics.reproductionAttempts === 0) return null;
  return metrics.executedAttempts / metrics.reproductionAttempts;
}

/** `NOT_AVAILABLE` waste share, or null when nothing was attempted. */
export function campaignNotAvailableRate(metrics: CampaignYieldMetrics): number | null {
  if (metrics.reproductionAttempts === 0) return null;
  return metrics.notAvailableAttempts / metrics.reproductionAttempts;
}
