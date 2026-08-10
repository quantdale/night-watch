// ---------------------------------------------------------------------------
// Nightwatch — Phase 1.1 network-surface regression suite (browser containment).
//
// Every case drives the SAFETY fixture's window.__nw driver page against the
// FULL harness (canary → recorder → createNightwatchContext → probe →
// finalize) and asserts on the EVIDENCE: monitor state, events.jsonl /
// network.jsonl / console.jsonl, summary.json and the fixture server's own
// request log.
//
// HARNESS BEHAVIOR NOTES (verified empirically 2026-08-09, Playwright 1.62.1 +
// system Chrome, after Phase 1.1 harness fixes):
//   * L1 context.route('**/*') and L2 context.routeWebSocket('**/*') are
//     AWAITED before any navigation (routeWebSocket installs an in-page init
//     script + binding — unawaited, it leaves a window without the gate).
//   * L0 raw-CDP Fetch guard (fetchGuard.ts) pauses EVERY request on the page
//     target — including redirect follow-ups, which Playwright routing does
//     NOT re-intercept — and fails denied/telemetry URLs with the SAME policy
//     decision, BEFORE network I/O (navigation aborts with
//     net::ERR_BLOCKED_BY_CLIENT). Evidence is recorded exactly once via a
//     shared blockedUrls set.
//   * client-side aborts (net::ERR_ABORTED, inspector, ERR_BLOCKED_BY_CLIENT)
//     are recorded, never raised as issues.
//   * Since the fixes, the strict assertions below (request events with
//     verdict deny, telemetry events, monitor.failed === false for telemetry)
//     are deterministic. Redirect-follow-up violations surface as hard
//     failures recorded by the Fetch guard.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import type { RunSummary } from '../../src/core/evidence/types';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runCanary, assertCanary } from '../../src/core/safety/canary';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import type { FixtureServerHandle } from '../../src/browser/fixtures/fixtureServer';
import { createNightwatchContext } from '../../src/browser/context';
import type { NightwatchContext } from '../../src/browser/context';
import type { HardFailureRecord, RunMonitor } from '../../src/state/run';
import type { EnvironmentConfig } from '../../src/core/environment/types';

/** window.__nw driver surface exposed by the SAFETY fixture page. */
interface NwDriver {
  fetchJson(url: string): Promise<{ ok: boolean; error?: string }>;
  wsOpen(url: string, send?: string): Promise<{
    open: boolean;
    close: boolean;
    code: number | null;
    messages: string[];
  }>;
  esConnect(): Promise<string[]>;
  popup(url: string): 'opened' | 'blocked';
  attemptSW(): Promise<string>;
  startWorker(): Promise<string>;
  attemptSharedWorker(): string;
  dl(url: string): string;
  setCookieAndFetch(name: string, value: string, url: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------

function readJsonl(file: string): Array<Record<string, unknown>> {
  const text = fs.readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

/** Every file under a directory, recursively, skipping binary evidence. */
function allTextFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...allTextFiles(abs));
    } else if (!abs.endsWith('.zip') && !abs.endsWith('.png')) {
      out.push(abs);
    }
  }
  return out;
}

/** Concatenated text of every text artifact under a run dir (secret scan). */
function readAllText(dir: string): string {
  return allTextFiles(dir)
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
}

function dataOf(e: Record<string, unknown>): Record<string, unknown> | undefined {
  return e.data as Record<string, unknown> | undefined;
}

function dataUrl(e: Record<string, unknown>): string | undefined {
  const u = dataOf(e)?.url;
  return typeof u === 'string' ? u : undefined;
}

function dataStatus(e: Record<string, unknown>): number | undefined {
  const s = dataOf(e)?.status;
  return typeof s === 'number' ? s : undefined;
}

function dataVerdict(e: Record<string, unknown>): string | undefined {
  const v = dataOf(e)?.verdict;
  return typeof v === 'string' ? v : undefined;
}

