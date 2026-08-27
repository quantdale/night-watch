// ---------------------------------------------------------------------------
// Nightwatch — fail-closed local outbound allowlist proxy (Phase 1.2 L5).
//
// The proxy is intentionally a plain forward proxy: HTTP is forwarded after
// classification; HTTPS/WSS use CONNECT tunnelling after classification; no
// TLS MITM is performed. Denied and malformed targets return locally before
// DNS resolution or TCP connection creation.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { OutboundPolicy } from '../core/safety/outboundPolicy';
import { appendProxyEvent, ensureEventLog } from './events';
import { ensureProxyPortLease, proxyLeaseRuntimeSuffix, PROXY_PORT_LEASE_OWNER_ENV, releaseProxyPortLease } from './portLease';
import { classifyForwardRequest, classifyProxyConnect, classifyProxyUrl, type ProxyClassification, type ProxyTarget } from './policyAdapter';
import { createSystemProxyResolver, resolveAndAdmitTarget, PROXY_RESOLUTION_TIMEOUT_MS, type ProxyResolver, type ProxyResolution } from './resolver';
import { EXACT_ADDRESS_BINDING_VERSION } from './identity';
import type { ProxyConnectionFailureReason, ProxyConnectionOutcome, ProxyEvent, ProxyProtocol, ProxyRuntimeState } from './types';

export const DEFAULT_PROXY_HOST = '127.0.0.1' as const;
export const DEFAULT_PROXY_PORT = 18987;
export const DEFAULT_PROXY_STATE_PATH = '.tmp-nightwatch/proxy-state.json';
export const DEFAULT_PROXY_EVENT_LOG = '.tmp-nightwatch/proxy-events.jsonl';
const NIGHTWATCH_REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CONNECT_TIMEOUT_MS = 2_000;
const MAX_CONNECT_TIMEOUT_MS = 10_000;

function isLoopback(host: string): host is '127.0.0.1' | '::1' {
  return host === '127.0.0.1' || host === '::1';
}

function proxyAddress(host: '127.0.0.1' | '::1', port: number): string {
  return host === '::1' ? `http://[${host}]:${port}` : `http://${host}:${port}`;
}

function requestPort(target: ProxyTarget): number {
  return target.port;
}

function statusText(status: number): string {
  if (status === 403) return 'Forbidden';
  if (status === 502) return 'Bad Gateway';
  return 'Bad Request';
}

function writeLocalBlock(res: ServerResponse, status = 403): void {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': '25',
    Connection: 'close',
  });
  res.end('Nightwatch proxy blocked\n');
}

