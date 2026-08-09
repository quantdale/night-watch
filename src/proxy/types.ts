// ---------------------------------------------------------------------------
// Nightwatch — outer egress proxy contracts.
// ---------------------------------------------------------------------------

import type { HostClass, Verdict } from '../core/safety/types';
import { OUTBOUND_POLICY_VERSION } from '../core/safety/outboundPolicy';

export type ProxyProtocol = 'http' | 'https-connect' | 'ws' | 'wss';

export interface ProxyEvent {
  seq: number;
  timestamp: string;
  /** A process/run label only; never a credential or browser header. */
  runId: string;
  protocol: ProxyProtocol;
  host: string;
  port: number | null;
  classification: HostClass;
  decision: Verdict;
  ruleId: string;
  reason: string;
}

export interface ProxySummary {
  allowed: number;
  telemetryBlocked: number;
  denied: number;
  unknown: number;
  violations: number;
}

export interface ProxyRuntimeState {
  address: string;
  host: '127.0.0.1' | '::1';
  port: number;
  environment: string;
  policyVersion: typeof OUTBOUND_POLICY_VERSION;
  eventLogPath: string;
}
