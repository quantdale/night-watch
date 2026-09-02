// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-14 — the production projection boundary.
//
// Converts RAW_EPHEMERAL production bytes into a SAFE_STRUCTURAL_PROJECTION.
// The defining difference from the Phase 9 DEV projection
// (`nightwatch.semantic-projection.v1`, which remains unchanged and remains
// correct for DEV) is that an object key literal is treated as DATA:
//
//   - a key literal survives ONLY as a proven member of a source-proven finite
//     key vocabulary;
//   - an unproven/dynamic key contributes its VALUE's structure and its COUNT,
//     and nothing else: not the literal, and not a digest derived from the
//     literal, because a digest over an enumerable domain (a 12-digit AWS
//     account id, a `YYYYMM` period) is invertible and is not anonymization;
//   - under `REQUIRE_SOURCE_PROVEN` an unproven key yields the `UNRESOLVED`
//     classification, and UNRESOLVED denies persistence downstream.
//
// Scalars never cross: a string becomes type + empty/nonempty class, a number
// becomes type alone. The only correlation available is an EPHEMERAL
// encounter-order token that is stripped before evidence and rejected by the
// persistence firewall.
//
// This module is part of the PURE cone: no fs, no net, no process. It has NO
// persistence authority and exports no writer.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';
import {
  FORBIDDEN_PRODUCTION_KEY_NAMES,
  isSourceProvenKey,
  type KeyVocabularySource,
} from './keyVocabulary';
import type { PrivacyPolicy } from './policy';
import { canonicalStructuralBytes } from './serializer';
import {
  DEFAULT_PRODUCTION_PROJECTION_LIMITS,
  PRODUCTION_PROJECTION_VERSION,
  RawEphemeralSource,
  worseClassification,
  type KeyProvenanceClassification,
  type ProductionNode,
  type ProductionNodeType,
  type ProductionProjectionLimits,
  type ProductionProvenField,
  type SafeStructuralProjection,
} from './types';

/**
 * Ephemeral encounter correlation.
 *
 * Deliberately a SEPARATE token family from the Phase 9 `ProjectionContext`
 * (`entity#`/`numeric#`): the two projections must never be interchangeable,
 * and a distinct prefix makes an accidental cross-family comparison visible.
 * Like Phase 9's, these are encounter-ORDER labels — never a hash of the value
 * and never derived from it — and the map exists only in memory.
 */
class EncounterContext {
  private readonly strings = new Map<string, string>();
  private readonly numbers = new Map<number, string>();
  private stringCounter = 0;
  private numberCounter = 0;

  constructor(private readonly limits: ProductionProjectionLimits) {}

  tokenForString(raw: string): string {
    const existing = this.strings.get(raw);
    if (existing !== undefined) return existing;
    if (this.strings.size >= this.limits.maxEncounterTokens) {
      failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'ENCOUNTER_TOKEN_CAP');
    }
    this.stringCounter += 1;
    const token = `enc#${String(this.stringCounter).padStart(4, '0')}`;
    this.strings.set(raw, token);
    return token;
  }

  refForNumber(raw: number): string {
    const existing = this.numbers.get(raw);
    if (existing !== undefined) return existing;
    if (this.numbers.size >= this.limits.maxEncounterTokens) {
      failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'ENCOUNTER_TOKEN_CAP');
    }
    this.numberCounter += 1;
    const ref = `num#${String(this.numberCounter).padStart(4, '0')}`;
    this.numbers.set(raw, ref);
    return ref;
  }

  /** The correlation map must never become a recorder, dossier or log payload. */
  toJSON(): never {
    return failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'ENCOUNTER_TOKEN_PRESENT');
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

class ProductionProjector {
  private nodeCount = 0;
  private readonly seen = new WeakSet<object>();
  private classification: KeyProvenanceClassification = 'ALL_SOURCE_PROVEN';

  constructor(
    private readonly vocabulary: KeyVocabularySource,
    private readonly policy: PrivacyPolicy,
    private readonly encounters: EncounterContext,
    private readonly limits: ProductionProjectionLimits,
  ) {}

  get foldedClassification(): KeyProvenanceClassification {
    return this.classification;
  }

