// Phase 19 — explainable confidence V2. Missing evidence is a ceiling, never
// a positive signal.

import type { MinimalityProofKind } from "./minimizationV2";
import type { StabilityClass } from "./stability";
import { CAMPAIGN_CONFIDENCE_V2_VERSION, safeCampaignDigest } from "./types";

export type ConfidenceV2Level = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";

export interface ConfidenceV2Input {
  readonly firstRunEvidence: boolean;
  readonly exactReplay: boolean;
  readonly semanticEquivalentReplay: boolean;
  readonly repeatStability: StabilityClass | null;
  readonly minimizationProof: MinimalityProofKind | null;
  readonly sourceCurrentness: "CURRENT" | "STALE" | "UNAVAILABLE" | "AMBIGUOUS" | "MISSING" | "SYNTHETIC_ONLY";
  readonly oracleAuthoritative: boolean;
  readonly benignControlPassed: boolean;
  readonly evidenceComplete: boolean;
  readonly preconditionStable: boolean;
}

export interface ConfidenceV2Result {
  readonly schemaVersion: typeof CAMPAIGN_CONFIDENCE_V2_VERSION;
  readonly level: ConfidenceV2Level;
  readonly score: number;
  readonly componentScores: Readonly<Record<string, number>>;
  readonly reasons: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly degradationReasons: readonly string[];
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_CONFIDENCE_V2_INVALID:${reason}`);
}

function booleanFields(input: ConfidenceV2Input): void {
  for (const key of ["firstRunEvidence", "exactReplay", "semanticEquivalentReplay", "oracleAuthoritative", "benignControlPassed", "evidenceComplete", "preconditionStable"] as const) {
    if (typeof input[key] !== "boolean") invalid(`${key}_BOOLEAN`);
  }
}

/** Calculate a bounded confidence level and retain every ceiling reason. */
export function calculateConfidenceV2(input: ConfidenceV2Input): ConfidenceV2Result {
  booleanFields(input);
  const reasons: string[] = [];
  const blocking: string[] = [];
  const degradation: string[] = [];
  const componentScores: Record<string, number> = {
    FIRST_RUN_EVIDENCE: input.firstRunEvidence ? 15 : 0,
    EXACT_REPLAY: input.exactReplay ? 25 : 0,
    SEMANTIC_EQUIVALENT_REPLAY: !input.exactReplay && input.semanticEquivalentReplay ? 15 : 0,
    REPEAT_STABILITY: input.repeatStability === "DETERMINISTIC" ? 15 : input.repeatStability === null ? 0 : 5,
    MINIMIZATION: input.minimizationProof === "SEMANTIC_FIXED_POINT" ? 15 : input.minimizationProof === "CHUNK_AND_STEP_FIXED_POINT" ? 12 : input.minimizationProof === "ONE_STEP_LOCAL_MINIMUM" ? 8 : 0,
    SOURCE_CURRENTNESS: input.sourceCurrentness === "CURRENT" || input.sourceCurrentness === "SYNTHETIC_ONLY" ? 10 : 0,
    ORACLE_AUTHORITY: input.oracleAuthoritative ? 5 : 0,
    BENIGN_CONTROL: input.benignControlPassed ? 5 : 0,
    EVIDENCE_COMPLETENESS: input.evidenceComplete ? 5 : 0,
    PRECONDITION_STABILITY: input.preconditionStable ? 5 : 0,
  };
  const score = Math.min(100, Object.values(componentScores).reduce((sum, value) => sum + value, 0));
  if (input.firstRunEvidence) reasons.push("FIRST_RUN_EVIDENCE_PRESENT"); else blocking.push("FIRST_RUN_EVIDENCE_MISSING");
  if (input.exactReplay) reasons.push("EXACT_REPLAY_REPRODUCED"); else if (input.semanticEquivalentReplay) degradation.push("ONLY_SEMANTIC_EQUIVALENT_REPLAY"); else blocking.push("REPLAY_NOT_REPRODUCED");
  if (input.repeatStability === "DETERMINISTIC") reasons.push("REPEAT_STABLE");
  else if (input.repeatStability === null) blocking.push("REPEAT_STABILITY_MISSING");
  else degradation.push(`REPEAT_${input.repeatStability}`);
  if (input.minimizationProof === null || input.minimizationProof === "NOT_PROVEN_MINIMAL") degradation.push("MINIMALITY_NOT_PROVEN");
  else reasons.push(`MINIMALITY_${input.minimizationProof}`);
  if (input.sourceCurrentness !== "CURRENT" && input.sourceCurrentness !== "SYNTHETIC_ONLY") blocking.push(`SOURCE_${input.sourceCurrentness}`);
  else reasons.push("SOURCE_CURRENT");
  if (input.oracleAuthoritative) reasons.push("ORACLE_AUTHORITATIVE"); else blocking.push("ORACLE_AUTHORITY_MISSING");
  if (input.benignControlPassed) reasons.push("BENIGN_CONTROL_PASSED"); else blocking.push("BENIGN_CONTROL_NOT_PROVEN");
  if (input.evidenceComplete) reasons.push("EVIDENCE_COMPLETE"); else blocking.push("EVIDENCE_INCOMPLETE");
  if (input.preconditionStable) reasons.push("PRECONDITIONS_STABLE"); else degradation.push("PRECONDITIONS_UNSTABLE");
  const highReady = blocking.length === 0 && input.exactReplay && input.repeatStability === "DETERMINISTIC" && input.minimizationProof !== null && input.minimizationProof !== "NOT_PROVEN_MINIMAL";
  const level: ConfidenceV2Level = highReady ? "HIGH" : blocking.some((reason) => reason.startsWith("SOURCE_") || reason === "ORACLE_AUTHORITY_MISSING" || reason === "BENIGN_CONTROL_NOT_PROVEN") ? "UNRESOLVED" : input.firstRunEvidence && (input.exactReplay || input.semanticEquivalentReplay) ? "MEDIUM" : "LOW";
  const core = {
    schemaVersion: CAMPAIGN_CONFIDENCE_V2_VERSION,
    level,
    score,
    componentScores,
    reasons: [...new Set(reasons)].sort(),
    blockingReasons: [...new Set(blocking)].sort(),
    degradationReasons: [...new Set(degradation)].sort(),
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "confidence") };
}
