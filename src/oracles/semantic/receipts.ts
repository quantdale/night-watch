// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — safe semantic evaluation receipt (SPEC §19, §20,
// §21, §22, §36).
//
// A receipt makes EVERY semantic evaluation observable and explicit:
//
//   - the hook ALWAYS returns a receipt (PASS, ANOMALY, NOT_APPLICABLE,
//     NO_EXPECTATION, EXPECTATION_SOURCE_STALE, EXPECTATION_SOURCE_UNAVAILABLE,
//     INVALID_INPUT, PROJECTION_LIMIT_EXCEEDED, or INTERNAL_ERROR);
//   - NO_EXPECTATION, SOURCE_STALE, SOURCE_UNAVAILABLE, NOT_APPLICABLE and
//     INTERNAL_ERROR are NEVER equal to PASS — a later DEV run must never
//     infer PASS from findings.length === 0;
//   - receipts carry SAFE metadata only: expectation/oracle/target identity,
//     source provenance (repoId, SHA, relative path, symbol, derivation
//     version, evidence digest), projection digests, invariant counts,
//     finding count, journey/step/operation ids. No raw body, no raw values,
//     no raw IDs, no amounts, no arbitrary message, no DOM text, no URL
//     query string, no absolute path, no exception text.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import type { SourceProvenance } from '../expectations/types';
import type { CoverageState } from '../invariants/types';
import crypto from 'node:crypto';

export const SEMANTIC_EVALUATION_RECEIPT_VERSION = 'nightwatch.semantic-evaluation-receipt.v2' as const;
/** Phase 11: v1 receipts remain structurally valid — only the version string
 *  differs; v2 adds optional coverage metadata fields. */
export const SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 = 'nightwatch.semantic-evaluation-receipt.v1' as const;

export type SemanticReceiptOutcome =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'NO_EXPECTATION'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_SOURCE_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'PARTIAL_COVERAGE';

export const SEMANTIC_RECEIPT_OUTCOMES: readonly SemanticReceiptOutcome[] = [
  'PASS',
  'ANOMALY',
  'NOT_APPLICABLE',
  'NO_EXPECTATION',
  'EXPECTATION_SOURCE_STALE',
  'EXPECTATION_SOURCE_UNAVAILABLE',
  'INVALID_INPUT',
  'PROJECTION_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
  'PARTIAL_COVERAGE',
];

/** Outcomes that must NEVER be mistaken for a passing evaluation. */
export const SEMANTIC_RECEIPT_NON_PASS_OUTCOMES: ReadonlySet<SemanticReceiptOutcome> = new Set([
  'NO_EXPECTATION',
  'EXPECTATION_SOURCE_STALE',
  'EXPECTATION_SOURCE_UNAVAILABLE',
  'NOT_APPLICABLE',
  'INTERNAL_ERROR',
  'INVALID_INPUT',
  'PROJECTION_LIMIT_EXCEEDED',
  'PARTIAL_COVERAGE',
]);

export interface SemanticEvaluationReceipt {
  readonly schemaVersion: typeof SEMANTIC_EVALUATION_RECEIPT_VERSION;
  /** Deterministic: receipt:sha256:<24> over the canonical safe fields. */
  readonly receiptId: string;
  readonly oracleId: string;
  readonly outcome: SemanticReceiptOutcome;
  /** Operation/rule/journey-step identity the evaluation targeted. */
  readonly targetId?: string;
  /** Absent for NO_EXPECTATION and pre-resolution failures. */
  readonly expectationId?: string;
  /** Safe source provenance of the evaluated expectation, if any. */
  readonly sourceProvenance?: SourceProvenance;
  /** Projection digests of the evaluated observation(s); empty when no
   *  projection occurred. */
  readonly projectionDigests: readonly string[];
  readonly invariantTotal: number;
  readonly invariantPassCount: number;
  readonly invariantNaCount: number;
  readonly invariantViolationCount: number;
  readonly findingCount: number;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
  // Phase 11: optional collection-wide coverage metadata (only present when
  // COLLECTION_ITEM_CONTRACT invariants were evaluated).
  readonly coverageState?: CoverageState;
  readonly inspectedItemCount?: number;
  readonly violatingItemCount?: number;
}

export const SEMANTIC_RECEIPT_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'receiptId',
  'oracleId',
  'outcome',
  'targetId',
  'expectationId',
  'sourceProvenance',
  'projectionDigests',
  'invariantTotal',
  'invariantPassCount',
  'invariantNaCount',
  'invariantViolationCount',
  'findingCount',
  'journeyId',
  'stepId',
  'operationId',
  'coverageState',
  'inspectedItemCount',
  'violatingItemCount',
]);

/** Strict structural validation. Throws
 *  `SEMANTIC_RECEIPT_INVALID:<detail>`. */
