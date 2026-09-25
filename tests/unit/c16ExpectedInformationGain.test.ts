// ---------------------------------------------------------------------------
// Nightwatch C-16 — expected information gain, and G-16.
//
// Two orphaned requirements, unrelated except in being orphaned. Treating
// "G-16 and EIG owners" as one prioritisation concern — which the ledger row's
// phrasing invites — would have left the documentation-truth requirement
// unimplemented while an EIG module got built.
//
// The load-bearing assertions:
//
//   * a high score grants NOTHING;
//   * UNKNOWN neither maximises nor zeroes, per factor — under a
//     multiplicative form a zero deletes a target and a maximum promotes one,
//     and "we do not know" is neither;
//   * the ranking is a TOTAL order, so two runs cannot disagree about ties;
//   * ordering is exact integer arithmetic, so it never depends on rounding.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLAST_RADIUS_LEVELS,
  CHANGE_RECENCY_LEVELS,
  CONTRACT_DEPTH_LEVELS,
  COST_LEVELS,
  DUPLICATE_RISK_LEVELS,
  EIG_REASON_CODES,
  NOVELTY_LEVELS,
  compareScores,
  eigScore,
  isPartiallyUnknown,
  rankByExpectedInformationGain,
  type EigFactors,
  type EigTarget,
} from '../../src/core/source/expectedInformationGain';
import {
  CENSUS_FIGURES,
  GOVERNED_STATUS_KEYS,
  HISTORICAL_MARKER,
  POLICED_DOCUMENTS,
  STATUS_LEDGER_VERSION,
  checkCensusFigures,
  checkGovernedStatusWords,
  isHistoricalStatusLine,
  normalizeStatusValue,
  statusValueIsCurrent,
} from '../../src/core/source/censusFigureLedger';

const root = path.resolve(__dirname, '..', '..');

const BASE: EigFactors = {
  novelty: 'OBSERVED_WITHOUT_ORACLE',
  contractDepth: 'SHAPE',
  changeRecency: 'PROVEN_UNCHANGED',
  blastRadius: 'SOME_CONSUMERS',
  cost: 'MODERATE',
  duplicateRisk: 'NO_PRIOR_FINDING',
};

const target = (targetId: string, overrides: Partial<EigFactors> = {}): EigTarget => ({
  targetId, factors: { ...BASE, ...overrides }, evidenceDigest: `ev:${targetId}`,
});

