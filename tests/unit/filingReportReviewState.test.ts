// ---------------------------------------------------------------------------
// The human filing report is review-state aware, and has a production path.
//
// This is the artifact a person copies into Leslie or Pondr. Two failures
// matter more than anything else it does:
//
//   - a stale decision reading as a live one, which turns "somebody looked at
//     a different version months ago" into "somebody signed this off";
//   - a corrupt generation contributing a decision at all.
//
// So the four states are asserted to be textually disjoint, and the CURRENT
// heading is asserted to appear for CURRENT and for nothing else.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  FILING_REPORT_REVIEW_STATES,
  renderHumanFilingReport,
  type CurrentReviewArtifacts,
  type FilingReportReview,
  type FilingReportReviewState,
  type HumanFilingReportInput,
} from '../../src/core/findingReview';
import {
  CONTROL_CENTER_FILING_REPORT_VERSION,
  FILING_REPORT_DISTRIBUTION,
  buildFilingReport,
  filingReportReviewFor,
} from '../../src/controlCenter/authorities/filingReportAuthority';
import { ReviewStore, reviewIdentity } from '../../src/core/reviewStore';
import { currentReviewArtifacts, reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const CURRENT_HEADING = '## Local review (FACT: current local decision, not organizational sign-off)';
const STALE_HEADING = '## Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)';
const CORRUPT_HEADING = '## Local review (UNAVAILABLE — FAIL CLOSED)';
const ABSENT_HEADING = '## Local review (HUMAN DECISION REQUIRED)';

function baseInput(review: FilingReportReview | null): HumanFilingReportInput {
  return {
    title: 'Synthetic finding',
    candidateId: 'candidate/1',
    confidence: 'SUPPORTED',
    confidenceBasis: 'synthetic basis',
    expectationId: 'expectation/x',
    expectationProvenance: 'TEST_ORACLE',
    semanticContractId: null,
    classification: {
      severity: 'MAJOR',
      severityBasis: 'synthetic',
      catchStage: 'PR_REVIEW',
      catchStageBasis: 'synthetic',
      source: 'SELF_FOUND',
      sourceBasis: 'synthetic',
      team: 'UNKNOWN',
      teamEvidence: null,
    },
    reproduction: ['step'],
    expectedBehavior: 'expected',
    actualBehavior: 'actual',
    evidence: ['evidence'],
    relatedFindings: [],
    recurrence: 'FIRST_SEEN',
    defectClass: null,
    review,
    unknowns: [],
    privacyRedactions: [],
  };
}

const decided = (state: FilingReportReviewState): FilingReportReview => ({
  state,
  decision: 'ACCEPT_EVIDENCE',
  resultingState: 'REVIEWED',
  reviewedAt: '2026-09-05T00:00:00Z',
  rationale: 'a local reviewer looked at this',
});

const undecided = (state: FilingReportReviewState): FilingReportReview => ({
  state,
  decision: null,
  resultingState: null,
  reviewedAt: null,
  rationale: null,
});

test.describe('four review states render four ways', () => {
  test('the vocabulary is exactly the four states', () => {
    expect([...FILING_REPORT_REVIEW_STATES].sort()).toEqual(['CORRUPT', 'CURRENT', 'NO_REVIEW', 'STALE']);
  });

  test('a current review is shown as binding, with the full non-equivalence block', () => {
    const report = renderHumanFilingReport(baseInput(decided('CURRENT')));
    expect(report).toContain(CURRENT_HEADING);
    expect(report).toContain('- Decision: ACCEPT_EVIDENCE → REVIEWED');
    expect(report).toContain('This decision binds to the artifacts described in this report.');
    for (const line of ['a Leslie genuine verdict', 'a Leslie invalid verdict', 'a Pondr approval', 'organizational sign-off of any kind']) {
      expect(report, line).toContain(line);
    }
  });

  test('a stale review is never presented as current', () => {
    const report = renderHumanFilingReport(baseInput(decided('STALE')));
    expect(report).toContain(STALE_HEADING);
    expect(report).toContain('does not bind to the current artifact');
    expect(report).toContain('HUMAN REVIEW REQUIRED FOR THIS GENERATION');
    expect(report).toContain('Historical decision (NOT current): ACCEPT_EVIDENCE → REVIEWED');
    // The exact strings a current review uses must be absent.
    expect(report).not.toContain(CURRENT_HEADING);
    expect(report).not.toContain('- Decision: ACCEPT_EVIDENCE');
    expect(report).not.toContain('This decision binds to');
    // Evidence is preserved rather than destroyed, and it is labelled.
    expect(report).toContain('Historically reviewed at: 2026-09-05T00:00:00Z');
  });

  test('a corrupt review fails closed and names no decision', () => {
    const report = renderHumanFilingReport(baseInput(undecided('CORRUPT')));
    expect(report).toContain(CORRUPT_HEADING);
    expect(report).toContain('did not survive validation');
    expect(report).toContain('HUMAN DECISION REQUIRED');
    expect(report).not.toContain('ACCEPT_EVIDENCE');
    expect(report).not.toContain('REVIEWED');
  });

  test('no review at all remains a human decision', () => {
    for (const review of [null, undecided('NO_REVIEW')]) {
      const report = renderHumanFilingReport(baseInput(review));
      expect(report).toContain(ABSENT_HEADING);
      expect(report).toContain('No local review decision recorded.');
    }
  });

  test('the four headings are mutually exclusive', () => {
    const headings = [CURRENT_HEADING, STALE_HEADING, CORRUPT_HEADING, ABSENT_HEADING];
    const cases: readonly (FilingReportReview | null)[] = [decided('CURRENT'), decided('STALE'), undecided('CORRUPT'), null];
    for (const [index, review] of cases.entries()) {
      const report = renderHumanFilingReport(baseInput(review));
      const present = headings.filter((heading) => report.includes(heading));
      expect(present, `case ${index}`).toHaveLength(1);
    }
  });

  test('a state that names no decision may not carry one', () => {
    // The rule that stops a corrupt generation contributing a decision by
    // way of a caller that filled the fields in anyway.
    for (const state of ['CORRUPT', 'NO_REVIEW'] as const) {
      expect(() => renderHumanFilingReport(baseInput(decided(state))), state).toThrow(
        new RegExp(`FILING_REPORT_REVIEW_INVALID_FOR_STATE:${state}`)
      );
    }
    for (const state of ['CURRENT', 'STALE'] as const) {
      expect(() => renderHumanFilingReport(baseInput(undecided(state))), state).toThrow(
        new RegExp(`FILING_REPORT_REVIEW_INVALID_FOR_STATE:${state}`)
      );
    }
  });

  test('an unknown review state is refused rather than defaulted', () => {
    expect(() => renderHumanFilingReport(baseInput({ ...undecided('NO_REVIEW'), state: 'PROBABLY_FINE' as never }))).toThrow(
      /FILING_REPORT_INVALID:review.state/
    );
  });

  test('a missing semantic contract identity renders as UNKNOWN, never as blank', () => {
    expect(renderHumanFilingReport(baseInput(null))).toContain('Semantic contract: UNKNOWN');
    const named = renderHumanFilingReport({ ...baseInput(null), semanticContractId: 'contract/rounding' });
    expect(named).toContain('Semantic contract: `contract/rounding`');
  });
});

test.describe('the store-state mapping', () => {
  const envelope = {
    receipt: { decision: 'REQUEST_FOLLOWUP', reviewedAt: '2026-09-05T00:00:00Z', rationale: 'why' },
    record: { state: 'FOLLOWUP_RECOMMENDED' },
  } as never;

  const result = (state: string, withEnvelope: boolean, corruption: number = 0) =>
    ({
      state,
      envelope: withEnvelope ? envelope : null,
      staleReason: null,
      corruption: Array.from({ length: corruption }, () => ({ fileName: 'x', code: 'REVIEW_STORE_CORRUPT', detail: 'd' })),
      generations: [],
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    }) as never;

  test('each store state maps to its own report state', () => {
    expect(filingReportReviewFor(result('CURRENT', true)).state).toBe('CURRENT');
    expect(filingReportReviewFor(result('STALE', true)).state).toBe('STALE');
    expect(filingReportReviewFor(result('CORRUPT', false)).state).toBe('CORRUPT');
    expect(filingReportReviewFor(result('NO_REVIEW', false)).state).toBe('NO_REVIEW');
    expect(filingReportReviewFor(null).state).toBe('NO_REVIEW');
  });

  test('a decision-bearing state with no envelope fails closed rather than inventing one', () => {
    const mapped = filingReportReviewFor(result('CURRENT', false));
    expect(mapped.state).toBe('CORRUPT');
    expect(mapped.decision).toBeNull();
  });

  test('CORRUPT and NO_REVIEW never carry a decision', () => {
    for (const state of ['CORRUPT', 'NO_REVIEW']) {
      const mapped = filingReportReviewFor(result(state, false));
      expect([mapped.decision, mapped.resultingState, mapped.reviewedAt, mapped.rationale]).toEqual([null, null, null, null]);
    }
  });

  test('an empty rationale becomes null rather than an empty line', () => {
    const empty = { receipt: { decision: 'ACCEPT_EVIDENCE', reviewedAt: '2026-09-05T00:00:00Z', rationale: '' }, record: { state: 'REVIEWED' } };
    const mapped = filingReportReviewFor({ state: 'CURRENT', envelope: empty, staleReason: null, corruption: [], generations: [], organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' } as never);
    expect(mapped.rationale).toBeNull();
  });
});

test.describe('the production-local generation path', () => {
  const corpus = reviewerCorpus(6);
  const dossier = corpus[0] as CorpusFinding;
  const intel = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign/c1', limit: 6 }).findings.find(
    (finding) => finding.findingId === dossier.candidateId
  );

  function storeRoot(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-filing-'));
  }

  function current(): CurrentReviewArtifacts {
    return currentReviewArtifacts(dossier, { campaignId: 'campaign/c1' });
  }

  test('a finding with no stored review yields a human-decision report', () => {
    const store = new ReviewStore({ root: storeRoot() });
    const artifact = buildFilingReport({ dossier, intel: intel as never, storeState: store.read(dossier.candidateId, current()) });
    expect(artifact.schemaVersion).toBe(CONTROL_CENTER_FILING_REPORT_VERSION);
    expect(artifact.reviewState).toBe('NO_REVIEW');
    expect(artifact.markdown).toContain(ABSENT_HEADING);
    expect(artifact.distribution).toBe(FILING_REPORT_DISTRIBUTION);
    expect(artifact.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
  });

  test('a current stored review reaches the report as the binding decision', () => {
    const store = new ReviewStore({ root: storeRoot() });
    store.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: 'campaign/c1' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: '2026-09-05T10:00:00Z',
      storedAt: '2026-09-05T10:00:00Z',
      rationale: 'evidence is sufficient for local triage',
    });
    const artifact = buildFilingReport({ dossier, intel: intel as never, storeState: store.read(dossier.candidateId, current()) });
    expect(artifact.reviewState).toBe('CURRENT');
    expect(artifact.markdown).toContain(CURRENT_HEADING);
    expect(artifact.markdown).toContain('evidence is sufficient for local triage');
  });

  test('a review bound to a previous generation reaches the report as historical', () => {
    const store = new ReviewStore({ root: storeRoot() });
    store.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: 'campaign/c1' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: '2026-09-05T10:00:00Z',
      storedAt: '2026-09-05T10:00:00Z',
      rationale: 'reviewed against the previous dossier',
    });
    // The dossier is regenerated: same finding, different content digest.
    const regenerated = { ...dossier, contentDigest: `${dossier.contentDigest}-v2` } as CorpusFinding;
    const artifact = buildFilingReport({
      dossier: regenerated,
      intel: intel as never,
      storeState: store.read(regenerated.candidateId, currentReviewArtifacts(regenerated, { campaignId: 'campaign/c1' })),
    });
    expect(artifact.reviewState).toBe('STALE');
    expect(artifact.markdown).toContain(STALE_HEADING);
    expect(artifact.markdown).not.toContain(CURRENT_HEADING);
    expect(artifact.markdown).toContain('a human decision is required for it');
  });

  test('a corrupt generation is named in the unknowns even when a valid one is used', () => {
    const root = storeRoot();
    const store = new ReviewStore({ root });
    store.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: 'campaign/c1' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: '2026-09-05T10:00:00Z',
      storedAt: '2026-09-05T10:00:00Z',
      rationale: 'valid generation',
    });
    // A second generation for the SAME finding, planted corrupt.
    const other = { ...dossier, contentDigest: `${dossier.contentDigest}-other` } as CorpusFinding;
    store.putDecision({
      binding: reviewBindingFor(other, { campaignId: 'campaign/c1' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: '2026-09-05T10:00:01Z',
      storedAt: '2026-09-05T10:00:01Z',
      rationale: 'about to be corrupted',
    });
    // Corrupt the generation that does NOT bind to `dossier`, so a VALID
    // sibling survives and the report has something current to use.
    const bindingIdentity = reviewIdentity(reviewBindingFor(dossier, { campaignId: 'campaign/c1' }));
    const doomed = fs
      .readdirSync(root)
      .filter((name) => name.startsWith('review.') && !name.includes(bindingIdentity))
      .sort();
    expect(doomed).toHaveLength(1);
    fs.writeFileSync(path.join(root, doomed[0] as string), '{"broken":', { mode: 0o600 });
    const artifact = buildFilingReport({ dossier, intel: intel as never, storeState: store.read(dossier.candidateId, current()) });
    expect(artifact.reviewState).toBe('CURRENT');
    expect(artifact.markdown).toContain('did not survive validation and were excluded');
  });

  test('the report states what the local projection withheld rather than describing it', () => {
    const store = new ReviewStore({ root: storeRoot() });
    const artifact = buildFilingReport({ dossier, intel: intel as never, storeState: store.read(dossier.candidateId, current()) });
    expect(artifact.markdown).toContain('Concrete steps are held in the owner-local dossier and are not projected here.');
    expect(artifact.markdown).toContain('are withheld by the owner-local findings projection');
    expect(artifact.markdown).toContain('PRIVATE/LOCAL artifact. No automatic external submission exists for this report.');
  });

  test('generation is deterministic and free of forbidden values', () => {
    const store = new ReviewStore({ root: storeRoot() });
    const state = store.read(dossier.candidateId, current());
    const first = buildFilingReport({ dossier, intel: intel as never, storeState: state });
    const second = buildFilingReport({ dossier, intel: intel as never, storeState: state });
    expect(second.markdown).toBe(first.markdown);
    for (const sentinel of ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'Bearer ', 'AKIA', '@example.com']) {
      expect(first.markdown, sentinel).not.toContain(sentinel);
    }
  });

  test('the report cone imports no external client', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'controlCenter', 'authorities', 'filingReportAuthority.ts'),
      'utf8'
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const forbidden of ['node:http', 'node:https', 'node:net', 'node:child_process', 'node:fs', 'fetch(', 'slack', 'leslie', 'pondr', 'notion']) {
      expect(code.toLowerCase(), forbidden).not.toContain(forbidden.toLowerCase());
    }
  });
});
