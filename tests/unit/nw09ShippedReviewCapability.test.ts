// NW-09 — the owner-local review capability, through the SHIPPED launcher.
//
// The capability existed only as library injection: `bin/nightwatch-control-center.mjs`
// built a collector with no review authority and a server with no
// `reviewDecision`, so the documented workflow could not be reached from the
// actual entry point. The existing browser tests inject an authority
// directly, so they proved the library path and never the shipped one.
//
// These cases therefore SPAWN the real launcher. The default must stay
// read-only, the opt-in must produce a working write route, and the
// capability the server reports must be the same fact that creates the route.
//
// The launcher's review store is the operator's real one, so no case here
// writes a decision through the shipped process. Write behaviour is proven
// against an injected temporary store in `reviewerPersistence.test.ts`; what
// is proven here is which surface the shipped entry point actually serves.

import http from 'node:http';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { createControlCenterServer } from '../../src/controlCenter/server';
import { projectMeta } from '../../src/controlCenter/adapters/metaAdapter';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';

const ROOT = path.resolve(__dirname, '../..');
const LAUNCHER = path.join(ROOT, 'bin/nightwatch-control-center.mjs');

function get(port: number, pathname: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const call = http.request({ host: '127.0.0.1', port, path: pathname, method: 'GET' }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    call.on('error', reject);
    call.end();
  });
}

function post(port: number, pathname: string, body: unknown): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf8');
    const call = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': payload.byteLength,
          'x-nightwatch-local-review': '1',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    call.on('error', reject);
    call.write(payload);
    call.end();
  });
}

interface Launched {
  readonly child: ChildProcess;
  readonly port: number;
  readonly localReview: string;
  readonly stderr: () => string;
}

