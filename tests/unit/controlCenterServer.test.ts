import { expect, test } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createControlCenterServer, createDefaultHealth } from '../../src/controlCenter/server';
import { projectMeta } from '../../src/controlCenter/adapters/metaAdapter';
import { projectSafety } from '../../src/controlCenter/adapters/safetyAdapter';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import type { ControlCenterEventDto } from '../../src/controlCenter/contracts/events';
import type { ControlCenterReadinessDto } from '../../src/controlCenter/contracts/readiness';
import type { ControlCenterSafetyDto } from '../../src/controlCenter/contracts/safety';
import type { ControlCenterRunDetailDto, ControlCenterRunListDto, ControlCenterTimelineDto } from '../../src/controlCenter/contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../../src/controlCenter/contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../../src/controlCenter/contracts/campaign';
import type { ControlCenterSourceGraphDto, ControlCenterSourceSummaryDto, ControlCenterSourceSurfacesDto } from '../../src/controlCenter/contracts/sourceGraph';
import type { ControlCenterFindingsDto } from '../../src/controlCenter/contracts/findings';
import { CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION, CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION, CONTROL_CENTER_TIMELINE_SCHEMA_VERSION } from '../../src/controlCenter/contracts/runs';
import { CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION } from '../../src/controlCenter/contracts/executionGraph';
import { CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION } from '../../src/controlCenter/contracts/campaign';
import { CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION, CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION, CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION } from '../../src/controlCenter/contracts/sourceGraph';
import { CONTROL_CENTER_FINDINGS_SCHEMA_VERSION } from '../../src/controlCenter/contracts/findings';

interface HttpResult {
  readonly status: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: string;
}

function emptyCollector(): ControlCenterCollector {
  const readiness = {} as unknown as ControlCenterReadinessDto;
  const safety = projectSafety({
    continuity: { state: 'UNKNOWN', branch: null, headSha: null, checkpointDigest: null },
    checks: [],
  });
  const runs = {
    schemaVersion: CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION,
    items: [],
    page: { limit: 50, nextCursor: null, truncated: false },
  } as ControlCenterRunListDto;
  const detail = {
    schemaVersion: CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION,
    run: {},
    repositories: [],
    countsByEventType: [],
    countsBySeverity: [],
    screenshotCount: 0,
    hardFailureCodes: [],
    noteCodes: [],
    proxy: null,
  } as unknown as ControlCenterRunDetailDto;
  const timeline = {
    schemaVersion: CONTROL_CENTER_TIMELINE_SCHEMA_VERSION,
    runId: 'run-1',
    afterSeq: 0,
    events: [],
    nextAfterSeq: null,
    truncated: false,
  } as unknown as ControlCenterTimelineDto;
  const graph = {
    schemaVersion: CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION,
    runId: 'run-1',
    nodes: [],
    edges: [],
    nodeLimit: 250,
    edgeLimit: 500,
    truncated: false,
  } as unknown as ControlCenterExecutionGraphDto;
  const campaignSummary = { schemaVersion: CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION } as unknown as ControlCenterCampaignSummaryDto;
  const campaignCoverage = { schemaVersion: CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION, items: [], page: { limit: 50, nextCursor: null, truncated: false }, fullyCoveredContractCount: 0 } as unknown as ControlCenterCampaignCoverageDto;
  const sourceSummary = { schemaVersion: CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION } as unknown as ControlCenterSourceSummaryDto;
  const sourceSurfaces = { schemaVersion: CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION, items: [], page: { limit: 50, nextCursor: null, truncated: false }, repositoryFilter: null } as unknown as ControlCenterSourceSurfacesDto;
  const sourceGraph = { schemaVersion: CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION, surfaceId: null, depth: 0, nodes: [], edges: [], nodeLimit: 250, edgeLimit: 500, truncated: false } as unknown as ControlCenterSourceGraphDto;
  const findings = { schemaVersion: CONTROL_CENTER_FINDINGS_SCHEMA_VERSION, state: 'EMPTY', items: [], page: { limit: 50, nextCursor: null, truncated: false } } as ControlCenterFindingsDto;
  return {
    health: () => createDefaultHealth(),
    meta: () => projectMeta(),
    readiness: () => readiness,
    safety: () => safety,
    runs: () => runs,
    run: () => detail,
    timeline: () => timeline,
    executionGraph: () => graph,
    campaignSummary: () => campaignSummary,
    campaignCoverage: () => campaignCoverage,
    sourceSummary: () => sourceSummary,
    sourceSurfaces: () => sourceSurfaces,
    sourceGraph: () => sourceGraph,
    findings: () => findings,
  };
}

