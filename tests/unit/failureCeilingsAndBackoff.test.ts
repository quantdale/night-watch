// M5 task 6.7 (C-16, C-15) — tier-scaled failure ceilings, transient versus
// permanent classes, bounded backoff with jitter, and unreachable provider
// orders.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_RUNTIME_STATE_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  ZERO_AGENT_BUDGET_USAGE,
  ZERO_AGENT_BYTE_LEDGER,
  defaultAgentBudgetPolicy,
} from '../../src/core/agentProtocol';
import { createCheckpoint, parseCheckpoint } from '../../src/core/agentRuntime/checkpoint';
import { REASONER_FAILURE_CLASSES } from '../../src/core/agentProtocol/reasoner';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import {
  PERMANENT_PROVIDER_FAILURE_CLASSES,
  PROVIDER_BACKOFF_POLICY,
  TRANSIENT_PROVIDER_FAILURE_CLASSES,
  boundedBackoffMs,
  providerFailureNature,
} from '../../src/core/agentRuntime/providerAttribution';
import { validateProviderResiliencePolicy } from '../../src/core/currentSourceYield/providerResilience';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-failure-tiers-'));
  roots.push(root);
  return root;
}

function writeScript(root: string, name: string, source: string): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

test.describe('failure ceilings and classes (6.7)', () => {
  test('the failure ceilings scale with the duration tier', () => {
    const tiers = ['HOUR_1', 'HOUR_4', 'HOUR_8', 'OVERNIGHT'] as const;
    const policies = tiers.map((tier) => defaultAgentBudgetPolicy(tier));
    for (const dimension of ['failures', 'consecutiveFailures', 'providerFailures'] as const) {
      const values = policies.map((policy) => policy[dimension]);
      for (let index = 1; index < values.length; index += 1) {
        expect(values[index], `${dimension} at ${tiers[index]}`).toBeGreaterThan(values[index - 1] as number);
      }
    }
    // The ceilings stay far below the call allowance: failures are a signal.
    for (const policy of policies) {
      expect(policy.failures).toBeLessThan(policy.reasonerCalls / 4);
    }
  });

  test('every failure class is classified and the two sets are disjoint', () => {
    for (const failureClass of REASONER_FAILURE_CLASSES) {
      const nature = providerFailureNature(failureClass);
      expect(['TRANSIENT', 'PERMANENT', 'OPERATOR']).toContain(nature);
    }
    for (const failureClass of PERMANENT_PROVIDER_FAILURE_CLASSES) {
      expect(providerFailureNature(failureClass)).toBe('PERMANENT');
      expect(TRANSIENT_PROVIDER_FAILURE_CLASSES as readonly string[]).not.toContain(failureClass);
    }
    for (const failureClass of TRANSIENT_PROVIDER_FAILURE_CLASSES) {
      expect(providerFailureNature(failureClass)).toBe('TRANSIENT');
    }
    expect(providerFailureNature('CANCELLED')).toBe('OPERATOR');
  });

  test('the backoff is bounded, jittered and deterministic given its randomness', () => {
    const low = boundedBackoffMs(1, () => 0);
    const middle = boundedBackoffMs(1, () => 0.5);
    const high = boundedBackoffMs(1, () => 1);
    expect(low).toBeLessThanOrEqual(middle);
    expect(middle).toBeLessThanOrEqual(high);
    expect(middle).toBe(PROVIDER_BACKOFF_POLICY.baseMs);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(PROVIDER_BACKOFF_POLICY.maxMs);
    // Bounded on a long outage, and never negative.
    expect(boundedBackoffMs(1_000, () => 1)).toBeLessThanOrEqual(PROVIDER_BACKOFF_POLICY.maxMs);
    expect(boundedBackoffMs(0, () => 0)).toBeGreaterThanOrEqual(0);
    expect(boundedBackoffMs(3, () => 0.5)).toBe(Math.min(PROVIDER_BACKOFF_POLICY.maxMs, PROVIDER_BACKOFF_POLICY.baseMs * 4));
  });

  test('a permanent failure class stops the run instead of burning the allowance', async () => {
    const root = scratch();
    const sleeps: number[] = [];
    // Non-JSON stdout: MALFORMED_OUTPUT, a permanent protocol fact.
    const broken = writeScript(root, 'malformed.mjs', 'process.stdout.write("not json at all\\n");\n');
    const result = await runLocalCliCampaign({
      campaignId: 'camp-permanent-failure',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [broken],
      provider: 'malformed-provider',
      model: 'broken-model',
      maxTurns: 5,
      stateDirectory: path.join(root, 'state'),
      backoff: { sleep: async (ms) => { sleeps.push(ms); }, random: () => 0.5 },
    });
    // A permanent class ends its investigation after ONE call: no retry is
    // spent on it. The campaign then stops on its own stagnation limit rather
    // than on the failure allowance, so the total stays at one call per
    // stagnant investigation (never the tier's eight failures).
    expect(result.reasonerCalls).toBeLessThanOrEqual(3);
    expect(result.terminationCounts.REASONER_FAILURE).toBe(result.reasonerCalls);
    expect(result.terminationCounts.BUDGET_EXHAUSTED).toBe(0);
    expect(sleeps).toEqual([]);
    expect(Object.keys(result.providerAttribution.byClass)).toEqual(['GARBAGE_OUTPUT']);
    expect(result.providerAttribution.byClass.GARBAGE_OUTPUT).toBe(result.reasonerCalls);
    // Never answered at all: the campaign-level judgement says so.
    expect(result.terminationClass).toBe('PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION');
  });

  test('transient failures retry under the bounded backoff and can recover', async () => {
    const root = scratch();
    const sleeps: number[] = [];
    const flaky = writeScript(
      root,
      'flaky.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const turn = Number(String(request.turnId).split(':').at(-1));
  if (turn <= 2) {
    process.stderr.write('provider hiccup\\n');
    process.exit(3);
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const result = await runLocalCliCampaign({
      campaignId: 'camp-transient-failure',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [flaky],
      provider: 'flaky-provider',
      model: 'flaky-model',
      maxTurns: 5,
      stateDirectory: path.join(root, 'state'),
      backoff: { sleep: async (ms) => { sleeps.push(ms); }, random: () => 0.5 },
    });
    // Each transient failure is followed by ONE bounded backoff delay, and the
    // delay grows with the streak until it is capped.
    expect(sleeps.length).toBeGreaterThanOrEqual(2);
    expect(sleeps[0]).toBe(PROVIDER_BACKOFF_POLICY.baseMs);
    expect(sleeps[1]).toBe(PROVIDER_BACKOFF_POLICY.baseMs * 2);
    for (const delay of sleeps) {
      expect(delay).toBeLessThanOrEqual(PROVIDER_BACKOFF_POLICY.maxMs);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
    expect(result.providerAttribution.byClass.NONZERO_EXIT).toBe(result.providerFailures);
    // The provider answered eventually: a degraded run, not a blocked one.
    expect(result.terminationClass).toBe('PROVIDER_DEGRADED');
    expect(result.terminationCounts.COMPLETE_NO_FINDING).toBeGreaterThanOrEqual(1);
  });

  test('an unreachable provider order is refused', () => {
    const policy = (overrides: Record<string, unknown> = {}) => ({
      schemaVersion: 'nightwatch.provider-resilience-policy.v1',
      campaignId: 'camp-unreachable',
      declaredBeforeProbe: true,
      orderingCriteria: ['cost'],
      qualityBasedSelection: false,
      cli: { mode: 'print', adapter: 'print-cli', shell: false, structuredResponseSchema: 'nightwatch.x.v1' },
      timing: { probeTimeoutMs: 1_000, runtimeTimeoutMs: 1_000 },
      retryPolicy: { attemptsPerCall: 2 },
      failover: {
        eligibleClasses: ['PROVIDER_RUNTIME_TIMEOUT'],
        ineligibleClasses: ['PROVIDER_AUTH_FAILURE'],
        maxConsecutiveFailuresByClass: { DEFAULT: 2 },
        maxTransitions: 1,
        recovery: { permitted: false },
        exhaustionBehavior: 'PROVIDER_BLOCKED',
      },
      budgetEnvelope: {
        schemaVersion: 'nightwatch.runtime-budget-envelope.v1',
        ceilingName: 'HOUR_1',
        reasonerCalls: 10,
        toolActions: 10,
        inputBytes: 10,
        outputBytes: 10,
        toolPayloadBytes: 10,
        failures: 8,
        consecutiveFailures: 6,
        providerFailures: 8,
      },
      candidates: [
        { ordinal: 1, provider: 'a', model: 'm', argvTemplate: ['x'], reason: 'first' },
        { ordinal: 2, provider: 'b', model: 'm', argvTemplate: ['x'], reason: 'second' },
        { ordinal: 3, provider: 'c', model: 'm', argvTemplate: ['x'], reason: 'third' },
      ],
      fingerprint: 'sha256:' + '0'.repeat(64),
      ...overrides,
    });
    const unreachable = validateProviderResiliencePolicy(policy());
    expect(unreachable.ok).toBe(false);
    if (!unreachable.ok) {
      const codes = unreachable.violations.map((violation) => violation.code);
      expect(codes).toContain('PROVIDER_POLICY_UNREACHABLE_CANDIDATES');
    }

    // Enough transitions but too small a failure allowance: still unreachable.
    const tooFewFailures = validateProviderResiliencePolicy(
      policy({
        failover: {
          eligibleClasses: ['PROVIDER_RUNTIME_TIMEOUT'],
          ineligibleClasses: ['PROVIDER_AUTH_FAILURE'],
          maxConsecutiveFailuresByClass: { DEFAULT: 2 },
          maxTransitions: 2,
          recovery: { permitted: false },
          exhaustionBehavior: 'PROVIDER_BLOCKED',
        },
        budgetEnvelope: {
          schemaVersion: 'nightwatch.runtime-budget-envelope.v1',
          ceilingName: 'HOUR_1',
          reasonerCalls: 10,
          toolActions: 10,
          inputBytes: 10,
          outputBytes: 10,
          toolPayloadBytes: 10,
          failures: 8,
          consecutiveFailures: 6,
          providerFailures: 4,
        },
      }),
    );
    expect(tooFewFailures.ok).toBe(false);
    if (!tooFewFailures.ok) {
      expect(tooFewFailures.violations.map((violation) => violation.code)).toContain(
        'PROVIDER_POLICY_UNREACHABLE_CANDIDATES',
      );
    }

    // A reachable order passes.
    const reachable = validateProviderResiliencePolicy(
      policy({
        failover: {
          eligibleClasses: ['PROVIDER_RUNTIME_TIMEOUT'],
          ineligibleClasses: ['PROVIDER_AUTH_FAILURE'],
          maxConsecutiveFailuresByClass: { DEFAULT: 2 },
          maxTransitions: 2,
          recovery: { permitted: false },
          exhaustionBehavior: 'PROVIDER_BLOCKED',
        },
      }),
    );
    expect(reachable.ok).toBe(true);
  });

  test('checkpoint bytes written before the rename still resume under the new name', () => {
    const policy = defaultAgentBudgetPolicy('HOUR_1');
    const state = {
      schemaVersion: AGENT_RUNTIME_STATE_VERSION,
      campaignId: 'camp-rename-legacy',
      status: 'TERMINATED' as const,
      phase: 'PLAN' as const,
      hypotheses: [],
      actionLog: [],
      evidenceRefs: [],
      candidateIds: [],
      knownTargets: [],
      byteLedger: { ...ZERO_AGENT_BYTE_LEDGER },
      budget: { policy, usage: { ...ZERO_AGENT_BUDGET_USAGE, failures: 3, providerFailures: 2 } },
      terminationReason: 'REASONER_FAILURE',
    };
    const checkpoint = JSON.parse(JSON.stringify(createCheckpoint(state, 0))) as Record<string, unknown>;
    const budget = (checkpoint['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>;
    const legacyPolicy = budget['policy'] as Record<string, unknown>;
    const legacyUsage = budget['usage'] as Record<string, unknown>;
    // Exactly the pre-rename shape: the `failures` dimension was `retries`.
    legacyPolicy['retries'] = legacyPolicy['failures'];
    delete legacyPolicy['failures'];
    legacyUsage['retries'] = legacyUsage['failures'];
    delete legacyUsage['failures'];

    const parsed = parseCheckpoint(checkpoint);
    expect(parsed.state.budget.policy.failures).toBe(policy.failures);
    expect(parsed.state.budget.usage.failures).toBe(3);
    expect(parsed.state.budget.usage.providerFailures).toBe(2);
    // The legacy key never survives the read.
    expect('retries' in (parsed.state.budget.policy as unknown as Record<string, unknown>)).toBe(false);
    expect('retries' in (parsed.state.budget.usage as unknown as Record<string, unknown>)).toBe(false);

    // A record with NEITHER name still fails closed.
    const missingBoth = JSON.parse(JSON.stringify(checkpoint)) as Record<string, unknown>;
    const missingPolicy = ((missingBoth['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>)[
      'policy'
    ] as Record<string, unknown>;
    delete missingPolicy['retries'];
    expect(() => parseCheckpoint(missingBoth)).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
  });
});

