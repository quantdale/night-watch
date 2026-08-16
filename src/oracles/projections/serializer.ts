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
  PROJECTION_FIELD_SAFE_FIELDS,
  PROJECTION_NODE_SAFE_FIELDS,
  PROJECTION_ROOT_SAFE_FIELDS,
  SEMANTIC_PROJECTION_PRIVACY_VIOLATION,
  SemanticProjectionError,
  type ProjectionField,
  type ProjectionNode,
  type SemanticProjection,
} from './types';

function canonicalString(value: string): string {
  return JSON.stringify(value);
}

function assertOnlyFields(record: Record<string, unknown>, allowed: ReadonlySet<string>, what: string): void {
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
  const parts: string[] = [];
  parts.push(canonicalString('type'), canonicalString(node.type));
  if (node.identityToken !== undefined) parts.push(canonicalString('identityToken'), canonicalString(node.identityToken));
  if (node.stringClass !== undefined) parts.push(canonicalString('stringClass'), canonicalString(node.stringClass));
  if (node.numericRef !== undefined) parts.push(canonicalString('numericRef'), canonicalString(node.numericRef));
  if (node.fieldCount !== undefined) parts.push(canonicalString('fieldCount'), String(node.fieldCount));
  if (node.fields !== undefined) parts.push(canonicalString('fields'), `[${node.fields.map(writeField).join(',')}]`);
  if (node.itemType !== undefined) parts.push(canonicalString('itemType'), canonicalString(node.itemType));
  if (node.itemCount !== undefined) parts.push(canonicalString('itemCount'), String(node.itemCount));
  if (node.inspectedCount !== undefined) parts.push(canonicalString('inspectedCount'), String(node.inspectedCount));
  if (node.items !== undefined) parts.push(canonicalString('items'), `[${node.items.map(writeNode).join(',')}]`);
  if (node.arrayTruncated !== undefined) parts.push(canonicalString('arrayTruncated'), node.arrayTruncated ? 'true' : 'false');
  return `{${parts.join(',')}}`;
}

function writeField(field: ProjectionField): string {
  assertOnlyFields(field as unknown as Record<string, unknown>, PROJECTION_FIELD_SAFE_FIELDS, 'projection-field');
  return `{${canonicalString('name')}:${canonicalString(field.name)},${canonicalString('node')}:${writeNode(field.node)}}`;
}

/** Canonical, byte-identical serialization of a safe projection DTO. */
export function serializeProjection(projection: SemanticProjection): string {
  assertOnlyFields(
    projection as unknown as Record<string, unknown>,
    PROJECTION_ROOT_SAFE_FIELDS,
    'projection-root',
  );
  return `{${canonicalString('schemaVersion')}:${canonicalString(projection.schemaVersion)},${canonicalString('root')}:${writeNode(projection.root)}}`;
}

/** Deterministic projection digest over the canonical serialization. */
export function projectionDigest(projection: SemanticProjection): string {
  const canonical = serializeProjection(projection);
  return `proj:sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`;
}
