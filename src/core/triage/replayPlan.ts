// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — strict deterministic replay-plan DTO.
//
// The replay plan is data-only control evidence. It never contains raw
// customer values, selectors invented at runtime, URLs, parameters, bodies,
// credentials, DOM, screenshots, or source text. The pure core has no
// browser, network, filesystem, child-process, DB, or AI authority.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';

export const TRIAGE_REPLAY_PLAN_VERSION = 'nightwatch.triage-replay-plan.private.v1' as const;

export type ReplayCandidateKind = 'JOURNEY' | 'EXPLORATION' | 'API';
export type ReplayPhase = 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';

export interface TriageReplayPlan {
  readonly schemaVersion: typeof TRIAGE_REPLAY_PLAN_VERSION;
  readonly planId: string;
  readonly candidateKind: ReplayCandidateKind;
  readonly anomalyFingerprint: string;
  readonly originalActionIds: readonly string[];
  readonly retainedActionIds: readonly string[];
  readonly phase: ReplayPhase;
  readonly targetId: string;
  readonly contractVersion: string;
  readonly contractDigest: string;
  readonly catalogVersion: string;
  readonly sourceVersion: string;
  readonly routeClass: string;
  readonly semanticExpectationId?: string;
  readonly sourceEvidenceDigest?: string;
}

export type ReplayPlanInput = Omit<TriageReplayPlan, 'planId'> & { readonly planId?: string };

const ALLOWED_KEYS = new Set<string>([
  'schemaVersion',
  'planId',
  'candidateKind',
  'anomalyFingerprint',
  'originalActionIds',
  'retainedActionIds',
  'phase',
  'targetId',
  'contractVersion',
  'contractDigest',
  'catalogVersion',
  'sourceVersion',
  'routeClass',
  'semanticExpectationId',
  'sourceEvidenceDigest',
]);

const ACTION_ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;
const ROUTE_CLASS_RE = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const PLAN_ID_RE = /^rp:sha256:[0-9a-f]{24}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const GENERIC_VERSION_RE = /^[A-Za-z0-9._~:@%/-]{1,200}$/;

