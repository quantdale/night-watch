// ---------------------------------------------------------------------------
// Nightwatch — network observer (Phase 1.1 hardened).
//
// Installs the layered browser containment inside the page/context network
// stack, ALL derived from the single OutboundPolicy (decide()):
//
//   L1 — context.route('**/*'): EVERY ordinary HTTP(S) request (pages, frames,
//        iframes, dedicated workers, EventSource, cross-origin downloads,
//        popups — context-wide, never page-local) is inspected BEFORE it
//        leaves the browser: allowed -> continue; telemetry -> abort (recorded,
//        not failing); denied -> abort + hard failure.
//   L2 — context.routeWebSocket('**/*'): WebSocket creation is governed with
//        IDENTICAL policy semantics (allowed host -> connect; telemetry ->
//        closed; production/unknown -> closed + hard failure BEFORE any
//        meaningful communication).
//   L4 — page.on('request') observation: Playwright does NOT re-route redirect
//        follow-ups and some download-manager traffic, so any request observed
//        that policy classifies as DENY and that no route handler governed is
//        still recorded as a hard failure (detection closes the gap; CDP
//        the raw-CDP Fetch guard in the harness is the abort layer for those paths).
//
// All evidence is redacted through the recorder's shared RedactionLayer
// BEFORE recording — the recorder itself never redacts.
// ---------------------------------------------------------------------------

import type { BrowserContext, Page, Request, Response, Route } from '@playwright/test';
import { RedactionLayer } from '../../core/safety/redaction';
import { OutboundPolicy, isNetworkUrl } from '../../core/safety/outboundPolicy';
import { decideBrowserHttp, decideBrowserWebSocket } from '../../core/safety/policyConsumers';
import { isBrowserBackgroundClassification, isNonFatalBlock, type BrowserBackgroundClassification } from '../../core/safety/types';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';
import type {
  EndpointSemanticClassification,
  EndpointSemanticMatch,
} from '../../core/safety/endpointSemantics';
import {
  checkUnexpectedStatus,
  checkJsonBody,
  checkNdjsonBody,
} from '../../oracles/protocol/passiveChecks';
import {
  classifyRequestFailure,
  classifyResourceRole,
  checkResourceContentType,
  resourceImpact,
  type ResourceLifecycleState,
  type ResourceRole,
} from '../../oracles/protocol/resourceChecks';
import { fingerprintAnomaly } from '../../core/journeys/fingerprint';

/** Max captured body size (chars) — bodies are sliced, then redacted. */
const MAX_BODY_CHARS = 1_000_000;

/**
 * Grace period for the unrouted-request detector: route handlers run
 * synchronously at interception and record into blockedUrls before this
 * timer fires, so routed requests never double-report.
 */
const OBSERVATION_GRACE_MS = 150;

/** HTTP method alone is deliberately insufficient to label a request
 * read/mutate; the optional matcher is populated only by reviewed journeys. */
const OBSERVED_ENDPOINT_CLASSIFICATION = 'UNKNOWN' as const;

function safeProtocolLocation(url: string): { origin?: string; path?: string } {
  try {
    const parsed = new URL(url);
    return { origin: parsed.origin, path: parsed.pathname || '/' };
  } catch {
    return {};
  }
}

function bodyCaptureStatus(
  bytes: Buffer,
  headers: Record<string, string>,
): 'complete' | 'incomplete' {
  const declaredLength = Number.parseInt(headers['content-length'] ?? '', 10);
  const encoding = headers['content-encoding'];
  // Content-Length describes encoded bytes when content encoding is present;
  // do not compare it with Playwright's decoded body in that case.
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || (encoding !== undefined && encoding !== 'identity')) {
    return 'complete';
  }
  return bytes.byteLength === declaredLength ? 'complete' : 'incomplete';
}

export interface NetworkObserver {
  /** Registers the route + WebSocket policy gates. MUST be awaited before any
   *  page navigation (route/routeWebSocket registration is asynchronous). */
  install(context: BrowserContext): Promise<void>;
  activeRequests(): number;
  lastActivityAt(): number;
  /** URLs aborted by policy (deny or telemetry) — raw, unredacted. */
  blockedUrls(): Set<string>;
  /** Exact optional-support hosts intentionally blocked in this context. */
  optionalSupportBlockedHosts(): Set<string>;
  /** Exact telemetry hosts intentionally blocked in this context. */
  telemetryBlockedHosts(): Set<string>;
  /** Exact browser-background hosts and their semantic categories. */
  browserBackgroundBlockedHosts(): Map<string, BrowserBackgroundClassification>;
  /** Raw locations already classified as non-causal optional-resource failures. */
  optionalResourceFailureUrls(): ReadonlySet<string>;
  /** Mark the one declarative journey action currently being executed. */
  beginJourneyIntent(stepId: string, actionType: string): void;
  /** End the current declarative journey action. */
  endJourneyIntent(stepId: string): void;
  /** Sanitized semantic request ledger for the current run. */
  semanticRequests(): readonly SemanticRequestObservation[];
  /** Mark the start of intentional journey actions after auth/bootstrap preflight. */
  beginJourneyObservation(): void;
  /** Semantic ledger limited to the current intentional journey boundary. */
  journeySemanticRequests(): readonly SemanticRequestObservation[];
  /** Metadata-only resource lifecycle observations. */
  resourceObservations(): readonly ResourceObservation[];
  requestCount(): number;
}

