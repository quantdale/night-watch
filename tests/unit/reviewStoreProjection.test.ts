// ---------------------------------------------------------------------------
// The review-store surface: routing, projection and privacy.
//
// The projection is where store facts become a browser payload, so it is the
// last place a value can be caught before it leaves the process. Two things
// it must never carry: the name of a file Nightwatch did not write, and a
// validator detail that quotes bytes out of one.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { parseControlCenterPath } from '../../src/controlCenter/server/router';
import {
  projectReviewFiling,
  projectReviewHistory,
  projectReviewStoreInventory,
  unavailableReviewStore,
} from '../../src/controlCenter/adapters/reviewStoreAdapter';
import { ControlCenterReviewStoreAuthority } from '../../src/controlCenter/authorities/reviewStoreAuthority';
import { reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { ReviewStore } from '../../src/core/reviewStore';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'campaign/c1';

function storeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-projection-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function seeded(dossiers: readonly CorpusFinding[]): string {
  const root = storeRoot();
  const writer = new ReviewStore({ root });
  for (const [index, dossier] of dossiers.entries()) {
    writer.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
      decision: index % 2 === 0 ? 'ACCEPT_EVIDENCE' : 'MARK_INSUFFICIENT',
      reviewedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      storedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      rationale: 'local triage',
    });
  }
  return root;
}

test.describe('routing', () => {
  test('the three read routes parse, and only those three', () => {
    expect(parseControlCenterPath('/api/v1/review-store/inventory')).toEqual({ kind: 'route', route: { kind: 'reviewStoreInventory' } });
    expect(parseControlCenterPath('/api/v1/review-store/history/finding-1')).toMatchObject({ kind: 'route', route: { kind: 'reviewStoreHistory' } });
    expect(parseControlCenterPath('/api/v1/review-store/filing/finding-1')).toMatchObject({ kind: 'route', route: { kind: 'reviewStoreFiling' } });
    // There is no fourth route to decline. A destructive path is not served
    // and refused; it does not resolve at all.
    for (const pathname of [
      '/api/v1/review-store/delete/finding-1',
      '/api/v1/review-store/prune',
      '/api/v1/review-store/repair/finding-1',
      '/api/v1/review-store',
      '/api/v1/review-store/inventory/extra',
    ]) {
      expect(parseControlCenterPath(pathname), pathname).toEqual({ kind: 'unknown' });
    }
  });

  test('an unsafe finding id is rejected, never coerced', () => {
    for (const pathname of ['/api/v1/review-store/history/..', '/api/v1/review-store/filing/a%2Fb']) {
      expect(parseControlCenterPath(pathname).kind, pathname).toBe('rejected');
    }
    expect(parseControlCenterPath('/api/v1/review-store/history/finding with space').kind).toBe('rejected');
  });
});

test.describe('inventory projection', () => {
  const corpus = reviewerCorpus(4);

  test('counts, health conditions and tallies cross the boundary intact', () => {
    const root = seeded(corpus);
    const inventory = new ControlCenterReviewStoreAuthority({ root }).inventory({
      context: { dossiers: corpus, campaignId: CAMPAIGN },
    });
    const dto = projectReviewStoreInventory(inventory);
    expect(dto.state).toBe('AVAILABLE');
    expect(dto.counts.validArtifacts).toBe(4);
    expect(dto.counts.current).toBe(4);
    expect(dto.currentnessResolved).toBe(true);
    expect(dto.health.classification).toBe('HEALTHY');
    // Tallies are a SORTED LIST, not a map: a map's key order is a
    // serialization detail, and a determinism check over the wire payload
    // needs a defined order.
    expect(dto.byDecision.map((row) => row.code)).toEqual([...dto.byDecision.map((row) => row.code)].sort());
    expect(dto.byDecision.find((row) => row.code === 'ACCEPT_EVIDENCE')?.count).toBe(2);
    expect(dto.readOnly).toBe(true);
    expect(dto.retentionPolicy).toBe('NONE_OWNER_DECISION_PENDING');
    expect(dto.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
  });

  test('the payload is deterministic for identical store content', () => {
    const root = seeded(corpus);
    const authority = new ControlCenterReviewStoreAuthority({ root });
    const context = { dossiers: corpus, campaignId: CAMPAIGN };
    const first = JSON.stringify(projectReviewStoreInventory(authority.inventory({ context })));
    const second = JSON.stringify(projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory({ context })));
    expect(second).toBe(first);
  });

  test('an unrecognized entry crosses as a digest, and its name does not', () => {
    const root = seeded(corpus);
    fs.writeFileSync(path.join(root, 'customer-CUSTOMER_SENTINEL-invoice.json'), '{"a":1}', { mode: 0o600 });
    const dto = projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory());
    const payload = JSON.stringify(dto);
    expect(dto.unknownEntries).toHaveLength(1);
    expect(dto.unknownEntries[0]?.nameDigest).toMatch(/^review-unknown-entry:[0-9a-f]{24}$/);
    expect(payload).not.toContain('CUSTOMER_SENTINEL');
    expect(payload).not.toContain('invoice');
    // The contract has no field for the name, so there is nothing to redact.
    expect(Object.keys(dto.unknownEntries[0] as object).sort()).toEqual(['bytes', 'kind', 'nameDigest']);
  });

  test('a corrupt artifact crosses as a code and a pinned file name, never a detail', () => {
    const root = seeded(corpus);
    const name = fs.readdirSync(root).find((candidate) => candidate.startsWith('review.')) as string;
    fs.writeFileSync(
      path.join(root, name),
      JSON.stringify({ schemaVersion: 'nightwatch.review-store.v1', 'ACCOUNT_SENTINEL_key': 1 }),
      { mode: 0o600 }
    );
    const dto = projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory());
    expect(dto.counts.corruptArtifacts).toBe(1);
    expect(dto.corruption[0]?.fileName).toMatch(/^review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/);
    expect(Object.keys(dto.corruption[0] as object).sort()).toEqual(['code', 'fileName']);
    expect(JSON.stringify(dto)).not.toContain('ACCOUNT_SENTINEL');
  });

  test('an unavailable store has an honest document rather than an empty healthy one', () => {
    const dto = unavailableReviewStore();
    expect(dto.state).toBe('UNAVAILABLE');
    expect(dto.health.classification).toBe('STORE_UNAVAILABLE');
    expect(dto.currentnessResolved).toBe(false);
    expect(dto.readOnly).toBe(true);
  });
});

