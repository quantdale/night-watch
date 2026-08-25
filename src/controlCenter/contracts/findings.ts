import type {
  ControlCenterCollection,
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterLabel,
  SafeControlCenterTimestamp,
} from './common';
import type { ControlCenterSourceCurrentness } from './sourceGraph';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_FINDINGS_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.findings.v1` as const;

export type ControlCenterFindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type ControlCenterFindingConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
export type ControlCenterFindingEvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type ControlCenterFindingReproduction = 'REPRODUCED' | 'NOT_REPRODUCED' | 'BOUNDED' | 'INCOMPLETE' | 'UNKNOWN';

export interface ControlCenterFindingSummaryDto {
  readonly findingId: SafeControlCenterId;
  readonly fingerprint: SafeControlCenterDigest | null;
  readonly clusterId: SafeControlCenterId | null;
  readonly title: SafeControlCenterLabel | null;
  readonly product: SafeControlCenterLabel | null;
  readonly surface: SafeControlCenterLabel | null;
  readonly severity: ControlCenterFindingSeverity;
  readonly confidence: ControlCenterFindingConfidence;
  readonly evidenceLevel: ControlCenterFindingEvidenceLevel;
  readonly reproduction: ControlCenterFindingReproduction;
  readonly reproductionCount: number;
  readonly minimized: boolean;
  readonly sourceCurrentness: ControlCenterSourceCurrentness;
  readonly dossierStatus: 'READY' | 'INCOMPLETE' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly firstObservedAt: SafeControlCenterTimestamp | null;
  readonly lastObservedAt: SafeControlCenterTimestamp | null;
  readonly categoryCode: SafeControlCenterCode;
  readonly provenanceDigest: SafeControlCenterDigest | null;
}

export interface ControlCenterFindingsDto extends ControlCenterCollection<ControlCenterFindingSummaryDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_FINDINGS_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';
}
