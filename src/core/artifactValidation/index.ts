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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deterministic receipt-id recomposition over the exact safe-field body —
 * mirrors buildSemanticEvaluationReceipt's canonicalization (top-level key
 * replacer array, sha256, 24-hex slice) so a tampered id fails closed.
 */
function receiptIdMatches(receipt: Record<string, unknown>): boolean {
  const { receiptId, ...body } = receipt;
  if (typeof receiptId !== 'string') return false;
  const canonical = JSON.stringify(body, Object.keys(body).sort());
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
  return receiptId === `receipt:sha256:${digest}`;
}

type KindValidator = (value: unknown, context: ArtifactValidationContext) => void;

const KIND_VALIDATORS: Readonly<Record<ArtifactKind, KindValidator>> = Object.freeze({
  'campaign-checkpoint': (value, context) => {
    // The module validator is manifest-bound by design; a missing manifest is
    // a caller error and must fail closed rather than skip validation.
    if (context.manifest === undefined) throw new Error('ARTIFACT_CONTEXT_MISSING:campaign-checkpoint:manifest');
    validateCampaignCheckpoint(value, context.manifest);
  },
  'observation': (value) => {
    validateAnomalyObservationArtifact(value);
  },
  'semantic-receipt': (value) => {
    // Pre-guard so null/primitive inputs produce a stable reason instead of a
    // TypeError inside the typed module validator.
    if (!isRecord(value)) throw new Error('ARTIFACT_RECEIPT_INVALID:OBJECT_REQUIRED');
    const version = value.schemaVersion;
    if (version !== SEMANTIC_EVALUATION_RECEIPT_VERSION && version !== SEMANTIC_EVALUATION_RECEIPT_VERSION_V1) {
      throw new Error(`ARTIFACT_RECEIPT_INVALID:SCHEMA_VERSION_UNSUPPORTED:${safeErrorDetail(version)}`);
    }
    validateSemanticEvaluationReceipt(value as never);
    if (!receiptIdMatches(value)) throw new Error('ARTIFACT_RECEIPT_INVALID:RECEIPT_ID_MISMATCH');
  },
  'replay-plan': (value) => {
    if (!isRecord(value)) throw new Error('ARTIFACT_REPLAY_PLAN_INVALID:OBJECT_REQUIRED');
    const version = value.schemaVersion;
    if (version === TRIAGE_REPLAY_PLAN_VERSION) {
      const result = validateTriageReplayPlan(value);
      if (!result.valid) throw new Error(`ARTIFACT_REPLAY_PLAN_INVALID:${result.reason}`);
      return;
    }
    if (version === TRIAGE_REPLAY_PLAN_V2_VERSION) {
      const result = validateTriageReplayPlanV2(value);
      if (!result.valid) throw new Error(`ARTIFACT_REPLAY_PLAN_INVALID:${result.reason}`);
      return;
    }
    throw new Error(`ARTIFACT_REPLAY_PLAN_INVALID:SCHEMA_VERSION_UNSUPPORTED:${safeErrorDetail(version)}`);
  },
  'cluster': (value) => {
    validateAnomalyClusterArtifact(value);
  },
  'reproduction-record': (value, context) => {
    validateReproductionRecordArtifact(value, {
      knownClusterIds: context.knownClusterIds,
      knownObservationRunIds: context.knownObservationRunIds,
    });
  },
  'dossier': (value) => {
    validateDossierArtifact(value);
  },
  'morning-brief': (value) => {
    validateCampaignMorningBrief(value);
  },
  'source-bundle': (value) => {
    if (!isRecord(value)) throw new Error('ARTIFACT_SOURCE_BUNDLE_INVALID:OBJECT_REQUIRED');
    validateSemanticCampaignBundle(value as never);
  },
  'coverage-report': (value) => {
    validateCoverageReportArtifact(value);
  },
});

/**
 * Strict, read-only validation of one durable private artifact.
 *
 * Returns `{ valid: true, kind, acceptedSchemaVersions }` when the value is a
 * well-formed, coherence-valid instance of an accepted historical version of
 * `kind`; otherwise `{ valid: false, kind, reason }` with a stable reason
 * code. Unknown kinds (and non-string kinds) fail closed with
 * `ARTIFACT_KIND_UNKNOWN`.
 */
export function validateArtifact(
  kind: string,
  value: unknown,
  context: ArtifactValidationContext = {},
): ArtifactValidationResult {
  if (typeof kind !== 'string' || !(KNOWN_ARTIFACT_KINDS as readonly string[]).includes(kind)) {
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
