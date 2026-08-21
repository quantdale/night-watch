// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — converged durable-artifact validation facade.
//
//   validateArtifact(kind, unknownValue, context?) -> strict result
//
// One coherent entry point in front of every durable private artifact format.
// It never throws, never repairs, and never mutates its input: malformed or
// coherence-invalid data is REJECTED with a stable reason code before it can
// contaminate later triage/promotion stages. Unknown kinds fail closed.
//
// Composition map (module validators are reused verbatim, never forked):
// - campaign-checkpoint -> campaign/checkpoint.validateCampaignCheckpoint
//     (requires context.manifest; the checkpoint validator is manifest-bound)
// - semantic-receipt    -> oracles/semantic/receipts.validateSemanticEvaluationReceipt
//     plus deterministic receiptId recomposition
// - replay-plan         -> triage/replayPlan.validateTriageReplayPlan(V2)
//     dispatched on schemaVersion (v1 historical + v2 current)
// - dossier             -> triage/dossier.validateBugDossier (v1 READY),
//     strict INCOMPLETE stub check, triage/dossierV2.parseBugDossierV2 (v2)
// - morning-brief       -> campaign/brief.validateCampaignMorningBrief
// - source-bundle       -> core/source/semanticCampaignBundle.validateSemanticCampaignBundle
// - observation / cluster / reproduction-record / coverage-report ->
//     strict validators in this directory (no prior standalone validator
//     existed; they compose over the owning modules' types, runtime guards,
//     digest helpers, and producers)
// - 'replay-result-envelope' -> triage/replayEnvelope.validateReplayResultEnvelope,
//     registered into the single reserved slot (replayEnvelopeRegistration)
//     at module load; fails closed while unregistered
//
// Round-2 kinds (same facade, same contract):
// - candidate-record    -> artifactValidation/candidateRecordValidation
//     composes campaign/candidateLifecycle.validateCandidateLifecycleRecord
//     verbatim (the strict authority behind the checkpoint's Session-2
//     `candidateLifecycles` ledger) plus checkpoint-style referential checks
// - replay-record       -> artifactValidation/replayRecordValidation deepens
//     the EXISTING replay-plan v1/v2 shapes by composition (sentinel screen +
//     occurrence-multiplicity/identity depth); the Phase 15P A06
//     ReplayResultEnvelope is NOT imported — it registers through
//     replayEnvelopeRegistration.ts and fails closed until then
// - minimization-record -> artifactValidation/minimizationValidation over
//     triage/types.MinimizationResult (no digest builder exists in the
//     minimizer, so there is no identity to recompose)
// - project-health-report -> artifactValidation/projectHealthValidation over
//     readiness/localReadiness.LocalReadinessSummary (vocabulary arrays and
//     frozen owner-scope markers imported from the owning module)
//
// Pure facade: no fs/network/child-process/DB/AI authority. Importing the
// checkpoint module pulls the private-artifact store into the module graph,
// but no storage API is reachable through this facade.
// ---------------------------------------------------------------------------

import { validateCampaignCheckpoint } from '../campaign/checkpoint';
import { validateCampaignMorningBrief } from '../campaign/brief';
import { validateSemanticEvaluationReceipt, SEMANTIC_EVALUATION_RECEIPT_VERSION, SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 } from '../../oracles/semantic/receipts';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION, validateTriageReplayPlan, validateTriageReplayPlanV2 } from '../triage/replayPlan';
import { validateSemanticCampaignBundle } from '../source/semanticCampaignBundle';
import { createHash } from 'node:crypto';
import {
  ARTIFACT_KIND_VERSION_ACCEPTANCE,
  KNOWN_ARTIFACT_KINDS,
  type ArtifactKind,
  type ArtifactValidationContext,
  type ArtifactValidationResult,
} from './types';
import { safeErrorDetail } from '../campaign/runtimeValidation';
import { validateAnomalyClusterArtifact, validateAnomalyObservationArtifact } from './observationClusterValidation';
import { validateReproductionRecordArtifact } from './reproductionValidation';
import { validateCoverageReportArtifact } from './coverageReportValidation';
import { validateDossierArtifact } from './dossierKindValidation';
import { validateCampaignCandidateRecordArtifact } from './candidateRecordValidation';
import { validateReplayRecordArtifact } from './replayRecordValidation';
import { validateMinimizationResultArtifact } from './minimizationValidation';
import { validateProjectHealthReportArtifact } from './projectHealthValidation';
import { validateReplayResultEnvelope } from '../triage/replayEnvelope';
import { registerReplayResultEnvelopeValidator, validateReservedArtifactKind } from './replayEnvelopeRegistration';

export type {
  ArtifactKind,
  ArtifactValidationContext,
  ArtifactValidationResult,
} from './types';
export {
  ARTIFACT_KIND_VERSION_ACCEPTANCE,
  ARTIFACT_VALIDATION_FACADE_VERSION,
  KNOWN_ARTIFACT_KINDS,
} from './types';
export {
  validateAnomalyClusterArtifact,
  validateAnomalyClusterArtifacts,
  validateAnomalyObservationArtifact,
} from './observationClusterValidation';
export {
  validateCampaignPrivacyStatusShape,
  validateCampaignSafetyVectorShape,
  validateReproductionRecordArtifact,
} from './reproductionValidation';
export { validateCoverageReportArtifact } from './coverageReportValidation';
export { validateDossierArtifact } from './dossierKindValidation';
export {
  CAMPAIGN_CANDIDATE_RECORD_VERSION,
  validateCampaignCandidateRecordArtifact,
} from './candidateRecordValidation';
export { validateReplayRecordArtifact } from './replayRecordValidation';
export { validateMinimizationResultArtifact } from './minimizationValidation';
export { validateProjectHealthReportArtifact } from './projectHealthValidation';
export {
    const reservedResult = typeof kind === 'string' ? validateReservedArtifactKind(kind, value, context) : null;
    if (reservedResult !== null) return reservedResult;
    // The rejected kind is caller-controlled: the durable result carries only
    // its bounded categorical projection, never the raw payload.
    const safeKind = safeErrorDetail(kind);
    return { valid: false, kind: safeKind, reason: `ARTIFACT_KIND_UNKNOWN:${safeKind}` };
  }
  const artifactKind = kind as ArtifactKind;
  try {
    KIND_VALIDATORS[artifactKind](value, context);
  } catch (error) {
    const reason = error instanceof Error ? error.message : `${artifactKind.toUpperCase()}_REJECTED`;
    return { valid: false, kind: artifactKind, reason };
  }
  return { valid: true, kind: artifactKind, acceptedSchemaVersions: ARTIFACT_KIND_VERSION_ACCEPTANCE[artifactKind] };
}
