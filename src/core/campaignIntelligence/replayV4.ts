// Phase 19 — replay fidelity V4. V3 remains the semantic identity oracle;
// V4 adds explicit dependency/environment/ordering/timing divergence rather
// than collapsing every non-pass into a negative replay.

import {
  classifySemanticReplay,
  createSemanticReplayFidelityReceipt,
  type SemanticReplayClassificationInput,
  type SemanticReplayFidelityReceipt,
} from "../triage/semanticReplay";
import {
  CAMPAIGN_REPLAY_V4_VERSION,
  type CampaignSourceCurrentness,
  safeCampaignDigest,
} from "./types";

export type ReplayFidelityV4Outcome =
  | "REPRODUCED_EXACT"
  | "REPRODUCED_SEMANTIC_EQUIVALENT"
  | "PRECONDITION_DIVERGENCE"
  | "ENVIRONMENT_DIVERGENCE"
  | "ORDERING_DIVERGENCE"
  | "TIMING_SENSITIVE"
  | "SOURCE_STALE"
  | "NO_LONGER_APPLICABLE"
  | "NONDETERMINISTIC"
  | "EXECUTOR_FAILURE"
  | "INVALID_REPLAY_PLAN"
  | "GENUINELY_NOT_REPRODUCED"
  | "SEMANTIC_DIVERGENCE";

export interface ReplayFidelityV4Input {
  readonly expectedSemanticFindingFingerprint: string;
  readonly expectedContractIdentity: string;
  readonly observedSemanticFindingFingerprint?: string;
  readonly observedContractIdentity?: string;
  readonly expectedObservationDigest: string | null;
  readonly observedObservationDigest: string | null;
  readonly originalOccurrenceDigest: string;
  readonly retainedOccurrenceDigest: string;
  readonly originalOccurrenceCount: number;
  readonly retainedOccurrenceCount: number;
  readonly occurrenceBinding: "BOUND" | "AMBIGUOUS" | "INVALID";
  readonly orderingPreserved: boolean;
  readonly dependencyStateDigest: string;
  readonly environmentInputDigest: string;
  readonly semanticStateDigest: string;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly terminalStatus: "FAILURE" | "PASS" | "INVALID" | "NOT_EXECUTED";
  readonly preconditionSatisfied: boolean;
  readonly environmentDiverged: boolean;
  readonly noLongerApplicable: boolean;
  readonly timingSensitive: boolean;
  readonly executorFailed: boolean;
  readonly executorNondeterministic: boolean;
  readonly safetyClean: boolean;
  readonly repeatedOutcomeClasses: readonly string[];
}

export interface ReplayFidelityV4 {
  readonly schemaVersion: typeof CAMPAIGN_REPLAY_V4_VERSION;
  readonly outcome: ReplayFidelityV4Outcome;
  readonly baseV3Receipt: SemanticReplayFidelityReceipt;
  readonly expectedObservationDigest: string | null;
  readonly observedObservationDigest: string | null;
  readonly observationEqual: boolean | null;
  readonly originalOccurrenceDigest: string;
  readonly retainedOccurrenceDigest: string;
  readonly originalOccurrenceCount: number;
  readonly retainedOccurrenceCount: number;
  readonly orderingPreserved: boolean;
  readonly dependencyStateDigest: string;
  readonly environmentInputDigest: string;
  readonly semanticStateDigest: string;
  readonly preconditionSatisfied: boolean;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly deterministic: boolean;
  readonly repeatedOutcomeClasses: readonly string[];
  readonly divergenceReasons: readonly string[];
  readonly deterministicDigest: string;
}

const SAFE_FP_RE = /^fp:sha256:[0-9a-f]{24}$/;
const SAFE_CONTRACT_RE = /^sci:sha256:[0-9a-f]{24}$/;
const SAFE_DIGEST_RE = /^(?:ctx|sha256|env|dep|sem|occ|obs):[A-Za-z0-9:_-]{8,}$/;
const SAFE_SOURCE_VALUES: readonly CampaignSourceCurrentness[] = ["CURRENT", "STALE", "UNAVAILABLE", "AMBIGUOUS", "MISSING", "SYNTHETIC_ONLY"];

function invalid(reason: string): never {
  throw new Error(`REPLAY_FIDELITY_V4_INVALID:${reason}`);
}

function digest(value: string | null, field: string): void {
  if (value !== null && !SAFE_DIGEST_RE.test(value)) invalid(`${field}_DIGEST`);
}

