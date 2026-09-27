// M6 task 7.1 (NW-AUD-029, C-08) — the protocol dossier's readiness is DERIVED
// from its own evidence, and a non-READY dossier can never carry a finding
// claim into the consumers that filter on it.
import { test, expect } from '@playwright/test';
import { createBugDossier, protocolDossierReadiness } from '../../src/core/triage/dossier';
import { validateDossierRuntime } from '../../src/core/triage/dossierRuntimeValidation';
import type { BugDossierInput } from '../../src/core/triage/dossier';

function minimizationInput(overrides: Record<string, unknown> = {}) {
  return {
    status: 'MINIMIZED',
    reproductionCount: 2,
    freshExactReplay: 'REPRODUCED',
    minimalReproducingSequence: ['p4.j1.open'],
    minimalityGuarantee: '1-MINIMAL',
    ...overrides,
  } as unknown as BugDossierInput['minimization'];
}

function input(overrides: Partial<BugDossierInput> = {}): BugDossierInput {
  return {
    journeyIds: ['p4.j1'],
    apiOperationFamily: null,
    routeClass: 'dashboard',
    oracleFingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    seeds: ['seed-1'],
    firstObserved: '2026-09-01T00:00:00.000Z',
    lastObserved: '2026-09-01T00:01:00.000Z',
    evidenceLevel: 'L2',
    minimization: minimizationInput(),
    confidence: { level: 'MEDIUM', reasons: ['deterministic replay'] },
    likelyFaultBoundary: {
      primaryBoundary: 'CLIENT_STATE',
      candidateBoundaries: [],
      confidence: 'MEDIUM',
      reasons: ['deterministic replay boundary'],
      rootCauseClaim: 'NONE',
    },
    sourceCorrelation: { candidates: [] },
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
    technicalSeverity: 'MEDIUM',
    triagePriority: 'P2',
    knownNightwatchDefect: null,
    alternativesRuledOut: ['transient network variance'],
    missingEvidence: [],
    ...overrides,
  } as unknown as BugDossierInput;
}

test.describe('protocol dossier readiness (7.1)', () => {
  test('a reproduced, minimized dossier is READY and validates', () => {
    const dossier = createBugDossier(input());
    expect(dossier.status).toBe('READY');
    expect(() =>
      validateDossierRuntime(dossier, { version: 'v1', schemaVersion: dossier.schemaVersion }),
    ).not.toThrow();
  });

  test('a dossier that never reproduced is UNRESOLVED, not READY', () => {
    const dossier = createBugDossier(
      input({
        minimization: minimizationInput({
          status: 'NO_REPRODUCTION',
          reproductionCount: 0,
          freshExactReplay: 'NOT_REPRODUCED',
          minimalReproducingSequence: [],
          minimalityGuarantee: 'NONE',
        }),
      }),
    );
    // The hard-coded READY is gone: the status is what the evidence supports.
    expect(dossier.status).toBe('UNRESOLVED');
    expect(dossier.reproduction.result).toBe('NOT_REPRODUCED');
    // The validator accepts the truthful value (consumers require READY).
    expect(() =>
      validateDossierRuntime(dossier, { version: 'v1', schemaVersion: dossier.schemaVersion }),
    ).not.toThrow();
  });

  test('a bounded budget exhaustion without an exact replay is UNRESOLVED', () => {
    const dossier = createBugDossier(
      input({
        minimization: minimizationInput({
          status: 'BOUNDED_BUDGET_EXHAUSTED',
          freshExactReplay: 'INVALID',
          minimalityGuarantee: 'BOUNDED_MINIMAL',
        }),
      }),
    );
    expect(dossier.status).toBe('UNRESOLVED');
  });

  test('the predicate reports the exact reason it refuses readiness', () => {
    expect(protocolDossierReadiness({ minimization: minimizationInput(), oracleFingerprint: 'fp:sha256:a' })).toEqual({
      status: 'READY',
      reason: null,
    });
    expect(
      protocolDossierReadiness({
        minimization: minimizationInput({ freshExactReplay: 'NOT_REPRODUCED' }),
        oracleFingerprint: 'fp:sha256:a',
      }),
    ).toEqual({ status: 'UNRESOLVED', reason: 'EXACT_REPLAY_REQUIRED' });
    expect(
      protocolDossierReadiness({
        minimization: minimizationInput({ minimalReproducingSequence: [] }),
        oracleFingerprint: 'fp:sha256:a',
      }),
    ).toEqual({ status: 'UNRESOLVED', reason: 'MINIMAL_SEQUENCE_MISSING' });
    expect(protocolDossierReadiness({ minimization: minimizationInput(), oracleFingerprint: '   ' })).toEqual({
      status: 'UNRESOLVED',
      reason: 'ORACLE_FINGERPRINT_MISSING',
    });
  });
});
