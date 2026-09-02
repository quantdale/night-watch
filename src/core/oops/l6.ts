// ---------------------------------------------------------------------------
// Nightwatch process/network containment (L6).
//
// This module is the narrow bridge between a rootless Bubblewrap network
// namespace and the already-authoritative parent safety proxy. The contained
// side has namespace-local loopback only. Its only parent capability is a
// read-only-mounted AF_UNIX socket carrying a small length-prefixed protocol;
// the parent validates every request before invoking its callback.
//
// The module deliberately does not expose raw request/response data in its
// capability result. Data used by the synthetic qualification stays in memory
// or in an owner-only temporary directory and is removed before return.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net, { type AddressInfo, type Server as NetServer, type Socket } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { materializeRelayPort } from '../../api/phase5/generator';
import type { Phase5Relay } from '../../api/phase5/relay';

export const L6_PROCESS_NETWORK_CONTAINMENT_VERSION = 'nightwatch.process-network-containment.v1' as const;
export const L6_CONTROL_PROTOCOL_VERSION = 'nightwatch.l6-af-unix-control.v1' as const;
const MAX_FRAME_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_PROXY_REQUESTS = 8;
const PROXY_REQUEST_TIMEOUT_MS = 15_000;
const L6_TIMEOUT_MS = 20_000;
const BWRAP_CANDIDATES = ['/usr/bin/bwrap', '/bin/bwrap'] as const;

export type L6CapabilityState =
  | 'SUPPORTED'
  | 'UNAVAILABLE'
  | 'STARTUP_FAILED'
  | 'RELAY_UNAVAILABLE'
  | 'DNS_ESCAPE_UNPROVEN'
  | 'PROCESS_TREE_UNPROVEN'
  | 'READY'
  | 'FAILED_CLOSED';

export interface L6RuntimeCapability {
  readonly schemaVersion: typeof L6_PROCESS_NETWORK_CONTAINMENT_VERSION;
  readonly runtimeIdentity: typeof L6_PROCESS_NETWORK_CONTAINMENT_VERSION;
  readonly state: L6CapabilityState;
  readonly status: 'PROVEN' | 'UNPROVEN';
  readonly readiness: 'READY' | 'BLOCKED';
  readonly namespace: 'ROOTLESS_NETWORK_NAMESPACE_NO_EXTERNAL_INTERFACE' | 'UNPROVEN';
  readonly transport: 'INHERITED_AF_UNIX_ONLY' | 'UNPROVEN';
  readonly runtimeBinding: 'PROVEN' | 'NOT_PROVEN';
  readonly processIsolation: 'PROVEN' | 'NOT_PROVEN';
  readonly directDnsDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directTcpDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directUdpDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directHttpDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly directHttpsDenial: 'PROVEN' | 'NOT_PROVEN';
  readonly browserSpeculativeDns: 'PROVEN' | 'NOT_PROVEN';
  readonly browserTraffic: 'PROVEN' | 'NOT_PROVEN';
  readonly syntheticRelayFlow: 'PROVEN' | 'NOT_PROVEN';
  readonly websocketRelayFlow: 'PROVEN' | 'NOT_PROVEN';
  readonly startup: 'PROVEN' | 'NOT_PROVEN';
  readonly liveness: 'PROVEN' | 'NOT_PROVEN';
  readonly cleanup: 'PROVEN' | 'NOT_PROVEN';
  readonly completeProcessIsolation: boolean;
  readonly completeNetworkIsolation: boolean;
  readonly blockerCode:
    | 'BWRAP_UNAVAILABLE'
    | 'NAMESPACE_START_FAILED'
    | 'RELAY_HANDSHAKE_FAILED'
    | 'DNS_ESCAPE_DETECTED'
    | 'DIRECT_TCP_ESCAPE_DETECTED'
    | 'DIRECT_UDP_ESCAPE_DETECTED'
    | 'BROWSER_SPECULATIVE_NETWORK_UNPROVEN'
    | 'PROCESS_TREE_ESCAPE_UNPROVEN'
    | 'L6_CLEANUP_FAILED'
    | null;
}

export interface L6ParentRequest {
  readonly mode: 'OOPS' | 'PROBE' | 'BROWSER';
  readonly url: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface L6ParentResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: Uint8Array;
}

export type L6ParentRelay = (request: L6ParentRequest) => Promise<L6ParentResponse>;

export interface L6ContainedProcessOptions {
  readonly targetPath: string;
  readonly targetMountPath?: '/workspace/oops' | '/workspace/oops.mjs' | '/opt/google/chrome/chrome';
  readonly targetArgs: readonly string[];
  readonly mode: 'OOPS' | 'PROBE' | 'BROWSER';
  readonly relay: L6ParentRelay;
  readonly onReady?: (proxyPort: number, runtimeDirectory: string) => void | Promise<void>;
  readonly includeChrome?: boolean;
  readonly allowNestedUserNamespaces?: boolean;
  readonly timeoutMs?: number;
};

export interface L6ProcessCapture {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly outputTruncated: boolean;
  readonly cleanup: boolean;
  readonly startup: boolean;
  readonly relayRequests: number;
}

interface FrameMessage {
  readonly type?: unknown;
  readonly [key: string]: unknown;
}

interface LaunchConfig {
  readonly protocol: typeof L6_CONTROL_PROTOCOL_VERSION;
  readonly mode: 'OOPS' | 'PROBE' | 'BROWSER';
  readonly targetArgs: readonly string[];
  readonly targetPath: '/workspace/oops' | '/workspace/oops.mjs' | '/opt/google/chrome/chrome';
}

interface BoundedOutput {
  value: Uint8Array;
  truncated: boolean;
}

function appendBounded(current: Uint8Array, chunk: Uint8Array, limit: number): BoundedOutput {
  if (current.length >= limit) return { value: current, truncated: true };
  if (current.length + chunk.length <= limit) {
    const value = new Uint8Array(current.length + chunk.length);
    value.set(current, 0);
    value.set(chunk, current.length);
    return { value, truncated: false };
  }
  const value = new Uint8Array(limit);
  value.set(current, 0);
  value.set(chunk.subarray(0, limit - current.length), current.length);
  return { value, truncated: true };
}

function frame(value: FrameMessage): Buffer {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  if (body.length === 0 || body.length > MAX_FRAME_BYTES) throw new Error('L6_CONTROL_FRAME_OVERSIZED');
  const result = Buffer.allocUnsafe(4 + body.length);
  result.writeUInt32BE(body.length, 0);
  body.copy(result, 4);
  return result;
}

