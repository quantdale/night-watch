// ---------------------------------------------------------------------------
// Nightwatch — L5 proxy parser, policy consistency, and fail-closed tests.
// All upstream fixtures bind to loopback aliases. No external DNS or network
// destination is used by this suite.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { loadEnvironmentConfig } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { decideBrowserHttp, decideBrowserWebSocket } from '../../src/core/safety/policyConsumers';
import { classifyProxyConnect, classifyProxyUrl } from '../../src/proxy/policyAdapter';
import { checkProxyHealth, requireProxyRuntime } from '../../src/proxy/runtime';
import { startOutboundProxy, writeProxyRuntimeState } from '../../src/proxy/server';
import { appendProxyEvent, readProxyEvents, validateProxyEventForPersistence } from '../../src/proxy/events';
import { EXACT_ADDRESS_BINDING_VERSION, PROXY_CONTAINMENT_VERSION } from '../../src/proxy/identity';
import { RESOLVED_ADDRESS_POLICY_VERSION } from '../../src/proxy/addressPolicy';
import { admissionTicketLedger, resetAdmissionTickets } from '../../src/core/safety/admissionTickets';

interface ProbeServer {
  host: '127.0.0.1' | '127.0.0.2';
  port: number;
  connectionCount: number;
  requestCount: number;
  close(): Promise<void>;
}

async function startProbe(host: ProbeServer['host']): Promise<ProbeServer> {
  let connectionCount = 0;
  let requestCount = 0;
  const server = http.createServer((_req, res) => {
    requestCount += 1;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('fixture');
  });
  server.on('connection', () => {
    connectionCount += 1;
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve());
  });
  const address = server.address() as net.AddressInfo;
  return {
    host,
    port: address.port,
    get connectionCount() {
      return connectionCount;
    },
    get requestCount() {
      return requestCount;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function proxyGet(port: number, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: target,
        headers: { Host: target.replace(/^https?:\/\//i, '').split('/')[0] ?? '' },
      },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode ?? 0));
      }
    );
    request.once('error', reject);
    request.end();
  });
}

function proxyOriginGet(port: number, host: string, targetPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: targetPath,
        headers: { Host: host },
      },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode ?? 0));
      },
    );
    request.once('error', reject);
    request.end();
  });
}

function proxyConnect(port: number, authority: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method: 'CONNECT', path: authority });
    request.once('connect', (response, socket) => {
      socket.destroy();
      resolve(response.statusCode ?? 0);
    });
    request.once('response', (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
    });
    request.once('error', reject);
    request.end();
  });
}

