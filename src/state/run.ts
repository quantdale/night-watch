// ---------------------------------------------------------------------------
// Nightwatch — run monitor (in-memory failure state for the harness).
//
// The monitor aggregates hard safety failures (denied outbound requests) and
// oracle issues so ordinary journeys can make a fail/pass decision at the end
// of a run. Direct auth capture reads the safety-only state: authentication
// acquisition is not a bug-free page certification workflow.
// ---------------------------------------------------------------------------

import type { RunEvent } from '../core/evidence/types';

/** Sanitized reasons that can make the direct auth runner stop HUMAN_WAIT. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
const SAFETY_MONITOR_REASONS = [
  'PROXY_LIVENESS_FAILED',
  'PROXY_PROCESS_EXITED',
  'BROWSER_DISCONNECTED',
  'CONTEXT_CLOSED',
  'PAGE_CLOSED',
  'GUARD_ALARM',
  'UNKNOWN_DESTINATION',
  'PRODUCTION_DESTINATION_ATTEMPT',
  'POLICY_VIOLATION',
  'WEBSOCKET_POLICY_VIOLATION',
  'WORKER_POLICY_VIOLATION',
  'UNROUTED_REQUEST',
  'MONITOR_INTERNAL_ERROR',
  'OTHER',
] as const;

export type SafetyMonitorReason = (typeof SAFETY_MONITOR_REASONS)[number];

/** Safe metadata only; never store a raw URL, error, page text, or secret. */
export interface SafetyMonitorDiagnostic {
  reason: SafetyMonitorReason;
  host?: string;
  origin?: string;
  path?: string;
  policyClassification?: string;
  policyDecision?: string;
  guardType?: string;
  lifecycleEvent?: string;
  issueCategory?: string;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type MonitorOracleCausality = 'PROVEN' | 'LIKELY' | 'UNRESOLVED' | 'NOT_CAUSAL';

/** Sanitized oracle trigger metadata; no URL, body, DOM, or exception text. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface MonitorOracleObservation {
  oracleId: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
  anomalyClass: string;
  causalToPrimaryFailure: MonitorOracleCausality;
  fingerprint?: string;
}

function safeLocation(rawUrl: string | undefined): Pick<SafetyMonitorDiagnostic, 'host' | 'origin' | 'path'> {
  if (rawUrl === undefined) return {};
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname.toLowerCase(),
      origin: url.origin,
      path: url.pathname || '/',
    };
  } catch {
    return {};
  }
}

function isSafetyMonitorReason(value: unknown): value is SafetyMonitorReason {
  return typeof value === 'string' && (SAFETY_MONITOR_REASONS as readonly string[]).includes(value);
}

function inferHardFailureReason(event: RunEvent, data: HardFailureInput): SafetyMonitorReason {
  if (isSafetyMonitorReason(data.monitorReason)) return data.monitorReason;
  const eventData = event.data ?? {};
  if (isSafetyMonitorReason(eventData.monitorReason)) return eventData.monitorReason;
  const path = typeof eventData.path === 'string' ? eventData.path : data.path;
  const protocol = typeof eventData.protocol === 'string' ? eventData.protocol : data.protocol;
  const resourceType = typeof eventData.resourceType === 'string' ? eventData.resourceType : data.resourceType;
  const hostClass = data.hostClass;

  if (path === 'outer-proxy-runtime') return 'PROXY_LIVENESS_FAILED';
  if (path === 'service-worker' || path === 'guard-alarm') return 'GUARD_ALARM';
  if (path === 'unrouted-observation') return 'UNROUTED_REQUEST';
  if (protocol === 'websocket' || path === 'websocket-guard') return 'WEBSOCKET_POLICY_VIOLATION';
  if (resourceType === 'worker' || resourceType === 'sharedworker' || path === 'worker-guard') {
    return 'WORKER_POLICY_VIOLATION';
  }
  if (hostClass === 'production') return 'PRODUCTION_DESTINATION_ATTEMPT';
  if (hostClass === 'unknown-alphaus' || hostClass === 'external') return 'UNKNOWN_DESTINATION';
  return 'POLICY_VIOLATION';
}

interface HardFailureInput {
  url: string;
  verdict: string;
  hostClass: string;
  reason: string;
  monitorReason?: SafetyMonitorReason;
  path?: string;
  protocol?: string;
  resourceType?: string;
  guardType?: string;
  lifecycleEvent?: string;
}

/**
 * Semantic issue type: the failOn key that this issue represents. Issue
 * events carry the generic recorder type ('issue'/'oracle') with the semantic
 * name mirrored into data.reason.
 */
function semanticTypeOf(event: RunEvent): string {
  return typeof event.data?.reason === 'string' ? event.data.reason : event.type;
}

/** One denied outbound request (policy hard failure). */
export interface HardFailureRecord {
  ts: string;
  url: string;
  verdict: string;
  hostClass: string;
  reason: string;
}

export class RunMonitor {
  /** Fail-on set; 'hard-failure' is always fatal and cannot be turned off. */
  private readonly failOnSet: ReadonlySet<string>;