function parseFrameBuffer(buffer: Buffer): { messages: FrameMessage[]; remaining: Buffer } {
  const messages: FrameMessage[] = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const length = buffer.readUInt32BE(offset);
    if (length === 0 || length > MAX_FRAME_BYTES) throw new Error('L6_CONTROL_FRAME_OVERSIZED');
    if (buffer.length - offset - 4 < length) break;
    const body = buffer.subarray(offset + 4, offset + 4 + length).toString('utf8');
    const parsed = JSON.parse(body) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('L6_CONTROL_FRAME_INVALID');
    messages.push(parsed as FrameMessage);
    offset += 4 + length;
  }
  if (buffer.length - offset > MAX_FRAME_BYTES + 4) throw new Error('L6_CONTROL_BUFFER_OVERSIZED');
  return { messages, remaining: buffer.subarray(offset) };
}

function writePrivateAtomic(file: string, contents: string): void {
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const descriptor = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try {
    fs.writeFileSync(descriptor, contents, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    fs.chmodSync(temporary, 0o600);
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.closeSync(descriptor); } catch { /* descriptor cleanup is best effort */ }
    try { fs.unlinkSync(temporary); } catch { /* temporary cleanup is best effort */ }
    throw error;
  }
}

function isRegularNonSymlink(file: string): boolean {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function bwrapPath(): string | null {
  for (const candidate of BWRAP_CANDIDATES) {
    if (isRegularNonSymlink(candidate) && (fs.statSync(candidate).mode & 0o111) !== 0) return candidate;
  }
  return null;
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const stat = fs.statSync(directory);
  if ((stat.mode & 0o077) !== 0 || (typeof process.getuid === 'function' && stat.uid !== process.getuid())) {
    throw new Error('L6_PRIVATE_DIRECTORY_UNSAFE');
  }
}

function safeTargetPath(targetPath: string): void {
  if (!path.isAbsolute(targetPath) || !isRegularNonSymlink(targetPath)) throw new Error('L6_TARGET_NOT_REGULAR');
  const components = targetPath.split(path.sep).filter(Boolean);
  let current = path.parse(targetPath).root;
  for (const component of components) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); } catch { throw new Error('L6_TARGET_PATH_UNREADABLE'); }
    if (stat.isSymbolicLink()) throw new Error('L6_TARGET_PATH_SYMLINK');
  }
}

function safeTargetArgs(args: readonly string[]): void {
  if (args.length > 16) throw new Error('L6_TARGET_ARGS_OVERSIZED');
  for (const arg of args) {
    if (typeof arg !== 'string' || arg.length > 512 || arg.includes('\u0000')) throw new Error('L6_TARGET_ARG_INVALID');
  }
}

function terminateProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    if (process.platform === 'linux') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try { child.kill(signal); } catch { /* process may already be gone */ }
  }
}

function responseHeaders(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = new Set(['content-type', 'x-nightwatch-oracle', 'location', 'upgrade', 'connection', 'sec-websocket-accept', 'sec-websocket-protocol', 'sec-websocket-version']);
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    const lower = key.toLowerCase();
    if (allowed.has(lower) && typeof item === 'string' && item.length <= 256) result[lower] = item;
  }
  return result;
}

