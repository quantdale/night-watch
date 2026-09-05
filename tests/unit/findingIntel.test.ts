// Deterministic finding intelligence: relationships, recurrence,
// defect classes, provenance. Local synthetic descriptors only.

import { test, expect } from '@playwright/test';
import {
  isIntelValueForbidden,
} from '../../src/core/findingIntel/relationships';
import {
  assertProvenConfidence,
  classifyRecurrence,
  classifyRelationship,
  defectClassDigest,
  groupDefectClasses,
  provenanceCapsConfidence,
  relationshipDigest,
  strongestProvenance,
  type IntelFindingDescriptor,
} from '../../src/core/findingIntel/index';

function descriptor(overrides: Partial<IntelFindingDescriptor> & { findingId: string }): IntelFindingDescriptor {
  return {
    fingerprint: null,
    expectationId: null,
    semanticContractId: null,
    failureSignature: null,
    route: null,
    sourceLineage: null,
    replayOutcome: null,
    ...overrides,
  };
}

const FP_A = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FP_B = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';

test.describe('finding relationships', () => {
  test('same fingerprint and expectation is the exact same finding', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_A, expectationId: 'expectation/x' });
    const result = classifyRelationship(a, b);
    expect(result.relationship).toBe('EXACT_SAME_FINDING');
    expect(result.confidence).toBe('HIGH_CONFIDENCE');
    expect(result.possibleOriginalId).toBe('finding/2');
    expect(result.advisoryOnly).toBe(true);
    expect(result.finalVerdictAuthority).toBe('HUMAN_ORGANIZATIONAL');
    expect(result.evidence.map((entry) => entry.kind)).toContain('SAME_FINGERPRINT');
  });

  test('same fingerprint with diverged expectation is probable duplicate with counterevidence', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_A, expectationId: 'expectation/y' });
    const result = classifyRelationship(a, b);
    expect(result.relationship).toBe('PROBABLE_DUPLICATE');
    expect(result.counterevidence.map((entry) => entry.kind)).toContain('DIFFERENT_EXPECTATION');
  });

  test('same semantic contract with different fingerprints shares a defect class', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x', semanticContractId: 'contract/currency' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_B, expectationId: 'expectation/y', semanticContractId: 'contract/currency' });
    const result = classifyRelationship(a, b);
    expect(result.relationship).toBe('SHARED_DEFECT_CLASS');
  });

  test('same text but different invariant is related, not exact', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x', failureSignature: 'sig/timeout' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_B, expectationId: 'expectation/x', failureSignature: 'sig/timeout' });
    const result = classifyRelationship(a, b);
    expect(result.relationship).toBe('RELATED_FINDING');
    expect(result.counterevidence.map((entry) => entry.kind)).toContain('DIFFERENT_FINGERPRINT');
  });

  test('fixed history plus moved source is a regression candidate, not a duplicate', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/0', fingerprint: FP_A, expectationId: 'expectation/x' });
    const result = classifyRelationship(a, b, {
      earlierOutcome: 'RESOLVED_FIXED',
      earlierSourceSha: 'a'.repeat(40),
      currentSourceSha: 'b'.repeat(40),
    });
    expect(result.relationship).toBe('REGRESSION_CANDIDATE');
  });

  // Chronology must bind mechanically (campaign §14). Each precondition of the
  // regression verdict is removed independently; none may be inferable from
  // the others. Mutation probes M04/M05 previously survived here.
  test('an earlier outcome that is not a proven fix never yields a regression verdict', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/0', fingerprint: FP_A, expectationId: 'expectation/x' });
    for (const earlierOutcome of ['OPEN', 'RESOLVED_OTHER', 'REJECTED', 'UNKNOWN'] as const) {
      const result = classifyRelationship(a, b, {
        earlierOutcome,
        earlierSourceSha: 'a'.repeat(40),
        currentSourceSha: 'b'.repeat(40),
      });
      expect(result.relationship, `earlierOutcome=${earlierOutcome}`).toBe('EXACT_SAME_FINDING');
    }
  });

  test('an unmoved source lineage never yields a regression verdict even after a fix', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/0', fingerprint: FP_A, expectationId: 'expectation/x' });
    const sameSha = classifyRelationship(a, b, {
      earlierOutcome: 'RESOLVED_FIXED',
      earlierSourceSha: 'a'.repeat(40),
      currentSourceSha: 'a'.repeat(40),
    });
    expect(sameSha.relationship).toBe('EXACT_SAME_FINDING');
    // A missing lineage on either side is not a substitute for a moved one.
    const missingCurrent = classifyRelationship(a, b, {
      earlierOutcome: 'RESOLVED_FIXED',
      earlierSourceSha: 'a'.repeat(40),
    });
    expect(missingCurrent.relationship).toBe('EXACT_SAME_FINDING');
    const missingEarlier = classifyRelationship(a, b, {
      earlierOutcome: 'RESOLVED_FIXED',
      currentSourceSha: 'b'.repeat(40),
    });
    expect(missingEarlier.relationship).toBe('EXACT_SAME_FINDING');
    // Absent history entirely, the mechanical verdict stands unchanged.
    expect(classifyRelationship(a, b).relationship).toBe('EXACT_SAME_FINDING');
  });

  test('prose-looking similarity without mechanical evidence is unrelated or unknown', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x', failureSignature: 'sig/same-words' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_B, expectationId: 'expectation/y', failureSignature: 'sig/other-words' });
    expect(classifyRelationship(a, b).relationship).toBe('UNRELATED');
    const sparseA = descriptor({ findingId: 'finding/1' });
    const sparseB = descriptor({ findingId: 'finding/2' });
    const unknown = classifyRelationship(sparseA, sparseB);
    expect(unknown.relationship).toBe('UNKNOWN');
    expect(unknown.confidence).toBe('INSUFFICIENT');
    expect(unknown.possibleOriginalId).toBeNull();
  });

  test('same semantic input yields the same digest regardless of call order effects', () => {
    const a = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    const b = descriptor({ findingId: 'finding/2', fingerprint: FP_A, expectationId: 'expectation/x' });
    expect(relationshipDigest(classifyRelationship(a, b))).toBe(relationshipDigest(classifyRelationship(a, b)));
  });
});

