import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_STATUS_TREATMENTS,
  evaluateEvidenceTaxonomy,
  evidenceTreatmentFor,
} from './systemMapEvidence';

/**
 * Group 8.7/8.8 — the evidence-status taxonomy is total over the core
 * vocabulary.
 *
 * The wire vocabulary is authoritative and lives in
 * `src/core/systemMap/model.ts`. This suite reads it from source instead of
 * restating it, so the UI copy cannot silently drift from the model. Adding a
 * fourteenth value fails here until it has an explicit treatment; adding a
 * treatment for a value that no longer exists fails too. No fallback entry
 * exists, and the classes are bound to the stylesheet in both directions.
 */

const ROOT = resolve(process.cwd(), '..', '..');
const MODEL = readFileSync(resolve(ROOT, 'src/core/systemMap/model.ts'), 'utf8');
const STYLES = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function coreEvidenceValues(): readonly string[] {
  const block = /export const EVIDENCE_STATUSES = \[([\s\S]*?)\] as const;/.exec(MODEL);
  if (block === null) throw new Error('EVIDENCE_STATUSES_NOT_FOUND');
  const values = [...(block[1] as string).matchAll(/'([A-Z_]+)'/g)].map((match) => match[1] as string);
  return values;
}

describe('system map evidence-status taxonomy', () => {
  it('is total over the 13-value core vocabulary, with no default bucket', () => {
    const values = coreEvidenceValues();
    // The wire contract's own count is part of the checked surface: a silent
    // shrink of the vocabulary is a defect, not a simplification.
    expect(values).toHaveLength(13);
    const report = evaluateEvidenceTaxonomy(values);
    expect(report.missing).toEqual([]);
    expect(report.unexpected).toEqual([]);
    expect(report.duplicateSignatures).toEqual([]);
  });

  it('fails the completeness assertion when a fourteenth value appears', () => {
    const values = [...coreEvidenceValues(), 'SYNTHETIC_FOURTEENTH_STATUS'];
    const report = evaluateEvidenceTaxonomy(values);
    expect(report.missing).toEqual(['SYNTHETIC_FOURTEENTH_STATUS']);
    // The unknown value is not absorbed by any bucket: the lookup is null.
    expect(evidenceTreatmentFor('SYNTHETIC_FOURTEENTH_STATUS')).toBeNull();
  });

  it('fails when a treatment names a value the vocabulary no longer carries', () => {
    const report = evaluateEvidenceTaxonomy(coreEvidenceValues().filter((value) => value !== 'STALE'));
    expect(report.unexpected).toEqual(['STALE']);
  });

  it('binds every treatment to a stylesheet rule with a non-colour distinction', () => {
    const values = coreEvidenceValues();
    const declaredClasses = new Set(
      [...STYLES.matchAll(/\.(map-node-evidence-[a-z-]+)/g)].map((match) => match[1] as string),
    );
    const treatmentClasses = new Set(Object.values(EVIDENCE_STATUS_TREATMENTS).map((treatment) => treatment.className));
    expect([...treatmentClasses].filter((name) => !declaredClasses.has(name))).toEqual([]);
    expect([...declaredClasses].filter((name) => !treatmentClasses.has(name))).toEqual([]);
    for (const value of values) {
      const treatment = evidenceTreatmentFor(value);
      expect(treatment).not.toBeNull();
      if (treatment === null) continue;
      // The className is the kebab form of the value, checked mechanically so
      // a typo cannot attach one status's rule to another status's node.
      expect(treatment.className).toBe(`map-node-evidence-${value.toLowerCase().replace(/_/g, '-')}`);
      const rule = new RegExp(`\\.${treatment.className}\\b[^{]*\\{([^}]*)\\}`).exec(STYLES);
      expect(rule, `${treatment.className} has no rule`).not.toBeNull();
      expect(rule?.[1]).toMatch(/stroke-dasharray/);
      expect(rule?.[1]).toMatch(/stroke-width/);
    }
  });
});
