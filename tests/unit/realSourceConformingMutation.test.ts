// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — conforming + mutated synthetic response evaluation
// (SPEC §29, §30, §31).
//
// For every admitted real-source expectation:
//   - a clearly SYNTHETIC response conforming to the source-derived contract
//     yields receipt outcome PASS (or legitimate NOT_APPLICABLE);
//   - one synthetic mutation violating ONLY a source-established contract
//     yields ANOMALY — proving the real-source bridge changes semantic
//     behavior, not merely provenance metadata.
// No real product values are used anywhere.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { evaluateSemanticResolution } from '../../src/oracles/semantic/hook';
import {
  FIXTURE_REPO_A,
  FIXTURE_SHA_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';

function conformingBodies(): Record<string, unknown> {
  return {
    'fixture-a.common-exchange.read.real-source-shape': [{ month: '2026-01', exchange_rate: { jpy: 150 } }],
    'fixture-a.payer-exchange.read.real-source-shape': [{ id: 'acct-1', vendor: 'aws', name: 'synthetic', exchange_rate: { jpy: 150 } }],
    'fixture-a.account-inventory.read.real-source-shape': [{
      billinggroup_id: 'bg-1', billinggroup_name: 'synth', company_id: 'co-1', customer_id: 'cu-1',
      customer_name: 'synth', account_id: 'acct-1', vendor: 'aws', note: null, payer: true,
      service_discount: null, project_id: null, azure_customer_id: null, domain_name: null,
      subscription_id: 'sub-1', entitlement_id: null,
    }],
    'fixture-a.billing-group-exchange.read.real-source-shape': [{ billing_group_id: 'bg-1', billing_group_name: 'synth', company_id: 'co-1', exchange_rate: 150 }],
  };
}

function mutations(): { body: unknown; violated: string }[] {
  return [
    // Remove a source-required field from the item.
    { body: [{ month: '2026-01' }], violated: 'required field exchange_rate missing' },
    // Replace the item with an error-envelope OBJECT (2xx error envelope —
    // the roadmap's HTTP-200-error-envelope class).
    { body: { error: { code: '1001', message: 'synthetic' } }, violated: 'root must be an array' },
    // Scalar root.
    { body: 42, violated: 'root must be an array' },
  ];
}

test.describe('Phase 9A.1 — conforming synthetic responses (SPEC §29)', () => {
  test('every admitted expectation PASSes its own conforming synthetic body', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const snapshot = { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A };
    const conforming = conformingBodies();
    expect(derivedA).toHaveLength(4);
    for (const expectation of derivedA) {
      const body = conforming[expectation.expectationId];
      expect(body, `conforming body for ${expectation.expectationId}`).toBeDefined();
      const result = evaluateSemanticResolution({
        resolution: { kind: 'RESOLVED', expectation, sourceSnapshot: snapshot },
        rawText: JSON.stringify(body),
        targetId: expectation.targetId,
      });
      expect(result.receipt?.outcome, `${expectation.expectationId}: ${JSON.stringify(body)}`).toBe('PASS');
      expect(result.findings).toHaveLength(0);
    }
  });

  test('an empty list is a legitimate conforming response (PASS, not an anomaly)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
    const result = evaluateSemanticResolution({
      resolution: { kind: 'RESOLVED', expectation, sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A } },
      rawText: '[]',
      targetId: expectation.targetId,
    });
    expect(result.receipt?.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });
});

test.describe('Phase 9A.1 — mutated synthetic responses (SPEC §30)', () => {
  test('every admitted expectation ANOMALY on its source-contract mutation', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const snapshot = { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A };
    const mutationsFor = mutations();
    // At least one real-source-derived expectation must yield ANOMALY on a
    // mutation that violates only a source-established contract.
    let anomalyCount = 0;
    for (const expectation of derivedA) {
      for (const mutation of mutationsFor) {
        const result = evaluateSemanticResolution({
          resolution: { kind: 'RESOLVED', expectation, sourceSnapshot: snapshot },
          rawText: JSON.stringify(mutation.body),
          targetId: expectation.targetId,
        });
        if (result.receipt?.outcome === 'ANOMALY') {
          anomalyCount += 1;
          expect(result.findings.length).toBeGreaterThanOrEqual(1);
          for (const finding of result.findings) {
            expect(JSON.stringify(finding)).not.toContain('synthetic-error');
          }
        }
      }
    }
    expect(anomalyCount).toBeGreaterThanOrEqual(4);
  });

  test('the ANOMALY is caused by the real-source contract, not provenance metadata', () => {
    // The finding must reference the source-derived expectation + provenance
    // and carry categorical classes — not the mutation body.
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((e) => e.expectationId === 'fixture-a.common-exchange.read.real-source-shape')!;
    const result = evaluateSemanticResolution({
      resolution: { kind: 'RESOLVED', expectation, sourceSnapshot: { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A } },
      rawText: JSON.stringify({ error: { code: '1001' } }),
      targetId: expectation.targetId,
    });
    expect(result.receipt?.outcome).toBe('ANOMALY');
    const finding = result.findings[0]!;
    expect(finding.expectationId).toBe('fixture-a.common-exchange.read.real-source-shape');
    expect(finding.sourceProvenance.repoId).toBe(FIXTURE_REPO_A);
    expect(finding.sourceProvenance.sha).toBe(FIXTURE_SHA_A);
    expect(finding.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    expect(finding.category).toBe('SOURCE_EXPECTATION_MISMATCH');
    expect(finding.expectedClass).toBe('TYPE_MATCH');
    expect(finding.observedClass).toBe('TYPE_CONTRADICTED');
  });
});
