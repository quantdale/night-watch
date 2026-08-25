import {
  CONTROL_CENTER_AUTHORIZATION_CLASS,
  CONTROL_CENTER_LIMITS,
  CONTROL_CENTER_SCOPE,
} from '../contracts/common';
import type { ControlCenterMetaDto } from '../contracts/meta';
import { CONTROL_CENTER_META_SCHEMA_VERSION } from '../contracts/meta';

/** Fixed local posture metadata; it never reports product or environment state. */
export function projectMeta(): ControlCenterMetaDto {
  return {
    schemaVersion: CONTROL_CENTER_META_SCHEMA_VERSION,
    apiVersion: 'v1',
    service: 'NIGHTWATCH_CONTROL_CENTER',
    scope: CONTROL_CENTER_SCOPE,
    authorizationClass: CONTROL_CENTER_AUTHORIZATION_CLASS,
    readOnly: true,
    executionAuthority: 'NONE',
    mutationAuthority: 'NONE',
    productContact: 'DISABLED',
    externalNetwork: 'DISABLED',
    findingsStorage: 'OWNER_LOCAL_ONLY',
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    features: {
      readiness: true,
      safety: true,
      runs: true,
      executionGraph: true,
      campaign: true,
      sourceIntelligence: true,
      findings: true,
      notifications: true,
    },
    limits: {
      maxPageLimit: CONTROL_CENTER_LIMITS.maxPageLimit,
      maxTimelineLimit: CONTROL_CENTER_LIMITS.maxTimelineLimit,
      maxGraphDepth: CONTROL_CENTER_LIMITS.maxGraphDepth,
      maxGraphNodes: CONTROL_CENTER_LIMITS.maxGraphNodes,
      maxGraphEdges: CONTROL_CENTER_LIMITS.maxGraphEdges,
    },
  };
}
