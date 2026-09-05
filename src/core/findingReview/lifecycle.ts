// ---------------------------------------------------------------------------
// Post-dossier review state machine + digest-bound receipts.
//
// Every transition requires the exact reviewed binding. A receipt created
// against dossier A MUST NOT validate against a mutated/regenerated dossier
// B: verifyReviewCurrent recomputes digests from the supplied current
// artifacts and fails closed on any mismatch (FINDING_REVIEW_STALE).
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import {
  FINDING_REVIEW_DECISIONS,
  FINDING_REVIEW_LIFECYCLE_VERSION,
  FINDING_REVIEW_RECEIPT_VERSION,
  FINDING_REVIEW_STATES,
  type FindingReviewBinding,
  type FindingReviewDecision,
  type FindingReviewReceipt,
  type FindingReviewRecord,
  type FindingReviewState,
} from './types';

const STATE_SET: ReadonlySet<string> = new Set<string>(FINDING_REVIEW_STATES);
const DECISION_SET: ReadonlySet<string> = new Set<string>(FINDING_REVIEW_DECISIONS);

const DIGEST_RE = /^[a-f0-9]{24,64}$/;
const ID_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const VERSION_RE = /^[A-Za-z0-9_.:-]{1,160}$/;
const REASON_CODE_RE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SOURCE_SHA_RE = /^[0-9a-f]{40}$|^synthetic\.[A-Za-z0-9_.:-]{1,120}$/;
/** ISO-8601 UTC instant; caller-supplied (no clock authority in this cone). */
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
const RATIONALE_MAX = 2000;

const SENTINEL_RE =
  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

function fail(code: string): never {
  throw new Error(code);
}

function assertDigest(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) fail(`FINDING_REVIEW_INVALID_BINDING:${field}`);
}

function assertId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !ID_RE.test(value) || SENTINEL_RE.test(value)) fail(`FINDING_REVIEW_INVALID_BINDING:${field}`);
}

/** Canonical digest of one artifact value (dossier, handoff, or finding). */
export function findingArtifactDigest(value: unknown): string {
  return sha256Hex(stableJsonSorted(value)).slice(0, 24);
}

export function validateReviewBinding(value: unknown): FindingReviewBinding {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('FINDING_REVIEW_INVALID_BINDING');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ['campaignId', 'dossierDigest', 'findingDigest', 'findingId', 'handoffDigest', 'handoffVersion', 'privacyProjectionVersion', 'sourceSha'].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) fail('FINDING_REVIEW_INVALID_BINDING:keys');
  assertId(record.findingId, 'findingId');
  assertDigest(record.findingDigest, 'findingDigest');
  assertDigest(record.dossierDigest, 'dossierDigest');
  if (record.handoffDigest !== null) assertDigest(record.handoffDigest, 'handoffDigest');
  if (typeof record.sourceSha !== 'string' || !SOURCE_SHA_RE.test(record.sourceSha)) fail('FINDING_REVIEW_INVALID_BINDING:sourceSha');
  assertId(record.campaignId, 'campaignId');
  if (typeof record.handoffVersion !== 'string' || !VERSION_RE.test(record.handoffVersion)) fail('FINDING_REVIEW_INVALID_BINDING:handoffVersion');
  if (typeof record.privacyProjectionVersion !== 'string' || !VERSION_RE.test(record.privacyProjectionVersion)) {
    fail('FINDING_REVIEW_INVALID_BINDING:privacyProjectionVersion');
  }
  return record as unknown as FindingReviewBinding;
}

const TERMINAL_STATES: ReadonlySet<FindingReviewState> = new Set<FindingReviewState>([
  'REVIEWED',
  'FOLLOWUP_RECOMMENDED',
  'INSUFFICIENT_EVIDENCE',
  'DUPLICATE_CANDIDATE',
  'SUPERSEDED',
]);

const DECISION_TARGET: Readonly<Record<FindingReviewDecision, FindingReviewState>> = {
  ACCEPT_EVIDENCE: 'REVIEWED',
  REQUEST_FOLLOWUP: 'FOLLOWUP_RECOMMENDED',
  MARK_INSUFFICIENT: 'INSUFFICIENT_EVIDENCE',
  MARK_DUPLICATE_CANDIDATE: 'DUPLICATE_CANDIDATE',
  SUPERSEDE: 'SUPERSEDED',
};

/** Fresh record: review always opens at REVIEW_PENDING over an exact binding. */
export function initialReviewRecord(binding: FindingReviewBinding): FindingReviewRecord {
  const validated = validateReviewBinding(binding);
  return { lifecycleVersion: FINDING_REVIEW_LIFECYCLE_VERSION, state: 'REVIEW_PENDING', binding: validated, transitionCount: 0, lastReasonCode: null };
}

function assertReasonCode(reasonCode: string | undefined): string | null {
  if (reasonCode === undefined) return null;
  if (!REASON_CODE_RE.test(reasonCode)) fail('FINDING_REVIEW_INVALID_REASON_CODE');
  return reasonCode;
}

function validateRecordShape(record: FindingReviewRecord): void {
  if (record.lifecycleVersion !== FINDING_REVIEW_LIFECYCLE_VERSION) fail('FINDING_REVIEW_VERSION_MISMATCH');
  if (!STATE_SET.has(record.state)) fail('FINDING_REVIEW_INVALID_STATE');
  validateReviewBinding(record.binding);
  if (!Number.isInteger(record.transitionCount) || record.transitionCount < 0) fail('FINDING_REVIEW_INVALID_RECORD');
}

