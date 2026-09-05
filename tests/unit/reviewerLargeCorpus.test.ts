// RS-1 large-corpus reviewer surface and endurance.
//
// M4 measured the cones. This drives the whole served path — authority,
// projection, loopback server, HTTP, JSON — against corpora far larger than
// anything the local store holds today, because a surface that is only ever
// exercised at three findings will meet ten thousand for the first time in
// front of a reviewer.
//
// The latency bounds here are deliberately loose relative to the measured
// numbers (M5: 26 ms typical, 359 ms worst-case page at 10,000). They are set
// to catch a return to the pre-M5 behaviour (30 s), not to police jitter on a
// shared machine. A tight bound would be a flake generator, and a flake that
// gets retried away is worse than no bound at all.

import http from 'node:http';
import { test, expect } from '@playwright/test';
import { createControlCenterServer } from '../../src/controlCenter/server';
import type { ControlCenterCollector, ControlCenterListQuery } from '../../src/controlCenter/server/collector';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';

/** Deterministic mixer; never Math.random, so a failure is reproducible. */
function mix(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

/**
 * `newestFirstIds` reverses identifier order against chronological order so
 * the first page is the NEWEST findings — the ones with the most history
 * behind them, and the page a reviewer actually opens.
 */
function corpus(size: number, newestFirstIds = true): readonly FindingsDossierMetadata[] {
  return Array.from({ length: size }, (_, index) => {
    const noise = mix(index * 2654435761);
    const duplicateOf = index >= 20 && noise % 20 === 0 ? index - 20 : index;
    return {
      schemaVersion: 'nightwatch.control-center-findings-dossier.v1',
      status: 'READY',
      candidateId: `corpus-finding-${String(newestFirstIds ? size - 1 - index : index).padStart(6, '0')}`,
      title: null,
      firstObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
      lastObserved: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
      routeClass: `route/${index % 16}`,
      oracleFingerprint: noise % 10 === 3 ? 'not-a-fingerprint' : `fp:sha256:${(duplicateOf % 4096).toString(16).padStart(6, '0').repeat(4)}`,
      evidenceLevel: 'L2',
      reproduction: { result: 'REPRODUCED', count: 1, minimalityGuarantee: 'BOUNDED_MINIMAL' },
      technicalSeverity: 'HIGH',
      triagePriority: 'P2',
      confidence: { level: 'HIGH' },
      sourceCurrentness: 'CURRENT',
      semanticFinding: index % 3 === 0,
    } as unknown as FindingsDossierMetadata;
  });
}

function reviewerCollector(dossiers: readonly FindingsDossierMetadata[]): ControlCenterCollector {
  const unavailable = (): never => {
    throw new Error('not exercised by this suite');
  };
  return {
    health: unavailable,
    meta: unavailable,
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
    // The real path, exactly as the default collector calls it.
    reviewer: (query: ControlCenterListQuery) =>
      projectReviewer(
        reviewerInputsFromFindings({ dossiers, campaignId: 'large-corpus-campaign', limit: query.limit }),
        query.limit
      ),
  } as unknown as ControlCenterCollector;
}

function get(port: number, pathname: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, path: pathname, method: 'GET' }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject);
    request.end();
  });
}

async function withServer<T>(dossiers: readonly FindingsDossierMetadata[], run: (port: number) => Promise<T>): Promise<T> {
  const handle = createControlCenterServer({ collector: reviewerCollector(dossiers), port: 0 });
  const address = await handle.start();
  try {
    return await run(address.port);
  } finally {
    await handle.close();
  }
}

