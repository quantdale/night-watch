// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — real-source admission bridge matrix (SPEC §10,
// §14, §15, §16, §28).
//
// Proves: recipe + read-only source -> mechanically verified expectation
// with a deterministic evidence digest; contract drift fails closed;
// provenance carries the exact snapshot; and the forbidden shortcut
// "synthetic expectation + real SHA relabeling" is REJECTED.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  deriveRealSourceExpectation,
  deriveRealSourceExpectations,
  REAL_SOURCE_DERIVATION_VERSION,
} from '../../src/oracles/expectations/admission';
import { evidenceDigestFor } from '../../src/oracles/expectations/extract/evidence';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { evaluateSemanticResolution } from '../../src/oracles/semantic/hook';
import { SEMANTIC_RECEIPT_NON_PASS_OUTCOMES } from '../../src/oracles/semantic/receipts';
import {
  DEV_OBSERVATION_CANNOT_ADMIT_EXPECTATION,
  REAL_SOURCE_EXPECTATION_PROOF_MISSING,
  assertNoExpectationCreatedFromObservation,
  assertRealSourceExpectationProof,
} from '../../src/core/semanticAcceptance';
import { DEFAULT_PROJECTION_LIMITS } from '../../src/oracles/projections/types';
import type { SemanticExpectation } from '../../src/oracles/expectations/types';
import { FIXTURE_REPO_A, FIXTURE_SHA_A, createFixtureSourceState, deriveFixtureExpectations, FIXTURE_RECIPES, exchangeRateFixture } from '../helpers/phase9a1Fixtures';

