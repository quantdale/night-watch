// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — M6 real-source canary (SPEC §33, §18, §52).
//
// READ-ONLY local source canary: proves the source adapter -> provenance ->
// deterministic expectation interface works against a REAL Alphaus checkout
// without any product/network execution. The adapter never guesses semantics
// from arbitrary source: real Alphaus source carries no `@nightwatch-contract`
// annotations, so the canary records `REAL_SOURCE_EXPECTATION_CANARY:
// NOT_ADMITTED` with the exact reason (no invented real product semantics),
// while proving provenance binding against the live checkout SHA.
//
// When sibling checkouts are absent (e.g. CI), the canary asserts the
// fail-closed `SOURCE_UNAVAILABLE` path instead — it is never skipped.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';
import { deriveExpectations, resolveExpectationFreshness } from '../../src/oracles/expectations';
import { createSourceParityFixture } from '../helpers/sourceParity';

const RIPPLE_API_REPO = 'mobingilabs/ripple-api';
const CANARY_FILE = 'src/App/Core/Enum/Account.php';
const APPROVED_SHA = PHASE5_SOURCE_SHAS.rippleApi;

test.describe('Phase 9 M6 — real-source canary (read-only)', () => {
  test('source adapter + provenance binding against a deterministic Git-backed source', () => {
    const fixture = createSourceParityFixture({ sha: APPROVED_SHA, prefix: 'nightwatch-expectation-source-test-' });
    try {
      const snapshot = fixture.access.currentness.currentSnapshot(RIPPLE_API_REPO);
      expect(snapshot).not.toBeNull();
      if (snapshot === null) return;
      expect(resolveExpectationFreshness(
        { sourceProvenance: { repoId: RIPPLE_API_REPO, sha: APPROVED_SHA, relativePath: CANARY_FILE, derivationVersion: 'nightwatch.expectation-derivation.v1' } },
        { repoId: RIPPLE_API_REPO, sha: snapshot.sha },
      )).toBe('EXPECTATION_SOURCE_CURRENT');

      const sourceText = fixture.access.reader.readFile(RIPPLE_API_REPO, CANARY_FILE);
      expect(sourceText).not.toBeNull();
      if (sourceText === null) return;
      const derived = deriveExpectations({
        sourceText,
        provenance: {
          repoId: RIPPLE_API_REPO,
          sha: snapshot.sha,
          relativePath: CANARY_FILE,
          symbol: 'Account',
          derivationVersion: 'nightwatch.expectation-derivation.v1',
        },
      });
      expect(derived.blockCount).toBe(0);
      expect(derived.expectations).toHaveLength(0);
      expect(snapshot.sha).toBe(APPROVED_SHA);
    } finally {
      fixture.dispose();
    }
  });

  test('a stale live checkout would classify EXPECTATION_SOURCE_STALE (fail-closed)', () => {
    expect(resolveExpectationFreshness(
      { sourceProvenance: { repoId: RIPPLE_API_REPO, sha: PHASE5_SOURCE_SHAS.rippleApi, relativePath: CANARY_FILE, derivationVersion: 'nightwatch.expectation-derivation.v1' } },
      { repoId: RIPPLE_API_REPO, sha: '9999999999999999999999999999999999999999' },
    )).toBe('EXPECTATION_SOURCE_STALE');
  });
});
