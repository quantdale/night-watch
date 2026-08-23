// Phase 17 M1 defect reproductions. These tests intentionally describe the
// repaired contracts and are expected to fail against the pre-Phase-17 code.
// Values are synthetic only.

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertUniqueStrings,
  safeErrorDetail,
} from '../../src/core/campaign/runtimeValidation';
import {
  readBaseline,
  validateBaselineState,
  writeBaselineAtomic,
} from '../../src/core/changeIntelligence/baseline';
import { syntheticChangeset } from '../../src/core/changeIntelligence/git';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { selectJourneys, RIPPLE_DEPENDENCY_EDGES } from '../../src/core/changeIntelligence';
import {
  buildMinimalityEvidence,
  minimizeFailure,
} from '../../src/core/triage/minimizer';
import { PASSIVE_MINIMIZATION_SAFETY, type MinimizationAction, type MinimizationResult } from '../../src/core/triage/types';
import {
  allocateChangeAwarePortfolioBudget,
  buildChangeAwarePortfolioOverlay,
} from '../../src/core/portfolio/changeImpact';
import { PORTFOLIO_ALLOCATION_VERSION, type PortfolioBudgetPolicy } from '../../src/core/portfolio/allocation';
import { buildPortfolio } from '../../src/core/portfolio/types';
import { p16Member, P16_TARGET_COMMON, P16_TARGET_PAYER } from '../../corpus/phase16a/portfolioFixtures';
import { PHASE17_CHANGE_IMPACT_FIXTURES } from '../../corpus/phase17/changeImpactFixtures';

const REPO = 'mobingilabs/ripple-ui';
const SHA = '0000000000000000000000000000000000000002';

