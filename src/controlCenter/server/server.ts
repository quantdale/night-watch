import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { URL } from 'node:url';
import {
  asSafeControlCenterCursor,
  asSafeControlCenterId,
  boundedGraphDepth,
  boundedPageLimit,
  boundedSequence,
  boundedTimelineLimit,
  controlCenterError,
  type ControlCenterErrorCode,
} from '../contracts/common';
import { asSafeSystemMapFocus } from '../contracts/systemMap';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../contracts/health';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterEventDto } from '../contracts/events';
import type { ControlCenterCollector, ControlCenterListQuery } from './collector';
import { parseControlCenterPath, type ControlCenterPathResult, type ControlCenterRoute } from './router';
import { ControlCenterSseHub } from './sse';
import { ControlCenterStaticAssets } from './staticAssets';

export const CONTROL_CENTER_DEFAULT_HOST = '127.0.0.1' as const;
export const CONTROL_CENTER_DEFAULT_PORT = 7312 as const;

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  Vary: 'Origin',
});
const ALLOW_GET_HEAD = 'GET, HEAD';

export interface ControlCenterServerOptions {
  readonly collector: ControlCenterCollector;
  readonly host?: string;
  readonly port?: number;
  readonly uiRoot?: string;
  readonly maxSseClients?: number;
  /**
   * The owner-local review write handler.
   *
   * OPT-IN. Omitted — which is the default and every existing caller — the
   * server stays exactly as read-only as it was: POST is refused for every
   * path, and /api/v1/reviewer/decision is not found. A write surface that
   * appeared merely because the code shipped would be a change to the
   * safety posture of every deployment.
   */
  readonly reviewDecision?: (request: unknown) => ControlCenterReviewDecisionResponse | Promise<ControlCenterReviewDecisionResponse>;
}

/** The response body of the local review write route. */
export interface ControlCenterReviewDecisionResponse {
  readonly schemaVersion: 'nightwatch.control-center.review-decision.v1';
  readonly result: string;
  readonly reviewIdentity: string | null;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

/** Bounded well below anything that could pressure memory. */
const REVIEW_DECISION_MAX_BODY_BYTES = 8_192;

/**
 * A header no cross-origin form or navigation can set without a preflight
 * the Origin check already governs. It is defence in depth behind the
 * loopback host and Origin checks, not a replacement for either.
 */
const LOCAL_WRITE_HEADER = 'x-nightwatch-local-review';

export class ControlCenterServerConfigurationError extends Error {
  readonly code = 'CONTROL_CENTER_BAD_REQUEST' as const;

  constructor() {
    super('CONTROL_CENTER_BAD_REQUEST');
    this.name = 'ControlCenterServerConfigurationError';
  }
}

export interface ControlCenterServerHandle {
  readonly server: http.Server;
  readonly events: ControlCenterSseHub;
  readonly start: () => Promise<AddressInfo>;
  readonly close: () => Promise<void>;
  readonly publish: (event: ControlCenterEventDto) => void;
}

function securityHeaders(contentType: string): Record<string, string> {
  return { ...JSON_HEADERS, 'Content-Type': contentType };
}

function statusForError(code: ControlCenterErrorCode): number {
  if (code === 'CONTROL_CENTER_NOT_FOUND') return 404;
  if (code === 'CONTROL_CENTER_METHOD_NOT_ALLOWED') return 405;
  if (code === 'CONTROL_CENTER_ORIGIN_REJECTED' || code === 'CONTROL_CENTER_HOST_REJECTED') return 403;
  if (code === 'CONTROL_CENTER_PATH_REJECTED' || code === 'CONTROL_CENTER_BAD_REQUEST') return 400;
  if (code === 'CONTROL_CENTER_PAYLOAD_TOO_LARGE') return 413;
  if (code === 'CONTROL_CENTER_UI_NOT_BUILT' || code === 'CONTROL_CENTER_SOURCE_UNAVAILABLE' || code === 'CONTROL_CENTER_SSE_LIMIT_REACHED') return 503;
  return 500;
}

function singleHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value) || value === undefined) return null;
  return value;
}

