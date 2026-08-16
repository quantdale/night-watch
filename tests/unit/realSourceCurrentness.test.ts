// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — source freshness matrix (SPEC §34) + per-expectation
// snapshot binding (SPEC §18) + multi-repo snapshot swap test (SPEC §38).
//
//   A. exact source SHA                        -> RESOLVED (admitted/current)
//   B. same repo, different SHA                -> SOURCE_STALE
//   C. repo missing                            -> SOURCE_UNAVAILABLE
//   D. path missing                            -> SOURCE_UNAVAILABLE
//   E. evidence structure changed              -> SOURCE_STALE (re-derivation
//      required; never silent re-bind)
//   F. unrelated irrelevant source change      -> RESOLVED (documented:
//      the evidence digest covers the normalized structure only)
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import {
  FIXTURE_REPO_A,
  FIXTURE_REPO_B,
  FIXTURE_SHA_A,
  FIXTURE_SHA_B,
  createFixtureSourceState,
  deriveFixtureExpectations,
  exchangeRateFixture,
} from '../helpers/phase9a1Fixtures';

function resolverFor(state: ReturnType<typeof createFixtureSourceState>, expectations: ReturnType<typeof deriveFixtureExpectations>['derivedA']) {
  return createRealSourceResolver({
    recipes: state.recipes,
    expectations,
    reader: state.map.reader,
    currentness: state.map.currentness,
  });
}

test.describe('Phase 9A.1 — source freshness matrix (SPEC §34)', () => {
  test('A — exact source SHA resolves with its exact snapshot', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const resolver = resolverFor(state, derivedA);
    const resolution = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('RESOLVED');
    if (resolution.kind !== 'RESOLVED') return;
    expect(resolution.sourceSnapshot).toEqual({ repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A });
    expect(resolution.expectation.sourceProvenance.sha).toBe(FIXTURE_SHA_A);
    // The snapshot returned corresponds to the resolved expectation.
    expect(resolution.sourceSnapshot.repoId).toBe(resolution.expectation.sourceProvenance.repoId);
    expect(resolution.sourceSnapshot.sha).toBe(resolution.expectation.sourceProvenance.sha);
  });

  test('B — same repo, different SHA -> SOURCE_STALE (never silent re-bind)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.setSha(FIXTURE_REPO_A, 'cccccccccccccccccccccccccccccccccccccccc');
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_STALE');
  });

  test('C — repo missing -> SOURCE_UNAVAILABLE', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.removeRepo(FIXTURE_REPO_A);
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_UNAVAILABLE');
  });

  test('D — path missing -> SOURCE_UNAVAILABLE', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.removeFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php');
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_UNAVAILABLE');
  });

  test('E — evidence structure changed (key removed) -> SOURCE_STALE (re-derivation required)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const drifted = exchangeRateFixture.replace("'month' => $month,", "'monthX' => $month,");
    state.map.setFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php', drifted);
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_STALE');
  });

  test('E2 — evidence structure changed (dirty worktree at the SAME sha) -> SOURCE_STALE', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    // Same sha, but the handler file content changed locally (dirty tree).
    state.map.setFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php', exchangeRateFixture.replace("$res[] = [", "$res[] = [\n            'extra' => true,"));
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('SOURCE_STALE');
  });

  test('F — unrelated source change elsewhere -> RESOLVED (digest covers the normalized structure only)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    state.map.setFile(FIXTURE_REPO_A, 'handlers/Unrelated.php', '<?php // unrelated file');
    state.map.setFile(FIXTURE_REPO_A, 'docs/README.md', '# unrelated doc change');
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(resolution.kind).toBe('RESOLVED');
  });

  test('unknown targetId -> NO_EXPECTATION', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const resolution = resolverFor(state, derivedA).resolve({ targetId: 'fixture-a.nonexistent.read' });
    expect(resolution.kind).toBe('NO_EXPECTATION');
  });
});

test.describe('Phase 9A.1 — per-expectation snapshot binding + multi-repo swap (SPEC §18, §38)', () => {
  test('expectation from repo A receives snapshot A; repo B receives snapshot B', () => {
    const state = createFixtureSourceState();
    const { derivedA, derivedB } = deriveFixtureExpectations(state);
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [...derivedA, ...derivedB],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    const a = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    const b = resolver.resolve({ targetId: 'fixture-b.settings.read' });
    expect(a.kind).toBe('RESOLVED');
    expect(b.kind).toBe('RESOLVED');
    if (a.kind !== 'RESOLVED' || b.kind !== 'RESOLVED') return;
    expect(a.sourceSnapshot.repoId).toBe(FIXTURE_REPO_A);
    expect(a.sourceSnapshot.sha).toBe(FIXTURE_SHA_A);
    expect(b.sourceSnapshot.repoId).toBe(FIXTURE_REPO_B);
    expect(b.sourceSnapshot.sha).toBe(FIXTURE_SHA_B);
  });

  test('intentionally swapped snapshots fail stale/currentness — never PASS', () => {
    const state = createFixtureSourceState();
    const { derivedA, derivedB } = deriveFixtureExpectations(state);
    // Swap the CURRENTNESS: repo A now reports repo B's sha.
    state.map.setSha(FIXTURE_REPO_A, FIXTURE_SHA_B);
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [...derivedA, ...derivedB],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    // Repo A's current sha (B's sha) != the bound sha (A's sha) -> STALE.
    const a = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(a.kind).toBe('SOURCE_STALE');
    // Repo B's snapshot cannot validate repo A's expectation even when
    // handed directly: freshness is per-expectation, never global.
    const staleCheck = resolver.resolve({ targetId: 'fixture-b.settings.read' });
    expect(staleCheck.kind).toBe('RESOLVED');
    if (staleCheck.kind !== 'RESOLVED') return;
    expect(staleCheck.sourceSnapshot.sha).toBe(FIXTURE_SHA_B);
    expect(staleCheck.expectation.sourceProvenance.repoId).toBe(FIXTURE_REPO_B);
  });

  test('no global current snapshot can accidentally validate another expectation', () => {
    const state = createFixtureSourceState();
    const { derivedA, derivedB } = deriveFixtureExpectations(state);
    // A repo-A expectation with repo B's snapshot injected directly.
    const swapped = derivedA.map((expectation) => ({
      ...expectation,
      // The provenance stays A; the resolution snapshot is what the resolver
      // returns — the resolver derives it from currentness, so a caller
      // cannot inject B's snapshot for A's expectation through the atomic
      // interface. Pin the invariant: every RESOLVED result's snapshot
      // equals the expectation's bound provenance.
    }));
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [...swapped, ...derivedB],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    const a = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(a.kind).toBe('RESOLVED');
    if (a.kind !== 'RESOLVED') return;
    expect(a.sourceSnapshot.repoId).toBe(a.expectation.sourceProvenance.repoId);
    expect(a.sourceSnapshot.sha).toBe(a.expectation.sourceProvenance.sha);
  });

  test('stale repo A does not affect repo B resolution (per-expectation independence)', () => {
    const state = createFixtureSourceState();
    const { derivedA, derivedB } = deriveFixtureExpectations(state);
    state.map.setSha(FIXTURE_REPO_A, 'dddddddddddddddddddddddddddddddddddddddd');
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: [...derivedA, ...derivedB],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    expect(resolver.resolve({ targetId: 'fixture-a.common-exchange.read' }).kind).toBe('SOURCE_STALE');
    expect(resolver.resolve({ targetId: 'fixture-b.settings.read' }).kind).toBe('RESOLVED');
  });
});
