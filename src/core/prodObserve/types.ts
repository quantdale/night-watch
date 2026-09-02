// ---------------------------------------------------------------------------
// Nightwatch C-11 — `PROD_OBSERVE` admission contract.
//
// This module is the AUTHORITY for what production admission means. It is pure
// data and types: no I/O, no clock, no filesystem, no network. Everything that
// touches the world is injected by the caller, so the decision itself is a
// function of explicitly presented facts.
//
// Two design choices here carry the whole campaign.
//
// 1. The chain is a NAMED ORDERED LIST, not a count. The historical
//    `design.md §5.2` said "eleven ordered gates" and then labelled them `G0`
//    through `G11` — twelve identifiers — and the master-plan acceptance
//    criterion inherited the ambiguity by being phrased as a count. A count is
//    unfalsifiable evidence: an implementation can run eleven checks, omit a
//    twelfth, and still satisfy "all eleven gates exercised". Gate identity
//    fails closed where arithmetic cannot.
//
// 2. Every gate has its OWN categorical denial code. A single generic DENY
//    would make the one-fault matrix untestable, because breaking gate N and
//    breaking gate M would be indistinguishable in the receipt.
// ---------------------------------------------------------------------------

export const PRODUCTION_ADMISSION_CHAIN_VERSION = 'nightwatch.production-admission-chain.v1' as const;

/**
 * The authoritative ordered admission chain.
 *
 * Order is load-bearing and is asserted by the receipt. The kill switch appears
 * FIRST and LAST deliberately: it is the cheapest and most urgent check, and a
 * qualification that passed moments ago must not survive a revocation that
 * happens before dispatch.
 */
export const PRODUCTION_ADMISSION_GATES = [
  'G_KILL_SWITCH_ENTRY',
  'G_OWNER_AUTHORIZATION',
  'G_AUTHORIZATION_CLASS',
  // Configuration integrity precedes the organizational window because the
  // window is READ FROM the config. Ordered the other way round, a missing
  // config denied as `ORGANIZATION_WINDOW_ABSENT` and the integrity gate could
  // never be reached, which made it unfalsifiable.
  'G_CONFIGURATION_INTEGRITY',
  'G_ORGANIZATION_WINDOW',
  'G_OBSERVER_IDENTITY',
  'G_SOURCE_CURRENCY',
  'G_READ_ONLY_PROOF',
  'G_ROUTE_AUTHORITY',
  'G_HOST_ADMISSION',
  'G_ADDRESS_POLICY',
  'G_METHOD_AND_BODY',
  'G_PARAMETER_PROVENANCE',
  'G_PRIVACY_CAPABILITY',
  'G_CONTAINMENT_READINESS',
  'G_BUDGET_RESERVATION',
  'G_BREAKER_STATE',
  'G_KILL_SWITCH_PREDISPATCH',
] as const;

export type ProductionAdmissionGate = (typeof PRODUCTION_ADMISSION_GATES)[number];

/**
 * The historical `G0`–`G11` identifiers mapped onto the current chain, kept in
 * source so the reconciliation is machine-checkable rather than prose-only.
 * `G6` maps to TWO gates: host admission and resolved-address admission are
 * independent facts that the historical single gate conflated.
 */
export const HISTORICAL_GATE_MAPPING: Readonly<Record<string, readonly ProductionAdmissionGate[]>> = Object.freeze({
  G0: Object.freeze(['G_OWNER_AUTHORIZATION'] as const),
  G1: Object.freeze(['G_AUTHORIZATION_CLASS'] as const),
  G2: Object.freeze(['G_OBSERVER_IDENTITY'] as const),
  G3: Object.freeze(['G_SOURCE_CURRENCY'] as const),
  G4: Object.freeze(['G_READ_ONLY_PROOF'] as const),
  G5: Object.freeze(['G_ROUTE_AUTHORITY'] as const),
  G6: Object.freeze(['G_HOST_ADMISSION', 'G_ADDRESS_POLICY'] as const),
  G7: Object.freeze(['G_METHOD_AND_BODY'] as const),
  G8: Object.freeze(['G_BUDGET_RESERVATION'] as const),
  G9: Object.freeze(['G_BREAKER_STATE'] as const),
  G10: Object.freeze(['G_PRIVACY_CAPABILITY'] as const),
  G11: Object.freeze(['G_KILL_SWITCH_PREDISPATCH', 'G_KILL_SWITCH_ENTRY'] as const),
});

