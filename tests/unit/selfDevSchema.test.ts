import { expect, test } from '@playwright/test';
import {
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_FIXTURE_ID,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_SOURCE_REFS,
  SELFDEV_TARGET_SURFACE,
  ZERO_SELFDEV_SAFETY_VECTOR,
  candidateIdFor,
  candidateSemanticDigest,
  validateCandidate,
  type SelfDevCandidate,
} from '../../src/core/selfDev';

const BASE_SHA = 'a'.repeat(40);

function candidateWithoutId(overrides: Partial<Omit<SelfDevCandidate, 'candidateId'>> = {}): Omit<SelfDevCandidate, 'candidateId'> {
  return {
    schemaVersion: SELFDEV_CANDIDATE_SCHEMA_VERSION,
    candidateKind: SELFDEV_CANDIDATE_KIND,
    generatorClass: SELFDEV_PROPOSER_CLASS,
    baseNightwatchSha: BASE_SHA,
    fixtureId: SELFDEV_FIXTURE_ID,
    targetSurface: SELFDEV_TARGET_SURFACE,
    title: 'Expand synthetic summary read-only',
    rationaleClass: 'STATE_TRANSITION',
    actionIds: ['selfdev.synthetic.expand-summary'],
    assertionIds: ['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion'],
    coverageClaims: ['transition:ready-read-only-expansion'],
    sourceRefs: [SELFDEV_SOURCE_REFS[0]!],
    createdAt: '2026-08-14T00:00:00.000Z',
    safety: ZERO_SELFDEV_SAFETY_VECTOR,
    publication: SELFDEV_PUBLICATION,
    adoptionAuthority: 'NONE',
    ...overrides,
  };
}

function validCandidate(overrides: Partial<Omit<SelfDevCandidate, 'candidateId'>> = {}): SelfDevCandidate {
  const draft = candidateWithoutId(overrides);
  return { ...draft, candidateId: candidateIdFor(draft) };
}

test.describe('Phase 8A strict candidate DTO', () => {
  test('accepts the bounded declarative candidate and computes stable identity', () => {
    const candidate = validCandidate();
    expect(validateCandidate(candidate)).toEqual(candidate);
    expect(candidate.candidateId).toMatch(/^candidate:[a-f0-9]{64}$/);
    expect(candidateSemanticDigest(candidate)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('rejects every forbidden executable or authority-shaped field at runtime', () => {
    const forbidden = [
      'code', 'source', 'sourceCode', 'patch', 'diff', 'command', 'shell',
      'script', 'url', 'endpoint', 'prompt', 'model', 'tools', 'functions',
      'git', 'pathTraversal', 'outputPath',
    ];
    for (const field of forbidden) {
      const candidate = { ...validCandidate(), [field]: 'synthetic-forbidden-value' } as unknown;
      expect(() => validateCandidate(candidate), field).toThrow(/SELFDEV_SCHEMA/);
    }
  });

  test('rejects missing keys, malformed IDs, control characters, oversized strings, and unbounded arrays', () => {
    const candidate = validCandidate();
    const { title: _title, ...missingTitle } = candidate;
    expect(() => validateCandidate(missingTitle)).toThrow(/SCHEMA_MISSING_FIELD/);
    expect(() => validateCandidate({ ...candidate, candidateId: 'candidate:bad' })).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate({ ...candidate, title: 'bad\u0000title' })).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate({ ...candidate, title: 'x'.repeat(121) })).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate({ ...candidate, actionIds: Array.from({ length: 9 }, (_, index) => `selfdev.synthetic.action-${index}`) })).toThrow(/SELFDEV_SCHEMA/);
  });

  test('timestamp metadata is excluded from semantic identity', () => {
    const first = validCandidate({ createdAt: '2026-08-14T00:00:00.000Z' });
    const secondDraft = candidateWithoutId({ createdAt: '2026-08-15T00:00:00.000Z' });
    const second = { ...secondDraft, candidateId: candidateIdFor(secondDraft) };
    expect(second.candidateId).toBe(first.candidateId);
    expect(validateCandidate(second).candidateId).toBe(first.candidateId);
  });

  test('meaningfully changed action or assertion semantics change identity', () => {
    const first = validCandidate();
    const changedActionDraft = candidateWithoutId({
      actionIds: ['selfdev.synthetic.observe-ready'],
      assertionIds: ['selfdev.assert.state.ready', 'selfdev.assert.transition.observation'],
    });
    const changed = { ...changedActionDraft, candidateId: candidateIdFor(changedActionDraft) };
    expect(changed.candidateId).not.toBe(first.candidateId);
  });
});
