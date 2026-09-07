// ---------------------------------------------------------------------------
// W7 replay lane: historical replay hunt through the shared local-
// investigation provider contract. Builds the leak-isolated pre-fix
// reasoner view, serves it through historical source/reproduction
// adapters behind createLocalInvestigationToolSession, runs the hunt
// through the injected AgentRuntime / ReasonerDriver ports, then scores
// against hidden truth.
//
// Ground-truth isolation: the reasoner only ever receives pre-fix blobs
// via the visible context and the shared session executor. Hidden replay
// coordinates, fix diffs, test paths, assertion text, and harness-side
// stderr never enter reasoner requests or envelopes. A leak-guard wrapper
// records every serialized reasoner request (request side only) and the
// hunt asserts clean with the frozen assertNoBenchmarkLeakage after run.
// Any leak throws BENCHMARK_GROUND_TRUTH_LEAK:* instead of returning
// a score. File grounding is required before provider execution:
// RERUN_SAFE_REPRODUCTION runs only for an already-inspected sourcePath
// plus its observed source evidence ref.
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
  type AgentRuntimeState,
  type AgentTerminationReason,
  type ReasonerDriver,
  type ReasonerTurnRequest,
} from '../agentProtocol';
import { AgentRuntime, type AgentToolCall, type AgentToolExecutor, type AgentToolResult } from '../agentRuntime';
import { UNTRUSTED_ENVELOPE_VERSION } from '../agentProtocol/untrusted';
import type { AutonomousFindingDossier } from '../autonomousFinding';
import { createLocalInvestigationToolSession } from '../localInvestigation/session';
import {
  createHistoricalLocalInvestigationContext,
  createHistoricalReproductionProvider,
  historicalVisiblePaths,
} from '../localInvestigation/historical';
import type { LocalInvestigationHistory } from '../localInvestigation/types';
import { buildReasonerVisibleContext, type DefinedBenchmarkCase } from './case';
import {
  type ContainedTestReplayRequest,
  type ContainedTestReplayResult,
  type ContainedTestReplayVerdict,
  type MinedTestReplayDescriptor,
} from './containedTestReplay';
import { parsePreFixSnapshotFiles } from './preFixSource';
import { tryBuildMinedReplayDossier, tryBuildVisibleHuntDossier } from './huntDossier';
import { scoreBenchmarkCandidate, type BenchmarkScore } from './score';
import {
  runVisibleDiscriminator,
  type VisibleDiscriminator,
  type VisibleReproObservation,
} from './visibleRepro';

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
  /**
   * Contained-replay seam for mined cases (tests/harness). When the hunt
   * builds its default executor, these override replay execution and repo
   * resolution. The file-grounding gate and neutral observations stay on.
   */
  readonly minedReplay?: {
    readonly runReplay?: (request: ContainedTestReplayRequest) => Promise<ContainedTestReplayResult>;
    readonly repositoriesRoot?: string;
  };
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
  readonly reproductionCount: number;
  readonly discriminatorObservation: VisibleReproObservation | null;
  /**
   * Harness-side contained-replay audit for mined cases (null when no
   * replay was requested). The stderr head inside is audit material only
   * and must never enter reasoner context.
   */
  readonly minedReplayAudit: MinedReplayAudit | null;
  readonly dossier: AutonomousFindingDossier | null;
  /**
   * Harness-side final runtime state. Instrumentation only (W8 efficacy
   * metrics); it carries the same ids/refs the reasoner already observed and
   * never hidden ground truth.
   */
  readonly runtimeState: AgentRuntimeState;
  /**
   * Harness-side tool-session history when the hunt ran through the shared
   * session executor (null when `ports.tools` overrode it).
   */
  readonly investigationHistory: LocalInvestigationHistory | null;
}

/**
 * Harness-side record of one mined-case contained replay request. The
 * stderr head is audit material only; the reasoner sees solely the
 * fixed-template neutral observation built from the mapped result class.
 */
export interface MinedReplayAudit {
  readonly grounded: boolean;
  readonly repoResolved: boolean;
  readonly verdict: ContainedTestReplayVerdict | null;
  readonly reason: string | null;
  readonly durationMs: number | null;
  readonly timedOut: boolean | null;
  readonly stderrHead: string | null;
}

export interface MinedReplayExecutorOptions {
  /** Hidden mined-case replay coordinates (null for synthetic fixtures). */
  readonly minedReplay?: MinedTestReplayDescriptor | null;
  readonly repositoriesRoot?: string;
  /**
   * Anti-inflation gate: true only when the candidate/hypothesis text
   * already names a real pre-fix snapshot file. Absent means unmanaged
   * (the hunt always supplies it); false refuses the replay.
   */
  readonly hasGrounding?: () => boolean;
  /** Injectable replay (tests). Defaults to the real contained engine. */
  readonly runReplay?: (request: ContainedTestReplayRequest) => Promise<ContainedTestReplayResult>;
  /** Harness-side audit box. Never reasoner-visible. */
  readonly audit?: { current: MinedReplayAudit | null };
}

