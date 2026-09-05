// Post-dossier review lifecycle: exact binding, single decision, stale
// rejection. Local synthetic artifacts only; no network, no auth.

import { test, expect } from '@playwright/test';
import {
  FINDING_REVIEW_DECISIONS,
  decideReview,
  findingArtifactDigest,
  initialReviewRecord,
  isTerminalReviewState,
  verifyReviewCurrent,
  type FindingReviewBinding,
} from '../../src/core/findingReview/index';

const FINDING = { findingId: 'finding/a1', expectationId: 'expectation.currency-rounding', fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' };
const DOSSIER = { dossierId: 'dossier/a1', candidateId: 'candidate/a1', confidence: 'HIGH' };
const HANDOFF = { schemaVersion: 'nightwatch.alphaus-finding-handoff.v1', candidateId: 'candidate/a1' };

function binding(): FindingReviewBinding {
  return {
    findingId: 'finding/a1',
    findingDigest: findingArtifactDigest(FINDING),
    dossierDigest: findingArtifactDigest(DOSSIER),
    handoffDigest: findingArtifactDigest(HANDOFF),
    sourceSha: 'a'.repeat(40),
    campaignId: 'campaign/local-001',
    handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
    privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
  };
}

function current() {
  return {
    finding: FINDING,
    dossier: DOSSIER,
    handoff: HANDOFF,
    sourceSha: 'a'.repeat(40),
    campaignId: 'campaign/local-001',
    handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
    privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
  };
}

test.describe('finding review lifecycle', () => {
  test('review opens pending and each decision reaches its terminal state', () => {
    const pairs = [
      ['ACCEPT_EVIDENCE', 'REVIEWED'],
      ['REQUEST_FOLLOWUP', 'FOLLOWUP_RECOMMENDED'],
      ['MARK_INSUFFICIENT', 'INSUFFICIENT_EVIDENCE'],
      ['MARK_DUPLICATE_CANDIDATE', 'DUPLICATE_CANDIDATE'],
      ['SUPERSEDE', 'SUPERSEDED'],
    ] as const;
    for (const [decision, state] of pairs) {
      const { record, receipt } = decideReview(initialReviewRecord(binding()), decision, {
        reviewedAt: '2026-09-05T00:00:00Z',
        rationale: 'local synthetic review',
      });
      expect(record.state).toBe(state);
      expect(record.transitionCount).toBe(1);
      expect(receipt.resultingState).toBe(state);
      expect(receipt.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
      expect(receipt.reviewId).toMatch(/^review:[a-f0-9]{24}$/);
      expect(() => verifyReviewCurrent(receipt, current())).not.toThrow();
    }
  });

  test('a second decision on a decided record fails closed', () => {
    const first = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    expect(() => decideReview(first.record, 'SUPERSEDE', { reviewedAt: '2026-09-05T00:00:01Z' })).toThrow(/ALREADY_DECIDED/);
  });

  test('mutated dossier invalidates the stale receipt', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    const mutated = { ...current(), dossier: { ...DOSSIER, confidence: 'LOW' } };
    expect(() => verifyReviewCurrent(receipt, mutated)).toThrow(/FINDING_REVIEW_STALE:dossierDigest/);
  });

  test('regenerated handoff with different content invalidates the receipt', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    const regenerated = { ...current(), handoff: { ...HANDOFF, candidateId: 'candidate/b2' } };
    expect(() => verifyReviewCurrent(receipt, regenerated)).toThrow(/FINDING_REVIEW_STALE:handoffDigest/);
  });

  test('key reorder is not a mutation: stable digest still verifies', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    const reordered = { ...current(), dossier: { confidence: 'HIGH', candidateId: 'candidate/a1', dossierId: 'dossier/a1' } };
    expect(() => verifyReviewCurrent(receipt, reordered)).not.toThrow();
  });

  test('source, campaign, and version drift each fail closed', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    expect(() => verifyReviewCurrent(receipt, { ...current(), sourceSha: 'b'.repeat(40) })).toThrow(/STALE:sourceSha/);
    expect(() => verifyReviewCurrent(receipt, { ...current(), campaignId: 'campaign/other' })).toThrow(/STALE:campaignId/);
    expect(() => verifyReviewCurrent(receipt, { ...current(), handoffVersion: 'nightwatch.alphaus-finding-handoff.v2' })).toThrow(
      /STALE:handoffVersion/,
    );
    expect(() => verifyReviewCurrent(receipt, { ...current(), privacyProjectionVersion: 'nightwatch.privacy-projection.v2' })).toThrow(
      /STALE:privacyProjectionVersion/,
    );
  });

  test('handoff presence mismatch fails closed', () => {
    const dossierOnly: FindingReviewBinding = { ...binding(), handoffDigest: null };
    const { receipt } = decideReview(initialReviewRecord(dossierOnly), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    expect(() => verifyReviewCurrent(receipt, current())).toThrow(/STALE:handoffUnexpected/);
    const withHandoff: FindingReviewBinding = binding();
    const decided = decideReview(initialReviewRecord(withHandoff), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
    });
    expect(() => verifyReviewCurrent(decided.receipt, { ...current(), handoff: null })).toThrow(/STALE:handoffMissing/);
  });

  test('tampered rationale fails the receipt integrity check', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
      rationale: 'original',
    });
    expect(() => verifyReviewCurrent({ ...receipt, rationale: 'edited' }, current())).toThrow(/RECEIPT_TAMPERED/);
  });

  test('sentinel rationale and malformed digests are rejected', () => {
    expect(() =>
      decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
        reviewedAt: '2026-09-05T00:00:00Z',
        rationale: 'contact alice@example.com for details',
      }),
    ).toThrow(/INVALID_RATIONALE/);
    expect(() => initialReviewRecord({ ...binding(), dossierDigest: 'not-a-digest' })).toThrow(/INVALID_BINDING/);
    expect(() =>
      decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', { reviewedAt: 'not-an-instant' }),
    ).toThrow(/INVALID_INSTANT/);
  });

  // Nightwatch local review is never organizational sign-off. Both halves of
  // that guarantee are asserted: what every receipt CARRIES, and what
  // verification REJECTS. Mutation probes M11/M12 previously survived here.
  test('every receipt disclaims organizational authority on every decision', () => {
    for (const decision of FINDING_REVIEW_DECISIONS) {
      const { receipt } = decideReview(initialReviewRecord(binding()), decision, {
        reviewedAt: '2026-09-05T00:00:00Z',
        rationale: 'local reviewer note',
      });
      expect(receipt.organizationalAuthority, decision).toBe('NONE_LOCAL_REVIEW_ONLY');
      expect(receipt.notEquivalentTo, decision).toEqual(['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED']);
      // No receipt field may ever carry an organizational verdict value.
      expect(JSON.stringify(receipt)).not.toContain('"organizationalAuthority":"LESLIE_GENUINE"');
    }
  });

  test('a receipt claiming organizational authority is rejected, not honoured', () => {
    const { receipt } = decideReview(initialReviewRecord(binding()), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
      rationale: 'local reviewer note',
    });
    verifyReviewCurrent(receipt, current());
    for (const forged of ['LESLIE_GENUINE', 'PONDR_APPROVED', 'NONE', '']) {
      expect(() => verifyReviewCurrent({ ...receipt, organizationalAuthority: forged } as never, current()))
        .toThrow(/FINDING_REVIEW_AUTHORITY_INVALID/);
    }
  });

  test('terminal states are exactly the decided states', () => {
    expect(isTerminalReviewState('REVIEW_PENDING')).toBe(false);
    for (const state of ['REVIEWED', 'FOLLOWUP_RECOMMENDED', 'INSUFFICIENT_EVIDENCE', 'DUPLICATE_CANDIDATE', 'SUPERSEDED'] as const) {
      expect(isTerminalReviewState(state)).toBe(true);
    }
  });
});