function canonical(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function deterministicPlanId(input: Omit<TriageReplayPlan, 'planId'>): string {
  const payload = {
    schemaVersion: input.schemaVersion,
    candidateKind: input.candidateKind,
    anomalyFingerprint: input.anomalyFingerprint,
    originalActionIds: [...input.originalActionIds],
    retainedActionIds: [...input.retainedActionIds],
    phase: input.phase,
    targetId: input.targetId,
    contractVersion: input.contractVersion,
    contractDigest: input.contractDigest,
    catalogVersion: input.catalogVersion,
    sourceVersion: input.sourceVersion,
    routeClass: input.routeClass,
    ...(input.semanticExpectationId === undefined ? {} : { semanticExpectationId: input.semanticExpectationId }),
    ...(input.sourceEvidenceDigest === undefined ? {} : { sourceEvidenceDigest: input.sourceEvidenceDigest }),
  };
  const hash = createHash('sha256').update(canonical(payload), 'utf8').digest('hex').slice(0, 24);
  return `rp:sha256:${hash}`;
}

export function isOrderPreservingSubsequence(original: readonly string[], retained: readonly string[]): boolean {
  if (retained.length > original.length) return false;
  if (retained.length === 0) return original.length === 0;
  let oi = 0;
  let ri = 0;
  while (oi < original.length && ri < retained.length) {
    if (original[oi] === retained[ri]) ri += 1;
    oi += 1;
  }
  return ri === retained.length;
}

function validateStringField(name: string, value: unknown, pattern: RegExp, maxLen = 200): string | null {
  if (typeof value !== 'string') return `${name}_NOT_STRING`;
  if (value.length === 0 || value.length > maxLen) return `${name}_LENGTH_INVALID`;
  if (!pattern.test(value)) return `${name}_PATTERN_INVALID`;
  return null;
}

export function validateTriageReplayPlan(input: unknown): { valid: true; plan: TriageReplayPlan } | { valid: false; reason: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { valid: false, reason: 'REPLAY_PLAN_NOT_OBJECT' };
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(key)) return { valid: false, reason: `REPLAY_PLAN_UNKNOWN_FIELD:${key}` };
  }
  if (obj.schemaVersion !== TRIAGE_REPLAY_PLAN_VERSION) return { valid: false, reason: 'REPLAY_PLAN_VERSION_MISMATCH' };
  const kind = obj.candidateKind;
  if (kind !== 'JOURNEY' && kind !== 'EXPLORATION' && kind !== 'API') return { valid: false, reason: 'REPLAY_PLAN_KIND_INVALID' };
  const phase = obj.phase;
  if (phase !== 'FRESH_EXACT_REPLAY' && phase !== 'REDUCED_CANDIDATE') return { valid: false, reason: 'REPLAY_PLAN_PHASE_INVALID' };

  const fpErr = validateStringField('anomalyFingerprint', obj.anomalyFingerprint, FINGERPRINT_RE, 64);
  if (fpErr) return { valid: false, reason: fpErr };
  const routeErr = validateStringField('routeClass', obj.routeClass, ROUTE_CLASS_RE, 120);
  if (routeErr) return { valid: false, reason: routeErr };
  const targetErr = validateStringField('targetId', obj.targetId, ACTION_ID_RE, 120);
  if (targetErr) return { valid: false, reason: targetErr };
  const contractVersionErr = validateStringField('contractVersion', obj.contractVersion, GENERIC_VERSION_RE, 200);
  if (contractVersionErr) return { valid: false, reason: contractVersionErr };
  // contractDigest may be sha256: hex 64 or prefixed form like exploration:sha or api:sha or contract:sha
  const contractDigest = obj.contractDigest;
  if (typeof contractDigest !== 'string' || contractDigest.length === 0 || contractDigest.length > 200) return { valid: false, reason: 'contractDigest_LENGTH_INVALID' };
  if (!SHA256_RE.test(contractDigest) && !/^[A-Za-z0-9:_./-]{1,200}$/.test(contractDigest)) return { valid: false, reason: 'contractDigest_PATTERN_INVALID' };
  const catalogErr = validateStringField('catalogVersion', obj.catalogVersion, GENERIC_VERSION_RE, 200);
  if (catalogErr) return { valid: false, reason: catalogErr };
  const sourceErr = validateStringField('sourceVersion', obj.sourceVersion, GENERIC_VERSION_RE, 200);
  if (sourceErr) return { valid: false, reason: sourceErr };

  const original = obj.originalActionIds;
  if (!Array.isArray(original) || original.length === 0 || original.length > 64) return { valid: false, reason: 'originalActionIds_INVALID' };
  for (const id of original) {
    const err = validateStringField('originalActionId', id, ACTION_ID_RE, 120);
    if (err) return { valid: false, reason: err };
  }
  const retained = obj.retainedActionIds;
  if (!Array.isArray(retained) || retained.length === 0 || retained.length > 64) return { valid: false, reason: 'retainedActionIds_INVALID' };
  for (const id of retained) {
    const err = validateStringField('retainedActionId', id, ACTION_ID_RE, 120);
    if (err) return { valid: false, reason: err };
  }
  // Order-preserving subsequence with occurrence identity
  if (!isOrderPreservingSubsequence(original as string[], retained as string[])) return { valid: false, reason: 'REPLAY_PLAN_NOT_SUBSEQUENCE' };
  // Fresh exact replay must retain exactly the original sequence
  if (phase === 'FRESH_EXACT_REPLAY' && (retained.length !== original.length || retained.some((v, i) => v !== (original as string[])[i]))) {
    return { valid: false, reason: 'FRESH_EXACT_MUST_MATCH_ORIGINAL' };
  }
  // API single-action invariant (strict): original occurrence count exactly 1,
  // retained occurrence count exactly 1, and retained occurrence is the original
  // operation. Any multi-original, empty, or mismatched plan is rejected before
  // executor exposure. This closes CONFIRMED_API_REPLAY_PLAN_ORIGINAL_CARDINALITY_GAP.
  if (kind === 'API') {
    if (original.length !== 1) return { valid: false, reason: 'API_ORIGINAL_MUST_BE_SINGLE' };
    if (retained.length !== 1) return { valid: false, reason: 'API_RETAINED_MUST_BE_SINGLE' };
    if (retained[0] !== original[0]) return { valid: false, reason: 'API_RETAINED_MUST_EQUAL_ORIGINAL' };
  }
  // Reject raw product values / unsafe semantic is handled at adapter layer, but ensure no semanticExpectationId raw leak:
  if (obj.semanticExpectationId !== undefined) {
    const e = validateStringField('semanticExpectationId', obj.semanticExpectationId, ACTION_ID_RE, 120);
    if (e) return { valid: false, reason: e };
  }
  if (obj.sourceEvidenceDigest !== undefined) {
    const e = validateStringField('sourceEvidenceDigest', obj.sourceEvidenceDigest, EVIDENCE_DIGEST_RE, 64);
    if (e) return { valid: false, reason: e };
  }

  // Deterministic planId recomputation
  const expectedPlanId = deterministicPlanId(obj as Omit<TriageReplayPlan, 'planId'>);
  const provided = obj.planId;
  if (typeof provided !== 'string' || !PLAN_ID_RE.test(provided)) return { valid: false, reason: 'planId_PATTERN_INVALID' };
  if (provided !== expectedPlanId) return { valid: false, reason: 'REPLAY_PLAN_ID_MISMATCH' };

  return { valid: true, plan: obj as unknown as TriageReplayPlan };
}