/** Gates with no historical counterpart, added by the independent review or for explicitness. */
export const REVIEW_ADDED_GATES: readonly ProductionAdmissionGate[] = Object.freeze([
  'G_ORGANIZATION_WINDOW',
  'G_CONFIGURATION_INTEGRITY',
  'G_PARAMETER_PROVENANCE',
  'G_CONTAINMENT_READINESS',
]);

/**
 * One categorical denial code per gate, plus the structural failures that can
 * occur before any gate runs. Free-form text is deliberately impossible: a
 * denial reason must never be able to carry a customer value.
 */
export const PRODUCTION_DENIAL_CODES = [
  'KILL_SWITCH_ENGAGED_AT_ENTRY',
  'AUTHORIZATION_ABSENT',
  'AUTHORIZATION_EXPIRED',
  'AUTHORIZATION_SCOPE_MISMATCH',
  'ALREADY_CONSUMED',
  'AUTHORIZATION_CLASS_NOT_PROD_OBSERVE',
  'ORGANIZATION_WINDOW_ABSENT',
  'ORGANIZATION_WINDOW_NOT_YET_VALID',
  'ORGANIZATION_WINDOW_EXPIRED',
  'CONFIGURATION_INTEGRITY_FAILED',
  'OBSERVER_IDENTITY_BELOW_STAGE_MINIMUM',
  'OBSERVER_IDENTITY_UNKNOWN',
  'SOURCE_INCOMPLETE',
  'SOURCE_STALE',
  'READ_ONLY_PROOF_ABSENT',
  'READ_ONLY_PROOF_STALE',
  'ROUTE_NOT_SOURCE_PROVEN',
  'ROUTE_VOCABULARY_UNTRUSTED',
  'HOST_NOT_ADMITTED',
  'RESOLVED_ADDRESS_NOT_ADMITTED',
  'METHOD_NOT_PERMITTED',
  'BODY_PRESENT',
  'MUTATION_CLASSIFICATION_PRESENT',
  'PARAMETER_PROVENANCE_INVALID',
  'PARAMETER_CONCRETE_VALUE_PRESENT',
  'PRIVACY_CAPABILITY_ABSENT',
  'PRIVACY_CONE_NOT_PRODUCTION',
  'CONTAINMENT_NOT_READY',
  'BUDGET_EXHAUSTED',
  'BREAKER_OPEN',
  'KILL_SWITCH_ENGAGED_BEFORE_DISPATCH',
  'CHAIN_DEFINITION_INVALID',
  'POLICY_NOT_PROVIDED',
] as const;

export type ProductionDenialCode = (typeof PRODUCTION_DENIAL_CODES)[number];

