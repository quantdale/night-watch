// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the P1 observation-scope admission contract.
//
// This module is the AUTHORITY for what P1 passive-observation admission
// means. It is pure data and types: no I/O, no clock, no filesystem, no
// network. Everything that touches the world is injected by the caller, so
// the decision itself is a function of explicitly presented facts.
//
// This cone is INTENTIONALLY a sibling of `src/core/prodObserve/`, never a
// member of it. C-11's hardening asserts its cone's contents and forbids any
// non-test file outside that cone from importing `core/prodObserve`; placing
// P1 inside would force edits to a certified boundary. C-11's request chain,
// privacy algebra, and provenance binding are CONSUMED, never modified.
//
// Two design choices carry the whole campaign (the C-11 lessons, re-applied).
//
// 1. The chain is a NAMED ORDERED LIST, not a count. A count is unfalsifiable
//    evidence: an implementation can run N checks, omit one, and still satisfy
//    "all N gates exercised". Gate identity fails closed where arithmetic
//    cannot.
//
// 2. Every gate has its OWN categorical denial codes. A single generic DENY
//    would make the one-fault matrix untestable, because breaking gate N and
//    breaking gate M would be indistinguishable in the receipt. Free-form text
//    is deliberately impossible: a denial reason must never be able to carry
//    a customer value. Every code below is reachable: a code no fault can
//    produce is a gate that cannot deny (the DEF-C11-1/DEF-C11-2 lesson), so
//    "missing window" denies as `P1_SCOPE_CONFIGURATION_INVALID` (the window
//    is read from the config) and "subject out of scope" denies as
//    `P1_HOST_NOT_ADMITTED` (scope is the admitted host).
// ---------------------------------------------------------------------------

export const P1_OBSERVATION_SCOPE_CHAIN_VERSION = 'nightwatch.p1-observation-scope.v1' as const;

/**
 * The authoritative ordered admission chain.
 *
 * Order is load-bearing and is asserted by hardening. The kill switch appears
 * FIRST and LAST deliberately: it is the cheapest and most urgent check, and
 * an admission that passed moments ago must not survive a revocation that
 * happens before attach. Configuration integrity precedes everything read
 * FROM the configuration; subject presence precedes subject provenance.
 */
export const P1_OBSERVATION_SCOPE_GATES = [
  'P1_KILL_SWITCH_ENTRY',
  'P1_OWNER_AUTHORIZATION',
  'P1_AUTHORIZATION_CLASS',
  'P1_CONFIGURATION_INTEGRITY',
  'P1_IMPLEMENTATION_IDENTITY',
  'P1_PQ_BINDING',
  'P1_SUBJECT_PRESENCE',
  'P1_SUBJECT_PROVENANCE',
  'P1_HOST_ADMISSION',
  'P1_OBSERVATION_WINDOW',
  'P1_OBSERVER_IDENTITY',
  'P1_PRIVACY_CAPABILITY',
  'P1_EVIDENCE_DESTINATION',
  'P1_ATTRIBUTION_CAPABILITY',
  'P1_KILL_SWITCH_PREATTACH',
] as const;

export type P1ObservationScopeGate = (typeof P1_OBSERVATION_SCOPE_GATES)[number];

/**
 * One categorical denial code per gate, plus the structural failures that can
 * occur before any gate runs. Free-form text is deliberately impossible: a
 * denial reason must never be able to carry a customer value.
 */
export const P1_OBSERVATION_DENIAL_CODES = [
  'P1_KILL_SWITCH_ENGAGED_AT_ENTRY',
  'P1_AUTHORIZATION_ABSENT',
  'P1_AUTHORIZATION_EXPIRED',
  'P1_AUTHORIZATION_SCOPE_MISMATCH',
  'P1_ALREADY_CONSUMED',
  'P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE',
  'P1_IMPLEMENTATION_IDENTITY_MISMATCH',
  'P1_PQ_BINDING_ABSENT',
  'P1_PQ_BINDING_INVALID',
  'P1_SCOPE_CONFIGURATION_INVALID',
  'P1_SUBJECT_ABSENT',
  'P1_SUBJECT_PROVENANCE_UNTRUSTED',
  'P1_HOST_NOT_ADMITTED',
  'P1_WINDOW_NOT_YET_VALID',
  'P1_WINDOW_EXPIRED',
  'P1_WINDOW_EXCESSIVE',
  'P1_OBSERVER_IDENTITY_UNKNOWN',
  'P1_PRIVACY_CAPABILITY_ABSENT',
  'P1_PRIVACY_CONE_NOT_PRODUCTION',
  'P1_EVIDENCE_DESTINATION_INVALID',
  'P1_ATTRIBUTION_CAPABILITY_ABSENT',
  'P1_KILL_SWITCH_ENGAGED_BEFORE_ATTACH',
  'P1_CHAIN_DEFINITION_INVALID',
] as const;