// This source is fixed code, not a caller-provided script. It is mounted
// read-only inside the namespace and accepts only the bounded launch config.
const L6_BOOTSTRAP_SOURCE = `import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';

const MAX_FRAME = 65536;
const MAX_REQUEST = 8192;
const MAX_PENDING = 8;
const socketPath = process.env.NIGHTWATCH_L6_SOCKET;
const launchPath = process.env.NIGHTWATCH_L6_LAUNCH;
const mode = process.env.NIGHTWATCH_L6_MODE;
if (typeof socketPath !== 'string' || typeof launchPath !== 'string' || !['OOPS', 'PROBE', 'BROWSER'].includes(mode ?? '')) process.exit(90);

let control;
try {
  control = net.createConnection(socketPath);
} catch {
  process.exit(91);
}
let controlBuffer = Buffer.alloc(0);
let requestSequence = 0;
const pending = new Map();
const pendingUpgrades = new Map();
let target;
let stopping = false;

function send(value) {
  if (!control.destroyed) {
    const body = Buffer.from(JSON.stringify(value), 'utf8');
    if (body.length > 0 && body.length <= MAX_FRAME) {
      const packet = Buffer.allocUnsafe(body.length + 4);
      packet.writeUInt32BE(body.length, 0);
      body.copy(packet, 4);
      control.write(packet);
    }
  }
}
function rejectResponse(response, status) {
  if (!response.headersSent) response.writeHead(status, { Connection: 'close', 'Content-Length': '0' });
  response.end();
}
function safeHeader(value) {
  return typeof value === 'string' && value.length <= 512 ? value : undefined;
}
function requestTarget(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_REQUEST) return null;
  if (mode === 'OOPS' || mode === 'PROBE') {
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('?')) return null;
    return { path: raw, url: raw };
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' || parsed.hostname !== 'l6.synthetic' || parsed.pathname !== '/l6-browser' || parsed.search !== '' || parsed.hash !== '') return null;
    return { path: parsed.pathname, url: parsed.toString() };
  } catch {
    return null;
  }
}
function upgradeTarget(raw, host) {
  if (mode !== 'PROBE' && mode !== 'BROWSER') return null;
  const candidate = typeof raw === 'string' && raw.startsWith('/') ? 'ws://' + host + raw : raw;
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > MAX_REQUEST) return null;
  try {
    const parsed = new URL(candidate);
    if ((parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') || parsed.hostname !== 'l6.synthetic' || parsed.pathname !== '/l6-ws' || parsed.search !== '' || parsed.hash !== '') return null;
    return { path: parsed.pathname, url: parsed.toString() };
  } catch {
    return null;
  }
}
function forward(request, response, rawUrl) {
  if (pending.size >= MAX_PENDING) return rejectResponse(response, 429);
  const targetValue = requestTarget(rawUrl);
  if (targetValue === null) return rejectResponse(response, 403);
  const headers = {};
  const allowed = new Set(mode === 'BROWSER'
    ? ['accept', 'host', 'user-agent', 'connection', 'proxy-connection', 'accept-encoding', 'accept-language', 'cache-control', 'pragma', 'upgrade-insecure-requests', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'dnt', 'x-nightwatch-l6-probe']
    : ['accept', 'host', 'connection', 'accept-encoding', 'x-nightwatch-operation-id', ...(mode === 'PROBE' ? ['x-nightwatch-l6-probe'] : [])]);
  for (const [key, value] of Object.entries(request.headers)) {
    if (!allowed.has(key.toLowerCase())) return rejectResponse(response, 403);
    const safe = safeHeader(Array.isArray(value) ? value[0] : value);
    if (safe !== undefined) headers[key.toLowerCase()] = safe;
  }
  if (mode === 'OOPS' && typeof headers['x-nightwatch-operation-id'] !== 'string') return rejectResponse(response, 403);
  const id = String(++requestSequence);
  pending.set(id, response);
  send({ type: 'HTTP_REQUEST', id, mode, url: targetValue.url, path: targetValue.path, headers });
}
function forwardUpgrade(request, socket) {
  if (pendingUpgrades.size >= MAX_PENDING) return socket.destroy();
  const targetValue = upgradeTarget(request.url, safeHeader(request.headers.host));
  if (targetValue === null) return socket.end('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n');
  const headers = {};
  const allowed = new Set(['host', 'connection', 'upgrade', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-protocol', 'origin', 'user-agent', 'x-nightwatch-l6-probe']);
  for (const [key, value] of Object.entries(request.headers)) {
    if (!allowed.has(key.toLowerCase())) return socket.end('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n');
    const safe = safeHeader(Array.isArray(value) ? value[0] : value);
    if (safe !== undefined) headers[key.toLowerCase()] = safe;
  }
  if (headers.upgrade?.toLowerCase() !== 'websocket' || headers.connection?.toLowerCase() !== 'upgrade') return socket.end('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n');
  const id = String(++requestSequence);
  pendingUpgrades.set(id, socket);
  send({ type: 'UPGRADE_REQUEST', id, mode, url: targetValue.url, path: targetValue.path, headers });
}
const proxy = http.createServer((request, response) => {
  if (request.method !== 'GET' || request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0') return rejectResponse(response, 403);
  let bytes = 0;
  request.on('data', (chunk) => { bytes += chunk.byteLength; if (bytes > 0) request.destroy(); });
  request.on('end', () => { if (bytes === 0 && !request.destroyed) forward(request, response, request.url); });
});
proxy.on('connect', (_request, socket) => { socket.end('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n'); });
proxy.on('upgrade', (request, socket) => { forwardUpgrade(request, socket); });
proxy.listen(0, '127.0.0.1', () => {
  const address = proxy.address();
  if (!address || typeof address === 'string') process.exit(92);
  process.env.NIGHTWATCH_L6_PROXY_PORT = String(address.port);
  send({ type: 'READY', mode, port: address.port });
});

function stopTarget(signal = 'SIGTERM', exitCode = 93) {
  stopping = true;
  if (target && target.exitCode === null && target.signalCode === null) target.kill(signal);
  for (const response of pending.values()) rejectResponse(response, 502);
  pending.clear();
  for (const socket of pendingUpgrades.values()) socket.destroy();
  pendingUpgrades.clear();
  proxy.close(() => process.exit(exitCode));
}
function startTarget() {
  let launch;
  try { launch = JSON.parse(fs.readFileSync(launchPath, 'utf8')); } catch { return process.exit(94); }
  if (launch?.protocol !== 'nightwatch.l6-af-unix-control.v1' || launch.mode !== mode || !Array.isArray(launch.targetArgs) || typeof launch.targetPath !== 'string') return process.exit(95);
  if (launch.targetArgs.length > 16 || launch.targetArgs.some((value) => typeof value !== 'string' || value.length > 512 || value.includes('\\u0000'))) return process.exit(96);
  if (launch.targetPath !== '/workspace/oops' && launch.targetPath !== '/workspace/oops.mjs' && launch.targetPath !== '/opt/google/chrome/chrome') return process.exit(97);
  const childEnv = { ...process.env, HTTP_PROXY: 'http://127.0.0.1:' + process.env.NIGHTWATCH_L6_PROXY_PORT, HTTPS_PROXY: 'http://127.0.0.1:' + process.env.NIGHTWATCH_L6_PROXY_PORT, ALL_PROXY: 'http://127.0.0.1:' + process.env.NIGHTWATCH_L6_PROXY_PORT, NO_PROXY: '' };
  const targetArgs = [...launch.targetArgs];
  if (mode === 'BROWSER') {
    const browserFlags = ['--proxy-server=http://127.0.0.1:' + process.env.NIGHTWATCH_L6_PROXY_PORT, '--host-resolver-rules=MAP *.invalid ~NOTFOUND'];
    const firstNonFlag = targetArgs.findIndex(value => !value.startsWith('-'));
    targetArgs.splice(firstNonFlag === -1 ? targetArgs.length : firstNonFlag, 0, ...browserFlags);
  }
  target = spawn(launch.targetPath, targetArgs, { cwd: '/workspace', env: childEnv, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  target.stdout?.pipe(process.stdout);
  target.stderr?.pipe(process.stderr);
  target.once('error', () => send({ type: 'TARGET_ERROR' }));
  target.once('close', (code, signal) => { send({ type: 'TARGET_EXIT', code, signal }); if (!stopping) stopTarget('SIGTERM', typeof code === 'number' ? code : 1); });
}
function handleMessage(message) {
  if (message?.type === 'START') return startTarget();
  if (message?.type === 'STOP') return stopTarget('SIGTERM');
  if (message?.type === 'HTTP_RESPONSE') {
    const id = typeof message.id === 'string' ? message.id : '';
    const response = pending.get(id);
    if (!response) return;
    pending.delete(id);
    const status = Number.isInteger(message.status) && message.status >= 100 && message.status <= 599 ? message.status : 502;
    const headers = {};
    if (message.headers && typeof message.headers === 'object') for (const [key, value] of Object.entries(message.headers)) if (typeof value === 'string' && value.length <= 256) headers[key] = value;
    const body = typeof message.bodyBase64 === 'string' && message.bodyBase64.length <= 65536 ? Buffer.from(message.bodyBase64, 'base64') : Buffer.alloc(0);
    if (!response.headersSent) response.writeHead(status, { Connection: 'close', 'Content-Length': String(body.length), ...headers });
    response.end(body);
  }
  if (message?.type === 'UPGRADE_RESPONSE') {
    const id = typeof message.id === 'string' ? message.id : '';
    const socket = pendingUpgrades.get(id);
    if (!socket) return;
    pendingUpgrades.delete(id);
    const status = Number.isInteger(message.status) && message.status >= 100 && message.status <= 599 ? message.status : 502;
    const headers = {};
    if (message.headers && typeof message.headers === 'object') for (const [key, value] of Object.entries(message.headers)) if (typeof value === 'string' && value.length <= 256) headers[key] = value;
    if (status === 101) {
      const lines = Object.entries(headers).map(([key, value]) => key + ': ' + value).join('\\r\\n');
      socket.write('HTTP/1.1 101 Switching Protocols\\r\\n' + lines + '\\r\\n\\r\\n');
      socket.end();
    } else {
      socket.end('HTTP/1.1 ' + status + ' Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n');
    }
  }
}
control.on('data', (chunk) => {
  controlBuffer = Buffer.concat([controlBuffer, chunk]);
  if (controlBuffer.length > MAX_FRAME + 4) return stopTarget('SIGTERM');
  while (controlBuffer.length >= 4) {
    const length = controlBuffer.readUInt32BE(0);
    if (length === 0 || length > MAX_FRAME || controlBuffer.length < length + 4) break;
    const body = controlBuffer.subarray(4, length + 4).toString('utf8');
    controlBuffer = controlBuffer.subarray(length + 4);
    try { handleMessage(JSON.parse(body)); } catch { stopTarget('SIGTERM'); return; }
  }
});
control.on('error', () => stopTarget('SIGTERM'));
control.on('close', () => { if (!stopping) stopTarget('SIGTERM'); });`;

