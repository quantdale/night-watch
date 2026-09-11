// Control Center review persistence — the served write and read paths.
//
// This drives real HTTP against the real server, because the guarantees that
// matter here are guarantees about the SURFACE: that a second decision fails
// server-side even when the UI is bypassed, that the write route does not
// exist unless the server was given an authority, and that a stale decision
// never renders as a live one.
//
// Every store is rooted in an injected temporary directory; nothing touches
// the operator's real review store.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { createControlCenterServer } from '../../src/controlCenter/server';
import type { ControlCenterCollector, ControlCenterListQuery } from '../../src/controlCenter/server/collector';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { ControlCenterReviewAuthority } from '../../src/controlCenter/authorities/reviewWriteAuthority';
import { findingDiscoveryKey } from '../../src/core/reviewStore';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';
import type { ControlCenterReviewerDto } from '../../src/controlCenter/contracts/reviewer';
import { reviewerCorpus } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'review-persistence-campaign';
const CLOCK = () => new Date('2026-09-05T12:00:00Z');

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-http-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function corpus(size = 4): readonly FindingsDossierMetadata[] {
  return reviewerCorpus(size, { newestFirstIds: false });
}

function collectorFor(
  dossiers: readonly FindingsDossierMetadata[],
  authority: ControlCenterReviewAuthority | null
): ControlCenterCollector {
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
        reviewerInputsFromFindings({
          dossiers,
          campaignId: CAMPAIGN,
          limit: query.limit,
          ...(authority === null
            ? {}
            : {
                localReviewLookup: authority.localReviewLookup({ campaignId: CAMPAIGN }),
                reviewIdentityFor: (dossier) => authority.identityFor(dossier, { campaignId: CAMPAIGN }),
              }),
        }),
        query.limit
      ),
  } as unknown as ControlCenterCollector;
}

interface Harness {
  readonly port: number;
  readonly authority: ControlCenterReviewAuthority | null;
  readonly dossiers: readonly FindingsDossierMetadata[];
}

async function withServer<T>(
  options: { readonly dossiers?: readonly FindingsDossierMetadata[]; readonly root?: string | null },
  run: (harness: Harness) => Promise<T>
): Promise<T> {
  const dossiers = options.dossiers ?? corpus();
  const authority = options.root === null ? null : new ControlCenterReviewAuthority({ root: options.root ?? tempRoot(), now: CLOCK });
  const handle = createControlCenterServer({
    collector: collectorFor(dossiers, authority),
    port: 0,
    ...(authority === null
      ? {}
      : {
          reviewDecision: (request: unknown) => {
            const body = request as Record<string, unknown>;
            const outcome = authority.decide(
              {
                findingId: String(body.findingId ?? ''),
                reviewIdentity: String(body.reviewIdentity ?? ''),
                decision: String(body.decision ?? ''),
                ...(typeof body.rationale === 'string' ? { rationale: body.rationale } : {}),
              },
              { dossiers, campaignId: CAMPAIGN }
            );
            return {
              schemaVersion: 'nightwatch.control-center.review-decision.v1' as const,
              result: outcome.result,
              reviewIdentity: outcome.reviewIdentity,
              organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' as const,
            };
          },
        }),
  });
  const address = await handle.start();
  try {
    return await run({ port: address.port, authority, dossiers });
  } finally {
    await handle.close();
  }
}

