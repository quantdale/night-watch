// Phase 21 synthetic graph fixture. It reuses the immutable Phase 20 source
// inventory and capability metadata, then supplies the complete lifecycle
// bindings used by the terminal Phase 20 operator baseline.

import { admittedSyntheticScenarioBindings, auditMetamorphicVocabulary, buildContractGraph, createMetamorphicRelation, discoverDifferentialPairs, sourceEvidenceDigest, type ContractGraph, type DifferentialPairEvidence, type GraphDifferentialBinding, type GraphOracleBinding, type GraphReplayBinding, type GraphMinimizerBinding, type GraphScenarioBinding, type MetamorphicRelation, type SourceBoundMembershipContract, type SyntheticMembershipBinding, type SurfaceEquivalenceContract } from "../../src/core/semanticCoverage";
import { phase20CapabilityBindings, phase20DifferentialContracts, phase20Inventory, phase20MetamorphicRelations } from "../phase20/contracts";
import type { ContractCandidate, SemanticCapabilityBinding } from "../../src/core/semanticCoverage";

function safeSuffix(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:/-]/g, "_");
}

export function phase21BaselineGraph(): ContractGraph {
  const inventory = phase20Inventory();
  const admitted = inventory.candidates.filter((candidate) => candidate.coverage.semanticContractAdmitted);
  const bindings = phase20CapabilityBindings();
  const byCandidate = (candidateId: string) => bindings.filter((binding) => binding.sourceCandidateId === candidateId);
  return buildContractGraph({
    inventory,
    expectations: admitted.map((candidate) => ({ contractId: candidate.candidateId, expectationId: `expectation.${safeSuffix(candidate.candidateId)}`, supported: true })),
    projections: admitted.map((candidate) => ({ contractId: candidate.candidateId, projectionId: `projection.${safeSuffix(candidate.candidateId)}`, surfaces: candidate.observationSurfaces, supported: candidate.observationSurfaces.length > 0 })),
    scenarios: admitted.filter((candidate) => byCandidate(candidate.candidateId).length > 0).map((candidate) => ({ contractId: candidate.candidateId, scenarioId: `scenario.${safeSuffix(candidate.candidateId)}`, replaySupported: byCandidate(candidate.candidateId).some((binding) => binding.replaySupported) })),
    oracles: admitted.filter((candidate) => byCandidate(candidate.candidateId).length > 0).map((candidate) => ({ contractId: candidate.candidateId, oracleId: byCandidate(candidate.candidateId)[0]!.capabilityId, relational: byCandidate(candidate.candidateId).some((binding) => binding.capabilityKind === "RELATIONAL"), differential: byCandidate(candidate.candidateId).some((binding) => binding.capabilityKind === "DIFFERENTIAL") })),
    replays: admitted.filter((candidate) => byCandidate(candidate.candidateId).some((binding) => binding.replaySupported)).map((candidate) => ({ contractId: candidate.candidateId, replayAdapterId: `replay.${safeSuffix(candidate.candidateId)}`, reproduces: byCandidate(candidate.candidateId).some((binding) => binding.replayReproduces) })),
    minimizers: admitted.filter((candidate) => byCandidate(candidate.candidateId).some((binding) => binding.minimizationSupported)).map((candidate) => ({ contractId: candidate.candidateId, minimizerId: `minimizer.${safeSuffix(candidate.candidateId)}`, supported: true })),
    dossiers: admitted.map((candidate) => ({ contractId: candidate.candidateId, dossierId: `dossier.${safeSuffix(candidate.candidateId)}`, explainable: true })),
    differentials: admitted.flatMap((candidate) => byCandidate(candidate.candidateId).filter((binding) => binding.capabilityKind === "DIFFERENTIAL").map((binding) => ({ contractId: candidate.candidateId, pairId: binding.capabilityId, eligible: true }))),
  });
}

const PHASE21_SYNTHETIC_ENUM_VALUES = ["open", "closed"] as const;

