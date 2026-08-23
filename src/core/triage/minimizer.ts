// ---------------------------------------------------------------------------
// Nightwatch deterministic failure minimizer.
//
// The minimizer is a replay reducer, never an explorer. Every candidate is a
// subsequence of the admitted original action sequence. It cannot introduce
// an action, selector, route, request, or value. The implementation uses a
// deterministic ddmin-style reduction followed by a bounded one-deletion
// audit. It reports 1-MINIMAL only when that audit completed AND every
// single-action deletion of the final survivor was genuinely exercised
// through the bound replay path and observed DOES_NOT_REPRODUCE (or nothing
// is left to remove). A deletion rejected before a replay — guard failure,
// precondition divergence, nonzero safety — was never exercised and never
// counts as proof; neither does a reduction that was never sent to the
// replay callback. Otherwise it reports BOUNDED_MINIMAL and never claims a
// global minimum. reductionEvidenceClass records which evidence was actually
// obtained.
// ---------------------------------------------------------------------------

import type { SafeAction, SafetyVector } from '../exploration/types';
import { normalizeExecutorOutcome } from './executorNormalization';
import {
  buildMinimalityEvidenceDto,
  probeOutcomeFromDisposition,
  type MinimalityDeletionDisposition,
  type MinimalityEvidence,
} from './minimalityEvidence';
import {
  FAILURE_MINIMIZATION_VERSION,
  PASSIVE_MINIMIZATION_SAFETY,
  REAL_DEV_MINIMIZATION_BUDGET,
  type CandidateEvaluation,
  type CandidateGuardResult,
  type CandidateReplayOutcome,
  type MinimizationAction,
  type MinimizationBudget,
  type MinimizationOptions,
  type MinimizationResult,
  type MinimizationSafetyContract,
  type TriageConfidence,
} from './types';

const ZERO_SAFETY: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

interface ActionOccurrence {
  readonly index: number;
  readonly action: MinimizationAction;
}

interface EvaluatedCandidate {
  readonly occurrenceSequence: readonly ActionOccurrence[];
  readonly outcome: CandidateReplayOutcome;
  readonly evaluation: CandidateEvaluation;
}

function sequenceKey(sequence: readonly ActionOccurrence[]): string {
  return sequence.map((item) => `${item.index}:${item.action.actionId}`).join('>');
}

function actionIds(sequence: readonly ActionOccurrence[]): string[] {
  return sequence.map((item) => item.action.actionId);
}

function allZeroSafety(safety: SafetyVector): boolean {
  return safety.productionAttempts === 0 && safety.proxyViolations === 0 && safety.unknownDestinations === 0 &&
    safety.unknownApprovals === 0 && safety.knownMutations === 0 && safety.actionCausedUnknown === 0 && safety.dbQueries === 0;
}

function safeGuardFromContract(contract: MinimizationSafetyContract): CandidateGuardResult {
  if (!contract.devOnly) return { valid: false, reason: 'DEV_GATE_FAILED' };
  if (!contract.authValid) return { valid: false, reason: 'AUTH_GATE_FAILED' };
  if (!contract.outboundPolicySatisfied) return { valid: false, reason: 'OUTBOUND_POLICY_FAILED' };
  if (!contract.safeActionCatalogSatisfied) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  if (!contract.semanticReadOnly) return { valid: false, reason: 'SEMANTIC_POLICY_FAILED' };
  if (!contract.mutationTripwireZero) return { valid: false, reason: 'MUTATION_TRIPWIRE' };
  if (!contract.unknownTripwireZero) return { valid: false, reason: 'UNKNOWN_TRIPWIRE' };
  if (!contract.routeEnvelopeSatisfied) return { valid: false, reason: 'ROUTE_ENVELOPE_FAILED' };
  if (!contract.privacySatisfied) return { valid: false, reason: 'PRIVACY_POLICY_FAILED' };
  return { valid: true };
}

