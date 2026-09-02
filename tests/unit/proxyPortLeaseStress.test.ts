// R-11 — bounded proxy port-lease stress campaign.
//
// This is SUPPORTING evidence only. The primary evidence that OBS-C105-1 is
// closed is the deterministic adversarial suite in
// `proxyPortLeaseDeterminism.test.ts`, because "ran many times and happened not
// to fail" is not a proof about a race — it is a sample. Stress is here to
// catch what a deterministic case cannot model: real cross-process contention,
// real kernel port state, and cleanup behavior over many cycles.
//
// Every iteration count below is fixed and asserted, so the recorded evidence
// says exactly how much was executed rather than "a lot".

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  isPortAvailableForTest,
  proxyLeaseFileForTest,
  proxyPortCandidates,
  reserveProxyPortLease,
  reserveProxyPortLeaseWithAvailabilityForTest,
} from '../../src/proxy/portLease';

// Exact, asserted iteration counts.
const ITERATIONS = {
  realAllocateRelease: 200,
  parallelRounds: 4,
  parallelWorkersPerRound: 6,
  occupiedPreferred: 120,
  childCrashCycles: 60,
  simulatedReclaimCycles: 1_000,
} as const;

const BAND = {
  realCycles: 44000,
  parallel: 44064,
  occupied: 44128,
  childCrash: 44192,
  simulated: 44256,
} as const;

function unlinkQuietly(file: string): void {
  try { fs.unlinkSync(file); } catch { /* idempotent explicit scratch cleanup */ }
}