export function createTriageReplayPlan(input: Omit<ReplayPlanInput, 'schemaVersion' | 'planId'> & { readonly phase: ReplayPhase }): TriageReplayPlan {
  const base: Omit<TriageReplayPlan, 'planId'> = {
    schemaVersion: TRIAGE_REPLAY_PLAN_VERSION,
    candidateKind: input.candidateKind,
    anomalyFingerprint: input.anomalyFingerprint,
    originalActionIds: [...input.originalActionIds],
    retainedActionIds: [...input.retainedActionIds],
    phase: input.phase,
    targetId: input.targetId,
    contractVersion: input.contractVersion,
    contractDigest: input.contractDigest,
    catalogVersion: input.catalogVersion,
    sourceVersion: input.sourceVersion,
    routeClass: input.routeClass,
    ...(input.semanticExpectationId === undefined ? {} : { semanticExpectationId: input.semanticExpectationId }),
    ...(input.sourceEvidenceDigest === undefined ? {} : { sourceEvidenceDigest: input.sourceEvidenceDigest }),
  };
  const planId = deterministicPlanId(base);
  const plan = { ...base, planId } as TriageReplayPlan;
  const validated = validateTriageReplayPlan(plan);
  if (!validated.valid) throw new Error(`REPLAY_PLAN_CREATE_FAILED:${validated.reason}`);
  return plan;
}

export function parseTriageReplayPlan(raw: unknown): TriageReplayPlan {
  const result = validateTriageReplayPlan(raw);
  if (!result.valid) throw new Error(`REPLAY_PLAN_INVALID:${result.reason}`);
  return result.plan;
}

// ---------------------------------------------------------------------------
// Phase 13A — strict v2 replay-plan with explicit occurrence identity.
//
// v1 preserves its immutable semantics for historical/local evidence parsing.
// v2 adds deterministic occurrence ordinals so two occurrences of the same
// action ID with distinct occurrence context cannot masquerade under the same
// plan identity, and a reduced replay selects an order-preserving subsequence
// of occurrence ordinals rather than ambiguous action-ID strings. The v1 plan
// ID ignores occurrence identity; v2 uses a distinct `rp2:sha256:` prefix.
// No raw product values, selectors, URLs, params, bodies, credentials, or DOM.
// ---------------------------------------------------------------------------