function validateActionCatalog(action: MinimizationAction, approvedIds: ReadonlySet<string>, safeActions: ReadonlyMap<string, SafeAction>): CandidateGuardResult {
  if (!approvedIds.has(action.actionId)) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  const safe = safeActions.get(action.actionId);
  if (safe !== undefined && safe.status !== 'APPROVED') return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  if (action.sourceApproved !== true || (action.semanticClass !== 'KNOWN_READ' && action.semanticClass !== 'LOCAL_ONLY')) {
    return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  }
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(action.actionId)) return { valid: false, reason: 'ACTION_NOT_APPROVED' };
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(action.routeClass)) return { valid: false, reason: 'ROUTE_ENVELOPE_FAILED' };
  return { valid: true };
}

function guardSequence(
  sequence: readonly ActionOccurrence[],
  originalIds: ReadonlySet<string>,
  approvedIds: ReadonlySet<string>,
  safeActions: ReadonlyMap<string, SafeAction>,
  safety: MinimizationSafetyContract,
  preconditionCheck?: MinimizationOptions['preconditionCheck'],
): CandidateGuardResult {
  const contract = safeGuardFromContract(safety);
  if (!contract.valid) return contract;
  for (const item of sequence) {
    if (!originalIds.has(item.action.actionId)) return { valid: false, reason: 'ACTION_NOT_IN_ORIGINAL' };
    const actionCheck = validateActionCatalog(item.action, approvedIds, safeActions);
    if (!actionCheck.valid) return actionCheck;
  }
  const precondition = preconditionCheck?.(sequence.map((item) => item.action));
  if (precondition !== undefined && !precondition.valid) return precondition;
  return { valid: true };
}

function splitIntoChunks<T>(items: readonly T[], count: number): readonly (readonly T[])[] {
  const chunks: T[][] = [];
  const actual = Math.max(1, Math.min(count, items.length));
  const base = Math.floor(items.length / actual);
  let remainder = items.length % actual;
  let cursor = 0;
  for (let index = 0; index < actual; index += 1) {
    const size = base + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    chunks.push(items.slice(cursor, cursor + size) as T[]);
    cursor += size;
  }
  return chunks;
}

function withoutChunk<T>(items: readonly T[], chunk: readonly T[]): T[] {
  const remove = new Set(chunk);
  return items.filter((item) => !remove.has(item));
}

function confidenceFor(result: { fresh: boolean; reproductionCount: number; guarantee: MinimizationResult['minimalityGuarantee']; budgetExhausted: boolean }): TriageConfidence {
  if (!result.fresh || result.reproductionCount === 0) return 'UNRESOLVED';
  if (!result.budgetExhausted && result.guarantee === '1-MINIMAL' && result.reproductionCount >= 2) return 'HIGH';
  if (!result.budgetExhausted) return 'MEDIUM';
  return 'LOW';
}

function removedActionIds(original: readonly ActionOccurrence[], minimal: readonly ActionOccurrence[]): string[] {
  const retained = new Set(minimal);
  return original.filter((item) => !retained.has(item)).map((item) => item.action.actionId);
}

function outcomeReason(outcome: CandidateReplayOutcome, targetFingerprint: string): { disposition: CandidateEvaluation['disposition']; reason: string; match: boolean } {
  if (outcome.status === 'INVALID') return { disposition: 'INVALID', reason: outcome.invalidReason ?? 'PRECONDITION_DIVERGENCE', match: false };
  if (!allZeroSafety(outcome.safety)) return { disposition: 'INVALID', reason: 'SAFETY_VECTOR_NONZERO', match: false };
  const match = outcome.status === 'FAILURE' && outcome.anomalyFingerprint === targetFingerprint;
  return match
    ? { disposition: 'REPRODUCES', reason: 'EXACT_ANOMALY_FINGERPRINT_MATCH', match: true }
    : { disposition: 'DOES_NOT_REPRODUCE', reason: outcome.status === 'FAILURE' ? 'DIFFERENT_OR_NO_FINGERPRINT' : 'FAILURE_NOT_OBSERVED', match: false };
}

