// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic bounded semantic projection.
//
// Converts an ephemeral raw observation VALUE into the safe
// `SemanticProjection` DTO:
//   - object keys are projected in canonical (sorted) order so encounter
//     tokens/numeric refs are deterministic for deterministic input;
//   - string values become type + presence + empty/nonempty class + opaque
//     identity token (never the value itself);
//   - numeric values become type + opaque numeric ref (never the value);
//   - hard caps on depth / fields / array items / nodes / identities /
//     numerics; overflow throws a bounded SEMANTIC_PROJECTION_LIMIT_EXCEEDED
//     classification (fail-closed, never a false semantic PASS);
//   - hostile inputs (cycles, throwing getters, prototype-key fields,
//     non-JSON scalars) fail deterministically with bounded classifications.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import { ProjectionContext } from './identity';
import {
  DEFAULT_PROJECTION_LIMITS,
  FORBIDDEN_FIELD_NAMES,
  SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
  SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
  SemanticProjectionError,
  SEMANTIC_PROJECTION_VERSION,
  type ProjectionField,
  type ProjectionLimits,
  type ProjectionNode,
  type ProjectionNodeType,
  type SemanticProjection,
} from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Guard: raw JSON text byte budget for direct projector users (integration
 *  boundaries already bound their bodies; this is the same fail-closed rule
 *  for standalone use). */
export function assertProjectionInputBytes(rawBytes: number, limits: ProjectionLimits = DEFAULT_PROJECTION_LIMITS): void {
  if (!Number.isFinite(rawBytes) || rawBytes < 0 || rawBytes > limits.maxRawInputBytes) {
    throw new SemanticProjectionError(
      SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
      'raw-input-bytes',
    );
  }
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface ProjectObservationResult {
  readonly projection: SemanticProjection;
  readonly nodeCount: number;
}

class Projector {
  nodeCount = 0;
  private readonly seen = new WeakSet<object>();

  constructor(
    private readonly ctx: ProjectionContext,
    private readonly limits: ProjectionLimits,
  ) {}

  private countNode(): void {
    this.nodeCount += 1;
    if (this.nodeCount > this.limits.maxProjectionNodes) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
        'projection-node-cap',
      );
    }
  }

  project(value: unknown, depth: number): ProjectionNode {
    if (depth > this.limits.maxDepth) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
        'projection-depth-cap',
      );
    }
    this.countNode();
    if (value === null) return { type: 'NULL' };
    switch (typeof value) {
      case 'boolean':
        return { type: 'BOOLEAN', booleanClass: value ? 'TRUE' : 'FALSE' };
      case 'number':
        if (!Number.isFinite(value)) {
          throw new SemanticProjectionError(
            SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
            'non-finite-number',
          );
        }
        return { type: 'NUMBER', numericRef: this.ctx.refForNumber(value) };
      case 'string': {
        if (value.length > this.limits.maxRawInputBytes) {
          throw new SemanticProjectionError(
            SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
            'string-value-bytes',
          );
        }
        return {
          type: 'STRING',
          stringClass: value.length === 0 ? 'EMPTY' : 'NONEMPTY',
          identityToken: this.ctx.tokenForString(value),
        };
      }
      case 'object':
        return Array.isArray(value) ? this.projectArray(value, depth) : this.projectObject(value as Record<string, unknown>, depth);
      default:
        // bigint / symbol / function / undefined are not JSON values.
        throw new SemanticProjectionError(
          SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
          `non-json-scalar:${typeof value}`,
        );
    }
  }

  private projectObject(value: Record<string, unknown>, depth: number): ProjectionNode {
    if (this.seen.has(value)) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
        'cyclic-object',
      );
    }
    if (!isPlainObject(value)) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
        'non-plain-object',
      );
    }
    this.seen.add(value);
    try {
      const keys = Object.keys(value).sort();
      if (keys.length > this.limits.maxFieldsPerObject) {
        throw new SemanticProjectionError(
          SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
          'object-field-cap',
        );
      }
      const fields: ProjectionField[] = [];
      for (const name of keys) {
        if (FORBIDDEN_FIELD_NAMES.has(name)) {
          throw new SemanticProjectionError(
            SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
            'forbidden-field-name',
          );
        }
        let child: unknown;
        try {
          child = value[name];
        } catch {
          // A throwing getter must fail with a bounded classification and
          // never propagate the raw getter error (SPEC §55).
          throw new SemanticProjectionError(
            SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
            'getter-threw',
          );
        }
        fields.push({ name, node: this.project(child, depth + 1) });
      }
      return { type: 'OBJECT', fieldCount: fields.length, fields };
    } finally {
      this.seen.delete(value);
    }
  }

  private projectArray(value: unknown[], depth: number): ProjectionNode {
    if (this.seen.has(value)) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
        'cyclic-array',
      );
    }
    this.seen.add(value);
    try {
      const itemCount = value.length;
      const inspectedCount = Math.min(itemCount, this.limits.maxArrayItemsInspected);
      const items: ProjectionNode[] = [];
      let itemType: ProjectionNodeType | 'MIXED' | null = null;
      for (let i = 0; i < inspectedCount; i++) {
        const item = this.project(value[i], depth + 1);
        items.push(item);
        if (itemType === null) {
          itemType = item.type;
        } else if (itemType !== item.type) {
          itemType = 'MIXED';
        }
      }
      return {
        type: 'ARRAY',
        itemType: itemType ?? 'MIXED',
        itemCount,
        inspectedCount,
        items,
        arrayTruncated: itemCount > inspectedCount,
      };
    } finally {
      this.seen.delete(value);
    }
  }
}

/** Project one ephemeral raw value into the safe DTO using a caller-owned
 *  context (share one context across the steps that must correlate). */
export function projectValue(
  value: unknown,
  ctx: ProjectionContext,
  limits: ProjectionLimits = DEFAULT_PROJECTION_LIMITS,
): ProjectObservationResult {
  const projector = new Projector(ctx, limits);
  const projection: SemanticProjection = {
    schemaVersion: SEMANTIC_PROJECTION_VERSION,
    root: projector.project(value, 0),
  };
  return { projection, nodeCount: projector.nodeCount };
}

/** Convenience: project a raw observation descriptor with a fresh context
 *  (used where no cross-step correlation is needed). */
export function projectObservation(
  raw: { readonly value: unknown },
  limits: ProjectionLimits = DEFAULT_PROJECTION_LIMITS,
): ProjectObservationResult {
  const ctx = new ProjectionContext(limits);
  return projectValue(raw.value, ctx, limits);
}
