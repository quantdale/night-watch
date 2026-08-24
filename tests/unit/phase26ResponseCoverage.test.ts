import { expect, test } from '@playwright/test';
import { analyzeSourceArtifact } from '../../src/core/semanticCoverage/sourceAnalyzers';

const SHA = '1'.repeat(40);

function artifact(sourceText: string) {
  return {
    artifactId: 'phase26.response.coverage',
    language: 'PHP' as const,
    repoId: 'synthetic/phase26',
    sha: SHA,
    relativePath: 'src/App/Handler/Example.php',
    symbol: 'readExample',
    sourceText,
    observationSurfaces: ['API', 'SYNTHETIC'] as const,
    includeExtendedResponseProof: true as const,
  };
}

test.describe('Phase 26 direct PHP response proof', () => {
  test('proves identical keyed return fields and scalar literal field types', () => {
    const observations = analyzeSourceArtifact(artifact(`
      function readExample($mode) {
        if ($mode) {
          return ['id' => 1, 'status' => 'ready'];
        }
        return ['id' => 2, 'status' => 'fallback'];
      }
    `));

    expect(observations.find((observation) => observation.analyzerId === 'PHP_RETURN_ROOT_TYPE')?.shape).toEqual({
      kind: 'FIELD_TYPE',
      field: 'root',
      allowedTypes: ['OBJECT'],
    });
    expect(observations.find((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS')?.shape).toEqual({
      kind: 'FIELD_SET',
      fields: ['id', 'status'],
      requiredFields: ['id', 'status'],
      optionalFields: [],
    });
    expect(observations.filter((observation) => observation.analyzerId === 'PHP_RETURN_FIELD_TYPE' && observation.status === 'MECHANICALLY_PROVABLE').map((observation) => observation.shape)).toEqual([
      { kind: 'FIELD_TYPE', field: 'id', allowedTypes: ['NUMBER'] },
      { kind: 'FIELD_TYPE', field: 'status', allowedTypes: ['STRING'] },
    ]);
  });

  test('proves a bounded root array without inventing item fields', () => {
    const observations = analyzeSourceArtifact(artifact(`
      function readExample($items) {
        return [$items, 1];
      }
    `));
    expect(observations.find((observation) => observation.analyzerId === 'PHP_RETURN_ROOT_TYPE' && observation.status === 'MECHANICALLY_PROVABLE')?.shape).toEqual({
      kind: 'FIELD_TYPE',
      field: 'root',
      allowedTypes: ['ARRAY'],
    });
    expect(observations.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
  });

  test('rejects variable, dynamic-key, and branch-mismatched returns', () => {
    const variable = analyzeSourceArtifact(artifact(`
      function readExample($mode) {
        if ($mode) return ['id' => 1];
        return $this->buildExample();
      }
    `));
    expect(variable.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
    expect(variable.some((observation) => observation.rejectionCode === 'BRANCH_SET_INCOMPLETE')).toBe(true);

    const dynamicKey = analyzeSourceArtifact(artifact(`
      function readExample($key) {
        return [$key => 1];
      }
    `));
    expect(dynamicKey.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
    expect(dynamicKey.some((observation) => observation.rejectionCode === 'DYNAMIC_KEY_FLOW')).toBe(true);

    const mismatch = analyzeSourceArtifact(artifact(`
      function readExample($mode) {
        if ($mode) return ['id' => 1];
        return ['id' => 2, 'status' => 'ready'];
      }
    `));
    expect(mismatch.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
    expect(mismatch.some((observation) => observation.rejectionCode === 'BRANCH_SET_INCOMPLETE')).toBe(true);
  });

  test('does not treat comments or code-like strings as response proof and is deterministic', () => {
    const source = `
      function readExample() {
        // return ['fake' => 'comment'];
        $text = "return ['fake' => 'string'];";
        return ['id' => 1];
      }
    `;
    const first = analyzeSourceArtifact(artifact(source));
    const second = analyzeSourceArtifact(artifact(source));
    expect(first).toEqual(second);
    expect(first.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(true);
    expect(JSON.stringify(first)).not.toContain(source);
  });

  test('rejects unsafe source at the boundary before direct-return analysis', () => {
    const observations = analyzeSourceArtifact(artifact("function readExample() { return ['id' => 'PRIVACY_SENTINEL']; }"));
    expect(observations).toHaveLength(1);
    expect(observations[0]?.rejectionCode).toBe('PRIVACY_UNSAFE_SOURCE');
  });
});