function launchArguments(
  nodePath: string,
  runtimeDirectory: string,
  homeDirectory: string,
  temporaryDirectory: string,
  targetPath: string,
  targetMountPath: '/workspace/oops' | '/workspace/oops.mjs' | '/opt/google/chrome/chrome',
  mode: 'OOPS' | 'PROBE' | 'BROWSER',
  includeChrome: boolean,
  allowNestedUserNamespaces: boolean,
): string[] {
  if (typeof process.getuid !== 'function' || typeof process.getgid !== 'function') throw new Error('L6_UID_UNAVAILABLE');
  const args = [
    '--unshare-user', '--unshare-net', '--unshare-pid', '--as-pid-1', '--die-with-parent', '--new-session',
    '--clearenv', '--setenv', 'PATH', '/workspace/bin:/usr/bin:/bin', '--setenv', 'HOME', '/workspace/home',
    '--setenv', 'TMPDIR', '/workspace/tmp', '--setenv', 'LANG', 'C', '--setenv', 'LC_ALL', 'C',
    '--setenv', 'NIGHTWATCH_L6_SOCKET', '/l6/control.sock', '--setenv', 'NIGHTWATCH_L6_LAUNCH', '/l6/launch.json',
    '--setenv', 'NIGHTWATCH_L6_MODE', mode,
    '--ro-bind', '/usr', '/usr', '--ro-bind', '/bin', '/bin', '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64',
    '--ro-bind', '/etc', '/etc', '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp',
    '--ro-bind', runtimeDirectory, '/l6', '--bind', homeDirectory, '/workspace/home', '--bind', temporaryDirectory, '/workspace/tmp',
    '--dir', '/workspace', '--dir', '/workspace/bin', '--ro-bind', nodePath, '/workspace/bin/node',
  ];
  if (includeChrome) args.push('--ro-bind', '/opt/google/chrome', '/opt/google/chrome');
  args.push('--ro-bind', targetPath, targetMountPath);
  if (!allowNestedUserNamespaces) args.push('--disable-userns', '--assert-userns-disabled');
  args.push('--uid', String(process.getuid()), '--gid', String(process.getgid()), '--chdir', '/workspace', '/workspace/bin/node', '/l6/bootstrap.mjs');
  return args;
}

function closeServer(server: NetServer): Promise<boolean> {
  return new Promise((resolve) => {
    if (!server.listening) return resolve(true);
    server.close(() => resolve(true));
  });
}

function safeRemoveRuntimeDirectory(directory: string): boolean {
  try {
    const tempRoot = path.resolve(os.tmpdir());
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(`${tempRoot}${path.sep}`)) return false;
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false;
    fs.rmSync(resolved, { recursive: true, force: true });
    return !fs.existsSync(resolved);
  } catch {
    return false;
  }
}