/** Ephemeral source-bound comparators for the two synthetic finite enums. */
export function phase21MembershipContracts(): readonly SourceBoundMembershipContract[] {
  return phase20Inventory().candidates
    .filter((candidate) => candidate.shape?.kind === "FINITE_ENUM")
    .map((candidate) => {
      const shape = candidate.shape!;
      const actualValueDigest = sourceEvidenceDigest(PHASE21_SYNTHETIC_ENUM_VALUES);
      const literalTokenDigest = sourceEvidenceDigest(PHASE21_SYNTHETIC_ENUM_VALUES.map((value) => `"${value}"`));
      if (shape.kind !== "FINITE_ENUM" || shape.valueCount !== PHASE21_SYNTHETIC_ENUM_VALUES.length || (shape.valueSetDigest !== actualValueDigest && shape.valueSetDigest !== literalTokenDigest)) throw new Error("PHASE21_ENUM_SOURCE_BINDING_INVALID");
      return {
        contractId: candidate.candidateId,
        sourceProvenance: candidate.source,
        sourceValueSetDigest: shape.valueSetDigest,
        allowedValues: PHASE21_SYNTHETIC_ENUM_VALUES,
        mode: "ALL_ITEMS_ALLOWED" as const,
      };
    });
}

/** A separate synthetic set surface exercises subset/superset semantics. */
export function phase21MembershipBindings(): readonly SyntheticMembershipBinding[] {
  return phase21MembershipContracts().map((contract) => ({
    contract: { ...contract, contractId: `${contract.contractId}.set`, mode: "SET_RELATION" as const },
    path: ["members"],
  }));
}

