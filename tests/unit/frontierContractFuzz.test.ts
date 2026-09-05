// Contract fuzz + property invariants for the frontier cones. Every case
// must fail closed with a sanitized code (no input values echoed).
// Pinned inputs; no randomness. Synthetic only.

import { test, expect } from '@playwright/test';
import {
  decideReview,
  findingArtifactDigest,
  initialReviewRecord,
  renderHumanFilingReport,
  verifyReviewCurrent,
} from '../../src/core/findingReview/index';
import {
  classifyRecurrence,
  classifyRelationship,
  groupDefectClasses,
  provenanceCapsConfidence,
  strongestProvenance,
} from '../../src/core/findingIntel/index';
import { runC12LocalRehearsal } from '../../src/core/c12Rehearsal/index';

const DIGEST = 'c'.repeat(24);
const SHA_A = 'a'.repeat(40);
const PQ = `receipt:sha256:${'ab'.repeat(32)}`;

function binding() {
  return {
    findingId: 'finding/a1',
    findingDigest: DIGEST,
    dossierDigest: DIGEST,
    handoffDigest: null as string | null,
    sourceSha: SHA_A,
    campaignId: 'campaign/local-001',
    handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
    privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
  };
}

function descriptor(id: string) {
  return {
    findingId: id,
    fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    expectationId: 'expectation/x',
    semanticContractId: null as string | null,
    failureSignature: null as string | null,
    route: null as string | null,
    sourceLineage: null as string | null,
    replayOutcome: null as 'PASS' | 'FAILURE' | 'INVALID' | null,
  };
}

