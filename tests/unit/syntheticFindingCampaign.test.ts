// Synthetic end-to-end finding campaign: fixture observation through
// candidate clustering, replay/minimization, dossier, privacy-safe handoff,
// local review, and intelligence — all through the real core modules.
// Local synthetic data only; no network, no browser, no production.

import { test, expect } from '@playwright/test';
import {
  clusterAnomalies,
  createBugDossier,
  minimizeFailure,
  PASSIVE_MINIMIZATION_SAFETY,
  rankConfidence,
  sanitizeAnomalyObservation,
  suppressDuplicateClusters,
  type AnomalyObservation,
  type BugDossier,
} from '../../src/core/triage/index';
import { compareBrowserAndApi } from '../../src/core/triage/differential';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { localizeFaultBoundary } from '../../src/core/triage/localization';
import { rankTriagePriority } from '../../src/core/triage/summaries';
import {
  projectAlphausFindingHandoff,
  type AlphausHandoffInput,
} from '../../src/core/alphausHandoff/index';
import {
  decideReview,
  findingArtifactDigest,
  initialReviewRecord,
  verifyReviewCurrent,
} from '../../src/core/findingReview/index';
import {
  classifyRecurrence,
  classifyRelationship,
  groupDefectClasses,
  strongestProvenance,
} from '../../src/core/findingIntel/index';
import type { SafetyVector } from '../../src/core/exploration/types';

const FP_INVOICE = 'fp:sha256:cccccccccccccccccccccccc';
const FP_TOOLTIP = 'fp:sha256:dddddddddddddddddddddddd';
const SHA_A = 'a'.repeat(40);

const FAILURE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

function observation(fingerprint: string, runId: string, journeyId: string): AnomalyObservation {
  return {
    runId,
    observedAt: '2026-09-05T00:00:00.000Z',
    fingerprint,
    features: {
      journeyId,
      envelopeId: null,
      oracleId: 'oracle.synthetic.invoice-total',
      routeClass: '/synthetic/invoice',
      operationFamily: 'invoice-finalize',
      statusClass: '2xx',
      contentTypeClass: 'json',
      runtimeCategory: 'product',
      structuralState: 'total-mismatch',
      failureActionId: 'finalize.invoice',
      sourceImpactRegion: 'synthetic.billing',
      browserApiResultClass: 'browser-only',
    },
    timingClass: 'NONE',
    reproduced: true,
    minimized: false,
    sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
  };
}

