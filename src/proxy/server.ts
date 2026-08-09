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
import { classifyForwardRequest, classifyProxyConnect, classifyProxyUrl, type ProxyClassification, type ProxyTarget } from './policyAdapter';
import type { ProxyEvent, ProxyProtocol, ProxyRuntimeState } from './types';

export const DEFAULT_PROXY_HOST = '127.0.0.1' as const;
export const DEFAULT_PROXY_PORT = 18987;
export const DEFAULT_PROXY_STATE_PATH = '.tmp-nightwatch/proxy-state.json';
export const DEFAULT_PROXY_EVENT_LOG = '.tmp-nightwatch/proxy-events.jsonl';

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
  return status === 403 ? 'Forbidden' : 'Bad Request';
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

export interface OutboundProxyOptions {
  policy: OutboundPolicy;
  host?: '127.0.0.1' | '::1';
  port?: number;
  eventLogPath?: string;
  runId?: string;
  environment: string;
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
  ensureEventLog(eventLogPath);
  let eventSeq = 0;
  const requestedRunId = opts.runId ?? process.env.NIGHTWATCH_RUN_ID ?? 'playwright-suite';
  const runId = /^[A-Za-z0-9._-]{1,128}$/.test(requestedRunId) ? requestedRunId : 'playwright-suite';
  const server = http.createServer();

  function record(protocol: ProxyProtocol, classified: ProxyClassification): void {
    const target = classified.target;
    const event: ProxyEvent = {
      seq: eventSeq++,
      timestamp: new Date().toISOString(),
      runId,
      protocol,
      host: target?.url.hostname.toLowerCase().replace(/^\[|\]$/g, '') ?? classified.decision.host,
      port: target?.port ?? null,
      classification: classified.decision.hostClass,
      decision: classified.decision.verdict,
      ruleId: classified.ruleId,
      reason: classified.decision.reason,
    };
    appendProxyEvent(eventLogPath, event);
  }

  server.on('request', (req, res) => {
    // This endpoint is only for the local startup health check. It is not a
    // destination and never invokes policy, DNS, or an upstream connection.
    if (req.url === '/__nightwatch_health' && req.method === 'GET') {
      res.writeHead(204, { Connection: 'close' });
      res.end();
      return;
    }
    const classified = classifyForwardRequest(opts.policy, req.url, req.headers.host);
    record('http', classified);
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      writeLocalBlock(res);
      return;
    }
    const target = classified.target;
    const upstream = http.request({
      protocol: 'http:',
      hostname: target.hostname,
      port: requestPort(target),
      method: req.method,
      path: target.path,
      headers: { ...safeHeaderCopy(req.headers), host: target.url.host },
    });
    upstream.once('response', (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    });
    upstream.once('error', () => writeLocalBlock(res, 502));
    req.pipe(upstream);
  });

  server.on('connect', (req, clientSocket) => {
    const classified = classifyProxyConnect(opts.policy, req.url ?? '');
    record('https-connect', classified);
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      closeSocket(clientSocket, 403);
      return;
    }
    const target = classified.target;
    // This is the first point at which DNS/TCP is permitted: the decision
    // above was an explicit allow.
    const upstream = net.connect({ host: target.hostname, port: target.port });
    upstream.once('connect', () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\nConnection: keep-alive\r\n\r\n');
      if (req.rawHeaders.length > 0) {
        // CONNECT has no request body to replay; bytes after the headers are
        // handled by the tunnel once both sockets are connected.
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.once('error', () => closeSocket(clientSocket, 502));
    clientSocket.once('error', () => upstream.destroy());
  });

  server.on('upgrade', (req, clientSocket, head) => {
    const hostHeader = req.headers.host;
    const rawUrl = req.url ?? '';
    const absolute = rawUrl.startsWith('/') && hostHeader ? `ws://${hostHeader}${rawUrl}` : rawUrl;
    const classified = classifyProxyUrl(opts.policy, absolute);
    const protocol = classified.target?.protocol === 'wss' ? 'wss' : 'ws';
    record(protocol, classified);
    if (classified.decision.verdict !== 'allow' || classified.target === null) {
      closeSocket(clientSocket, 403);
      return;
    }
    const target = classified.target;
    const upstream = net.connect({ host: target.hostname, port: target.port });
    upstream.once('connect', () => {
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
    clientSocket.once('error', () => upstream.destroy());
  });

  server.on('clientError', (_error, socket) => {
    closeSocket(socket, 400);
  });

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
  const addressInfo = server.address() as AddressInfo | null;
  if (addressInfo === null || !isLoopback(host)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Nightwatch proxy did not bind a loopback address');
  }
  const actualPort = addressInfo.port;
  return {
    address: proxyAddress(host, actualPort),
    port: actualPort,
    eventLogPath,
    server,
    health: () => server.listening && server.address() !== null,
    close: () =>
      new Promise<void>((resolve) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close(() => resolve());
      }),
  };
}

export function proxyStatePath(root = process.cwd()): string {
  return `${root}/${DEFAULT_PROXY_STATE_PATH}`;
}

export function proxyEventLogPath(root = process.cwd()): string {
  return `${root}/${DEFAULT_PROXY_EVENT_LOG}`;
}

export function proxyServerUrl(root = process.cwd()): string {
  const rawPort = process.env.NIGHTWATCH_PROXY_PORT ?? String(DEFAULT_PROXY_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`invalid NIGHTWATCH_PROXY_PORT ${JSON.stringify(rawPort)}`);
  }
  return `http://${DEFAULT_PROXY_HOST}:${port}`;
}

export function writeProxyRuntimeState(state: ProxyRuntimeState, file = proxyStatePath()): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
