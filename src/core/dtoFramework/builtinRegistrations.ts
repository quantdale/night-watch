// ---------------------------------------------------------------------------
// Phase 15P A04 — built-in durable-DTO kinds registered into the framework.
//
// DEMONSTRATION BINDINGS: each kind COMPOSES an existing public validator
// verbatim (imported, never re-implemented, never modified at the source)
// and declares its readable historical versions plus declarative coherence
// rules in one place. Coherence rules below are deliberate restatements of
// invariants the owning validators already enforce — they exercise the
// aggregation path end-to-end without inventing new product semantics, so
// any payload accepted before this framework remains accepted.
//
// Purity note: this module imports src/core/campaign/checkpoint.ts for the
// campaign-checkpoint binding, which transitively reaches node:fs inside
// the campaign module. The framework core (types.ts/registry.ts) stays pure;
// consumers wanting only the pure surface import './registry' directly.
// ---------------------------------------------------------------------------

import {
  SEMANTIC_EVALUATION_RECEIPT_VERSION,
  SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
  validateSemanticEvaluationReceipt,
  type SemanticEvaluationReceipt,
} from '../../oracles/semantic/receipts';
import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  validateTriageReplayPlan,
  validateTriageReplayPlanV2,
  type TriageReplayPlan,
  type TriageReplayPlanV2,
} from '../triage/replayPlan';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_MANIFEST_VERSION,
  type CampaignCheckpoint,
  type CampaignManifest,
} from '../campaign/types';
import { validateCampaignManifest } from '../campaign/identity';
import { validateCampaignCheckpoint } from '../campaign/checkpoint';
import { hasDtoKind, registerDtoKind, stableUnderlyingErrorCode } from './registry';
import type {
  DtoCoherenceRule,
  DtoShapeResult,
  DtoValidationContext,
  DtoVersionValidator,
} from './types';

export const SEMANTIC_EVALUATION_RECEIPT_DTO_KIND = 'nightwatch.semantic-evaluation-receipt';
export const TRIAGE_REPLAY_PLAN_DTO_KIND = 'nightwatch.triage-replay-plan';
export const CAMPAIGN_MANIFEST_DTO_KIND = 'nightwatch.campaign-manifest';
export const CAMPAIGN_CHECKPOINT_DTO_KIND = 'nightwatch.campaign-checkpoint';

/** Context slot carrying the bound companion manifest for checkpoint
 *  validation. Absent context fails closed with DTO_CONTEXT_REQUIRED. */
export const CAMPAIGN_CHECKPOINT_CONTEXT_SLOT = 'campaignManifest';

// -- semantic evaluation receipt -------------------------------------------

function validateSemanticReceiptVersion(value: unknown, _context: DtoValidationContext): DtoShapeResult<SemanticEvaluationReceipt> {
  try {
    validateSemanticEvaluationReceipt(value as SemanticEvaluationReceipt);
  } catch (error) {
    return { valid: false, code: stableUnderlyingErrorCode(error) };
  }
  return { valid: true, dto: value as SemanticEvaluationReceipt };
}

// Declarative restatement of SEMANTIC_RECEIPT_INVALID:count-sum.
const RECEIPT_COUNT_IDENTITY: DtoCoherenceRule<SemanticEvaluationReceipt> = {
  ruleId: 'RECEIPT_COUNT_IDENTITY',
  evaluate: (receipt) => (
    receipt.invariantPassCount + receipt.invariantNaCount + receipt.invariantViolationCount === receipt.invariantTotal
      ? null
      : { ruleId: 'RECEIPT_COUNT_IDENTITY', code: 'COUNT_SUM_MISMATCH' }
  ),
};

// Declarative restatement of findings-without-anomaly / anomaly-without-finding.
const RECEIPT_OUTCOME_FINDING_PAIRING: DtoCoherenceRule<SemanticEvaluationReceipt> = {
  ruleId: 'RECEIPT_OUTCOME_FINDING_PAIRING',
  evaluate: (receipt) => {
    if (receipt.outcome === 'ANOMALY' && receipt.findingCount < 1) return { ruleId: 'RECEIPT_OUTCOME_FINDING_PAIRING', code: 'ANOMALY_WITHOUT_FINDING' };
    if (receipt.outcome !== 'ANOMALY' && receipt.findingCount !== 0) return { ruleId: 'RECEIPT_OUTCOME_FINDING_PAIRING', code: 'FINDINGS_WITHOUT_ANOMALY' };
    return null;
  },
};

