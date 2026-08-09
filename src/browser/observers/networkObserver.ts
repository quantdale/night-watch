// ---------------------------------------------------------------------------
// Nightwatch — network observer.
//
// Installs a context-wide route handler (`context.route('**/*')`) so EVERY
// outbound request is inspected by the OutboundPolicy BEFORE it leaves the
// browser: allowed requests continue, telemetry is aborted (never reaches the
// network, never fails the run), and denied requests abort AND raise a
// hard failure. Response bodies are captured for JSON-ish content types and
// run through the passive protocol oracles.
//
// All evidence (URLs, headers, bodies) is redacted through the recorder's
// shared RedactionLayer BEFORE recording — the recorder itself never redacts.
// ---------------------------------------------------------------------------

import type { BrowserContext, Page, Request, Response, Route } from '@playwright/test';
import { RedactionLayer } from '../../core/safety/redaction';
import type { OutboundPolicy } from '../../core/safety/outboundPolicy';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';
import {
  checkUnexpectedStatus,
  checkJsonBody,
  checkNdjsonBody,
} from '../../oracles/protocol/passiveChecks';

/** Max captured body size (chars) — bodies are sliced, then redacted. */
const MAX_BODY_CHARS = 1_000_000;

export interface NetworkObserver {
  install(context: BrowserContext): void;
  activeRequests(): number;
  lastActivityAt(): number;
  /** URLs aborted by policy (deny or telemetry) — raw, unredacted. */
  blockedUrls(): Set<string>;
}

export function createNetworkObserver(opts: {
  policy: OutboundPolicy;
  recorder: RunRecorder;
  monitor: RunMonitor;
}): NetworkObserver {
  const { policy, recorder, monitor } = opts;

  let active = 0;
  let lastActivity = Date.now();
  const blockedUrls = new Set<string>();

  async function handleRoute(route: Route): Promise<void> {
    try {
      const request = route.request();
      const rawUrl = request.url();
      const decision = policy.decide(rawUrl);

      // Register secrets BEFORE recording anything: every sensitive header
      // value plus the full Cookie header becomes a redaction secret.
      const headers = request.headers();
      for (const name of Object.keys(headers)) {
        if (RedactionLayer.isSensitiveHeader(name)) {
          recorder.redaction.addSecret(headers[name]);
        }
      }
      recorder.redaction.addSecret(headers['cookie']); // explicit; addSecret dedups

      const redactedUrl = recorder.redaction.redactUrl(rawUrl);
      const redactedHeaders = recorder.redaction.redactHeaders(headers);

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
          },
        });
        await route.continue();
        return;
      }

      if (decision.verdict === 'block-telemetry') {
        blockedUrls.add(rawUrl);
        recorder.event({
          type: 'telemetry',
          severity: 'info',
          message: `telemetry blocked: ${redactedUrl}`,
          data: { url: redactedUrl, verdict: 'block-telemetry', reason: decision.reason },
        });
        await route.abort('blockedbyclient'); // never reaches the network
        return;
      }

      // verdict === 'deny' — HARD FAILURE. Abort before any network I/O.
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
      await route.abort('blockedbyclient');
      monitor.recordHardFailure(failureEvent, {
        url: rawUrl,
        verdict: 'deny',
        hostClass: decision.hostClass,
        reason: decision.reason,
      });
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

  async function onResponse(response: Response): Promise<void> {
    try {
      const rawUrl = response.request().url();
      if (blockedUrls.has(rawUrl)) return; // policy-aborted — no response exists
      const redactedUrl = recorder.redaction.redactUrl(rawUrl);
      const status = response.status();
      const contentType = response.headers()['content-type'];
      active = Math.max(0, active - 1);
      lastActivity = Date.now();

      const data: Record<string, unknown> = { url: redactedUrl, status, contentType };

      // Body capture: only for JSON-ish content types; capped and redacted.
      let body: string | undefined;
      if (contentType !== undefined && /(json|ndjson|stream)/i.test(contentType)) {
        try {
          const buf = await response.body();
          const text = buf.toString('utf8');
          body = recorder.redaction.redactText(
            text.length > MAX_BODY_CHARS ? text.slice(0, MAX_BODY_CHARS) : text
          );
          data.body = body;
        } catch {
          // unreadable body (no-body response, closed early...) — skip capture
        }
      }

      recorder.event({
        type: 'response',
        severity: status >= 500 ? 'error' : 'info',
        message: `${status} ${redactedUrl}`,
        data,
      });

      // Passive protocol oracles (RECON_B §6.1 H1/H8 baseline). The recorder's
      // RunEventType union has no per-check names, so oracle issues are typed
      // 'oracle' with the semantic check name in data.reason.
      const issues = [
        checkUnexpectedStatus(status, redactedUrl),
        checkJsonBody(body ?? '', redactedUrl, contentType),
        checkNdjsonBody(body ?? '', redactedUrl, contentType),
      ];
      for (const issue of issues) {
        if (issue !== null) {
          const ev = recorder.event({
            type: 'oracle',
            severity: issue.severity,
            message: issue.message,
            data: { url: redactedUrl, reason: issue.type },
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
      const redactedUrl = recorder.redaction.redactUrl(rawUrl);
      if (blockedUrls.has(rawUrl)) {
        recorder.event({
          type: 'requestfailed',
          severity: 'info',
          message: `blocked by policy (expected): ${redactedUrl}`,
        });
        return;
      }
      const errorText = request.failure()?.errorText ?? 'unknown';
      recorder.event({
        type: 'requestfailed',
        severity: 'warn',
        message: `request failed: ${redactedUrl} (${errorText})`,
        data: { url: redactedUrl, errorText },
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

  /** Attach response/requestfailed capture to one page (shared helper). */
  function installPage(page: Page): void {
    page.on('response', onResponse);
    page.on('requestfailed', onRequestFailed);
  }

  return {
    install(context: BrowserContext): void {
      context.route('**/*', handleRoute);
      // Wire existing pages, and auto-wire popups/new pages.
      for (const page of context.pages()) installPage(page);
      context.on('page', (page) => installPage(page));
    },
    activeRequests: () => active,
    lastActivityAt: () => lastActivity,
    blockedUrls: () => blockedUrls,
  };
}
