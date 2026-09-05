// RS-1 reviewer projection.
//
// FC-1 certified the finding intelligence and left it reachable only through
// the human filing report. This suite covers the projection that puts it on
// the Control Center surface, and it is written against the three ways such a
// surface goes wrong:
//
//   1. it invents a classification the cones did not produce;
//   2. it renders an advisory suggestion as a fact, or UNKNOWN as a weak yes;
//   3. it carries a value across the privacy boundary.
//
// Pure module tests: no server, no browser, no network.

import { test, expect } from '@playwright/test';
import { classifyRelationship, type RelationshipResult } from '../../src/core/findingIntel';
import {
  projectReviewer,
  ReviewerProjectionError,
  type ReviewerFindingInput,
} from '../../src/controlCenter/adapters/reviewerAdapter';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import type { FindingsDossierMetadata } from '../../src/controlCenter/authorities/findingsAuthority';

const FP_A = 'fp:sha256:aaaaaaaaaaaa';
const FP_B = 'fp:sha256:bbbbbbbbbbbb';

function descriptor(id: string, fingerprint: string | null, expectationId: string | null = null) {
  return {
    findingId: id,
    fingerprint,
    expectationId,
    semanticContractId: null,
    failureSignature: null,
    route: null,
    sourceLineage: null,
    replayOutcome: null,
  } as const;
}

function baseFinding(overrides: Partial<ReviewerFindingInput> = {}): ReviewerFindingInput {
  return {
    findingId: 'finding-1',
    relationship: null,
    probableDuplicates: [],
    recurrence: null,
    defectClass: null,
    expectationProvenance: 'MACHINE_CONTRACT',
    confidence: 'HIGH_CONFIDENCE',
    alphausRecommendation: {
      severity: 'MAJOR',
      severityBasis: 'DOSSIER_TECHNICAL_SEVERITY',
      catchStage: 'PR_REVIEW',
      catchStageBasis: 'LOCAL_PRE_REVIEW_OBSERVATION',
      source: 'SELF_FOUND',
      sourceBasis: 'NIGHTWATCH_LOCAL_DISCOVERY',
      team: 'UNKNOWN',
      teamEvidence: null,
    },
    localReview: null,
    unknowns: [],
    ...overrides,
  };
}

function only(input: ReviewerFindingInput) {
  const dto = projectReviewer({ findings: [input] });
  expect(dto.items).toHaveLength(1);
  return dto.items[0]!;
}