function requestUrl(request: IncomingMessage): URL | null {
  const raw = request.url;
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null;
  try {
    return new URL(raw, 'http://127.0.0.1');
  } catch {
    return null;
  }
}

function expectedHost(port: number): string {
  return `${CONTROL_CENTER_DEFAULT_HOST}:${port}`;
}

function validHost(request: IncomingMessage, port: number): boolean {
  return singleHeader(request.headers.host) === expectedHost(port);
}

function validOrigin(request: IncomingMessage, port: number): boolean {
  const header = request.headers.origin;
  if (header === undefined) return true;
  if (Array.isArray(header)) return false;
  return header === `http://${expectedHost(port)}`;
}

function hasRequestBody(request: IncomingMessage): ControlCenterErrorCode | null {
  const length = singleHeader(request.headers['content-length']);
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 0)) return 'CONTROL_CENTER_PAYLOAD_TOO_LARGE';
  if (request.headers['transfer-encoding'] !== undefined) return 'CONTROL_CENTER_PAYLOAD_TOO_LARGE';
  return null;
}

function responseBody(payload: unknown): Buffer | null {
  try {
    return Buffer.from(JSON.stringify(payload), 'utf8');
  } catch {
    return null;
  }
}

function sendJson(response: ServerResponse, status: number, payload: unknown, headOnly: boolean): void {
  const body = responseBody(payload);
  if (body === null) {
    sendError(response, 'CONTROL_CENTER_INTERNAL_FAILURE', headOnly);
    return;
  }
  response.writeHead(status, {
    ...securityHeaders('application/json; charset=utf-8'),
    'Content-Length': body.byteLength,
  });
  if (!headOnly) response.end(body);
  else response.end();
}

function sendError(response: ServerResponse, code: ControlCenterErrorCode, headOnly: boolean): void {
  sendJson(response, statusForError(code), controlCenterError(code), headOnly);
}

function queryValues(url: URL, allowed: readonly string[]): Record<string, string | null> | ControlCenterErrorCode {
  const result: Record<string, string | null> = {};
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key)) return 'CONTROL_CENTER_BAD_REQUEST';
    if (url.searchParams.getAll(key).length !== 1) return 'CONTROL_CENTER_BAD_REQUEST';
  }
  for (const key of allowed) result[key] = url.searchParams.get(key);
  return result;
}

function listQuery(url: URL, allowedExtra: readonly string[] = []): ControlCenterListQuery | ControlCenterErrorCode {
  const values = queryValues(url, ['limit', 'cursor', ...allowedExtra]);
  if (typeof values === 'string') return values;
  const limit = boundedPageLimit(values.limit);
  if (limit === null) return 'CONTROL_CENTER_BAD_REQUEST';
  const cursor = values.cursor === null ? null : asSafeControlCenterCursor(values.cursor);
  if (values.cursor !== null && cursor === null) return 'CONTROL_CENTER_PATH_REJECTED';
  return { limit, cursor };
}

function routeQuery(url: URL, route: ControlCenterRoute): Record<string, string | null> | ControlCenterErrorCode {
  if (route.kind === 'runs' || route.kind === 'campaignCoverage' || route.kind === 'findings' || route.kind === 'reviewer') return queryValues(url, ['limit', 'cursor']);
  if (route.kind === 'timeline') return queryValues(url, ['afterSeq', 'limit']);
  if (route.kind === 'sourceSurfaces') return queryValues(url, ['repo', 'limit', 'cursor']);
  if (route.kind === 'sourceGraph') return queryValues(url, ['surface', 'depth']);
  // C-15c: `focus` is the ONLY parameter these routes accept. Anything else is
  // rejected rather than ignored, so a client cannot believe it narrowed a
  // request that was in fact answered whole.
  if (route.kind === 'systemMapLevel' || route.kind === 'systemMapQuery') return queryValues(url, ['focus']);
  return queryValues(url, []);
}

function healthFallback(): ControlCenterHealthDto {
  return {
    schemaVersion: CONTROL_CENTER_HEALTH_SCHEMA_VERSION,
    status: 'UP',
    scope: 'LOCAL_LOOPBACK_ONLY',
    readOnly: true,
    productReadiness: 'NOT_REPORTED',
  };
}

