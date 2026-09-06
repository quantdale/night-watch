// Lane G — autonomous finding dossier: fail-closed builder + handoff projection.
// Pure cone: no filesystem, network, or subprocess authority; no outbound report path.

export {
  AUTONOMOUS_FINDING_AUTHORITY,
  AUTONOMOUS_SEVERITIES,
  AUTONOMOUS_FINDING_VERSION,
  type AutonomousFindingDossier,
  type AutonomousSeverity,
} from './types';
export {
  AUTONOMOUS_FINDING_ENVIRONMENTS,
  AUTONOMOUS_FINDING_CONFIDENCES,
  type AutonomousFindingDraft,
  type AutonomousFindingEnvironment,
  type AutonomousFindingConfidence,
} from './types';
export { buildAutonomousFindingDossier } from './dossier';
export {
  AUTONOMOUS_HANDOFF_PROJECTION_VERSION,
  type AutonomousHandoffAuthority,
  type AutonomousHandoffRecommendation,
  type AutonomousHandoffFacts,
  type AutonomousHandoffProjection,
  projectAutonomousDossierToHandoff,
} from './projection';