export function validateSemanticEvaluationReceipt(receipt: SemanticEvaluationReceipt): void {
  if (receipt.schemaVersion !== SEMANTIC_EVALUATION_RECEIPT_VERSION && receipt.schemaVersion !== SEMANTIC_EVALUATION_RECEIPT_VERSION_V1) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:schemaVersion');
  }
  for (const key of Object.keys(receipt)) {
    if (!SEMANTIC_RECEIPT_SAFE_FIELDS.has(key)) throw new Error(`SEMANTIC_RECEIPT_INVALID:unknown-field:${key}`);
  }
  if (!SEMANTIC_RECEIPT_OUTCOMES.includes(receipt.outcome)) throw new Error('SEMANTIC_RECEIPT_INVALID:outcome');
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(receipt.oracleId)) throw new Error('SEMANTIC_RECEIPT_INVALID:oracleId');
  if (!/^receipt:sha256:[0-9a-f]{24}$/.test(receipt.receiptId)) throw new Error('SEMANTIC_RECEIPT_INVALID:receiptId');
  if (receipt.targetId !== undefined && (typeof receipt.targetId !== 'string' || receipt.targetId.length === 0 || receipt.targetId.length > 200)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:targetId');
  }
  if (receipt.expectationId !== undefined && (typeof receipt.expectationId !== 'string' || receipt.expectationId.length === 0 || receipt.expectationId.length > 200)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:expectationId');
  }
  if (receipt.journeyId !== undefined && (typeof receipt.journeyId !== 'string' || receipt.journeyId.length === 0 || receipt.journeyId.length > 200)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:journeyId');
  }
  if (receipt.stepId !== undefined && (typeof receipt.stepId !== 'string' || receipt.stepId.length === 0 || receipt.stepId.length > 200)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:stepId');
  }
  if (receipt.operationId !== undefined && (typeof receipt.operationId !== 'string' || receipt.operationId.length === 0 || receipt.operationId.length > 200)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:operationId');
  }
  if (!Array.isArray(receipt.projectionDigests) || receipt.projectionDigests.some((digest) => typeof digest !== 'string' || !/^proj:sha256:[0-9a-f]{24}$/.test(digest))) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:projection-digest');
  }
  const counts = [
    receipt.invariantTotal,
    receipt.invariantPassCount,
    receipt.invariantNaCount,
    receipt.invariantViolationCount,
    receipt.findingCount,
  ];
  for (const count of counts) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 1_000_000) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:count');
    }
  }
  if (receipt.invariantPassCount + receipt.invariantNaCount + receipt.invariantViolationCount !== receipt.invariantTotal) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:count-sum');
  }
  // Phase 11: validate optional coverage metadata fields.
  if (receipt.coverageState !== undefined) {
    const validCoverageStates: readonly CoverageState[] = [
      'FULLY_EVALUATED_PASS', 'VIOLATION', 'EMPTY_NOT_APPLICABLE',
      'PARTIAL_COVERAGE_NO_VIOLATION', 'PROJECTION_LIMIT_EXCEEDED',
    ];
    if (!validCoverageStates.includes(receipt.coverageState)) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:coverageState');
    }
  }
  if (receipt.inspectedItemCount !== undefined && (typeof receipt.inspectedItemCount !== 'number' || !Number.isInteger(receipt.inspectedItemCount) || receipt.inspectedItemCount < 0)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:inspectedItemCount');
  }
  if (receipt.violatingItemCount !== undefined && (typeof receipt.violatingItemCount !== 'number' || !Number.isInteger(receipt.violatingItemCount) || receipt.violatingItemCount < 0)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:violatingItemCount');
  }
  if (receipt.outcome !== 'ANOMALY' && receipt.invariantViolationCount !== 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:violations-without-anomaly');
  }
  // Phase 15P A04 cross-field coherence: findings are only ever produced by
  // an ANOMALY evaluation (the semantic core returns findings: [] on every
  // other outcome), so a non-ANOMALY receipt carrying findings contradicts
  // its own outcome and fails closed.
  if (receipt.outcome !== 'ANOMALY' && receipt.findingCount !== 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:findings-without-anomaly');
  }
  if (receipt.outcome === 'ANOMALY' && receipt.findingCount === 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:anomaly-without-finding');
  }
  if (receipt.outcome === 'NO_EXPECTATION' && receipt.expectationId !== undefined) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:no-expectation-with-expectation-id');
  }
  if (receipt.sourceProvenance !== undefined && receipt.expectationId === undefined) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:provenance-without-expectation');
  }
  // Phase 11A.1: coverage coherence validation.
  if (receipt.outcome === 'PARTIAL_COVERAGE') {
    if (receipt.coverageState !== 'PARTIAL_COVERAGE_NO_VIOLATION') {
      throw new Error('SEMANTIC_RECEIPT_INVALID:partial-coverage-requires-coverage-state');
    }
    if (receipt.invariantViolationCount !== 0) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:partial-coverage-violations');
    }
    if (receipt.findingCount !== 0) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:partial-coverage-findings');
    }
  }
  if (receipt.outcome === 'PASS' && receipt.coverageState === 'PARTIAL_COVERAGE_NO_VIOLATION') {
    throw new Error('SEMANTIC_RECEIPT_INVALID:pass-with-partial-coverage');
  }
  if (receipt.violatingItemCount !== undefined && receipt.inspectedItemCount !== undefined) {
    if (receipt.violatingItemCount > receipt.inspectedItemCount) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:violating-exceeds-inspected');
    }
  }
  if (receipt.coverageState === 'VIOLATION' && (receipt.violatingItemCount === undefined || receipt.violatingItemCount < 1)) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:violation-requires-violating-count');
  }
  if (receipt.coverageState === 'FULLY_EVALUATED_PASS' && receipt.violatingItemCount !== undefined && receipt.violatingItemCount !== 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:full-pass-violations');
  }
  if (receipt.coverageState === 'EMPTY_NOT_APPLICABLE' && receipt.inspectedItemCount !== undefined && receipt.inspectedItemCount !== 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:empty-requires-zero-inspected');
  }
  if (receipt.coverageState === 'PARTIAL_COVERAGE_NO_VIOLATION' && receipt.violatingItemCount !== undefined && receipt.violatingItemCount !== 0) {
    throw new Error('SEMANTIC_RECEIPT_INVALID:partial-coverage-violations');
  }
  // Phase 11A.1: v1 receipts must not carry v2 coverage fields.
  if ((receipt.schemaVersion as string) === SEMANTIC_EVALUATION_RECEIPT_VERSION_V1) {
    if (receipt.coverageState !== undefined || receipt.inspectedItemCount !== undefined || receipt.violatingItemCount !== undefined) {
      throw new Error('SEMANTIC_RECEIPT_INVALID:v1-coverage-fields');
    }
    if (receipt.outcome === 'PARTIAL_COVERAGE') {
      throw new Error('SEMANTIC_RECEIPT_INVALID:v1-partial-coverage');
    }
  }
}

