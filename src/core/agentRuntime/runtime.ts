// ---------------------------------------------------------------------------
// Lane A autonomous AgentRuntime: provider-neutral campaign loop over the
// frozen agent protocol.
//
// PLAN → OBSERVE → ANALYZE → HYPOTHESIZE → VERIFY → TRIAGE → REPLAN → PLAN …
// …cycling while budget and progress allow.
// The reasoner (injected ReasonerDriver) only returns typed intents; every
// response is re-validated with the frozen protocol validators before
// anything executes. Privileged execution lives behind the injected
// AgentToolExecutor port. This module never spawns a process.
// ---------------------------------------------------------------------------

import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import {
  AGENT_INTENT_KINDS,
  AGENT_PHASES,
  AGENT_RUNTIME_STATE_VERSION,
  AGENT_TOOL_CATALOG,
  REASONER_DEFAULT_TIMEOUT_MS,
  REASONER_STDERR_BYTE_CAP,
  REASONER_STDOUT_BYTE_CAP,
  REASONER_TURN_REQUEST_VERSION,
  ZERO_AGENT_BYTE_LEDGER,
  classifyBudgetExhaustion,
  detectExhaustedAction,
  detectNoProgress,
  detectRepeatedAction,
  isAgentByteLedger,
  lookupAgentTool,
  proposeCandidateRequiresEvidence,
  validateReasonerTurnResponse,
  type ActionFailureDisposition,
  type AgentActionRecord,
  type AgentBudgetPolicy,
  type AgentBudgetUsage,
  type AgentByteLedger,
  type AgentCheckpoint,
  type AgentHypothesis,
  type AgentIntent,
  type AgentPhase,
  type AgentRuntimeState,
  type AgentRuntimeStatus,
  type AgentTerminationReason,
  type AgentToolEnvironment,
  type AgentToolId,
  type ReasonerDriver,
  type ReasonerFailureClass,
  type ReasonerTurnRequest,
  type UntrustedEnvelope,
  type AgentToolDescriptor,
} from '../agentProtocol';
import { createCheckpoint, AgentCheckpointError, parseCheckpoint, parseResumeCursor } from './checkpoint';
import { deriveInvestigationMemory } from '../investigationMemory/derive';
import { MEMORY_CAPS, type CampaignStrategyState } from '../investigationMemory/types';
import {
  normalizeToolResult,
  type AgentRunOptions,
  type AgentRunResult,
  type AgentRuntimeDeps,
  type AgentRuntimeResumeDeps,
  type AgentToolCall,
  type AgentToolExecutor,
} from './types';

export const AGENT_RUNTIME_DEFAULT_MAX_TURNS = 50;
const PENDING_UNTRUSTED_CAP = 8;

const SAFETY_REJECTION_CLASSES: ReadonlySet<string> = new Set([
  'UNSAFE_INTENT',
  'UNKNOWN_INTENT',
  'UNKNOWN_TOOL',
  'UNAUTHORIZED_ENVIRONMENT',
  'SECRET_ECHO',
]);

export class AgentRuntimeError extends Error {
  constructor(message: string) {
    super(`AGENT_RUNTIME: ${message}`);
    this.name = 'AgentRuntimeError';
  }
}

function nextPhase(phase: AgentPhase): AgentPhase {
  const index = AGENT_PHASES.indexOf(phase);
  return AGENT_PHASES[(index + 1) % AGENT_PHASES.length]!;
}

