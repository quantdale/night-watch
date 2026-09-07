// ---------------------------------------------------------------------------
// W9 readiness lane — owner-local deterministic reproduction readiness.
//
// Hermetic: stub providers cover session semantics (verdict allowlist,
// harness-only proof carriage, host-owned dispositions); hand-built
// AgentRuntimeState values cover derivation (every readiness state,
// exhaustion, hypothesis promotion); temp-directory checkouts cover the
// owner-local wiring (explicit override, fail-closed unavailable default,
// zero-option REAL_LOCAL default). No network, no real toolchain, no model.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_RUNTIME_STATE_VERSION,
  TRANSIENT_ACTION_RETRY_BUDGET,
  defaultAgentBudgetPolicy,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol/runtime';
import type {
  AgentActionRecord,
  AgentHypothesis,
  AgentRuntimeState,
} from '../../src/core/agentProtocol/runtime';
import type { AgentToolId } from '../../src/core/agentProtocol/tools';
import type { AgentToolCall, AgentToolResult } from '../../src/core/agentRuntime/types';
import {
  LOCAL_SESSION_RESULT_CLASSES,
  createLocalInvestigationToolSession,
} from '../../src/core/localInvestigation/session';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
} from '../../src/core/localInvestigation/types';
import type {
  DeterministicReproductionProvider,
  LocalInvestigationContext,
  LocalProviderBlockClass,
  LocalReproductionProviderResult,
  LocalSourceIndexEntry,
} from '../../src/core/localInvestigation/types';
import { OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION } from '../../src/core/localInvestigation/currentSourceProof';
import type { OwnerLocalCurrentSourceProof } from '../../src/core/localInvestigation/currentSourceProof';
import {
  createOwnerLocalInvestigationContext,
  createUnavailableLocalInvestigationContext,
} from '../../src/core/localInvestigation/ownerLocal';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { sourceContentDigest } from '../../src/core/source/scanTypes';
import { deriveInvestigationMemory } from '../../src/core/investigationMemory/derive';

const SOURCE_TEXT = `export function total(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
`;
const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_PATH = 'testorg/testrepo:src/total.ts';
const TARGET = 'testorg/testrepo:src/total.ts';

const PROOF_FINGERPRINT = `fp:sha256:${'c'.repeat(24)}`;
const AUDIT_MARKER = 'AUDIT_MARKER_W9_READINESS_SECRET';
const RAW_STDERR_MARKER = 'RAW_STDERR_W9_READINESS_SECRET';

function sourceEntry(): LocalSourceIndexEntry {
  return {
    path: SOURCE_PATH,
    repository: 'testorg/testrepo',
    relativePath: 'src/total.ts',
    sourceSha: SOURCE_SHA,
    language: 'TYPESCRIPT',
    byteCount: Buffer.byteLength(SOURCE_TEXT, 'utf8'),
    contentDigest: sourceContentDigest(SOURCE_TEXT),
  };
}

function call(toolId: AgentToolId, args: Record<string, unknown> = {}): AgentToolCall {
  return { campaignId: 'test-campaign', turnId: 'turn-1', toolId, arguments: args, argumentDigest: 'test-digest' };
}

/** Host-owned disposition as the runtime lane normalizes it (absent on successes). */
function dispositionOf(result: AgentToolResult): unknown {
  return (result as unknown as Record<string, unknown>).disposition;
}

function proofFixture(): OwnerLocalCurrentSourceProof {
  return {
    schemaVersion: OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
    proofKind: 'CURRENT_SOURCE_REPEATED_TEST_FAILURE',
    mintedBy: 'stub-reproduction',
    repository: 'testorg/testrepo',
    packageRelativePath: 'src',
    repositoryHeadSha: 'b'.repeat(40),
    sourcePath: SOURCE_PATH,
    sourceContentDigest: `cd:sha256:${'a'.repeat(24)}`,
    targetDigest: `tgt:sha256:${'a'.repeat(24)}`,
    failureFingerprint: PROOF_FINGERPRINT,
    executionCount: 2,
    failureClass: 'TEST_ASSERTION_FAILURE',
    discriminatorOrigin: 'PRE_EXISTING_REPOSITORY_TEST',
    siblingIdentityStable: true,
    networkDisabled: true,
  };
}