test.describe('frontier contract fuzz', () => {
  test('review binding rejects malformed shapes without echoing values', () => {
    const secret = 'AKIAIOSFODNN7EXAMPLE';
    const cases: unknown[] = [
      null,
      undefined,
      42,
      'string',
      [],
      {},
      { ...binding(), findingDigest: 'zzz' },
      { ...binding(), findingDigest: secret },
      { ...binding(), findingId: '' },
      { ...binding(), findingId: 'x'.repeat(161) },
      { ...binding(), handoffDigest: 'short' },
      { ...binding(), sourceSha: 'not-a-sha' },
      { ...binding(), campaignId: secret },
      { ...binding(), extraUnknownField: 'present' },
      { ...binding(), findingDigest: 'C'.repeat(24) },
      { ...binding(), rationale: 'ignored' },
    ];
    for (const [index, value] of cases.entries()) {
      let message = '';
      try {
        initialReviewRecord(value as never);
      } catch (error) {
        message = String((error as Error).message);
      }
      expect(message, `case ${index}`).toMatch(/FINDING_REVIEW_/);
      expect(message, `case ${index} sanitized`).not.toContain(secret);
    }
  });

  test('deep nesting and prototype-like keys fail closed', () => {
    const nested = { ...binding(), findingId: { '__proto__': { polluted: true } } };
    expect(() => initialReviewRecord(nested as never)).toThrow(/FINDING_REVIEW_/);
    const deep = { ...binding(), campaignId: 'a'.repeat(5000) };
    expect(() => initialReviewRecord(deep as never)).toThrow(/FINDING_REVIEW_/);
    const unicode = { ...binding(), findingId: 'finding/😈-1' };
    expect(() => initialReviewRecord(unicode as never)).toThrow(/FINDING_REVIEW_/);
  });

  test('relationship classifier rejects malformed descriptors', () => {
    const bad = [
      { ...descriptor('finding/1'), fingerprint: 'not-a-fingerprint' },
      { ...descriptor('finding/1'), replayOutcome: 'MAYBE' },
      { ...descriptor('finding/1'), findingId: '' },
      { ...descriptor('finding/1'), expectationId: 42 },
      null,
    ];
    for (const value of bad) {
      expect(() => classifyRelationship(value as never, descriptor('finding/2'))).toThrow(/FINDING_INTEL_/);
    }
  });

  test('recurrence and grouping reject malformed history', () => {
    const finding = { findingId: 'finding/9', fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', campaignId: 'campaign/c9', observedAtMs: 3000 };
    expect(() => classifyRecurrence(finding, [{ findingId: 'finding/1', fingerprint: null, campaignId: 'campaign/c1', observedAtMs: -5, sourceSha: SHA_A, priorOutcome: 'OPEN' }] as never)).toThrow(
      /FINDING_INTEL_/,
    );
    expect(() => classifyRecurrence(finding, 'nope' as never)).toThrow(/FINDING_INTEL_/);
    expect(() => groupDefectClasses('nope' as never)).toThrow(/FINDING_INTEL_/);
    expect(() => strongestProvenance([])).toThrow(/FINDING_INTEL_/);
    expect(() => strongestProvenance(['MADE_UP'] as never)).toThrow(/FINDING_INTEL_/);
    expect(() => provenanceCapsConfidence('MACHINE_CONTRACT', 'MADE_UP' as never)).toThrow(/FINDING_INTEL_/);
  });

  test('rehearsal input fuzz fails closed', () => {
    const base = { implementationSha: SHA_A, pqReceiptDigest: PQ, campaignId: 'campaign/c1', scenario: 'CLEAN_PASSIVE' as const, baseNowMs: 1786000000000 };
    const bad = [
      { ...base, implementationSha: 'x'.repeat(40).replace(/x/g, 'z') },
      { ...base, pqReceiptDigest: 'receipt:sha256:short' },
      { ...base, campaignId: '' },
      { ...base, scenario: 'PRODUCTION_LIVE' },
      { ...base, baseNowMs: Number.NaN },
      { ...base, baseNowMs: 'tomorrow' },
      null,
    ];
    for (const value of bad) {
      expect(() => runC12LocalRehearsal(value as never)).toThrow(/C12_REHEARSAL_/);
    }
  });

  test('errors never carry artifact bytes', () => {
    const big = { nested: { deep: { value: 'x'.repeat(10000) } } };
    const digest = findingArtifactDigest(big);
    expect(digest).toMatch(/^[a-f0-9]{24}$/);
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', { reviewedAt: '2026-09-05T00:00:00Z' });
    let message = '';
    try {
      verifyReviewCurrent(receipt, {
        finding: big,
        dossier: {},
        handoff: null,
        sourceSha: SHA_A,
        campaignId: 'campaign/local-001',
        handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
        privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
      });
    } catch (error) {
      message = String((error as Error).message);
    }
    expect(message).toMatch(/FINDING_REVIEW_STALE/);
    expect(message.length).toBeLessThan(200);
  });
});

test.describe('frontier property invariants', () => {
  test('UNKNOWN never grants authority: unknown relationship has no original pointer', () => {
    const sparse = { findingId: 'finding/1', fingerprint: null, expectationId: null, semanticContractId: null, failureSignature: null, route: null, sourceLineage: null, replayOutcome: null };
    const result = classifyRelationship(sparse, { ...sparse, findingId: 'finding/2' });
    expect(result.relationship).toBe('UNKNOWN');
    expect(result.possibleOriginalId).toBeNull();
  });

  test('duplicate suggestion never becomes a final verdict', () => {
    const a = descriptor('finding/1');
    const b = descriptor('finding/2');
    for (const result of [classifyRelationship(a, b), classifyRelationship(b, a)]) {
      expect(result.advisoryOnly).toBe(true);
      expect(result.finalVerdictAuthority).toBe('HUMAN_ORGANIZATIONAL');
    }
  });

  test('changed artifact invalidates stale review (all bindings)', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', { reviewedAt: '2026-09-05T00:00:00Z' });
    const current = {
      finding: { id: 'finding/a1' },
      dossier: { id: 'dossier/a1' },
      handoff: null as unknown,
      sourceSha: SHA_A,
      campaignId: 'campaign/local-001',
      handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
      privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
    };
    // Rebind the receipt to the actual current digests, then drift each one.
    const rebound = {
      ...binding(),
      findingDigest: findingArtifactDigest(current.finding),
      dossierDigest: findingArtifactDigest(current.dossier),
    };
    const decided = decideReview(initialReviewRecord(rebound), 'ACCEPT_EVIDENCE', { reviewedAt: '2026-09-05T00:00:00Z' });
    expect(() => verifyReviewCurrent(decided.receipt, current)).not.toThrow();
    expect(() => verifyReviewCurrent(decided.receipt, { ...current, finding: { id: 'finding/CHANGED' } })).toThrow(/STALE/);
    expect(receipt.binding.findingDigest).toBe(DIGEST);
  });

  test('synthetic rehearsal cannot create live authorization', () => {
    const receipt = runC12LocalRehearsal({
      implementationSha: SHA_A,
      pqReceiptDigest: PQ,
      campaignId: 'campaign/c1',
      scenario: 'CLEAN_PASSIVE',
      baseNowMs: 1786000000000,
    });
    expect(receipt.state).toBe('LOCAL_REHEARSAL_PASS');
    expect(receipt.liveAuthorization).toBe('NOT_CONFERRED_SYNTHETIC_ONLY');
    expect(JSON.stringify(receipt)).not.toMatch(/C12_AUTHORIZED|C12_PRODUCTION_READY|LIVE_AUTHORIZATION/i);
  });

  test('report never invents team or severity', () => {
    const report = renderHumanFilingReport({
      title: 't',
      candidateId: 'candidate:sha256:cccccccccccccccccccccccc',
      confidence: 'TENTATIVE',
      confidenceBasis: 'weak synthetic basis',
      expectationId: 'expectation/x',
      expectationProvenance: 'HEURISTIC',
      classification: {
        severity: 'UNKNOWN',
        severityBasis: 'ambiguous impact',
        catchStage: 'UNKNOWN',
        catchStageBasis: 'local observation',
        source: 'self_found',
        sourceBasis: 'synthetic provenance',
        team: 'UNKNOWN',
        teamEvidence: null,
      },
      reproduction: ['step one'],
      expectedBehavior: 'expected',
      actualBehavior: 'actual',
      evidence: ['sanitized item'],
      relatedFindings: [],
      recurrence: 'FIRST_SEEN in 0 history entries',
      defectClass: null,
      review: null,
      unknowns: ['impact'],
      privacyRedactions: [],
    });
    expect(report).toContain('Severity: UNKNOWN');
    expect(report).toContain('HUMAN DECISION REQUIRED');
  });
});
