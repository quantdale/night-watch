// ---------------------------------------------------------------------------
// Nightwatch C-10 — versioned production privacy capability/policy object.
//
// Campaign brief §18: policy differences between DEV and production are NOT
// scattered `if (production)` checks. They live in one versioned capability
// object with FAIL-CLOSED construction: a production policy physically cannot
// be constructed with screenshots, Playwright traces or page console text
// enabled, and cannot be pointed at the DEV findings store.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';

export const PRODUCTION_PRIVACY_POLICY_VERSION = 'nightwatch.production-privacy-policy.v1' as const;

export type PrivacyCone = 'PRODUCTION' | 'DEV';

export interface PrivacyPolicy {
  readonly version: typeof PRODUCTION_PRIVACY_POLICY_VERSION;
  readonly cone: PrivacyCone;
  /** Production: prohibited. DEV: existing redacted-screenshot policy stands. */
  readonly screenshots: 'PROHIBITED' | 'ALLOWED_REDACTED';
  /** Production: prohibited. */
  readonly playwrightTrace: 'PROHIBITED' | 'ALLOWED';
  /** Production: page-provided console text may never persist. */
  readonly pageConsoleText: 'PROHIBITED' | 'ALLOWED_REDACTED';
  /** Production: zero bytes of any response body are retained. */
  readonly responseBodyRetention: 'ZERO_BYTES' | 'BOUNDED_REDACTED';
  /** Production: retained URL identity is a route template only. */
  readonly urlRetention: 'ROUTE_TEMPLATE_ONLY' | 'REDACTED_URL';
  /** Production strict mode denies persistence for any unproven key. */
  readonly keyProvenanceRequirement: 'REQUIRE_SOURCE_PROVEN' | 'ALLOW_BOUNDED_DYNAMIC';
  /** F-15: no durable value-derived digest exists in the production contract. */
  readonly durableValueDigest: 'ABSENT';
  /** Separate policy identity; production never resolves the DEV store. */
  readonly storeIdentity: 'PRODUCTION_FINDINGS' | 'DEV_FINDINGS';
  /** F-17: production browsers use a private ephemeral profile with no cache. */
  readonly browserProfile: 'EPHEMERAL_PRIVATE_NO_CACHE' | 'DEFAULT';
}

/** The capabilities a production policy may never carry, whatever a caller asks for. */
const PRODUCTION_FIXED: Readonly<Partial<PrivacyPolicy>> = Object.freeze({
  screenshots: 'PROHIBITED',
  playwrightTrace: 'PROHIBITED',
  pageConsoleText: 'PROHIBITED',
  responseBodyRetention: 'ZERO_BYTES',
  urlRetention: 'ROUTE_TEMPLATE_ONLY',
  durableValueDigest: 'ABSENT',
  storeIdentity: 'PRODUCTION_FINDINGS',
  browserProfile: 'EPHEMERAL_PRIVATE_NO_CACHE',
});

export interface ProductionPolicyRequest {
  /** The ONLY production-tunable dimension: strict vs bounded-dynamic keys. */
  readonly keyProvenanceRequirement?: PrivacyPolicy['keyProvenanceRequirement'];
  /**
   * Anything a caller attempts to set here is checked against the fixed
   * production capabilities and rejected if it would weaken them. This is the
   * fail-closed seam: a future caller cannot "just enable" a screenshot.
   */
  readonly requestedCapabilities?: Readonly<Partial<PrivacyPolicy>>;
}

/**
 * Construct the production privacy policy. Fail-closed: any requested
 * capability that differs from the fixed production value throws a categorical
 * `PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY`, naming only WHICH
 * capability was refused — never the requested value.
 */
export function createProductionPrivacyPolicy(request: ProductionPolicyRequest = {}): PrivacyPolicy {
  const requested = request.requestedCapabilities ?? {};
  if (requested.screenshots !== undefined && requested.screenshots !== 'PROHIBITED') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'SCREENSHOTS_PROHIBITED');
  }
  if (requested.playwrightTrace !== undefined && requested.playwrightTrace !== 'PROHIBITED') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'TRACE_PROHIBITED');
  }
  if (requested.pageConsoleText !== undefined && requested.pageConsoleText !== 'PROHIBITED') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'CONSOLE_TEXT_PROHIBITED');
  }
  if (requested.storeIdentity !== undefined && requested.storeIdentity !== 'PRODUCTION_FINDINGS') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'STORE_IDENTITY');
  }
  if (requested.cone !== undefined && requested.cone !== 'PRODUCTION') {
    failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'CONE_MISMATCH');
  }
  for (const key of ['responseBodyRetention', 'urlRetention', 'durableValueDigest', 'browserProfile'] as const) {
    const asked = requested[key];
    if (asked !== undefined && asked !== PRODUCTION_FIXED[key]) {
      failProduction('PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY', 'PROVENANCE_AMBIGUOUS');
    }
  }
  const keyProvenanceRequirement = request.keyProvenanceRequirement ?? 'ALLOW_BOUNDED_DYNAMIC';
  if (keyProvenanceRequirement !== 'REQUIRE_SOURCE_PROVEN' && keyProvenanceRequirement !== 'ALLOW_BOUNDED_DYNAMIC') {
    failProduction('PRODUCTION_PRIVACY_POLICY_INVALID', 'FIELD_TYPE');
  }
  return Object.freeze({
    version: PRODUCTION_PRIVACY_POLICY_VERSION,
    cone: 'PRODUCTION',
    screenshots: 'PROHIBITED',
    playwrightTrace: 'PROHIBITED',
    pageConsoleText: 'PROHIBITED',
    responseBodyRetention: 'ZERO_BYTES',
    urlRetention: 'ROUTE_TEMPLATE_ONLY',
    keyProvenanceRequirement,
    durableValueDigest: 'ABSENT',
    storeIdentity: 'PRODUCTION_FINDINGS',
    browserProfile: 'EPHEMERAL_PRIVATE_NO_CACHE',
  });
}

/**
 * The DEV policy. Campaign brief §18: existing DEV/local workflows are not
 * broken merely because production policy is stricter, so DEV keeps redacted
 * screenshots and its existing store, and never claims production identity.
 */
export function createDevPrivacyPolicy(): PrivacyPolicy {
  return Object.freeze({
    version: PRODUCTION_PRIVACY_POLICY_VERSION,
    cone: 'DEV',
    screenshots: 'ALLOWED_REDACTED',
    playwrightTrace: 'ALLOWED',
    pageConsoleText: 'ALLOWED_REDACTED',
    responseBodyRetention: 'BOUNDED_REDACTED',
    urlRetention: 'REDACTED_URL',
    keyProvenanceRequirement: 'ALLOW_BOUNDED_DYNAMIC',
    durableValueDigest: 'ABSENT',
    storeIdentity: 'DEV_FINDINGS',
    browserProfile: 'DEFAULT',
  });
}

/** Categorical guard used by the browser/evidence seams. */
export function assertProductionCone(policy: PrivacyPolicy): void {
  if (policy.cone !== 'PRODUCTION') failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'CONE_MISMATCH');
}

/** True when the policy forbids any durable screenshot. */
export function screenshotsProhibited(policy: PrivacyPolicy): boolean {
  return policy.screenshots === 'PROHIBITED';
}

/** True when the policy forbids a Playwright trace. */
export function tracesProhibited(policy: PrivacyPolicy): boolean {
  return policy.playwrightTrace === 'PROHIBITED';
}

/** True when page-provided console text may never be persisted. */
export function pageConsoleTextProhibited(policy: PrivacyPolicy): boolean {
  return policy.pageConsoleText === 'PROHIBITED';
}