export interface ResourceObservation {
  role: ResourceRole;
  state: ResourceLifecycleState;
  method: string;
  stepId: string | null;
  status: number | null;
  contentTypeClass: string | null;
}

export type SemanticRequestDisposition =
  | 'KNOWN_READ'
  | 'KNOWN_MUTATION'
  | 'PASSIVE_UNKNOWN_OBSERVED'
  | 'ACTION_CAUSED_UNKNOWN';

export interface SemanticRequestObservation {
  ruleId: string;
  classification: EndpointSemanticClassification;
  disposition: SemanticRequestDisposition;
  method: string;
  stepId: string | null;
  actionType: string | null;
}

export function createNetworkObserver(opts: {
  policy: OutboundPolicy;
  recorder: RunRecorder;
  monitor: RunMonitor;
  endpointClassifier?: (url: string, method: string) => EndpointSemanticClassification | null;
  endpointMatcher?: (url: string, method: string) => EndpointSemanticMatch | null;
  optionalSupportBlockedHosts?: Set<string>;
  browserBackgroundBlockedHosts?: Map<string, BrowserBackgroundClassification>;
  targetOrigin?: string;
  journeyId?: string;
}): NetworkObserver {
  const { policy, recorder, monitor } = opts;

  let active = 0;
  let lastActivity = Date.now();
  const blockedUrls = new Set<string>();
  const optionalSupportBlockedHosts = opts.optionalSupportBlockedHosts ?? new Set<string>();
  const telemetryBlockedHosts = new Set<string>();
  const browserBackgroundBlockedHosts = opts.browserBackgroundBlockedHosts ?? new Map<string, BrowserBackgroundClassification>();
  const optionalResourceFailureUrls = new Set<string>();
  const semanticLedger: SemanticRequestObservation[] = [];
  const resourceLedger: ResourceObservation[] = [];
  const completedRequests = new WeakSet<Request>();
  let requestCount = 0;
  let journeyIntent: { stepId: string; actionType: string } | null = null;
  let journeyObservationStart = 0;

  function matchEndpoint(rawUrl: string, method: string): EndpointSemanticMatch | null {
    if (opts.endpointMatcher !== undefined) return opts.endpointMatcher(rawUrl, method);
    const classification = opts.endpointClassifier?.(rawUrl, method) ?? null;
    return classification === null ? null : { ruleId: 'legacy-classifier', classification };
  }

  function recordSemanticObservation(
    match: EndpointSemanticMatch,
    method: string,
  ): SemanticRequestObservation {
    const action = journeyIntent;
    const disposition: SemanticRequestDisposition =
      match.classification === 'KNOWN_READ'
        ? 'KNOWN_READ'
        : match.classification === 'KNOWN_MUTATION'
          ? 'KNOWN_MUTATION'
            : action?.actionType === 'NAVIGATE_APPROVED_ROUTE' || action?.actionType === 'RETURN_TO_ANCHOR' || action === null
            ? 'PASSIVE_UNKNOWN_OBSERVED'
            : 'ACTION_CAUSED_UNKNOWN';
    const observation: SemanticRequestObservation = {
      ruleId: match.ruleId,
      classification: match.classification,
      disposition,
      method,
      stepId: action?.stepId ?? null,
      actionType: action?.actionType ?? null,
    };
    semanticLedger.push(observation);
    const event = recorder.event({
      type: 'journey',
      severity: disposition === 'KNOWN_MUTATION' || disposition === 'ACTION_CAUSED_UNKNOWN' ? 'fatal' : 'info',
      message: `semantic endpoint ${disposition}`,
      data: {
        ruleId: observation.ruleId,
        classification: observation.classification,
        disposition: observation.disposition,
        method: observation.method,
        ...(observation.stepId === null ? {} : { stepId: observation.stepId }),
        ...(observation.actionType === null ? {} : { actionType: observation.actionType }),
      },
    });
    if (disposition === 'ACTION_CAUSED_UNKNOWN') {
      const failureEvent = recorder.event({
        type: 'hard-failure',
        severity: 'fatal',
        message: 'HARD FAILURE: journey action caused an unknown API request',
        data: {
          reason: 'action-caused-unknown',
          path: 'semantic-endpoint',
          ruleId: observation.ruleId,
          stepId: observation.stepId,
        },
      });
      monitor.recordHardFailure(failureEvent, {
        url: 'https://semantic-endpoint.invalid/',
        verdict: 'deny',
        hostClass: 'semantic-endpoint',
        reason: 'action-caused-unknown',
        monitorReason: 'POLICY_VIOLATION',
        guardType: 'semantic-endpoint',
        path: 'semantic-endpoint',
      });
    }
    return observation;
  }

  function contentTypeClass(contentType: string | undefined): string | null {
    if (contentType === undefined || contentType.trim() === '') return null;
    const value = contentType.toLowerCase();
    if (value.includes('json')) return 'json';
    if (value.includes('html')) return 'html';
    if (value.includes('javascript') || value.includes('ecmascript')) return 'javascript';
    if (value.includes('css')) return 'css';
    if (value.includes('font') || value.includes('octet-stream')) return 'font-or-binary';
    if (value.includes('text')) return 'text';
    return 'other';
  }

  function resourceRole(rawUrl: string, resourceType: string, endpointClassification: EndpointSemanticClassification | null): ResourceRole {
    return classifyResourceRole({
      url: rawUrl,
      resourceType,
      endpointClassification,
      targetOrigin: opts.targetOrigin,
    });
  }

  function recordResource(
    rawUrl: string,
    role: ResourceRole,
    state: ResourceLifecycleState,
    method: string,
    status: number | null,
    contentType: string | undefined,
  ): void {
    resourceLedger.push({
      role,
      state,
      method,
      stepId: journeyIntent?.stepId ?? null,
      status,
      contentTypeClass: contentTypeClass(contentType),
    });
  }

  function recordOracleIssue(input: {
    reason: string;
    message: string;
    rawUrl: string;
    redactedUrl: string;
    role: ResourceRole;
    status?: number | null;
    contentType?: string | null;
    routeClass?: string | null;
    data?: Record<string, unknown>;
  }): void {
    const impact = resourceImpact(input.role);
    if (impact === 'OPTIONAL' || impact === 'ASSET') optionalResourceFailureUrls.add(input.rawUrl);
    const fingerprint = fingerprintAnomaly({
      journeyId: opts.journeyId ?? 'unbound',
      stepId: journeyIntent?.stepId ?? null,
      oracleId: input.reason,
      resourceRole: input.role,
      host: (() => { try { return new URL(input.rawUrl).hostname; } catch { return undefined; } })(),
      path: input.rawUrl,
      status: input.status,
      contentType: input.contentType,
      routeClass: input.routeClass,
    });
    const ev = recorder.event({
      type: 'oracle',
      severity: impact === 'BOOTSTRAP' || impact === 'KNOWN_READ' ? 'error' : 'warn',
      message: input.message,
      data: {
        url: input.redactedUrl,
        reason: input.reason,
        oracleId: input.reason,
        oracleCategory: input.reason,
        oracleSeverity: impact === 'BOOTSTRAP' || impact === 'KNOWN_READ' ? 'error' : 'anomaly',
        anomalyClass: impact === 'ASSET' || impact === 'OPTIONAL'
          ? 'DEV_INFRA_TRANSIENT'
          : impact === 'BOOTSTRAP' || impact === 'KNOWN_READ'
            ? 'PRODUCT_BEHAVIOR_ANOMALY'
            : 'UNKNOWN',
        causalToPrimaryFailure: impact === 'ASSET' || impact === 'OPTIONAL' ? 'NOT_CAUSAL' : 'UNRESOLVED',
        fingerprint,
        resourceRole: input.role,
        impact,
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.contentType === undefined || input.contentType === null ? {} : { contentType: contentTypeClass(input.contentType) }),
        ...(input.data ?? {}),
      },
    });
    monitor.recordIssue(ev);
  }

  async function handleRoute(route: Route): Promise<void> {
    try {
      const request = route.request();
      const rawUrl = request.url();

      // WebSockets are governed by the routeWebSocket policy (L2), not here.
      // Playwright does not route ws handshakes through route(), but if a
      // future version does, do not double-classify them.
      if (/^wss?:/i.test(rawUrl)) {
        await route.continue();
        return;
      }

      const decision = decideBrowserHttp(policy, rawUrl);
      const endpointMatch = matchEndpoint(rawUrl, request.method());
      const endpointClassification = endpointMatch?.classification ?? null;
      const semanticObservation = endpointMatch === null
        ? null
        : recordSemanticObservation(endpointMatch, request.method());

      // Register secrets BEFORE recording anything: every sensitive header
      // value plus the full Cookie header becomes a redaction secret.
      const headers = request.headers();
      for (const name of Object.keys(headers)) {
        if (RedactionLayer.isSensitiveHeader(name)) {
          recorder.redaction.addSecret(headers[name]);
        }
      }
      recorder.redaction.addSecret(headers['cookie']); // explicit; addSecret dedups

      const redactedUrl = recorder.redactUrl(rawUrl);
      const redactedHeaders = recorder.redaction.redactHeaders(headers);

      // Semantic endpoint safety is independent of HTTP method. A
      // source-backed KNOWN_MUTATION rule is never allowed to leave the
      // browser, even when the outbound host itself is allowlisted. Natural
      // initialization calls classified UNKNOWN are recorded and may be
      // observed; this branch exists for the prohibited known-mutation case.
      if (decision.verdict === 'allow' && endpointClassification === 'KNOWN_MUTATION') {
        const failureEvent = recorder.event({
          type: 'hard-failure',
          severity: 'fatal',
          message: 'HARD FAILURE: known mutation endpoint blocked',
          data: {
            url: redactedUrl,
            method: request.method(),
            endpointClassification,
            semanticRuleId: endpointMatch?.ruleId,
            verdict: 'deny',
            reason: 'known-mutation-endpoint',
            path: 'semantic-endpoint',
          },
        });
        monitor.recordHardFailure(failureEvent, {
          url: rawUrl,
          verdict: 'deny',
          hostClass: decision.hostClass,
          reason: 'known-mutation-endpoint',
          monitorReason: 'POLICY_VIOLATION',
          guardType: 'semantic-endpoint',
          path: 'semantic-endpoint',
        });
        try {
          await route.abort('blockedbyclient');
        } catch {
          // The Fetch guard may have handled the same request first.
        }
        return;
      }

      if (decision.verdict === 'allow' && semanticObservation?.disposition === 'ACTION_CAUSED_UNKNOWN') {
        try {
          await route.abort('blockedbyclient');
        } catch {
          // The Fetch guard may have handled the same request first.
        }
        return;
      }

      if (decision.verdict === 'allow') {
        active += 1;
        requestCount += 1;
        lastActivity = Date.now();
        recordResource(rawUrl, resourceRole(rawUrl, request.resourceType(), endpointClassification), 'REQUESTED', request.method(), null, undefined);
        recorder.event({
          type: 'request',
          severity: 'info',
          message: `${request.method()} ${redactedUrl}`,
          data: {
            method: request.method(),
            url: redactedUrl,
            headers: redactedHeaders,
            resourceType: request.resourceType(),
            verdict: 'allow',
            policyDecision: decision.verdict,
            policyClassification: decision.classification,
            policyHostClass: decision.hostClass,
            reason: decision.reason,
            ...(endpointClassification === null ? {} : { endpointClassification }),
            ...(endpointMatch === null ? {} : { endpointRuleId: endpointMatch.ruleId }),
          },
        });
        await route.continue();
        return;
      }

      if (isNonFatalBlock(decision.verdict)) {
        // Dedupe with the Fetch guard: whichever layer resolves the pause
        // first records the evidence; the other skips.
        if (!blockedUrls.has(rawUrl)) {
          blockedUrls.add(rawUrl);
          if (decision.verdict === 'block-optional-support') optionalSupportBlockedHosts.add(decision.host);
          if (decision.verdict === 'block-telemetry') telemetryBlockedHosts.add(decision.host);
          if (decision.verdict === 'block-browser-background' && isBrowserBackgroundClassification(decision.classification)) {
            browserBackgroundBlockedHosts.set(decision.host, decision.classification);
          }
          if (decision.verdict === 'block-optional-support') monitor.recordContainment('OPTIONAL_THIRD_PARTY_SUPPORT');
          if (decision.verdict === 'block-telemetry') monitor.recordContainment('TELEMETRY');
          if (decision.verdict === 'block-browser-background') monitor.recordContainment('BROWSER_BACKGROUND');
          recordResource(rawUrl, resourceRole(rawUrl, request.resourceType(), endpointClassification), 'CANCELED_BY_POLICY', request.method(), null, undefined);
          recorder.event({
            type: decision.verdict === 'block-optional-support'
              ? 'optional-support'
              : decision.verdict === 'block-browser-background'
                ? 'browser-background'
                : 'telemetry',
            severity: 'info',
            message: decision.verdict === 'block-optional-support'
              ? 'OPTIONAL_THIRD_PARTY_SUPPORT_BLOCKED'
              : decision.verdict === 'block-browser-background'
                ? 'BROWSER_BACKGROUND_BLOCKED'
                : `telemetry blocked: ${redactedUrl}`,
            data: {
              url: redactedUrl,
              verdict: decision.verdict,
              hostClass: decision.hostClass,
              classification: decision.classification,
              policyDecision: decision.verdict,
              policyClassification: decision.classification,
              policyHostClass: decision.hostClass,
              method: request.method(),
              resourceType: request.resourceType(),
              ...(decision.verdict === 'block-browser-background'
                ? { containment: 'EXPECTED_CONTAINMENT_EFFECT' }
                : {}),
              reason: decision.reason,
            },
          });
        }
        try {
          await route.abort('blockedbyclient'); // never reaches the network
        } catch {
          // benign race: the Fetch guard already failed this request
        }
        return;
      }

      // verdict === 'deny' — HARD FAILURE. Abort before any network I/O.
      if (!blockedUrls.has(rawUrl)) {
        blockedUrls.add(rawUrl);
        recordResource(rawUrl, resourceRole(rawUrl, request.resourceType(), endpointClassification), 'CANCELED_BY_POLICY', request.method(), null, undefined);
        recorder.event({
          type: 'request',
          severity: 'info',
          message: `${request.method()} ${redactedUrl}`,
          data: {
            method: request.method(),
            url: redactedUrl,
            headers: redactedHeaders,
            resourceType: request.resourceType(),
            verdict: 'deny',
            policyDecision: decision.verdict,
            policyClassification: decision.classification,
            policyHostClass: decision.hostClass,
            reason: decision.reason,
            ...(endpointClassification === null ? {} : { endpointClassification }),
          },
        });
        const failureEvent = recorder.event({
          type: 'hard-failure',
          severity: 'fatal',
          message: `HARD FAILURE: ${redactedUrl}`,
          data: {
            url: redactedUrl,
            verdict: 'deny',
            hostClass: decision.hostClass,
            reason: decision.reason,
          },
        });
        monitor.recordHardFailure(failureEvent, {
          url: rawUrl,
          verdict: 'deny',
          hostClass: decision.hostClass,
          reason: decision.reason,
        });
      }
      try {
        await route.abort('blockedbyclient');
      } catch {
        // benign race: the Fetch guard already failed this request
      }
    } catch (err) {
      // The route handler must never hang the browser.
      try {
        recorder.event({
          type: 'policy',
          severity: 'warn',
          message: `route handler error: ${recorder.redaction.redactText(
            String(err instanceof Error ? err.message : err)
          )}`,
          data: { reason: 'route-handler-error' },
        });
      } catch {
        // recorder itself failing — nothing more we can do.
      }
      try {
        await route.abort('failed');
      } catch {
        // route already handled — ignore.
      }
    }
  }

  /** L2 — WebSocket policy: same semantics as HTTP, never weaker. */
  async function handleWebSocket(ws: import('@playwright/test').WebSocketRoute): Promise<void> {
    const rawUrl = ws.url();
    const decision = decideBrowserWebSocket(policy, rawUrl);
    const redactedUrl = recorder.redactUrl(rawUrl);
    const base = {
      url: redactedUrl,
      protocol: 'websocket',
      reason: decision.reason,
    } as Record<string, unknown>;

    if (decision.verdict === 'allow') {
      recorder.event({
        type: 'request',
        severity: 'info',
        message: `WS ${redactedUrl}`,
        data: { ...base, method: 'WS', verdict: 'allow' },
      });
      await ws.connectToServer();
      return;
    }

    if (isNonFatalBlock(decision.verdict)) {
      blockedUrls.add(rawUrl);
      if (decision.verdict === 'block-optional-support') optionalSupportBlockedHosts.add(decision.host);
      if (decision.verdict === 'block-telemetry') telemetryBlockedHosts.add(decision.host);
      if (decision.verdict === 'block-browser-background' && isBrowserBackgroundClassification(decision.classification)) {
        browserBackgroundBlockedHosts.set(decision.host, decision.classification);
      }
      recorder.event({
        type: decision.verdict === 'block-optional-support'
          ? 'optional-support'
          : decision.verdict === 'block-browser-background'
            ? 'browser-background'
            : 'telemetry',
        severity: 'info',
        message: decision.verdict === 'block-optional-support'
          ? 'OPTIONAL_THIRD_PARTY_SUPPORT_BLOCKED'
          : decision.verdict === 'block-browser-background'
            ? 'BROWSER_BACKGROUND_BLOCKED'
            : `telemetry blocked: ${redactedUrl}`,
        data: {
          ...base,
          verdict: decision.verdict,
          hostClass: decision.hostClass,
          classification: decision.classification,
          ...(decision.verdict === 'block-browser-background'
            ? { containment: 'EXPECTED_CONTAINMENT_EFFECT' }
            : {}),
        },
      });
      await ws.close(); // never connects to the server
      return;
    }

    // deny — HARD FAILURE, closed before any meaningful communication.
    blockedUrls.add(rawUrl);
    recorder.event({
      type: 'request',
      severity: 'info',
      message: `WS ${redactedUrl}`,
      data: { ...base, method: 'WS', verdict: 'deny' },
    });
    const failureEvent = recorder.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: `HARD FAILURE: ${redactedUrl}`,
      data: { ...base, verdict: 'deny', hostClass: decision.hostClass },
    });
    await ws.close();
    monitor.recordHardFailure(failureEvent, {
      url: rawUrl,
      verdict: 'deny',
      hostClass: decision.hostClass,
      reason: decision.reason,
    });
  }

  async function onResponse(response: Response): Promise<void> {
    try {
      const rawUrl = response.request().url();
      if (blockedUrls.has(rawUrl)) return; // policy-aborted — no response exists
      const redactedUrl = recorder.redactUrl(rawUrl);
      const status = response.status();
      const responseHeaders = response.headers();
      const contentType = responseHeaders['content-type'];
      const contentLength = responseHeaders['content-length'];
      const method = response.request().method();
      const endpointClassification = matchEndpoint(rawUrl, method)?.classification ?? null;
      const role = resourceRole(rawUrl, response.request().resourceType(), endpointClassification);
      active = Math.max(0, active - 1);
      lastActivity = Date.now();
      completedRequests.add(response.request());
      recordResource(rawUrl, role, status >= 400 ? 'HTTP_FAILED' : 'COMPLETED', method, status, contentType);

      const data: Record<string, unknown> = {
        url: redactedUrl,
        method,
        resourceType: response.request().resourceType(),
        status,
        contentType,
        completed: true,
        ...(contentLength !== undefined ? { contentLength } : {}),
        ...(endpointClassification === null ? {} : { endpointClassification }),
      };

      // Body capture: only for JSON-ish content types; capped and redacted.
      // body stays undefined when capture fails — oracles must NOT run on a
      // failed capture (an unreadable body is not a malformed body). The
      // recorder drops the `body` key entirely in authenticated mode before
      // persistence, so the payload is never written to evidence; it is read
      // in-memory only to feed the passive protocol oracles (e.g. malformed-json)
      // that the SPEC requires as a passive-observation deliverable.
      let body: string | undefined;
      let bodyCapture: 'complete' | 'incomplete' | 'unavailable' = 'unavailable';
      if (contentType !== undefined && /(json|ndjson|stream)/i.test(contentType)) {
        try {
          const buf = await response.body();
          bodyCapture = bodyCaptureStatus(buf, responseHeaders);
          const text = buf.toString('utf8');
          if (text.length > MAX_BODY_CHARS) bodyCapture = 'incomplete';
          body = recorder.redaction.redactText(
            text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text
          );
          data.body = body;
        } catch {
          // unreadable body (no-body response, closed early...) — skip capture
        }
      }
      data.bodyCapture = bodyCapture;

      recorder.event({
        type: 'response',
        severity: status >= 500 ? 'error' : 'info',
        message: `${status} ${redactedUrl}`,
        data,
      });

      // Passive protocol oracles (RECON_B §6.1 H1/H8 baseline). Oracle issues
      // are typed 'oracle' with the semantic check name in data.reason.
      // Body-dependent oracles run only when capture succeeded.
      const issues = [
        checkUnexpectedStatus(status, redactedUrl, role),
        body !== undefined ? checkJsonBody(body, redactedUrl, contentType, status, bodyCapture === 'complete') : null,
        body !== undefined ? checkNdjsonBody(body, redactedUrl, contentType, status, bodyCapture === 'complete') : null,
      ];
      for (const issue of issues) {
        if (issue !== null) {
          if (issue.type === 'unexpected-status') {
            const impact = resourceImpact(role);
            recordOracleIssue({
              reason: impact === 'BOOTSTRAP' ? 'critical-resource-status' : impact === 'KNOWN_READ' ? 'known-read-status' : 'unexpected-status',
              message: `${issue.type}: ${redactedUrl}`,
              rawUrl,
              redactedUrl,
              role,
              status,
              contentType,
              data: { protocolExpected: issue.protocolExpected, protocolObserved: issue.protocolObserved },
            });
            continue;
          }
          const location = safeProtocolLocation(redactedUrl);
          const fingerprint = fingerprintAnomaly({
            journeyId: opts.journeyId ?? 'unbound',
            stepId: journeyIntent?.stepId ?? null,
            oracleId: issue.type,
            resourceRole: role,
            host: (() => { try { return new URL(rawUrl).hostname; } catch { return undefined; } })(),
            path: rawUrl,
            status,
            contentType,
          });
          const ev = recorder.event({
            type: 'oracle',
            severity: 'warn',
            message: `${issue.type}: ${redactedUrl}`,
            data: {
              url: redactedUrl,
              reason: issue.type,
              oracleCategory: issue.type,
              oracleSeverity: issue.oracleSeverity,
              anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY',
              causalToPrimaryFailure: 'UNRESOLVED',
              fingerprint,
              resourceRole: role,
              origin: location.origin,
              path: location.path,
              method,
              status,
              ...(contentType !== undefined ? { contentType } : {}),
              ...(contentLength !== undefined ? { contentLength } : {}),
              protocolExpected: issue.protocolExpected,
              protocolObserved: issue.protocolObserved,
              endpointClassification: endpointClassification ?? OBSERVED_ENDPOINT_CLASSIFICATION,
            },
          });
          monitor.recordIssue(ev);
        }
      }
      const contentIssue = checkResourceContentType(role, status, contentType, redactedUrl);
      if (contentIssue !== null) {
        const impact = resourceImpact(role);
        recordOracleIssue({
          reason: impact === 'BOOTSTRAP' ? 'critical-resource-content-type' : impact === 'KNOWN_READ' ? 'known-read-content-type' : 'asset-content-type-anomaly',
          message: contentIssue.message,
          rawUrl,
          redactedUrl,
          role,
          status,
          contentType,
          data: { expectedContentType: contentIssue.expected, observedContentType: contentIssue.observed },
        });
      }
    } catch {
      // An observer must never crash the run.
    }
  }

  function onRequestFailed(request: Request): void {
    try {
      const rawUrl = request.url();
      const redactedUrl = recorder.redactUrl(rawUrl);
      if (blockedUrls.has(rawUrl)) {
        const decision = policy.decide(rawUrl);
        const endpointClassification = matchEndpoint(rawUrl, request.method())?.classification ?? null;
        const role = resourceRole(rawUrl, request.resourceType(), endpointClassification);
        recordResource(rawUrl, role, 'CANCELED_BY_POLICY', request.method(), null, undefined);
        recorder.event({
          type: 'requestfailed',
          severity: 'info',
          message: `blocked by policy (expected): ${redactedUrl}`,
          data: {
            url: redactedUrl,
            method: request.method(),
            resourceType: request.resourceType(),
            blockedByPolicy: true,
            verdict: decision.verdict,
            policyClassification: decision.classification,
            policyHostClass: decision.hostClass,
            failureCategory: 'policy-block',
          },
        });
        return;
      }
      const errorText = request.failure()?.errorText ?? 'unknown';
      const endpointClassification = matchEndpoint(rawUrl, request.method())?.classification ?? null;
      const role = resourceRole(rawUrl, request.resourceType(), endpointClassification);
      const lifecycleState = classifyRequestFailure(errorText, journeyIntent?.actionType === 'NAVIGATE_APPROVED_ROUTE');
      // Chromium can emit a follow-up ERR_ABORTED after a response has
      // already been delivered while a document is replaced. The response
      // lifecycle is authoritative in that case; do not relabel an HTTP
      // failure as a navigation cancellation.
      if (!completedRequests.has(request)) {
        recordResource(rawUrl, role, lifecycleState, request.method(), null, undefined);
      }
      // Client-side aborts (net::ERR_ABORTED) are ordinary application
      // behavior (e.g. EventSource.close(), fetch AbortController) and
      // net::ERR_BLOCKED_BY_CLIENT is Nightwatch's OWN Fetch-guard action —
      // both are recorded, never issues.
      if (
        errorText.includes('ERR_ABORTED') ||
        errorText.includes('inspector') ||
        errorText.includes('ERR_BLOCKED_BY_CLIENT')
      ) {
        recorder.event({
          type: 'requestfailed',
          severity: 'info',
          message: recorder.isAuthenticated ? `client-aborted request: ${redactedUrl}` : `client-aborted request: ${redactedUrl} (${errorText})`,
          data: {
            url: redactedUrl,
            method: request.method(),
            resourceType: request.resourceType(),
            completed: false,
            errorText: recorder.isAuthenticated ? recorder.classifyNetworkFailure(errorText) : errorText,
            failureCategory: recorder.classifyNetworkFailure(errorText),
            resourceRole: role,
            lifecycleState,
          },
        });
        return;
      }
      recorder.event({
        type: 'requestfailed',
        severity: 'warn',
        message: recorder.isAuthenticated ? `request failed: ${redactedUrl}` : `request failed: ${redactedUrl} (${errorText})`,
        data: {
          url: redactedUrl,
          method: request.method(),
          resourceType: request.resourceType(),
          completed: false,
          errorText: recorder.isAuthenticated ? recorder.classifyNetworkFailure(errorText) : errorText,
          failureCategory: recorder.classifyNetworkFailure(errorText),
          resourceRole: role,
          lifecycleState,
        },
      });
      const critical = role === 'MAIN_DOCUMENT' || role === 'APPLICATION_ENTRY' || role === 'CRITICAL_SCRIPT' ||
        role === 'CRITICAL_STYLESHEET' || role === 'API_KNOWN_READ';
      recordOracleIssue({
        reason: critical ? 'request-failed' : 'optional-resource-failure',
        message: `request-failed: ${redactedUrl}`,
        rawUrl,
        redactedUrl,
        role,
        data: { lifecycleState },
      });
    } catch {
      // observer must never crash the run
    }
  }

  /**
   * L4 — unrouted-request detection. Playwright does not re-route redirect
   * follow-ups (and some download-manager traffic). Any request observed here
   * that policy DENIES and that no route handler governed within the grace
   * window is still recorded as a hard failure: the violation cannot escape
   * the evidence or the run verdict even if it escapes interception.
   */
  function onRequestObserved(request: Request): void {
    try {
      const rawUrl = request.url();
      if (!isNetworkUrl(rawUrl)) return;
      const decision = decideBrowserHttp(policy, rawUrl);
      if (decision.verdict !== 'deny') return;
      if (blockedUrls.has(rawUrl)) return; // governed by a route/WS handler already

      setTimeout(() => {
        try {
          if (blockedUrls.has(rawUrl)) return; // route handler processed it synchronously
          blockedUrls.add(rawUrl);
          const redactedUrl = recorder.redactUrl(rawUrl);
          const ev = recorder.event({
            type: 'hard-failure',
            severity: 'fatal',
            message: `HARD FAILURE (unrouted request detected): ${redactedUrl}`,
            data: {
              url: redactedUrl,
              verdict: 'deny',
              hostClass: decision.hostClass,
              reason: decision.reason,
              path: 'unrouted-observation',
            },
          });
          monitor.recordHardFailure(ev, {
            url: rawUrl,
            verdict: 'deny',
            hostClass: decision.hostClass,
            reason: decision.reason,
          });
        } catch {
          // never crash the run from an observation timer
        }
      }, OBSERVATION_GRACE_MS);
    } catch {
      // observer must never crash the run
    }
  }

  /** Attach response/requestfailed/observation capture to one page. */
  function installPage(page: Page): void {
    page.on('response', onResponse);
    page.on('requestfailed', onRequestFailed);
    page.on('request', onRequestObserved);
  }

  return {
    async install(context: BrowserContext): Promise<void> {
      // Both registrations are ASYNC (routeWebSocket installs an in-page init
      // script + binding). They MUST complete before any navigation: an
      // unawaited registration leaves a window without WebSocket interception
      // and can reject with 'Target closed' when the context shuts down.
      await context.route('**/*', handleRoute);
      await context.routeWebSocket('**/*', handleWebSocket);
      // Wire existing pages, and auto-wire popups/new pages.
      for (const page of context.pages()) installPage(page);
      context.on('page', (page) => installPage(page));
    },
    activeRequests: () => active,
    lastActivityAt: () => lastActivity,
    blockedUrls: () => blockedUrls,
    optionalSupportBlockedHosts: () => optionalSupportBlockedHosts,
    telemetryBlockedHosts: () => telemetryBlockedHosts,
    browserBackgroundBlockedHosts: () => browserBackgroundBlockedHosts,
    optionalResourceFailureUrls: () => optionalResourceFailureUrls,
    beginJourneyIntent: (stepId: string, actionType: string): void => {
      if (journeyIntent !== null) {
        throw new Error('fail-closed: a journey action is already active');
      }
      journeyIntent = { stepId, actionType };
    },
    endJourneyIntent: (stepId: string): void => {
      if (journeyIntent !== null && journeyIntent.stepId === stepId) journeyIntent = null;
    },
    semanticRequests: (): readonly SemanticRequestObservation[] => semanticLedger.map((item) => ({ ...item })),
    beginJourneyObservation: (): void => {
      journeyObservationStart = semanticLedger.length;
    },
    journeySemanticRequests: (): readonly SemanticRequestObservation[] => semanticLedger.slice(journeyObservationStart).map((item) => ({ ...item })),
    resourceObservations: (): readonly ResourceObservation[] => resourceLedger.map((item) => ({ ...item })),
    requestCount: (): number => requestCount,
  };
}