function stubVerdictReproduction(
  overrides: Partial<LocalReproductionProviderResult> = {},
): DeterministicReproductionProvider & { readonly calls: readonly unknown[] } {
  const calls: unknown[] = [];
  return {
    providerId: 'stub-reproduction',
    calls,
    async run(request) {
      calls.push(request);
      return {
        status: 'AVAILABLE',
        value: {
          verdict: 'REPRODUCED',
          reasonerVisible: { template: 'REPRODUCTION_OBSERVED', reproductionId: request.reproductionId },
          evidenceRef: 'ev:stub-repro-1',
          provenanceRefs: [request.sourceEvidenceRef],
          preFix: 'FAIL',
          postFix: 'PASS',
          audit: { marker: AUDIT_MARKER, stderr: RAW_STDERR_MARKER },
          ...overrides,
        },
      };
    },
  };
}

function stubBlockedReproduction(cls: LocalProviderBlockClass): DeterministicReproductionProvider {
  return {
    providerId: 'stub-blocked-reproduction',
    async run() {
      return { status: 'BLOCKED', class: cls, reason: `stub: ${cls}` };
    },
  };
}

function stubThrowingReproduction(): DeterministicReproductionProvider {
  return {
    providerId: 'stub-throwing-reproduction',
    async run(): Promise<never> {
      throw new Error('stub: filesystem race between index and read');
    },
  };
}

function stubContext(reproduction: DeterministicReproductionProvider): LocalInvestigationContext {
  const entry = sourceEntry();
  return {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass: 'REAL_LOCAL',
    source: {
      providerId: 'stub-source',
      async index() {
        return { status: 'AVAILABLE', value: { entries: [entry], total: 1, truncated: false } };
      },
      async read(requestedPath: string) {
        if (requestedPath !== SOURCE_PATH) {
          return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub: out of scope' };
        }
        return { status: 'AVAILABLE', value: { ...entry, text: SOURCE_TEXT } };
      },
    },
    systemMap: {
      providerId: 'stub-system-map',
      async load() {
        return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: not configured' };
      },
    },
    bugAtlas: {
      providerId: 'stub-bug-atlas',
      async load() {
        return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: not configured' };
      },
    },
    systemAtlas: {
      providerId: 'stub-system-atlas',
      async load() {
        return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: not configured' };
      },
    },
    evidence: {
      providerId: 'stub-evidence',
      async get() {
        return { status: 'BLOCKED', class: 'NOT_CONFIGURED', reason: 'stub: not configured' };
      },
    },
    reproduction,
  };
}

/** Inspect the stub source, returning the observed source evidence ref. */
async function groundedRef(
  session: ReturnType<typeof createLocalInvestigationToolSession>,
): Promise<string> {
  const inspected = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', { path: SOURCE_PATH }));
  expect(inspected.ok).toBe(true);
  const ref = session.snapshot().inspectedSources[0]?.evidenceRef ?? '';
  expect(ref.length).toBeGreaterThan(0);
  return ref;
}

function reproCall(sourceEvidenceRef: string, reproductionId = 'r1'): AgentToolCall {
  return call('RERUN_SAFE_REPRODUCTION', {
    reproductionId,
    candidateId: 'c1',
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef,
    observedEvidenceRefs: [sourceEvidenceRef],
  });
}

test.describe('W9 session result classes', () => {
  test('the allowlist contains the frozen W9 verdicts alongside the W7 set', () => {
    for (const verdict of ['REPRODUCED', 'NOT_REPRODUCED', 'ENVIRONMENT_BLOCKED', 'NOT_AVAILABLE']) {
      expect(LOCAL_SESSION_RESULT_CLASSES).toContain(verdict);
    }
    expect(LOCAL_SESSION_RESULT_CLASSES).toContain('REPRODUCED_CURRENT_FAILURE');
    expect(LOCAL_SESSION_RESULT_CLASSES).toContain('INCONCLUSIVE');
  });

  test('a current-source failure executes and mirrors its verdict as the result class', async () => {
    const reproduction = stubVerdictReproduction({
      verdict: 'REPRODUCED_CURRENT_FAILURE',
      evidenceRef: 'ev:stub-current-1',
      preFix: 'FAIL',
      postFix: 'NOT_RUN',
      currentSourceProof: proofFixture(),
    });
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const result = await session.executor.execute(reproCall(await groundedRef(session)));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('REPRODUCED_CURRENT_FAILURE');
    expect(result.evidenceRefs).toEqual(['ev:stub-current-1']);
    expect(dispositionOf(result)).toBeUndefined();
  });

  test('an inconclusive execution succeeds with no evidence', async () => {
    const reproduction = stubVerdictReproduction({ verdict: 'INCONCLUSIVE', evidenceRef: null });
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const result = await session.executor.execute(reproCall(await groundedRef(session)));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('INCONCLUSIVE');
    expect(result.evidenceRefs).toEqual([]);
  });
});