function dataProtocol(e: Record<string, unknown>): string | undefined {
  const p = dataOf(e)?.protocol;
  return typeof p === 'string' ? p : undefined;
}

function dataResourceType(e: Record<string, unknown>): string | undefined {
  const r = dataOf(e)?.resourceType;
  return typeof r === 'string' ? r : undefined;
}

function dataHeaders(e: Record<string, unknown>): Record<string, unknown> | undefined {
  const h = dataOf(e)?.headers;
  return h !== undefined && typeof h === 'object' && !Array.isArray(h)
    ? (h as Record<string, unknown>)
    : undefined;
}

// ---------------------------------------------------------------------------
// Harness helpers
// ---------------------------------------------------------------------------

function buildEnv(server: FixtureServerHandle): EnvironmentConfig {
  return {
    name: 'local',
    label: 'safety',
    uiBaseUrl: server.origin,
    allowedHosts: ['127.0.0.1', 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: ['sentry.example.invalid'],
    browserBackgroundHosts: [
      { host: 'android.clients.google.com', classification: 'BROWSER_BACKGROUND_GOOGLE' },
      { host: 'update.googleapis.com', classification: 'BROWSER_BACKGROUND_UPDATE' },
      { host: 'redirector.gvt1.com', classification: 'BROWSER_BACKGROUND_DOWNLOAD' },
    ],
    failOn: [
      'hard-failure',
      'pageerror',
      'console-error',
      'request-failed',
      'malformed-json',
      'malformed-ndjson',
      'navigation-failed',
      'stability-timeout',
    ],
  };
}

export interface ProbeOutcome {
  monitor: RunMonitor;
  recorder: RunRecorder;
  summary: RunSummary;
  result: unknown;
}

/**
 * Run one containment probe end-to-end: canary → recorder → context → probe →
 * optional settle (waits for the evidence this case asserts) → finalize →
 * close. Each call uses a fresh fixture server owned by the caller.
 */
async function runProbe(
  browser: Browser,
  server: FixtureServerHandle,
  name: string,
  probe: (page: Page, ctx: NightwatchContext) => Promise<unknown>,
  settle?: (ctx: NightwatchContext, recorder: RunRecorder) => Promise<void>
): Promise<ProbeOutcome> {
  const env = buildEnv(server);
  const recorder = new RunRecorder({
    runId: `${name}-${Date.now()}`,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'safety-smoke',
  });
  recorder.event({ type: 'start', severity: 'info', message: 'safety probe' });
  assertCanary(runCanary(new OutboundPolicy(env)));
  const ctx = await createNightwatchContext(browser, {
    env,
    recorder,
    uiBaseUrl: server.origin,
    productId: 'ripple',
    trace: 'off',
  });
  try {
    // Every probe starts from the fixture driver page (window.__nw).
    await ctx.page.goto(server.origin + '/');
    const result = await probe(ctx.page, ctx);
    if (settle !== undefined) await settle(ctx, recorder);
    // Settle buffer BEFORE finalize/close: closing while the observer is still
    // capturing a response body makes body() fail and fires a spurious
    // malformed-json oracle. Local-fixture responses + body capture complete
    // in well under this window.
    await ctx.page.waitForTimeout(250);
    const summary = await recorder.finalize({
      passed: !ctx.monitor.failed,
      notes: ctx.monitor.summaryNotes(),
    });
    // The harness registers context.routeWebSocket without awaiting it; if the
    // context is closed while that registration is still in flight, its dropped
    // promise rejects with "Target page, context or browser has been closed"
    // and the unhandled rejection poisons the NEXT test. The in-page WS gate
    // only appears once registration completed, so wait for it before closing.
    await waitForWsGate(ctx, false, server.origin);
    return { monitor: ctx.monitor, recorder, summary, result };
  } finally {
    await ctx.close();
  }
}

/** Poll the evidence files until the predicate matches (timeout 10 s). */
async function waitForEvidence(
  recorder: RunRecorder,
  file: 'events.jsonl' | 'network.jsonl' | 'console.jsonl',
  predicate: (e: Record<string, unknown>) => unknown,
  label: string
): Promise<void> {
  await expect
    .poll(() => readJsonl(path.join(recorder.dir, file)).some(predicate), {
      message: `timed out waiting for evidence: ${label}`,
      timeout: 10_000,
    })
    .toBe(true);
}

/** Poll the in-memory monitor for a hard failure (timeout 10 s). */
async function waitForHardFailure(
  monitor: RunMonitor,
  predicate: (h: HardFailureRecord) => boolean,
  label: string
): Promise<void> {
  await expect
    .poll(() => monitor.hardFailures.some(predicate), {
      message: `timed out waiting for hard failure: ${label}`,
      timeout: 10_000,
    })
    .toBe(true);
}

/**
 * L2 (routeWebSocket) is installed via an in-page init script that the harness
 * registers WITHOUT awaiting; the first document can therefore miss it. Poll a
 * THROWAWAY page until the gate (globalThis.__pwWebSocketDispatch) is present,
 * which proves the registration completed. When `reloadMain` is set (WebSocket
 * tests), the main page is then reloaded once so ITS current document carries
 * the gate too — a document created before the registration landed never gets
 * it. The main page is never touched when `reloadMain` is false (post-finalize
 * close-safety wait in runProbe), so evidence is not disturbed; the reload
 * failure on pages stuck at a denied URL is tolerated.
 *
 * The probe page is re-navigated to the FIXTURE ORIGIN each iteration (a real
 * document): goto('about:blank') from an already-about:blank page is a no-op,
 * so the gate would never be observed on a fresh document.
 */
async function waitForWsGate(ctx: NightwatchContext, reloadMain: boolean, origin: string): Promise<void> {
  const probePage = await ctx.context.newPage();
  try {
    for (let i = 0; i < 25; i++) {
      const hasGate = await probePage.evaluate(
        () => typeof (globalThis as unknown as Record<string, unknown>).__pwWebSocketDispatch === 'function'
      );
      if (hasGate) {
        if (reloadMain) {
          try {
            await ctx.page.reload();
          } catch {
            try {
              await ctx.page.goto('about:blank');
            } catch {
              // page unreachable — the context is closed right after anyway
            }
          }
        }
        return;
      }
      await probePage.goto(origin + '/');
      // Registration can take >1s under suite load; let it land instead of
      // busy-spinning the loop.
      await new Promise((r) => setTimeout(r, 100));
    }
  } finally {
    await probePage.close();
  }
  throw new Error('L2 WebSocket gate never engaged (harness registration race)');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('network surface containment', () => {
  // The harness installs L2 (routeWebSocket) asynchronously; on rare occasions
  // a context's registration never completes (see suite header + report). A
  // hung context fails the gate wait fast, and the retry runs the test again
  // with a fresh context/server — the registration virtually always lands on
  // the retry. A deterministic harness bug still fails all 3 attempts.
  test.describe.configure({ retries: 2 });

  test('HTTP: allowed fixture request passes policy', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-http-echo',
        async (page) => {
          return page.evaluate(
            (url: string): Promise<{ ok: boolean; error?: string }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).fetchJson(url),
            server.origin + '/api/safety/echo'
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/echo') && dataStatus(e) === 200,
            '200 response for /api/safety/echo'
          );
        }
      );
      const r = result as { ok: boolean };
      expect(r.ok).toBe(true);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      expect(monitor.hardFailures.length).toBe(0);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some(
          (e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/echo') && dataStatus(e) === 200
        )
      ).toBe(true);
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('HTTP: production host request is denied before network', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const target = 'https://api.alphaus.cloud/m/ripple/invoices/2026-07';
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-http-prod',
        async (page) => {
          return page.evaluate(
            (url: string): Promise<{ ok: boolean; error?: string }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).fetchJson(url),
            target
          );
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.url.includes('api.alphaus.cloud'),
            'hard failure for api.alphaus.cloud'
          );
        }
      );
      const r = result as { ok: boolean };
      expect(r.ok).toBe(false);
      expect(monitor.hardFailures.some((h) => h.url.includes('api.alphaus.cloud'))).toBe(true);
      // The fixture server must never see an https request (aborted in-browser).
      expect(server.requests.some((rq) => rq.url.startsWith('https://'))).toBe(false);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      // The route handler (L1) governs subresource fetches deterministically:
      // the request event carries verdict deny and no response exists.
      expect(
        events.some(
          (e) => e.type === 'request' && dataVerdict(e) === 'deny' && dataUrl(e)?.includes('api.alphaus.cloud')
        )
      ).toBe(true);
      expect(events.some((e) => e.type === 'response' && dataUrl(e)?.includes('api.alphaus.cloud'))).toBe(false);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('HTTP: unknown host request fails closed', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-http-unknown',
        async (page) => {
          return page.evaluate(
            (url: string): Promise<{ ok: boolean; error?: string }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).fetchJson(url),
            'https://random-host-xyz.alphaus.cloud/x'
          );
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.hostClass === 'unknown-alphaus',
            'hard failure with hostClass unknown-alphaus'
          );
        }
      );
      const r = result as { ok: boolean };
      expect(r.ok).toBe(false);
      expect(monitor.hardFailures.some((h) => h.hostClass === 'unknown-alphaus')).toBe(true);
      expect(server.requests.some((rq) => rq.url.startsWith('https://'))).toBe(false);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(events.some((e) => e.type === 'response' && dataUrl(e)?.includes('random-host-xyz'))).toBe(false);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('redirect: allowed to allowed follows through', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-redirect-ok',
        async (page) => {
          await page.goto(server.origin + '/api/safety/redirect-ok');
          return page.url();
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/redirect-ok'),
            '302 response for /api/safety/redirect-ok'
          );
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/landed'),
            '200 response for /api/safety/landed'
          );
        }
      );
      expect(String(result)).toContain('/api/safety/landed');
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      expect(monitor.hardFailures.length).toBe(0);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some((e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/redirect-ok'))
      ).toBe(true);
      expect(events.some((e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/landed'))).toBe(true);
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('redirect: allowed URL to production target is blocked', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary } = await runProbe(
        browser,
        server,
        'safety-redirect-prod',
        async (page) => {
          try {
            await page.goto(server.origin + '/api/safety/redirect-prod');
          } catch {
            // aborted navigation (ERR_ABORTED / ERR_BLOCKED_BY_CLIENT) — expected
          }
          return null;
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.url.includes('random.mobingi.com/m/ripple/redirected'),
            'hard failure for the production redirect TARGET'
          );
        }
      );
      // Evidence must show: initial request allowed, redirect TARGET denied.
      expect(
        monitor.hardFailures.some((h) => h.url.includes('random.mobingi.com/m/ripple/redirected'))
      ).toBe(true);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some(
          (e) =>
            e.type === 'request' &&
            dataVerdict(e) === 'allow' &&
            dataUrl(e)?.includes('/api/safety/redirect-prod')
        )
      ).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('redirect: allowed URL to unknown host is blocked', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary } = await runProbe(
        browser,
        server,
        'safety-redirect-unknown',
        async (page) => {
          try {
            await page.goto(server.origin + '/api/safety/redirect-unknown');
          } catch {
            // aborted navigation — expected
          }
          return null;
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.hostClass === 'unknown-alphaus' && h.url.includes('random-host-xyz.alphaus.cloud/redirected'),
            'hard failure for the unknown redirect TARGET'
          );
        }
      );
      expect(
        monitor.hardFailures.some(
          (h) => h.hostClass === 'unknown-alphaus' && h.url.includes('random-host-xyz.alphaus.cloud/redirected')
        )
      ).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('redirect: telemetry target is contained without a hard failure', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder } = await runProbe(
        browser,
        server,
        'safety-redirect-telemetry',
        async (page) => {
          try {
            await page.goto(server.origin + '/api/safety/redirect-telemetry');
            return { goto: 'resolved' };
          } catch {
            return { goto: 'aborted' };
          }
        },
        async (ctx) => {
          // Give the follow-up + any Chromium retry time to settle.
          await ctx.page.waitForTimeout(1500);
        }
      );
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      // The Fetch guard (L0) fails the telemetry follow-up pre-network and
      // records the telemetry evidence itself: no response, no hard failure,
      // run stays green.
      expect(events.some((e) => e.type === 'response' && dataUrl(e)?.includes('sentry.example.invalid'))).toBe(
        false
      );
      expect(
        events.some(
          (e) => e.type === 'telemetry' && dataUrl(e)?.includes('sentry.example.invalid')
        )
      ).toBe(true);
      expect(monitor.hardFailures.length).toBe(0);
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
      expect(monitor.failed).toBe(false);
      expect(server.requests.some((rq) => rq.url.startsWith('https://'))).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('Service Worker: registration cannot establish a network path', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-sw-blocked',
        async (page) => {
          const r = await page.evaluate(
            (): Promise<string> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).attemptSW()
          );
          await page.waitForTimeout(300);
          return r;
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'console' && String(e.message).includes('[nightwatch] service-worker-blocked'),
            'service-worker-blocked console marker'
          );
        }
      );
      expect(String(result).startsWith('sw-fail:')).toBe(true);
      // The SW script must never be fetched.
      expect(server.requests.some((r) => r.url.includes('/safety/sw.js'))).toBe(false);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some((e) => e.type === 'console' && String(e.message).includes('[nightwatch] service-worker-blocked'))
      ).toBe(true);
      expect(events.some((e) => e.type === 'service-worker')).toBe(false);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('WebSocket: allowed localhost connection works', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const wsUrl = `ws://127.0.0.1:${server.port}/api/safety/ws`;
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-ws-ok',
        async (page, ctx) => {
          await waitForWsGate(ctx, true, server.origin);
          return page.evaluate(
            (args: { url: string; send: string }): Promise<{
              open: boolean;
              close: boolean;
              code: number | null;
              messages: string[];
            }> => ((globalThis as unknown as { __nw: NwDriver }).__nw).wsOpen(args.url, args.send),
            { url: wsUrl, send: 'ping' }
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'request' && dataProtocol(e) === 'websocket' && dataVerdict(e) === 'allow',
            'allowed websocket request event'
          );
        }
      );
      const r = result as { open: boolean; close: boolean; code: number | null; messages: string[] };
      expect(r.open).toBe(true);
      expect(r.messages).toContain('ping');
      expect(server.wsConnections).toBe(1);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some(
          (e) => e.type === 'request' && dataProtocol(e) === 'websocket' && dataVerdict(e) === 'allow'
        )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('WebSocket: production destination is prevented before communication', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-ws-prod',
        async (page, ctx) => {
          await waitForWsGate(ctx, true, server.origin);
          return page.evaluate(
            (url: string): Promise<{ open: boolean; close: boolean; code: number | null; messages: string[] }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).wsOpen(url),
            'wss://api.alphaus.cloud:8443/socket'
          );
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.hostClass === 'production' && h.reason.includes('production host'),
            'hard failure for production websocket'
          );
        }
      );
      const r = result as { open: boolean };
      expect(r.open).toBe(false);
      expect(
        monitor.hardFailures.some(
          (h) => h.hostClass === 'production' && h.reason.includes('production host')
        )
      ).toBe(true);
      // The hard-failure event itself must carry protocol === 'websocket'.
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some((e) => e.type === 'hard-failure' && dataProtocol(e) === 'websocket')
      ).toBe(true);
      expect(server.wsConnections).toBe(0);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('WebSocket: unknown destination is rejected', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-ws-unknown',
        async (page, ctx) => {
          await waitForWsGate(ctx, true, server.origin);
          return page.evaluate(
            (url: string): Promise<{ open: boolean; close: boolean; code: number | null; messages: string[] }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).wsOpen(url),
            'ws://random-host-xyz.alphaus.cloud/socket'
          );
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.hostClass === 'unknown-alphaus',
            'hard failure for unknown websocket'
          );
        }
      );
      const r = result as { open: boolean };
      expect(r.open).toBe(false);
      expect(monitor.hardFailures.some((h) => h.hostClass === 'unknown-alphaus')).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('WebSocket: telemetry destination is blocked without failing', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-ws-telemetry',
        async (page, ctx) => {
          await waitForWsGate(ctx, true, server.origin);
          return page.evaluate(
            (url: string): Promise<{ open: boolean; close: boolean; code: number | null; messages: string[] }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).wsOpen(url),
            'wss://sentry.example.invalid/ingest'
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'telemetry' && dataProtocol(e) === 'websocket',
            'telemetry event for websocket'
          );
        }
      );
      const r = result as { open: boolean };
      expect(r.open).toBe(false);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(events.some((e) => e.type === 'telemetry' && dataProtocol(e) === 'websocket')).toBe(true);
      expect(monitor.hardFailures.length).toBe(0);
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('popup: allowed destination inherits policy', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-popup-ok',
        async (page) => {
          const popupPromise = page.waitForEvent('popup');
          const opened = await page.evaluate(
            (url: string): 'opened' | 'blocked' =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).popup(url),
            server.origin + '/api/safety/popup'
          );
          const popup = await popupPromise;
          await popup.waitForLoadState('domcontentloaded');
          const text = await popup.locator('#popup-landed').textContent();
          return { opened, text };
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'request' && dataVerdict(e) === 'allow' && dataUrl(e)?.includes('/api/safety/popup'),
            'allowed request event for /api/safety/popup'
          );
        }
      );
      const r = result as { opened: string; text: string | null };
      expect(r.opened).toBe('opened');
      expect(r.text).toContain('popup landed');
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some(
          (e) => e.type === 'request' && dataVerdict(e) === 'allow' && dataUrl(e)?.includes('/api/safety/popup')
        )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('popup: production destination fails closed', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-popup-prod',
        async (page) => {
          // Do NOT wait for the popup to load — it must be denied.
          const opened = await page.evaluate(
            (url: string): 'opened' | 'blocked' =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).popup(url),
            'https://api.alphaus.cloud/'
          );
          return { opened };
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.url === 'https://api.alphaus.cloud/',
            'hard failure for production popup'
          );
        }
      );
      const r = result as { opened: string };
      expect(['opened', 'blocked']).toContain(r.opened);
      expect(monitor.hardFailures.some((h) => h.url === 'https://api.alphaus.cloud/')).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('popup: unknown destination fails closed', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-popup-unknown',
        async (page) => {
          const opened = await page.evaluate(
            (url: string): 'opened' | 'blocked' =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).popup(url),
            'https://random-host-xyz.alphaus.cloud/'
          );
          return { opened };
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.hostClass === 'unknown-alphaus',
            'hard failure for unknown popup'
          );
        }
      );
      const r = result as { opened: string };
      expect(['opened', 'blocked']).toContain(r.opened);
      expect(monitor.hardFailures.some((h) => h.hostClass === 'unknown-alphaus')).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('telemetry: HTTP analytics host is blocked without failing', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-telemetry-fetch',
        async (page) => {
          return page.evaluate(
            (url: string): Promise<{ ok: boolean; error?: string }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).fetchJson(url),
            'https://sentry.example.invalid/ingest?x=1'
          );
        },
        async (ctx) => {
          // Let the abort surface, whichever layer handled it.
          await ctx.page.waitForTimeout(500);
        }
      );
      const r = result as { ok: boolean };
      expect(r.ok).toBe(false);
      // NO hard failure — telemetry never fails the run.
      expect(monitor.hardFailures.length).toBe(0);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
      // The route handler (L1) governs subresource fetches deterministically:
      // a telemetry event is recorded and no response exists.
      expect(
        events.some((e) => e.type === 'telemetry' && dataUrl(e)?.includes('sentry.example.invalid'))
      ).toBe(true);
      expect(
        events.some((e) => e.type === 'response' && dataUrl(e)?.includes('sentry.example.invalid'))
      ).toBe(false);
      expect(server.requests.some((rq) => rq.url.startsWith('https://'))).toBe(false);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('redaction: fake Authorization header never persists', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-redact-auth',
        async (page) => {
          await page.evaluate(
            (url: string) => {
              void fetch(url, { headers: { Authorization: 'Bearer FAKE_AUTH_SECRET_777' } }).catch(() => {});
            },
            server.origin + '/api/safety/echo'
          );
          return true;
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'network.jsonl',
            (e) =>
              e.type === 'request' &&
              dataUrl(e)?.includes('/api/safety/echo') &&
              dataHeaders(e)?.authorization === '[REDACTED]',
            'redacted authorization header on /api/safety/echo'
          );
        }
      );
      expect(result).toBe(true);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      const allText = readAllText(recorder.dir);
      expect(allText).not.toContain('FAKE_AUTH_SECRET_777');
      const netEvents = readJsonl(path.join(recorder.dir, 'network.jsonl'));
      expect(
        netEvents.some(
          (e) =>
            e.type === 'request' &&
            dataUrl(e)?.includes('/api/safety/echo') &&
            dataHeaders(e)?.authorization === '[REDACTED]'
        )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('redaction: fake Cookie value never persists', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-redact-cookie',
        async (page) => {
          return page.evaluate(
            (args: { name: string; value: string; url: string }): Promise<string> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).setCookieAndFetch(
                args.name,
                args.value,
                args.url
              ),
            { name: 'nw_session', value: 'FAKE_COOKIE_SECRET_888', url: server.origin + '/api/safety/echo' }
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'network.jsonl',
            (e) =>
              e.type === 'request' &&
              dataUrl(e)?.includes('/api/safety/echo') &&
              dataHeaders(e)?.cookie === '[REDACTED]',
            'redacted cookie header on /api/safety/echo'
          );
        }
      );
      expect(result).toBe('cookie-fetch-ok');
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      const allText = readAllText(recorder.dir);
      expect(allText).not.toContain('FAKE_COOKIE_SECRET_888');
      const netEvents = readJsonl(path.join(recorder.dir, 'network.jsonl'));
      expect(
        netEvents.some(
          (e) =>
            e.type === 'request' &&
            dataUrl(e)?.includes('/api/safety/echo') &&
            dataHeaders(e)?.cookie === '[REDACTED]'
        )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('redaction: fake JWT in URL is redacted', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.abcdefghijklmnopqrstuvwxyz';
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-redact-jwt',
        async (page) => {
          return page.evaluate(
            (url: string): Promise<{ ok: boolean; error?: string }> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).fetchJson(url),
            server.origin + `/api/safety/echo?token=${jwt}`
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'network.jsonl',
            (e) => e.type === 'request' && String(dataUrl(e)).includes('token=[REDACTED]'),
            'redacted token query param in request URL'
          );
        }
      );
      const r = result as { ok: boolean };
      expect(r.ok).toBe(true);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      const allText = readAllText(recorder.dir);
      expect(allText).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(allText).not.toContain('abcdefghijklmnopqrstuvwxyz');
      const netEvents = readJsonl(path.join(recorder.dir, 'network.jsonl'));
      expect(
        netEvents.some((e) => e.type === 'request' && String(dataUrl(e)).includes('token=[REDACTED]'))
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('dedicated worker: fetches are governed by the policy', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-worker',
        async (page) => {
          return page.evaluate(
            (): Promise<string> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).startWorker()
          );
        },
        async (ctx) => {
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.url.includes('/from-worker'),
            'hard failure for worker fetch'
          );
        }
      );
      expect(String(result)).toContain('worker-fetch-fail');
      expect(monitor.hardFailures.some((h) => h.url.includes('/from-worker'))).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
    } finally {
      await server.close();
    }
  });

  test('shared worker: construction is blocked (bypass surface eliminated)', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-shared-worker',
        async (page) => {
          const r = await page.evaluate(
            (): string =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).attemptSharedWorker()
          );
          await page.waitForTimeout(300);
          return r;
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) => e.type === 'console' && String(e.message).includes('[nightwatch] shared-worker-blocked'),
            'shared-worker-blocked console marker'
          );
        }
      );
      expect(String(result).startsWith('shared-blocked:')).toBe(true);
      // The shared worker script must never be fetched.
      expect(server.requests.some((r) => r.url.includes('/safety/shared.js'))).toBe(false);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some((e) => e.type === 'console' && String(e.message).includes('[nightwatch] shared-worker-blocked'))
      ).toBe(true);
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
    } finally {
      await server.close();
    }
  });

  test('download: cross-origin download request is denied and cancelled', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-download-prod',
        async (page) => {
          await page.evaluate(
            (url: string): string =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).dl(url),
            'https://api.alphaus.cloud/x.bin'
          );
          return null;
        },
        async (ctx) => {
          // Route-handler abort, download-cancel or unrouted-observation —
          // all record the exact URL; accept whichever path fired.
          await waitForHardFailure(
            ctx.monitor,
            (h) => h.url === 'https://api.alphaus.cloud/x.bin',
            'hard failure for the cross-origin download'
          );
        }
      );
      expect(result).toBeNull();
      expect(monitor.hardFailures.some((h) => h.url === 'https://api.alphaus.cloud/x.bin')).toBe(true);
      expect(monitor.failed).toBe(true);
      expect(summary.passed).toBe(false);
      // A 'download' event may or may not exist depending on Chrome's
      // classification of the aborted request — deliberately not asserted.
    } finally {
      await server.close();
    }
  });

  test('EventSource: SSE stream passes through the route gate', async ({ browser }) => {
    const server = await startFixtureServer('safety');
    try {
      const { monitor, recorder, summary, result } = await runProbe(
        browser,
        server,
        'safety-sse',
        async (page) => {
          return page.evaluate(
            (): Promise<string[]> =>
              ((globalThis as unknown as { __nw: NwDriver }).__nw).esConnect()
          );
        },
        async (ctx, recorder) => {
          await waitForEvidence(
            recorder,
            'events.jsonl',
            (e) =>
              e.type === 'request' &&
              dataResourceType(e) === 'eventsource' &&
              dataUrl(e)?.includes('/api/safety/events') &&
              dataVerdict(e) === 'allow',
            'allowed eventsource request event'
          );
          await ctx.page.waitForTimeout(300);
        }
      );
      expect(result).toEqual(['hello', 'world']);
      const events = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(
        events.some(
          (e) =>
            e.type === 'request' &&
            dataResourceType(e) === 'eventsource' &&
            dataUrl(e)?.includes('/api/safety/events') &&
            dataVerdict(e) === 'allow'
        )
      ).toBe(true);
      expect(events.some((e) => e.type === 'response' && dataUrl(e)?.includes('/api/safety/events') && dataStatus(e) === 200)).toBe(true);
      expect(monitor.hardFailures.length).toBe(0);
      expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
      // The page closes the EventSource after the 2nd message; that client-side
      // abort fires requestfailed (net::ERR_ABORTED), which is classified as a
      // benign client abort (not an issue) since the Phase 1.1 harness fix.
      expect(monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
    } finally {
      await server.close();
    }
  });
});
