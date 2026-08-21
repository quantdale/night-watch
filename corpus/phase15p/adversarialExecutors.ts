// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — synthetic executors and spies
// for the adversarial corpus.
//
// Deterministic fake executors ONLY: no network, no browser, no real product
// API, no I/O. Every spy records its calls so tests can assert executor
// call-counts (the mechanical anchor for "stopped before the executor").
// ---------------------------------------------------------------------------

import type { CandidateReplayOutcome, MinimizationAction, MinimizationOptions } from '../../src/core/triage/types';
import type { TriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import type { V2Executor } from '../../src/core/triage/replayBinding';
import { ZERO_REPLAY_SAFETY } from './adversarialFixtures';

// ---------------------------------------------------------------------------
// Minimizer replay callback.
// ---------------------------------------------------------------------------

export interface ScriptedMinimizerReplay {
  readonly replay: NonNullable<MinimizationOptions['replay']>;
  /** Every invoked candidate, in invocation order (action-id lists). */
  readonly invocations: readonly (readonly string[])[];
  readonly phases: readonly string[];
}

/**
 * Replay callback that reproduces exactly when the candidate's action-id set
 * satisfies `reproduces`. Fully deterministic; records every invocation.
 */
export function scriptedMinimizerReplay(
  anomalyFingerprint: string,
  reproduces: (actionIds: ReadonlySet<string>) => boolean,
): ScriptedMinimizerReplay {
  const invocations: string[][] = [];
  const phases: string[] = [];
  const replay = async (candidate: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE'): Promise<CandidateReplayOutcome> => {
    invocations.push(candidate.map((item) => item.actionId));
    phases.push(phase);
    const ids = new Set(candidate.map((item) => item.actionId));
    if (reproduces(ids)) {
      return { status: 'FAILURE', anomalyFingerprint, safety: ZERO_REPLAY_SAFETY };
    }
    return { status: 'PASS', safety: ZERO_REPLAY_SAFETY };
  };
  return { replay, invocations, phases };
}

// ---------------------------------------------------------------------------
// V2 replay-plan executor spy.
// ---------------------------------------------------------------------------

export interface SpyV2ExecutorCall {
  readonly plan: TriageReplayPlanV2;
  readonly retained: readonly MinimizationAction[];
}

export interface SpyV2Executor {
  readonly executor: V2Executor;
  readonly calls: SpyV2ExecutorCall[];
}

export function spyV2Executor(
  outcomeFor?: (plan: TriageReplayPlanV2, retained: readonly MinimizationAction[]) => CandidateReplayOutcome,
): SpyV2Executor {
  const calls: SpyV2ExecutorCall[] = [];
  const executor: V2Executor = (plan, retained) => {
    calls.push({ plan, retained });
    if (outcomeFor !== undefined) return outcomeFor(plan, retained);
    return { status: 'FAILURE', anomalyFingerprint: plan.anomalyFingerprint, safety: ZERO_REPLAY_SAFETY };
  };
  return { executor, calls };
}