test.describe('W9 current-source receipt propagation', () => {
  test('the proof is carried verbatim into the harness-only receipt', async () => {
    const proof = proofFixture();
    const reproduction = stubVerdictReproduction({
      verdict: 'REPRODUCED_CURRENT_FAILURE',
      evidenceRef: 'ev:stub-current-1',
      preFix: 'FAIL',
      postFix: 'NOT_RUN',
      currentSourceProof: proof,
    });
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const sourceRef = await groundedRef(session);
    await session.executor.execute(reproCall(sourceRef));
    const receipts = session.snapshot().reproductions;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      providerId: 'stub-reproduction',
      reproductionId: 'r1',
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: sourceRef,
      evidenceRef: 'ev:stub-current-1',
      verdict: 'REPRODUCED_CURRENT_FAILURE',
    });
    expect(receipts[0]?.currentSourceProof).toEqual(proof);
  });

  test('proof, audit and raw stderr never reach reasoner envelopes or results', async () => {
    const reproduction = stubVerdictReproduction({
      verdict: 'REPRODUCED_CURRENT_FAILURE',
      evidenceRef: 'ev:stub-current-1',
      preFix: 'FAIL',
      postFix: 'NOT_RUN',
      reasonerVisible: { template: 'CURRENT_SOURCE_FAILURE_OBSERVED', reproductionId: 'r1' },
      currentSourceProof: proofFixture(),
    });
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const result = await session.executor.execute(reproCall(await groundedRef(session)));
    expect(result.ok).toBe(true);
    const leaked = [PROOF_FINGERPRINT, AUDIT_MARKER, RAW_STDERR_MARKER];
    for (const marker of leaked) {
      expect(JSON.stringify(result.untrusted)).not.toContain(marker);
      expect(JSON.stringify(result)).not.toContain(marker);
    }
    expect(JSON.stringify(session.snapshot())).not.toContain(AUDIT_MARKER);
    expect(JSON.stringify(session.snapshot())).not.toContain(RAW_STDERR_MARKER);
    // The harness-only receipt keeps the proof (admission reads it there).
    expect(session.snapshot().reproductions[0]?.currentSourceProof?.failureFingerprint).toBe(PROOF_FINGERPRINT);
  });

  test('historical receipts keep the W7 shape with no proof key', async () => {
    const reproduction = stubVerdictReproduction();
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const result = await session.executor.execute(reproCall(await groundedRef(session)));
    expect(result.ok).toBe(true);
    expect(result.resultClass).toBe('REPRODUCED');
    const receipts = session.snapshot().reproductions;
    expect(receipts).toHaveLength(1);
    expect('currentSourceProof' in (receipts[0] as unknown as Record<string, unknown>)).toBe(false);
  });
});

