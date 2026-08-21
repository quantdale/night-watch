// ---------------------------------------------------------------------------
// Nightwatch Phase 13H — replay binding with executor separation.
//
// Validation (structural plan checks, occurrence identity, catalog guards) is
// pure and never certifies reproduction. Only an executor callback outcome
// with exact fingerprint equality can reproduce.
//
// Journey reduced replay remains unsupported: no invented subset executor.
// ---------------------------------------------------------------------------

import type { CandidateGuardResult, CandidateReplayOutcome, MinimizationAction } from './types';
import { normalizeExecutorOutcome } from './executorNormalization';
import {
  validateTriageReplayPlanV2,
  isOrderPreservingOrdinalSubsequence,
  type TriageReplayPlanV2,
  type ReplayOccurrence,
} from './replayPlan';
import type { SafeAction } from '../exploration/types';
import { RIPPLE_PHASE4_ACTIONS } from '../../products/ripple/explorationCatalog';
import { RIPPLE_JOURNEY_DEFINITIONS } from '../../products/ripple/journeyContracts';
import { PHASE5_API_CATALOG } from '../../api/phase5/catalog';

const ZERO_SAFETY = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;

function journeyPreconditionCheck(journeyId: string, retainedOrdinals: readonly number[], originalOccurrences: readonly ReplayOccurrence[]): CandidateGuardResult {
  const def = RIPPLE_JOURNEY_DEFINITIONS.find((j) => j.journeyId === journeyId);
  if (def === undefined) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  const allowed = def.allowedSteps.map((s) => s.stepId);
  // Resolve retained occurrence actionIds
  const ordinalToAction = new Map<number, string>();
  for (const occ of originalOccurrences) ordinalToAction.set(occ.ordinal, occ.expectedActionId);
  const retainedIds = retainedOrdinals.map((o) => ordinalToAction.get(o) ?? '');
  if (retainedIds.length === 1 && allowed.length > 1) {
    const nav = allowed[0]!;
    if (retainedIds[0] !== nav) return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
  }
  if (retainedIds.length > 1) {
    let lastIndex = -1;
    for (const id of retainedIds) {
      const idx = allowed.indexOf(id);
      if (idx === -1) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
      if (lastIndex !== -1 && idx !== lastIndex + 1) return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
      lastIndex = idx;
    }
  }
  return { valid: true };
}

function safeActionFor(id: string): SafeAction | undefined {
  return RIPPLE_PHASE4_ACTIONS.find((a) => a.actionId === id);
}

function explorationGuardV2(retainedOrdinals: readonly number[], originalOccurrences: readonly ReplayOccurrence[]): CandidateGuardResult {
  const ordinalToAction = new Map<number, string>();
  for (const occ of originalOccurrences) ordinalToAction.set(occ.ordinal, occ.expectedActionId);
  for (const ord of retainedOrdinals) {
    const id = ordinalToAction.get(ord);
    if (id === undefined) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    const safe = safeActionFor(id);
    if (safe === undefined) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.status !== 'APPROVED') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.semanticClass !== 'KNOWN_READ' && safe.semanticClass !== 'LOCAL_ONLY') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.persistedPreferenceEffect === 'SERVER_STATE') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    if (safe.routeEffect !== 'UNCHANGED' && safe.routeEffect !== 'APPROVED_ROUTE') return { valid: false, reason: 'ROUTE_ENVELOPE_FAILED' };
  }
  return { valid: true };
}

export type V2Executor = (
  plan: TriageReplayPlanV2,
  retained: readonly MinimizationAction[],
) => CandidateReplayOutcome | Promise<CandidateReplayOutcome>;

/**
 * Pure plan validation. Never returns anomaly reproduction.
 * Only checks structure, occurrence identity, and catalog guards.
 */
