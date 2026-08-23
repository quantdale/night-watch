// Phase 19 — bounded nondeterminism detection. Repetition is evidence
// classification, not a retry-until-green mechanism.

import { CAMPAIGN_STABILITY_VERSION, safeCampaignDigest } from "./types";

export type StabilityClass =
  | "DETERMINISTIC"
  | "ENVIRONMENT_SENSITIVE"
  | "ORDERING_SENSITIVE"
  | "TIMING_SENSITIVE"
  | "SOURCE_CURRENTNESS_SENSITIVE"
  | "GENUINELY_NONDETERMINISTIC";

export interface StabilityObservation {
  readonly resultIdentity: string;
  readonly normalizedEvidenceDigest: string;
  readonly semanticReceiptDigest: string | null;
  readonly replayOutcome: string;
  readonly findingFingerprint: string | null;
  readonly clusterIdentity: string | null;
  readonly environmentInputDigest: string;
  readonly orderingDigest: string;
  readonly timingClass: "NONE" | "BOUNDED" | "TRANSIENT";
  readonly sourceCurrentness: string;
}

export interface StabilityReport {
  readonly schemaVersion: typeof CAMPAIGN_STABILITY_VERSION;
  readonly repeatCount: number;
  readonly class: StabilityClass;
  readonly stable: boolean;
  readonly confidenceCeiling: "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";
  readonly divergentFields: readonly string[];
  readonly observationIdentities: readonly string[];
  readonly deterministicDigest: string;
}

const SAFE_DIGEST_RE = /^(?:[A-Za-z0-9_-]+):[A-Za-z0-9:_-]{8,}$/;

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_STABILITY_INVALID:${reason}`);
}

function validateObservation(observation: StabilityObservation): void {
  const digestFields = new Set(["resultIdentity", "normalizedEvidenceDigest", "semanticReceiptDigest", "findingFingerprint", "clusterIdentity", "environmentInputDigest", "orderingDigest"]);
  for (const [field, value] of Object.entries(observation)) {
    if (field === "timingClass" || field === "sourceCurrentness" || field === "replayOutcome") continue;
    if (digestFields.has(field) && value !== null && (typeof value !== "string" || !SAFE_DIGEST_RE.test(value))) invalid(`${field}_DIGEST`);
  }
  if (typeof observation.replayOutcome !== "string" || !/^[A-Z_]{1,80}$/.test(observation.replayOutcome)) invalid("REPLAY_OUTCOME");
  if (!["NONE", "BOUNDED", "TRANSIENT"].includes(observation.timingClass)) invalid("TIMING_CLASS");
  if (typeof observation.sourceCurrentness !== "string" || !/^[A-Z_]{1,64}$/.test(observation.sourceCurrentness)) invalid("SOURCE_CURRENTNESS");
}

/** Run a bounded repeat callback and classify instability before confidence. */
export function detectNondeterminism(input: {
  readonly repeats: number;
  readonly execute: (ordinal: number) => StabilityObservation;
}): StabilityReport {
  if (!Number.isInteger(input.repeats) || input.repeats < 2 || input.repeats > 8) invalid("REPEAT_COUNT");
  const observations: StabilityObservation[] = [];
  for (let ordinal = 0; ordinal < input.repeats; ordinal += 1) {
    let observation: StabilityObservation;
    try { observation = input.execute(ordinal); } catch { invalid("EXECUTOR_FAILURE"); }
    validateObservation(observation!);
    observations.push(observation!);
  }
  const reference = observations[0]!;
  const fields = [
    "resultIdentity",
    "normalizedEvidenceDigest",
    "semanticReceiptDigest",
    "replayOutcome",
    "findingFingerprint",
    "clusterIdentity",
    "environmentInputDigest",
    "orderingDigest",
    "timingClass",
    "sourceCurrentness",
  ] as const;
  const divergentFields = fields.filter((field) => observations.some((observation) => observation[field] !== reference[field]));
  let classification: StabilityClass = "DETERMINISTIC";
  if (divergentFields.includes("environmentInputDigest")) classification = "ENVIRONMENT_SENSITIVE";
  else if (divergentFields.includes("orderingDigest")) classification = "ORDERING_SENSITIVE";
  else if (divergentFields.includes("timingClass")) classification = "TIMING_SENSITIVE";
  else if (divergentFields.includes("sourceCurrentness")) classification = "SOURCE_CURRENTNESS_SENSITIVE";
  else if (divergentFields.length > 0) classification = "GENUINELY_NONDETERMINISTIC";
  const confidenceCeiling: StabilityReport["confidenceCeiling"] = classification === "DETERMINISTIC" ? "HIGH" : classification === "GENUINELY_NONDETERMINISTIC" ? "UNRESOLVED" : "LOW";
  const core = {
    schemaVersion: CAMPAIGN_STABILITY_VERSION,
    repeatCount: observations.length,
    class: classification,
    stable: classification === "DETERMINISTIC",
    confidenceCeiling,
    divergentFields,
    observationIdentities: observations.map((observation) => observation.resultIdentity),
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "stable") };
}