test.describe('recurrence', () => {
  const SHA_A = 'a'.repeat(40);
  test('empty history is first seen; null history is unknown', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c9', observedAtMs: 3000 };
    expect(classifyRecurrence(finding, []).recurrence).toBe('FIRST_SEEN');
    expect(classifyRecurrence(finding, null).recurrence).toBe('UNKNOWN_HISTORY');
  });

  test('same fingerprint in the same campaign is known existing', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 3000 };
    const history = [
      { findingId: 'finding/1', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 1000, sourceSha: SHA_A, expectationId: null, semanticContractId: null, priorOutcome: 'OPEN' as const },
    ];
    const result = classifyRecurrence(finding, history);
    expect(result.recurrence).toBe('KNOWN_EXISTING');
    expect(result.priorFindingId).toBe('finding/1');
  });

  const SHA_B = 'b'.repeat(40);
  const priorFix = (sourceSha: string, identity: { expectationId?: string | null; semanticContractId?: string | null } = {}) => [
    {
      findingId: 'finding/1',
      fingerprint: FP_A,
      campaignId: 'campaign/c1',
      observedAtMs: 1000,
      sourceSha,
      expectationId: identity.expectationId ?? null,
      semanticContractId: identity.semanticContractId ?? null,
      priorOutcome: 'RESOLVED_FIXED' as const,
    },
  ];

  test('reappearance after a fix AT A MOVED SOURCE is a regression candidate', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: SHA_B };
    const result = classifyRecurrence(finding, priorFix(SHA_A));
    expect(result.recurrence).toBe('REGRESSION_CANDIDATE');
    expect(result.evidence.join(' ')).toContain(`source lineage moved from ${SHA_A} to ${SHA_B}`);
  });

  test('DEF-RO-2: a prior fix at the SAME source is not a regression candidate', () => {
    // The old guard read `latest.sourceSha !== undefined`, which
    // assertHistoryEntry has already proven true. It could not fail, so the
    // rule's own stated requirement -- a moved source lineage -- was never
    // checked, and "we fixed it here and it is still here" read as "it came
    // back".
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: SHA_A };
    const result = classifyRecurrence(finding, priorFix(SHA_A));
    expect(result.recurrence).toBe('RECURRENT');
    expect(result.evidence.join(' ')).toContain('source lineage did not move');
  });

  test('DEF-RO-2: without a candidate source identity, movement is unproven and the weaker answer wins', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000 };
    const result = classifyRecurrence(finding, priorFix(SHA_A));
    expect(result.recurrence).toBe('RECURRENT');
    expect(result.evidence.join(' ')).toContain('carries no source identity');
  });

  test('a local review decision is never evidence of a prior fix', () => {
    // priorOutcome is the ONLY remediation evidence this cone accepts, and no
    // review-store value can produce it. A finding reviewed five times whose
    // prior entry is OPEN is recurrent, not a regression.
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: SHA_B };
    const history = [
      { findingId: 'finding/1', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 1000, sourceSha: SHA_A, expectationId: null, semanticContractId: null, priorOutcome: 'OPEN' as const },
    ];
    expect(classifyRecurrence(finding, history).recurrence).toBe('RECURRENT');
  });

  test('a contradicting invariant identity rejects a fingerprint match', () => {
    // Same fingerprint, different proven contract: a collision, not a
    // recurrence. Merging them is exactly the defect-class over-collapse the
    // classifier must not perform.
    const finding = {
      findingId: 'finding/9',
      fingerprint: FP_A,
      campaignId: 'campaign/c2',
      observedAtMs: 3000,
      sourceSha: SHA_B,
      semanticContractId: 'contract/currency-rounding',
    };
    const result = classifyRecurrence(finding, priorFix(SHA_A, { semanticContractId: 'contract/tax-allocation' }));
    expect(result.recurrence).toBe('FIRST_SEEN');
    expect(result.evidence.join(' ')).toContain('rejected on a contradicting invariant identity');
  });

  test('a matching invariant identity corroborates rather than reclassifies', () => {
    const finding = {
      findingId: 'finding/9',
      fingerprint: FP_A,
      campaignId: 'campaign/c2',
      observedAtMs: 3000,
      sourceSha: SHA_B,
      semanticContractId: 'contract/currency-rounding',
    };
    const result = classifyRecurrence(finding, priorFix(SHA_A, { semanticContractId: 'contract/currency-rounding' }));
    expect(result.recurrence).toBe('REGRESSION_CANDIDATE');
    expect(result.evidence.join(' ')).toContain('shares the same proven invariant identity');
  });

  test('a missing identity on either side contradicts nothing', () => {
    // Absence of evidence is not counterevidence: an unenriched v1 dossier
    // must not silently suppress a real recurrence.
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: SHA_B, semanticContractId: 'contract/x' };
    expect(classifyRecurrence(finding, priorFix(SHA_A)).recurrence).toBe('REGRESSION_CANDIDATE');
    const bare = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: SHA_B };
    expect(classifyRecurrence(bare, priorFix(SHA_A, { semanticContractId: 'contract/x' })).recurrence).toBe('REGRESSION_CANDIDATE');
  });

  test('a differing proven expectation is a contradiction even when contracts agree', () => {
    const finding = {
      findingId: 'finding/9',
      fingerprint: FP_A,
      campaignId: 'campaign/c2',
      observedAtMs: 3000,
      sourceSha: SHA_B,
      semanticContractId: 'contract/same',
      expectationId: 'expectation/differs',
    };
    const result = classifyRecurrence(
      finding,
      priorFix(SHA_A, { semanticContractId: 'contract/same', expectationId: 'expectation/other' })
    );
    expect(result.recurrence).toBe('FIRST_SEEN');
  });

  test('an unsafe identity on the candidate fails closed', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, semanticContractId: 'CUSTOMER_SENTINEL' };
    expect(() => classifyRecurrence(finding, [])).toThrow(/FINDING_INTEL_INVALID_FINDING/);
    const badSource = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000, sourceSha: 'not-a-sha' };
    expect(() => classifyRecurrence(badSource, [])).toThrow(/FINDING_INTEL_INVALID_FINDING/);
  });

  test('an unsafe identity on a history entry fails closed', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000 };
    expect(() =>
      classifyRecurrence(finding, [
        { findingId: 'finding/1', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 1000, sourceSha: SHA_A, expectationId: 'bob@example.com', semanticContractId: null, priorOutcome: 'OPEN' },
      ] as never)
    ).toThrow(/FINDING_INTEL_INVALID_HISTORY/);
  });

  test('reappearance across campaigns without a fix is recurrent', () => {
    const finding = { findingId: 'finding/9', fingerprint: FP_A, campaignId: 'campaign/c2', observedAtMs: 3000 };
    const history = [
      { findingId: 'finding/1', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 1000, sourceSha: SHA_A, expectationId: null, semanticContractId: null, priorOutcome: 'OPEN' as const },
    ];
    const result = classifyRecurrence(finding, history);
    expect(result.recurrence).toBe('RECURRENT');
    expect(result.priorFindingId).toBe('finding/1');
  });
});

