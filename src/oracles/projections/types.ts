// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — semantic projection contracts.
//
// EXPLICIT RAW/SAFE BOUNDARY (SPEC §10): `RawSemanticObservation` is the
// ephemeral, internal-only input descriptor; `SemanticProjection` is the safe,
// serializable DTO. Raw customer scalars NEVER appear in `SemanticProjection`
// — string values project as type + presence + empty/nonempty class + opaque
// identity token; numeric values project as type + opaque numeric reference.
// The raw values themselves live only inside the in-memory ProjectionContext
// (src/oracles/projections/identity.ts) and are discarded after evaluation.
// ---------------------------------------------------------------------------

export const SEMANTIC_PROJECTION_VERSION = 'nightwatch.semantic-projection.v1' as const;

// ---------------------------------------------------------------------------
// Raw input (ephemeral, internal only).
// ---------------------------------------------------------------------------

/** What the projector accepts as input. Never persisted, never logged,
 *  never serialized; the raw `value` exists only for the duration of
 *  projection evaluation. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface RawSemanticObservation {
  readonly kind: 'API_RESPONSE' | 'JOURNEY_STEP_STATE';
  readonly operationId?: string;
  readonly journeyId?: string;
  readonly stepId?: string;
  /** Parsed JSON value from a bounded, in-memory response/step body. */
  readonly value: unknown;
}

// ---------------------------------------------------------------------------
// Boundedness (SPEC §13, §54).
// ---------------------------------------------------------------------------

export interface ProjectionLimits {
  readonly maxDepth: number;
  readonly maxFieldsPerObject: number;
  readonly maxArrayItemsInspected: number;
  readonly maxProjectionNodes: number;
  readonly maxIdentityTokens: number;
  readonly maxNumericRefs: number;
  readonly maxRawInputBytes: number;
}

export const DEFAULT_PROJECTION_LIMITS: ProjectionLimits = Object.freeze({
  maxDepth: 8,
  maxFieldsPerObject: 64,
  maxArrayItemsInspected: 128,
  maxProjectionNodes: 1024,
  maxIdentityTokens: 256,
  maxNumericRefs: 512,
  maxRawInputBytes: 1_000_000,
});

// ---------------------------------------------------------------------------
// Safe projection DTO (SPEC §9, §13, §14).
//
// Allowed projected concepts: field/path names, JSON type, presence,
// nullability, object/array shape, bounded field counts, bounded row/entry
// counts, array cardinality, opaque within-observation identity labels,
// numeric relation references, finite categorical enums.
//
// Forbidden: raw strings, raw customer IDs, raw account numbers, raw
// email/name fields, raw invoice/cost values, raw DOM text, raw response
// fragments, arbitrary stringification of unknown data.
// ---------------------------------------------------------------------------

export type ProjectionNodeType = 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type StringContentClass = 'EMPTY' | 'NONEMPTY';
export type BooleanContentClass = 'TRUE' | 'FALSE';

export interface ProjectionField {
  readonly name: string;
  readonly node: ProjectionNode;
}

export interface ProjectionNode {
  readonly type: ProjectionNodeType;
  /** BOOLEAN only: categorical truth value; never a customer value. */
  readonly booleanClass?: BooleanContentClass;
  /** STRING only: opaque within-observation identity label (e.g.
   *  `entity#0001`). Assigned by ProjectionContext; contains neither the raw
   *  value nor a hash of it. */
  readonly identityToken?: string;
  /** STRING only: safe empty/nonempty content class. */
  readonly stringClass?: StringContentClass;
  /** NUMBER only: opaque reference into the ephemeral numeric table (e.g.
   *  `numeric#0001`). The raw numeric value exists only in memory. */
  readonly numericRef?: string;
  /** OBJECT only: exact field count (bounded by caps). */
  readonly fieldCount?: number;
  /** OBJECT only: projected fields, canonical field-name order. */
  readonly fields?: readonly ProjectionField[];
  /** ARRAY only: homogeneous item type or 'MIXED'. */
  readonly itemType?: ProjectionNodeType | 'MIXED';
  /** ARRAY only: exact total element count (a bounded count, safe). */
  readonly itemCount?: number;
  /** ARRAY only: how many items were projected (<= maxArrayItemsInspected). */
  readonly inspectedCount?: number;
  /** ARRAY only: projected item shapes, deterministic order. */
  readonly items?: readonly ProjectionNode[];
  /** ARRAY only: true when itemCount > inspectedCount (never silently
   *  truncated in a way that could produce a false semantic PASS — the
   *  invariant layer treats truncated arrays as bounded). */
  readonly arrayTruncated?: boolean;
}

export interface SemanticProjection {
  readonly schemaVersion: typeof SEMANTIC_PROJECTION_VERSION;
  readonly root: ProjectionNode;
}

// ---------------------------------------------------------------------------
// Bounded error classifications (SPEC §27, §60). No raw values may appear in
// `message` — these are fixed bounded tokens.
// ---------------------------------------------------------------------------

export const SEMANTIC_PROJECTION_LIMIT_EXCEEDED = 'SEMANTIC_PROJECTION_LIMIT_EXCEEDED';
export const SEMANTIC_PROJECTION_UNSUPPORTED_INPUT = 'SEMANTIC_PROJECTION_UNSUPPORTED_INPUT';
export const SEMANTIC_PROJECTION_PRIVACY_VIOLATION = 'SEMANTIC_PROJECTION_PRIVACY_VIOLATION';

export class SemanticProjectionError extends Error {
  readonly classification:
    | typeof SEMANTIC_PROJECTION_LIMIT_EXCEEDED
    | typeof SEMANTIC_PROJECTION_UNSUPPORTED_INPUT
    | typeof SEMANTIC_PROJECTION_PRIVACY_VIOLATION;

  constructor(
    classification:
      | typeof SEMANTIC_PROJECTION_LIMIT_EXCEEDED
      | typeof SEMANTIC_PROJECTION_UNSUPPORTED_INPUT
      | typeof SEMANTIC_PROJECTION_PRIVACY_VIOLATION,
    detail?: string,
  ) {
    super(classification + (detail === undefined ? '' : `:${detail}`));
    this.name = 'SemanticProjectionError';
    this.classification = classification;
  }
}

/** Fixed internal-consistency guard: a projected node may only carry the
 *  documented safe fields. Anything else is a privacy violation by
 *  construction (defense in depth — the DTO type already forbids it at
 *  compile time). */
export const PROJECTION_NODE_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'type',
  'booleanClass',
  'identityToken',
  'stringClass',
  'numericRef',
  'fieldCount',
  'fields',
  'itemType',
  'itemCount',
  'inspectedCount',
  'items',
  'arrayTruncated',
]);

export const PROJECTION_ROOT_SAFE_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'root',
]);

export const PROJECTION_FIELD_SAFE_FIELDS: ReadonlySet<string> = new Set(['name', 'node']);

/** Object-key segments that must never be treated as data fields (prototype
 *  pollution / hostile keys; SPEC §34, §55). Shared by the projector and the
 *  expectation path validator. */
export const FORBIDDEN_FIELD_NAMES: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);
