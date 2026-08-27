// ---------------------------------------------------------------------------
// Nightwatch — resolved-egress containment regression coverage.
//
// These tests deliberately describe the post-hardening contract. They use
// loopback-only fixtures and an adapter-level http.request spy; the injected
// resolver returns data only and never receives socket authority.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { loadEnvironmentConfig } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { startOutboundProxy } from '../../src/proxy/server';
import { readProxyEvents } from '../../src/proxy/events';

type FixtureHost = '127.0.0.1' | '127.0.0.2';

interface ProbeServer {
  readonly host: FixtureHost;
  readonly port: number;
  readonly connectionCount: number;
  readonly requestCount: number;
  readonly hostHeaders: readonly string[];
  close(): Promise<void>;
}

interface ResolverAnswer {
  readonly address: string;
  readonly family: 4 | 6;
}

interface SyntheticResolver {
  resolve: (hostname: string) => Promise<readonly ResolverAnswer[]>;
}

async function startProbe(host: FixtureHost, port = 0): Promise<ProbeServer> {
  let connectionCount = 0;
  let requestCount = 0;
  const hostHeaders: string[] = [];
  const server = http.createServer((_req, res) => {
    requestCount += 1;
    if (typeof _req.headers.host === 'string') hostHeaders.push(_req.headers.host);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`fixture-${host}`);
  });
  server.on('connection', () => { connectionCount += 1; });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address() as net.AddressInfo;
  return {
    host,
    port: address.port,
    get connectionCount() { return connectionCount; },
    get requestCount() { return requestCount; },
    hostHeaders,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function proxyGet(port: number, target: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      method: 'GET',
      path: target,
      headers: { Host: target.replace(/^https?:\/\//i, '').split('/')[0] ?? '' },
    }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
    });
    request.once('error', reject);
    request.end();
  });
}

async function withUpstreamRewrite<T>(
  rewriteHostname: FixtureHost,
  observed: Array<{ hostname: unknown; family: unknown }>,
  action: () => Promise<T>,
): Promise<T> {
  const originalRequest = http.request;
  (http as unknown as { request: typeof http.request }).request = ((options: unknown, ...args: unknown[]) => {
    if (options !== null && typeof options === 'object' && 'hostname' in options) {
      const originalOptions = options as Record<string, unknown>;
      if (typeof originalOptions.hostname !== 'string') {
        return (originalRequest as unknown as (...inner: unknown[]) => unknown).call(http, options, ...args);
      }
      observed.push({ hostname: originalOptions.hostname, family: originalOptions.family });
      if (originalOptions.hostname !== 'allowed.synthetic.test') {
        return (originalRequest as unknown as (...inner: unknown[]) => unknown).call(http, options, ...args);
      }
      return (originalRequest as unknown as (...inner: unknown[]) => unknown).call(
        http,
        { ...originalOptions, hostname: rewriteHostname },
        ...args,
      );
    }
    return (originalRequest as unknown as (...inner: unknown[]) => unknown).call(http, options, ...args);
  }) as typeof http.request;
  try {
    return await action();
  } finally {
    (http as unknown as { request: typeof http.request }).request = originalRequest;
  }
}

function campaignOptions(
  eventLogPath: string,
  resolver: SyntheticResolver,
): Parameters<typeof startOutboundProxy>[0] {
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

test.describe('resolved-egress hardening regressions', () => {
  test('allowed hostname reaches the resolver while policy blocks stay resolver-free', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-resolved-egress-before-'));
    const resolverCalls: string[] = [];
    const resolver: SyntheticResolver = {
      resolve: async (hostname) => {
        resolverCalls.push(hostname);
        return [{ address: '127.0.0.1', family: 4 }];
      },
    };
    const proxy = await startOutboundProxy(campaignOptions(path.join(temp, 'events.jsonl'), resolver));
    try {
      expect(await proxyGet(proxy.port, 'http://example.invalid/denied')).toBe(403);
      expect(await proxyGet(proxy.port, 'http://sentry.io/telemetry')).toBe(403);
      expect(await proxyGet(proxy.port, 'http://widget.usepylon.com/widget')).toBe(403);
      expect(await proxyGet(proxy.port, 'http://android.clients.google.com/background')).toBe(403);
      expect(resolverCalls).toEqual([]);

      const observed: Array<{ hostname: unknown; family: unknown }> = [];
      const allowed = await startProbe('127.0.0.1');
      try {
        await withUpstreamRewrite('127.0.0.1', observed, async () => {
          expect(await proxyGet(proxy.port, `http://allowed.synthetic.test:${allowed.port}/allowed`)).toBe(200);
        });
      } finally {
        await allowed.close();
      }
      expect.soft(resolverCalls).toEqual(['allowed.synthetic.test']);
      expect.soft(observed).toHaveLength(1);
    } finally {
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  test('accepted resolver address is dialed numerically and unsafe address is rejected before upstream', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-resolved-egress-before-'));
    const safe = await startProbe('127.0.0.1');
    const unsafe = await startProbe('127.0.0.2', safe.port);
    const resolverCalls: string[] = [];
    const resolver: SyntheticResolver = {
      resolve: async (hostname) => {
        resolverCalls.push(hostname);
        return [{ address: '127.0.0.1', family: 4 }];
      },
    };
    const proxy = await startOutboundProxy(campaignOptions(path.join(temp, 'events.jsonl'), resolver));
    try {
      const observed: Array<{ hostname: unknown; family: unknown }> = [];
      const status = await withUpstreamRewrite('127.0.0.2', observed, () =>
        proxyGet(proxy.port, `http://allowed.synthetic.test:${safe.port}/exact`));
      expect.soft(status).toBe(200);
      expect.soft(resolverCalls).toEqual(['allowed.synthetic.test']);
      expect.soft(observed).toEqual([{ hostname: '127.0.0.1', family: 4 }]);
      expect.soft(safe.requestCount).toBe(1);
      expect.soft(unsafe.requestCount).toBe(0);
      expect.soft(safe.hostHeaders).toEqual([`allowed.synthetic.test:${safe.port}`]);

      resolverCalls.length = 0;
      resolver.resolve = async (hostname) => {
        resolverCalls.push(hostname);
        return [{ address: '127.0.0.2', family: 4 }];
      };
      const rejected = await withUpstreamRewrite('127.0.0.2', observed, () =>
        proxyGet(proxy.port, `http://allowed.synthetic.test:${unsafe.port}/unsafe`));
      expect.soft(rejected).toBe(502);
      expect.soft(resolverCalls).toEqual(['allowed.synthetic.test']);
      expect.soft(unsafe.requestCount).toBe(0);
      const events = readProxyEvents(path.join(temp, 'events.jsonl'));
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          host: 'allowed.synthetic.test',
          decision: 'allow',
          resolution: 'admitted',
          connection: 'connected',
          addressFamily: 4,
          addressClass: 'loopback',
          addressBindingVersion: 'phase-1.2-exact-address-binding-v1',
        }),
        expect.objectContaining({
          host: 'allowed.synthetic.test',
          decision: 'allow',
          resolution: 'denied',
          connection: 'not-attempted',
          containmentViolation: 'RESOLVED_ADDRESS_POLICY_DENIED',
        }),
      ]));
      expect(JSON.stringify(events)).not.toContain('SYNTHETIC_RAW');
    } finally {
      await safe.close();
      await unsafe.close();
      await proxy.close();
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