test.describe('epistemic classification', () => {
  test('an advisory relationship is a RECOMMENDATION, never a FACT', () => {
    const relationship = classifyRelationship(descriptor('b', FP_A), descriptor('a', FP_A));
    expect(relationship.relationship).toBe('PROBABLE_DUPLICATE');
    expect(relationship.advisoryOnly).toBe(true);

    const item = only(baseFinding({ relationship }));
    expect(item.relationship.epistemicClass).toBe('RECOMMENDATION');
    expect(item.relationship.value?.finalVerdictAuthority).toBe('HUMAN_ORGANIZATIONAL');
  });

  test('a relationship stripped of its advisory marking is rejected, not promoted', () => {
    // The failure this guards: an upstream change drops advisoryOnly and the
    // surface silently starts presenting a suggestion as a verdict.
    const relationship = {
      ...classifyRelationship(descriptor('b', FP_A), descriptor('a', FP_A)),
      advisoryOnly: false,
    } as unknown as RelationshipResult;
    expect(() => only(baseFinding({ relationship }))).toThrow(/relationship\.advisoryOnly/);
  });

  test('an UNKNOWN relationship carries no advisory pointer', () => {
    const relationship = classifyRelationship(descriptor('b', null), descriptor('a', null));
    expect(relationship.relationship).toBe('UNKNOWN');
    const item = only(baseFinding({ relationship }));
    expect(item.relationship.epistemicClass).toBe('UNKNOWN');
    expect(item.relationship.value).toBeNull();
  });

  test('INSUFFICIENT confidence renders as UNKNOWN, not as low confidence', () => {
    const item = only(baseFinding({ confidence: 'INSUFFICIENT' }));
    expect(item.confidence.epistemicClass).toBe('UNKNOWN');
    expect(item.confidence.value).toBeNull();
  });

  test('UNKNOWN provenance renders as UNKNOWN', () => {
    const item = only(baseFinding({ expectationProvenance: 'UNKNOWN' }));
    expect(item.expectationProvenance.epistemicClass).toBe('UNKNOWN');
  });

  test('recurrence derived from chronology is a FACT; absent history is UNKNOWN', () => {
    const recurrent = only(
      baseFinding({
        recurrence: {
          schemaVersion: 'nightwatch.finding-intel.v1',
          recurrence: 'RECURRENT',
          evidence: ['SAME_FINGERPRINT'],
          priorFindingId: 'finding-0',
        },
      })
    );
    expect(recurrent.recurrence.epistemicClass).toBe('FACT');

    const unknown = only(
      baseFinding({
        recurrence: {
          schemaVersion: 'nightwatch.finding-intel.v1',
          recurrence: 'UNKNOWN_HISTORY',
          evidence: ['NO_HISTORY_AVAILABLE'],
          priorFindingId: null,
        },
      })
    );
    expect(unknown.recurrence.epistemicClass).toBe('UNKNOWN');
    expect(unknown.recurrence.value).toBeNull();
  });

  test('every element is exactly one of FACT, RECOMMENDATION, UNKNOWN', () => {
    const item = only(baseFinding());
    for (const element of [
      item.relationship,
      item.recurrence,
      item.defectClass,
      item.expectationProvenance,
      item.confidence,
      item.localReview,
      item.alphausRecommendation.severity,
      item.alphausRecommendation.catchStage,
      item.alphausRecommendation.source,
      item.alphausRecommendation.team,
    ]) {
      expect(['FACT', 'RECOMMENDATION', 'UNKNOWN']).toContain(element.epistemicClass);
      // The contract's load-bearing pairing: UNKNOWN has no value, and a
      // value-bearing element is never UNKNOWN.
      if (element.epistemicClass === 'UNKNOWN') expect(element.value).toBeNull();
      else expect(element.value).not.toBeNull();
    }
  });
});