function staticResponse(response: ServerResponse, result: ReturnType<ControlCenterStaticAssets['resolve']>, headOnly: boolean): void {
  if (result.kind === 'FOUND') {
    response.writeHead(200, {
      ...securityHeaders(result.contentType),
      'Content-Length': result.body.byteLength,
    });
    if (!headOnly) response.end(result.body);
    else response.end();
    return;
  }
  if (result.kind === 'UNAVAILABLE') return sendError(response, 'CONTROL_CENTER_UI_NOT_BUILT', headOnly);
  if (result.kind === 'REJECTED') return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
  return sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly);
}

/** True only for the exact write path, before any routing work is done. */
function isReviewDecisionPath(rawUrl: string | undefined): boolean {
  if (typeof rawUrl !== 'string') return false;
  const pathname = rawUrl.split('?')[0] ?? '';
  return pathname === '/api/v1/reviewer/decision';
}

/**
 * Read a bounded JSON body.
 *
 * The limit is enforced on the bytes ACTUALLY received, not on the declared
 * Content-Length, so a lying header buys nothing: the read is aborted the
 * moment the cap is passed.
 */
async function readBoundedJsonBody(request: IncomingMessage): Promise<{ readonly value: unknown } | { readonly error: ControlCenterErrorCode }> {
  const contentType = singleHeader(request.headers['content-type']);
  if (contentType === null || !/^application\/json(?:\s*;.*)?$/i.test(contentType.trim())) {
    request.resume();
    return { error: 'CONTROL_CENTER_BAD_REQUEST' };
  }
  const declared = singleHeader(request.headers['content-length']);
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > REVIEW_DECISION_MAX_BODY_BYTES)) {
    request.resume();
    return { error: 'CONTROL_CENTER_PAYLOAD_TOO_LARGE' };
  }
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
      total += buffer.byteLength;
      if (total > REVIEW_DECISION_MAX_BODY_BYTES) {
        request.destroy();
        return { error: 'CONTROL_CENTER_PAYLOAD_TOO_LARGE' };
      }
      chunks.push(buffer);
    }
  } catch {
    return { error: 'CONTROL_CENTER_BAD_REQUEST' };
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'CONTROL_CENTER_BAD_REQUEST' };
    return { value: parsed };
  } catch {
    return { error: 'CONTROL_CENTER_BAD_REQUEST' };
  }
}

