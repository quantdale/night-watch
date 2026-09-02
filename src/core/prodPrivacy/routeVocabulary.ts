// ---------------------------------------------------------------------------
// Nightwatch C-10 / F-16 — source-proven route vocabulary (DEF-C10-5).
//
// `routeTemplate` is the ONE free-form string the production evidence DTO
// persists, and the original C-10 implementation validated it with
// `ROUTE_TEMPLATE_RE` alone. That regex admits any literal path segment
// matching `[A-Za-z0-9._~-]+`, which cannot distinguish `accounts` from
// `481516234299`, or `invoices` from `INV-2026-000731-SENTINEL`. Concrete
// customer identifiers therefore reached persisted evidence through the route
// field — the exact leak F-16 describes, and exactly the "regex alone" the
// campaign brief forbids.
//
// The fix mirrors the F-14 answer rather than inventing a second mechanism: a
// route template survives only as a proven member of a SOURCE-PROVEN finite
// route vocabulary. C-02a already supplies the proof source — 814 admitted
// operations carrying verb, path and operationId. Membership is exact-set, so
// no per-segment syntactic judgement is made or accepted anywhere; the regex
// is retained ONLY as a shape precondition on what may enter a vocabulary,
// never as the authority for what may be persisted.
//
// Unlike a dynamic object key, a route template has no safe structural
// reduction — there is no "cardinality" of a route that preserves identity.
// So route identity REQUIRES proven provenance and fails closed without it.
//
// This module is part of the PURE cone: no fs, no net, no process. The
// vocabulary is constructed OUTSIDE the cone and passed call-scoped, exactly
// like `ProvenKeyVocabulary`.
// ---------------------------------------------------------------------------

import { failProduction } from './errors';
import { ROUTE_TEMPLATE_RE } from './types';
import {
  assertProductionVocabularyAuthority,
  isMintedCapability,
  mintProvenance,
  type MintedProvenance,
  type ValidatedSourceEvidence,
  type VocabularyAuthorityMarker,
} from './vocabularyAuthority';

export const PROVEN_ROUTE_VOCABULARY_VERSION = 'nightwatch.proven-route-vocabulary.v1' as const;

/**
 * How a finite route set was mechanically established. As with key
 * provenance, there is deliberately no `ASSUMED` or `MANUAL` member.
 */
export const ROUTE_PROVENANCE_CLASSES = [
  /** C-02a: an admitted OpenAPI operation (verb + path + operationId). */
  'SOURCE_PROVEN_OPENAPI_OPERATION',
  /** A mechanically resolved PHP route → handler join. */
  'SOURCE_PROVEN_PHP_ROUTE',
  /** A repository-owned fixed finite route contract. */
  'SOURCE_PROVEN_FIXED_CONTRACT',
] as const;
export type RouteProvenanceClass = (typeof ROUTE_PROVENANCE_CLASSES)[number];

const ROUTE_PROVENANCE_CLASS_SET: ReadonlySet<string> = new Set(ROUTE_PROVENANCE_CLASSES);

/** Upper bound on a finite route set. C-02a's whole population is 814. */
export const MAX_PROVEN_ROUTE_TEMPLATES = 4096;

const PROVENANCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

export interface ProvenRouteVocabulary {
  readonly version: typeof PROVEN_ROUTE_VOCABULARY_VERSION;
  readonly provenanceClass: RouteProvenanceClass;
  readonly provenanceDigest: string;
  readonly templates: ReadonlySet<string>;
  /** Derived provenance identity. Computed by trusted code, never supplied. */
  readonly provenance: MintedProvenance;
}

/**
 * The explicit "no route vocabulary" sentinel. A caller must pass either a
 * `ProvenRouteVocabulary` or this value, so ambiguous provenance cannot arrive
 * by omission — and this value DENIES persistence, because route identity has
 * no safe reduction.
 */
export const NO_PROVEN_ROUTE_VOCABULARY = 'NO_PROVEN_ROUTE_VOCABULARY' as const;
export type NoProvenRouteVocabulary = typeof NO_PROVEN_ROUTE_VOCABULARY;

export type RouteVocabularySource = ProvenRouteVocabulary | NoProvenRouteVocabulary;

