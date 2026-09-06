// ---------------------------------------------------------------------------
// Nightwatch Lane E - System Atlas overlay barrel.
// ---------------------------------------------------------------------------

export {
  ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED,
  ATLAS_MALFORMED_RECORD,
  ATLAS_UNKNOWN_CONCEPT_KIND,
  ATLAS_UNPROVEN_LINK,
  SYSTEM_ATLAS_OVERLAY_VERSION,
  SYSTEM_ATLAS_SYNTHETIC_PREFIX,
  createAtlasProvenance,
  createSystemAtlasRecord,
  isAtlasFactCategory,
  isSystemAtlasConceptKind,
  relabelAtlasProvenance,
  validateSystemAtlasRecord,
  type AtlasProvenanceInput,
  type AtlasRecordValidation,
  type AtlasRelabelInput,
  type SystemAtlasRecordInput,
} from './model';
export {
  ATLAS_DUPLICATE_CONCEPT_ID,
  ATLAS_HARD_LIMIT,
  createAtlasQuery,
  createSystemAtlasOverlay,
  linkConceptToTechnicalNodes,
  querySystemAtlas,
  querySystemAtlasByKind,
  type AtlasLinkProof,
  type AtlasLinkResult,
  type SystemAtlasOverlay,
} from './overlay';
export { createSyntheticSystemAtlasOverlay, SYNTHETIC_SYSTEM_ATLAS_FIXTURES } from './fixtures';
