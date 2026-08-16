// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — source-freshness unit matrix (SPEC §6, §7, §8, §22).
//
//   A. remote == reviewed, derivation ok        -> USE_REVIEWED_SNAPSHOT
//   B. remote advanced, contract derives        -> REDERIVE_FRESH_SNAPSHOT
//   C. remote advanced, route binding changed   -> BLOCK REAL_SOURCE_CONTRACT_DRIFT
//   D. remote advanced, required row keys changed -> BLOCK REAL_SOURCE_CONTRACT_DRIFT
//   E. remote unavailable                       -> BLOCK SOURCE_FRESHNESS_UNRESOLVED
//   F. expectation derives but UI journey source changed -> BLOCK JOURNEY_SOURCE_DRIFT
//
// Synthetic remote/local SHA fixtures only — no GitHub dependency in CI.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  classifySourceFreshness,
  freshnessBlockToken,
  type Phase9bFreshnessFacts,
} from '../../src/core/phase9b/freshness';

const REVIEWED = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REMOTE = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const TARGET = 'ripple.common-exchange.read';

function baseFacts(overrides: Partial<Phase9bFreshnessFacts>): Phase9bFreshnessFacts {
  return {
    remoteSha: REMOTE,
    reviewedSha: REVIEWED,
    relevantSourceChanged: false,
    journeySourceChanged: false,
    derivation: { ok: true, targetId: TARGET },
    targetId: TARGET,
    ...overrides,
  };
}

test.describe('Phase 9B — source-freshness matrix (SPEC §22)', () => {
  test('A — remote equals reviewed SHA: use the reviewed snapshot (F1)', () => {
    const verdict = classifySourceFreshness(baseFacts({ remoteSha: REVIEWED }));
    expect(verdict).toEqual({ kind: 'USE_REVIEWED_SNAPSHOT', sha: REVIEWED });
  });

  test('B — remote advanced, relevant contract files unchanged, derivation ok: fresh re-derivation snapshot (F2)', () => {
    const verdict = classifySourceFreshness(baseFacts({ relevantSourceChanged: false }));
    expect(verdict).toEqual({ kind: 'REDERIVE_FRESH_SNAPSHOT', sha: REMOTE });
  });

  test('B2 — remote advanced, relevant files changed but the contract still derives: fresh snapshot (F2, mechanically unchanged)', () => {
    const verdict = classifySourceFreshness(baseFacts({ relevantSourceChanged: true }));
    expect(verdict).toEqual({ kind: 'REDERIVE_FRESH_SNAPSHOT', sha: REMOTE });
  });

  test('C — remote advanced, route binding changed (derivation failure): BLOCK contract drift', () => {
    const verdict = classifySourceFreshness(baseFacts({ derivation: { ok: false, failure: 'ROUTE_BINDING' } }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' });
  });

  test('D — remote advanced, required row keys changed (derivation failure): BLOCK contract drift', () => {
    const verdict = classifySourceFreshness(baseFacts({ derivation: { ok: false, failure: 'ITEM_KEYS_MISMATCH' } }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' });
  });

  test('D2 — remote advanced, derivation missing entirely: BLOCK (never bind without mechanical proof)', () => {
    const verdict = classifySourceFreshness(baseFacts({ derivation: null }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' });
  });

  test('E — remote unavailable: BLOCK source freshness unresolved BEFORE any DEV', () => {
    const verdict = classifySourceFreshness(baseFacts({ remoteSha: null }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'SOURCE_FRESHNESS_UNRESOLVED' });
  });

  test('F — derivation ok but the UI journey source changed: BLOCK journey source drift', () => {
    const verdict = classifySourceFreshness(baseFacts({ journeySourceChanged: true, relevantSourceChanged: true }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'JOURNEY_SOURCE_DRIFT' });
  });

  test('F2 — UI journey source changed even when the remote equals the reviewed SHA: BLOCK', () => {
    const verdict = classifySourceFreshness(baseFacts({ remoteSha: REVIEWED, journeySourceChanged: true }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'JOURNEY_SOURCE_DRIFT' });
  });

  test('A2 — remote equals reviewed but derivation fails: BLOCK contract drift (never trust the label)', () => {
    const verdict = classifySourceFreshness(baseFacts({ remoteSha: REVIEWED, derivation: { ok: false, failure: 'ITEM_KEYS_MISMATCH' } }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' });
  });

  test('A3 — remote equals reviewed but derivation target differs: BLOCK contract drift', () => {
    const verdict = classifySourceFreshness(baseFacts({ remoteSha: REVIEWED, derivation: { ok: true, targetId: 'ripple.payer-exchange.read' } }));
    expect(verdict).toEqual({ kind: 'BLOCK', reason: 'REAL_SOURCE_CONTRACT_DRIFT' });
  });

  test('blocker tokens map to the exact Phase 9B vocabulary', () => {
    expect(freshnessBlockToken('SOURCE_FRESHNESS_UNRESOLVED')).toBe('PHASE_9B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED');
    expect(freshnessBlockToken('REAL_SOURCE_CONTRACT_DRIFT')).toBe('PHASE_9B_BLOCKED_REAL_SOURCE_CONTRACT_DRIFT');
    expect(freshnessBlockToken('JOURNEY_SOURCE_DRIFT')).toBe('PHASE_9B_BLOCKED_JOURNEY_SOURCE_DRIFT');
  });
});
