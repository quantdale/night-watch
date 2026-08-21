// ---------------------------------------------------------------------------
// Nightwatch Phase 13H — replay binding with executor separation.
//
// Validation (structural plan checks, occurrence identity, catalog guards) is
// pure and never certifies reproduction. Only an executor callback outcome
// with exact fingerprint equality can reproduce.
//
// Journey reduced replay remains unsupported: no invented subset executor.
//
// Phase 15P A06 — validation/execution separation and executor authority:
// a VALIDATED plan is a distinct value (ValidatedReplayPlanV2) produced only
// by validateReplayPlanV2; only executeValidatedReplayPlanV2 may invoke an
// executor, and it accepts only that validated value. executeReplayPlanV2
// stays as the validate-then-execute wrapper: every plan-validation failure
// returns INVALID before any executor callback (no-false-certification).
// Duplicate action identities are handled explicitly through occurrence
// ordinals — retained occurrences are never silently deduplicated.
// ---------------------------------------------------------------------------

import type { CandidateGuardResult, CandidateReplayOutcome, MinimizationAction } from './types';
import { normalizeExecutorOutcome } from './executorNormalization';
import {
  validateTriageReplayPlanV2,
  isOrderPreservingOrdinalSubsequence,
  ordinalToActionMap,
  occurrenceIdentityToken,
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
  const ordinalToAction = ordinalToActionMap(originalOccurrences);
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
  const ordinalToAction = ordinalToActionMap(originalOccurrences);
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

// ---------------------------------------------------------------------------
// Validated-plan value (Phase 15P A06). The brand makes an unvalidated plan
// unrepresentable at the executor boundary: only validateReplayPlanV2 can
// produce a ValidatedReplayPlanV2, and only that value is accepted for
// execution. The brand is type-level only — no runtime property is added, so
// plan identity and determinism are untouched.
// ---------------------------------------------------------------------------

const validatedReplayPlanBrand = Symbol('nightwatch.validated-replay-plan-v2');

export interface ValidatedReplayPlanV2 extends TriageReplayPlanV2 {
  readonly [validatedReplayPlanBrand]: true;
}

export type ReplayPlanValidationResult =
  | { readonly valid: true; readonly plan: ValidatedReplayPlanV2 }
  | { readonly valid: false; readonly reason: string };

/**
 * Pure plan validation. Never returns anomaly reproduction.
 * Only checks structure, occurrence identity, and catalog guards.
 * On success it yields the distinct validated plan value required for execution.
 */
export function validateReplayPlanV2(plan: TriageReplayPlanV2): ReplayPlanValidationResult {
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
  return { valid: true, plan: plan as ValidatedReplayPlanV2 };
}

/**
 * Executor authority seam (Phase 15P A06): the ONLY function in this module
 * that may invoke an executor callback, and only for a value that validation
 * already admitted. Duplicate action identities stay explicit — every retained
 * occurrence maps 1:1 onto a MinimizationAction, never deduplicated.
 */
export function executeValidatedReplayPlanV2(
  validated: ValidatedReplayPlanV2,
  executor: V2Executor,
): Promise<CandidateReplayOutcome> | CandidateReplayOutcome {
  const plan: TriageReplayPlanV2 = validated;
  const retainedActions = buildRetainedActionsV2(plan);
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
  return executeValidatedReplayPlanV2(validation.plan, executor);
}

function normalizeExecutorResult(result: CandidateReplayOutcome, plan: TriageReplayPlanV2): CandidateReplayOutcome {
  return normalizeExecutorOutcome(result, plan.anomalyFingerprint);
}

/**
 * Build retained MinimizationActions from occurrence ordinals. Each retained
 * occurrence maps 1:1 onto one action — duplicate action identities are
 * preserved as distinct entries (occurrence identity is load-bearing), never
 * silently deduplicated.
 */
export function buildRetainedActionsV2(plan: TriageReplayPlanV2): readonly MinimizationAction[] {
  const ordinalToAction = ordinalToActionMap(plan.originalOccurrences);
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

/**
 * Resolve every retained occurrence to its explicit occurrence-aware identity
 * (ordinal, actionId, canonical token). For validated plans this never throws;
 * the fail-closed error documents that an unresolved retained ordinal can never
 * reach evidence. Two structurally identical actions at different occurrences
 * yield distinct tokens.
 */
export interface RetainedOccurrenceIdentity {
  readonly ordinal: number;
  readonly actionId: string;
  readonly identityToken: string;
}

export function resolveRetainedOccurrenceIdentities(plan: TriageReplayPlanV2): readonly RetainedOccurrenceIdentity[] {
  const ordinalToAction = ordinalToActionMap(plan.originalOccurrences);
  return [...plan.retainedOccurrenceOrdinals].sort((a, b) => a - b).map((ord) => {
    const id = ordinalToAction.get(ord);
    if (id === undefined) throw new Error(`RETAINED_OCCURRENCE_UNRESOLVED:${String(ord)}`);
    return { ordinal: ord, actionId: id, identityToken: occurrenceIdentityToken(id, ord) };
  });
}

export { isOrderPreservingOrdinalSubsequence };
