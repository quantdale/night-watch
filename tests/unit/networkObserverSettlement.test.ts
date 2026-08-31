// Network-observer settlement regression. This fixture is local-only: the
// hanging resource proves that passive page traffic cannot block a journey
// whose source-reviewed known-read requests have settled.

import { expect, test } from '@playwright/test';
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
      if (method === 'GET' && new URL(rawUrl).pathname === '/known-read') {
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
    observer.beginJourneyIntent('fixture-read', 'CLICK_READ_ONLY_CONTROL');
    await page.evaluate((target) => { void fetch(`${target}/known-read`); }, fixture.origin);
    await expect.poll(() => observer.activeJourneyRequests?.() ?? -1, { timeout: 2_000 }).toBe(1);
  } finally {
    observer.endJourneyIntent('fixture-navigation');
    await context.close();
    await fixture.close();
  }
});
