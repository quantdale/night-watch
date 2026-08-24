// Deterministic, process-owned loopback port leases for Nightwatch's test
// proxy. This is test infrastructure only; it never changes product routes
// or outbound policy. Lease files are local scratch under .tmp-nightwatch.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

export const PROXY_PORT_LEASE_SCHEMA = 'nightwatch.proxy-port-lease.v1' as const;
const DEFAULT_LEASE_ROOT = path.resolve(__dirname, '..', '..', '..');
// A system-temp namespace coordinates separate disposable clones/worktrees;
// repository-local scratch alone cannot see another checkout's lease.
const LEASE_DIR = path.join(os.tmpdir(), 'nightwatch-proxy-port-leases');
const CANDIDATE_COUNT = 32;
const TOKEN_RE = /^[a-f0-9]{24}$/;
export const PROXY_PORT_LEASE_OWNER_ENV = 'NIGHTWATCH_PROXY_LEASE_OWNER_PID' as const;

export interface ProxyPortLease {
  readonly schemaVersion: typeof PROXY_PORT_LEASE_SCHEMA;
  readonly port: number;
  readonly token: string;
  readonly file: string;
  readonly release: () => void;
}

interface LeaseRecord {
  schemaVersion: typeof PROXY_PORT_LEASE_SCHEMA;
  pid: number;
  port: number;
  token: string;
}

function leaseDirectory(root: string): string {
  void root;
  return LEASE_DIR;
}

function leaseFile(root: string, port: number): string {
  return path.join(leaseDirectory(root), `proxy-${port}.lease.json`);
}

function validPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readLease(file: string): LeaseRecord | null {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<LeaseRecord>;
    const pid = parsed.pid;
    const port = parsed.port;
    const token = parsed.token;
    if (parsed.schemaVersion !== PROXY_PORT_LEASE_SCHEMA || typeof pid !== 'number' || !Number.isInteger(pid) || typeof port !== 'number' || !validPort(port) || typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
    return parsed as LeaseRecord;
  } catch {
    return null;
  }
}

function portAvailable(port: number): boolean {
  // A short-lived real TCP bind makes the occupied-port behavior observable
  // on Linux and macOS without pretending to simulate an operating system.
  const probe = `const net=require('node:net');const s=net.createServer();s.once('error',()=>process.exit(1));s.listen(Number(process.argv[1]),'127.0.0.1',()=>s.close(()=>process.exit(0)));`;
  const result = spawnSync(process.execPath, ['-e', probe, String(port)], {
    stdio: 'ignore',
    timeout: 2_000,
    windowsHide: true,
  });
  return result.status === 0;
}

function candidatePort(preferred: number, offset: number): number {
  const candidate = preferred + offset;
  return candidate <= 65535 ? candidate : 1024 + ((candidate - 1024) % (65535 - 1024));
}

function releaseLease(file: string, token: string, allowInheritedOwner = false): void {
  try {
    const current = readLease(file);
    if (current?.token === token && (allowInheritedOwner || current.pid === process.pid)) fs.unlinkSync(file);
  } catch {
    // Cleanup is idempotent and never changes a non-owned lease.
  }
}

