// ---------------------------------------------------------------------------
// Fail-closed protocol validators. Unknown/unsafe/malformed reasoner output
// never becomes an executable intent. Untrusted payloads have zero authority.
// Pure: no fs/network/child_process.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { decideOwnerScope } from '../policy/ownerScope';
import { assertNotFactUpgrade, type AtlasFactCategory } from './atlas';
import {
  AGENT_INTENT_KINDS,
  AGENT_TERMINATION_REASONS,
  isUnsafeIntentKind,
  type AgentIntent,
  type AgentIntentKind,
  type TerminateIntent,
} from './intents';
import {
  REASONER_MAX_HYPOTHESES_PER_TURN,
  REASONER_MAX_INTENTS_PER_TURN,
  REASONER_STDERR_BYTE_CAP,
  REASONER_STDOUT_BYTE_CAP,
  REASONER_TURN_RESPONSE_VERSION,
  type ReasonerFailureClass,
  type ReasonerHypothesisDraft,
  type ReasonerTurnResponse,
} from './reasoner';
import { lookupAgentTool, type AgentToolEnvironment, type AgentToolId } from './tools';
import { untrustedLooksLikeInjection, type UntrustedEnvelope } from './untrusted';
import { AUTONOMOUS_FINDING_AUTHORITY, type AutonomousFindingDossier } from './finding';

export type ProtocolReject = {
  readonly ok: false;
  readonly class: ReasonerFailureClass;
};

export type ProtocolAccept<T> = {
  readonly ok: true;
  readonly value: T;
};

export type ProtocolResult<T> = ProtocolAccept<T> | ProtocolReject;

const INTENT_KIND_SET: Record<string, true> = Object.fromEntries(AGENT_INTENT_KINDS.map((kind) => [kind, true]));
const TERMINATION_SET: Record<string, true> = Object.fromEntries(AGENT_TERMINATION_REASONS.map((reason) => [reason, true]));
const SAFE_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_CODE_RE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SECRET_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

export interface ReasonerValidationContext {
  readonly authorizedEnvironments: readonly AgentToolEnvironment[];
  readonly allowedToolIds?: readonly AgentToolId[];
}

function reject(failureClass: ReasonerFailureClass): ProtocolReject {
  return { ok: false, class: failureClass };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID_RE.test(value);
}

function isSafeCode(value: unknown): value is string {
  return typeof value === 'string' && SAFE_CODE_RE.test(value);
}

function stringArray(value: unknown, max = 16): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 512 || SECRET_RE.test(item)) return null;
    items.push(item);
  }
  return items;
}

export function classifyOutputSize(stdoutBytes: number, stderrBytes: number): ReasonerFailureClass | null {
  if (stdoutBytes > REASONER_STDOUT_BYTE_CAP || stderrBytes > REASONER_STDERR_BYTE_CAP) return 'OVERSIZE_OUTPUT';
  return null;
}

export function classifyRawOutput(raw: string): ReasonerFailureClass | null {
  if (SECRET_RE.test(raw)) return 'SECRET_ECHO';
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 'PARTIAL_OUTPUT';
  if (trimmed[0] !== '{' && trimmed[0] !== '[') return 'GARBAGE_OUTPUT';
  return null;
}

function parseIntent(value: unknown, context: ReasonerValidationContext): ProtocolResult<AgentIntent> {
  if (!isRecord(value) || typeof value.kind !== 'string') return reject('MALFORMED_OUTPUT');
  if (isUnsafeIntentKind(value.kind)) return reject('UNSAFE_INTENT');
  if (!INTENT_KIND_SET[value.kind]) return reject('UNKNOWN_INTENT');
  const kind = value.kind as AgentIntentKind;
  if (kind === 'CALL_TOOL') {
    if (!isSafeId(value.toolId)) return reject('MALFORMED_OUTPUT');
    const allowed = context.allowedToolIds;
    if (allowed && !allowed.includes(value.toolId as AgentToolId)) return reject('UNKNOWN_TOOL');
    const tool = lookupAgentTool(value.toolId);
    if (tool === null) return reject('UNKNOWN_TOOL');
    if (!context.authorizedEnvironments.includes(tool.environment)) return reject('UNAUTHORIZED_ENVIRONMENT');
    if (!decideOwnerScope(tool.authorizationClass).allowed) return reject('UNSAFE_INTENT');
    if (!isRecord(value.arguments)) return reject('MALFORMED_OUTPUT');
    const argumentDigest = typeof value.argumentDigest === 'string' && /^arg:sha256:[0-9a-f]{24}$/.test(value.argumentDigest)
      ? value.argumentDigest
      : prefixedDigest24('arg', value.arguments);
    return {
      ok: true,
      value: {
        kind: 'CALL_TOOL',
        toolId: tool.id,
        argumentDigest,
        arguments: value.arguments,
      },
    };
  }
  if (kind === 'FORM_HYPOTHESIS') {
    const evidenceRefs = stringArray(value.evidenceRefs);
    if (!isSafeId(value.hypothesisId) || typeof value.statement !== 'string' || value.statement.length === 0 || value.statement.length > 1024 || evidenceRefs === null) {
      return reject('MALFORMED_OUTPUT');
    }
    if (SECRET_RE.test(value.statement)) return reject('SECRET_ECHO');
    return { ok: true, value: { kind, hypothesisId: value.hypothesisId, statement: value.statement, evidenceRefs } };
  }
  if (kind === 'PROPOSE_CANDIDATE') {
    const evidenceRefs = stringArray(value.evidenceRefs);
    if (!isSafeId(value.candidateId) || evidenceRefs === null || evidenceRefs.length === 0) return reject('MALFORMED_OUTPUT');
    return { ok: true, value: { kind, candidateId: value.candidateId, evidenceRefs } };
  }
  if (kind === 'REJECT_CANDIDATE') {
    if (!isSafeId(value.candidateId) || !isSafeCode(value.reasonCode)) return reject('MALFORMED_OUTPUT');
    return { ok: true, value: { kind, candidateId: value.candidateId, reasonCode: value.reasonCode } };
  }
  if (kind === 'REPLAN') {
    if (!isSafeCode(value.reasonCode)) return reject('MALFORMED_OUTPUT');
    return { ok: true, value: { kind, reasonCode: value.reasonCode } };
  }
  if (kind === 'PAUSE') return { ok: true, value: { kind } };
  if (kind === 'CANCEL') return { ok: true, value: { kind } };
  if (!TERMINATION_SET[String(value.reason)]) return reject('MALFORMED_OUTPUT');
  return { ok: true, value: { kind: 'TERMINATE', reason: value.reason } as TerminateIntent };
}