/** Which denial codes each gate may emit. Enforced, so a gate cannot borrow another's reason. */
export const GATE_DENIAL_CODES: Readonly<Record<ProductionAdmissionGate, readonly ProductionDenialCode[]>> = Object.freeze({
  G_KILL_SWITCH_ENTRY: Object.freeze(['KILL_SWITCH_ENGAGED_AT_ENTRY'] as const),
  G_OWNER_AUTHORIZATION: Object.freeze(['AUTHORIZATION_ABSENT', 'AUTHORIZATION_EXPIRED', 'AUTHORIZATION_SCOPE_MISMATCH', 'ALREADY_CONSUMED'] as const),
  G_AUTHORIZATION_CLASS: Object.freeze(['AUTHORIZATION_CLASS_NOT_PROD_OBSERVE'] as const),
  G_ORGANIZATION_WINDOW: Object.freeze(['ORGANIZATION_WINDOW_ABSENT', 'ORGANIZATION_WINDOW_NOT_YET_VALID', 'ORGANIZATION_WINDOW_EXPIRED'] as const),
  G_CONFIGURATION_INTEGRITY: Object.freeze(['CONFIGURATION_INTEGRITY_FAILED'] as const),
  G_OBSERVER_IDENTITY: Object.freeze(['OBSERVER_IDENTITY_BELOW_STAGE_MINIMUM', 'OBSERVER_IDENTITY_UNKNOWN'] as const),
  G_SOURCE_CURRENCY: Object.freeze(['SOURCE_INCOMPLETE', 'SOURCE_STALE'] as const),
  G_READ_ONLY_PROOF: Object.freeze(['READ_ONLY_PROOF_ABSENT', 'READ_ONLY_PROOF_STALE'] as const),
  G_ROUTE_AUTHORITY: Object.freeze(['ROUTE_NOT_SOURCE_PROVEN', 'ROUTE_VOCABULARY_UNTRUSTED'] as const),
  G_HOST_ADMISSION: Object.freeze(['HOST_NOT_ADMITTED'] as const),
  G_ADDRESS_POLICY: Object.freeze(['RESOLVED_ADDRESS_NOT_ADMITTED'] as const),
  G_METHOD_AND_BODY: Object.freeze(['METHOD_NOT_PERMITTED', 'BODY_PRESENT', 'MUTATION_CLASSIFICATION_PRESENT'] as const),
  G_PARAMETER_PROVENANCE: Object.freeze(['PARAMETER_PROVENANCE_INVALID', 'PARAMETER_CONCRETE_VALUE_PRESENT'] as const),
  G_PRIVACY_CAPABILITY: Object.freeze(['PRIVACY_CAPABILITY_ABSENT', 'PRIVACY_CONE_NOT_PRODUCTION'] as const),
  G_CONTAINMENT_READINESS: Object.freeze(['CONTAINMENT_NOT_READY'] as const),
  G_BUDGET_RESERVATION: Object.freeze(['BUDGET_EXHAUSTED'] as const),
  G_BREAKER_STATE: Object.freeze(['BREAKER_OPEN'] as const),
  G_KILL_SWITCH_PREDISPATCH: Object.freeze(['KILL_SWITCH_ENGAGED_BEFORE_DISPATCH'] as const),
});

/**
 * The distinct authorization class. It is a branded string constant rather
 * than a member of any existing environment or run-authority enum, so it
 * cannot be produced by widening an existing value.
 */
export const PROD_OBSERVE_AUTHORIZATION_CLASS = 'PROD_OBSERVE' as const;
export type ProdObserveAuthorizationClass = typeof PROD_OBSERVE_AUTHORIZATION_CLASS;

/**
 * The authorization classes a caller might REQUEST. `PROD_OBSERVE` must never
 * be reachable by asking for any other one, and holding a `PROD_OBSERVE` grant
 * must never authorize a qualification that claims to be something else.
 *
 * This list exists so `G_AUTHORIZATION_CLASS` has something to compare
 * against. Without a requested class the gate could only re-read the grant's
 * own field — which `issueProdObserveGrant` always sets correctly — so it
 * could never deny, and a gate that cannot deny proves nothing.
 */
export const REQUESTABLE_AUTHORIZATION_CLASSES = [
  'PROD_OBSERVE',
  'DEV',
  'NEXT',
  'AUTHENTICATED_BROWSER',
  'REPLAY',
  'SOURCE_INTELLIGENCE',
  'REAL_RUN',
] as const;
export type RequestableAuthorizationClass = (typeof REQUESTABLE_AUTHORIZATION_CLASSES)[number];

/** Promotion stages. C-11 qualifies at PQ and grants nothing beyond it. */
export const PRODUCTION_OBSERVATION_STAGES = ['P0', 'PQ', 'P1', 'P2', 'P3', 'P4'] as const;
export type ProductionObservationStage = (typeof PRODUCTION_OBSERVATION_STAGES)[number];

