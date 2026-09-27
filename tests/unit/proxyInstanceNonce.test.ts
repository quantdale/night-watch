// M8 task 9.8 (NW-AUD-016 narrowed) — a per-START instance nonce is echoed by
// the health endpoint, recorded in the runtime state and bound into the event
// log, so a loopback listener that merely answers HTTP cannot be admitted as
// this proxy instance.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startOutboundProxy } from '../../src/proxy/server';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { checkProxyHealth, checkProxyHealthDetailed } from '../../src/proxy/runtime';
import { EXACT_ADDRESS_BINDING_VERSION, PROXY_CONTAINMENT_VERSION } from '../../src/proxy/identity';
import { RESOLVED_ADDRESS_POLICY_VERSION } from '../../src/proxy/addressPolicy';
import { OUTBOUND_POLICY_VERSION } from '../../src/core/safety/outboundPolicy';
import { readProxyEvents } from '../../src/proxy/events';
import { loadEnvironmentConfig } from '../../src/core/environment';

const ENV = loadEnvironmentConfig('dev');

async function startProxy() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-proxy-nonce-'));
  const eventLogPath = path.join(temp, 'events.jsonl');
  const proxy = await startOutboundProxy({
    policy: new OutboundPolicy(ENV),
    environment: ENV.name,
    host: '127.0.0.1',
    port: 0,
    eventLogPath,
  });
  return { proxy, eventLogPath, temp };
}

test.describe('proxy instance nonce attestation (9.8)', () => {
  test('every start produces a fresh 32-hex nonce and the log binds it', async () => {
    const first = await startProxy();
    const second = await startProxy();
    try {
      expect(first.proxy.startNonce).toMatch(/^[0-9a-f]{32}$/);
      expect(second.proxy.startNonce).toMatch(/^[0-9a-f]{32}$/);
      expect(first.proxy.startNonce).not.toBe(second.proxy.startNonce);
      // Drive one refused request so the log has a record to inspect.
      const http = await import('node:http');
      await new Promise<void>((resolve) => {
        const request = http.request({ host: '127.0.0.1', port: first.proxy.port, method: 'GET', path: 'http://denied.synthetic.test/x', headers: { Host: 'denied.synthetic.test' } }, (response) => {
          response.resume();
          response.once('end', () => resolve());
        });
        request.once('error', () => resolve());
        request.end();
      });
      const log = readProxyEvents(first.eventLogPath);
      // Every record of this instance's log carries the nonce, so the log as a
      // whole belongs to exactly one proxy instance.
      expect(log.length).toBeGreaterThan(0);
      expect(log.every((entry) => entry.startNonce === first.proxy.startNonce)).toBe(true);
      expect(log.some((entry) => entry.startNonce === second.proxy.startNonce)).toBe(false);
    } finally {
      await first.proxy.close();
      await second.proxy.close();
    }
  });

  test('admission accepts the instance that echoes its own nonce', async () => {
    const { proxy, eventLogPath } = await startProxy();
    try {
      const state: import('../../src/proxy/types').ProxyRuntimeState = {
        address: proxy.address,
        host: '127.0.0.1' as const,
        port: proxy.port,
        environment: ENV.name,
        policyVersion: OUTBOUND_POLICY_VERSION,
        containmentVersion: PROXY_CONTAINMENT_VERSION,
        resolvedAddressPolicyVersion: RESOLVED_ADDRESS_POLICY_VERSION,
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        eventLogPath,
        startNonce: proxy.startNonce,
      };
      expect(await checkProxyHealth(state)).toBe(true);
      const detailed = await checkProxyHealthDetailed(state);
      expect(detailed.healthy).toBe(true);
      expect(detailed.observedNonce).toBe(proxy.startNonce);
      expect(detailed.attested).toBe(true);
      // A state naming a DIFFERENT instance nonce is NOT attested: the listener
      // answers HTTP, but it is not the instance the state names.
      const mismatched = await checkProxyHealthDetailed({ ...state, startNonce: 'f'.repeat(32) });
      expect(mismatched.healthy).toBe(true);
      expect(mismatched.attested).toBe(false);
    } finally {
      await proxy.close();
    }
  });

  test('a foreign loopback listener that answers 204 without the nonce is refused', async () => {
    const http = await import('node:http');
    const impostor = http.createServer((req, res) => {
      if (req.url === '/__nightwatch_health') {
        res.writeHead(204, { Connection: 'close', 'X-Nightwatch-Proxy-Nonce': 'b'.repeat(32) });
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => impostor.listen(0, '127.0.0.1', () => resolve()));
    const address = impostor.address();
    if (address === null || typeof address === 'string') throw new Error('no address');
    try {
      const state: import('../../src/proxy/types').ProxyRuntimeState = {
        address: `http://127.0.0.1:${address.port}`,
        host: '127.0.0.1' as const,
        port: address.port,
        environment: ENV.name,
        policyVersion: OUTBOUND_POLICY_VERSION,
        containmentVersion: PROXY_CONTAINMENT_VERSION,
        resolvedAddressPolicyVersion: RESOLVED_ADDRESS_POLICY_VERSION,
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        eventLogPath: path.join(os.tmpdir(), 'synthetic-events.jsonl'),
        startNonce: 'a'.repeat(32),
      } as import('../../src/proxy/types').ProxyRuntimeState;
      // The impostor answers 204 — and is never attested: it echoes the WRONG
      // nonce, so a caller that needs instance attestation refuses it.
      const detailed = await checkProxyHealthDetailed(state);
      expect(detailed.healthy).toBe(true);
      expect(detailed.observedNonce).toBe('b'.repeat(32));
      expect(detailed.attested).toBe(false);
    } finally {
      await new Promise<void>((resolve) => impostor.close(() => resolve()));
    }
  });

  test('the runtime state validator requires a well-formed nonce when one is declared', async () => {
    const { proxy, eventLogPath } = await startProxy();
    try {
      const state: import('../../src/proxy/types').ProxyRuntimeState = {
        address: proxy.address,
        host: '127.0.0.1',
        port: proxy.port,
        environment: ENV.name,
        policyVersion: OUTBOUND_POLICY_VERSION,
        containmentVersion: PROXY_CONTAINMENT_VERSION,
        resolvedAddressPolicyVersion: RESOLVED_ADDRESS_POLICY_VERSION,
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        eventLogPath,
        startNonce: proxy.startNonce,
      };
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nw-proxy-state-')), 'state.json');
      fs.writeFileSync(file, JSON.stringify(state, null, 2));
      const { readProxyRuntimeState } = await import('../../src/proxy/runtime');
      expect(readProxyRuntimeState(file).startNonce).toBe(proxy.startNonce);
      fs.writeFileSync(file, JSON.stringify({ ...state, startNonce: 'NOT-HEX' }, null, 2));
      expect(() => readProxyRuntimeState(file)).toThrow(/outer proxy state failed validation/);
    } finally {
      await proxy.close();
    }
  });
});
