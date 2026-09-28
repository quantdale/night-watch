import { test, expect } from '@playwright/test';
import {
  countDiagnosticSilencingAnnotations,
  judgeRatchet,
} from '../../bin/lib/typecheck-ratchet.mjs';
import type { RatchetConfig } from '../../bin/lib/typecheck-ratchet.mjs';

function ratchet(
  perFile: Record<string, number>,
  ceilings: Record<string, number>,
  totalCeiling: number | null,
  annotations: number,
  anyAnnotationBudget: number | null,
) {
  const config: RatchetConfig = {
    perFile: new Map(Object.entries(ceilings)),
    totalCeiling,
    anyAnnotationBudget,
  };
  return judgeRatchet({ perFile: new Map(Object.entries(perFile)), annotations, config });
}

test.describe('bin type-check ratchet', () => {
  test('requires measured per-file ceilings for every diagnostic-bearing source, including bin/lib', () => {
    const result = ratchet(
      { 'bin/entry.mjs': 3, 'bin/lib/shared.mjs': 2, 'bin/clean.mjs': 0 },
      { 'bin/entry.mjs': 3 },
      5,
      0,
      0,
    );
    expect(result.map((error) => error.code)).toContain('BIN_TYPECHECK_CEILING_MISSING');
    expect(result.find((error) => error.code === 'BIN_TYPECHECK_CEILING_MISSING')?.detail).toContain('bin/lib/shared.mjs');
  });

  test('passes only when per-file and total ceilings exactly match measured diagnostics', () => {
    expect(ratchet(
      { 'bin/entry.mjs': 3, 'bin/lib/shared.mjs': 2, 'bin/clean.mjs': 0 },
      { 'bin/entry.mjs': 3, 'bin/lib/shared.mjs': 2 },
      5,
      0,
      0,
    )).toEqual([]);

    const increased = ratchet(
      { 'bin/entry.mjs': 4, 'bin/lib/shared.mjs': 2 },
      { 'bin/entry.mjs': 3, 'bin/lib/shared.mjs': 2 },
      5,
      0,
      0,
    );
    expect(increased.map((error) => error.code)).toContain('BIN_TYPECHECK_CEILING_EXCEEDED');
    expect(increased.map((error) => error.code)).toContain('BIN_TYPECHECK_TOTAL_CEILING_EXCEEDED');
  });

  test('rejects stale per-file and total ceilings instead of silently carrying old baselines', () => {
    const result = ratchet(
      { 'bin/entry.mjs': 2, 'bin/lib/shared.mjs': 2 },
      { 'bin/entry.mjs': 3, 'bin/lib/shared.mjs': 2 },
      5,
      0,
      0,
    );
    expect(result.map((error) => error.code)).toContain('BIN_TYPECHECK_CEILING_STALE');
    expect(result.map((error) => error.code)).toContain('BIN_TYPECHECK_TOTAL_CEILING_STALE');
  });

  test('a missing total ceiling or annotation budget fails closed', () => {
    const result = ratchet({ 'bin/entry.mjs': 1 }, { 'bin/entry.mjs': 1 }, null, 0, null);
    expect(result.map((error) => error.code)).toContain('BIN_TYPECHECK_TOTAL_CEILING_MISSING');
    expect(result.map((error) => error.code)).toContain('BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_MISSING');
  });

  test('rejects stale annotation budgets and counts a new any annotation added only to lower counts', () => {
    expect(ratchet({ 'bin/entry.mjs': 0 }, {}, 0, 0, 1).map((error) => error.code))
      .toContain('BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_STALE');
    const sources = [
      { file: 'bin/first.mjs', source: '/** @param {any} value */\n/** @type {any} */' },
      { file: 'bin/second.mjs', source: '/** @returns {any} */\n/** @return {any} */' },
    ];
    const baseline = countDiagnosticSilencingAnnotations(sources);
    expect(baseline).toBe(4);
    expect(countDiagnosticSilencingAnnotations([
      { file: 'bin/spaced.mjs', source: '/** @param { any } value */' },
    ])).toBe(1);
    expect(countDiagnosticSilencingAnnotations([
      ...sources,
      { file: 'bin/new.mjs', source: '/** @param {any} value */' },
    ])).toBe(5);
    expect(ratchet({ 'bin/entry.mjs': 0 }, {}, 0, baseline + 1, baseline).map((error) => error.code))
      .toContain('BIN_TYPECHECK_ANY_ANNOTATION_BUDGET_EXCEEDED');
  });
});