/** Start the real launcher on an ephemeral port and wait for its ready line. */
async function launch(args: readonly string[]): Promise<Launched> {
  const child = spawn(process.execPath, [LAUNCHER, '--port=0', ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const out = child.stdout;
  const err = child.stderr;
  if (out === null || err === null) throw new Error('launcher pipes unavailable');
  out.setEncoding('utf8');
  err.setEncoding('utf8');
  out.on('data', (chunk: string) => { stdout += chunk; });
  err.on('data', (chunk: string) => { stderr += chunk; });
  const deadline = Date.now() + 120_000;
  let port: number | null = null;
  let localReview: string | null = null;
  while (Date.now() < deadline) {
    const ready = /NIGHTWATCH_CONTROL_CENTER_READY http:\/\/127\.0\.0\.1:(\d+)/.exec(stdout);
    const capability = /NIGHTWATCH_CONTROL_CENTER_LOCAL_REVIEW (\w+)/.exec(stdout);
    if (ready !== null && capability !== null) {
      port = Number(ready[1]);
      localReview = capability[1] as string;
      break;
    }
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (port === null || localReview === null) {
    child.kill('SIGKILL');
    throw new Error(`launcher did not become ready: stdout=${stdout} stderr=${stderr} exit=${String(child.exitCode)}`);
  }
  return { child, port, localReview, stderr: () => stderr };
}

async function stop(launched: Launched): Promise<void> {
  launched.child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (launched.child.exitCode === null) launched.child.kill('SIGKILL');
}

test.describe('NW-09 — the shipped launcher exposes the review capability deliberately', () => {
  test.slow();

  test('the default is read-only: the write route does not exist and meta says DISABLED', async () => {
    const launched = await launch([]);
    try {
      expect(launched.localReview).toBe('DISABLED');
      const meta = await get(launched.port, '/api/v1/meta');
      expect(meta.status).toBe(200);
      const dto = JSON.parse(meta.body) as Record<string, unknown>;
      expect(dto.localReviewDecision).toBe('DISABLED');
      // Unchanged posture claims.
      expect(dto.readOnly).toBe(true);
      expect(dto.mutationAuthority).toBe('NONE');
      expect(dto.executionAuthority).toBe('NONE');
      // The route must not merely refuse the body — it must not be a write
      // surface at all.
      const refused = await post(launched.port, '/api/v1/reviewer/decision', { findingId: 'x' });
      expect([404, 405]).toContain(refused.status);
      expect(refused.body).not.toContain('ACCEPTED');
    } finally {
      await stop(launched);
    }
  });

  test('--enable-local-review serves the route and meta says ENABLED', async () => {
    const launched = await launch(['--enable-local-review']);
    try {
      expect(launched.localReview).toBe('ENABLED');
      const meta = await get(launched.port, '/api/v1/meta');
      expect(meta.status).toBe(200);
      const dto = JSON.parse(meta.body) as Record<string, unknown>;
      expect(dto.localReviewDecision).toBe('ENABLED');
      // Enabling owner-local review does not change what the service claims
      // about product state or organizational authority.
      expect(dto.readOnly).toBe(true);
      expect(dto.mutationAuthority).toBe('NONE');

      // The route EXISTS: a malformed body is refused by the handler with a
      // review result, not by the router with "not found". Nothing is
      // recorded, because no valid finding or identity is supplied.
      const answered = await post(launched.port, '/api/v1/reviewer/decision', { findingId: '', decision: 'nonsense' });
      expect(answered.status).toBe(200);
      const body = JSON.parse(answered.body) as Record<string, unknown>;
      expect(body.schemaVersion).toBe('nightwatch.control-center.review-decision.v1');
      expect(['UNKNOWN_FINDING', 'INVALID_DECISION', 'BINDING_MISMATCH']).toContain(body.result);
      expect(body.result).not.toBe('ACCEPTED');
      expect(body.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    } finally {
      await stop(launched);
    }
  });

  test('the launcher still refuses a product or environment flag', async () => {
    for (const rejected of ['--env=dev', '--host', '--open', '--share', '--enable-local-reviews']) {
      const child = spawn(process.execPath, [LAUNCHER, '--port=0', rejected], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', (chunk: string) => { stderr += chunk; });
      const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));
      expect(code, `${rejected} must be refused`).toBe(2);
      expect(stderr).toContain('CONTROL_CENTER_');
    }
  });

  test('a start failure reports a bounded categorical reason, never a native message', async () => {
    const child = spawn(process.execPath, [LAUNCHER, '--port=0', '--ui-root=../outside'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => { stderr += chunk; });
    const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));
    expect(code).toBe(2);
    expect(stderr.trim()).toBe('CONTROL_CENTER_PATH_REJECTED');
    // Bounded means bounded: one allowlisted token and nothing else.
    expect(stderr).not.toContain('/home/');
    expect(stderr).not.toContain('Error');
  });
});

test.describe('NW-09 — the reported capability cannot disagree with the served surface', () => {
  function metaOnlyCollector(advisory: 'ENABLED' | 'DISABLED'): ControlCenterCollector {
    const unavailable = (): never => {
      throw new Error('not exercised by this suite');
    };
    return {
      health: unavailable,
      meta: () => projectMeta({ localReviewDecision: advisory }),
      readiness: unavailable,
      safety: unavailable,
      runs: unavailable,
      run: unavailable,
      timeline: unavailable,
      executionGraph: unavailable,
      campaignSummary: unavailable,
      campaignCoverage: unavailable,
      sourceSummary: unavailable,
      sourceSurfaces: unavailable,
      sourceGraph: unavailable,
      findings: unavailable,
      systemMapLevel: unavailable,
      systemMapQuery: unavailable,
      reviewer: unavailable,
    } as unknown as ControlCenterCollector;
  }

  async function metaFrom(options: { advisory: 'ENABLED' | 'DISABLED'; withRoute: boolean }): Promise<Record<string, unknown>> {
    const handle = createControlCenterServer({
      collector: metaOnlyCollector(options.advisory),
      port: 0,
      ...(options.withRoute
        ? {
            reviewDecision: () => ({
              schemaVersion: 'nightwatch.control-center.review-decision.v1' as const,
              result: 'UNKNOWN_FINDING',
              reviewIdentity: null,
              organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' as const,
            }),
          }
        : {}),
    });
    const address = await handle.start();
    try {
      const response = await get(address.port, '/api/v1/meta');
      expect(response.status).toBe(200);
      return JSON.parse(response.body) as Record<string, unknown>;
    } finally {
      await handle.close();
    }
  }

  test("a collector claiming ENABLED cannot enable a route the server does not serve", async () => {
    // The whole point of the server-side override: a collector built with a
    // review authority and a server built without one used to leave the UI
    // offering controls whose POST the server refused as not found.
    const dto = await metaFrom({ advisory: 'ENABLED', withRoute: false });
    expect(dto.localReviewDecision).toBe('DISABLED');
  });

  test("a collector claiming DISABLED cannot hide a route the server does serve", async () => {
    const dto = await metaFrom({ advisory: 'DISABLED', withRoute: true });
    expect(dto.localReviewDecision).toBe('ENABLED');
  });
});