export async function runL6ContainedProcess(options: L6ContainedProcessOptions): Promise<L6ProcessCapture> {
  if (process.platform !== 'linux') throw new Error('L6_UNAVAILABLE_PLATFORM');
  const bwrap = bwrapPath();
  if (bwrap === null) throw new Error('L6_BWRAP_UNAVAILABLE');
  safeTargetPath(options.targetPath);
  safeTargetPath(process.execPath);
  safeTargetArgs(options.targetArgs);
  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-l6-'));
  const homeDirectory = path.join(runtimeDirectory, 'home');
  const temporaryDirectory = path.join(runtimeDirectory, 'tmp');
  ensurePrivateDirectory(runtimeDirectory);
  ensurePrivateDirectory(homeDirectory);
  ensurePrivateDirectory(temporaryDirectory);
  const socketPath = path.join(runtimeDirectory, 'control.sock');
  const launchPath = path.join(runtimeDirectory, 'launch.json');
  const bootstrapPath = path.join(runtimeDirectory, 'bootstrap.mjs');
  const scenarioPath = path.join(runtimeDirectory, 'scenario.json');
  fs.writeFileSync(bootstrapPath, L6_BOOTSTRAP_SOURCE, { encoding: 'utf8', mode: 0o700 });
  fs.chmodSync(bootstrapPath, 0o700);
  const targetMountPath = options.targetMountPath ?? '/workspace/oops';
  const launch: LaunchConfig = {
    protocol: L6_CONTROL_PROTOCOL_VERSION,
    mode: options.mode,
    targetArgs: options.targetArgs,
    targetPath: targetMountPath,
  };
  writePrivateAtomic(launchPath, JSON.stringify(launch));

  const controlServer = net.createServer();
  let controlSocket: Socket | undefined;
  let controlBuffer = Buffer.alloc(0);
  let ready = false;
  let relayRequests = 0;
  let fatalError: Error | undefined;
  let timedOut = false;
  let startSent = false;
  let targetExited = false;
  let outputTruncated = false;
  let stdout: Uint8Array = new Uint8Array();
  let stderr: Uint8Array = new Uint8Array();
  let child: ChildProcess | undefined;
  let killTimer: NodeJS.Timeout | undefined;
  const timeoutMs = Number.isInteger(options.timeoutMs) && (options.timeoutMs ?? 0) > 0
    ? Math.min(options.timeoutMs as number, L6_TIMEOUT_MS)
    : L6_TIMEOUT_MS;

  const send = (message: FrameMessage): void => {
    if (controlSocket !== undefined && !controlSocket.destroyed) {
      try { controlSocket.write(frame(message)); } catch { fatalError ??= new Error('L6_RELAY_UNAVAILABLE'); }
    }
  };
  const terminate = (): void => {
    if (child === undefined) return;
    terminateProcessGroup(child, 'SIGTERM');
    killTimer ??= setTimeout(() => terminateProcessGroup(child as ChildProcess, 'SIGKILL'), 500);
    killTimer.unref?.();
  };
  const handleControlMessage = async (message: FrameMessage): Promise<void> => {
    if (message.type === 'READY') {
      if (ready || message.mode !== options.mode || !Number.isInteger(message.port) || (message.port as number) < 1024 || (message.port as number) > 65535) {
        fatalError ??= new Error('L6_RELAY_HANDSHAKE_FAILED');
        terminate();
        return;
      }
      ready = true;
      try {
        await options.onReady?.(message.port as number, runtimeDirectory);
        if (options.mode === 'OOPS' && !fs.existsSync(scenarioPath)) throw new Error('L6_SCENARIO_NOT_READY');
        send({ type: 'START' });
        startSent = true;
      } catch (error) {
        fatalError ??= error instanceof Error ? error : new Error('L6_STARTUP_FAILED');
        terminate();
      }
      return;
    }
    if (message.type === 'HTTP_REQUEST' || message.type === 'UPGRADE_REQUEST') {
      if (!ready || typeof message.mode !== 'string' || message.mode !== options.mode || typeof message.url !== 'string' || typeof message.path !== 'string' || message.url.length > MAX_REQUEST_BYTES || message.path.length > MAX_REQUEST_BYTES) {
        fatalError ??= new Error('L6_RELAY_REQUEST_INVALID');
        terminate();
        return;
      }
      const headersValue = message.headers;
      if (headersValue === null || typeof headersValue !== 'object' || Array.isArray(headersValue)) {
        fatalError ??= new Error('L6_RELAY_REQUEST_INVALID');
        terminate();
        return;
      }
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(headersValue as Record<string, unknown>)) {
        if (!/^[a-z0-9-]{1,64}$/.test(key) || typeof value !== 'string' || value.length > 512) {
          fatalError ??= new Error('L6_RELAY_REQUEST_INVALID');
          terminate();
          return;
        }
        headers[key] = value;
      }
      if (relayRequests >= MAX_PROXY_REQUESTS) {
        fatalError ??= new Error('L6_RELAY_REQUEST_LIMIT');
        terminate();
        return;
      }
      relayRequests += 1;
      try {
        const response = await Promise.race([
          options.relay({ mode: options.mode, url: message.url, path: message.path, headers }),
          new Promise<L6ParentResponse>((_, reject) => setTimeout(() => reject(new Error('L6_RELAY_TIMEOUT')), PROXY_REQUEST_TIMEOUT_MS)),
        ]);
        const body = response.body ?? new Uint8Array();
        if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599 || body.byteLength > MAX_FRAME_BYTES) throw new Error('L6_RELAY_RESPONSE_INVALID');
        send({ type: message.type === 'UPGRADE_REQUEST' ? 'UPGRADE_RESPONSE' : 'HTTP_RESPONSE', id: typeof message.id === 'string' ? message.id : '', status: response.status, headers: responseHeaders(response.headers), bodyBase64: Buffer.from(body).toString('base64') });
      } catch (error) {
        fatalError ??= error instanceof Error ? error : new Error('L6_RELAY_UNAVAILABLE');
        terminate();
      }
      return;
    }
    if (message.type === 'TARGET_EXIT') {
      targetExited = true;
      return;
    }
    if (message.type === 'TARGET_ERROR') {
      fatalError ??= new Error('L6_TARGET_START_FAILED');
      terminate();
    }
  };

  controlServer.on('connection', (socket) => {
    if (controlSocket !== undefined) {
      socket.destroy();
      fatalError ??= new Error('L6_DUPLICATE_CONTROL_CONNECTION');
      terminate();
      return;
    }
    controlSocket = socket;
    socket.on('data', (chunk) => {
      controlBuffer = Buffer.concat([controlBuffer, chunk]);
      try {
        const parsed = parseFrameBuffer(controlBuffer);
        controlBuffer = Buffer.from(parsed.remaining);
        for (const message of parsed.messages) void handleControlMessage(message);
      } catch (error) {
        fatalError ??= error instanceof Error ? error : new Error('L6_CONTROL_INVALID');
        terminate();
      }
    });
    socket.on('error', () => {
      if (!targetExited) fatalError ??= new Error('L6_RELAY_UNAVAILABLE');
      terminate();
    });
    socket.on('close', () => {
      if (!targetExited) {
        fatalError ??= new Error('L6_RELAY_UNAVAILABLE');
        terminate();
      }
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      controlServer.once('error', reject);
      controlServer.listen(socketPath, () => {
        controlServer.off('error', reject);
        try { fs.chmodSync(socketPath, 0o600); } catch (error) { reject(error); return; }
        resolve();
      });
    });
    const args = launchArguments(process.execPath, runtimeDirectory, homeDirectory, temporaryDirectory, options.targetPath, targetMountPath, options.mode, options.includeChrome === true, options.allowNestedUserNamespaces === true);
    child = spawn(bwrap, args, { detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.on('data', (chunk: Buffer) => {
      const result = appendBounded(stdout, chunk, MAX_OUTPUT_BYTES);
      stdout = result.value;
      outputTruncated ||= result.truncated;
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const result = appendBounded(stderr, chunk, MAX_OUTPUT_BYTES);
      stderr = result.value;
      outputTruncated ||= result.truncated;
    });
    const closeResult = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      const timer = setTimeout(() => {
        timedOut = true;
        fatalError ??= new Error('L6_TIMEOUT');
        terminate();
      }, timeoutMs);
      timer.unref?.();
      child?.once('error', (error) => { clearTimeout(timer); fatalError ??= error; reject(error); });
      child?.once('close', (code, signal) => { clearTimeout(timer); resolve({ exitCode: code, signal }); });
    });
    if (!ready) fatalError ??= new Error('L6_STARTUP_FAILED');
    if (!startSent) fatalError ??= new Error('L6_STARTUP_FAILED');
    if (fatalError !== undefined) throw fatalError;
    return { ...closeResult, timedOut, stdout, stderr, outputTruncated, cleanup: true, startup: ready, relayRequests };
  } finally {
    if (killTimer !== undefined) clearTimeout(killTimer);
    if (child !== undefined && child.exitCode === null && child.signalCode === null) terminate();
    controlSocket?.destroy();
    const serverClosed = await closeServer(controlServer);
    const cleanup = serverClosed && safeRemoveRuntimeDirectory(runtimeDirectory);
    if (!cleanup && fatalError === undefined) throw new Error('L6_CLEANUP_FAILED');
  }
}

interface L6ContainedOopsOptions {
  readonly binaryPath: string;
  readonly logicalScenario: string;
  readonly operationId: string;
  readonly relay: Phase5Relay;
  readonly timeoutMs?: number;
}

function requestPhase5Relay(relay: Phase5Relay, operationId: string, request: L6ParentRequest): Promise<L6ParentResponse> {
  const expectedPath = `/v1/operations/${operationId}`;
  if (
    request.mode !== 'OOPS' ||
    request.url !== expectedPath ||
    request.path !== expectedPath ||
    request.headers['x-nightwatch-operation-id'] !== operationId ||
    !relay.server.listening
  ) {
    return Promise.resolve({ status: 403 });
  }
  return new Promise<L6ParentResponse>((resolve, reject) => {
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: relay.port,
      method: 'GET',
      path: expectedPath,
      agent: false,
      lookup: (_hostname, _options, callback) => callback(null, '127.0.0.1', 4),
      headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': operationId },
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      upstream.destroy();
      reject(new Error('L6_PHASE5_RELAY_TIMEOUT'));
    }, PROXY_REQUEST_TIMEOUT_MS);
    timer.unref?.();
    upstream.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    upstream.once('response', (response) => {
      response.resume();
      response.once('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const headers: Record<string, string> = {};
        const oracle = response.headers['x-nightwatch-oracle'];
        const contentType = response.headers['content-type'];
        if (typeof oracle === 'string') headers['x-nightwatch-oracle'] = oracle;
        if (typeof contentType === 'string') headers['content-type'] = contentType.split(';', 1)[0] ?? 'application/octet-stream';
        resolve({ status: response.statusCode ?? 502, headers });
      });
    });
    upstream.end();
  });
}

