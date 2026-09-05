// ---------------------------------------------------------------------------
// The review-store operations authority: one composition point for the three
// read-only operator questions, shared by the CLI and the browser surface.
//
// The properties worth proving here are the ones that only appear once the
// store and the findings snapshot are put side by side:
//
//   - it cannot write, because the handle it holds cannot write;
//   - a finding whose dossier is not in the snapshot is UNRESOLVABLE, which
//     is not the same fact as STALE;
//   - currentness is claimed only when the current artifacts are actually in
//     hand.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ControlCenterReviewStoreAuthority } from '../../src/controlCenter/authorities/reviewStoreAuthority';
import { reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { ReviewStore } from '../../src/core/reviewStore';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const CAMPAIGN = 'campaign/c1';

function storeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-ops-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function seeded(dossiers: readonly CorpusFinding[]): { readonly root: string; readonly writer: ReviewStore } {
  const root = storeRoot();
  const writer = new ReviewStore({ root });
  for (const [index, dossier] of dossiers.entries()) {
    writer.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      storedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
      rationale: 'local triage',
    });
  }
  return { root, writer };
}

const context = (dossiers: readonly CorpusFinding[]) => ({ dossiers, campaignId: CAMPAIGN });

test.describe('the operations authority holds no write capability', () => {
  test('its store handle is read-only, so a write is structurally unavailable', () => {
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const authority = new ControlCenterReviewStoreAuthority({ root });
    // The authority exposes no mutator at all. Enumerate the surface so a
    // future one cannot be added without this failing.
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(authority)).filter((name) => name !== 'constructor');
    expect(surface.sort()).toEqual(
      ['currentArtifactsByFinding', 'currentnessResolver', 'filingReport', 'history', 'inventory', 'readState', 'storeExists', 'storeRoot'].sort()
    );
    for (const forbidden of ['delete', 'prune', 'remove', 'repair', 'archive', 'clean', 'putDecision', 'recoverTemporaries']) {
      expect(surface, forbidden).not.toContain(forbidden);
    }
  });

  test('reading the store never changes it', () => {
    const corpus = reviewerCorpus(4);
    const { root } = seeded(corpus);
    const snapshot = () =>
      JSON.stringify(
        fs.readdirSync(root).sort().map((name) => {
          const stat = fs.lstatSync(path.join(root, name));
          return { name, size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs };
        })
      );
    const before = snapshot();
    const authority = new ControlCenterReviewStoreAuthority({ root });
    authority.inventory({ context: context(corpus) });
    authority.history((corpus[0] as CorpusFinding).candidateId, context(corpus));
    authority.filingReport((corpus[0] as CorpusFinding).candidateId, context(corpus));
    expect(snapshot()).toBe(before);
  });
});

test.describe('currentness is resolved only against artifacts actually in hand', () => {
  test('without a context, nothing is claimed current or stale', () => {
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const inventory = new ControlCenterReviewStoreAuthority({ root }).inventory();
    expect(inventory.currentnessResolved).toBe(false);
    expect(inventory.counts.byCurrentness).toEqual({ CURRENT: 0, STALE: 0, UNKNOWN: 3 });
  });

  test('with a context, reviews bound to the projected dossiers are CURRENT', () => {
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const inventory = new ControlCenterReviewStoreAuthority({ root }).inventory({ context: context(corpus) });
    expect(inventory.currentnessResolved).toBe(true);
    expect(inventory.counts.byCurrentness).toEqual({ CURRENT: 3, STALE: 0, UNKNOWN: 0 });
    expect(inventory.health.classification).toBe('HEALTHY');
  });

  test('a review whose finding left the snapshot is UNKNOWN, not STALE', () => {
    // The distinction is the point. "The review no longer binds" and "we
    // cannot see what it would bind to" are different facts, and rounding
    // the second to the first would report phantom staleness for every
    // review of a finding that has simply been triaged away.
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const shrunk = corpus.slice(0, 1);
    const inventory = new ControlCenterReviewStoreAuthority({ root }).inventory({ context: context(shrunk) });
    expect(inventory.counts.byCurrentness).toEqual({ CURRENT: 1, STALE: 0, UNKNOWN: 2 });
    expect(inventory.health.conditions).not.toContain('STALE_HISTORY_PRESENT');
  });

  test('a regenerated dossier makes its review STALE, and that is not corruption', () => {
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const regenerated = corpus.map((dossier, index) =>
      index === 0 ? ({ ...dossier, contentDigest: `${dossier.contentDigest}-v2` } as CorpusFinding) : dossier
    );
    const inventory = new ControlCenterReviewStoreAuthority({ root }).inventory({ context: context(regenerated) });
    expect(inventory.counts.byCurrentness).toEqual({ CURRENT: 2, STALE: 1, UNKNOWN: 0 });
    expect(inventory.health.classification).toBe('STALE_HISTORY_PRESENT');
    expect(inventory.counts.corruptArtifacts).toBe(0);
  });
});