/**
 * Compatibility wrapper over the shared historical providers and tool
 * session. New code should build a historical context and a tool session
 * directly; this shim exists so existing direct-executor callers keep
 * working while the hunt itself runs through the shared session path.
 * INSPECT_SOURCE_SURFACE delegates to the session executor (bounded
 * index / single approved file). RERUN_SAFE_REPRODUCTION executes
 * through the shared historical reproduction provider with the same
 * grounding gate, neutral observations, and harness-side audit.
 */
export function createPreFixViewExecutor(
  visible: ReasonerVisibleContext,
  caseId: string,
  discriminator: VisibleDiscriminator | null = null,
  options: MinedReplayExecutorOptions = {},
): AgentToolExecutor {
  const visibleFiles = historicalVisiblePaths(visible);
  const session = createLocalInvestigationToolSession(
    createHistoricalLocalInvestigationContext({
      visible,
      caseId,
      discriminator,
      minedReplay: options.minedReplay ?? null,
      repositoriesRoot: options.repositoriesRoot,
      runReplay: options.runReplay,
      hasGrounding: options.hasGrounding,
      auditBox: options.audit,
    }),
  );
  const reproduction = createHistoricalReproductionProvider({
    caseId,
    visibleFiles,
    discriminator,
    minedReplay: options.minedReplay ?? null,
    repositoriesRoot: options.repositoriesRoot,
    runReplay: options.runReplay,
    hasGrounding: options.hasGrounding,
    auditBox: options.audit,
  });
  return {
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      if (call.toolId === 'INSPECT_SOURCE_SURFACE') {
        return session.executor.execute(call);
      }
      if (call.toolId === 'RERUN_SAFE_REPRODUCTION') {
        if (discriminator === null && (options.minedReplay ?? null) !== null && options.hasGrounding) {
          let grounded = true;
          try {
            grounded = options.hasGrounding();
          } catch {
            grounded = false;
          }
          if (!grounded) {
            if (options.audit) {
              options.audit.current = {
                grounded: false,
                repoResolved: false,
                verdict: null,
                reason: 'GATE_REFUSED_NO_FILE_GROUNDING',
                durationMs: null,
                timedOut: null,
                stderrHead: null,
              };
            }
            return { ok: true, resultClass: 'NOT_AVAILABLE', evidenceRefs: [], outputBytes: 0, untrusted: [] };
          }
        }
        const args = call.arguments as Record<string, unknown>;
        const fallbackPath = visibleFiles[0] ?? null;
        const sourcePath =
          typeof args['sourcePath'] === 'string' && (args['sourcePath'] as string).length > 0
            ? (args['sourcePath'] as string)
            : (fallbackPath ?? '');
        const sourceEvidenceRef =
          typeof args['sourceEvidenceRef'] === 'string' && (args['sourceEvidenceRef'] as string).length > 0
            ? (args['sourceEvidenceRef'] as string)
            : `bench:${caseId}:file:${sourcePath}`;
        const outcome = await reproduction.run({
          reproductionId: typeof args['reproductionId'] === 'string' ? (args['reproductionId'] as string) : `bench:${caseId}:repro:1`,
          candidateId: typeof args['candidateId'] === 'string' ? (args['candidateId'] as string) : null,
          sourcePath,
          sourceEvidenceRef,
          observedEvidenceRefs: Array.isArray(args['observedEvidenceRefs'])
            ? (args['observedEvidenceRefs'] as unknown[]).filter(
                (item): item is string => typeof item === 'string',
              )
            : [],
        });
        if (outcome.status === 'BLOCKED') {
          return { ok: false, resultClass: 'ADAPTER_UNAVAILABLE', evidenceRefs: [], outputBytes: 0, untrusted: [] };
        }
        const value = outcome.value;
        if (value.verdict === 'NOT_AVAILABLE') {
          return { ok: true, resultClass: 'NOT_AVAILABLE', evidenceRefs: [], outputBytes: 0, untrusted: [] };
        }
        if (value.verdict === 'ENVIRONMENT_BLOCKED') {
          return { ok: true, resultClass: 'ENVIRONMENT_BLOCKED', evidenceRefs: [], outputBytes: 0, untrusted: [] };
        }
        const bytes = JSON.stringify(value.reasonerVisible);
        return {
          ok: true,
          resultClass: value.verdict,
          evidenceRefs: value.evidenceRef ? [value.evidenceRef] : [],
          outputBytes: Buffer.byteLength(bytes, 'utf8'),
          untrusted: [
            {
              schemaVersion: UNTRUSTED_ENVELOPE_VERSION,
              trust: 'UNTRUSTED',
              source: 'LOG',
              digest: `bench:sha256:${caseId}:repro`,
              bytes,
            },
          ],
        };
      }
      return session.executor.execute(call);
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
  // Historical product-path context: leak-isolated pre-fix visible
  // source plus the hidden mined replay coordinates closed over by the
  // shared reproduction provider. Atlas/evidence stay explicit BLOCKED.
  const minedDescriptor = definedCase.minedReplay ?? null;
  const minedAuditBox: { current: MinedReplayAudit | null } = { current: null };
  const historicalContext = createHistoricalLocalInvestigationContext({
    visible,
    caseId: definedCase.caseId,
    discriminator: definedCase.preFix.discriminator ?? null,
    minedReplay: minedDescriptor,
    repositoriesRoot: ports.minedReplay?.repositoriesRoot,
    runReplay: ports.minedReplay?.runReplay,
    auditBox: minedAuditBox,
  });
  const investigation = createLocalInvestigationToolSession(historicalContext);
  // Grounding injector: RERUN_SAFE_REPRODUCTION requires an
  // already-inspected sourcePath plus its observed source evidence ref.
  // Scripted reasoners that call RERUN bare after an inspection inherit
  // the most recent inspected source; calls with no inspected history
  // fall through so the session can refuse fail-closed.
  const sessionTools: AgentToolExecutor = {
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      if (call.toolId !== 'RERUN_SAFE_REPRODUCTION') {
        return investigation.executor.execute(call);
      }
      const args = call.arguments;
      const sourcePath = args['sourcePath'];
      const sourceEvidenceRef = args['sourceEvidenceRef'];
      const hasPath = typeof sourcePath === 'string' && sourcePath.length > 0;
      const hasRef = typeof sourceEvidenceRef === 'string' && sourceEvidenceRef.length > 0;
      const hasReproductionId =
        typeof args['reproductionId'] === 'string' && args['reproductionId'].length > 0;
      if (hasPath && hasRef && hasReproductionId) {
        return investigation.executor.execute(call);
      }
      const history = investigation.snapshot();
      const last = history.inspectedSources[history.inspectedSources.length - 1] ?? null;
      if (last === null) {
        if (minedAuditBox.current === null) {
          minedAuditBox.current = {
            grounded: false,
            repoResolved: false,
            verdict: null,
            reason: 'GATE_REFUSED_NO_FILE_GROUNDING',
            durationMs: null,
            timedOut: null,
            stderrHead: null,
          };
        }
        return investigation.executor.execute(call);
      }
      return investigation.executor.execute({
        ...call,
        arguments: {
          ...args,
          reproductionId:
            typeof args['reproductionId'] === 'string' && args['reproductionId'].length > 0
              ? args['reproductionId']
              : `benchmark-${definedCase.caseId}-${history.reproductions.length + 1}`,
          sourcePath: last.path,
          sourceEvidenceRef: last.evidenceRef,
          observedEvidenceRefs: Array.isArray(args['observedEvidenceRefs']) ? args['observedEvidenceRefs'] : [],
        },
      });
    },
  };
  const runtime = new AgentRuntime({
    campaignId: `benchmark:${definedCase.caseId}`,
    budgetPolicy: ports.budgetPolicy ?? defaultBenchmarkBudgetPolicy(),
    reasoner: recording.driver,
    tools: ports.tools ?? sessionTools,
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
  const score = scoreBenchmarkCandidate(candidateText, hidden, {
    proposed: admitted,
    visibleFiles: [...parsePreFixSnapshotFiles(visible.blobs[1] ?? '').keys()],
  });
  // Reproduction count derives from the shared session history when the
  // hunt runs through the session executor; custom-tool overrides fall
  // back to the runtime action log. Only REPRODUCED mints credit:
  // ENVIRONMENT_BLOCKED and inconclusive results never count.
  const sessionReproductions =
    ports.tools === undefined
      ? investigation.snapshot().reproductions.filter((receipt) => receipt.verdict === 'REPRODUCED').length
      : 0;
  const logReproductions = run.state.actionLog.filter(
    (entry) => entry.toolId === 'RERUN_SAFE_REPRODUCTION' && entry.resultClass === 'REPRODUCED',
  ).length;
  const reproductionCount = ports.tools === undefined ? sessionReproductions : logReproductions;
  const ranDiscriminator = run.state.actionLog.some(
    (entry) =>
      entry.toolId === 'RERUN_SAFE_REPRODUCTION' &&
      (entry.resultClass === 'REPRODUCED' || entry.resultClass === 'NOT_REPRODUCED'),
  );
  const discriminator = definedCase.preFix.discriminator ?? null;
  const discriminatorObservation =
    ranDiscriminator && discriminator !== null ? runVisibleDiscriminator(discriminator) : null;
  const minedReplayAudit = minedAuditBox.current;
  const dossier =
    tryBuildVisibleHuntDossier({
      caseId: definedCase.caseId,
      admitted,
      reproductionCount,
      observation: discriminatorObservation,
    }) ??
    (minedReplayAudit?.verdict === 'REPRODUCED'
      ? tryBuildMinedReplayDossier({
          caseId: definedCase.caseId,
          admitted,
          reproductionCount,
        })
      : null);
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
    reproductionCount,
    discriminatorObservation,
    minedReplayAudit,
    dossier,
    runtimeState: run.state,
    investigationHistory: ports.tools === undefined ? investigation.snapshot() : null,
  };
}
