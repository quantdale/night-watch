// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11 round 2) — DEEP validator for existing replay-plan
// record shapes (v1 and v2), composed over triage/replayPlan.
//
// The Phase 15P A06 ReplayResultEnvelope lands on a sibling branch and is
// deliberately NOT imported here. Until it integrates through
// `replayEnvelopeRegistration.ts`, this kind validates the EXISTING
// nightwatch.triage-replay-plan.private.v1/.v2 records MORE DEEPLY than the
// historical `replay-plan` kind, strictly by composition:
// - both versions re-run their owning module validators VERBATIM
//   (validateTriageReplayPlan / validateTriageReplayPlanV2 — these already
//   recompose the deterministic planId identity);
// - ADDITIVE depth on top, none of it forking module logic:
//   * sentinel screening across EVERY string field (privacy dominance; the v1
//     module validator carries no sentinel screen of its own);
//   * occurrence-multiplicity feasibility implied by the modules' own
//     "order-preserving subsequence" semantics but not separately enforced:
//     a v1 retained action id can never occur more often than in the original,
//     and v2 retainedOccurrenceOrdinals must be unique (a repeated ordinal
//     would address one occurrence twice);
//   * v2 occurrence-identity recomposition through the exported
//     `occurrenceIdentityToken` / `ordinalToActionMap` helpers, which fail
//     closed on malformed ids or ordinals.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  validateTriageReplayPlan,
  validateTriageReplayPlanV2,
  ordinalToActionMap,
  occurrenceIdentityToken,
} from '../triage/replayPlan';
import {
  isRuntimeRecord,
  safeErrorDetail,
} from '../campaign/runtimeValidation';

// Same established sentinel idiom as triage/replayPlan.ts and
// campaign/candidateLifecycle.ts (the modules do not export theirs).
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_REPLAY_RECORD_INVALID:${reason}`);
}

function assertNoSentinels(value: unknown): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) invalid('SENTINEL_BLOCKED');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertNoSentinels);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) assertNoSentinels(child);
  }
}

/** Multiset feasibility: no retained id may outnumber its original occurrences. */
function assertRetainedMultiplicityFeasible(original: readonly unknown[], retained: readonly unknown[]): void {
  const originalCounts = new Map<string, number>();
  for (const id of original) originalCounts.set(id as string, (originalCounts.get(id as string) ?? 0) + 1);
  const retainedCounts = new Map<string, number>();
  for (const id of retained) {
    const key = id as string;
    const next = (retainedCounts.get(key) ?? 0) + 1;
    if (next > (originalCounts.get(key) ?? 0)) invalid('RETAINED_EXCEEDS_ORIGINAL_OCCURRENCES');
    retainedCounts.set(key, next);
  }
}

/**
 * Strict deep validation of one persisted replay-plan record (v1 or v2,
 * dispatched on schemaVersion). Throws ARTIFACT_REPLAY_RECORD_INVALID:* on
 * any violation.
 */
export function validateReplayRecordArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const version = value.schemaVersion;

  if (version === TRIAGE_REPLAY_PLAN_VERSION) {
    // Owning module validator verbatim (shape, coherence, planId recomposition).
    const result = validateTriageReplayPlan(value);
    if (!result.valid) invalid(`PLAN_V1:${result.reason}`);
    assertNoSentinels(value);
    assertRetainedMultiplicityFeasible(result.plan.originalActionIds, result.plan.retainedActionIds);
    return;
  }

  if (version === TRIAGE_REPLAY_PLAN_V2_VERSION) {
    const result = validateTriageReplayPlanV2(value);
    if (!result.valid) invalid(`PLAN_V2:${result.reason}`);
    assertNoSentinels(value);
    const plan = result.plan;
    // Occurrence ordinals are single-address identities: retaining one twice
    // would execute/address the same occurrence twice under one plan.
    const retained = new Set<number>();
    for (const ordinal of plan.retainedOccurrenceOrdinals) {
      if (retained.has(ordinal)) invalid('RETAINED_ORDINAL_DUPLICATE');
      retained.add(ordinal);
    }
    // Recompose each occurrence's canonical identity token through the
    // owning module's own builder (fails closed on malformed ids/ordinals)
    // and resolve every retained ordinal through its map.
    const ordinalMap = ordinalToActionMap(plan.originalOccurrences);
    for (const occurrence of plan.originalOccurrences) {
      occurrenceIdentityToken(occurrence.expectedActionId, occurrence.ordinal);
    }
    for (const ordinal of plan.retainedOccurrenceOrdinals) {
      if (!ordinalMap.has(ordinal)) invalid('RETAINED_ORDINAL_UNRESOLVED');
    }
    return;
  }

  invalid(`SCHEMA_VERSION_UNSUPPORTED:${safeErrorDetail(version)}`);
}
