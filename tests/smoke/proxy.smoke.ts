// ---------------------------------------------------------------------------
// Nightwatch Phase 1.2 — independent outer-gate browser tests.
//
// Direct contexts intentionally do not install Nightwatch's in-browser
// guards. They prove Chromium cannot reach the denied local sink even when a
// browser-layer guard is absent or late. The final test uses the normal
// Nightwatch context to prove defense in depth.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { readProxyEvents } from '../../src/proxy/events';
import { readProxyRuntimeState } from '../../src/proxy/runtime';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { createNightwatchContext } from '../../src/browser/context';
import type { EnvironmentConfig } from '../../src/core/environment/types';

interface ContainmentServer {
  host: '127.0.0.1' | '127.0.0.2';
  port: number;
  origin: string;
  connectionCount: number;
  requestCount: number;
  upgradeCount: number;
  requests: string[];
  close(): Promise<void>;
}

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

async function startContainmentServer(
  host: ContainmentServer['host'],
  deniedOrigin?: string
): Promise<ContainmentServer> {
  let connectionCount = 0;
  let requestCount = 0;
  let upgradeCount = 0;
  const requests: string[] = [];
  const server = http.createServer((req, res) => {
    requestCount += 1;
    requests.push(`${req.method ?? 'GET'} ${req.url ?? '/'}`);
    const url = req.url ?? '/';
    if (url === '/redirect') {
      res.writeHead(302, { Location: `${deniedOrigin ?? ''}/sink` });
      res.end();
      return;
    }
    if (url === '/popup') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!doctype html><script>window.open(${JSON.stringify(`${deniedOrigin ?? ''}/sink`)}, '_blank')</script>`);
      return;
    }
    if (url === '/shared.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(`onconnect = (event) => { event.ports[0].onmessage = async () => { try { const response = await fetch(${JSON.stringify(`${deniedOrigin ?? ''}/sink`)}); event.ports[0].postMessage(response.ok ? 'done' : 'blocked'); } catch { event.ports[0].postMessage('blocked'); } }; event.ports[0].start(); };`);
      return;
    }
    if (url === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Service-Worker-Allowed': '/' });
      res.end(`self.addEventListener('fetch', (event) => { if (new URL(event.request.url).pathname === '/sw-probe') event.respondWith(fetch(${JSON.stringify(`${deniedOrigin ?? ''}/sink`)}).catch(() => new Response('blocked'))); });`);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><title>allowed fixture</title><body>allowed fixture</body>');
  });
  server.on('connection', () => {
    connectionCount += 1;
  });
  server.on('upgrade', (req, socket) => {
    upgradeCount += 1;
    const key = req.headers['sec-websocket-key'];
    if (typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.on('data', () => socket.end());
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    host,
    port: address.port,
    origin: `http://${host}:${address.port}`,
    get connectionCount() { return connectionCount; },
    get requestCount() { return requestCount; },
    get upgradeCount() { return upgradeCount; },
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function proxyEventsAfter(count: number) {
  const state = readProxyRuntimeState();
  return readProxyEvents(state.eventLogPath).slice(count);
}

function eventCount(): number {
  return readProxyEvents(readProxyRuntimeState().eventLogPath).length;
}

function localEnv(origin: string): EnvironmentConfig {
  return {
    name: 'local',
    label: 'Phase 1.2 synthetic containment fixtures',
    uiBaseUrl: origin,
    allowedHosts: ['127.0.0.1'],
    staticAssetHosts: [],
    telemetryHosts: ['sentry.example.invalid', 'www.gstatic.com'],
    browserBackgroundHosts: [
      { host: 'android.clients.google.com', classification: 'BROWSER_BACKGROUND_GOOGLE' },
      { host: 'update.googleapis.com', classification: 'BROWSER_BACKGROUND_UPDATE' },
      { host: 'redirector.gvt1.com', classification: 'BROWSER_BACKGROUND_DOWNLOAD' },
    ],
    failOn: ['hard-failure', 'pageerror', 'console-error', 'request-failed'],
  };
}

test.describe('Phase 1.2 outer proxy browser containment', () => {
  test.describe.configure({ retries: 1 });

  test('loopback bypass is disabled: allowed A works and denied B gets zero connections', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const before = eventCount();
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await context.newPage();
      await expect(page.goto(allowed.origin + '/')).resolves.toBeTruthy();
      expect(await page.title()).toBe('allowed fixture');
      expect(allowed.requestCount).toBeGreaterThan(0);
      const deniedResult = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          return response.ok ? 'unexpected-success' : 'blocked';
        } catch {
          return 'blocked';
        }
      }, denied.origin + '/sink');
      expect(deniedResult).toBe('blocked');
      await page.waitForTimeout(100);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);
      expect(proxyEventsAfter(before).some((event) => event.host === denied.host && event.port === denied.port && event.decision === 'deny')).toBe(true);
    } finally {
      await context.close();
      await allowed.close();
      await denied.close();
    }
  });

  test('redirect to denied sink is stopped by the outer gate before the sink connects', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const before = eventCount();
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await context.newPage();
      await page.goto(allowed.origin + '/redirect').catch(() => undefined);
      await page.waitForTimeout(150);
      expect(allowed.requests.some((request) => request.includes('GET /redirect'))).toBe(true);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);
      const events = proxyEventsAfter(before);
      expect(events.some((event) => event.host === allowed.host && event.decision === 'allow')).toBe(true);
      expect(events.some((event) => event.host === denied.host && event.port === denied.port && event.decision === 'deny')).toBe(true);
    } finally {
      await context.close();
      await allowed.close();
      await denied.close();
    }
  });

  test('immediate popup first navigation is stopped without a page listener race', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const before = eventCount();
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await context.newPage();
      await page.goto(allowed.origin + '/popup');
      await page.waitForTimeout(200);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);
      expect(proxyEventsAfter(before).some((event) => event.host === denied.host && event.decision === 'deny')).toBe(true);
    } finally {
      await context.close();
      await allowed.close();
      await denied.close();
    }
  });

  test('SharedWorker and Service Worker escape attempts remain outside the denied sink', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await context.newPage();
      await page.goto(allowed.origin + '/');
      const shared = await page.evaluate((workerUrl) => new Promise<string>((resolve) => {
        try {
          const g = globalThis as unknown as Record<string, any>;
          const worker = new g.SharedWorker(workerUrl) as { port: { onmessage: (event: { data: unknown }) => void; start(): void; postMessage(value: string): void } };
          worker.port.onmessage = (event: { data: unknown }) => resolve(String(event.data));
          worker.port.start();
          worker.port.postMessage('go');
          setTimeout(() => resolve('timeout'), 1000);
        } catch {
          resolve('constructor-blocked');
        }
      }), allowed.origin + '/shared.js');
      expect(['blocked', 'constructor-blocked', 'timeout']).toContain(shared);
      const serviceWorker = await page.evaluate(async (workerUrl) => {
        try {
          const serviceWorker = (navigator as unknown as Record<string, any>)['serviceWorker'] as any;
          const registration = await serviceWorker.register(workerUrl, { scope: '/' });
          await serviceWorker.ready;
          await fetch('/sw-probe');
          await registration.unregister();
          return 'registered';
        } catch {
          return 'blocked';
        }
      }, allowed.origin + '/sw.js');
      expect(['registered', 'blocked']).toContain(serviceWorker);
      await page.waitForTimeout(250);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);
    } finally {
      await context.close();
      await allowed.close();
      await denied.close();
    }
  });

  test('allowed ws works through the proxy and denied WebSocket reaches no sink', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const before = eventCount();
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    try {
      const page = await context.newPage();
      await page.goto(allowed.origin + '/');
      const allowedWs = await page.evaluate((url) => new Promise<string>((resolve) => {
        const socket = new WebSocket(url);
        socket.onopen = () => { socket.close(); resolve('open'); };
        socket.onerror = () => resolve('error');
        setTimeout(() => resolve('timeout'), 1000);
      }), allowed.origin.replace('http:', 'ws:') + '/socket');
      expect(allowedWs).toBe('open');
      expect(allowed.upgradeCount).toBeGreaterThan(0);

      const deniedWs = await page.evaluate((url) => new Promise<string>((resolve) => {
        const socket = new WebSocket(url);
        socket.onopen = () => resolve('unexpected-open');
        socket.onerror = () => resolve('blocked');
        socket.onclose = () => resolve('blocked');
        setTimeout(() => resolve('timeout'), 1000);
      }), denied.origin.replace('http:', 'ws:') + '/socket');
      expect(['blocked', 'timeout']).toContain(deniedWs);
      expect(denied.connectionCount).toBe(0);
      expect(denied.upgradeCount).toBe(0);
      expect(proxyEventsAfter(before).some((event) => event.host === denied.host && event.decision === 'deny')).toBe(true);
    } finally {
      await context.close();
      await allowed.close();
      await denied.close();
    }
  });

  test('normal Nightwatch browser guards also report the redirect while outer proxy evidence remains available', async ({ browser }) => {
    const denied = await startContainmentServer('127.0.0.2');
    const allowed = await startContainmentServer('127.0.0.1', denied.origin);
    const recorder = new RunRecorder({
      runId: `proxy-defense-${Date.now()}`,
      environment: 'local',
      product: 'synthetic',
      browser: 'chromium',
      scenario: 'proxy-defense-in-depth',
    });
    const ctx = await createNightwatchContext(browser, {
      env: localEnv(allowed.origin),
      recorder,
      uiBaseUrl: allowed.origin,
      trace: 'off',
    });
    const before = eventCount();
    try {
      await ctx.page.goto(allowed.origin + '/redirect').catch(() => undefined);
      await ctx.page.waitForTimeout(300);
      const evidence = fs.readFileSync(`${recorder.dir}/events.jsonl`, 'utf8');
      expect(ctx.monitor.hardFailures.some((failure) => failure.url.includes(denied.host))).toBe(true);
      expect(evidence).toContain(denied.host);
      expect(denied.connectionCount).toBe(0);
      expect(proxyEventsAfter(before).every((event) => event.host !== denied.host || event.decision === 'deny')).toBe(true);
      const summary = await recorder.finalize({ passed: !ctx.monitor.failed });
      expect(summary.passed).toBe(false);
      expect(summary.proxy).toBeDefined();
    } finally {
      await ctx.close();
      await allowed.close();
      await denied.close();
    }
  });
});
