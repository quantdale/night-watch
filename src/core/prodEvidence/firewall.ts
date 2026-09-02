// ---------------------------------------------------------------------------
// Nightwatch C-10 / Workstream F — the persistence firewall.
//
// The SECOND boundary, and deliberately redundant with the first. Projection
// prevents sensitive data from being EMITTED; this prevents an upstream defect
// from BYPASSING the projection contract. It therefore does NOT re-call the
// projection's own validator: it is an independent closed-vocabulary walk over
// the DTO as it actually arrives at the durable write, plus an independent
// re-derivation of the structural digest.
//
// It accepts only C-10-approved DTOs, and rejects raw values, response bodies,
// URLs carrying concrete parameters, headers, cookies, auth tokens, storage
// state, free text, authenticated DOM, screenshots, traces, arbitrary nested
// objects outside the contract, and unknown schema versions.
//
// Precise limit, stated rather than overstated: this module holds NO
// vocabulary. It rejects dynamic key literals STRUCTURALLY — a `name` on a
// dynamic entry, proven fields declared under
// `BOUNDED_DYNAMIC_KEY_COLLECTION`, dynamic fields declared under
// `ALL_SOURCE_PROVEN` — and it cannot tell a genuinely proven literal from an
// unproven one that a defective projector mislabelled as proven. The same
// applies to routes: it verifies that route provenance was RECORDED, while
// MEMBERSHIP is enforced where the proven set is known (construction and the
// store). The structural-digest re-derivation is what makes this division
// safe: a mislabelled tree cannot also carry a matching digest unless the
// projector and the digest agree, and the digest is computed from the same
// canonical bytes the firewall walks.
// ---------------------------------------------------------------------------

import { containsPrivatePayloadShape } from '../policy/privateScreening';
import {
  failProduction,
  productionStructuralDigest,
  MAX_PROVEN_KEY_LENGTH,
  FORBIDDEN_PRODUCTION_KEY_NAMES,
  PRODUCTION_EVIDENCE_NODE_FIELDS_BY_TYPE,
  PRODUCTION_EVIDENCE_SAFE_FIELDS,
  PRODUCTION_EVIDENCE_VERSION,
  PRODUCTION_NODE_TYPES,
  PRODUCTION_PROVEN_FIELD_SAFE_FIELDS,
  PRODUCTION_STATUS_CLASSES,
  PRODUCTION_STRUCTURAL_DIGEST_RE,
  DEV_PROJECTION_DIGEST_PREFIX,
  KEY_PROVENANCE_CLASSIFICATIONS,
  ROUTE_TEMPLATE_RE,
  type SafeProductionEvidence,
} from '../prodPrivacy';

/** Maximum nodes the firewall will walk before refusing. */
const MAX_FIREWALL_NODES = 4096;
/** Maximum serialized evidence size. */
export const MAX_PRODUCTION_EVIDENCE_BYTES = 256 * 1024;

const CLASSIFICATION_SET: ReadonlySet<string> = new Set(KEY_PROVENANCE_CLASSIFICATIONS);
/** A proven key literal is bounded and structural; free text cannot pass as one. */
const PROVEN_KEY_SHAPE_RE = /^[A-Za-z_][A-Za-z0-9_.-]{0,199}$/;
const VOCABULARY_PROVENANCE_CLASSES: ReadonlySet<string> = new Set([
  'SOURCE_PROVEN_OPENAPI_DEFINITION',
  'SOURCE_PROVEN_PHP_ROW_KEYS',
  'SOURCE_PROVEN_FIXED_CONTRACT',
  'NONE',
]);
const PROVENANCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
/**
 * DEF-C10-5: route identity must carry PROVEN provenance. `NONE` is absent by
 * design — a route has no safe structural reduction, so unproven provenance
 * denies persistence here as well as at construction.
 */
const ROUTE_PROVENANCE_CLASSES: ReadonlySet<string> = new Set([
  'SOURCE_PROVEN_OPENAPI_OPERATION',
  'SOURCE_PROVEN_PHP_ROUTE',
  'SOURCE_PROVEN_FIXED_CONTRACT',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertClosed(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== Object.prototype && prototype !== null) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'PROTOTYPE_HOSTILE');
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'UNKNOWN_FIELD');
  }
}

function boundedCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CARDINALITY');
  }
  return value as number;
}

/**
 * Walk one persisted node. Independent of the projection: every field is
 * re-derived from the object in hand, and the two EPHEMERAL correlation fields
 * are rejected by name rather than merely absent from the writer.
 */
