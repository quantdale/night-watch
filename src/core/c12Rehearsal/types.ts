// ---------------------------------------------------------------------------
// C-12 P1 offline rehearsal: vocabulary.
//
// A rehearsal exercises the production-intended MA-8 P1 safety core
// (admission, host/window validation, implementation/PQ binding, subject
// provenance, privacy projection, attribution, kill switch, teardown,
// evidence settlement) against LOCAL mock edges only. Synthetic
// configuration, synthetic subject, synthetic traffic. Zero production
// contact by construction: the runner refuses any non-synthetic fixture.
//
// Rehearsal states never imply live authorization:
//
//   LOCAL_REHEARSAL_READY  inputs admitted for a local run
//   LOCAL_REHEARSAL_PASS   the local run completed cleanly
//   LIVE_PREREQUISITES_MISSING    operator subject/config/deployment truth
//   LIVE_PREREQUISITES_SATISFIED  (unreachable from rehearsal inputs)
//   LIVE_AUTHORIZATION_MISSING    no live grant exists here
//   C12_AUTHORIZED                (unreachable from rehearsal inputs)
//
// Pure vocabulary module; the runner lives in rehearsal.ts.
// ---------------------------------------------------------------------------

/** Version stamped into every rehearsal configuration. */
export const C12_REHEARSAL_CONFIG_VERSION = 'nightwatch.c12-local-rehearsal-config.v1' as const;

/** Version stamped into every rehearsal receipt. */
export const C12_REHEARSAL_RECEIPT_VERSION = 'nightwatch.c12-local-rehearsal-receipt.v1' as const;

export const C12_REHEARSAL_STATES = [
  'LOCAL_REHEARSAL_READY',
  'LOCAL_REHEARSAL_PASS',
  'LIVE_PREREQUISITES_MISSING',
  'LIVE_PREREQUISITES_SATISFIED',
  'LIVE_AUTHORIZATION_MISSING',
  'C12_AUTHORIZED',
] as const;

export type C12RehearsalState = (typeof C12_REHEARSAL_STATES)[number];

/**
 * Scripted traffic mixes for the mock subject. The PASS mix contains only
 * operator-preexisting, application-autonomous, subresource, service-worker,
 * and irrelevant traffic. Every other mix poisons the stream with the named
 * failure to prove the verdict fails closed.
 */
export const C12_REHEARSAL_SCENARIOS = [
  'CLEAN_PASSIVE',
  'WITH_NIGHTWATCH_TRAFFIC',
  'WITH_UNKNOWN_ATTRIBUTION',
  'ZERO_QUALIFYING_EVENTS',
  'KILL_SWITCH_ENGAGED',
] as const;

export type C12RehearsalScenario = (typeof C12_REHEARSAL_SCENARIOS)[number];

export interface C12RehearsalInput {
  /** 40-hex implementation SHA the synthetic scope binds to. */
  readonly implementationSha: string;
  /** PQ receipt digest, `receipt:sha256:<64 hex>` grammar. */
  readonly pqReceiptDigest: string;
  readonly campaignId: string;
  readonly scenario: C12RehearsalScenario;
  /** Injected base clock (ms); the runner advances it deterministically. */
  readonly baseNowMs: number;
}

export interface C12RehearsalReceipt {
  readonly schemaVersion: typeof C12_REHEARSAL_RECEIPT_VERSION;
  readonly rehearsalId: string;
  readonly state: C12RehearsalState;
  readonly scenario: C12RehearsalScenario;
  /** PASS verdict over the mock session; never a production claim. */
  readonly sessionVerdict: string;
  readonly sessionTermination: string;
  readonly tally: {
    readonly total: number;
    readonly operatorPreexisting: number;
    readonly applicationAutonomous: number;
    readonly nightwatchAttributable: number;
    readonly unknown: number;
  };
  readonly qualifyingObservationCount: number;
  readonly admissionDenialCode: string | null;
  readonly deniedAtGate: string | null;
  /** Proves the rehearsal ran the production-intended chain definition. */
  readonly chainDefinitionDigest: string;
  readonly chainVersion: string;
  readonly scopeConfigVersion: string;
  readonly readinessVersion: string;
  readonly privacyPolicyVersion: string;
  readonly rehearsalConfigDigest: string;
  readonly implementationSha: string;
  /**
   * Literal guard: a synthetic rehearsal is not production readiness and
   * never confers live authorization.
   */
  readonly liveAuthorization: 'NOT_CONFERRED_SYNTHETIC_ONLY';
}

export interface C12LiveReadiness {
  readonly prerequisites: 'LIVE_PREREQUISITES_MISSING';
  readonly authorization: 'LIVE_AUTHORIZATION_MISSING';
  readonly missing: readonly [
    'operator production subject',
    'admitted production config',
    'deployment truth',
    'live C-12 authorization',
  ];
}
