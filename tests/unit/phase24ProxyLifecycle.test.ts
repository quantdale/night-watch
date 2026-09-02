import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  PROXY_PORT_LEASE_SCHEMA,
  ensureProxyPortLease,
  isPortAvailableForTest,
  proxyLeaseFileForTest,
  proxyPortCandidates,
  releaseProxyPortLease,
  reserveProxyPortLease,
} from '../../src/proxy/portLease';

// R-11: the allocator's contract, stated once. A preferred port is a
// PREFERENCE, so a lease is correct when it owns an admissible candidate from
// the bounded search space and reports truthfully which of the two outcomes
// occurred. The previous form of this suite asserted `lease.port === preferred`
// after seeding `preferred` from `process.pid`, which made a required
// quality-gate group fail whenever an unrelated process held that endpoint
// (OBS-C105-1). Exhaustive deterministic coverage of every availability and
// lease-state case lives in `proxyPortLeaseDeterminism.test.ts`; this suite
// keeps the REAL operating-system TCP coverage.
function expectAdmissibleLease(lease: { port: number; candidateOffset: number | null; preferredOutcome: string }, preferred: number): void {
  expect(proxyPortCandidates(preferred)).toContain(lease.port);
  expect(lease.candidateOffset).not.toBeNull();
  expect(lease.port).toBe(proxyPortCandidates(preferred)[lease.candidateOffset as number]);
  expect(lease.preferredOutcome).toBe(lease.port === preferred ? 'PREFERRED_REUSED' : 'PREFERRED_UNAVAILABLE_ADVANCED');
}

function listenOnLoopback(port: number): Promise<net.Server | null> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(null));
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

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
        expectAdmissibleLease(lease, preferred);
        expect(lease.port).not.toBe(preferred);
        expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
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
    // Fixed dedicated candidates, NOT derived from `process.pid`: the port is no
    // longer an input the test gambles on, because the assertion no longer
    // requires the preferred number.
    for (const [index, signal] of (['SIGTERM', 'SIGINT'] as const).entries()) {
      const preferred = 21800 + index * 64;
      const file = proxyLeaseFileForTest(preferred);
      try { fs.unlinkSync(file); } catch { /* stale scratch cleanup is bounded */ }
      const child = spawn(process.execPath, ['-e', childScript, file, String(preferred)], { stdio: 'ignore' });
      try {
        await waitForLeaseFile(file);
        const orphanRecord = JSON.parse(fs.readFileSync(file, 'utf8'));
        expect(orphanRecord.schemaVersion).toBe(PROXY_PORT_LEASE_SCHEMA);
        expect(orphanRecord.pid).toBe(child.pid);
        child.kill(signal);
        await waitForExit(child);

        const lease = reserveProxyPortLease({ preferredPort: preferred });
        try {
          // The load-bearing properties: the orphan is no longer owned by the
          // dead child, the lease we hold is a real owned lease on an
          // admissible candidate, and the endpoint really is available under
          // the OS. Which candidate we landed on is host state, not a defect.
          expectAdmissibleLease(lease, preferred);
          expect(isPortAvailableForTest(lease.port)).toBe(true);
          const record = JSON.parse(fs.readFileSync(lease.file, 'utf8'));
          expect(record.pid).toBe(process.pid);
          expect(record.token).toBe(lease.token);
          expect(record.token).not.toBe('c'.repeat(24));
          if (lease.port === preferred) {
            // Reclaimed the orphan in place.
            expect(lease.file).toBe(file);
            expect(lease.preferredOutcome).toBe('PREFERRED_REUSED');
          } else {
            // Advanced past an endpoint the OS says is occupied. The orphan
            // record must still have been reclaimed rather than left owned by a
            // dead pid.
            expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
            expect(fs.existsSync(file)).toBe(false);
          }
        } finally {
          lease.release();
        }
      } finally {
        if (child.exitCode === null) child.kill('SIGKILL');
        try { fs.unlinkSync(file); } catch { /* idempotent explicit scratch cleanup */ }
      }
    }
  });

  test('an orphan lease over an endpoint a REAL listener holds is reclaimed and allocation advances', async () => {
    // The OBS-C105-1 case against the real operating-system TCP stack rather
    // than a simulated availability decision. This is the integration half of
    // the deterministic coverage: it proves `portAvailable` genuinely refuses
    // an occupied endpoint, which no injected predicate can prove.
    // The occupied precondition is established BY CONSTRUCTION rather than by
    // guessing a port and hoping: bind port 0, let the OS choose, and keep that
    // socket open for the whole test. There is no close-then-assume-free window
    // here, so no time-of-check/time-of-use race — the endpoint is genuinely
    // held by us at the instant the allocator probes it.
    const occupier = await listenOnLoopback(0);
    expect(occupier, 'R11_LOOPBACK_LISTENER_UNAVAILABLE').not.toBeNull();
    const server = occupier as net.Server;
    const address = server.address();
    expect(typeof address === 'object' && address !== null).toBe(true);
    const preferred = (address as net.AddressInfo).port;
    const file = proxyLeaseFileForTest(preferred);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    try { fs.unlinkSync(file); } catch { /* stale scratch cleanup is bounded */ }
    // Plant an orphan lease owned by a reaped pid over the occupied endpoint.
    const reaped = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
    await waitForExit(reaped);
    fs.writeFileSync(file, JSON.stringify({ schemaVersion: PROXY_PORT_LEASE_SCHEMA, pid: reaped.pid, port: preferred, token: 'e'.repeat(24) }), { mode: 0o600 });
    let lease;
    try {
      lease = reserveProxyPortLease({ preferredPort: preferred });
      expect(lease.port).not.toBe(preferred);
      expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
      expectAdmissibleLease(lease, preferred);
      // The occupied candidate keeps no lease file, and our lease is real.
      expect(fs.existsSync(file)).toBe(false);
      expect(isPortAvailableForTest(lease.port)).toBe(true);
    } finally {
      lease?.release();
      await closeServer(server);
      try { fs.unlinkSync(file); } catch { /* idempotent explicit scratch cleanup */ }
      for (const port of proxyPortCandidates(preferred)) {
        try { fs.unlinkSync(proxyLeaseFileForTest(port)); } catch { /* idempotent */ }
      }
    }
  });
});
