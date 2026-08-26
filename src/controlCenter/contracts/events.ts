import {
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  boundedSequence,
  CONTROL_CENTER_CONTRACT_NAMESPACE,
  type SafeControlCenterDigest,
  type SafeControlCenterId,
} from './common';

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

const EVENT_TYPES: readonly ControlCenterNotificationType[] = [
  'readiness.changed',
  'safety.changed',
  'run.updated',
  'run.completed',
  'campaign.snapshot.changed',
  'source.snapshot.changed',
  'findings.snapshot.changed',
];

/** Construct a notification allowlist without echoing arbitrary event fields. */
export function sanitizeControlCenterEvent(value: unknown): ControlCenterEventDto | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  const sequence = boundedSequence(event.sequence);
  if (sequence === null || typeof event.type !== 'string' || !EVENT_TYPES.includes(event.type as ControlCenterNotificationType)) return null;
  const entityId = event.entityId === null || event.entityId === undefined ? null : asSafeControlCenterId(event.entityId);
  if (event.entityId !== null && event.entityId !== undefined && entityId === null) return null;
  const snapshotDigest = event.snapshotDigest === null || event.snapshotDigest === undefined ? null : asSafeControlCenterDigest(event.snapshotDigest);
  if (event.snapshotDigest !== null && event.snapshotDigest !== undefined && snapshotDigest === null) return null;
  return {
    schemaVersion: CONTROL_CENTER_EVENT_SCHEMA_VERSION,
    type: event.type as ControlCenterNotificationType,
    entityId,
    sequence,
    snapshotDigest,
  };
}
