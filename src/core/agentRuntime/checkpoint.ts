// ---------------------------------------------------------------------------
// Lane A checkpoint codec. Checkpoints carry only digests, refs, and ids —
// never raw tool arguments, untrusted bytes, or credentials. Parsing is
// fail-closed: any structural or secret violation throws AgentCheckpointError.
// ---------------------------------------------------------------------------

import {
  AGENT_BUDGET_VERSION,
  AGENT_CHECKPOINT_VERSION,
  AGENT_PHASES,
  AGENT_RUNTIME_STATE_VERSION,
  AGENT_RUNTIME_STATUSES,
  type AgentCheckpoint,
  type AgentPhase,
  type AgentRuntimeState,
  type AgentRuntimeStatus,
} from '../agentProtocol';

export type AgentCheckpointFailureCode = 'CORRUPT' | 'SECRET_DETECTED' | 'CAMPAIGN_MISMATCH';

export class AgentCheckpointError extends Error {
  readonly code: AgentCheckpointFailureCode;

  constructor(code: AgentCheckpointFailureCode, detail: string) {
    super(`AGENT_CHECKPOINT_${code}: ${detail}`);
    this.name = 'AgentCheckpointError';
    this.code = code;
  }
}

/** Resume cursor codec: `<campaignId>:turn:<completedTurns>`. */
export function resumeCursorFor(campaignId: string, completedTurns: number): string {
  return `${campaignId}:turn:${completedTurns}`;
}

export function parseResumeCursor(cursor: unknown, campaignId: string): number {
  if (typeof cursor !== 'string' || cursor.length === 0 || cursor.length > 512) {
    throw new AgentCheckpointError('CORRUPT', 'resumeCursor must be a non-empty string');
  }
  const marker = ':turn:';
  const pivot = cursor.lastIndexOf(marker);
  if (pivot <= 0) throw new AgentCheckpointError('CORRUPT', 'resumeCursor has no turn marker');
  const owner = cursor.slice(0, pivot);
  if (owner !== campaignId) throw new AgentCheckpointError('CAMPAIGN_MISMATCH', 'checkpoint belongs to another campaign');
  const turns = Number(cursor.slice(pivot + marker.length));
  if (!Number.isInteger(turns) || turns < 0 || turns > 1_000_000) {
    throw new AgentCheckpointError('CORRUPT', 'resumeCursor turn counter is not a valid integer');
  }
  return turns;
}

