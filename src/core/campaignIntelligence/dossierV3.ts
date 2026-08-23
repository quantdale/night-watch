// Phase 19 — compact owner-ready dossier. This is a deterministic summary of
// safe identities and categorical evidence, never a raw observation archive.

import type { CampaignCoverageRow, CampaignReasonCode } from "./types";
import type { ConfidenceV2Result } from "./confidenceV2";
import type { FindingClusterIdentity } from "./clusterV2";
import type { MinimizationV2Result } from "./minimizationV2";
import type { ReplayFidelityV4 } from "./replayV4";
import { CAMPAIGN_DOSSIER_V3_VERSION, safeCampaignDigest } from "./types";

export interface OwnerDossierV3Input {
  readonly behaviorFailure: string;
  readonly product: string;
  readonly surface: string;
  readonly semanticContractId: string | null;
  readonly invariantId: string | null;
  readonly whyTested: readonly CampaignReasonCode[];
  readonly sourceImpactDigest: string | null;
  readonly sourceImpactReasons: readonly CampaignReasonCode[];
  readonly oracleFamilies: readonly string[];
  readonly semanticFindingFingerprint: string | null;
  readonly firstObservationDigest: string;
  readonly firstObservationClass: string;
  readonly replay: ReplayFidelityV4;
  readonly minimization: MinimizationV2Result;
  readonly confidence: ConfidenceV2Result;
  readonly cluster: FindingClusterIdentity | null;
  readonly coverage: CampaignCoverageRow | null;
  readonly limitations: readonly CampaignReasonCode[];
  readonly nextHumanVerificationAction: string;
}

