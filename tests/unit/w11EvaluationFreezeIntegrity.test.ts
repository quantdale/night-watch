// ---------------------------------------------------------------------------
// W11 M8 — the frozen evaluation definition must keep agreeing with the code
// it claims to freeze.
//
// A freeze file is only worth the agreement between what it asserts and what
// actually runs. If `BENCHMARK_EXACT_MIN_FILE_RECALL` were lowered to 0.25
// next month, every historical figure published under this freeze would
// silently become a figure about a weaker EXACT — and nothing in the freeze
// file itself would notice, because it is just text. These assertions bind the
// two together, so weakening strict EXACT breaks a test instead of quietly
// improving a published rate.
//
// Deterministic and offline: reads the committed freeze and the committed
// constants. No provider, no network, no sibling access.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  BENCHMARK_EXACT_MIN_FILE_RECALL,
  BENCHMARK_EXACT_MIN_KEYWORD_RECALL,
} from '../../src/core/benchmark/score';
import { BENCHMARK_FIXTURE_IDS, benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import { isNegativeControl } from '../../src/core/benchmark/score';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ARM_BIN = path.join(REPO_ROOT, 'bin', 'w11-historical-arm.mjs');

const FREEZE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/evaluation-freeze.historical.json',
);

interface Freeze {
  readonly schemaVersion: string;
  readonly frozenAtSha: string;
  readonly provider: { readonly model: string; readonly preferenceList: readonly string[]; readonly preferenceOutcomes: Record<string, string> };
  readonly corpus: {
    readonly fixtureCases: readonly string[];
    readonly fixtureNegativeControls: readonly string[];
    readonly minedCases: readonly string[];
    readonly substantiveCaseCount: number;
    readonly negativeControlCount: number;
    readonly totalCaseCount: number;
  };
  readonly scoring: { readonly exactRequires: readonly string[]; readonly thresholdsMayBeTuned: boolean };
  readonly reproductionRequirement: { readonly admissionRequiresReproduction: boolean; readonly refusalWhenAbsent: string; readonly newProofClassesPermitted: boolean };
  readonly admissionRule: { readonly manualDossierInsertion: boolean; readonly syntheticEvidenceRefs: boolean; readonly reproductionCountReduction: boolean };
  readonly environmentBlockedRule: { readonly excludedFromNumerator: boolean; readonly excludedFromDenominator: boolean; readonly reportedSeparately: boolean };
  readonly reachabilityThreshold: { readonly mayBeLoweredAfterResults: boolean; readonly minRepositoriesVisibleToInvestigation: number; readonly minDeterministicReproductionCapableTargets: number };
}

const freeze = JSON.parse(fs.readFileSync(FREEZE_PATH, 'utf8')) as Freeze;