export const OBSERVER_IDENTITY_CLASSES = ['ORG_ENFORCED_READ_ONLY', 'ORDINARY_USER', 'UNKNOWN'] as const;
export type ObserverIdentityClass = (typeof OBSERVER_IDENTITY_CLASSES)[number];

/**
 * The stage identity policy, as a table rather than as branching prose.
 *
 * P0 and PQ require NO production identity because they make no real contact.
 * P1 is operator-driven and belongs to C-12. From P2 onward
 * `ORG_ENFORCED_READ_ONLY` is required — a NARROWING of `design.md §5.6`,
 * which permitted `ORDINARY_USER` at P2/P3. `ORDINARY_USER` must never
 * silently satisfy a stage requiring organizational read-only enforcement, so
 * the requirement is expressed as data and the gate compares against it.
 */
export const STAGE_OBSERVER_IDENTITY_MINIMUM: Readonly<Record<ProductionObservationStage, ObserverIdentityClass | 'NONE_REQUIRED'>> = Object.freeze({
  P0: 'NONE_REQUIRED',
  PQ: 'NONE_REQUIRED',
  P1: 'ORDINARY_USER',
  P2: 'ORG_ENFORCED_READ_ONLY',
  P3: 'ORG_ENFORCED_READ_ONLY',
  P4: 'ORG_ENFORCED_READ_ONLY',
});

export const CONTAINMENT_QUALIFICATION_STATES = [
  'PROVEN',
  'NOT_EXERCISED_BWRAP_UNAVAILABLE',
  'NOT_READY',
] as const;
export type ContainmentQualificationState = (typeof CONTAINMENT_QUALIFICATION_STATES)[number];

export const BREAKER_CATEGORIES = [
  'PRIVACY_VIOLATION',
  'CONTAINMENT_ANOMALY',
  'UNEXPECTED_REDIRECT',
  'RESPONSE_SIZE_VIOLATION',
  'ROUTE_MISMATCH',
  'MUTATION_SIGNAL',
  'AUTHORIZATION_INVALIDATION',
  'BUDGET_EXHAUSTION',
  'PERSISTENCE_FAILURE',
] as const;
export type BreakerCategory = (typeof BREAKER_CATEGORIES)[number];

export const PRODUCTION_READ_METHODS: readonly string[] = Object.freeze(['GET', 'HEAD']);

/** Post-conditions, evaluated after a response. Each is terminal on violation. */
export const PRODUCTION_POST_CONDITIONS = [
  'NO_REDIRECT_OFF_ALLOWLIST',
  'NO_REDIRECT_LOOP',
  'NO_UNEXPECTED_METHOD',
  'NO_WEBSOCKET_UPGRADE',
  'NO_DOWNLOAD',
  'NO_RESPONSE_SIZE_VIOLATION',
  'NO_MUTATION_SIGNAL',
  'NO_STORAGE_STATE_WRITEBACK',
] as const;
export type ProductionPostCondition = (typeof PRODUCTION_POST_CONDITIONS)[number];

export type GateResult = 'PASS' | 'DENY' | 'NOT_EVALUATED';

export interface GateOutcome {
  readonly gate: ProductionAdmissionGate;
  readonly result: GateResult;
  /** Null on PASS and on NOT_EVALUATED. Categorical only; never free-form. */
  readonly denialCode: ProductionDenialCode | null;
}

export interface AdmissionDecision {
  readonly chainVersion: typeof PRODUCTION_ADMISSION_CHAIN_VERSION;
  readonly gateDefinitionDigest: string;
  readonly orderedGates: readonly ProductionAdmissionGate[];
  readonly outcomes: readonly GateOutcome[];
  readonly allowed: boolean;
  /** The FIRST denial. The chain stops there, so nothing after it is evaluated. */
  readonly denialCode: ProductionDenialCode | null;
  readonly deniedAtGate: ProductionAdmissionGate | null;
  /** True when the decision was reached without any request being dispatched. */
  readonly deniedBeforeDispatch: boolean;
}
