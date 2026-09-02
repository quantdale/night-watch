// R-11 — deterministic adversarial proxy port-lease coverage (OBS-C105-1).
//
// The defect this suite exists to prevent was NOT an allocator defect. The
// allocator correctly treats the preferred port as a preference and advances
// when its TCP endpoint is occupied; the previous lifecycle case asserted
// `lease.port === preferred` and seeded that port from `process.pid`, so its
// result was a function of unrelated host state rather than of repository
// content.
//
// The repair is determinism at BOTH ends: the availability decision is
// simulated exactly through the TEST-ONLY seam (same allocator core as
// production), and the assertions state the allocator's real contract via
// `preferredOutcome` rather than either the false stronger property or a
// uselessly weak one. Real-OS-TCP coverage is retained separately in
// `phase24ProxyLifecycle.test.ts`.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  PROXY_PORT_LEASE_SCHEMA,
  isProcessAliveForTest,
  proxyLeaseFileForTest,
  proxyPortCandidates,
  reserveProxyPortLeaseWithAvailabilityForTest,
} from '../../src/proxy/portLease';

const CANDIDATE_COUNT = 32;

// Distinct 64-wide bands keep the cases independent inside the one system-temp
// lease namespace, which is deliberately shared across clones and worktrees.
const BAND = {
  candidateZeroAvailable: 43000,
  candidateZeroOccupied: 43064,
  boundedPrefixOccupied: 43128,
  liveLeaseForeign: 43192,
  orphanLease: 43256,
  malformedLease: 43320,
  symlinkLease: 43384,
  exhaustion: 43448,
  sequentialCollision: 43512,
  releaseCycle: 43576,
  tokenMismatch: 43640,
  childDeath: 43704,
  signals: 43768,
} as const;

const ALWAYS_AVAILABLE = () => true;
const NEVER_AVAILABLE = () => false;

function unlinkQuietly(file: string): void {
  try { fs.unlinkSync(file); } catch { /* idempotent explicit scratch cleanup */ }
}

function clearBand(preferred: number): void {
  for (const port of proxyPortCandidates(preferred)) unlinkQuietly(proxyLeaseFileForTest(port));
}

function writeLeaseRecord(port: number, pid: number, token = 'a'.repeat(24)): string {
  const file = proxyLeaseFileForTest(port);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  unlinkQuietly(file);
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: PROXY_PORT_LEASE_SCHEMA, pid, port, token }), { mode: 0o600 });
  return file;
}

function writeRawLeaseState(port: number, contents: string): string {
  const file = proxyLeaseFileForTest(port);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  unlinkQuietly(file);
  fs.writeFileSync(file, contents, { mode: 0o600 });
  return file;
}

/** A pid that is certainly dead: spawn a child, then reap it. */
function reapedPid(): number {
  const child = spawnSync(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore', timeout: 10_000 });
  const pid = child.pid;
  expect(Number.isInteger(pid) && (pid as number) > 0).toBe(true);
  return pid as number;
}

const LEASE_CHILD_SCRIPT = [
  "const fs=require('node:fs');",
  "const path=require('node:path');",
  'const file=process.argv[1];',
  'const port=Number(process.argv[2]);',
  'fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});',
  "fs.writeFileSync(file,JSON.stringify({schemaVersion:'nightwatch.proxy-port-lease.v1',pid:process.pid,port,token:'c'.repeat(24)}),{mode:0o600});",
  // Signal readiness EXPLICITLY, after the lease exists. The parent then waits
  // for an observable event instead of polling the filesystem against a
  // deadline, so no assertion depends on how quickly a child starts.
  "process.stdout.write('R11_CHILD_READY\\n');",
  "process.on('SIGTERM',()=>process.exit(0));",
  "process.on('SIGINT',()=>process.exit(0));",
  'setInterval(()=>{},1000);',
].join('');

// The bounds below are LIVENESS guards, not correctness thresholds: they exist
// so a hung child fails its own test instead of hanging the suite. Nothing
// asserted here depends on the elapsed time, which is why they are generous.
// A short deadline in this position was load-sensitive — it failed once under
// the clean gate's load and passed otherwise, which is precisely the kind of
// result that carries no information about the code.
const CHILD_LIVENESS_BUDGET_MS = 60_000;

function waitForChildReady(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    let seen = '';
    const timer = setTimeout(() => finish(new Error('R11_LEASE_CHILD_READY_TIMEOUT')), CHILD_LIVENESS_BUDGET_MS);
    const onData = (chunk: unknown) => {
      seen += String(chunk);
      if (seen.includes('R11_CHILD_READY')) finish();
    };
    const onExit = (code: number | null) => finish(new Error(`R11_LEASE_CHILD_EXITED_BEFORE_READY_${String(code)}`));
    function finish(error?: Error) {
      clearTimeout(timer);
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
      if (error) reject(error); else resolve();
    }
    child.stdout?.on('data', onData);
    child.on('exit', onExit);
  });
}

