// ---------------------------------------------------------------------------
// Nightwatch AH-1 — C-12 operator-readiness preflight contract.
//
// A LOCAL-ONLY advisory evaluator. It answers: "if a C-12 authorization were
// granted now, what prerequisites are still missing?" It opens no browser,
// performs no DNS/HTTP, reads no credential, consumes no authorization, and
// manufactures no readiness: missing or inferred external information stays a
// blocker. A fully synthetic fixture can reach READY; the real current
// machine legitimately remains blocked.
//
// Self-contained by design: the MA-8 hardening rule allows only the P1 cone
// and tests to import P1 machinery, so this cone duplicates the small
// literals it needs (window cap, provenance classes) with justification and
// a unit test pinning them to the P1 source of truth.
// ---------------------------------------------------------------------------

export const C12_READINESS_VERSION = 'nightwatch.c12-readiness.v1' as const;

/** Duplicated from prodObserveP1/scopeConfig.ts (import-isolated cone). */
export const C12_MAX_OBSERVATION_WINDOW_MS = 900_000 as const;
/** Duplicated from prodObserveP1/types.ts (import-isolated cone). */
export const C12_SUBJECT_PROVENANCE_CLASSES = ['OPERATOR_CREATED', 'NIGHTWATCH_CREATED', 'UNKNOWN'] as const;
export type C12SubjectProvenance = (typeof C12_SUBJECT_PROVENANCE_CLASSES)[number];

export const C12_BLOCKER_CODES = [
  'BLOCKED_IMPLEMENTATION_BINDING',
  'BLOCKED_PQ_BINDING',
  'BLOCKED_OPERATOR_SUBJECT',
  'BLOCKED_SCOPE_CONFIG',
  'BLOCKED_DEPLOYMENT_FACT',
  'BLOCKED_ATTRIBUTION',
  'BLOCKED_PRIVACY_DESTINATION',
  'BLOCKED_KILL_SWITCH',
  'BLOCKED_WINDOW',
  'BLOCKED_AUTHORIZATION',
] as const;
export type C12BlockerCode = (typeof C12_BLOCKER_CODES)[number];

export interface C12ImplementationBinding {
  readonly currentSha: string;
  readonly requiredSha: string;
}

export interface C12PqBinding {
  readonly receiptDigest: string | null;
  readonly boundSha: string | null;
}

export interface C12OperatorSubject {
  readonly present: boolean;
  readonly provenance: C12SubjectProvenance;
}

export interface C12ScopeConfigDescriptor {
  /** Exact external production host (hostname only; no scheme, port, or wildcard). */
  readonly host: string;
  readonly windowStartIso: string;
  readonly windowEndIso: string;
  /** Approved private evidence destination descriptor (path-like, never a URL). */
  readonly evidenceDestination: string;
  readonly destinationApproved: boolean;
  readonly killSwitchArmed: boolean;
}

export interface C12DeploymentFact {
  /** INFERRED never admits: only PROVEN satisfies. */
  readonly state: 'PROVEN' | 'UNKNOWN' | 'INFERRED';
}

export interface C12AttributionDescriptor {
  readonly capability: 'ATTRIBUTING_PROXY' | 'UNKNOWN';
}

export interface C12AuthorizationDescriptor {
  readonly authClass: string;
  readonly fresh: boolean;
  readonly consumed: boolean;
}

export interface C12ReadinessInput {
  readonly implementation: C12ImplementationBinding;
  readonly pqBinding: C12PqBinding;
  readonly operatorSubject: C12OperatorSubject;
  readonly scopeConfig: C12ScopeConfigDescriptor | null;
  readonly deploymentFact: C12DeploymentFact;
  readonly attribution: C12AttributionDescriptor;
  readonly authorization: C12AuthorizationDescriptor | null;
  readonly killSwitchEngaged: boolean;
  /** Injected clock; the evaluator never reads the real one. */
  readonly nowIso: string;
}

export interface C12Blocker {
  readonly code: C12BlockerCode;
  readonly basis: string;
}

export interface C12ReadinessReport {
  readonly schemaVersion: typeof C12_READINESS_VERSION;
  readonly status: 'READY' | 'BLOCKED';
  readonly blockers: readonly C12Blocker[];
  readonly deterministicDigest: string;
}