export function registerSemanticEvaluationReceiptDtoKind(): void {
  if (hasDtoKind(SEMANTIC_EVALUATION_RECEIPT_DTO_KIND)) return;
  registerDtoKind<SemanticEvaluationReceipt>({
    kind: SEMANTIC_EVALUATION_RECEIPT_DTO_KIND,
    versions: {
      // v1 receipts remain structurally valid; v2 adds coverage metadata.
      [SEMANTIC_EVALUATION_RECEIPT_VERSION]: validateSemanticReceiptVersion,
      [SEMANTIC_EVALUATION_RECEIPT_VERSION_V1]: validateSemanticReceiptVersion,
    },
    coherence: [RECEIPT_COUNT_IDENTITY, RECEIPT_OUTCOME_FINDING_PAIRING],
  });
}

// -- triage replay plan v1 / v2 ---------------------------------------------

type AnyTriageReplayPlan = TriageReplayPlan | TriageReplayPlanV2;

const replayPlanV1Validator: DtoVersionValidator<TriageReplayPlan> = (value) => {
  const result = validateTriageReplayPlan(value);
  return result.valid ? { valid: true, dto: result.plan } : { valid: false, code: result.reason };
};

const replayPlanV2Validator: DtoVersionValidator<TriageReplayPlanV2> = (value) => {
  const result = validateTriageReplayPlanV2(value);
  return result.valid ? { valid: true, dto: result.plan } : { valid: false, code: result.reason };
};

// Declarative restatement of subsequence membership: a retained action/ordinal
// is always one of the originals, in both grammars.
const REPLAY_PLAN_RETAINED_MEMBERSHIP: DtoCoherenceRule<AnyTriageReplayPlan> = {
  ruleId: 'REPLAY_PLAN_RETAINED_MEMBERSHIP',
  evaluate: (plan) => {
    if ('retainedActionIds' in plan) {
      return plan.retainedActionIds.every((id) => plan.originalActionIds.includes(id))
        ? null
        : { ruleId: 'REPLAY_PLAN_RETAINED_MEMBERSHIP', code: 'RETAINED_NOT_IN_ORIGINAL' };
    }
    const ordinals = new Set(plan.originalOccurrences.map((occurrence) => occurrence.ordinal));
    return plan.retainedOccurrenceOrdinals.every((ordinal) => ordinals.has(ordinal))
      ? null
      : { ruleId: 'REPLAY_PLAN_RETAINED_MEMBERSHIP', code: 'RETAINED_ORDINAL_NOT_IN_ORIGINAL' };
  },
};

// Declarative restatement of FRESH_EXACT_MUST_MATCH_ORIGINAL[_OCCURRENCES].
const REPLAY_PLAN_FRESH_EXACT_FULL_RETENTION: DtoCoherenceRule<AnyTriageReplayPlan> = {
  ruleId: 'REPLAY_PLAN_FRESH_EXACT_FULL_RETENTION',
  evaluate: (plan) => {
    if (plan.phase !== 'FRESH_EXACT_REPLAY') return null;
    const originalCount = 'retainedActionIds' in plan ? plan.originalActionIds.length : plan.originalOccurrences.length;
    const retainedCount = 'retainedActionIds' in plan ? plan.retainedActionIds.length : plan.retainedOccurrenceOrdinals.length;
    return retainedCount === originalCount
      ? null
      : { ruleId: 'REPLAY_PLAN_FRESH_EXACT_FULL_RETENTION', code: 'FRESH_EXACT_NOT_FULL_RETENTION' };
  },
};

export function registerTriageReplayPlanDtoKind(): void {
  if (hasDtoKind(TRIAGE_REPLAY_PLAN_DTO_KIND)) return;
  registerDtoKind<AnyTriageReplayPlan>({
    kind: TRIAGE_REPLAY_PLAN_DTO_KIND,
    versions: {
      // v1 preserves immutable semantics for historical evidence parsing;
      // v2 adds deterministic occurrence identity. Both stay readable here.
      [TRIAGE_REPLAY_PLAN_VERSION]: replayPlanV1Validator,
      [TRIAGE_REPLAY_PLAN_V2_VERSION]: replayPlanV2Validator,
    },
    coherence: [REPLAY_PLAN_RETAINED_MEMBERSHIP, REPLAY_PLAN_FRESH_EXACT_FULL_RETENTION],
  });
}

// -- campaign manifest -------------------------------------------------------

function validateCampaignManifestVersion(value: unknown, _context: DtoValidationContext): DtoShapeResult<CampaignManifest> {
  try {
    validateCampaignManifest(value);
  } catch (error) {
    return { valid: false, code: stableUnderlyingErrorCode(error) };
  }
  return { valid: true, dto: value as CampaignManifest };
}

