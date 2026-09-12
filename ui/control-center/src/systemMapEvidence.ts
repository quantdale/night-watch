/**
 * Group 8.7/8.8 — the system map evidence-status taxonomy.
 *
 * The wire carries a closed 13-value evidence vocabulary
 * (`EVIDENCE_STATUSES` in `src/core/systemMap/model.ts`). The map once matched
 * four historical tone values and every tone rule was dead, so the tones were
 * removed and the map rendered flat. The owner adopted the taxonomy: every
 * core value now has an explicit treatment, and a fourteenth value must fail
 * the completeness assertion rather than fall into a default bucket.
 *
 * The treatment is deliberately NOT colour: each status carries a unique
 * stroke width and dash pattern, which a colour-blind reader and a monochrome
 * print both keep. The exported mapping is total over the vocabulary and has
 * no fallback entry; `evaluateEvidenceTaxonomy` fails in both directions (a
 * value with no treatment, a treatment for a value that no longer exists).
 */

export interface EvidenceTreatment {
  /** The class the map applies to the node group. */
  readonly className: string;
  /** Non-colour channel 1: stroke width. */
  readonly strokeWidth: number;
  /** Non-colour channel 2: stroke dash pattern. */
  readonly strokeDasharray: string;
}

/**
 * Every treatment is unique in its `(strokeWidth, strokeDasharray)` pair, so
 * no two statuses can read identically outside colour.
 */
export const EVIDENCE_STATUS_TREATMENTS: Readonly<Record<string, EvidenceTreatment>> = Object.freeze({
  MECHANICALLY_PROVEN: Object.freeze({ className: 'map-node-evidence-mechanically-proven', strokeWidth: 2, strokeDasharray: 'none' }),
  READ_ONLY_PROVEN: Object.freeze({ className: 'map-node-evidence-read-only-proven', strokeWidth: 2, strokeDasharray: '10 2' }),
  REPLAY_PROVEN: Object.freeze({ className: 'map-node-evidence-replay-proven', strokeWidth: 2, strokeDasharray: '10 3' }),
  RUNTIME_OBSERVED: Object.freeze({ className: 'map-node-evidence-runtime-observed', strokeWidth: 2, strokeDasharray: '8 2' }),
  PRODUCTION_OBSERVED: Object.freeze({ className: 'map-node-evidence-production-observed', strokeWidth: 2, strokeDasharray: '8 3' }),
  SOURCE_ONLY: Object.freeze({ className: 'map-node-evidence-source-only', strokeWidth: 2, strokeDasharray: '6 2' }),
  PARTIAL: Object.freeze({ className: 'map-node-evidence-partial', strokeWidth: 2, strokeDasharray: '6 3' }),
  INFERRED: Object.freeze({ className: 'map-node-evidence-inferred', strokeWidth: 2, strokeDasharray: '4 2' }),
  STALE: Object.freeze({ className: 'map-node-evidence-stale', strokeWidth: 2, strokeDasharray: '4 3' }),
  UNAVAILABLE: Object.freeze({ className: 'map-node-evidence-unavailable', strokeWidth: 2, strokeDasharray: '2 2' }),
  MUTATION_CAPABLE: Object.freeze({ className: 'map-node-evidence-mutation-capable', strokeWidth: 2, strokeDasharray: '2 3' }),
  FINDING_PRESENT: Object.freeze({ className: 'map-node-evidence-finding-present', strokeWidth: 3, strokeDasharray: 'none' }),
  TRUNCATED: Object.freeze({ className: 'map-node-evidence-truncated', strokeWidth: 3, strokeDasharray: '4 2' }),
});

/**
 * An explicit lookup with NO default bucket. A value outside the vocabulary
 * gets no treatment; it never silently becomes some other status's look, and
 * the completeness assertion is what refuses to ship a fourteenth value.
 */
export function evidenceTreatmentFor(status: string): EvidenceTreatment | null {
  const table: Record<string, EvidenceTreatment> = EVIDENCE_STATUS_TREATMENTS;
  if (!Object.prototype.hasOwnProperty.call(table, status)) return null;
  return table[status] ?? null;
}

export interface EvidenceTaxonomyReport {
  /** Vocabulary values with no treatment. */
  readonly missing: readonly string[];
  /** Treatments for values the vocabulary no longer carries. */
  readonly unexpected: readonly string[];
  /** Pairs of statuses whose declared non-colour signatures collide. */
  readonly duplicateSignatures: readonly string[];
}

export function evaluateEvidenceTaxonomy(
  values: readonly string[],
  treatments: Readonly<Record<string, EvidenceTreatment>> = EVIDENCE_STATUS_TREATMENTS,
): EvidenceTaxonomyReport {
  const missing = values.filter((value) => !Object.prototype.hasOwnProperty.call(treatments, value)).sort();
  const unexpected = Object.keys(treatments).filter((key) => !values.includes(key)).sort();
  const seen = new Map<string, string>();
  const duplicateSignatures: string[] = [];
  for (const key of Object.keys(treatments).sort()) {
    const treatment = treatments[key];
    if (treatment === undefined) continue;
    const signature = `${treatment.strokeWidth}|${treatment.strokeDasharray}`;
    const previous = seen.get(signature);
    if (previous !== undefined) duplicateSignatures.push(`${previous} / ${key}`);
    else seen.set(signature, key);
  }
  return { missing, unexpected, duplicateSignatures: duplicateSignatures.sort() };
}
