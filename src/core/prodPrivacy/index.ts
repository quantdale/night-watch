// ---------------------------------------------------------------------------
// Nightwatch C-10 — production privacy PURE cone public surface.
//
// Everything exported here is import-isolated: no filesystem, no network, no
// process, no publication authority (enforced by `npm run hardening:check`).
// Nothing here can persist. Persistence lives in src/core/prodEvidence/**.
//
// C-10.5: the MINT is deliberately absent from this surface.
// `deriveProvenRouteVocabulary` / `deriveProvenKeyVocabulary` take an
// authority marker, so re-exporting them here would put a `'PRODUCTION'`
// argument within reach of any module that imports the cone — which is the
// authority gap C-10.5 closed. The vocabulary re-exports below are therefore
// ENUMERATED rather than `export *`, and cover the CONSUMPTION API only.
// Derivation is reached through `src/core/prodProvenance/**`, whose importers
// `hardening:check` bounds.
// ---------------------------------------------------------------------------

export * from './errors';
export * from './policy';
export * from './types';
export * from './serializer';
export * from './projector';
export * from './evidence';
export * from './parameterProvenance';

// Key vocabulary — consumption API only.
export {
  PROVEN_KEY_VOCABULARY_VERSION,
  KEY_PROVENANCE_CLASSES,
  MAX_PROVEN_VOCABULARY_KEYS,
  MAX_PROVEN_KEY_LENGTH,
  FORBIDDEN_PRODUCTION_KEY_NAMES,
  NO_PROVEN_VOCABULARY,
  isSourceProvenKey,
  assertProductionKeyVocabularyAuthority,
  vocabularyIdentity,
  type KeyProvenanceClass,
  type ProvenKeyVocabulary,
  type NoProvenVocabulary,
  type KeyVocabularySource,
} from './keyVocabulary';

// Route vocabulary — consumption API only.
export {
  PROVEN_ROUTE_VOCABULARY_VERSION,
  ROUTE_PROVENANCE_CLASSES,
  MAX_PROVEN_ROUTE_TEMPLATES,
  NO_PROVEN_ROUTE_VOCABULARY,
  isSourceProvenRoute,
  routeVocabularyIdentity,
  assertSourceProvenRoute,
  type RouteProvenanceClass,
  type ProvenRouteVocabulary,
  type NoProvenRouteVocabulary,
  type RouteVocabularySource,
} from './routeVocabulary';

// Provenance authority — inspection and the production guard. `mintProvenance`
// is NOT re-exported: it is the mint.
export {
  PROVENANCE_AUTHORITY_VERSION,
  VOCABULARY_AUTHORITY_MARKERS,
  VOCABULARY_KINDS,
  SOURCE_INVENTORY_STATES,
  SOURCE_CURRENCY_STATES,
  SOURCE_EVIDENCE_QUALIFIERS,
  AUTHORITATIVE_SOURCE_REPOSITORIES,
  encodeSourceEvidenceBinding,
  computeProvenanceDigest,
  isMintedCapability,
  capabilityAuthorityMarker,
  assertProductionVocabularyAuthority,
  type VocabularyAuthorityMarker,
  type VocabularyKind,
  type SourceInventoryState,
  type SourceCurrencyState,
  type SourceEvidenceQualifier,
  type ValidatedSourceEvidence,
  type MintedProvenance,
} from './vocabularyAuthority';