// Mirrors the protocol SECRET_RE plus credential-key shapes. Checkpoints must
// never contain bearer tokens, private keys, AKIA ids, JWT segments, or
// credential/customer-secret material under any key.
const CHECKPOINT_SECRET_VALUE_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
const CHECKPOINT_SECRET_KEY_RE = /"(?:[^"\\]*)(?:credential|cookie|token|secret|password|api[_-]?key|auth)(?:[^"\\]*)"\s*:/i;
const CHECKPOINT_CUSTOMER_SECRET_RE = /customer[_-]?secret/i;

export function assertCheckpointHasNoSecrets(checkpoint: AgentCheckpoint): void {
  const serialized = JSON.stringify(checkpoint);
  if (CHECKPOINT_SECRET_VALUE_RE.test(serialized)) {
    throw new AgentCheckpointError('SECRET_DETECTED', 'checkpoint contains token or key material');
  }
  if (CHECKPOINT_SECRET_KEY_RE.test(serialized)) {
    throw new AgentCheckpointError('SECRET_DETECTED', 'checkpoint contains credential-shaped keys');
  }
  if (CHECKPOINT_CUSTOMER_SECRET_RE.test(serialized)) {
    throw new AgentCheckpointError('SECRET_DETECTED', 'checkpoint contains customer-secret material');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPhase(value: unknown): value is AgentPhase {
  return typeof value === 'string' && (AGENT_PHASES as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is AgentRuntimeStatus {
  return typeof value === 'string' && (AGENT_RUNTIME_STATUSES as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseBudgetSnapshot(value: unknown, where: string): AgentCheckpoint['state']['budget'] {
  if (!isRecord(value) || !isRecord(value.policy) || !isRecord(value.usage)) {
    throw new AgentCheckpointError('CORRUPT', `${where}.budget is not a policy/usage pair`);
  }
  const policy = value.policy;
  if (policy.schemaVersion !== AGENT_BUDGET_VERSION) {
    throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy has an unknown schema version`);
  }
  for (const key of [
    'wallTimeMs',
    'reasonerCalls',
    'inputBytes',
    'outputBytes',
    'toolActions',
    'perActionTimeoutMs',
    'candidateCap',
    'retries',
    'consecutiveFailures',
    'providerFailures',
  ] as const) {
    if (!isFiniteNumber(policy[key])) throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy.${key} is invalid`);
  }
  if (typeof policy.ceilingName !== 'string') throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy.ceilingName is invalid`);
  const usage = value.usage;
  for (const key of [
    'wallTimeMs',
    'reasonerCalls',
    'inputBytes',
    'outputBytes',
    'toolActions',
    'candidateCount',
    'retries',
    'consecutiveFailures',
    'providerFailures',
  ] as const) {
    if (!isFiniteNumber(usage[key])) throw new AgentCheckpointError('CORRUPT', `${where}.budget.usage.${key} is invalid`);
  }
  return value as unknown as AgentCheckpoint['state']['budget'];
}

function parseRuntimeState(value: unknown): AgentRuntimeState {
  if (!isRecord(value)) throw new AgentCheckpointError('CORRUPT', 'state is not an object');
  if (value.schemaVersion !== AGENT_RUNTIME_STATE_VERSION) {
    throw new AgentCheckpointError('CORRUPT', 'state has an unknown schema version');
  }
  if (typeof value.campaignId !== 'string' || value.campaignId.length === 0) {
    throw new AgentCheckpointError('CORRUPT', 'state.campaignId is invalid');
  }
  if (!isStatus(value.status)) throw new AgentCheckpointError('CORRUPT', 'state.status is invalid');
  if (!isPhase(value.phase)) throw new AgentCheckpointError('CORRUPT', 'state.phase is invalid');
  if (!Array.isArray(value.hypotheses)) throw new AgentCheckpointError('CORRUPT', 'state.hypotheses is invalid');
  for (const item of value.hypotheses) {
    if (!isRecord(item) || typeof item.hypothesisId !== 'string' || typeof item.statement !== 'string' || !Array.isArray(item.evidenceRefs)) {
      throw new AgentCheckpointError('CORRUPT', 'state.hypotheses entry is invalid');
    }
  }
  if (!Array.isArray(value.actionLog)) throw new AgentCheckpointError('CORRUPT', 'state.actionLog is invalid');
  for (const item of value.actionLog) {
    if (
      !isRecord(item) ||
      typeof item.turnId !== 'string' ||
      !isPhase(item.phase) ||
      typeof item.intentKind !== 'string' ||
      !(typeof item.toolId === 'string' || item.toolId === null) ||
      !(typeof item.argumentDigest === 'string' || item.argumentDigest === null) ||
      typeof item.resultClass !== 'string' ||
      !isStringArray(item.evidenceRefs)
    ) {
      throw new AgentCheckpointError('CORRUPT', 'state.actionLog entry is invalid');
    }
  }
  if (!isStringArray(value.evidenceRefs)) throw new AgentCheckpointError('CORRUPT', 'state.evidenceRefs is invalid');
  if (!isStringArray(value.candidateIds)) throw new AgentCheckpointError('CORRUPT', 'state.candidateIds is invalid');
  if (!(typeof value.terminationReason === 'string' || value.terminationReason === null)) {
    throw new AgentCheckpointError('CORRUPT', 'state.terminationReason is invalid');
  }
  parseBudgetSnapshot(value.budget, 'state');
  return value as unknown as AgentRuntimeState;
}

/** Fail-closed checkpoint parser. Unknown shapes never resume. */
export function parseCheckpoint(value: unknown): AgentCheckpoint {
  if (!isRecord(value)) throw new AgentCheckpointError('CORRUPT', 'checkpoint is not an object');
  if (value.schemaVersion !== AGENT_CHECKPOINT_VERSION) {
    throw new AgentCheckpointError('CORRUPT', 'checkpoint has an unknown schema version');
  }
  if (typeof value.campaignId !== 'string' || value.campaignId.length === 0) {
    throw new AgentCheckpointError('CORRUPT', 'checkpoint campaignId is invalid');
  }
  if (typeof value.resumeCursor !== 'string' || value.resumeCursor.length === 0) {
    throw new AgentCheckpointError('CORRUPT', 'checkpoint resumeCursor is invalid');
  }
  const state = parseRuntimeState(value.state);
  if (state.campaignId !== value.campaignId) {
    throw new AgentCheckpointError('CAMPAIGN_MISMATCH', 'checkpoint state belongs to another campaign');
  }
  // The cursor must at least be well-formed; campaign binding is checked by
  // the caller through parseResumeCursor.
  if (typeof value.resumeCursor !== 'string' || !value.resumeCursor.includes(':turn:')) {
    throw new AgentCheckpointError('CORRUPT', 'checkpoint resumeCursor is malformed');
  }
  const checkpoint: AgentCheckpoint = {
    schemaVersion: AGENT_CHECKPOINT_VERSION,
    campaignId: value.campaignId,
    state,
    resumeCursor: value.resumeCursor,
  };
  assertCheckpointHasNoSecrets(checkpoint);
  return checkpoint;
}

export function createCheckpoint(state: AgentRuntimeState, completedTurns: number): AgentCheckpoint {
  const checkpoint: AgentCheckpoint = {
    schemaVersion: AGENT_CHECKPOINT_VERSION,
    campaignId: state.campaignId,
    state,
    resumeCursor: resumeCursorFor(state.campaignId, completedTurns),
  };
  assertCheckpointHasNoSecrets(checkpoint);
  return checkpoint;
}
