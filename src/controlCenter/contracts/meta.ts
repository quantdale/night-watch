import {
  CONTROL_CENTER_AUTHORIZATION_CLASS,
  CONTROL_CENTER_CONTRACT_NAMESPACE,
  CONTROL_CENTER_LIMITS,
  CONTROL_CENTER_SCOPE,
} from './common';

export const CONTROL_CENTER_META_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.meta.v1` as const;

export interface ControlCenterMetaDto {
  readonly schemaVersion: typeof CONTROL_CENTER_META_SCHEMA_VERSION;
  readonly apiVersion: 'v1';
  readonly service: 'NIGHTWATCH_CONTROL_CENTER';
  readonly scope: typeof CONTROL_CENTER_SCOPE;
  readonly authorizationClass: typeof CONTROL_CENTER_AUTHORIZATION_CLASS;
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
  readonly limits: {
    readonly maxPageLimit: typeof CONTROL_CENTER_LIMITS.maxPageLimit;
    readonly maxTimelineLimit: typeof CONTROL_CENTER_LIMITS.maxTimelineLimit;
    readonly maxGraphDepth: typeof CONTROL_CENTER_LIMITS.maxGraphDepth;
    readonly maxGraphNodes: typeof CONTROL_CENTER_LIMITS.maxGraphNodes;
    readonly maxGraphEdges: typeof CONTROL_CENTER_LIMITS.maxGraphEdges;
  };
}