function walkNode(value: unknown, budget: { nodes: number }): void {
  budget.nodes += 1;
  if (budget.nodes > MAX_FIREWALL_NODES) {
    failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'NODE_CAP');
  }
  if (!isRecord(value)) failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');

  // An ephemeral correlation label must never reach a durable write. Reject it
  // explicitly, so a regression in `toProductionEvidence` cannot persist one.
  if ('encounterToken' in value) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'ENCOUNTER_TOKEN_PRESENT');
  }
  if ('numericEncounterRef' in value) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'NUMERIC_REF_PRESENT');
  }
  const type = value.type;
  if (typeof type !== 'string' || !PRODUCTION_NODE_TYPES.has(type)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }
  // Exact per-type field set, so a field belonging to another node type cannot
  // ride along unnoticed by the digest.
  assertClosed(value, PRODUCTION_EVIDENCE_NODE_FIELDS_BY_TYPE[type as keyof typeof PRODUCTION_EVIDENCE_NODE_FIELDS_BY_TYPE]);

  switch (type) {
    case 'NULL':
      if (Object.keys(value).length !== 1) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'UNKNOWN_FIELD');
      }
      return;
    case 'BOOLEAN':
      if (value.booleanClass !== 'TRUE' && value.booleanClass !== 'FALSE') {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
      }
      return;
    case 'NUMBER':
      // A persisted number carries type alone. Any other field would be a
      // value reference.
      if (Object.keys(value).length !== 1) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'NUMERIC_REF_PRESENT');
      }
      return;
    case 'STRING':
      if (value.stringClass !== 'EMPTY' && value.stringClass !== 'NONEMPTY') {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
      }
      // A persisted string node carries type + class ONLY. There is no field
      // through which a raw value, a body fragment or free text could arrive.
      if (Object.keys(value).length !== 2) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FREE_TEXT_PRESENT');
      }
      return;
    case 'OBJECT': {
      const classification = value.keyProvenance;
      if (typeof classification !== 'string' || !CLASSIFICATION_SET.has(classification)) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
      }
      // An UNKNOWN privacy classification denies persistence.
      if (classification === 'UNRESOLVED') {
        failProduction('PRODUCTION_PRIVACY_KEY_PROVENANCE_UNRESOLVED', 'PROVENANCE_AMBIGUOUS');
      }
      const fieldCount = boundedCount(value.fieldCount);
      const provenCount = boundedCount(value.provenFieldCount);
      const dynamicCount = boundedCount(value.dynamicFieldCount);
      if (provenCount + dynamicCount !== fieldCount) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CARDINALITY');
      }
      const provenFields = value.provenFields;
      const dynamicFields = value.dynamicFields;
      if (!Array.isArray(provenFields) || !Array.isArray(dynamicFields)) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
      }
      if (
        (provenFields as unknown[]).length !== provenCount ||
        (dynamicFields as unknown[]).length !== dynamicCount
      ) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CARDINALITY');
      }
      // A proven literal may only appear where provenance says one exists.
      if (provenCount > 0 && classification === 'BOUNDED_DYNAMIC_KEY_COLLECTION') {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'DYNAMIC_KEY_LITERAL_PRESENT');
      }
      if (dynamicCount > 0 && classification === 'ALL_SOURCE_PROVEN') {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'PROVENANCE_AMBIGUOUS');
      }
      for (const field of provenFields as unknown[]) {
        if (!isRecord(field)) failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
        assertClosed(field, PRODUCTION_PROVEN_FIELD_SAFE_FIELDS);
        const name = field.name;
        if (
          typeof name !== 'string' ||
          name.length === 0 ||
          name.length > MAX_PROVEN_KEY_LENGTH ||
          FORBIDDEN_PRODUCTION_KEY_NAMES.has(name) ||
          !PROVEN_KEY_SHAPE_RE.test(name)
        ) {
          // A free-text or hostile literal cannot masquerade as a proven key.
          failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FREE_TEXT_PRESENT');
        }
        walkNode(field.node, budget);
      }
      // Dynamic entries are BARE nodes. If one carries a `name`, a dynamic key
      // literal reached the durable boundary.
      for (const dynamic of dynamicFields as unknown[]) {
        if (isRecord(dynamic) && 'name' in dynamic) {
          failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'DYNAMIC_KEY_LITERAL_PRESENT');
        }
        walkNode(dynamic, budget);
      }
      return;
    }
    case 'ARRAY': {
      const itemType = value.itemType;
      if (typeof itemType !== 'string' || (itemType !== 'MIXED' && !PRODUCTION_NODE_TYPES.has(itemType))) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
      }
      const itemCount = boundedCount(value.itemCount);
      const inspectedCount = boundedCount(value.inspectedCount);
      const items = value.items;
      if (!Array.isArray(items) || (items as unknown[]).length !== inspectedCount || inspectedCount > itemCount) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CARDINALITY');
      }
      if (value.arrayTruncated !== (itemCount > inspectedCount)) {
        failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CARDINALITY');
      }
      for (const item of items as unknown[]) walkNode(item, budget);
      return;
    }
    default:
      failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }
}

