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

import { validateCampaignMorningBrief } from '../campaign/brief';
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
import {
  CAMPAIGN_CHECKPOINT_CONTEXT_SLOT,
  CAMPAIGN_CHECKPOINT_DTO_KIND,
  SEMANTIC_EVALUATION_RECEIPT_DTO_KIND,
  TRIAGE_REPLAY_PLAN_DTO_KIND,
  registerCoreDurableDtoKinds,
  validateVersionedDto,
} from '../dtoFramework';
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
  REPLAY_RESULT_ENVELOPE_RESERVED_KIND,
  isReplayResultEnvelopeKindRegistered,
  registerReplayResultEnvelopeValidator,
} from './replayEnvelopeRegistration';

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

/**
 * G14.6 (14.7). The versioned-DTO framework owns readable-version dispatch for
 * the kinds it registers. The facade keeps its stable `ARTIFACT_*` reason
 * vocabulary by translating the framework's structural code back to it: a
 * shape failure is the owning module validator's own message, and an unknown,
 * missing or invalid discriminator is the legacy version refusal.
 */
function translateDtoFailure(layer: 'receipt' | 'replay-plan' | 'checkpoint', code: string): string {
  const layerPrefix = layer === 'receipt'
    ? 'ARTIFACT_RECEIPT_INVALID'
    : layer === 'replay-plan'
      ? 'ARTIFACT_REPLAY_PLAN_INVALID'
      : 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID';
  if (code === 'DTO_PAYLOAD_NOT_RECORD') {
    return layer === 'checkpoint' ? 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:OBJECT_REQUIRED' : `${layerPrefix}:OBJECT_REQUIRED`;
  }
  if (code.startsWith('DTO_CONTEXT_REQUIRED:')) return 'ARTIFACT_CONTEXT_MISSING:campaign-checkpoint:manifest';
  if (code.startsWith('DTO_VERSION_DISCRIMINATOR_MISSING:')) {
    return layer === 'checkpoint' ? 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:SCHEMA_INVALID' : `${layerPrefix}:SCHEMA_VERSION_UNSUPPORTED:undefined`;
  }
  if (code.startsWith('DTO_VERSION_DISCRIMINATOR_INVALID:')) {
    return layer === 'checkpoint'
      ? 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:SCHEMA_INVALID'
      : `${layerPrefix}:SCHEMA_VERSION_UNSUPPORTED:${safeErrorDetail(code.slice('DTO_VERSION_DISCRIMINATOR_INVALID:'.length))}`;
  }
  if (code.startsWith('DTO_VERSION_UNKNOWN:')) {
    return layer === 'checkpoint' ? 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:SCHEMA_INVALID' : `${layerPrefix}:SCHEMA_VERSION_UNSUPPORTED:${code.slice('DTO_VERSION_UNKNOWN:'.length)}`;
  }
  if (code.startsWith('DTO_SHAPE_INVALID:')) {
    const inner = code.slice('DTO_SHAPE_INVALID:'.length);
    return layer === 'replay-plan' ? `${layerPrefix}:${inner}` : inner;
  }
  return `${layerPrefix}:${code}`;
}

// G14.6 (14.7): one idempotent bootstrap of the framework's built-in durable
// kinds, so the facade never dispatches a kind that is registered but not yet
// loaded.
registerCoreDurableDtoKinds();

const KIND_VALIDATORS: Readonly<Record<ArtifactKind, KindValidator>> = Object.freeze({
  'campaign-checkpoint': (value, context) => {
    // The module validator is manifest-bound by design; a missing manifest is
    // a caller error and must fail closed rather than skip validation.
    if (context.manifest === undefined) throw new Error('ARTIFACT_CONTEXT_MISSING:campaign-checkpoint:manifest');
    const result = validateVersionedDto(CAMPAIGN_CHECKPOINT_DTO_KIND, value, { [CAMPAIGN_CHECKPOINT_CONTEXT_SLOT]: context.manifest });
    if (!result.valid) throw new Error(translateDtoFailure('checkpoint', result.code));
  },
  'observation': (value) => {
    validateAnomalyObservationArtifact(value);
  },
  'semantic-receipt': (value) => {
    // The framework owns version dispatch; the raw validator message and the
    // facade's receipt-id recomposition remain the leaf checks.
    const result = validateVersionedDto(SEMANTIC_EVALUATION_RECEIPT_DTO_KIND, value);
    if (!result.valid) throw new Error(translateDtoFailure('receipt', result.code));
    if (!isRecord(value)) throw new Error('ARTIFACT_RECEIPT_INVALID:OBJECT_REQUIRED');
    if (!receiptIdMatches(value)) throw new Error('ARTIFACT_RECEIPT_INVALID:RECEIPT_ID_MISMATCH');
  },
  'replay-plan': (value) => {
    const result = validateVersionedDto(TRIAGE_REPLAY_PLAN_DTO_KIND, value);
    if (!result.valid) throw new Error(translateDtoFailure('replay-plan', result.code));
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
  'candidate-record': (value, context) => {
    validateCampaignCandidateRecordArtifact(value, {
      knownClusterIds: context.knownClusterIds,
      knownBugCandidateIds: context.knownBugCandidateIds,
    });
  },
  'replay-record': (value) => {
    validateReplayRecordArtifact(value);
  },
  'minimization-record': (value) => {
    validateMinimizationResultArtifact(value);
  },
  'project-health-report': (value) => {
    validateProjectHealthReportArtifact(value);
  },
});

// The reserved `replay-result-envelope` artifact kind validates through the
// owning module's strict parser (triage/replayEnvelope), registered here once
// at module load. The registration slot's throw-based contract is bridged from
// the parser's result object exactly like the static 'replay-plan' kind
// bridges its validator; unregistered, the slot fails closed with
// ARTIFACT_KIND_RESERVED (see replayEnvelopeRegistration).
registerReplayResultEnvelopeValidator((value: unknown): void => {
  const result = validateReplayResultEnvelope(value);
  if (!result.valid) throw new Error(`ARTIFACT_REPLAY_ENVELOPE_INVALID:${result.reason}`);
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
    // Single reserved extension slot: the Phase 15P A06 ReplayResultEnvelope
    // kind dispatches here once its module registers a validator, and fails
    // closed (ARTIFACT_KIND_RESERVED) until then. Everything else unknown
    // fails closed with ARTIFACT_KIND_UNKNOWN.
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