/** Capability inventory consumed by the Phase 19 planner after Phase 21. */
export function phase21CapabilityBindings(): readonly SemanticCapabilityBinding[] {
  const inventory = phase20Inventory();
  const existing = phase20CapabilityBindings().filter((binding) => binding.capabilityKind !== "DIFFERENTIAL");
  const source = inventory.candidates.filter((candidate) => candidate.coverage.semanticContractAdmitted).map((candidate) => ({
    capabilityId: `phase21.source.${safeSuffix(candidate.candidateId)}`,
    sourceCandidateId: candidate.candidateId,
    capabilityKind: "SOURCE_CONTRACT" as const,
    scenarioBound: true,
    replaySupported: true,
    replayReproduces: true,
    minimizationSupported: true,
    dossierExplainable: true,
    observationSurfaceCount: candidate.observationSurfaces.length,
  }));
  const membership = phase21MembershipContracts().map((contract) => ({
    capabilityId: `phase21.membership.${safeSuffix(contract.contractId)}`,
    sourceCandidateId: contract.contractId,
    capabilityKind: "MEMBERSHIP" as const,
    scenarioBound: true,
    replaySupported: true,
    replayReproduces: true,
    minimizationSupported: true,
    dossierExplainable: true,
    observationSurfaceCount: 1,
  }));
  const differential = phase21DifferentialContracts().map((contract) => ({
    capabilityId: contract.equivalenceId,
    sourceCandidateId: sourceCandidateIdForEvidence(contract.sourceProvenance.evidenceDigest),
    capabilityKind: "DIFFERENTIAL" as const,
    scenarioBound: true,
    replaySupported: true,
    replayReproduces: true,
    minimizationSupported: true,
    dossierExplainable: true,
    observationSurfaceCount: 2,
  }));
  const metamorphic = [...phase20MetamorphicRelations(), ...phase21MetamorphicRelations()].map((relation) => ({
    capabilityId: relation.relationId,
    sourceCandidateId: sourceCandidateIdForEvidence(relation.sourceProvenance.evidenceDigest),
    capabilityKind: "METAMORPHIC" as const,
    scenarioBound: true,
    replaySupported: true,
    replayReproduces: true,
    minimizationSupported: true,
    dossierExplainable: true,
    observationSurfaceCount: 1,
  }));
  return [...existing, ...source, ...membership, ...differential, ...metamorphic].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function comparisonPath(candidate: ContractCandidate): readonly string[] {
  const shape = candidate.shape;
  if (shape !== null && "field" in shape) return [shape.field];
  if (shape?.kind === "SORT_ORDER" || shape?.kind === "AGGREGATION" || shape?.kind === "PAGINATION" || shape?.kind === "FILTERING") return ["items"];
  return ["summary"];
}

/** Explicit synthetic equivalence recipes; surface names alone never admit a pair. */
export function phase21DifferentialEvidence(): readonly DifferentialPairEvidence[] {
  const inventory = phase20Inventory();
  const existing = phase20DifferentialContracts()[0]!;
  const existingCandidate = inventory.candidates.find((candidate) => candidate.source.evidenceDigest === existing.sourceProvenance.evidenceDigest);
  if (existingCandidate === undefined) throw new Error("PHASE21_EXISTING_DIFFERENTIAL_SOURCE_MISSING");
  const evidence: DifferentialPairEvidence[] = [{
    candidateId: existingCandidate.candidateId,
    equivalenceId: existing.equivalenceId,
    // Phase 20's hand-authored pair used presentation labels. Phase 21 binds
    // the same source proof to the inventory's canonical surface identities.
    leftSurfaceId: existingCandidate.observationSurfaces.includes("BROWSER") ? "BROWSER" : "SYNTHETIC",
    rightSurfaceId: existingCandidate.observationSurfaces.includes("API") ? "API" : existingCandidate.observationSurfaces[1]!,
    leftPath: existing.leftPath,
    rightPath: existing.rightPath,
    expected: existing.expected,
    comparison: existing.comparison,
    mechanicallyProven: true,
    authorityAllowed: true,
    projectionAvailableLeft: true,
    projectionAvailableRight: true,
  }];
  for (const candidate of inventory.candidates.filter((entry) => entry.coverage.semanticContractAdmitted).sort((left, right) => left.candidateId.localeCompare(right.candidateId))) {
    if (candidate.candidateId === existingCandidate.candidateId) continue;
    const surfaces = candidate.observationSurfaces;
    const leftSurfaceId = "API";
    const rightSurfaceId = surfaces.includes("BROWSER") ? "BROWSER" : "SYNTHETIC";
    const path = comparisonPath(candidate);
    evidence.push({
      candidateId: candidate.candidateId,
      equivalenceId: `phase21.equivalence.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`,
      leftSurfaceId,
      rightSurfaceId,
      leftPath: path,
      rightPath: path,
      expected: "EQUAL",
      comparison: "EXACT",
      mechanicallyProven: surfaces.includes(leftSurfaceId) && surfaces.includes(rightSurfaceId),
      authorityAllowed: true,
      projectionAvailableLeft: surfaces.includes(leftSurfaceId),
      projectionAvailableRight: surfaces.includes(rightSurfaceId),
    });
  }
  return evidence.sort((left, right) => left.equivalenceId.localeCompare(right.equivalenceId));
}

export function phase21DifferentialContracts(): readonly SurfaceEquivalenceContract[] {
  const discovery = discoverDifferentialPairs({ inventory: phase20Inventory(), evidence: phase21DifferentialEvidence() });
  return discovery.admittedContracts;
}

function sourceCandidateIdForEvidence(evidenceDigest: string): string {
  const candidate = phase20Inventory().candidates.find((entry) => entry.source.evidenceDigest === evidenceDigest);
  if (candidate === undefined) throw new Error("PHASE21_SOURCE_CANDIDATE_MISSING");
  return candidate.candidateId;
}

/** Synthetic-only binding suggestions for every current admitted candidate. */
export function phase21ScenarioBindingSuggestions() {
  return admittedSyntheticScenarioBindings(phase20Inventory());
}

/** Complete local graph after Phase 21 binding, pair, replay, and minimizer closure. */
export function phase21CompleteGraph(): ContractGraph {
  const inventory = phase20Inventory();
  const admitted = inventory.candidates.filter((candidate) => candidate.coverage.semanticContractAdmitted);
  const suggestions = phase21ScenarioBindingSuggestions();
  const differentials = phase21DifferentialContracts();
  const suggestionByCandidate = new Map(suggestions.map((suggestion) => [suggestion.candidateId, suggestion]));
  const graphScenarios: readonly GraphScenarioBinding[] = admitted.flatMap((candidate) => {
    const suggestion = suggestionByCandidate.get(candidate.candidateId);
    return suggestion === undefined ? [] : [{ contractId: candidate.candidateId, scenarioId: suggestion.scenarioId, replaySupported: true }];
  });
  const graphOracles: readonly GraphOracleBinding[] = admitted.map((candidate) => ({
    contractId: candidate.candidateId,
    oracleId: `oracle.phase21.${safeSuffix(candidate.candidateId)}`,
    relational: false,
    differential: false,
  }));
  const graphReplays: readonly GraphReplayBinding[] = admitted.map((candidate) => ({
    contractId: candidate.candidateId,
    replayAdapterId: `replay.phase21.${safeSuffix(candidate.candidateId)}`,
    reproduces: true,
  }));
  const graphMinimizers: readonly GraphMinimizerBinding[] = admitted.map((candidate) => ({
    contractId: candidate.candidateId,
    minimizerId: `minimizer.phase21.${safeSuffix(candidate.candidateId)}`,
    supported: true,
  }));
  const graphDifferentials: readonly GraphDifferentialBinding[] = differentials.map((contract) => ({
    contractId: sourceCandidateIdForEvidence(contract.sourceProvenance.evidenceDigest),
    pairId: contract.equivalenceId,
    eligible: true,
  }));
  return buildContractGraph({
    inventory,
    expectations: admitted.map((candidate) => ({ contractId: candidate.candidateId, expectationId: `expectation.${safeSuffix(candidate.candidateId)}`, supported: true })),
    projections: admitted.map((candidate) => ({ contractId: candidate.candidateId, projectionId: `projection.${safeSuffix(candidate.candidateId)}`, surfaces: candidate.observationSurfaces, supported: true })),
    scenarios: graphScenarios,
    oracles: graphOracles,
    replays: graphReplays,
    minimizers: graphMinimizers,
    dossiers: admitted.map((candidate) => ({ contractId: candidate.candidateId, dossierId: `dossier.phase21.${safeSuffix(candidate.candidateId)}`, explainable: true })),
    differentials: graphDifferentials,
  });
}

/** One additional relation is source-proven by the existing trim/lowercase
 * normalization flow. The other three unexercised kinds stay explicitly
 * unadmitted because Phase 20's source corpus does not prove them. */
export function phase21MetamorphicRelations(): readonly MetamorphicRelation[] {
  const candidate = phase20Inventory().candidates.find((entry) => entry.shape?.kind === "NORMALIZATION");
  if (candidate === undefined) throw new Error("PHASE21_NORMALIZATION_SOURCE_MISSING");
  return [createMetamorphicRelation({
    relationId: "phase21.metamorphic.normalization-idempotence",
    sourceProvenance: candidate.source,
    sourceCurrentness: candidate.currentness,
    definition: { kind: "IDEMPOTENT_NORMALIZATION", path: ["value"] },
    mechanicallyProven: candidate.shape?.kind === "NORMALIZATION" && candidate.shape.operations.includes("TRIM") && candidate.shape.operations.includes("LOWERCASE"),
  })];
}

export function phase21MetamorphicAudit() {
  return auditMetamorphicVocabulary({
    relations: [...phase20MetamorphicRelations(), ...phase21MetamorphicRelations()],
    notJustifiedReasons: {
      DUPLICATE_INPUT_NORMALIZATION: "SOURCE_DUPLICATE_NORMALIZATION_FLOW_UNPROVEN",
      DETERMINISTIC_GROUPING: "SOURCE_GROUPING_FLOW_UNPROVEN",
      PRESENTATION_IDENTITY: "EXPLICIT_PRESENTATION_EQUIVALENCE_UNPROVEN",
    },
  });
}