function clearBand(preferred: number): void {
  for (const port of proxyPortCandidates(preferred)) unlinkQuietly(proxyLeaseFileForTest(port));
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

function waitForExit(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('R11_STRESS_CHILD_EXIT_TIMEOUT')), 15_000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

test.describe('R-11 bounded proxy-lease stress campaign', () => {
  test(`${ITERATIONS.realAllocateRelease} real allocate/release cycles leak no lease and never reuse a held port`, () => {
    const preferred = BAND.realCycles;
    clearBand(preferred);
    let completed = 0;
    const held = new Set<string>();
    try {
      for (let iteration = 0; iteration < ITERATIONS.realAllocateRelease; iteration += 1) {
        const lease = reserveProxyPortLease({ preferredPort: preferred });
        // While we hold it, no concurrent claim on the same file may exist.
        expect(held.has(lease.file)).toBe(false);
        held.add(lease.file);
        expect(proxyPortCandidates(preferred)).toContain(lease.port);
        lease.release();
        held.delete(lease.file);
        expect(fs.existsSync(lease.file)).toBe(false);
        completed += 1;
      }
      expect(completed).toBe(ITERATIONS.realAllocateRelease);
      // No scratch left anywhere in the band after the campaign.
      for (const port of proxyPortCandidates(preferred)) {
        expect(fs.existsSync(proxyLeaseFileForTest(port))).toBe(false);
      }
    } finally {
      clearBand(preferred);
    }
  });

  test(`${ITERATIONS.parallelRounds} rounds of ${ITERATIONS.parallelWorkersPerRound} parallel cross-process allocators never double-assign a port`, async () => {
    const preferred = BAND.parallel;
    clearBand(preferred);
    const childEntry = path.resolve(__dirname, 'support', 'portLeaseChild.mjs');
    let rounds = 0;
    try {
      for (let round = 0; round < ITERATIONS.parallelRounds; round += 1) {
        const children: ReturnType<typeof spawn>[] = [];
        try {
          for (let worker = 0; worker < ITERATIONS.parallelWorkersPerRound; worker += 1) {
            children.push(spawn(process.execPath, [childEntry, String(preferred)], { stdio: ['ignore', 'pipe', 'pipe'] }));
          }
          const ports = await Promise.all(children.map((child) => new Promise<number>((resolve, reject) => {
            let out = '';
            const timer = setTimeout(() => reject(new Error('R11_STRESS_PARALLEL_TIMEOUT')), 60_000);
            child.stdout?.on('data', (chunk) => {
              out += String(chunk);
              const match = /R11_LEASE_PORT=(\d+)/.exec(out);
              if (match) { clearTimeout(timer); resolve(Number(match[1])); }
            });
            child.once('exit', (code) => { if (code !== null && code !== 0) { clearTimeout(timer); reject(new Error(`R11_STRESS_PARALLEL_EXIT_${String(code)}`)); } });
            child.once('error', (error) => { clearTimeout(timer); reject(error); });
          })));
          // The load-bearing property under real contention: distinct ports.
          expect(new Set(ports).size).toBe(ITERATIONS.parallelWorkersPerRound);
          for (const port of ports) expect(proxyPortCandidates(preferred)).toContain(port);
        } finally {
          for (const child of children) child.kill('SIGTERM');
          await Promise.all(children.map((child) => waitForExit(child).catch(() => undefined)));
        }
        rounds += 1;
        clearBand(preferred);
      }
      expect(rounds).toBe(ITERATIONS.parallelRounds);
    } finally {
      clearBand(preferred);
    }
  });

  test(`${ITERATIONS.occupiedPreferred} allocations against a REAL listener on the preferred endpoint always advance`, async () => {
    // The precondition is held by construction for the entire campaign: one
    // socket, bound to an OS-chosen port, never closed until the end. So every
    // iteration genuinely faces an occupied preferred endpoint.
    const occupier = await listenOnLoopback(0);
    expect(occupier, 'R11_LOOPBACK_LISTENER_UNAVAILABLE').not.toBeNull();
    const server = occupier as net.Server;
    const preferred = (server.address() as net.AddressInfo).port;
    clearBand(preferred);
    let advanced = 0;
    try {
      for (let iteration = 0; iteration < ITERATIONS.occupiedPreferred; iteration += 1) {
        const lease = reserveProxyPortLease({ preferredPort: preferred });
        try {
          expect(lease.port).not.toBe(preferred);
          expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
          expect(isPortAvailableForTest(lease.port)).toBe(true);
          // The refused candidate never keeps a lease file.
          expect(fs.existsSync(proxyLeaseFileForTest(preferred))).toBe(false);
          advanced += 1;
        } finally {
          lease.release();
        }
      }
      expect(advanced).toBe(ITERATIONS.occupiedPreferred);
    } finally {
      await closeServer(server);
      clearBand(preferred);
    }
  });

  test(`${ITERATIONS.childCrashCycles} child crashes between lease creation and release stay reclaimable`, async () => {
    const preferred = BAND.childCrash;
    clearBand(preferred);
    const crashScript = [
      "const fs=require('node:fs');",
      "const path=require('node:path');",
      'const file=process.argv[1];',
      'const port=Number(process.argv[2]);',
      'fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});',
      "fs.writeFileSync(file,JSON.stringify({schemaVersion:'nightwatch.proxy-port-lease.v1',pid:process.pid,port,token:'f'.repeat(24)}),{mode:0o600});",
      // Crash immediately AFTER writing the lease and BEFORE any release.
      'process.exit(9);',
    ].join('');
    const file = proxyLeaseFileForTest(preferred);
    let reclaimed = 0;
    try {
      for (let iteration = 0; iteration < ITERATIONS.childCrashCycles; iteration += 1) {
        const child = spawn(process.execPath, ['-e', crashScript, file, String(preferred)], { stdio: 'ignore' });
        await waitForExit(child);
        expect(fs.existsSync(file)).toBe(true);
        // Simulated availability keeps this loop about RECLAMATION rather than
        // about which port the kernel happened to have free.
        const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: () => true });
        try {
          expect(lease.port).toBe(preferred);
          expect(lease.preferredOutcome).toBe('PREFERRED_REUSED');
          const record = JSON.parse(fs.readFileSync(lease.file, 'utf8'));
          expect(record.pid).toBe(process.pid);
          expect(record.token).toBe(lease.token);
          expect(record.token).not.toBe('f'.repeat(24));
          reclaimed += 1;
        } finally {
          lease.release();
        }
      }
      expect(reclaimed).toBe(ITERATIONS.childCrashCycles);
    } finally {
      clearBand(preferred);
    }
  });

  test(`${ITERATIONS.simulatedReclaimCycles} rapid reclaim cycles remain deterministic`, () => {
    const preferred = BAND.simulated;
    clearBand(preferred);
    const ports = new Set<number>();
    let cycles = 0;
    try {
      for (let iteration = 0; iteration < ITERATIONS.simulatedReclaimCycles; iteration += 1) {
        const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: () => true });
        ports.add(lease.port);
        lease.release();
        cycles += 1;
      }
      expect(cycles).toBe(ITERATIONS.simulatedReclaimCycles);
      // Deterministic: every cycle reclaims the same candidate, so the port set
      // is a singleton. A flaky allocator would show drift here.
      expect([...ports]).toEqual([preferred]);
    } finally {
      clearBand(preferred);
    }
  });
});