test.describe('history and filing projection', () => {
  test('a generation carries currentness as DATA and no borrowed identity', () => {
    const corpus = reviewerCorpus(4);
    const dossier = corpus.find((candidate) => candidate.expectationId !== null) as CorpusFinding;
    const root = storeRoot();
    const writer = new ReviewStore({ root });
    const older = { ...dossier, contentDigest: `${dossier.contentDigest}-old` } as CorpusFinding;
    for (const [index, generation] of [older, dossier].entries()) {
      writer.putDecision({
        binding: reviewBindingFor(generation, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
        reviewedAt: `2026-09-0${index + 1}T10:00:00Z`,
        storedAt: `2026-09-0${index + 1}T10:00:00Z`,
        rationale: 'local triage',
      });
    }
    const history = new ControlCenterReviewStoreAuthority({ root }).history(dossier.candidateId, { dossiers: corpus, campaignId: CAMPAIGN });
    if ('absent' in history) throw new Error('expected a history document');
    const dto = projectReviewHistory(history);
    expect(dto.generations).toHaveLength(2);
    expect(dto.generations.map((row) => row.currentness).sort()).toEqual(['CURRENT', 'STALE']);
    // The current artifact's identity is reported once, at the top level.
    expect(dto.currentExpectationId).toBe(dossier.expectationId);
    for (const row of dto.generations) {
      expect(row.expectationId).toBeNull();
      expect(row.semanticContractId).toBeNull();
      expect(row.identityAbsenceReason).toBe('REVIEW_BINDING_CARRIES_NO_SEMANTIC_IDENTITY');
    }
    // The staleness reason names the FIELD that drifted, as an uppercase code.
    const stale = dto.generations.find((row) => row.currentness === 'STALE');
    expect(stale?.staleReason).toMatch(/^[A-Z][A-Z0-9_]*$/);
    expect(stale?.staleReason).toContain('FINDING_REVIEW_STALE');
  });

  test('the filing markdown is screened again at the surface', () => {
    // Two screens because there are two boundaries. This one faces a browser,
    // and a surface trusting an upstream screen is trusting a boundary it
    // does not own.
    expect(() =>
      projectReviewFiling({
        schemaVersion: 'nightwatch.control-center-filing-report.v1',
        findingId: 'finding-1',
        reviewState: 'CURRENT',
        markdown: '# Report\n\ncontact bob@example.com\n',
        distribution: 'PRIVATE_LOCAL_MANUAL_COPY_ONLY',
        organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      } as never)
    ).toThrow(/REVIEW_STORE_PROJECTION_INVALID:filing.markdown/);
  });

  test('an oversized filing report is refused rather than truncated', () => {
    expect(() =>
      projectReviewFiling({
        schemaVersion: 'nightwatch.control-center-filing-report.v1',
        findingId: 'finding-1',
        reviewState: 'CURRENT',
        markdown: 'x'.repeat(70_000),
        distribution: 'PRIVATE_LOCAL_MANUAL_COPY_ONLY',
        organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      } as never)
    ).toThrow(/REVIEW_STORE_PROJECTION_INVALID:filing.markdown/);
  });

  test('a filing artifact claiming a different distribution is refused', () => {
    expect(() =>
      projectReviewFiling({
        schemaVersion: 'nightwatch.control-center-filing-report.v1',
        findingId: 'finding-1',
        reviewState: 'CURRENT',
        markdown: '# Report',
        distribution: 'PUBLISHED',
        organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      } as never)
    ).toThrow(/REVIEW_STORE_PROJECTION_INVALID:filing.distribution/);
  });

  test('a real filing artifact projects with its review state', () => {
    const corpus = reviewerCorpus(3);
    const dossier = corpus[0] as CorpusFinding;
    const root = seeded([dossier]);
    const artifact = new ControlCenterReviewStoreAuthority({ root }).filingReport(dossier.candidateId, { dossiers: corpus, campaignId: CAMPAIGN });
    if ('absent' in artifact) throw new Error('expected a filing artifact');
    const dto = projectReviewFiling(artifact);
    expect(dto.reviewState).toBe('CURRENT');
    expect(dto.distribution).toBe('PRIVATE_LOCAL_MANUAL_COPY_ONLY');
    expect(dto.markdown).toContain('PRIVATE/LOCAL artifact.');
  });
});
