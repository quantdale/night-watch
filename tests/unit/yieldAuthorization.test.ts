// R5-15 / review-5 task B4.1 — the record of the single authorized paid run: strict closed-schema
// parse, the committed default (NOT_GRANTED), and the evaluator's refusal without a GRANTED record.

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { buildProductRunReceipt, evaluateYieldCampaignEvidence, parseYieldRunAuthorization } from '../../src/core/agentRuntime/productRunReceipt';

const ROOT = path.join(__dirname, '..', '..');
const DIGEST = `sha256:${'b'.repeat(24)}`;
const granted = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 'nightwatch.yield-run-authorization.v1',
  grantId: 'parent-12.3',
  state: 'GRANTED',
  maxQualifyingRuns: 1,
  declared: { printCliDigest: DIGEST, provider: 'test-provider', model: 'test-model' },
  ...overrides,
});

test.describe('parseYieldRunAuthorization', () => {
  test('the committed default is a valid NOT_GRANTED record with no declared identity', () => {
    const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'yield-run-authorization.v1.json'), 'utf8')) as unknown;
    const parsed = parseYieldRunAuthorization(committed);
    expect(parsed.errors).toEqual([]);
    expect(parsed.authorization).toMatchObject({ grantId: 'parent-12.3', state: 'NOT_GRANTED', maxQualifyingRuns: 1, declared: { printCliDigest: null, provider: null, model: null } });
  });

  test('a GRANTED record needs the full declared identity; a NOT_GRANTED record must declare none', () => {
    expect(parseYieldRunAuthorization(granted()).ok).toBe(true);
    for (const missing of ['printCliDigest', 'provider', 'model']) {
      const declared = { printCliDigest: DIGEST, provider: 'test-provider', model: 'test-model', [missing]: null };
      expect(parseYieldRunAuthorization(granted({ declared })).errors, missing).toContain('YIELD_AUTH_GRANTED_WITHOUT_FULL_IDENTITY');
    }
    expect(parseYieldRunAuthorization(granted({ state: 'NOT_GRANTED' })).errors).toContain('YIELD_AUTH_NOT_GRANTED_WITH_IDENTITY');
  });

  test('unknown keys, a bad schema, grant id, budget, digest and labels are all refused', () => {
    const errors = (value: unknown) => parseYieldRunAuthorization(value).errors.join('|');
    expect(errors(null)).toContain('YIELD_AUTH_NOT_AN_OBJECT');
    expect(errors(granted({ extra: 1 }))).toContain('YIELD_AUTH_UNKNOWN_KEY:extra');
    expect(errors(granted({ schemaVersion: 'x' }))).toContain('YIELD_AUTH_SCHEMA_MISMATCH');
    expect(errors(granted({ grantId: 'Has Space' }))).toContain('YIELD_AUTH_GRANT_ID_INVALID');
    expect(errors(granted({ state: 'MAYBE' }))).toContain('YIELD_AUTH_STATE_INVALID');
    expect(errors(granted({ maxQualifyingRuns: 0 }))).toContain('YIELD_AUTH_BUDGET_INVALID');
    expect(errors(granted({ maxQualifyingRuns: 9 }))).toContain('YIELD_AUTH_BUDGET_INVALID');
    expect(errors(granted({ declared: { printCliDigest: 'not-a-digest', provider: 'p', model: 'm' } }))).toContain('YIELD_AUTH_DECLARED_DIGEST_INVALID');
    expect(errors(granted({ declared: { printCliDigest: DIGEST, provider: 'has space', model: 'm' } }))).toContain('YIELD_AUTH_DECLARED_PROVIDER_INVALID');
    expect(errors(granted({ declared: { printCliDigest: DIGEST, provider: 'p', model: '/home/someone/model' + 'x'.repeat(130) } }))).toContain('YIELD_AUTH_DECLARED_MODEL_INVALID');
    expect(errors(granted({ declared: { printCliDigest: DIGEST, provider: 'p', model: 'm', extra: 1 } }))).toContain('YIELD_AUTH_DECLARED_UNKNOWN_KEY:extra');
    expect(errors(granted({ declared: 'nope' }))).toContain('YIELD_AUTH_DECLARED_INVALID');
  });
});

test.describe('the evaluator and the authorization', () => {
  const S = 'a'.repeat(40);
  const sibling = { repository: 'mobingilabs/ouchan', headSha: '1'.repeat(40), statusDigest: 'sha256:aa', diffDigest: 'sha256:bb' };
  const run = () => {
    const receipt = buildProductRunReceipt({
      campaignId: 'synthetic-yield',
      generatedAt: '2026-10-03T00:00:00.000Z',
      result: {
        terminationReason: 'COMPLETE_NO_FINDING',
        terminationCounts: { COMPLETE_NO_FINDING: 1 },
        providerAttribution: { terminationClass: 'VALID_PROVIDER_RUN', totalCalls: 3, completedCalls: 3, failures: 0, byClass: {} } as never,
        persistedFindings: [],
        reproductionCount: 2,
        toolActionCount: 5,
      },
      before: [sibling] as never,
      after: [sibling] as never,
      leakScan: { result: 'CLEAN', findings: 0, scannedChars: 10 },
      nightwatchIdentity: { sha: S, treeClean: true },
      campaignKind: 'PRINT_CLI_PROVIDER' as never,
      reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: `rid:sha256:${'a'.repeat(24)}`, printCliDigest: DIGEST, provider: 'test-provider', model: 'test-model' } as never,
    });
    return { manifest: { runId: 'run-1', product: 'campaign', nightwatchSha: S }, summary: { passed: true }, receipt };
  };

  test('a null or NOT_GRANTED record refuses every run; the matching GRANTED record accepts it', () => {
    expect(evaluateYieldCampaignEvidence(run(), S, null).errors).toContain('YIELD_RECEIPT_RUN_NOT_AUTHORIZED');
    const notGranted = parseYieldRunAuthorization({ ...granted({ state: 'NOT_GRANTED', declared: { printCliDigest: null, provider: null, model: null } }) }).authorization;
    expect(evaluateYieldCampaignEvidence(run(), S, notGranted).errors).toContain('YIELD_RECEIPT_RUN_NOT_AUTHORIZED');
    const record = parseYieldRunAuthorization(granted()).authorization;
    expect(evaluateYieldCampaignEvidence(run(), S, record)).toMatchObject({ ok: true, relation: 'BOUND' });
  });
});