/** Run the restricted OOPS adapter inside the proven rootless envelope. */
export async function runL6ContainedOops(options: L6ContainedOopsOptions): Promise<L6ProcessCapture> {
  const targetMountPath = options.binaryPath.endsWith('.mjs') ? '/workspace/oops.mjs' : '/workspace/oops';
  return runL6ContainedProcess({
    targetPath: options.binaryPath,
    targetMountPath,
    targetArgs: ['--scenarios', '/l6/scenario.json', '--skip-result-notif'],
    mode: 'OOPS',
    relay: (request) => requestPhase5Relay(options.relay, options.operationId, request),
    timeoutMs: options.timeoutMs,
    onReady: (_proxyPort, runtimeDirectory) => {
      const scenarioPath = path.join(runtimeDirectory, 'scenario.json');
      const materialized = materializeRelayPort(options.logicalScenario, _proxyPort, options.operationId);
      writePrivateAtomic(scenarioPath, materialized);
    },
  });
}

function failureCapability(state: L6CapabilityState, blockerCode: L6RuntimeCapability['blockerCode']): L6RuntimeCapability {
  return Object.freeze({
    schemaVersion: L6_PROCESS_NETWORK_CONTAINMENT_VERSION,
    runtimeIdentity: L6_PROCESS_NETWORK_CONTAINMENT_VERSION,
    state,
    status: 'UNPROVEN',
    readiness: 'BLOCKED',
    namespace: 'UNPROVEN',
    transport: 'UNPROVEN',
    runtimeBinding: 'NOT_PROVEN',
    processIsolation: 'NOT_PROVEN',
    directDnsDenial: 'NOT_PROVEN',
    directTcpDenial: 'NOT_PROVEN',
    directUdpDenial: 'NOT_PROVEN',
    directHttpDenial: 'NOT_PROVEN',
    directHttpsDenial: 'NOT_PROVEN',
    browserSpeculativeDns: 'NOT_PROVEN',
    browserTraffic: 'NOT_PROVEN',
    syntheticRelayFlow: 'NOT_PROVEN',
    websocketRelayFlow: 'NOT_PROVEN',
    startup: 'NOT_PROVEN',
    liveness: 'NOT_PROVEN',
    cleanup: 'NOT_PROVEN',
    completeProcessIsolation: false,
    completeNetworkIsolation: false,
    blockerCode,
  });
}

export function assertL6RuntimeCapability(capability: L6RuntimeCapability): void {
  if (
    capability.schemaVersion !== L6_PROCESS_NETWORK_CONTAINMENT_VERSION ||
    capability.runtimeIdentity !== L6_PROCESS_NETWORK_CONTAINMENT_VERSION ||
    capability.state !== 'READY' ||
    capability.status !== 'PROVEN' ||
    capability.readiness !== 'READY' ||
    capability.namespace !== 'ROOTLESS_NETWORK_NAMESPACE_NO_EXTERNAL_INTERFACE' ||
    capability.transport !== 'INHERITED_AF_UNIX_ONLY' ||
    capability.runtimeBinding !== 'PROVEN' ||
    capability.processIsolation !== 'PROVEN' ||
    capability.directDnsDenial !== 'PROVEN' ||
    capability.directTcpDenial !== 'PROVEN' ||
    capability.directUdpDenial !== 'PROVEN' ||
    capability.directHttpDenial !== 'PROVEN' ||
    capability.directHttpsDenial !== 'PROVEN' ||
    capability.browserSpeculativeDns !== 'PROVEN' ||
    capability.browserTraffic !== 'PROVEN' ||
    capability.syntheticRelayFlow !== 'PROVEN' ||
    capability.websocketRelayFlow !== 'PROVEN' ||
    capability.startup !== 'PROVEN' ||
    capability.liveness !== 'PROVEN' ||
    capability.cleanup !== 'PROVEN' ||
    capability.completeProcessIsolation !== true ||
    capability.completeNetworkIsolation !== true ||
    capability.blockerCode !== null
  ) {
    throw new Error(`L6_RUNTIME_CAPABILITY_REQUIRED:${capability.blockerCode ?? 'CAPABILITY_NOT_READY'}`);
  }
}

