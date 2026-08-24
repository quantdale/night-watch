import { expect, test } from '@playwright/test';
import {
  REAL_SOURCE_RESPONSE_ANALYZER_VERSION,
  analyzeSourceArtifact,
  existingAnalyzerIdentity,
  sourceSurfaceAnalyzerSetIdentity,
} from '../../src/core/semanticCoverage/sourceAnalyzers';
import { analyzeContract } from '../../src/oracles/expectations/extract/analyzer';

const SHA = '4'.repeat(40);

function artifact(sourceText: string, extended = true) {
  return {
    artifactId: 'phase26-adversarial-matrix',
    language: 'PHP' as const,
    repoId: 'synthetic/phase26',
    sha: SHA,
    relativePath: 'src/Handler/Matrix.php',
    symbol: 'readMatrix',
    sourceText,
    observationSurfaces: ['API', 'SYNTHETIC'] as const,
    includeExtendedResponseProof: extended,
  };
}

function directObjectProof(sourceText: string) {
  return analyzeSourceArtifact(artifact(sourceText)).find(
    (observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE',
  );
}

test.describe('Phase 26 adversarial response-proof corpus', () => {
  const cases: readonly {
    readonly name: string;
    readonly source: string;
    readonly admitted: boolean;
    readonly rejection?: string;
  }[] = [
    {
      name: 'literal keyed object',
      source: 'function readMatrix() { return [\'id\' => 1, \'status\' => \'ready\']; }',
      admitted: true,
    },
    {
      name: 'nested static value',
      source: 'function readMatrix() { return [\'items\' => [1, 2], \'meta\' => [\'count\' => 2]]; }',
      admitted: true,
    },
    {
      name: 'dynamic field value has structure but no invented type',
      source: 'function readMatrix($id) { return [\'id\' => $id, \'status\' => \'ready\']; }',
      admitted: true,
    },
    {
      name: 'dynamic key',
      source: 'function readMatrix($key) { return [$key => 1]; }',
      admitted: false,
      rejection: 'DYNAMIC_KEY_FLOW',
    },
    {
      name: 'duplicate key',
      source: 'function readMatrix() { return [\'id\' => 1, \'id\' => 2]; }',
      admitted: false,
      rejection: 'DYNAMIC_KEY_FLOW',
    },
    {
      name: 'unsafe prototype-like key',
      source: 'function readMatrix() { return [\'__proto__\' => 1]; }',
      admitted: false,
      rejection: 'DYNAMIC_KEY_FLOW',
    },
    {
      name: 'mixed keyed and indexed array',
      source: 'function readMatrix() { return [\'id\' => 1, 2]; }',
      admitted: false,
      rejection: 'DYNAMIC_KEY_FLOW',
    },
    {
      name: 'variable response',
      source: 'function readMatrix() { $payload = fetchResponse(); return $payload; }',
      admitted: false,
      rejection: 'BRANCH_SET_INCOMPLETE',
    },
    {
      name: 'legacy array constructor',
      source: 'function readMatrix() { return array(\'id\' => 1); }',
      admitted: false,
      rejection: 'BRANCH_SET_INCOMPLETE',
    },
    {
      name: 'branch field mismatch',
      source: 'function readMatrix($mode) { if ($mode) return [\'id\' => 1]; return [\'id\' => 2, \'status\' => \'ready\']; }',
      admitted: false,
      rejection: 'BRANCH_SET_INCOMPLETE',
    },
    {
      name: 'branch root mismatch',
      source: 'function readMatrix($mode) { if ($mode) return [\'id\' => 1]; return [1, 2]; }',
      admitted: false,
      rejection: 'BRANCH_SET_INCOMPLETE',
    },
    {
      name: 'comments and strings are not syntax',
      source: 'function readMatrix() { // return [\'fake\' => 1];\n $text = "return [\'fake\' => 2];"; return [\'id\' => 1]; }',
      admitted: true,
    },
    {
      name: 'malformed literal',
      source: 'function readMatrix() { return [\'id\' => [1, 2; }',
      admitted: false,
      rejection: 'DYNAMIC_KEY_FLOW',
    },
    {
      name: 'alias mutation',
      source: 'function readMatrix() { $payload = [\'id\' => 1]; $payload[\'status\'] = makeStatus(); return $payload; }',
      admitted: false,
      rejection: 'BRANCH_SET_INCOMPLETE',
    },
  ];

  for (const entry of cases) {
    test(`${entry.admitted ? 'admits' : 'rejects'} ${entry.name}`, () => {
      const observations = analyzeSourceArtifact(artifact(entry.source));
      const proof = directObjectProof(entry.source);
      expect(Boolean(proof)).toBe(entry.admitted);
      if (!entry.admitted) expect(observations.some((observation) => observation.rejectionCode === entry.rejection)).toBe(true);
      expect(JSON.stringify(observations)).not.toContain(entry.source);
      expect(observations.every((observation) => observation.evidenceDigest.startsWith('ev:sha256:'))).toBe(true);
    });
  }

  test('keeps the historical analyzer profile separate from extended real-source proof', () => {
    const source = 'function readMatrix() { return [\'id\' => 1, \'status\' => \'ready\']; }';
    const legacy = analyzeSourceArtifact(artifact(source, false));
    const extended = analyzeSourceArtifact(artifact(source, true));
    expect(legacy.some((observation) => observation.analyzerId.startsWith('PHP_RETURN_'))).toBe(false);
    expect(extended.some((observation) => observation.analyzerVersion === REAL_SOURCE_RESPONSE_ANALYZER_VERSION && observation.status === 'MECHANICALLY_PROVABLE')).toBe(true);
    expect(sourceSurfaceAnalyzerSetIdentity()).toBe(sourceSurfaceAnalyzerSetIdentity());
    expect(existingAnalyzerIdentity(analyzeContract({ language: 'php', sourceText: '$res[] = [\'id\' => 1]; return $res;', symbol: 'readMatrix', proofClass: 'LITERAL_ROW_FIELD_SET', accumulator: 'res', pattern: 'PUSH' }))).toMatch(/^ev:sha256:/);
  });

  test('keeps a root array structural proof bounded to root type', () => {
    const observations = analyzeSourceArtifact(artifact('function readMatrix($items) { return [$items, 1]; }'));
    expect(observations.find((observation) => observation.analyzerId === 'PHP_RETURN_ROOT_TYPE')?.shape).toEqual({
      kind: 'FIELD_TYPE',
      field: 'root',
      allowedTypes: ['ARRAY'],
    });
    expect(observations.some((observation) => observation.analyzerId === 'PHP_RETURN_FIELD_TYPE' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
  });
});