// Declarative restatement of TIME_BUDGET_DERIVATION_MISMATCH.
const MANIFEST_TIME_BUDGET_DERIVATION: DtoCoherenceRule<CampaignManifest> = {
  ruleId: 'MANIFEST_TIME_BUDGET_DERIVATION',
  evaluate: (manifest) => (
    manifest.runtimeCeilingMs === manifest.budgetPolicy.maxRuntimeMs
      && manifest.perTestTimeoutMs === manifest.budgetPolicy.maxPerTestTimeoutMs
      ? null
      : { ruleId: 'MANIFEST_TIME_BUDGET_DERIVATION', code: 'TIME_BUDGET_DERIVATION_MISMATCH' }
  ),
};

// Declarative restatement of JOURNEY_SELECTION_WORK_MISMATCH.
const MANIFEST_JOURNEY_WORK_COVERAGE: DtoCoherenceRule<CampaignManifest> = {
  ruleId: 'MANIFEST_JOURNEY_WORK_COVERAGE',
  evaluate: (manifest) => {
    if (manifest.mode === 'REPRODUCTION_ONLY') return null;
    const journeyItems = manifest.workItems.filter((item) => item.kind === 'JOURNEY').length;
    return journeyItems === manifest.selectedJourneys.length
      ? null
      : { ruleId: 'MANIFEST_JOURNEY_WORK_COVERAGE', code: 'JOURNEY_SELECTION_WORK_MISMATCH' };
  },
};

export function registerCampaignManifestDtoKind(): void {
  if (hasDtoKind(CAMPAIGN_MANIFEST_DTO_KIND)) return;
  registerDtoKind<CampaignManifest>({
    kind: CAMPAIGN_MANIFEST_DTO_KIND,
    versions: {
      [CAMPAIGN_MANIFEST_VERSION]: validateCampaignManifestVersion,
    },
    coherence: [MANIFEST_TIME_BUDGET_DERIVATION, MANIFEST_JOURNEY_WORK_COVERAGE],
  });
}

// -- campaign checkpoint -----------------------------------------------------

/**
 * The strict checkpoint authority (`validateCampaignCheckpoint`) validates a
 * checkpoint RELATIVE TO its bound manifest, so this version validator
 * requires that manifest through the explicit context slot. A dispatch
 * without the companion manifest fails closed with `DTO_CONTEXT_REQUIRED`
 * instead of weakening the check to a manifest-free approximation.
 */
const campaignCheckpointValidator: DtoVersionValidator<CampaignCheckpoint> = (value, context) => {
  const manifest = context[CAMPAIGN_CHECKPOINT_CONTEXT_SLOT];
  if (manifest === undefined) {
    return { valid: false, code: `DTO_CONTEXT_REQUIRED:${CAMPAIGN_CHECKPOINT_CONTEXT_SLOT}` };
  }
  try {
    validateCampaignCheckpoint(value, manifest as CampaignManifest);
  } catch (error) {
    return { valid: false, code: stableUnderlyingErrorCode(error) };
  }
  return { valid: true, dto: value as CampaignCheckpoint };
};

// Declarative restatement of PRIVACY_STATUS_MISMATCH.
const CHECKPOINT_PRIVACY_STATUS_MATCH: DtoCoherenceRule<CampaignCheckpoint> = {
  ruleId: 'CHECKPOINT_PRIVACY_STATUS_MATCH',
  evaluate: (checkpoint) => (
    checkpoint.privacyStatus === checkpoint.privacy.result
      ? null
      : { ruleId: 'CHECKPOINT_PRIVACY_STATUS_MATCH', code: 'PRIVACY_STATUS_MISMATCH' }
  ),
};

export function registerCampaignCheckpointDtoKind(): void {
  if (hasDtoKind(CAMPAIGN_CHECKPOINT_DTO_KIND)) return;
  registerDtoKind<CampaignCheckpoint>({
    kind: CAMPAIGN_CHECKPOINT_DTO_KIND,
    versions: {
      [CAMPAIGN_CHECKPOINT_VERSION]: campaignCheckpointValidator,
    },
    coherence: [CHECKPOINT_PRIVACY_STATUS_MATCH],
  });
}

/** Idempotent bootstrap registering every built-in durable-DTO kind. */
export function registerCoreDurableDtoKinds(): void {
  registerSemanticEvaluationReceiptDtoKind();
  registerTriageReplayPlanDtoKind();
  registerCampaignManifestDtoKind();
  registerCampaignCheckpointDtoKind();
}