function waitForExit(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) { resolve(); return; }
    const timer = setTimeout(() => reject(new Error('R11_LEASE_CHILD_EXIT_TIMEOUT')), CHILD_LIVENESS_BUDGET_MS);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

test.describe('R-11 pure bounded candidate selection', () => {
  test('candidate selection is a pure function of the preferred port alone', () => {
    const first = proxyPortCandidates(30000);
    const second = proxyPortCandidates(30000);
    expect([...first]).toEqual([...second]);
    expect(first).toHaveLength(CANDIDATE_COUNT);
    expect(first[0]).toBe(30000);
    // Consecutive, so the "advanced" outcome is a bounded neighbour rather than
    // an arbitrary reassignment.
    expect([...first]).toEqual(Array.from({ length: CANDIDATE_COUNT }, (_, offset) => 30000 + offset));
  });

  test('the search space is bounded and wraps inside the legal port range', () => {
    const candidates = proxyPortCandidates(65530);
    expect(candidates).toHaveLength(CANDIDATE_COUNT);
    for (const port of candidates) {
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThanOrEqual(1024);
      expect(port).toBeLessThanOrEqual(65535);
    }
    // The wrap actually happens in this band rather than being asserted
    // vacuously over a range that never reaches the ceiling.
    expect(candidates.some((port) => port < 65530)).toBe(true);
  });

  test('an invalid preferred port fails closed before any filesystem work', () => {
    for (const invalid of [0, 1023, 65536, -1, 1.5, Number.NaN]) {
      expect(() => proxyPortCandidates(invalid)).toThrow(/PROXY_PORT_PREFERRED_INVALID/);
    }
  });
});

test.describe('R-11 deterministic availability outcomes', () => {
  test('candidate 0 available yields the preferred port and reports PREFERRED_REUSED', () => {
    const preferred = BAND.candidateZeroAvailable;
    clearBand(preferred);
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    try {
      expect(lease.port).toBe(preferred);
      expect(lease.candidateOffset).toBe(0);
      expect(lease.preferredOutcome).toBe('PREFERRED_REUSED');
      expect(fs.existsSync(lease.file)).toBe(true);
      expect(JSON.parse(fs.readFileSync(lease.file, 'utf8')).pid).toBe(process.pid);
    } finally {
      lease.release();
      clearBand(preferred);
    }
  });

  test('candidate 0 occupied advances exactly one candidate and reports PREFERRED_UNAVAILABLE_ADVANCED', () => {
    const preferred = BAND.candidateZeroOccupied;
    clearBand(preferred);
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({
      preferredPort: preferred,
      available: (port) => port !== preferred,
    });
    try {
      // This is the case the old assertion called a failure. It is correct
      // behavior, and it is now asserted as correct behavior.
      expect(lease.port).toBe(preferred + 1);
      expect(lease.candidateOffset).toBe(1);
      expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
      // The rejected candidate must not keep the lease the allocator created
      // for it while probing.
      expect(fs.existsSync(proxyLeaseFileForTest(preferred))).toBe(false);
    } finally {
      lease.release();
      clearBand(preferred);
    }
  });

  test('candidates 0..N occupied advance to the first admissible candidate', () => {
    const preferred = BAND.boundedPrefixOccupied;
    clearBand(preferred);
    const occupiedPrefix = 11;
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({
      preferredPort: preferred,
      available: (port) => port >= preferred + occupiedPrefix,
    });
    try {
      expect(lease.port).toBe(preferred + occupiedPrefix);
      expect(lease.candidateOffset).toBe(occupiedPrefix);
      expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
      for (let offset = 0; offset < occupiedPrefix; offset += 1) {
        expect(fs.existsSync(proxyLeaseFileForTest(preferred + offset))).toBe(false);
      }
    } finally {
      lease.release();
      clearBand(preferred);
    }
  });

  test('a fully occupied bounded space fails closed and leaves no lease behind', () => {
    const preferred = BAND.exhaustion;
    clearBand(preferred);
    try {
      expect(() => reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: NEVER_AVAILABLE }))
        .toThrow('PROXY_PORT_LEASE_EXHAUSTED');
      // Bounded, not unbounded: exactly the candidate list was tried, and every
      // speculative lease was cleaned up rather than leaked.
      for (const port of proxyPortCandidates(preferred)) {
        expect(fs.existsSync(proxyLeaseFileForTest(port))).toBe(false);
      }
    } finally {
      clearBand(preferred);
    }
  });
});

