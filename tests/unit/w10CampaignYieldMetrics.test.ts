// W10 — live campaign yield is derived from the action log, not hand-counted.
//
// The first reading of the first W10 live campaign claimed "zero reproduction
// attempts" because a human counted admitted reproductions. The run had
// attempted six and executed four. These cases pin the arithmetic that
// replaces that reading.
import { test, expect } from '@playwright/test';

import {
  campaignNotAvailableRate,
  deriveCampaignYieldMetrics,
  executedAttemptRate,
  REPRODUCTION_TOOL_ID,
  type CampaignYieldAction,
} from '../../src/core/reproductionSurface/campaignYield';
import type { ReproductionSurfaceEntry } from '../../src/core/reproductionSurface/contracts';

function attempt(resultClass: string, target: string): CampaignYieldAction {
  return { toolId: REPRODUCTION_TOOL_ID, resultClass, target };
}

function otherAction(resultClass: string): CampaignYieldAction {
  return { toolId: 'INSPECT_SOURCE_SURFACE', resultClass, target: 'repo/a:src/x.go' };
}

function executable(sourcePath: string, targetId: string): ReproductionSurfaceEntry {
  return {
    sourcePath,
    readiness: 'EXECUTABLE_NOW',
    executorClass: 'GO_VENDORED_PACKAGE_TEST',
    refusal: null,
    targetId,
  };
}

function notExecutable(sourcePath: string): ReproductionSurfaceEntry {
  return {
    sourcePath,
    readiness: 'NOT_EXECUTABLE',
    executorClass: null,
    refusal: 'NO_SUPPORTED_EXECUTOR',
    targetId: null,
  };
}

test('the W9 reference shape measures total waste, not silence', () => {
  const metrics = deriveCampaignYieldMetrics({
    surface: [notExecutable('a/b:src/one.go'), notExecutable('a/b:src/two.go')],
    actionLog: [
      otherAction('SOURCE_INDEX'),
      attempt('NOT_AVAILABLE', 'a/b:src/one.go'),
      attempt('NOT_AVAILABLE', 'a/b:src/two.go'),
    ],
  });
  expect(metrics.reproductionAttempts).toBe(2);
  expect(metrics.executedAttempts).toBe(0);
  expect(metrics.notAvailableAttempts).toBe(2);
  expect(campaignNotAvailableRate(metrics)).toBe(1);
  expect(executedAttemptRate(metrics)).toBe(0);
  expect(metrics.attemptsToFirstExecutedReproduction).toBeNull();
  expect(metrics.actionsToFirstExecutedReproduction).toBeNull();
  expect(metrics.visibleExecutableSources).toBe(0);
});

test('a mixed live run separates executions from refusals and locates the first execution', () => {
  const metrics = deriveCampaignYieldMetrics({
    surface: [
      executable('o/ouchan:pkg/a/a.go', 'surface:1111'),
      executable('o/ouchan:pkg/b/b.go', 'surface:2222'),
      notExecutable('u/ui:src/App.vue'),
    ],
    actionLog: [
      otherAction('SOURCE_INDEX'),
      attempt('NOT_AVAILABLE', 'u/ui:src/App.vue'),
      otherAction('SOURCE_FILE'),
      attempt('NOT_REPRODUCED', 'o/ouchan:pkg/a/a.go'),
      attempt('REPRODUCED_CURRENT_FAILURE', 'o/ouchan:pkg/b/b.go'),
    ],
  });
  expect(metrics.reproductionAttempts).toBe(3);
  expect(metrics.executedAttempts).toBe(2);
  expect(metrics.notAvailableAttempts).toBe(1);
  expect(metrics.qualifyingReproductions).toBe(1);
  expect(metrics.distinctAttemptedTargets).toBe(3);
  expect(metrics.distinctExecutedTargets).toBe(2);
  // Second attempt overall, fourth action overall.
  expect(metrics.attemptsToFirstExecutedReproduction).toBe(2);
  expect(metrics.actionsToFirstExecutedReproduction).toBe(4);
  expect(metrics.visibleSources).toBe(3);
  expect(metrics.visibleExecutableSources).toBe(2);
  expect(metrics.visibleExecutableTargets).toBe(2);
  expect(metrics.visibleRepositories).toBe(2);
});

test('a repeat is a second attempt on the same proven-unsupported source', () => {
  const metrics = deriveCampaignYieldMetrics({
    surface: [],
    actionLog: [
      // Two different sources sharing one refusal class are not a repeat.
      attempt('NOT_AVAILABLE', 'a/b:src/one.go'),
      attempt('NOT_AVAILABLE', 'a/b:src/two.go'),
      // The same source again is.
      attempt('NOT_AVAILABLE', 'a/b:src/one.go'),
    ],
  });
  expect(metrics.notAvailableAttempts).toBe(3);
  expect(metrics.repeatedUnsupportedAttempts).toBe(1);
});

test('blocked, errored and unknown verdicts are never executions or proof', () => {
  const metrics = deriveCampaignYieldMetrics({
    surface: [],
    actionLog: [
      attempt('ENVIRONMENT_BLOCKED', 'o/ouchan:pkg/a/a.go'),
      attempt('TOOL_ERROR', 'o/ouchan:pkg/a/a.go'),
      attempt('ADAPTER_UNAVAILABLE', 'o/ouchan:pkg/b/b.go'),
      attempt('TOTALLY_MADE_UP_VERDICT', 'o/ouchan:pkg/b/b.go'),
    ],
  });
  expect(metrics.reproductionAttempts).toBe(4);
  expect(metrics.executedAttempts).toBe(0);
  expect(metrics.environmentBlockedAttempts).toBe(1);
  expect(metrics.erroredAttempts).toBe(3);
  expect(metrics.qualifyingReproductions).toBe(0);
  expect(metrics.attemptsToFirstExecutedReproduction).toBeNull();
});

test('non-reproduction actions never count as attempts', () => {
  const metrics = deriveCampaignYieldMetrics({
    surface: [],
    actionLog: [
      otherAction('SOURCE_FILE'),
      { toolId: null, resultClass: 'HYPOTHESIS_FORMED' },
      { toolId: 'REQUEST_FINDING_PROPOSAL', resultClass: 'FINDING_PROPOSAL' },
    ],
  });
  expect(metrics.reproductionAttempts).toBe(0);
  expect(executedAttemptRate(metrics)).toBeNull();
  expect(campaignNotAvailableRate(metrics)).toBeNull();
});