function resultBase(options: MinimizationOptions, budget: MinimizationBudget, original: readonly ActionOccurrence[], minimal: readonly ActionOccurrence[], evaluations: readonly CandidateEvaluation[], replayCount: number, invalidCount: number, safetyRejectionCount: number, fresh: MinimizationResult['freshExactReplay'], reproductionCount: number, guarantee: MinimizationResult['minimalityGuarantee'], budgetExhausted: boolean, status: MinimizationResult['status'], evidenceClass: MinimizationResult['reductionEvidenceClass']): MinimizationResult {
  const confidence = confidenceFor({ fresh: fresh === 'REPRODUCED', reproductionCount, guarantee, budgetExhausted });
  return {
    schemaVersion: FAILURE_MINIMIZATION_VERSION,
    status,
    originalSequence: actionIds(original),
    minimalReproducingSequence: fresh === 'REPRODUCED' ? actionIds(minimal) : [],
    removedActions: fresh === 'REPRODUCED' ? removedActionIds(original, minimal) : [],
    reproductionCount,
    anomalyFingerprint: options.anomalyFingerprint,
    modelVersion: FAILURE_MINIMIZATION_VERSION,
    catalogVersion: options.catalogVersion,
    sourceVersion: options.sourceVersion,
    confidence,
    minimalityGuarantee: fresh === 'REPRODUCED' ? guarantee : 'NONE',
    budget,
    replayCount,
    // The first record is the fresh exact replay. Skipped budget records are
    // retained as evidence but do not count as candidate evaluations.
    candidateEvaluationCount: Math.max(0, evaluations.filter((item) => item.disposition !== 'NOT_EVALUATED_BUDGET').length - (evaluations.length > 0 ? 1 : 0)),
    candidateEvaluations: evaluations,
    invalidCandidateCount: invalidCount,
    safetyRejectionCount,
    freshExactReplay: fresh,
    reductionEvidenceClass: evidenceClass,
  };
}

/**
 * Truthful reduction-evidence classification (Phase 15; hardened in Phase
 * 15P). Rule order is load-bearing: budget exhaustion always blocks a proven
 * claim, a vacuously irreducible survivor (single action) is reported even
 * when no reduced replay ever ran, and MINIMALITY_PROVEN additionally
 * requires (a) every single-action deletion of the final survivor to have
 * been genuinely exercised through the bound replay path and observed
 * DOES_NOT_REPRODUCE, and (b) the invocation ledger to confirm at least one
 * reduced-phase executor call actually happened — an unexercised reduction
 * can never back a proven-minimal claim.
 */
function classifyReductionEvidence(input: {
  readonly freshReproduced: boolean;
  readonly originalLength: number;
  readonly finalLength: number;
  readonly budgetExhausted: boolean;
  readonly genuineReducedNonRepro: boolean;
  readonly invalidReducedCandidate: boolean;
  readonly survivorDeletionsFullyExercised: boolean;
  readonly exercisedReducedReplayCount: number;
}): MinimizationResult['reductionEvidenceClass'] {
  if (!input.freshReproduced) return 'NO_REDUCIBLE_CANDIDATE';
  if (input.budgetExhausted) return 'MINIMALITY_NOT_PROVEN';
  if (input.originalLength === 1 || input.finalLength === 1) return 'NO_REDUCIBLE_CANDIDATE';
  if (input.genuineReducedNonRepro) {
    // The audit finished, but some survivor deletions were rejected before a
    // genuine replay (precondition divergence / guard / safety): their
    // non-reproduction is unknown, so minimality of the survivor is not fully
    // proven even though genuine non-reproduction evidence exists elsewhere.
    if (!input.survivorDeletionsFullyExercised) return 'MINIMALITY_NOT_PROVEN';
    // Mechanical cross-check against the replay invocation ledger: a
    // DOES_NOT_REPRODUCE disposition without an exercised reduced-phase
    // replay would be internal contradiction — fail closed, never proven.
    if (input.exercisedReducedReplayCount < 1) return 'MINIMALITY_NOT_PROVEN';
    return 'MINIMALITY_PROVEN';
  }
  if (input.invalidReducedCandidate) return 'REDUCTION_PRECONDITION_UNAVAILABLE';
  // Fail closed: without genuine reduced-replay evidence, minimality is
  // never claimed as proven.
  return 'MINIMALITY_NOT_PROVEN';
}

