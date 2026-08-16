// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — source-freshness classification (SPEC §6, §7, §8,
// §22, §45).
//
// A local checkout HEAD is NOT automatically remote-current. Before any DEV
// contact the Phase 9B runner establishes the current remote branch head
// (read-only GitHub metadata) and classifies against the reviewed SHA:
//
//   A. remote == reviewed, derivation ok        -> USE_REVIEWED_SNAPSHOT (F1)
//   B. remote advanced, contract derives        -> REDERIVE_FRESH_SNAPSHOT (F2)
//   C. remote advanced, route binding changed   -> BLOCK REAL_SOURCE_CONTRACT_DRIFT
//   D. remote advanced, required row keys changed -> BLOCK REAL_SOURCE_CONTRACT_DRIFT
//   E. remote unavailable                       -> BLOCK SOURCE_FRESHNESS_UNRESOLVED
//   F. expectation derives but UI journey source changed -> BLOCK JOURNEY_SOURCE_DRIFT
//
// This module is PURE: it performs no network, no fs, no child processes,
// and no persistence. The runner collects the facts (remote SHA, exact-range
// diffs, derivation result against the freshness-approved snapshot) and
// injects them; the unit matrix drives the classifier with synthetic facts
// (no GitHub dependency in CI).
//
// A source SHA label is NOT semantic authority: binding the Phase 9B
// expectation to the fresh snapshot additionally requires the mechanical
// derivation to succeed against that exact snapshot (checked at preflight,
// where the resolver must return RESOLVED before any browser launch).
// ---------------------------------------------------------------------------

export const PHASE_9B_FRESHNESS_VERSION = 'nightwatch.phase9b-source-freshness.v1' as const;

export type Phase9bFreshnessBlockReason =
  | 'SOURCE_FRESHNESS_UNRESOLVED'
  | 'REAL_SOURCE_CONTRACT_DRIFT'
  | 'JOURNEY_SOURCE_DRIFT';

export type Phase9bFreshnessVerdict =
  | { readonly kind: 'USE_REVIEWED_SNAPSHOT'; readonly sha: string }
  | { readonly kind: 'REDERIVE_FRESH_SNAPSHOT'; readonly sha: string }
  | { readonly kind: 'BLOCK'; readonly reason: Phase9bFreshnessBlockReason };

export interface Phase9bFreshnessFacts {
  /** Current remote branch head (read-only query); null when unavailable. */
  readonly remoteSha: string | null;
  /** The existing reviewed/admitted source SHA (repo-local baseline). */
  readonly reviewedSha: string;
  /** Relevant source contract files changed between reviewed and remote
   *  (exact-range diff; for ripple-api: handler + Routing.yaml). */
  readonly relevantSourceChanged: boolean;
  /** Relevant journey source paths changed (UI route/page/callsite). */
  readonly journeySourceChanged: boolean;
  /** Mechanical derivation result against the freshness-approved snapshot:
   *  ok=true with the expected target identity, or a failure reason. */
  readonly derivation: { readonly ok: boolean; readonly targetId?: string; readonly failure?: string } | null;
  /** The exact selected target identity the derivation must reproduce. */
  readonly targetId: string;
}

export function classifySourceFreshness(facts: Phase9bFreshnessFacts): Phase9bFreshnessVerdict {
  // E — remote head cannot be established: BLOCK before DEV; a local checkout
  // HEAD is never a fallback for "current".
  if (facts.remoteSha === null) {
    return { kind: 'BLOCK', reason: 'SOURCE_FRESHNESS_UNRESOLVED' };
  }
  // F — the journey source (route/page/callsite) moved: the exact approved
  // journey/rule identity is no longer supported by the current UI source.
  if (facts.journeySourceChanged) {
    return { kind: 'BLOCK', reason: 'JOURNEY_SOURCE_DRIFT' };
  }
  // A — remote equals the reviewed SHA: use the existing reviewed snapshot,
  // but only when the contract still derives mechanically.
  if (facts.remoteSha === facts.reviewedSha) {
    if (facts.derivation === null || !facts.derivation.ok || facts.derivation.targetId !== facts.targetId) {
      return { kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' };
    }
    return { kind: 'USE_REVIEWED_SNAPSHOT', sha: facts.reviewedSha };
  }
  // B/C/D — remote advanced: a fresh derivation against the exact remote
  // snapshot is REQUIRED to bind (never silently keep the stale SHA). A
  // failed derivation is contract drift (route binding / row keys / source
  // structure changed), regardless of whether the raw diff showed changes.
  if (facts.derivation === null || !facts.derivation.ok || facts.derivation.targetId !== facts.targetId) {
    return { kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' };
  }
  return { kind: 'REDERIVE_FRESH_SNAPSHOT', sha: facts.remoteSha };
}

/** Map a freshness BLOCK to the exact Phase 9B blocker token. */
export function freshnessBlockToken(reason: Phase9bFreshnessBlockReason): string {
  switch (reason) {
    case 'SOURCE_FRESHNESS_UNRESOLVED':
      return 'PHASE_9B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED';
    case 'REAL_SOURCE_CONTRACT_DRIFT':
      return 'PHASE_9B_BLOCKED_REAL_SOURCE_CONTRACT_DRIFT';
    case 'JOURNEY_SOURCE_DRIFT':
      return 'PHASE_9B_BLOCKED_JOURNEY_SOURCE_DRIFT';
  }
}