async function dossierFor(fingerprint: string, family: string): Promise<BugDossier> {
  const minimization = await minimizeFailure({
    originalSequence: [{ actionId: 'read.invoice-total', semanticClass: 'KNOWN_READ', routeClass: '/synthetic/invoice', sourceApproved: true, catalogVersion: 'synthetic.catalog.v1' }],
    anomalyFingerprint: fingerprint,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['read.invoice-total']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    replay: () => ({ status: 'FAILURE' as const, anomalyFingerprint: fingerprint, safety: FAILURE }),
  });
  const differential = compareBrowserAndApi(
    { failed: true, routeClass: '/synthetic/invoice', structuralState: 'total-mismatch', operationFamily: family, statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: fingerprint, runtimeCategory: 'product' },
    { available: true, failed: false, operationFamily: family, statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: FP_TOOLTIP },
  );
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimization.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return createBugDossier({
    firstObserved: '2026-09-05T00:00:00.000Z',
    lastObserved: '2026-09-05T00:01:00.000Z',
    journeyIds: ['synthetic-invoice-finalize'],
    seeds: ['synthetic-seed-1'],
    routeClass: '/synthetic/invoice',
    apiOperationFamily: family,
    oracleFingerprint: fingerprint,
    evidenceLevel: 'L3',
    minimization,
    browserApiDifferential: differential,
    sourceCorrelation: source,
    likelyFaultBoundary: boundary,
    confidence,
    technicalSeverity: 'HIGH',
    triagePriority: rankTriagePriority({ technicalSeverity: 'HIGH', confidence: confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: [],
  });
}

test.describe('synthetic finding campaign', () => {
  test('duplicate observations cluster and suppress to one primary', () => {
    const observations = [
      observation(FP_INVOICE, 'run-001', 'synthetic-invoice-finalize'),
      observation(FP_INVOICE, 'run-002', 'synthetic-invoice-finalize'),
      observation(FP_TOOLTIP, 'run-003', 'synthetic-tooltip-render'),
    ].map(sanitizeAnomalyObservation);
    const clusters = clusterAnomalies(observations);
    expect(clusters.length).toBe(2);
    const invoiceCluster = clusters.find((cluster) => cluster.fingerprint === FP_INVOICE);
    expect(invoiceCluster?.occurrenceCount).toBe(2);
    const suppressed = suppressDuplicateClusters(clusters, 1);
    expect(suppressed.length).toBe(2);
    expect(suppressed.find((cluster) => cluster.fingerprint === FP_INVOICE)?.runIds.length).toBe(1);
  });

  test('reordered inputs and renamed seeds do not change semantic identity', () => {
    const forward = [observation(FP_INVOICE, 'run-001', 'synthetic-invoice-finalize'), observation(FP_TOOLTIP, 'run-002', 'synthetic-tooltip-render')].map(
      sanitizeAnomalyObservation,
    );
    const reversed = [...forward].reverse();
    expect(clusterAnomalies(reversed).map((cluster) => cluster.clusterKey).sort()).toEqual(
      clusterAnomalies(forward).map((cluster) => cluster.clusterKey).sort(),
    );
  });

  test('sentinel-bearing observations never enter clustering', () => {
    const poisoned = observation(FP_INVOICE, 'run-001', 'synthetic-invoice-finalize');
    const withSentinel = {
      ...poisoned,
      features: { ...poisoned.features, journeyId: 'x-CUSTOMER_SENTINEL-x' },
    };
    expect(() => sanitizeAnomalyObservation(withSentinel)).toThrow(/UNSAFE/);
  });

  test('dossier to handoff to local review closes the loop', async () => {
    const dossier = await dossierFor(FP_INVOICE, 'invoice-finalize');
    const handoffInput: AlphausHandoffInput = {
      dossier,
      bugDraft: null,
      campaignRef: 'synthetic-campaign-e2e',
      observationProvenance: { stage: 'LOCAL', outageEvidence: false, customerReported: false, customerReportRef: null },
      severityEvidence: ['DATA_CORRECTNESS_IMPACT_CONFIRMED'],
      severityProvenance: 'synthetic invoice mismatch exp:sha256:cccccccccccccccccccccccc',
      classRemovalEvidence: null,
    };
    const handoff = projectAlphausFindingHandoff(handoffInput);
    expect(handoff.authority.humanReviewRequired).toBe(true);
    expect(handoff.authority.executable).toBe(false);

    const binding = {
      findingId: dossier.candidateId,
      findingDigest: findingArtifactDigest({ candidateId: dossier.candidateId }),
      dossierDigest: findingArtifactDigest(dossier),
      handoffDigest: findingArtifactDigest(handoff),
      sourceSha: SHA_A,
      campaignId: 'synthetic-campaign-e2e',
      handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
      privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
    };
    const { record, receipt } = decideReview(initialReviewRecord(binding), 'ACCEPT_EVIDENCE', {
      reviewedAt: '2026-09-05T00:00:00Z',
      rationale: 'synthetic e2e review',
    });
    expect(record.state).toBe('REVIEWED');
    expect(() =>
      verifyReviewCurrent(receipt, {
        finding: { candidateId: dossier.candidateId },
        dossier,
        handoff,
        sourceSha: SHA_A,
        campaignId: 'synthetic-campaign-e2e',
        handoffVersion: 'nightwatch.alphaus-finding-handoff.v1',
        privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
      }),
    ).not.toThrow();
  });

  test('intelligence across the campaign corpus is advisory and evidence-backed', async () => {
    const invoice = await dossierFor(FP_INVOICE, 'invoice-finalize');
    const invoiceAgain = await dossierFor(FP_INVOICE, 'invoice-finalize');
    expect(invoiceAgain.candidateId).toBe(invoice.candidateId);

    const relationship = classifyRelationship(
      { findingId: invoice.candidateId, fingerprint: FP_INVOICE, expectationId: 'expectation/invoice-total', semanticContractId: null, failureSignature: 'sig/total-mismatch', route: '/synthetic/invoice', sourceLineage: 'synthetic/billing', replayOutcome: 'FAILURE' },
      { findingId: 'finding/earlier', fingerprint: FP_INVOICE, expectationId: 'expectation/invoice-total', semanticContractId: null, failureSignature: 'sig/total-mismatch', route: '/synthetic/invoice', sourceLineage: 'synthetic/billing', replayOutcome: 'FAILURE' },
    );
    expect(relationship.relationship).toBe('EXACT_SAME_FINDING');
    expect(relationship.advisoryOnly).toBe(true);

    const recurrence = classifyRecurrence(
      { findingId: invoice.candidateId, fingerprint: FP_INVOICE, campaignId: 'synthetic-campaign-e2e', observedAtMs: 2000 },
      [],
    );
    expect(recurrence.recurrence).toBe('FIRST_SEEN');

    const classes = groupDefectClasses([
      { findingId: 'finding/1', semanticContractId: 'contract/invoice-total', expectationId: null, sourceScope: 'synthetic/billing', replayOutcome: 'FAILURE' },
      { findingId: 'finding/2', semanticContractId: 'contract/invoice-total', expectationId: null, sourceScope: 'synthetic/billing', replayOutcome: 'FAILURE' },
    ]);
    expect(classes.length).toBe(1);
    expect(strongestProvenance(['SYNTHETIC_ORACLE', 'TEST_ORACLE'])).toBe('TEST_ORACLE');
  });
});