function closeSocket(socket: Duplex, status = 403): void {
  socket.once('error', () => {
    // A denied client can reset immediately after receiving the local block;
    // that is a client-side close, never an upstream connection failure.
  });
  if (!socket.destroyed) {
    socket.end(`HTTP/1.1 ${status} ${statusText(status)}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  }
}

function safeHeaderCopy(headers: IncomingMessage['headers']): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (lower === 'proxy-authorization' || lower === 'proxy-connection') continue;
    out[name] = value;
  }
  return out;
}

function boundedTimeout(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) return fallback;
  return Math.min(value, maximum);
}

function exactSocketOptions(target: AdmittedSocketTarget, port: number): net.NetConnectOpts {
  return {
    host: target.address,
    port,
    family: target.family,
    // Keep the socket's lookup authority inside this exact binding. The
    // callback only returns the already-admitted numeric destination.
    lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
  };
}

interface AdmittedSocketTarget {
  readonly address: string;
  readonly family: 4 | 6;
  readonly addressClass: NonNullable<ProxyEvent['addressClass']>;
}

interface ConnectionResult {
  readonly outcome: Exclude<ProxyConnectionOutcome, 'not-attempted' | 'attempted'>;
  readonly failure?: ProxyConnectionFailureReason;
}

function targetFromResolution(resolution: ProxyResolution): AdmittedSocketTarget | null {
  if (resolution.outcome !== 'admitted' || resolution.selected === null) return null;
  return resolution.selected;
}

function isRequestCancelled(req: IncomingMessage, shuttingDown: boolean): boolean {
  return shuttingDown || req.aborted || req.destroyed;
}

function resolutionFailureViolation(resolution: ProxyResolution): 'RESOLVED_ADDRESS_POLICY_DENIED' | 'RESOLUTION_FAILED' {
  return resolution.outcome === 'denied' ? 'RESOLVED_ADDRESS_POLICY_DENIED' : 'RESOLUTION_FAILED';
}

/** Convert OS/socket errors to the bounded vocabulary allowed in evidence. */
function connectionFailureReason(error: unknown, shuttingDown: boolean): ProxyConnectionFailureReason {
  if (shuttingDown) return 'PROXY_SHUTDOWN';
  const code = error !== null && typeof error === 'object' && 'code' in error
    ? (error as { readonly code?: unknown }).code
    : undefined;
  if (code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'CONNECTION_TIMEOUT';
  return 'TRANSPORT_FAILURE';
}

export interface OutboundProxyOptions {
  policy: OutboundPolicy;
  host?: '127.0.0.1' | '::1';
  port?: number;
  eventLogPath?: string;
  runId?: string;
  environment: string;
  /** Synthetic tests may inject a data-only resolver; production uses the internal system resolver. */
  resolver?: ProxyResolver;
  resolverTimeoutMs?: number;
  connectTimeoutMs?: number;
}

export interface OutboundProxyServer {
  readonly address: string;
  readonly port: number;
  readonly eventLogPath: string;
  readonly server: HttpServer;
  health(): boolean;
  close(): Promise<void>;
}

export async function startOutboundProxy(opts: OutboundProxyOptions): Promise<OutboundProxyServer> {
  const host = opts.host ?? DEFAULT_PROXY_HOST;
  if (!isLoopback(host)) throw new Error('Nightwatch proxy refuses non-loopback bind address');
  if (opts.policy.environment.name !== opts.environment) {
    throw new Error('Nightwatch proxy policy/environment mismatch');
  }
  const port = opts.port ?? DEFAULT_PROXY_PORT;
  if (!Number.isInteger(port) || (port !== 0 && port < 1024) || port > 65535) {
    throw new Error(`Nightwatch proxy requires an unprivileged TCP port, got ${String(port)}`);
  }
  const eventLogPath = opts.eventLogPath ?? DEFAULT_PROXY_EVENT_LOG;
  const leaseOwner = Number(process.env[PROXY_PORT_LEASE_OWNER_ENV]);
  const releaseLeaseOnClose = port !== 0
    && Number(process.env.NIGHTWATCH_PROXY_PORT) === port
    && typeof process.env.NIGHTWATCH_PROXY_LEASE_TOKEN === 'string'
    && (!Number.isInteger(leaseOwner) || leaseOwner === process.pid);
  if (releaseLeaseOnClose) process.env[PROXY_PORT_LEASE_OWNER_ENV] = String(process.pid);
  ensureEventLog(eventLogPath);
  let eventSeq = 0;
  const requestedRunId = opts.runId ?? process.env.NIGHTWATCH_RUN_ID ?? 'playwright-suite';
  const runId = /^[A-Za-z0-9._-]{1,128}$/.test(requestedRunId) ? requestedRunId : 'playwright-suite';
  const server = http.createServer();
  const resolver = opts.resolver ?? createSystemProxyResolver();
  const resolverTimeoutMs = boundedTimeout(opts.resolverTimeoutMs, PROXY_RESOLUTION_TIMEOUT_MS, 5_000);
  const connectTimeoutMs = boundedTimeout(opts.connectTimeoutMs, DEFAULT_CONNECT_TIMEOUT_MS, MAX_CONNECT_TIMEOUT_MS);
  let shuttingDown = false;
  let evidenceWriteFailed = false;
  const activeSockets = new Set<net.Socket>();
  server.on('connection', (socket) => {
    activeSockets.add(socket);
    socket.once('close', () => activeSockets.delete(socket));
  });

  function record(
    protocol: ProxyProtocol,
    classified: ProxyClassification,
    lifecycle: Partial<Pick<ProxyEvent, 'resolution' | 'resolutionReason' | 'answerCount' | 'addressFamily' | 'addressClass' | 'connection' | 'connectionFailure' | 'containmentViolation' | 'addressBindingVersion'>> = {},
  ): boolean {
    if (evidenceWriteFailed) return false;
    const target = classified.target;
    const event: ProxyEvent = {
      seq: eventSeq++,
      timestamp: new Date().toISOString(),
      runId,
      protocol,
      host: target?.url.hostname.toLowerCase().replace(/^\[|\]$/g, '') ?? classified.decision.host,
      port: target?.port ?? null,
      classification: classified.decision.hostClass,
      semanticClassification: classified.decision.classification,
      ...(classified.decision.verdict === 'block-browser-background'
        ? { containment: 'EXPECTED_CONTAINMENT_EFFECT' as const }
        : {}),
      decision: classified.decision.verdict,
      ruleId: classified.ruleId,
      reason: classified.decision.reason,
      resolution: lifecycle.resolution ?? 'not-attempted',
      ...(lifecycle.resolutionReason === undefined ? {} : { resolutionReason: lifecycle.resolutionReason }),
      ...(lifecycle.answerCount === undefined ? {} : { answerCount: lifecycle.answerCount }),
      ...(lifecycle.addressFamily === undefined ? {} : { addressFamily: lifecycle.addressFamily }),
      ...(lifecycle.addressClass === undefined ? {} : { addressClass: lifecycle.addressClass }),
      connection: lifecycle.connection ?? 'not-attempted',
      ...(lifecycle.connectionFailure === undefined ? {} : { connectionFailure: lifecycle.connectionFailure }),
      ...(lifecycle.containmentViolation === undefined ? {} : { containmentViolation: lifecycle.containmentViolation }),
      ...(lifecycle.addressBindingVersion === undefined ? {} : { addressBindingVersion: lifecycle.addressBindingVersion }),
    };
    try {
      appendProxyEvent(eventLogPath, event);
      return true;
    } catch {
      // Evidence is part of the containment contract. Once it cannot be
      // persisted, no later request may be allowed through this proxy.
      evidenceWriteFailed = true;
      return false;
    }
  }

  async function resolveTarget(classified: ProxyClassification): Promise<ProxyResolution | null> {
    if (classified.decision.verdict !== 'allow' || classified.target === null) return null;
    return await resolveAndAdmitTarget(
      classified.target.hostname,
      opts.policy.environment.name,
      resolver,
      { timeoutMs: resolverTimeoutMs },
    );
  }

  function resolutionLifecycle(resolution: ProxyResolution): Pick<ProxyEvent, 'resolution' | 'resolutionReason' | 'answerCount' | 'containmentViolation'> {
    return {
      resolution: resolution.outcome,
      resolutionReason: resolution.reason,
      answerCount: resolution.answerCount,
      ...(resolution.outcome === 'admitted' ? {} : { containmentViolation: resolutionFailureViolation(resolution) }),
    };
  }

  function observeHttpConnection(request: http.ClientRequest): Promise<ConnectionResult> {
    return new Promise<ConnectionResult>((resolve) => {
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      const finish = (result: ConnectionResult): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        resolve(result);
      };
      timer = setTimeout(() => {
        request.destroy();
        finish({ outcome: 'failed', failure: 'CONNECTION_TIMEOUT' });
      }, connectTimeoutMs);
      timer.unref?.();
      request.once('socket', (socket) => {
        activeSockets.add(socket);
        socket.once('close', () => activeSockets.delete(socket));
        socket.once('connect', () => {
          socket.setTimeout(0);
          finish({ outcome: 'connected' });
        });
        socket.once('timeout', () => {
          request.destroy();
          finish({ outcome: 'failed', failure: 'CONNECTION_TIMEOUT' });
        });
        socket.once('error', (error) => finish({ outcome: 'failed', failure: connectionFailureReason(error, shuttingDown) }));
        socket.setTimeout(connectTimeoutMs);
      });
      request.once('error', (error) => finish({ outcome: 'failed', failure: connectionFailureReason(error, shuttingDown) }));
    });
  }

  function dialExact(target: AdmittedSocketTarget, port: number, clientSocket: Duplex): { socket: net.Socket; result: Promise<ConnectionResult> } | null {
    let upstream: net.Socket;
    try {
      upstream = net.connect(exactSocketOptions(target, port));
    } catch {
      return null;
    }
    activeSockets.add(upstream);
    upstream.once('close', () => activeSockets.delete(upstream));
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const result = new Promise<ConnectionResult>((resolve) => {
      const finish = (value: ConnectionResult): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        resolve(value);
      };
      timer = setTimeout(() => {
        upstream.destroy();
        finish({ outcome: 'failed', failure: 'CONNECTION_TIMEOUT' });
      }, connectTimeoutMs);
      timer.unref?.();
      upstream.once('connect', () => {
        upstream.setTimeout(0);
        finish({ outcome: 'connected' });
      });
      upstream.once('timeout', () => {
        upstream.destroy();
        finish({ outcome: 'failed', failure: 'CONNECTION_TIMEOUT' });
      });
      upstream.once('error', (error) => finish({ outcome: 'failed', failure: connectionFailureReason(error, shuttingDown) }));
      clientSocket.once('close', () => {
        if (!settled) {
          upstream.destroy();
          finish({ outcome: 'failed', failure: 'CLIENT_ABORTED' });
        }
      });
      clientSocket.once('error', () => {
        if (!settled) {
          upstream.destroy();
          finish({ outcome: 'failed', failure: 'CLIENT_ABORTED' });
        }
      });
      upstream.setTimeout(connectTimeoutMs);
    });
    return { socket: upstream, result };
  }

  const handleForwardRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // This endpoint is only for the local startup health check. It is not a
    // destination and never invokes policy, DNS, or an upstream connection.
    if (req.url === '/__nightwatch_health' && req.method === 'GET') {
      res.writeHead(evidenceWriteFailed ? 503 : 204, { Connection: 'close' });
      res.end();
      return;
    }
    if (evidenceWriteFailed) {
      writeLocalBlock(res, 502);
      return;
    }
    const classified = classifyForwardRequest(opts.policy, req.url, req.headers.host);
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      record('http', classified);
      writeLocalBlock(res);
      return;
    }
    if (isRequestCancelled(req, shuttingDown)) {
      record('http', classified, { resolution: 'failed', resolutionReason: 'RESOLUTION_CANCELLED', connection: 'not-attempted' });
      return;
    }
    const resolution = await resolveTarget(classified);
    if (resolution === null) return;
    if (isRequestCancelled(req, shuttingDown)) {
      record('http', classified, {
        ...resolutionLifecycle(resolution),
        connection: 'not-attempted',
        ...(resolution.outcome === 'admitted' ? { connectionFailure: 'CLIENT_ABORTED' as const } : {}),
      });
      return;
    }
    const target = classified.target;
    const selected = targetFromResolution(resolution);
    if (selected === null) {
      record('http', classified, { ...resolutionLifecycle(resolution), connection: 'not-attempted' });
      writeLocalBlock(res, 502);
      return;
    }

    let upstream: http.ClientRequest;
    try {
      upstream = http.request({
        protocol: 'http:',
        hostname: selected.address,
        family: selected.family,
        port: requestPort(target),
        method: req.method,
        path: target.path,
        agent: false,
        // `hostname` is numeric as a second guard; this callback makes the
        // no-second-resolution contract explicit in Node's HTTP connector.
        lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
        headers: { ...safeHeaderCopy(req.headers), host: target.url.host },
      });
    } catch {
      record('http', classified, {
        ...resolutionLifecycle(resolution),
        addressFamily: selected.family,
        addressClass: selected.addressClass,
        connection: 'failed',
        connectionFailure: 'TRANSPORT_FAILURE',
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        containmentViolation: 'EXACT_ADDRESS_BINDING_FAILED',
      });
      writeLocalBlock(res, 502);
      return;
    }
    const connection = observeHttpConnection(upstream);
    upstream.once('response', (upstreamResponse) => {
      if (res.destroyed) return;
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    });
    upstream.once('error', () => writeLocalBlock(res, 502));
    req.pipe(upstream);
    const result = await connection;
    const recorded = record('http', classified, {
      ...resolutionLifecycle(resolution),
      addressFamily: selected.family,
      addressClass: selected.addressClass,
      connection: result.outcome,
      ...(result.failure === undefined ? {} : { connectionFailure: result.failure }),
      addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
    });
    if (!recorded) {
      upstream.destroy();
      req.destroy();
      res.destroy();
    }
  };

  server.on('request', (req, res) => {
    void handleForwardRequest(req, res).catch(() => {
      writeLocalBlock(res, 502);
    });
  });

  const handleConnect = async (req: IncomingMessage, clientSocket: Duplex): Promise<void> => {
    if (evidenceWriteFailed) {
      closeSocket(clientSocket, 502);
      return;
    }
    const classified = classifyProxyConnect(opts.policy, req.url ?? '');
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      record('https-connect', classified);
      closeSocket(clientSocket, 403);
      return;
    }
    if (isRequestCancelled(req, shuttingDown) || clientSocket.destroyed) {
      record('https-connect', classified, { resolution: 'failed', resolutionReason: 'RESOLUTION_CANCELLED', connection: 'not-attempted' });
      closeSocket(clientSocket, 502);
      return;
    }
    const resolution = await resolveTarget(classified);
    if (resolution === null) return;
    const target = classified.target;
    const selected = targetFromResolution(resolution);
    if (selected === null || isRequestCancelled(req, shuttingDown) || clientSocket.destroyed) {
      record('https-connect', classified, { ...resolutionLifecycle(resolution), connection: 'not-attempted' });
      closeSocket(clientSocket, 502);
      return;
    }
    const dial = dialExact(selected, target.port, clientSocket);
    if (dial === null) {
      record('https-connect', classified, {
        ...resolutionLifecycle(resolution),
        addressFamily: selected.family,
        addressClass: selected.addressClass,
        connection: 'failed',
        connectionFailure: 'TRANSPORT_FAILURE',
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        containmentViolation: 'EXACT_ADDRESS_BINDING_FAILED',
      });
      closeSocket(clientSocket, 502);
      return;
    }
    const { socket: upstream, result } = dial;
    upstream.once('connect', () => {
      if (clientSocket.destroyed || shuttingDown) {
        upstream.destroy();
        return;
      }
      clientSocket.write('HTTP/1.1 200 Connection Established\r\nConnection: keep-alive\r\n\r\n');
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.once('error', () => closeSocket(clientSocket, 502));
    const connection = await result;
    const recorded = record('https-connect', classified, {
      ...resolutionLifecycle(resolution),
      addressFamily: selected.family,
      addressClass: selected.addressClass,
      connection: connection.outcome,
      ...(connection.failure === undefined ? {} : { connectionFailure: connection.failure }),
      addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
    });
    if (!recorded) {
      upstream.destroy();
      clientSocket.destroy();
      return;
    }
    if (connection.outcome === 'failed') closeSocket(clientSocket, 502);
  };

  server.on('connect', (req, clientSocket) => {
    void handleConnect(req, clientSocket).catch(() => closeSocket(clientSocket, 502));
  });

  const handleUpgrade = async (req: IncomingMessage, clientSocket: Duplex, head: Buffer): Promise<void> => {
    if (evidenceWriteFailed) {
      closeSocket(clientSocket, 502);
      return;
    }
    const hostHeader = req.headers.host;
    const rawUrl = req.url ?? '';
    const absolute = rawUrl.startsWith('/') && hostHeader ? `ws://${hostHeader}${rawUrl}` : rawUrl;
    const classified = classifyProxyUrl(opts.policy, absolute);
    const protocol = classified.target?.protocol === 'wss' ? 'wss' : 'ws';
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      record(protocol, classified);
      closeSocket(clientSocket, 403);
      return;
    }
    if (clientSocket.destroyed || shuttingDown) {
      record(protocol, classified, { resolution: 'failed', resolutionReason: 'RESOLUTION_CANCELLED', connection: 'not-attempted' });
      closeSocket(clientSocket, 502);
      return;
    }
    const resolution = await resolveTarget(classified);
    if (resolution === null) return;
    const target = classified.target;
    const selected = targetFromResolution(resolution);
    if (selected === null || clientSocket.destroyed || shuttingDown) {
      record(protocol, classified, { ...resolutionLifecycle(resolution), connection: 'not-attempted' });
      closeSocket(clientSocket, 502);
      return;
    }
    const dial = dialExact(selected, target.port, clientSocket);
    if (dial === null) {
      record(protocol, classified, {
        ...resolutionLifecycle(resolution),
        addressFamily: selected.family,
        addressClass: selected.addressClass,
        connection: 'failed',
        connectionFailure: 'TRANSPORT_FAILURE',
        addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
        containmentViolation: 'EXACT_ADDRESS_BINDING_FAILED',
      });
      closeSocket(clientSocket, 502);
      return;
    }
    const { socket: upstream, result } = dial;
    upstream.once('connect', () => {
      if (clientSocket.destroyed || shuttingDown) {
        upstream.destroy();
        return;
      }
      const headers = safeHeaderCopy(req.headers);
      delete headers.host;
      const headerLines = Object.entries(headers)
        .flatMap(([name, value]) => {
          const values = Array.isArray(value) ? value : [value ?? ''];
          return values.map((v) => `${name}: ${v}`);
        })
        .join('\r\n');
      upstream.write(`${req.method ?? 'GET'} ${target.path} HTTP/1.1\r\nHost: ${target.url.host}\r\n${headerLines}\r\n\r\n`);
      if (head.length > 0) upstream.write(head);
      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
    });
    upstream.once('error', () => closeSocket(clientSocket, 502));
    const connection = await result;
    const recorded = record(protocol, classified, {
      ...resolutionLifecycle(resolution),
      addressFamily: selected.family,
      addressClass: selected.addressClass,
      connection: connection.outcome,
      ...(connection.failure === undefined ? {} : { connectionFailure: connection.failure }),
      addressBindingVersion: EXACT_ADDRESS_BINDING_VERSION,
    });
    if (!recorded) {
      upstream.destroy();
      clientSocket.destroy();
      return;
    }
    if (connection.outcome === 'failed') closeSocket(clientSocket, 502);
  };

  server.on('upgrade', (req, clientSocket, head) => {
    void handleUpgrade(req, clientSocket, head).catch(() => closeSocket(clientSocket, 502));
  });

  server.on('clientError', (_error, socket) => {
    closeSocket(socket, 400);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    });
  } catch (error) {
    if (releaseLeaseOnClose) releaseProxyPortLease();
    throw error;
  }
  const addressInfo = server.address() as AddressInfo | null;
  if (addressInfo === null || !isLoopback(host)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (releaseLeaseOnClose) releaseProxyPortLease();
    throw new Error('Nightwatch proxy did not bind a loopback address');
  }
  const actualPort = addressInfo.port;
  return {
    address: proxyAddress(host, actualPort),
    port: actualPort,
    eventLogPath,
    server,
    health: () => server.listening && server.address() !== null && !evidenceWriteFailed,
    close: () =>
      new Promise<void>((resolve) => {
        shuttingDown = true;
        for (const socket of activeSockets) socket.destroy();
        if (!server.listening) {
          if (releaseLeaseOnClose) releaseProxyPortLease();
          resolve();
          return;
        }
        server.close(() => {
          if (releaseLeaseOnClose) releaseProxyPortLease();
          resolve();
        });
      }),
  };
}

export function proxyStatePath(root = NIGHTWATCH_REPOSITORY_ROOT): string {
  return path.join(root, DEFAULT_PROXY_STATE_PATH.replace('.json', `${proxyLeaseRuntimeSuffix()}.json`));
}

export function proxyEventLogPath(root = NIGHTWATCH_REPOSITORY_ROOT): string {
  return path.join(root, DEFAULT_PROXY_EVENT_LOG.replace('.jsonl', `${proxyLeaseRuntimeSuffix()}.jsonl`));
}

export function proxyServerUrl(root = NIGHTWATCH_REPOSITORY_ROOT): string {
  const rawPort = process.env.NIGHTWATCH_PROXY_PORT ?? String(DEFAULT_PROXY_PORT);
  const preferredPort = Number(rawPort);
  if (!Number.isInteger(preferredPort) || preferredPort < 1024 || preferredPort > 65535) {
    throw new Error(`invalid NIGHTWATCH_PROXY_PORT ${JSON.stringify(rawPort)}`);
  }
  const lease = ensureProxyPortLease(root, preferredPort);
  return `http://${DEFAULT_PROXY_HOST}:${lease.port}`;
}

export function writeProxyRuntimeState(state: ProxyRuntimeState, file = proxyStatePath()): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
