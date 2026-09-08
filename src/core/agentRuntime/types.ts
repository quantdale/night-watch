// ---------------------------------------------------------------------------
// Lane A ports: the tool-executor contract injected into AgentRuntime.
// Interfaces only. Tool implementation is owned by Lane C (agentTools);
// CLI transport is owned by Lane B (reasoner). This module never spawns a
// process and never touches the network.
// ---------------------------------------------------------------------------

import { OWNER_LOCAL_EXECUTOR_KINDS } from '../ownerLocalReproduction/contracts';
import {
  SURFACE_CAPS,
  SURFACE_READINESS_CLASSES,
  SURFACE_REFUSAL_CLASSES,
  type ReproductionSurfaceEntry,
} from '../reproductionSurface/contracts';
import {
  normalizeActionFailureDisposition,
  type ActionFailureDisposition,
  type AgentBudgetPolicy,
  type AgentBudgetUsage,
  type AgentCheckpoint,
  type AgentRuntimeState,
  type AgentTerminationReason,
  type AgentToolEnvironment,
  type AgentToolId,
  type ReasonerDriver,
  type UntrustedEnvelope,
} from '../agentProtocol';
import type { CampaignStrategyState } from '../investigationMemory/types';

export type { ReasonerDriver };
export type { CampaignStrategyState };

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
  /**
   * W8: bounded, sanitized facts the executor contributes to reasoner-visible
   * working memory. Optional; a legacy executor simply contributes nothing.
   */
  readonly memory?: AgentToolMemoryFacts;
  /**
   * W9: host-owned disposition of a FAILED action, set by the injected
   * executor only. Never read from reasoner intents. Absent on successes
   * and on legacy executors (absence reads as DETERMINISTIC_TERMINAL).
   */
  readonly disposition?: ActionFailureDisposition | null;
}

/**
 * Executor-confirmed memory facts. The executor is the authority here: the
 * runtime never derives a target from raw model arguments, so working memory
 * can only ever name something the host actually resolved.
 */
export interface AgentToolMemoryFacts {
  /** Authoritative subject of the action: approved source path, reproduction source path, or proposal candidate id. */
  readonly target?: string | null;
  /** Approved targets enumerated by this action (bounded index results). */
  readonly availableTargets?: readonly string[];
  /** Salient symbols extracted from material already delivered to the reasoner. */
  readonly salient?: readonly string[];
  /**
   * W10 capability annotation for targets this action enumerated. Executor
   * supplied and host derived: the runtime validates every field against the
   * frozen vocabularies, so a malformed or invented readiness is dropped
   * rather than believed.
   */
  readonly reproductionSurface?: readonly ReproductionSurfaceEntry[];
}

/** Caps applied to executor-supplied memory facts. Over-cap input is truncated, never trusted. */
export const TOOL_MEMORY_CAPS = Object.freeze({
  targetChars: 200,
  availableTargets: 32,
  salient: 4,
  salientChars: 64,
  reproductionSurface: SURFACE_CAPS.entries,
});

const TOOL_MEMORY_SECRET_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

function boundedMemoryString(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) return null;
  return TOOL_MEMORY_SECRET_RE.test(value) ? null : value;
}

function boundedMemoryList(value: unknown, max: number, charCap: number): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= max) break;
    const bounded = boundedMemoryString(item, charCap);
    if (bounded === null || out.includes(bounded)) continue;
    out.push(bounded);
  }
  return out.length === 0 ? undefined : Object.freeze(out);
}

/**
 * Fail-closed surface normalization. Every entry must satisfy the complete
 * readiness tuple from the shared surface contract, or it is dropped:
 * `EXECUTABLE_NOW` requires a valid target id plus a non-null executor plus
 * a null refusal; `NOT_EXECUTABLE` requires a null target id/executor plus a
 * non-null valid refusal; `UNKNOWN` requires all three null. A malformed or
 * coerced target id (non-string, empty, oversize, secret-shaped, or not a
 * surface digest) is dropped rather than coerced to null: capability is a
 * host fact, so an entry that cannot be validated is discarded rather than
 * downgraded into a plausible-looking one.
 */
