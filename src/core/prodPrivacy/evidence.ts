// ---------------------------------------------------------------------------
// Nightwatch C-10 — SAFE_STRUCTURAL_PROJECTION -> SAFE_PRODUCTION_EVIDENCE.
//
// This is the only narrowing in the cone, and it is where every EPHEMERAL
// correlation field is dropped: encounter tokens and numeric encounter refs
// exist for in-memory analysis and must never become durable. The persistence
// firewall (src/core/prodEvidence/firewall.ts) then independently re-checks
// that they are gone, so a defect here cannot silently persist one.
//
// The builder has NO persistence authority: it returns a DTO and writes
// nothing.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';
import {
  assertProductionKeyVocabularyAuthority,
  vocabularyIdentity,
  type KeyVocabularySource,
} from './keyVocabulary';
import {
  assertSourceProvenRoute,
  routeVocabularyIdentity,
  type RouteVocabularySource,
} from './routeVocabulary';
import { assertProductionCone, type PrivacyPolicy } from './policy';
import { foldKeyProvenance, productionStructuralDigest } from './serializer';
import {
  PRODUCTION_EVIDENCE_VERSION,
  PRODUCTION_STATUS_CLASSES,
  ROUTE_TEMPLATE_RE,
  type KeyProvenanceClassification,
  type ProductionNode,
  type ProductionStatusClass,
  type SafeProductionEvidence,
  type SafeStructuralProjection,
} from './types';

/**
 * Strip every ephemeral correlation field from a projected node tree.
 *
 * Written as an explicit reconstruction rather than a delete-in-place, so a
 * future field added to `ProductionNode` is NOT carried through by default:
 * anything this function does not name simply never reaches evidence.
 */
function toEvidenceNode(node: ProductionNode): ProductionNode {
  switch (node.type) {
    case 'NULL':
      return { type: 'NULL' };
    case 'BOOLEAN':
      return { type: 'BOOLEAN', booleanClass: node.booleanClass };
    case 'NUMBER':
      // The numeric encounter ref is dropped; a persisted number carries type
      // alone, so no value-repetition pattern survives.
      return { type: 'NUMBER' };
    case 'STRING':
      // The encounter token is dropped.
      return { type: 'STRING', stringClass: node.stringClass };
    case 'OBJECT':
      return {
        type: 'OBJECT',
        fieldCount: node.fieldCount,
        keyProvenance: node.keyProvenance,
        provenFieldCount: node.provenFieldCount,
        dynamicFieldCount: node.dynamicFieldCount,
        provenFields: (node.provenFields ?? []).map((field) => ({
          name: field.name,
          node: toEvidenceNode(field.node),
        })),
        dynamicFields: (node.dynamicFields ?? []).map(toEvidenceNode),
      };
    case 'ARRAY':
      return {
        type: 'ARRAY',
        itemType: node.itemType,
        itemCount: node.itemCount,
        inspectedCount: node.inspectedCount,
        items: (node.items ?? []).map(toEvidenceNode),
        arrayTruncated: node.arrayTruncated,
      };
    default:
      return failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }
}

export interface ProductionEvidenceRequest {
  readonly projection: SafeStructuralProjection;
  readonly vocabulary: KeyVocabularySource;
  /**
   * The source-proven route vocabulary `routeTemplate` must be a member of.
   * Required and without a default: `NO_PROVEN_ROUTE_VOCABULARY` must be
   * passed explicitly, and it denies persistence (DEF-C10-5).
   */
  readonly routeVocabulary: RouteVocabularySource;
  readonly policy: PrivacyPolicy;
  /**
   * Route TEMPLATE identity only, and only when PROVEN. A concrete path
   * parameter is refused because it is not a vocabulary member — not because
   * of how it is spelled.
   */
  readonly routeTemplate: string;
  readonly statusClass: ProductionStatusClass;
}

/**
 * Build the persistable evidence DTO.
 *
 * Fail-closed on: a non-production policy, a projection that is not the safe
 * boundary class, an `UNRESOLVED` key provenance (an UNKNOWN classification
 * denies persistence), a route identity that is not a template, and an unknown
 * status class.
 */
export function toProductionEvidence(request: ProductionEvidenceRequest): SafeProductionEvidence {
  const { projection, policy, vocabulary } = request;
  assertProductionCone(policy);
  if (projection === null || typeof projection !== 'object') {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'BOUNDARY_CLASS');
  }
  if (projection.boundaryClass !== 'SAFE_STRUCTURAL_PROJECTION') {
    failProduction('PRODUCTION_PRIVACY_BOUNDARY_VIOLATION', 'BOUNDARY_CLASS');
  }
  if (projection.schemaVersion !== 'nightwatch.production-projection.v1') {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'UNKNOWN_SCHEMA_VERSION');
  }

  // C-10.5: the KEY vocabulary must carry PRODUCTION authority, symmetrically
  // with the route vocabulary below. Without this a TEST_ONLY seam capability
  // was genuinely minted, so it satisfied `isSourceProvenKey` membership, and
  // an arbitrary key literal reached persisted evidence through
  // `provenFields[].name` — the F-14 position. Projection itself deliberately
  // still accepts a TEST_ONLY vocabulary, because that is what the fixtures
  // need; PERSISTENCE authority is the boundary that must refuse it.
  assertProductionKeyVocabularyAuthority(vocabulary);

  // Re-derive the classification from the tree rather than trusting the
  // recorded summary: a defect upstream must not be able to relabel an
  // UNRESOLVED projection as persistable.
  const declared: KeyProvenanceClassification = projection.keyProvenance;
  const derived = foldKeyProvenance(projection.root);
  if (declared !== derived) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  if (derived === 'UNRESOLVED') {
    failProduction('PRODUCTION_PRIVACY_KEY_PROVENANCE_UNRESOLVED', 'PROVENANCE_AMBIGUOUS');
  }

  // DEF-C10-5: shape first as a cheap precondition, then PROVENANCE as the
  // actual authority. A syntactically valid route is not a safe route.
  if (typeof request.routeTemplate !== 'string' || !ROUTE_TEMPLATE_RE.test(request.routeTemplate)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'ROUTE_TEMPLATE_INVALID');
  }
  assertSourceProvenRoute(request.routeVocabulary, request.routeTemplate);
  const routeIdentity = routeVocabularyIdentity(request.routeVocabulary);
  if (routeIdentity.provenanceDigest === null || routeIdentity.provenanceClass === 'NONE') {
    failProduction('PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED', 'ROUTE_PROVENANCE_MISSING');
  }
  if (typeof request.statusClass !== 'string' || !PRODUCTION_STATUS_CLASSES.has(request.statusClass)) {
    failProduction('PRODUCTION_PRIVACY_EVIDENCE_INVALID', 'FIELD_TYPE');
  }

  const root = toEvidenceNode(projection.root);
  const identity = vocabularyIdentity(vocabulary);

  return {
    boundaryClass: 'SAFE_PRODUCTION_EVIDENCE',
    schemaVersion: PRODUCTION_EVIDENCE_VERSION,
    routeTemplate: request.routeTemplate,
    statusClass: request.statusClass,
    keyProvenance: derived,
    vocabularyProvenanceClass: identity.provenanceClass,
    vocabularyProvenanceDigest: identity.provenanceDigest,
    routeProvenanceClass: routeIdentity.provenanceClass,
    routeProvenanceDigest: routeIdentity.provenanceDigest,
    // The structural digest is computed over the VALUE-FREE canonical bytes,
    // so it is identical whether taken before or after the ephemeral strip.
    structuralDigest: productionStructuralDigest(root),
    root,
  };
}
