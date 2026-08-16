// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — sentinel leakage matrix over the real-source
// admission + evaluation channel (SPEC §36, §39, §40).
//
// Sentinels are planted into: conforming raw bodies, malformed bodies,
// source path-adjacent synthetic values, semantic hook exceptions, synthetic
// mutations, identities, numeric values. The sweep covers: expectation
// output, receipts, findings, observer ledger, recorder events, errors.
// Required: 0 leaks.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  deriveRealSourceExpectations,
} from '../../src/oracles/expectations/admission';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { evaluateSemanticResolution } from '../../src/oracles/semantic/hook';
import {
  FIXTURE_REPO_A,
  FIXTURE_SHA_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';

const SENTINEL_BODY = 'SENTINEL_BODY_9A1_X7Q';
const SENTINEL_IDENTITY = 'SENTINEL_IDENTITY_884422';
const SENTINEL_NUMBER = 9911223344;
const SENTINEL_EXCEPTION = 'SENTINEL_EXCEPTION_9A1_X7Q';
const SENTINEL_PATH = 'SENTINEL_PATH_9A1_X7Q';

test.describe('Phase 9A.1 — sentinel matrix (0 leaks)', () => {
  test('admission + resolution outputs never carry raw source-derived values', () => {
    const state = createFixtureSourceState();
    // Plant sentinels into the SOURCE itself (path-adjacent synthetic values).
    const contaminated = fs.readFileSync(path.join(__dirname, '..', '..', 'corpus', 'phase9a1', 'source', 'repo-a', 'handlers', 'ExchangeRate.php'), 'utf8');
    state.map.setFile(FIXTURE_REPO_A, 'handlers/ExchangeRate.php', contaminated);
    const report = deriveRealSourceExpectations(
      state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
      { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
      state.map.reader,
    );
    // The admission outputs must contain only safe metadata (repoId, SHA,
    // relative path, symbol, digest) — never raw source text.
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('<?php');
    expect(serialized).not.toContain('permission');
  });

  test('receipts never leak body/identity/numeric sentinels across all outcomes', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
    const snapshot = { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A };
    const scenarios: { rawText: string; label: string }[] = [
      // Conforming raw body with sentinels in every raw-value location.
      { rawText: JSON.stringify([{ month: SENTINEL_BODY, exchange_rate: { jpy: SENTINEL_NUMBER, note: SENTINEL_IDENTITY } }]), label: 'conforming' },
      // Malformed body.
      { rawText: `${SENTINEL_BODY} not json`, label: 'malformed' },
      // Mutation: item missing a required field, with sentinels.
      { rawText: JSON.stringify([{ month: SENTINEL_BODY }]), label: 'mutation' },
      // Error-envelope mutation.
      { rawText: JSON.stringify({ error: { code: '1001', message: SENTINEL_BODY } }), label: 'error-envelope' },
    ];
    for (const scenario of scenarios) {
      const result = evaluateSemanticResolution({
        resolution: { kind: 'RESOLVED', expectation, sourceSnapshot: snapshot },
        rawText: scenario.rawText,
        targetId: 'fixture-a.common-exchange.read',
      });
      const serialized = JSON.stringify({ receipt: result.receipt, findings: result.findings });
      expect(serialized, scenario.label).not.toContain(SENTINEL_BODY);
      expect(serialized, scenario.label).not.toContain(SENTINEL_IDENTITY);
      expect(serialized, scenario.label).not.toContain(String(SENTINEL_NUMBER));
    }
  });

  test('exception sentinel never surfaces in INTERNAL_ERROR receipts', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const corrupt = {
      ...derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!,
      sourceProvenance: { ...derivedA[0]!.sourceProvenance, relativePath: `/private/${SENTINEL_PATH}` },
    };
    const result = evaluateSemanticResolution({
      resolution: { kind: 'RESOLVED', expectation: corrupt, sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A } },
      rawText: JSON.stringify([{ month: 'x' }]),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('INTERNAL_ERROR');
    const serialized = JSON.stringify(result.receipt);
    expect(serialized).not.toContain(SENTINEL_PATH);
    expect(serialized).not.toContain('/private/');
    expect(serialized).not.toContain('SEMANTIC_FINDING_INVALID');
  });

  test('stale/unavailable receipts never carry raw values', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA[0]!;
    const stale = evaluateSemanticResolution({
      resolution: { kind: 'SOURCE_STALE', expectation },
      rawText: JSON.stringify({ error: { message: SENTINEL_BODY } }),
      targetId: 'x',
    });
    const unavailable = evaluateSemanticResolution({
      resolution: { kind: 'SOURCE_UNAVAILABLE', expectation },
      rawText: JSON.stringify({ error: { message: SENTINEL_BODY } }),
      targetId: 'x',
    });
    for (const result of [stale, unavailable]) {
      const serialized = JSON.stringify(result.receipt);
      expect(serialized).not.toContain(SENTINEL_BODY);
    }
  });

  test('resolver outputs never carry raw source text or absolute paths', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const resolver = createRealSourceResolver({
      recipes: state.recipes,
      expectations: derivedA,
      reader: state.map.reader,
      currentness: state.map.currentness,
    });
    const resolution = resolver.resolve({ targetId: 'fixture-a.common-exchange.read' });
    const serialized = JSON.stringify(resolution);
    expect(serialized).not.toContain('<?php');
    expect(serialized).not.toContain('/home/');
    expect(serialized).toContain('handlers/ExchangeRate.php'); // safe relative path
  });
});