test.describe('R-11 lease-state admissibility, deterministically', () => {
  test('a lease owned by a LIVE foreign process is never deleted and allocation advances', async () => {
    const preferred = BAND.liveLeaseForeign;
    clearBand(preferred);
    const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    const file = writeLeaseRecord(preferred, child.pid as number);
    const before = fs.readFileSync(file, 'utf8');
    expect(isProcessAliveForTest(child.pid as number)).toBe(true);
    let lease;
    try {
      lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
      expect(lease.port).toBe(preferred + 1);
      expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
      expect(fs.readFileSync(file, 'utf8')).toBe(before);
    } finally {
      lease?.release();
      child.kill('SIGKILL');
      await waitForExit(child).catch(() => undefined);
      clearBand(preferred);
    }
  });

  test('an ORPHAN lease whose owner is dead is reclaimed and the preferred candidate reused', () => {
    const preferred = BAND.orphanLease;
    clearBand(preferred);
    const file = writeLeaseRecord(preferred, reapedPid());
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    try {
      expect(lease.port).toBe(preferred);
      expect(lease.preferredOutcome).toBe('PREFERRED_REUSED');
      expect(lease.file).toBe(file);
      // Reclaimed means re-owned, not merely deleted.
      expect(JSON.parse(fs.readFileSync(file, 'utf8')).pid).toBe(process.pid);
      expect(JSON.parse(fs.readFileSync(file, 'utf8')).token).toBe(lease.token);
    } finally {
      lease.release();
      clearBand(preferred);
    }
  });

  test('MALFORMED lease state is preserved rather than deleted, and allocation advances', () => {
    const preferred = BAND.malformedLease;
    clearBand(preferred);
    const malformed = '{ this is not a lease record';
    const file = writeRawLeaseState(preferred, malformed);
    let lease;
    try {
      lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
      expect(lease.port).toBe(preferred + 1);
      expect(lease.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
      // Fail closed: suspicious scratch is left for the owner to inspect.
      expect(fs.readFileSync(file, 'utf8')).toBe(malformed);
    } finally {
      lease?.release();
      clearBand(preferred);
    }
  });

  test('a well-formed record with a bad schema, port or token is treated as suspicious, not reclaimable', () => {
    const preferred = BAND.malformedLease + 20;
    clearBand(preferred);
    const cases = [
      JSON.stringify({ schemaVersion: 'nightwatch.proxy-port-lease.v0', pid: reapedPid(), port: preferred, token: 'a'.repeat(24) }),
      JSON.stringify({ schemaVersion: PROXY_PORT_LEASE_SCHEMA, pid: reapedPid(), port: 80, token: 'a'.repeat(24) }),
      JSON.stringify({ schemaVersion: PROXY_PORT_LEASE_SCHEMA, pid: reapedPid(), port: preferred, token: 'NOT-HEX' }),
    ];
    for (const contents of cases) {
      const file = writeRawLeaseState(preferred, contents);
      let lease;
      try {
        lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
        expect(lease.port).toBe(preferred + 1);
        expect(fs.readFileSync(file, 'utf8')).toBe(contents);
      } finally {
        lease?.release();
        unlinkQuietly(file);
        unlinkQuietly(proxyLeaseFileForTest(preferred + 1));
      }
    }
    clearBand(preferred);
  });

  test('SYMLINK lease state is never deleted or written through, and allocation advances', () => {
    const preferred = BAND.symlinkLease;
    clearBand(preferred);
    const file = proxyLeaseFileForTest(preferred);
    const target = path.join(os.tmpdir(), `nightwatch-r11-symlink-${process.pid}-${preferred}`);
    fs.writeFileSync(target, 'R11_SENTINEL_UNTOUCHED', { mode: 0o600 });
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    unlinkQuietly(file);
    fs.symlinkSync(target, file);
    let lease;
    try {
      lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
      expect(lease.port).toBe(preferred + 1);
      expect(fs.lstatSync(file).isSymbolicLink()).toBe(true);
      // The symlink target must not have been opened for writing through the link.
      expect(fs.readFileSync(target, 'utf8')).toBe('R11_SENTINEL_UNTOUCHED');
    } finally {
      lease?.release();
      unlinkQuietly(file);
      unlinkQuietly(target);
      clearBand(preferred);
    }
  });
});

test.describe('R-11 ownership, release and concurrency', () => {
  test('a second allocator in the same namespace cannot take a held lease', () => {
    const preferred = BAND.sequentialCollision;
    clearBand(preferred);
    const first = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    const second = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    try {
      expect(first.port).toBe(preferred);
      expect(second.port).toBe(preferred + 1);
      expect(first.token).not.toBe(second.token);
      expect(first.preferredOutcome).toBe('PREFERRED_REUSED');
      expect(second.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
    } finally {
      first.release();
      second.release();
      clearBand(preferred);
    }
  });

  test('release removes only the owned lease and is idempotent', () => {
    const preferred = BAND.releaseCycle;
    clearBand(preferred);
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    // A foreign LIVE lease on the neighbouring candidate must survive our release.
    const foreignFile = writeLeaseRecord(preferred + 1, process.pid, 'b'.repeat(24));
    const foreignBefore = fs.readFileSync(foreignFile, 'utf8');
    lease.release();
    expect(fs.existsSync(lease.file)).toBe(false);
    lease.release();
    expect(fs.existsSync(lease.file)).toBe(false);
    expect(fs.readFileSync(foreignFile, 'utf8')).toBe(foreignBefore);
    unlinkQuietly(foreignFile);
    clearBand(preferred);
  });

  test('release refuses to delete a lease whose token no longer matches', () => {
    const preferred = BAND.tokenMismatch;
    clearBand(preferred);
    const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
    try {
      // Someone else re-owned this port with a different token.
      writeLeaseRecord(lease.port, process.pid, 'd'.repeat(24));
      const before = fs.readFileSync(lease.file, 'utf8');
      lease.release();
      expect(fs.existsSync(lease.file)).toBe(true);
      expect(fs.readFileSync(lease.file, 'utf8')).toBe(before);
    } finally {
      unlinkQuietly(proxyLeaseFileForTest(preferred));
      clearBand(preferred);
    }
  });

  test('repeated allocate/release cycles leave the namespace clean', () => {
    const preferred = BAND.releaseCycle + 20;
    clearBand(preferred);
    const seen: number[] = [];
    for (let cycle = 0; cycle < 24; cycle += 1) {
      const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
      seen.push(lease.port);
      lease.release();
      expect(fs.existsSync(lease.file)).toBe(false);
    }
    // Deterministic: every cycle reclaims the same preferred candidate, because
    // the previous cycle released it.
    expect(new Set(seen)).toEqual(new Set([preferred]));
    clearBand(preferred);
  });

  test('parallel cross-process allocators on one preferred port receive distinct ports', async () => {
    const preferred = BAND.sequentialCollision + 20;
    clearBand(preferred);
    const workerCount = 6;
    // The children use the PRODUCTION allocator against the real OS, so this
    // case is cross-process and real-TCP rather than a simulation.
    const childEntry = path.resolve(__dirname, 'support', 'portLeaseChild.mjs');
    const children = [];
    try {
      for (let index = 0; index < workerCount; index += 1) {
        children.push(spawn(process.execPath, [childEntry, String(preferred)], { stdio: ['ignore', 'pipe', 'pipe'] }));
      }
      const ports = await Promise.all(children.map((child) => new Promise<number>((resolve, reject) => {
        let out = '';
        const timer = setTimeout(() => reject(new Error('R11_PARALLEL_CHILD_TIMEOUT')), CHILD_LIVENESS_BUDGET_MS);
        child.stdout?.on('data', (chunk) => {
          out += String(chunk);
          const match = /R11_LEASE_PORT=(\d+)/.exec(out);
          if (match) { clearTimeout(timer); resolve(Number(match[1])); }
        });
        child.once('exit', (code) => { if (code !== null && code !== 0) { clearTimeout(timer); reject(new Error(`R11_PARALLEL_CHILD_EXIT_${String(code)}`)); } });
        child.once('error', (error) => { clearTimeout(timer); reject(error); });
      })));
      expect(ports).toHaveLength(workerCount);
      expect(new Set(ports).size).toBe(workerCount);
      for (const port of ports) expect(proxyPortCandidates(preferred)).toContain(port);
    } finally {
      for (const child of children) child.kill('SIGKILL');
      await Promise.all(children.map((child) => waitForExit(child).catch(() => undefined)));
      clearBand(preferred);
    }
  });
});

test.describe('R-11 child lifecycle and signal reclamation', () => {
  test('abnormal child death (SIGKILL) leaves reclaimable orphan state only', async () => {
    const preferred = BAND.childDeath;
    clearBand(preferred);
    const file = proxyLeaseFileForTest(preferred);
    const child = spawn(process.execPath, ['-e', LEASE_CHILD_SCRIPT, file, String(preferred)], { stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      await waitForChildReady(child);
      expect(fs.existsSync(file)).toBe(true);
      child.kill('SIGKILL');
      await waitForExit(child);
      const lease = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
      try {
        expect(lease.port).toBe(preferred);
        expect(lease.preferredOutcome).toBe('PREFERRED_REUSED');
        expect(JSON.parse(fs.readFileSync(lease.file, 'utf8')).pid).toBe(process.pid);
      } finally {
        lease.release();
      }
    } finally {
      if (child.exitCode === null) child.kill('SIGKILL');
      clearBand(preferred);
    }
  });

  for (const [index, signal] of (['SIGTERM', 'SIGINT'] as const).entries()) {
    test(`${signal} during a child setup leaves reclaimable orphan state only`, async () => {
      const preferred = BAND.signals + index * 20;
      clearBand(preferred);
      const file = proxyLeaseFileForTest(preferred);
      const child = spawn(process.execPath, ['-e', LEASE_CHILD_SCRIPT, file, String(preferred)], { stdio: ['ignore', 'pipe', 'ignore'] });
      try {
        await waitForChildReady(child);
        expect(fs.existsSync(file)).toBe(true);
        child.kill(signal);
        await waitForExit(child);
        expect(isProcessAliveForTest(child.pid as number)).toBe(false);

        // With the endpoint admissible the orphan is reclaimed and the preferred
        // candidate reused.
        const reused = reserveProxyPortLeaseWithAvailabilityForTest({ preferredPort: preferred, available: ALWAYS_AVAILABLE });
        try {
          expect(reused.port).toBe(preferred);
          expect(reused.preferredOutcome).toBe('PREFERRED_REUSED');
        } finally {
          reused.release();
        }

        // And with the SAME orphan state but the endpoint occupied, advancing is
        // the CORRECT outcome — the exact case the previous assertion called a
        // failure (OBS-C105-1).
        const child2 = spawn(process.execPath, ['-e', LEASE_CHILD_SCRIPT, file, String(preferred)], { stdio: ['ignore', 'pipe', 'ignore'] });
        await waitForChildReady(child2);
        child2.kill(signal);
        await waitForExit(child2);
        const advanced = reserveProxyPortLeaseWithAvailabilityForTest({
          preferredPort: preferred,
          available: (port) => port !== preferred,
        });
        try {
          expect(advanced.port).not.toBe(preferred);
          expect(advanced.port).toBe(preferred + 1);
          expect(advanced.preferredOutcome).toBe('PREFERRED_UNAVAILABLE_ADVANCED');
          expect(fs.existsSync(proxyLeaseFileForTest(preferred))).toBe(false);
        } finally {
          advanced.release();
        }
      } finally {
        if (child.exitCode === null) child.kill('SIGKILL');
        clearBand(preferred);
      }
    });
  }
});
