import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  ensureProxyPortLease,
  isPortAvailableForTest,
  proxyLeaseFileForTest,
  releaseProxyPortLease,
  reserveProxyPortLease,
} from '../../src/proxy/portLease';

async function waitForLeaseFile(file: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(file)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('PHASE24_LEASE_CHILD_START_TIMEOUT');
}

function waitForExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PHASE24_LEASE_CHILD_EXIT_TIMEOUT')), 2_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

test.describe('Phase 24 adversarial proxy lease lifecycle', () => {
  test('rapid repeated runs release every owned lease and leave ports available', () => {
    const leases = [];
    for (let index = 0; index < 6; index += 1) {
      const lease = reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase24-lease-')), preferredPort: 20600 + index * 3 });
      leases.push(lease);
      expect(isPortAvailableForTest(lease.port)).toBe(true);
      lease.release();
      expect(fs.existsSync(lease.file)).toBe(false);
    }
  });

  test('parallel isolated workers receive distinct deterministic lease ownership', async () => {
    const [first, second] = await Promise.all([
      Promise.resolve().then(() => reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase24-worker-a-')), preferredPort: 20630 })),
      Promise.resolve().then(() => reserveProxyPortLease({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase24-worker-b-')), preferredPort: 20630 })),
    ]);
    try {
      expect(first.port).not.toBe(second.port);
      expect(first.token).not.toBe(second.token);
    } finally {
      first.release();
      second.release();
    }
  });

  test('inherited lease can be released only by the explicit owner handoff', () => {
    const lease = reserveProxyPortLease({ preferredPort: 20660 });
    const previous = {
      port: process.env.NIGHTWATCH_PROXY_PORT,
      token: process.env.NIGHTWATCH_PROXY_LEASE_TOKEN,
      file: process.env.NIGHTWATCH_PROXY_LEASE_PATH,
      owner: process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID,
    };
    process.env.NIGHTWATCH_PROXY_PORT = String(lease.port);
    process.env.NIGHTWATCH_PROXY_LEASE_TOKEN = lease.token;
    process.env.NIGHTWATCH_PROXY_LEASE_PATH = lease.file;
    process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID = String(process.pid);
    try {
      const inherited = ensureProxyPortLease(undefined, lease.port);
      expect(inherited.port).toBe(lease.port);
      releaseProxyPortLease();
      expect(fs.existsSync(lease.file)).toBe(false);
    } finally {
      lease.release();
      if (previous.port === undefined) delete process.env.NIGHTWATCH_PROXY_PORT; else process.env.NIGHTWATCH_PROXY_PORT = previous.port;
      if (previous.token === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_TOKEN; else process.env.NIGHTWATCH_PROXY_LEASE_TOKEN = previous.token;
      if (previous.file === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_PATH; else process.env.NIGHTWATCH_PROXY_LEASE_PATH = previous.file;
      if (previous.owner === undefined) delete process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID; else process.env.NIGHTWATCH_PROXY_LEASE_OWNER_PID = previous.owner;
    }
  });

  test('suspicious symlink lease state is never deleted and bounded allocation advances', () => {
    const preferred = 20690;
    const file = proxyLeaseFileForTest(preferred);
    const target = path.join(os.tmpdir(), `nightwatch-phase24-symlink-${process.pid}`);
    fs.writeFileSync(target, 'sentinel', { mode: 0o600 });
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    try {
      fs.symlinkSync(target, file);
      const lease = reserveProxyPortLease({ preferredPort: preferred });
      try {
        expect(lease.port).toBeGreaterThan(preferred);
        expect(fs.lstatSync(file).isSymbolicLink()).toBe(true);
      } finally {
        lease.release();
      }
    } finally {
      try { fs.unlinkSync(file); } catch { /* test cleanup is idempotent */ }
      try { fs.unlinkSync(target); } catch { /* test cleanup is idempotent */ }
    }
  });

  test('SIGTERM and SIGINT during a child setup leave reclaimable orphan state only', async () => {
    const childScript = [
      "const fs=require('node:fs');",
      "const path=require('node:path');",
      "const file=process.argv[1];",
      "const port=Number(process.argv[2]);",
      "fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});",
      "fs.writeFileSync(file,JSON.stringify({schemaVersion:'nightwatch.proxy-port-lease.v1',pid:process.pid,port,token:'c'.repeat(24)}),{mode:0o600});",
      "process.on('SIGTERM',()=>process.exit(0));",
      "process.on('SIGINT',()=>process.exit(0));",
      "setInterval(()=>{},1000);",
    ].join('');
    for (const [index, signal] of (['SIGTERM', 'SIGINT'] as const).entries()) {
      const preferred = 21000 + (process.pid % 500) * 2 + index;
      const file = proxyLeaseFileForTest(preferred);
      try { fs.unlinkSync(file); } catch { /* stale scratch cleanup is bounded */ }
      const child = spawn(process.execPath, ['-e', childScript, file, String(preferred)], { stdio: 'ignore' });
      try {
        await waitForLeaseFile(file);
        child.kill(signal);
        await waitForExit(child);
        const lease = reserveProxyPortLease({ preferredPort: preferred });
        try {
          expect(lease.port).toBe(preferred);
          expect(isPortAvailableForTest(lease.port)).toBe(true);
        } finally {
          lease.release();
        }
      } finally {
        if (child.exitCode === null) child.kill('SIGKILL');
        try { fs.unlinkSync(file); } catch { /* idempotent explicit scratch cleanup */ }
      }
    }
  });
});
