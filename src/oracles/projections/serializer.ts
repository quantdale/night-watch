// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — canonical deterministic projection serializer (SPEC
// §24, §23).
//
// - Stable key ordering (sorted object keys);
// - stable array ordering (projection arrays are semantically ordered);
// - no `JSON.stringify(rawObject)` shortcut — a strict canonical writer with
//   structural validation of the safe DTO (unknown fields on a projection
//   node are a privacy violation by construction);
// - byte-identical output for identical admitted inputs;
// - deterministic digest: `proj:sha256:<24 hex>` over the canonical bytes
//   (schema version + projection content; no time/seed/machine/raw values).
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  DEFAULT_PROJECTION_LIMITS,
  FORBIDDEN_FIELD_NAMES,
  PROJECTION_FIELD_SAFE_FIELDS,
  PROJECTION_NODE_SAFE_FIELDS,
  PROJECTION_ROOT_SAFE_FIELDS,
  SEMANTIC_PROJECTION_PRIVACY_VIOLATION,
  SemanticProjectionError,
  type ProjectionField,
  type ProjectionNode,
  type SemanticProjection,
} from './types';

const NODE_TYPES: ReadonlySet<string> = new Set(['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY']);
const IDENTITY_TOKEN_RE = /^entity#[0-9]{4}$/;
const NUMERIC_REF_RE = /^numeric#[0-9]{4}$/;
const MAX_SERIALIZED_COUNT = 1_000_000;

function failInvalid(detail: string): never {
  throw new SemanticProjectionError(SEMANTIC_PROJECTION_PRIVACY_VIOLATION, `invalid-${detail}`);
}

function boundedInteger(value: unknown, label: string, max = MAX_SERIALIZED_COUNT): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) return failInvalid(label);
  return value;
}

function canonicalString(value: string): string {
  return JSON.stringify(value);
}

function assertOnlyFields(record: Record<string, unknown>, allowed: ReadonlySet<string>, what: string): void {
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new SemanticProjectionError(SEMANTIC_PROJECTION_PRIVACY_VIOLATION, `prototype-${what}`);
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_PRIVACY_VIOLATION,
        `unknown-${what}-field:${key}`,
      );
    }
  }
}

function writeNode(node: ProjectionNode): string {
  assertOnlyFields(node as unknown as Record<string, unknown>, PROJECTION_NODE_SAFE_FIELDS, 'projection-node');
  if (!NODE_TYPES.has(node.type)) failInvalid('node-type');
  const parts: string[] = [];
  parts.push(canonicalString('type'), canonicalString(node.type));
  if (node.type === 'NULL') {
    if (Object.keys(node).length !== 1) failInvalid('null-fields');
  } else if (node.type === 'BOOLEAN') {
    if (node.booleanClass !== 'TRUE' && node.booleanClass !== 'FALSE') failInvalid('boolean-class');
    if (Object.keys(node).some((key) => !new Set(['type', 'booleanClass']).has(key))) failInvalid('boolean-fields');
    parts.push(canonicalString('booleanClass'), canonicalString(node.booleanClass));
  } else if (node.type === 'STRING') {
    if (node.stringClass !== 'EMPTY' && node.stringClass !== 'NONEMPTY') failInvalid('string-class');
    if (node.identityToken === undefined || !IDENTITY_TOKEN_RE.test(node.identityToken)) failInvalid('identity-token');
    if (Object.keys(node).some((key) => !new Set(['type', 'identityToken', 'stringClass']).has(key))) failInvalid('string-fields');
    parts.push(canonicalString('identityToken'), canonicalString(node.identityToken));
    parts.push(canonicalString('stringClass'), canonicalString(node.stringClass));
  } else if (node.type === 'NUMBER') {
    if (node.numericRef === undefined || !NUMERIC_REF_RE.test(node.numericRef)) failInvalid('numeric-ref');
    if (Object.keys(node).some((key) => !new Set(['type', 'numericRef']).has(key))) failInvalid('number-fields');
    parts.push(canonicalString('numericRef'), canonicalString(node.numericRef));
  } else if (node.type === 'OBJECT') {
    const fieldCount = boundedInteger(node.fieldCount, 'object-field-count', DEFAULT_PROJECTION_LIMITS.maxFieldsPerObject);
    if (!Array.isArray(node.fields) || node.fields.length !== fieldCount) failInvalid('object-fields');
    for (let index = 1; index < node.fields.length; index += 1) {
      if (node.fields[index - 1]!.name >= node.fields[index]!.name) failInvalid('object-field-order');
    }
    if (Object.keys(node).some((key) => !new Set(['type', 'fieldCount', 'fields']).has(key))) failInvalid('object-fields-extra');
    parts.push(canonicalString('fieldCount'), String(fieldCount));
    parts.push(canonicalString('fields'), `[${node.fields.map(writeField).join(',')}]`);
  } else if (node.type === 'ARRAY') {
    if (node.itemType === undefined || (node.itemType !== 'MIXED' && !NODE_TYPES.has(node.itemType))) failInvalid('array-item-type');
    const itemCount = boundedInteger(node.itemCount, 'array-item-count');
    const inspectedCount = boundedInteger(node.inspectedCount, 'array-inspected-count');
    if (inspectedCount > itemCount || !Array.isArray(node.items) || node.items.length !== inspectedCount) failInvalid('array-cardinality');
    if (node.arrayTruncated !== (itemCount > inspectedCount)) failInvalid('array-truncation');
    if (Object.keys(node).some((key) => !new Set(['type', 'itemType', 'itemCount', 'inspectedCount', 'items', 'arrayTruncated']).has(key))) failInvalid('array-fields');
    parts.push(canonicalString('itemType'), canonicalString(node.itemType));
    parts.push(canonicalString('itemCount'), String(itemCount));
    parts.push(canonicalString('inspectedCount'), String(inspectedCount));
    parts.push(canonicalString('items'), `[${node.items.map(writeNode).join(',')}]`);
    parts.push(canonicalString('arrayTruncated'), node.arrayTruncated ? 'true' : 'false');
  }
  return `{${parts.join(',')}}`;
}

function writeField(field: ProjectionField): string {
  assertOnlyFields(field as unknown as Record<string, unknown>, PROJECTION_FIELD_SAFE_FIELDS, 'projection-field');
  if (typeof field.name !== 'string' || field.name.length > 200 || FORBIDDEN_FIELD_NAMES.has(field.name) || field.name.includes('\u0000')) failInvalid('field-name');
  return `{${canonicalString('name')}:${canonicalString(field.name)},${canonicalString('node')}:${writeNode(field.node)}}`;
}

/** Canonical, byte-identical serialization of a safe projection DTO. */
export function serializeProjection(projection: SemanticProjection): string {
  assertOnlyFields(
    projection as unknown as Record<string, unknown>,
    PROJECTION_ROOT_SAFE_FIELDS,
    'projection-root',
  );
  if (projection.schemaVersion !== 'nightwatch.semantic-projection.v1') failInvalid('schema-version');
  return `{${canonicalString('schemaVersion')}:${canonicalString(projection.schemaVersion)},${canonicalString('root')}:${writeNode(projection.root)}}`;
}

/** Deterministic projection digest over the canonical serialization. */
export function projectionDigest(projection: SemanticProjection): string {
  const canonical = serializeProjection(projection);
  return `proj:sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`;
}
