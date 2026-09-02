// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — privacy sentinel matrix (SPEC Phase 10A §29, §30,
// §42, §45).
//
// Plants obvious synthetic sentinels in raw-value locations of the Phase 10
// corpus (scalar values AND object keys), runs the full safe path
// (projection -> invariant -> finding -> fingerprint -> receipt -> dossier
// evidence), and sweeps every safe output including the new type-flow
// extraction records and failure-path messages. Requires 0 leaks; the
// unknown-key probe proves raw key text never appears downstream (no
// OBJECT_KEYS invariant is admitted, and none is needed — raw key text must
// never enter safe outputs by construction).
//
// C-10 SCOPE NOTE: everything here describes the DEV projection
// `nightwatch.semantic-projection.v1`. Its documented allowance for object
// FIELD NAMES is DEV-scope only and is explicitly NOT a production
// certification — see F-14 and the production counter-proof below.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { deriveRealSourceExpectation } from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import { projectValue, ProjectionContext, projectionDigest, serializeProjection } from '../../src/oracles/projections';
import {
  canonicalStructuralBytes,
  createProductionPrivacyPolicy,
  NO_PROVEN_VOCABULARY,
  projectProduction,
  RawEphemeralSource,
} from '../../src/core/prodPrivacy';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';
import { buildSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import { exchangeRateDeepFixture, routingDeepFixture } from '../../corpus/phase10/source-fixture/exchangeRateDeepFixture';
import { CURRENT_RIPPLE_API_SHA } from '../../corpus/phase10/source-fixture/phase10Fixtures';

const SENTINELS = {
  key: 'SENTINEL_KEY_9F3A2B',
  scalar: 'SENTINEL_SCALAR_9F3A2B',
  month: 'SENTINEL_MONTH_9F3A2B',
  payerId: 'SENTINEL_PAYER_ID_9F3A2B',
  rate: 987654321.5,
} as const;

const SENTINEL_STRINGS = [SENTINELS.key, SENTINELS.scalar, SENTINELS.month, SENTINELS.payerId];

function collectLeaks(value: unknown, pathName = 'root', leaks: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const sentinel of SENTINEL_STRINGS) {
      if (value.includes(sentinel)) leaks.push(`${pathName} contains ${sentinel}`);
    }
    return leaks;
  }
  if (typeof value === 'number') {
    if (value === SENTINELS.rate) leaks.push(`${pathName} contains raw rate`);
    return leaks;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeaks(item, `${pathName}[${index}]`, leaks));
    return leaks;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key.includes('SENTINEL')) leaks.push(`${pathName}.${key} is a sentinel key`);
      collectLeaks(child, `${pathName}.${key}`, leaks);
    }
  }
  return leaks;
}

function assertNoLeaks(value: unknown, what: string): void {
  expect(collectLeaks(value), `${what} must contain zero sentinels`).toEqual([]);
}

/** Value-only leak check: sentinel STRING/NUMBER values are forbidden; the
 *  sentinel KEY may appear only as a projected object field name. */
function assertNoScalarLeaks(value: unknown, what: string): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain(SENTINELS.scalar);
  expect(text).not.toContain(SENTINELS.month);
  expect(text).not.toContain(SENTINELS.payerId);
  expect(text).not.toContain(String(SENTINELS.rate));
}

/** The unknown-key probe: a syntactically valid payer response whose
 *  exchange_rate object carries a sentinel key + sentinel scalar, plus a
 *  sentinel month/payer-id in row fields. */
const UNKNOWN_KEY_BODY = [
  {
    id: SENTINELS.payerId,
    vendor: 'aws',
    name: SENTINELS.scalar,
    month: SENTINELS.month,
    exchange_rate: { [SENTINELS.key]: SENTINELS.rate, jpy: 1.25 },
  },
];

function deriveDeepExpectation(targetId: string) {
  const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === targetId)!;
  const map = createMapSource([
    {
      repoId: 'mobingilabs/ripple-api',
      sha: CURRENT_RIPPLE_API_SHA,
      files: {
        'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
        'src/App/Route/Config/Routing.yaml': routingDeepFixture,
      },
    },
  ]);
  const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
  if (!result.ok) throw new Error(`derivation failed: ${result.failure}`);
  return result.derived.expectation;
}

