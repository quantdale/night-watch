// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — sanitized dossier evidence for semantic findings
// (SPEC §51, §73).
//
// The dossier carries only safe metadata about semantic findings: category,
// expectation identity, source provenance (repoId/SHA/relative path), and
// the expected/observed classes. No raw values, no projection digests, no
// customer data, no absolute paths.
// ---------------------------------------------------------------------------

import type { SemanticFindingCategory, SemanticOracleFinding } from './types';

export const SEMANTIC_DOSSIER_EVIDENCE_VERSION = 'nightwatch.semantic-dossier-evidence.v1' as const;

export interface SemanticFindingSummary {
  readonly category: SemanticFindingCategory;
  readonly expectationId: string;
  readonly sourceRepoId: string;
  readonly sourceSHA: string;
  readonly sourceRelativePath: string;
  readonly expectedClass: string;
  readonly observedClass: string;
  readonly relationId?: string;
}

export interface SemanticDossierEvidence {
  readonly schemaVersion: typeof SEMANTIC_DOSSIER_EVIDENCE_VERSION;
  readonly findingCount: number;
  readonly categories: readonly SemanticFindingCategory[];
  readonly findings: readonly SemanticFindingSummary[];
}

const SAFE_CLASS_RE = /^[A-Z0-9_]{1,80}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const MAX_FINDINGS_IN_DOSSIER = 32;

export function toSemanticDossierEvidence(
  findings: readonly SemanticOracleFinding[],
): SemanticDossierEvidence | null {
  if (findings.length === 0) return null;
  const summaries: SemanticFindingSummary[] = findings.slice(0, MAX_FINDINGS_IN_DOSSIER).map((finding) => ({
    category: finding.category,
    expectationId: finding.expectationId,
    sourceRepoId: finding.sourceProvenance.repoId,
    sourceSHA: finding.sourceProvenance.sha,
    sourceRelativePath: finding.sourceProvenance.relativePath,
    expectedClass: finding.expectedClass,
    observedClass: finding.observedClass,
    ...(finding.relationId === undefined ? {} : { relationId: finding.relationId }),
  }));
  const categories = [...new Set(summaries.map((summary) => summary.category))].sort();
  const evidence: SemanticDossierEvidence = {
    schemaVersion: SEMANTIC_DOSSIER_EVIDENCE_VERSION,
    findingCount: summaries.length,
    categories,
    findings: summaries,
  };
  validateSemanticDossierEvidence(evidence);
  return evidence;
}

/** Strict validation of the dossier evidence block (rejects unknown fields,
 *  malformed provenance, unbounded classes). */
export function validateSemanticDossierEvidence(evidence: SemanticDossierEvidence): void {
  if (evidence.schemaVersion !== SEMANTIC_DOSSIER_EVIDENCE_VERSION) {
    throw new Error('DOSSIER_SEMANTIC_EVIDENCE_VERSION_INVALID');
  }
  for (const key of Object.keys(evidence)) {
    if (!['schemaVersion', 'findingCount', 'categories', 'findings'].includes(key)) {
      throw new Error('DOSSIER_SEMANTIC_EVIDENCE_UNKNOWN_FIELD');
    }
  }
  if (evidence.findingCount !== evidence.findings.length || evidence.findings.length > MAX_FINDINGS_IN_DOSSIER) {
    throw new Error('DOSSIER_SEMANTIC_EVIDENCE_COUNT_INVALID');
  }
  for (const summary of evidence.findings) {
    for (const key of Object.keys(summary)) {
      if (!['category', 'expectationId', 'sourceRepoId', 'sourceSHA', 'sourceRelativePath', 'expectedClass', 'observedClass', 'relationId'].includes(key)) {
        throw new Error('DOSSIER_SEMANTIC_EVIDENCE_UNKNOWN_FIELD');
      }
    }
    if (!['APPLICATION_ERROR_ENVELOPE', 'LIST_DETAIL_IDENTITY_MISMATCH', 'STALE_STATE_AFTER_TRANSITION', 'AGGREGATE_RELATION_MISMATCH', 'CARDINALITY_RELATION_MISMATCH', 'SOURCE_EXPECTATION_MISMATCH'].includes(summary.category)) {
      throw new Error('DOSSIER_SEMANTIC_EVIDENCE_CATEGORY_INVALID');
    }
    if (!SHA_RE.test(summary.sourceSHA)) throw new Error('DOSSIER_SEMANTIC_EVIDENCE_SHA_INVALID');
    if (summary.sourceRelativePath.startsWith('/') || summary.sourceRelativePath.includes('..')) {
      throw new Error('DOSSIER_SEMANTIC_EVIDENCE_PATH_ESCAPE');
    }
    if (!SAFE_CLASS_RE.test(summary.expectedClass) || !SAFE_CLASS_RE.test(summary.observedClass)) {
      throw new Error('DOSSIER_SEMANTIC_EVIDENCE_CLASS_INVALID');
    }
    if (summary.relationId !== undefined && !/^[A-Za-z0-9._:/-]{1,200}$/.test(summary.relationId)) {
      throw new Error('DOSSIER_SEMANTIC_EVIDENCE_RELATION_INVALID');
    }
  }
}
