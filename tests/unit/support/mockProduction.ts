// ---------------------------------------------------------------------------
// C-11 test support — a MOCK production environment.
//
// Loopback-only, no external DNS, no real Alphaus host. Its entire purpose is
// to make "zero contact" a NETWORK-SIDE measurement rather than an internal
// boolean: the kernel could claim it denied while having already dispatched,
// and only the server can falsify that.
//
// Every request is counted before any handler logic runs, so a request that is
// rejected, malformed or abandoned still counts. Under-counting would make the
// zero-contact assertion vacuous, which is the one failure mode this fixture
// must not have.
// ---------------------------------------------------------------------------

import http from 'node:http';
import type { AddressInfo } from 'node:net';

export interface MockProductionRequest {
  readonly method: string;
  readonly url: string;
  readonly hadBody: boolean;
  readonly upgrade: boolean;
}

export type MockProductionBehaviour =
  | { readonly kind: 'OK'; readonly body?: string }
  | { readonly kind: 'SET_COOKIE'; readonly cookie: string }
  | { readonly kind: 'REDIRECT'; readonly location: string }
  | { readonly kind: 'REDIRECT_LOOP' }
  | { readonly kind: 'OVERSIZED'; readonly bytes: number }
  | { readonly kind: 'SLOW'; readonly delayMs: number }
  | { readonly kind: 'MALFORMED' }
  | { readonly kind: 'STATUS'; readonly status: number };

export class MockProductionServer {
  private server: http.Server | null = null;
  private readonly requests: MockProductionRequest[] = [];
  private behaviour: MockProductionBehaviour = { kind: 'OK', body: '{"ok":true}' };
  private boundPort = 0;

  /** Every request that reached the socket, in order. */
  get received(): readonly MockProductionRequest[] { return Object.freeze([...this.requests]); }

  /** The load-bearing number for the denial matrix. */
  get receivedRequestCount(): number { return this.requests.length; }

  get port(): number { return this.boundPort; }
  get host(): string { return '127.0.0.1'; }

  setBehaviour(behaviour: MockProductionBehaviour): void { this.behaviour = behaviour; }

  reset(): void { this.requests.length = 0; }

  async start(): Promise<void> {
    this.server = http.createServer((request, response) => {
      // Counted FIRST, unconditionally.
      this.requests.push({
        method: request.method ?? '',
        url: request.url ?? '',
        hadBody: request.headers['content-length'] !== undefined || request.headers['transfer-encoding'] !== undefined,
        upgrade: String(request.headers.upgrade ?? '') !== '',
      });
      this.respond(response);
    });
    // Upgrade attempts bypass the normal handler, so they are counted here too
    // or a WebSocket attempt would be invisible.
    this.server.on('upgrade', (request, socket) => {
      this.requests.push({ method: request.method ?? '', url: request.url ?? '', hadBody: false, upgrade: true });
      socket.destroy();
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      // Port 0 and loopback only: the OS chooses, and nothing external is reachable.
      this.server?.listen(0, '127.0.0.1', () => resolve());
    });
    this.boundPort = (this.server?.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (server === null) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private respond(response: http.ServerResponse): void {
    const behaviour = this.behaviour;
    switch (behaviour.kind) {
      case 'OK':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(behaviour.body ?? '{"ok":true}');
        return;
      case 'SET_COOKIE':
        response.writeHead(200, { 'content-type': 'application/json', 'set-cookie': behaviour.cookie });
        response.end('{"ok":true}');
        return;
      case 'REDIRECT':
        response.writeHead(302, { location: behaviour.location });
        response.end();
        return;
      case 'REDIRECT_LOOP':
        response.writeHead(302, { location: `http://127.0.0.1:${this.boundPort}/loop` });
        response.end();
        return;
      case 'OVERSIZED':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('x'.repeat(behaviour.bytes));
        return;
      case 'SLOW':
        setTimeout(() => {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end('{"ok":true}');
        }, behaviour.delayMs);
        return;
      case 'MALFORMED':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{ this is not json');
        return;
      case 'STATUS':
        response.writeHead(behaviour.status, { 'content-type': 'application/json' });
        response.end('{}');
        return;
      default: {
        const unreachable: never = behaviour;
        throw new Error(`MOCK_PRODUCTION_BEHAVIOUR_UNKNOWN:${String(unreachable)}`);
      }
    }
  }
}

/**
 * Dispatch exactly one request to the mock server.
 *
 * Used ONLY on the positive path, and only after admission returned `allowed`.
 * It exists so the positive path is genuinely non-vacuous: something must
 * actually reach the server, or "the kernel allows a safe request" is untested.
 */
export function dispatchToMockProduction(options: {
  readonly host: string;
  readonly port: number;
  readonly method: string;
  readonly path: string;
}): Promise<{ readonly status: number; readonly body: string; readonly setCookie: readonly string[] }> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: options.host, port: options.port, method: options.method, path: options.path, timeout: 10_000 },
      (response) => {
        let body = '';
        response.on('data', (chunk) => { body += String(chunk); });
        response.on('end', () => resolve({
          status: response.statusCode ?? 0,
          body,
          setCookie: Object.freeze([...(response.headers['set-cookie'] ?? [])]),
        }));
      },
    );
    request.once('error', reject);
    request.end();
  });
}
