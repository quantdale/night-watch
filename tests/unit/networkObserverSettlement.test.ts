// Network-observer settlement regression. This fixture is local-only: the
// hanging resource proves that passive page traffic cannot block a journey
// whose source-reviewed known-read requests have settled.

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { RunMonitor } from '../../src/state/run';
import { createNetworkObserver } from '../../src/browser/observers/networkObserver';
import type { EnvironmentConfig } from '../../src/core/environment/types';

function fixtureEnvironment(origin: string): EnvironmentConfig {
  const host = new URL(origin).host;
  return {
    name: 'local',
    label: 'network observer settlement fixture',
    uiBaseUrl: origin,
    apiHosts: [host],
    authHosts: [],
    allowedHosts: [host, 'localhost'],
    staticAssetHosts: [],
    telemetryHosts: [],
    optionalThirdPartySupportHosts: [],
    browserBackgroundHosts: [],
    failOn: [],
  };
}

async function startFixtureServer(): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    if (req.url === '/hanging-script.js' || req.url === '/known-read') {
      // Deliberately never send response headers. The async script request is
      // passive page traffic, while /known-read is a source-reviewed request
      // used to prove the intentional-read counter remains meaningful. Both
      // are closed by the browser context teardown.
      return;
    }
    if (req.url === '/truncated-json') {
      // The declared length is intentionally larger than the bytes sent. The
      // browser reports a response, but its body lifecycle ends as a capture
      // failure rather than a trustworthy JSON observation.
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': '999' });
      res.write('{"ok":true}');
      setTimeout(() => res.destroy(), 25);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><head><script async src="/hanging-script.js"></script></head><body>fixture</body></html>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('fixture server did not expose a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function responseCaptureCodes(recorder: RunRecorder): string[] {
  try {
    return fs.readFileSync(`${recorder.dir}/events.jsonl`, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { type?: string; data?: { captureFailureCode?: unknown } })
      .filter((event) => event.type === 'response' && typeof event.data?.captureFailureCode === 'string')
      .map((event) => event.data!.captureFailureCode as string);
  } catch {
    return [];
  }
}

test('passive hanging subresources do not hold active journey settlement open', async ({ browser }) => {
  const fixture = await startFixtureServer();
  const env = fixtureEnvironment(fixture.origin);
  const recorder = new RunRecorder({
    runId: `network-settlement-${Date.now()}`,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'passive-hanging-subresource',
  });
  const monitor = new RunMonitor(env.failOn);
  const observer = createNetworkObserver({
    policy: new OutboundPolicy(env),
    recorder,
    monitor,
    endpointMatcher: (rawUrl, method) => {
      if (method === 'GET' && ['/known-read', '/truncated-json'].includes(new URL(rawUrl).pathname)) {
        return { ruleId: 'fixture.known-read', classification: 'KNOWN_READ' };
      }
      return null;
    },
  });
  const context = await browser.newContext();
  await observer.install(context);
  const page = await context.newPage();
  try {
    observer.beginJourneyIntent('fixture-navigation', 'NAVIGATE_APPROVED_ROUTE');
    await page.goto(fixture.origin, { waitUntil: 'domcontentloaded', timeout: 5_000 });
    await page.waitForTimeout(250);
    await expect.poll(() => observer.activeRequests(), { timeout: 2_000 }).toBeGreaterThan(0);
    await expect.poll(() => observer.activeJourneyRequests?.() ?? -1, { timeout: 2_000 }).toBe(0);

    observer.endJourneyIntent('fixture-navigation');
    await page.evaluate((target) => fetch(`${target}/truncated-json`).catch(() => undefined), fixture.origin);
    await expect.poll(() => responseCaptureCodes(recorder), { timeout: 8_000 }).toEqual(['BODY_READ_TIMEOUT']);
    expect(observer.captureStatus?.()).toBe('UNKNOWN');
    expect(observer.captureFailureCodes?.()).toEqual([]);

    observer.beginJourneyIntent('fixture-read', 'CLICK_READ_ONLY_CONTROL');
    await page.evaluate((target) => { void fetch(`${target}/known-read`); }, fixture.origin);
    await expect.poll(() => observer.activeJourneyRequests?.() ?? -1, { timeout: 2_000 }).toBe(1);
    observer.endJourneyIntent('fixture-read');
    observer.beginJourneyIntent('fixture-read-timeout', 'CLICK_READ_ONLY_CONTROL');
    await page.evaluate((target) => fetch(`${target}/truncated-json`).catch(() => undefined), fixture.origin);
    await expect.poll(() => ({
      status: observer.captureStatus?.() ?? 'UNKNOWN',
      codes: observer.captureFailureCodes?.() ?? [],
      responseCodes: responseCaptureCodes(recorder),
    }), { timeout: 8_000 }).toEqual({
      status: 'INCOMPLETE',
      codes: ['BODY_READ_TIMEOUT'],
      responseCodes: ['BODY_READ_TIMEOUT', 'BODY_READ_TIMEOUT'],
    });
    observer.endJourneyIntent('fixture-read-timeout');
  } finally {
    observer.endJourneyIntent('fixture-navigation');
    await context.close();
    await fixture.close();
  }
});
