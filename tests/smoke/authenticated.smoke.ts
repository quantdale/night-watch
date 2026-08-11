// ---------------------------------------------------------------------------
// Nightwatch — authenticated storage-state regression suite (Phase 1.1).
//
// A Playwright storage-state file is SECRET MATERIAL. These tests prove that
// synthetic auth secrets placed in a storage state (cookie value + localStorage
// JWT) NEVER appear in run artifacts, that Playwright tracing is forced OFF for
// authenticated runs even when trace:'on' is requested, and that unusable
// storage-state inputs fail closed at startup.
//
// HARNESS BEHAVIOR NOTE (verified empirically 2026-08-09): createNightwatchContext
// passes an EXPLICIT storageStatePath to Playwright without running it through
// validateStorageStateFile (src/browser/context.ts:161) — location and shape
// validation is only applied on the NIGHTWATCH_STORAGE_STATE env-var path
// (resolveStorageStatePath). A missing file still aborts startup (Playwright's
// own "Error reading storage state from ..." error), but a misplaced or
// malformed-shaped file is currently ACCEPTED at the context level. This suite
// therefore asserts the validator-level gate (validateStorageStateFile) for
// those two cases and documents the context-level gap. HARNESS GAP — reported.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runCanary, assertCanary } from '../../src/core/safety/canary';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import type { FixtureServerHandle } from '../../src/browser/fixtures/fixtureServer';
import { createNightwatchContext } from '../../src/browser/context';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import type { EnvironmentConfig } from '../../src/core/environment/types';

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