test.describe('W9 session failure dispositions', () => {
  const blockCases: ReadonlyArray<{ readonly block: LocalProviderBlockClass; readonly disposition: string }> = [
    { block: 'NOT_CONFIGURED', disposition: 'ENVIRONMENT_BLOCKED' },
    { block: 'SOURCE_UNAVAILABLE', disposition: 'ENVIRONMENT_BLOCKED' },
    { block: 'SOURCE_STALE', disposition: 'TRANSIENT_RETRYABLE' },
    { block: 'DATA_BLOCKED', disposition: 'TRANSIENT_RETRYABLE' },
    { block: 'UNSAFE_INPUT', disposition: 'DETERMINISTIC_TERMINAL' },
  ];

  for (const { block, disposition } of blockCases) {
    test(`provider block ${block} maps to ${disposition}`, async () => {
      const session = createLocalInvestigationToolSession(stubContext(stubBlockedReproduction(block)));
      const result = await session.executor.execute(reproCall(await groundedRef(session)));
      expect(result.ok).toBe(false);
      expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
      expect(dispositionOf(result)).toBe(disposition);
    });
  }

  test('a thrown provider is transient (DATA_BLOCKED), never a verdict', async () => {
    const session = createLocalInvestigationToolSession(stubContext(stubThrowingReproduction()));
    const result = await session.executor.execute(reproCall(await groundedRef(session)));
    expect(result.ok).toBe(false);
    expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(dispositionOf(result)).toBe('TRANSIENT_RETRYABLE');
  });

  test('malformed, unknown, unsafe and unauthorized failures are deterministic', async () => {
    const reproduction = stubVerdictReproduction();
    const session = createLocalInvestigationToolSession(stubContext(reproduction));
    const malformed = await session.executor.execute(
      call('RERUN_SAFE_REPRODUCTION', { reproductionId: 'r1' }),
    );
    expect(malformed.ok).toBe(false);
    expect(malformed.resultClass).toBe('MALFORMED_ARGUMENTS');
    expect(dispositionOf(malformed)).toBe('DETERMINISTIC_TERMINAL');

    const unknown = await session.executor.execute(
      call('DEFINITELY_NOT_A_TOOL' as unknown as AgentToolId, {}),
    );
    expect(unknown.ok).toBe(false);
    expect(unknown.resultClass).toBe('UNKNOWN_TOOL');
    expect(dispositionOf(unknown)).toBe('DETERMINISTIC_TERMINAL');

    const premature = await session.executor.execute(reproCall('ev:forged-without-inspection'));
    expect(premature.ok).toBe(false);
    expect(premature.resultClass).toBe('UNSAFE_INTENT');
    expect(dispositionOf(premature)).toBe('DETERMINISTIC_TERMINAL');
    expect(reproduction.calls).toHaveLength(0);
  });

  test('invalid provider refs fail closed as deterministic', async () => {
    const badRef = stubVerdictReproduction({ evidenceRef: 'not a valid ref!!!' });
    const first = createLocalInvestigationToolSession(stubContext(badRef));
    const firstResult = await first.executor.execute(reproCall(await groundedRef(first)));
    expect(firstResult.ok).toBe(false);
    expect(firstResult.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(dispositionOf(firstResult)).toBe('DETERMINISTIC_TERMINAL');

    const badProvenance = stubVerdictReproduction({ provenanceRefs: ['ev:ok', 'bad ref'] });
    const second = createLocalInvestigationToolSession(stubContext(badProvenance));
    const secondResult = await second.executor.execute(reproCall(await groundedRef(second)));
    expect(secondResult.ok).toBe(false);
    expect(secondResult.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(dispositionOf(secondResult)).toBe('DETERMINISTIC_TERMINAL');
  });

  test('a blocked source index preserves its block class as the disposition', async () => {
    const entry = sourceEntry();
    const context: LocalInvestigationContext = {
      ...stubContext(stubVerdictReproduction()),
      source: {
        providerId: 'stub-stale-source',
        async index() {
          return { status: 'BLOCKED', class: 'SOURCE_STALE', reason: 'stub: HEAD moved' };
        },
        async read(requestedPath: string) {
          if (requestedPath !== SOURCE_PATH) {
            return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: 'stub' };
          }
          return { status: 'AVAILABLE', value: { ...entry, text: SOURCE_TEXT } };
        },
      },
    };
    const session = createLocalInvestigationToolSession(context);
    const result = await session.executor.execute(call('INSPECT_SOURCE_SURFACE', {}));
    expect(result.ok).toBe(false);
    expect(result.resultClass).toBe('ADAPTER_UNAVAILABLE');
    expect(dispositionOf(result)).toBe('TRANSIENT_RETRYABLE');
  });
});

// ---------------------------------------------------------------------------
// Derivation: hand-built AgentRuntimeState values, no providers.
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    campaignId: 'campaign-w9-readiness-test',
    status: 'RUNNING',
    phase: 'OBSERVE',
    hypotheses: [],
    actionLog: [],
    evidenceRefs: [],
    candidateIds: [],
    knownTargets: [],
    budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
    terminationReason: null,
    ...overrides,
  };
}

function makeAction(overrides: Partial<AgentActionRecord> = {}): AgentActionRecord {
  return {
    turnId: 't1',
    phase: 'OBSERVE',
    intentKind: 'CALL_TOOL',
    toolId: 'INSPECT_SOURCE_SURFACE',
    argumentDigest: null,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: [],
    ...overrides,
  };
}

function makeHypothesis(overrides: Partial<AgentHypothesis> = {}): AgentHypothesis {
  return {
    hypothesisId: 'h-1',
    statement: 'checkout total drifts under concurrent coupon apply',
    evidenceRefs: [],
    status: 'OPEN',
    ...overrides,
  };
}