test.describe('W11 evaluation freeze integrity', () => {
  test('the freeze fingerprint recorded in the campaign record still describes this file', () => {
    const fingerprint = `sha256:${crypto.createHash('sha256').update(JSON.stringify(freeze)).digest('hex').slice(0, 24)}`;
    // The fingerprint published alongside every W11 historical figure. If the
    // freeze is edited, this changes, and the old figures stop being
    // attributable to the new definition.
    expect(fingerprint).toBe('sha256:824deef9922975feab5af69f');
  });

  test('strict EXACT thresholds in the freeze match the live scoring constants', () => {
    expect(BENCHMARK_EXACT_MIN_FILE_RECALL).toBe(0.5);
    expect(BENCHMARK_EXACT_MIN_KEYWORD_RECALL).toBe(0.5);
    const text = freeze.scoring.exactRequires.join(' | ');
    expect(text).toContain('hidden.knownFailingTest');
    expect(text).toContain(String(BENCHMARK_EXACT_MIN_FILE_RECALL));
    expect(text).toContain(String(BENCHMARK_EXACT_MIN_KEYWORD_RECALL));
    expect(freeze.scoring.thresholdsMayBeTuned).toBe(false);
  });

  test('every frozen fixture case exists and carries the negative-control flag the freeze claims', () => {
    for (const caseId of freeze.corpus.fixtureCases) {
      expect(BENCHMARK_FIXTURE_IDS, `${caseId} is not a live fixture`).toContain(caseId);
      expect(isNegativeControl(benchmarkFixtureById(caseId).hidden), `${caseId} is actually a negative control`).toBe(false);
    }
    for (const caseId of freeze.corpus.fixtureNegativeControls) {
      expect(BENCHMARK_FIXTURE_IDS, `${caseId} is not a live fixture`).toContain(caseId);
      expect(isNegativeControl(benchmarkFixtureById(caseId).hidden), `${caseId} is not a negative control`).toBe(true);
    }
  });

  test('the freeze counts add up, so a case cannot be dropped without changing a number', () => {
    const substantive = freeze.corpus.fixtureCases.length + freeze.corpus.minedCases.length;
    const controls = freeze.corpus.fixtureNegativeControls.length;
    expect(freeze.corpus.substantiveCaseCount).toBe(substantive);
    expect(freeze.corpus.negativeControlCount).toBe(controls);
    expect(freeze.corpus.totalCaseCount).toBe(substantive + controls);
    expect(controls).toBeGreaterThan(0);
  });

  test('the provider was chosen by first-pass, not by comparison', () => {
    const list = freeze.provider.preferenceList;
    const chosenIndex = list.indexOf(freeze.provider.model);
    expect(chosenIndex, 'the frozen model must appear in the preference list').toBeGreaterThanOrEqual(0);
    // Everything before the winner must have been unavailable, and everything
    // after it must never have been probed. Any other shape means candidates
    // were compared and the best kept.
    list.slice(0, chosenIndex).forEach((id) => {
      expect(freeze.provider.preferenceOutcomes[id]).toBe('ABSENT_FROM_CURRENT_MODEL_LIST');
    });
    expect(freeze.provider.preferenceOutcomes[freeze.provider.model]).toBe('PROBE_PASS');
    list.slice(chosenIndex + 1).forEach((id) => {
      expect(freeze.provider.preferenceOutcomes[id], `${id} must never have been probed`).toBe('NOT_PROBED');
    });
  });

  test('the admission, reproduction and denominator rules are frozen in their strict form', () => {
    expect(freeze.reproductionRequirement.admissionRequiresReproduction).toBe(true);
    expect(freeze.reproductionRequirement.refusalWhenAbsent).toBe('MISSING_REPRODUCTION');
    expect(freeze.reproductionRequirement.newProofClassesPermitted).toBe(false);
    expect(freeze.admissionRule.manualDossierInsertion).toBe(false);
    expect(freeze.admissionRule.syntheticEvidenceRefs).toBe(false);
    expect(freeze.admissionRule.reproductionCountReduction).toBe(false);
    // ENVIRONMENT_BLOCKED must leave BOTH sides. Excluding it from the
    // numerator alone would deflate the rate; from the denominator alone would
    // inflate it.
    expect(freeze.environmentBlockedRule.excludedFromNumerator).toBe(true);
    expect(freeze.environmentBlockedRule.excludedFromDenominator).toBe(true);
    expect(freeze.environmentBlockedRule.reportedSeparately).toBe(true);
    expect(freeze.reachabilityThreshold.mayBeLoweredAfterResults).toBe(false);
  });

  test('the reachability threshold is non-vacuous', () => {
    // A threshold of "at least one repository, at least zero targets" would
    // pass on a host that can do nothing.
    expect(freeze.reachabilityThreshold.minRepositoriesVisibleToInvestigation).toBeGreaterThan(1);
    expect(freeze.reachabilityThreshold.minDeterministicReproductionCapableTargets).toBeGreaterThan(0);
  });

  // -- M8 adversarial: the arm runner itself, executed as a process. These
  // -- refusals must happen BEFORE any provider call, so a misconfigured run
  // -- can never spend quota and then be reported under the wrong definition.

  test('the arm refuses a provider that is not the frozen model, before any call', () => {
    const result = spawnSync(process.execPath, [ARM_BIN, '--case=bench-negative-quiet-000'], {
      encoding: 'utf8',
      timeout: 60_000,
      shell: false,
      env: {
        ...process.env,
        NIGHTWATCH_PRINT_CLI: process.execPath,
        NIGHTWATCH_PRINT_ARGS: JSON.stringify(['run', '--model', 'opencode-go/not-the-frozen-model', '__PROMPT__']),
      },
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('does not name the frozen model');
    expect(result.stdout).toBe('');
  });

  test('the arm refuses to start with no provider configured', () => {
    const env = { ...process.env };
    delete env.NIGHTWATCH_PRINT_CLI;
    delete env.NIGHTWATCH_PRINT_ARGS;
    const result = spawnSync(process.execPath, [ARM_BIN, '--case=bench-negative-quiet-000'], {
      encoding: 'utf8',
      timeout: 60_000,
      shell: false,
      env,
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('refusing to start');
    expect(result.stdout).toBe('');
  });
});
