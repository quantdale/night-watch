import { phase22Digest, phase22ReceiptId } from './digest';
import {
  PHASE22_PRIVACY_VERSION,
  type Phase22CardinalityClass,
  type Phase22DifferentialOutcome,
  type Phase22MembershipOutcome,
  type Phase22OrderingCategory,
  type Phase22Presence,
  type Phase22PrivacyReceipt,
  type Phase22RelationOutcome,
  type Phase22SafeObservation,
  type Phase22TypeClass,
} from './types';

const SAFE_KEYS = new Set([
  'schemaVersion', 'presence', 'typeClass', 'cardinalityClass', 'membershipOutcome',
  'relationOutcome', 'differentialOutcome', 'orderingCategory', 'inspectedItemCount',
  'violatingItemCount', 'projectionDigest', 'evidenceDigest',
]);
const PRESENCE = new Set<Phase22Presence>(['PRESENT', 'ABSENT']);
const TYPES = new Set<Phase22TypeClass>(['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY', 'UNKNOWN']);
const CARDINALITIES = new Set<Phase22CardinalityClass>(['EMPTY', 'SINGLE', 'FEW', 'MANY', 'UNKNOWN']);
const MEMBERSHIP = new Set<Phase22MembershipOutcome>(['MEMBER', 'NOT_MEMBER', 'NOT_APPLICABLE', 'UNKNOWN']);
const RELATIONS = new Set<Phase22RelationOutcome>(['HOLDS', 'VIOLATED', 'NOT_APPLICABLE', 'UNKNOWN']);
const DIFFERENTIALS = new Set<Phase22DifferentialOutcome>(['EXACT_EQUIVALENT', 'SEMANTICALLY_EQUIVALENT', 'EXPECTED_DIFFERENCE', 'CONTRACT_VIOLATION', 'NOT_APPLICABLE', 'UNKNOWN']);
const ORDERING = new Set<Phase22OrderingCategory>(['STABLE', 'CHANGED', 'NOT_APPLICABLE', 'UNKNOWN']);
const PROJECTION_RE = /^proj:sha256:[0-9a-f]{24}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const RECEIPT_RE = /^receipt:sha256:[0-9a-f]{24}$/;
const PRIVACY_RE = /^privacy:sha256:[0-9a-f]{24}$/;

function rejected(reason: string): never {
  throw new Error(`PHASE22_PRIVACY_REJECTED:${reason}`);
}

function plainObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) rejected('NOT_OBJECT');
  const object = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(object);
  if (prototype !== Object.prototype && prototype !== null) rejected('PROTOTYPE');
  return object;
}

function boundedCount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 128) rejected(`${field}_COUNT`);
  return value;
}

/**
 * The authenticated-observation boundary accepts a closed categorical DTO,
 * never a projection tree or a product payload.  Unknown keys are rejected
 * before they can be serialized, fingerprinted or placed in a dossier.
 */
export function guardPhase22SafeObservation(value: unknown): Phase22SafeObservation {
  const input = plainObject(value);
  for (const key of Object.keys(input)) if (!SAFE_KEYS.has(key)) rejected(`FIELD:${key}`);
  if (input.schemaVersion !== PHASE22_PRIVACY_VERSION) rejected('SCHEMA_VERSION');
  if (input.presence !== undefined && (typeof input.presence !== 'string' || !PRESENCE.has(input.presence as Phase22Presence))) rejected('PRESENCE');
  if (input.typeClass !== undefined && (typeof input.typeClass !== 'string' || !TYPES.has(input.typeClass as Phase22TypeClass))) rejected('TYPE_CLASS');
  if (input.cardinalityClass !== undefined && (typeof input.cardinalityClass !== 'string' || !CARDINALITIES.has(input.cardinalityClass as Phase22CardinalityClass))) rejected('CARDINALITY_CLASS');
  if (input.membershipOutcome !== undefined && (typeof input.membershipOutcome !== 'string' || !MEMBERSHIP.has(input.membershipOutcome as Phase22MembershipOutcome))) rejected('MEMBERSHIP_OUTCOME');
  if (input.relationOutcome !== undefined && (typeof input.relationOutcome !== 'string' || !RELATIONS.has(input.relationOutcome as Phase22RelationOutcome))) rejected('RELATION_OUTCOME');
  if (input.differentialOutcome !== undefined && (typeof input.differentialOutcome !== 'string' || !DIFFERENTIALS.has(input.differentialOutcome as Phase22DifferentialOutcome))) rejected('DIFFERENTIAL_OUTCOME');
  if (input.orderingCategory !== undefined && (typeof input.orderingCategory !== 'string' || !ORDERING.has(input.orderingCategory as Phase22OrderingCategory))) rejected('ORDERING_CATEGORY');
  if (input.inspectedItemCount !== undefined) boundedCount(input.inspectedItemCount, 'INSPECTED');
  if (input.violatingItemCount !== undefined) boundedCount(input.violatingItemCount, 'VIOLATING');
  if (typeof input.inspectedItemCount === 'number' && typeof input.violatingItemCount === 'number' && input.violatingItemCount > input.inspectedItemCount) rejected('VIOLATING_EXCEEDS_INSPECTED');
  if (input.projectionDigest !== undefined && (typeof input.projectionDigest !== 'string' || !PROJECTION_RE.test(input.projectionDigest))) rejected('PROJECTION_DIGEST');
  if (input.evidenceDigest !== undefined && (typeof input.evidenceDigest !== 'string' || !EVIDENCE_RE.test(input.evidenceDigest))) rejected('EVIDENCE_DIGEST');
  if (Object.keys(input).length < 2) rejected('NO_CATEGORICAL_OUTPUT');
  return { ...input } as unknown as Phase22SafeObservation;
}

