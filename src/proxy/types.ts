// ---------------------------------------------------------------------------
// Nightwatch — outer egress proxy contracts.
// ---------------------------------------------------------------------------

import type { HostClass, SemanticClassification, Verdict } from '../core/safety/types';
import { OUTBOUND_POLICY_VERSION } from '../core/safety/outboundPolicy';
import { EXACT_ADDRESS_BINDING_VERSION, PROXY_CONTAINMENT_VERSION } from './identity';
import { RESOLVED_ADDRESS_POLICY_VERSION, type AddressFamily, type ResolvedAddressClass } from './addressPolicy';

export type ProxyProtocol = 'http' | 'https-connect' | 'ws' | 'wss';
export type ProxyResolutionOutcome = 'not-attempted' | 'admitted' | 'denied' | 'failed';
export type ProxyConnectionOutcome = 'not-attempted' | 'attempted' | 'connected' | 'failed';
export type ProxyContainmentViolation = 'RESOLVED_ADDRESS_POLICY_DENIED' | 'RESOLUTION_FAILED' | 'EXACT_ADDRESS_BINDING_FAILED';
export type ProxyConnectionFailureReason = 'CONNECTION_REFUSED' | 'CONNECTION_TIMEOUT' | 'CLIENT_ABORTED' | 'TRANSPORT_FAILURE' | 'PROXY_SHUTDOWN';

export const PROXY_SUMMARY_SCHEMA_VERSION = 'nightwatch.proxy-summary.v2' as const;

export interface ProxyEvent {
  seq: number;
  timestamp: string;
  /** A process/run label only; never a credential or browser header. */
  runId: string;
  protocol: ProxyProtocol;
  host: string;
  port: number | null;
  classification: HostClass;
  semanticClassification?: SemanticClassification;
  containment?: 'EXPECTED_CONTAINMENT_EFFECT';
  decision: Verdict;
  ruleId: string;
  reason: string;
  /** Hostname policy is separate from resolved-address admission. */
  resolution?: ProxyResolutionOutcome;
  resolutionReason?: string;
  answerCount?: number;
  addressFamily?: AddressFamily;
  addressClass?: Exclude<ResolvedAddressClass, 'invalid'>;
  connection?: ProxyConnectionOutcome;
  connectionFailure?: ProxyConnectionFailureReason;
  containmentViolation?: ProxyContainmentViolation;
  addressBindingVersion?: typeof EXACT_ADDRESS_BINDING_VERSION;
}

export interface ProxySummary {
  schemaVersion: typeof PROXY_SUMMARY_SCHEMA_VERSION;
  /** `allowed` remains the historical name for hostname policy authorization. */
  policyAuthorized: number;
  allowed: number;
  telemetryBlocked: number;
  optionalSupportBlocked: number;
  browserBackgroundBlocked: number;
  denied: number;
  unknown: number;
  resolutionAdmitted: number;
  resolutionDenied: number;
  resolutionFailed: number;
  connectAttempted: number;
  connected: number;
  connectFailed: number;
  outcomeCoverage: 'complete' | 'legacy-unknown';
  violations: number;
}

export interface ProxyRuntimeState {
  address: string;
  host: '127.0.0.1' | '::1';
  port: number;
  environment: string;
  policyVersion: typeof OUTBOUND_POLICY_VERSION;
  containmentVersion: typeof PROXY_CONTAINMENT_VERSION;
  resolvedAddressPolicyVersion: typeof RESOLVED_ADDRESS_POLICY_VERSION;
  addressBindingVersion: typeof EXACT_ADDRESS_BINDING_VERSION;
  eventLogPath: string;
}
