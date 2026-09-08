import {
  CONTROL_CENTER_AUTHORIZATION_CLASS,
  CONTROL_CENTER_CONTRACT_NAMESPACE,
  CONTROL_CENTER_LIMITS,
  CONTROL_CENTER_SCOPE,
} from './common';

export const CONTROL_CENTER_META_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.meta.v1` as const;

/**
 * NW-09. Whether THIS server instance serves the owner-local review write
 * route.
 *
 * The capability existed only as library injection: the shipped launcher
 * built a collector with no review authority and a server with no
 * `reviewDecision`, so the documented local review workflow could not be
 * reached from the actual entry point, and the UI had no way to ask. It
 * inferred availability from a per-finding `reviewIdentity`, which answers a
 * different question — whether a review STORE exists — so the UI could offer
 * controls that POST to a route the server does not serve.
 *
 * `DISABLED` is the default and means POST is refused for every path.
 */
export const CONTROL_CENTER_LOCAL_REVIEW_CAPABILITIES = ['ENABLED', 'DISABLED'] as const;
export type ControlCenterLocalReviewCapability = (typeof CONTROL_CENTER_LOCAL_REVIEW_CAPABILITIES)[number];

export interface ControlCenterMetaDto {
  readonly schemaVersion: typeof CONTROL_CENTER_META_SCHEMA_VERSION;
  readonly apiVersion: 'v1';
  readonly service: 'NIGHTWATCH_CONTROL_CENTER';
  readonly scope: typeof CONTROL_CENTER_SCOPE;
  readonly authorizationClass: typeof CONTROL_CENTER_AUTHORIZATION_CLASS;
  /**
   * Product and system state. Unchanged and still true when local review is
   * enabled: an owner-local review decision writes only to the owner's own
   * private review store, and confers no product, execution or organizational
   * authority. `localReviewDecision` reports that store's write route
   * separately rather than overloading this flag.
   */
  readonly readOnly: true;
  readonly executionAuthority: 'NONE';
  readonly mutationAuthority: 'NONE';
  readonly productContact: 'DISABLED';
  readonly externalNetwork: 'DISABLED';
  readonly findingsStorage: 'OWNER_LOCAL_ONLY';
  readonly ownerScopeStatus: 'FROZEN_BY_OWNER';
  readonly ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  readonly features: {
    readonly readiness: true;
    readonly safety: true;
    readonly runs: true;
    readonly executionGraph: true;
    readonly campaign: true;
    readonly sourceIntelligence: true;
    readonly findings: true;
    readonly notifications: true;
  };
  /**
   * Authoritative: the SERVER fills this from the same option that creates
   * the route, so the reported capability and the served surface cannot
   * disagree. A collector's value is advisory and is overwritten.
   */
  readonly localReviewDecision: ControlCenterLocalReviewCapability;
  readonly limits: {
    readonly maxPageLimit: typeof CONTROL_CENTER_LIMITS.maxPageLimit;
    readonly maxTimelineLimit: typeof CONTROL_CENTER_LIMITS.maxTimelineLimit;
    readonly maxGraphDepth: typeof CONTROL_CENTER_LIMITS.maxGraphDepth;
    readonly maxGraphNodes: typeof CONTROL_CENTER_LIMITS.maxGraphNodes;
    readonly maxGraphEdges: typeof CONTROL_CENTER_LIMITS.maxGraphEdges;
  };
}