function validateInput(input: ReplayFidelityV4Input): void {
  if (!SAFE_FP_RE.test(input.expectedSemanticFindingFingerprint)) invalid("EXPECTED_FINGERPRINT");
  if (!SAFE_CONTRACT_RE.test(input.expectedContractIdentity)) invalid("EXPECTED_CONTRACT");
  if (input.observedSemanticFindingFingerprint !== undefined && !SAFE_FP_RE.test(input.observedSemanticFindingFingerprint)) invalid("OBSERVED_FINGERPRINT");
  if (input.observedContractIdentity !== undefined && !SAFE_CONTRACT_RE.test(input.observedContractIdentity)) invalid("OBSERVED_CONTRACT");
  digest(input.expectedObservationDigest, "EXPECTED_OBSERVATION");
  digest(input.observedObservationDigest, "OBSERVED_OBSERVATION");
  for (const [field, value] of [["ORIGINAL_OCCURRENCE", input.originalOccurrenceDigest], ["RETAINED_OCCURRENCE", input.retainedOccurrenceDigest], ["DEPENDENCY", input.dependencyStateDigest], ["ENVIRONMENT", input.environmentInputDigest], ["SEMANTIC_STATE", input.semanticStateDigest]] as const) digest(value, field);
  if (!SAFE_SOURCE_VALUES.includes(input.sourceCurrentness)) invalid("SOURCE_CURRENTNESS");
  if (!Number.isInteger(input.originalOccurrenceCount) || input.originalOccurrenceCount < 0 || input.originalOccurrenceCount > 64) invalid("ORIGINAL_COUNT");
  if (!Number.isInteger(input.retainedOccurrenceCount) || input.retainedOccurrenceCount < 0 || input.retainedOccurrenceCount > input.originalOccurrenceCount) invalid("RETAINED_COUNT");
  if (!["BOUND", "AMBIGUOUS", "INVALID"].includes(input.occurrenceBinding)) invalid("OCCURRENCE_BINDING");
  for (const key of ["orderingPreserved", "preconditionSatisfied", "environmentDiverged", "noLongerApplicable", "timingSensitive", "executorFailed", "executorNondeterministic", "safetyClean"] as const) if (typeof input[key] !== "boolean") invalid(`${key}_BOOLEAN`);
  if (!Array.isArray(input.repeatedOutcomeClasses) || input.repeatedOutcomeClasses.length > 16 || input.repeatedOutcomeClasses.some((value) => typeof value !== "string" || !/^[A-Z_]{1,64}$/.test(value))) invalid("REPEATED_OUTCOMES");
}

function baseInput(input: ReplayFidelityV4Input): SemanticReplayClassificationInput {
  return {
    expectedSemanticFindingFingerprint: input.expectedSemanticFindingFingerprint,
    expectedContractIdentity: input.expectedContractIdentity,
    ...(input.observedSemanticFindingFingerprint === undefined ? {} : { observedSemanticFindingFingerprint: input.observedSemanticFindingFingerprint }),
    ...(input.observedContractIdentity === undefined ? {} : { observedContractIdentity: input.observedContractIdentity }),
    terminalStatus: input.terminalStatus,
    occurrenceBinding: input.occurrenceBinding,
    sourceCurrentness: v3Currentness(input.sourceCurrentness),
    safetyClean: input.safetyClean,
    executorThrew: input.executorFailed,
    executorNondeterministic: input.executorNondeterministic,
    preconditionDiverged: !input.preconditionSatisfied,
  };
}

function v3Currentness(value: CampaignSourceCurrentness): SemanticReplayClassificationInput["sourceCurrentness"] {
  return value === "UNAVAILABLE" || value === "MISSING" ? "MISSING" : value;
}

