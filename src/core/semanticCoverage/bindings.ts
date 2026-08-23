// Phase 21 — deterministic scenario-binding suggestions. These records bind
// existing local synthetic infrastructure; they are never execution authority
// for a real product.

import { sourceEvidenceDigest, type ContractCandidate, type ContractDiscoveryInventory, type ContractCurrentness } from "./types";

export const SCENARIO_BINDING_VERSION = "nightwatch.semantic-scenario-binding.v1" as const;

export type ScenarioBindingDisposition = "ADMITTED_SYNTHETIC" | "SUGGESTION_ONLY" | "BLOCKED_SOURCE";

export interface ScenarioBindingSuggestion {
  readonly schemaVersion: typeof SCENARIO_BINDING_VERSION;
  readonly suggestionId: string;
  readonly candidateId: string;
  readonly sourceEvidenceDigest: string;
  readonly productAdapterId: "synthetic-phase21-product";
  readonly surfaceId: "synthetic";
  readonly projectionId: string;
  readonly expectationId: string;
  readonly scenarioId: string;
  readonly currentness: ContractCurrentness;
  readonly disposition: ScenarioBindingDisposition;
  readonly reasonCode: "EXISTING_SYNTHETIC_ADAPTER" | "SOURCE_STALE" | "SOURCE_PROOF_MISSING";
  readonly sourceAuthority: "SYNTHETIC_ONLY";
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_SCENARIO_BINDING_INVALID:${reason}`);
}

function safeId(value: string, field: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,220}$/.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${field}_PRIVACY`);
}

function suffix(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:/-]/g, "_");
}

function suggestionFor(candidate: ContractCandidate): ScenarioBindingSuggestion {
  const safeSuffix = suffix(candidate.candidateId);
  const admitted = candidate.currentness === "CURRENT" && candidate.coverage.semanticContractAdmitted && candidate.shape !== null && candidate.proofStatus !== "REJECTED";
  const disposition: ScenarioBindingDisposition = admitted ? "ADMITTED_SYNTHETIC" : candidate.currentness !== "CURRENT" ? "SUGGESTION_ONLY" : "BLOCKED_SOURCE";
  const reasonCode: ScenarioBindingSuggestion["reasonCode"] = admitted ? "EXISTING_SYNTHETIC_ADAPTER" : candidate.currentness !== "CURRENT" ? "SOURCE_STALE" : "SOURCE_PROOF_MISSING";
  const core = {
    schemaVersion: SCENARIO_BINDING_VERSION,
    suggestionId: sourceEvidenceDigest({ candidateId: candidate.candidateId, adapter: "synthetic-phase21-product", surface: "synthetic" }),
    candidateId: candidate.candidateId,
    sourceEvidenceDigest: candidate.source.evidenceDigest,
    productAdapterId: "synthetic-phase21-product" as const,
    surfaceId: "synthetic" as const,
    projectionId: `projection.${safeSuffix}`,
    expectationId: `expectation.${safeSuffix}`,
    scenarioId: `scenario.phase21.${safeSuffix}`,
    currentness: candidate.currentness,
    disposition,
    reasonCode,
    sourceAuthority: "SYNTHETIC_ONLY" as const,
  };
  safeId(core.suggestionId, "SUGGESTION");
  safeId(core.candidateId, "CANDIDATE");
  safeId(core.projectionId, "PROJECTION");
  safeId(core.expectationId, "EXPECTATION");
  safeId(core.scenarioId, "SCENARIO");
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

/** Suggest one deterministic existing-adapter binding per source candidate. */
export function buildScenarioBindingSuggestions(inventory: ContractDiscoveryInventory): readonly ScenarioBindingSuggestion[] {
  if (inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  return Object.freeze([...inventory.candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId)).map(suggestionFor));
}

export function admittedSyntheticScenarioBindings(inventory: ContractDiscoveryInventory): readonly ScenarioBindingSuggestion[] {
  return buildScenarioBindingSuggestions(inventory).filter((suggestion) => suggestion.disposition === "ADMITTED_SYNTHETIC");
}
