// ---------------------------------------------------------------------------
// Nightwatch — negative fixture smoke test.
//
// Runs the same harness against the 'negative' fixture: a production-host
// fetch must be blocked by policy BEFORE any network I/O (hard failure, no
// response event, nothing on the fixture server), while console/page errors
// and a malformed-JSON body are flagged by the observers/oracles.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runCanary, assertCanary } from '../../src/core/safety/canary';
import { startFixtureServer, type FixtureServerHandle } from '../../src/browser/fixtures/fixtureServer';
import { createNightwatchContext } from '../../src/browser/context';
import { runPassiveJourney } from '../../src/products/ripple/journeys';
import type { EnvironmentConfig } from '../../src/core/environment/types';

function readEvents(file: string): Array<Record<string, unknown>> {
  const text = fs.readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

test('policy blocks production hosts; oracles flag page problems', async ({ browser }) => {
  const server: FixtureServerHandle = await startFixtureServer('negative');
  try {
    const env: EnvironmentConfig = {
      name: 'local',
      label: 'smoke fixture',
      uiBaseUrl: server.origin,
      allowedHosts: ['127.0.0.1', 'localhost'],
      staticAssetHosts: [],
      telemetryHosts: ['sentry.example.invalid'],
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

    const runId = `smoke-negative-${Date.now()}`;
    const recorder = new RunRecorder({
      runId,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'smoke-negative',
      nightwatchSha: null,
    });

    const policy = new OutboundPolicy(env);
    assertCanary(runCanary(policy));

    recorder.event({ type: 'start', severity: 'info', message: 'smoke negative run start' });
    await recorder.writeRepositories([]);

    const ctx = await createNightwatchContext(browser, { env, recorder, uiBaseUrl: server.origin });
    await runPassiveJourney(
      ctx.page,
      { recorder, monitor: ctx.monitor, network: ctx.network },
      { uiBaseUrl: server.origin }
    );
    await recorder.captureScreenshot(ctx.page, 'dashboard');
    const summary = await recorder.finalize({ passed: !ctx.monitor.failed });
    await ctx.close();

    // -- Run-level state -----------------------------------------------------
    expect(ctx.monitor.failed).toBe(true);
    expect(summary.passed).toBe(false);

    // -- Hard failure: production host denied --------------------------------
    expect(ctx.monitor.hardFailures.length).toBeGreaterThan(0);
    const hf = ctx.monitor.hardFailures.find(
      (h) => h.hostClass === 'production' && h.url.includes('api.alphaus.cloud')
    );
    expect(hf).toBeDefined();

    // -- events.jsonl --------------------------------------------------------
    const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
    const dataOf = (e: Record<string, unknown>): Record<string, unknown> | undefined => e.data as Record<string, unknown> | undefined;
    const urlOf = (e: Record<string, unknown>): unknown => dataOf(e)?.url;

    expect(events.some((e) => e.type === 'hard-failure' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('api.alphaus.cloud'))).toBe(true);
    expect(events.some((e) => e.type === 'pageerror' && typeof e.message === 'string' && String(e.message).includes('fixture page error'))).toBe(true);
    expect(events.some((e) => e.type === 'console' && e.severity === 'error' && typeof e.message === 'string' && String(e.message).includes('fixture console error'))).toBe(true);
    // Oracle issue events carry the semantic check name in data.reason.
    expect(events.some((e) => dataOf(e)?.reason === 'malformed-json')).toBe(true);

    // The denied request is still recorded as a 'request' event, verdict deny.
    expect(events.some((e) => e.type === 'request' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('api.alphaus.cloud') && dataOf(e)?.verdict === 'deny')).toBe(true);

    // -- network.jsonl: the denied request never produced a response ---------
    const netEvents = readEvents(path.join(recorder.dir, 'network.jsonl'));
    expect(netEvents.some((e) => e.type === 'response' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('api.alphaus.cloud'))).toBe(false);

    // -- The fixture server never saw the https fetches (aborted pre-network) -
    expect(server.requests.some((r) => r.url.startsWith('https://'))).toBe(false);
  } finally {
    await server.close();
  }
});
