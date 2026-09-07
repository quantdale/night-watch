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
import type { AutonomousFindingDossier } from '../autonomousFinding';
import { DEFAULT_SIBLING_ROOT } from '../source/siblingSource';
import { buildReasonerVisibleContext, type DefinedBenchmarkCase } from './case';
import { resolveMinedRepoPath } from './minedCases';
import {
  runContainedTestReplay,
  stringifyMinedReplayVerdict,
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
  stringifyVisibleRepro,
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

function envelope(source: UntrustedEnvelope['source'], digest: string, bytes: string): UntrustedEnvelope {
  return { schemaVersion: UNTRUSTED_ENVELOPE_VERSION, trust: 'UNTRUSTED', source, digest, bytes };
}
/**
 * Default tool executor: serves the pre-fix view. INSPECT_SOURCE_SURFACE with a
 * path returns that file when the snapshot is `--- path` chunks; otherwise blobs
 * stay sequential. RERUN_SAFE_REPRODUCTION runs the visible discriminator.
 */
export function createPreFixViewExecutor(
  visible: ReasonerVisibleContext,
  caseId: string,
  discriminator: VisibleDiscriminator | null = null,
  options: MinedReplayExecutorOptions = {},
): AgentToolExecutor {
  const blobs = [...visible.blobs];
  const kinds = ['DOCUMENTATION', 'SOURCE_CODE', 'DOCUMENTATION'] as const;
  const files = parsePreFixSnapshotFiles(blobs[1] ?? '');
  let calls = 0;
  const neutralReplayResult = (
    resultClass: 'REPRODUCED' | 'NOT_REPRODUCED' | 'NOT_AVAILABLE',
  ): AgentToolResult => {
    // Fixed template: verdict token only. File names, diffs, commit
    // messages, and assertion text cannot reach reasoner context here.
    const bytes = stringifyMinedReplayVerdict(resultClass);
    return {
      ok: true,
      resultClass,
      evidenceRefs: [`bench:${caseId}:repro:1`],
      outputBytes: Buffer.byteLength(bytes, 'utf8'),
      untrusted: [envelope('LOG', `bench:sha256:${caseId}:repro`, bytes)],
    };
  };
  const unavailable = (): AgentToolResult => ({
    ok: true,
    resultClass: 'NOT_AVAILABLE',
    evidenceRefs: [],
    outputBytes: 0,
    untrusted: [],
  });
  return {
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      if (call.toolId === 'RERUN_SAFE_REPRODUCTION') {
        if (discriminator !== null) {
          const observation = runVisibleDiscriminator(discriminator);
          const bytes = stringifyVisibleRepro(observation);
          return {
            ok: true,
            resultClass: observation.mismatch ? 'REPRODUCED' : 'NOT_REPRODUCED',
            evidenceRefs: [`bench:${caseId}:repro:1`],
            outputBytes: Buffer.byteLength(bytes, 'utf8'),
            untrusted: [envelope('LOG', `bench:sha256:${caseId}:repro`, bytes)],
          };
        }
        const mined = options.minedReplay ?? null;
        if (mined === null) return unavailable();
        // Anti-inflation gate: no named pre-fix file, no replay.
        let grounded = true;
        try {
          grounded = options.hasGrounding ? options.hasGrounding() : true;
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
          return unavailable();
        }
        const repoPath = resolveMinedRepoPath(options.repositoriesRoot ?? DEFAULT_SIBLING_ROOT, mined.repository);
        if (repoPath === null) {
          if (options.audit) {
            options.audit.current = {
              grounded: true,
              repoResolved: false,
              verdict: null,
              reason: 'REPO_UNRESOLVED',
              durationMs: null,
              timedOut: null,
              stderrHead: null,
            };
          }
          return unavailable();
        }
        try {
          const replay = options.runReplay ?? runContainedTestReplay;
          const result = await replay({
            repoPath,
            fixCommit: mined.fixCommit,
            testPath: mined.testPath,
            packageDir: mined.packageDir,
          });
          if (options.audit) {
            options.audit.current = {
              grounded: true,
              repoResolved: true,
              verdict: result.verdict,
              reason: result.reason,
              durationMs: result.durationMs,
              timedOut: result.preFix.timedOut || result.postFix.timedOut,
              stderrHead: result.stderrHead,
            };
          }
          if (result.verdict === 'REPRODUCED') return neutralReplayResult('REPRODUCED');
          if (result.verdict === 'ENVIRONMENT_BLOCKED') return unavailable();
          return neutralReplayResult('NOT_REPRODUCED');
        } catch {
          if (options.audit) {
            options.audit.current = {
              grounded: true,
              repoResolved: true,
              verdict: null,
              reason: 'REPLAY_EXECUTOR_FAILED',
              durationMs: null,
              timedOut: null,
              stderrHead: null,
            };
          }
          return unavailable();
        }
      }
      if (call.toolId === 'INSPECT_SOURCE_SURFACE' && files.size > 0) {
        const requested = typeof call.arguments.path === 'string' ? call.arguments.path : '';
        const body = files.get(requested);
        if (body !== undefined) {
          return {
            ok: true,
            resultClass: 'PREFIX_FILE',
            evidenceRefs: [`bench:${caseId}:file:${requested}`],
            outputBytes: Buffer.byteLength(body, 'utf8'),
            untrusted: [envelope('SOURCE_CODE', `bench:sha256:${caseId}:file`, body)],
          };
        }
        const listing = [...files.entries()]
          .map(([name, body]) => {
            const first = body.split('\n').find((line) => line.trim().length > 0) ?? '';
            return `${name}\n${first.slice(0, 200)}`;
          })
          .join('\n---\n');
        return {
          ok: true,
          resultClass: 'PREFIX_INDEX',
          evidenceRefs: [`bench:${caseId}:index`],
          outputBytes: Buffer.byteLength(listing, 'utf8'),
          untrusted: [envelope('DOCUMENTATION', `bench:sha256:${caseId}:index`, listing)],
        };
      }
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
  // Mined-case contained replay: the default executor carries the hidden
  // replay descriptor. The file-grounding gate reads the live runtime
  // snapshot through this box (populated before the first turn runs).
  const minedDescriptor = definedCase.minedReplay ?? null;
  const minedAuditBox: { current: MinedReplayAudit | null } = { current: null };
  const runtimeBox: { current: AgentRuntime | null } = { current: null };
  const visibleFiles = [...parsePreFixSnapshotFiles(visible.blobs[1] ?? '').keys()];
  const runtime = new AgentRuntime({
    campaignId: `benchmark:${definedCase.caseId}`,
    budgetPolicy: ports.budgetPolicy ?? defaultBenchmarkBudgetPolicy(),
    reasoner: recording.driver,
    tools:
      ports.tools ??
      createPreFixViewExecutor(visible, definedCase.caseId, definedCase.preFix.discriminator ?? null, {
        minedReplay: minedDescriptor,
        repositoriesRoot: ports.minedReplay?.repositoriesRoot,
        runReplay: ports.minedReplay?.runReplay,
        hasGrounding:
          minedDescriptor === null
            ? undefined
            : () => {
                const snapshot = runtimeBox.current?.snapshot();
                if (!snapshot) return false;
                const groundedText = [
                  ...snapshot.hypotheses.map((hypothesis) => hypothesis.statement),
                  ...snapshot.candidateIds,
                ].join('\n');
                return (
                  scoreBenchmarkCandidate(groundedText, hidden, { visibleFiles }).fileHits > 0
                );
              },
        audit: minedAuditBox,
      }),
    authorizedEnvironments: ['LOCAL'],
    maxTurns: ports.maxTurns ?? BENCHMARK_HUNT_MAX_TURNS,
  });
  runtimeBox.current = runtime;
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
  const reproductionCount = run.state.actionLog.filter(
    (entry) => entry.toolId === 'RERUN_SAFE_REPRODUCTION' && entry.resultClass === 'REPRODUCED',
  ).length;
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
  };
}
