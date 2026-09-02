// ---------------------------------------------------------------------------
// Nightwatch C-10 — the production privacy boundary, as three distinct types.
//
//   RAW_EPHEMERAL              raw production bytes, one call scope, never stored
//        |  projectProduction()
//        v
//   SAFE_STRUCTURAL_PROJECTION allowlisted structure; MAY carry EPHEMERAL
//                              encounter tokens for in-memory correlation
//        |  toProductionEvidence()
//        v
//   SAFE_PRODUCTION_EVIDENCE   the ONLY persistable DTO: no encounter token,
//                              no numeric ref, no unproven key literal
//
// The campaign brief §8 requires these to be distinct types rather than
// `unknown` threaded through loosely typed helpers, so each carries a runtime
// `boundaryClass` discriminant that the persistence firewall re-checks.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';

export const PRODUCTION_PROJECTION_VERSION = 'nightwatch.production-projection.v1' as const;
export const PRODUCTION_EVIDENCE_VERSION = 'nightwatch.production-evidence.v1' as const;

// ---------------------------------------------------------------------------
// Bounds.
// ---------------------------------------------------------------------------

export interface ProductionProjectionLimits {
  readonly maxDepth: number;
  readonly maxFieldsPerObject: number;
  readonly maxDynamicKeysPerObject: number;
  readonly maxArrayItemsInspected: number;
  readonly maxProjectionNodes: number;
  readonly maxEncounterTokens: number;
  readonly maxRawInputBytes: number;
  readonly maxStringValueBytes: number;
}

export const DEFAULT_PRODUCTION_PROJECTION_LIMITS: ProductionProjectionLimits = Object.freeze({
  maxDepth: 8,
  maxFieldsPerObject: 64,
  maxDynamicKeysPerObject: 256,
  maxArrayItemsInspected: 128,
  maxProjectionNodes: 1024,
  maxEncounterTokens: 256,
  maxRawInputBytes: 1_000_000,
  maxStringValueBytes: 4096,
});

// ---------------------------------------------------------------------------
// The projected structural vocabulary. This is a CLOSED vocabulary: there is
// no member that can hold a raw value, and no `string` field anywhere that a
// caller value could reach except a SOURCE-PROVEN key literal.
// ---------------------------------------------------------------------------

export type ProductionNodeType = 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY';
export type ProductionStringClass = 'EMPTY' | 'NONEMPTY';
export type ProductionBooleanClass = 'TRUE' | 'FALSE';

/**
 * How the key literals of one object were established.
 *
 * `UNRESOLVED` is the fail-closed member: an UNKNOWN privacy classification
 * must DENY persistence (campaign brief §4), so evidence construction and the
 * persistence firewall both refuse it.
 */
export const KEY_PROVENANCE_CLASSIFICATIONS = [
  'ALL_SOURCE_PROVEN',
  'BOUNDED_DYNAMIC_KEY_COLLECTION',
  'MIXED',
  'UNRESOLVED',
] as const;
export type KeyProvenanceClassification = (typeof KEY_PROVENANCE_CLASSIFICATIONS)[number];

/** Severity order used to fold child classifications into their parent. */
const CLASSIFICATION_SEVERITY: Readonly<Record<KeyProvenanceClassification, number>> = Object.freeze({
  ALL_SOURCE_PROVEN: 0,
  BOUNDED_DYNAMIC_KEY_COLLECTION: 1,
  MIXED: 2,
  UNRESOLVED: 3,
});

/** Fold two classifications, keeping the less safe one. */
export function worseClassification(
  left: KeyProvenanceClassification,
  right: KeyProvenanceClassification,
): KeyProvenanceClassification {
  return CLASSIFICATION_SEVERITY[left] >= CLASSIFICATION_SEVERITY[right] ? left : right;
}

/** A field whose NAME is a proven member of a source-proven finite key set. */
export interface ProductionProvenField {
  readonly name: string;
  readonly node: ProductionNode;
}

