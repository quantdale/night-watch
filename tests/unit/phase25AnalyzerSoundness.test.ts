import { expect, test } from '@playwright/test';
import { analyzeSourceArtifact } from '../../src/core/semanticCoverage/sourceAnalyzers';
import { classifyContractDrift, compareContractShapes } from '../../src/core/semanticCoverage/discovery';
import type { ContractCandidate, DiscoveredContractShape } from '../../src/core/semanticCoverage/types';

const SHA_A = '1'.repeat(40);
const SHA_B = '2'.repeat(40);
const EVIDENCE_A = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const EVIDENCE_B = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';

function artifact(sourceText: string) {
  return {
    artifactId: 'phase25-range-soundness',
    language: 'TYPESCRIPT' as const,
    repoId: 'synthetic/phase25',
    sha: SHA_A,
    relativePath: 'src/validation.ts',
    symbol: 'validate',
    sourceText,
    observationSurfaces: ['SYNTHETIC' as const],
  };
}

function candidate(shape: DiscoveredContractShape | null, sourceSha = SHA_A, evidenceDigest = EVIDENCE_A): ContractCandidate {
  return {
    candidateId: 'phase25.synthetic.contract',
    artifactId: 'phase25-contract',
    source: { repoId: 'synthetic/phase25', sha: sourceSha, relativePath: 'src/contract.ts', symbol: 'contract', derivationVersion: 'phase25-test/v1', evidenceDigest },
    analyzerId: 'PHASE25_TEST',
    analyzerVersion: 'phase25-test/v1',
    behaviorClass: null,
    shape,
    proofStatus: 'MECHANICALLY_PROVABLE',
    rejectionCode: null,
    rejectionDetail: null,
    currentness: 'CURRENT',
    observationSurfaces: ['SYNTHETIC'],
    coverage: { sourceSurfaceExists: true, sourceMechanicallyUnderstood: true, semanticContractAdmitted: true, syntheticDetectionProven: false, scenarioExercisesContract: false, replayAvailable: false, replayReproduces: false, minimizationSupported: false, triageClassifiable: true, dossierExplainable: true },
    impactWeight: 1,
    deterministicDigest: 'candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
  };
}

