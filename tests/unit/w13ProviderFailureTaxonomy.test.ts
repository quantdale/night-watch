import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AGENT_RUNTIME_STATE_VERSION,
  REASONER_TURN_REQUEST_VERSION,
  ZERO_AGENT_BUDGET_USAGE,
  defaultAgentBudgetPolicy,
  type ReasonerCallOptions,
  type ReasonerFailureClass,
  type ReasonerTurnRequest,
} from '../../src/core/agentProtocol';
import {
  PROVIDER_FAILURE_CLASSES,
  PROVIDER_SIGNAL_SCAN_MAX_CHARS,
  classifyProviderFailure,
  providerSignalFromText,
} from '../../src/core/agentProtocol/providerFailure';
import { deriveInvestigationMemory } from '../../src/core/investigationMemory/derive';
import { createCliReasonerDriver, type CliReasonerConfig } from '../../src/core/reasoner/cliReasoner';

const NODE = process.execPath;

function scratchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w13-taxonomy-'));
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, 'utf8');
  return file;
}

function makeRequest(): ReasonerTurnRequest {
  return {
    schemaVersion: REASONER_TURN_REQUEST_VERSION,
    campaignId: 'w13-taxonomy-test',
    turnId: 'turn-0001',
    observation: {
      phase: 'PLAN',
      untrusted: [],
      evidenceRefs: [],
      allowedToolIds: [],
      allowedIntentKinds: [],
      memory: deriveInvestigationMemory({
        schemaVersion: AGENT_RUNTIME_STATE_VERSION,
        campaignId: 'w13-taxonomy-test',
        status: 'RUNNING',
        phase: 'PLAN',
        hypotheses: [],
        actionLog: [],
        evidenceRefs: [],
        candidateIds: [],
        knownTargets: [],
        budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
        terminationReason: null,
      }),
    },
    budgetRemaining: {
      policy: defaultAgentBudgetPolicy('HOUR_1'),
      usage: ZERO_AGENT_BUDGET_USAGE,
    },
  };
}

function driverFor(script: string, overrides: Partial<CliReasonerConfig> = {}): ReturnType<typeof createCliReasonerDriver> {
  return createCliReasonerDriver({
    executable: NODE,
    args: [script],
    provider: 'test-provider',
    model: 'fake-1',
    killGraceMs: 100,
    stdioGraceMs: 300,
    validationContext: { authorizedEnvironments: [] },
    ...overrides,
  });
}

function callOptions(overrides: Partial<ReasonerCallOptions> = {}): ReasonerCallOptions {
  return {
    timeoutMs: 5_000,
    stdoutByteCap: 1024 * 1024,
    stderrByteCap: 256 * 1024,
    signal: new AbortController().signal,
    ...overrides,
  };
}

