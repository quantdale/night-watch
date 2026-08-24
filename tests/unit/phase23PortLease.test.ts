import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { loadEnvironmentConfig } from '../../src/core/environment';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import {
  isPortAvailableForTest,
  proxyLeaseFileForTest,
  reserveProxyPortLease,
} from '../../src/proxy/portLease';
import { startOutboundProxy } from '../../src/proxy/server';

async function listen(port: number): Promise<http.Server> {
  const server = http.createServer((_request, response) => response.end('occupied'));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  return server;
}

test.describe('Phase 23 bounded proxy port/process leases', () => {
  test('occupied preferred port advances to a deterministic bounded candidate', async () => {
    const preferred = 20387;
    const occupied = await listen(preferred);
    const lease = reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-lease-')), preferredPort: preferred });
    try {
      expect(lease.port).toBeGreaterThan(preferred);
      expect(lease.port).toBeLessThanOrEqual(preferred + 31);
      expect(isPortAvailableForTest(lease.port)).toBe(true);
    } finally {
      lease.release();
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  });

  test('a dead lease is detected and reclaimed without killing a live process', () => {
    const preferred = 20397;
    const file = proxyLeaseFileForTest(preferred);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify({
      schemaVersion: 'nightwatch.proxy-port-lease.v1',
      pid: 99999999,
      port: preferred,
      token: 'a'.repeat(24),
    }), { mode: 0o600 });
    const lease = reserveProxyPortLease({ preferredPort: preferred });
    try {
      expect(lease.port).toBe(preferred);
      expect(fs.existsSync(file)).toBe(true);
    } finally {
      lease.release();
    }
  });

  test('failed startup and interrupted teardown leave no owned lease', async () => {
    await expect(startOutboundProxy({
      policy: new OutboundPolicy(loadEnvironmentConfig('local')),
      environment: 'local',
      port: 1,
      eventLogPath: path.join(os.tmpdir(), 'nightwatch-phase23-invalid-events.jsonl'),
    })).rejects.toThrow(/unprivileged TCP port/);
    const lease = reserveProxyPortLease({ preferredPort: 20407 });
    lease.release();
    lease.release();
    expect(fs.existsSync(lease.file)).toBe(false);
  });

  test('a bind failure releases the inherited lease before returning', async () => {
    const lease = reserveProxyPortLease({ preferredPort: 20427 });
    const blocker = await listen(lease.port);
    const previous = {
      port: process.env.NIGHTWATCH_PROXY_PORT,
      token: process.env.NIGHTWATCH_PROXY_LEASE_TOKEN,
      file: process.env.NIGHTWATCH_PROXY_LEASE_PATH,
      owner: process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID,
    };
    process.env.NIGHTWATCH_PROXY_PORT = String(lease.port);
    process.env.NIGHTWATCH_PROXY_LEASE_TOKEN = lease.token;
    process.env.NIGHTWATCH_PROXY_LEASE_PATH = lease.file;
    delete process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID;
    try {
      await expect(startOutboundProxy({
        policy: new OutboundPolicy(loadEnvironmentConfig('local')),
        environment: 'local',
        port: lease.port,
        eventLogPath: path.join(os.tmpdir(), 'nightwatch-phase23-bind-failure.jsonl'),
      })).rejects.toThrow();
      expect(fs.existsSync(lease.file)).toBe(false);
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
      lease.release();
      if (previous.port === undefined) delete process.env.NIGHTWATCH_PROXY_PORT; else process.env.NIGHTWATCH_PROXY_PORT = previous.port;
      if (previous.token === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_TOKEN; else process.env.NIGHTWATCH_PROXY_LEASE_TOKEN = previous.token;
      if (previous.file === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_PATH; else process.env.NIGHTWATCH_PROXY_LEASE_PATH = previous.file;
      if (previous.owner === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID; else process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID = previous.owner;
    }
  });

  test('two isolated checkout roots cannot claim the same live lease', () => {
    const first = reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-one-')), preferredPort: 20417 });
    const second = reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-two-')), preferredPort: 20417 });
    try {
      expect(second.port).not.toBe(first.port);
    } finally {
      first.release();
      second.release();
    }
  });
});
