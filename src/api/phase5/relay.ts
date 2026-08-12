import http from 'node:http';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { OutboundPolicy } from '../../core/safety/outboundPolicy';
import type { EnvironmentConfig } from '../../core/environment/types';
import { getPhase5Operation } from './catalog';
import { evaluateApiResponse } from './oracle';
import type { ApiOperation, ApiOracleObservation, ApiCatalog } from './types';

export interface Phase5RuntimeHydration {
  period: string;
  vendor: 'aws' | 'azure';
}

export interface RelayRequestContext {
  operation: ApiOperation;
  target: URL;
  headers: Readonly<Record<string, string>>;
}

export interface RelayFetchResponse {
  status: number;
  headers: Readonly<Record<string, string | undefined>>;
  body: Uint8Array;
  complete?: boolean;
}

export type RelayFetcher = (context: RelayRequestContext) => Promise<RelayFetchResponse>;

export interface RelayObservation {
  operationId: string;
  destinationHostClass: 'DEV_API' | 'LOCAL_LOOPBACK';
  destinationHost: string;
  method: 'GET';
  status: number | null;
  requestPathClass: 'CATALOG_RESOLVED';
  oracle: ApiOracleObservation;
  redirect: 'NONE' | 'APPROVED_SAME_ORIGIN' | 'BLOCKED';
  safetyBlock?: 'UNKNOWN_OPERATION' | 'KNOWN_MUTATION' | 'UNKNOWN_DESTINATION' | 'PRODUCTION_DESTINATION' | 'OPERATION_MISMATCH' | 'UNSAFE_INBOUND_HEADER';
  bodyForwardedToOops: false;
}

export interface Phase5Relay {
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly server: HttpServer;
  readonly address: string;
  readonly violations: readonly string[];
  takeObservation(operationId: string): RelayObservation | undefined;
  close(): Promise<void>;
}

export interface StartRelayOptions {
  catalog: ApiCatalog;
  mode: 'local' | 'dev';
  environment?: EnvironmentConfig;
  hydration?: Partial<Phase5RuntimeHydration>;
  targetResolver?: (operation: ApiOperation, hydration: Phase5RuntimeHydration) => URL;
  fetcher?: RelayFetcher;
  authHeaders?: () => Promise<Readonly<Record<string, string>>>;
  maxBodyBytes?: number;
  upstreamTimeoutMs?: number;
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const OPERATION_PATH_RE = /^\/v1\/operations\/([a-z][a-z0-9]*(?:[._-][a-z0-9]+)+)$/;
const SAFE_INBOUND_HEADERS = new Set(['accept', 'host', 'x-nightwatch-operation-id', 'connection', 'user-agent', 'accept-encoding', 'accept-language', 'sec-fetch-mode', 'content-length']);

function writeEmpty(res: ServerResponse, status: number, headers: Record<string, string> = {}): void {
  if (res.headersSent) return;
  res.writeHead(status, {
    Connection: 'close',
    'Content-Length': '0',
    ...headers,
  });
  res.end();
}

function defaultHydration(overrides: Partial<Phase5RuntimeHydration> = {}): Phase5RuntimeHydration {
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return { period, vendor: 'aws', ...overrides };
}

function hydratePath(template: string, hydration: Phase5RuntimeHydration): string {
  if (!PERIOD_RE.test(hydration.period)) throw new Error('unsafe runtime period');
  if (!['aws', 'azure'].includes(hydration.vendor)) throw new Error('unsafe runtime vendor');
  const path = template
    .replaceAll('${NW_RUNTIME_PERIOD}', hydration.period)
    .replaceAll('${NW_RUNTIME_VENDOR}', hydration.vendor);
  if (path.includes('${') || !path.startsWith('/')) throw new Error('unresolved or unsafe operation path');
  return path;
}

function defaultTargetResolver(operation: ApiOperation, environment: EnvironmentConfig, hydration: Phase5RuntimeHydration): URL {
  if (operation.requiredHostClass !== 'DEV_API' || (environment.name !== 'dev' && environment.name !== 'next')) {
    throw new Error('DEV operation requires selected dev/next environment');
  }
  const host = environment.apiHosts?.[0];
  if (host === undefined || host.includes('/') || host.includes('*') || host.includes(':')) throw new Error('environment has no exact API host');
  const target = new URL(`https://${host}${hydratePath(operation.pathTemplate, hydration)}`);
  if (operation.requestSchema?.queryTemplate !== undefined) {
    for (const [key, value] of Object.entries(operation.requestSchema.queryTemplate)) target.searchParams.set(key, value);
  }
  return target;
}

function policyAllowsTarget(target: URL, operation: ApiOperation, environment: EnvironmentConfig | undefined, mode: 'local' | 'dev'): boolean {
  if (mode === 'local') return target.protocol === 'http:' && target.hostname === '127.0.0.1';
  if (environment === undefined) return false;
  const decision = new OutboundPolicy(environment).decide(target.toString());
  return operation.requiredHostClass === 'DEV_API' && decision.verdict === 'allow' && decision.hostClass === environment.name;
}

async function defaultFetch(context: RelayRequestContext): Promise<RelayFetchResponse> {
  const response = await fetch(context.target, {
    method: 'GET',
    headers: context.headers,
    redirect: 'manual',
  });
  const reader = response.body?.getReader();
  if (reader === undefined) return { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? undefined }, body: new Uint8Array() };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let complete = true;
  const max = 2 * 1024 * 1024;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    const chunk = next.value;
    if (total + chunk.byteLength > max) {
      complete = false;
      await reader.cancel();
      break;
    }
    chunks.push(chunk);
    total += chunk.byteLength;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? undefined, location: response.headers.get('location') ?? undefined },
    body,
    complete,
  };
}

function redirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

async function callWithRedirectPolicy(
  context: RelayRequestContext,
  fetcher: RelayFetcher,
  mode: 'local' | 'dev',
  timeoutMs: number,
): Promise<{ response: RelayFetchResponse; redirect: RelayObservation['redirect'] }> {
  const withTimeout = async (request: RelayRequestContext): Promise<RelayFetchResponse> => {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        fetcher(request),
        new Promise<RelayFetchResponse>((_, reject) => {
          timer = setTimeout(() => reject(new Error('relay upstream timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
  let response = await withTimeout(context);
  if (!redirectStatus(response.status)) return { response, redirect: 'NONE' };
  const location = response.headers['location'];
  if (location === undefined) return { response, redirect: 'BLOCKED' };
  let redirect: URL;
  try {
    redirect = new URL(location, context.target);
  } catch {
    return { response, redirect: 'BLOCKED' };
  }
  const sameOrigin = redirect.origin === context.target.origin;
  const samePath = redirect.pathname === context.target.pathname;
  // Local fixtures may exercise a same-origin redirect path. DEV is stricter:
  // a source operation may not silently turn into another path family.
  if (!sameOrigin || (mode === 'dev' && !samePath)) return { response, redirect: 'BLOCKED' };
  response = await withTimeout({ ...context, target: redirect });
  if (redirectStatus(response.status)) return { response, redirect: 'BLOCKED' };
  return { response, redirect: 'APPROVED_SAME_ORIGIN' };
}

export async function startPhase5Relay(options: StartRelayOptions): Promise<Phase5Relay> {
  const hydration = defaultHydration(options.hydration);
  if (!PERIOD_RE.test(hydration.period)) throw new Error('invalid Phase 5 runtime period');
  const fetcher = options.fetcher ?? defaultFetch;
  const observations = new Map<string, RelayObservation>();
  const violations: string[] = [];
  const server = http.createServer();

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const rawPath = req.url ?? '';
    const parsed = new URL(rawPath, 'http://127.0.0.1');
    const match = OPERATION_PATH_RE.exec(parsed.pathname);
    const inboundOperation = req.headers['x-nightwatch-operation-id'];
    const inboundOperationId = Array.isArray(inboundOperation) ? inboundOperation[0] : inboundOperation;
    const operationId = match?.[1];
    const reject = (reason: NonNullable<RelayObservation['safetyBlock']>, status = 403): void => {
      if (operationId !== undefined) {
        const fallbackOperation = options.catalog.operations.find((candidate) => candidate.operationId === operationId);
        if (fallbackOperation !== undefined) {
          observations.set(operationId, {
            operationId,
            destinationHostClass: options.mode === 'local' ? 'LOCAL_LOOPBACK' : 'DEV_API',
            destinationHost: 'blocked',
            method: 'GET',
            status,
            requestPathClass: 'CATALOG_RESOLVED',
            oracle: { oracleId: fallbackOperation.oracleProfile ?? operationId, result: 'NETWORK_FAILURE', statusClass: 'blocked', contentTypeClass: 'absent', parseCategory: 'not-evaluated', streamCategory: 'safety-block', bodyPersisted: false },
            redirect: 'NONE',
            safetyBlock: reason,
            bodyForwardedToOops: false,
          });
        }
      }
      violations.push(reason);
      writeEmpty(res, status, { 'X-Nightwatch-Relay-Block': reason });
    };

    if (req.method !== 'GET' || parsed.search !== '') return reject('UNSAFE_INBOUND_HEADER');
    if (operationId === undefined || inboundOperationId !== operationId) return reject('OPERATION_MISMATCH');
    for (const key of Object.keys(req.headers)) {
      if (!SAFE_INBOUND_HEADERS.has(key.toLowerCase())) return reject('UNSAFE_INBOUND_HEADER');
    }
    const contentLength = req.headers['content-length'];
    if (contentLength !== undefined && contentLength !== '0') return reject('UNSAFE_INBOUND_HEADER');
    const operation = options.catalog.operations.find((candidate) => candidate.operationId === operationId);
    if (operation === undefined) return reject('UNKNOWN_OPERATION');
    if (operation.semanticClass === 'KNOWN_MUTATION') return reject('KNOWN_MUTATION');
    if (operation.semanticClass === 'UNKNOWN') return reject('UNKNOWN_OPERATION');
    if (operation.generationStatus !== 'GENERATION_ELIGIBLE') return reject('OPERATION_MISMATCH');

    let target: URL;
    try {
      target = options.targetResolver === undefined
        ? defaultTargetResolver(operation, options.environment as EnvironmentConfig, hydration)
        : options.targetResolver(operation, hydration);
    } catch (error) {
      if (options.mode === 'local') {
        // Local tests provide a fetcher that owns the synthetic destination;
        // its URL remains loopback and is still checked below.
        target = new URL(`http://127.0.0.1:${req.socket.localPort ?? 0}${hydratePath(operation.pathTemplate, hydration)}`);
      } else {
        return reject('UNKNOWN_DESTINATION');
      }
    }
    if (!policyAllowsTarget(target, operation, options.environment, options.mode)) {
      return reject(target.hostname === '127.0.0.1' || target.hostname === 'localhost' ? 'UNKNOWN_DESTINATION' : 'PRODUCTION_DESTINATION');
    }
    const auth = options.authHeaders === undefined ? {} : await options.authHeaders();
    const headers: Record<string, string> = { Accept: 'application/json', ...auth };
    const context: RelayRequestContext = { operation, target, headers };
    let result: { response: RelayFetchResponse; redirect: RelayObservation['redirect'] };
    try {
      result = await callWithRedirectPolicy(context, fetcher, options.mode, options.upstreamTimeoutMs ?? 15_000);
    } catch {
      const oracle = { oracleId: operation.oracleProfile ?? operationId, result: 'NETWORK_FAILURE' as const, statusClass: 'network', contentTypeClass: 'absent', parseCategory: 'transport-error', streamCategory: 'unknown', bodyPersisted: false as const };
      observations.set(operationId, { operationId, destinationHostClass: options.mode === 'local' ? 'LOCAL_LOOPBACK' : 'DEV_API', destinationHost: target.hostname, method: 'GET', status: null, requestPathClass: 'CATALOG_RESOLVED', oracle, redirect: 'NONE', bodyForwardedToOops: false });
      return writeEmpty(res, 502, { 'X-Nightwatch-Oracle': oracle.result });
    }
    const response = result.response;
    const oracle = evaluateApiResponse(operation, response.status, response.headers, response.body, response.complete ?? true);
    const observation: RelayObservation = {
      operationId,
      destinationHostClass: options.mode === 'local' ? 'LOCAL_LOOPBACK' : 'DEV_API',
      destinationHost: target.hostname,
      method: 'GET',
      status: response.status,
      requestPathClass: 'CATALOG_RESOLVED',
      oracle,
      redirect: result.redirect,
      ...(result.redirect === 'BLOCKED' ? { safetyBlock: 'UNKNOWN_DESTINATION' as const } : {}),
      bodyForwardedToOops: false,
    };
    observations.set(operationId, observation);
    if (result.redirect === 'BLOCKED') return writeEmpty(res, 502, { 'X-Nightwatch-Oracle': 'REDIRECT_BLOCKED' });
    const responseHeaders: Record<string, string> = { 'X-Nightwatch-Oracle': oracle.result };
    const contentType = response.headers['content-type'];
    if (contentType !== undefined) responseHeaders['Content-Type'] = contentType.split(';', 1)[0] ?? 'application/octet-stream';
    // Deliberately return no upstream body. OOPS receives only status and
    // bounded metadata; customer/fixture bodies never enter its process.
    return writeEmpty(res, response.status, responseHeaders);
  };

  server.on('request', (req, res) => {
    void handle(req, res).catch(() => writeEmpty(res, 502, { 'X-Nightwatch-Relay-Block': 'RELAY_INTERNAL_FAILURE' }));
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });
  const address = server.address() as AddressInfo | null;
  if (address === null || address.address !== '127.0.0.1') {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Phase 5 relay refused non-loopback bind');
  }
  return {
    host: '127.0.0.1',
    port: address.port,
    address: `http://127.0.0.1:${address.port}`,
    server,
    violations,
    takeObservation: (operationId: string) => observations.get(operationId),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export function resolvePhase5OperationTarget(operation: ApiOperation, environment: EnvironmentConfig, hydration?: Partial<Phase5RuntimeHydration>): URL {
  return defaultTargetResolver(operation, environment, defaultHydration(hydration));
}

export interface NativePhase5RequestOptions {
  operation: ApiOperation;
  mode: 'local' | 'dev';
  environment?: EnvironmentConfig;
  hydration?: Partial<Phase5RuntimeHydration>;
  targetResolver?: (operation: ApiOperation, hydration: Phase5RuntimeHydration) => URL;
  fetcher?: RelayFetcher;
  authHeaders?: () => Promise<Readonly<Record<string, string>>>;
  upstreamTimeoutMs?: number;
}

/** Execute the same catalog-resolved request and oracle without OOPS. */
export async function executeNativePhase5Operation(options: NativePhase5RequestOptions): Promise<RelayObservation> {
  const hydration = defaultHydration(options.hydration);
  if (options.operation.semanticClass !== 'KNOWN_READ') throw new Error('fail-closed: native API runner only accepts KNOWN_READ');
  const target = options.targetResolver === undefined
    ? defaultTargetResolver(options.operation, options.environment as EnvironmentConfig, hydration)
    : options.targetResolver(options.operation, hydration);
  if (!policyAllowsTarget(target, options.operation, options.environment, options.mode)) {
    throw new Error('fail-closed: native API target denied by outbound policy');
  }
  const auth = options.authHeaders === undefined ? {} : await options.authHeaders();
  const fetcher = options.fetcher ?? defaultFetch;
  try {
    const result = await callWithRedirectPolicy({ operation: options.operation, target, headers: { Accept: 'application/json', ...auth } }, fetcher, options.mode, options.upstreamTimeoutMs ?? 15_000);
    const oracle = evaluateApiResponse(options.operation, result.response.status, result.response.headers, result.response.body, result.response.complete ?? true);
    return {
      operationId: options.operation.operationId,
      destinationHostClass: options.mode === 'local' ? 'LOCAL_LOOPBACK' : 'DEV_API',
      destinationHost: target.hostname,
      method: 'GET',
      status: result.response.status,
      requestPathClass: 'CATALOG_RESOLVED',
      oracle,
      redirect: result.redirect,
      ...(result.redirect === 'BLOCKED' ? { safetyBlock: 'UNKNOWN_DESTINATION' as const } : {}),
      bodyForwardedToOops: false,
    };
  } catch {
    return {
      operationId: options.operation.operationId,
      destinationHostClass: options.mode === 'local' ? 'LOCAL_LOOPBACK' : 'DEV_API',
      destinationHost: target.hostname,
      method: 'GET',
      status: null,
      requestPathClass: 'CATALOG_RESOLVED',
      oracle: { oracleId: options.operation.oracleProfile ?? options.operation.operationId, result: 'NETWORK_FAILURE', statusClass: 'network', contentTypeClass: 'absent', parseCategory: 'transport-error', streamCategory: 'unknown', bodyPersisted: false },
      redirect: 'NONE',
      bodyForwardedToOops: false,
    };
  }
}

export function phase5OperationByRelayPath(path: string, catalog = { operations: [] } as unknown as ApiCatalog): ApiOperation | undefined {
  const operationId = OPERATION_PATH_RE.exec(path)?.[1];
  if (operationId === undefined) return undefined;
  try {
    return getPhase5Operation(operationId);
  } catch {
    return catalog.operations.find((operation) => operation.operationId === operationId);
  }
}