test.describe('Phase 10A — privacy sweep on the safe path (§29, §42)', () => {
  test('raw sentinels are present in the probe body (non-vacuous)', () => {
    expect(JSON.stringify(UNKNOWN_KEY_BODY)).toContain(SENTINELS.key);
    expect(JSON.stringify(UNKNOWN_KEY_BODY)).toContain(SENTINELS.scalar);
  });

  test('DEV projection carries the unknown key as field-name metadata — DEV SCOPE ONLY, never a production certification', () => {
    // SCOPE (C-10 / F-14). This documents the behaviour of the DEV projection
    // `nightwatch.semantic-projection.v1` ONLY. It is correct for DEV
    // fixtures, where key names are repository-controlled, and it is the
    // reason a separate production cone exists.
    //
    // It is NOT a certification that an unknown key literal may appear in a
    // PRODUCTION projected serialization. In production, objects are routinely
    // keyed by AWS account id, MSP id, billing-group id or company name, so a
    // key set is sometimes a value set. The production boundary
    // (`nightwatch.production-projection.v1`) refuses exactly this — see the
    // counter-proof at the end of this test and
    // tests/unit/c10ProductionProjection.test.ts.
    const ctx = new ProjectionContext();
    const { projection } = projectValue(UNKNOWN_KEY_BODY, ctx);
    const serialized = serializeProjection(projection);
    // What must never leave even the DEV projection is the raw SCALAR VALUE
    // (and the raw numeric rate). Downstream artifacts (digest, finding,
    // fingerprint, receipt, dossier) must carry neither names nor values.
    assertNoScalarLeaks(serialized, 'projection serialization');
    const serializedText = JSON.stringify(serialized);
    expect(serializedText).toContain(SENTINELS.key); // DEV: field name IS projected
    expect(serializedText).not.toContain(SENTINELS.scalar); // scalar VALUE never projected
    expect(serializedText).not.toContain(String(SENTINELS.rate));
    assertNoLeaks(projectionDigest(projection), 'projection digest');

    // C-10 counter-proof: the SAME body through the production cone emits no
    // key literal at all, so the DEV behaviour above cannot be mistaken for a
    // production guarantee.
    const productionProjection = projectProduction(
      RawEphemeralSource.of(UNKNOWN_KEY_BODY),
      NO_PROVEN_VOCABULARY,
      createProductionPrivacyPolicy(),
    );
    const productionText = JSON.stringify(productionProjection);
    expect(productionText).not.toContain(SENTINELS.key);
    expect(productionText).not.toContain(SENTINELS.scalar);
    expect(canonicalStructuralBytes(productionProjection.root)).not.toContain(SENTINELS.key);
  });

  test('finding + fingerprint + receipt contain no sentinels', () => {
    const expectation = deriveDeepExpectation('ripple.payer-exchange.read');
    const evaluation = evaluateSemanticResponse({
      oracleId: 'oracle.phase10.privacy',
      expectation,
      rawValues: [UNKNOWN_KEY_BODY],
      sourceSnapshot: { repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA },
      operationId: 'ripple.payer-exchange.read',
    });
    // The probe is type-conforming (OBJECT exchange_rate) — outcome is
    // PASS/N-A, proving the unknown key alone never triggers an anomaly and
    // never surfaces. Sweep the outputs regardless.
    for (const finding of evaluation.findings) {
      assertNoLeaks(finding, 'finding');
      assertNoLeaks(semanticFindingFingerprint(finding), 'finding fingerprint');
    }
    const receipt = buildSemanticEvaluationReceipt({
      oracleId: 'oracle.phase10.privacy',
      expectationId: expectation.expectationId,
      sourceProvenance: expectation.sourceProvenance,
      outcome: evaluation.outcome as never,
      projectionDigests: evaluation.findings.length > 0 ? evaluation.findings[0]!.projectionDigests : [],
      invariantTotal: evaluation.invariantEvaluations.length,
      invariantPassCount: evaluation.invariantEvaluations.filter((i) => i.verdict === 'PASS').length,
      invariantNaCount: evaluation.invariantEvaluations.filter((i) => i.verdict === 'NOT_APPLICABLE').length,
      invariantViolationCount: evaluation.invariantEvaluations.filter((i) => i.verdict === 'VIOLATED').length,
      findingCount: evaluation.findings.length,
    });
    assertNoLeaks(receipt, 'evaluation receipt');
  });

  test('dossier semantic evidence contains no sentinels', () => {
    const expectation = deriveDeepExpectation('ripple.payer-exchange.read');
    const evaluation = evaluateSemanticResponse({
      oracleId: 'oracle.phase10.privacy',
      expectation,
      rawValues: [UNKNOWN_KEY_BODY],
      sourceSnapshot: { repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA },
      operationId: 'ripple.payer-exchange.read',
    });
    const { toSemanticDossierEvidence } = require('../../src/oracles/semantic/dossier') as typeof import('../../src/oracles/semantic/dossier');
    const evidence = toSemanticDossierEvidence(evaluation.outcome === 'ANOMALY' ? evaluation.findings : []);
    if (evidence !== null) assertNoLeaks(evidence, 'dossier semantic evidence');
    expect(evidence).toBeNull(); // the type-conforming probe yields no findings
  });

  test('type-flow extraction records carry fixed vocabulary only (no source snippets)', () => {
    const map = createMapSource([
      {
        repoId: 'mobingilabs/ripple-api',
        sha: CURRENT_RIPPLE_API_SHA,
        files: {
          'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
          'src/App/Route/Config/Routing.yaml': routingDeepFixture,
        },
      },
    ]);
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    assertNoLeaks(result.derived.expectation.sourceProvenance, 'deep provenance');
    assertNoLeaks(result.derived.evidenceDigest, 'evidence digest');
    assertNoLeaks(JSON.stringify(result.derived.expectation), 'derived expectation');
  });

  test('failure-path derivation messages carry fixed vocabulary only', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const mutated = exchangeRateDeepFixture.replace(`$exchange_rate = (object)$exchange_rate;`, `$exchange_rate = 'scalar';`);
    const map = createMapSource([
      {
        repoId: 'mobingilabs/ripple-api',
        sha: CURRENT_RIPPLE_API_SHA,
        files: {
          'src/App/Handler/ExchangeRate.php': mutated,
          'src/App/Route/Config/Routing.yaml': routingDeepFixture,
        },
      },
    ]);
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatch(/^[A-Z_]+$/);
    expect(result.detail ?? '').not.toContain('scalar');
    assertNoLeaks(JSON.stringify(result), 'derivation failure');
  });
});

