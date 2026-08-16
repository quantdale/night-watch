// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — M12 integration matrix: Phase 5 semantic stage +
// network observer semantic hook (SPEC §44, §45).
//
// - `evaluateApiResponseSemantic` composes the existing protocol oracle with
//   the semantic channel; protocol failure short-circuits.
// - `evaluateSemanticHook` is the narrowly typed observer hook core; raw
//   text is transient and never reaches any output.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateApiResponseSemantic } from '../../src/api/phase5/semantic';
import type { ApiOperation } from '../../src/api/phase5/types';
import { deriveExpectations, type SemanticExpectation, type SourceSnapshot } from '../../src/oracles/expectations';
import { evaluateSemanticHook, type SemanticHookOracle } from '../../src/oracles/semantic';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9');
const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PROVENANCE = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function loadExpectation(expectationId: string): SemanticExpectation {
  const sourceText = fs.readFileSync(path.join(CORPUS_ROOT, 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
  const expectation = expectations.find((item) => item.expectationId === expectationId);
  if (expectation === undefined) throw new Error(`expectation not found: ${expectationId}`);
  return expectation;
}

function syntheticOperation(operationId: string): ApiOperation {
  return {
    operationId,
    product: 'ripple',
    service: 'synthetic',
    sourceRepo: 'corpus/phase9/source-fixture',
    sourceSHA: FIXTURE_SHA,
    frontendCallsites: [],
    httpMethod: 'GET',
    pathTemplate: '/synthetic/read',
    semanticPurpose: 'synthetic phase 9 fixture',
    semanticClass: 'KNOWN_READ',
    authClass: 'NONE_LOCAL_FIXTURE',
    responseShapePolicy: {
      oracleId: `${operationId}.json`,
      expectedContentType: 'application/json',
      shape: 'JSON_OBJECT_OR_ARRAY',
      persistBody: false,
      maxBytes: 2 * 1024 * 1024,
    },
    streamingType: 'SINGLE_JSON',
    requiredHostClass: 'LOCAL_LOOPBACK',
    replayPolicy: 'LOCAL_ONLY',
    sourceProvenance: ['corpus/phase9/source-fixture'],
    journeyLinks: [],
    generationStatus: 'GENERATION_ELIGIBLE',
  };
}

const SNAPSHOT: SourceSnapshot = { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA };

function envelopeExpectation(): SemanticExpectation {
  return loadExpectation('fixture.entity.read.success-envelope');
}

test.describe('Phase 9 M12 — Phase 5 composed protocol/semantic evaluation', () => {
  test('protocol PASS + error envelope -> semantic ANOMALY with a safe finding', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error', message: 'SENTINEL_ERROR_MESSAGE_X7Q' } })),
      expectation: envelopeExpectation(),
      sourceSnapshot: SNAPSHOT,
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('ANOMALY');
    expect(result.semantic.findings[0]?.category).toBe('APPLICATION_ERROR_ENVELOPE');
    expect(JSON.stringify(result.semantic.findings)).not.toContain('SENTINEL');
  });

  test('protocol PASS + success envelope -> semantic PASS', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ data: { id: 'synthetic-entity-a' } })),
      expectation: envelopeExpectation(),
      sourceSnapshot: SNAPSHOT,
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('PASS');
  });

  test('protocol failure short-circuits semantic evaluation', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from('{broken'),
      expectation: envelopeExpectation(),
      sourceSnapshot: SNAPSHOT,
    });
    expect(result.protocol.result).toBe('STATUS_CLASS_MISMATCH');
    expect(result.semantic.status).toBe('NOT_EVALUATED');
    expect(result.semantic.notEvaluatedReason).toBe('PROTOCOL_NOT_PASS');
  });

  test('no expectation -> NOT_EVALUATED (NO_EXPECTATION), never an anomaly', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.unknown.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error' } })),
      expectation: null,
      sourceSnapshot: SNAPSHOT,
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('NOT_EVALUATED');
    expect(result.semantic.notEvaluatedReason).toBe('NO_EXPECTATION');
  });

  test('stale source snapshot -> EXPECTATION_SOURCE_STALE', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error' } })),
      expectation: envelopeExpectation(),
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    expect(result.semantic.status).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.semantic.findings).toHaveLength(0);
  });
});

test.describe('Phase 9 M12 — network observer semantic hook core', () => {
  function oracle(expectation: SemanticExpectation | null, snapshot: SourceSnapshot | null = SNAPSHOT): SemanticHookOracle {
    return {
      expectationFor: () => expectation,
      sourceSnapshot: () => snapshot,
    };
  }

  test('complete 2xx JSON body with a defect -> safe finding; raw text never leaks', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(envelopeExpectation()),
      rawText: JSON.stringify({ error: { code: 'synthetic-error', message: 'SENTINEL_ERROR_MESSAGE_X7Q', account: 'SENTINEL_ACCOUNT_884422' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
      journeyId: 'phase9.synthetic.journey',
      stepId: 'phase9.synthetic.step',
    });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.category).toBe('APPLICATION_ERROR_ENVELOPE');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('SENTINEL');
    expect(serialized).not.toContain('synthetic-error');
  });

  test('non-2xx responses are never semantically evaluated', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(envelopeExpectation()),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 400,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.findings).toHaveLength(0);
  });

  test('no expectation -> no findings', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(null),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.findings).toHaveLength(0);
  });

  test('stale source snapshot -> no findings (fail-closed)', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(envelopeExpectation(), { repoId: PROVENANCE.repoId, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.findings).toHaveLength(0);
  });

  test('unparseable single-value text -> no findings (defensive)', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(envelopeExpectation()),
      rawText: 'not json at all',
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.findings).toHaveLength(0);
  });
});