/**
 * Derive a route vocabulary from VALIDATED SOURCE EVIDENCE.
 *
 * This replaces C-10's `createProvenRouteVocabulary`, which accepted a
 * caller-chosen provenance class, any shape-valid digest and arbitrary
 * templates. There is deliberately NO digest parameter: the provenance
 * identity is computed from the evidence, so a caller cannot choose it. The
 * returned object is registered under the runtime brand, so a shape-matching
 * object — including one revived from JSON — is not a substitute for it.
 *
 * The template shape check remains a PRECONDITION on what may enter a
 * vocabulary, never the authority for what may be persisted; admission is the
 * source's job and the computed digest binds this set to that source.
 *
 * Not exported from the cone's public surface: `index.ts` re-exports the
 * consumption API only, and `hardening:check` bounds which modules may import
 * this one, so arbitrary application code cannot reach the mint.
 */
export function deriveProvenRouteVocabulary(
  evidence: ValidatedSourceEvidence,
  marker: VocabularyAuthorityMarker,
): ProvenRouteVocabulary {
  if (evidence.vocabularyKind !== 'ROUTE') {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'EVIDENCE_CLASS_MISMATCH');
  }
  if (evidence.members.length > MAX_PROVEN_ROUTE_TEMPLATES) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'VOCABULARY_SIZE');
  }
  const templates = new Set<string>();
  for (const template of evidence.members) {
    if (typeof template !== 'string' || !ROUTE_TEMPLATE_RE.test(template)) {
      failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'ROUTE_TEMPLATE_INVALID');
    }
    templates.add(template);
  }
  const carrier: {
    version: typeof PROVEN_ROUTE_VOCABULARY_VERSION;
    provenanceClass: RouteProvenanceClass;
    provenanceDigest: string;
    templates: ReadonlySet<string>;
    provenance?: MintedProvenance;
  } = {
    version: PROVEN_ROUTE_VOCABULARY_VERSION,
    provenanceClass: evidence.evidenceClass as RouteProvenanceClass,
    provenanceDigest: '',
    templates: templates as ReadonlySet<string>,
  };
  // Mint against the carrier so the brand attaches to the object the caller
  // will actually hold, then seal it with its derived identity.
  const provenance = mintProvenance(evidence, carrier, marker);
  carrier.provenanceDigest = provenance.provenanceDigest;
  carrier.provenance = provenance;
  if (!ROUTE_PROVENANCE_CLASS_SET.has(carrier.provenanceClass)) {
    failProduction('PRODUCTION_PRIVACY_VOCABULARY_INVALID', 'PROVENANCE_AMBIGUOUS');
  }
  return Object.freeze(carrier) as ProvenRouteVocabulary;
}

/**
 * Is this route identity mechanically proven safe to persist?
 *
 * Exact-set membership is the ONLY affirmative answer. No syntactic judgement
 * about the route is made or accepted.
 */
export function isSourceProvenRoute(source: RouteVocabularySource, routeTemplate: string): boolean {
  if (source === NO_PROVEN_ROUTE_VOCABULARY) return false;
  if (typeof routeTemplate !== 'string') return false;
  // The runtime brand, not the shape, is what makes this object a capability.
  // A duck-typed or JSON-revived vocabulary is refused here (A6).
  if (!isMintedCapability(source)) return false;
  return source.templates.has(routeTemplate);
}

/** Route provenance identity for the evidence DTO, carrying no route literals. */
export function routeVocabularyIdentity(source: RouteVocabularySource): {
  readonly provenanceClass: RouteProvenanceClass | 'NONE';
  readonly provenanceDigest: string | null;
  readonly templateCount: number;
} {
  if (source === NO_PROVEN_ROUTE_VOCABULARY) {
    return { provenanceClass: 'NONE', provenanceDigest: null, templateCount: 0 };
  }
  return {
    provenanceClass: source.provenanceClass,
    provenanceDigest: source.provenanceDigest,
    templateCount: source.templates.size,
  };
}

/**
 * The guard every persisted, keyed, logged, fingerprinted or checkpointed
 * route identity must pass. Fails closed when no vocabulary was supplied or
 * the candidate is not a proven member.
 */
export function assertSourceProvenRoute(
  source: RouteVocabularySource,
  routeTemplate: string,
): void {
  if (typeof routeTemplate !== 'string' || !ROUTE_TEMPLATE_RE.test(routeTemplate)) {
    failProduction('PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED', 'ROUTE_TEMPLATE_INVALID');
  }
  if (source !== NO_PROVEN_ROUTE_VOCABULARY) {
    // Production authority requires a genuinely minted, PRODUCTION-marked
    // capability. This is where a TEST_ONLY seam capability is refused.
    assertProductionVocabularyAuthority(source);
  }
  if (!isSourceProvenRoute(source, routeTemplate)) {
    failProduction('PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED', 'ROUTE_NOT_SOURCE_PROVEN');
  }
}
