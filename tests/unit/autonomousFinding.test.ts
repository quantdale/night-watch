// ---------------------------------------------------------------------------
// Lane G — autonomous finding dossier, permanent acceptance matrix.
//
// Everything here is synthetic and local-only. No DEV/NEXT/production
// contact, no network, no outbound report path.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  AUTONOMOUS_FINDING_AUTHORITY,
  AUTONOMOUS_SEVERITIES,
  buildAutonomousFindingDossier,
  projectAutonomousDossierToHandoff,
  type AutonomousFindingDraft,
} from '../../src/core/autonomousFinding';
import {
  AUTONOMOUS_FINDING_VERSION,
  findingAuthorityIsLocalOnly,
} from '../../src/core/agentProtocol';
import type { AlphausFindingHandoff } from '../../src/core/alphausHandoff/types';

function draft(overrides: Partial<AutonomousFindingDraft> = {}): AutonomousFindingDraft {
  return {
    title: 'Checkout totals drift under concurrent coupon apply',
    description: 'Two rapid coupon applications produce a total that matches neither coupon.',
    recommendedSeverity: 'S2',
    severityConfidence: 'MEDIUM',
    severityRationale: 'Checkout total is wrong after a realistic double-submit; no data loss observed.',
    catchStage: 'local-replay',
    source: 'synthetic-campaign',
    team: 'UNKNOWN',
    reproduction: '1. Open checkout 2. Apply coupon twice quickly 3. Read total',
    expected: 'Total reflects exactly one coupon application.',
    actual: 'Total reflects a blend of both applications.',
    evidenceRefs: ['run:local:2026-09-06:replay-41'],
    screenshotRefs: ['shot:checkout-total:after-double-coupon'],
    sourceLocations: ['src/checkout/total.ts:118'],
    affectedApis: ['POST /checkout/apply-coupon'],
    environment: 'LOCAL',
    confidence: 'MEDIUM',
    alternativeHypotheses: ['Stale read from the totals cache.'],
    falsePositiveChecks: ['Re-ran with cache bypass; drift persisted.'],
    reproductionCount: 3,
    relatedHistoricalBugs: ['atlas:coupon-idempotency-7'],
    violatedInvariant: 'coupon-apply-is-idempotent',
    provenance: ['local-replay:campaign-41'],
    ...overrides,
  };
}

