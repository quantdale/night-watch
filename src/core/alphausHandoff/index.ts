// Nightwatch AH-1 — Alphaus-compatible human-review finding handoff.
// Projection-only: BugDossier -> local/private human-review artifact.

export {
  ALPHAUS_FINDING_HANDOFF_VERSION,
  ALPHAUS_SEVERITY_VALUES,
  ALPHAUS_CATCH_STAGE_VALUES,
  ALPHAUS_SOURCE_VALUES,
  ALPHAUS_REPORT_TYPE_VALUES,
  ALPHAUS_SEVERITY_EVIDENCE_CLASSES,
  ALPHAUS_OBSERVATION_STAGES,
  alphausFindingDigest,
} from './types';
export type {
  AlphausSeverityValue,
  AlphausCatchStageValue,
  AlphausSourceValue,
  AlphausReportTypeValue,
  AlphausSeverityEvidenceClass,
  AlphausObservationStage,
  AlphausObservationProvenance,
  AlphausRecommendation,
  AlphausFindingFacts,
  AlphausInvestigationProjection,
  AlphausFindingHandoff,
  AlphausHandoffInput,
} from './types';
export { projectAlphausFindingHandoff } from './handoff';
