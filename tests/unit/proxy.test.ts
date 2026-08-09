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
import { readProxyEvents } from '../../src/proxy/events';

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
      expect(await proxyGet(proxy.port, `http://${denied.host}:${denied.port}/denied`)).toBe(403);
      expect(await proxyConnect(proxy.port, `${denied.host}:${denied.port}`)).toBe(403);
      expect(await proxyConnect(proxy.port, 'api.alphaus.cloud:443')).toBe(403);
      expect(denied.connectionCount).toBe(0);
      expect(denied.requestCount).toBe(0);

      const events = readProxyEvents(eventLog);
      expect(events.some((e) => e.host === denied.host && e.decision === 'deny')).toBe(true);
      expect(events.some((e) => e.host === 'api.alphaus.cloud' && e.decision === 'deny')).toBe(true);
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
        policyVersion: 'phase-1.2-outbound-policy-v1',
        eventLogPath: eventLog,
      })).toBe(false);

      const stateFile = path.join(temp, 'proxy-state.json');
      writeProxyRuntimeState({
        address: proxy.address,
        host: '127.0.0.1',
        port: proxy.port,
        environment: 'local',
        policyVersion: 'phase-1.2-outbound-policy-v1',
        eventLogPath: eventLog,
      }, stateFile);
      await expect(requireProxyRuntime('local', stateFile)).rejects.toThrow(/startup is aborted/);
    } finally {
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