export const TRIAGE_REPLAY_PLAN_V2_VERSION = 'nightwatch.triage-replay-plan.private.v2' as const;

export interface ReplayOccurrence {
  readonly ordinal: number;
  readonly expectedActionId: string;
}

export interface TriageReplayPlanV2 {
  readonly schemaVersion: typeof TRIAGE_REPLAY_PLAN_V2_VERSION;
  readonly planId: string;
  readonly candidateKind: ReplayCandidateKind;
  readonly anomalyFingerprint: string;
  readonly originalOccurrences: readonly ReplayOccurrence[];
  readonly retainedOccurrenceOrdinals: readonly number[];
  readonly phase: ReplayPhase;
  readonly targetId: string;
  readonly contractVersion: string;
  readonly contractDigest: string;
  readonly catalogVersion: string;
  readonly sourceVersion: string;
  readonly routeClass: string;
  readonly semanticExpectationId?: string;
  readonly sourceEvidenceDigest?: string;
}

export type ReplayPlanV2Input = Omit<TriageReplayPlanV2, 'planId'> & { readonly planId?: string };

const PLAN_ID_V2_RE = /^rp2:sha256:[0-9a-f]{24}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function deterministicPlanIdV2(input: Omit<TriageReplayPlanV2, 'planId'>): string {
  const payload = {
    schemaVersion: input.schemaVersion,
    candidateKind: input.candidateKind,
    anomalyFingerprint: input.anomalyFingerprint,
    originalOccurrences: input.originalOccurrences.map((o) => ({ ordinal: o.ordinal, expectedActionId: o.expectedActionId })),
    retainedOccurrenceOrdinals: [...input.retainedOccurrenceOrdinals].sort((a, b) => a - b),
    phase: input.phase,
    targetId: input.targetId,
    contractVersion: input.contractVersion,
    contractDigest: input.contractDigest,
    catalogVersion: input.catalogVersion,
    sourceVersion: input.sourceVersion,
    routeClass: input.routeClass,
    ...(input.semanticExpectationId === undefined ? {} : { semanticExpectationId: input.semanticExpectationId }),
    ...(input.sourceEvidenceDigest === undefined ? {} : { sourceEvidenceDigest: input.sourceEvidenceDigest }),
  };
  const hash = createHash('sha256').update(canonical(payload), 'utf8').digest('hex').slice(0, 24);
  return `rp2:sha256:${hash}`;
}

export function isOrderPreservingOrdinalSubsequence(original: readonly ReplayOccurrence[], retainedOrdinals: readonly number[]): boolean {
  const ordinals = original.map((o) => o.ordinal);
  if (retainedOrdinals.length > ordinals.length) return false;
  if (retainedOrdinals.length === 0) return ordinals.length === 0;
  let oi = 0;
  let ri = 0;
  while (oi < ordinals.length && ri < retainedOrdinals.length) {
    if (ordinals[oi] === retainedOrdinals[ri]) ri += 1;
    oi += 1;
  }
  return ri === retainedOrdinals.length;
}

const ALLOWED_KEYS_V2 = new Set<string>([
  'schemaVersion',
  'planId',
  'candidateKind',
  'anomalyFingerprint',
  'originalOccurrences',
  'retainedOccurrenceOrdinals',
  'phase',
  'targetId',
  'contractVersion',
  'contractDigest',
  'catalogVersion',
  'sourceVersion',
  'routeClass',
  'semanticExpectationId',
  'sourceEvidenceDigest',
]);

