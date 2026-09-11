// G20 accessibility probe — the pure half of the certification lane.
//
// These probes fix the arithmetic and the both-direction exemption discipline
// so the browser lane can fail loud on a real composition. A checker that
// cannot reject a colour-only pair, or that accepts an exemption for a pair
// that now passes, proves nothing about the built bundle; both are exercised
// here with synthetic observations.

import { expect, test } from '@playwright/test';
import {
  LARGE_TEXT_CONTRAST,
  NORMAL_TEXT_CONTRAST,
  NON_TEXT_STATUS_CONTRAST,
  compositeOver,
  contrastRatio,
  contrastViolations,
  isLargeText,
  measureContrast,
  parseCssColour,
  resolveBackground,
  statusDistinctionViolations,
  structuralViolations,
  type ContrastReport,
  type StatusSweep,
  type StructuralAuditResult,
} from '../browser/helpers/accessibility';

test.describe('accessibility contrast arithmetic', () => {
  test('parses computed rgb/rgba colours and rejects non-colours', () => {
    expect(parseCssColour('rgb(11, 17, 24)')).toEqual({ r: 11, g: 17, b: 24, a: 1 });
    expect(parseCssColour('rgba(112, 195, 155, 0.72)')).toEqual({ r: 112, g: 195, b: 155, a: 0.72 });
    expect(parseCssColour('transparent')).toBeNull();
    expect(parseCssColour('none')).toBeNull();
  });

  test('composites alpha layers bottom-up', () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };
    expect(compositeOver(black, white)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    const halfGrey = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, white);
    expect(Math.round(halfGrey.r)).toBe(128);
    // A transparent stack with no opaque base is unresolvable, never white.
    expect(resolveBackground(['rgba(0, 0, 0, 0)', 'rgba(255, 255, 255, 0.5)'])).toBeNull();
    const stacked = resolveBackground(['rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)']);
    expect(stacked).not.toBeNull();
    expect(Math.round((stacked as { r: number }).r)).toBe(128);
  });

  test('computes WCAG contrast ratios', () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    // The canonical boundary: #767676 on white passes 4.5, #777777 does not.
    expect(contrastRatio({ r: 118, g: 118, b: 118, a: 1 }, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio({ r: 119, g: 119, b: 119, a: 1 }, white)).toBeLessThan(4.5);
  });

  test('classifies large text by computed size and weight only', () => {
    expect(isLargeText(24, 400)).toBe(true);
    // 17.9pt is below the 18pt normal threshold but at/above the 14pt bold
    // threshold, so weight is what makes it large.
    expect(isLargeText(23.9, 700)).toBe(true);
    expect(isLargeText(18, 700)).toBe(false);
    expect(isLargeText(18.66, 700)).toBe(true);
    expect(isLargeText(18.66, 400)).toBe(false);
    expect(NORMAL_TEXT_CONTRAST).toBe(4.5);
    expect(LARGE_TEXT_CONTRAST).toBe(3);
    expect(NON_TEXT_STATUS_CONTRAST).toBe(3);
  });

  test('measures a synthetic text pair and requires 3:1 for a status boundary', () => {
    const report = measureContrast({
      text: [
        { descriptor: 'span.good "Readable"', text: 'Readable', colour: 'rgb(231, 237, 244)', backgrounds: ['rgb(17, 26, 36)'], fontSizePx: 12, fontWeight: 400, opacity: 1, inactive: false },
        { descriptor: 'span.bad "Faint"', text: 'Faint', colour: 'rgb(58, 66, 74)', backgrounds: ['rgb(17, 26, 36)'], fontSizePx: 12, fontWeight: 400, opacity: 1, inactive: false },
        { descriptor: 'span.big "Large"', text: 'Large', colour: 'rgb(120, 130, 140)', backgrounds: ['rgb(17, 26, 36)'], fontSizePx: 24, fontWeight: 400, opacity: 1, inactive: false },
      ],
      boundaries: [
        { role: 'status-dot', descriptor: 'span.status-dot', colour: 'rgb(112, 195, 155)', backgrounds: ['rgb(17, 26, 36)'], adjacentBackgrounds: ['rgb(17, 26, 36)'], opacity: 1 },
        { role: 'stage-chip-border', descriptor: 'span.stage-chip.stage-blocked', colour: 'rgb(60, 40, 40)', backgrounds: ['rgb(17, 26, 36)'], adjacentBackgrounds: ['rgb(17, 26, 36)'], opacity: 1 },
      ],
    });
    const good = report.pairs.find((pair) => pair.element.startsWith('span.good'));
    const bad = report.pairs.find((pair) => pair.element.startsWith('span.bad'));
    const big = report.pairs.find((pair) => pair.element.startsWith('span.big'));
    const dot = report.pairs.find((pair) => pair.element === 'status-dot');
    const chip = report.pairs.find((pair) => pair.element === 'stage-chip-border');
    expect(good?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(good?.required).toBe(4.5);
    expect(bad?.ratio).toBeLessThan(4.5);
    expect(big?.kind).toBe('text-large');
    expect(big?.required).toBe(3);
    expect(dot?.kind).toBe('non-text-status');
    expect(dot?.required).toBe(3);
    expect(dot?.ratio).toBeGreaterThanOrEqual(3);
    expect(chip?.ratio).toBeLessThan(3);
  });
});

