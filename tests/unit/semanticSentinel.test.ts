// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — sentinel leakage harness (SPEC §25, §26, §27, §64,
// §65).
//
// Plants obvious synthetic secret/customer sentinels in EVERY raw-value
// location, runs raw input -> projection -> finding -> fingerprint, and
// sweeps all user-visible/persistable safe outputs plus failure-path error
// messages. Requires sentinelLeakCount = 0 and asserts the raw fixture does
// contain the sentinels (non-vacuous).
//
// Derived-shape sweep (SPEC §26): lowercase, uppercase, URL-encoded,
// JSON-escaped, string-prefix previews, last-four account digits, and the
// raw numeric amount are all forbidden in safe outputs by default.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { deriveExpectations, type SemanticExpectation } from '../../src/oracles/expectations';
import { projectValue, ProjectionContext, projectionDigest, serializeProjection } from '../../src/oracles/projections';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';

const SENTINELS = {
  customerName: 'SENTINEL_CUSTOMER_NAME_X7Q',
  account: 'SENTINEL_ACCOUNT_884422',
  email: 'SENTINEL_EMAIL_X7Q@example.invalid',
  amount: 987654321,
  errorMessage: 'SENTINEL_ERROR_MESSAGE_X7Q',
} as const;

const SENTINEL_STRINGS: readonly string[] = [
  SENTINELS.customerName,
  SENTINELS.account,
  SENTINELS.email,
  SENTINELS.errorMessage,
];

/** Derived shapes that would still be value-derived leaks (SPEC §26). */
const DERIVED_FORMS = [
  SENTINELS.customerName.toLowerCase(),
  SENTINELS.customerName.toUpperCase(),
  encodeURIComponent(SENTINELS.customerName),
  JSON.stringify(SENTINELS.customerName).replace(/^"|"$/g, ''),
  SENTINELS.customerName.slice(0, 12),
  SENTINELS.errorMessage.toLowerCase(),
  '884422', // account tail digits
  '4422', // last-four digits of the account sentinel
  String(SENTINELS.amount), // raw numeric amount
  String(SENTINELS.amount).slice(0, 6), // numeric prefix
];

function collectLeaks(value: unknown, pathName = 'root', leaks: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const sentinel of SENTINEL_STRINGS) {
      if (value.includes(sentinel)) leaks.push(`${pathName} contains ${sentinel}`);
    }
    for (const form of DERIVED_FORMS) {
      if (value.includes(form)) leaks.push(`${pathName} contains derived form ${form}`);
    }
    return leaks;
  }
  if (typeof value === 'number') {
    if (value === SENTINELS.amount) leaks.push(`${pathName} contains raw amount`);
    return leaks;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeaks(item, `${pathName}[${index}]`, leaks));
    return leaks;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectLeaks(child, `${pathName}.${key}`, leaks);
    }
  }
  return leaks;
}

function assertNoLeaks(value: unknown, what: string): void {
  const leaks = collectLeaks(value);
  expect(leaks, `${what} must contain zero sentinels`).toEqual([]);
}

function sweepText(text: string, what: string): void {
  const leaks: string[] = [];
  for (const sentinel of SENTINEL_STRINGS) {
    if (text.includes(sentinel)) leaks.push(`${what} contains ${sentinel}`);
  }
  for (const form of DERIVED_FORMS) {
    if (text.includes(form)) leaks.push(`${what} contains derived form ${form}`);
  }
  expect(leaks, `${what} must be sentinel-free`).toEqual([]);
}