function parseHypothesis(value: unknown): ProtocolResult<ReasonerHypothesisDraft> {
  if (!isRecord(value)) return reject('MALFORMED_OUTPUT');
  const evidenceRefs = stringArray(value.evidenceRefs);
  if (!isSafeId(value.hypothesisId) || typeof value.statement !== 'string' || value.statement.length === 0 || value.statement.length > 1024 || evidenceRefs === null) {
    return reject('MALFORMED_OUTPUT');
  }
  if (SECRET_RE.test(value.statement)) return reject('SECRET_ECHO');
  return { ok: true, value: { hypothesisId: value.hypothesisId, statement: value.statement, evidenceRefs } };
}

export function validateReasonerTurnResponse(
  value: unknown,
  context: ReasonerValidationContext,
): ProtocolResult<ReasonerTurnResponse> {
  if (!isRecord(value)) return reject('MALFORMED_OUTPUT');
  if (value.schemaVersion !== REASONER_TURN_RESPONSE_VERSION) return reject('MALFORMED_OUTPUT');
  if (!Array.isArray(value.intents) || value.intents.length === 0 || value.intents.length > REASONER_MAX_INTENTS_PER_TURN) {
    return reject('MALFORMED_OUTPUT');
  }
  const intents: AgentIntent[] = [];
  for (const item of value.intents) {
    const parsed = parseIntent(item, context);
    if (!parsed.ok) return parsed;
    intents.push(parsed.value);
  }
  const rawHypotheses = value.hypotheses === undefined ? [] : value.hypotheses;
  if (!Array.isArray(rawHypotheses) || rawHypotheses.length > REASONER_MAX_HYPOTHESES_PER_TURN) return reject('MALFORMED_OUTPUT');
  const hypotheses: ReasonerHypothesisDraft[] = [];
  for (const item of rawHypotheses) {
    const parsed = parseHypothesis(item);
    if (!parsed.ok) return parsed;
    hypotheses.push(parsed.value);
  }
  return {
    ok: true,
    value: {
      schemaVersion: REASONER_TURN_RESPONSE_VERSION,
      intents,
      hypotheses,
    },
  };
}

/**
 * Untrusted product/source/evidence bytes cannot mint intents. Even when the
 * payload contains "ignore previous instructions" or a fake CALL_TOOL, the
 * only executable intents are those already accepted from the typed envelope.
 */
export function untrustedHasZeroAuthority(
  envelopes: readonly UntrustedEnvelope[],
  accepted: readonly AgentIntent[],
): boolean {
  for (const envelope of envelopes) {
    if (envelope.trust !== 'UNTRUSTED') return false;
    untrustedLooksLikeInjection(envelope.bytes);
  }
  for (const intent of accepted) {
    if (intent.kind !== 'CALL_TOOL') continue;
    if (lookupAgentTool(intent.toolId) === null) return false;
  }
  return true;
}

export function proposeCandidateRequiresEvidence(intent: AgentIntent): boolean {
  return intent.kind !== 'PROPOSE_CANDIDATE' || intent.evidenceRefs.length > 0;
}

export function findingAuthorityIsLocalOnly(dossier: Pick<AutonomousFindingDossier, 'authority'>): boolean {
  return dossier.authority.humanReviewRequired === true
    && dossier.authority.externalPublication === 'PROHIBITED'
    && dossier.authority.autoFile === false
    && dossier.authority.autoLeslie === false
    && dossier.authority.autoSlack === false
    && dossier.authority.organizationalAuthority === 'NONE_LOCAL_REVIEW_ONLY'
    && dossier.authority.humanReviewRequired === AUTONOMOUS_FINDING_AUTHORITY.humanReviewRequired;
}

export function refuseAtlasFactUpgrade(from: AtlasFactCategory, to: AtlasFactCategory): boolean {
  try {
    assertNotFactUpgrade(from, to);
    return false;
  } catch {
    return true;
  }
}
