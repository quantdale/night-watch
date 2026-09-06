// ---------------------------------------------------------------------------
// Lane A ports: the tool-executor contract injected into AgentRuntime.
// Interfaces only. Tool implementation is owned by Lane C (agentTools);
// CLI transport is owned by Lane B (reasoner). This module never spawns a
// process and never touches the network.
// ---------------------------------------------------------------------------

import type {
  AgentBudgetPolicy,
  AgentBudgetUsage,
  AgentCheckpoint,
  AgentRuntimeState,
  AgentTerminationReason,
  AgentToolEnvironment,
  AgentToolId,
  ReasonerDriver,
  UntrustedEnvelope,
} from '../agentProtocol';

export type { ReasonerDriver };

/** A single validated CALL_TOOL intent handed to the executor. */
export interface AgentToolCall {
  readonly campaignId: string;
  readonly turnId: string;
  readonly toolId: AgentToolId;
  /** Raw arguments. Never persisted into checkpoints or runtime state. */
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly argumentDigest: string;
}

/**
 * Executor-reported outcome. Only `resultClass` + `evidenceRefs` enter the
 * runtime state; raw payloads stay with the executor.
 */
export interface AgentToolResult {
  readonly ok: boolean;
  readonly resultClass: string;
  readonly evidenceRefs: readonly string[];
  readonly outputBytes: number;
  readonly untrusted: readonly UntrustedEnvelope[];
}

function emptyToolResult(): AgentToolResult {
  return { ok: true, resultClass: 'NOOP', evidenceRefs: [], outputBytes: 0, untrusted: [] };
}

export function normalizeToolResult(value: unknown): AgentToolResult {
  const base = emptyToolResult();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const resultClass = typeof record.resultClass === 'string' && record.resultClass.length > 0 ? record.resultClass : base.resultClass;
  const evidenceRefs = Array.isArray(record.evidenceRefs)
    ? record.evidenceRefs.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 512)
    : base.evidenceRefs;
  const outputBytes =
    typeof record.outputBytes === 'number' && Number.isFinite(record.outputBytes) && record.outputBytes >= 0
      ? Math.floor(record.outputBytes)
      : base.outputBytes;
  const untrusted = Array.isArray(record.untrusted) ? (record.untrusted as UntrustedEnvelope[]) : base.untrusted;
  return { ok: record.ok !== false, resultClass, evidenceRefs, outputBytes, untrusted };
}

/** Injected tool execution port. Implemented outside Lane A. */
export interface AgentToolExecutor {
  execute(call: AgentToolCall): Promise<AgentToolResult>;
}

export interface AgentRuntimeDeps {
  readonly campaignId: string;
  readonly budgetPolicy: AgentBudgetPolicy;
  readonly reasoner: ReasonerDriver;
  readonly tools: AgentToolExecutor;
  /** Defaults to ['LOCAL']. DEV/NEXT are never authorized by this lane. */
  readonly authorizedEnvironments?: readonly AgentToolEnvironment[];
  readonly allowedToolIds?: readonly AgentToolId[];
  /** Local turn cap (default 50). Exceeding it terminates NO_PROGRESS. */
  readonly maxTurns?: number;
  readonly now?: () => number;
}

export interface RestoredRuntimeData {
  readonly state: AgentRuntimeState;
  readonly completedTurns: number;
}

export interface AgentRuntimeResumeDeps extends AgentRuntimeDeps {
  readonly restored: RestoredRuntimeData;
}

export interface AgentRunOptions {
  readonly maxTurns?: number;
}

export interface AgentRunResult {
  readonly terminationReason: AgentTerminationReason;
  readonly state: AgentRuntimeState;
  /**
   * Present for PAUSED and BUDGET_EXHAUSTED terminations so the campaign can
   * resume; null for terminal outcomes with no resume path.
   */
  readonly checkpoint: AgentCheckpoint | null;
}

export type AgentRuntimeStatusView = AgentRuntimeState['status'];

export interface AgentBudgetView {
  readonly policy: AgentBudgetPolicy;
  readonly usage: AgentBudgetUsage;
}
