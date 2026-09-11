// ---------------------------------------------------------------------------
// C-13 prerequisite — `PRODUCTION_READ_NO_DEPLOYMENT_FACT`.
//
// The measured truth at C-08 is `POSITIVE_DEPLOYMENT_FACTS: 0`: no production
// route can be traced to a deployment fact, so a production read authorized
// today would grant authority from an `INFERENCE`, violating `I-3`. C-13 and
// C-14 are therefore not merely unauthorized — they are structurally
// unreachable.
//
// This module makes that structural rather than documentary. A production read
// request is REFUSED AT CONSTRUCTION unless the route it targets carries a
// positive `DEPLOYMENT_FACT`, and the refusal is independent of authorization
// state: the fact guard is evaluated before the authorization is even read, so
// an otherwise valid, unconsumed, in-window `PROD_OBSERVE` grant cannot make
// an inferred route constructible.
//
// It grants nothing. A positive fact does not authorize a request; it is only a
// necessary condition, and every C-11 gate still applies. The module has no
// dispatch capability at all — there is no code path here that contacts
// anything.
// ---------------------------------------------------------------------------

import { FACT_CATEGORIES, type FactCategory } from '../systemMap/model';

export const PRODUCTION_READ_GUARD_VERSION = 'nightwatch.production-read-guard.v1' as const;

/** The distinct refusal code. Deliberately NOT a member of the C-11 chain's
 *  denial vocabulary: this guard runs at construction, before the chain, and
 *  the C-11 receipt must not be able to borrow it. */
export const PRODUCTION_READ_NO_DEPLOYMENT_FACT = 'PRODUCTION_READ_NO_DEPLOYMENT_FACT' as const;
export const PRODUCTION_READ_REQUEST_MALFORMED = 'PRODUCTION_READ_REQUEST_MALFORMED' as const;

const EV_RE = /^ev:sha256:[0-9a-f]{24,64}$/;
/** `repo @ SHA : path`, the Phase 9A.1 provenance discipline. */
const PROVENANCE_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?@[0-9a-f]{40}:[^\s]{1,500}$/;

/** The presented deployment-fact state for one route. */
export interface ProductionReadDeploymentFact {
  readonly factCategory: FactCategory;
  readonly established: boolean;
  /** `ev:sha256:<24>`, or null when no evidence was derived. */
  readonly evidenceIdentity: string | null;
  /** `repo @ SHA : path`, or null when no evidence was derived. */
  readonly provenance: string | null;
}

export interface ProductionReadAuthorizationState {
  readonly present: boolean;
  readonly consumed: boolean;
}

export interface ProductionReadRequestDraft {
  readonly campaignId: string;
  readonly method: string;
  readonly host: string;
  /** A route TEMPLATE, never a concrete path. */
  readonly routeTemplate: string;
  readonly deploymentFact: ProductionReadDeploymentFact;
  /** Inspected only AFTER the deployment-fact guard. Never a substitute for it. */
  readonly authorization: ProductionReadAuthorizationState | null;
}

export interface ProductionReadRequest {
  readonly schemaVersion: typeof PRODUCTION_READ_GUARD_VERSION;
  readonly campaignId: string;
  readonly method: string;
  readonly host: string;
  readonly routeTemplate: string;
  readonly deploymentFactCategory: 'DEPLOYMENT_FACT';
  readonly deploymentEvidenceIdentity: string;
  readonly deploymentProvenance: string;
  /** Recorded for the receipt. The guard already established positivity. */
  readonly authorizationPresent: boolean;
}

export class ProductionReadDeploymentFactRefusal extends Error {
  readonly code = PRODUCTION_READ_NO_DEPLOYMENT_FACT;
  readonly factCategory: FactCategory;
  readonly established: boolean;

  constructor(fact: ProductionReadDeploymentFact) {
    // Bounded categorical detail only: the category and the established bit.
    // No host, route, service or path is echoed into the error.
    super(`${PRODUCTION_READ_NO_DEPLOYMENT_FACT}: ${fact.factCategory}:${fact.established ? 'ESTABLISHED' : 'NOT_ESTABLISHED'}`);
    this.name = 'ProductionReadDeploymentFactRefusal';
    this.factCategory = fact.factCategory;
    this.established = fact.established;
  }
}

export class ProductionReadRequestMalformedError extends Error {
  readonly code = PRODUCTION_READ_REQUEST_MALFORMED;
  constructor(detail: string) {
    super(`${PRODUCTION_READ_REQUEST_MALFORMED}: ${detail}`);
    this.name = 'ProductionReadRequestMalformedError';
  }
}