test.describe('history and filing for one finding', () => {
  test('a finding outside the snapshot yields a categorical absence, not an empty document', () => {
    const corpus = reviewerCorpus(3);
    const { root } = seeded(corpus);
    const authority = new ControlCenterReviewStoreAuthority({ root });
    expect(authority.history('finding/never-existed', context(corpus))).toEqual({ absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' });
    expect(authority.filingReport('finding/never-existed', context(corpus))).toEqual({ absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' });
    expect(authority.readState('finding/never-existed', context(corpus))).toBeNull();
  });

  test('history carries the CURRENT artifact identity at the top level only', () => {
    const corpus = reviewerCorpus(6);
    const withIdentity = corpus.find((dossier) => dossier.expectationId !== null) as CorpusFinding;
    const { root } = seeded([withIdentity]);
    const history = new ControlCenterReviewStoreAuthority({ root }).history(withIdentity.candidateId, context(corpus));
    if ('absent' in history) throw new Error('expected a history document');
    expect(history.currentArtifactIdentity.expectationId).toBe(withIdentity.expectationId);
    expect(history.currentArtifactIdentity.semanticContractId).toBe(withIdentity.semanticContractId);
    // And never copied down onto a generation, where it would be a claim
    // about what was reviewed rather than about what exists now.
    for (const generation of history.generations) {
      expect(generation.expectationId).toBeNull();
      expect(generation.semanticContractId).toBeNull();
    }
  });

  test('multiple generations are ordered, and the current one is identified', () => {
    const corpus = reviewerCorpus(2);
    const dossier = corpus[0] as CorpusFinding;
    const root = storeRoot();
    const writer = new ReviewStore({ root });
    const generations = ['v1', 'v2', 'v3'].map((suffix) => ({ ...dossier, contentDigest: `${dossier.contentDigest}-${suffix}` }) as CorpusFinding);
    for (const [index, generation] of generations.entries()) {
      writer.putDecision({
        binding: reviewBindingFor(generation, { campaignId: CAMPAIGN }),
        decision: index === 2 ? 'MARK_INSUFFICIENT' : 'ACCEPT_EVIDENCE',
        reviewedAt: `2026-09-05T10:0${index}:00Z`,
        storedAt: `2026-09-05T10:0${index}:00Z`,
        rationale: `generation ${index}`,
      });
    }
    // The CURRENT artifact is the SECOND generation, not the newest.
    const current = generations[1] as CorpusFinding;
    const history = new ControlCenterReviewStoreAuthority({ root }).history(current.candidateId, context([current, corpus[1] as CorpusFinding]));
    if ('absent' in history) throw new Error('expected a history document');
    expect(history.page.total).toBe(3);
    expect(history.generations.map((row) => row.storedAt)).toEqual(['2026-09-05T10:02:00Z', '2026-09-05T10:01:00Z', '2026-09-05T10:00:00Z']);
    expect(history.generations[1]?.currentness).toBe('CURRENT');
    expect(history.generations[0]?.currentness).toBe('STALE');
    expect(history.staleGenerationCount).toBe(2);
    expect(history.decisionChangedAcrossGenerations).toBe(true);
  });

  test('the filing report reflects the real store state for the finding', () => {
    const corpus = reviewerCorpus(3);
    const dossier = corpus[0] as CorpusFinding;
    const { root } = seeded([dossier]);
    const artifact = new ControlCenterReviewStoreAuthority({ root }).filingReport(dossier.candidateId, context(corpus));
    if ('absent' in artifact) throw new Error('expected a filing artifact');
    expect(artifact.reviewState).toBe('CURRENT');
    expect(artifact.markdown).toContain('## Local review (FACT: current local decision, not organizational sign-off)');
    expect(artifact.distribution).toBe('PRIVATE_LOCAL_MANUAL_COPY_ONLY');
    // An unreviewed finding in the same snapshot is a human decision.
    const other = corpus[1] as CorpusFinding;
    const unreviewed = new ControlCenterReviewStoreAuthority({ root }).filingReport(other.candidateId, context(corpus));
    if ('absent' in unreviewed) throw new Error('expected a filing artifact');
    expect(unreviewed.reviewState).toBe('NO_REVIEW');
    expect(unreviewed.markdown).toContain('## Local review (HUMAN DECISION REQUIRED)');
  });

  test('an absent store answers rather than failing', () => {
    // A reviewer surface must not go down because persistence is missing.
    const authority = new ControlCenterReviewStoreAuthority({ root: path.join(storeRoot(), 'never-created') });
    expect(authority.storeExists).toBe(false);
    const inventory = authority.inventory();
    expect(inventory.health.classification).toBe('STORE_UNAVAILABLE');
    const corpus = reviewerCorpus(2);
    const history = authority.history((corpus[0] as CorpusFinding).candidateId, context(corpus));
    if ('absent' in history) throw new Error('expected a history document');
    expect(history.state).toBe('NO_REVIEW');
    expect(history.generations).toEqual([]);
  });
});
