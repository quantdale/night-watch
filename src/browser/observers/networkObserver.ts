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
import type { EndpointSemanticClassification } from '../../core/safety/endpointSemantics';
import {
  checkUnexpectedStatus,
  checkJsonBody,
  checkNdjsonBody,
} from '../../oracles/protocol/passiveChecks';

/** Max captured body size (chars) — bodies are sliced, then redacted. */
const MAX_BODY_CHARS = 1_000_000;

/**
 * Grace period for the unrouted-request detector: route handlers run
 * synchronously at interception and record into blockedUrls before this
 * timer fires, so routed requests never double-report.
 */
const OBSERVATION_GRACE_MS = 150;

/** No path-level endpoint registry exists in the capture observer. HTTP
 * method alone is deliberately insufficient to label a request read/mutate. */
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
}

export function createNetworkObserver(opts: {
  policy: OutboundPolicy;
  recorder: RunRecorder;
  monitor: RunMonitor;
  endpointClassifier?: (url: string, method: string) => EndpointSemanticClassification | null;
  optionalSupportBlockedHosts?: Set<string>;
  browserBackgroundBlockedHosts?: Map<string, BrowserBackgroundClassification>;
}): NetworkObserver {
  const { policy, recorder, monitor } = opts;

  let active = 0;
  let lastActivity = Date.now();
  const blockedUrls = new Set<string>();
  const optionalSupportBlockedHosts = opts.optionalSupportBlockedHosts ?? new Set<string>();
  const telemetryBlockedHosts = new Set<string>();
  const browserBackgroundBlockedHosts = opts.browserBackgroundBlockedHosts ?? new Map<string, BrowserBackgroundClassification>();

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
      const endpointClassification = opts.endpointClassifier?.(rawUrl, request.method()) ?? null;

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

      if (decision.verdict === 'allow') {
        active += 1;
        lastActivity = Date.now();
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
            reason: decision.reason,
            ...(endpointClassification === null ? {} : { endpointClassification }),
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
      const endpointClassification = opts.endpointClassifier?.(rawUrl, method) ?? null;
      active = Math.max(0, active - 1);
      lastActivity = Date.now();

      const data: Record<string, unknown> = {
        url: redactedUrl,
        method,
        status,
        contentType,
        ...(contentLength !== undefined ? { contentLength } : {}),
        ...(endpointClassification === null ? {} : { endpointClassification }),
      };

      // Body capture: only for JSON-ish content types; capped and redacted.
      // body stays undefined when capture fails — oracles must NOT run on a
      // failed capture (an unreadable body is not a malformed body).
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
        checkUnexpectedStatus(status, redactedUrl),
        body !== undefined ? checkJsonBody(body, redactedUrl, contentType, status, bodyCapture === 'complete') : null,
        body !== undefined ? checkNdjsonBody(body, redactedUrl, contentType, status, bodyCapture === 'complete') : null,
      ];
      for (const issue of issues) {
        if (issue !== null) {
          const location = safeProtocolLocation(redactedUrl);
          const ev = recorder.event({
            type: 'oracle',
            severity: 'warn',
            message: `${issue.type}: ${redactedUrl}`,
            data: {
              url: redactedUrl,
              reason: issue.type,
              oracleCategory: issue.type,
              oracleSeverity: issue.oracleSeverity,
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
    } catch {
      // An observer must never crash the run.
    }
  }

  function onRequestFailed(request: Request): void {
    try {
      const rawUrl = request.url();
      const redactedUrl = recorder.redactUrl(rawUrl);
      if (blockedUrls.has(rawUrl)) {
        recorder.event({
          type: 'requestfailed',
          severity: 'info',
          message: `blocked by policy (expected): ${redactedUrl}`,
        });
        return;
      }
      const errorText = request.failure()?.errorText ?? 'unknown';
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
          data: { url: redactedUrl, errorText: recorder.isAuthenticated ? recorder.classifyNetworkFailure(errorText) : errorText },
        });
        return;
      }
      recorder.event({
        type: 'requestfailed',
        severity: 'warn',
        message: recorder.isAuthenticated ? `request failed: ${redactedUrl}` : `request failed: ${redactedUrl} (${errorText})`,
        data: { url: redactedUrl, errorText: recorder.isAuthenticated ? recorder.classifyNetworkFailure(errorText) : errorText },
      });
      const issueEvent = recorder.event({
        type: 'issue',
        severity: 'error',
        message: `request-failed: ${redactedUrl}`,
        data: { reason: 'request-failed' },
      });
      monitor.recordIssue(issueEvent);
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
  };
}
