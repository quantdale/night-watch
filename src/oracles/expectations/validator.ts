// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — strict expectation DTO validator (SPEC §20, §108).
//
// Rejects: unknown fields, duplicate expectation IDs, unsupported projection
// paths, free-form code, unbounded arrays/maps, missing provenance,
// malformed SHA, unknown invariant types, unsupported numeric operations,
// path traversal / source-path escape. No executable expression language.
// ---------------------------------------------------------------------------

import { DEFAULT_PROJECTION_LIMITS } from '../projections/types';
import { validateSafePath } from './paths';
import {
  MAX_EXPECTATION_ID_LENGTH,
  MAX_INVARIANTS_PER_EXPECTATION,
  MAX_NUMERIC_OPERANDS,
  MAX_TYPE_SET_SIZE,
  SEMANTIC_EXPECTATION_VERSION,
  type EnvelopeClass,
  type InvariantDefinition,
  type ProjectionContract,
  type SemanticExpectation,
  type SourceProvenance,
  type TransitionExpectation,
  type TypeMatchInvariant,
} from './types';

const SHA_RE = /^[0-9a-f]{40}$/;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const EXPECTED_TYPES = new Set(['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY']);
const ENVELOPE_CLASSES: ReadonlySet<EnvelopeClass> = new Set(['SUCCESS_ENVELOPE', 'ERROR_ENVELOPE', 'UNKNOWN_ENVELOPE']);
const TRANSITIONS: ReadonlySet<TransitionExpectation> = new Set(['CHANGE', 'REMAIN_STABLE', 'UNKNOWN']);
const INVARIANT_KINDS: ReadonlySet<string> = new Set([
  'FIELD_PRESENT',
  'FIELD_ABSENT',
  'TYPE_MATCH',
  'TYPE_IN_SET',
  'CARDINALITY_MATCH',
  'ENVELOPE_CLASS',
  'IDENTITY_EQUAL',
  'IDENTITY_PRESENT_IN_COLLECTION',
  'NUMERIC_SUM_RELATION',
  'COUNT_RELATION',
  'SHAPE_CHANGED',
  // Phase 11: collection-wide item contract (admitted through the real-source
  // collection admission bridge; never hand-authored outside that transform).
  'COLLECTION_ITEM_CONTRACT',
]);

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-not-an-object`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-not-a-string`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return expectString(value, label);
}

function expectInteger(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-out-of-range`);
  }
  return value;
}

function expectBoundedCount(value: unknown, label: string): number {
  return expectInteger(value, label, 0, 1_000_000);
}

function expectId(value: unknown, label: string): string {
  const id = expectString(value, label);
  if (id.length > MAX_EXPECTATION_ID_LENGTH || !ID_RE.test(id)) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-malformed-id`);
  }
  return id;
}

export function validateSourceProvenance(value: unknown): SourceProvenance {
  const record = expectRecord(value, 'sourceProvenance');
  const repoId = expectString(record['repoId'], 'sourceProvenance.repoId');
  const sha = expectString(record['sha'], 'sourceProvenance.sha');
  if (!SHA_RE.test(sha)) throw new Error('SEMANTIC_EXPECTATION_INVALID:sourceProvenance.sha-malformed');
  const relativePath = expectString(record['relativePath'], 'sourceProvenance.relativePath');
  if (relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\')) {
    throw new Error('SEMANTIC_EXPECTATION_INVALID:sourceProvenance.relativePath-escape');
  }
  const derivationVersion = expectString(record['derivationVersion'], 'sourceProvenance.derivationVersion');
  const symbol = optionalString(record['symbol'], 'sourceProvenance.symbol');
  const evidenceDigest = optionalString(record['evidenceDigest'], 'sourceProvenance.evidenceDigest');
  if (evidenceDigest !== undefined && !/^ev:sha256:[0-9a-f]{24}$/.test(evidenceDigest)) {
    throw new Error('SEMANTIC_EXPECTATION_INVALID:sourceProvenance.evidenceDigest-malformed');
  }
  assertNoUnknownFields(record, new Set(['repoId', 'sha', 'relativePath', 'symbol', 'derivationVersion', 'evidenceDigest']), 'sourceProvenance');
  return {
    repoId,
    sha,
    relativePath,
    derivationVersion,
    ...(symbol === undefined ? {} : { symbol }),
    ...(evidenceDigest === undefined ? {} : { evidenceDigest }),
  };
}

