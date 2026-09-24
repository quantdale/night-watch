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
const PROXY_EVENT_KEYS: ReadonlySet<string> = new Set([
  'seq', 'timestamp', 'runId', 'protocol', 'host', 'port', 'classification',
  'semanticClassification', 'containment', 'decision', 'ruleId', 'reason',
  'resolution', 'resolutionReason', 'answerCount', 'addressFamily', 'addressClass',
  'connection', 'connectionFailure', 'containmentViolation', 'addressBindingVersion',
]);
const HOST_CLASSES: ReadonlySet<string> = new Set([
  'production', 'dev', 'next', 'local', 'unknown-alphaus', 'external', 'static',
  'telemetry', 'optional-third-party-support', 'browser-background-google',
  'browser-background-update', 'browser-background-download', 'internal',
]);
const SEMANTIC_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  'EXPECTED', 'TELEMETRY', 'BROWSER_BACKGROUND_GOOGLE', 'BROWSER_BACKGROUND_UPDATE',
  'BROWSER_BACKGROUND_DOWNLOAD', 'OPTIONAL_THIRD_PARTY_SUPPORT', 'UNKNOWN',
  'PRODUCTION_DENIED',
]);
const VERDICTS: ReadonlySet<string> = new Set(['allow', 'deny', 'block-telemetry', 'block-optional-support', 'block-browser-background']);
const PROTOCOLS: ReadonlySet<string> = new Set(['http', 'https-connect', 'ws', 'wss']);
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]+$/;
function invalidProxyEvent(): never {
  throw new Error('PROXY_EVENT_SCHEMA_INVALID');
}
function safeText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && SAFE_TEXT.test(value);
}

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

export function validateProxyEventForPersistence(value: unknown): ProxyEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return invalidProxyEvent();
  const event = value as Record<string, unknown>;
  if (Object.keys(event).some((key) => !PROXY_EVENT_KEYS.has(key)) || Object.keys(event).length < 9) return invalidProxyEvent();
  if (!Number.isSafeInteger(event.seq) || (event.seq as number) < 0 || (event.seq as number) > 1_000_000_000) return invalidProxyEvent();
  if (!safeText(event.timestamp, 64) || !Number.isFinite(Date.parse(event.timestamp))) return invalidProxyEvent();
  if (!safeText(event.runId, 128) || !/^[A-Za-z0-9._-]+$/.test(event.runId)) return invalidProxyEvent();
  if (!safeText(event.protocol, 32) || !PROTOCOLS.has(event.protocol)) return invalidProxyEvent();
  if (typeof event.host !== 'string' || event.host.length > 253 || /[\\/@\u0000-\u001f\u007f]/.test(event.host)) return invalidProxyEvent();
  // A parse-failure event may have no parsed host; it is still safe metadata
  // and must not turn a policy denial into an evidence-write failure.
  if (event.host.length === 0 && event.ruleId !== 'parse-failure') return invalidProxyEvent();
  if (event.port !== null && (!Number.isSafeInteger(event.port) || (event.port as number) < 0 || (event.port as number) > 65535)) return invalidProxyEvent();
  if (!safeText(event.classification, 64) || !HOST_CLASSES.has(event.classification)) return invalidProxyEvent();
  if (event.semanticClassification !== undefined && (!safeText(event.semanticClassification, 64) || !SEMANTIC_CLASSIFICATIONS.has(event.semanticClassification))) return invalidProxyEvent();
  if (event.containment !== undefined && event.containment !== 'EXPECTED_CONTAINMENT_EFFECT') return invalidProxyEvent();
  if (!safeText(event.decision, 64) || !VERDICTS.has(event.decision)) return invalidProxyEvent();
  if (!safeText(event.ruleId, 128) || !safeText(event.reason, 512)) return invalidProxyEvent();
  const candidate = value as ProxyEvent;
  if (!optionalLifecycleIsValid(candidate)) return invalidProxyEvent();
  return candidate;
}

export function ensureEventLog(logPath: string): void {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, '', { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(logPath, 0o600);
}

export function appendProxyEvent(logPath: string, event: ProxyEvent): void {
  const validated = validateProxyEventForPersistence(event);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(validated)}\n`, { encoding: 'utf8', mode: 0o600 });
  const descriptor = fs.openSync(logPath, 'r');
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(logPath, 0o600);
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