  private countNode(): void {
    this.nodeCount += 1;
    if (this.nodeCount > this.limits.maxProjectionNodes) {
      failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'NODE_CAP');
    }
  }

  private record(classification: KeyProvenanceClassification): void {
    this.classification = worseClassification(this.classification, classification);
  }

  project(value: unknown, depth: number): ProductionNode {
    if (depth > this.limits.maxDepth) failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'DEPTH_CAP');
    this.countNode();
    if (value === null) return { type: 'NULL' };
    switch (typeof value) {
      case 'boolean':
        return { type: 'BOOLEAN', booleanClass: value ? 'TRUE' : 'FALSE' };
      case 'number': {
        if (!Number.isFinite(value)) {
          failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'NON_FINITE_NUMBER');
        }
        return { type: 'NUMBER', numericEncounterRef: this.encounters.refForNumber(value) };
      }
      case 'string': {
        if (value.length > this.limits.maxStringValueBytes) {
          failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'STRING_VALUE_BYTES');
        }
        return {
          type: 'STRING',
          stringClass: value.length === 0 ? 'EMPTY' : 'NONEMPTY',
          encounterToken: this.encounters.tokenForString(value),
        };
      }
      case 'object':
        return Array.isArray(value)
          ? this.projectArray(value, depth)
          : this.projectObject(value, depth);
      default:
        // bigint / symbol / function / undefined are not JSON values.
        return failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'NON_JSON_SCALAR');
    }
  }

  private projectObject(value: object, depth: number): ProductionNode {
    if (this.seen.has(value)) failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'CYCLIC_OBJECT');
    if (!isPlainObject(value)) failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'NON_PLAIN_OBJECT');
    this.seen.add(value);
    try {
      const keys = Object.keys(value).sort();
      if (keys.length > this.limits.maxFieldsPerObject) {
        failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'OBJECT_FIELD_CAP');
      }
      const provenFields: ProductionProvenField[] = [];
      const dynamicNodes: ProductionNode[] = [];

      for (const name of keys) {
        if (FORBIDDEN_PRODUCTION_KEY_NAMES.has(name)) {
          failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'FORBIDDEN_FIELD_NAME');
        }
        let child: unknown;
        try {
          child = (value as Record<string, unknown>)[name];
        } catch {
          // A throwing getter fails categorically; the raw getter error is
          // never propagated, so it cannot carry page or customer content.
          failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'GETTER_THREW');
        }
        const projectedChild = this.project(child, depth + 1);
        if (isSourceProvenKey(this.vocabulary, name)) {
          provenFields.push({ name, node: projectedChild });
        } else {
          // F-14: the literal is dropped here and nowhere reconstructed. Only
          // the value's structure survives, plus the count below.
          dynamicNodes.push(projectedChild);
        }
      }

      if (dynamicNodes.length > this.limits.maxDynamicKeysPerObject) {
        failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'DYNAMIC_KEY_CAP');
      }

      // Canonical, key-independent ordering: sort dynamic entries by their own
      // value-free structural bytes. Entries that tie are structurally
      // identical, so their relative order carries no information about the
      // keys that were dropped.
      const ordered = dynamicNodes
        .map((node) => ({ node, bytes: canonicalStructuralBytes(node) }))
        .sort((left, right) => (left.bytes < right.bytes ? -1 : left.bytes > right.bytes ? 1 : 0))
        .map((entry) => entry.node);

      const classification = this.classifyObject(provenFields.length, ordered.length);
      this.record(classification);

      return {
        type: 'OBJECT',
        fieldCount: provenFields.length + ordered.length,
        keyProvenance: classification,
        provenFieldCount: provenFields.length,
        dynamicFieldCount: ordered.length,
        provenFields,
        dynamicFields: ordered,
      };
    } finally {
      this.seen.delete(value);
    }
  }

  /**
   * Classify one object's key provenance.
   *
   * Under `REQUIRE_SOURCE_PROVEN` any unproven key yields `UNRESOLVED`, which
   * denies persistence downstream — the fail-closed reading of "an UNKNOWN
   * privacy classification must deny persistence". Under
   * `ALLOW_BOUNDED_DYNAMIC` the dynamic entries are retained as bounded
   * cardinality, which is safe because no literal is emitted either way.
   */
  private classifyObject(provenCount: number, dynamicCount: number): KeyProvenanceClassification {
    if (dynamicCount === 0) return 'ALL_SOURCE_PROVEN';
    if (this.policy.keyProvenanceRequirement === 'REQUIRE_SOURCE_PROVEN') return 'UNRESOLVED';
    return provenCount === 0 ? 'BOUNDED_DYNAMIC_KEY_COLLECTION' : 'MIXED';
  }

  private projectArray(value: unknown[], depth: number): ProductionNode {
    if (this.seen.has(value)) failProduction('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT', 'CYCLIC_ARRAY');
    this.seen.add(value);
    try {
      const itemCount = value.length;
      const inspectedCount = Math.min(itemCount, this.limits.maxArrayItemsInspected);
      const items: ProductionNode[] = [];
      let itemType: ProductionNodeType | 'MIXED' | null = null;
      for (let index = 0; index < inspectedCount; index += 1) {
        const item = this.project(value[index], depth + 1);
        items.push(item);
        if (itemType === null) itemType = item.type;
        else if (itemType !== item.type) itemType = 'MIXED';
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

/**
 * Project raw production bytes into the safe structural projection.
 *
 * `vocabulary` is REQUIRED and has no default: a caller must pass either a
 * `ProvenKeyVocabulary` or the explicit `NO_PROVEN_VOCABULARY` sentinel, so
 * ambiguous provenance cannot arrive by omission.
 */
export function projectProduction(
  source: RawEphemeralSource,
  vocabulary: KeyVocabularySource,
  policy: PrivacyPolicy,
  limits: ProductionProjectionLimits = DEFAULT_PRODUCTION_PROJECTION_LIMITS,
): SafeStructuralProjection {
  if (!(source instanceof RawEphemeralSource)) {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'BOUNDARY_CLASS');
  }
  if (policy.cone !== 'PRODUCTION') {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'CONE_MISMATCH');
  }
  const encounters = new EncounterContext(limits);
  const projector = new ProductionProjector(vocabulary, policy, encounters, limits);
  const root = projector.project(source.read(), 0);
  return {
    boundaryClass: 'SAFE_STRUCTURAL_PROJECTION',
    schemaVersion: PRODUCTION_PROJECTION_VERSION,
    keyProvenance: projector.foldedClassification,
    root,
  };
}

/**
 * Guard for direct callers: the raw JSON byte budget. Integration boundaries
 * already bound their bodies; this is the same fail-closed rule standalone.
 */
export function assertProductionInputBytes(
  rawBytes: number,
  limits: ProductionProjectionLimits = DEFAULT_PRODUCTION_PROJECTION_LIMITS,
): void {
  if (!Number.isFinite(rawBytes) || rawBytes < 0 || rawBytes > limits.maxRawInputBytes) {
    failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'RAW_INPUT_BYTES');
  }
}