test.describe('autonomous finding dossier authority', () => {
  test('authority is exactly the frozen local-only constant', () => {
    const dossier = buildAutonomousFindingDossier(draft());
    expect(dossier.authority).toBe(AUTONOMOUS_FINDING_AUTHORITY);
    expect(dossier.authority.humanReviewRequired).toBe(true);
    expect(dossier.authority.externalPublication).toBe('PROHIBITED');
    expect(dossier.authority.autoFile).toBe(false);
    expect(dossier.authority.autoLeslie).toBe(false);
    expect(dossier.authority.autoSlack).toBe(false);
    expect(dossier.authority.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    expect(findingAuthorityIsLocalOnly(dossier)).toBe(true);
  });

  test('dossier carries the frozen schema version', () => {
    expect(buildAutonomousFindingDossier(draft()).schemaVersion).toBe(AUTONOMOUS_FINDING_VERSION);
  });
});

test.describe('severity vocabulary', () => {
  test('S1-S4 are each accepted as recommendations', () => {
    for (const severity of AUTONOMOUS_SEVERITIES) {
      const dossier = buildAutonomousFindingDossier(draft({ recommendedSeverity: severity }));
      expect(dossier.recommendedSeverity).toBe(severity);
    }
    expect([...AUTONOMOUS_SEVERITIES].sort()).toEqual(['S1', 'S2', 'S3', 'S4']);
  });

  test('non-protocol severities are refused', () => {
    for (const severity of ['S0', 'S5', 'critical', 'P1', '']) {
      expect(() => buildAutonomousFindingDossier(
        draft({ recommendedSeverity: severity as AutonomousFindingDraft['recommendedSeverity'] }),
      )).toThrow('AUTONOMOUS_FINDING_INVALID:UNKNOWN_SEVERITY');
    }
  });
});

test.describe('fail-closed evidence rules', () => {
  test('bogus finding without evidence is rejected', () => {
    expect(() => buildAutonomousFindingDossier(draft({ evidenceRefs: [] }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_EVIDENCE',
    );
  });

  test('finding without a reproduction is rejected', () => {
    expect(() => buildAutonomousFindingDossier(draft({ reproductionCount: 0 }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_REPRODUCTION_COUNT',
    );
  });

  test('finding without false-positive work is rejected', () => {
    expect(() => buildAutonomousFindingDossier(draft({ falsePositiveChecks: [] }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_FALSE_POSITIVE_CHECKS',
    );
  });

  test('finding without provenance is rejected', () => {
    expect(() => buildAutonomousFindingDossier(draft({ provenance: [] }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_PROVENANCE',
    );
  });

  test('missing finding-grade prose is rejected', () => {
    expect(() => buildAutonomousFindingDossier(draft({ title: '  ' }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_TITLE',
    );
    expect(() => buildAutonomousFindingDossier(draft({ severityRationale: '' }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_SEVERITY_RATIONALE',
    );
    expect(() => buildAutonomousFindingDossier(draft({ reproduction: '' }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_REPRODUCTION',
    );
    expect(() => buildAutonomousFindingDossier(draft({ expected: '' }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_EXPECTED',
    );
    expect(() => buildAutonomousFindingDossier(draft({ actual: '' }))).toThrow(
      'AUTONOMOUS_FINDING_INVALID:MISSING_ACTUAL',
    );
  });

  test('unknown environment and confidence are refused', () => {
    expect(() => buildAutonomousFindingDossier(
      draft({ environment: 'PRODUCTION' as AutonomousFindingDraft['environment'] }),
    )).toThrow('AUTONOMOUS_FINDING_INVALID:UNKNOWN_ENVIRONMENT');
    expect(() => buildAutonomousFindingDossier(
      draft({ confidence: 'PROVEN' as AutonomousFindingDraft['confidence'] }),
    )).toThrow('AUTONOMOUS_FINDING_INVALID:UNKNOWN_CONFIDENCE');
  });

  test('unproven team defaults to UNKNOWN rather than guessing', () => {
    expect(buildAutonomousFindingDossier(draft({ team: undefined })).team).toBe('UNKNOWN');
    expect(buildAutonomousFindingDossier(draft({ team: null })).team).toBe('UNKNOWN');
  });
});

test.describe('no outbound report surface', () => {
  test('the cone holds no submission connector at grep level', () => {
    const cone = path.join(__dirname, '../../src/core/autonomousFinding');
    const files = fs.readdirSync(cone).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    const connector = /(leslie|slack|pondr|webhook|createIssue|fileReport|postTo|Ticket|Notifier)/i;
    const transport = /\bfetch\s*\(|child_process|node:(net|http|https|dns)/;
    for (const file of files) {
      const source = fs.readFileSync(path.join(cone, file), 'utf8');
      expect(source, `${file} must hold no submission connector`).not.toMatch(connector);
      expect(source, `${file} must hold no transport`).not.toMatch(transport);
    }
  });
});

test.describe('handoff projection', () => {
  test('projection authority preserves every PROHIBITED literal', () => {
    const projected = projectAutonomousDossierToHandoff(buildAutonomousFindingDossier(draft()));
    expect(projected.authority.humanReviewRequired).toBe(true);
    expect(projected.authority.executable).toBe(false);
    expect(projected.authority.externalPublication).toBe('PROHIBITED');
    expect(projected.authority.autoFile).toBe(false);
    expect(projected.authority.autoApprove).toBe(false);
    // Type-level proof: the projection is assignable to the existing
    // handoff authority without weakening any literal.
    const asHandoffAuthority: AlphausFindingHandoff['authority'] = projected.authority;
    expect(asHandoffAuthority.externalPublication).toBe('PROHIBITED');
  });

  test('organizational classifications stay UNKNOWN with basis', () => {
    const projected = projectAutonomousDossierToHandoff(buildAutonomousFindingDossier(draft()));
    for (const recommendation of [
      projected.severityRecommendation,
      projected.catchStageRecommendation,
      projected.sourceRecommendation,
      projected.teamRecommendation,
    ]) {
      expect(recommendation.value).toBe('UNKNOWN');
      expect(recommendation.basis.trim().length).toBeGreaterThan(0);
      expect(recommendation.provenance.trim().length).toBeGreaterThan(0);
    }
    // The AI severity informs the basis text but never becomes a verdict.
    expect(projected.severityRecommendation.basis).toContain('S2');
    expect(projected.severityRecommendation.basis).toMatch(/advisory only/i);
  });

  test('proven facts pass through verbatim for human review', () => {
    const input = draft();
    const projected = projectAutonomousDossierToHandoff(buildAutonomousFindingDossier(input));
    expect(projected.facts.title).toBe(input.title);
    expect(projected.facts.reproduction).toBe(input.reproduction);
    expect(projected.facts.expected).toBe(input.expected);
    expect(projected.facts.actual).toBe(input.actual);
    expect([...projected.facts.evidenceRefs]).toEqual([...input.evidenceRefs]);
    expect(projected.facts.reproductionCount).toBe(input.reproductionCount);
  });
});
