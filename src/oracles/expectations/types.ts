// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — declarative source-backed semantic expectations (SPEC
// §16, §20, §34, §35, §36, §37, §38).
//
// Expectations are DATA CONTRACTS only: no callbacks, no executable
// snippets, no user/model-provided code, no expression language. Each
// expectation binds to a source snapshot (repo @ SHA) and declares a small
// fixed invariant vocabulary over safe projection paths.
// ---------------------------------------------------------------------------

import type { ProjectionLimits } from '../projections/types';

export const SEMANTIC_EXPECTATION_VERSION = 'nightwatch.semantic-expectation.v1' as const;

// ---------------------------------------------------------------------------
// Safe path representation (SPEC §34).
// ---------------------------------------------------------------------------

/** A constrained path: fixed, source-known field segments only. No
 *  wildcards, no prototype keys, bounded length. */
export type SafePath = readonly string[];

export const MAX_PATH_SEGMENTS = 16;
export const MAX_PATH_SEGMENT_LENGTH = 128;
export const MAX_EXPECTATION_ID_LENGTH = 200;
export const MAX_INVARIANTS_PER_EXPECTATION = 32;
export const MAX_NUMERIC_OPERANDS = 16;

// ---------------------------------------------------------------------------
// Source provenance (SPEC §52, §53).
// ---------------------------------------------------------------------------

export interface SourceProvenance {
  readonly repoId: string;
  /** Full 40-hex source SHA the expectation was derived from. */
  readonly sha: string;
  /** Repository-relative source path (never an absolute local path). */
  readonly relativePath: string;
  /** Optional contract/model/symbol identifier in that source. */
  readonly symbol?: string;
  readonly derivationVersion: string;
}

export interface SourceSnapshot {
  readonly repoId: string;
  readonly sha: string;
}

// ---------------------------------------------------------------------------
// Fixed invariant vocabulary (SPEC §21). Only classes required by the
// accepted Phase 9 fixtures are implemented (MONOTONIC_COUNT assessed but
// not required by any admitted fixture — not implemented).
// ---------------------------------------------------------------------------

export type InvariantKind =
  | 'FIELD_PRESENT'
  | 'FIELD_ABSENT'
  | 'TYPE_MATCH'
  | 'CARDINALITY_MATCH'
  | 'ENVELOPE_CLASS'
  | 'IDENTITY_EQUAL'
  | 'IDENTITY_PRESENT_IN_COLLECTION'
  | 'NUMERIC_SUM_RELATION'
  | 'COUNT_RELATION'
  | 'SHAPE_CHANGED';

export type EnvelopeClass = 'SUCCESS_ENVELOPE' | 'ERROR_ENVELOPE' | 'UNKNOWN_ENVELOPE';
export type TransitionExpectation = 'CHANGE' | 'REMAIN_STABLE' | 'UNKNOWN';
export type NumericRelationOperation =
  | 'SUM_EQUALS'
  | 'COUNT_EQUALS'
  | 'COUNT_GTE'
  | 'EQUAL'
  | 'NOT_EQUAL';

export interface FieldPresenceInvariant {
  readonly kind: 'FIELD_PRESENT';
  readonly path: SafePath;
  readonly expected: boolean;
}

export interface FieldAbsentInvariant {
  readonly kind: 'FIELD_ABSENT';
  readonly path: SafePath;
}

export interface TypeMatchInvariant {
  readonly kind: 'TYPE_MATCH';
  readonly path: SafePath;
  readonly expectedType: 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY';
}

export interface CardinalityMatchInvariant {
  readonly kind: 'CARDINALITY_MATCH';
  readonly path: SafePath;
  readonly min?: number;
  readonly max?: number;
  readonly exact?: number;
}

export interface EnvelopeClassInvariant {
  readonly kind: 'ENVELOPE_CLASS';
  /** Which envelope the target operation MUST be observed as. */
  readonly expected: EnvelopeClass;
  /** Envelope vocabulary: success requires this field; error requires this
   *  field. Only source-established vocabularies are admitted. */
  readonly successField: SafePath;
  readonly errorField: SafePath;
}

export interface IdentityEqualInvariant {
  readonly kind: 'IDENTITY_EQUAL';
  readonly leftPath: SafePath;
  readonly rightPath: SafePath;
}

export interface IdentityInCollectionInvariant {
  readonly kind: 'IDENTITY_PRESENT_IN_COLLECTION';
  readonly collectionPath: SafePath;
  /** Identity field path RELATIVE to each collection item. */
  readonly itemIdentityPath: SafePath;
  /** Identity field path relative to the requested-detail root. */
  readonly detailIdentityPath: SafePath;
  /** Correlation context label (e.g. the requested entity role). */
  readonly correlationContext: string;
}

export interface NumericSumRelationInvariant {
  readonly kind: 'NUMERIC_SUM_RELATION';
  readonly relationId: string;
  readonly collectionPath: SafePath;
  /** Numeric field path RELATIVE to each collection item. */
  readonly numericFieldPath: SafePath;
  readonly scalarPath: SafePath;
}

export interface CountRelationInvariant {
  readonly kind: 'COUNT_RELATION';
  readonly relationId: string;
  readonly operation: 'COUNT_EQUALS' | 'COUNT_GTE';
  readonly collectionPath: SafePath;
  /** Compare against a runtime scalar path, or a fixed contract constant
   *  (exactly one is required). */
  readonly scalarPath?: SafePath;
  readonly expectedCount?: number;
}

export interface ShapeChangedInvariant {
  readonly kind: 'SHAPE_CHANGED';
  /** Explicit contract: CHANGE, REMAIN_STABLE, or UNKNOWN (never inferred).
   *  Only expected CHANGE + observed unchanged projection can yield a
   *  STALE_STATE finding. */
  readonly expectedTransition: TransitionExpectation;
  /** Optional: restrict the comparison to this subtree path. */
  readonly statePath?: SafePath;
}

export type InvariantDefinition =
  | FieldPresenceInvariant
  | FieldAbsentInvariant
  | TypeMatchInvariant
  | CardinalityMatchInvariant
  | EnvelopeClassInvariant
  | IdentityEqualInvariant
  | IdentityInCollectionInvariant
  | NumericSumRelationInvariant
  | CountRelationInvariant
  | ShapeChangedInvariant;

// ---------------------------------------------------------------------------
// Expectation DTO (SPEC §16).
// ---------------------------------------------------------------------------

export type ExpectationTargetKind = 'API_OPERATION' | 'JOURNEY_STEP' | 'JOURNEY_TRANSITION';

export interface ProjectionContract {
  readonly limits: ProjectionLimits;
}

export interface SemanticExpectation {
  readonly schemaVersion: typeof SEMANTIC_EXPECTATION_VERSION;
  readonly expectationId: string;
  readonly targetKind: ExpectationTargetKind;
  readonly targetId: string;
  readonly sourceProvenance: SourceProvenance;
  readonly projectionContract: ProjectionContract;
  readonly invariantDefinitions: readonly InvariantDefinition[];
}

// ---------------------------------------------------------------------------
// Admission / freshness classifications (SPEC §58, §18, §53, §60).
// ---------------------------------------------------------------------------

export type ExpectationAdmissionResult =
  | 'EXPECTATION_ADMITTED'
  | 'EXPECTATION_SOURCE_UNAVAILABLE'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_INVALID'
  | 'EXPECTATION_AMBIGUOUS';

export type ExpectationFreshness =
  | 'EXPECTATION_SOURCE_CURRENT'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_SOURCE_UNAVAILABLE';