test.describe('Phase 25 analyzer proof soundness', () => {
  test('proves inclusive and exclusive outward validation ranges with correct boundaries', () => {
    const inclusive = analyzeSourceArtifact(artifact('if (value < 0 || value > 100) { throw new Error("bounded"); }'));
    const inclusiveRange = inclusive.find((observation) => observation.analyzerId === 'TS_VALIDATION_RANGE' && observation.status === 'MECHANICALLY_PROVABLE');
    expect(inclusiveRange?.shape).toEqual({ kind: 'RANGE', field: 'value', lowerBound: 0, upperBound: 100, lowerInclusive: true, upperInclusive: true });

    const exclusive = analyzeSourceArtifact(artifact('if (value <= 0 || value >= 100) { throw new Error("bounded"); }'));
    const exclusiveRange = exclusive.find((observation) => observation.analyzerId === 'TS_VALIDATION_RANGE' && observation.status === 'MECHANICALLY_PROVABLE');
    expect(exclusiveRange?.shape).toEqual({ kind: 'RANGE', field: 'value', lowerBound: 0, upperBound: 100, lowerInclusive: false, upperInclusive: false });
  });

  test('rejects reversed operators, reversed bounds, ambiguous names, and unsupported guards', () => {
    const reversed = analyzeSourceArtifact(artifact('if (value > 0 || value < 100) { throw new Error("bounded"); }'));
    expect(reversed.some((observation) => observation.analyzerId === 'TS_VALIDATION_RANGE' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
    expect(reversed.some((observation) => observation.rejectionCode === 'UNSUPPORTED_SYNTAX')).toBe(true);

    const boundsReversed = analyzeSourceArtifact(artifact('if (value < 100 || value > 0) { throw new Error("bounded"); }'));
    expect(boundsReversed.some((observation) => observation.analyzerId === 'TS_VALIDATION_RANGE' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);

    const symbolic = analyzeSourceArtifact(artifact('if (value < lowerBound || value > upperBound) { throw new Error("bounded"); }'));
    expect(symbolic.every((observation) => observation.status === 'REJECTED')).toBe(true);
    expect(symbolic.some((observation) => observation.shape?.kind === 'RANGE')).toBe(false);
  });

  test('keeps valid evidence deterministic and never emits source text', () => {
    const source = 'if (value < 1 || value > 9) { throw new Error("bounded"); }';
    const first = analyzeSourceArtifact(artifact(source));
    const second = analyzeSourceArtifact(artifact(source));
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain(source);
    expect(first.every((observation) => observation.evidenceDigest.startsWith('ev:sha256:'))).toBe(true);
  });
});

test.describe('Phase 25 shape-aware contract drift', () => {
  test('classifies explicit field, type, enum, and range changes without JSON-size inference', () => {
    expect(compareContractShapes(
      { kind: 'FIELD_SET', fields: ['a'], requiredFields: ['a'], optionalFields: [] },
      { kind: 'FIELD_SET', fields: ['a', 'b'], requiredFields: ['a'], optionalFields: ['b'] },
    )).toBe('EXPANDED');
    expect(compareContractShapes(
      { kind: 'FIELD_TYPE', field: 'a', allowedTypes: ['STRING', 'NUMBER'] },
      { kind: 'FIELD_TYPE', field: 'a', allowedTypes: ['STRING'] },
    )).toBe('NARROWED');
    expect(compareContractShapes(
      { kind: 'FINITE_ENUM', field: 'a', valueCount: 2, valueSetDigest: 'set-a' },
      { kind: 'FINITE_ENUM', field: 'a', valueCount: 2, valueSetDigest: 'set-b' },
    )).toBe('INCOMPATIBLE_CHANGE');
    expect(compareContractShapes(
      { kind: 'RANGE', field: 'a', lowerBound: 0, upperBound: 10, lowerInclusive: true, upperInclusive: true },
      { kind: 'RANGE', field: 'a', lowerBound: -1, upperBound: 11, lowerInclusive: true, upperInclusive: true },
    )).toBe('EXPANDED');
    expect(compareContractShapes(
      { kind: 'RANGE', field: 'a', lowerBound: 0, upperBound: 10, lowerInclusive: true, upperInclusive: true },
      { kind: 'RANGE', field: 'a', lowerBound: 1, upperBound: 9, lowerInclusive: true, upperInclusive: true },
    )).toBe('NARROWED');
  });

  test('distinguishes unchanged evidence, semantic rederivation, incompatible change, and removal', () => {
    const shape: DiscoveredContractShape = { kind: 'DEFAULT', field: 'page', defaultType: 'NUMBER' };
    const unchanged = classifyContractDrift({ prior: candidate(shape), current: candidate(shape) });
    expect(unchanged.shapeChange).toBe('UNCHANGED');
    expect(unchanged.currentness).toBe('CURRENT');

    const evidenceOnly = classifyContractDrift({ prior: candidate(shape), current: candidate(shape, SHA_B, EVIDENCE_B) });
    expect(evidenceOnly.shapeChange).toBe('UNCHANGED');
    expect(evidenceOnly.currentness).toBe('SEMANTIC_REDERIVATION_REQUIRED');

    const incompatible = classifyContractDrift({
      prior: candidate(shape),
      current: candidate({ kind: 'DEFAULT', field: 'page', defaultType: 'STRING' }, SHA_B, EVIDENCE_B),
    });
    expect(incompatible.shapeChange).toBe('INCOMPATIBLE_CHANGE');
    expect(incompatible.currentness).toBe('INCOMPATIBLE_CHANGE');

    const removed = classifyContractDrift({ prior: candidate(shape), current: null });
    expect(removed.shapeChange).toBe('REMOVED');
    expect(removed.currentness).toBe('CONTRACT_REMOVED');
  });
});