function inspectAction(turnId: string, target: string, evidenceRef: string | null): AgentActionRecord {
  return makeAction({
    turnId,
    toolId: 'INSPECT_SOURCE_SURFACE',
    resultClass: evidenceRef === null ? 'SOURCE_READ_REFUSED' : 'SOURCE_FILE',
    evidenceRefs: evidenceRef === null ? [] : [evidenceRef],
    target,
  });
}

function reproAction(
  turnId: string,
  target: string,
  resultClass: string,
  options: { readonly disposition?: AgentActionRecord['disposition']; readonly evidenceRefs?: readonly string[] } = {},
): AgentActionRecord {
  return makeAction({
    turnId,
    toolId: 'RERUN_SAFE_REPRODUCTION',
    resultClass,
    evidenceRefs: options.evidenceRefs === undefined ? [] : [...options.evidenceRefs],
    target,
    ...(options.disposition === undefined ? {} : { disposition: options.disposition }),
  });
}

/** Grounded investigation: one inspected target, one grounded hypothesis, no attempts yet. */
function groundedState(extra: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return makeState({
    knownTargets: [TARGET],
    evidenceRefs: ['ev:src-1'],
    actionLog: [inspectAction('t1', TARGET, 'ev:src-1')],
    hypotheses: [makeHypothesis({ hypothesisId: 'h1', evidenceRefs: ['ev:src-1'] })],
    ...extra,
  });
}

function readinessOf(state: AgentRuntimeState): string {
  return deriveInvestigationMemory(state).progress.reproductionReadiness;
}

