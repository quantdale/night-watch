// ---------------------------------------------------------------------------
// Historical identity propagation into finding history.
//
// Three things the predecessor left unfinished, and one it left wrong:
//
// - `IntelHistoryEntry` could not carry an expectation or semantic-contract
//   identity, so recurrence reasoned over fingerprints alone.
// - The reviewer authority pushed `sourceSha: '0'.repeat(40)` into every
//   entry, in two places. Forty zeroes satisfies the SHA pattern and reads as
//   a real commit.
// - The regression-candidate rule's "moved source lineage" requirement was a
//   conjunct its own validator had already proven true (DEF-RO-2).
//
// The fabricated SHA is the interesting one. It reached NO output: the
// authority always writes `priorOutcome: 'UNKNOWN'`, so `classifyRecurrence`
// never takes the branch that quotes a source SHA. A behavioural test could
// not see it, which is how it survived a campaign that certified this cone.
// That is why `findingHistoryEntry` is exported and tested directly here, and
// why hardening pins the literal out of the cone as well.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { findingHistoryEntry, reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { CONTROL_CENTER_REVIEW_NO_SOURCE, reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { groupDefectClasses } from '../../src/core/findingIntel';
import type { IntelFindingDescriptor } from '../../src/core/findingIntel';
import { reviewerCorpus, withoutIdentities, type CorpusFinding } from '../helpers/reviewerCorpus';

const REAL_SHA = 'c'.repeat(40);

function descriptor(overrides: Partial<IntelFindingDescriptor> = {}): IntelFindingDescriptor {
  return {
    findingId: 'finding/1',
    fingerprint: 'fp:sha256:aaaaaaaaaaaa',
    expectationId: null,
    semanticContractId: null,
    failureSignature: null,
    route: null,
    sourceLineage: null,
    replayOutcome: null,
    ...overrides,
  };
}

test.describe('finding history carries real identity, or none', () => {
  test('the source identity is the one supplied, never a fabricated commit', () => {
    const entry = findingHistoryEntry(descriptor(), 'campaign/c1', REAL_SHA, 1000);
    expect(entry.sourceSha).toBe(REAL_SHA);
    expect(entry.sourceSha).not.toBe('0'.repeat(40));
  });

  test('an absent source identity is the named absence the review binding records', () => {
    // Not a second literal. The same one, imported from the module that owns
    // it, so a history entry and a review binding cannot disagree about what
    // was observed.
    const entry = findingHistoryEntry(descriptor(), 'campaign/c1', CONTROL_CENTER_REVIEW_NO_SOURCE, 1000);
    expect(entry.sourceSha).toBe('synthetic.no-source-evidence');
    const binding = reviewBindingFor(reviewerCorpus(1)[0] as CorpusFinding, { campaignId: 'campaign/c1' });
    expect(binding.sourceSha).toBe(entry.sourceSha);
  });

  test('expectation and semantic-contract identity are carried, and null stays null', () => {
    const carried = findingHistoryEntry(
      descriptor({ expectationId: 'expectation/x', semanticContractId: 'contract/y' }),
      'campaign/c1',
      REAL_SHA,
      1000
    );
    expect(carried.expectationId).toBe('expectation/x');
    expect(carried.semanticContractId).toBe('contract/y');
    const bare = findingHistoryEntry(descriptor(), 'campaign/c1', REAL_SHA, 1000);
    expect(bare.expectationId).toBeNull();
    expect(bare.semanticContractId).toBeNull();
  });

  test('a history entry never claims a prior outcome', () => {
    // Nightwatch observes; it does not learn that a defect was remediated.
    // RESOLVED_FIXED is the only remediation evidence recurrence accepts, and
    // nothing in this cone may produce it.
    for (const identity of [{}, { expectationId: 'expectation/x' }, { semanticContractId: 'contract/y' }]) {
      expect(findingHistoryEntry(descriptor(identity), 'campaign/c1', REAL_SHA, 1000).priorOutcome).toBe('UNKNOWN');
    }
  });

  test('the fabricated forty-zero source SHA is gone from the cone', () => {
    // Occurrence-complete over the file, not a sample: the value appeared
    // TWICE, and a rule that found one occurrence would have reported the
    // other repaired.
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'controlCenter', 'authorities', 'reviewerAuthority.ts'),
      'utf8'
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toContain("'0'.repeat(40)");
    expect(code).not.toMatch(/0{40}/);
    // And the single resolution is shared rather than duplicated.
    expect(code.split('CONTROL_CENTER_REVIEW_NO_SOURCE').length - 1).toBeGreaterThanOrEqual(2);
  });

  test('the exported builder is the one the authority actually calls', () => {
    // Definition/invocation parity. An exported helper that the production
    // path does not call is a helper that proves nothing about production.
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'controlCenter', 'authorities', 'reviewerAuthority.ts'),
      'utf8'
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const calls = code.split('findingHistoryEntry(').length - 1;
    // One definition plus both accumulation sites: off-page and on-page.
    expect(calls).toBe(3);
  });
});