  readonly hardFailures: HardFailureRecord[] = [];
  /** Every issue event recorded (any type), in sequence. */
  readonly issues: RunEvent[] = [];
  /** Oracle issues that matched the configured failOn set. */
  readonly oracleFailures: RunEvent[] = [];
  /** Sanitized causes, in first-observed order. */
  readonly monitorFailures: SafetyMonitorDiagnostic[] = [];
  /** Every oracle trigger, including nonfatal and expected-containment signals. */
  readonly oracleObservations: MonitorOracleObservation[] = [];
  /** Fixed containment categories observed during the run. */
  readonly containmentEvents: string[] = [];
  /** True after any hard failure or any issue whose type is in failOn. */
  failed = false;
  /** True only after a safety-policy, containment, or lifecycle failure. */
  safetyFailed = false;
  /** True after a configured oracle issue; this is not a safety failure. */
  oracleFailed = false;

  constructor(failOn: readonly string[]) {
    this.failOnSet = new Set([...failOn, 'hard-failure']);
  }

  /** Record a policy hard failure (denied outbound request) — always fatal. */
  recordHardFailure(
    event: RunEvent,
    data: HardFailureInput
  ): void {
    this.hardFailures.push({
      ts: event.ts,
      url: data.url,
      verdict: data.verdict,
      hostClass: data.hostClass,
      reason: data.reason,
    });
    const location = safeLocation(data.url);
    this.monitorFailures.push({
      reason: inferHardFailureReason(event, data),
      ...location,
      policyClassification: data.hostClass,
      policyDecision: data.verdict,
      guardType: data.guardType ?? (typeof event.data?.path === 'string' ? event.data.path : data.path),
      lifecycleEvent: data.lifecycleEvent,
    });
    this.safetyFailed = true;
    this.failed = true;
  }

  /**
   * Record an oracle issue. Sets `failed` iff the issue's semantic type is in
   * failOn. The recorder's RunEventType union is fixed, so issue events carry
   * the generic type ('issue'/'oracle') with the semantic type
   * ('console-error', 'pageerror', 'malformed-json', ...) in data.reason;
   * the semantic type is what failOn matches against.
   */
  recordIssue(event: RunEvent): void {
    this.issues.push(event);
    const data = event.data ?? {};
    const severity = event.severity === 'fatal' ? 'FATAL' : event.severity === 'error' ? 'ERROR' : event.severity === 'warn' ? 'WARNING' : 'INFO';
    const anomalyClass = typeof data.anomalyClass === 'string'
      ? data.anomalyClass
      : data.reason === 'expected-containment-effect'
        ? 'EXPECTED_CONTAINMENT'
        : 'UNKNOWN';
    const causality = data.causalToPrimaryFailure === 'PROVEN' || data.causalToPrimaryFailure === 'LIKELY' ||
      data.causalToPrimaryFailure === 'NOT_CAUSAL' ? data.causalToPrimaryFailure : 'UNRESOLVED';
    const oracleId = typeof data.oracleId === 'string'
      ? data.oracleId
      : typeof data.reason === 'string' ? data.reason : event.type;
    const fingerprint = typeof data.fingerprint === 'string' ? data.fingerprint : undefined;
    this.oracleObservations.push({ oracleId, severity, anomalyClass, causalToPrimaryFailure: causality, ...(fingerprint === undefined ? {} : { fingerprint }) });
    if (this.failOnSet.has(event.type) || this.failOnSet.has(semanticTypeOf(event))) {
      this.oracleFailures.push(event);
      this.oracleFailed = true;
      this.failed = true;
    }
  }

  recordContainment(category: string): void {
    if (!this.containmentEvents.includes(category)) this.containmentEvents.push(category);
  }

  /** Record an observer failure without exposing the underlying exception. */
  recordInternalFailure(category: string): void {
    this.monitorFailures.push({
      reason: 'MONITOR_INTERNAL_ERROR',
      guardType: 'monitor',
      issueCategory: category,
    });
    this.safetyFailed = true;
    this.failed = true;
  }

  /** First sanitized cause responsible for the failed monitor state. */
  primaryFailure(): SafetyMonitorDiagnostic | undefined {
    return this.monitorFailures[0];
  }

  /** Short lines describing failure causes (for summary.json notes). */
  summaryNotes(): string[] {
    const notes: string[] = [];
    for (const hf of this.hardFailures) {
      notes.push(`hard failure: ${hf.verdict} ${hf.hostClass} — ${hf.reason} (${hf.url})`);
    }
    for (const ev of this.issues) {
      if (this.failOnSet.has(semanticTypeOf(ev)) || this.failOnSet.has(ev.type)) {
        notes.push(`issue (${semanticTypeOf(ev)}): ${ev.message}`);
      }
    }
    return notes;
  }
}