test.describe('W9 derivation readiness', () => {
  test('the frozen W8 ladder stands without execution signals', () => {
    expect(readinessOf(makeState())).toBe('NOT_READY_NO_INSPECTED_SOURCE');
    expect(
      readinessOf(makeState({ actionLog: [inspectAction('t1', TARGET, null)] })),
    ).toBe('NOT_READY_NO_SOURCE_EVIDENCE');
    expect(
      readinessOf(
        makeState({
          evidenceRefs: ['ev:src-1'],
          actionLog: [inspectAction('t1', TARGET, 'ev:src-1')],
        }),
      ),
    ).toBe('NOT_READY_NO_GROUNDED_HYPOTHESIS');
    expect(readinessOf(groundedState())).toBe('READY');
  });

  test('a historical REPRODUCED verdict alone keeps READY (W7/W8 compatible)', () => {
    const state = groundedState({
      evidenceRefs: ['ev:src-1', 'ev:repro-1'],
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', TARGET, 'REPRODUCED', { evidenceRefs: ['ev:repro-1'] }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.progress.reproductionReadiness).toBe('READY');
    expect(memory.hypotheses[0]?.progress).toBe('REPRODUCED');
    expect(memory.progress.mechanicalReproductions).toBe(1);
  });

  test('NOT_AVAILABLE means no executable target', () => {
    const state = groundedState({ actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), reproAction('t2', TARGET, 'NOT_AVAILABLE')] });
    expect(readinessOf(state)).toBe('NOT_READY_NO_EXECUTABLE_TARGET');
  });

  test('ENVIRONMENT_BLOCKED means the target is blocked', () => {
    const state = groundedState({
      actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), reproAction('t2', TARGET, 'ENVIRONMENT_BLOCKED')],
    });
    expect(readinessOf(state)).toBe('NOT_READY_TARGET_BLOCKED');
  });

  test('a deterministic failed reproduction refuses', () => {
    const refused = groundedState({
      actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), reproAction('t2', TARGET, 'UNSAFE_INTENT')],
    });
    expect(readinessOf(refused)).toBe('REFUSED_DETERMINISTIC');
    const explicit = groundedState({
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', TARGET, 'ADAPTER_UNAVAILABLE', { disposition: 'DETERMINISTIC_TERMINAL' }),
      ],
    });
    expect(readinessOf(explicit)).toBe('REFUSED_DETERMINISTIC');
  });

  test('a transient failure leaves retry remaining only under the frozen budget', () => {
    const once = groundedState({
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', TARGET, 'ADAPTER_UNAVAILABLE', { disposition: 'TRANSIENT_RETRYABLE' }),
      ],
    });
    expect(readinessOf(once)).toBe('TRANSIENT_RETRY_REMAINING');
    const exhaustedTurns = Array.from({ length: TRANSIENT_ACTION_RETRY_BUDGET }, (_, index) =>
      reproAction(`t${String(index + 2)}`, TARGET, 'ADAPTER_UNAVAILABLE', { disposition: 'TRANSIENT_RETRYABLE' }),
    );
    const consumed = groundedState({ actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), ...exhaustedTurns] });
    expect(readinessOf(consumed)).toBe('REFUSED_DETERMINISTIC');
  });

  test('a repeatable current-source failure reproduces and promotes the hypothesis', () => {
    const state = groundedState({
      evidenceRefs: ['ev:src-1', 'ev:repro-current-1'],
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', TARGET, 'REPRODUCED_CURRENT_FAILURE', { evidenceRefs: ['ev:repro-current-1'] }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.progress.reproductionReadiness).toBe('CURRENT_FAILURE_REPRODUCED');
    expect(memory.hypotheses[0]?.progress).toBe('REPRODUCED');
    expect(memory.progress.mechanicalReproductions).toBe(1);
    // The proof itself never enters reasoner-visible memory.
    expect(JSON.stringify(memory)).not.toContain(PROOF_FINGERPRINT);
  });

  test('clean executions ran without reproducing', () => {
    const notReproduced = groundedState({
      actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), reproAction('t2', TARGET, 'NOT_REPRODUCED')],
    });
    expect(readinessOf(notReproduced)).toBe('RAN_WITHOUT_REPRODUCING');
    const inconclusive = groundedState({
      actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), reproAction('t2', TARGET, 'INCONCLUSIVE')],
    });
    expect(readinessOf(inconclusive)).toBe('RAN_WITHOUT_REPRODUCING');
  });

  test('a current failure outranks a clean run on another target', () => {
    const state = groundedState({
      knownTargets: [TARGET, 'other:src/flaky.ts'],
      evidenceRefs: ['ev:src-1', 'ev:repro-current-1'],
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', 'other:src/flaky.ts', 'NOT_REPRODUCED'),
        reproAction('t3', TARGET, 'REPRODUCED_CURRENT_FAILURE', { evidenceRefs: ['ev:repro-current-1'] }),
      ],
    });
    expect(readinessOf(state)).toBe('CURRENT_FAILURE_REPRODUCED');
  });

  test('a DISPROVED hypothesis stays disproved beside a current failure', () => {
    const state = groundedState({
      evidenceRefs: ['ev:src-1', 'ev:repro-current-1'],
      hypotheses: [makeHypothesis({ hypothesisId: 'h-dead', evidenceRefs: ['ev:src-1'], status: 'DISPROVED' })],
      actionLog: [
        inspectAction('t1', TARGET, 'ev:src-1'),
        reproAction('t2', TARGET, 'REPRODUCED_CURRENT_FAILURE', { evidenceRefs: ['ev:repro-current-1'] }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.hypotheses[0]?.progress).toBe('DISPROVED');
    expect(memory.progress.reproductionReadiness).toBe('CURRENT_FAILURE_REPRODUCED');
  });

  test('prose alone never promotes: an unsupported hypothesis stays verification-ready', () => {
    const state = groundedState({
      hypotheses: [
        makeHypothesis({ hypothesisId: 'h-cited', evidenceRefs: ['ev:src-1'], status: 'SUPPORTED' }),
        makeHypothesis({ hypothesisId: 'h-ghost', evidenceRefs: ['ev:unobserved'], status: 'SUPPORTED' }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    const progressOf = (id: string): string =>
      memory.hypotheses.find((item) => item.hypothesisId === id)?.progress ?? 'MISSING';
    expect(progressOf('h-cited')).toBe('VERIFICATION_READY');
    expect(progressOf('h-ghost')).toBe('UNGROUNDED');
  });
});

test.describe('W9 exhausted targets', () => {
  function exhaustedFor(actions: readonly AgentActionRecord[]): readonly string[] {
    return deriveInvestigationMemory(
      groundedState({ actionLog: [inspectAction('t1', TARGET, 'ev:src-1'), ...actions] }),
    ).exhaustedTargets;
  }

  test('a single transient failure is not exhausted; a consumed budget is', () => {
    const transient = (turnId: string): AgentActionRecord =>
      reproAction(turnId, TARGET, 'ADAPTER_UNAVAILABLE', { disposition: 'TRANSIENT_RETRYABLE' });
    expect(exhaustedFor([transient('t2')])).not.toContain(TARGET);
    const budget = Array.from({ length: TRANSIENT_ACTION_RETRY_BUDGET }, (_, index) => transient(`t${String(index + 2)}`));
    expect(exhaustedFor(budget)).toContain(TARGET);
  });

  test('deterministic and environment failures exhaust; reproductions do not', () => {
    expect(
      exhaustedFor([reproAction('t2', TARGET, 'UNSAFE_INTENT', { disposition: 'DETERMINISTIC_TERMINAL' })]),
    ).toContain(TARGET);
    expect(exhaustedFor([reproAction('t2', TARGET, 'ENVIRONMENT_BLOCKED')])).toContain(TARGET);
    expect(exhaustedFor([reproAction('t2', TARGET, 'NOT_AVAILABLE')])).toContain(TARGET);
    expect(exhaustedFor([reproAction('t2', TARGET, 'NOT_REPRODUCED')])).toContain(TARGET);
    expect(
      exhaustedFor([reproAction('t2', TARGET, 'REPRODUCED_CURRENT_FAILURE', { evidenceRefs: ['ev:r'] })]),
    ).not.toContain(TARGET);
    expect(exhaustedFor([reproAction('t2', TARGET, 'REPRODUCED', { evidenceRefs: ['ev:r'] })])).not.toContain(TARGET);
  });
});

// ---------------------------------------------------------------------------
// Owner-local wiring: explicit override, fail-closed unavailable, REAL_LOCAL
// zero-option default (integration with the provider lane factory).
// ---------------------------------------------------------------------------

const tempRoots: string[] = [];
test.afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (typeof root === 'string') fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w9-readiness-'));
  tempRoots.push(root);
  return root;
}

function initFakeRepo(root: string, repoId: string, files: Readonly<Record<string, string>>): void {
  const repoRoot = path.join(root, ...repoId.split('/'));
  fs.mkdirSync(path.join(repoRoot, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repoRoot, '.git', 'refs', 'heads', 'main'), `${'b'.repeat(40)}\n`);
  for (const [relative, text] of Object.entries(files)) {
    const file = path.join(repoRoot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}

function fakeScanConfig() {
  return createRealSourceScanConfig({
    approvedRepositories: [
      {
        repoId: 'testorg/testrepo',
        expectedSourceSha: null,
        allowlistedRoots: ['src'],
        allowedExtensions: ['.ts'],
        maxFiles: 100,
        maxFileBytes: 200000,
        maxTotalBytes: 2000000,
      },
    ],
    runtimeMappingNamespace: 'test.local',
  });
}

test.describe('W9 owner-local wiring', () => {
  test('an explicit reproduction still overrides for tests and historical composition', () => {
    const root = makeTempRoot();
    initFakeRepo(root, 'testorg/testrepo', { 'src/a.ts': SOURCE_TEXT });
    const reproduction = stubVerdictReproduction();
    const context = createOwnerLocalInvestigationContext({
      siblingRoot: root,
      scanConfig: fakeScanConfig(),
      reproduction,
    });
    expect(context.dataClass).toBe('REAL_LOCAL');
    expect(context.reproduction.providerId).toBe('stub-reproduction');
  });

  test('the unavailable context stays fail-closed NOT_CONFIGURED', async () => {
    const context = createUnavailableLocalInvestigationContext();
    const result = await context.reproduction.run({
      reproductionId: 'r',
      candidateId: null,
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: 'ev:x',
      observedEvidenceRefs: [],
    });
    expect(result.status).toBe('BLOCKED');
    if (result.status === 'BLOCKED') expect(result.class).toBe('NOT_CONFIGURED');
  });

  test('the zero-option REAL_LOCAL default wires the host-owned provider, fail-closed', async () => {
    const root = makeTempRoot();
    initFakeRepo(root, 'testorg/testrepo', { 'src/a.ts': SOURCE_TEXT });
    const context = createOwnerLocalInvestigationContext({ siblingRoot: root, scanConfig: fakeScanConfig() });
    expect(context.dataClass).toBe('REAL_LOCAL');
    expect(context.reproduction.providerId).not.toBe('unavailable-local-reproduction');
    const refused = await context.reproduction.run({
      reproductionId: 'r',
      candidateId: null,
      sourcePath: 'testorg/testrepo:src/nowhere.ts',
      sourceEvidenceRef: 'ev:x',
      observedEvidenceRefs: [],
    });
    expect(refused.status).toBe('BLOCKED');
  });
});
