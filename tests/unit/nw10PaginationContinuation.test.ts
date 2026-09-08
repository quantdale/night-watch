// NW-10 — a continuation that actually continues.
//
// The list DTOs advertised `page.nextCursor` and the server validated a
// `cursor` query parameter, but nothing consumed it: `boundedCollection`
// always sliced from index 0 and the default collector dropped `query.cursor`
// on the floor. So paging was cosmetic end to end — passing the cursor back
// returned page one again, and every record beyond the first page was
// unreachable.
//
// That is worse than it sounds for the client: adding cursor state to the UI
// without fixing this would have produced a "load more" that re-appended the
// first page forever, and deduplication by identity would have made it look
// like the button did nothing.
//
// These cases page a synthetic corpus to exhaustion through the pure
// adapters, and then over real HTTP through the server, asserting that every
// record is reached exactly once.

import http from 'node:http';
import { test, expect } from '@playwright/test';
import { boundedCollection, boundedCursorOffset } from '../../src/controlCenter/adapters/common';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { createControlCenterServer } from '../../src/controlCenter/server';
import type { ControlCenterCollector, ControlCenterListQuery } from '../../src/controlCenter/server/collector';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { reviewerCorpus } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'nw10-pagination-campaign';

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

test.describe('NW-10 — the cursor is consumed, not merely emitted', () => {
  test('boundedCollection slices from the cursor and reports what remains after this page', () => {
    const items = Array.from({ length: 7 }, (_, index) => `item-${index}`);
    const first = boundedCollection(items, 3);
    expect(first.items).toEqual(['item-0', 'item-1', 'item-2']);
    expect(first.page.truncated).toBe(true);
    expect(first.page.nextCursor).toBe('3');

    const second = boundedCollection(items, 3, first.page.nextCursor);
    expect(second.items).toEqual(['item-3', 'item-4', 'item-5']);
    expect(second.page.nextCursor).toBe('6');

    const third = boundedCollection(items, 3, second.page.nextCursor);
    expect(third.items).toEqual(['item-6']);
    // Nothing remains after this page, so the continuation ends.
    expect(third.page.truncated).toBe(false);
    expect(third.page.nextCursor).toBeNull();
  });

  test('paging a corpus to exhaustion reaches every record exactly once', () => {
    const items = Array.from({ length: 23 }, (_, index) => `item-${index}`);
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: { readonly items: readonly string[]; readonly page: { readonly nextCursor: string | null } } =
        boundedCollection(items, 5, cursor);
      seen.push(...page.items);
      cursor = page.page.nextCursor;
      pages += 1;
      expect(pages, 'paging did not terminate').toBeLessThan(20);
    } while (cursor !== null);
    expect(seen).toEqual(items);
    expect(new Set(seen).size).toBe(items.length);
    expect(pages).toBe(5);
  });

  test('a cursor past the end yields an empty final page rather than restarting', () => {
    const items = ['a', 'b', 'c'];
    const beyond = boundedCollection(items, 10, '99');
    expect(beyond.items).toEqual([]);
    expect(beyond.page.truncated).toBe(false);
    expect(beyond.page.nextCursor).toBeNull();
  });

  test('a malformed cursor falls back to the first page rather than throwing', () => {
    const items = ['a', 'b', 'c'];
    for (const malformed of ['', '-1', 'abc', '1.5', '99999999999', 'null', undefined, null, 7]) {
      expect(boundedCursorOffset(malformed, items.length)).toBe(0);
      expect(boundedCollection(items, 2, malformed).items).toEqual(['a', 'b']);
    }
  });

  test('the reviewer projection advances instead of re-emitting the same cursor', () => {
    // The reviewer adapter overrides `nextCursor` with a corpus-aware
    // fallback. Built from the page length it re-emitted the same value on
    // page two and paged forever in place; it must be built from how far into
    // the corpus the page reaches.
    const dossiers = reviewerCorpus(9, { newestFirstIds: false });
    // The authority selects the page, so it is what needs the cursor — this
    // mirrors exactly what the default collector does.
    const inputs = (at: string | null) => reviewerInputsFromFindings({ dossiers, campaignId: CAMPAIGN, limit: 4, cursor: at });
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const dto = projectReviewer(inputs(cursor), 4, cursor);
      seen.push(...dto.items.map((item) => item.findingId));
      cursor = dto.page.nextCursor;
      pages += 1;
      expect(pages, 'reviewer paging did not terminate').toBeLessThan(10);
    } while (cursor !== null);
    expect(new Set(seen).size).toBe(9);
    expect(seen).toHaveLength(9);
  });
});

test.describe('NW-10 — the continuation survives the HTTP boundary', () => {
  function collectorFor(dossiers: readonly ReturnType<typeof reviewerCorpus>[number][]): ControlCenterCollector {
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
      reviewer: (query: ControlCenterListQuery) =>
        projectReviewer(
          reviewerInputsFromFindings({ dossiers, campaignId: CAMPAIGN, limit: query.limit, cursor: query.cursor }),
          query.limit,
          query.cursor,
        ),
    } as unknown as ControlCenterCollector;
  }

  test('a client can reach a record beyond the first page over real HTTP', async () => {
    const dossiers = reviewerCorpus(12, { newestFirstIds: false });
    const handle = createControlCenterServer({ collector: collectorFor(dossiers), port: 0 });
    const address = await handle.start();
    try {
      const seen: string[] = [];
      let cursor: string | null = null;
      let requests = 0;
      do {
        const query = cursor === null ? '?limit=5' : `?limit=5&cursor=${encodeURIComponent(cursor)}`;
        const response = await get(address.port, `/api/v1/reviewer${query}`);
        expect(response.status).toBe(200);
        const dto = JSON.parse(response.body) as {
          items: readonly { findingId: string }[];
          page: { nextCursor: string | null };
        };
        seen.push(...dto.items.map((item) => item.findingId));
        cursor = dto.page.nextCursor;
        requests += 1;
        expect(requests, 'HTTP paging did not terminate').toBeLessThan(12);
      } while (cursor !== null);

      // The whole point: records past the first page are reachable, and no
      // record is served twice.
      expect(seen).toHaveLength(12);
      expect(new Set(seen).size).toBe(12);
      expect(requests).toBeGreaterThan(1);
    } finally {
      await handle.close();
    }
  });

  test('a malformed cursor is refused by the server before it reaches an adapter', async () => {
    const dossiers = reviewerCorpus(3, { newestFirstIds: false });
    const handle = createControlCenterServer({ collector: collectorFor(dossiers), port: 0 });
    const address = await handle.start();
    try {
      const response = await get(address.port, '/api/v1/reviewer?limit=5&cursor=../../etc/passwd');
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).not.toContain('findingId');
    } finally {
      await handle.close();
    }
  });
});