function classify(input: ReplayFidelityV4Input, base: SemanticReplayFidelityReceipt["outcomeClass"]): { readonly outcome: ReplayFidelityV4Outcome; readonly reasons: readonly string[] } {
  if (input.occurrenceBinding !== "BOUND" || !input.orderingPreserved) return { outcome: "INVALID_REPLAY_PLAN", reasons: [input.occurrenceBinding === "BOUND" ? "ORDERING_NOT_PRESERVED" : "OCCURRENCE_BINDING_INVALID"] };
  if (input.sourceCurrentness === "STALE") return { outcome: "SOURCE_STALE", reasons: ["SOURCE_CURRENTNESS_STALE"] };
  if (input.noLongerApplicable) return { outcome: "NO_LONGER_APPLICABLE", reasons: ["PRECONDITION_NO_LONGER_APPLICABLE"] };
  if (input.environmentDiverged) return { outcome: "ENVIRONMENT_DIVERGENCE", reasons: ["ENVIRONMENT_INPUT_DIGEST_CHANGED"] };
  if (!input.preconditionSatisfied) return { outcome: "PRECONDITION_DIVERGENCE", reasons: ["DEPENDENCY_PRECONDITION_CHANGED"] };
  if (input.executorNondeterministic || new Set(input.repeatedOutcomeClasses).size > 1) return { outcome: "NONDETERMINISTIC", reasons: ["REPEATED_OUTCOMES_DISAGREE"] };
  if (input.timingSensitive) return { outcome: "TIMING_SENSITIVE", reasons: ["TIMING_CLASS_UNSTABLE"] };
  if (input.executorFailed || base === "INFRA_FAILURE") return { outcome: "EXECUTOR_FAILURE", reasons: ["EXECUTOR_FAILURE"] };
  if (base === "INVALID_REPLAY") return { outcome: "INVALID_REPLAY_PLAN", reasons: ["V3_REPLAY_PLAN_INVALID"] };
  if (base === "SOURCE_STALE") return { outcome: "SOURCE_STALE", reasons: ["SOURCE_CURRENTNESS_STALE"] };
  if (base === "REPRODUCED_EXACT" && (input.expectedObservationDigest === null || input.observedObservationDigest === null || input.expectedObservationDigest === input.observedObservationDigest)) return { outcome: "REPRODUCED_EXACT", reasons: ["EXACT_IDENTITY_AND_OBSERVATION_MATCH"] };
  if (base === "REPRODUCED_EQUIVALENT_SEMANTIC") return { outcome: "REPRODUCED_SEMANTIC_EQUIVALENT", reasons: ["CONTRACT_IDENTITY_MATCH"] };
  if (base === "SEMANTIC_DIVERGENCE") return { outcome: "SEMANTIC_DIVERGENCE", reasons: ["SEMANTIC_IDENTITY_DIVERGED"] };
  return { outcome: "GENUINELY_NOT_REPRODUCED", reasons: ["FAILURE_NOT_OBSERVED"] };
}

/** Classify a replay using V3 semantic identity plus V4 divergence evidence. */
export function createReplayFidelityV4(input: ReplayFidelityV4Input): ReplayFidelityV4 {
  validateInput(input);
  const v3 = baseInput(input);
  const baseOutcome = classifySemanticReplay(v3);
  const baseV3Receipt = createSemanticReplayFidelityReceipt({
    expectedSemanticFindingFingerprint: input.expectedSemanticFindingFingerprint,
    expectedContractIdentity: input.expectedContractIdentity,
    ...(input.observedSemanticFindingFingerprint === undefined ? {} : { observedSemanticFindingFingerprint: input.observedSemanticFindingFingerprint }),
    ...(input.observedContractIdentity === undefined ? {} : { observedContractIdentity: input.observedContractIdentity }),
    outcomeClass: baseOutcome,
    occurrenceBinding: input.occurrenceBinding,
    originalOccurrenceCount: input.originalOccurrenceCount,
    retainedOccurrenceCount: input.retainedOccurrenceCount,
    sourceCurrentness: v3.sourceCurrentness,
    safetyClean: input.safetyClean,
    deterministic: !input.executorNondeterministic && input.repeatedOutcomeClasses.length < 2,
    ...(input.executorFailed ? { rejectionReason: "EXECUTOR_THROW" as const } : {}),
  });
  const classification = classify(input, baseV3Receipt.outcomeClass);
  const observationEqual = input.expectedObservationDigest === null || input.observedObservationDigest === null ? null : input.expectedObservationDigest === input.observedObservationDigest;
  const core = {
    schemaVersion: CAMPAIGN_REPLAY_V4_VERSION,
    outcome: classification.outcome,
    baseV3Receipt,
    expectedObservationDigest: input.expectedObservationDigest,
    observedObservationDigest: input.observedObservationDigest,
    observationEqual,
    originalOccurrenceDigest: input.originalOccurrenceDigest,
    retainedOccurrenceDigest: input.retainedOccurrenceDigest,
    originalOccurrenceCount: input.originalOccurrenceCount,
    retainedOccurrenceCount: input.retainedOccurrenceCount,
    orderingPreserved: input.orderingPreserved,
    dependencyStateDigest: input.dependencyStateDigest,
    environmentInputDigest: input.environmentInputDigest,
    semanticStateDigest: input.semanticStateDigest,
    preconditionSatisfied: input.preconditionSatisfied,
    sourceCurrentness: input.sourceCurrentness,
    deterministic: !input.executorNondeterministic && input.repeatedOutcomeClasses.length < 2,
    repeatedOutcomeClasses: [...new Set(input.repeatedOutcomeClasses)].sort(),
    divergenceReasons: classification.reasons,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "replay4") };
}