test.describe('reviewer surface at corpus scale', () => {
  test.setTimeout(300_000);

  for (const size of [1000, 5000, 10000]) {
    test(`serves a bounded page over ${size} findings without degrading`, async () => {
      await withServer(corpus(size), async (port) => {
        const started = Date.now();
        const response = await get(port, '/api/v1/reviewer?limit=50');
        const elapsed = Date.now() - started;
        expect(response.status).toBe(200);
        const payload = JSON.parse(response.body);

        expect(payload.schemaVersion).toBe('nightwatch.control-center.reviewer.v1');
        expect(payload.items).toHaveLength(50);
        // The corpus is larger than the page, and the payload must say so.
        expect(payload.page.truncated).toBe(true);
        expect(payload.page.nextCursor).not.toBeNull();
        expect(payload.finalVerdictAuthority).toBe('HUMAN_ORGANIZATIONAL');
        expect(payload.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');

        // Loose against the measured 359 ms worst case; tight enough that the
        // pre-M5 30 s behaviour could not pass.
        expect(elapsed, `page over ${size} findings took ${elapsed} ms`).toBeLessThan(10_000);

        // Every element still declares what kind of claim it makes, at scale.
        for (const item of payload.items) {
          for (const element of [item.relationship, item.recurrence, item.defectClass, item.expectationProvenance, item.confidence, item.localReview]) {
            expect(['FACT', 'RECOMMENDATION', 'UNKNOWN']).toContain(element.epistemicClass);
            if (element.epistemicClass === 'UNKNOWN') expect(element.value).toBeNull();
          }
        }

        // The privacy boundary does not soften with volume.
        for (const sentinel of ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'Bearer ', 'AKIA', '-----BEGIN']) {
          expect(response.body).not.toContain(sentinel);
        }
      });
    });
  }

  test('above the pairwise limit the surface says so rather than guessing', async () => {
    // 10,000 is above the measured 2,500 limit, so relationships are not
    // analysed. The requirement is that the surface states that, not that it
    // quietly returns UNRELATED.
    await withServer(corpus(10000), async (port) => {
      const payload = JSON.parse((await get(port, '/api/v1/reviewer?limit=50')).body);
      for (const item of payload.items) {
        expect(item.relationship.epistemicClass).toBe('UNKNOWN');
        expect(item.unknowns).toContain('RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT');
      }
    });
  });

  test('a large-corpus page is byte-identical across repeated requests', async () => {
    await withServer(corpus(5000), async (port) => {
      const first = (await get(port, '/api/v1/reviewer?limit=50')).body;
      const second = (await get(port, '/api/v1/reviewer?limit=50')).body;
      const third = (await get(port, '/api/v1/reviewer?limit=50')).body;
      expect(second).toBe(first);
      expect(third).toBe(first);
    });
  });

  test('endurance: 200 consecutive large-corpus requests neither leak nor drift', async () => {
    // Two failure modes this catches that a single request cannot: a slow leak
    // in per-request state, and an answer that changes under repetition. A
    // stall here must be captured and classified, never retried away.
    const ITERATIONS = 200;
    await withServer(corpus(5000), async (port) => {
      const baseline = (await get(port, '/api/v1/reviewer?limit=50')).body;
      // A retained-heap claim requires a forced collection. Without
      // `--expose-gc` this measures whatever V8 happened to be holding at two
      // arbitrary moments, which is not retained heap and not a leak signal —
      // it drifted past the 64 MiB bound twice during RP-1 with no leak
      // present, and passed the rest of the time, which is the signature of a
      // measurement rather than a defect. `npm test` and `npm run test:unit`
      // now pass `--expose-gc` so the primary lane evaluates it for real.
      const forceGc = typeof global.gc === 'function' ? (global.gc as () => void) : null;
      forceGc?.();
      const heapBefore = process.memoryUsage().heapUsed;
      const latencies: number[] = [];
      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        const started = Date.now();
        const response = await get(port, '/api/v1/reviewer?limit=50');
        latencies.push(Date.now() - started);
        expect(response.status, `iteration ${iteration}`).toBe(200);
        expect(response.body, `iteration ${iteration} drifted`).toBe(baseline);
      }
      forceGc?.();
      const heapAfter = process.memoryUsage().heapUsed;

      // Drift in latency, not absolute latency: the last fifty requests must
      // not be dramatically slower than the first fifty. That is what a leak
      // or an unbounded accumulator looks like from outside.
      const mean = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
      const first = mean(latencies.slice(0, 50));
      const last = mean(latencies.slice(-50));
      expect(last, `first 50 mean ${first.toFixed(1)} ms, last 50 mean ${last.toFixed(1)} ms`).toBeLessThan(Math.max(first * 4, 2_000));

      // A hard ceiling on retained heap growth across 200 identical requests,
      // evaluated ONLY when a forced collection was available. When it was
      // not, the bound is not silently dropped: the run is annotated so a
      // reader can tell the difference between "the heap guard held" and "the
      // heap guard was not evaluated". A guard that cannot tell those apart
      // is worse than one that is honestly absent.
      const growthMib = (heapAfter - heapBefore) / (1024 * 1024);
      if (forceGc === null) {
        test.info().annotations.push({
          type: 'heap-guard',
          description: `NOT EVALUATED: --expose-gc unavailable; unforced growth was ${growthMib.toFixed(1)} MiB`,
        });
      } else {
        expect(growthMib, `retained heap grew ${growthMib.toFixed(1)} MiB over ${ITERATIONS} requests`).toBeLessThan(64);
      }
    });
  });
});