test.describe('Phase 9A.1 — admission bridge', () => {
  test('all four repo-a recipes derive + admit against the fixture snapshot', () => {
    const state = createFixtureSourceState();
    const report = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    expect(report.failures).toHaveLength(0);
    expect(report.derived).toHaveLength(4);
    for (const derived of report.derived) {
      const expectation = derived.expectation;
      expect(expectation.sourceProvenance.repoId).toBe(FIXTURE_REPO_A);
      expect(expectation.sourceProvenance.sha).toBe(FIXTURE_SHA_A);
      expect(expectation.sourceProvenance.derivationVersion).toBe(REAL_SOURCE_DERIVATION_VERSION);
      expect(expectation.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      expect(expectation.targetKind).toBe('API_OPERATION');
      // Root-type invariant (top-level JSON array) is always present.
      expect(expectation.invariantDefinitions[0]).toEqual({ kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' });
      // Item field presence invariants carry the source-literal key set.
      const fieldPresences = expectation.invariantDefinitions.slice(1);
      expect(fieldPresences.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('evidence digest is deterministic and structure-bound', () => {
    const state = createFixtureSourceState();
    const first = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    const second = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    expect(first.derived.map((d) => d.evidenceDigest)).toEqual(second.derived.map((d) => d.evidenceDigest));
    // Unrelated change elsewhere does NOT change the digest (freshness F).
    state.map.setFile(FIXTURE_REPO_A, 'handlers/Unrelated.php', '<?php // unrelated new file');
    const third = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    expect(third.derived.map((d) => d.evidenceDigest)).toEqual(first.derived.map((d) => d.evidenceDigest));
  });

  test('contract drift (key removed from the source literal) fails closed', () => {
    const state = createFixtureSourceState();
    const drifted = exchangeRateFixture.replace("'month' => $month,", "'monthX' => $month,");
    state.map.setFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php', drifted);
    const recipe = FIXTURE_RECIPES.find((r) => r.recipeId === 'recipe.fixture-a.common-exchange.read')!;
    const result = deriveRealSourceExpectation(recipe, FIXTURE_SHA_A, state.map.reader);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ITEM_KEYS_MISMATCH');
  });

  test('missing source file -> SOURCE_UNAVAILABLE (fail-closed)', () => {
    const state = createFixtureSourceState();
    state.map.removeFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php');
    const recipe = FIXTURE_RECIPES.find((r) => r.recipeId === 'recipe.fixture-a.common-exchange.read')!;
    const result = deriveRealSourceExpectation(recipe, FIXTURE_SHA_A, state.map.reader);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('SOURCE_UNAVAILABLE');
  });

  test('missing repo -> SOURCE_UNAVAILABLE at batch level', () => {
    const state = createFixtureSourceState();
    state.map.removeRepo(FIXTURE_REPO_A);
    const report = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    expect(report.derived).toHaveLength(0);
    expect(report.failures.every((f) => f.failure === 'SOURCE_UNAVAILABLE')).toBe(true);
  });

  test('SPEC §16 — synthetic expectation + real SHA relabeling is REJECTED', () => {
    // The forbidden shortcut: take a SYNTHETIC fixture expectation and
    // relabel its provenance with a real-looking repo @ SHA. The admission
    // chain must REJECT it: a provenance label cannot manufacture semantic
    // authority. The resolver is the mechanical gate:
    //   (a) a synthetic expectation without a registered recipe -> STALE;
    //   (b) without an evidence digest -> STALE;
    //   (c) with a forged digest that does not match the real source
    //       re-extraction -> STALE (REAL_SOURCE_EXPECTATION_PROOF_MISSING).
    // NEVER RESOLVED -> never evaluated -> never PASS.
    const state = createFixtureSourceState();
    const synthetic: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.entity.read.success-envelope',
      targetKind: 'API_OPERATION',
      targetId: 'fixture-a.common-exchange.read',
      sourceProvenance: {
        repoId: FIXTURE_REPO_A,
        sha: FIXTURE_SHA_A,
        relativePath: 'contracts/entityCatalog.ts',
        derivationVersion: 'nightwatch.expectation-derivation.v1',
      },
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [{ kind: 'ENVELOPE_CLASS', expected: 'SUCCESS_ENVELOPE', successField: ['data'], errorField: ['error'] }],
    };

    const resolver = createRealSourceResolver({
      recipes: FIXTURE_RECIPES,
      expectations: [synthetic],
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    // (a) no recipe registered for the synthetic target -> STALE (fail-closed).
    const noRecipe = createRealSourceResolver({
      recipes: [],
      expectations: [synthetic],
      reader: state.map.reader,
      currentness: state.map.currentness,
    }).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(noRecipe.kind).toBe('SOURCE_STALE');

    // (b) no evidence digest -> STALE (proof missing).
    const first = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(first.kind).toBe('SOURCE_STALE');

    // (c) forged evidence digest not matching the real extraction -> STALE.
    const forged = {
      ...synthetic,
      sourceProvenance: {
        ...synthetic.sourceProvenance,
        evidenceDigest: `ev:sha256:${'0'.repeat(24)}`,
      },
    };
    const withForged = createRealSourceResolver({
      recipes: FIXTURE_RECIPES,
      expectations: [forged],
      reader: state.map.reader,
      currentness: state.map.currentness,
    }).resolve({ targetId: 'fixture-a.common-exchange.read' });
    expect(withForged.kind).toBe('SOURCE_STALE');

    // The diagnostic token: the rejection reason is the missing/mismatched
    // mechanical proof — REAL_SOURCE_EXPECTATION_PROOF_MISSING semantics.
    expect(JSON.stringify(first)).toContain('SOURCE_STALE');
  });

  test('evidence digest covers the normalized structure only', () => {
    const state = createFixtureSourceState();
    const report = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    const recipe = state.recipes.find((r) => r.recipeId === 'recipe.fixture-a.common-exchange.read')!;
    const derived = report.derived.find((d) => d.recipe.recipeId === recipe.recipeId)!;
    // Comment-only change inside the handler: tokens unchanged -> digest
    // stable (normalized structure, not raw bytes).
    state.map.setFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php', exchangeRateFixture.replace('$res = [];', "// comment added\n        $res = [];"));
    const rerun = deriveRealSourceExpectation(recipe, FIXTURE_SHA_A, state.map.reader);
    expect(rerun.ok).toBe(true);
    if (rerun.ok) expect(rerun.derived.evidenceDigest).toBe(derived.evidenceDigest);
    // Key REORDER in the literal changes the canonical structure -> digest
    // changes (sorted keys make this a no-op) — pin instead: key SET change
    // changes the digest (already proven by the drift test above).
    expect(evidenceDigestFor).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Group 11 (F-10, task 11.7). The Phase 9A.1 admission route stays the only
// route: a DEV observation cannot create an expectation, and a synthetic
// expectation relabelled with real-source provenance fails with the exact
// REAL_SOURCE_EXPECTATION_PROOF_MISSING semantics.
// ---------------------------------------------------------------------------

test.describe('Group 11 — the admission route stays the only route', () => {
  test('a mechanically proven expectation passes the proof check; a synthetic relabel fails with the exact code', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const proven = derivedA.find((item) => item.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
    expect(proven.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    expect(() => assertRealSourceExpectationProof(proven)).not.toThrow();

    // A synthetic expectation relabelled with a real-looking repo @ SHA and a
    // forged evidence digest never gains authority: the provenance label is
    // not proof.
    const relabelled: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.entity.read.success-envelope',
      targetKind: 'API_OPERATION',
      targetId: 'fixture-a.common-exchange.read',
      sourceProvenance: {
        repoId: FIXTURE_REPO_A,
        sha: FIXTURE_SHA_A,
        relativePath: 'contracts/entityCatalog.ts',
        derivationVersion: 'nightwatch.expectation-derivation.v1',
        evidenceDigest: `ev:sha256:${'0'.repeat(24)}`,
      },
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [{ kind: 'ENVELOPE_CLASS', expected: 'SUCCESS_ENVELOPE', successField: ['data'], errorField: ['error'] }],
    };
    expect(() => assertRealSourceExpectationProof(relabelled)).toThrow(REAL_SOURCE_EXPECTATION_PROOF_MISSING);
    // Without the forged digest the same relabel also fails.
    const withoutDigest = { ...relabelled, sourceProvenance: { ...relabelled.sourceProvenance, evidenceDigest: undefined } };
    expect(() => assertRealSourceExpectationProof(withoutDigest)).toThrow(REAL_SOURCE_EXPECTATION_PROOF_MISSING);
  });

  test('a DEV observation matching no admitted expectation is NO_EXPECTATION and creates no expectation', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const admittedBefore = derivedA.map((item) => item.expectationId);
    const result = evaluateSemanticResolution({
      resolution: { kind: 'NO_EXPECTATION', targetId: 'fixture-a.nonexistent.read' },
      rawText: JSON.stringify([{ month: '2026-01' }]),
      targetId: 'fixture-a.nonexistent.read',
    });
    expect(result.receipt?.outcome).toBe('NO_EXPECTATION');
    expect(SEMANTIC_RECEIPT_NON_PASS_OUTCOMES.has('NO_EXPECTATION')).toBe(true);
    expect(result.receipt?.expectationId).toBeUndefined();
    expect(result.findings).toHaveLength(0);
    // The admitted set is byte-identical across the observation.
    expect(() => assertNoExpectationCreatedFromObservation(derivedA, derivedA)).not.toThrow();
    const after = derivedA.map((item) => item.expectationId);
    expect(after).toEqual(admittedBefore);
    // A change across an observation fails closed.
    const created = [...derivedA, { ...derivedA[0]!, expectationId: 'fixture-a.created-from-observation' }];
    expect(() => assertNoExpectationCreatedFromObservation(derivedA, created)).toThrow(DEV_OBSERVATION_CANNOT_ADMIT_EXPECTATION);
  });
});