test.describe('identity propagation changes what recurrence can conclude', () => {
  const corpus = reviewerCorpus(120);

  test('a contradicting expectation on a shared fingerprint is visible end to end', () => {
    // The corpus family SAME_FINGERPRINT_DIFFERENT_EXPECTATION exists exactly
    // for this. With identities reaching history, those pairs stop reading as
    // recurrences of each other.
    const withIdentity = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign/c1', limit: 120 });
    const withoutIdentity = reviewerInputsFromFindings({ dossiers: withoutIdentities(corpus), campaignId: 'campaign/c1', limit: 120 });
    const count = (input: ReturnType<typeof reviewerInputsFromFindings>, value: string): number =>
      input.findings.filter((finding) => finding.recurrence?.recurrence === value).length;
    // Every finding is still classified; nothing was pushed into
    // UNKNOWN_HISTORY to make the numbers look better.
    expect(count(withIdentity, 'UNKNOWN_HISTORY')).toBe(count(withoutIdentity, 'UNKNOWN_HISTORY'));
    // The whole corpus shares one campaign, so a surviving fingerprint match
    // reads KNOWN_EXISTING. Measured at 120: 30 matches become 15, and the
    // 15 that fall away are exactly family D, whose members share a
    // fingerprint and carry contradicting expectations.
    const matchedBefore = count(withoutIdentity, 'KNOWN_EXISTING') + count(withoutIdentity, 'RECURRENT');
    const matchedAfter = count(withIdentity, 'KNOWN_EXISTING') + count(withIdentity, 'RECURRENT');
    expect(matchedAfter).toBeLessThan(matchedBefore);
    expect(count(withIdentity, 'FIRST_SEEN')).toBe(count(withoutIdentity, 'FIRST_SEEN') + (matchedBefore - matchedAfter));
    // Nothing is lost: every finding still has exactly one classification.
    expect(count(withIdentity, 'FIRST_SEEN') + matchedAfter).toBe(corpus.length);
  });

  test('no recurrence answer is upgraded by identity evidence', () => {
    // The rule is tightened, never loosened: identity can only remove a
    // match, never create one.
    const withIdentity = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign/c1', limit: 120 });
    const withoutIdentity = reviewerInputsFromFindings({ dossiers: withoutIdentities(corpus), campaignId: 'campaign/c1', limit: 120 });
    const rank: Record<string, number> = { FIRST_SEEN: 0, UNKNOWN_HISTORY: 0, RECURRENT: 1, KNOWN_EXISTING: 1, REGRESSION_CANDIDATE: 2 };
    for (const [index, finding] of withIdentity.findings.entries()) {
      const before = withoutIdentity.findings[index];
      expect(finding.findingId).toBe(before?.findingId);
      const after = rank[finding.recurrence?.recurrence ?? 'UNKNOWN_HISTORY'] ?? 0;
      const prior = rank[before?.recurrence?.recurrence ?? 'UNKNOWN_HISTORY'] ?? 0;
      expect(after, finding.findingId).toBeLessThanOrEqual(prior);
    }
  });

  test('no reviewer output claims a regression, because no prior fix is ever recorded', () => {
    const projected = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign/c1', limit: 120 });
    expect(projected.findings.some((finding) => finding.recurrence?.recurrence === 'REGRESSION_CANDIDATE')).toBe(false);
  });
});

test.describe('defect-class evidence over historical identity (brief section 29)', () => {
  const member = (overrides: Partial<Parameters<typeof groupDefectClasses>[0][number]>) => ({
    findingId: 'finding/x',
    semanticContractId: null,
    expectationId: null,
    sourceScope: 'scope/a',
    replayOutcome: 'FAILURE' as const,
    ...overrides,
  });

  test('the same invariant across campaigns forms one class', () => {
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1', semanticContractId: 'contract/rounding' }),
      member({ findingId: 'finding/2', semanticContractId: 'contract/rounding' }),
    ]);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.memberFindingIds).toEqual(['finding/1', 'finding/2']);
  });

  test('the same invariant after source movement stays one class, and says the scope spans', () => {
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1', semanticContractId: 'contract/rounding', sourceScope: 'scope/old' }),
      member({ findingId: 'finding/2', semanticContractId: 'contract/rounding', sourceScope: 'scope/new' }),
    ]);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.sourceScope).toBe('MULTI_SCOPE:scope/new+scope/old');
    expect(classes[0]?.unknowns.join(' ')).toContain('shared cause unproven across scopes');
  });

  test('a different invariant with the same fingerprint does NOT merge', () => {
    // Fingerprints are not an input to grouping at all, which is the point:
    // a textual or hash similarity can never collapse two invariants.
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1', semanticContractId: 'contract/rounding' }),
      member({ findingId: 'finding/2', semanticContractId: 'contract/allocation' }),
    ]);
    expect(classes).toEqual([]);
  });

  test('the same fingerprint with a different expectation does NOT merge', () => {
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1', expectationId: 'expectation/a' }),
      member({ findingId: 'finding/2', expectationId: 'expectation/b' }),
    ]);
    expect(classes).toEqual([]);
  });

  test('a finding with no identity joins no class rather than a catch-all one', () => {
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1' }),
      member({ findingId: 'finding/2' }),
      member({ findingId: 'finding/3', semanticContractId: 'contract/rounding' }),
      member({ findingId: 'finding/4', semanticContractId: 'contract/rounding' }),
    ]);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.memberFindingIds).toEqual(['finding/3', 'finding/4']);
  });

  test('the contract identity wins over the expectation identity when both exist', () => {
    const classes = groupDefectClasses([
      member({ findingId: 'finding/1', semanticContractId: 'contract/one', expectationId: 'expectation/shared' }),
      member({ findingId: 'finding/2', semanticContractId: 'contract/two', expectationId: 'expectation/shared' }),
    ]);
    expect(classes).toEqual([]);
  });
});
