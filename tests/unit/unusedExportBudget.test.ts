// ---------------------------------------------------------------------------
// D-17 (M10 11.3) — the whole-src unused-export ratchet.
//
// `checkSourceReachability` proves a MODULE has a consumer; it cannot see that
// half of a reachable module's exported surface is named by nobody. The R1
// Lane D audit counted 122 such symbols once and never measured again, so the
// number could only drift upward. This suite pins the ratchet from both ends:
//
//   - the JUDGEMENT module is pure and fail-closed (empty scan, inconsistent
//     reference index, malformed symbol, malformed budget, grown count);
//   - the LIVE rule is registered, quantifier-declared, non-vacuously probing
//     itself against config/reference-graph.v1.json, and the recorded
//     negative probe (HC-283) makes the count grow by one and must be DETECTED;
//   - the recorded ceiling equals the number the live scan actually measures,
//     so the pin is never stale in either direction.
//
// Pure judgement tests run in-process; the live-rule tests spawn one bounded
// local child (`bin/hardening-check.mjs --only=checkUnusedExportBudget`).
// No network, no DEV, no credentials.
// ---------------------------------------------------------------------------

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import {
  UNUSED_EXPORT_REPORT_VERSION,
  isUnreferencedExportedValue,
  judgeUnusedExports,
  symbolIdentity,
  type ExportedValueSymbol,
} from '../../src/core/source/unusedExports';

const root = process.cwd();
const BUDGET_PATH = path.join(root, 'config', 'reference-graph.v1.json');
const RULE_NAME = 'checkUnusedExportBudget';

interface ReferenceGraphConfig {
  readonly unusedExportBudget?: { readonly count?: unknown; readonly reason?: unknown };
}

function readBudget(): { count: unknown; reason: unknown } {
  const config = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8')) as ReferenceGraphConfig;
  return {
    count: config.unusedExportBudget?.count,
    reason: config.unusedExportBudget?.reason,
  };
}

/** The live count the registered rule measures, read from the reporting mode. */
function measuredUnreferencedCount(): number {
  const output = execFileSync('node', [path.join('bin', 'hardening-check.mjs'), '--report-reachability'], {
    cwd: root, encoding: 'utf8', timeout: 600_000, maxBuffer: 32 * 1024 * 1024,
  });
  const match = /\[unused-export\] exportedValueSymbols=(\d+) unreferenced=(\d+) budget=(\d+)/.exec(output);
  if (match === null) throw new Error('the reachability reporting mode produced no unused-export measurement');
  return Number(match[2]);
}

function symbol(overrides: Partial<ExportedValueSymbol> & Pick<ExportedValueSymbol, 'file' | 'name'>): ExportedValueSymbol {
  return { line: 1, kind: 'FUNCTION', referencingFiles: [overrides.file], ...overrides };
}