function defaultAllowedToolIds(authorizedEnvironments: readonly AgentToolEnvironment[]): AgentToolId[] {
  return AGENT_TOOL_CATALOG.filter((tool: AgentToolDescriptor) => authorizedEnvironments.includes(tool.environment)).map(
    (tool: AgentToolDescriptor) => tool.id,
  );
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function isResumeDeps(deps: AgentRuntimeDeps | AgentRuntimeResumeDeps): deps is AgentRuntimeResumeDeps {
  return 'restored' in deps && (deps as AgentRuntimeResumeDeps).restored !== undefined;
}

type TerminalOutcome = { readonly reason: AgentTerminationReason; readonly withCheckpoint: boolean };

export class AgentRuntime {
  private readonly campaignId: string;
  private readonly policy: AgentBudgetPolicy;
  private readonly reasoner: ReasonerDriver;
  private readonly tools: AgentToolExecutor;
  private readonly authorizedEnvironments: readonly AgentToolEnvironment[];
  private readonly allowedToolIds: readonly AgentToolId[];
  private readonly defaultMaxTurns: number;
  private readonly now: () => number;

  private status: AgentRuntimeStatus = 'READY';
  private phase: AgentPhase = 'PLAN';
  private hypotheses: AgentHypothesis[] = [];
  private actionLog: AgentActionRecord[] = [];
  private evidenceRefs: string[] = [];
  private candidateIds: string[] = [];
  private usage: AgentBudgetUsage;
  /** W9 component accounting explaining usage.inputBytes/outputBytes. */
  private byteLedger: AgentByteLedger;
  private terminationReason: AgentTerminationReason | null = null;
  private turnBase: number;
  private turnsThisRun = 0;
  private wallBaseMs: number;
  private runStartMs: number | null = null;
  private pausedRequested = false;
  private cancelled = false;
  private runAbort: AbortController | null = null;
  private pendingUntrusted: UntrustedEnvelope[] = [];
  private knownTargets: string[] = [];
  private readonly priorStrategy: CampaignStrategyState | null;

  constructor(deps: AgentRuntimeDeps | AgentRuntimeResumeDeps) {
    if (typeof deps.campaignId !== 'string' || deps.campaignId.length === 0) {
      throw new AgentRuntimeError('campaignId must be a non-empty string');
    }
    this.campaignId = deps.campaignId;
    this.policy = deps.budgetPolicy;
    this.reasoner = deps.reasoner;
    this.tools = deps.tools;
    this.authorizedEnvironments = deps.authorizedEnvironments ?? ['LOCAL'];
    this.allowedToolIds = deps.allowedToolIds ?? defaultAllowedToolIds(this.authorizedEnvironments);
    this.defaultMaxTurns = deps.maxTurns ?? AGENT_RUNTIME_DEFAULT_MAX_TURNS;
    this.now = deps.now ?? Date.now;
    this.priorStrategy = deps.priorStrategy ?? null;
    if (isResumeDeps(deps)) {
      const restored = deps.restored;
      if (restored.state.campaignId !== this.campaignId) {
        throw new AgentRuntimeError('restored state belongs to another campaign');
      }
      this.phase = restored.state.phase;
      this.hypotheses = restored.state.hypotheses.map((item) => ({ ...item, evidenceRefs: [...item.evidenceRefs] }));
      this.actionLog = restored.state.actionLog.map((item) => ({
        ...item,
        evidenceRefs: [...item.evidenceRefs],
        ...(item.salient === undefined ? {} : { salient: [...item.salient] }),
      }));
      // Pre-W8 checkpoints have no target ledger: resume with an empty one
      // rather than refusing an otherwise valid checkpoint.
      this.knownTargets = [...(restored.state.knownTargets ?? [])];
      // Pre-W9 checkpoints carry no byte ledger: resume with a zero ledger
      // (fresh W9 accounting) while the frozen usage totals are preserved
      // verbatim for remaining-policy arithmetic. A present-but-malformed
      // ledger never reaches here: parseCheckpoint rejects it fail-closed.
      this.byteLedger = isAgentByteLedger(restored.state.byteLedger) ? { ...restored.state.byteLedger } : { ...ZERO_AGENT_BYTE_LEDGER };
      this.evidenceRefs = [...restored.state.evidenceRefs];
      this.candidateIds = [...restored.state.candidateIds];
      this.usage = { ...restored.state.budget.usage };
      this.turnBase = restored.completedTurns;
      this.wallBaseMs = restored.state.budget.usage.wallTimeMs;
    } else {
      this.byteLedger = { ...ZERO_AGENT_BYTE_LEDGER };
      this.usage = {
        wallTimeMs: 0,
        reasonerCalls: 0,
        inputBytes: 0,
        outputBytes: 0,
        toolActions: 0,
        candidateCount: 0,
        retries: 0,
        consecutiveFailures: 0,
        providerFailures: 0,
      };
      this.turnBase = 0;
      this.wallBaseMs = 0;
    }
  }

  /** Fail-closed resume. Corrupt or foreign checkpoints throw. */
  static resumeFromCheckpoint(checkpoint: unknown, deps: AgentRuntimeDeps): AgentRuntime {
    const parsed = parseCheckpoint(checkpoint);
    if (parsed.campaignId !== deps.campaignId) {
      throw new AgentCheckpointError('CAMPAIGN_MISMATCH', 'checkpoint belongs to another campaign');
    }
    const completedTurns = parseResumeCursor(parsed.resumeCursor, deps.campaignId);
    return new AgentRuntime({ ...deps, restored: { state: parsed.state, completedTurns } });
  }

  get view(): { readonly status: AgentRuntimeStatus; readonly phase: AgentPhase } {
    return { status: this.status, phase: this.phase };
  }

  /** Frozen protocol snapshot of the current campaign state. */
  snapshot(): AgentRuntimeState {
    return {
      schemaVersion: AGENT_RUNTIME_STATE_VERSION,
      campaignId: this.campaignId,
      status: this.status,
      phase: this.phase,
      hypotheses: this.hypotheses.map((item) => Object.freeze({ ...item, evidenceRefs: Object.freeze([...item.evidenceRefs]) })),
      actionLog: this.actionLog.map((item) =>
        Object.freeze({
          ...item,
          evidenceRefs: Object.freeze([...item.evidenceRefs]),
          ...(item.salient === undefined ? {} : { salient: Object.freeze([...item.salient]) }),
        }),
      ),
      evidenceRefs: Object.freeze([...this.evidenceRefs]),
      candidateIds: Object.freeze([...this.candidateIds]),
      knownTargets: Object.freeze([...this.knownTargets]),
      byteLedger: Object.freeze({ ...this.byteLedger }),
      budget: Object.freeze({ policy: this.policy, usage: Object.freeze({ ...this.usage }) }),
      terminationReason: this.terminationReason,
    };
  }

  /** Secret-free checkpoint of the current state (fail-closed on secrets). */
  checkpoint(): AgentCheckpoint {
    return createCheckpoint(this.snapshot(), this.turnBase + this.turnsThisRun);
  }

  /** External pause: the loop halts at the next turn boundary. */
  pause(): void {
    this.pausedRequested = true;
  }

  /** Clear a pause (external or intent-driven) so run() can continue. */
  resume(): void {
    this.pausedRequested = false;
    if (this.status === 'PAUSED') {
      this.status = 'READY';
      this.terminationReason = null;
    }
  }

  /** External cancel: the loop terminates CANCELLED promptly. */
  cancel(): void {
    this.cancelled = true;
    this.runAbort?.abort();
  }

  async run(options?: AgentRunOptions): Promise<AgentRunResult> {
    if (this.status === 'TERMINATED') throw new AgentRuntimeError('campaign already terminated');
    assertOwnerPolicyAllows('AUTONOMOUS_AGENT_LOCAL');
    if (this.cancelled) return this.finish({ reason: 'CANCELLED', withCheckpoint: false });

    this.status = 'RUNNING';
    this.runStartMs = this.now();
    this.runAbort = new AbortController();
    const maxTurns = options?.maxTurns ?? this.defaultMaxTurns;

    try {
      for (;;) {
        if (this.cancelled) return this.finish({ reason: 'CANCELLED', withCheckpoint: false });
        if (this.pausedRequested) return this.finish({ reason: 'PAUSED', withCheckpoint: true });
        this.refreshWallTime();
        const exhausted = classifyBudgetExhaustion(this.policy, this.usage);
        if (exhausted === 'SAFE_TERMINATION_CHECKPOINT') {
          return this.finish({ reason: 'BUDGET_EXHAUSTED', withCheckpoint: true });
        }
        if (this.turnsThisRun >= maxTurns) return this.finish({ reason: 'NO_PROGRESS', withCheckpoint: false });

        const turnId = `${this.campaignId}:turn:${this.turnBase + this.turnsThisRun + 1}`;
        const terminal = await this.runTurn(turnId);
        this.turnsThisRun += 1;
        if (terminal !== null) return this.finish(terminal);

        this.refreshWallTime();
        if (classifyBudgetExhaustion(this.policy, this.usage) === 'SAFE_TERMINATION_CHECKPOINT') {
          return this.finish({ reason: 'BUDGET_EXHAUSTED', withCheckpoint: true });
        }
        if (detectNoProgress(this.actionLog)) {
          this.record({
            turnId,
            phase: this.phase,
            intentKind: 'NO_PROGRESS',
            toolId: null,
            argumentDigest: null,
            resultClass: 'NO_PROGRESS_DETECTED',
            evidenceRefs: [],
          });
          return this.finish({ reason: 'NO_PROGRESS', withCheckpoint: false });
        }
      }
    } finally {
      this.runAbort = null;
    }
  }

  /**
   * One loop turn: observe in the current phase, ask the reasoner, validate
   * fail-closed, apply intents. Returns a terminal outcome, or null to
   * continue. Advances the phase before returning null.
   */
  private async runTurn(turnId: string): Promise<TerminalOutcome | null> {
    const request = this.buildRequest(turnId);
    // W9 ledger: the full serialized request is charged into inputBytes;
    // memory and pending-untrusted serializations are measured subsets of it.
    const requestBytes = utf8Bytes(JSON.stringify(request));
    const requestMemoryBytes = utf8Bytes(JSON.stringify(request.observation.memory));
    const requestUntrustedBytes = utf8Bytes(JSON.stringify(request.observation.untrusted));
    this.usage = { ...this.usage, inputBytes: this.usage.inputBytes + requestBytes };
    this.byteLedger = {
      ...this.byteLedger,
      requestBytes: this.byteLedger.requestBytes + requestBytes,
      requestMemoryBytes: this.byteLedger.requestMemoryBytes + requestMemoryBytes,
      requestUntrustedBytes: this.byteLedger.requestUntrustedBytes + requestUntrustedBytes,
    };

    let call: Awaited<ReturnType<ReasonerDriver['complete']>>;
    try {
      call = await this.reasoner.complete(request, {
        timeoutMs: this.policy.perActionTimeoutMs > 0 ? this.policy.perActionTimeoutMs : REASONER_DEFAULT_TIMEOUT_MS,
        stdoutByteCap: REASONER_STDOUT_BYTE_CAP,
        stderrByteCap: REASONER_STDERR_BYTE_CAP,
        signal: this.runAbort?.signal ?? new AbortController().signal,
      });
    } catch (error) {
      if (this.cancelled) return { reason: 'CANCELLED', withCheckpoint: false };
      this.usage = {
        ...this.usage,
        providerFailures: this.usage.providerFailures + 1,
        consecutiveFailures: this.usage.consecutiveFailures + 1,
        retries: this.usage.retries + 1,
      };
      this.record({
        turnId,
        phase: this.phase,
        intentKind: 'REASONER_CALL',
        toolId: null,
        argumentDigest: null,
        resultClass: 'DRIVER_THROW',
        evidenceRefs: [],
      });
      void error;
      return null;
    }

    this.usage = {
      ...this.usage,
      reasonerCalls: this.usage.reasonerCalls + 1,
      outputBytes: this.usage.outputBytes + call.stdoutBytes + call.stderrBytes,
    };
    this.byteLedger = {
      ...this.byteLedger,
      providerStdoutBytes: this.byteLedger.providerStdoutBytes + call.stdoutBytes,
      providerStderrBytes: this.byteLedger.providerStderrBytes + call.stderrBytes,
    };

    if (!call.ok) {
      this.usage = {
        ...this.usage,
        providerFailures: this.usage.providerFailures + 1,
        consecutiveFailures: this.usage.consecutiveFailures + 1,
        retries: this.usage.retries + 1,
      };
      this.record({
        turnId,
        phase: this.phase,
        intentKind: 'REASONER_CALL',
        toolId: null,
        argumentDigest: null,
        resultClass: `REASONER_${call.class}`,
        evidenceRefs: [],
      });
      return null;
    }

    // W9 double-count fix: the parsed response is the same document already
    // charged as provider stdout. It is measured into parsedResponseBytes but
    // never charged into usage.outputBytes again, so usage.outputBytes equals
    // providerStdoutBytes + providerStderrBytes + toolResultBytes exactly.
    this.byteLedger = {
      ...this.byteLedger,
      parsedResponseBytes: this.byteLedger.parsedResponseBytes + utf8Bytes(JSON.stringify(call.response)),
    };

    const validated = validateReasonerTurnResponse(call.response as unknown, {
      authorizedEnvironments: this.authorizedEnvironments,
      allowedToolIds: this.allowedToolIds,
    });
    if (!validated.ok) {
      const failureClass: ReasonerFailureClass = validated.class;
      if (SAFETY_REJECTION_CLASSES.has(failureClass)) {
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'BLOCKED',
          toolId: null,
          argumentDigest: null,
          resultClass: `SAFETY_BLOCKED_${failureClass}`,
          evidenceRefs: [],
        });
        return { reason: 'SAFETY_BLOCKED', withCheckpoint: false };
      }
      this.usage = {
        ...this.usage,
        consecutiveFailures: this.usage.consecutiveFailures + 1,
        retries: this.usage.retries + 1,
      };
      this.record({
        turnId,
        phase: this.phase,
        intentKind: 'REASONER_RESPONSE',
        toolId: null,
        argumentDigest: null,
        resultClass: `REJECTED_${failureClass}`,
        evidenceRefs: [],
      });
      return null;
    }

    this.usage = { ...this.usage, consecutiveFailures: 0 };
    for (const draft of validated.value.hypotheses) {
      if (!this.hypotheses.some((item) => item.hypothesisId === draft.hypothesisId)) {
        this.hypotheses.push({ hypothesisId: draft.hypothesisId, statement: draft.statement, evidenceRefs: [...draft.evidenceRefs], status: 'OPEN' });
        this.addEvidence(draft.evidenceRefs);
      }
    }

    let replanned = false;
    for (const intent of validated.value.intents) {
      const outcome = await this.applyIntent(intent, turnId);
      if (outcome === 'REPLANNED') {
        replanned = true;
        continue;
      }
      if (outcome !== null) return outcome;
      if (classifyBudgetExhaustion(this.policy, this.usage) === 'SAFE_TERMINATION_CHECKPOINT') {
        return { reason: 'BUDGET_EXHAUSTED', withCheckpoint: true };
      }
    }
    this.phase = replanned ? 'PLAN' : nextPhase(this.phase);
    return null;
  }

  /**
   * Apply one validated intent. Returns 'REPLANNED' to steer the next phase,
   * a terminal outcome to stop, or null to continue.
   */
  private async applyIntent(intent: AgentIntent, turnId: string): Promise<TerminalOutcome | 'REPLANNED' | null> {
    switch (intent.kind) {
      case 'CALL_TOOL': {
        // Validated upstream, but the catalog lookup is the fail-closed proof
        // that only known tools reach the executor.
        const descriptor = lookupAgentTool(intent.toolId);
        if (descriptor === null) {
          this.record({
            turnId,
            phase: this.phase,
            intentKind: 'BLOCKED',
            toolId: null,
            argumentDigest: null,
            resultClass: 'SAFETY_BLOCKED_UNKNOWN_TOOL',
            evidenceRefs: [],
          });
          return { reason: 'SAFETY_BLOCKED', withCheckpoint: false };
        }
        return this.applyCallTool(descriptor.id, intent.argumentDigest, intent.arguments, turnId);
      }
      case 'FORM_HYPOTHESIS': {
        if (this.hypotheses.some((item) => item.hypothesisId === intent.hypothesisId)) {
          this.record({
            turnId,
            phase: this.phase,
            intentKind: 'FORM_HYPOTHESIS',
            toolId: null,
            argumentDigest: null,
            resultClass: 'HYPOTHESIS_DUPLICATE',
            evidenceRefs: [],
          });
          return null;
        }
        this.hypotheses.push({
          hypothesisId: intent.hypothesisId,
          statement: intent.statement,
          evidenceRefs: [...intent.evidenceRefs],
          status: 'OPEN',
        });
        this.addEvidence(intent.evidenceRefs);
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'FORM_HYPOTHESIS',
          toolId: null,
          argumentDigest: null,
          resultClass: 'HYPOTHESIS_FORMED',
          evidenceRefs: [...intent.evidenceRefs],
        });
        return null;
      }
      case 'PROPOSE_CANDIDATE': {
        if (!proposeCandidateRequiresEvidence(intent)) {
          this.record({
            turnId,
            phase: this.phase,
            intentKind: 'PROPOSE_CANDIDATE',
            toolId: null,
            argumentDigest: null,
            resultClass: 'CANDIDATE_REJECTED_MISSING_EVIDENCE',
            evidenceRefs: [],
          });
          return null;
        }
        if (!this.candidateIds.includes(intent.candidateId)) this.candidateIds.push(intent.candidateId);
        this.usage = { ...this.usage, candidateCount: this.usage.candidateCount + 1 };
        this.addEvidence(intent.evidenceRefs);
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'PROPOSE_CANDIDATE',
          toolId: null,
          argumentDigest: null,
          resultClass: 'CANDIDATE_PROPOSED',
          evidenceRefs: [...intent.evidenceRefs],
        });
        return null;
      }
      case 'REJECT_CANDIDATE': {
        this.candidateIds = this.candidateIds.filter((id) => id !== intent.candidateId);
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'REJECT_CANDIDATE',
          toolId: null,
          argumentDigest: null,
          resultClass: 'CANDIDATE_REJECTED',
          evidenceRefs: [],
        });
        return null;
      }
      case 'REPLAN': {
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'REPLAN',
          toolId: null,
          argumentDigest: null,
          resultClass: 'REPLANNED',
          evidenceRefs: [],
        });
        return 'REPLANNED';
      }
      case 'PAUSE': {
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'PAUSE',
          toolId: null,
          argumentDigest: null,
          resultClass: 'PAUSED',
          evidenceRefs: [],
        });
        return { reason: 'PAUSED', withCheckpoint: true };
      }
      case 'CANCEL': {
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'CANCEL',
          toolId: null,
          argumentDigest: null,
          resultClass: 'CANCELLED',
          evidenceRefs: [],
        });
        return { reason: 'CANCELLED', withCheckpoint: false };
      }
      case 'TERMINATE': {
        const reason: AgentTerminationReason = intent.reason;
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'TERMINATE',
          toolId: null,
          argumentDigest: null,
          resultClass: `TERMINATED_${reason}`,
          evidenceRefs: [],
        });
        if (reason === 'BUDGET_EXHAUSTED' || reason === 'PAUSED') return { reason, withCheckpoint: true };
        return { reason, withCheckpoint: false };
      }
      default:
        // Validated intents are exhaustive; unknown kinds never reach here
        // because validateReasonerTurnResponse rejects them first.
        this.record({
          turnId,
          phase: this.phase,
          intentKind: 'BLOCKED',
          toolId: null,
          argumentDigest: null,
          resultClass: 'SAFETY_BLOCKED_UNKNOWN_INTENT',
          evidenceRefs: [],
        });
        return { reason: 'SAFETY_BLOCKED', withCheckpoint: false };
    }
  }

  private async applyCallTool(
    toolId: AgentToolId,
    argumentDigest: string,
    args: Readonly<Record<string, unknown>>,
    turnId: string,
  ): Promise<TerminalOutcome | null> {
    const fingerprint = { intentKind: 'CALL_TOOL', toolId, argumentDigest };
    // W9 disposition-aware exhaustion (see detectExhaustedAction): a
    // consecutive streak of the same call is discarded, and any repeat of a
    // fingerprint whose prior executions already exhausted it — one
    // deterministic/environment failure, or TRANSIENT_ACTION_RETRY_BUDGET
    // transient failures — is discarded even when productive reads sit
    // between the attempts. Counting is over total prior executions of the
    // host-computed fingerprint, never a streak; a changed canonical digest
    // is a fresh fingerprint.
    if (detectRepeatedAction(this.actionLog, fingerprint) || detectExhaustedAction(this.actionLog, fingerprint)) {
      this.record({
        turnId,
        phase: this.phase,
        intentKind: 'CALL_TOOL',
        toolId,
        argumentDigest,
        resultClass: 'DEDUPED_REPEAT',
        evidenceRefs: [],
        // Attribute the discard to the target the executor already confirmed
        // for this exact call, so working memory can surface the waste.
        target: this.lastConfirmedTargetFor(toolId, argumentDigest),
      });
      return null;
    }
    const call: AgentToolCall = { campaignId: this.campaignId, turnId, toolId, arguments: args, argumentDigest };
    const raw = await this.tools.execute(call);
    const result = normalizeToolResult(raw);
    // W9 ledger: the pre-truncation tool payload is charged; the truncated
    // envelopes that actually cross to the reasoner are measured only.
    let toolEnvelopeBytes = 0;
    for (const envelope of result.untrusted) {
      if (typeof envelope?.bytes === 'string') toolEnvelopeBytes += utf8Bytes(envelope.bytes);
    }
    this.usage = {
      ...this.usage,
      toolActions: this.usage.toolActions + 1,
      outputBytes: this.usage.outputBytes + result.outputBytes,
      ...(result.ok ? {} : { consecutiveFailures: this.usage.consecutiveFailures + 1, retries: this.usage.retries + 1 }),
    };
    this.byteLedger = {
      ...this.byteLedger,
      toolResultBytes: this.byteLedger.toolResultBytes + result.outputBytes,
      toolEnvelopeBytes: this.byteLedger.toolEnvelopeBytes + toolEnvelopeBytes,
    };
    this.addEvidence(result.evidenceRefs);
    if (result.untrusted.length > 0) {
      this.pendingUntrusted = [...this.pendingUntrusted, ...result.untrusted].slice(-PENDING_UNTRUSTED_CAP);
    }
    const facts = result.memory;
    const target = facts?.target ?? null;
    // Only SUCCESSFUL source-surface work contributes approved targets. A
    // refused read still reports its requested subject (so memory can mark it
    // exhausted) but must never be offered again as an approved target, and a
    // proposal's subject is a candidate id, not a source path.
    const learnable = toolId === 'INSPECT_SOURCE_SURFACE' || toolId === 'RERUN_SAFE_REPRODUCTION';
    if (result.ok && learnable) {
      if (facts?.availableTargets !== undefined) this.learnTargets(facts.availableTargets);
      if (target !== null) this.learnTargets([target]);
    }
    const resultClass = result.ok ? result.resultClass : 'TOOL_ERROR';
    // W9: persist the host-owned disposition on FAILED actions only. Absent
    // on successes and on legacy executors (absence reads as
    // DETERMINISTIC_TERMINAL, preserving W8 exhaustion exactly).
    const disposition: ActionFailureDisposition | undefined = result.ok ? undefined : (result.disposition ?? undefined);
    this.record({
      turnId,
      phase: this.phase,
      intentKind: 'CALL_TOOL',
      toolId,
      argumentDigest,
      resultClass,
      evidenceRefs: [...result.evidenceRefs],
      target,
      ...(facts?.salient === undefined ? {} : { salient: facts.salient }),
      ...(disposition === undefined ? {} : { disposition }),
    });
    if (toolId === 'RERUN_SAFE_REPRODUCTION' && target !== null) {
      this.applyReproductionVerdict(target, resultClass);
    }
    return null;
  }

  private buildRequest(turnId: string): ReasonerTurnRequest {
    const request: ReasonerTurnRequest = {
      schemaVersion: REASONER_TURN_REQUEST_VERSION,
      campaignId: this.campaignId,
      turnId,
      observation: {
        phase: this.phase,
        untrusted: [...this.pendingUntrusted],
        evidenceRefs: [...this.evidenceRefs],
        allowedToolIds: [...this.allowedToolIds],
        allowedIntentKinds: [...AGENT_INTENT_KINDS],
        // Derived, never stored: memory is a pure projection of observed
        // state, so a checkpoint can never carry a stale or forged copy.
        memory: deriveInvestigationMemory(this.snapshot(), { campaign: this.priorStrategy }),
      },
      budgetRemaining: { policy: this.policy, usage: { ...this.usage } },
    };
    this.pendingUntrusted = [];
    return request;
  }

  private addEvidence(refs: readonly string[]): void {
    for (const ref of refs) {
      if (typeof ref === 'string' && ref.length > 0 && !this.evidenceRefs.includes(ref)) this.evidenceRefs.push(ref);
    }
  }

  private record(entry: {
    readonly turnId: string;
    readonly phase: AgentPhase;
    readonly intentKind: string;
    readonly toolId: string | null;
    readonly argumentDigest: string | null;
    readonly resultClass: string;
    readonly evidenceRefs: readonly string[];
    readonly target?: string | null;
    readonly salient?: readonly string[];
    readonly disposition?: ActionFailureDisposition | null;
  }): void {
    this.actionLog.push({
      ...entry,
      target: entry.target ?? null,
      evidenceRefs: [...entry.evidenceRefs],
      ...(entry.salient === undefined ? {} : { salient: [...entry.salient] }),
      ...(entry.disposition === undefined || entry.disposition === null ? {} : { disposition: entry.disposition }),
    });
  }

  /** Remember an executor-confirmed approved target. Bounded and deduplicated. */
  private learnTargets(targets: readonly string[]): void {
    for (const target of targets) {
      if (this.knownTargets.length >= MEMORY_CAPS.knownTargets) return;
      if (target.length === 0 || this.knownTargets.includes(target)) continue;
      this.knownTargets.push(target);
    }
  }

  /** The executor-confirmed target of the most recent identical call, if any. */
  private lastConfirmedTargetFor(toolId: AgentToolId, argumentDigest: string): string | null {
    for (let index = this.actionLog.length - 1; index >= 0; index -= 1) {
      const record = this.actionLog[index]!;
      if (record.toolId === toolId && record.argumentDigest === argumentDigest) {
        return record.target ?? null;
      }
    }
    return null;
  }

  /**
   * Mechanical hypothesis lifecycle. An observed reproduction verdict on a
   * target promotes or refutes every hypothesis grounded on that target's
   * source evidence. Model prose never performs this transition.
   */
  private applyReproductionVerdict(target: string, resultClass: string): void {
    if (resultClass !== 'REPRODUCED' && resultClass !== 'NOT_REPRODUCED') return;
    const groundingRefs = new Set<string>();
    for (const record of this.actionLog) {
      if (record.toolId !== 'INSPECT_SOURCE_SURFACE') continue;
      if (record.resultClass !== 'SOURCE_FILE') continue;
      if ((record.target ?? null) !== target) continue;
      for (const ref of record.evidenceRefs) groundingRefs.add(ref);
    }
    if (groundingRefs.size === 0) return;
    const next: AgentHypothesis['status'] = resultClass === 'REPRODUCED' ? 'SUPPORTED' : 'DISPROVED';
    this.hypotheses = this.hypotheses.map((hypothesis) => {
      if (hypothesis.status === 'DISPROVED' && next === 'DISPROVED') return hypothesis;
      if (!hypothesis.evidenceRefs.some((ref) => groundingRefs.has(ref))) return hypothesis;
      return { ...hypothesis, status: next };
    });
  }

  private refreshWallTime(): void {
    if (this.runStartMs === null) return;
    this.usage = { ...this.usage, wallTimeMs: this.wallBaseMs + (this.now() - this.runStartMs) };
  }

  private finish(outcome: TerminalOutcome): AgentRunResult {
    this.refreshWallTime();
    this.terminationReason = outcome.reason;
    this.status = outcome.reason === 'PAUSED' ? 'PAUSED' : 'TERMINATED';
    const state = this.snapshot();
    let checkpoint: AgentCheckpoint | null = null;
    if (outcome.withCheckpoint) {
      // Checkpoint creation is fail-closed on secrets; a secret-bearing state
      // must never be persisted. Surface the corruption instead of resuming.
      checkpoint = createCheckpoint(state, this.turnBase + this.turnsThisRun);
    }
    return { terminationReason: outcome.reason, state, checkpoint };
  }
}

export type { AgentToolExecutor, AgentToolCall };
export type { AgentRuntimeDeps, AgentRuntimeResumeDeps, AgentRunOptions, AgentRunResult };
