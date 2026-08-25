import type { SafeControlCenterDigest, SafeControlCenterId } from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_EVENT_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.event.v1` as const;

export type ControlCenterNotificationType =
  | 'readiness.changed'
  | 'safety.changed'
  | 'run.updated'
  | 'run.completed'
  | 'campaign.snapshot.changed'
  | 'source.snapshot.changed'
  | 'findings.snapshot.changed';

export interface ControlCenterEventDto {
  readonly schemaVersion: typeof CONTROL_CENTER_EVENT_SCHEMA_VERSION;
  readonly type: ControlCenterNotificationType;
  readonly entityId: SafeControlCenterId | null;
  readonly sequence: number;
  readonly snapshotDigest: SafeControlCenterDigest | null;
}
