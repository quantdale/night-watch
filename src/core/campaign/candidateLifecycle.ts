// ---------------------------------------------------------------------------
// Phase 15 Session 2 Workstream A — deterministic candidate lifecycle state
// machine for the campaign pipeline.
//
// Explicit, fail-closed replacement for ad hoc string-state mutations: a
// frozen transition table, strict record validation with sentinel rejection,
// and a canonical serializer. Pure module — no Date.now/Math.random/fs/
// network/child_process/DB/AI authority. Wired into CampaignOrchestrator at
// the admission, reproduction, minimization, triage, and dossier call sites
// (see the lifecycle event mapping in orchestrator.ts).
//
// Phase 15P (A05): safety/privacy/currentness gates are load-bearing in the
// machine itself. The additive GATE_BLOCK event routes a gate failure from
// any pre-triage open state to the UNRESOLVED terminal with a mandatory
// reason code; the frozen table stays the single authority and every illegal
// jump still fails closed.
// ---------------------------------------------------------------------------

import {
  assertEnum,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  requireRuntimeRecord,
} from './runtimeValidation';

/** Version stamped into every lifecycle record; a changed source of truth requires re-admission. */
export const CANDIDATE_LIFECYCLE_VERSION = 'nightwatch.candidate-lifecycle.private.v1' as const;

export const CANDIDATE_LIFECYCLE_STATES = [
  'OBSERVED',
  'ADMITTED',
  'REPRODUCED',
  'MINIMIZED',
  'UNCHANGED',
  'TRIAGED',
  'DOSSIER_READY',
  'REJECTED',
  'UNRESOLVED',
] as const;

export type CandidateLifecycleState = typeof CANDIDATE_LIFECYCLE_STATES[number];

export const CANDIDATE_LIFECYCLE_EVENTS = [
  'ADMIT',
  'REJECT',
  'CONFIRM_REPRODUCTION',
  'FAIL_REPRODUCTION',
  'APPLY_MINIMIZATION',
  'KEEP_UNCHANGED',
  'COMPLETE_TRIAGE',
  'CLASSIFY_REJECTED',
  'CLASSIFY_UNRESOLVED',
  'MARK_DOSSIER_READY',
  'GATE_BLOCK',
] as const;

export type CandidateLifecycleEvent = typeof CANDIDATE_LIFECYCLE_EVENTS[number];

export const CANDIDATE_LIFECYCLE_VARIANTS = ['PROTOCOL_ONLY', 'SEMANTIC'] as const;

export type CandidateLifecycleVariant = typeof CANDIDATE_LIFECYCLE_VARIANTS[number];

/**
 * Metadata-only progression record for one anomaly candidate.
 * `lastReasonCode` carries only safe reason-code tokens, never free text or
 * raw values.
 */