test.describe('defect classes and provenance', () => {
  test('five findings on one invariant form a class; singletons do not', () => {
    const members = [1, 2, 3, 4, 5].map((index) => ({
      findingId: `finding/${index}`,
      semanticContractId: 'contract/currency-rounding',
      expectationId: 'expectation/rounding',
      sourceScope: 'scope/billing',
      replayOutcome: 'FAILURE' as const,
    }));
    const solo = {
      findingId: 'finding/solo',
      semanticContractId: 'contract/other',
      expectationId: null,
      sourceScope: 'scope/billing',
      replayOutcome: 'FAILURE' as const,
    };
    const classes = groupDefectClasses([...members, solo]);
    expect(classes.length).toBe(1);
    expect(classes[0]?.memberFindingIds).toEqual(['finding/1', 'finding/2', 'finding/3', 'finding/4', 'finding/5']);
    expect(classes[0]?.confidence).toBe('SUPPORTED');
    expect(classes[0]?.counterexamples).toEqual([]);
    expect(defectClassDigest(classes[0] as never)).toMatch(/^[a-f0-9]{24}$/);
  });

  test('contradicting replay outcomes become counterexamples and cap confidence', () => {
    const members = [
      { findingId: 'finding/1', semanticContractId: 'contract/c', expectationId: null, sourceScope: 'scope/s', replayOutcome: 'FAILURE' as const },
      { findingId: 'finding/2', semanticContractId: 'contract/c', expectationId: null, sourceScope: 'scope/s', replayOutcome: 'INVALID' as const },
    ];
    const classes = groupDefectClasses(members);
    expect(classes[0]?.confidence).toBe('TENTATIVE');
    expect(classes[0]?.counterexamples.length).toBe(1);
  });

  // The intel cone embeds descriptor values verbatim into evidence detail
  // strings, so a sentinel reaching a descriptor would be copied into advisory
  // output. Mutation probes M31/M32 previously survived: the screen existed
  // but nothing exercised it.
  test('the sentinel screen recognises every planted category', () => {
    for (const planted of [
      'CUSTOMER_SENTINEL',
      'ACCOUNT_SENTINEL',
      'EMAIL_SENTINEL',
      'COST_SENTINEL',
      'TOKEN_SENTINEL',
      'Bearer abcdef0123456789',
      'eyJhbGciOiJIUzI1NiJ9.payload',
      'AKIAIOSFODNN7EXAMPLE',
      '-----BEGIN RSA PRIVATE KEY-----',
      'person@example.com',
    ]) {
      expect(isIntelValueForbidden(planted), planted).toBe(true);
      expect(isIntelValueForbidden(`prefix-${planted}-suffix`), planted).toBe(true);
    }
    for (const safe of ['finding/1', 'expectation/invoice-total', 'fp:sha256:aaaa', 'sig/total-mismatch', '/billing/invoice']) {
      expect(isIntelValueForbidden(safe), safe).toBe(false);
    }
  });

  test('a sentinel-bearing descriptor is rejected rather than embedded in evidence', () => {
    const clean = descriptor({ findingId: 'finding/1', fingerprint: FP_A, expectationId: 'expectation/x' });
    for (const [field, value] of [
      ['findingId', 'finding/CUSTOMER_SENTINEL'],
      ['expectationId', 'expectation/person@example.com'],
      ['semanticContractId', 'contract/TOKEN_SENTINEL'],
      ['failureSignature', 'sig/AKIAIOSFODNN7EXAMPLE'],
      ['route', '/billing/EMAIL_SENTINEL'],
      ['sourceLineage', 'lineage/COST_SENTINEL'],
    ] as const) {
      const poisoned = descriptor({ findingId: 'finding/2', fingerprint: FP_A, expectationId: 'expectation/x', [field]: value });
      expect(() => classifyRelationship(poisoned, clean), field).toThrow(/FINDING_INTEL_INVALID_DESCRIPTOR/);
      expect(() => classifyRelationship(clean, poisoned), field).toThrow(/FINDING_INTEL_INVALID_DESCRIPTOR/);
    }
  });

  test('recurrence and grouping reject sentinel-bearing identities too', () => {
    expect(() => classifyRecurrence(
      { findingId: 'finding/CUSTOMER_SENTINEL', fingerprint: FP_A, campaignId: 'campaign/c1', observedAtMs: 1 },
      [],
    )).toThrow(/FINDING_INTEL_INVALID_FINDING/);
    expect(() => classifyRecurrence(
      { findingId: 'finding/1', fingerprint: FP_A, campaignId: 'campaign/TOKEN_SENTINEL', observedAtMs: 1 },
      [],
    )).toThrow(/FINDING_INTEL_INVALID_FINDING/);
  });

  test('provenance ranking prefers machine contracts; weak provenance caps confidence', () => {
    expect(strongestProvenance(['HEURISTIC', 'SYNTHETIC_ORACLE', 'SCHEMA_INVARIANT'])).toBe('SCHEMA_INVARIANT');
    expect(strongestProvenance(['UNKNOWN', 'HEURISTIC'])).toBe('HEURISTIC');
    expect(provenanceCapsConfidence('HEURISTIC', 'HIGH_CONFIDENCE')).toBe('TENTATIVE');
    expect(provenanceCapsConfidence('UNKNOWN', 'PROVEN')).toBe('TENTATIVE');
    expect(provenanceCapsConfidence('SYNTHETIC_ORACLE', 'PROVEN')).toBe('SUPPORTED');
    expect(provenanceCapsConfidence('MACHINE_CONTRACT', 'PROVEN')).toBe('PROVEN');
    expect(() => assertProvenConfidence('HEURISTIC')).toThrow(/PROVEN_REQUIRES_MECHANICAL/);
    expect(() => assertProvenConfidence('SYNTHETIC_ORACLE')).toThrow(/PROVEN_REQUIRES_MECHANICAL/);
  });
});
