import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { deriveRuntimeBudgetEnvelope } from '../../src/core/agentRuntime/runtimeBudgetEnvelope';
import {
  PROVIDER_RESILIENCE_POLICY_VERSION,
  ProviderResiliencePolicyError,
  assertPolicyFingerprintMatches,
  collectPolicyFieldPaths,
  computeProviderResilienceFingerprint,
  replayProviderFailures,
  validateProviderResiliencePolicy,
  type ProviderResiliencePolicy,
} from '../../src/core/currentSourceYield/providerResilience';

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY_PATH = path.join(
  ROOT,
  '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/provider-resilience-policy.json',
);

function committedPolicy(): ProviderResiliencePolicy {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8')) as ProviderResiliencePolicy;
}

function clone(policy: ProviderResiliencePolicy): ProviderResiliencePolicy {
  return JSON.parse(JSON.stringify(policy)) as ProviderResiliencePolicy;
}

test.describe('W13 provider-resilience policy', () => {
  test('the committed policy validates and its fingerprint recomputes', () => {
    const policy = committedPolicy();
    expect(policy.declaredBeforeProbe).toBe(true);
    expect(validateProviderResiliencePolicy(policy).ok).toBe(true);
    expect(computeProviderResilienceFingerprint(policy as unknown as Record<string, unknown>)).toBe(policy.fingerprint);
    expect(policy.fingerprint).toMatch(/^sha256:[0-9a-f]{24}$/);
    expect(policy.candidates.map((candidate) => candidate.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(validateProviderResiliencePolicy(policy, { derivedBudgetEnvelope: deriveRuntimeBudgetEnvelope('HOUR_1') }).ok).toBe(true);
  });

  test('a mutation to any bound dimension changes the fingerprint and is reported by field', () => {
    const base = committedPolicy();
    const mutations: { readonly label: string; readonly apply: (policy: ProviderResiliencePolicy) => void }[] = [
      { label: 'candidates[0].provider', apply: (policy) => { (policy.candidates as unknown as { provider: string }[])[0]!.provider = 'opencode-go/other'; } },
      { label: 'candidates[0].model', apply: (policy) => { (policy.candidates as unknown as { model: string }[])[0]!.model = 'opencode-go/other'; } },
      { label: 'timing.probeTimeoutMs', apply: (policy) => { (policy.timing as unknown as { probeTimeoutMs: number }).probeTimeoutMs = 30001; } },
      { label: 'timing.runtimeTimeoutMs', apply: (policy) => { (policy.timing as unknown as { runtimeTimeoutMs: number }).runtimeTimeoutMs = 120001; } },
      { label: 'retryPolicy.attemptsPerCall', apply: (policy) => { (policy.retryPolicy as unknown as { attemptsPerCall: number }).attemptsPerCall = 2; } },
      { label: 'failover.eligibleClasses', apply: (policy) => { (policy.failover as unknown as { eligibleClasses: string[] }).eligibleClasses = ['PROVIDER_RUNTIME_TIMEOUT']; } },
      { label: 'failover.maxConsecutiveFailuresByClass.DEFAULT', apply: (policy) => { (policy.failover as unknown as { maxConsecutiveFailuresByClass: Record<string, number> }).maxConsecutiveFailuresByClass.DEFAULT = 4; } },
      { label: 'failover.maxTransitions', apply: (policy) => { (policy.failover as unknown as { maxTransitions: number }).maxTransitions = 3; } },
      { label: 'failover.recovery.permitted', apply: (policy) => { (policy.failover as unknown as { recovery: { permitted: boolean } }).recovery.permitted = true; } },
      { label: 'budgetEnvelope.providerFailures', apply: (policy) => { (policy.budgetEnvelope as unknown as { providerFailures: number }).providerFailures = 3; } },
      { label: 'cli.structuredResponseSchema', apply: (policy) => { (policy.cli as unknown as { structuredResponseSchema: string }).structuredResponseSchema = 'nightwatch.other'; } },
    ];
    for (const mutation of mutations) {
      const mutated = clone(base);
      mutation.apply(mutated);
      const recomputed = computeProviderResilienceFingerprint(mutated as unknown as Record<string, unknown>);
      expect(recomputed, mutation.label).not.toBe(base.fingerprint);
      const changed = collectPolicyFieldPaths(base as unknown as Record<string, unknown>, mutated as unknown as Record<string, unknown>);
      expect(changed.length, mutation.label).toBeGreaterThan(0);
      expect(changed.join(', '), mutation.label).toContain(mutation.label);
    }
  });

  test('a mutated-policy resume fails closed with the changed fields named', () => {
    const base = committedPolicy();
    const mutated = clone(base);
    (mutated.failover as unknown as { maxTransitions: number }).maxTransitions = 2;
    try {
      assertPolicyFingerprintMatches(
        { fingerprint: base.fingerprint, policy: base as unknown as Record<string, unknown> },
        mutated as unknown as Record<string, unknown>,
      );
      throw new Error('expected the mutated policy to be refused');
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderResiliencePolicyError);
      const policyError = error as ProviderResiliencePolicyError;
      expect(policyError.code).toBe('PROVIDER_POLICY_FINGERPRINT_MISMATCH');
      expect(policyError.fields).toContain('failover.maxTransitions');
    }
    expect(() => assertPolicyFingerprintMatches(
      { fingerprint: base.fingerprint, policy: base as unknown as Record<string, unknown> },
      base as unknown as Record<string, unknown>,
    )).not.toThrow();
  });

  test('replaying a fixed failure sequence reproduces exactly the same transitions', () => {
    const policy = committedPolicy();
    const events = [
      { class: 'PROVIDER_PROBE_TIMEOUT' as const, atEvent: 1 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 2 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 3 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 4 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 5 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 6 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 7 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 8 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 9 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 10 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 11 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 12 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 13 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 14 },
    ];
    const first = replayProviderFailures(policy, events);
    const second = replayProviderFailures(policy, events);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.transitions.map((transition) => transition.from)).toEqual([
      'opencode-go/muse-spark-1.3-contributor',
      'opencode-go/kimi-k3',
      'opencode-go/qwen3.8-max',
      'opencode-go/minimax-m3',
    ]);
    expect(first.totalTransitions).toBe(4);
    expect(first.exhausted).toBe(true);
    expect(first.activeProvider).toBe('opencode/nemotron-3.5-lightning-free');
  });

  test('an ineligible failure class never triggers a transition', () => {
    const policy = committedPolicy();
    const replay = replayProviderFailures(policy, Array.from({ length: 6 }, (_, index) => ({ class: 'LOCAL_CLI_FAILURE' as const, atEvent: index + 1 })));
    expect(replay.transitions).toEqual([]);
    expect(replay.exhausted).toBe(false);
    expect(replay.activeProvider).toBe('opencode-go/muse-spark-1.3-contributor');
  });

  test('recovery happens only when the policy explicitly permits it', () => {
    const policy = clone(committedPolicy());
    (policy.failover as unknown as { recovery: { permitted: boolean; providers?: string[]; condition?: string } }).recovery = {
      permitted: true,
      providers: ['opencode-go/muse-spark-1.3-contributor'],
      condition: 'explicit test-only recovery clause',
    };
    (policy.failover as unknown as { maxTransitions: number }).maxTransitions = 3;
    (policy.candidates as unknown as unknown[]).splice(2);
    const events = [
      { class: 'PROVIDER_PROBE_TIMEOUT' as const, atEvent: 1 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 2 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 3 },
      { class: 'PROVIDER_RUNTIME_TIMEOUT' as const, atEvent: 4 },
    ];
    const replay = replayProviderFailures(policy, events);
    const recovery = replay.transitions.find((transition) => transition.reason === 'RECOVERY_EXPLICIT_POLICY');
    expect(recovery).toBeDefined();
    expect(recovery?.to).toBe('opencode-go/muse-spark-1.3-contributor');
  });

  test('malformed policies and envelope disagreement are refused', () => {
    const base = committedPolicy();
    const unknownClass = clone(base);
    (unknownClass.failover as unknown as { eligibleClasses: string[] }).eligibleClasses = ['NOT_A_CLASS'];
    expect(validateProviderResiliencePolicy(unknownClass).ok).toBe(false);

    const duplicate = clone(base);
    (duplicate.candidates as unknown as { provider: string }[])[1]!.provider = 'opencode-go/muse-spark-1.3-contributor';
    expect(validateProviderResiliencePolicy(duplicate).ok).toBe(false);

    const badRecovery = clone(base);
    (badRecovery.failover as unknown as { recovery: { permitted: boolean } }).recovery = { permitted: true };
    expect(validateProviderResiliencePolicy(badRecovery).ok).toBe(false);

    const badEnvelope = clone(base);
    (badEnvelope.budgetEnvelope as unknown as { providerFailures: number }).providerFailures = 3;
    const checked = validateProviderResiliencePolicy(badEnvelope, { derivedBudgetEnvelope: deriveRuntimeBudgetEnvelope('HOUR_1') });
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.violations.map((violation) => violation.code)).toContain('RUNTIME_BUDGET_ENVELOPE_MISMATCH');
    }
  });

  test('the policy schema identifier is stable', () => {
    expect(PROVIDER_RESILIENCE_POLICY_VERSION).toBe('nightwatch.provider-resilience-policy.v1');
  });
});
