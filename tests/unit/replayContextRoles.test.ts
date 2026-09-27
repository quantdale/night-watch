// M6 task 7.3 (NW-AUD-025 interim, C-10) — replay contexts are ROLE-typed:
// the admission key is (role, runId), L1/L2 require a genuinely different role,
// and the phase7 harness receives its role instead of inferring it.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  REPLAY_CONTEXT_ROLES,
  evaluateAnomalyAdmission,
  isReplayContextRole,
  roleTypedContextId,
} from '../../src/core/journeys/admission';
import type { AnomalyObservation } from '../../src/core/journeys/admission';

const FINGERPRINT = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';

function observation(overrides: Partial<AnomalyObservation> = {}): AnomalyObservation {
  return {
    runId: 'run-1',
    journeyId: 'p4.j1',
    contractVersion: 'nightwatch.journey-contract.v1',
    contractDigest: 'contract:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
    fingerprint: FINGERPRINT,
    contextKind: 'FIRST_OBSERVATION',
    ...overrides,
  };
}

test.describe('role-typed replay contexts (7.3)', () => {
  test('the role vocabulary is closed and the context identity is role-qualified', () => {
    for (const role of REPLAY_CONTEXT_ROLES) expect(isReplayContextRole(role)).toBe(true);
    expect(isReplayContextRole('FIRST')).toBe(false);
    expect(isReplayContextRole(undefined)).toBe(false);
    // The same run id under two roles is TWO contexts.
    expect(roleTypedContextId({ runId: 'run-1', contextKind: 'FIRST_OBSERVATION' })).toBe('FIRST_OBSERVATION:run-1');
    expect(roleTypedContextId({ runId: 'run-1', contextKind: 'FRESH_CONTEXT_REPLAY' })).toBe('FRESH_CONTEXT_REPLAY:run-1');
  });

  test('a second ROLE reproduces L1 even when the run label is reused', () => {
    const result = evaluateAnomalyAdmission({
      hypothesis: observation(),
      observations: [
        observation(),
        observation({ contextKind: 'FRESH_CONTEXT_REPLAY' }),
      ],
    });
    expect(result.status).toBe('L1_REPRODUCED');
    expect(result.level).toBe('L1');
    expect(result.distinctContextCount).toBe(2);
    expect(result.exactRuns).toEqual(['FIRST_OBSERVATION:run-1', 'FRESH_CONTEXT_REPLAY:run-1']);
  });

  test('three runs of ONE role never grant L2 and never claim reproduction in a fresh context', () => {
    const result = evaluateAnomalyAdmission({
      hypothesis: observation(),
      observations: [
        observation({ runId: 'run-1' }),
        observation({ runId: 'run-2' }),
        observation({ runId: 'run-3' }),
      ],
    });
    // Distinct labels are not independent contexts: the role is what makes a
    // context independent, so this stays an L0 candidate.
    expect(result.status).toBe('L0_OBSERVED');
    expect(result.level).toBe('L0');
    expect(result.distinctContextCount).toBe(3);
    expect(result.reason).toContain('single role-typed context');
  });

  test('L2 requires three role-qualified contexts across at least two roles', () => {
    const result = evaluateAnomalyAdmission({
      hypothesis: observation(),
      observations: [
        observation({ runId: 'run-1' }),
        observation({ runId: 'run-2', contextKind: 'FRESH_CONTEXT_REPLAY' }),
        observation({ runId: 'run-3', contextKind: 'BOUNDED_REPETITION' }),
      ],
    });
    expect(result.status).toBe('L2_REPEATED');
    expect(result.level).toBe('L2');
    expect(result.distinctContextCount).toBe(3);
    expect(result.exactRuns).toHaveLength(3);
  });

  test('the same role observed twice under one run id counts once', () => {
    const result = evaluateAnomalyAdmission({
      hypothesis: observation(),
      observations: [
        observation(),
        observation(),
        observation({ contextKind: 'FRESH_CONTEXT_REPLAY' }),
      ],
    });
    expect(result.status).toBe('L1_REPRODUCED');
    expect(result.distinctContextCount).toBe(2);
  });

  test('the phase7 harness receives its role and never infers it', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'manual', 'phase7-real-campaign.ts'),
      'utf8',
    );
    // The builder takes the role as required input and refuses an invalid one.
    expect(source).toContain('readonly contextRole: ReplayContextRole;');
    expect(source).toContain('CAMPAIGN_ANOMALY_CONTEXT_ROLE_INVALID');
    expect(source).toContain('contextKind: input.contextRole,');
    // No inference from an observation flag remains anywhere in the harness.
    expect(source).not.toContain("observation.reproduced ? 'FRESH_CONTEXT_REPLAY'");
    // Every call site passes a role explicitly.
    const callSites = source.split('candidateFromObservation({').length - 1;
    const roleArguments = source.split('contextRole:').length - 2; // minus the interface declaration
    expect(callSites).toBeGreaterThanOrEqual(3);
    expect(roleArguments).toBeGreaterThanOrEqual(callSites);
  });
});
