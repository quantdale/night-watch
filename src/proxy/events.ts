// ---------------------------------------------------------------------------
// Nightwatch — sanitized proxy event storage and aggregation.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { ProxyEvent, ProxySummary } from './types';
import { EXACT_ADDRESS_BINDING_VERSION } from './identity';
import type { ProxyConnectionFailureReason, ProxyConnectionOutcome, ProxyContainmentViolation, ProxyResolutionOutcome } from './types';

const RESOLUTION_OUTCOMES: ReadonlySet<string> = new Set(['not-attempted', 'admitted', 'denied', 'failed']);
const CONNECTION_OUTCOMES: ReadonlySet<string> = new Set(['not-attempted', 'attempted', 'connected', 'failed']);
const ADDRESS_CLASSES: ReadonlySet<string> = new Set([
  'unspecified', 'loopback', 'private', 'unique-local', 'link-local', 'shared',
  'documentation', 'benchmark', 'multicast', 'broadcast', 'reserved', 'special-use', 'global-unicast',
]);
const CONNECTION_FAILURES: ReadonlySet<string> = new Set(['CONNECTION_REFUSED', 'CONNECTION_TIMEOUT', 'CLIENT_ABORTED', 'TRANSPORT_FAILURE', 'PROXY_SHUTDOWN']);
const CONTAINMENT_VIOLATIONS: ReadonlySet<string> = new Set(['RESOLVED_ADDRESS_POLICY_DENIED', 'RESOLUTION_FAILED', 'EXACT_ADDRESS_BINDING_FAILED']);

function optionalLifecycleIsValid(value: ProxyEvent): boolean {
  if (value.resolution !== undefined && !RESOLUTION_OUTCOMES.has(value.resolution)) return false;
  if (value.connection !== undefined && !CONNECTION_OUTCOMES.has(value.connection)) return false;
  if (value.answerCount !== undefined && (!Number.isSafeInteger(value.answerCount) || value.answerCount < 0 || value.answerCount > 8)) return false;
  if (value.addressFamily !== undefined && value.addressFamily !== 4 && value.addressFamily !== 6) return false;
  if (value.addressClass !== undefined && !ADDRESS_CLASSES.has(value.addressClass)) return false;
  if (value.resolutionReason !== undefined && (!/^[A-Z0-9_]{1,64}$/.test(value.resolutionReason))) return false;
  if (value.connectionFailure !== undefined && !CONNECTION_FAILURES.has(value.connectionFailure)) return false;
  if (value.containmentViolation !== undefined && !CONTAINMENT_VIOLATIONS.has(value.containmentViolation)) return false;
  if (value.addressBindingVersion !== undefined && value.addressBindingVersion !== EXACT_ADDRESS_BINDING_VERSION) return false;
  return true;
}

export function ensureEventLog(logPath: string): void {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, '');
}

export function appendProxyEvent(logPath: string, event: ProxyEvent): void {
  fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`);
}

/** True for hostname-policy denials and resolved-egress hard violations. */
export function isProxyViolation(event: ProxyEvent): boolean {
  return event.decision === 'deny' || event.containmentViolation !== undefined;
}

/** Read complete JSON lines only; a concurrently written final line is ignored. */
export function readProxyEvents(logPath: string): ProxyEvent[] {
  let raw: string;
  try {
    raw = fs.readFileSync(logPath, 'utf8');
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  const out: ProxyEvent[] = [];
  for (const line of lines) {
    try {
      const value = JSON.parse(line) as ProxyEvent;
      if (
        typeof value.seq === 'number' &&
        typeof value.timestamp === 'string' &&
        typeof value.runId === 'string' &&
        typeof value.protocol === 'string' &&
        typeof value.host === 'string' &&
        (typeof value.port === 'number' || value.port === null) &&
        typeof value.classification === 'string' &&
        typeof value.decision === 'string' &&
        typeof value.ruleId === 'string' &&
        typeof value.reason === 'string' &&
        optionalLifecycleIsValid(value)
      ) {
        out.push(value);
      }
    } catch {
      // Fail closed for event parsing by omitting incomplete evidence. The
      // proxy itself never treats an evidence write as an allow decision.
    }
  }
  return out;
}

export function summarizeProxyEvents(events: readonly ProxyEvent[]): ProxySummary {
  const summary: ProxySummary = {
    schemaVersion: 'nightwatch.proxy-summary.v2',
    policyAuthorized: 0,
    allowed: 0,
    telemetryBlocked: 0,
    optionalSupportBlocked: 0,
    browserBackgroundBlocked: 0,
    denied: 0,
    unknown: 0,
    resolutionAdmitted: 0,
    resolutionDenied: 0,
    resolutionFailed: 0,
    connectAttempted: 0,
    connected: 0,
    connectFailed: 0,
    outcomeCoverage: 'complete',
    violations: 0,
  };
  for (const event of events) {
    if (event.decision === 'allow') {
      summary.policyAuthorized += 1;
      summary.allowed += 1;
    }
    else if (event.decision === 'block-telemetry') summary.telemetryBlocked += 1;
    else if (event.decision === 'block-optional-support') summary.optionalSupportBlocked += 1;
    else if (event.decision === 'block-browser-background') summary.browserBackgroundBlocked += 1;
    else {
      summary.denied += 1;
      summary.violations += 1;
      if (event.classification === 'unknown-alphaus' || event.classification === 'external') {
        summary.unknown += 1;
      }
    }
    if (event.resolution === 'admitted') summary.resolutionAdmitted += 1;
    if (event.resolution === 'denied') summary.resolutionDenied += 1;
    if (event.resolution === 'failed') summary.resolutionFailed += 1;
    if (event.connection === 'attempted' || event.connection === 'connected' || event.connection === 'failed') summary.connectAttempted += 1;
    if (event.connection === 'connected') summary.connected += 1;
    if (event.connection === 'failed') summary.connectFailed += 1;
    if (event.resolution === undefined || event.connection === undefined) summary.outcomeCoverage = 'legacy-unknown';
    if (event.containmentViolation !== undefined && event.decision !== 'deny') summary.violations += 1;
  }
  return summary;
}
