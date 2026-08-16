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
import fs from 'node:fs';
import path from 'node:path';
import { PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';
import { deriveExpectations, resolveExpectationFreshness } from '../../src/oracles/expectations';

const DEFAULT_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
const RIPPLE_API_REPO = 'mobingilabs/ripple-api';
const CANARY_FILE = 'src/App/Core/Enum/Account.php';

function siblingRoot(): string | null {
  const env = process.env['NIGHTWATCH_SIBLING_ROOT'];
  if (env !== undefined && env.trim() !== '') return env;
  return fs.existsSync(DEFAULT_SIBLING_ROOT) ? DEFAULT_SIBLING_ROOT : null;
}

/** Read-only git HEAD resolution (no child process, no writes). */
function resolveGitHead(repoRoot: string): string | null {
  try {
    const headFile = path.join(repoRoot, '.git', 'HEAD');
    const head = fs.readFileSync(headFile, 'utf8').trim();
    const refMatch = /^ref:\s*(.+)$/.exec(head);
    if (refMatch !== null && refMatch[1] !== undefined) {
      const refPath = path.join(repoRoot, '.git', refMatch[1]);
      if (fs.existsSync(refPath)) {
        const sha = fs.readFileSync(refPath, 'utf8').trim();
        if (/^[0-9a-f]{40}$/.test(sha)) return sha;
      }
    }
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    // packed-refs fallback for the HEAD ref
    const packedPath = path.join(repoRoot, '.git', 'packed-refs');
    if (fs.existsSync(packedPath)) {
      for (const line of fs.readFileSync(packedPath, 'utf8').split(/\r?\n/)) {
        if (line.includes('refs/heads/') || line.includes('HEAD')) {
          const sha = line.split(' ', 1)[0];
          if (sha !== undefined && /^[0-9a-f]{40}$/.test(sha)) return sha;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

test.describe('Phase 9 M6 — real-source canary (read-only)', () => {
  test('source adapter + provenance binding against a live Alphaus checkout', () => {
    const root = siblingRoot();
    if (root === null) {
      // Fail-closed environment path: no sibling source -> the derivation
      // surface is EXPECTATION_SOURCE_UNAVAILABLE, never an anomaly.
      expect(resolveExpectationFreshness(
        { sourceProvenance: { repoId: RIPPLE_API_REPO, sha: PHASE5_SOURCE_SHAS.rippleApi, relativePath: CANARY_FILE, derivationVersion: 'nightwatch.expectation-derivation.v1' } },
        null,
      )).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
      return;
    }

    const repoRoot = path.join(root, RIPPLE_API_REPO);
    const resolvedSha = resolveGitHead(repoRoot);
    expect(resolvedSha, `read-only git HEAD resolution for ${RIPPLE_API_REPO}`).toMatch(/^[0-9a-f]{40}$/);
    if (resolvedSha === null) throw new Error('REAL_SOURCE_CANARY_HEAD_UNRESOLVED');
    const liveSha: string = resolvedSha;

    // Catalog provenance freshness: the Phase 5 catalog's recorded SHA must
    // match the live checkout — EXPECTATION_SOURCE_CURRENT.
    expect(resolveExpectationFreshness(
      { sourceProvenance: { repoId: RIPPLE_API_REPO, sha: PHASE5_SOURCE_SHAS.rippleApi, relativePath: CANARY_FILE, derivationVersion: 'nightwatch.expectation-derivation.v1' } },
      { repoId: RIPPLE_API_REPO, sha: liveSha },
    )).toBe('EXPECTATION_SOURCE_CURRENT');

    // Static source read + the SAME derivation interface as the fixture.
    const sourceText = fs.readFileSync(path.join(repoRoot, CANARY_FILE), 'utf8');
    const derived = deriveExpectations({
      sourceText,
      provenance: {
        repoId: RIPPLE_API_REPO,
        sha: liveSha,
        relativePath: CANARY_FILE,
        symbol: 'Account',
        derivationVersion: 'nightwatch.expectation-derivation.v1',
      },
    });
    expect(derived.blockCount).toBe(0);
    expect(derived.expectations).toHaveLength(0);

    // The canary verdict: no real domain expectation is admitted from real
    // source (the annotation pattern is absent; Nightwatch never guesses).
    // Provenance binding itself is proven by the freshness checks above.
    expect(liveSha).toBe(PHASE5_SOURCE_SHAS.rippleApi);
  });

  test('a stale live checkout would classify EXPECTATION_SOURCE_STALE (fail-closed)', () => {
    expect(resolveExpectationFreshness(
      { sourceProvenance: { repoId: RIPPLE_API_REPO, sha: PHASE5_SOURCE_SHAS.rippleApi, relativePath: CANARY_FILE, derivationVersion: 'nightwatch.expectation-derivation.v1' } },
      { repoId: RIPPLE_API_REPO, sha: '9999999999999999999999999999999999999999' },
    )).toBe('EXPECTATION_SOURCE_STALE');
  });
});
