import type { ExplorationTerminationReason } from './types';

/**
 * Terminations that mean a bounded exploration reached a safe stopping point.
 * Runtime, safety, auth, route, oracle, and interruption outcomes are never
 * successful merely because their safety counters happen to be zero.
 */
export const PHASE4_SUCCESS_TERMINATION_REASONS: readonly ExplorationTerminationReason[] = Object.freeze([
  'BUDGET_EXHAUSTED',
  'SAFE_FRONTIER_EXHAUSTED',
  'MODEL_TERMINAL_STATE',
]);

export function isSuccessfulPhase4Termination(reason: ExplorationTerminationReason): boolean {
  return PHASE4_SUCCESS_TERMINATION_REASONS.includes(reason);
}