export interface ProductionNode {
  readonly type: ProductionNodeType;
  /** BOOLEAN only: categorical truth value, never a customer value. */
  readonly booleanClass?: ProductionBooleanClass;
  /** STRING only: empty/nonempty class. Never the value, never its length. */
  readonly stringClass?: ProductionStringClass;
  /**
   * STRING only, EPHEMERAL: encounter-order correlation label (`enc#0001`).
   * Not a hash, not derived from the value. Campaign-scoped, stripped before
   * evidence, and rejected by the persistence firewall.
   */
  readonly encounterToken?: string;
  /**
   * NUMBER only, EPHEMERAL: encounter-order numeric reference (`num#0001`).
   * Stripped before evidence, and rejected by the persistence firewall.
   */
  readonly numericEncounterRef?: string;
  /** OBJECT only: total key count (a bounded cardinality, safe). */
  readonly fieldCount?: number;
  /** OBJECT only: how the object's keys were established. */
  readonly keyProvenance?: KeyProvenanceClassification;
  /** OBJECT only: how many keys were source-proven. */
  readonly provenFieldCount?: number;
  /** OBJECT only: how many keys were dynamic/untrusted. */
  readonly dynamicFieldCount?: number;
  /** OBJECT only: fields whose key literal is source-proven, canonical order. */
  readonly provenFields?: readonly ProductionProvenField[];
  /**
   * OBJECT only: the VALUE structures of dynamic-keyed entries, in canonical
   * structural order. Deliberately a bare node list: there is no field on this
   * type that could carry a dynamic key literal or a digest derived from one.
   */
  readonly dynamicFields?: readonly ProductionNode[];
  /** ARRAY only: homogeneous item type or MIXED. */
  readonly itemType?: ProductionNodeType | 'MIXED';
  /** ARRAY only: total element count (bounded cardinality, safe). */
  readonly itemCount?: number;
  /** ARRAY only: how many elements were projected. */
  readonly inspectedCount?: number;
  /** ARRAY only: projected element structures. */
  readonly items?: readonly ProductionNode[];
  /** ARRAY only: true when itemCount exceeded the inspection bound. */
  readonly arrayTruncated?: boolean;
}

// ---------------------------------------------------------------------------
// RAW_EPHEMERAL — the single bounded, call-scoped raw reader.
//
// Design §6.5 "boundary isolation" requires raw bytes to enter the analyzer
// through ONE call-scoped reader. This source yields its value exactly once
// and then refuses; it holds no persistence or transport capability, and it
// cannot be serialized.
// ---------------------------------------------------------------------------

export class RawEphemeralSource {
  readonly boundaryClass = 'RAW_EPHEMERAL' as const;
  private consumed = false;
  private value: unknown;

  private constructor(value: unknown) {
    this.value = value;
  }

  /** Wrap an already-parsed, bounded, in-memory raw value. */
  static of(value: unknown): RawEphemeralSource {
    return new RawEphemeralSource(value);
  }

  /**
   * Yield the raw value exactly once, then drop the reference. A second read
   * is a categorical boundary violation rather than a silent re-observation.
   */
  read(): unknown {
    if (this.consumed) failProduction('PRODUCTION_PRIVACY_RAW_SOURCE_EXHAUSTED', 'RAW_SOURCE_REUSED');
    this.consumed = true;
    const value = this.value;
    this.value = undefined;
    return value;
  }

  /** Raw bytes must never become a recorder, dossier or log payload. */
  toJSON(): never {
    return failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'BOUNDARY_CLASS');
  }
}

// ---------------------------------------------------------------------------
// SAFE_STRUCTURAL_PROJECTION — allowlisted structure, ephemeral correlation.
// ---------------------------------------------------------------------------

export interface SafeStructuralProjection {
  readonly boundaryClass: 'SAFE_STRUCTURAL_PROJECTION';
  readonly schemaVersion: typeof PRODUCTION_PROJECTION_VERSION;
  /** The folded, worst-case classification across the whole projection. */
  readonly keyProvenance: KeyProvenanceClassification;
  readonly root: ProductionNode;
}

// ---------------------------------------------------------------------------
// SAFE_PRODUCTION_EVIDENCE — the ONLY persistable DTO.
// ---------------------------------------------------------------------------

/** HTTP status CLASS, never a concrete body or header. */
export type ProductionStatusClass = '1XX' | '2XX' | '3XX' | '4XX' | '5XX';

export interface SafeProductionEvidence {
  readonly boundaryClass: 'SAFE_PRODUCTION_EVIDENCE';
  readonly schemaVersion: typeof PRODUCTION_EVIDENCE_VERSION;
  /** Route TEMPLATE identity, e.g. `GET /v1/billing/groups/{id}`. Never concrete. */
  readonly routeTemplate: string;
  readonly statusClass: ProductionStatusClass;
  readonly keyProvenance: Exclude<KeyProvenanceClassification, 'UNRESOLVED'>;
  /** Provenance of the vocabulary used, carrying no key literals. */
  readonly vocabularyProvenanceClass: string;
  readonly vocabularyProvenanceDigest: string | null;
  /** F-15 STRUCTURAL family: `prodstruct:sha256:<24>`. Value-free, unsalted. */
  readonly structuralDigest: string;
  /** The structural projection with every ephemeral correlation field removed. */
  readonly root: ProductionNode;
}

// ---------------------------------------------------------------------------
// Closed field vocabularies. The persistence firewall walks these
// independently of the projection that produced the DTO.
// ---------------------------------------------------------------------------