export interface CandidateLifecycleRecord {
  readonly lifecycleVersion: typeof CANDIDATE_LIFECYCLE_VERSION;
  readonly variant: CandidateLifecycleVariant;
  readonly state: CandidateLifecycleState;
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const REASON_CODE_RE = /^[A-Z][A-Z0-9_]{0,127}$/;

const EVENT_SET: ReadonlySet<string> = new Set<string>(CANDIDATE_LIFECYCLE_EVENTS);
const STATE_SET: ReadonlySet<string> = new Set<string>(CANDIDATE_LIFECYCLE_STATES);

const INVALID_RECORD = 'CANDIDATE_LIFECYCLE_INVALID_RECORD';
const RECORD_KEYS = ['lifecycleVersion', 'variant', 'state', 'transitionCount', 'lastReasonCode'] as const;

/**
 * The single authority for candidate progression. Terminal states carry an
 * empty edge map, so terminality is derived from this table and cannot drift
 * from it.
 *
 * Phase 15P (A05) additive extension: `GATE_BLOCK` is the explicit safety/
 * privacy/currentness gate-failure edge. A gate failure at any pre-triage
 * stage routes the record to the UNRESOLVED terminal with a mandatory reason
 * code — it is never swallowed into an ambiguous mid-state. TRIAGED keeps the
 * CLASSIFY_* edges as its only exits; terminal states stay edge-free.
 */
const LIFECYCLE_TRANSITIONS: Readonly<Record<CandidateLifecycleState, Readonly<Partial<Record<CandidateLifecycleEvent, CandidateLifecycleState>>>>> = Object.freeze({
  OBSERVED: Object.freeze({ ADMIT: 'ADMITTED', REJECT: 'REJECTED', GATE_BLOCK: 'UNRESOLVED' }),
  ADMITTED: Object.freeze({ CONFIRM_REPRODUCTION: 'REPRODUCED', FAIL_REPRODUCTION: 'UNRESOLVED', REJECT: 'REJECTED', GATE_BLOCK: 'UNRESOLVED' }),
  REPRODUCED: Object.freeze({ APPLY_MINIMIZATION: 'MINIMIZED', KEEP_UNCHANGED: 'UNCHANGED', FAIL_REPRODUCTION: 'UNRESOLVED', GATE_BLOCK: 'UNRESOLVED' }),
  MINIMIZED: Object.freeze({ COMPLETE_TRIAGE: 'TRIAGED', GATE_BLOCK: 'UNRESOLVED' }),
  UNCHANGED: Object.freeze({ COMPLETE_TRIAGE: 'TRIAGED', GATE_BLOCK: 'UNRESOLVED' }),
  TRIAGED: Object.freeze({ MARK_DOSSIER_READY: 'DOSSIER_READY', CLASSIFY_REJECTED: 'REJECTED', CLASSIFY_UNRESOLVED: 'UNRESOLVED' }),
  DOSSIER_READY: Object.freeze({}),
  REJECTED: Object.freeze({}),
  UNRESOLVED: Object.freeze({}),
});

function assertNoSentinels(value: unknown, path = 'candidateLifecycle'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`${INVALID_RECORD}:PRIVACY_BLOCKED:${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoSentinels(child, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${path}.${key}`);
  }
}

/**
 * Strict exact-shape validation for a persisted or in-memory lifecycle
 * record. Privacy dominates: a sentinel-like string in any field is rejected
 * before any structural analysis can normalize it away.
 */
export function validateCandidateLifecycleRecord(value: unknown): CandidateLifecycleRecord {
  assertNoSentinels(value);
  const record = requireRuntimeRecord(value, INVALID_RECORD);
  assertExactKeys(record, RECORD_KEYS, INVALID_RECORD);
  if (record.lifecycleVersion !== CANDIDATE_LIFECYCLE_VERSION) throw new Error(`${INVALID_RECORD}:VERSION_INVALID`);
  assertEnum(record.variant, CANDIDATE_LIFECYCLE_VARIANTS, `${INVALID_RECORD}:VARIANT`);
  assertEnum(record.state, CANDIDATE_LIFECYCLE_STATES, `${INVALID_RECORD}:STATE`);
  assertNonNegativeInteger(record.transitionCount, `${INVALID_RECORD}:TRANSITION_COUNT`);
  if (record.lastReasonCode !== null) {
    assertString(record.lastReasonCode, `${INVALID_RECORD}:REASON_CODE`);
    if (!REASON_CODE_RE.test(record.lastReasonCode) || SENTINEL_RE.test(record.lastReasonCode)) {
      throw new Error(`${INVALID_RECORD}:REASON_CODE_INVALID`);
    }
  }
  return record as unknown as CandidateLifecycleRecord;
}

/** Fresh frozen record in the mandatory OBSERVED start state. */
export function initialLifecycleRecord(variant: CandidateLifecycleVariant): CandidateLifecycleRecord {
  return Object.freeze({
    lifecycleVersion: CANDIDATE_LIFECYCLE_VERSION,
    variant,
    state: 'OBSERVED',
    transitionCount: 0,
    lastReasonCode: null,
  });
}