test.describe('D-17 — exported value symbols with no reachable consumer', () => {
  test('the judgement is pure: a symbol named only by its own module is unreferenced', () => {
    const selfOnly = symbol({ file: 'src/core/a.ts', name: 'orphan' });
    expect(isUnreferencedExportedValue(selfOnly)).toBe(true);
    expect(symbolIdentity(selfOnly)).toBe('src/core/a.ts:1 FUNCTION orphan');
    const consumed = symbol({ file: 'src/core/a.ts', name: 'used', referencingFiles: ['src/core/a.ts', 'tests/unit/x.test.ts'] });
    expect(isUnreferencedExportedValue(consumed)).toBe(false);
  });

  test('a symbol whose own module never names it again is still unreferenced', () => {
    // The definer always names its own declaration, so "referenced only by the
    // definer" is the shape of an orphan. The count is what the ratchet pins.
    const judgement = judgeUnusedExports({
      symbols: [symbol({ file: 'src/core/a.ts', name: 'neverNamedAgain' })],
      budget: { count: 0, reason: 'unit fixture budget' },
    });
    expect(judgement.unreferencedCount).toBe(1);
    expect(judgement.unreferenced).toEqual(['src/core/a.ts:1 FUNCTION neverNamedAgain']);
    // An identifier not named by ANY file — not even its own module — is an
    // inconsistent index rather than a bigger debt: the judgement refuses it.
    const inconsistent = judgeUnusedExports({
      symbols: [symbol({ file: 'src/core/a.ts', name: 'notIndexed', referencingFiles: [] })],
      budget: { count: 0, reason: 'unit fixture budget' },
    });
    expect(inconsistent.findings.map((finding) => finding.code)).toEqual(['UNUSED_EXPORT_REFERENCE_INDEX_INCONSISTENT']);
    expect(inconsistent.unreferencedCount).toBe(0);
  });

  test('the reference index must be internally consistent or the judgement refuses', () => {
    // The definer names its own declaration, so its absence means the index is
    // wrong. Reading that as "unreferenced" would silently inflate the debt.
    const judgement = judgeUnusedExports({
      symbols: [symbol({ file: 'src/core/a.ts', name: 'ghost', referencingFiles: ['tests/unit/x.test.ts'] })],
      budget: { count: 0, reason: 'unit fixture budget' },
    });
    expect(judgement.findings.map((finding) => finding.code)).toContain('UNUSED_EXPORT_REFERENCE_INDEX_INCONSISTENT');
  });

  test('an empty scan fails closed: discovery is broken, not the repository clean', () => {
    const judgement = judgeUnusedExports({ symbols: [], budget: { count: 0, reason: 'unit fixture budget' } });
    expect(judgement.findings.map((finding) => finding.code)).toContain('UNUSED_EXPORT_SCAN_VACUOUS');
    expect(judgement.unreferencedCount).toBe(0);
  });

  test('a malformed symbol or budget is refused, never silently counted', () => {
    const judgements = [
      judgeUnusedExports({
        symbols: [symbol({ file: 'src/core/a.ts', name: '' })],
        budget: { count: 0, reason: 'unit fixture budget' },
      }),
      judgeUnusedExports({
        symbols: [symbol({ file: 'src/core/a.ts', name: 'x', line: 0 })],
        budget: { count: 0, reason: 'unit fixture budget' },
      }),
      judgeUnusedExports({
        symbols: [symbol({ file: 'src/core/a.ts', name: 'x', kind: 'INTERFACE' as never })],
        budget: { count: 0, reason: 'unit fixture budget' },
      }),
      judgeUnusedExports({
        symbols: [symbol({ file: 'src/core/a.ts', name: 'x' })],
        budget: { count: -1, reason: 'unit fixture budget' },
      }),
      judgeUnusedExports({
        symbols: [symbol({ file: 'src/core/a.ts', name: 'x' })],
        budget: { count: 0, reason: '' },
      }),
    ];
    // A malformed symbol is REFUSED rather than counted, so it never joins the
    // debt the ratchet measures; a malformed budget is refused while the
    // observed count is still reported honestly beside the refusal.
    expect(judgements.map((judgement) => judgement.findings.map((finding) => finding.code))).toEqual([
      ['UNUSED_EXPORT_SYMBOL_SHAPE_INVALID'],
      ['UNUSED_EXPORT_SYMBOL_SHAPE_INVALID'],
      ['UNUSED_EXPORT_SYMBOL_SHAPE_INVALID'],
      ['UNUSED_EXPORT_BUDGET_COUNT_INVALID'],
      ['UNUSED_EXPORT_BUDGET_REASON_MISSING', 'UNUSED_EXPORT_COUNT_GROWN'],
    ]);
    expect(judgements.map((judgement) => judgement.unreferencedCount)).toEqual([0, 0, 0, 1, 1]);
  });

  test('the ratchet only fires when the count GROWS, and names every growth', () => {
    const symbols = [
      symbol({ file: 'src/core/a.ts', name: 'first' }),
      symbol({ file: 'src/core/b.ts', name: 'second' }),
      symbol({ file: 'src/core/c.ts', name: 'third', referencingFiles: ['src/core/c.ts', 'tests/unit/x.test.ts'] }),
    ];
    const atCeiling = judgeUnusedExports({ symbols, budget: { count: 2, reason: 'unit fixture budget' } });
    expect(atCeiling.findings).toEqual([]);
    expect(atCeiling.unreferencedCount).toBe(2);
    expect(atCeiling.exportedValueSymbols).toBe(3);
    const grown = judgeUnusedExports({ symbols, budget: { count: 1, reason: 'unit fixture budget' } });
    expect(grown.findings.map((finding) => finding.code)).toEqual(['UNUSED_EXPORT_COUNT_GROWN']);
    expect(grown.findings[0]?.detail).toContain('above the pinned ceiling of 1');
    // The report is a stable, sorted, path-free-of-secrets list of identities.
    expect(grown.unreferenced).toEqual(['src/core/a.ts:1 FUNCTION first', 'src/core/b.ts:1 FUNCTION second']);
    expect(grown.schemaVersion).toBe(UNUSED_EXPORT_REPORT_VERSION);
  });

  test('the judging module itself records the ratchet contract it enforces', () => {
    const text = fs.readFileSync(path.join(root, 'src/core/source/unusedExports.ts'), 'utf8');
    for (const literal of ['UNUSED_EXPORT_COUNT_GROWN', 'UNUSED_EXPORT_SCAN_VACUOUS', 'UNUSED_EXPORT_REFERENCE_INDEX_INCONSISTENT']) {
      expect(text, `${literal} must stay in the judgement vocabulary`).toContain(literal);
    }
  });

  test('the ratchet is registered, quantified and recorded with a reason', () => {
    const rules = JSON.parse(
      execFileSync('node', [path.join('bin', 'hardening-check.mjs'), '--list-rules'], {
        cwd: root, encoding: 'utf8', timeout: 300_000, maxBuffer: 16 * 1024 * 1024,
      }),
    ) as { rules: { name: string; quantifier: string; subject: string; probeCount: number }[] };
    const rule = rules.rules.find((entry) => entry.name === RULE_NAME);
    expect(rule, `${RULE_NAME} is not registered`).toBeDefined();
    expect(rule?.quantifier).toBe('TOTALITY');
    expect(rule?.probeCount).toBeGreaterThanOrEqual(1);
    const budget = readBudget();
    expect(Number.isInteger(budget.count)).toBe(true);
    expect(budget.count as number).toBeGreaterThan(0);
    expect(String(budget.reason).length).toBeGreaterThanOrEqual(12);
  });

  test('the recorded ceiling equals the count the live scan measures', () => {
    const budget = readBudget();
    expect(budget.count as number).toBeGreaterThan(0);
    // The pin is never allowed to be stale in either direction: it IS the
    // measurement, so a repository that grows by one unreferenced export fails
    // immediately, and a repository that burns the debt down must re-measure.
    expect(budget.count, 'the pinned ceiling must be the CURRENT measured count').toBe(measuredUnreferencedCount());
  });

  test('the registered rule passes at the recorded ceiling', () => {
    const result = spawnSync(process.execPath, [path.join('bin', 'hardening-check.mjs'), `--only=${RULE_NAME}`], {
      cwd: root, encoding: 'utf8', timeout: 600_000, maxBuffer: 32 * 1024 * 1024,
    });
    expect(`${result.stdout ?? ''}${result.stderr ?? ''}`, 'checkUnusedExportBudget must pass at the recorded ceiling').not.toContain('ERROR:');
  });

  test('the recorded negative probe makes the count grow and must be DETECTED', () => {
    const probes = JSON.parse(fs.readFileSync(path.join(root, 'config', 'hardening-rule-probes.v1.json'), 'utf8')) as {
      probes: Record<string, { id: string; ops: { file: string; append?: string }[] }[]>;
    };
    const entries = probes.probes[RULE_NAME];
    expect(Array.isArray(entries) && entries.length > 0, `${RULE_NAME} has no recorded negative probe`).toBe(true);
    const probe = entries?.[0];
    expect(probe?.id).toMatch(/^HC-\d{3}$/);
    // The probe must be a REAL growth: one exported value symbol nobody names.
    const op = probe?.ops?.[0];
    expect(op?.file).toBe('src/core/source/unusedExports.ts');
    expect(op?.append).toContain('export function ');
    const probeSource = fs.readFileSync(path.join(root, op?.file ?? ''), 'utf8');
    expect(probeSource.includes(op?.append ?? ''), 'the probe has already been applied and was never restored').toBe(false);

    // Apply the probe in place, prove the rule bites, and restore the exact
    // bytes in a finally — the same discipline probe-campaign.mjs uses.
    const target = path.join(root, op?.file ?? '');
    const original = fs.readFileSync(target);
    try {
      fs.writeFileSync(target, `${probeSource}${op?.append ?? ''}`);
      const result = spawnSync(process.execPath, [path.join('bin', 'hardening-check.mjs'), `--only=${RULE_NAME}`], {
        cwd: root, encoding: 'utf8', timeout: 600_000, maxBuffer: 32 * 1024 * 1024,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(output).toContain('UNUSED_EXPORT_COUNT_GROWN');
      expect(output).toContain(`above the pinned ceiling of ${readBudget().count}`);
      expect(result.status).not.toBe(0);
    } finally {
      fs.writeFileSync(target, original);
    }
  });
});