const SURFACE_TARGET_ID_RE = /^surface:sha256:[0-9a-f]{24}$/;
export function normalizeSurfaceEntries(value: unknown): readonly ReproductionSurfaceEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: ReproductionSurfaceEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (out.length >= TOOL_MEMORY_CAPS.reproductionSurface) break;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const sourcePath = boundedMemoryString(record.sourcePath, TOOL_MEMORY_CAPS.targetChars);
    if (sourcePath === null || seen.has(sourcePath)) continue;
    const readiness = record.readiness;
    if (typeof readiness !== 'string' || !SURFACE_READINESS_CLASSES.includes(readiness as never)) continue;
    const refusalRaw = record.refusal;
    const refusal =
      refusalRaw === null || refusalRaw === undefined
        ? null
        : typeof refusalRaw === 'string' && SURFACE_REFUSAL_CLASSES.includes(refusalRaw as never)
          ? (refusalRaw as ReproductionSurfaceEntry['refusal'])
          : undefined;
    if (refusal === undefined) continue;
    const executorRaw = record.executorClass;
    const executorClass =
      executorRaw === null || executorRaw === undefined
        ? null
        : typeof executorRaw === 'string' && OWNER_LOCAL_EXECUTOR_KINDS.includes(executorRaw as never)
          ? (executorRaw as ReproductionSurfaceEntry['executorClass'])
          : undefined;
    if (executorClass === undefined) continue;
    const targetIdRaw = record.targetId;
    let targetId: string | null;
    if (targetIdRaw === null || targetIdRaw === undefined) {
      targetId = null;
    } else if (typeof targetIdRaw !== 'string') {
      continue;
    } else if (boundedMemoryString(targetIdRaw, TOOL_MEMORY_CAPS.targetChars) === null) {
      continue;
    } else {
      targetId = targetIdRaw;
    }
    if (readiness === 'EXECUTABLE_NOW') {
      if (executorClass === null || refusal !== null) continue;
      if (targetId === null || !SURFACE_TARGET_ID_RE.test(targetId)) continue;
    } else if (readiness === 'NOT_EXECUTABLE') {
      if (executorClass !== null || refusal === null || targetId !== null) continue;
    } else {
      if (executorClass !== null || refusal !== null || targetId !== null) continue;
    }
    seen.add(sourcePath);
    out.push(Object.freeze({ sourcePath, readiness: readiness as ReproductionSurfaceEntry['readiness'], executorClass, refusal, targetId }));
  }
  return out.length === 0 ? undefined : Object.freeze(out);
}

/** Fail-closed normalization: malformed, oversize or secret-shaped facts are dropped. */
export function normalizeToolMemoryFacts(value: unknown): AgentToolMemoryFacts | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const target = boundedMemoryString(record.target, TOOL_MEMORY_CAPS.targetChars);
  const availableTargets = boundedMemoryList(
    record.availableTargets,
    TOOL_MEMORY_CAPS.availableTargets,
    TOOL_MEMORY_CAPS.targetChars,
  );
  const salient = boundedMemoryList(record.salient, TOOL_MEMORY_CAPS.salient, TOOL_MEMORY_CAPS.salientChars);
  const reproductionSurface = normalizeSurfaceEntries(record.reproductionSurface);
  if (
    target === null &&
    availableTargets === undefined &&
    salient === undefined &&
    reproductionSurface === undefined
  ) {
    return undefined;
  }
  const facts: Record<string, unknown> = {};
  if (target !== null) facts.target = target;
  if (availableTargets !== undefined) facts.availableTargets = availableTargets;
  if (salient !== undefined) facts.salient = salient;
  if (reproductionSurface !== undefined) facts.reproductionSurface = reproductionSurface;
  return Object.freeze(facts) as AgentToolMemoryFacts;
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
  const memory = normalizeToolMemoryFacts(record.memory);
  // W9: trusted only because it arrives over the injected executor port, never
  // from reasoner intents. Strict frozen-enum match; unknown values are
  // dropped to absence (which exhaustion reads as DETERMINISTIC_TERMINAL).
  const disposition = normalizeActionFailureDisposition(record.disposition);
  return {
    ok: record.ok !== false,
    resultClass,
    evidenceRefs,
    outputBytes,
    untrusted,
    ...(memory === undefined ? {} : { memory }),
    ...(disposition === undefined ? {} : { disposition }),
  };
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
  /**
   * W10: host-supplied campaign-carried reproduction capability for a fresh
   * run, so a new investigation does not rediscover executability from zero.
   * Bounded by `TOOL_MEMORY_CAPS.reproductionSurface` and validated by the
   * same fail-closed readiness-tuple rule as executor-supplied memory facts;
   * malformed or incoherent entries are dropped, never trusted. Fresh-run
   * deps only: resume restores capability from the checkpoint state itself.
   */
  readonly priorSurface?: readonly ReproductionSurfaceEntry[];
  /**
   * W8: bounded campaign strategy carried in from earlier investigations of the
   * same campaign, so a fresh investigation does not restart from zero. Purely
   * informational: it grants no authority and is re-validated by its own
   * fail-closed parser before it is persisted or restored.
   */
  readonly priorStrategy?: CampaignStrategyState | null;
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