export type P1ObservationDenialCode = (typeof P1_OBSERVATION_DENIAL_CODES)[number];

/** Which denial codes each gate may emit. Enforced, so a gate cannot borrow another's reason. */
export const P1_GATE_DENIAL_CODES: Readonly<
  Record<P1ObservationScopeGate, readonly P1ObservationDenialCode[]>
> = Object.freeze({
  P1_KILL_SWITCH_ENTRY: Object.freeze(['P1_KILL_SWITCH_ENGAGED_AT_ENTRY'] as const),
  P1_OWNER_AUTHORIZATION: Object.freeze([
    'P1_AUTHORIZATION_ABSENT',
    'P1_AUTHORIZATION_EXPIRED',
    'P1_AUTHORIZATION_SCOPE_MISMATCH',
    'P1_ALREADY_CONSUMED',
  ] as const),
  P1_AUTHORIZATION_CLASS: Object.freeze(['P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE'] as const),
  P1_IMPLEMENTATION_IDENTITY: Object.freeze(['P1_IMPLEMENTATION_IDENTITY_MISMATCH'] as const),
  P1_PQ_BINDING: Object.freeze(['P1_PQ_BINDING_ABSENT', 'P1_PQ_BINDING_INVALID'] as const),
  P1_CONFIGURATION_INTEGRITY: Object.freeze(['P1_SCOPE_CONFIGURATION_INVALID'] as const),
  P1_SUBJECT_PRESENCE: Object.freeze(['P1_SUBJECT_ABSENT'] as const),
  P1_SUBJECT_PROVENANCE: Object.freeze(['P1_SUBJECT_PROVENANCE_UNTRUSTED'] as const),
  P1_HOST_ADMISSION: Object.freeze(['P1_HOST_NOT_ADMITTED'] as const),
  P1_OBSERVATION_WINDOW: Object.freeze([
    'P1_WINDOW_NOT_YET_VALID',
    'P1_WINDOW_EXPIRED',
    'P1_WINDOW_EXCESSIVE',
  ] as const),
  P1_OBSERVER_IDENTITY: Object.freeze(['P1_OBSERVER_IDENTITY_UNKNOWN'] as const),
  P1_PRIVACY_CAPABILITY: Object.freeze([
    'P1_PRIVACY_CAPABILITY_ABSENT',
    'P1_PRIVACY_CONE_NOT_PRODUCTION',
  ] as const),
  P1_EVIDENCE_DESTINATION: Object.freeze(['P1_EVIDENCE_DESTINATION_INVALID'] as const),
  P1_ATTRIBUTION_CAPABILITY: Object.freeze(['P1_ATTRIBUTION_CAPABILITY_ABSENT'] as const),
  P1_KILL_SWITCH_PREATTACH: Object.freeze(['P1_KILL_SWITCH_ENGAGED_BEFORE_ATTACH'] as const),
});

/**
 * The distinct authorization class. It is a branded string constant rather
 * than a member of any existing environment or run-authority enum, so it
 * cannot be produced by widening an existing value — and it is distinct from
 * C-11's `PROD_OBSERVE`, so P1 authority can never alias request authority.
 */
export const P1_OBSERVE_AUTHORIZATION_CLASS = 'P1_OBSERVE' as const;
export type P1ObserveAuthorizationClass = typeof P1_OBSERVE_AUTHORIZATION_CLASS;
/**
 * The authorization classes a caller might CLAIM. `P1_OBSERVE` must never be
 * reachable by requesting DEV, NEXT, authenticated-browser, replay,
 * source-intelligence, generic real-run, or C-11 request authority — and a
 * `P1_OBSERVE` grant must never authorize a run claiming to be one of those.
 */
export const P1_REQUESTABLE_AUTHORIZATION_CLASSES = [
  'P1_OBSERVE',
  'PROD_OBSERVE',
  'DEV',
  'NEXT',
  'AUTHENTICATED_BROWSER',
  'REPLAY',
  'SOURCE_INTELLIGENCE',
  'REAL_RUN',
] as const;
export type P1RequestableAuthorizationClass =
  (typeof P1_REQUESTABLE_AUTHORIZATION_CLASSES)[number];

/**
 * P1 admits exactly one stage. There is no P1→P2 transition inside this cone:
 * promotion requires a fresh grant of a different class that this cone can
 * neither construct nor consume.
 */
export const P1_OBSERVATION_STAGE = 'P1' as const;
export type P1ObservationStage = typeof P1_OBSERVATION_STAGE;