export interface SemanticReceiptInput {
  readonly oracleId: string;
  readonly outcome: SemanticReceiptOutcome;
  readonly targetId?: string;
  readonly expectationId?: string;
  readonly sourceProvenance?: SourceProvenance;
  readonly projectionDigests?: readonly string[];
  readonly invariantTotal?: number;
  readonly invariantPassCount?: number;
  readonly invariantNaCount?: number;
  readonly invariantViolationCount?: number;
  readonly findingCount?: number;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
  // Phase 11: optional collection-wide coverage metadata.
  readonly coverageState?: CoverageState;
  readonly inspectedItemCount?: number;
  readonly violatingItemCount?: number;
}

const SEMANTIC_RECEIPT_INPUT_FIELDS: ReadonlySet<string> = new Set([
  'oracleId',
  'outcome',
  'targetId',
  'expectationId',
  'sourceProvenance',
  'projectionDigests',
  'invariantTotal',
  'invariantPassCount',
  'invariantNaCount',
  'invariantViolationCount',
  'findingCount',
  'journeyId',
  'stepId',
  'operationId',
  'coverageState',
  'inspectedItemCount',
  'violatingItemCount',
]);

/** Build + validate a receipt with a deterministic id. The id is derived
 *  ONLY from the safe canonical fields, so identical evaluations produce
 *  identical receipts (excluding nothing that matters for triage). */
export function buildSemanticEvaluationReceipt(input: SemanticReceiptInput): SemanticEvaluationReceipt {
  // Strict schema: unknown input fields are rejected, never silently
  // dropped (SPEC §36).
  for (const key of Object.keys(input)) {
    if (!SEMANTIC_RECEIPT_INPUT_FIELDS.has(key)) throw new Error(`SEMANTIC_RECEIPT_INVALID:unknown-input-field:${key}`);
  }
  const draft: Omit<SemanticEvaluationReceipt, 'receiptId'> = {
    schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
    oracleId: input.oracleId,
    outcome: input.outcome,
    projectionDigests: input.projectionDigests ?? [],
    invariantTotal: input.invariantTotal ?? 0,
    invariantPassCount: input.invariantPassCount ?? 0,
    invariantNaCount: input.invariantNaCount ?? 0,
    invariantViolationCount: input.invariantViolationCount ?? 0,
    findingCount: input.findingCount ?? 0,
    ...(input.targetId === undefined ? {} : { targetId: input.targetId }),
    ...(input.expectationId === undefined ? {} : { expectationId: input.expectationId }),
    ...(input.sourceProvenance === undefined ? {} : { sourceProvenance: input.sourceProvenance }),
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
    ...(input.coverageState === undefined ? {} : { coverageState: input.coverageState }),
    ...(input.inspectedItemCount === undefined ? {} : { inspectedItemCount: input.inspectedItemCount }),
    ...(input.violatingItemCount === undefined ? {} : { violatingItemCount: input.violatingItemCount }),
  };
  const canonical = JSON.stringify(draft, Object.keys(draft).sort());
  const digest = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
  const receipt: SemanticEvaluationReceipt = { ...draft, receiptId: `receipt:sha256:${digest}` };
  validateSemanticEvaluationReceipt(receipt);
  return receipt;
}