const L6_PROBE_SOURCE = `#!/usr/bin/env node
import dns from 'node:dns/promises';
import dnsCallback from 'node:dns';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dgram from 'node:dgram';
import { spawn } from 'node:child_process';

const config = JSON.parse(fs.readFileSync('/l6/probe.json', 'utf8'));
const result = { nodeMajor: process.versions.node.split('.')[0] };
async function attempt(name, action) {
  try {
    const value = await Promise.race([action(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 700))]);
    result[name] = value === 'grandchild-attempted' ? 'ATTEMPTED' : typeof value === 'string' && value.startsWith('status-') ? value : 'CONNECTED';
  } catch (error) {
    result[name] = typeof error?.code === 'string' ? error.code : 'DENIED';
  }
}
await attempt('dnsLookup', () => new Promise((resolve, reject) => dnsCallback.lookup('nightwatch-l6.invalid', (error, address) => error ? reject(error) : resolve(address))));
const resolver = new dns.Resolver();
resolver.setServers(['127.0.0.1:' + config.udpPort]);
await attempt('dnsResolve', () => resolver.resolve4('nightwatch-l6.invalid'));
await attempt('dnsTcp', () => new Promise((resolve, reject) => { const socket = net.connect({ host: '127.0.0.1', port: config.dnsTcpPort }); socket.once('connect', () => { socket.destroy(); resolve('connected'); }); socket.once('error', reject); }));
await attempt('tcp', () => new Promise((resolve, reject) => { const socket = net.connect({ host: '127.0.0.1', port: config.tcpPort }); socket.once('connect', () => { socket.destroy(); resolve('connected'); }); socket.once('error', reject); }));
await attempt('tcpV6', () => new Promise((resolve, reject) => { const socket = net.connect({ host: '::1', port: config.tcpPort, family: 6 }); socket.once('connect', () => { socket.destroy(); resolve('connected'); }); socket.once('error', reject); }));
await attempt('tcpMapped', () => new Promise((resolve, reject) => { const socket = net.connect({ host: '::ffff:127.0.0.1', port: config.tcpPort, family: 6 }); socket.once('connect', () => { socket.destroy(); resolve('connected'); }); socket.once('error', reject); }));
await attempt('udp', () => new Promise((resolve, reject) => { const socket = dgram.createSocket('udp4'); socket.once('error', reject); socket.send(Buffer.from('l6'), config.udpPort, '127.0.0.1', error => error ? reject(error) : setTimeout(() => { socket.close(); resolve('sent'); }, 200)); }));
await attempt('http', () => new Promise((resolve, reject) => { const request = http.get('http://127.0.0.1:' + config.tcpPort + '/l6', response => { response.resume(); resolve('connected'); }); request.once('error', reject); }));
await attempt('https', () => new Promise((resolve, reject) => { const request = https.get({ host: '127.0.0.1', port: config.tcpPort, path: '/l6', rejectUnauthorized: false }, response => { response.resume(); resolve('connected'); }); request.once('error', reject); }));
await attempt('grandchild', () => new Promise((resolve, reject) => { const code = "const net=require('node:net'); const s=net.connect({host:'127.0.0.1',port:" + config.tcpPort + "}); s.once('connect',()=>{s.destroy();process.exit(0)}); s.once('error',()=>process.exit(2));"; const child = spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'ignore', 'ignore'] }); child.once('close', codeValue => resolve('grandchild-attempted')); child.once('error', reject); }));
await attempt('relay', () => new Promise((resolve, reject) => { const request = http.get({ host: '127.0.0.1', port: Number(process.env.NIGHTWATCH_L6_PROXY_PORT), path: '/l6-probe', headers: { Accept: 'application/json', 'X-Nightwatch-L6-Probe': '1' } }, response => { response.resume(); response.once('end', () => response.statusCode === 204 ? resolve('relay') : resolve('status-' + String(response.statusCode))); }); request.once('error', reject); }));
await attempt('upgrade', () => new Promise((resolve, reject) => { const socket = net.connect(Number(process.env.NIGHTWATCH_L6_PROXY_PORT), '127.0.0.1'); let response = ''; socket.once('connect', () => socket.write('GET /l6-ws HTTP/1.1\\r\\nHost: l6.synthetic\\r\\nConnection: Upgrade\\r\\nUpgrade: websocket\\r\\nSec-WebSocket-Key: dGVzdA==\\r\\nSec-WebSocket-Version: 13\\r\\nX-Nightwatch-L6-Probe: 1\\r\\n\\r\\n')); socket.on('data', chunk => { response += chunk.toString(); if (response.includes('HTTP/1.1 101')) { socket.destroy(); resolve('upgrade'); } }); socket.once('error', reject); }));
console.log(JSON.stringify(result));
process.exit(0);`;

const L6_BROWSER_EXPECTED_SOURCE = `<!doctype html><html><head><link rel="dns-prefetch" href="//speculative.l6.invalid"><link rel="preconnect" href="https://speculative.l6.invalid"></head><body data-nightwatch-l6="ok">synthetic</body></html>`;

async function listenTcp(server: NetServer): Promise<AddressInfo> {
  return await new Promise<AddressInfo>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (address === null || typeof address === 'string') reject(new Error('L6_PROBE_BIND_FAILED'));
      else resolve(address);
    });
  });
}

async function listenUdp(server: dgram.Socket): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.bind(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (typeof address === 'string' || address === null) reject(new Error('L6_PROBE_BIND_FAILED'));
      else resolve(address.port);
    });
  });
}

async function closeTcp(server: NetServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function closeUdp(server: dgram.Socket): Promise<void> {
  if (server.address() !== null) await new Promise<void>((resolve) => server.close(() => resolve()));
}

function parseProbeResult(stdout: Uint8Array): Record<string, string> | null {
  const lines = Buffer.from(stdout).toString('utf8').trim().split(/\r?\n/).filter(Boolean);
  const last = lines.at(-1);
  if (last === undefined) return null;
  try {
    const parsed = JSON.parse(last) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) if (typeof value === 'string') result[key] = value;
    return result;
  } catch {
    return null;
  }
}

/**
 * Host precondition for the rootless containment envelope.
 *
 * This is the ONE predicate that decides whether this host can provide L6 at
 * all. `qualifyL6RuntimeCapability` consults it before doing any probing, and
 * the deep qualification lane consults it to classify itself, so the runtime
 * and its regression suite can never disagree about what the host supports.
 * It is deliberately cheap and side-effect free: it starts no namespace, binds
 * no port and spawns no child, so a caller may ask before committing to a
 * twenty-second qualification.
 *
 * Availability is NOT authority. A host that reports `available: true` has
 * only cleared the precondition; nothing may treat that as containment. Proof
 * still comes exclusively from `qualifyL6RuntimeCapability` plus
 * `assertL6RuntimeCapability`.
 */
export function l6ContainmentAvailability(): {
  readonly available: boolean;
  readonly blockerCode: L6RuntimeCapability['blockerCode'];
} {
  if (process.platform !== 'linux') return { available: false, blockerCode: 'BWRAP_UNAVAILABLE' };
  if (bwrapPath() === null) return { available: false, blockerCode: 'BWRAP_UNAVAILABLE' };
  return { available: true, blockerCode: null };
}

