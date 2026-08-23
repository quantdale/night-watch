// Phase 20 — compact semantic derivation evidence layered over the Phase 19
// owner dossier. This is metadata-only and never stores raw source or
// observations.

import type { CampaignCoverageRow } from "./types";
import type { OwnerDossierV3 } from "./dossierV3";
import type { SyntheticMutationClass } from "../semanticCoverage/mutation";
import { safeCampaignDigest } from "./types";

export const CAMPAIGN_DOSSIER_V4_VERSION =
  "nightwatch.owner-dossier.v4" as const;

export interface DossierDerivationLink {
  readonly stage:
    | "SOURCE_ARTIFACT"
    | "SOURCE_EVIDENCE"
    | "CONTRACT_CANDIDATE"
    | "EXPECTATION"
    | "PROJECTION"
    | "SCENARIO"
    | "ORACLE"
    | "REPLAY_ADAPTER"
    | "MINIMIZER";
  readonly identity: string;
}
export type DossierStabilityClassification =
  | "STABLE"
  | "FLAKY"
  | "REPLAY_DIVERGED"
  | "SOURCE_STALE"
  | "UNRESOLVED";

export interface OwnerDossierV4Input {
  readonly base: OwnerDossierV3;
  readonly derivationChain: readonly DossierDerivationLink[];
  readonly relationalRule: string | null;
  readonly differentialOutcome: string | null;
  readonly metamorphicOutcome: string | null;
  readonly violatedSemanticRelation: string | null;
  readonly coverageBeforeFinding: CampaignCoverageRow | null;
  readonly stabilityClassification: DossierStabilityClassification;
  readonly syntheticMutantClass: SyntheticMutationClass | null;
}

