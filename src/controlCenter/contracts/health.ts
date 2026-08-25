import { CONTROL_CENTER_CONTRACT_NAMESPACE, CONTROL_CENTER_SCOPE } from './common';

export const CONTROL_CENTER_HEALTH_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.health.v1` as const;

export interface ControlCenterHealthDto {
  readonly schemaVersion: typeof CONTROL_CENTER_HEALTH_SCHEMA_VERSION;
  readonly status: 'UP';
  readonly scope: typeof CONTROL_CENTER_SCOPE;
  readonly readOnly: true;
  readonly productReadiness: 'NOT_REPORTED';
}
