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

/**
 * M6 (7.2/C-09): the vocabulary is DATA as well as a type, so the sanitizer's
 * allowlist is derived from it. Widening the union without widening the array
 * is a compile error, and the allowlist can never drift behind the contract.
 */
export const CONTROL_CENTER_FINDING_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const satisfies readonly ControlCenterFindingSeverity[];
export const CONTROL_CENTER_FINDING_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'] as const satisfies readonly ControlCenterFindingConfidence[];
export const CONTROL_CENTER_FINDING_EVIDENCE_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const satisfies readonly ControlCenterFindingEvidenceLevel[];
export const CONTROL_CENTER_FINDING_REPRODUCTIONS = ['REPRODUCED', 'NOT_REPRODUCED', 'BOUNDED', 'INCOMPLETE', 'UNKNOWN'] as const satisfies readonly ControlCenterFindingReproduction[];
export const CONTROL_CENTER_DOSSIER_STATUSES = ['READY', 'UNRESOLVED', 'INCOMPLETE', 'UNAVAILABLE', 'UNKNOWN'] as const satisfies readonly ControlCenterFindingSummaryDto['dossierStatus'][];

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
  /**
   * M6 (7.2/C-09): the dossier-status projection is TOTAL over the internal
   * vocabulary: `UNRESOLVED` (a dossier whose evidence does not support READY)
   * is a distinct Control Center state, and an unknown value is `UNKNOWN`
   * rather than being collapsed into `INCOMPLETE`.
   */
  readonly dossierStatus: 'READY' | 'UNRESOLVED' | 'INCOMPLETE' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly firstObservedAt: SafeControlCenterTimestamp | null;
  readonly lastObservedAt: SafeControlCenterTimestamp | null;
  readonly categoryCode: SafeControlCenterCode;
  readonly provenanceDigest: SafeControlCenterDigest | null;
}

export interface ControlCenterFindingsDto extends ControlCenterCollection<ControlCenterFindingSummaryDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_FINDINGS_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';
}

/**
 * M6 (7.2/C-09): the one total dossier-status mapping used by the Control
 * Center. An exhaustive switch over the internal vocabulary; the default arm
 * reports UNKNOWN for a value this build does not know.
 */
export function dossierStatusOf(
  status: string,
): 'READY' | 'UNRESOLVED' | 'INCOMPLETE' | 'UNKNOWN' {
  switch (status) {
    case 'READY':
      return 'READY';
    case 'UNRESOLVED':
      return 'UNRESOLVED';
    case 'INCOMPLETE':
      return 'INCOMPLETE';
    default:
      return 'UNKNOWN';
  }
}