function assertNoUnknownFields(record: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:${label}-unknown-field:${key}`);
  }
}

function validateInvariant(value: unknown, index: number): InvariantDefinition {
  const record = expectRecord(value, `invariant[${index}]`);
  const kind = expectString(record['kind'], `invariant[${index}].kind`);
  if (!INVARIANT_KINDS.has(kind)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].kind-unsupported:${kind}`);

  switch (kind) {
    case 'FIELD_PRESENT': {
      const path = validateSafePath(record['path'], `invariant[${index}].path`);
      const expected = record['expected'];
      if (typeof expected !== 'boolean') throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].expected-not-boolean`);
      assertNoUnknownFields(record, new Set(['kind', 'path', 'expected']), `invariant[${index}]`);
      return { kind, path, expected };
    }
    case 'FIELD_ABSENT': {
      const path = validateSafePath(record['path'], `invariant[${index}].path`);
      assertNoUnknownFields(record, new Set(['kind', 'path']), `invariant[${index}]`);
      return { kind, path };
    }
    case 'TYPE_MATCH': {
      const path = validateSafePath(record['path'], `invariant[${index}].path`);
      const expectedType = expectString(record['expectedType'], `invariant[${index}].expectedType`);
      if (!EXPECTED_TYPES.has(expectedType)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].expectedType-unsupported`);
      assertNoUnknownFields(record, new Set(['kind', 'path', 'expectedType']), `invariant[${index}]`);
      return { kind, path, expectedType: expectedType as TypeMatchInvariant['expectedType'] };
    }
    case 'TYPE_IN_SET': {
      const path = validateSafePath(record['path'], `invariant[${index}].path`);
      const allowedTypes = record['allowedTypes'];
      if (!Array.isArray(allowedTypes) || allowedTypes.length === 0 || allowedTypes.length > MAX_TYPE_SET_SIZE) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].allowedTypes-unbounded`);
      }
      const seen = new Set<string>();
      for (let i = 0; i < allowedTypes.length; i++) {
        const type = expectString(allowedTypes[i], `invariant[${index}].allowedTypes[${i}]`);
        if (!EXPECTED_TYPES.has(type)) {
          throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].allowedTypes-unsupported:${type}`);
        }
        if (seen.has(type)) {
          throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].allowedTypes-duplicate:${type}`);
        }
        seen.add(type);
      }
      // Canonical sorted order (deterministic DTOs; receipts/fingerprints
      // stay stable across equivalent spellings).
      const canonical = [...seen].sort() as ('NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY')[];
      assertNoUnknownFields(record, new Set(['kind', 'path', 'allowedTypes']), `invariant[${index}]`);
      return { kind, path, allowedTypes: canonical };
    }
    case 'CARDINALITY_MATCH': {
      const path = validateSafePath(record['path'], `invariant[${index}].path`);
      const allowed = new Set(['kind', 'path', 'min', 'max', 'exact']);
      const min = record['min'] === undefined ? undefined : expectBoundedCount(record['min'], `invariant[${index}].min`);
      const max = record['max'] === undefined ? undefined : expectBoundedCount(record['max'], `invariant[${index}].max`);
      const exact = record['exact'] === undefined ? undefined : expectBoundedCount(record['exact'], `invariant[${index}].exact`);
      if (min === undefined && max === undefined && exact === undefined) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}]-no-bound`);
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}]-min-gt-max`);
      }
      // Phase 15P A04 cross-field coherence: an exact bound outside its own
      // optional min/max range is individually well-typed but jointly
      // unsatisfiable, so it fails closed.
      if (exact !== undefined && ((min !== undefined && exact < min) || (max !== undefined && exact > max))) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}]-exact-outside-min-max`);
      }
      assertNoUnknownFields(record, allowed, `invariant[${index}]`);
      return { kind, path, ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }), ...(exact === undefined ? {} : { exact }) };
    }
    case 'ENVELOPE_CLASS': {
      const expected = expectString(record['expected'], `invariant[${index}].expected`);
      if (!ENVELOPE_CLASSES.has(expected as EnvelopeClass)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].expected-unsupported`);
      const successField = validateSafePath(record['successField'], `invariant[${index}].successField`);
      const errorField = validateSafePath(record['errorField'], `invariant[${index}].errorField`);
      assertNoUnknownFields(record, new Set(['kind', 'expected', 'successField', 'errorField']), `invariant[${index}]`);
      return { kind, expected: expected as EnvelopeClass, successField, errorField };
    }
    case 'IDENTITY_EQUAL': {
      const leftPath = validateSafePath(record['leftPath'], `invariant[${index}].leftPath`);
      const rightPath = validateSafePath(record['rightPath'], `invariant[${index}].rightPath`);
      assertNoUnknownFields(record, new Set(['kind', 'leftPath', 'rightPath']), `invariant[${index}]`);
      return { kind, leftPath, rightPath };
    }
    case 'IDENTITY_PRESENT_IN_COLLECTION': {
      const collectionPath = validateSafePath(record['collectionPath'], `invariant[${index}].collectionPath`);
      const itemIdentityPath = validateSafePath(record['itemIdentityPath'], `invariant[${index}].itemIdentityPath`);
      const detailIdentityPath = validateSafePath(record['detailIdentityPath'], `invariant[${index}].detailIdentityPath`);
      const correlationContext = expectString(record['correlationContext'], `invariant[${index}].correlationContext`);
      assertNoUnknownFields(record, new Set(['kind', 'collectionPath', 'itemIdentityPath', 'detailIdentityPath', 'correlationContext']), `invariant[${index}]`);
      return { kind, collectionPath, itemIdentityPath, detailIdentityPath, correlationContext };
    }
    case 'NUMERIC_SUM_RELATION': {
      const relationId = expectId(record['relationId'], `invariant[${index}].relationId`);
      const collectionPath = validateSafePath(record['collectionPath'], `invariant[${index}].collectionPath`);
      const numericFieldPath = validateSafePath(record['numericFieldPath'], `invariant[${index}].numericFieldPath`);
      const scalarPath = validateSafePath(record['scalarPath'], `invariant[${index}].scalarPath`);
      assertNoUnknownFields(record, new Set(['kind', 'relationId', 'collectionPath', 'numericFieldPath', 'scalarPath']), `invariant[${index}]`);
      return { kind, relationId, collectionPath, numericFieldPath, scalarPath };
    }
    case 'COUNT_RELATION': {
      const relationId = expectId(record['relationId'], `invariant[${index}].relationId`);
      const operation = expectString(record['operation'], `invariant[${index}].operation`);
      if (operation !== 'COUNT_EQUALS' && operation !== 'COUNT_GTE') {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].operation-unsupported`);
      }
      const collectionPath = validateSafePath(record['collectionPath'], `invariant[${index}].collectionPath`);
      const hasScalar = record['scalarPath'] !== undefined;
      const hasConstant = record['expectedCount'] !== undefined;
      if (hasScalar === hasConstant) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}]-exactly-one-of-scalarPath-expectedCount`);
      }
      const scalarPath = hasScalar ? validateSafePath(record['scalarPath'], `invariant[${index}].scalarPath`) : undefined;
      const expectedCount = hasConstant ? expectBoundedCount(record['expectedCount'], `invariant[${index}].expectedCount`) : undefined;
      assertNoUnknownFields(record, new Set(['kind', 'relationId', 'operation', 'collectionPath', 'scalarPath', 'expectedCount']), `invariant[${index}]`);
      return {
        kind,
        relationId,
        operation,
        collectionPath,
        ...(scalarPath === undefined ? {} : { scalarPath }),
        ...(expectedCount === undefined ? {} : { expectedCount }),
      };
    }
    case 'SHAPE_CHANGED': {
      const expectedTransition = expectString(record['expectedTransition'], `invariant[${index}].expectedTransition`);
      if (!TRANSITIONS.has(expectedTransition as TransitionExpectation)) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].expectedTransition-unsupported`);
      }
      const statePath = record['statePath'] === undefined ? undefined : validateSafePath(record['statePath'], `invariant[${index}].statePath`);
      assertNoUnknownFields(record, new Set(['kind', 'expectedTransition', 'statePath']), `invariant[${index}]`);
      return { kind, expectedTransition: expectedTransition as TransitionExpectation, ...(statePath === undefined ? {} : { statePath }) };
    }
    case 'COLLECTION_ITEM_CONTRACT': {
      const collectionPath = validateSafePath(record['collectionPath'], `invariant[${index}].collectionPath`);
      const itemInvariantKind = expectString(record['itemInvariantKind'], `invariant[${index}].itemInvariantKind`);
      if (!['FIELD_PRESENT', 'FIELD_ABSENT', 'TYPE_MATCH', 'TYPE_IN_SET'].includes(itemInvariantKind)) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemInvariantKind-unsupported:${itemInvariantKind}`);
      }
      const itemRelativePath = validateSafePath(record['itemRelativePath'], `invariant[${index}].itemRelativePath`);
      if (itemRelativePath.length === 0) {
        throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemRelativePath-empty`);
      }
      switch (itemInvariantKind) {
        case 'FIELD_PRESENT': {
          const itemExpected = record['itemExpected'];
          if (typeof itemExpected !== 'boolean') throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemExpected-not-boolean`);
          assertNoUnknownFields(record, new Set(['kind', 'collectionPath', 'itemInvariantKind', 'itemRelativePath', 'itemExpected']), `invariant[${index}]`);
          return { kind, collectionPath, itemInvariantKind, itemRelativePath, itemExpected };
        }
        case 'FIELD_ABSENT': {
          assertNoUnknownFields(record, new Set(['kind', 'collectionPath', 'itemInvariantKind', 'itemRelativePath']), `invariant[${index}]`);
          return { kind, collectionPath, itemInvariantKind, itemRelativePath };
        }
        case 'TYPE_MATCH': {
          const itemExpectedType = expectString(record['itemExpectedType'], `invariant[${index}].itemExpectedType`);
          if (!EXPECTED_TYPES.has(itemExpectedType)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemExpectedType-unsupported`);
          assertNoUnknownFields(record, new Set(['kind', 'collectionPath', 'itemInvariantKind', 'itemRelativePath', 'itemExpectedType']), `invariant[${index}]`);
          return { kind, collectionPath, itemInvariantKind, itemRelativePath, itemExpectedType: itemExpectedType as TypeMatchInvariant['expectedType'] };
        }
        case 'TYPE_IN_SET': {
          const allowedTypes = record['itemAllowedTypes'];
          if (!Array.isArray(allowedTypes) || allowedTypes.length === 0 || allowedTypes.length > MAX_TYPE_SET_SIZE) {
            throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemAllowedTypes-unbounded`);
          }
          const seen = new Set<string>();
          for (let i = 0; i < allowedTypes.length; i++) {
            const type = expectString(allowedTypes[i], `invariant[${index}].itemAllowedTypes[${i}]`);
            if (!EXPECTED_TYPES.has(type)) {
              throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemAllowedTypes-unsupported:${type}`);
            }
            if (seen.has(type)) {
              throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemAllowedTypes-duplicate:${type}`);
            }
            seen.add(type);
          }
          const canonical = [...seen].sort() as ('NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY')[];
          assertNoUnknownFields(record, new Set(['kind', 'collectionPath', 'itemInvariantKind', 'itemRelativePath', 'itemAllowedTypes']), `invariant[${index}]`);
          return { kind, collectionPath, itemInvariantKind, itemRelativePath, itemAllowedTypes: canonical };
        }
        default:
          throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].itemInvariantKind-unsupported:${itemInvariantKind}`);
      }
    }
    default:
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariant[${index}].kind-unsupported:${kind}`);
  }
}

function validateProjectionContract(value: unknown): ProjectionContract {
  const record = expectRecord(value, 'projectionContract');
  const limitsRecord = expectRecord(record['limits'], 'projectionContract.limits');
  const allowed = new Set(['maxDepth', 'maxFieldsPerObject', 'maxArrayItemsInspected', 'maxProjectionNodes', 'maxIdentityTokens', 'maxNumericRefs', 'maxRawInputBytes']);
  const out: Record<string, number> = {};
  for (const key of Object.keys(limitsRecord)) {
    if (!allowed.has(key)) throw new Error(`SEMANTIC_EXPECTATION_INVALID:projectionContract.limits-unknown-field:${key}`);
    const value = limitsRecord[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:projectionContract.limits.${key}-invalid`);
    }
    out[key] = value;
  }
  assertNoUnknownFields(record, new Set(['limits']), 'projectionContract');
  return { limits: { ...DEFAULT_PROJECTION_LIMITS, ...out } };
}