export function reserveProxyPortLease(options: { root?: string; preferredPort: number }): ProxyPortLease {
  const root = options.root ?? DEFAULT_LEASE_ROOT;
  const preferredPort = options.preferredPort;
  if (!validPort(preferredPort)) throw new Error(`PROXY_PORT_PREFERRED_INVALID:${String(preferredPort)}`);
  fs.mkdirSync(leaseDirectory(root), { recursive: true, mode: 0o700 });
  for (let offset = 0; offset < CANDIDATE_COUNT; offset += 1) {
    const port = candidatePort(preferredPort, offset);
    const file = leaseFile(root, port);
    const existing = readLease(file);
    if (existing !== null) {
      if (processAlive(existing.pid)) continue;
      try { fs.unlinkSync(file); } catch { continue; }
    } else if (fs.existsSync(file)) {
      // Do not delete malformed or symlinked state. Move to the next bounded
      // candidate and let the owner clean the suspicious scratch file.
      continue;
    }
    const token = crypto.randomBytes(12).toString('hex');
    const record: LeaseRecord = { schemaVersion: PROXY_PORT_LEASE_SCHEMA, pid: process.pid, port, token };
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(file, 'wx', 0o600);
      fs.writeFileSync(descriptor, JSON.stringify(record));
      fs.closeSync(descriptor);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch { /* bounded scratch cleanup */ }
      }
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      throw error;
    }
    if (!portAvailable(port)) {
      try { fs.unlinkSync(file); } catch { /* bounded scratch cleanup */ }
      continue;
    }
    return {
      schemaVersion: PROXY_PORT_LEASE_SCHEMA,
      port,
      token,
      file,
      release: () => releaseLease(file, token),
    };
  }
  throw new Error('PROXY_PORT_LEASE_EXHAUSTED');
}

export function ensureProxyPortLease(root = DEFAULT_LEASE_ROOT, preferredPort: number): ProxyPortLease {
  const token = process.env.NIGHTWATCH_PROXY_LEASE_TOKEN;
  const port = Number(process.env.NIGHTWATCH_PROXY_PORT ?? preferredPort);
  if (TOKEN_RE.test(token ?? '') && validPort(port)) {
    const file = process.env.NIGHTWATCH_PROXY_LEASE_PATH ?? leaseFile(root, port);
    const existing = readLease(file);
    if (existing !== null && existing.token === token && existing.port === port && typeof token === 'string' && (existing.pid === process.pid || processAlive(existing.pid))) {
      // Playwright evaluates its config, global setup, and workers in
      // separate processes. An inherited token is the explicit handoff for
      // the same lease; requiring pid equality here makes the browser keep a
      // URL for one port while global setup binds another.
      return {
        schemaVersion: PROXY_PORT_LEASE_SCHEMA,
        port,
        token,
        file,
        release: () => { if (existing.pid === process.pid) releaseLease(file, token); },
      };
    }
  }
  const lease = reserveProxyPortLease({ root, preferredPort });
  process.env.NIGHTWATCH_PROXY_PORT = String(lease.port);
  process.env.NIGHTWATCH_PROXY_LEASE_TOKEN = lease.token;
  process.env.NIGHTWATCH_PROXY_LEASE_PATH = lease.file;
  return lease;
}

export function releaseProxyPortLease(root = DEFAULT_LEASE_ROOT): void {
  const token = process.env.NIGHTWATCH_PROXY_LEASE_TOKEN;
  const port = Number(process.env.NIGHTWATCH_PROXY_PORT);
  if (typeof token !== 'string' || !TOKEN_RE.test(token) || !validPort(port)) return;
  const ownerPid = Number(process.env[PROXY_PORT_LEASE_OWNER_ENV]);
  if (ownerPid !== process.pid) return;
  releaseLease(process.env.NIGHTWATCH_PROXY_LEASE_PATH ?? leaseFile(root, port), token, true);
  delete process.env.NIGHTWATCH_PROXY_LEASE_TOKEN;
  delete process.env.NIGHTWATCH_PROXY_LEASE_PATH;
  delete process.env[PROXY_PORT_LEASE_OWNER_ENV];
}

export function proxyLeaseRuntimeSuffix(): string {
  const token = process.env.NIGHTWATCH_PROXY_LEASE_TOKEN;
  return typeof token === 'string' && TOKEN_RE.test(token) ? `-${token.slice(0, 12)}` : '';
}

export function isPortAvailableForTest(port: number): boolean {
  return validPort(port) && portAvailable(port);
}

export function isProcessAliveForTest(pid: number): boolean {
  return processAlive(pid);
}

export function proxyLeaseFileForTest(port: number): string {
  return leaseFile(DEFAULT_LEASE_ROOT, port);
}