export interface OwnerDossierV3 {
  readonly schemaVersion: typeof CAMPAIGN_DOSSIER_V3_VERSION;
  readonly dossierId: string;
  readonly status: "ACTIONABLE" | "UNRESOLVED";
  readonly behavior: {
    readonly failureClass: string;
    readonly product: string;
    readonly surface: string;
    readonly semanticContractId: string | null;
    readonly invariantId: string | null;
  };
  readonly whyTested: readonly CampaignReasonCode[];
  readonly sourceImpact: {
    readonly digest: string | null;
    readonly reasons: readonly CampaignReasonCode[];
  };
  readonly oracleEvidence: {
    readonly families: readonly string[];
    readonly semanticFindingFingerprint: string | null;
    readonly firstObservationDigest: string;
    readonly firstObservationClass: string;
  };
  readonly replay: {
    readonly outcome: ReplayFidelityV4["outcome"];
    readonly deterministic: boolean;
    readonly observationEqual: boolean | null;
    readonly occurrenceBinding: ReplayFidelityV4["baseV3Receipt"]["occurrenceBinding"];
    readonly divergenceReasons: readonly string[];
  };
  readonly minimization: {
    readonly proof: MinimizationV2Result["proof"];
    readonly minimalActionIds: readonly string[];
    readonly removedOrdinals: readonly number[];
    readonly probesAttempted: number;
  };
  readonly confidence: {
    readonly level: ConfidenceV2Result["level"];
    readonly score: number;
    readonly reasons: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly degradationReasons: readonly string[];
  };
  readonly relatedCluster: {
    readonly clusterId: string;
    readonly duplicateSafe: true;
  } | null;
  readonly coverageImplications: {
    readonly fullyCovered: boolean | null;
    readonly gapReasons: readonly CampaignReasonCode[];
    readonly replayGap: boolean | null;
    readonly minimizationGap: boolean | null;
  };
  readonly limitations: readonly CampaignReasonCode[];
  readonly nextHumanVerificationAction: string;
  readonly deterministicDigest: string;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_ACTION_RE = /^[A-Z][A-Z0-9_:-]{1,120}$/;
const SAFE_FP_RE = /^fp:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_DOSSIER_V3_INVALID:${reason}`);
}

function safeId(value: string | null, field: string): void {
  if (value !== null && !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (value !== null && /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safeValues(values: readonly string[], field: string): readonly string[] {
  if (!Array.isArray(values) || values.length > 128) invalid(`${field}_ARRAY`);
  for (const value of values) if (!SAFE_ID_RE.test(value) && !SAFE_ACTION_RE.test(value)) invalid(`${field}_VALUE`);
  return [...new Set(values)].sort();
}

function safeCodes(values: readonly CampaignReasonCode[], field: string): readonly CampaignReasonCode[] {
  if (!Array.isArray(values) || values.length > 128) invalid(`${field}_ARRAY`);
  for (const value of values) {
    if (!SAFE_ACTION_RE.test(value)) invalid(`${field}_VALUE`);
  }
  return [...new Set(values)].sort();
}

/** Construct a stable dossier from already validated Phase 19 evidence. */
export function createOwnerDossierV3(input: OwnerDossierV3Input): OwnerDossierV3 {
  safeId(input.product, "PRODUCT");
  safeId(input.surface, "SURFACE");
  safeId(input.semanticContractId, "CONTRACT");
  safeId(input.invariantId, "INVARIANT");
  safeId(input.behaviorFailure, "FAILURE");
  if (input.sourceImpactDigest !== null && !SAFE_ID_RE.test(input.sourceImpactDigest)) invalid("SOURCE_IMPACT_DIGEST");
  if (!SAFE_FP_RE.test(input.firstObservationDigest)) invalid("OBSERVATION_DIGEST");
  if (!SAFE_ID_RE.test(input.firstObservationClass)) invalid("OBSERVATION_CLASS");
  if (input.semanticFindingFingerprint !== null && !SAFE_FP_RE.test(input.semanticFindingFingerprint)) invalid("FINDING_FINGERPRINT");
  const families = safeValues(input.oracleFamilies, "ORACLE_FAMILIES");
  const whyTested = safeCodes(input.whyTested, "WHY_TESTED");
  const sourceImpactReasons = safeCodes(input.sourceImpactReasons, "SOURCE_IMPACT_REASONS");
  const limitations = safeCodes(input.limitations, "LIMITATIONS");
  const minimalActionIds = safeValues(input.minimization.minimalActionIds, "MINIMAL_ACTIONS");
  if (!SAFE_ACTION_RE.test(input.nextHumanVerificationAction)) invalid("NEXT_ACTION");
  const coreWithoutDigest = {
    schemaVersion: CAMPAIGN_DOSSIER_V3_VERSION,
    dossierId: safeCampaignDigest({ behaviorFailure: input.behaviorFailure, product: input.product, surface: input.surface, semanticContractId: input.semanticContractId, invariantId: input.invariantId, finding: input.semanticFindingFingerprint }, "dossier"),
    status: input.confidence.level === "HIGH" || input.confidence.level === "MEDIUM" ? "ACTIONABLE" as const : "UNRESOLVED" as const,
    behavior: { failureClass: input.behaviorFailure, product: input.product, surface: input.surface, semanticContractId: input.semanticContractId, invariantId: input.invariantId },
    whyTested,
    sourceImpact: { digest: input.sourceImpactDigest, reasons: sourceImpactReasons },
    oracleEvidence: { families, semanticFindingFingerprint: input.semanticFindingFingerprint, firstObservationDigest: input.firstObservationDigest, firstObservationClass: input.firstObservationClass },
    replay: { outcome: input.replay.outcome, deterministic: input.replay.deterministic, observationEqual: input.replay.observationEqual, occurrenceBinding: input.replay.baseV3Receipt.occurrenceBinding, divergenceReasons: [...input.replay.divergenceReasons].sort() },
    minimization: { proof: input.minimization.proof, minimalActionIds, removedOrdinals: [...input.minimization.removedOrdinals].sort((left, right) => left - right), probesAttempted: input.minimization.probesAttempted },
    confidence: { level: input.confidence.level, score: input.confidence.score, reasons: [...input.confidence.reasons].sort(), blockingReasons: [...input.confidence.blockingReasons].sort(), degradationReasons: [...input.confidence.degradationReasons].sort() },
    relatedCluster: input.cluster === null ? null : { clusterId: input.cluster.clusterId, duplicateSafe: true as const },
    coverageImplications: { fullyCovered: input.coverage?.fullyCovered ?? null, gapReasons: input.coverage?.gapReasons ?? [], replayGap: input.coverage === null ? null : input.coverage.gapReasons.includes("NO_DETERMINISTIC_REPLAY"), minimizationGap: input.coverage === null ? null : input.coverage.gapReasons.includes("MINIMIZATION_SUPPORTED") },
    limitations,
    nextHumanVerificationAction: input.nextHumanVerificationAction,
  };
  return { ...coreWithoutDigest, deterministicDigest: safeCampaignDigest(coreWithoutDigest, "dossier") };
}
