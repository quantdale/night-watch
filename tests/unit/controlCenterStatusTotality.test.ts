// M6 task 7.2 (NW-AUD-048, C-09) — the Control Center status mapping is TOTAL:
// every contract status survives the sanitizer, and every internal dossier
// status has its own Control Center state instead of collapsing into INCOMPLETE.
import { test, expect } from '@playwright/test';
import {
  CONTROL_CENTER_DOSSIER_STATUSES,
  CONTROL_CENTER_FINDING_CONFIDENCES,
  CONTROL_CENTER_FINDING_EVIDENCE_LEVELS,
  CONTROL_CENTER_FINDING_REPRODUCTIONS,
  CONTROL_CENTER_FINDING_SEVERITIES,
  dossierStatusOf,
} from '../../src/controlCenter/contracts/findings';
import { CONTROL_CENTER_RUN_STATUSES } from '../../src/controlCenter/contracts/runs';
import { sanitizeFindingSummary, sanitizeRunListItem } from '../../src/controlCenter/contracts/sanitize';

function findingSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    findingId: 'cc-finding-1',
    fingerprint: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    clusterId: 'cc-cluster-1',
    title: 'Synthetic finding',
    product: 'ripple',
    surface: 'dashboard',
    severity: 'HIGH',
    confidence: 'MEDIUM',
    evidenceLevel: 'L2',
    reproduction: 'REPRODUCED',
    reproductionCount: 1,
    minimized: true,
    categoryCode: 'ORACLE_ANOMALY',
    sourceCurrentness: 'CURRENT',
    dossierStatus: 'READY',
    ...overrides,
  };
}

test.describe('Control Center status totality (7.2)', () => {
  test('every finding contract status survives the sanitizer', () => {
    for (const severity of CONTROL_CENTER_FINDING_SEVERITIES) {
      expect(sanitizeFindingSummary(findingSummary({ severity })), severity).not.toBeNull();
    }
    for (const confidence of CONTROL_CENTER_FINDING_CONFIDENCES) {
      expect(sanitizeFindingSummary(findingSummary({ confidence })), confidence).not.toBeNull();
    }
    for (const evidenceLevel of CONTROL_CENTER_FINDING_EVIDENCE_LEVELS) {
      expect(sanitizeFindingSummary(findingSummary({ evidenceLevel })), evidenceLevel).not.toBeNull();
    }
    for (const reproduction of CONTROL_CENTER_FINDING_REPRODUCTIONS) {
      expect(sanitizeFindingSummary(findingSummary({ reproduction })), reproduction).not.toBeNull();
    }
    for (const dossierStatus of CONTROL_CENTER_DOSSIER_STATUSES) {
      const sanitized = sanitizeFindingSummary(findingSummary({ dossierStatus }));
      expect(sanitized, dossierStatus).not.toBeNull();
      expect(sanitized?.dossierStatus).toBe(dossierStatus);
    }
  });

  test('every run status survives the sanitizer', () => {
    for (const status of CONTROL_CENTER_RUN_STATUSES) {
      const sanitized = sanitizeRunListItem({
        runId: 'run-1',
        environment: 'LOCAL',
        passed: status === 'PASSED',
        eventCount: 3,
        hardFailureCount: 0,
        oracleFindingCount: 0,
        status,
      });
      expect(sanitized, status).not.toBeNull();
      expect(sanitized?.status).toBe(status);
    }
  });

  test('the internal dossier status maps totally and never collapses UNRESOLVED', () => {
    expect(dossierStatusOf('READY')).toBe('READY');
    expect(dossierStatusOf('UNRESOLVED')).toBe('UNRESOLVED');
    expect(dossierStatusOf('INCOMPLETE')).toBe('INCOMPLETE');
    // A value this build does not know is UNKNOWN, never a silent INCOMPLETE.
    expect(dossierStatusOf('SOMETHING_NEW')).toBe('UNKNOWN');
    expect(dossierStatusOf('')).toBe('UNKNOWN');
    // The three internal states stay distinguishable.
    expect(new Set([dossierStatusOf('READY'), dossierStatusOf('UNRESOLVED'), dossierStatusOf('INCOMPLETE')]).size).toBe(3);
  });

  test('an unresolved dossier is projected as UNRESOLVED, not INCOMPLETE', async () => {
    // End to end: a REAL dossier (built by the triage constructor, so it
    // carries the privacy vector and the full shape) that never reproduced
    // reaches the Control Center as UNRESOLVED.
    const { createBugDossier } = await import('../../src/core/triage/dossier');
    const { projectFindings } = await import('../../src/controlCenter/adapters/findingsAdapter');
    const dossier = createBugDossier({
      firstObserved: '2026-09-01T00:00:00.000Z',
      lastObserved: '2026-09-01T00:01:00.000Z',
      journeyIds: ['p4.j1'],
      seeds: ['seed-1'],
      routeClass: 'dashboard',
      apiOperationFamily: null,
      oracleFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      evidenceLevel: 'L2',
      minimization: {
        status: 'NO_REPRODUCTION',
        reproductionCount: 0,
        freshExactReplay: 'NOT_REPRODUCED',
        minimalReproducingSequence: [],
        minimalityGuarantee: 'NONE',
      },
      browserApiDifferential: {
        status: 'NOT_AVAILABLE',
        appLayerDiscriminator: 'NOT_AVAILABLE',
        browserOperationFamily: null,
        apiOperationFamily: null,
        statusClassSame: null,
        contentTypeClassSame: null,
        routeClassSame: null,
        structuralStateSame: null,
        parseabilitySame: null,
        rootCauseClaim: 'NONE',
      },
      sourceCorrelation: { candidates: [] },
      likelyFaultBoundary: {
        primaryBoundary: 'CLIENT_STATE',
        candidateBoundaries: [],
        confidence: 'MEDIUM',
        reasons: ['deterministic replay boundary'],
        rootCauseClaim: 'NONE',
      },
      confidence: { level: 'MEDIUM', reasons: ['deterministic replay'] },
      technicalSeverity: 'MEDIUM',
      triagePriority: 'P2',
      knownNightwatchDefect: null,
      alternativesRuledOut: ['transient variance'],
      missingEvidence: [],
    } as unknown as Parameters<typeof createBugDossier>[0]);
    expect(dossier.status).toBe('UNRESOLVED');
    const projected = projectFindings({
      dossiers: [dossier],
      clusters: [],
      runs: [],
      coverageGaps: [],
      limit: 10,
      now: () => new Date('2026-09-27T00:00:00.000Z'),
    } as unknown as Parameters<typeof projectFindings>[0]);
    const row = projected.items[0];
    expect(row).toBeTruthy();
    expect(row?.dossierStatus).toBe('UNRESOLVED');
  });
});
