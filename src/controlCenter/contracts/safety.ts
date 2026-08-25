import type { SafeControlCenterCode, SafeControlCenterDigest, SafeControlCenterLabel, SafeControlCenterSha } from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_SAFETY_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.safety.v1` as const;

export type ControlCenterSafetyCheckState = 'PASS' | 'BLOCKED' | 'UNKNOWN' | 'NOT_MEASURED';

export interface ControlCenterSafetyCheckDto {
  readonly checkCode: SafeControlCenterCode;
  readonly state: ControlCenterSafetyCheckState;
  readonly reasonCode: SafeControlCenterCode;
}

export interface ControlCenterSafetyDto {
  readonly schemaVersion: typeof CONTROL_CENTER_SAFETY_SCHEMA_VERSION;
  readonly state: 'HEALTHY' | 'WARNING' | 'FAILED' | 'UNKNOWN';
  readonly scope: 'LOCAL_LOOPBACK_ONLY';
  readonly readOnly: true;
  readonly authMode: 'OWNER_LOCAL_ONLY_NO_AUTH_SESSION';
  readonly networkPosture: 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED';
  readonly rawEvidenceExposure: 'DISABLED';
  readonly ownerScope: {
    readonly status: 'FROZEN_BY_OWNER';
    readonly reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  };
  readonly operationPolicy: {
    readonly controlCenter: 'READ_ONLY';
    readonly productContact: 'DISABLED';
    readonly execution: 'NONE';
    readonly mutation: 'NONE';
    readonly database: 'OUT_OF_SCOPE';
    readonly infrastructure: 'OUT_OF_SCOPE';
    readonly publication: 'DISABLED';
  };
  readonly continuity: {
    readonly state: 'CURRENT' | 'ADVANCE_REQUIRES_RECONCILIATION' | 'UNKNOWN';
    readonly branch: SafeControlCenterLabel | null;
    readonly headSha: SafeControlCenterSha | null;
    readonly checkpointDigest: SafeControlCenterDigest | null;
  };
  readonly checks: readonly ControlCenterSafetyCheckDto[];
  readonly blockedOperationClasses: readonly SafeControlCenterCode[];
}