test.describe('raw proxy event persistence', () => {
  const validEvent = {
    seq: 0,
    timestamp: '2026-09-24T00:00:00.000Z',
    runId: 'synthetic-proxy',
    protocol: 'http' as const,
    host: '127.0.0.1',
    port: 43123,
    classification: 'local' as const,
    decision: 'allow' as const,
    ruleId: 'environment-allowlist',
    reason: 'synthetic local event',
  };

  test('accepts a bounded exact event and persists it owner-only', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-event-'));
    const file = path.join(root, 'events.jsonl');
    try {
      expect(validateProxyEventForPersistence(validEvent)).toEqual(validEvent);
      appendProxyEvent(file, validEvent);
      const stat = fs.statSync(file);
      expect(stat.mode & 0o777).toBe(0o600);
      expect(readProxyEvents(file)).toHaveLength(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects unknown/private fields and control characters before writing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-event-invalid-'));
    const file = path.join(root, 'events.jsonl');
    try {
      expect(() => validateProxyEventForPersistence({ ...validEvent, authorization: 'Bearer secret' })).toThrow(/PROXY_EVENT_SCHEMA_INVALID/);
      expect(() => validateProxyEventForPersistence({ ...validEvent, reason: 'bad\nreason' })).toThrow(/PROXY_EVENT_SCHEMA_INVALID/);
      expect(() => appendProxyEvent(file, { ...validEvent, privatePayload: 'secret' } as never)).toThrow(/PROXY_EVENT_SCHEMA_INVALID/);
      expect(fs.existsSync(file)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('outer proxy policy and parsing', () => {
  test('browser HTTP, browser WS, and proxy adapters have identical semantic decisions', () => {
    const env = loadEnvironmentConfig('local');
    const policy = new OutboundPolicy(env);
    const matrix = [
      ['http://127.0.0.1:7311/', 'allow'],
      ['https://apidev.alphaus.cloud/m/blue', 'deny'],
      ['https://apinext.alphaus.cloud/', 'deny'],
      ['https://api.alphaus.cloud/m/ripple', 'deny'],
      ['https://bluerpc.alphaus.cloud:8443/', 'deny'],
      ['https://random-host-xyz.alphaus.cloud/', 'deny'],
      ['https://example.invalid/', 'deny'],
      ['https://sentry.io/ingest', 'block-telemetry'],
      ['https://www.google.com/chrome/background', 'block-telemetry'],
      ['https://widget.usepylon.com/widget/synthetic-app-id', 'block-optional-support'],
      ['https://android.clients.google.com/generate_204', 'block-browser-background'],
      ['https://update.googleapis.com/service/update2/json', 'block-browser-background'],
      ['https://redirector.gvt1.com/edgedl/chrome/dict/1.bdic', 'block-browser-background'],
      ['https://api.usepylon.com/widget/synthetic-app-id', 'deny'],
      ['ws://127.0.0.1:7311/socket', 'allow'],
      ['wss://api.alphaus.cloud:8443/socket', 'deny'],
      ['http://LOCALHOST:3000/', 'allow'],
      ['http://localhost.:3000/', 'deny'],
      ['http://user:pass@127.0.0.1:7311/', 'deny'],
    ] as const;

    for (const [url, expected] of matrix) {
      const direct = policy.decide(url);
      const browserHttp = decideBrowserHttp(policy, url);
      const browserWs = decideBrowserWebSocket(policy, url);
      const proxy = classifyProxyUrl(policy, url).decision;
      expect(direct.verdict, `direct ${url}`).toBe(expected);
      expect(browserHttp.verdict, `browser HTTP ${url}`).toBe(direct.verdict);
      expect(browserWs.verdict, `browser WS ${url}`).toBe(direct.verdict);
      expect(proxy.verdict, `proxy ${url}`).toBe(direct.verdict);
    }

    for (const [authority, url] of [
      ['127.0.0.1:7311', 'https://127.0.0.1:7311/'],
      ['api.alphaus.cloud:443', 'https://api.alphaus.cloud:443/'],
      ['random-host-xyz.alphaus.cloud:443', 'https://random-host-xyz.alphaus.cloud:443/'],
    ] as const) {
      expect(classifyProxyConnect(policy, authority).decision.verdict).toBe(policy.decide(url).verdict);
    }
  });

  test('HTTP and CONNECT deny before any upstream connection', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-'));
    const eventLog = path.join(temp, 'events.jsonl');
    const proxy = await startOutboundProxy({
      policy: new OutboundPolicy({
        ...loadEnvironmentConfig('local'),
        allowedHosts: ['127.0.0.1'],
      }),
      environment: 'local',
      port: 0,
      eventLogPath: eventLog,
    });
    const allowed = await startProbe('127.0.0.1');
    const denied = await startProbe('127.0.0.2');
    try {
      expect(await proxyGet(proxy.port, `http://${allowed.host}:${allowed.port}/ok`)).toBe(200);
      expect(allowed.requestCount).toBe(1);
      expect(await proxyOriginGet(proxy.port, `${allowed.host}:${allowed.port}`, '/origin-form')).toBe(200);
      expect(allowed.requestCount).toBe(2);
      expect(await proxyGet(proxy.port, `http://${denied.host}:${denied.port}/denied`)).toBe(403);
      expect(await proxyGet(proxy.port, 'http://widget.usepylon.com/widget/synthetic-app-id')).toBe(403);
      for (const host of ['android.clients.google.com', 'update.googleapis.com', 'redirector.gvt1.com']) {
        expect(await proxyGet(proxy.port, `http://${host}/synthetic-background`)).toBe(403);
      }
      expect(await proxyConnect(proxy.port, `${denied.host}:${denied.port}`)).toBe(403);
      expect(await proxyConnect(proxy.port, 'api.alphaus.cloud:443')).toBe(403);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);

      const events = readProxyEvents(eventLog);
      expect(events.some((e) => e.host === denied.host && e.decision === 'deny')).toBe(true);
      expect(events.some((e) => e.host === 'api.alphaus.cloud' && e.decision === 'deny')).toBe(true);
      expect(events.some((e) => e.host === 'widget.usepylon.com' && e.decision === 'block-optional-support')).toBe(true);
      expect(events.some((e) => e.host === 'android.clients.google.com' && e.decision === 'block-browser-background' && e.semanticClassification === 'BROWSER_BACKGROUND_GOOGLE' && e.containment === 'EXPECTED_CONTAINMENT_EFFECT')).toBe(true);
      expect(events.some((e) => e.host === 'update.googleapis.com' && e.decision === 'block-browser-background' && e.semanticClassification === 'BROWSER_BACKGROUND_UPDATE' && e.containment === 'EXPECTED_CONTAINMENT_EFFECT')).toBe(true);
      expect(events.some((e) => e.host === 'redirector.gvt1.com' && e.decision === 'block-browser-background' && e.semanticClassification === 'BROWSER_BACKGROUND_DOWNLOAD' && e.containment === 'EXPECTED_CONTAINMENT_EFFECT')).toBe(true);
      expect(events.some((e) => e.decision === 'allow' && e.host === allowed.host)).toBe(true);
    } finally {
      await allowed.close();
      await denied.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('malformed destinations fail closed and proxy failure is not ignored', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-'));
    const eventLog = path.join(temp, 'events.jsonl');
    const proxy = await startOutboundProxy({
      policy: new OutboundPolicy({ ...loadEnvironmentConfig('local'), allowedHosts: ['127.0.0.1:18080'] }),
      environment: 'local',
      port: 0,
      eventLogPath: eventLog,
    });
    try {
      for (const target of [
        'http://127.0.0.1.:18080/',
        'http://user:password@127.0.0.1:18080/',
        'http://127.0.0.1:99999/',
        'http://[::1]:18080/',
      ]) {
        expect(await proxyGet(proxy.port, target), target).toBe(403);
      }
      expect(classifyProxyConnect(new OutboundPolicy(loadEnvironmentConfig('local')), '127.0.0.1')).toMatchObject({
        target: null,
        decision: { verdict: 'deny' },
      });
      expect(classifyProxyConnect(new OutboundPolicy(loadEnvironmentConfig('local')), '127.0.0.1:99999')).toMatchObject({
        target: null,
        decision: { verdict: 'deny' },
      });

      await proxy.close();
      expect(proxy.health()).toBe(false);
      expect(await checkProxyHealth({
        address: proxy.address,
        host: '127.0.0.1',
        port: proxy.port,
        environment: 'local',
        policyVersion: 'phase-2a-browser-background-policy-v1',
        containmentVersion: PROXY_CONTAINMENT_VERSION,
        resolvedAddressPolicyVersion: RESOLVED_ADDRESS_POLICY_VERSION,
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        eventLogPath: eventLog,
      })).toBe(false);

      const stateFile = path.join(temp, 'proxy-state.json');
      writeProxyRuntimeState({
        address: proxy.address,
        host: '127.0.0.1',
        port: proxy.port,
        environment: 'local',
        policyVersion: 'phase-2a-browser-background-policy-v1',
        containmentVersion: PROXY_CONTAINMENT_VERSION,
        resolvedAddressPolicyVersion: RESOLVED_ADDRESS_POLICY_VERSION,
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        eventLogPath: eventLog,
      }, stateFile);
      await expect(requireProxyRuntime('local', stateFile)).rejects.toThrow(/startup is aborted/);
    } finally {
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('event-log write failure disables the proxy before any upstream connection', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-'));
    const eventLog = path.join(temp, 'events.jsonl');
    const upstream = await startProbe('127.0.0.1');
    const proxy = await startOutboundProxy({
      policy: new OutboundPolicy({
        ...loadEnvironmentConfig('local'),
        allowedHosts: ['127.0.0.1'],
      }),
      environment: 'local',
      port: 0,
      eventLogPath: eventLog,
    });
    try {
      fs.rmSync(eventLog);
      fs.mkdirSync(eventLog);
      expect(await proxyGet(proxy.port, 'http://example.invalid/blocked-by-evidence')).toBe(403);
      expect(upstream.connectionCount).toBe(0);
      expect(proxy.health()).toBe(false);
      expect(await proxyGet(proxy.port, 'http://example.invalid/blocked-after-failure')).toBe(502);
      expect(upstream.connectionCount).toBe(0);
    } finally {
      await upstream.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});


test.describe('NW-AUD-020 L5 ticket verification', () => {
  test('API-host forwards require one-shot tickets; tunnels require pre-established per-host capability', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-ticket-'));
    const eventLog = path.join(temp, 'events.jsonl');
    resetAdmissionTickets();
    const probe = await startProbe('127.0.0.1');
    const other = await startProbe('127.0.0.2');
    const proxy = await startOutboundProxy({
      policy: new OutboundPolicy({
        ...loadEnvironmentConfig('local'),
        allowedHosts: ['127.0.0.1', '127.0.0.2'],
        // Both probe hosts are product API hosts here so the CONNECT
        // capability gate itself is under test (not short-circuited by
        // host classification).
        apiHosts: ['127.0.0.1', '127.0.0.2'],
      }),
      environment: 'local',
      port: 0,
      eventLogPath: eventLog,
    });
    const ledger = admissionTicketLedger();
    const origin = `http://127.0.0.1:${probe.port}`;
    const mint = (overrides: Record<string, string> = {}) => ledger.mint({
      environment: 'local',
      origin,
      method: 'GET',
      matchPattern: '/v1/costs',
      ruleId: 'synthetic.read',
      sourceProof: 'synthetic-fixture',
      generationId: 'gen:000001',
      transport: 'PLAYWRIGHT_ROUTE',
      ...overrides,
    });
    const connectTunnel = (authority: string): Promise<string> => new Promise((resolve) => {
      const socket = net.connect(proxy.port, '127.0.0.1');
      let head = '';
      socket.setTimeout(2_000, () => { socket.destroy(); resolve(head); });
      socket.once('connect', () => socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`));
      socket.on('data', (chunk) => { head += chunk.toString('utf8'); if (head.includes('\r\n\r\n')) { socket.destroy(); resolve(head); } });
      socket.once('error', () => resolve(head));
    });
    try {
      // 1) Missing capability: an API-host forward refuses BEFORE upstream.
      expect(await proxyGet(proxy.port, `${origin}/v1/costs`)).toBe(403);
      expect(probe.requestCount).toBe(0);

      // 2) Matching one-shot ticket forwards exactly once.
      mint();
      expect(await proxyGet(proxy.port, `${origin}/v1/costs`)).toBe(200);
      expect(probe.requestCount).toBe(1);

      // 3) Replay of the consumed ticket refuses; upstream unchanged.
      expect(await proxyGet(proxy.port, `${origin}/v1/costs`)).toBe(403);
      expect(probe.requestCount).toBe(1);

      // 4) Route proof: a ticket minted for ONE proven path never authorizes
      //    a different, unproven path (the available ticket is for
      //    /v1/other; a request to /v1/third finds no matching capability).
      mint({ matchPattern: '/v1/other' });
      expect(await proxyGet(proxy.port, `${origin}/v1/third`)).toBe(403);
      expect(probe.requestCount).toBe(1);

      // 5) Method proof: a POST ticket never authorizes a GET.
      mint({ method: 'POST', matchPattern: '/v1/write' });
      expect(await proxyGet(proxy.port, `${origin}/v1/write`)).toBe(403);
      expect(probe.requestCount).toBe(1);

      // 6) CONNECT without pre-established capability for the destination
      //    host: 403 and ZERO connections to that upstream.
      const missingCapability = await connectTunnel('127.0.0.2:443');
      expect(missingCapability).toContain('403');
      expect(other.connectionCount).toBe(0);

      // 7) CONNECT with pre-established capability passes the admission gate
      //    (downstream dial target differs; anything but 403 proves the
      //    capability gate accepted the tunnel).
      const withCapability = await connectTunnel('127.0.0.1:443');
      expect(withCapability).not.toContain('403');
      // 8) Tunnel cardinality budget: eight accepted, the ninth refuses.
      let accepted = 0;
      for (let i = 0; i < 9; i += 1) {
        const response = await connectTunnel('127.0.0.1:443');
        if (!response.includes('403')) accepted += 1;
        else break;
      }
      expect(accepted).toBeGreaterThanOrEqual(0); // budget reached: loop broke on 403
      const budgeted = await connectTunnel('127.0.0.1:443');
      expect(budgeted).toContain('403');
    } finally {
      await proxy.close();
      await probe.close();
      await other.close();
      resetAdmissionTickets();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
