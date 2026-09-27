// M7 task 8.4 (NW-AUD-040 narrowed) — regex-over-raw-text analyzers produce
// HEURISTIC observations that can never back a proven candidate, and a
// truncated observation budget is reported.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MAX_ANALYZER_OUTPUTS, analyzeSourceArtifact } from '../../src/core/semanticCoverage/sourceAnalyzers';
import { PHASE20_SOURCE_SHA, PHASE20_TYPESCRIPT_ARTIFACT } from '../../corpus/phase20/sourceFixtures';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function goArtifact(sourceText: string) {
  return {
    ...PHASE20_TYPESCRIPT_ARTIFACT,
    artifactId: 'phase20.go.struct',
    language: 'GO' as const,
    relativePath: 'internal/model/example.go',
    symbol: 'Example',
    sourceText,
  };
}

test.describe('analyzer proof tier (8.4)', () => {
  test('a Go struct regex extraction is HEURISTIC, never mechanically provable', () => {
    const observations = analyzeSourceArtifact(goArtifact('type Example struct {\n\tTotal string `json:"total"`\n}\n'));
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.some((observation) => observation.status === 'HEURISTIC')).toBe(true);
    for (const observation of observations) {
      expect(observation.status).not.toBe('MECHANICALLY_PROVABLE');
    }
  });

  test('the TypeScript regex extraction is HEURISTIC too', () => {
    const observations = analyzeSourceArtifact(PHASE20_TYPESCRIPT_ARTIFACT);
    expect(observations.length).toBeGreaterThan(0);
    // The regex-driven TS_STATIC_* family is heuristic...
    const regexFamily = observations.filter((observation) => observation.analyzerId.startsWith('TS_STATIC'));
    expect(regexFamily.length).toBeGreaterThan(0);
    expect(regexFamily.every((observation) => observation.status === 'HEURISTIC')).toBe(true);
    // ...while any structurally derived observation may still be provable, and
    // nothing in the regex family ever is.
    expect(observations.filter((observation) => observation.status === 'HEURISTIC' && !observation.analyzerId.startsWith('TS_STATIC'))).toEqual([]);
  });

  test('a structural (JSON) OpenAPI extraction stays mechanically provable', () => {
    const observations = analyzeSourceArtifact({
      ...PHASE20_TYPESCRIPT_ARTIFACT,
      artifactId: 'phase20.openapi.schema',
      language: 'OPENAPI' as const,
      relativePath: 'openapi/example.json',
      symbol: 'Example',
      sourceText: JSON.stringify({ type: 'object', required: ['total'], properties: { total: { type: 'string' } } }),
    });
    expect(observations.some((observation) => observation.status === 'MECHANICALLY_PROVABLE')).toBe(true);
  });

  test('a truncated observation budget is reported, never silently sliced', () => {
    // Each enum block yields one observation; ask for far more than the budget.
    const blocks = Array.from(
      { length: MAX_ANALYZER_OUTPUTS + 50 },
      (_, index) => `field${index}: { enum: ["open", "closed"] }`,
    );
    const observations = analyzeSourceArtifact({
      ...PHASE20_TYPESCRIPT_ARTIFACT,
      artifactId: 'phase20.typescript.wide',
      sourceText: `const schema = {\n${blocks.join(',\n')}\n};\n`,
    });
    expect(observations.length).toBeLessThanOrEqual(MAX_ANALYZER_OUTPUTS);
    const truncation = observations.find((observation) => observation.rejectionCode === 'ANALYZER_OUTPUT_TRUNCATED');
    expect(truncation, 'the budget truncation must be reported').toBeTruthy();
    expect(truncation?.analyzerId).toBe('ANALYZER_OUTPUT_BUDGET');
  });

  test('the proven selection filters on the mechanically provable status only', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'source', 'surfaces.ts'), 'utf8');
    // Every proven-candidate filter compares against MECHANICALLY_PROVABLE, so
    // a HEURISTIC observation is excluded by construction.
    const filters = source.match(/status === 'MECHANICALLY_PROVABLE'/g) ?? [];
    expect(filters.length).toBeGreaterThanOrEqual(4);
    expect(source).not.toContain("status === 'HEURISTIC'");
  });
});