async function dispatch(
  request: IncomingMessage,
  response: ServerResponse,
  options: ControlCenterServerOptions,
  events: ControlCenterSseHub,
  assets: ControlCenterStaticAssets,
  server: http.Server,
): Promise<void> {
  const headOnly = request.method === 'HEAD';
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : options.port ?? CONTROL_CENTER_DEFAULT_PORT;
  if (!validHost(request, port)) return sendError(response, 'CONTROL_CENTER_HOST_REJECTED', headOnly);
  if (!validOrigin(request, port)) return sendError(response, 'CONTROL_CENTER_ORIGIN_REJECTED', headOnly);
  // The write route is the ONLY reason a non-GET/HEAD request is read at all,
  // and only when the server was constructed with a handler for it. Every
  // other path keeps the original refusal, byte for byte.
  const writeCandidate =
    request.method === 'POST' &&
    options.reviewDecision !== undefined &&
    isReviewDecisionPath(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD' && !writeCandidate) {
    response.setHeader('Allow', ALLOW_GET_HEAD);
    return sendError(response, 'CONTROL_CENTER_METHOD_NOT_ALLOWED', false);
  }
  if (!writeCandidate) {
    const bodyError = hasRequestBody(request);
    if (bodyError !== null) {
      request.resume();
      return sendError(response, bodyError, headOnly);
    }
  }
  const url = requestUrl(request);
  if (url === null) return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
  // R-13 DEF-R13-5: encoded separators are a traversal threat in the PATH,
  // but legitimate V2 focuses carry them in the QUERY (`service%3Aservices
  // %2Fripple`, encoded by the client). Screening the whole raw URL 400d
  // every L3 drill. Scope this to the path portion: query values are already
  // allowlisted per route (`queryValues`) and charset-validated per value,
  // so nothing reaches the filesystem on the strength of an encoded slash.
  const rawPath = typeof request.url === 'string' ? request.url.split('?')[0] ?? '' : '';
  if (/%(?:2e|2f|5c|00)/i.test(rawPath)) {
    return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
  }
  const pathResult: ControlCenterPathResult = parseControlCenterPath(url.pathname);
  if (pathResult.kind === 'rejected') return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
  if (pathResult.kind === 'unknown') {
    if (url.pathname.startsWith('/api/')) return sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly);
    return staticResponse(response, assets.resolve(url.pathname), headOnly);
  }
  const route = pathResult.route;

  // The local write route. Handled before the read switch, and it accepts
  // POST and nothing else, so a GET to it is a 405 rather than an empty read.
  if (route.kind === 'reviewerDecision') {
    if (options.reviewDecision === undefined) return sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly);
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendError(response, 'CONTROL_CENTER_METHOD_NOT_ALLOWED', false);
    }
    if (singleHeader(request.headers[LOCAL_WRITE_HEADER]) !== '1') {
      request.resume();
      return sendError(response, 'CONTROL_CENTER_BAD_REQUEST', false);
    }
    if (url.searchParams.size > 0) {
      request.resume();
      return sendError(response, 'CONTROL_CENTER_BAD_REQUEST', false);
    }
    const body = await readBoundedJsonBody(request);
    if ('error' in body) return sendError(response, body.error, false);
    try {
      return sendJson(response, 200, await options.reviewDecision(body.value), false);
    } catch {
      return sendError(response, 'CONTROL_CENTER_INTERNAL_FAILURE', false);
    }
  }

  const query = routeQuery(url, route);
  if (typeof query === 'string') return sendError(response, query, headOnly);
  if (route.kind === 'events') {
    if (headOnly) {
      response.writeHead(200, securityHeaders('text/event-stream; charset=utf-8'));
      response.end();
      return;
    }
    if (!events.subscribe(request, response)) sendError(response, 'CONTROL_CENTER_SSE_LIMIT_REACHED', false);
    return;
  }
  try {
    switch (route.kind) {
      case 'health':
        return sendJson(response, 200, await options.collector.health(), headOnly);
      case 'meta':
        return sendJson(response, 200, await options.collector.meta(), headOnly);
      case 'readiness':
        return sendJson(response, 200, await options.collector.readiness(), headOnly);
      case 'safety':
        return sendJson(response, 200, await options.collector.safety(), headOnly);
      case 'runs': {
        const list = listQuery(url);
        if (typeof list === 'string') return sendError(response, list, headOnly);
        return sendJson(response, 200, await options.collector.runs(list), headOnly);
      }
      case 'run': {
        const value = await options.collector.run(route.runId);
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
      case 'timeline': {
        const afterSeq = boundedSequence(query.afterSeq) ?? (query.afterSeq === null ? 0 : -1);
        const limit = boundedTimelineLimit(query.limit);
        if (afterSeq < 0 || limit === null) return sendError(response, 'CONTROL_CENTER_BAD_REQUEST', headOnly);
        const value = await options.collector.timeline(route.runId, afterSeq, limit);
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
      case 'executionGraph': {
        const value = await options.collector.executionGraph(route.runId);
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
      case 'campaignSummary':
        return sendJson(response, 200, await options.collector.campaignSummary(), headOnly);
      case 'campaignCoverage':
        {
          const list = listQuery(url);
          if (typeof list === 'string') return sendError(response, list, headOnly);
          return sendJson(response, 200, await options.collector.campaignCoverage(list), headOnly);
        }
      case 'sourceSummary':
        return sendJson(response, 200, await options.collector.sourceSummary(), headOnly);
      case 'sourceSurfaces': {
        const repo = query.repo === null ? null : asSafeControlCenterId(query.repo);
        const list = listQuery(new URL(`http://127.0.0.1${url.search}`), ['repo']);
        if (typeof list === 'string' || (query.repo !== null && repo === null)) return sendError(response, 'CONTROL_CENTER_BAD_REQUEST', headOnly);
        return sendJson(response, 200, await options.collector.sourceSurfaces({ ...list, repositoryId: repo }), headOnly);
      }
      case 'sourceGraph': {
        const surface = query.surface === null ? null : asSafeControlCenterId(query.surface);
        const depth = boundedGraphDepth(query.depth);
        if (query.surface !== null && surface === null) return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
        if (depth === null) return sendError(response, 'CONTROL_CENTER_BAD_REQUEST', headOnly);
        const value = await options.collector.sourceGraph(surface, depth);
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
      case 'findings':
        {
          const list = listQuery(url);
          if (typeof list === 'string') return sendError(response, list, headOnly);
          return sendJson(response, 200, await options.collector.findings(list), headOnly);
        }
      case 'reviewer':
        {
          const list = listQuery(url);
          if (typeof list === 'string') return sendError(response, list, headOnly);
          return sendJson(response, 200, await options.collector.reviewer(list), headOnly);
        }
      case 'systemMapLevel': {
        const focus = query.focus === null ? null : asSafeSystemMapFocus(query.focus);
        if (query.focus !== null && focus === null) return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
        const value = await options.collector.systemMapLevel(route.level, focus);
        // Null means the focus was missing, unknown, or given where the level
        // takes none — a 404, never a silently empty map.
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
      case 'systemMapQuery': {
        const focus = query.focus === null ? null : asSafeSystemMapFocus(query.focus);
        if (query.focus !== null && focus === null) return sendError(response, 'CONTROL_CENTER_PATH_REJECTED', headOnly);
        const value = await options.collector.systemMapQuery(route.query, focus);
        return value === null ? sendError(response, 'CONTROL_CENTER_NOT_FOUND', headOnly) : sendJson(response, 200, value, headOnly);
      }
    }
  } catch {
    return sendError(response, 'CONTROL_CENTER_INTERNAL_FAILURE', headOnly);
  }
}

export function createControlCenterServer(options: ControlCenterServerOptions): ControlCenterServerHandle {
  const host = options.host ?? CONTROL_CENTER_DEFAULT_HOST;
  const port = options.port ?? CONTROL_CENTER_DEFAULT_PORT;
  if (host !== CONTROL_CENTER_DEFAULT_HOST || !Number.isInteger(port) || port < 0 || port > 65_535) throw new ControlCenterServerConfigurationError();
  const events = new ControlCenterSseHub(options.maxSseClients ?? 8);
  const assets = new ControlCenterStaticAssets(options.uiRoot);
  const server = http.createServer({ maxHeaderSize: 8 * 1024 }, (request, response) => {
    void dispatch(request, response, options, events, assets, server);
  });
  server.headersTimeout = 5_000;
  server.requestTimeout = 5_000;
  server.keepAliveTimeout = 1_000;
  server.on('clientError', (_error, socket) => socket.destroy());
  let started = false;
  let closed = false;
  return {
    server,
    events,
    start: () => new Promise<AddressInfo>((resolve, reject) => {
      if (closed) return reject(new ControlCenterServerConfigurationError());
      if (started) {
        const address = server.address();
        if (typeof address === 'object' && address !== null) return resolve(address);
        return reject(new ControlCenterServerConfigurationError());
      }
      const onError = () => {
        server.removeListener('listening', onListening);
        reject(new ControlCenterServerConfigurationError());
      };
      const onListening = () => {
        server.removeListener('error', onError);
        const address = server.address();
        if (typeof address !== 'object' || address === null) return reject(new ControlCenterServerConfigurationError());
        started = true;
        resolve(address);
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    }),
    close: () => new Promise<void>((resolve) => {
      if (closed && !started) return resolve();
      closed = true;
      events.close();
      if (!started) return resolve();
      server.close(() => {
        started = false;
        resolve();
      });
    }),
    publish: (event) => events.publish(event),
  };
}

export function createDefaultHealth(): ControlCenterHealthDto {
  return healthFallback();
}