export const PRODUCTION_NODE_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'type',
  'booleanClass',
  'stringClass',
  'encounterToken',
  'numericEncounterRef',
  'fieldCount',
  'keyProvenance',
  'provenFieldCount',
  'dynamicFieldCount',
  'provenFields',
  'dynamicFields',
  'itemType',
  'itemCount',
  'inspectedCount',
  'items',
  'arrayTruncated',
]);

/** Fields a PERSISTED node may carry. The two ephemeral members are absent. */
export const PRODUCTION_EVIDENCE_NODE_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'type',
  'booleanClass',
  'stringClass',
  'fieldCount',
  'keyProvenance',
  'provenFieldCount',
  'dynamicFieldCount',
  'provenFields',
  'dynamicFields',
  'itemType',
  'itemCount',
  'inspectedCount',
  'items',
  'arrayTruncated',
]);

export const PRODUCTION_PROVEN_FIELD_SAFE_FIELDS: ReadonlySet<string> = new Set(['name', 'node']);

/**
 * EXACT per-type field sets.
 *
 * A node must carry the fields of its own type and no others. Without this a
 * field belonging to a different type (say `itemCount` on an OBJECT) is
 * ignored by the canonical writer, so it does not change the structural
 * digest — and a tampered structure would travel under a matching digest.
 */
export const PRODUCTION_NODE_FIELDS_BY_TYPE: Readonly<Record<ProductionNodeType, ReadonlySet<string>>> =
  Object.freeze({
    NULL: new Set(['type']),
    BOOLEAN: new Set(['type', 'booleanClass']),
    NUMBER: new Set(['type', 'numericEncounterRef']),
    STRING: new Set(['type', 'stringClass', 'encounterToken']),
    OBJECT: new Set([
      'type',
      'fieldCount',
      'keyProvenance',
      'provenFieldCount',
      'dynamicFieldCount',
      'provenFields',
      'dynamicFields',
    ]),
    ARRAY: new Set(['type', 'itemType', 'itemCount', 'inspectedCount', 'items', 'arrayTruncated']),
  });

/** The same sets for PERSISTED nodes: the two ephemeral members are removed. */
export const PRODUCTION_EVIDENCE_NODE_FIELDS_BY_TYPE: Readonly<
  Record<ProductionNodeType, ReadonlySet<string>>
> = Object.freeze({
  NULL: new Set(['type']),
  BOOLEAN: new Set(['type', 'booleanClass']),
  NUMBER: new Set(['type']),
  STRING: new Set(['type', 'stringClass']),
  OBJECT: PRODUCTION_NODE_FIELDS_BY_TYPE.OBJECT,
  ARRAY: PRODUCTION_NODE_FIELDS_BY_TYPE.ARRAY,
});

export const PRODUCTION_PROJECTION_ROOT_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'boundaryClass',
  'schemaVersion',
  'keyProvenance',
  'root',
]);

export const PRODUCTION_EVIDENCE_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'boundaryClass',
  'schemaVersion',
  'routeTemplate',
  'statusClass',
  'keyProvenance',
  'vocabularyProvenanceClass',
  'vocabularyProvenanceDigest',
  'structuralDigest',
  'root',
]);

export const PRODUCTION_NODE_TYPES: ReadonlySet<string> = new Set([
  'NULL',
  'BOOLEAN',
  'NUMBER',
  'STRING',
  'OBJECT',
  'ARRAY',
]);

export const PRODUCTION_STATUS_CLASSES: ReadonlySet<string> = new Set(['1XX', '2XX', '3XX', '4XX', '5XX']);

/** Ephemeral correlation label shapes. Both are rejected in persisted evidence. */
export const ENCOUNTER_TOKEN_RE = /^enc#[0-9]{4}$/;
export const NUMERIC_ENCOUNTER_REF_RE = /^num#[0-9]{4}$/;

/**
 * F-15 digest family prefixes, deliberately distinct so a future implementer
 * cannot merge them or mistake one for the other:
 *
 *  - `prodstruct:sha256:` STRUCTURAL — value-free, unsalted, persistable.
 *  - `proj:sha256:`       the Phase 9 DEV projection family, which ingests key
 *                         literals and is therefore NOT production-persistable.
 */
export const PRODUCTION_STRUCTURAL_DIGEST_PREFIX = 'prodstruct:sha256:' as const;
export const PRODUCTION_STRUCTURAL_DIGEST_RE = /^prodstruct:sha256:[0-9a-f]{24}$/;
export const DEV_PROJECTION_DIGEST_PREFIX = 'proj:sha256:' as const;

/**
 * Route TEMPLATE shape (F-16): a method plus a path whose variable segments are
 * `{name}` placeholders. A concrete identifier or a query string is refused.
 */
export const ROUTE_TEMPLATE_RE = /^(?:GET|HEAD|OPTIONS) \/(?:[A-Za-z0-9._~-]+|\{[A-Za-z][A-Za-z0-9_]*\})(?:\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z][A-Za-z0-9_]*\}))*\/?$/;
