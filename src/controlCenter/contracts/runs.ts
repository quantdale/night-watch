import type {
  ControlCenterCollection,
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterLabel,
  SafeControlCenterSha,
  SafeControlCenterTimestamp,
} from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.run-list.v1` as const;
export const CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.run-detail.v1` as const;
export const CONTROL_CENTER_TIMELINE_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.timeline.v1` as const;

export type ControlCenterRunEnvironment = 'LOCAL_SYNTHETIC' | 'LOCAL' | 'DEV_RECORDED' | 'NEXT_RECORDED' | 'UNKNOWN';
export type ControlCenterRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PASSED'
  | 'ORACLE_ONLY'
  | 'SAFETY_FAILURE'
  | 'FAILED'
  | 'BLOCKED'
  | 'INCOMPLETE'
  | 'SKIPPED';

export type ControlCenterRunEventType =
  | 'start'
  | 'end'
  | 'env'
  | 'navigation'
  | 'request'
  | 'response'
  | 'console'
  | 'pageerror'
  | 'requestfailed'
  | 'policy'
  | 'telemetry'
  | 'optional-support'
  | 'browser-background'
  | 'oracle'
  | 'issue'
  | 'hard-failure'
  | 'screenshot'
  | 'stability'
  | 'download'
  | 'service-worker'
  | 'bootstrap'
  | 'journey'
  | 'journey-step';

export type ControlCenterRunSeverity = 'info' | 'warn' | 'error' | 'fatal';
export type ControlCenterRunCollectionState = 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';

export interface ControlCenterRunListItemDto {
  readonly runId: SafeControlCenterId;
  readonly environment: ControlCenterRunEnvironment;
  readonly product: SafeControlCenterLabel | null;
  readonly browser: SafeControlCenterLabel | null;
  readonly scenario: SafeControlCenterLabel | null;
  readonly startedAt: SafeControlCenterTimestamp | null;
  readonly endedAt: SafeControlCenterTimestamp | null;
  readonly durationMs: number | null;
  readonly status: ControlCenterRunStatus;
  readonly passed: boolean;
  readonly eventCount: number;
  readonly hardFailureCount: number;
  readonly oracleFindingCount: number;
  readonly nightwatchSha: SafeControlCenterSha | null;
}

export interface ControlCenterRunListDto extends ControlCenterCollection<ControlCenterRunListItemDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION;
  /** Additive authority state; optional for historical v1 fixtures. */
  readonly state?: ControlCenterRunCollectionState;
  readonly reasonCodes?: readonly SafeControlCenterCode[];
}

export interface ControlCenterRepositorySnapshotDto {
  readonly repositoryId: SafeControlCenterId;
  readonly branch: SafeControlCenterLabel | null;
  readonly headSha: SafeControlCenterSha | null;
  readonly upstream: SafeControlCenterLabel | null;
  readonly ahead: number | null;
  readonly behind: number | null;
  readonly dirty: boolean;
  readonly dirtyFileCount: number;
  readonly lastCommitAt: SafeControlCenterTimestamp | null;
  readonly capturedAt: SafeControlCenterTimestamp | null;
  readonly state: 'OK' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly errorCode: SafeControlCenterCode | null;
}

export interface ControlCenterRunDetailDto {
  readonly schemaVersion: typeof CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION;
  readonly run: ControlCenterRunListItemDto;
  readonly repositories: readonly ControlCenterRepositorySnapshotDto[];
  readonly countsByEventType: readonly { readonly eventType: ControlCenterRunEventType; readonly count: number }[];
  readonly countsBySeverity: readonly { readonly severity: ControlCenterRunSeverity; readonly count: number }[];
  readonly screenshotCount: number;
  readonly hardFailureCodes: readonly SafeControlCenterCode[];
  readonly noteCodes: readonly SafeControlCenterCode[];
  readonly proxy: {
    readonly allowed: number;
    readonly telemetryBlocked: number;
    readonly optionalSupportBlocked: number;
    readonly browserBackgroundBlocked: number;
    readonly denied: number;
    readonly unknown: number;
    readonly violations: number;
  } | null;
}

export interface ControlCenterTimelineEventDto {
  readonly seq: number;
  readonly timestamp: SafeControlCenterTimestamp | null;
  readonly eventType: ControlCenterRunEventType;
  readonly severity: ControlCenterRunSeverity;
  readonly messageCode: SafeControlCenterCode;
  readonly dataCodes: readonly SafeControlCenterCode[];
}

export interface ControlCenterTimelineDto {
  readonly schemaVersion: typeof CONTROL_CENTER_TIMELINE_SCHEMA_VERSION;
  readonly runId: SafeControlCenterId;
  readonly afterSeq: number;
  readonly events: readonly ControlCenterTimelineEventDto[];
  readonly nextAfterSeq: number | null;
  readonly truncated: boolean;
}