function normalizeReasonCode(reasonCode: string | undefined): string | null {
  if (reasonCode === undefined) return null;
  if (!REASON_CODE_RE.test(reasonCode) || SENTINEL_RE.test(reasonCode)) {
    throw new Error('CANDIDATE_LIFECYCLE_REASON_CODE_INVALID');
  }
  return reasonCode;
}

/**
 * Apply one lifecycle event to a validated record and return the next frozen
 * record. Fails closed on corrupt records, unknown events, edges absent from
 * the frozen table, and GATE_BLOCK without a reason code (a gate failure
 * without its gate identity is never accepted); error messages carry only
 * safe tokens (an unvalidated event payload is never echoed).
 */
export function transitionCandidateLifecycle(
  record: CandidateLifecycleRecord,
  event: CandidateLifecycleEvent,
  reasonCode?: string,
): CandidateLifecycleRecord {
  validateCandidateLifecycleRecord(record);
  if (typeof event !== 'string' || !EVENT_SET.has(event)) {
    throw new Error(`CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:${record.state}:EVENT:UNKNOWN:TO:NONE`);
  }
  const nextReasonCode = normalizeReasonCode(reasonCode);
  const target = LIFECYCLE_TRANSITIONS[record.state][event];
  if (target === undefined) {
    throw new Error(`CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:${record.state}:EVENT:${event}:TO:NONE`);
  }
  // Structural legality first, then payload validity: a GATE_BLOCK edge that
  // exists must carry its gate identity; a GATE_BLOCK from a state without
  // the edge is reported as the illegal transition it is.
  if (event === 'GATE_BLOCK' && nextReasonCode === null) {
    throw new Error('CANDIDATE_LIFECYCLE_GATE_REASON_REQUIRED');
  }
  return Object.freeze({
    lifecycleVersion: record.lifecycleVersion,
    variant: record.variant,
    state: target,
    transitionCount: record.transitionCount + 1,
    lastReasonCode: nextReasonCode,
  });
}

/** True iff the state has no outgoing edge (DOSSIER_READY / REJECTED / UNRESOLVED). */
export function isTerminalCandidateLifecycleState(state: CandidateLifecycleState): boolean {
  if (typeof state !== 'string' || !STATE_SET.has(state)) throw new Error('CANDIDATE_LIFECYCLE_STATE_UNKNOWN');
  return Object.keys(LIFECYCLE_TRANSITIONS[state]).length === 0;
}

/**
 * Route a gate failure to an explicit terminal state. The reason code is
 * mandatory — a gate failure without its identity is rejected, never
 * normalized away. Records already in a terminal state are returned
 * unchanged (closing a closed record is an idempotent no-op, not a bypass:
 * the record already carries an explicit terminal verdict). TRIAGED has no
 * GATE_BLOCK edge by design — post-triage exits stay with the CLASSIFY_*
 * edges — so a gate failure at TRIAGED throws; callers that need a total
 * close use `closeCandidateLifecycleOnGateFailure` semantics at their call
 * site (the orchestrator routes TRIAGED through CLASSIFY_UNRESOLVED).
 */
export function gateBlockCandidateLifecycle(
  record: CandidateLifecycleRecord,
  reasonCode: string,
): CandidateLifecycleRecord {
  validateCandidateLifecycleRecord(record);
  if (isTerminalCandidateLifecycleState(record.state)) return record;
  return transitionCandidateLifecycle(record, 'GATE_BLOCK', reasonCode);
}

/**
 * Canonical key-sorted JSON used for persistence and digests. Mirrors the
 * stableCampaignJson idiom in ./identity.
 */
export function stableLifecycleJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'undefined') return 'null';
  if (Array.isArray(value)) return `[${value.map(stableLifecycleJson).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(String(value));
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableLifecycleJson(child)}`)
    .join(',')}}`;
}
