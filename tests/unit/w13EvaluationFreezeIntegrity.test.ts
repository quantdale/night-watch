import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { deriveRuntimeBudgetEnvelope } from '../../src/core/agentRuntime/runtimeBudgetEnvelope';
import {
  EvaluationFreezeError,
  assertEvaluationFreezeUnchanged,
  assertResumeWithinFrozenMatrix,
  computeEvaluationFreezeFingerprint,
  validateEvaluationFreeze,
  type FrozenMatrixEntry,
} from '../../src/core/currentSourceYield/evaluationFreeze';
import {
  computeProviderResilienceFingerprint,
} from '../../src/core/currentSourceYield/providerResilience';

const ROOT = path.resolve(__dirname, '..', '..');
const TASK = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1');
const FREEZE_PATH = path.join(TASK, 'evaluation-freeze.json');
const POLICY_PATH = path.join(TASK, 'provider-resilience-policy.json');

function committedFreeze(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(FREEZE_PATH, 'utf8')) as Record<string, unknown>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test.describe('W13 evaluation freeze integrity', () => {
  test('the committed freeze validates and its fingerprint recomputes', () => {
    const freeze = committedFreeze();
    expect(validateEvaluationFreeze(freeze, { derivedBudgetEnvelope: deriveRuntimeBudgetEnvelope('HOUR_1') }).ok).toBe(true);
    expect(computeEvaluationFreezeFingerprint(freeze)).toBe(freeze.freezeFingerprint);
    expect(freeze.freezeFingerprint).toMatch(/^sha256:[0-9a-f]{24}$/);
    const matrix = freeze.matrix as FrozenMatrixEntry[];
    expect(matrix).toHaveLength(9);
    expect(matrix[0]?.runId).toBe('w13-broad-all-repositories-1');
  });

  test('the freeze binds the committed provider policy fingerprint and selection', () => {
    const freeze = committedFreeze();
    const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8')) as Record<string, unknown>;
    const provider = freeze.provider as Record<string, unknown>;
    expect(provider.policyFingerprint).toBe(computeProviderResilienceFingerprint(policy));
    expect(provider.selectedProvider).toBe('opencode-go/glm-5.3');
    expect(provider.selectionRule).toBe('FIRST_PASS_OF_FROZEN_ORDER');
    expect(provider.failoverRemainsDeclared).toBe(true);
  });

  test('a mutation to any bound freeze dimension changes the fingerprint and is named', () => {
    const base = committedFreeze();
    const mutations: { readonly label: string; readonly apply: (freeze: Record<string, unknown>) => void }[] = [
      { label: 'universe.repositoryShas.alphauslabs/blue-sdk-go', apply: (freeze) => { ((freeze.universe as Record<string, unknown>).repositoryShas as Record<string, string>)['alphauslabs/blue-sdk-go'] = '0'.repeat(40); } },
      { label: 'universe.repositoryOrder', apply: (freeze) => { ((freeze.universe as Record<string, unknown>).repositoryOrder as string[]).reverse(); } },
      { label: 'universe.censusDigest', apply: (freeze) => { (freeze.universe as Record<string, unknown>).censusDigest = 'sha256:other'; } },
      { label: 'matrix[0].wallClockCeilingMs', apply: (freeze) => { (freeze.matrix as { wallClockCeilingMs: number }[])[0]!.wallClockCeilingMs = 1; } },
      { label: 'matrix.length', apply: (freeze) => { (freeze.matrix as unknown[]).pop(); } },
      { label: 'sourceAndReproduction.permittedReproductionClasses', apply: (freeze) => { ((freeze.sourceAndReproduction as Record<string, unknown>).permittedReproductionClasses as string[]).push('NEW_CLASS'); } },
      { label: 'admission.missingReproductionRefusal', apply: (freeze) => { (freeze.admission as Record<string, unknown>).missingReproductionRefusal = 'ADMIT_ANYWAY'; } },
      { label: 'novelty.phase', apply: (freeze) => { (freeze.novelty as Record<string, unknown>).phase = 'BEFORE_ADMISSION'; } },
      { label: 'contaminationFirewall.historicalGroundTruthToReasoner', apply: (freeze) => { (freeze.contaminationFirewall as Record<string, unknown>).historicalGroundTruthToReasoner = 'ALLOWED'; } },
      { label: 'provider.selectedProvider', apply: (freeze) => { (freeze.provider as Record<string, unknown>).selectedProvider = 'opencode-go/other'; } },
      { label: 'provider.policyFingerprint', apply: (freeze) => { (freeze.provider as Record<string, unknown>).policyFingerprint = 'sha256:other'; } },
      { label: 'runtimeBudgetEnvelope.providerFailures', apply: (freeze) => { (freeze.runtimeBudgetEnvelope as Record<string, number>).providerFailures = 3; } },
      { label: 'stoppingAndRetry.providerExhaustion', apply: (freeze) => { (freeze.stoppingAndRetry as Record<string, unknown>).providerExhaustion = 'ZERO_YIELD'; } },
      { label: 'metrics.perProviderAttributionRequired', apply: (freeze) => { (freeze.metrics as Record<string, unknown>).perProviderAttributionRequired = false; } },
    ];
    for (const mutation of mutations) {
      const mutated = clone(base);
      mutation.apply(mutated);
      const recomputed = computeEvaluationFreezeFingerprint(mutated);
      expect(recomputed, mutation.label).not.toBe(base.freezeFingerprint);
      try {
        assertEvaluationFreezeUnchanged(
          { freezeFingerprint: base.freezeFingerprint as string, freeze: base },
          mutated,
        );
        throw new Error(`expected ${mutation.label} to be refused`);
      } catch (error) {
        expect(error).toBeInstanceOf(EvaluationFreezeError);
        const freezeError = error as EvaluationFreezeError;
        expect(freezeError.code).toBe('EVALUATION_FREEZE_FINGERPRINT_MISMATCH');
        expect(freezeError.fields.join(', '), mutation.label).toContain(mutation.label);
      }
    }
  });

  test('a widened or unknown resume fails closed against the frozen matrix', () => {
    const matrix = committedFreeze().matrix as FrozenMatrixEntry[];
    expect(() => assertResumeWithinFrozenMatrix(matrix, { runId: 'w13-repository-05', repositoryScope: null })).toThrow(/EVALUATION_FREEZE_WIDENED_RESUME/);
    expect(() => assertResumeWithinFrozenMatrix(matrix, { runId: 'w13-repository-05', repositoryScope: 'mobingilabs/ripple-api' })).toThrow(/EVALUATION_FREEZE_WIDENED_RESUME/);
    expect(() => assertResumeWithinFrozenMatrix(matrix, { runId: 'w13-unknown-run', repositoryScope: null })).toThrow(/EVALUATION_FREEZE_UNKNOWN_RUN/);
    const ok = assertResumeWithinFrozenMatrix(matrix, { runId: 'w13-repository-05', repositoryScope: 'mobingilabs/ouchan' });
    expect(ok.wallClockCeilingMs).toBe(3600000);
    const broad = assertResumeWithinFrozenMatrix(matrix, { runId: 'w13-broad-all-repositories-1', repositoryScope: null });
    expect(broad.kind).toBe('BROAD_ALL_REPOSITORIES');
  });

  test('the freeze refuses an envelope that disagrees with the engine and a malformed matrix', () => {
    const freeze = committedFreeze();
    const badEnvelope = clone(freeze);
    (badEnvelope.runtimeBudgetEnvelope as Record<string, number>).providerFailures = 3;
    const envelopeChecked = validateEvaluationFreeze(badEnvelope, { derivedBudgetEnvelope: deriveRuntimeBudgetEnvelope('HOUR_1') });
    expect(envelopeChecked.ok).toBe(false);
    if (!envelopeChecked.ok) {
      expect(envelopeChecked.violations.join(' ')).toContain('runtimeBudgetEnvelope');
    }

    const shortMatrix = clone(freeze);
    (shortMatrix.matrix as unknown[]).splice(2);
    expect(validateEvaluationFreeze(shortMatrix).ok).toBe(false);
    const emptyMatrix = clone(freeze);
    emptyMatrix.matrix = [];
    expect(validateEvaluationFreeze(emptyMatrix).ok).toBe(false);
    const wrongKind = clone(freeze);
    ((wrongKind.matrix as { kind: string }[])[0]!).kind = 'REPOSITORY_SCOPED';
    expect(validateEvaluationFreeze(wrongKind).ok).toBe(false);
  });
});
