// Phase 21 — compact owner dossier evidence for semantic gap closure.
// Only categorical results and provenance identities cross this boundary.

import type { OwnerDossierV4 } from "./dossierV4";
import type { SyntheticMutationClass } from "../semanticCoverage/mutation";
import type { CoverageQualityLevel } from "../semanticCoverage/quality";
import type { SemanticReplayEquivalence } from "../semanticCoverage/lifecycle";
import { safeCampaignDigest } from "./types";

export const CAMPAIGN_DOSSIER_V5_VERSION = "nightwatch.owner-dossier.v5" as const;

export interface OwnerDossierV5Input {
  readonly base: OwnerDossierV4;
  readonly membershipResult: string | null;
  readonly membershipEvidenceDigest: string | null;
  readonly differentialPair: {
    readonly equivalenceId: string;
    readonly leftSurfaceId: string;
    readonly rightSurfaceId: string;
    readonly alignmentRuleKind: string;
  } | null;
  readonly replayEquivalence: SemanticReplayEquivalence | null;
  readonly minimizationDependencyProof: {
    readonly edgeCount: number;
    readonly proof: string;
    readonly dependencyDigest: string;
  } | null;
  readonly coverageQuality: CoverageQualityLevel;
  readonly closedGap: {
    readonly gapIdentity: string;
    readonly gapClass: string;
    readonly closureStatus: string;
  } | null;
  readonly sourceContract: {
    readonly candidateId: string;
    readonly sourceEvidenceDigest: string;
    readonly shapeKind: string;
  };
  readonly syntheticMutationClass: SyntheticMutationClass | null;
  readonly limitations: readonly string[];
}

export interface OwnerDossierV5 {
  readonly schemaVersion: typeof CAMPAIGN_DOSSIER_V5_VERSION;
  readonly dossierId: string;
  readonly baseDossierId: string;
  readonly behavior: OwnerDossierV4["behavior"];
  readonly sourceContract: OwnerDossierV5Input["sourceContract"];
  readonly membership: { readonly result: string | null; readonly evidenceDigest: string | null };
  readonly differentialPair: OwnerDossierV5Input["differentialPair"];
  readonly replayEquivalence: SemanticReplayEquivalence | null;
  readonly minimizationDependencyProof: OwnerDossierV5Input["minimizationDependencyProof"];
  readonly coverageQuality: CoverageQualityLevel;
  readonly closedGap: OwnerDossierV5Input["closedGap"];
  readonly syntheticMutationClass: SyntheticMutationClass | null;
  readonly limitations: readonly string[];
  readonly deterministicDigest: string;
}

const QUALITY: ReadonlySet<string> = new Set(["DISCOVERED_ONLY", "PROJECTED", "DETECTED_SYNTHETIC", "REPLAYED", "MINIMIZED", "STABLE", "HIGH_CONFIDENCE", "DIFFERENTIAL_VERIFIED", "FULL_LIFECYCLE"]);
const REPLAY: ReadonlySet<string> = new Set(["REPRODUCED_EXACT", "REPRODUCED_SEMANTIC_EQUIVALENT", "REPRESENTATION_CHANGED_CONTRACT_PRESERVED", "PRECONDITION_DIVERGENCE", "OBSERVATION_DIVERGENCE", "SOURCE_STALE", "CONTRACT_CHANGED", "NONDETERMINISTIC", "NOT_REPRODUCED", "INVALID"]);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,220}$/;
const SAFE_DIGEST = /^(?:ev|gap|contract-graph|fp|sci|obs|dep|env|sem|occ):sha256:[0-9a-f]{24}$/;
const SAFE_CATEGORY = /^[A-Z][A-Z0-9_.:/-]{0,120}$/;

function invalid(reason: string): never { throw new Error(`CAMPAIGN_DOSSIER_V5_INVALID:${reason}`); }
function id(value: string, field: string): void { if (!SAFE_ID.test(value)) invalid(`${field}_ID`); }
function digest(value: string | null, field: string): void { if (value !== null && !SAFE_DIGEST.test(value)) invalid(`${field}_DIGEST`); }
function category(value: string, field: string): void { if (!SAFE_CATEGORY.test(value)) invalid(`${field}_CATEGORY`); }

export function createOwnerDossierV5(input: OwnerDossierV5Input): OwnerDossierV5 {
  if (input.base.schemaVersion !== "nightwatch.owner-dossier.v4") invalid("BASE_VERSION");
  id(input.base.dossierId, "BASE_DOSSIER");
  id(input.sourceContract.candidateId, "CANDIDATE");
  digest(input.sourceContract.sourceEvidenceDigest, "SOURCE_EVIDENCE");
  category(input.sourceContract.shapeKind, "SHAPE");
  if (!QUALITY.has(input.coverageQuality)) invalid("QUALITY");
  if (input.replayEquivalence !== null && !REPLAY.has(input.replayEquivalence)) invalid("REPLAY");
  digest(input.membershipEvidenceDigest, "MEMBERSHIP");
  if (input.membershipResult !== null) category(input.membershipResult, "MEMBERSHIP_RESULT");
  if (input.differentialPair !== null) {
    id(input.differentialPair.equivalenceId, "EQUIVALENCE");
    id(input.differentialPair.leftSurfaceId, "LEFT_SURFACE");
    id(input.differentialPair.rightSurfaceId, "RIGHT_SURFACE");
    category(input.differentialPair.alignmentRuleKind, "ALIGNMENT");
  }
  if (input.minimizationDependencyProof !== null) {
    if (!Number.isInteger(input.minimizationDependencyProof.edgeCount) || input.minimizationDependencyProof.edgeCount < 0 || input.minimizationDependencyProof.edgeCount > 128) invalid("DEPENDENCY_COUNT");
    category(input.minimizationDependencyProof.proof, "MINIMIZATION_PROOF");
    digest(input.minimizationDependencyProof.dependencyDigest, "DEPENDENCY");
  }
  if (input.closedGap !== null) {
    digest(input.closedGap.gapIdentity, "GAP");
    category(input.closedGap.gapClass, "GAP_CLASS");
    category(input.closedGap.closureStatus, "CLOSURE_STATUS");
  }
  if (input.syntheticMutationClass !== null) category(input.syntheticMutationClass, "MUTATION");
  if (!Array.isArray(input.limitations) || input.limitations.length > 32 || input.limitations.some((value) => !SAFE_CATEGORY.test(value))) invalid("LIMITATIONS");
  const core = {
    schemaVersion: CAMPAIGN_DOSSIER_V5_VERSION,
    dossierId: safeCampaignDigest({ base: input.base.dossierId, sourceContract: input.sourceContract, membership: { result: input.membershipResult, evidenceDigest: input.membershipEvidenceDigest }, differentialPair: input.differentialPair, replayEquivalence: input.replayEquivalence, minimizationDependencyProof: input.minimizationDependencyProof, coverageQuality: input.coverageQuality, closedGap: input.closedGap, syntheticMutationClass: input.syntheticMutationClass }, "dossier-v5"),
    baseDossierId: input.base.dossierId,
    behavior: input.base.behavior,
    sourceContract: input.sourceContract,
    membership: { result: input.membershipResult, evidenceDigest: input.membershipEvidenceDigest },
    differentialPair: input.differentialPair,
    replayEquivalence: input.replayEquivalence,
    minimizationDependencyProof: input.minimizationDependencyProof,
    coverageQuality: input.coverageQuality,
    closedGap: input.closedGap,
    syntheticMutationClass: input.syntheticMutationClass,
    limitations: [...input.limitations].sort(),
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "dossier-v5") };
}