export function validateTriageReplayPlanV2(input: unknown): { valid: true; plan: TriageReplayPlanV2 } | { valid: false; reason: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { valid: false, reason: 'REPLAY_PLAN_V2_NOT_OBJECT' };
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS_V2.has(key)) return { valid: false, reason: `REPLAY_PLAN_V2_UNKNOWN_FIELD:${key}` };
  }
  if (obj.schemaVersion !== TRIAGE_REPLAY_PLAN_V2_VERSION) return { valid: false, reason: 'REPLAY_PLAN_V2_VERSION_MISMATCH' };
  const kind = obj.candidateKind;
  if (kind !== 'JOURNEY' && kind !== 'EXPLORATION' && kind !== 'API') return { valid: false, reason: 'REPLAY_PLAN_V2_KIND_INVALID' };
  const phase = obj.phase;
  if (phase !== 'FRESH_EXACT_REPLAY' && phase !== 'REDUCED_CANDIDATE') return { valid: false, reason: 'REPLAY_PLAN_V2_PHASE_INVALID' };

  const fpErr = validateStringField('anomalyFingerprint', obj.anomalyFingerprint, FINGERPRINT_RE, 64);
  if (fpErr) return { valid: false, reason: fpErr };
  const routeErr = validateStringField('routeClass', obj.routeClass, ROUTE_CLASS_RE, 120);
  if (routeErr) return { valid: false, reason: routeErr };
  const targetErr = validateStringField('targetId', obj.targetId, ACTION_ID_RE, 120);
  if (targetErr) return { valid: false, reason: targetErr };
  const contractVersionErr = validateStringField('contractVersion', obj.contractVersion, GENERIC_VERSION_RE, 200);
  if (contractVersionErr) return { valid: false, reason: contractVersionErr };
  const contractDigest = obj.contractDigest;
  if (typeof contractDigest !== 'string' || contractDigest.length === 0 || contractDigest.length > 200) return { valid: false, reason: 'contractDigest_LENGTH_INVALID' };
  if (!SHA256_RE.test(contractDigest) && !/^[A-Za-z0-9:_./-]{1,200}$/.test(contractDigest)) return { valid: false, reason: 'contractDigest_PATTERN_INVALID' };
  const catalogErr = validateStringField('catalogVersion', obj.catalogVersion, GENERIC_VERSION_RE, 200);
  if (catalogErr) return { valid: false, reason: catalogErr };
  const sourceErr = validateStringField('sourceVersion', obj.sourceVersion, GENERIC_VERSION_RE, 200);
  if (sourceErr) return { valid: false, reason: sourceErr };

  const original = obj.originalOccurrences;
  if (!Array.isArray(original) || original.length === 0 || original.length > 64) return { valid: false, reason: 'originalOccurrences_INVALID' };
  const occOrdinals = new Set<number>();
  for (const occ of original) {
    if (typeof occ !== 'object' || occ === null || Array.isArray(occ)) return { valid: false, reason: 'originalOccurrence_INVALID' };
    const o = occ as Record<string, unknown>;
    if (typeof o.ordinal !== 'number' || !Number.isInteger(o.ordinal) || o.ordinal < 0) return { valid: false, reason: 'occurrence_ordinal_INVALID' };
    if (occOrdinals.has(o.ordinal)) return { valid: false, reason: 'occurrence_ordinal_DUPLICATE' };
    const idErr = validateStringField('expectedActionId', o.expectedActionId, ACTION_ID_RE, 120);
    if (idErr) return { valid: false, reason: idErr };
    if (SENTINEL_RE.test(String(o.expectedActionId))) return { valid: false, reason: 'occurrence_EXPECTED_ACTION_ID_SENTINEL' };
    occOrdinals.add(o.ordinal);
  }
  const retained = obj.retainedOccurrenceOrdinals;
  if (!Array.isArray(retained) || retained.length > 64) return { valid: false, reason: 'retainedOccurrenceOrdinals_INVALID' };
  for (const r of retained) {
    if (typeof r !== 'number' || !Number.isInteger(r) || r < 0) return { valid: false, reason: 'retainedOrdinal_INVALID' };
    if (!occOrdinals.has(r)) return { valid: false, reason: 'REPLAY_PLAN_V2_UNKNOWN_ORDINAL' };
  }
  // Retained occurrences must be a strict order-preserving subsequence of originals.
  if (!isOrderPreservingOrdinalSubsequence(original as ReplayOccurrence[], retained as number[])) return { valid: false, reason: 'REPLAY_PLAN_V2_NOT_SUBSEQUENCE' };
  // Fresh exact replay retains every original occurrence in order.
  if (phase === 'FRESH_EXACT_REPLAY') {
    const sortedOriginal = [...original].map((o) => (o as Record<string, unknown>).ordinal as number).sort((a, b) => a - b);
    const sortedRetained = [...retained].sort((a, b) => a - b);
    if (sortedRetained.length !== sortedOriginal.length || sortedRetained.some((v, i) => v !== sortedOriginal[i])) {
      return { valid: false, reason: 'FRESH_EXACT_MUST_MATCH_ORIGINAL_OCCURRENCES' };
    }
  }
  // API single fixed operation: exactly one original, one retained.
  if (kind === 'API') {
    if (original.length !== 1) return { valid: false, reason: 'API_V2_ORIGINAL_MUST_BE_SINGLE' };
    if (retained.length !== 1) return { valid: false, reason: 'API_V2_RETAINED_MUST_BE_SINGLE' };
  }
  if (obj.semanticExpectationId !== undefined) {
    const e = validateStringField('semanticExpectationId', obj.semanticExpectationId, ACTION_ID_RE, 120);
    if (e) return { valid: false, reason: e };
  }
  if (obj.sourceEvidenceDigest !== undefined) {
    const e = validateStringField('sourceEvidenceDigest', obj.sourceEvidenceDigest, EVIDENCE_DIGEST_RE, 64);
    if (e) return { valid: false, reason: e };
  }
  // Deterministic planId recomputation (occurrence-aware).
  const expectedPlanId = deterministicPlanIdV2(obj as Omit<TriageReplayPlanV2, 'planId'>);
  const provided = obj.planId;
  if (typeof provided !== 'string' || !PLAN_ID_V2_RE.test(provided)) return { valid: false, reason: 'planId_V2_PATTERN_INVALID' };
  if (provided !== expectedPlanId) return { valid: false, reason: 'REPLAY_PLAN_V2_ID_MISMATCH' };
  return { valid: true, plan: obj as unknown as TriageReplayPlanV2 };
}