export function assertPhase22PrivacySafeObservation(value: unknown): asserts value is Phase22SafeObservation {
  guardPhase22SafeObservation(value);
}

/** Safe adapter for existing semantic results.  Callers provide only
 * already-classified metadata; the adapter has no parameter for raw values,
 * rows, sets, DOM, body text, headers, cookies or storage state. */
export function projectPhase22SemanticCategories(input: {
  readonly relationOutcome?: Phase22RelationOutcome;
  readonly differentialOutcome?: Phase22DifferentialOutcome;
  readonly membershipOutcome?: Phase22MembershipOutcome;
  readonly presence?: Phase22Presence;
  readonly typeClass?: Phase22TypeClass;
  readonly cardinalityClass?: Phase22CardinalityClass;
  readonly orderingCategory?: Phase22OrderingCategory;
  readonly inspectedItemCount?: number;
  readonly violatingItemCount?: number;
  readonly projectionDigest?: string;
  readonly evidenceDigest?: string;
}): Phase22SafeObservation {
  return guardPhase22SafeObservation({ schemaVersion: PHASE22_PRIVACY_VERSION, ...input });
}

export function createPhase22PrivacyReceipt(input: {
  readonly approvedCategoryCount: number;
  readonly rejectedEventCount: number;
}): Phase22PrivacyReceipt {
  const approved = boundedCount(input.approvedCategoryCount, 'APPROVED');
  const rejectedCount = boundedCount(input.rejectedEventCount, 'REJECTED');
  const core = {
    schemaVersion: PHASE22_PRIVACY_VERSION,
    approvedCategoryCount: approved,
    rejectedEventCount: rejectedCount,
    rawPersistenceCount: 0 as const,
  };
  const receipt: Phase22PrivacyReceipt = {
    ...core,
    receiptId: phase22ReceiptId(core),
    deterministicDigest: phase22Digest({ ...core, receiptId: phase22ReceiptId(core) }, 'privacy:sha256:'),
  };
  validatePhase22PrivacyReceipt(receipt);
  return receipt;
}

export function validatePhase22PrivacyReceipt(receipt: Phase22PrivacyReceipt): void {
  if (receipt.schemaVersion !== PHASE22_PRIVACY_VERSION || receipt.rawPersistenceCount !== 0) rejected('RECEIPT_HEADER');
  if (!RECEIPT_RE.test(receipt.receiptId) || !PRIVACY_RE.test(receipt.deterministicDigest)) rejected('RECEIPT_ID');
  boundedCount(receipt.approvedCategoryCount, 'APPROVED');
  boundedCount(receipt.rejectedEventCount, 'REJECTED');
  const core = {
    schemaVersion: receipt.schemaVersion,
    approvedCategoryCount: receipt.approvedCategoryCount,
    rejectedEventCount: receipt.rejectedEventCount,
    rawPersistenceCount: 0 as const,
  };
  if (receipt.receiptId !== phase22ReceiptId(core)) rejected('RECEIPT_DIGEST');
  if (receipt.deterministicDigest !== phase22Digest({ ...core, receiptId: receipt.receiptId }, 'privacy:sha256:')) rejected('RECEIPT_DIGEST');
}

/** A closed-key audit for owner artifacts.  This is deliberately generic so
 * it can be applied to a parsed artifact before persistence. */
export function assertPhase22NoRawArtifactFields(value: unknown): void {
  const forbidden = new Set([
    'raw', 'rawBody', 'rawValue', 'rawExpected', 'rawObserved', 'body', 'responseBody', 'dom', 'domText',
    'html', 'cookie', 'cookies', 'token', 'authorization', 'storageState', 'storage_state', 'screenshot',
    'trace', 'customerValue', 'customerId', 'accountName', 'mspName', 'email', 'members', 'setMembers',
  ]);
  // Authenticated RunRecorder manifests intentionally carry negative policy
  // assertions such as `storageState: false` and `traces: false`.  Those
  // booleans describe what was not persisted; they are not evidence payloads.
  // The same keys with any other value remain forbidden below.
  const safeFalsePolicyKeys = new Set([
    'requestHeaders', 'requestBodies', 'responseBodies', 'queryValues',
    'storageState', 'customerDom', 'screenshots', 'traces',
  ]);
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const object = node as Record<string, unknown>;
    for (const key of Object.keys(object)) {
      const negativePolicyAssertion = safeFalsePolicyKeys.has(key) && object[key] === false;
      if (!negativePolicyAssertion && (forbidden.has(key) || /(?:raw|customer|bearer|cookie|token|storage|screenshot|trace|dom|response.?body|set.?members?)/i.test(key))) rejected(`ARTIFACT_FIELD:${key}`);
      visit(object[key]);
    }
  };
  visit(value);
}
