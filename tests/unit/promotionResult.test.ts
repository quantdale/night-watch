import { test, expect } from '@playwright/test';
import {
  PROMOTION_RESULT_VERSION,
  buildSemanticAwarePromotionResult,
  validateSemanticAwarePromotionResult,
  semanticPromotionEligible,
  stablePromotionResultJson,
  promotionReplayEvidenceFromOutcome,
  dossierTargetForClusterKind,
  currentnessFromSemanticTriage,
  currentnessFromCampaignSemantic,
  currentnessFromSourceFreshness,
  currentnessBlocksHighReadiness,
  type SemanticAwarePromotionResult,
  type SemanticAwarePromotionResultInput,
} from '../../src/core/triage/promotionResult';
import type { SemanticTriageSourceCurrentness } from '../../src/core/triage/semanticTriageEvidence';
import type { CampaignSemanticCurrentness } from '../../src/core/campaign/campaignSemanticEvidence';
import type { SourceFreshness } from '../../src/core/triage/types';

function baseInput(overrides: Partial<SemanticAwarePromotionResultInput> = {}): SemanticAwarePromotionResultInput {
  return {
    clusterId: 'clu:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    clusterKind: 'SEMANTIC',
    candidateId: 'candidate:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
    replayStatus: 'PASS',
    replayPhase: 'FRESH_EXACT_REPLAY',
    minimization: 'MINIMALITY_PROVEN',
    confidence: 'HIGH',
    confidenceBlockers: [],
    readiness: 'READY',
    readinessReasonCodes: [],
    sourceCurrentness: 'CURRENT',
    dossierVersionTarget: 'nightwatch.bug-dossier.private.v2',
    safeReasonCodes: [],
    ...overrides,
  };
}

function baseResult(overrides: Partial<SemanticAwarePromotionResultInput> = {}): SemanticAwarePromotionResult {
  return buildSemanticAwarePromotionResult(baseInput(overrides));
}

// Mutate an already-built result for strict-validator negative tests.
function mutate(result: SemanticAwarePromotionResult, patch: Record<string, unknown>): SemanticAwarePromotionResult {
  return { ...result, ...patch } as unknown as SemanticAwarePromotionResult;
}