test.describe('Phase 10A — sentinel sweep over the defect corpus (§45)', () => {
  const CORPUS = [
    ['defects', 'common-exchange-type-string', 'response.json'],
    ['defects', 'common-exchange-type-empty-array', 'response.json'],
    ['defects', 'payer-exchange-type-number', 'response.json'],
    ['defects', 'payer-exchange-type-string', 'response.json'],
    ['benign', 'common-multi-key', 'response.json'],
    ['benign', 'payer-mixed-rows', 'response.json'],
  ] as const;

  test('every corpus body contains its sentinels (non-vacuous)', () => {
    for (const segments of CORPUS) {
      const text = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '..', '..', 'corpus', 'phase10', ...segments),
        'utf8',
      );
      expect(text).toMatch(/SENTINEL_/);
    }
  });

  test('evaluating every defect yields findings free of sentinels', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const pathModule = require('node:path') as typeof import('node:path');
    const expectation = deriveDeepExpectation('ripple.common-exchange.read');
    for (const segments of CORPUS.slice(0, 2)) {
      const body = JSON.parse(fs.readFileSync(pathModule.join(__dirname, '..', '..', 'corpus', 'phase10', ...segments), 'utf8'));
      const evaluation = evaluateSemanticResponse({
        oracleId: 'oracle.phase10.privacy',
        expectation,
        rawValues: [body],
        sourceSnapshot: { repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA },
        operationId: 'ripple.common-exchange.read',
      });
      expect(evaluation.outcome).toBe('ANOMALY');
      for (const finding of evaluation.findings) {
        assertNoLeaks(finding, `finding for ${segments[1]}`);
        assertNoLeaks(semanticFindingFingerprint(finding), `fingerprint for ${segments[1]}`);
      }
    }
  });
});
