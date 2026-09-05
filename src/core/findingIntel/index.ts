// ---------------------------------------------------------------------------
// Deterministic finding-intelligence vocabulary (advisory only).
// ---------------------------------------------------------------------------

export {
  EXPECTATION_PROVENANCE,
  FINDING_INTEL_VERSION,
  FINDING_RECURRENCE,
  FINDING_RELATIONSHIPS,
  INTEL_CONFIDENCE,
  type DefectClass,
  type ExpectationProvenance,
  type FindingRecurrence,
  type FindingRelationship,
  type IntelConfidence,
  type IntelFindingDescriptor,
  type IntelHistoryEntry,
  type RecurrenceResult,
  type RelationshipCounterevidence,
  type RelationshipEvidence,
  type RelationshipResult,
} from './types';
export { classifyRelationship, relationshipDigest, type RelationshipHistory } from './relationships';
export {
  assertProvenConfidence,
  classifyRecurrence,
  defectClassDigest,
  groupDefectClasses,
  provenanceCapsConfidence,
  strongestProvenance,
  type DefectClassInput,
} from './analysis';