/** Strict validation: returns the normalized expectation or throws
 *  `SEMANTIC_EXPECTATION_INVALID:<detail>`. */
export function validateExpectation(value: unknown): SemanticExpectation {
  const record = expectRecord(value, 'expectation');
  const schemaVersion = expectString(record['schemaVersion'], 'schemaVersion');
  if (schemaVersion !== SEMANTIC_EXPECTATION_VERSION) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:schemaVersion-unsupported:${schemaVersion}`);
  }
  const expectationId = expectId(record['expectationId'], 'expectationId');
  const targetKind = expectString(record['targetKind'], 'targetKind');
  if (!['API_OPERATION', 'JOURNEY_STEP', 'JOURNEY_TRANSITION'].includes(targetKind)) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:targetKind-unsupported:${targetKind}`);
  }
  const targetId = expectString(record['targetId'], 'targetId');
  const sourceProvenance = validateSourceProvenance(record['sourceProvenance']);
  const projectionContract = validateProjectionContract(record['projectionContract']);
  const invariants = record['invariantDefinitions'];
  if (!Array.isArray(invariants) || invariants.length === 0 || invariants.length > MAX_INVARIANTS_PER_EXPECTATION) {
    throw new Error(`SEMANTIC_EXPECTATION_INVALID:invariantDefinitions-unbounded`);
  }
  const invariantDefinitions = invariants.map((invariant, index) => validateInvariant(invariant, index));
  assertNoUnknownFields(
    record,
    new Set(['schemaVersion', 'expectationId', 'targetKind', 'targetId', 'sourceProvenance', 'projectionContract', 'invariantDefinitions']),
    'expectation',
  );
  return {
    schemaVersion,
    expectationId,
    targetKind: targetKind as SemanticExpectation['targetKind'],
    targetId,
    sourceProvenance,
    projectionContract,
    invariantDefinitions,
  };
}

/** Batch validation: rejects duplicate expectation IDs. */
export function validateExpectationBatch(values: readonly unknown[]): SemanticExpectation[] {
  const seen = new Set<string>();
  const out: SemanticExpectation[] = [];
  for (const value of values) {
    const expectation = validateExpectation(value);
    if (seen.has(expectation.expectationId)) {
      throw new Error(`SEMANTIC_EXPECTATION_INVALID:duplicate-expectation-id:${expectation.expectationId}`);
    }
    seen.add(expectation.expectationId);
    out.push(expectation);
  }
  return out;
}

export { MAX_NUMERIC_OPERANDS };