/**
 * The durable-write gate. Returns the narrowed DTO on success and throws a
 * categorical `ProductionPrivacyError` otherwise. No caller value is ever
 * interpolated into the failure.
 */
export function assertPersistableProductionEvidence(candidate: unknown): SafeProductionEvidence {
  if (!isRecord(candidate)) failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  assertClosed(candidate, PRODUCTION_EVIDENCE_SAFE_FIELDS);

  if (candidate.boundaryClass !== 'SAFE_PRODUCTION_EVIDENCE') {
    // A raw response object, a projection, or anything else fails here.
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'BOUNDARY_CLASS');
  }
  if (candidate.schemaVersion !== PRODUCTION_EVIDENCE_VERSION) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'UNKNOWN_SCHEMA_VERSION');
  }

  const routeTemplate = candidate.routeTemplate;
  if (typeof routeTemplate !== 'string' || !ROUTE_TEMPLATE_RE.test(routeTemplate)) {
    // Catches a concrete URL, a query string, headers or cookies smuggled in
    // as "the route we observed".
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'CONCRETE_URL_PARAMETER');
  }
  // DEF-C10-5: the shape check above CANNOT distinguish `accounts` from
  // `481516234299`, so it is not the authority. Route provenance is. The
  // firewall holds no vocabulary, so what it independently enforces is that a
  // proven vocabulary was used AT ALL and that its provenance is recorded —
  // the same division of labour as key provenance.
  if (
    typeof candidate.routeProvenanceClass !== 'string' ||
    !ROUTE_PROVENANCE_CLASSES.has(candidate.routeProvenanceClass)
  ) {
    failProduction('PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED', 'ROUTE_PROVENANCE_MISSING');
  }
  if (
    typeof candidate.routeProvenanceDigest !== 'string' ||
    !PROVENANCE_DIGEST_RE.test(candidate.routeProvenanceDigest)
  ) {
    failProduction('PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED', 'ROUTE_PROVENANCE_MISSING');
  }
  if (typeof candidate.statusClass !== 'string' || !PRODUCTION_STATUS_CLASSES.has(candidate.statusClass)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }

  const classification = candidate.keyProvenance;
  if (typeof classification !== 'string' || !CLASSIFICATION_SET.has(classification)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }
  if (classification === 'UNRESOLVED') {
    failProduction('PRODUCTION_PRIVACY_KEY_PROVENANCE_UNRESOLVED', 'PROVENANCE_AMBIGUOUS');
  }

  if (
    typeof candidate.vocabularyProvenanceClass !== 'string' ||
    !VOCABULARY_PROVENANCE_CLASSES.has(candidate.vocabularyProvenanceClass)
  ) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  const provenanceDigest = candidate.vocabularyProvenanceDigest;
  if (provenanceDigest !== null && (typeof provenanceDigest !== 'string' || !PROVENANCE_DIGEST_RE.test(provenanceDigest))) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'VOCABULARY_PROVENANCE_DIGEST');
  }

  // F-15: only the STRUCTURAL family may be persisted. The Phase 9 DEV family
  // ingests key literals and is refused here by name.
  const structuralDigest = candidate.structuralDigest;
  if (typeof structuralDigest !== 'string') {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }
  if ((structuralDigest as string).startsWith(DEV_PROJECTION_DIGEST_PREFIX)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'DIGEST_FAMILY');
  }
  if (!PRODUCTION_STRUCTURAL_DIGEST_RE.test(structuralDigest as string)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'DIGEST_FAMILY');
  }

  walkNode(candidate.root, { nodes: 0 });

  // Independent re-derivation: the recorded digest must be exactly what these
  // bytes produce, so a tampered structure cannot travel under a valid digest.
  const recomputed = productionStructuralDigest(candidate.root as never);
  if (recomputed !== structuralDigest) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'DIGEST_MISMATCH');
  }

  const serialized = JSON.stringify(candidate);
  if (serialized.length > MAX_PRODUCTION_EVIDENCE_BYTES) {
    failProduction('PRODUCTION_PRIVACY_LIMIT_EXCEEDED', 'EVIDENCE_BYTES');
  }
  // Defence in depth only, never the boundary: reuse the existing canonical
  // sentinel/secret screen (Nightwatch's RedactionLayer family) as a last
  // backstop rather than building a second screening stack.
  if (containsPrivatePayloadShape(serialized)) {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'FREE_TEXT_PRESENT');
  }

  return candidate as unknown as SafeProductionEvidence;
}