const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PROVENANCE = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function loadExpectation(expectationId: string): SemanticExpectation {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const sourceText = fs.readFileSync(path.join(__dirname, '..', '..', 'corpus', 'phase9', 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
  const expectation = expectations.find((item) => item.expectationId === expectationId);
  if (expectation === undefined) throw new Error(`expectation not found: ${expectationId}`);
  return expectation;
}

const ENVELOPE_EXPECTATION = loadExpectation('fixture.entity.read.success-envelope');
const LIST_DETAIL_EXPECTATION = loadExpectation('fixture.entity.list-detail.identity-consistency');

/** Raw observation with sentinels in every value location (SPEC §64). */
const RAW_OBSERVATION = {
  id: SENTINELS.account,
  name: SENTINELS.customerName,
  email: SENTINELS.email,
  amount: SENTINELS.amount,
  error: { code: 'synthetic-error', message: SENTINELS.errorMessage },
  nested: [
    { url: `https://synthetic.invalid/u/${SENTINELS.account}` },
    { escaped: SENTINELS.customerName.replace(/T/g, '\\u0054') },
  ],
  flag: true,
  nothing: null,
};

test.describe('Phase 9 sentinel leakage — raw -> projection', () => {
  test('the raw fixture does contain the sentinels (non-vacuous)', () => {
    expect(JSON.stringify(RAW_OBSERVATION)).toContain(SENTINELS.customerName);
    expect(JSON.stringify(RAW_OBSERVATION)).toContain(SENTINELS.account);
    expect(JSON.stringify(RAW_OBSERVATION)).toContain(SENTINELS.email);
    expect(JSON.stringify(RAW_OBSERVATION)).toContain(SENTINELS.errorMessage);
    expect(JSON.stringify(RAW_OBSERVATION)).toContain(String(SENTINELS.amount));
  });

  test('projection serialization contains zero sentinels and zero derived forms', () => {
    const ctx = new ProjectionContext();
    const { projection } = projectValue(RAW_OBSERVATION, ctx);
    const serialized = serializeProjection(projection);
    sweepText(serialized, 'projection serialization');
    assertNoLeaks(projection, 'projection DTO');
  });

  test('projection digests contain zero sentinels', () => {
    const ctx = new ProjectionContext();
    const { projection } = projectValue(RAW_OBSERVATION, ctx);
    sweepText(projectionDigest(projection), 'projection digest');
  });
});

test.describe('Phase 9 sentinel leakage — oracle findings + fingerprints', () => {
  test('error-envelope findings and fingerprints contain zero sentinels', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: ENVELOPE_EXPECTATION,
      rawValues: [{ error: { code: 'synthetic-error', message: SENTINELS.errorMessage, account: SENTINELS.account, name: SENTINELS.customerName } }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
      journeyId: 'phase9.sentinel.journey',
    });
    expect(result.outcome).toBe('ANOMALY');
    for (const finding of result.findings) {
      assertNoLeaks(finding, 'semantic finding');
      const fingerprint = semanticFindingFingerprint(finding);
      sweepText(fingerprint, 'finding fingerprint');
      expect(fingerprint).toMatch(/^fp:sha256:[0-9a-f]{24}$/);
    }
  });

  test('list/detail findings with sentinel identities contain zero sentinels', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: LIST_DETAIL_EXPECTATION,
      rawValues: [
        { items: [{ id: SENTINELS.account }, { id: 'synthetic-entity-c' }] },
        { id: SENTINELS.email, name: SENTINELS.customerName },
      ],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    });
    expect(result.outcome).toBe('ANOMALY');
    for (const finding of result.findings) {
      assertNoLeaks(finding, 'list/detail finding');
      sweepText(semanticFindingFingerprint(finding), 'list/detail fingerprint');
    }
  });

  test('finding serialization (JSON) contains zero sentinels', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: ENVELOPE_EXPECTATION,
      rawValues: [{ error: { code: 'synthetic-error', message: SENTINELS.errorMessage } }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    });
    expect(result.outcome).toBe('ANOMALY');
    sweepText(JSON.stringify(result.findings), 'finding JSON');
  });
});