test.describe('local review is never organizational sign-off', () => {
  const record = { lifecycleVersion: 'nightwatch.finding-review-lifecycle.v1', state: 'REVIEWED', binding: {}, transitionCount: 1, lastReasonCode: null } as never;
  const receipt = {
    schemaVersion: 'nightwatch.finding-review-receipt.v1',
    reviewId: 'review-1',
    binding: {},
    decision: 'ACCEPT_EVIDENCE',
    resultingState: 'REVIEWED',
    reviewedAt: '2026-09-05T00:00:00.000Z',
    rationale: 'synthetic',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'],
  } as never;

  test('a current review is a FACT about the local decision only', () => {
    const item = only(baseFinding({ localReview: { record, receipt, bindingCurrentness: 'CURRENT' } }));
    expect(item.localReview.epistemicClass).toBe('FACT');
    expect(item.localReview.value?.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    expect(item.localReview.value?.notEquivalentTo).toEqual(['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED']);
  });

  test('a stale binding is shown as UNKNOWN, never as a live decision', () => {
    const item = only(baseFinding({ localReview: { record, receipt, bindingCurrentness: 'STALE' } }));
    expect(item.localReview.epistemicClass).toBe('UNKNOWN');
  });

  test('a receipt claiming organizational authority never reaches the surface', () => {
    const escalated = { ...(receipt as unknown as Record<string, unknown>), organizationalAuthority: 'LESLIE_GENUINE' } as never;
    expect(() => only(baseFinding({ localReview: { record, receipt: escalated, bindingCurrentness: 'CURRENT' } }))).toThrow(
      /localReview\.receipt\.organizationalAuthority/
    );
  });

  test('the payload restates both authority limits', () => {
    const dto = projectReviewer({ findings: [baseFinding()] });
    expect(dto.finalVerdictAuthority).toBe('HUMAN_ORGANIZATIONAL');
    expect(dto.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
  });
});

test.describe('the projection invents nothing', () => {
  test('a missing required input fails closed rather than defaulting', () => {
    for (const field of ['relationship', 'probableDuplicates', 'recurrence', 'defectClass', 'localReview'] as const) {
      const input = { ...baseFinding() } as Record<string, unknown>;
      delete input[field];
      expect(() => projectReviewer({ findings: [input as unknown as ReviewerFindingInput] }), field).toThrow(
        ReviewerProjectionError
      );
    }
  });

  test('a value outside the cone vocabulary is refused', () => {
    expect(() => only(baseFinding({ confidence: 'VERY_SURE' }))).toThrow(/confidence/);
    expect(() => only(baseFinding({ expectationProvenance: 'VIBES' }))).toThrow(/expectationProvenance/);
  });

  test('a team name without evidence is never projected', () => {
    const withTeam = baseFinding();
    expect(() =>
      only({ ...withTeam, alphausRecommendation: { ...withTeam.alphausRecommendation, team: 'Billing' } })
    ).toThrow(/teamEvidence/);
  });

  test('a duplicate suggestion without a subject is not a suggestion', () => {
    const orphan = { ...classifyRelationship(descriptor('b', FP_A), descriptor('a', FP_A)), possibleOriginalId: null } as RelationshipResult;
    expect(() => only(baseFinding({ probableDuplicates: [orphan] }))).toThrow(/possibleOriginalId/);
  });
});

test.describe('privacy boundary', () => {
  const SENTINELS = [
    'CUSTOMER_SENTINEL',
    'ACCOUNT_SENTINEL',
    'EMAIL_SENTINEL',
    'COST_SENTINEL',
    'TOKEN_SENTINEL',
    'Bearer abc123',
    'eyJhbGciOiJIUzI1.x',
    'AKIAIOSFODNN7EXAMPLE',
    'reviewer@example.com',
  ];

  test('a planted sentinel is rejected in every free field, and never echoed', () => {
    for (const sentinel of SENTINELS) {
      for (const mutate of [
        (input: ReviewerFindingInput) => ({ ...input, findingId: sentinel }),
        (input: ReviewerFindingInput) => ({
          ...input,
          alphausRecommendation: { ...input.alphausRecommendation, team: sentinel, teamEvidence: 'PROVEN' },
        }),
        (input: ReviewerFindingInput) => ({
          ...input,
          alphausRecommendation: { ...input.alphausRecommendation, severityBasis: sentinel },
        }),
      ]) {
        let thrown: unknown;
        try {
          only(mutate(baseFinding()));
        } catch (error) {
          thrown = error;
        }
        expect(thrown, sentinel).toBeInstanceOf(Error);
        // The error path is a privacy surface too: it names the field, never
        // the value that was rejected.
        expect(String((thrown as Error).message)).not.toContain(sentinel);
      }
    }
  });
});

test.describe('authority over a real findings snapshot', () => {
  function dossier(id: string, fingerprint: string, observed: string): FindingsDossierMetadata {
    return {
      schemaVersion: 'nightwatch.control-center-findings-dossier.v1',
      status: 'READY',
      candidateId: id,
      title: null,
      firstObserved: observed,
      lastObserved: observed,
      routeClass: 'billing/list',
      oracleFingerprint: fingerprint,
      evidenceLevel: 'L2',
      reproduction: { result: 'REPRODUCED', count: 3, minimalityGuarantee: 'BOUNDED_MINIMAL' },
      technicalSeverity: 'HIGH',
      triagePriority: 'P2',
      confidence: { level: 'HIGH' },
      sourceCurrentness: 'CURRENT',
      semanticFinding: true,
    } as unknown as FindingsDossierMetadata;
  }

  test('two dossiers sharing a fingerprint yield a duplicate suggestion, not a verdict', () => {
    const inputs = reviewerInputsFromFindings({
      dossiers: [dossier('f-1', FP_A, '2026-09-01T00:00:00.000Z'), dossier('f-2', FP_A, '2026-09-02T00:00:00.000Z')],
      campaignId: 'campaign-1',
    });
    const dto = projectReviewer({ findings: inputs });
    const later = dto.items.find((item) => item.findingId === 'f-2');
    expect(later?.relationship.epistemicClass).toBe('RECOMMENDATION');
    expect(later?.relationship.value?.relationship).toBe('PROBABLE_DUPLICATE');
    expect(later?.probableDuplicates.map((row) => row.findingId)).toEqual(['f-1']);
    expect(later?.probableDuplicates[0]?.advisoryOnly).toBe(true);
    // Recurrence is derived from the same chronology, mechanically.
    expect(later?.recurrence.value?.recurrence).toBe('KNOWN_EXISTING');
  });

  test('distinct fingerprints yield no duplicate suggestion', () => {
    const inputs = reviewerInputsFromFindings({
      dossiers: [dossier('f-1', FP_A, '2026-09-01T00:00:00.000Z'), dossier('f-2', FP_B, '2026-09-02T00:00:00.000Z')],
      campaignId: 'campaign-1',
    });
    const dto = projectReviewer({ findings: inputs });
    for (const item of dto.items) expect(item.probableDuplicates).toEqual([]);
  });

  test('above the pairwise limit, relationships are UNKNOWN with a stated reason', () => {
    // The surface degrades to UNKNOWN rather than stalling, and says why.
    const inputs = reviewerInputsFromFindings({
      dossiers: [dossier('f-1', FP_A, '2026-09-01T00:00:00.000Z'), dossier('f-2', FP_A, '2026-09-02T00:00:00.000Z')],
      campaignId: 'campaign-1',
      pairwiseLimit: 1,
    });
    const dto = projectReviewer({ findings: inputs });
    for (const item of dto.items) {
      expect(item.relationship.epistemicClass).toBe('UNKNOWN');
      expect(item.unknowns).toContain('RELATIONSHIP_NOT_ANALYSED_ABOVE_PAIRWISE_LIMIT');
    }
  });

  test('local review is UNKNOWN while no review store exists, and says so', () => {
    const inputs = reviewerInputsFromFindings({
      dossiers: [dossier('f-1', FP_A, '2026-09-01T00:00:00.000Z')],
      campaignId: 'campaign-1',
    });
    const dto = projectReviewer({ findings: inputs });
    expect(dto.items[0]?.localReview.epistemicClass).toBe('UNKNOWN');
    expect(dto.items[0]?.unknowns).toContain('NO_LOCAL_REVIEW_STORE');
  });

  test('the projection is deterministic and order-independent', () => {
    const a = dossier('f-1', FP_A, '2026-09-01T00:00:00.000Z');
    const b = dossier('f-2', FP_B, '2026-09-02T00:00:00.000Z');
    const forward = JSON.stringify(projectReviewer({ findings: reviewerInputsFromFindings({ dossiers: [a, b], campaignId: 'c' }) }));
    const reverse = JSON.stringify(projectReviewer({ findings: reviewerInputsFromFindings({ dossiers: [b, a], campaignId: 'c' }) }));
    expect(reverse).toBe(forward);
  });

  test('an empty snapshot is EMPTY and an unavailable one is UNAVAILABLE', () => {
    expect(projectReviewer({ findings: [] }).state).toBe('EMPTY');
    expect(projectReviewer({ findings: [], available: false }).state).toBe('UNAVAILABLE');
  });
});