function request(port: number, pathname: string, options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: string } = {}): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: pathname,
      method: options.method ?? 'GET',
      headers: options.headers,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

async function startServer(uiRoot?: string) {
  const handle = createControlCenterServer({ collector: emptyCollector(), port: 0, uiRoot });
  const address = await handle.start();
  return { handle, port: address.port };
}

test.describe('Control Center loopback server', () => {
  test('rejects non-loopback configuration before opening a socket', () => {
    expect(() => createControlCenterServer({ collector: emptyCollector(), host: '0.0.0.0' })).toThrow('CONTROL_CENTER_BAD_REQUEST');
  });

  test('serves the fixed health/meta API and rejects mutation, unknown routes, and malformed queries', async () => {
    const { handle, port } = await startServer();
    try {
      const health = await request(port, '/healthz');
      expect(health.status).toBe(200);
      expect(JSON.parse(health.body)).toMatchObject({ status: 'UP', productReadiness: 'NOT_REPORTED' });
      const meta = await request(port, '/api/v1/meta');
      expect(meta.status).toBe(200);
      expect(JSON.parse(meta.body)).toMatchObject({ readOnly: true, executionAuthority: 'NONE', mutationAuthority: 'NONE' });
      const mutation = await request(port, '/api/v1/meta', { method: 'POST' });
      expect(mutation.status).toBe(405);
      expect(mutation.headers.allow).toBe('GET, HEAD');
      const unknown = await request(port, '/api/v1/debug/raw');
      expect(unknown.status).toBe(404);
      const badQuery = await request(port, '/api/v1/runs?limit=999999');
      expect(badQuery.status).toBe(400);
      const duplicateQuery = await request(port, '/api/v1/runs?limit=1&limit=2');
      expect(duplicateQuery.status).toBe(400);
      const findings = await request(port, '/api/v1/findings?limit=50');
      expect(findings.status).toBe(200);
      expect(JSON.parse(findings.body)).toMatchObject({ state: 'EMPTY', items: [] });
      expect((await request(port, '/api/v1/findings?limit=50&raw=true')).status).toBe(400);
      expect((await request(port, '/api/v1/source/graph?depth=99')).status).toBe(400);
      expect((await request(port, '/api/v1/source/surfaces?repo=../secret')).status).toBe(400);
      const invalidId = await request(port, '/api/v1/runs/%2e%2e%2fsecret');
      expect(invalidId.status).toBe(400);
      const error = JSON.parse(invalidId.body) as Record<string, unknown>;
      expect(Object.keys(error).sort()).toEqual(['code', 'retryable', 'schemaVersion']);
      expect(invalidId.body).not.toContain('stack');
    } finally {
      await handle.close();
    }
  });

  test('enforces exact Host and Origin and never emits wildcard CORS', async () => {
    const { handle, port } = await startServer();
    try {
      const spoofedHost = await request(port, '/healthz', { headers: { Host: 'evil.example.test' } });
      expect(spoofedHost.status).toBe(403);
      const spoofedOrigin = await request(port, '/healthz', { headers: { Origin: 'http://evil.example.test' } });
      expect(spoofedOrigin.status).toBe(403);
      const validOrigin = await request(port, '/healthz', { headers: { Origin: `http://127.0.0.1:${port}` } });
      expect(validOrigin.status).toBe(200);
      expect(validOrigin.headers['access-control-allow-origin']).toBeUndefined();
      expect(validOrigin.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    } finally {
      await handle.close();
    }
  });

  test('rejects GET bodies and HEAD returns headers without a response body', async () => {
    const { handle, port } = await startServer();
    try {
      const body = await request(port, '/healthz', { headers: { 'Content-Length': '1' }, body: 'x' });
      expect(body.status).toBe(413);
      const head = await request(port, '/api/v1/meta', { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(head.body).toBe('');
      expect(Number(head.headers['content-length'])).toBeGreaterThan(0);
    } finally {
      await handle.close();
    }
  });

  test('confines built static assets, rejects traversal/symlink escape, and reports an absent build safely', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-control-center-ui-'));
    const outside = path.join(root, '..', 'nightwatch-control-center-outside.js');
    fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>Control Center</title>');
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'assets', 'app.js'), 'console.log("local");');
    fs.writeFileSync(path.join(root, 'assets', 'oversized.js'), Buffer.alloc(5 * 1024 * 1024 + 1));
    fs.writeFileSync(outside, 'SENTINEL_OUTSIDE');
    fs.symlinkSync(outside, path.join(root, 'assets', 'escape.js'));
    const { handle, port } = await startServer(root);
    try {
      const index = await request(port, '/');
      expect(index.status).toBe(200);
      expect(index.body).toContain('Control Center');
      expect((await request(port, '/assets/app.js')).status).toBe(200);
      expect((await request(port, '/assets/oversized.js')).status).toBe(400);
      expect((await request(port, '/assets/%2e%2e/index.html')).status).toBe(400);
      const symlink = await request(port, '/assets/escape.js');
      expect(symlink.status).toBe(400);
      expect(symlink.body).not.toContain('SENTINEL_OUTSIDE');
    } finally {
      await handle.close();
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { force: true });
    }
    const unavailable = await startServer();
    try {
      expect((await request(unavailable.port, '/')).status).toBe(503);
    } finally {
      await unavailable.handle.close();
    }
  });

  test('keeps port ownership exclusive and closes an unstarted handle safely', async () => {
    const first = await startServer();
    const second = createControlCenterServer({ collector: emptyCollector(), port: first.port });
    try {
      await expect(second.start()).rejects.toThrow('CONTROL_CENTER_BAD_REQUEST');
    } finally {
      await second.close();
      await first.handle.close();
    }
  });

  test('SSE is notification-only, bounded, and reconnect-safe through authoritative GETs', async () => {
    const { handle, port } = await startServer();
    const event: ControlCenterEventDto = {
      schemaVersion: 'nightwatch.control-center.event.v1',
      type: 'readiness.changed',
      entityId: null,
      sequence: 1,
      snapshotDigest: null,
    };
    try {
      const received = new Promise<string>((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path: '/api/v1/events', headers: { Origin: `http://127.0.0.1:${port}` } }, (response) => {
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toContain('text/event-stream');
          let text = '';
          response.on('data', (chunk: Buffer) => {
            text += chunk.toString('utf8');
            if (text.includes('readiness.changed')) {
              req.destroy();
              resolve(text);
            }
          });
          response.on('error', reject);
        });
        req.on('error', (error) => {
          if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(error);
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      handle.publish(event);
      const text = await received;
      expect(text).toContain('event: readiness.changed');
      expect(text).toContain('"schemaVersion":"nightwatch.control-center.event.v1"');
      expect(text).not.toContain('raw');
      expect(handle.events.clientCount).toBeLessThanOrEqual(8);
      expect((await request(port, '/api/v1/readiness')).status).toBe(200);
    } finally {
      await handle.close();
    }
  });
});
