// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — strict safe semantic finding DTO (SPEC §40, §41, §42,
// §74).
//
// Findings carry ONLY safe categorical metadata: category, oracle/expectation
// identity, source provenance, expected/observed classes, projection digests,
// relation ids. No rawBody, rawValue, rawExpected, rawObserved, DOM text, or
// arbitrary details map. Severity is the deterministic 'ANOMALY' class only —
// customer/business severity escalation belongs to triage/admission.
// ---------------------------------------------------------------------------

import type { SourceProvenance } from '../expectations/types';

export const SEMANTIC_ORACLE_FINDING_VERSION = 'nightwatch.semantic-oracle-finding.v1' as const;

export type SemanticFindingCategory =
  | 'APPLICATION_ERROR_ENVELOPE'
  | 'LIST_DETAIL_IDENTITY_MISMATCH'
  | 'STALE_STATE_AFTER_TRANSITION'
  | 'AGGREGATE_RELATION_MISMATCH'
  | 'CARDINALITY_RELATION_MISMATCH'
  | 'SOURCE_EXPECTATION_MISMATCH';

export type SemanticFindingSeverity = 'ANOMALY';

export interface SemanticOracleFinding {
  readonly schemaVersion: typeof SEMANTIC_ORACLE_FINDING_VERSION;
  readonly findingId: string;
  readonly oracleId: string;
  readonly category: SemanticFindingCategory;
  readonly severity: SemanticFindingSeverity;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
  readonly expectationId: string;
  /** Safe source provenance (repoId, SHA, relative path, symbol); never an
   *  absolute local path. */
  readonly sourceProvenance: SourceProvenance;
  readonly expectedClass: string;
  readonly observedClass: string;
  readonly projectionDigests: readonly string[];
  readonly relationId?: string;
}

export const SEMANTIC_FINDING_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'findingId',
  'oracleId',
  'category',
  'severity',
  'journeyId',
  'stepId',
  'operationId',
  'expectationId',
  'sourceProvenance',
  'expectedClass',
  'observedClass',
  'projectionDigests',
  'relationId',
]);

export const SEMANTIC_FINDING_CATEGORIES: readonly SemanticFindingCategory[] = [
  'APPLICATION_ERROR_ENVELOPE',
  'LIST_DETAIL_IDENTITY_MISMATCH',
  'STALE_STATE_AFTER_TRANSITION',
  'AGGREGATE_RELATION_MISMATCH',
  'CARDINALITY_RELATION_MISMATCH',
  'SOURCE_EXPECTATION_MISMATCH',
];

/** Strict structural validation of a finding DTO (unknown fields rejected;
 *  SPEC §40). Throws `SEMANTIC_FINDING_INVALID:<detail>`. */
export function validateSemanticFinding(finding: SemanticOracleFinding): void {
  if (finding.schemaVersion !== SEMANTIC_ORACLE_FINDING_VERSION) {
    throw new Error(`SEMANTIC_FINDING_INVALID:schemaVersion`);
  }
  for (const key of Object.keys(finding)) {
    if (!SEMANTIC_FINDING_SAFE_FIELDS.has(key)) throw new Error(`SEMANTIC_FINDING_INVALID:unknown-field:${key}`);
  }
  if (!SEMANTIC_FINDING_CATEGORIES.includes(finding.category)) {
    throw new Error(`SEMANTIC_FINDING_INVALID:category`);
  }
  if (finding.severity !== 'ANOMALY') throw new Error(`SEMANTIC_FINDING_INVALID:severity`);
  if (!/^[0-9a-f]{40}$/.test(finding.sourceProvenance.sha)) throw new Error(`SEMANTIC_FINDING_INVALID:provenance-sha`);
  if (finding.sourceProvenance.relativePath.startsWith('/') || finding.sourceProvenance.relativePath.includes('..')) {
    throw new Error(`SEMANTIC_FINDING_INVALID:provenance-path`);
  }
  if (finding.projectionDigests.length === 0 || finding.projectionDigests.some((digest) => !/^proj:sha256:[0-9a-f]{24}$/.test(digest))) {
    throw new Error(`SEMANTIC_FINDING_INVALID:projection-digest`);
  }
  if (!/^finding:sha256:[0-9a-f]{24}$/.test(finding.findingId)) throw new Error(`SEMANTIC_FINDING_INVALID:finding-id`);
}
