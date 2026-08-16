// ---------------------------------------------------------------------------
// Nightwatch Phase 9 / 9A.1 — integration matrix: Phase 5 semantic stage +
// network observer semantic hook core (SPEC §44, §45, §19-§22).
//
// - `evaluateApiResponseSemantic` composes the existing protocol oracle with
//   the semantic channel; protocol failure short-circuits.
// - `evaluateSemanticHook` / `evaluateSemanticResolution` are the narrowly
//   typed evaluation cores; raw text is transient and never reaches any
//   output; every evaluation yields a safe semantic-evaluation receipt.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateApiResponseSemantic } from '../../src/api/phase5/semantic';
import type { ApiOperation } from '../../src/api/phase5/types';
import { deriveExpectations, type SemanticExpectation, type SourceSnapshot } from '../../src/oracles/expectations';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import {
  evaluateSemanticHook,
  evaluateSemanticResolution,
  type SemanticHookOracle,
} from '../../src/oracles/semantic';
import { validateSemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';

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

function resolved(expectation: SemanticExpectation, snapshot: SourceSnapshot = SNAPSHOT): RealSourceResolution {
  return { kind: 'RESOLVED', expectation, sourceSnapshot: snapshot };
}

test.describe('Phase 9 M12 — Phase 5 composed protocol/semantic evaluation', () => {
  test('protocol PASS + error envelope -> semantic ANOMALY with a safe finding + ANOMALY receipt', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error', message: 'SENTINEL_ERROR_MESSAGE_X7Q' } })),
      resolution: resolved(envelopeExpectation()),
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('ANOMALY');
    expect(result.semantic.findings[0]?.category).toBe('APPLICATION_ERROR_ENVELOPE');
    expect(JSON.stringify(result.semantic.findings)).not.toContain('SENTINEL');
    expect(result.semantic.receipt?.outcome).toBe('ANOMALY');
    expect(result.semantic.receipt?.expectationId).toBe('fixture.entity.read.success-envelope');
    expect(result.semantic.receipt?.findingCount).toBe(1);
    expect(result.semantic.receipt?.invariantViolationCount).toBe(1);
    validateSemanticEvaluationReceipt(result.semantic.receipt!);
  });

  test('protocol PASS + success envelope -> semantic PASS with a PASS receipt', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ data: { id: 'synthetic-entity-a' } })),
      resolution: resolved(envelopeExpectation()),
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('PASS');
    expect(result.semantic.receipt?.outcome).toBe('PASS');
    expect(result.semantic.receipt?.findingCount).toBe(0);
    // PASS is never inferred from findings.length === 0 alone: the receipt
    // exists and its outcome is explicitly PASS.
    expect(result.semantic.receipt).not.toBeNull();
  });

  test('protocol failure short-circuits semantic evaluation', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from('{broken'),
      resolution: resolved(envelopeExpectation()),
    });
    expect(result.protocol.result).toBe('STATUS_CLASS_MISMATCH');
    expect(result.semantic.status).toBe('NOT_EVALUATED');
    expect(result.semantic.notEvaluatedReason).toBe('PROTOCOL_NOT_PASS');
    expect(result.semantic.receipt).toBeNull();
  });

  test('no expectation -> NO_EXPECTATION status + receipt, never an anomaly or PASS', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.unknown.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error' } })),
      resolution: { kind: 'NO_EXPECTATION', targetId: 'ripple.synthetic.unknown.read' },
    });
    expect(result.protocol.result).toBe('ORACLE_PASS');
    expect(result.semantic.status).toBe('NO_EXPECTATION');
    expect(result.semantic.findings).toHaveLength(0);
    expect(result.semantic.receipt?.outcome).toBe('NO_EXPECTATION');
    expect(result.semantic.receipt?.expectationId).toBeUndefined();
  });

  test('stale source snapshot -> EXPECTATION_SOURCE_STALE status + receipt (fail-closed)', () => {
    const result = evaluateApiResponseSemantic({
      operation: syntheticOperation('ripple.synthetic.entity.read'),
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ error: { code: 'synthetic-error' } })),
      resolution: { kind: 'SOURCE_STALE', expectation: envelopeExpectation() },
    });
    expect(result.semantic.status).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.semantic.findings).toHaveLength(0);
    expect(result.semantic.receipt?.outcome).toBe('EXPECTATION_SOURCE_STALE');
  });
});

test.describe('Phase 9 M12 — network observer semantic hook core', () => {
  function oracle(resolution: RealSourceResolution): SemanticHookOracle {
    return { resolve: () => resolution };
  }

  test('complete 2xx JSON body with a defect -> safe finding + ANOMALY receipt; raw text never leaks', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(resolved(envelopeExpectation())),
      rawText: JSON.stringify({ error: { code: 'synthetic-error', message: 'SENTINEL_ERROR_MESSAGE_X7Q', account: 'SENTINEL_ACCOUNT_884422' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
      targetId: 'fixture.entity.read.success-envelope',
      journeyId: 'phase9.synthetic.journey',
      stepId: 'phase9.synthetic.step',
    });
    expect(result.receipt?.outcome).toBe('ANOMALY');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.category).toBe('APPLICATION_ERROR_ENVELOPE');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('SENTINEL');
    expect(serialized).not.toContain('synthetic-error');
    validateSemanticEvaluationReceipt(result.receipt!);
  });

  test('non-2xx responses are never semantically evaluated (receipt null)', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(resolved(envelopeExpectation())),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 400,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.receipt).toBeNull();
    expect(result.findings).toHaveLength(0);
  });

  test('no expectation -> NO_EXPECTATION receipt, never PASS', () => {
    const result = evaluateSemanticHook({
      oracle: oracle({ kind: 'NO_EXPECTATION', targetId: 'ripple.synthetic.unknown.read' }),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.receipt?.outcome).toBe('NO_EXPECTATION');
    expect(result.receipt?.expectationId).toBeUndefined();
    expect(result.findings).toHaveLength(0);
  });

  test('stale source snapshot -> EXPECTATION_SOURCE_STALE receipt (fail-closed)', () => {
    const result = evaluateSemanticHook({
      oracle: oracle({ kind: 'SOURCE_STALE', expectation: envelopeExpectation() }),
      rawText: JSON.stringify({ error: { code: 'synthetic-error' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.receipt?.outcome).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.findings).toHaveLength(0);
  });

  test('unparseable single-value text -> INVALID_INPUT receipt (never PASS)', () => {
    const result = evaluateSemanticHook({
      oracle: oracle(resolved(envelopeExpectation())),
      rawText: 'not json at all',
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
    });
    expect(result.receipt?.outcome).toBe('INVALID_INPUT');
    expect(result.findings).toHaveLength(0);
  });

  test('evaluateSemanticResolution is the shared core (identical to the hook)', () => {
    const resolution: RealSourceResolution = resolved(envelopeExpectation());
    const direct = evaluateSemanticResolution({
      resolution,
      rawText: JSON.stringify({ data: { id: 'synthetic-entity-a' } }),
      targetId: 'fixture.entity.read.success-envelope',
    });
    const viaHook = evaluateSemanticHook({
      oracle: oracle(resolution),
      rawText: JSON.stringify({ data: { id: 'synthetic-entity-a' } }),
      status: 200,
      contentType: 'application/json',
      url: 'https://synthetic.local/entity/read',
      method: 'GET',
      targetId: 'fixture.entity.read.success-envelope',
    });
    expect(direct.receipt?.outcome).toBe('PASS');
    expect(viaHook.receipt?.outcome).toBe('PASS');
    expect(direct.receipt?.receiptId).toBe(viaHook.receipt?.receiptId);
  });
});