test.describe('accessibility exemption lists fail in both directions', () => {
  const failing: ContrastReport = {
    pairs: [
      { id: 'pair-a', kind: 'text-normal', element: 'span.a', text: 'A', foreground: 'rgb(1,1,1)', background: 'rgb(2,2,2)', ratio: 1.1, required: 4.5, inactive: false },
      { id: 'pair-b', kind: 'text-normal', element: 'span.b', text: 'B', foreground: 'rgb(231,237,244)', background: 'rgb(17,26,36)', ratio: 14, required: 4.5, inactive: false },
    ],
    exclusions: [],
  };

  test('a failing pair with no exemption is undeclared', () => {
    const findings = contrastViolations(failing, {});
    expect(findings.undeclared.map((pair) => pair.id)).toEqual(['pair-a']);
    expect(findings.stale).toEqual([]);
  });

  test('an exemption for a pair that now passes is stale', () => {
    const findings = contrastViolations(failing, {
      'pair-a': { reason: 'legacy' },
      'pair-b': { reason: 'it passes now' },
      'pair-gone': { reason: 'removed markup' },
    });
    expect(findings.undeclared).toEqual([]);
    expect(findings.stale).toEqual(['pair-b', 'pair-gone']);
  });
});

test.describe('status distinctions fail on colour alone', () => {
  function observation(family: string, value: string, text: string, signature: string, tone: string) {
    return { family, value, accessibleText: text, toneClasses: [tone], signature, descriptor: 'span.status-pill' };
  }

  test('a pair differing only in tone fails naming both values', () => {
    const sweep: StatusSweep = {
      observations: [
        observation('status-pill', 'PROVEN', 'Proven', 'border-top-width:1px', 'status-ready'),
        observation('status-pill', 'UNKNOWN', 'Proven', 'border-top-width:1px', 'status-warning'),
      ],
      toneCarrierCount: 2,
      unannotated: [],
    };
    const report = statusDistinctionViolations(sweep);
    expect(report.colourOnly).toHaveLength(1);
    expect(report.colourOnly[0]?.valueA).toBe('PROVEN');
    expect(report.colourOnly[0]?.valueB).toBe('UNKNOWN');
    expect(report.colourOnly[0]?.toneA).toBe('status-ready');
    expect(report.colourOnly[0]?.toneB).toBe('status-warning');
  });

  test('a text difference or a non-colour computed difference passes', () => {
    const sweep: StatusSweep = {
      observations: [
        observation('status-pill', 'PROVEN', 'Proven', 'border-top-width:1px', 'status-ready'),
        observation('status-pill', 'UNKNOWN', 'Unknown', 'border-top-width:1px', 'status-warning'),
        observation('graph-node', 'CURRENT', 'Node', 'stroke-width:1px', 'graph-node-ready'),
        observation('graph-node', 'STALE', 'Node', 'stroke-width:3px', 'graph-node-warning'),
      ],
      toneCarrierCount: 4,
      unannotated: [],
    };
    const report = statusDistinctionViolations(sweep);
    expect(report.colourOnly).toEqual([]);
    // Both distinct-value pairs are evaluated; the differing-text pair
    // passes on text, the same-text graph pair on its stroke width.
    expect(report.pairsEvaluated).toBe(2);
  });
});

test.describe('structural exemptions fail in both directions', () => {
  const audit: StructuralAuditResult = {
    violations: [{ check: 'heading-order', element: 'h3', detail: 'h3 after h1' }],
    checks: ['heading-order', 'document-title'],
    elementsChecked: 10,
    view: 'overview',
  };

  test('an observed violation with no exemption is undeclared', () => {
    const findings = structuralViolations([audit], {});
    expect(findings.undeclared.map((violation) => violation.check)).toEqual(['heading-order']);
    expect(findings.stale).toEqual([]);
  });

  test('an exemption naming no observed violation is stale', () => {
    const findings = structuralViolations([audit], {
      'heading-order|h3': { reason: 'deliberate disclosure' },
      'duplicate-id|#gone': { reason: 'removed' },
    });
    expect(findings.undeclared).toEqual([]);
    expect(findings.stale).toEqual(['duplicate-id|#gone']);
  });
});