function request(
  port: number,
  options: { method: string; pathname: string; body?: string; headers?: Record<string, string> }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = options.body === undefined ? null : Buffer.from(options.body, 'utf8');
    const call = http.request(
      {
        host: '127.0.0.1',
        port,
        path: options.pathname,
        method: options.method,
        headers: {
          ...(payload === null ? {} : { 'content-type': 'application/json', 'content-length': payload.byteLength }),
          ...options.headers,
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    call.on('error', reject);
    if (payload !== null) call.write(payload);
    call.end();
  });
}

function postDecision(port: number, body: unknown, headers: Record<string, string> = { 'x-nightwatch-local-review': '1' }) {
  return request(port, { method: 'POST', pathname: '/api/v1/reviewer/decision', body: JSON.stringify(body), headers });
}

async function reviewerDto(port: number): Promise<ControlCenterReviewerDto> {
  const response = await request(port, { method: 'GET', pathname: '/api/v1/reviewer?limit=50' });
  expect(response.status).toBe(200);
  return JSON.parse(response.body) as ControlCenterReviewerDto;
}

function rowFor(dto: ControlCenterReviewerDto, findingId: string) {
  return dto.items.find((item) => item.findingId === findingId);
}

test.describe('the read path projects real local review state', () => {
  test('without a review authority the surface still says it has no store', async () => {
    await withServer({ root: null }, async ({ port }) => {
      const dto = await reviewerDto(port);
      expect(dto.items.length).toBeGreaterThan(0);
      for (const item of dto.items) {
        expect(item.localReview.epistemicClass).toBe('UNKNOWN');
        expect(item.unknowns).toContain('NO_LOCAL_REVIEW_STORE');
      }
    });
  });

  test('with a store but no decision, a finding is UNKNOWN and says why', async () => {
    await withServer({}, async ({ port }) => {
      const dto = await reviewerDto(port);
      for (const item of dto.items) {
        expect(item.localReview.epistemicClass).toBe('UNKNOWN');
        expect(item.localReview.value).toBeNull();
        // The reason changed: there IS a store now, and this finding has no
        // review in it. Reporting NO_LOCAL_REVIEW_STORE would be a lie.
        expect(item.unknowns).toContain('NO_LOCAL_REVIEW');
        expect(item.unknowns).not.toContain('NO_LOCAL_REVIEW_STORE');
      }
    });
  });

  test('an intact record at a superseded schema is served as VERSION_UNSUPPORTED, not as a defect or a decision', async () => {
    const root = tempRoot();
    const dossiers = corpus(1);
    const target = dossiers[0]!;
    fs.writeFileSync(
      path.join(root, `review.${findingDiscoveryKey(target.candidateId)}.${'0'.repeat(24)}.json`),
      JSON.stringify({ status: 'READY', schemaVersion: 'nightwatch.review-store.v0' }),
      { mode: 0o600 },
    );
    await withServer({ root, dossiers }, async ({ port }) => {
      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row).toBeDefined();
      expect(row!.localReview.epistemicClass).toBe('UNKNOWN');
      expect(row!.localReview.value?.bindingCurrentness).toBe('VERSION_UNSUPPORTED');
      expect(row!.localReview.value?.foundVersions).toContain('nightwatch.review-store.v0');
      expect(row!.localReview.value?.affectedRecordCount).toBe(1);
      expect(row!.localReview.value?.decision).toBeNull();
      expect(row!.localReview.value?.state).toBe('VERSION_UNSUPPORTED');
      // No disposition is declared for v0, so the surface is told there is
      // none rather than being shown an invented migration name.
      expect(row!.localReview.value?.migration).toBeNull();
    });
  });

  test('a recorded decision is projected as a current local review', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      const accepted = await postDecision(port, {
        findingId: target.candidateId,
        reviewIdentity: identity,
        decision: 'ACCEPT_EVIDENCE',
        rationale: 'Replay reproduced the projection mismatch.',
      });
      expect(accepted.status).toBe(200);
      expect(JSON.parse(accepted.body).result).toBe('ACCEPTED');

      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row).toBeDefined();
      expect(row!.localReview.epistemicClass).toBe('FACT');
      expect(row!.localReview.value?.decision).toBe('ACCEPT_EVIDENCE');
      expect(row!.localReview.value?.state).toBe('REVIEWED');
      expect(row!.localReview.value?.bindingCurrentness).toBe('CURRENT');
      // The non-equivalence guard survives all the way to the wire.
      expect(row!.localReview.value?.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
      expect(row!.localReview.value?.notEquivalentTo).toEqual(['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED']);
    });
  });

  test('a decision whose artifact then changes is shown as STALE, never as live', async () => {
    const root = tempRoot();
    const dossiers = corpus();
    const target = dossiers[0]!;

    await withServer({ root, dossiers }, async ({ port, authority }) => {
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      expect(JSON.parse((await postDecision(port, { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE' })).body).result).toBe('ACCEPTED');
    });

    // The dossier is regenerated: same finding id, different content.
    const regenerated = dossiers.map((dossier) =>
      dossier.candidateId === target.candidateId
        ? ({ ...dossier, contentDigest: `cc-dossier-content:sha256:${'f'.repeat(24)}` } as FindingsDossierMetadata)
        : dossier
    );

    await withServer({ root, dossiers: regenerated }, async ({ port }) => {
      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row).toBeDefined();
      // Shown, and shown as not-live.
      expect(row!.localReview.epistemicClass).toBe('UNKNOWN');
      expect(row!.localReview.value?.bindingCurrentness).toBe('STALE');
      expect(row!.unknowns).toContain('LOCAL_REVIEW_STALE');
    });
  });

  test('the decision survives a server restart over the same store', async () => {
    const root = tempRoot();
    const dossiers = corpus();
    const target = dossiers[1]!;

    await withServer({ root, dossiers }, async ({ port, authority }) => {
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      expect(JSON.parse((await postDecision(port, { findingId: target.candidateId, reviewIdentity: identity, decision: 'REQUEST_FOLLOWUP' })).body).result).toBe('ACCEPTED');
    });

    // Server A is gone. Server B is a new process-level object over the same
    // owner-local store.
    await withServer({ root, dossiers }, async ({ port }) => {
      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row!.localReview.value?.decision).toBe('REQUEST_FOLLOWUP');
      expect(row!.localReview.value?.bindingCurrentness).toBe('CURRENT');
    });
  });

  test('one finding is decided without affecting its neighbours', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      await postDecision(port, {
        findingId: target.candidateId,
        reviewIdentity: authority!.identityFor(target, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
      });
      const dto = await reviewerDto(port);
      for (const item of dto.items) {
        if (item.findingId === target.candidateId) expect(item.localReview.epistemicClass).toBe('FACT');
        else expect(item.localReview.epistemicClass).toBe('UNKNOWN');
      }
    });
  });
});