test.describe('Phase 17 M1 defect reproductions', () => {
  test('equivalent change documents have property-order-independent identity', () => {
    const first = syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [{ repoId: REPO, path: 'src/runtime.ts', status: 'modify' }],
    });
    const reorderedFile = {
      status: 'modify' as const,
      path: 'src/runtime.ts',
      repoId: REPO,
    };
    const second = syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [reorderedFile],
    });
    expect(second.changesetId).toBe(first.changesetId);

    const omittedOptional = syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [{ repoId: REPO, path: 'src/runtime.ts', status: 'modify' }],
    });
    const explicitUndefined = syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [{ repoId: REPO, path: 'src/runtime.ts', status: 'modify', previousPath: undefined }],
    });
    expect(explicitUndefined.changesetId).toBe(omittedOptional.changesetId);

    const correlationA = correlateSourceChanges({
      journeyIds: ['ripple-payer-exchange-read'],
      sourceFreshness: 'SOURCE_CURRENT_LOCALLY',
      changedFiles: [{ repoId: REPO, path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    });
    const correlationB = correlateSourceChanges({
      journeyIds: ['ripple-payer-exchange-read'],
      sourceFreshness: 'SOURCE_CURRENT_LOCALLY',
      changedFiles: [{ status: 'modify', path: 'src/vuex/api/exchangeRatePayer_v2.js', repoId: REPO }],
    });
    expect(correlationB.sourceVersion).toBe(correlationA.sourceVersion);
  });

  test('malformed baseline documents fail closed before becoming trusted state', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase17-baseline-'));
    const file = path.join(root, 'baseline.json');
    try {
      fs.writeFileSync(file, JSON.stringify({ schemaVersion: 'foreign', records: [] }), 'utf8');
      expect(() => readBaseline(file)).toThrow('BASELINE_INVALID_DOCUMENT');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('required authority fields cannot be inherited from a hostile prototype', () => {
    const prototype = { schemaVersion: 'nightwatch.baseline.phase3.v1' };
    const document = Object.assign(Object.create(prototype), { records: [] });
    expect(() => validateBaselineState(document)).toThrow('BASELINE_INVALID_DOCUMENT:MISSING_FIELD:schemaVersion');
  });

  test('baseline parser rejects unknown fields, duplicates, unsafe provenance, and contradictory references', () => {
    const valid = {
      schemaVersion: 'nightwatch.baseline.phase3.v1',
      records: [{
        repoId: REPO,
        baselineSha: SHA,
        status: 'BOOTSTRAP_BASELINE',
        provenance: 'synthetic',
        lastChangesetId: null,
        lastAcceptedExecutionStatus: null,
      }],
    };
    expect(() => validateBaselineState({ ...valid, unexpected: true })).toThrow('BASELINE_INVALID_DOCUMENT:UNKNOWN_FIELD');
    expect(() => validateBaselineState({
      ...valid,
      records: [valid.records[0], { ...valid.records[0] }],
    })).toThrow('BASELINE_INVALID_DOCUMENT:DUPLICATE_REPO_ID');
    expect(() => validateBaselineState({
      ...valid,
      records: [{ ...valid.records[0], provenance: 'https://synthetic.example.test?token=SYNTHETIC_TOKEN' }],
    })).toThrow('BASELINE_INVALID_DOCUMENT:PROVENANCE_INVALID');
    expect(() => validateBaselineState({
      ...valid,
      records: [{ ...valid.records[0], status: 'VERIFIED_BASELINE', lastChangesetId: null, lastAcceptedExecutionStatus: null }],
    })).toThrow('BASELINE_INVALID_DOCUMENT:VERIFIED_REFERENCE_CONTRADICTION');
  });

  test('invalid baseline state is rejected before an atomic writer creates a path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase17-invalid-baseline-'));
    const file = path.join(root, 'nested', 'baseline.json');
    try {
      expect(() => writeBaselineAtomic(file, {
        schemaVersion: 'nightwatch.baseline.phase3.v1',
        records: [{
          repoId: REPO,
          baselineSha: 'not-a-sha',
          status: 'BOOTSTRAP_BASELINE',
          provenance: 'synthetic',
          lastChangesetId: null,
          lastAcceptedExecutionStatus: null,
        }],
      })).toThrow('BASELINE_INVALID_DOCUMENT:BASELINE_SHA_INVALID');
      expect(fs.existsSync(file)).toBe(false);
      expect(fs.existsSync(path.dirname(file))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('duplicate diagnostics never echo a hostile duplicate value', () => {
    const hostile = 'Authorization: Bearer SYNTHETIC_DUPLICATE_TOKEN';
    let message = '';
    try {
      assertUniqueStrings([hostile, hostile], 'PHASE17_DUPLICATE');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('PHASE17_DUPLICATE:DUPLICATE');
    expect(message).not.toContain(hostile);
    expect(message).not.toContain('SYNTHETIC_DUPLICATE_TOKEN');
  });

  test('safe diagnostic projection rejects identity and URL-shaped values', () => {
    for (const hostile of [
      'synthetic.owner@example.test',
      'customer-SYNTHETIC_12345',
      'account-123456789',
      'https://synthetic.example.test/download?token=SYNTHETIC_TOKEN',
    ]) {
      expect(safeErrorDetail(hostile)).toBe('<redacted-detail>');
    }
  });

  test('product target vocabulary is not mistaken for an identity value', () => {
    expect(safeErrorDetail('ripple-account-inventory.read')).toBe('ripple-account-inventory.read');
    expect(safeErrorDetail('ripple-user-settings.read')).toBe('ripple-user-settings.read');
  });

  test('ambiguous repeated-action deletion evidence cannot claim proven minimality', () => {
    const result: MinimizationResult = {
      schemaVersion: 'nightwatch.failure-minimization.private.v1',
      status: 'MINIMIZED',
      originalSequence: ['a.read', 'a.read', 'b.read'],
      minimalReproducingSequence: ['a.read', 'a.read'],
      removedActions: ['b.read'],
      reproductionCount: 2,
      anomalyFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      modelVersion: 'nightwatch.failure-minimization.private.v1',
      catalogVersion: 'synthetic.catalog.v1',
      sourceVersion: 'synthetic.source.v1',
      confidence: 'HIGH',
      minimalityGuarantee: '1-MINIMAL',
      reductionEvidenceClass: 'MINIMALITY_PROVEN',
      budget: {
        policyVersion: 'nightwatch.minimization-budget.private.v1',
        maxCandidateEvaluations: 8,
        maxTotalReplays: 9,
      },
      replayCount: 2,
      candidateEvaluationCount: 1,
      candidateEvaluations: [
        {
          sequence: ['a.read', 'a.read', 'b.read'],
          disposition: 'REPRODUCES',
          reason: 'EXACT_ANOMALY_FINGERPRINT_MATCH',
          fingerprintMatch: true,
        },
        {
          sequence: ['a.read'],
          disposition: 'DOES_NOT_REPRODUCE',
          reason: 'FAILURE_NOT_OBSERVED',
          fingerprintMatch: false,
        },
      ],
      invalidCandidateCount: 0,
      safetyRejectionCount: 0,
      freshExactReplay: 'REPRODUCED',
    };
    expect(() => buildMinimalityEvidence(result)).toThrow('MINIMALITY_EVIDENCE_INVALID');
  });

  test('the live reducer preserves repeated occurrences internally and blocks lossy public proof reconstruction', async () => {
    const action = (actionId: string): MinimizationAction => ({
      actionId,
      semanticClass: 'KNOWN_READ',
      routeClass: '/synthetic/repeated-action',
      sourceApproved: true,
      catalogVersion: 'synthetic.catalog.phase17',
    });
    const result = await minimizeFailure({
      originalSequence: [action('a.read'), action('a.read'), action('b.read')],
      anomalyFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      sourceVersion: 'synthetic.source.phase17',
      catalogVersion: 'synthetic.catalog.phase17',
      safety: PASSIVE_MINIMIZATION_SAFETY,
      replay: (sequence) => {
        const ids = sequence.map((item) => item.actionId);
        const reproduces = ids.filter((id) => id === 'a.read').length === 2;
        return {
          status: reproduces ? 'FAILURE' : 'PASS',
          ...(reproduces ? { anomalyFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' } : {}),
          safety: {
            productionAttempts: 0,
            proxyViolations: 0,
            unknownDestinations: 0,
            unknownApprovals: 0,
            knownMutations: 0,
            actionCausedUnknown: 0,
            dbQueries: 0,
          },
        };
      },
    });
    expect(result.minimalReproducingSequence).toEqual(['a.read', 'a.read']);
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    expect(() => buildMinimalityEvidence(result)).toThrow('AMBIGUOUS_SURVIVOR_OCCURRENCE');
  });
});

test.describe('Phase 17 W1 source-impact portfolio bridge', () => {
  const policy: PortfolioBudgetPolicy = {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 1,
    perMemberCeiling: 1,
    floorUnits: 0,
    starvationThresholdBuckets: 8,
    retryCeilingPerMember: 0,
    reservedExplorationUnits: 0,
  };

  function portfolio() {
    return buildPortfolio({
      approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON],
      memberInputs: [
        p16Member(P16_TARGET_PAYER, { journeyId: 'ripple-payer-exchange-read', semanticScope: 'phase17.payer' }),
        p16Member(P16_TARGET_COMMON, { journeyId: 'ripple-common-exchange-read', semanticScope: 'phase17.common' }),
      ],
    });
  }

  function directSelection() {
    return selectJourneys(syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [{ repoId: REPO, path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    }));
  }

  test('direct source impact changes portfolio order with categorical reasons only', () => {
    const overlay = buildChangeAwarePortfolioOverlay({ portfolio: portfolio(), selection: directSelection() });
    expect(overlay.members[0]?.journeyId).toBe('ripple-payer-exchange-read');
    expect(overlay.members[0]?.impact.disposition).toBe('DIRECT');
    expect(overlay.members[0]?.impact.scoreAdjustment).toBeGreaterThan(0);
    expect(JSON.stringify(overlay)).not.toContain('src/vuex');
    expect(JSON.stringify(overlay)).not.toContain('changed');
  });

  test('shared and transitive source changes map to bounded non-direct lifts', () => {
    const shared = buildChangeAwarePortfolioOverlay({
      portfolio: portfolio(),
      selection: selectJourneys(syntheticChangeset({
        repoId: REPO,
        headSha: SHA,
        files: [{ repoId: REPO, path: 'src/router.js', status: 'modify' }],
      })),
    });
    expect(shared.members.every((member) => member.impact.disposition === 'SHARED')).toBe(true);
    expect(shared.members.every((member) => member.impact.scoreAdjustment === 18)).toBe(true);

    const transitive = buildChangeAwarePortfolioOverlay({
      portfolio: portfolio(),
      selection: selectJourneys(syntheticChangeset({
        repoId: REPO,
        headSha: SHA,
        files: [{ repoId: REPO, path: 'src/components/CustomDataTable/CustomDataTable.vue', status: 'modify' }],
      })),
    });
    expect(transitive.members.every((member) => member.impact.disposition === 'TRANSITIVE')).toBe(true);
    expect(transitive.members.every((member) => member.impact.scoreAdjustment === 9)).toBe(true);
  });

  test('fallback and irrelevant changes never create positive source lift', () => {
    const fallback = buildChangeAwarePortfolioOverlay({
      portfolio: portfolio(),
      selection: selectJourneys(syntheticChangeset({
        repoId: REPO,
        headSha: SHA,
        files: [{ repoId: REPO, path: 'src/runtime/new-indirection.js', status: 'modify' }],
      })),
    });
    expect(fallback.members.every((member) => member.impact.disposition === 'FALLBACK')).toBe(true);
    expect(fallback.members.every((member) => member.impact.scoreAdjustment === 0)).toBe(true);

    const irrelevant = buildChangeAwarePortfolioOverlay({
      portfolio: portfolio(),
      selection: selectJourneys(syntheticChangeset({
        repoId: REPO,
        headSha: SHA,
        files: [{ repoId: REPO, path: 'docs/change-intelligence.md', status: 'modify' }],
      })),
    });
    expect(irrelevant.members.every((member) => member.impact.disposition === 'NO_RUNTIME_CHANGE')).toBe(true);
    expect(irrelevant.members.every((member) => member.impact.scoreAdjustment === 0)).toBe(true);
  });

  test('an unmapped member is not selected through target-name inference', () => {
    const onlyCommon = buildPortfolio({
      approvedTargets: [P16_TARGET_COMMON],
      memberInputs: [p16Member(P16_TARGET_COMMON, { journeyId: 'ripple-common-exchange-read', semanticScope: 'phase17.common-only' })],
    });
    const overlay = buildChangeAwarePortfolioOverlay({ portfolio: onlyCommon, selection: directSelection() });
    expect(overlay.members[0]?.impact.disposition).toBe('NOT_TARGETED');
    expect(overlay.members[0]?.impact.scoreAdjustment).toBe(0);
  });

  test('stale source evidence is visible but contributes no positive lift', () => {
    const staleEdges = RIPPLE_DEPENDENCY_EDGES.map((edge) => edge.edgeId === 'j1-client' ? { ...edge, sourceMapSha: '0'.repeat(40) } : edge);
    const selection = selectJourneys(syntheticChangeset({
      repoId: REPO,
      headSha: SHA,
      files: [{ repoId: REPO, path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    }), { edges: staleEdges });
    const overlay = buildChangeAwarePortfolioOverlay({ portfolio: portfolio(), selection });
    const payer = overlay.members.find((member) => member.journeyId === 'ripple-payer-exchange-read');
    expect(payer?.impact.disposition).toBe('SOURCE_UNRESOLVED');
    expect(payer?.impact.scoreAdjustment).toBe(0);
    expect(payer?.impact.confidence).toBe('UNKNOWN');
  });

  test('allocation reuses canonical budget gates while carrying source explanation', () => {
    const result = allocateChangeAwarePortfolioBudget({ portfolio: portfolio(), selection: directSelection(), policy });
    expect(result.allocation.selected).toHaveLength(1);
    expect(result.allocation.selected[0]?.targetId).toBe(P16_TARGET_PAYER);
    expect(result.allocation.selected[0]?.selectionReasons).toContain('SOURCE_IMPACT:DIRECT');
    expect(result.allocation.selectionContextDigest).toBe(result.overlay.deterministicDigest);
    expect(JSON.stringify(result)).not.toContain('src/vuex');
  });

  test('source-aware overlay and allocation are byte-identical across repeated runs', () => {
    const outputs = Array.from({ length: 3 }, () => JSON.stringify(allocateChangeAwarePortfolioBudget({
      portfolio: portfolio(),
      selection: directSelection(),
      policy,
    })));
    expect(new Set(outputs).size).toBe(1);
  });

  test('unlinked members cannot receive source-impact lift by target-name guesswork', () => {
    const unlinked = buildPortfolio({
      approvedTargets: [P16_TARGET_PAYER],
      memberInputs: [p16Member(P16_TARGET_PAYER, { journeyId: null, semanticScope: 'phase17.unlinked' })],
    });
    const overlay = buildChangeAwarePortfolioOverlay({ portfolio: unlinked, selection: directSelection() });
    expect(overlay.members[0]?.impact.disposition).toBe('UNLINKED_MEMBER');
    expect(overlay.members[0]?.impact.scoreAdjustment).toBe(0);
  });
});

test.describe('Phase 17 W4 source-change corpus', () => {
  for (const fixture of PHASE17_CHANGE_IMPACT_FIXTURES) {
    test(fixture.fixtureId, () => {
      const edges = fixture.staleEdgeId === undefined
        ? RIPPLE_DEPENDENCY_EDGES
        : RIPPLE_DEPENDENCY_EDGES.map((edge) => edge.edgeId === fixture.staleEdgeId ? { ...edge, sourceMapSha: '0'.repeat(40) } : edge);
      const selection = selectJourneys(syntheticChangeset({
        repoId: fixture.repoId,
        headSha: SHA,
        files: fixture.files.map((file) => ({ ...file, repoId: fixture.repoId })),
      }), { edges });
      expect(selection.selectedJourneys.map((journey) => journey.journeyId)).toEqual(fixture.expectedSelectedJourneys);
      expect(selection.fallbackTriggered).toBe(fixture.expectedFallback);
      expect(JSON.stringify(selection)).not.toContain('SYNTHETIC_TOKEN');
    });
  }
});
