import { expect, test } from '@playwright/test';
import {
  runPhase24SyntheticCampaign,
  validatePhase24SyntheticCampaign,
} from '../../src/core/phase24';

test('Phase 24 synthetic campaign covers distinct archetypes with deterministic repeat and zero false positives', () => {
  const first = runPhase24SyntheticCampaign();
  const second = runPhase24SyntheticCampaign();
  validatePhase24SyntheticCampaign(first);
  expect(second.deterministicDigest).toBe(first.deterministicDigest);
  expect(first).toMatchObject({
    candidateCount: 8,
    eligibleCount: 6,
    excludedCount: 2,
    oracleCaseCount: 6,
    violatedCaseCount: 3,
    benignCaseCount: 3,
    falsePositiveCount: 0,
    deterministicRepeat: true,
  });
});
