// ---------------------------------------------------------------------------
// Nightwatch C-11 — the Production Qualification receipt.
//
// The receipt is the campaign's evidence, so its integrity matters as much as
// the kernel's. Two rules shape it.
//
// Only ALLOWLISTED, categorical fields exist. There is no free-form string
// field anywhere, because a free-form field is where a customer value
// eventually lands. Identities are digests or fixed enum tokens.
//
// Validation is by IDENTITY, not arithmetic. The historical acceptance
// criterion counted gates; this validator requires the ordered gate IDs to
// equal the chain definition exactly, so a missing, duplicated, reordered or
// unknown gate fails closed regardless of how many there are.
// ---------------------------------------------------------------------------

import {
  PRODUCTION_ADMISSION_CHAIN_VERSION,
  PRODUCTION_ADMISSION_GATES,
  PRODUCTION_DENIAL_CODES,
  type BreakerCategory,
  type ContainmentQualificationState,
  type GateOutcome,
  type ObserverIdentityClass,
  type ProdObserveAuthorizationClass,
  type ProductionAdmissionGate,
  type ProductionObservationStage,
} from './types';
import type { GrantLifecycleState } from './authorization';

export const PQ_RECEIPT_SCHEMA = 'nightwatch.production-qualification-receipt.v1' as const;

const DIGEST_RE = /^[a-z][a-z0-9-]*:[0-9a-f]{24,64}$/;
const SHA_RE = /^[0-9a-f]{40}$/;

export interface ProductionQualificationReceipt {
  readonly schemaVersion: typeof PQ_RECEIPT_SCHEMA;
  readonly campaignId: string;
  readonly taskId: string;
  readonly authorizationClass: ProdObserveAuthorizationClass;
  readonly authorizationLifecycle: GrantLifecycleState | 'UNREGISTERED';
  readonly observationStage: ProductionObservationStage;
  readonly environmentClass: 'LOCAL' | 'CLEAN' | 'CI' | 'PREDEV';

  readonly sourceRepository: string;
  readonly sourceCheckpoint: string;
  readonly sourceInventoryState: 'COMPLETE' | 'TRUNCATED' | 'UNKNOWN';
  readonly sourceCurrencyState: 'CURRENT' | 'STALE' | 'UNKNOWN';

  readonly chainVersion: typeof PRODUCTION_ADMISSION_CHAIN_VERSION;
  readonly gateDefinitionDigest: string;
  readonly orderedGates: readonly ProductionAdmissionGate[];
  readonly gateOutcomes: readonly GateOutcome[];

  readonly routeEvidenceIdentity: string;
  readonly readOnlyProofIdentity: string;
  readonly parameterProvenanceIdentity: string;
  readonly privacyPolicyIdentity: string;
  readonly containmentIdentity: ContainmentQualificationState;
  readonly observerIdentityClass: ObserverIdentityClass;
  readonly organizationWindowIdentity: string;
  readonly budgetIdentity: string;
  readonly breakerState: 'CLOSED' | BreakerCategory;
  readonly killSwitchState: 'ABSENT' | 'ENGAGED';

  readonly requestsDispatched: number;
  readonly deniedBeforeDispatch: number;
  readonly persistenceAuditResult: 'CLEAN' | 'VIOLATION' | 'NOT_RUN';

  readonly finalResult: 'QUALIFIED' | 'DENIED';
  readonly receiptDigest: string;
}

export type PqReceiptDraft = Omit<ProductionQualificationReceipt, 'receiptDigest'>;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

/** Digest over the canonical body, excluding the digest field itself. */
export function sealPqReceipt(draft: PqReceiptDraft, digest: (canonical: string) => string): ProductionQualificationReceipt {
  return Object.freeze({ ...draft, receiptDigest: `pqreceipt:${digest(canonical(draft))}` });
}

export const PQ_RECEIPT_REJECTIONS = [
  'PQ_SCHEMA_UNSUPPORTED',
  'PQ_CHAIN_VERSION_UNSUPPORTED',
  'PQ_GATE_LIST_MISMATCH',
  'PQ_GATE_OUTCOME_MISMATCH',
  'PQ_GATE_DUPLICATED',
  'PQ_GATE_UNKNOWN',
  'PQ_GATE_RESULT_INVALID',
  'PQ_DENIAL_CODE_UNKNOWN',
  'PQ_FORGED_ALLOW',
  'PQ_IDENTITY_MALFORMED',
  'PQ_CHECKPOINT_MALFORMED',
  'PQ_AGGREGATE_INCONSISTENT',
  'PQ_DIGEST_MISMATCH',
] as const;
export type PqReceiptRejection = (typeof PQ_RECEIPT_REJECTIONS)[number];

export type PqReceiptValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly rejection: PqReceiptRejection };

/**
 * Validate a receipt, failing closed.
 *
 * The order of checks is deliberate: structural identity first, then the
 * forged-ALLOW consistency rule, then the digest. Checking the digest first
 * would report `PQ_DIGEST_MISMATCH` for a tampered gate list and hide WHAT was
 * tampered with.
 */
