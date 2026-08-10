// ---------------------------------------------------------------------------
// Nightwatch — raw CDP Fetch guard (containment layer L0, Phase 1.1).
//
// Playwright's context.route does NOT re-intercept redirect follow-ups
// (verified empirically on Playwright 1.62.1 + system Chrome), so a
// navigation 302 -> denied host would otherwise reach the network. A raw CDP
// Fetch session on the page target pauses EVERY request — including redirect
// follow-ups — and this guard resolves each pause with the SAME decision the
// OutboundPolicy would make:
//
//   deny / local block -> Fetch.failRequest (aborted BEFORE any network I/O)
//   allow             -> Fetch.continueRequest
//
// Both the guard and the Playwright route handler (L1) make identical policy
// decisions, so their races are benign: whichever resolves a pause first,
// the outcome is the same. Evidence is recorded exactly once per request via
// a shared blockedUrls set (the guard records when it wins the race, the
// route handler when it does).
//
// Chrome pauses a request for EVERY session that enabled the Fetch domain
// (verified: a session that never responds stalls the request), so the guard
// MUST respond to every pause it receives — it does.
//
// This layer is a backstop, not the primary gate: L1/L2 remain the rich
// evidence path; L4 detects anything that still slips through.
// ---------------------------------------------------------------------------

import type { BrowserContext, Page } from '@playwright/test';
import { OutboundPolicy, isNetworkUrl } from '../../core/safety/outboundPolicy';
import { decideBrowserHttp } from '../../core/safety/policyConsumers';
import { isBrowserBackgroundClassification, type BrowserBackgroundClassification } from '../../core/safety/types';
import type { RunRecorder } from '../../core/evidence/runRecorder';
import type { RunMonitor } from '../../state/run';

export interface FetchGuardOptions {
  policy: OutboundPolicy;
  recorder: RunRecorder;
  monitor: RunMonitor;
  /** Live blocked-URL set shared with the network observer (dedupe). */
  sharedBlocked: Set<string>;
  /**
   * When the guard denies a request that no other layer recorded, it records
   * the evidence itself (request event + hard failure). Default true.
   */
  recordEvidence?: boolean;
  /** Shared exact-host set used to attribute support-widget console effects. */
  optionalSupportBlockedHosts?: Set<string>;
  /** Shared exact-host set used to attribute telemetry console effects. */
  telemetryBlockedHosts?: Set<string>;
  /** Shared exact-host map used to attribute browser-background console effects. */
  browserBackgroundBlockedHosts?: Map<string, BrowserBackgroundClassification>;
}

/**
 * Install the raw CDP Fetch guard on one page target. Best-effort: failures
 * to install are recorded as warn events and never crash the run.
 */
export async function installFetchGuard(
  context: BrowserContext,
  page: Page,
  opts: FetchGuardOptions
): Promise<void> {
  const { policy, recorder, monitor } = opts;
  const sharedBlocked = opts.sharedBlocked;
  const recordEvidence = opts.recordEvidence ?? true;
  const optionalSupportBlockedHosts = opts.optionalSupportBlockedHosts;
  const telemetryBlockedHosts = opts.telemetryBlockedHosts;
  const browserBackgroundBlockedHosts = opts.browserBackgroundBlockedHosts;

  let session: Awaited<ReturnType<BrowserContext['newCDPSession']>> | null = null;
  try {
    session = await context.newCDPSession(page);
    await session.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  } catch (err) {
    recorder.event({
      type: 'policy',
      severity: 'warn',
      message: `Fetch guard not installed for a page: ${recorder.redaction.redactText(
        String(err instanceof Error ? err.message : err)
      )}`,
      data: { reason: 'fetch-guard-install-failed' },
    });
    return;
  }

  const cdp = session;
  cdp.on('Fetch.requestPaused', (p: { requestId: string; request: { url: string } }) => {
    // Resolve EVERY pause, synchronously dispatching the async send — Chrome
    // waits for all sessions that enabled the Fetch domain.
    void (async () => {
      try {
        const rawUrl = p.request.url;
        if (!isNetworkUrl(rawUrl)) {
          await cdp.send('Fetch.continueRequest', { requestId: p.requestId });
          return;
        }
        const decision = decideBrowserHttp(policy, rawUrl);
        if (decision.verdict === 'allow') {
          await cdp.send('Fetch.continueRequest', { requestId: p.requestId });
          return;
        }
        // deny or non-fatal block: fail before the request can reach the
        // network; record evidence once (deduped via the shared set).
        if (recordEvidence && !sharedBlocked.has(rawUrl)) {
          sharedBlocked.add(rawUrl);
          const redactedUrl = recorder.redactUrl(rawUrl);
          if (decision.verdict === 'deny') {
            recorder.event({
              type: 'request',
              severity: 'info',
              message: `${decision.verdict === 'deny' ? 'HARD' : 'BLOCK'} ${redactedUrl}`,
              data: {
                method: 'GUARD',
                url: redactedUrl,
                verdict: 'deny',
                reason: decision.reason,
                path: 'fetch-guard',
              },
            });
            const ev = recorder.event({
              type: 'hard-failure',
              severity: 'fatal',
              message: `HARD FAILURE: ${redactedUrl}`,
              data: {
                url: redactedUrl,
                verdict: 'deny',
                hostClass: decision.hostClass,
                reason: decision.reason,
                path: 'fetch-guard',
              },
            });
            monitor.recordHardFailure(ev, {
              url: rawUrl,
              verdict: 'deny',
              hostClass: decision.hostClass,
              reason: decision.reason,
            });
          } else if (decision.verdict === 'block-optional-support') {
            optionalSupportBlockedHosts?.add(decision.host);
            recorder.event({
              type: 'optional-support',
              severity: 'info',
              message: 'OPTIONAL_THIRD_PARTY_SUPPORT_BLOCKED',
              data: {
                url: redactedUrl,
                verdict: decision.verdict,
                hostClass: decision.hostClass,
                classification: 'OPTIONAL_THIRD_PARTY_SUPPORT',
                reason: decision.reason,
                path: 'fetch-guard',
              },
            });
          } else if (decision.verdict === 'block-browser-background') {
            if (isBrowserBackgroundClassification(decision.classification)) {
              browserBackgroundBlockedHosts?.set(decision.host, decision.classification);
            }
            recorder.event({
              type: 'browser-background',
              severity: 'info',
              message: 'BROWSER_BACKGROUND_BLOCKED',
              data: {
                url: redactedUrl,
                verdict: decision.verdict,
                hostClass: decision.hostClass,
                classification: decision.classification,
                containment: 'EXPECTED_CONTAINMENT_EFFECT',
                reason: decision.reason,
                path: 'fetch-guard',
              },
            });
          } else {
            telemetryBlockedHosts?.add(decision.host);
            recorder.event({
              type: 'telemetry',
              severity: 'info',
              message: `telemetry blocked: ${redactedUrl}`,
              data: { url: redactedUrl, verdict: decision.verdict, hostClass: decision.hostClass, classification: 'TELEMETRY', reason: decision.reason, path: 'fetch-guard' },
            });
          }
        } else if (!sharedBlocked.has(rawUrl)) {
          // Evidence recording disabled but not yet marked — still mark so
          // downstream layers treat it as policy-blocked.
          sharedBlocked.add(rawUrl);
        }
        await cdp.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
      } catch {
        // Race: the request was already handled by another session — ignore.
      }
    })();
  });
}
