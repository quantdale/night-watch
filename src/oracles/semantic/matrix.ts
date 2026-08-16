// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — fixed fixture evaluation report (SPEC §66).
//
// Pure counting over the fixed synthetic corpus; precision/recall are
// DERIVED from raw counts, never claimed beyond the fixture corpus. The
// corpus wiring (which raw bodies belong to which expectation and class)
// lives in the fixture matrix test; this module only computes the report.
// ---------------------------------------------------------------------------

export const PHASE9_FIXTURE_MATRIX_VERSION = 'nightwatch.phase9-fixture-matrix.v1' as const;

export interface CorpusRunRow {
  /** One of the five required seeded semantic classes, or 'BENIGN'. */
  readonly className: string;
  readonly outcome: 'ANOMALY' | 'PASS' | 'NOT_APPLICABLE' | 'EXPECTATION_UNAVAILABLE' | 'EXPECTATION_SOURCE_STALE' | 'INVALID_INPUT' | 'PROJECTION_LIMIT_EXCEEDED';
  readonly category: string | null;
}

export interface OraclePrecisionReport {
  readonly matrixVersion: typeof PHASE9_FIXTURE_MATRIX_VERSION;
  readonly seededDefects: number;
  readonly detectedSeededDefects: number;
  readonly missedSeededDefects: number;
  readonly benignCases: number;
  readonly falsePositiveBenignCases: number;
  /** detected / (detected + false positives); 1 when FP = 0. */
  readonly precision: number;
  /** detected / seeded defects. */
  readonly recall: number;
  readonly detectedClasses: readonly string[];
  readonly missedClasses: readonly string[];
}

/** Compute the fixed-corpus report from raw row outcomes. */
export function computeOraclePrecisionReport(
  rows: readonly CorpusRunRow[],
  requiredClasses: readonly string[],
): OraclePrecisionReport {
  const defectRows = rows.filter((row) => row.className !== 'BENIGN');
  const benignRows = rows.filter((row) => row.className === 'BENIGN');

  const detectedClasses = new Set<string>();
  const missedClasses = new Set<string>(requiredClasses);
  for (const row of defectRows) {
    if (row.outcome === 'ANOMALY' && row.category !== null) {
      detectedClasses.add(row.className);
      missedClasses.delete(row.className);
    }
  }
  const detectedSeededDefects = detectedClasses.size;
  const falsePositiveBenignCases = benignRows.filter((row) => row.outcome === 'ANOMALY').length;
  const seededDefects = defectRows.length;
  const benignCases = benignRows.length;

  return {
    matrixVersion: PHASE9_FIXTURE_MATRIX_VERSION,
    seededDefects,
    detectedSeededDefects,
    missedSeededDefects: seededDefects - detectedSeededDefects,
    benignCases,
    falsePositiveBenignCases,
    precision: detectedSeededDefects + falsePositiveBenignCases === 0 ? 0 : detectedSeededDefects / (detectedSeededDefects + falsePositiveBenignCases),
    recall: seededDefects === 0 ? 0 : detectedSeededDefects / seededDefects,
    detectedClasses: [...detectedClasses].sort(),
    missedClasses: [...missedClasses].sort(),
  };
}