test.describe('W13 provider failure taxonomy', () => {
  test('every taxonomy member is reachable and every protocol class maps to exactly one member', () => {
    expect(new Set(PROVIDER_FAILURE_CLASSES).size).toBe(10);
    const valid = classifyProviderFailure({ phase: 'RUNTIME', ok: true });
    expect(valid.class).toBe('VALID_PROVIDER_RESPONSE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', providerPresent: false }).class).toBe('PROVIDER_ABSENT');
    expect(classifyProviderFailure({ phase: 'RUNTIME', spawnErrorCode: 'ENOENT' }).class).toBe('PROVIDER_ABSENT');
    expect(classifyProviderFailure({ phase: 'PROBE', reasonerClass: 'TIMEOUT' }).class).toBe('PROVIDER_PROBE_TIMEOUT');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'TIMEOUT' }).class).toBe('PROVIDER_RUNTIME_TIMEOUT');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'HUNG_GRANDCHILD' }).class).toBe('PROVIDER_RUNTIME_TIMEOUT');
    expect(classifyProviderFailure({ phase: 'PROBE', timedOut: true }).class).toBe('PROVIDER_PROBE_TIMEOUT');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'NONZERO_EXIT' }).class).toBe('PROVIDER_NONZERO_EXIT');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'NONZERO_EXIT', providerSignalText: 'HTTP 401 Unauthorized' }).class).toBe('PROVIDER_AUTH_FAILURE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'NONZERO_EXIT', providerSignalText: 'rate limit exceeded, retry later' }).class).toBe('PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'NONZERO_EXIT', providerSignalText: 'namespace unavailable for this account' }).class).toBe('PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'CLI_CRASH' }).class).toBe('LOCAL_CLI_FAILURE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'CANCELLED' }).class).toBe('LOCAL_CLI_FAILURE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', spawnErrorCode: 'EACCES' }).class).toBe('LOCAL_CLI_FAILURE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: null }).class).toBe('UNKNOWN_EXTERNAL_PROVIDER_FAILURE');
    expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: 'PROVIDER_FAILURE' }).class).toBe('UNKNOWN_EXTERNAL_PROVIDER_FAILURE');

    const protocolClasses: ReasonerFailureClass[] = [
      'MALFORMED_OUTPUT', 'GARBAGE_OUTPUT', 'OVERSIZE_OUTPUT', 'PARTIAL_OUTPUT', 'TIMEOUT', 'CLI_CRASH',
      'NONZERO_EXIT', 'HUNG_CHILD', 'HUNG_GRANDCHILD', 'SECRET_ECHO', 'UNKNOWN_INTENT', 'UNSAFE_INTENT',
      'UNKNOWN_TOOL', 'UNAUTHORIZED_ENVIRONMENT', 'PROVIDER_FAILURE', 'CANCELLED',
    ];
    for (const reasonerClass of protocolClasses) {
      const evidence = classifyProviderFailure({ phase: 'RUNTIME', reasonerClass });
      expect(PROVIDER_FAILURE_CLASSES).toContain(evidence.class);
      expect(evidence.class).not.toBe('VALID_PROVIDER_RESPONSE');
      expect(evidence.reasonerClass).toBe(reasonerClass);
    }
    for (const invalidClass of ['MALFORMED_OUTPUT', 'GARBAGE_OUTPUT', 'OVERSIZE_OUTPUT', 'PARTIAL_OUTPUT', 'SECRET_ECHO', 'UNKNOWN_INTENT', 'UNSAFE_INTENT', 'UNKNOWN_TOOL', 'UNAUTHORIZED_ENVIRONMENT'] as const) {
      expect(classifyProviderFailure({ phase: 'RUNTIME', reasonerClass: invalidClass }).class).toBe('PROVIDER_INVALID_STRUCTURED_RESPONSE');
    }
  });

  test('auth wins over quota and signals are bounded and enumerated only', () => {
    expect(providerSignalFromText('403 Forbidden: quota exceeded')).toBe('AUTH');
    expect(providerSignalFromText('HTTP 429 Too Many Requests')).toBe('QUOTA_OR_NAMESPACE');
    expect(providerSignalFromText('ordinary transport failure')).toBeNull();
    expect(providerSignalFromText(null)).toBeNull();

    const prefix = 'x'.repeat(PROVIDER_SIGNAL_SCAN_MAX_CHARS);
    expect(providerSignalFromText(`${prefix} HTTP 429`)).toBeNull();
    expect(providerSignalFromText(`HTTP 429 ${prefix}`)).toBe('QUOTA_OR_NAMESPACE');
  });

  test('provider text is never retained in the evidence', () => {
    const planted = 'Bearer supersecret-token-value-0123456789';
    const evidence = classifyProviderFailure({
      phase: 'RUNTIME',
      reasonerClass: 'NONZERO_EXIT',
      providerSignalText: `401 Unauthorized ${planted}`,
    });
    expect(evidence.class).toBe('PROVIDER_AUTH_FAILURE');
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain('supersecret');
    expect(serialized).not.toContain('Bearer');
    expect(Object.keys(evidence).sort()).toEqual([
      'class', 'durationMs', 'exitCode', 'phase', 'providerSignal', 'reasonerClass', 'schemaVersion', 'stderrBytes', 'stdoutBytes',
    ]);
  });

  test('a live auth failure carries the taxonomy and no raw text', async () => {
    const dir = scratchDir();
    try {
      const script = writeFake(dir, 'auth-fail.mjs', `
process.stderr.write('request failed: 401 Unauthorized invalid API key sk-planted-secret-123\\n');
process.exit(1);
`);
      const result = await driverFor(script).complete(makeRequest(), callOptions());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.class).toBe('NONZERO_EXIT');
        expect(result.providerFailure?.class).toBe('PROVIDER_AUTH_FAILURE');
        expect(JSON.stringify(result)).not.toContain('planted-secret');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a probe-phase timeout is classified distinctly from a runtime timeout', async () => {
    const dir = scratchDir();
    try {
      const script = writeFake(dir, 'hang.mjs', 'setInterval(() => {}, 1000);\n');
      const result = await driverFor(script).complete(makeRequest(), callOptions({ timeoutMs: 400, callPhase: 'PROBE' }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.providerFailure?.class).toBe('PROVIDER_PROBE_TIMEOUT');
        expect(result.providerFailure?.phase).toBe('PROBE');
      }
      const runtimeResult = await driverFor(script).complete(makeRequest(), callOptions({ timeoutMs: 400 }));
      expect(runtimeResult.ok).toBe(false);
      if (!runtimeResult.ok) {
        expect(runtimeResult.providerFailure?.class).toBe('PROVIDER_RUNTIME_TIMEOUT');
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