function readJsonl(file: string): Array<Record<string, unknown>> {
  const text = fs.readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

/**
 * The harness registers context.routeWebSocket without awaiting it. The gate
 * (globalThis.__pwWebSocketDispatch) only appears in documents created after
 * that registration completed; poll a throwaway probe page until it does, so
 * the context can be closed without the dropped promise rejecting and
 * poisoning the next test. The main page is never reloaded.
 */
async function waitForWsGate(
  ctx: import('../../src/browser/context').NightwatchContext,
  reloadMain: boolean,
  origin: string
): Promise<void> {
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

test.describe('authenticated storage state is secret material', () => {
  // Same rationale as safety.smoke.ts: the harness's unawaited routeWebSocket
  // registration occasionally never completes; retry with a fresh context.
  test.describe.configure({ retries: 2 });

  test('synthetic auth secrets never enter artifacts; traces stay disabled', async ({ browser }) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-'));
    const stateFile = path.join(tmp, 'state.json');
    // Synthetic secret material — MUST never appear in any run artifact.
    fs.writeFileSync(
      stateFile,
      JSON.stringify({
        cookies: [
          { name: 'nw_session', value: 'FAKE_SESSION_COOKIE_SECRET_999', domain: '127.0.0.1', path: '/' },
        ],
        origins: [
          {
            origin: 'http://127.0.0.1',
            localStorage: [{ name: 'access_token', value: 'FAKE_LOCALSTORAGE_JWT_000' }],
          },
        ],
      })
    );

    const server = await startFixtureServer('good');
    try {
      const env = buildEnv(server);
      const runId = `auth-${Date.now()}`;
      const recorder = new RunRecorder({
        runId,
        environment: 'local',
        product: 'ripple',
        browser: 'chromium',
        scenario: 'auth-smoke',
      });
      recorder.event({ type: 'start', severity: 'info', message: 'authenticated smoke run' });
      assertCanary(runCanary(new OutboundPolicy(env)));

      // trace:'on' is requested, but the harness MUST force traces off for
      // authenticated runs (traces can embed cookies/headers unredacted).
      const ctx = await createNightwatchContext(browser, {
        env,
        recorder,
        uiBaseUrl: server.origin,
        storageStatePath: stateFile,
        trace: 'on',
        // The good fixture intentionally emits one console.error; this test
        // isolates authenticated evidence privacy, while real Phase 2A runs
        // retain the environment's console-error oracle in failOn.
        failOn: env.failOn.filter((issue) => issue !== 'console-error'),
      });
      // The good page fetches /api/invoices etc.; its cookies (incl. nw_session)
      // are sent on every same-origin request and must be redacted.
      await ctx.page.goto(server.origin + '/');
      await ctx.page.waitForTimeout(1500);
      const summary = await recorder.finalize({
        passed: !ctx.monitor.failed,
        notes: ctx.monitor.summaryNotes(),
      });
      // Let the harness's unawaited routeWebSocket registration settle before
      // closing (see waitForWsGate) — otherwise its dropped promise rejects
      // on close and poisons the next test.
      await waitForWsGate(ctx, false, server.origin);
      await ctx.close();

      // -- Run state ---------------------------------------------------------
      // The good page's telemetry fetch is blocked (telemetry) without failing
      // the run; no other violation occurs in this fixture (Phase 1.1 fixes:
      // no CDP preemption race, client aborts classified benign).
      expect(ctx.monitor.hardFailures.length).toBe(0);
      expect(ctx.monitor.failed).toBe(false);
      expect(summary.passed).toBe(true);
      expect(summary.proxy).toBeDefined();
      expect(summary.proxy?.allowed).toBeGreaterThan(0);
      expect(summary.proxy?.violations).toBe(0);
      const allEvents = readJsonl(path.join(recorder.dir, 'events.jsonl'));
      expect(allEvents.some((e) => e.type === 'hard-failure')).toBe(false);

      // -- Tracing forced off -------------------------------------------------
      expect(fs.existsSync(path.join(recorder.dir, 'trace.zip'))).toBe(false);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(recorder.dir, 'manifest.json'), 'utf8')
      ) as Record<string, unknown>;
      const traceEntry = manifest.trace as Record<string, unknown>;
      expect(traceEntry.enabled).toBe(false);
      expect(String(traceEntry.reason)).toContain('cannot be sanitized');
      expect(manifest.networkContainment).toEqual(expect.objectContaining({
        proxyEnabled: true,
        browserGuardsEnabled: true,
      }));

      expect(
        allEvents.some((e) => e.type === 'env' && String(e.message).includes('authenticated run: Playwright tracing forced OFF'))
      ).toBe(true);

      // -- Secrets never persist ---------------------------------------------
      const allText = allTextFiles(recorder.dir)
        .map((f) => fs.readFileSync(f, 'utf8'))
        .join('\n');
      expect(allText).not.toContain('FAKE_SESSION_COOKIE_SECRET_999');
      expect(allText).not.toContain('FAKE_LOCALSTORAGE_JWT_000');

      // -- Authenticated wire metadata is header-free -------------------------
      const netEvents = readJsonl(path.join(recorder.dir, 'network.jsonl'));
      const invoicesReq = netEvents.find((e) => {
        const d = e.data as Record<string, unknown> | undefined;
        if (e.type !== 'request' || typeof d?.url !== 'string' || !d.url.includes('/api/invoices')) {
          return false;
        }
        return !('headers' in d) && !('body' in d);
      });
      expect(invoicesReq).toBeDefined();

      // -- Authenticated mode never reads response bodies into memory ---------
      // The good fixture returns JSON-ish /api/invoices responses; in
      // authenticated metadata-first mode the harness must short-circuit body
      // capture entirely (bodyCapture stays "unavailable"), not merely redact it.
      const invoicesResp = netEvents.find((e) => {
        const d = e.data as Record<string, unknown> | undefined;
        return e.type === 'response' &&
          typeof d?.url === 'string' && d.url.includes('/api/invoices');
      });
      expect(invoicesResp).toBeDefined();
      expect((invoicesResp?.data as Record<string, unknown> | undefined)?.bodyCapture).toBe('unavailable');
      expect('body' in (invoicesResp?.data as Record<string, unknown> | undefined ?? {})).toBe(false);
    } finally {
      await server.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('missing or misplaced storage state fails closed at startup', async ({ browser }) => {
    const server = await startFixtureServer('good');
    const tmpMissing = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-state-missing-'));
    const tmpBadShape = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-state-badshape-'));
    const insideRepo = path.join(__dirname, '..', '..', '.tmp-test', 'evil-state.json');
    try {
      const env = buildEnv(server);
      const recorder = new RunRecorder({
        runId: `auth-startup-${Date.now()}`,
        environment: 'local',
        product: 'ripple',
        browser: 'chromium',
        scenario: 'auth-startup',
      });

      // (a) Nonexistent file — the harness validates and fails closed with
      //     the validator's message (B3 fix: explicit paths go through
      //     validateStorageStateFile).
      const missing = path.join(tmpMissing, 'does-not-exist.json');
      await expect(
        createNightwatchContext(browser, {
          env,
          recorder,
          uiBaseUrl: server.origin,
          storageStatePath: missing,
          trace: 'off',
        })
      ).rejects.toThrow(/missing file/);

      // (b) Valid-shaped state INSIDE the repo — context creation MUST fail
      //     closed (B3 fix: explicit paths are validated like env-var paths).
      fs.mkdirSync(path.dirname(insideRepo), { recursive: true });
      fs.writeFileSync(insideRepo, JSON.stringify({ cookies: [], origins: [] }));
      expect(() => validateStorageStateFile(insideRepo)).toThrow(/must NOT live inside/);
      await expect(
        createNightwatchContext(browser, {
          env,
          recorder,
          uiBaseUrl: server.origin,
          storageStatePath: insideRepo,
          trace: 'off',
        })
      ).rejects.toThrow(/must NOT live inside/);

      // (c) Malformed shape ({}) in a user-owned location — context creation
      //     MUST fail closed.
      const badShape = path.join(tmpBadShape, 'bad.json');
      fs.writeFileSync(badShape, '{}');
      expect(() => validateStorageStateFile(badShape)).toThrow(/storage-state shape/);
      await expect(
        createNightwatchContext(browser, {
          env,
          recorder,
          uiBaseUrl: server.origin,
          storageStatePath: badShape,
          trace: 'off',
        })
      ).rejects.toThrow(/storage-state shape/);
    } finally {
      await server.close();
      fs.rmSync(tmpMissing, { recursive: true, force: true });
      fs.rmSync(tmpBadShape, { recursive: true, force: true });
      if (fs.existsSync(insideRepo)) fs.rmSync(insideRepo, { force: true });
    }
  });
});