export function validateReplayPlanV2(plan: TriageReplayPlanV2): { valid: true } | { valid: false; reason: string } {
  const v = validateTriageReplayPlanV2(plan);
  if (!v.valid) return { valid: false, reason: v.reason };
  // Occurrence-ordered subsequence already checked. Now per-kind guards.
  const ordinals = plan.retainedOccurrenceOrdinals;
  if (plan.candidateKind === 'JOURNEY') {
    // Reduced journey replay is always unsupported (no subset executor).
    if (plan.phase === 'REDUCED_CANDIDATE') return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
    const g = journeyPreconditionCheck(plan.targetId, [...ordinals], plan.originalOccurrences);
    if (!g.valid) return { valid: false, reason: g.reason ?? 'PRECONDITION_DIVERGENCE' };
  }
  if (plan.candidateKind === 'EXPLORATION') {
    const g2 = explorationGuardV2([...ordinals], plan.originalOccurrences);
    if (!g2.valid) return { valid: false, reason: g2.reason ?? 'ACTION_NOT_APPROVED' };
  }
  if (plan.candidateKind === 'API') {
    if (ordinals.length !== 1) return { valid: false, reason: 'PRECONDITION_DIVERGENCE' };
    const occ = plan.originalOccurrences.find((o) => o.ordinal === ordinals[0]);
    if (occ === undefined) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
    const op = PHASE5_API_CATALOG.operations.find((o) => o.operationId === occ.expectedActionId);
    if (op === undefined || op.semanticClass !== 'KNOWN_READ') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  }
  return { valid: true };
}

/**
 * Validate plan, build retained actions, and require an executor for reproduction.
 * Returns INVALID without invoking executor when plan is invalid.
 * Only executor outcome can certify FAILURE reproduction; different fingerprint => not reproduced.
 */
export function executeReplayPlanV2(
  plan: TriageReplayPlanV2,
  executor: V2Executor,
): Promise<CandidateReplayOutcome> | CandidateReplayOutcome {
  const validation = validateReplayPlanV2(plan);
  if (!validation.valid) {
    return { status: 'INVALID', safety: { ...ZERO_SAFETY }, invalidReason: (validation.reason as CandidateGuardResult['reason']) ?? 'PRECONDITION_DIVERGENCE' };
  }
  // Build retained MinimizationActions from occurrence ordinals
  const ordinalToAction = new Map<number, string>();
  for (const occ of plan.originalOccurrences) ordinalToAction.set(occ.ordinal, occ.expectedActionId);
  const retainedActions: MinimizationAction[] = [...plan.retainedOccurrenceOrdinals].map((ord) => {
    const id = ordinalToAction.get(ord)!;
    const safe = plan.candidateKind === 'EXPLORATION' ? safeActionFor(id) : undefined;
    return {
      actionId: id,
      semanticClass: (safe?.semanticClass ?? 'KNOWN_READ') as MinimizationAction['semanticClass'],
      routeClass: plan.routeClass,
      sourceApproved: true as const,
      catalogVersion: plan.catalogVersion,
    };
  });
  try {
    const result = executor(plan, retainedActions);
    if (result instanceof Promise) {
      return result.then((r) => normalizeExecutorResult(r, plan))
        .catch(() => ({ status: 'INVALID' as const, safety: { ...ZERO_SAFETY }, invalidReason: 'PRECONDITION_DIVERGENCE' as const }));
    }
    return normalizeExecutorResult(result, plan);
  } catch {
    return { status: 'INVALID', safety: { ...ZERO_SAFETY }, invalidReason: 'PRECONDITION_DIVERGENCE' };
  }
}

function normalizeExecutorResult(result: CandidateReplayOutcome, plan: TriageReplayPlanV2): CandidateReplayOutcome {
  return normalizeExecutorOutcome(result, plan.anomalyFingerprint);
}

export function buildRetainedActionsV2(plan: TriageReplayPlanV2): readonly MinimizationAction[] {
  const ordinalToAction = new Map<number, string>();
  for (const occ of plan.originalOccurrences) ordinalToAction.set(occ.ordinal, occ.expectedActionId);
  return [...plan.retainedOccurrenceOrdinals].map((ord) => {
    const id = ordinalToAction.get(ord)!;
    const safe = plan.candidateKind === 'EXPLORATION' ? safeActionFor(id) : undefined;
    return {
      actionId: id,
      semanticClass: (safe?.semanticClass ?? 'KNOWN_READ') as MinimizationAction['semanticClass'],
      routeClass: plan.routeClass,
      sourceApproved: true as const,
      catalogVersion: plan.catalogVersion,
    };
  });
}

export { isOrderPreservingOrdinalSubsequence };