test.describe('the write path is narrow and fails closed', () => {
  test('a second decision is refused server-side even though the UI is bypassed', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      const body = { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE' };
      expect(JSON.parse((await postDecision(port, body)).body).result).toBe('ACCEPTED');

      // Same request again, and a different decision on the same binding.
      expect(JSON.parse((await postDecision(port, body)).body).result).toBe('ALREADY_DECIDED');
      expect(JSON.parse((await postDecision(port, { ...body, decision: 'SUPERSEDE' })).body).result).toBe('ALREADY_DECIDED');

      // And the stored decision is untouched.
      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row!.localReview.value?.decision).toBe('ACCEPT_EVIDENCE');
    });
  });

  test('a submitted identity that is not current state is refused', async () => {
    await withServer({}, async ({ port, dossiers }) => {
      const target = dossiers[0]!;
      const result = JSON.parse(
        (await postDecision(port, { findingId: target.candidateId, reviewIdentity: '0'.repeat(24), decision: 'ACCEPT_EVIDENCE' })).body
      );
      expect(result.result).toBe('BINDING_MISMATCH');
      // Nothing was written.
      const row = rowFor(await reviewerDto(port), target.candidateId);
      expect(row!.localReview.epistemicClass).toBe('UNKNOWN');
    });
  });

  test("one finding's identity cannot be used to decide another", async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const [first, second] = [dossiers[0]!, dossiers[1]!];
      const result = JSON.parse(
        (await postDecision(port, {
          findingId: second.candidateId,
          reviewIdentity: authority!.identityFor(first, { campaignId: CAMPAIGN }),
          decision: 'ACCEPT_EVIDENCE',
        })).body
      );
      expect(result.result).toBe('BINDING_MISMATCH');
    });
  });

  test('the decision enum is validated before any finding lookup', async () => {
    // Precedence, not just outcome. Without an explicit decision check the
    // lifecycle would still refuse an unknown decision eventually — so the
    // result code alone cannot tell the two implementations apart. What DOES
    // distinguish them is the order: a request that is malformed in two ways
    // must be reported as malformed input, not as a missing finding.
    await withServer({}, async ({ port }) => {
      const result = JSON.parse(
        (await postDecision(port, { findingId: 'no-such-finding', reviewIdentity: '0'.repeat(24), decision: 'NOT_A_DECISION' })).body
      );
      expect(result.result).toBe('INVALID_DECISION');
    });
  });

  test('an unknown finding is refused', async () => {
    await withServer({}, async ({ port }) => {
      const result = JSON.parse(
        (await postDecision(port, { findingId: 'no-such-finding', reviewIdentity: '0'.repeat(24), decision: 'ACCEPT_EVIDENCE' })).body
      );
      expect(result.result).toBe('UNKNOWN_FINDING');
    });
  });

  test('a decision outside the canonical enum is refused', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      for (const decision of ['APPROVE', 'LESLIE_GENUINE', 'PONDR_APPROVED', 'reviewed', '', 'ACCEPT_EVIDENCE ']) {
        const result = JSON.parse((await postDecision(port, { findingId: target.candidateId, reviewIdentity: identity, decision })).body);
        expect(result.result, decision).toBe('INVALID_DECISION');
      }
    });
  });

  for (const [label, rationale] of [
    ['an email', 'contact person@example.com'],
    ['a bearer token', 'used Bearer abcdefghijklmnop'],
    ['a JWT', 'eyJhbGciOiJIUzI1NiJ9.payload'],
    ['an AWS key', 'AKIAIOSFODNN7EXAMPLE'],
    ['a customer sentinel', 'CUSTOMER_SENTINEL was wrong'],
    ['an account sentinel', 'ACCOUNT_SENTINEL mismatch'],
    ['a cost sentinel', 'COST_SENTINEL drift'],
    ['a private key', '-----BEGIN RSA PRIVATE KEY-----'],
  ] as const) {
    test(`a rationale carrying ${label} never persists`, async () => {
      await withServer({}, async ({ port, authority, dossiers }) => {
        const target = dossiers[0]!;
        const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
        const result = JSON.parse(
          (await postDecision(port, { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE', rationale })).body
        );
        expect(result.result).toBe('INVALID_RATIONALE');
        // And the store holds nothing for it.
        expect(fs.readdirSync(authority!.storeRoot)).toEqual([]);
        const row = rowFor(await reviewerDto(port), target.candidateId);
        expect(row!.localReview.epistemicClass).toBe('UNKNOWN');
      });
    });
  }

  test('an oversized rationale is refused', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      const result = JSON.parse(
        (await postDecision(port, { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE', rationale: 'x'.repeat(2001) })).body
      );
      expect(result.result).toBe('INVALID_RATIONALE');
      expect(fs.readdirSync(authority!.storeRoot)).toEqual([]);
    });
  });
});

test.describe('the write route does not exist unless it was configured', () => {
  test('without an authority the server is still strictly read-only', async () => {
    await withServer({ root: null }, async ({ port }) => {
      // 405, not 404: without a review authority this server accepts GET and
      // HEAD and nothing else, and it says exactly that. The write path is
      // not a hidden route that happens to be switched off — the method is
      // refused for every path, which is the posture every existing
      // deployment had before this campaign and still has.
      const decision = await postDecision(port, { findingId: 'x', reviewIdentity: 'y', decision: 'ACCEPT_EVIDENCE' });
      expect(decision.status).toBe(405);

      const elsewhere = await request(port, { method: 'POST', pathname: '/api/v1/reviewer', body: '{}', headers: { 'x-nightwatch-local-review': '1' } });
      expect(elsewhere.status).toBe(405);

      // And the route itself does not resolve to anything.
      expect((await request(port, { method: 'GET', pathname: '/api/v1/reviewer/decision' })).status).toBe(404);
    });
  });

  test('POST to any other path is refused even when the authority exists', async () => {
    await withServer({}, async ({ port }) => {
      for (const pathname of ['/api/v1/reviewer', '/api/v1/findings', '/api/v1/events', '/healthz']) {
        const response = await request(port, { method: 'POST', pathname, body: '{}', headers: { 'x-nightwatch-local-review': '1' } });
        expect(response.status, pathname).toBe(405);
      }
    });
  });

  test('GET on the decision route is refused', async () => {
    await withServer({}, async ({ port }) => {
      expect((await request(port, { method: 'GET', pathname: '/api/v1/reviewer/decision' })).status).toBe(405);
    });
  });

  test('a request without the local-write header is refused', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      const body = { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE' };
      expect((await postDecision(port, body, {})).status).toBe(400);
      expect((await postDecision(port, body, { 'x-nightwatch-local-review': '0' })).status).toBe(400);
      expect(fs.readdirSync(authority!.storeRoot)).toEqual([]);
    });
  });

  test('a cross-origin request is refused before the body is read', async () => {
    await withServer({}, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      const identity = authority!.identityFor(target, { campaignId: CAMPAIGN });
      const response = await postDecision(
        port,
        { findingId: target.candidateId, reviewIdentity: identity, decision: 'ACCEPT_EVIDENCE' },
        { 'x-nightwatch-local-review': '1', origin: 'https://evil.example.com' }
      );
      expect(response.status).toBe(403);
      expect(fs.readdirSync(authority!.storeRoot)).toEqual([]);
    });
  });

  test('a non-JSON content type is refused', async () => {
    await withServer({}, async ({ port }) => {
      const response = await request(port, {
        method: 'POST',
        pathname: '/api/v1/reviewer/decision',
        body: 'findingId=x',
        headers: { 'x-nightwatch-local-review': '1', 'content-type': 'application/x-www-form-urlencoded' },
      });
      expect(response.status).toBe(400);
    });
  });

  test('an oversized body is refused rather than buffered', async () => {
    await withServer({}, async ({ port }) => {
      const response = await postDecision(port, { findingId: 'x'.repeat(20_000), reviewIdentity: 'y', decision: 'ACCEPT_EVIDENCE' });
      expect(response.status).toBe(413);
    });
  });

  test('a query string on the write route is refused', async () => {
    await withServer({}, async ({ port }) => {
      const response = await request(port, {
        method: 'POST',
        pathname: '/api/v1/reviewer/decision?findingId=x',
        body: '{}',
        headers: { 'x-nightwatch-local-review': '1' },
      });
      expect(response.status).toBe(400);
    });
  });

  test('malformed JSON is refused', async () => {
    await withServer({}, async ({ port }) => {
      for (const body of ['{', '[]', 'null', '"text"', '']) {
        const response = await request(port, {
          method: 'POST',
          pathname: '/api/v1/reviewer/decision',
          body,
          headers: { 'x-nightwatch-local-review': '1' },
        });
        expect(response.status, body).toBe(400);
      }
    });
  });

  test('the write authority writes only into its own store root', async () => {
    const root = tempRoot();
    await withServer({ root }, async ({ port, authority, dossiers }) => {
      const target = dossiers[0]!;
      await postDecision(port, {
        findingId: target.candidateId,
        reviewIdentity: authority!.identityFor(target, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
      });
      const written = fs.readdirSync(root);
      expect(written).toHaveLength(1);
      expect(written[0]).toMatch(/^review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/);
    });
  });
});