test.describe('Phase 9 sentinel leakage — failure paths (SPEC §65)', () => {
  test('projection limit exceeded: error message carries only the bounded classification', () => {
    const deep: Record<string, unknown> = { data: { a: { b: { c: { d: { e: { f: { g: { h: SENTINELS.customerName } } } } } } } } };
    const limits = { ...require('../../src/oracles/projections').DEFAULT_PROJECTION_LIMITS, maxDepth: 3 };
    const ctx = new ProjectionContext(limits);
    let message = '';
    try {
      projectValue(deep, ctx, limits);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('SEMANTIC_PROJECTION_LIMIT_EXCEEDED');
    sweepText(message, 'projection-limit error message');
  });

  test('unsupported input (getter throw): error message never carries the sentinel', () => {
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, 'boom', {
      enumerable: true,
      get() {
        throw new Error(SENTINELS.errorMessage);
      },
    });
    const ctx = new ProjectionContext();
    let message = '';
    try {
      projectValue(hostile, ctx);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('SEMANTIC_PROJECTION_UNSUPPORTED_INPUT');
    sweepText(message, 'unsupported-input error message');
  });

  test('context serialization guard: no sentinel content and no map data', () => {
    const ctx = new ProjectionContext();
    projectValue({ a: SENTINELS.customerName }, ctx);
    let message = '';
    try {
      JSON.stringify(ctx);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('SEMANTIC_PROJECTION_PRIVACY_VIOLATION');
    sweepText(message, 'context serialization error');
  });

  test('stale source: outcome is the classification token only', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: ENVELOPE_EXPECTATION,
      rawValues: [{ error: { code: 'synthetic-error', message: SENTINELS.errorMessage } }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    expect(result.outcome).toBe('EXPECTATION_SOURCE_STALE');
    sweepText(JSON.stringify(result), 'stale-source result');
  });

  test('unavailable source: outcome is the classification token only', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: ENVELOPE_EXPECTATION,
      rawValues: [{ error: { code: 'synthetic-error', message: SENTINELS.errorMessage } }],
      sourceSnapshot: null,
    });
    expect(result.outcome).toBe('EXPECTATION_UNAVAILABLE');
    sweepText(JSON.stringify(result), 'unavailable-source result');
  });

  test('expectation invalid: validator error message does not echo sentinel VALUES', () => {
    const { validateExpectation } = require('../../src/oracles/expectations');
    let message = '';
    try {
      validateExpectation({
        schemaVersion: 'nightwatch.semantic-expectation.v1',
        expectationId: `SENTINEL_${SENTINELS.customerName}`, // malformed id
        targetKind: 'API_OPERATION',
        targetId: SENTINELS.email,
        sourceProvenance: PROVENANCE,
        projectionContract: { limits: {} },
        invariantDefinitions: [],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('SEMANTIC_EXPECTATION_INVALID');
    sweepText(message, 'expectation-invalid error message');
  });

  test('INVALID_INPUT outcome (non-finite numeric) carries no raw values', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const sourceText = fs.readFileSync(path.join(__dirname, '..', '..', 'corpus', 'phase9', 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
    const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
    const sumExpectation = expectations.find((item) => item.expectationId === 'fixture.aggregate.read.line-items-equal-total')!;
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: sumExpectation,
      rawValues: [{ lineItems: [{ amount: SENTINELS.amount }], total: Number.NaN }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    });
    expect(result.outcome).toBe('INVALID_INPUT');
    sweepText(JSON.stringify(result), 'invalid-input result');
  });
});

test.describe('Phase 9 sentinel leakage — absolute path + raw numeric (SPEC §75)', () => {
  test('durable safe outputs never contain private absolute paths', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: ENVELOPE_EXPECTATION,
      rawValues: [{ error: { code: 'synthetic-error', message: SENTINELS.errorMessage } }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('/home/dalepalaca');
    expect(serialized).not.toContain('/tmp/');
    expect(serialized).not.toContain('/private');
    // Relative source path only.
    for (const finding of result.findings) {
      expect(finding.sourceProvenance.relativePath.startsWith('/')).toBe(false);
    }
  });

  test('raw numeric amounts are absent from finding and projection outputs', () => {
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation: loadExpectation('fixture.aggregate.read.line-items-equal-total'),
      rawValues: [{ lineItems: [{ amount: 111 }, { amount: 222 }], total: 987654321 }],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    });
    expect(result.outcome).toBe('ANOMALY');
    const findingText = JSON.stringify(result.findings);
    expect(findingText).not.toContain('987654321');
    expect(findingText).not.toContain('111');
    expect(findingText).not.toContain('222');
    for (const finding of result.findings) {
      expect(Object.keys(finding).some((key) => key.includes('amount'))).toBe(false);
    }
  });
});