export function validatePqReceipt(candidate: unknown, digest: (canonical: string) => string): PqReceiptValidation {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return { ok: false, rejection: 'PQ_SCHEMA_UNSUPPORTED' };
  const receipt = candidate as Record<string, unknown>;
  if (receipt.schemaVersion !== PQ_RECEIPT_SCHEMA) return { ok: false, rejection: 'PQ_SCHEMA_UNSUPPORTED' };
  if (receipt.chainVersion !== PRODUCTION_ADMISSION_CHAIN_VERSION) return { ok: false, rejection: 'PQ_CHAIN_VERSION_UNSUPPORTED' };

  const ordered = receipt.orderedGates;
  if (!Array.isArray(ordered)) return { ok: false, rejection: 'PQ_GATE_LIST_MISMATCH' };
  if (new Set(ordered).size !== ordered.length) return { ok: false, rejection: 'PQ_GATE_DUPLICATED' };
  for (const gate of ordered) {
    if (typeof gate !== 'string' || !(PRODUCTION_ADMISSION_GATES as readonly string[]).includes(gate)) {
      return { ok: false, rejection: 'PQ_GATE_UNKNOWN' };
    }
  }
  // EXACT list equality, including order. This is the check that replaces the
  // historical count.
  if (ordered.length !== PRODUCTION_ADMISSION_GATES.length
    || ordered.some((gate, index) => gate !== PRODUCTION_ADMISSION_GATES[index])) {
    return { ok: false, rejection: 'PQ_GATE_LIST_MISMATCH' };
  }

  const outcomes = receipt.gateOutcomes;
  if (!Array.isArray(outcomes) || outcomes.length !== PRODUCTION_ADMISSION_GATES.length) {
    return { ok: false, rejection: 'PQ_GATE_OUTCOME_MISMATCH' };
  }
  for (const [index, entry] of outcomes.entries()) {
    if (entry === null || typeof entry !== 'object') return { ok: false, rejection: 'PQ_GATE_OUTCOME_MISMATCH' };
    const outcome = entry as Record<string, unknown>;
    if (outcome.gate !== PRODUCTION_ADMISSION_GATES[index]) return { ok: false, rejection: 'PQ_GATE_OUTCOME_MISMATCH' };
    if (!['PASS', 'DENY', 'NOT_EVALUATED'].includes(String(outcome.result))) return { ok: false, rejection: 'PQ_GATE_RESULT_INVALID' };
    const code = outcome.denialCode;
    if (code !== null && (typeof code !== 'string' || !(PRODUCTION_DENIAL_CODES as readonly string[]).includes(code))) {
      return { ok: false, rejection: 'PQ_DENIAL_CODE_UNKNOWN' };
    }
    if (outcome.result === 'DENY' && code === null) return { ok: false, rejection: 'PQ_DENIAL_CODE_UNKNOWN' };
    if (outcome.result !== 'DENY' && code !== null) return { ok: false, rejection: 'PQ_GATE_RESULT_INVALID' };
  }

  // A forged ALLOW is the single most valuable tamper, so it is checked
  // explicitly against the outcomes rather than trusted.
  const everyGatePassed = outcomes.every((entry) => (entry as Record<string, unknown>).result === 'PASS');
  if (receipt.finalResult === 'QUALIFIED' && !everyGatePassed) return { ok: false, rejection: 'PQ_FORGED_ALLOW' };
  if (receipt.finalResult === 'DENIED' && everyGatePassed) return { ok: false, rejection: 'PQ_FORGED_ALLOW' };
  if (!['QUALIFIED', 'DENIED'].includes(String(receipt.finalResult))) return { ok: false, rejection: 'PQ_FORGED_ALLOW' };

  for (const key of ['gateDefinitionDigest', 'routeEvidenceIdentity', 'readOnlyProofIdentity', 'parameterProvenanceIdentity', 'privacyPolicyIdentity', 'organizationWindowIdentity', 'budgetIdentity'] as const) {
    const value = receipt[key];
    if (typeof value !== 'string' || !DIGEST_RE.test(value)) return { ok: false, rejection: 'PQ_IDENTITY_MALFORMED' };
  }
  if (typeof receipt.sourceCheckpoint !== 'string' || !SHA_RE.test(receipt.sourceCheckpoint)) {
    return { ok: false, rejection: 'PQ_CHECKPOINT_MALFORMED' };
  }

  const dispatched = receipt.requestsDispatched;
  const denied = receipt.deniedBeforeDispatch;
  if (!Number.isInteger(dispatched) || !Number.isInteger(denied) || (dispatched as number) < 0 || (denied as number) < 0) {
    return { ok: false, rejection: 'PQ_AGGREGATE_INCONSISTENT' };
  }
  // A DENIED qualification cannot have dispatched anything, and a QUALIFIED one
  // must not claim a pre-dispatch denial of itself.
  if (receipt.finalResult === 'DENIED' && (dispatched as number) > 0) return { ok: false, rejection: 'PQ_AGGREGATE_INCONSISTENT' };

  const { receiptDigest, ...draft } = receipt as Record<string, unknown> & { receiptDigest?: unknown };
  if (typeof receiptDigest !== 'string' || receiptDigest !== `pqreceipt:${digest(canonical(draft))}`) {
    return { ok: false, rejection: 'PQ_DIGEST_MISMATCH' };
  }
  return { ok: true };
}
