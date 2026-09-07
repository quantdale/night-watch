// ---------------------------------------------------------------------------
// Lane A checkpoint codec. Checkpoints carry only digests, refs, and ids —
// never raw tool arguments, untrusted bytes, or credentials. Parsing is
// fail-closed: any structural or secret violation throws AgentCheckpointError.
// ---------------------------------------------------------------------------

import {
  AGENT_BUDGET_VERSION,
  AGENT_BUDGET_VERSION_V1,
  AGENT_BUDGET_CEILINGS,
  AGENT_BYTE_LEDGER_COUNT_KEYS,
  AGENT_BYTE_LEDGER_VERSION,
  AGENT_CHECKPOINT_VERSION,
  AGENT_PHASES,
  AGENT_RUNTIME_STATE_VERSION,
  AGENT_RUNTIME_STATUSES,
  chargedInputBytes,
  chargedOutputBytes,
  chargedToolPayloadBytes,
  defaultAgentBudgetPolicy,
  isActionFailureDisposition,
  isAgentByteLedger,
  legacyAgentByteLedger,
  type AgentBudgetCeilingName,
  type AgentByteLedger,
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
/**
 * Lane D v1 -> v2 budget migration rule.
 *
 * A v1 `outputBytes` total is provider transport AND tool payload mixed
 * together — that conflation is the defect v2 fixes, so the total is not a v2
 * `outputBytes` value and cannot stay there. Every byte still has to be
 * charged, so the mixed total moves whole into the tool-payload dimension:
 * measurement of a real campaign put local tool payload at 99.8 % of it
 * (2 950 229 B of 2 957 398 B), and the payload ceiling is the dimension
 * scaled for that traffic. The cost is that a resumed v1 campaign starts with
 * a fresh transport allowance, understating transport by at most the small
 * amount it had already spent; the alternative — charging megabytes of source
 * reads against a transport ceiling sized in hundreds of kilobytes — would
 * make every pre-v2 checkpoint resume straight into BUDGET_EXHAUSTED.
 * Nothing is dropped and nothing is double counted.
 */
const V1_POLICY_KEYS = [
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
] as const;

const V1_USAGE_KEYS = [
  'wallTimeMs',
  'reasonerCalls',
  'inputBytes',
  'outputBytes',
  'toolActions',
  'candidateCount',
  'retries',
  'consecutiveFailures',
  'providerFailures',
] as const;

function parseBudgetSnapshot(value: unknown, where: string): AgentCheckpoint['state']['budget'] {
  if (!isRecord(value) || !isRecord(value.policy) || !isRecord(value.usage)) {
    throw new AgentCheckpointError('CORRUPT', `${where}.budget is not a policy/usage pair`);
  }
  const policy = value.policy;
  if (policy.schemaVersion === AGENT_BUDGET_VERSION_V1) {
    for (const key of V1_POLICY_KEYS) {
      if (!isFiniteNumber(policy[key])) throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy.${key} is invalid`);
    }
    if (typeof policy.ceilingName !== 'string') throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy.ceilingName is invalid`);
    // The new dimension's ceiling must be derivable: an unknown tier cannot
    // migrate honestly, so it fails closed instead of guessing a ceiling.
    if (!Object.prototype.hasOwnProperty.call(AGENT_BUDGET_CEILINGS, policy.ceilingName)) {
      throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy.ceilingName is not a known tier`);
    }
    const usage = value.usage;
    for (const key of V1_USAGE_KEYS) {
      if (!isFiniteNumber(usage[key])) throw new AgentCheckpointError('CORRUPT', `${where}.budget.usage.${key} is invalid`);
    }
    const tier = policy.ceilingName as AgentBudgetCeilingName;
    const defaults = defaultAgentBudgetPolicy(tier);
    return {
      policy: {
        ...policy,
        schemaVersion: AGENT_BUDGET_VERSION,
        outputBytes: defaults.outputBytes,
        toolPayloadBytes: defaults.toolPayloadBytes,
      },
      usage: { ...usage, outputBytes: 0, toolPayloadBytes: usage.outputBytes },
    } as unknown as AgentCheckpoint['state']['budget'];
  }
  if (policy.schemaVersion !== AGENT_BUDGET_VERSION) {
    throw new AgentCheckpointError('CORRUPT', `${where}.budget.policy has an unknown schema version`);
  }
  for (const key of [
    'wallTimeMs',
    'reasonerCalls',
    'inputBytes',
    'outputBytes',
    'toolPayloadBytes',
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
    'toolPayloadBytes',
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
    // W8 additive fields. Absent is valid (pre-W8 checkpoints resume);
    // present-but-malformed is corrupt, never silently discarded.
    if (item.target !== undefined && item.target !== null && typeof item.target !== 'string') {
      throw new AgentCheckpointError('CORRUPT', 'state.actionLog entry target is invalid');
    }
    if (item.salient !== undefined && !isStringArray(item.salient)) {
      throw new AgentCheckpointError('CORRUPT', 'state.actionLog entry salient is invalid');
    }
    // W9 additive disposition. Absent or null is valid (pre-W9 checkpoints
    // and successes resume); a present-but-unknown value is corrupt, never
    // silently coerced, so a forged retry label cannot resume.
    if (item.disposition !== undefined && item.disposition !== null && !isActionFailureDisposition(item.disposition)) {
      throw new AgentCheckpointError('CORRUPT', 'state.actionLog entry disposition is invalid');
    }
  }
  if (value.knownTargets !== undefined && !isStringArray(value.knownTargets)) {
    throw new AgentCheckpointError('CORRUPT', 'state.knownTargets is invalid');
  }
  // Byte ledger (additive across W9 and Lane D). Absent is valid (pre-W9
  // checkpoints resume with explicit legacy carry); present-but-malformed is
  // corrupt, never silently zeroed. A present ledger must also reconcile
  // EXACTLY with the frozen cumulative budget totals, so a forged or drifted
  // component breakdown can never resume as authority for a ceiling decision.
  // A v1-budget checkpoint validates its v1-shaped ledger under v1 arithmetic
  // (transport and tool bytes both charged under `outputBytes`) and resumes
  // through the exact legacy-carry rebuild, where that mixed total becomes
  // payload carry per the migration rule above.
  const budgetIsV1 =
    isRecord(value.budget) &&
    isRecord(value.budget.policy) &&
    value.budget.policy.schemaVersion === AGENT_BUDGET_VERSION_V1;
  if (value.byteLedger !== undefined && value.byteLedger !== null) {
    if (budgetIsV1) {
      if (!isV1ByteLedger(value.byteLedger)) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger is invalid');
      }
      const budget = parseBudgetSnapshot(value.budget, 'state');
      if (chargedInputBytes(value.byteLedger) !== budget.usage.inputBytes) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger charged input does not reconcile with budget usage');
      }
      // v1 arithmetic: transport plus tool payload equal the mixed v1 total,
      // which migration has already moved into the payload dimension.
      if (
        chargedOutputBytes(value.byteLedger) + value.byteLedger.toolResultBytes !== budget.usage.toolPayloadBytes
      ) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger charged output does not reconcile with budget usage');
      }
    } else {
      if (!isAgentByteLedger(value.byteLedger)) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger is invalid');
      }
      const budget = parseBudgetSnapshot(value.budget, 'state');
      if (chargedInputBytes(value.byteLedger) !== budget.usage.inputBytes) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger charged input does not reconcile with budget usage');
      }
      if (chargedOutputBytes(value.byteLedger) !== budget.usage.outputBytes) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger charged output does not reconcile with budget usage');
      }
      if (chargedToolPayloadBytes(value.byteLedger) !== budget.usage.toolPayloadBytes) {
        throw new AgentCheckpointError('CORRUPT', 'state.byteLedger charged tool payload does not reconcile with budget usage');
      }
    }
  }
  if (!isStringArray(value.evidenceRefs)) throw new AgentCheckpointError('CORRUPT', 'state.evidenceRefs is invalid');
  if (!isStringArray(value.candidateIds)) throw new AgentCheckpointError('CORRUPT', 'state.candidateIds is invalid');
  if (!(typeof value.terminationReason === 'string' || value.terminationReason === null)) {
    throw new AgentCheckpointError('CORRUPT', 'state.terminationReason is invalid');
  }
  // Return the migrated budget pair (identity for v2): resume must see the
  // toolPayloadBytes dimension even when the persisted document predates it.
  // A v1 budget additionally rebuilds the ledger as exact legacy carry: its
  // component breakdown is ambiguous once the dimensions are split, so the
  // migrated totals move into carry and the returned document re-parses
  // cleanly under v2 arithmetic (idempotent parse).
  const budget = parseBudgetSnapshot(value.budget, 'state');
  if (!budgetIsV1) return { ...value, budget } as unknown as AgentRuntimeState;
  return {
    ...value,
    budget,
    byteLedger: legacyAgentByteLedger(budget.usage.inputBytes, budget.usage.outputBytes, budget.usage.toolPayloadBytes),
  } as unknown as AgentRuntimeState;
}

/**
 * v1-shaped ledger guard for the migration path: every v2 count key except
 * the additive legacyToolPayloadBytes must be a safe non-negative integer.
 * A v1 ledger failing even this stays corrupt; it is never coerced.
 */
function isV1ByteLedger(value: unknown): value is AgentByteLedger {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== AGENT_BYTE_LEDGER_VERSION) return false;
  for (const key of AGENT_BYTE_LEDGER_COUNT_KEYS) {
    if (key === 'legacyToolPayloadBytes') continue;
    const entry = record[key];
    if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry < 0) return false;
  }
  return true;
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

/**
 * Bound on the checkpoint-byte fixed-point search. Each iteration can only
 * grow the recorded value's decimal width by one digit, so convergence is
 * reached far below this bound for any representable byte count.
 */
const CHECKPOINT_BYTES_FIXED_POINT_ITERATIONS = 24;

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function ledgerOf(state: AgentRuntimeState): AgentByteLedger {
  return isAgentByteLedger(state.byteLedger)
    ? state.byteLedger
    : legacyAgentByteLedger(state.budget.usage.inputBytes, state.budget.usage.outputBytes, state.budget.usage.toolPayloadBytes);
}

function withCheckpointBytes(
  state: AgentRuntimeState,
  ledger: AgentByteLedger,
  checkpointBytes: number,
): AgentRuntimeState {
  return { ...state, byteLedger: { ...ledger, checkpointBytes } };
}

/**
 * Build one accounted checkpoint document.
 *
 * `checkpointBytes` counts the exact UTF-8 size of every checkpoint document
 * this codec has produced for the campaign, including the one being built.
 * Because the count lives inside the document it measures, it is resolved as
 * the least fixed point of `bytes = priorBytes + size(document(bytes))`,
 * iterated from below: the search is deterministic, terminates, and never
 * depends on serialization order or wall-clock state. Checkpoint bytes are
 * local storage, never model I/O, so they are measured only and are never
 * charged into `usage.inputBytes`/`usage.outputBytes`.
 *
 * A campaign envelope that embeds this checkpoint carries its own framing;
 * that framing is deliberately outside this fixed point, so the value stays
 * a property of the checkpoint codec rather than of any wrapper.
 */
export function finalizeCheckpoint(state: AgentRuntimeState, resumeCursor: string): AgentCheckpoint {
  const ledger = ledgerOf(state);
  const priorBytes = ledger.checkpointBytes;
  let bytes = priorBytes;
  let converged = false;
  for (let iteration = 0; iteration < CHECKPOINT_BYTES_FIXED_POINT_ITERATIONS; iteration += 1) {
    const candidate: AgentCheckpoint = {
      schemaVersion: AGENT_CHECKPOINT_VERSION,
      campaignId: state.campaignId,
      state: withCheckpointBytes(state, ledger, bytes),
      resumeCursor,
    };
    const measured = priorBytes + utf8Bytes(JSON.stringify(candidate));
    if (measured === bytes) {
      converged = true;
      break;
    }
    bytes = measured;
  }
  if (!converged) {
    throw new AgentCheckpointError('CORRUPT', 'checkpoint byte measurement did not converge');
  }
  const checkpoint: AgentCheckpoint = {
    schemaVersion: AGENT_CHECKPOINT_VERSION,
    campaignId: state.campaignId,
    state: withCheckpointBytes(state, ledger, bytes),
    resumeCursor,
  };
  assertCheckpointHasNoSecrets(checkpoint);
  return checkpoint;
}

export function createCheckpoint(state: AgentRuntimeState, completedTurns: number): AgentCheckpoint {
  return finalizeCheckpoint(state, resumeCursorFor(state.campaignId, completedTurns));
}