function isPositiveDeploymentFact(fact: ProductionReadDeploymentFact): boolean {
  return fact.factCategory === 'DEPLOYMENT_FACT'
    && fact.established === true
    && typeof fact.evidenceIdentity === 'string'
    && EV_RE.test(fact.evidenceIdentity)
    && typeof fact.provenance === 'string'
    && PROVENANCE_RE.test(fact.provenance);
}

/**
 * Construct a production read request, refusing an inferred/unknown route.
 *
 * GUARD ORDER IS THE CONTRACT: the deployment fact is checked before the
 * authorization field is inspected, so removing or weakening authorization
 * cannot be confused with the fact guard, and a fully valid authorization
 * against an inferred route still refuses.
 */
export function constructProductionReadRequest(draft: ProductionReadRequestDraft): ProductionReadRequest {
  if (draft === null || typeof draft !== 'object') throw new ProductionReadRequestMalformedError('DRAFT');
  if (typeof draft.campaignId !== 'string' || draft.campaignId.trim() === '') {
    throw new ProductionReadRequestMalformedError('CAMPAIGN');
  }
  if (typeof draft.method !== 'string' || draft.method.trim() === '') {
    throw new ProductionReadRequestMalformedError('METHOD');
  }
  if (typeof draft.host !== 'string' || draft.host.trim() === '') {
    throw new ProductionReadRequestMalformedError('HOST');
  }
  if (typeof draft.routeTemplate !== 'string' || !draft.routeTemplate.startsWith('/')) {
    throw new ProductionReadRequestMalformedError('ROUTE_TEMPLATE');
  }

  const fact = draft.deploymentFact;
  if (fact === null || typeof fact !== 'object' || !(FACT_CATEGORIES as readonly string[]).includes(fact.factCategory)) {
    throw new ProductionReadRequestMalformedError('DEPLOYMENT_FACT');
  }
  // ---- the guard: independent of authorization state ----
  if (!isPositiveDeploymentFact(fact)) throw new ProductionReadDeploymentFactRefusal(fact);

  return Object.freeze({
    schemaVersion: PRODUCTION_READ_GUARD_VERSION,
    campaignId: draft.campaignId,
    method: draft.method,
    host: draft.host,
    routeTemplate: draft.routeTemplate,
    deploymentFactCategory: 'DEPLOYMENT_FACT' as const,
    deploymentEvidenceIdentity: fact.evidenceIdentity as string,
    deploymentProvenance: fact.provenance as string,
    authorizationPresent: draft.authorization?.present === true,
  });
}

export const PRODUCTION_READ_CAPABILITY_VERSION = 'nightwatch.production-read-capability.v1' as const;
export const PRODUCTION_READ_CAPABILITY_STATES = ['AVAILABLE', 'UNAVAILABLE_CAPABILITY'] as const;
export type ProductionReadCapabilityState = (typeof PRODUCTION_READ_CAPABILITY_STATES)[number];

export interface ProductionReadCapability {
  readonly schemaVersion: typeof PRODUCTION_READ_CAPABILITY_VERSION;
  readonly capability: 'PRODUCTION_READ';
  readonly state: ProductionReadCapabilityState;
  readonly available: boolean;
  readonly positiveDeploymentFacts: number;
  /** The count is the reason, not a flag: `POSITIVE_DEPLOYMENT_FACTS: 0`. */
  readonly reason: string | null;
}

/**
 * Report the production-read capability from the census figure. The COUNT
 * gates the capability: zero facts means unavailable, and the reason names the
 * count rather than a boolean so the figure cannot drift from the reason.
 */
export function productionReadCapability(positiveDeploymentFacts: number): ProductionReadCapability {
  if (!Number.isInteger(positiveDeploymentFacts) || positiveDeploymentFacts < 0) {
    throw new Error('PRODUCTION_READ_CAPABILITY_COUNT_INVALID');
  }
  if (positiveDeploymentFacts === 0) {
    return Object.freeze({
      schemaVersion: PRODUCTION_READ_CAPABILITY_VERSION,
      capability: 'PRODUCTION_READ' as const,
      state: 'UNAVAILABLE_CAPABILITY' as const,
      available: false as const,
      positiveDeploymentFacts,
      reason: `POSITIVE_DEPLOYMENT_FACTS: ${positiveDeploymentFacts}`,
    });
  }
  return Object.freeze({
    schemaVersion: PRODUCTION_READ_CAPABILITY_VERSION,
    capability: 'PRODUCTION_READ' as const,
    state: 'AVAILABLE' as const,
    available: true as const,
    positiveDeploymentFacts,
    reason: null,
  });
}