export function createTriageReplayPlanV2(input: Omit<ReplayPlanV2Input, 'schemaVersion' | 'planId'> & { readonly phase: ReplayPhase }): TriageReplayPlanV2 {
  const base: Omit<TriageReplayPlanV2, 'planId'> = {
    schemaVersion: TRIAGE_REPLAY_PLAN_V2_VERSION,
    candidateKind: input.candidateKind,
    anomalyFingerprint: input.anomalyFingerprint,
    originalOccurrences: input.originalOccurrences.map((o) => ({ ordinal: o.ordinal, expectedActionId: o.expectedActionId })),
    retainedOccurrenceOrdinals: [...input.retainedOccurrenceOrdinals],
    phase: input.phase,
    targetId: input.targetId,
    contractVersion: input.contractVersion,
    contractDigest: input.contractDigest,
    catalogVersion: input.catalogVersion,
    sourceVersion: input.sourceVersion,
    routeClass: input.routeClass,
    ...(input.semanticExpectationId === undefined ? {} : { semanticExpectationId: input.semanticExpectationId }),
    ...(input.sourceEvidenceDigest === undefined ? {} : { sourceEvidenceDigest: input.sourceEvidenceDigest }),
  };
  const planId = deterministicPlanIdV2(base);
  const plan = { ...base, planId } as TriageReplayPlanV2;
  const validated = validateTriageReplayPlanV2(plan);
  if (!validated.valid) throw new Error(`REPLAY_PLAN_V2_CREATE_FAILED:${validated.reason}`);
  return plan;
}

export function parseTriageReplayPlanV2(raw: unknown): TriageReplayPlanV2 {
  const result = validateTriageReplayPlanV2(raw);
  if (!result.valid) throw new Error(`REPLAY_PLAN_V2_INVALID:${result.reason}`);
  return result.plan;
}
