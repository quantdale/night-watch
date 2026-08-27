// ---------------------------------------------------------------------------
// Nightwatch — resolved-address binding across HTTP CONNECT and WS Upgrade.
// All fixtures bind to loopback aliases and use a synthetic resolver.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadEnvironmentConfig } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { readProxyEvents } from '../../src/proxy/events';
import { startOutboundProxy } from '../../src/proxy/server';
import type { ProxyResolver } from '../../src/proxy/resolver';

type FixtureHost = '127.0.0.1' | '127.0.0.2';

interface SocketFixture {
  readonly host: FixtureHost;
  readonly port: number;
  readonly connectionCount: number;
  readonly requests: readonly string[];
  close(): Promise<void>;
}

async function startSocketFixture(host: FixtureHost, port = 0): Promise<SocketFixture> {
  let connectionCount = 0;
  let responded = false;
  const requests: string[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    connectionCount += 1;
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
      if (data.includes('\r\n\r\n')) {
        requests.push(data);
        if (!responded && /upgrade:\s*websocket/i.test(data)) {
          responded = true;
          const keyMatch = /Sec-WebSocket-Key:\s*([^\r\n]+)/i.exec(data);
          const key = keyMatch?.[1]?.trim() ?? '';
          const accept = crypto.createHash('sha1')
            .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
            .digest('base64');
          socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address() as net.AddressInfo;
  return {
    host,
    port: address.port,
    get connectionCount() { return connectionCount; },
    requests,
    close: () => new Promise<void>((resolve) => {
      for (const socket of sockets) socket.destroy();
      server.close(() => resolve());
    }),
  };
}

function resolverFor(answer: { address: string; family: 4 | 6 }, calls: string[]): ProxyResolver {
  return {
    resolve: async (hostname) => {
      calls.push(hostname);
      return [answer];
    },
  };
}

function options(eventLogPath: string, resolver: ProxyResolver) {
  return {
    policy: new OutboundPolicy({
      ...loadEnvironmentConfig('local'),
      allowedHosts: ['allowed.synthetic.test'],
    }),
    environment: 'local',
    port: 0,
    eventLogPath,
    resolver,
  } as Parameters<typeof startOutboundProxy>[0];
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

function proxyUpgrade(port: number, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      method: 'GET',
      path: target,
      headers: {
        Host: target.replace(/^ws:\/\//i, '').split('/')[0] ?? '',
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'c3ludGhldGljLWtleQ==',
      },
    });
    request.once('upgrade', (response, socket) => {
      socket.destroy();
      resolve(response.statusCode ?? 0);
    });
    request.once('response', (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
    });
    request.once('error', reject);
    request.setTimeout(2_000, () => {
      request.destroy();
      resolve(0);
    });
    request.end();
  });
}

test.describe('resolved protocol binding', () => {
  test('CONNECT uses the admitted numeric address and preserves authority semantics', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-connect-'));
    const calls: string[] = [];
    const safe = await startSocketFixture('127.0.0.1');
    const unsafe = await startSocketFixture('127.0.0.2', safe.port);
    const resolver = resolverFor({ address: '127.0.0.1', family: 4 }, calls);
    const proxy = await startOutboundProxy(options(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyConnect(proxy.port, `allowed.synthetic.test:${safe.port}`)).toBe(200);
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(safe.connectionCount).toBe(1);
      expect(unsafe.connectionCount).toBe(0);
      expect(safe.requests).toEqual([]);

      const events = readProxyEvents(path.join(temp, 'events.jsonl'));
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          protocol: 'https-connect',
          host: 'allowed.synthetic.test',
          decision: 'allow',
          resolution: 'admitted',
          connection: 'connected',
          addressFamily: 4,
          addressClass: 'loopback',
        }),
      ]));
    } finally {
      await safe.close();
      await unsafe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('CONNECT with an unsafe answer never opens the unsafe fixture', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-connect-'));
    const calls: string[] = [];
    const safe = await startSocketFixture('127.0.0.1');
    const unsafe = await startSocketFixture('127.0.0.2', safe.port);
    const resolver = resolverFor({ address: '127.0.0.2', family: 4 }, calls);
    const proxy = await startOutboundProxy(options(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyConnect(proxy.port, `allowed.synthetic.test:${safe.port}`)).toBe(502);
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(safe.connectionCount).toBe(0);
      expect(unsafe.connectionCount).toBe(0);
      const event = readProxyEvents(path.join(temp, 'events.jsonl'))[0];
      expect(event).toMatchObject({
        decision: 'allow',
        resolution: 'denied',
        connection: 'not-attempted',
        containmentViolation: 'RESOLVED_ADDRESS_POLICY_DENIED',
      });
    } finally {
      await safe.close();
      await unsafe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('CONNECT refusal is reported as a failed connection, not a policy denial', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-connect-'));
    const calls: string[] = [];
    const closedFixture = await startSocketFixture('127.0.0.1');
    const refusedPort = closedFixture.port;
    await closedFixture.close();
    const resolver = resolverFor({ address: '127.0.0.1', family: 4 }, calls);
    const proxy = await startOutboundProxy(options(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyConnect(proxy.port, `allowed.synthetic.test:${refusedPort}`)).toBe(502);
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(readProxyEvents(path.join(temp, 'events.jsonl'))[0]).toMatchObject({
        decision: 'allow',
        resolution: 'admitted',
        connection: 'failed',
        connectionFailure: 'CONNECTION_REFUSED',
        addressBindingVersion: 'phase-1.2-exact-address-binding-v1',
      });
    } finally {
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('resolver timeout closes the request and cannot create a late upstream socket', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-timeout-'));
    const calls: string[] = [];
    const safe = await startSocketFixture('127.0.0.1');
    let release: (() => void) | undefined;
    const resolver: ProxyResolver = {
      resolve: async (hostname) => {
        calls.push(hostname);
        return await new Promise<readonly { address: string; family: 4 }[]>((resolve) => {
          release = () => resolve([{ address: '127.0.0.1', family: 4 }]);
        });
      },
    };
    const proxy = await startOutboundProxy({ ...options(path.join(temp, 'events.jsonl'), resolver), resolverTimeoutMs: 10 });
    try {
      expect(await proxyConnect(proxy.port, `allowed.synthetic.test:${safe.port}`)).toBe(502);
      release?.();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(safe.connectionCount).toBe(0);
      expect(readProxyEvents(path.join(temp, 'events.jsonl'))[0]).toMatchObject({
        decision: 'allow',
        resolution: 'failed',
        resolutionReason: 'RESOLUTION_TIMEOUT',
        connection: 'not-attempted',
        containmentViolation: 'RESOLUTION_FAILED',
      });
    } finally {
      await safe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('WebSocket Upgrade shares exact binding and retains the original Host authority', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-ws-'));
    const calls: string[] = [];
    const safe = await startSocketFixture('127.0.0.1');
    const unsafe = await startSocketFixture('127.0.0.2', safe.port);
    const resolver = resolverFor({ address: '127.0.0.1', family: 4 }, calls);
    const proxy = await startOutboundProxy(options(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyUpgrade(proxy.port, `ws://allowed.synthetic.test:${safe.port}/socket`)).toBe(101);
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(safe.connectionCount).toBe(1);
      expect(unsafe.connectionCount).toBe(0);
      expect(safe.requests.join('\n')).toContain(`Host: allowed.synthetic.test:${safe.port}`);
      const event = readProxyEvents(path.join(temp, 'events.jsonl'))[0];
      expect(event).toMatchObject({
        protocol: 'ws',
        decision: 'allow',
        resolution: 'admitted',
        connection: 'connected',
        addressFamily: 4,
      });
    } finally {
      await safe.close();
      await unsafe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('WebSocket unsafe answer is denied before Upgrade connection', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-proxy-ws-'));
    const calls: string[] = [];
    const safe = await startSocketFixture('127.0.0.1');
    const unsafe = await startSocketFixture('127.0.0.2', safe.port);
    const resolver = resolverFor({ address: '127.0.0.2', family: 4 }, calls);
    const proxy = await startOutboundProxy(options(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyUpgrade(proxy.port, `ws://allowed.synthetic.test:${safe.port}/socket`)).toBe(502);
      expect(calls).toEqual(['allowed.synthetic.test']);
      expect(safe.connectionCount).toBe(0);
      expect(unsafe.connectionCount).toBe(0);
    } finally {
      await safe.close();
      await unsafe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