export interface OwnerDossierV4 {
  readonly schemaVersion: typeof CAMPAIGN_DOSSIER_V4_VERSION;
  readonly dossierId: string;
  readonly baseDossierId: string;
  readonly behavior: OwnerDossierV3["behavior"];
  readonly contractDerivationChain: readonly DossierDerivationLink[];
  readonly semanticRule: {
    readonly relationalRule: string | null;
    readonly differentialOutcome: string | null;
    readonly metamorphicOutcome: string | null;
    readonly violatedSemanticRelation: string | null;
  };
  readonly coverageBeforeFinding: {
    readonly fullyCovered: boolean | null;
    readonly gapReasons: OwnerDossierV3["coverageImplications"]["gapReasons"];
    readonly replayGap: boolean | null;
    readonly minimizationGap: boolean | null;
  };
  readonly replay: OwnerDossierV3["replay"];
  readonly minimalityProof: OwnerDossierV3["minimization"];
  readonly stabilityClassification: DossierStabilityClassification;
  readonly clusterRelationship: OwnerDossierV3["relatedCluster"];
  readonly syntheticMutantClass: SyntheticMutationClass | null;
  readonly limitations: OwnerDossierV3["limitations"];
  readonly deterministicDigest: string;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_CATEGORY_RE = /^[A-Z][A-Z0-9_.:/-]{0,119}$/;
const SAFE_EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SAFE_MUTANT_CLASSES: ReadonlySet<SyntheticMutationClass> = new Set([
  "BASELINE_VALID",
  "MISSING_REQUIRED_FIELD",
  "WRONG_TYPE",
  "WRONG_ENUM",
  "MISSING_ENUM_MEMBER",
  "UNEXPECTED_SET_MEMBER",
  "EXACT_SET_MISMATCH",
  "SUBSET_VIOLATION",
  "SUPERSET_VIOLATION",
  "LOWER_BOUND_VIOLATION",
  "UPPER_BOUND_VIOLATION",
  "RELATIONSHIP_VIOLATION",
  "ORDERING_VIOLATION",
  "AGGREGATE_MISMATCH",
  "DIFFERENTIAL_MISMATCH",
  "METAMORPHIC_VIOLATION",
  "BENIGN_ALTERNATIVE",
]);

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_DOSSIER_V4_INVALID:${reason}`);
}

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safeCategory(value: string | null, field: string): void {
  if (value !== null && !SAFE_CATEGORY_RE.test(value)) invalid(`${field}_CATEGORY`);
}

function safeEvidence(value: string, field: string): void {
  if (!SAFE_EVIDENCE_RE.test(value)) invalid(`${field}_EVIDENCE`);
}

function safeChain(chain: readonly DossierDerivationLink[]): readonly DossierDerivationLink[] {
  if (!Array.isArray(chain) || chain.length === 0 || chain.length > 16) invalid("CHAIN_LENGTH");
  const seen = new Set<string>();
  const ordered = [...chain];
  for (const link of ordered) {
    if (!SAFE_CATEGORY_RE.test(link.stage)) invalid("CHAIN_STAGE");
    safeId(link.identity, "CHAIN_IDENTITY");
    const key = `${link.stage}|${link.identity}`;
    if (seen.has(key)) invalid("CHAIN_DUPLICATE");
    seen.add(key);
    if (link.stage === "SOURCE_EVIDENCE") safeEvidence(link.identity, "CHAIN");
  }
  return ordered;
}

function coverageFrom(row: CampaignCoverageRow | null): OwnerDossierV4["coverageBeforeFinding"] {
  return {
    fullyCovered: row?.fullyCovered ?? null,
    gapReasons: row?.gapReasons ?? [],
    replayGap: row === null ? null : row.gapReasons.includes("NO_DETERMINISTIC_REPLAY") || row.gapReasons.includes("REPLAY_GAP"),
    minimizationGap: row === null ? null : row.gapReasons.includes("MINIMIZATION_SUPPORTED") || row.gapReasons.includes("MINIMIZATION_GAP"),
  };
}

/** Add the Phase 20 derivation and relation chain to an existing safe dossier. */
export function createOwnerDossierV4(input: OwnerDossierV4Input): OwnerDossierV4 {
  if (input.base.schemaVersion !== "nightwatch.owner-dossier.v3") invalid("BASE_VERSION");
  safeId(input.base.dossierId, "BASE_DOSSIER");
  const chain = safeChain(input.derivationChain);
  safeCategory(input.relationalRule, "RELATIONAL_RULE");
  safeCategory(input.differentialOutcome, "DIFFERENTIAL_OUTCOME");
  safeCategory(input.metamorphicOutcome, "METAMORPHIC_OUTCOME");
  safeCategory(input.violatedSemanticRelation, "VIOLATED_RELATION");
  if (!SAFE_MUTANT_CLASSES.has(input.syntheticMutantClass as SyntheticMutationClass)) {
    if (input.syntheticMutantClass !== null) invalid("MUTANT_CLASS");
  }
  const core = {
    schemaVersion: CAMPAIGN_DOSSIER_V4_VERSION,
    dossierId: safeCampaignDigest({ base: input.base.dossierId, chain, semanticRule: { relationalRule: input.relationalRule, differentialOutcome: input.differentialOutcome, metamorphicOutcome: input.metamorphicOutcome, violatedSemanticRelation: input.violatedSemanticRelation }, mutant: input.syntheticMutantClass }, "dossier-v4"),
    baseDossierId: input.base.dossierId,
    behavior: input.base.behavior,
    contractDerivationChain: chain,
    semanticRule: {
      relationalRule: input.relationalRule,
      differentialOutcome: input.differentialOutcome,
      metamorphicOutcome: input.metamorphicOutcome,
      violatedSemanticRelation: input.violatedSemanticRelation,
    },
    coverageBeforeFinding: coverageFrom(input.coverageBeforeFinding),
    replay: input.base.replay,
    minimalityProof: input.base.minimization,
    stabilityClassification: input.stabilityClassification,
    clusterRelationship: input.base.relatedCluster,
    syntheticMutantClass: input.syntheticMutantClass,
    limitations: input.base.limitations,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "dossier-v4") };
}