/**
 * Apply one local decision. Exactly one decision per record: REVIEW_PENDING
 * is the only non-terminal state, so a second decision on a decided record
 * fails closed (no silent carry-over, no review mutation).
 */
export function decideReview(
  record: FindingReviewRecord,
  decision: FindingReviewDecision,
  options?: { readonly reasonCode?: string; readonly reviewedAt?: string; readonly rationale?: string },
): { readonly record: FindingReviewRecord; readonly receipt: FindingReviewReceipt } {
  validateRecordShape(record);
  if (!DECISION_SET.has(decision)) fail('FINDING_REVIEW_INVALID_DECISION');
  if (record.state !== 'REVIEW_PENDING') fail('FINDING_REVIEW_ALREADY_DECIDED');
  const reviewedAt = options?.reviewedAt ?? fail('FINDING_REVIEW_MISSING_INSTANT');
  if (!INSTANT_RE.test(reviewedAt)) fail('FINDING_REVIEW_INVALID_INSTANT');
  const rationale = options?.rationale ?? '';
  if (typeof rationale !== 'string' || rationale.length > RATIONALE_MAX || SENTINEL_RE.test(rationale)) {
    fail('FINDING_REVIEW_INVALID_RATIONALE');
  }
  const next: FindingReviewRecord = {
    ...record,
    state: DECISION_TARGET[decision],
    transitionCount: record.transitionCount + 1,
    lastReasonCode: assertReasonCode(options?.reasonCode),
  };
  const receiptBase = {
    schemaVersion: FINDING_REVIEW_RECEIPT_VERSION,
    binding: record.binding,
    decision,
    resultingState: next.state,
    reviewedAt,
    rationale,
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'],
  } as const;
  const receipt: FindingReviewReceipt = {
    ...receiptBase,
    reviewId: `review:${sha256Hex(stableJsonSorted(receiptBase)).slice(0, 24)}`,
  };
  return { record: next, receipt };
}

/** True iff the state has no outgoing decision (every state except REVIEW_PENDING). */
export function isTerminalReviewState(state: FindingReviewState): boolean {
  if (!STATE_SET.has(state)) fail('FINDING_REVIEW_INVALID_STATE');
  return TERMINAL_STATES.has(state);
}

export interface CurrentReviewArtifacts {
  readonly finding: unknown;
  readonly dossier: unknown;
  /** The handoff projection when the receipt binds one; must be null iff the receipt binding has null handoffDigest. */
  readonly handoff: unknown;
  readonly sourceSha: string;
  readonly campaignId: string;
  readonly handoffVersion: string;
  readonly privacyProjectionVersion: string;
}

/**
 * Reuse check for a stored receipt against CURRENT artifacts. Recomputes
 * every bound digest from the supplied values; any drift (mutated or
 * regenerated dossier/handoff/finding, rebased source, moved campaign,
 * re-versioned projection) fails closed with FINDING_REVIEW_STALE.
 */
export function verifyReviewCurrent(receipt: FindingReviewReceipt, current: CurrentReviewArtifacts): void {
  if (receipt.schemaVersion !== FINDING_REVIEW_RECEIPT_VERSION) fail('FINDING_REVIEW_VERSION_MISMATCH');
  if (!DECISION_SET.has(receipt.decision)) fail('FINDING_REVIEW_INVALID_DECISION');
  if (!STATE_SET.has(receipt.resultingState)) fail('FINDING_REVIEW_INVALID_STATE');
  if (DECISION_TARGET[receipt.decision] !== receipt.resultingState) fail('FINDING_REVIEW_DECISION_STATE_MISMATCH');
  if (receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY') fail('FINDING_REVIEW_AUTHORITY_INVALID');
  const binding = validateReviewBinding(receipt.binding);
  if (findingArtifactDigest(current.finding) !== binding.findingDigest) fail('FINDING_REVIEW_STALE:findingDigest');
  if (findingArtifactDigest(current.dossier) !== binding.dossierDigest) fail('FINDING_REVIEW_STALE:dossierDigest');
  if (binding.handoffDigest === null) {
    if (current.handoff !== null && current.handoff !== undefined) fail('FINDING_REVIEW_STALE:handoffUnexpected');
  } else {
    if (current.handoff === null || current.handoff === undefined) fail('FINDING_REVIEW_STALE:handoffMissing');
    if (findingArtifactDigest(current.handoff) !== binding.handoffDigest) fail('FINDING_REVIEW_STALE:handoffDigest');
  }
  if (current.sourceSha !== binding.sourceSha) fail('FINDING_REVIEW_STALE:sourceSha');
  if (current.campaignId !== binding.campaignId) fail('FINDING_REVIEW_STALE:campaignId');
  if (current.handoffVersion !== binding.handoffVersion) fail('FINDING_REVIEW_STALE:handoffVersion');
  if (current.privacyProjectionVersion !== binding.privacyProjectionVersion) fail('FINDING_REVIEW_STALE:privacyProjectionVersion');
  const recomputed = `review:${sha256Hex(
    stableJsonSorted({
      schemaVersion: receipt.schemaVersion,
      binding: receipt.binding,
      decision: receipt.decision,
      resultingState: receipt.resultingState,
      reviewedAt: receipt.reviewedAt,
      rationale: receipt.rationale,
      organizationalAuthority: receipt.organizationalAuthority,
      notEquivalentTo: receipt.notEquivalentTo,
    }),
  ).slice(0, 24)}`;
  if (recomputed !== receipt.reviewId) fail('FINDING_REVIEW_RECEIPT_TAMPERED');
}
