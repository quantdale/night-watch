// Human-copyable filing report: fact/recommendation/unknown separation,
// team-unknown rule, sentinel rejection, determinism. Synthetic only.

import { test, expect } from '@playwright/test';
import { renderHumanFilingReport, type HumanFilingReportInput } from '../../src/core/findingReview/index';

function input(overrides: Partial<HumanFilingReportInput> = {}): HumanFilingReportInput {
  return {
    title: 'Synthetic invoice total mismatch',
    candidateId: 'candidate:sha256:cccccccccccccccccccccccc',
    confidence: 'HIGH',
    confidenceBasis: 'reproduced twice with reliable oracle',
    expectationId: 'expectation/invoice-total',
    expectationProvenance: 'TEST_ORACLE',
    classification: {
      severity: 'UNKNOWN',
      severityBasis: 'impact ambiguous in synthetic fixture',
      catchStage: 'UNKNOWN',
      catchStageBasis: 'local observation is not NEXT or production',
      source: 'self_found',
      sourceBasis: 'independently discovered by Nightwatch',
      team: 'UNKNOWN',
      teamEvidence: null,
    },
    reproduction: ['open the synthetic invoice view', 'observe the total row'],
    expectedBehavior: 'total equals the sum of synthetic lines',
    actualBehavior: 'total renders empty',
    evidence: ['sanitized signature sig/total-mismatch', 'replay FAILURE x2'],
    relatedFindings: ['finding/earlier (PROBABLE_DUPLICATE, advisory)'],
    recurrence: 'FIRST_SEEN in 0 history entries',
    defectClass: null,
    review: {
      decision: 'ACCEPT_EVIDENCE',
      resultingState: 'REVIEWED',
      reviewedAt: '2026-09-05T00:00:00Z',
      rationale: 'synthetic review',
    },
    unknowns: ['customer impact unproven'],
    privacyRedactions: ['none required for this synthetic report'],
    ...overrides,
  };
}

test.describe('human filing report', () => {
  test('renders all sections with fact/recommendation/unknown labels', () => {
    const report = renderHumanFilingReport(input());
    for (const heading of [
      '## Observed impact (FACT)',
      '## Expected behavior (FACT: expectation claim)',
      '## Suggested Alphaus classification (RECOMMENDATION — human decides)',
      '## Reproduction (FACT)',
      '## Sanitized evidence (FACT)',
      '## Related findings (ADVISORY)',
      '## Recurrence (MECHANICAL DERIVATION)',
      '## Defect class (ADVISORY)',
      '## Local review (FACT: local decision, not organizational sign-off)',
      '## Unknowns (UNKNOWN — human judgment required)',
      '## Privacy (FACT)',
    ]) {
      expect(report).toContain(heading);
    }
    expect(report).toContain('NOT a Leslie genuine/invalid verdict');
    expect(report).toContain('No automatic external submission');
    expect(report).toContain('Team: UNKNOWN (no team evidence; left UNKNOWN)');
  });

  test('team without evidence is rejected; proven team renders with evidence', () => {
    expect(() =>
      renderHumanFilingReport(input({ classification: { ...input().classification, team: 'billing-team', teamEvidence: null } })),
    ).toThrow(/TEAM_WITHOUT_EVIDENCE/);
    const proven = renderHumanFilingReport(
      input({ classification: { ...input().classification, team: 'billing-team', teamEvidence: 'owning manifest manifest:sha256:abc' } }),
    );
    expect(proven).toContain('Team: billing-team — evidence: owning manifest');
  });

  test('sentinels anywhere in the report are rejected', () => {
    expect(() => renderHumanFilingReport(input({ actualBehavior: 'leaked AKIAIOSFODNN7EXAMPLE value' }))).toThrow(/FILING_REPORT_INVALID/);
    expect(() => renderHumanFilingReport(input({ evidence: ['clean', 'contact bob@example.com'] }))).toThrow(/FILING_REPORT_INVALID/);
    expect(() => renderHumanFilingReport(input({ unknowns: [] }))).not.toThrow();
  });

  // Exhaustive, not representative: the report concatenates every field into
  // one copyable document, so a single unscanned field leaks. Mutation probe
  // M33 previously survived by unscanning `severity`, a field no test touched.
  test('every scalar field is sentinel-scanned', () => {
    const sentinel = 'leaked AKIAIOSFODNN7EXAMPLE value';
    for (const field of [
      'title', 'candidateId', 'confidence', 'confidenceBasis',
      'expectationId', 'expectationProvenance', 'expectedBehavior',
      'actualBehavior', 'recurrence', 'defectClass',
    ] as const) {
      expect(() => renderHumanFilingReport(input({ [field]: sentinel })), field)
        .toThrow(/FILING_REPORT_INVALID/);
    }
    for (const field of [
      'severity', 'severityBasis', 'catchStage', 'catchStageBasis',
      'source', 'sourceBasis',
    ] as const) {
      expect(() => renderHumanFilingReport(input({
        classification: { ...input().classification, [field]: sentinel },
      })), `classification.${field}`).toThrow(/FILING_REPORT_INVALID/);
    }
    // A proven team and its evidence are rendered verbatim; both are scanned.
    expect(() => renderHumanFilingReport(input({
      classification: { ...input().classification, team: sentinel, teamEvidence: 'CODEOWNERS entry' },
    }))).toThrow(/FILING_REPORT_INVALID/);
    expect(() => renderHumanFilingReport(input({
      classification: { ...input().classification, team: 'billing', teamEvidence: sentinel },
    }))).toThrow(/FILING_REPORT_INVALID/);
    // The review block is reviewer-authored free text; it is scanned too.
    for (const field of ['decision', 'resultingState', 'reviewedAt', 'rationale'] as const) {
      expect(() => renderHumanFilingReport(input({
        review: { ...input().review!, [field]: sentinel },
      })), `review.${field}`).toThrow(/FILING_REPORT_INVALID/);
    }
  });

  test('every list field is sentinel-scanned', () => {
    const sentinel = 'contact bob@example.com';
    for (const field of ['reproduction', 'evidence', 'relatedFindings', 'unknowns', 'privacyRedactions'] as const) {
      expect(() => renderHumanFilingReport(input({ [field]: ['clean entry', sentinel] })), field)
        .toThrow(/FILING_REPORT_INVALID/);
    }
  });

  test('rendering is deterministic', () => {
    expect(renderHumanFilingReport(input())).toBe(renderHumanFilingReport(input()));
  });
});
