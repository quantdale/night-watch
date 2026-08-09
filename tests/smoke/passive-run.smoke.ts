// ---------------------------------------------------------------------------
// Nightwatch — passive fixture smoke test.
//
// Runs the full harness (canary → recorder → context → passive journey →
// evidence finalization) against the 'good' fixture app and asserts the
// evidence contract: no failures, complete artifact set, full redaction of
// the fake Authorization secret, telemetry blocked without failing.
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

/** Recursively collect all file paths under a directory. */
function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(abs));
    else out.push(abs);
  }
  return out;
}

function readEvents(file: string): Array<Record<string, unknown>> {
  const text = fs.readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

test('passive fixture run produces complete redacted evidence', async ({ browser }) => {
  const server: FixtureServerHandle = await startFixtureServer('good');
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

    const runId = `smoke-passive-${Date.now()}`;
    const recorder = new RunRecorder({
      runId,
      environment: 'local',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'smoke-passive',
      nightwatchSha: null,
    });

    const policy = new OutboundPolicy(env);
    assertCanary(runCanary(policy));

    recorder.event({ type: 'start', severity: 'info', message: 'smoke passive run start' });
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
    expect(ctx.monitor.failed).toBe(false);
    expect(summary.passed).toBe(true);
    expect(summary.hardFailures).toEqual([]);

    // -- Artifact set --------------------------------------------------------
    const expectedFiles = [
      'manifest.json',
      'events.jsonl',
      'network.jsonl',
      'console.jsonl',
      'repositories.json',
      'summary.json',
      'trace.zip',
      path.join('screenshots', 'dashboard.png'),
    ];
    for (const f of expectedFiles) {
      expect(fs.existsSync(path.join(recorder.dir, f)), `missing artifact ${f}`).toBe(true);
    }

    // -- Manifest fields -----------------------------------------------------
    const manifest = JSON.parse(fs.readFileSync(path.join(recorder.dir, 'manifest.json'), 'utf8')) as Record<string, string>;
    expect(manifest.runId).toBe(runId);
    expect(manifest.timestamp).toBeTruthy();
    expect(manifest.environment).toBe('local');
    expect(manifest.product).toBe('ripple');
    expect(manifest.browser).toBe('chromium');
    expect(manifest.scenario).toBe('smoke-passive');

    // -- Redaction: no secret anywhere in text artifacts ---------------------
    for (const f of collectFiles(recorder.dir)) {
      if (f.endsWith('trace.zip')) continue; // binary
      const text = fs.readFileSync(f, 'utf8');
      expect(text, `secret leaked in ${path.relative(recorder.dir, f)}`).not.toContain('FAKE_SECRET_TOKEN_12345');
      expect(text, `bearer prefix leaked in ${path.relative(recorder.dir, f)}`).not.toContain('Bearer FAKE_SECRET');
    }

    // -- network.jsonl -------------------------------------------------------
    const netEvents = readEvents(path.join(recorder.dir, 'network.jsonl'));
    const authReq = netEvents.find((e) => {
      const d = e.data as Record<string, unknown> | undefined;
      if (e.type !== 'request' || typeof d?.url !== 'string' || !d.url.includes('/api/invoices')) return false;
      const headers = d.headers as Record<string, unknown> | undefined;
      return headers?.authorization === '[REDACTED]';
    });
    expect(authReq).toBeDefined();

    // -- events.jsonl --------------------------------------------------------
    const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
    const urlOf = (e: Record<string, unknown>): unknown => {
      const d = e.data as Record<string, unknown> | undefined;
      return d?.url;
    };
    expect(events.some((e) => e.type === 'telemetry' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('sentry.example.invalid'))).toBe(true);
    expect(events.some((e) => e.type === 'hard-failure')).toBe(false);
    expect(events.some((e) => e.type === 'request' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('/api/stream'))).toBe(true);
    expect(events.some((e) => e.type === 'request' && typeof urlOf(e) === 'string' && String(urlOf(e)).includes('/assets/logo.png'))).toBe(true);
    expect(events.some((e) => e.type === 'response' && (e.data as Record<string, unknown>)?.status === 200)).toBe(true);

    // -- summary -------------------------------------------------------------
    const summaryOnDisk = JSON.parse(fs.readFileSync(path.join(recorder.dir, 'summary.json'), 'utf8')) as Record<string, unknown>;
    const counts = summaryOnDisk.counts as Record<string, number>;
    expect(counts['request'] ?? 0).toBeGreaterThanOrEqual(5);

    // -- trace ---------------------------------------------------------------
    const traceStat = fs.statSync(path.join(recorder.dir, 'trace.zip'));
    expect(traceStat.size).toBeGreaterThan(0);
  } finally {
    await server.close();
  }
});