// Duplicated from the C-11 vocabulary DELIBERATELY, not imported: the C-11
// reverse-isolation rule fails any non-test file outside `src/core/prodObserve/`
// that imports `core/prodObserve`. F-12 demands separation in both directions,
// so a small literal duplication with this justification is safer than an
// import or an allowlist exception to a certified rule.
export const P1_OBSERVER_IDENTITY_CLASSES = [
  'ORG_ENFORCED_READ_ONLY',
  'ORDINARY_USER',
  'UNKNOWN',
] as const;
export type P1ObserverIdentityClass = (typeof P1_OBSERVER_IDENTITY_CLASSES)[number];
/**
 * P1 minimum is `ORDINARY_USER` (the C-12 addition recorded in the C-11
 * design §5.6). Both named classes satisfy it; `UNKNOWN` never does. There
 * is deliberately no below-minimum code: with exactly three identity values
 * and two passing, a below-minimum code would be a gate that cannot deny
 * (the DEF-C11-2 lesson).
 */
export function p1ObserverIdentitySatisfies(actual: P1ObserverIdentityClass): {
  readonly ok: boolean;
  readonly code: Extract<P1ObservationDenialCode, 'P1_OBSERVER_IDENTITY_UNKNOWN'> | null;
} {
  if (actual === 'UNKNOWN') return { ok: false, code: 'P1_OBSERVER_IDENTITY_UNKNOWN' };
  return { ok: true, code: null };
}


/**
 * Provenance of the observation subject. Only `OPERATOR_CREATED` admits:
 * Nightwatch must never create the authenticated production state it then
 * calls "passive", and an ambiguous subject is a refusal, not a warning.
 */
export const P1_SUBJECT_PROVENANCE_CLASSES = [
  'OPERATOR_CREATED',
  'NIGHTWATCH_CREATED',
  'UNKNOWN',
] as const;
export type P1SubjectProvenanceClass = (typeof P1_SUBJECT_PROVENANCE_CLASSES)[number];

/**
 * The operator-supplied descriptor of the already-existing subject.
 * Nightwatch receives this; it never builds it from a login, a navigation,
 * or a session it created.
 */
export interface P1ObservationSubject {
  /** Opaque operator-supplied nonce identifying the already-loaded page/session. Never a credential. */
  readonly subjectNonce: string;
  readonly provenance: P1SubjectProvenanceClass;
  /** The production host the subject belongs to. Must equal the admitted host. */
  readonly host: string;
}

/**
 * Network-attribution classes (F-13 / UA-8 resolution). Classified per
 * observed request from mechanical evidence — causal link to a post-attach
 * Nightwatch action, pre-attach existence proof, initiator metadata,
 * event-stream provenance — never from timestamps alone.
 */
export const P1_ATTRIBUTION_CLASSES = [
  'OPERATOR_PREEXISTING',
  'APPLICATION_AUTONOMOUS',
  'NIGHTWATCH_ATTRIBUTABLE',
  'UNKNOWN',
] as const;
export type P1AttributionClass = (typeof P1_ATTRIBUTION_CLASSES)[number];

/**
 * Terminal session classification. Exactly one value is a PASS
 * (`PASSIVE_OBSERVATION_COMPLETE`, and only with qualifying observations and
 * zero attributable/unknown traffic). Zero samples never pass (§10).
 */
export const P1_SESSION_OUTCOMES = [
  'NO_SUBJECT',
  'NO_QUALIFYING_OBSERVATION',
  'ATTRIBUTION_UNKNOWN',
  'NIGHTWATCH_TRAFFIC_DETECTED',
  'OBSERVATION_WINDOW_EMPTY',
  'PASSIVE_OBSERVATION_COMPLETE',
] as const;
export type P1SessionOutcome = (typeof P1_SESSION_OUTCOMES)[number];

/** The attribution capability the operator binds: only an attributing source admits. */
export const P1_ATTRIBUTION_CAPABILITIES = ['ATTRIBUTING_PROXY', 'UNKNOWN'] as const;
export type P1AttributionCapability = (typeof P1_ATTRIBUTION_CAPABILITIES)[number];

export type P1GateResult = 'PASS' | 'DENY' | 'NOT_EVALUATED';

export interface P1GateOutcome {
  readonly gate: P1ObservationScopeGate;
  readonly result: P1GateResult;
  readonly denialCode: P1ObservationDenialCode | null;
}

export interface P1AdmissionDecision {
  readonly chainVersion: typeof P1_OBSERVATION_SCOPE_CHAIN_VERSION;
  readonly gateDefinitionDigest: string;
  readonly orderedGates: readonly P1ObservationScopeGate[];
  readonly outcomes: readonly P1GateOutcome[];
  readonly allowed: boolean;
  readonly denialCode: P1ObservationDenialCode | null;
  readonly deniedAtGate: P1ObservationScopeGate | null;
  /** Every denial in the P1 evaluator happens before any attach, because the evaluator never attaches. */
  readonly deniedBeforeAttach: boolean;
}