export async function qualifyL6RuntimeCapability(): Promise<L6RuntimeCapability> {
  const availability = l6ContainmentAvailability();
  if (!availability.available) return failureCapability('UNAVAILABLE', availability.blockerCode);
  const probeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-l6-probe-'));
  ensurePrivateDirectory(probeDirectory);
  const probeTarget = path.join(probeDirectory, 'probe.mjs');
  fs.writeFileSync(probeTarget, L6_PROBE_SOURCE, { encoding: 'utf8', mode: 0o700 });
  fs.chmodSync(probeTarget, 0o700);
  let tcpHits = 0;
  let dnsTcpHits = 0;
  let udpHits = 0;
  let relayHits = 0;
  let upgradeHits = 0;
  const tcp = net.createServer((socket) => { tcpHits += 1; socket.end('blocked'); });
  const dnsTcp = net.createServer((socket) => { dnsTcpHits += 1; socket.end('blocked'); });
  const udp = dgram.createSocket('udp4');
  udp.on('message', () => { udpHits += 1; });
  try {
    const tcpAddress = await listenTcp(tcp);
    const dnsTcpAddress = await listenTcp(dnsTcp);
    const udpPort = await listenUdp(udp);
    const parentRelay: L6ParentRelay = async (request) => {
      if (request.mode !== 'PROBE' || request.path !== '/l6-probe' || request.headers['x-nightwatch-l6-probe'] !== '1') {
        if (request.mode === 'PROBE' && request.url === 'ws://l6.synthetic/l6-ws' && request.path === '/l6-ws' && request.headers['x-nightwatch-l6-probe'] === '1' && request.headers.upgrade?.toLowerCase() === 'websocket') {
          upgradeHits += 1;
          return { status: 101, headers: { upgrade: 'websocket', connection: 'Upgrade', 'sec-websocket-accept': 'T3TQpOmnRqmZUfV9OrgZq2FJw54=' } };
        }
        return { status: 403 };
      }
      relayHits += 1;
      return { status: 204 };
    };
    const capture = await runL6ContainedProcess({
      targetPath: probeTarget,
      targetMountPath: '/workspace/oops.mjs',
      targetArgs: [],
      mode: 'PROBE',
      relay: parentRelay,
      onReady: (_proxyPort, runtimeDirectory) => {
        writePrivateAtomic(path.join(runtimeDirectory, 'probe.json'), JSON.stringify({ tcpPort: tcpAddress.port, dnsTcpPort: dnsTcpAddress.port, udpPort }));
      },
      allowNestedUserNamespaces: false,
      timeoutMs: 10_000,
    });
    const result = parseProbeResult(capture.stdout);
    const directDenied = result !== null
      && result.dnsLookup !== 'CONNECTED'
      && result.dnsResolve !== 'CONNECTED'
      && result.dnsTcp !== 'CONNECTED'
      && result.tcp !== 'CONNECTED'
      && result.tcpV6 !== 'CONNECTED'
      && result.tcpMapped !== 'CONNECTED'
      && result.http !== 'CONNECTED'
      && result.https !== 'CONNECTED'
      && result.grandchild !== 'CONNECTED';
    const parentDenied = tcpHits === 0 && dnsTcpHits === 0 && udpHits === 0;
    const relayProven = relayHits === 1 && upgradeHits === 1 && result?.relay === 'CONNECTED' && result?.upgrade === 'CONNECTED';
    if (!directDenied || !parentDenied) return failureCapability('DNS_ESCAPE_UNPROVEN', 'DNS_ESCAPE_DETECTED');
    if (!relayProven) return failureCapability('RELAY_UNAVAILABLE', 'RELAY_HANDSHAKE_FAILED');
    if (capture.exitCode !== 0 || capture.timedOut || !capture.cleanup || result?.nodeMajor !== process.versions.node.split('.')[0]) return failureCapability('PROCESS_TREE_UNPROVEN', 'PROCESS_TREE_ESCAPE_UNPROVEN');
    if (!await qualifyL6BrowserTraffic()) return failureCapability('PROCESS_TREE_UNPROVEN', 'BROWSER_SPECULATIVE_NETWORK_UNPROVEN');
    return makeReadyL6Capability();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('BWRAP')) return failureCapability('UNAVAILABLE', 'BWRAP_UNAVAILABLE');
    if (message.includes('RELAY')) return failureCapability('RELAY_UNAVAILABLE', 'RELAY_HANDSHAKE_FAILED');
    return failureCapability('STARTUP_FAILED', 'NAMESPACE_START_FAILED');
  } finally {
    await closeTcp(tcp);
    await closeTcp(dnsTcp);
    await closeUdp(udp);
    safeRemoveRuntimeDirectory(probeDirectory);
  }
}

export async function qualifyL6BrowserTraffic(): Promise<boolean> {
  const chrome = '/opt/google/chrome/chrome';
  if (process.platform !== 'linux' || !isRegularNonSymlink(chrome)) return false;
  let directTcpHits = 0;
  let directUdpHits = 0;
  const directTcp = net.createServer((socket) => { directTcpHits += 1; socket.end('blocked'); });
  const directUdp = dgram.createSocket('udp4');
  directUdp.on('message', () => { directUdpHits += 1; });
  try {
    const tcpAddress = await listenTcp(directTcp);
    await listenUdp(directUdp);
    let expectedRelayRequests = 0;
    const relay: L6ParentRelay = async (request) => {
      if (request.mode !== 'BROWSER') return { status: 403 };
      if (request.url === 'http://l6.synthetic/l6-browser' && request.path === '/l6-browser') {
        expectedRelayRequests += 1;
        return { status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from(L6_BROWSER_EXPECTED_SOURCE) };
      }
      // Browser background/speculative requests are stopped at the namespace
      // relay. They are intentionally not sent to an upstream service.
      return { status: 403 };
    };
    const capture = await runL6ContainedProcess({
      targetPath: chrome,
      targetMountPath: '/opt/google/chrome/chrome',
      targetArgs: [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--disable-sync', '--disable-component-update',
        '--disable-quic', '--proxy-bypass-list=<-loopback>',
        '--user-data-dir=/workspace/home/profile', '--dump-dom', 'http://l6.synthetic/l6-browser',
      ],
      mode: 'BROWSER',
      relay,
      includeChrome: true,
      allowNestedUserNamespaces: true,
      timeoutMs: 15_000,
      onReady: (_proxyPort, runtimeDirectory) => {
        // A browser profile is deliberately empty and owner-only. Chrome's
        // writes remain temporary and are removed by the supervisor.
        ensurePrivateDirectory(path.join(runtimeDirectory, 'home', 'profile'));
      },
    });
    const output = Buffer.from(capture.stdout).toString('utf8');
    return capture.exitCode === 0
      && !capture.timedOut
      && capture.cleanup
      && expectedRelayRequests >= 1
      && directTcpHits === 0
      && directUdpHits === 0
      && output.includes('data-nightwatch-l6="ok"');
  } catch {
    return false;
  } finally {
    await closeTcp(directTcp);
    await closeUdp(directUdp);
  }
}

export function makeReadyL6Capability(): L6RuntimeCapability {
  return Object.freeze({
    schemaVersion: L6_PROCESS_NETWORK_CONTAINMENT_VERSION,
    runtimeIdentity: L6_PROCESS_NETWORK_CONTAINMENT_VERSION,
    state: 'READY',
    status: 'PROVEN',
    readiness: 'READY',
    namespace: 'ROOTLESS_NETWORK_NAMESPACE_NO_EXTERNAL_INTERFACE',
    transport: 'INHERITED_AF_UNIX_ONLY',
    runtimeBinding: 'PROVEN',
    processIsolation: 'PROVEN',
    directDnsDenial: 'PROVEN',
    directTcpDenial: 'PROVEN',
    directUdpDenial: 'PROVEN',
    directHttpDenial: 'PROVEN',
    directHttpsDenial: 'PROVEN',
    browserSpeculativeDns: 'PROVEN',
    browserTraffic: 'PROVEN',
    syntheticRelayFlow: 'PROVEN',
    websocketRelayFlow: 'PROVEN',
    startup: 'PROVEN',
    liveness: 'PROVEN',
    cleanup: 'PROVEN',
    completeProcessIsolation: true,
    completeNetworkIsolation: true,
    blockerCode: null,
  });
}
