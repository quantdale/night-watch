// ---------------------------------------------------------------------------
// Autonomous AgentRuntime state machine freeze.
// Lane A implements the loop. Lane H is merged into Lane A.
// This module is types + budget arithmetic only. No I/O.
// ---------------------------------------------------------------------------

import { AGENT_BUDGET_VERSION, AGENT_CHECKPOINT_VERSION, AGENT_RUNTIME_STATE_VERSION } from './versions';

export { AGENT_BUDGET_VERSION, AGENT_CHECKPOINT_VERSION, AGENT_RUNTIME_STATE_VERSION };

export const AGENT_PHASES = [
  'PLAN',
  'OBSERVE',
  'ANALYZE',
  'HYPOTHESIZE',
  'VERIFY',
  'TRIAGE',
  'REPLAN',
] as const;
export type AgentPhase = (typeof AGENT_PHASES)[number];

export const AGENT_RUNTIME_STATUSES = [
  'READY',
  'RUNNING',
  'PAUSED',
  'CHECKPOINTING',
  'TERMINATED',
] as const;
export type AgentRuntimeStatus = (typeof AGENT_RUNTIME_STATUSES)[number];

export const AGENT_BUDGET_CEILINGS = {
  HOUR_1: 3_600_000,
  HOUR_4: 14_400_000,
  HOUR_8: 28_800_000,
  OVERNIGHT: 43_200_000,
} as const;
export type AgentBudgetCeilingName = keyof typeof AGENT_BUDGET_CEILINGS;

export interface AgentBudgetPolicy {
  readonly schemaVersion: typeof AGENT_BUDGET_VERSION;
  readonly ceilingName: AgentBudgetCeilingName;
  readonly wallTimeMs: number;
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly toolActions: number;
  readonly perActionTimeoutMs: number;
  readonly candidateCap: number;
  readonly retries: number;
  readonly consecutiveFailures: number;
  readonly providerFailures: number;
}

export interface AgentBudgetUsage {
  readonly wallTimeMs: number;
  readonly reasonerCalls: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly toolActions: number;
  readonly candidateCount: number;
  readonly retries: number;
  readonly consecutiveFailures: number;
  readonly providerFailures: number;
}

export interface AgentBudgetSnapshot {
  readonly policy: AgentBudgetPolicy;
  readonly usage: AgentBudgetUsage;
}

export const ZERO_AGENT_BUDGET_USAGE: AgentBudgetUsage = Object.freeze({
  wallTimeMs: 0,
  reasonerCalls: 0,
  inputBytes: 0,
  outputBytes: 0,
  toolActions: 0,
  candidateCount: 0,
  retries: 0,
  consecutiveFailures: 0,
  providerFailures: 0,
});

export function defaultAgentBudgetPolicy(ceilingName: AgentBudgetCeilingName): AgentBudgetPolicy {
  return {
    schemaVersion: AGENT_BUDGET_VERSION,
    ceilingName,
    wallTimeMs: AGENT_BUDGET_CEILINGS[ceilingName],
    reasonerCalls: 200,
    inputBytes: 8_000_000,
    outputBytes: 2_000_000,
    toolActions: 400,
    perActionTimeoutMs: 120_000,
    candidateCap: 20,
    retries: 8,
    consecutiveFailures: 6,
    providerFailures: 8,
  };
}

export type BudgetExhaustionDecision = 'CONTINUE' | 'SAFE_TERMINATION_CHECKPOINT';

export function classifyBudgetExhaustion(policy: AgentBudgetPolicy, usage: AgentBudgetUsage): BudgetExhaustionDecision {
  if (usage.wallTimeMs >= policy.wallTimeMs) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.reasonerCalls >= policy.reasonerCalls) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.inputBytes >= policy.inputBytes) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.outputBytes >= policy.outputBytes) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.toolActions >= policy.toolActions) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.candidateCount >= policy.candidateCap) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.retries >= policy.retries) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.consecutiveFailures >= policy.consecutiveFailures) return 'SAFE_TERMINATION_CHECKPOINT';
  if (usage.providerFailures >= policy.providerFailures) return 'SAFE_TERMINATION_CHECKPOINT';
  return 'CONTINUE';
}

export interface AgentHypothesis {
  readonly hypothesisId: string;
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
  readonly status: 'OPEN' | 'SUPPORTED' | 'DISPROVED';
}

export interface AgentActionRecord {
  readonly turnId: string;
  readonly phase: AgentPhase;
  readonly intentKind: string;
  readonly toolId: string | null;
  readonly argumentDigest: string | null;
  readonly resultClass: string;
  readonly evidenceRefs: readonly string[];
}

export interface AgentRuntimeState {
  readonly schemaVersion: typeof AGENT_RUNTIME_STATE_VERSION;
  readonly campaignId: string;
  readonly status: AgentRuntimeStatus;
  readonly phase: AgentPhase;
  readonly hypotheses: readonly AgentHypothesis[];
  readonly actionLog: readonly AgentActionRecord[];
  readonly evidenceRefs: readonly string[];
  readonly candidateIds: readonly string[];
  readonly budget: AgentBudgetSnapshot;
  readonly terminationReason: string | null;
}

export interface AgentCheckpoint {
  readonly schemaVersion: typeof AGENT_CHECKPOINT_VERSION;
  readonly campaignId: string;
  readonly state: AgentRuntimeState;
  readonly resumeCursor: string;
}

export const NO_PROGRESS_REPEAT_LIMIT = 3 as const;

export function actionFingerprint(record: Pick<AgentActionRecord, 'intentKind' | 'toolId' | 'argumentDigest'>): string {
  return `${record.intentKind}|${record.toolId ?? ''}|${record.argumentDigest ?? ''}`;
}

export function detectRepeatedAction(
  history: readonly AgentActionRecord[],
  next: Pick<AgentActionRecord, 'intentKind' | 'toolId' | 'argumentDigest'>,
  limit: number = NO_PROGRESS_REPEAT_LIMIT,
): boolean {
  const fingerprint = actionFingerprint(next);
  let streak = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (actionFingerprint(history[index]!) !== fingerprint) break;
    streak += 1;
    if (streak >= limit) return true;
  }
  return false;
}

export function detectNoProgress(history: readonly AgentActionRecord[], windowSize: number = 6): boolean {
  if (history.length < windowSize) return false;
  const window = history.slice(-windowSize);
  const producedEvidence = window.some((record) => record.evidenceRefs.length > 0 || record.resultClass === 'CANDIDATE_PROPOSED' || record.resultClass === 'CANDIDATE_REJECTED');
  if (producedEvidence) return false;
  const fingerprints = window.map((record) => actionFingerprint(record));
  return fingerprints.every((value) => value === fingerprints[0]);
}