test.describe('C-16 — a high score grants nothing', () => {
  test('the projection states its own powerlessness as data', () => {
    const ranking = rankByExpectedInformationGain([target('a')]);
    expect(ranking.grantsAuthority).toBe(false);
  });

  test('no authority surface consults the EIG module', () => {
    // Ordering what safety already admitted is not permission to widen it.
    for (const file of ['src/core/safety/realRunGate.ts', 'src/core/policy/ownerScope.ts', 'src/core/source/universe.ts']) {
      const absolute = path.join(root, file);
      if (!fs.existsSync(absolute)) continue;
      expect(fs.readFileSync(absolute, 'utf8')).not.toMatch(/expectedInformationGain/);
    }
  });

  test('the module takes no admission, environment or credential input', () => {
    const source = fs.readFileSync(path.join(root, 'src/core/source/expectedInformationGain.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const forbidden of ['admitted', 'credential', 'storageState', 'process.env', 'node:fs', 'fetch(']) {
      expect(code).not.toContain(forbidden);
    }
  });

  test('the top-ranked target carries no eligibility field of any kind', () => {
    const ranking = rankByExpectedInformationGain([target('a', { novelty: 'NEVER_OBSERVED' })]);
    const top = ranking.ranked[0]!;
    expect(Object.keys(top)).not.toContain('eligible');
    expect(Object.keys(top)).not.toContain('admitted');
    expect(Object.keys(top)).not.toContain('authorized');
  });
});

test.describe('C-16 — UNKNOWN is safe, per factor', () => {
  const factorLevels = [
    ['novelty', NOVELTY_LEVELS], ['contractDepth', CONTRACT_DEPTH_LEVELS],
    ['changeRecency', CHANGE_RECENCY_LEVELS], ['blastRadius', BLAST_RADIUS_LEVELS],
    ['cost', COST_LEVELS], ['duplicateRisk', DUPLICATE_RISK_LEVELS],
  ] as const;

  for (const [name, levels] of factorLevels) {
    test(`${name}: UNKNOWN is neither the minimum nor the maximum`, () => {
      const values = Object.values(levels as Record<string, number>);
      const unknown = (levels as Record<string, number>).UNKNOWN;
      expect(unknown).toBeDefined();
      expect(unknown).toBeGreaterThan(Math.min(...values));
      expect(unknown).toBeLessThan(Math.max(...values));
    });
  }

  test('no numerator factor can be zero, so UNKNOWN cannot delete a target', () => {
    // A zero anywhere in the numerator would eliminate the target entirely.
    for (const levels of [NOVELTY_LEVELS, CONTRACT_DEPTH_LEVELS, CHANGE_RECENCY_LEVELS, BLAST_RADIUS_LEVELS]) {
      for (const value of Object.values(levels)) expect(value).toBeGreaterThan(0);
    }
  });

  test('the denominator is never zero even at minimum duplicate risk', () => {
    expect(DUPLICATE_RISK_LEVELS.NO_PRIOR_FINDING).toBe(0);
    for (const cost of Object.keys(COST_LEVELS) as (keyof typeof COST_LEVELS)[]) {
      expect(eigScore({ ...BASE, cost, duplicateRisk: 'NO_PRIOR_FINDING' }).denominator).toBeGreaterThan(0);
    }
  });

  test('an all-UNKNOWN target ranks between the best and worst known ones', () => {
    const ranking = rankByExpectedInformationGain([
      target('best', { novelty: 'NEVER_OBSERVED', contractDepth: 'TYPE_OR_COLLECTION', changeRecency: 'CHANGED_IN_CURRENT_DIFF', blastRadius: 'MANY_CONSUMERS', cost: 'LOW', duplicateRisk: 'NO_PRIOR_FINDING' }),
      target('unknown', { novelty: 'UNKNOWN', contractDepth: 'UNKNOWN', changeRecency: 'UNKNOWN', blastRadius: 'UNKNOWN', cost: 'UNKNOWN', duplicateRisk: 'UNKNOWN' }),
      target('worst', { novelty: 'OBSERVED_WITH_ORACLE', contractDepth: 'PROTOCOL_ONLY', changeRecency: 'PROVEN_UNCHANGED', blastRadius: 'NO_KNOWN_CONSUMER', cost: 'HIGH', duplicateRisk: 'MANY_PRIOR_CLUSTERS' }),
    ]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['best', 'unknown', 'worst']);
  });

  test('an unknown factor is flagged so a reader can discount the position', () => {
    expect(isPartiallyUnknown({ ...BASE, cost: 'UNKNOWN' })).toBe(true);
    expect(isPartiallyUnknown(BASE)).toBe(false);
    const ranking = rankByExpectedInformationGain([target('u', { blastRadius: 'UNKNOWN' })]);
    expect(ranking.ranked[0]!.partiallyUnknown).toBe(true);
    expect(ranking.ranked[0]!.reasonCodes).toContain('FACTORS_PARTLY_UNKNOWN');
  });
});

test.describe('C-16 — determinism', () => {
  test('the same input yields a byte-identical ranking', () => {
    const targets = ['d', 'a', 'c', 'b'].map((id) => target(id));
    const first = rankByExpectedInformationGain(targets);
    const second = rankByExpectedInformationGain([...targets].reverse());
    expect(JSON.stringify(first.ranked)).toBe(JSON.stringify(second.ranked));
  });

  test('equal scores break ties by target id, giving a total order', () => {
    // Without a total order, two equal-scoring targets could swap between runs.
    const ranking = rankByExpectedInformationGain([target('zebra'), target('alpha'), target('mid')]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['alpha', 'mid', 'zebra']);
  });

  test('ordering is exact integer arithmetic, never a float comparison', () => {
    // 3/7 vs 4/9: as floats these are 0.42857... and 0.44444..., close enough
    // that a naive implementation invites rounding questions. Cross-multiplied
    // integers give 27 vs 28 exactly.
    expect(compareScores({ numerator: 3, denominator: 7 }, { numerator: 4, denominator: 9 })).toBe(-1);
    expect(compareScores({ numerator: 4, denominator: 9 }, { numerator: 3, denominator: 7 })).toBe(1);
    expect(compareScores({ numerator: 2, denominator: 4 }, { numerator: 1, denominator: 2 })).toBe(0);
  });

  test('the score is exposed as a rational, not a divided number', () => {
    const score = eigScore(BASE);
    expect(Number.isInteger(score.numerator)).toBe(true);
    expect(Number.isInteger(score.denominator)).toBe(true);
    expect(Object.keys(score).sort()).toEqual(['denominator', 'numerator']);
  });

  test('no timestamp or clock participates in the score', () => {
    const source = fs.readFileSync(path.join(root, 'src/core/source/expectedInformationGain.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const forbidden of ['Date.now', 'new Date', 'performance.now', 'hrtime']) {
      expect(code).not.toContain(forbidden);
    }
  });
});

test.describe('C-16 — the factors behave as design 9.2 defines', () => {
  test('novelty: never observed beats no-oracle beats with-oracle', () => {
    expect(NOVELTY_LEVELS.NEVER_OBSERVED).toBeGreaterThan(NOVELTY_LEVELS.OBSERVED_WITHOUT_ORACLE);
    expect(NOVELTY_LEVELS.OBSERVED_WITHOUT_ORACLE).toBeGreaterThan(NOVELTY_LEVELS.OBSERVED_WITH_ORACLE);
    const ranking = rankByExpectedInformationGain([
      target('with-oracle', { novelty: 'OBSERVED_WITH_ORACLE' }),
      target('never', { novelty: 'NEVER_OBSERVED' }),
      target('no-oracle', { novelty: 'OBSERVED_WITHOUT_ORACLE' }),
    ]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['never', 'no-oracle', 'with-oracle']);
  });

  test('contract depth: TYPE/COLLECTION beats SHAPE beats protocol-only', () => {
    expect(CONTRACT_DEPTH_LEVELS.TYPE_OR_COLLECTION).toBeGreaterThan(CONTRACT_DEPTH_LEVELS.SHAPE);
    expect(CONTRACT_DEPTH_LEVELS.SHAPE).toBeGreaterThan(CONTRACT_DEPTH_LEVELS.PROTOCOL_ONLY);
    const ranking = rankByExpectedInformationGain([
      target('protocol', { contractDepth: 'PROTOCOL_ONLY' }),
      target('type', { contractDepth: 'TYPE_OR_COLLECTION' }),
      target('shape', { contractDepth: 'SHAPE' }),
    ]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['type', 'shape', 'protocol']);
  });

  test('change recency comes from proven change evidence, never elapsed time', () => {
    expect(CHANGE_RECENCY_LEVELS.CHANGED_IN_CURRENT_DIFF).toBeGreaterThan(CHANGE_RECENCY_LEVELS.DEPENDENCY_CHANGED);
    expect(CHANGE_RECENCY_LEVELS.DEPENDENCY_CHANGED).toBeGreaterThan(CHANGE_RECENCY_LEVELS.PROVEN_UNCHANGED);
    // Every level names an evidence state; none names a duration.
    for (const level of Object.keys(CHANGE_RECENCY_LEVELS)) {
      expect(level).not.toMatch(/DAY|HOUR|WEEK|MINUTE|AGE|OLDER|RECENT_MS/);
    }
  });

  test('duplicate risk demotes an already-understood surface', () => {
    // §59: a repeatedly observed, already-understood surface must rank below a
    // genuinely novel deep surface when the rest is comparable.
    const ranking = rankByExpectedInformationGain([
      target('repeat', { duplicateRisk: 'MANY_PRIOR_CLUSTERS' }),
      target('fresh', { duplicateRisk: 'NO_PRIOR_FINDING' }),
    ]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['fresh', 'repeat']);
    expect(ranking.ranked[1]!.reasonCodes).toContain('DEMOTED_BY_PRIOR_FINDINGS');
  });

  test('a broad shallow sweep scores worse than a deep pass over new contracts', () => {
    // §9.2's explicit non-goal: cost in the denominator must make this true.
    const shallow = target('shallow-broad', {
      novelty: 'OBSERVED_WITH_ORACLE', contractDepth: 'PROTOCOL_ONLY',
      blastRadius: 'MANY_CONSUMERS', cost: 'HIGH',
    });
    const deep = target('deep-new', {
      novelty: 'NEVER_OBSERVED', contractDepth: 'TYPE_OR_COLLECTION',
      blastRadius: 'SOME_CONSUMERS', cost: 'LOW',
    });
    const ranking = rankByExpectedInformationGain([shallow, deep]);
    expect(ranking.ranked[0]!.targetId).toBe('deep-new');
    expect(compareScores(eigScore(deep.factors), eigScore(shallow.factors))).toBeGreaterThan(0);
  });

  test('high cost demotes and says so', () => {
    const ranking = rankByExpectedInformationGain([target('cheap', { cost: 'LOW' }), target('dear', { cost: 'HIGH' })]);
    expect(ranking.ranked.map((r) => r.targetId)).toEqual(['cheap', 'dear']);
    expect(ranking.ranked[1]!.reasonCodes).toContain('DEMOTED_BY_COST');
  });
});

test.describe('C-16 — the ranking is explainable and bounded', () => {
  test('every entry carries its factor levels, so the score is hand-checkable', () => {
    const ranking = rankByExpectedInformationGain([target('a')]);
    const entry = ranking.ranked[0]!;
    expect(Object.keys(entry.factorLevels).sort()).toEqual(['blastRadius', 'changeRecency', 'contractDepth', 'cost', 'duplicateRisk', 'novelty']);
    const expectedNumerator = entry.factorLevels.novelty * entry.factorLevels.contractDepth
      * entry.factorLevels.changeRecency * entry.factorLevels.blastRadius;
    expect(entry.score.numerator).toBe(expectedNumerator);
    expect(entry.score.denominator).toBe(entry.factorLevels.cost + entry.factorLevels.duplicateRisk);
  });

  test('every reason code emitted is in the declared vocabulary', () => {
    const ranking = rankByExpectedInformationGain([
      target('a', { novelty: 'NEVER_OBSERVED', contractDepth: 'TYPE_OR_COLLECTION', changeRecency: 'CHANGED_IN_CURRENT_DIFF', blastRadius: 'MANY_CONSUMERS' }),
      target('b', { novelty: 'OBSERVED_WITH_ORACLE', cost: 'HIGH', duplicateRisk: 'MANY_PRIOR_CLUSTERS' }),
      target('c', { blastRadius: 'UNKNOWN' }),
    ]);
    for (const entry of ranking.ranked) {
      for (const code of entry.reasonCodes) expect(EIG_REASON_CODES).toContain(code);
    }
  });

  test('the result is bounded and reports exactly what it dropped', () => {
    const targets = Array.from({ length: 50 }, (_v, i) => target(`t-${String(i).padStart(3, '0')}`));
    const ranking = rankByExpectedInformationGain(targets, { limit: 10 });
    expect(ranking.rankedCount).toBe(10);
    expect(ranking.consideredCount).toBe(50);
    expect(ranking.droppedCount).toBe(40);
    expect(ranking.truncated).toBe(true);
    expect(ranking.totalConsidered).toBe(50);
  });

  test('an incomplete considered set reports UNKNOWN rather than a total', () => {
    const ranking = rankByExpectedInformationGain([target('a')], { consideredSetComplete: false });
    expect(ranking.totalConsidered).toBeNull();
    expect(ranking.remainingUnknown).toBe(true);
  });

  test('ranks are consecutive from one', () => {
    const ranking = rankByExpectedInformationGain(['a', 'b', 'c'].map((id) => target(id)));
    expect(ranking.ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});

test.describe('C-16 / G-16 — one derived figure source', () => {
  test('the live policed documents satisfy the ledger', () => {
    const documents = POLICED_DOCUMENTS.map((file) => ({ path: file, text: fs.readFileSync(path.join(root, file), 'utf8') }));
    const result = checkCensusFigures(documents);
    expect(result.violations).toEqual([]);
    expect(result.holds).toBe(true);
    // Non-vacuous: the check must actually be looking at figures.
    expect(result.taggedFiguresFound).toBeGreaterThan(0);
  });

  test('a stale figure is detected', () => {
    const result = checkCensusFigures([{ path: 'x.md', text: '<!--census:SOURCE_OPERATIONS=999-->' }]);
    expect(result.holds).toBe(false);
    expect(result.violations[0]!.reason).toBe('FIGURE_NOT_IN_LEDGER');
    expect(result.violations[0]!.ledgerValue).toBe(1851);
  });

  test('an unknown measure is detected rather than ignored', () => {
    const result = checkCensusFigures([{ path: 'x.md', text: '<!--census:INVENTED=1-->' }]);
    expect(result.holds).toBe(false);
    expect(result.violations[0]!.reason).toBe('MEASURE_UNKNOWN');
  });

  test('the explicit historical marker retires a superseded figure', () => {
    const result = checkCensusFigures([{ path: 'x.md', text: `${HISTORICAL_MARKER} <!--census:SOURCE_OPERATIONS=814-->` }]);
    expect(result.holds).toBe(true);
  });

  test('the exemption cannot fire by accident', () => {
    // A first draft exempted any line containing `was `, `previously`,
    // `no longer` and similar, which would have silently exempted a large
    // fraction of English prose. An exemption that fires by accident is worse
    // than none, because the check then passes while proving nothing.
    for (const prose of ['the count was measured', 'previously we thought', 'this is no longer true', 'historical context']) {
      const result = checkCensusFigures([{ path: 'x.md', text: `${prose} <!--census:SOURCE_OPERATIONS=999-->` }]);
      expect(result.holds).toBe(false);
    }
  });

  test('every ledger figure is a plain non-negative integer with an owner', () => {
    expect(CENSUS_FIGURES.length).toBeGreaterThan(0);
    for (const figure of CENSUS_FIGURES) {
      expect(Number.isSafeInteger(figure.currentValue)).toBe(true);
      expect(figure.currentValue).toBeGreaterThanOrEqual(0);
      expect(figure.establishedBy.length).toBeGreaterThan(0);
      expect(figure.measureId).toMatch(/^[A-Z_]+$/);
    }
    // Measure ids are unique, so a figure has exactly one source.
    const ids = CENSUS_FIGURES.map((f) => f.measureId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('a document with no tagged figures is not a violation', () => {
    const result = checkCensusFigures([{ path: 'x.md', text: 'prose with the number 1851 in it' }]);
    expect(result.holds).toBe(true);
    expect(result.taggedFiguresFound).toBe(0);
  });
});

// F-08 / group 7 — status words get the same narrow ledger treatment numbers
// have. Only declared keys are governed; a governed key must state the current
// value (optionally extended with a parenthetical state) or sit on a line that
// names its historical checkpoint. The README measured-status block is governed
// by the same ledger.
test.describe('F-08 — governed status-word ledger', () => {
  test('the ledger declares unique, well-formed keys with a current value', () => {
    expect(STATUS_LEDGER_VERSION).toBe('nightwatch.status-word-ledger.v1');
    expect(GOVERNED_STATUS_KEYS.length).toBeGreaterThanOrEqual(60);
    const keys = GOVERNED_STATUS_KEYS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of GOVERNED_STATUS_KEYS) {
      expect(entry.key).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(entry.currentValue).toMatch(/^[A-Z0-9_]+$/);
      expect(entry.establishedBy.length).toBeGreaterThan(0);
    }
    // The README block's required keys are a non-empty, declared subset.
    const required = GOVERNED_STATUS_KEYS.filter((entry) => entry.requiredInReadme === true);
    expect(required.length).toBeGreaterThanOrEqual(10);
    for (const entry of required) expect(keys).toContain(entry.key);
  });

  test('a bare stale status fails and the current value passes', () => {
    const stale = checkGovernedStatusWords([{ path: 'x.md', text: 'PHASE_8_STATUS: IN_PROGRESS' }]);
    expect(stale.holds).toBe(false);
    expect(stale.violations[0]).toMatchObject({ key: 'PHASE_8_STATUS', statedValue: 'IN_PROGRESS', currentValue: 'COMPLETE' });
    const current = checkGovernedStatusWords([{ path: 'x.md', text: 'PHASE_8_STATUS: COMPLETE' }]);
    expect(current.holds).toBe(true);
  });

  test('an extended current value is still the current value', () => {
    expect(statusValueIsCurrent('COMPLETE_HARDENED_LOCAL_SOURCE_SYNTHETIC', 'COMPLETE')).toBe(true);
    expect(normalizeStatusValue('COMPLETE (HARDENED_LOCAL_SOURCE_SYNTHETIC)')).toBe('COMPLETE_HARDENED_LOCAL_SOURCE_SYNTHETIC');
    const result = checkGovernedStatusWords([{ path: 'x.md', text: '`PHASE_16C_STATUS: COMPLETE (HARDENED_LOCAL_SOURCE_SYNTHETIC)`' }]);
    expect(result.holds).toBe(true);
  });

  test('a historical qualifier names the checkpoint it describes', () => {
    for (const line of [
      'PHASE_8_STATUS: IN_PROGRESS <!--status:historical 24fc437-->',
      'PHASE_8_STATUS: IN_PROGRESS at 2026-08-27',
      'PHASE_8_STATUS: IN_PROGRESS as recorded at 24fc4378421ac',
      'The superseded PHASE_8_STATUS: IN_PROGRESS row is preserved',
    ]) {
      expect(isHistoricalStatusLine(line), line).toBe(true);
      expect(checkGovernedStatusWords([{ path: 'x.md', text: line }]).holds, line).toBe(true);
    }
    // A form that names no checkpoint is not historical: the word "historical"
    // alone, or the marker without a checkpoint, does not satisfy the rule.
    for (const line of [
      'PHASE_8_STATUS: IN_PROGRESS <!--status:historical-->',
      'The historical PHASE_8_STATUS: IN_PROGRESS row is preserved',
    ]) {
      expect(isHistoricalStatusLine(line), line).toBe(false);
      expect(checkGovernedStatusWords([{ path: 'x.md', text: line }]).holds, line).toBe(false);
    }
  });

  test('the table form is governed the same way', () => {
    const stale = checkGovernedStatusWords([{ path: 'x.md', text: '| `PHASE_8_STATUS` | `IN_PROGRESS` |' }]);
    expect(stale.holds).toBe(false);
    const current = checkGovernedStatusWords([{ path: 'x.md', text: '| `PHASE_8_STATUS` | `COMPLETE` |' }]);
    expect(current.holds).toBe(true);
  });

  test('every governed status in the live documents and README is current or historical', () => {
    const roleConfig = JSON.parse(fs.readFileSync(path.join(root, 'config/document-role.v1.json'), 'utf8')) as {
      documents: { path: string }[];
    };
    const documents = roleConfig.documents.map((entry) => ({ path: entry.path, text: fs.readFileSync(path.join(root, entry.path), 'utf8') }));
    documents.push({ path: 'README.md', text: fs.readFileSync(path.join(root, 'README.md'), 'utf8') });
    // R2-N6: LIVE_TASK_STATUS is derived from the active task identity, so the
    // caller supplies that derivation input exactly as the hardening rule does.
    const activeTaskText = fs.readFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), 'utf8');
    const preamble = activeTaskText.split(/\r?\n/).reduce(
      (accumulator: { lines: string[]; done: boolean }, line: string) => {
        if (accumulator.done) return accumulator;
        if (/^##\s+/.test(line)) return { lines: accumulator.lines, done: true };
        accumulator.lines.push(line);
        return accumulator;
      },
      { lines: [], done: false },
    ).lines.join('\n');
    const activeTaskStatus = /^[ \t]*Status:[ \t]*(.+?)[ \t]*$/m.exec(preamble)?.[1]?.trim();
    expect(activeTaskStatus, 'the active task identity must state a Status').toBeTruthy();
    const result = checkGovernedStatusWords(documents, { activeTaskStatus });
    expect(result.violations).toEqual([]);
    expect(result.holds).toBe(true);
    // Non-vacuous: the scan must actually see governed statements.
    expect(result.governedStatementsFound).toBeGreaterThan(50);
  });

  test('the lane-class counts are derived from the lane-state ledger', () => {
    const laneState = JSON.parse(fs.readFileSync(path.join(root, 'config/validation-lane-state.v1.json'), 'utf8')) as {
      lanes: { class: string }[];
    };
    const byClass = new Map<string, number>();
    for (const lane of laneState.lanes) byClass.set(lane.class, (byClass.get(lane.class) ?? 0) + 1);
    const declared = new Map(GOVERNED_STATUS_KEYS.map((entry) => [entry.key, Number(entry.currentValue)]));
    expect(declared.get('VALIDATION_LANE_PROVEN_COUNT')! + declared.get('VALIDATION_LANE_STALE_EVIDENCE_COUNT')!).toBe(byClass.get('PROVEN') ?? 0);
    expect(declared.get('VALIDATION_LANE_BLOCKED_EXTERNAL_COUNT')).toBe(byClass.get('BLOCKED_EXTERNAL') ?? 0);
    expect(declared.get('VALIDATION_LANE_UNAVAILABLE_CAPABILITY_COUNT')).toBe(byClass.get('UNAVAILABLE_CAPABILITY') ?? 0);
  });

  test('every top-level docs file has exactly one role and CURRENT_TRUTH documents are bounded', () => {
    const roleConfig = JSON.parse(fs.readFileSync(path.join(root, 'config/document-role.v1.json'), 'utf8')) as {
      schemaVersion: string;
      documents: { path: string; role: string; maxLines?: number }[];
    };
    expect(roleConfig.schemaVersion).toBe('nightwatch.document-role.v1');
    const actual = fs.readdirSync(path.join(root, 'docs')).filter((file) => file.endsWith('.md')).sort().map((file) => `docs/${file}`);
    // The registry is the authority: every top-level docs file must be
    // declared exactly once, so the count equals the declared set.
    expect(actual.length).toBe(roleConfig.documents.length);
    const declared = new Map(roleConfig.documents.map((entry) => [entry.path, entry]));
    expect(declared.size).toBe(roleConfig.documents.length);
    for (const file of actual) expect(declared.has(file), `${file} has no role`).toBe(true);
    for (const entry of roleConfig.documents) {
      expect(['CURRENT_TRUTH', 'APPEND_ONLY_ARCHIVE', 'OPERATOR_REFERENCE']).toContain(entry.role);
      if (entry.role === 'CURRENT_TRUTH') {
        expect(entry.maxLines).toBeGreaterThan(0);
        const lines = fs.readFileSync(path.join(root, entry.path), 'utf8').split('\n').length - (fs.readFileSync(path.join(root, entry.path), 'utf8').endsWith('\n') ? 1 : 0);
        expect(lines).toBeLessThanOrEqual(entry.maxLines!);
      }
    }
  });
});