/**
 * Minimize one already-admitted anomaly. This function has no browser/API
 * knowledge and only calls the supplied replay callback after local gates.
 */
export async function minimizeFailure(options: MinimizationOptions): Promise<MinimizationResult> {
  const budget = options.budget ?? REAL_DEV_MINIMIZATION_BUDGET;
  if (budget.maxCandidateEvaluations < 0 || budget.maxTotalReplays < 1 || budget.maxTotalReplays < budget.maxCandidateEvaluations) {
    throw new Error('MINIMIZATION_BUDGET_INVALID');
  }
  if (options.originalSequence.length === 0) {
    throw new Error('MINIMIZATION_ORIGINAL_SEQUENCE_EMPTY');
  }

  const original = options.originalSequence.map((action, index) => ({ index, action }));
  const originalIds = new Set(original.map((item) => item.action.actionId));
  const approvedIds = options.approvedActionIds ?? originalIds;
  const safeActions = new Map((options.safeActionCatalog ?? []).map((action) => [action.actionId, action]));
  const safety = options.safety ?? PASSIVE_MINIMIZATION_SAFETY;
  const originalGuard = guardSequence(original, originalIds, approvedIds, safeActions, safety, options.preconditionCheck);
  if (!originalGuard.valid) {
    // The original failed its own gates, so the preconditions needed to
    // attempt any reduction were unavailable.
    return resultBase(options, budget, original, original, [], 0, 1, 0, 'INVALID', 0, 'NONE', false, 'INVALID_ORIGINAL', 'REDUCTION_PRECONDITION_UNAVAILABLE');
  }

  let replayCount = 0;
  let candidateEvaluations = 0;
  let invalidCandidateCount = 0;
  let safetyRejectionCount = 0;
  let reproductionCount = 0;
  // Invocation ledger: reduced-phase executor calls that actually completed.
  // This is the mechanical anchor for "the reduction was exercised through
  // the bound replay path" — dispositions alone are not trusted as proof.
  let reducedReplayInvocations = 0;
  const evaluations: CandidateEvaluation[] = [];
  const cache = new Map<string, EvaluatedCandidate>();

  const evaluate = async (candidate: readonly ActionOccurrence[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE'): Promise<EvaluatedCandidate> => {
    const key = sequenceKey(candidate);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    if (phase === 'REDUCED_CANDIDATE' && candidateEvaluations >= budget.maxCandidateEvaluations) {
      const evaluation: CandidateEvaluation = { sequence: actionIds(candidate), disposition: 'NOT_EVALUATED_BUDGET', reason: 'BUDGET_EXHAUSTED', fingerprintMatch: false };
      const skipped: EvaluatedCandidate = { occurrenceSequence: candidate, outcome: { status: 'INVALID', safety: ZERO_SAFETY, invalidReason: 'PRECONDITION_DIVERGENCE' }, evaluation };
      evaluations.push(evaluation);
      return skipped;
    }
    const guard = guardSequence(candidate, originalIds, approvedIds, safeActions, safety, options.preconditionCheck);
    if (!guard.valid) {
      candidateEvaluations += phase === 'REDUCED_CANDIDATE' ? 1 : 0;
      invalidCandidateCount += phase === 'REDUCED_CANDIDATE' ? 1 : 0;
      const outcome: CandidateReplayOutcome = { status: 'INVALID', safety: ZERO_SAFETY, invalidReason: guard.reason };
      const evaluation: CandidateEvaluation = { sequence: actionIds(candidate), disposition: 'INVALID', reason: guard.reason ?? 'CANDIDATE_GUARD_FAILED', fingerprintMatch: false };
      const evaluated = { occurrenceSequence: candidate, outcome, evaluation };
      cache.set(key, evaluated);
      evaluations.push(evaluation);
      return evaluated;
    }
    if (phase === 'REDUCED_CANDIDATE') candidateEvaluations += 1;
    if (replayCount >= budget.maxTotalReplays) {
      const evaluation: CandidateEvaluation = { sequence: actionIds(candidate), disposition: 'NOT_EVALUATED_BUDGET', reason: 'TOTAL_REPLAY_BUDGET_EXHAUSTED', fingerprintMatch: false };
      const skipped: EvaluatedCandidate = { occurrenceSequence: candidate, outcome: { status: 'INVALID', safety: ZERO_SAFETY, invalidReason: 'PRECONDITION_DIVERGENCE' }, evaluation };
      evaluations.push(evaluation);
      return skipped;
    }
    replayCount += 1;
    const raw = await options.replay(candidate.map((item) => item.action), phase);
    if (phase === 'REDUCED_CANDIDATE') reducedReplayInvocations += 1;
    // Centralized exact-vs-reduced rule: a mismatched-fingerprint FAILURE is
    // downgraded to PASS before classification (executorNormalization).
    const outcome = normalizeExecutorOutcome(raw, options.anomalyFingerprint);
    const classified = outcomeReason(outcome, options.anomalyFingerprint);
    if (outcome.status !== 'INVALID' && !allZeroSafety(outcome.safety)) safetyRejectionCount += 1;
    if (classified.disposition === 'INVALID') invalidCandidateCount += phase === 'REDUCED_CANDIDATE' ? 1 : 0;
    if (classified.disposition === 'REPRODUCES') reproductionCount += 1;
    const evaluation: CandidateEvaluation = { sequence: actionIds(candidate), disposition: classified.disposition, reason: classified.reason, fingerprintMatch: classified.match };
    const evaluated = { occurrenceSequence: candidate, outcome, evaluation };
    cache.set(key, evaluated);
    evaluations.push(evaluation);
    return evaluated;
  };

  const fresh = await evaluate(original, 'FRESH_EXACT_REPLAY');
  if (fresh.evaluation.disposition !== 'REPRODUCES') {
    const freshStatus: MinimizationResult['freshExactReplay'] = fresh.evaluation.disposition === 'INVALID' ? 'INVALID' : 'NOT_REPRODUCED';
    // No reduction is possible without a fresh reproduction.
    return resultBase(options, budget, original, original, evaluations, replayCount, invalidCandidateCount, safetyRejectionCount, freshStatus, reproductionCount, 'NONE', false, 'NO_REPRODUCTION', 'NO_REDUCIBLE_CANDIDATE');
  }

  let current = original;
  let granularity = Math.min(2, current.length);
  let budgetExhausted = false;
  let reduced = false;
  while (current.length > 1 && !budgetExhausted) {
    const chunks = splitIntoChunks(current, granularity);
    let accepted = false;
    for (const chunk of chunks) {
      const candidate = withoutChunk(current, chunk);
      if (candidate.length === 0) continue;
      const evaluated = await evaluate(candidate, 'REDUCED_CANDIDATE');
      if (evaluated.evaluation.disposition === 'NOT_EVALUATED_BUDGET') {
        budgetExhausted = true;
        break;
      }
      if (evaluated.evaluation.disposition === 'REPRODUCES') {
        current = candidate;
        granularity = Math.max(2, granularity - 1);
        accepted = true;
        reduced = true;
        break;
      }
    }
    if (budgetExhausted || accepted) continue;
    if (granularity >= current.length) break;
    granularity = Math.min(current.length, granularity * 2);
  }

  // A final deterministic one-deletion audit is the proof boundary for
  // 1-MINIMAL. Three honest failure modes exist: budget exhaustion ends the
  // audit early; an INVALID deletion was never genuinely replayed so it can
  // never count as proof (Phase 15 conflation fix); and a survivor whose
  // deletion set mixes genuine non-reproductions with never-replayed INVALID
  // deletions leaves part of its minimality unknown (Phase 15P fix — the old
  // rule let one genuine deletion back a 1-MINIMAL claim over unexercised
  // siblings). The last complete pass's per-deletion dispositions are
  // retained so the proof is decided by what was actually exercised.
  let changedInAudit = true;
  let finalPassDispositions: CandidateEvaluation['disposition'][] = [];
  while (changedInAudit && !budgetExhausted && current.length > 1) {
    changedInAudit = false;
    finalPassDispositions = [];
    for (let index = 0; index < current.length; index += 1) {
      const candidate = current.filter((_, candidateIndex) => candidateIndex !== index);
      const evaluated = await evaluate(candidate, 'REDUCED_CANDIDATE');
      finalPassDispositions.push(evaluated.evaluation.disposition);
      if (evaluated.evaluation.disposition === 'NOT_EVALUATED_BUDGET') {
        budgetExhausted = true;
        break;
      }
      if (evaluated.evaluation.disposition === 'REPRODUCES') {
        current = candidate;
        reduced = true;
        changedInAudit = true;
        break;
      }
    }
  }
  // Derived after every evaluation so the audit's own observations count.
  // The first record is the fresh exact replay; everything after it is a
  // reduced candidate. A single-action survivor is vacuously minimal — no
  // non-empty proper subsequence exists.
  const reducedEvaluations = evaluations.slice(1);
  const genuineReducedNonRepro = reducedEvaluations.some((item) => item.disposition === 'DOES_NOT_REPRODUCE');
  const invalidReducedCandidate = reducedEvaluations.some((item) => item.disposition === 'INVALID');
  // The audit's last complete pass covers exactly the final survivor's
  // single-action deletions. 1-MINIMAL requires every one of them to have
  // been genuinely replayed to DOES_NOT_REPRODUCE; a single-action survivor
  // is vacuously minimal (no non-empty proper subsequence exists). A partial
  // pass only coexists with budget exhaustion or a vacuous survivor, both of
  // which are decided before this check matters.
  const survivorDeletionsFullyExercised = current.length === 1 ||
    (finalPassDispositions.length === current.length &&
      finalPassDispositions.every((disposition) => disposition === 'DOES_NOT_REPRODUCE'));
  const oneDeletionProof = !budgetExhausted && survivorDeletionsFullyExercised;
  const guarantee: MinimizationResult['minimalityGuarantee'] = oneDeletionProof ? '1-MINIMAL' : 'BOUNDED_MINIMAL';
  const status: MinimizationResult['status'] = budgetExhausted ? 'BOUNDED_BUDGET_EXHAUSTED' : reduced ? 'MINIMIZED' : 'UNCHANGED';
  // REDUCTION_PRECONDITION_UNAVAILABLE keeps BOUNDED_MINIMAL (never
  // 1-MINIMAL): fresh reproduction held and a bounded search over legal
  // candidates ran, but no genuine reduced replay was possible, so nothing
  // about minimality was proven. NONE stays reserved for results whose fresh
  // replay did not reproduce.
  const evidenceClass = classifyReductionEvidence({
    freshReproduced: true,
    originalLength: original.length,
    finalLength: current.length,
    budgetExhausted,
    genuineReducedNonRepro,
    invalidReducedCandidate,
    survivorDeletionsFullyExercised,
    exercisedReducedReplayCount: reducedReplayInvocations,
  });
  return resultBase(options, budget, original, current, evaluations, replayCount, invalidCandidateCount, safetyRejectionCount, 'REPRODUCED', reproductionCount, guarantee, budgetExhausted, status, evidenceClass);
}

/**
 * Companion builder (Phase 15P mass-implementation lane A07): derive the
 * explicit portable MinimalityEvidence DTO from an existing result WITHOUT
 * changing any classification. Purely additive — consumes only the public
 * result surface:
 *   - reductionAttempted / exercised count derive from the replay ledger
 *     (every non-INVALID_ORIGINAL run spends exactly one fresh exact replay,
 *     so reduced invocations = replayCount - 1; cached candidates never
 *     counted);
 *   - survivor-deletion dispositions are reconstructed from recorded
 *     candidate evaluations whose sequence equals the survivor minus one
 *     occurrence; unexercised deletions are omitted (evidence records only
 *     what genuinely ran — never fabricated NOT_REDUCED markers);
 *   - the evidence class is carried verbatim, so the structural guarantees
 *     in minimalityEvidence.ts hold (proven markers ⇔ MINIMALITY_PROVEN).
 */
export function buildMinimalityEvidence(result: MinimizationResult): MinimalityEvidence {
  const freshRan = result.status !== 'INVALID_ORIGINAL';
  const exercisedReducedReplayCount = freshRan ? Math.max(0, result.replayCount - 1) : 0;
  const survivorIds = result.minimalReproducingSequence;
  const survivorDeletions: MinimalityDeletionDisposition[] = [];
  const repeatedActionIds = new Set(survivorIds.filter((actionId, index) => survivorIds.indexOf(actionId) !== index));
  // The historical MinimizationResult stores action IDs, while the reducer's
  // internal ledger distinguishes occurrences by original index. A repeated
  // ID cannot be assigned back to one deletion occurrence from the public
  // result alone. Never let that lossy reconstruction support a proven claim.
  if (repeatedActionIds.size > 0 && result.reductionEvidenceClass === 'MINIMALITY_PROVEN') {
    throw new Error('MINIMALITY_EVIDENCE_INVALID:AMBIGUOUS_SURVIVOR_OCCURRENCE');
  }
  if (survivorIds.length > 1) {
    for (let index = 0; index < survivorIds.length; index += 1) {
      const deletedSequence = survivorIds.filter((_, position) => position !== index);
      const matches = result.candidateEvaluations.filter((evaluation) =>
        evaluation.sequence.length === deletedSequence.length &&
        evaluation.sequence.every((actionId, position) => actionId === deletedSequence[position]));
      const match = matches.length === 1 ? matches[0] : undefined;
      if (matches.length > 1 && result.reductionEvidenceClass === 'MINIMALITY_PROVEN') {
        throw new Error('MINIMALITY_EVIDENCE_INVALID:AMBIGUOUS_SURVIVOR_DELETION');
      }
      if (match !== undefined) {
        survivorDeletions.push({
          actionId: survivorIds[index]!,
          probeOutcome: probeOutcomeFromDisposition(match.disposition, match.reason),
          replayPath: 'REDUCED',
        });
      }
    }
  }
  return buildMinimalityEvidenceDto({
    evidenceClass: result.reductionEvidenceClass,
    reductionAttempted: result.candidateEvaluations.slice(1).some((evaluation) => evaluation.disposition !== 'NOT_EVALUATED_BUDGET'),
    exercisedReducedReplayCount,
    survivorDeletions,
    budget: [
      { dimension: 'maxCandidateEvaluations', offered: result.budget.maxCandidateEvaluations, consumed: result.candidateEvaluationCount },
      { dimension: 'maxTotalReplays', offered: result.budget.maxTotalReplays, consumed: result.replayCount },
    ],
    survivorActionIds: survivorIds,
  });
}
