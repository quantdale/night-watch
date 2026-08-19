// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — journey / exploration / API replay adapters.
//
// Each adapter validates a TriageReplayPlan against fresh-local contracts
// before any executor exposure. No browser, network, or filesystem.
//
// Journey: order-preserving subsequence + occurrence identity + precondition
//          closure (no removed prerequisite). If the pruned subset would break
//          a proven dependency, classify PRECONDITION_DIVERGENCE.
// Exploration: every retained action must resolve to the fixed Phase 4 catalog
//              with KNOWN_READ / LOCAL_ONLY and no SERVER_STATE / unsafe route.
// API: single fixed operation; empty reduced sequence is INVALID.
// ---------------------------------------------------------------------------

import type { CandidateGuardResult, CandidateReplayOutcome, MinimizationAction } from './types';
import { validateTriageReplayPlan, type TriageReplayPlan } from './replayPlan';
import type { SafeAction } from '../exploration/types';
import { RIPPLE_PHASE4_ACTIONS } from '../../products/ripple/explorationCatalog';
import { RIPPLE_JOURNEY_DEFINITIONS } from '../../products/ripple/journeyContracts';
import { PHASE5_API_CATALOG } from '../../api/phase5/catalog';

const ZERO_SAFETY = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;

// Minimal journey dependency: for frozen definitions, each step after the
// first navigation depends on the immediate predecessor to preserve route/
// structural closure under reduction. This is conservative and deterministic.
function journeyPreconditionCheck(journeyId: string, retainedIds: readonly string[]): CandidateGuardResult {
  const def = RIPPLE_JOURNEY_DEFINITIONS.find((j) => j.journeyId === journeyId);
  if (!def) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  const allowed = def.allowedSteps.map((s) => s.stepId);
  // If only one retained, it must be the navigation step (root) unless the
  // original had more; otherwise precondition divergence.
  if (retainedIds.length === 1 && allowed.length > 1) {
    // Allow single if it is the navigation; otherwise invalid.
    const nav = allowed[0];
    if (retainedIds[0] !== nav) return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
  }
  // For multi-step fossils with gap beyond immediate predecessor, fail.
  // Check that retained order is consecutive in allowed order when >1.
  if (retainedIds.length > 1) {
    let lastIndex = -1;
    for (const id of retainedIds) {
      const idx = allowed.indexOf(id);
      if (idx === -1) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
      if (lastIndex !== -1 && idx !== lastIndex + 1) {
        // Non-consecutive implies removed prerequisite for current frozen 2-step journeys.
        return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
      }
      lastIndex = idx;
    }
  }
  return { valid: true };
}

function safeActionFor(id: string): SafeAction | undefined {
  return RIPPLE_PHASE4_ACTIONS.find((a) => a.actionId === id);
}

function explorationGuard(retainedIds: readonly string[]): CandidateGuardResult {
  for (const id of retainedIds) {
    const safe = safeActionFor(id);
    if (!safe) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.status !== 'APPROVED') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.semanticClass !== 'KNOWN_READ' && safe.semanticClass !== 'LOCAL_ONLY') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.persistedPreferenceEffect === 'SERVER_STATE') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.routeEffect !== 'UNCHANGED' && safe.routeEffect !== 'APPROVED_ROUTE') return { valid: false, reason: 'ROUTE_ENVELOPE_FAILED' };
  }
  return { valid: true };
}

export type SyntheticExecutor = (
  plan: TriageReplayPlan,
  retained: readonly MinimizationAction[],
) => CandidateReplayOutcome | Promise<CandidateReplayOutcome>;

export interface AdapterResult {
  readonly guard: CandidateGuardResult;
  readonly retainedActions: readonly MinimizationAction[];
}

export function buildAdapterContext(plan: TriageReplayPlan): AdapterResult | { guard: CandidateGuardResult } {
  const validated = validateTriageReplayPlan(plan);
  if (!validated.valid) return { guard: { valid: false, reason: 'ACTION_NOT_APPROVED' } } as { guard: CandidateGuardResult };
  // Fresh exact replay path already enforced plan validity; still check per-kind
  const retainedIds = plan.retainedActionIds;

  if (plan.candidateKind === 'JOURNEY') {
    const g = journeyPreconditionCheck(plan.targetId, retainedIds);
    if (!g.valid) return { guard: g };
  }
  if (plan.candidateKind === 'EXPLORATION') {
    const g2 = explorationGuard(retainedIds);
    if (!g2.valid) return { guard: g2 };
  }
  if (plan.candidateKind === 'API') {
    if (retainedIds.length !== 1) return { guard: { valid: false, reason: 'PRECONDITION_DIVERGENCE' } };
    const op = PHASE5_API_CATALOG.operations.find((o) => o.operationId === retainedIds[0]);
    if (!op || op.semanticClass !== 'KNOWN_READ') return { guard: { valid: false, reason: 'ACTION_NOT_APPROVED' } };
    if (retainedIds[0] !== plan.targetId) return { guard: { valid: false, reason: 'ACTION_NOT_IN_ORIGINAL' } };
  }

  // Build retained MinimizationAction list from retained IDs (catalog-agnostic minimal)
  const retainedActions: MinimizationAction[] = retainedIds.map((id) => ({
    actionId: id,
    semanticClass: (plan.candidateKind === 'EXPLORATION' ? safeActionFor(id)?.semanticClass ?? 'KNOWN_READ' : 'KNOWN_READ') as MinimizationAction['semanticClass'],
    routeClass: plan.routeClass,
    sourceApproved: true as const,
    catalogVersion: plan.catalogVersion,
  }));
  return { guard: { valid: true }, retainedActions };
}

export function executeWithSyntheticAdapter(
  plan: TriageReplayPlan,
  executor: SyntheticExecutor,
): Promise<CandidateReplayOutcome> | CandidateReplayOutcome {
  const ctx = buildAdapterContext(plan);
  if (!('retainedActions' in ctx) || !ctx.guard.valid) {
    const reason = (ctx as { guard: CandidateGuardResult }).guard.reason ?? 'PRECONDITION_DIVERGENCE';
    return { status: 'INVALID', safety: { ...ZERO_SAFETY }, invalidReason: reason };
  }
  try {
    const result = executor(plan, ctx.retainedActions);
    if (result instanceof Promise) {
      return result.catch(() => ({ status: 'INVALID' as const, safety: { ...ZERO_SAFETY }, invalidReason: 'PRECONDITION_DIVERGENCE' as const }));
    }
    return result;
  } catch {
    return { status: 'INVALID', safety: { ...ZERO_SAFETY }, invalidReason: 'PRECONDITION_DIVERGENCE' };
  }
}

export function planPreconditionCheckForMinimizer(planBase: Omit<TriageReplayPlan, 'planId' | 'retainedActionIds' | 'phase'> & { originalActionIds: readonly string[] }): (seq: readonly MinimizationAction[]) => CandidateGuardResult {
  return (seq: readonly MinimizationAction[]) => {
    const ids = seq.map((a) => a.actionId);
    const kind = planBase.candidateKind;
    if (kind === 'JOURNEY') return journeyPreconditionCheck(planBase.targetId, ids);
    if (kind === 'EXPLORATION') return explorationGuard(ids);
    if (kind === 'API' && ids.length === 0) return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
    return { valid: true };
  };
}