test.describe('Phase 15 Session 2 Workstream E — semantic-aware promotion result', () => {
  test.describe('builder happy paths', () => {
    test('builds a SEMANTIC cluster result with derived replay evidence and null candidate default', () => {
      const result = baseResult({ candidateId: undefined });
      expect(result.promotionResultVersion).toBe(PROMOTION_RESULT_VERSION);
      expect(result.clusterKind).toBe('SEMANTIC');
      expect(result.candidateId).toBeNull();
      expect(result.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(result.dossierVersionTarget).toBe('nightwatch.bug-dossier.private.v2');
      expect(() => validateSemanticAwarePromotionResult(result)).not.toThrow();
      expect(semanticPromotionEligible(result)).toBe(true);
    });

    test('builds a PROTOCOL cluster result targeting dossier v1', () => {
      const result = baseResult({
        clusterKind: 'PROTOCOL',
        candidateId: null,
        replayStatus: 'FAILURE',
        replayPhase: 'REDUCED_CANDIDATE',
        minimization: 'MINIMALITY_NOT_PROVEN',
        confidence: 'MEDIUM',
        readiness: 'UNRESOLVED',
        confidenceBlockers: ['MINIMIZATION_BUDGET_EXHAUSTED'],
        readinessReasonCodes: ['EXACT_REPLAY_REQUIRED'],
        dossierVersionTarget: 'nightwatch.bug-dossier.private.v1',
      });
      expect(result.replayEvidence).toBe('REDUCED_REPLAY_PRECONDITION_DIVERGENCE');
      expect(result.dossierVersionTarget).toBe('nightwatch.bug-dossier.private.v1');
      expect(result.confidenceBlockers).toEqual(['MINIMIZATION_BUDGET_EXHAUSTED']);
      expect(() => validateSemanticAwarePromotionResult(result)).not.toThrow();
      expect(semanticPromotionEligible(result)).toBe(false);
    });

    test('normalizes unsorted duplicated code arrays into sorted deduplicated arrays', () => {
      const result = baseResult({
        confidenceBlockers: ['ZZ_BLOCKER', 'AA_BLOCKER', 'ZZ_BLOCKER'],
        safeReasonCodes: ['B_CODE', 'A_CODE', 'B_CODE'],
      });
      expect(result.confidenceBlockers).toEqual(['AA_BLOCKER', 'ZZ_BLOCKER']);
      expect(result.safeReasonCodes).toEqual(['A_CODE', 'B_CODE']);
      expect(() => validateSemanticAwarePromotionResult(result)).not.toThrow();
    });

    test('derives REPLAY_EVIDENCE_ABSENT when no replay inputs are provided', () => {
      const result = baseResult({ replayStatus: undefined, replayPhase: undefined });
      expect(result.replayEvidence).toBe('REPLAY_EVIDENCE_ABSENT');
      expect(() => validateSemanticAwarePromotionResult(result)).not.toThrow();
    });

    test('rejects a partial replay input pair (fail closed)', () => {
      expect(() => baseResult({ replayPhase: undefined })).toThrow(/PROMOTION_RESULT_REPLAY_INPUT_PARTIAL/);
      expect(() => baseResult({ replayStatus: undefined })).toThrow(/PROMOTION_RESULT_REPLAY_INPUT_PARTIAL/);
    });

    test('rejects lowercase reason tokens at build time', () => {
      expect(() => baseResult({ confidenceBlockers: ['lowercase_blocker'] })).toThrow(/PROMOTION_RESULT_REASON_TOKEN_INVALID/);
    });
  });

  test.describe('currentness bridges', () => {
    test('currentnessFromSemanticTriage is identity over the full vocabulary', () => {
      const vocabulary: readonly SemanticTriageSourceCurrentness[] = ['CURRENT', 'LOCAL_TRACKING_ONLY', 'STALE', 'UNAVAILABLE', 'UNKNOWN'];
      for (const value of vocabulary) expect(currentnessFromSemanticTriage(value)).toBe(value);
    });

    test('currentnessFromCampaignSemantic is identity over the full vocabulary', () => {
      const vocabulary: readonly CampaignSemanticCurrentness[] = ['CURRENT', 'LOCAL_TRACKING_ONLY', 'STALE', 'UNAVAILABLE', 'UNKNOWN'];
      for (const value of vocabulary) expect(currentnessFromCampaignSemantic(value)).toBe(value);
    });

    test('currentnessFromSourceFreshness maps all SourceFreshness members', () => {
      expect(currentnessFromSourceFreshness('SOURCE_CURRENT_LOCALLY' as SourceFreshness)).toBe('CURRENT');
      expect(currentnessFromSourceFreshness('LOCAL_TRACKING_REF_ONLY' as SourceFreshness)).toBe('LOCAL_TRACKING_ONLY');
      expect(currentnessFromSourceFreshness('REMOTE_FRESHNESS_CONFIRMED' as SourceFreshness)).toBe('CURRENT');
      expect(currentnessFromSourceFreshness('UNKNOWN' as SourceFreshness)).toBe('UNKNOWN');
    });

    test('currentnessBlocksHighReadiness truth table', () => {
      expect(currentnessBlocksHighReadiness('CURRENT')).toBe(false);
      expect(currentnessBlocksHighReadiness('LOCAL_TRACKING_ONLY')).toBe(false);
      expect(currentnessBlocksHighReadiness('STALE')).toBe(true);
      expect(currentnessBlocksHighReadiness('UNAVAILABLE')).toBe(true);
      expect(currentnessBlocksHighReadiness('UNKNOWN')).toBe(true);
    });
  });

  test.describe('semanticPromotionEligible authority invariant', () => {
    test('eligible for READY + HIGH + CURRENT', () => {
      expect(semanticPromotionEligible(baseResult())).toBe(true);
    });

    test('LOCAL_TRACKING_ONLY does not block by itself', () => {
      expect(semanticPromotionEligible(baseResult({ sourceCurrentness: 'LOCAL_TRACKING_ONLY' }))).toBe(true);
    });

    test('blocks STALE, UNAVAILABLE, and UNKNOWN currentness', () => {
      for (const currentness of ['STALE', 'UNAVAILABLE', 'UNKNOWN'] as const) {
        expect(semanticPromotionEligible(baseResult({ sourceCurrentness: currentness }))).toBe(false);
      }
    });

    test('blocks UNRESOLVED confidence even when READY and CURRENT', () => {
      expect(semanticPromotionEligible(baseResult({ confidence: 'UNRESOLVED' }))).toBe(false);
    });

    test('blocks non-READY readiness verdicts', () => {
      for (const readiness of ['UNRESOLVED', 'NOT_ELIGIBLE'] as const) {
        expect(semanticPromotionEligible(baseResult({ readiness }))).toBe(false);
      }
    });
  });

  test.describe('dossier target derivation', () => {
    test('SEMANTIC clusters target dossier v2 and PROTOCOL clusters target v1', () => {
      expect(dossierTargetForClusterKind('SEMANTIC')).toBe('nightwatch.bug-dossier.private.v2');
      expect(dossierTargetForClusterKind('PROTOCOL')).toBe('nightwatch.bug-dossier.private.v1');
    });
  });

  test.describe('replay evidence derivation table', () => {
    test('fresh exact replay outcomes map 1:1', () => {
      expect(promotionReplayEvidenceFromOutcome('PASS', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_REPRODUCED');
      expect(promotionReplayEvidenceFromOutcome('FAILURE', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_NOT_REPRODUCED');
      expect(promotionReplayEvidenceFromOutcome('INVALID', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_INVALID');
    });

    test('reduced candidate outcomes map to supported or precondition divergence', () => {
      expect(promotionReplayEvidenceFromOutcome('PASS', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_SUPPORTED');
      expect(promotionReplayEvidenceFromOutcome('FAILURE', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_PRECONDITION_DIVERGENCE');
      expect(promotionReplayEvidenceFromOutcome('INVALID', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_PRECONDITION_DIVERGENCE');
    });
  });

  test.describe('strict validator', () => {
    test('accepts a canonical result', () => {
      expect(() => validateSemanticAwarePromotionResult(baseResult())).not.toThrow();
    });

    test('rejects non-object values', () => {
      expect(() => validateSemanticAwarePromotionResult(null)).toThrow(/PROMOTION_RESULT_NOT_OBJECT/);
      expect(() => validateSemanticAwarePromotionResult([baseResult()])).toThrow(/PROMOTION_RESULT_NOT_OBJECT/);
      expect(() => validateSemanticAwarePromotionResult('promotion-result')).toThrow(/PROMOTION_RESULT_NOT_OBJECT/);
    });

    test('rejects a wrong schema version', () => {
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { promotionResultVersion: 'nightwatch.promotion-result.private.v0' })))
        .toThrow(/PROMOTION_RESULT_VERSION_INVALID/);
    });

    test('rejects unknown fields', () => {
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { extraField: 'x' })))
        .toThrow(/PROMOTION_RESULT_UNKNOWN_FIELD:extraField/);
    });

    test('rejects bad enum values on every enum field', () => {
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { clusterKind: 'HYBRID' }))).toThrow(/PROMOTION_RESULT_CLUSTER_KIND_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { replayEvidence: 'SOMEHOW_FINE' }))).toThrow(/PROMOTION_RESULT_REPLAY_EVIDENCE_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { minimization: 'MINIMALITY_ASSERTED' }))).toThrow(/PROMOTION_RESULT_MINIMIZATION_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { confidence: 'CERTAIN' }))).toThrow(/PROMOTION_RESULT_CONFIDENCE_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { readiness: 'READY_MAYBE' }))).toThrow(/PROMOTION_RESULT_READINESS_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { sourceCurrentness: 'FRESHISH' }))).toThrow(/PROMOTION_RESULT_CURRENTNESS_INVALID/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { dossierVersionTarget: 'nightwatch.bug-dossier.private.v3' })))
        .toThrow(/PROMOTION_RESULT_DOSSIER_TARGET_INVALID/);
    });

    test('rejects unsorted code arrays', () => {
      const unsorted = mutate(baseResult(), { safeReasonCodes: ['ZZ_CODE', 'AA_CODE'] });
      expect(() => validateSemanticAwarePromotionResult(unsorted)).toThrow(/PROMOTION_RESULT_CODE_ARRAY_NOT_SORTED:safeReasonCodes/);
    });

    test('rejects duplicated code array entries', () => {
      const duplicated = mutate(baseResult(), { readinessReasonCodes: ['AA_CODE', 'AA_CODE'] });
      expect(() => validateSemanticAwarePromotionResult(duplicated)).toThrow(/PROMOTION_RESULT_CODE_DUPLICATE:readinessReasonCodes/);
    });

    test('rejects lowercase and unsafe reason tokens', () => {
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { safeReasonCodes: ['lower_case'] })))
        .toThrow(/PROMOTION_RESULT_CODE_TOKEN_INVALID:safeReasonCodes/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { safeReasonCodes: ['9STARTS_WITH_DIGIT'] })))
        .toThrow(/PROMOTION_RESULT_CODE_TOKEN_INVALID:safeReasonCodes/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { confidenceBlockers: ['HAS SPACE'] })))
        .toThrow(/PROMOTION_RESULT_CODE_TOKEN_INVALID:confidenceBlockers/);
    });

    test('rejects sentinel-bearing strings in any string field', () => {
      expect(() => baseResult({ clusterId: 'clu:CUSTOMER_SENTINEL' })).toThrow(/PROMOTION_RESULT_PRIVACY_BLOCKED/);
      expect(() => baseResult({ candidateId: 'candidate:TOKEN_SENTINEL' })).toThrow(/PROMOTION_RESULT_PRIVACY_BLOCKED/);
      expect(() => validateSemanticAwarePromotionResult(mutate(baseResult(), { readinessReasonCodes: ['EMAIL_SENTINEL'] })))
        .toThrow(/PROMOTION_RESULT_PRIVACY_BLOCKED/);
    });

    test('rejects unsafe cluster and candidate identifiers', () => {
      expect(() => baseResult({ clusterId: 'has space' })).toThrow(/PROMOTION_RESULT_CLUSTER_ID_INVALID/);
      expect(() => baseResult({ candidateId: 'bad id!' })).toThrow(/PROMOTION_RESULT_CANDIDATE_ID_INVALID/);
    });
  });

  test.describe('determinism', () => {
    test('stable JSON is byte-identical across three builds', () => {
      const input = baseInput({
        confidenceBlockers: ['BB_BLOCKER', 'AA_BLOCKER'],
        readinessReasonCodes: ['EXACT_REPLAY_REQUIRED'],
        safeReasonCodes: ['KNOWN_FALSE_POSITIVE_PRESENT'],
      });
      const first = stablePromotionResultJson(buildSemanticAwarePromotionResult(input));
      const second = stablePromotionResultJson(buildSemanticAwarePromotionResult(input));
      const third = stablePromotionResultJson(buildSemanticAwarePromotionResult(input));
      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    test('stable JSON is independent of key insertion order', () => {
      const result = baseResult();
      const reordered = Object.fromEntries(Object.entries(result).reverse());
      expect(stablePromotionResultJson(reordered)).toBe(stablePromotionResultJson(result));
    });
  });
});
