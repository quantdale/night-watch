// ---------------------------------------------------------------------------
// Lane F: historical replay hunt. Builds the pre-fix reasoner view, runs a
// hunt through the injected Lane A AgentRuntime / ReasonerDriver ports, then
// scores the outcome against hidden truth.
//
// Ground-truth isolation: the reasoner only ever receives pre-fix blobs via
// the visible context and the pre-fix tool executor. A leak-guard wrapper
// records every serialized reasoner request (request side only — reasoner
// outputs are never attributed to the harness) and the hunt asserts clean
// with the frozen assertNoBenchmarkLeakage after run. Any leak throws
// BENCHMARK_GROUND_TRUTH_LEAK:* instead of returning a score.
// ---------------------------------------------------------------------------

import {
  assertNoBenchmarkLeakage,
  detectBenchmarkLeakage,
  type BenchmarkLeakageClass,
  type BenchmarkOutcome,
  type HiddenGroundTruth,
  type ReasonerVisibleContext,
} from '../agentProtocol/benchmark';
import {
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentTerminationReason,
  type ReasonerDriver,
  type ReasonerTurnRequest,
  type UntrustedEnvelope,
} from '../agentProtocol';
import { UNTRUSTED_ENVELOPE_VERSION } from '../agentProtocol/untrusted';
import { AgentRuntime, type AgentToolCall, type AgentToolExecutor, type AgentToolResult } from '../agentRuntime';
import { buildReasonerVisibleContext, type DefinedBenchmarkCase } from './case';
import { scoreBenchmarkCandidate, type BenchmarkScore } from './score';

export const BENCHMARK_HUNT_MAX_TURNS = 12;

export function defaultBenchmarkBudgetPolicy(): AgentBudgetPolicy {
  return {
    ...defaultAgentBudgetPolicy('HOUR_1'),
    wallTimeMs: 300_000,
    reasonerCalls: 24,
    inputBytes: 8_000_000,
    outputBytes: 2_000_000,
    toolActions: 24,
    candidateCap: 8,
    retries: 8,
    consecutiveFailures: 6,
    providerFailures: 8,
  };
}

export interface BenchmarkHuntPorts {
  readonly reasoner: ReasonerDriver;
  readonly tools?: AgentToolExecutor;
  readonly budgetPolicy?: AgentBudgetPolicy;
  readonly maxTurns?: number;
}

export interface BenchmarkHuntResult {
  readonly caseId: string;
  readonly terminationReason: AgentTerminationReason;
  readonly candidateText: string;
  readonly candidateIds: readonly string[];
  readonly admitted: boolean;
  readonly outcome: BenchmarkOutcome;
  readonly score: BenchmarkScore;
  /** Frozen leakage classes observed in reasoner-visible traffic (empty on success). */
  readonly leaked: readonly BenchmarkLeakageClass[];
  /** Serialized reasoner requests (request side only) for audit. */
  readonly requestBlobs: readonly string[];
  readonly visibleContext: ReasonerVisibleContext;
  readonly reasonerCalls: number;
}

function envelope(source: UntrustedEnvelope['source'], digest: string, bytes: string): UntrustedEnvelope {
  return { schemaVersion: UNTRUSTED_ENVELOPE_VERSION, trust: 'UNTRUSTED', source, digest, bytes };
}

/**
 * Default tool executor: serves only the pre-fix view, one blob per call in
 * fixed order (symptom, snapshot, repro, then repro repeats). It never sees
 * hidden ground truth — it is constructed from the visible context alone.
 */
export function createPreFixViewExecutor(visible: ReasonerVisibleContext, caseId: string): AgentToolExecutor {
  const blobs = [...visible.blobs];
  const kinds = ['DOCUMENTATION', 'SOURCE_CODE', 'DOCUMENTATION'] as const;
  let calls = 0;
  return {
    async execute(_call: AgentToolCall): Promise<AgentToolResult> {
      const index = Math.min(calls, blobs.length - 1);
      calls += 1;
      const bytes = blobs[index] ?? '';
      return {
        ok: true,
        resultClass: 'PREFIX_VIEW',
        evidenceRefs: [`bench:${caseId}:prefix-view:${index}`],
        outputBytes: Buffer.byteLength(bytes, 'utf8'),
        untrusted: [envelope(kinds[index] ?? 'DOCUMENTATION', `bench:sha256:${caseId}:${index}`, bytes)],
      };
    },
  };
}

export interface LeakRecordingDriver {
  readonly driver: ReasonerDriver;
  readonly requestBlobs: readonly string[];
}

/** Wrap an injected driver, recording serialized request-side traffic for leak audit. */
export function createLeakRecordingDriver(inner: ReasonerDriver): LeakRecordingDriver {
  const recorded: string[] = [];
  const driver: ReasonerDriver = {
    protocolVersion: inner.protocolVersion,
    transport: inner.transport,
    provenance: inner.provenance,
    async complete(request: ReasonerTurnRequest, options) {
      recorded.push(JSON.stringify({ campaignId: request.campaignId, turnId: request.turnId, observation: request.observation }));
      return inner.complete(request, options);
    },
  };
  return { driver, requestBlobs: recorded };
}

export async function runBenchmarkHunt(
  definedCase: DefinedBenchmarkCase,
  ports: BenchmarkHuntPorts,
): Promise<BenchmarkHuntResult> {
  if (ports.reasoner === null || typeof ports.reasoner !== 'object') throw new Error('runBenchmarkHunt: reasoner driver is required');
  const hidden: HiddenGroundTruth = definedCase.hidden;
  const visible = buildReasonerVisibleContext(definedCase);
  const recording = createLeakRecordingDriver(ports.reasoner);
  const runtime = new AgentRuntime({
    campaignId: `benchmark:${definedCase.caseId}`,
    budgetPolicy: ports.budgetPolicy ?? defaultBenchmarkBudgetPolicy(),
    reasoner: recording.driver,
    tools: ports.tools ?? createPreFixViewExecutor(visible, definedCase.caseId),
    authorizedEnvironments: ['LOCAL'],
    maxTurns: ports.maxTurns ?? BENCHMARK_HUNT_MAX_TURNS,
  });
  const run = await runtime.run({ maxTurns: ports.maxTurns ?? BENCHMARK_HUNT_MAX_TURNS });

  // Fail-closed: any hidden field reaching the reasoner voids the replay.
  const requestBlobs = [...recording.requestBlobs];
  assertNoBenchmarkLeakage({ blobs: requestBlobs }, hidden);
  const leaked = detectBenchmarkLeakage({ blobs: requestBlobs }, hidden);

  const statements = run.state.hypotheses.map((hypothesis) => hypothesis.statement);
  const candidateIds = [...run.state.candidateIds];
  const candidateText = [...statements, ...candidateIds].join('\n');
  const admitted = candidateIds.length > 0;
  const score = scoreBenchmarkCandidate(candidateText, hidden, { proposed: admitted });
  return {
    caseId: definedCase.caseId,
    terminationReason: run.terminationReason,
    candidateText,
    candidateIds: Object.freeze(candidateIds),
    admitted,
    outcome: score.outcome,
    score,
    leaked,
    requestBlobs: Object.freeze(requestBlobs),
    visibleContext: visible,
    reasonerCalls: run.state.budget.usage.reasonerCalls,
  };
}
