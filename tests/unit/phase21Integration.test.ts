import { expect, test } from "@playwright/test";
import {
  buildCoverageQualityReport,
  buildSemanticGapClosureLedger,
  buildSemanticLifecycleReport,
  buildContractGraph,
  generateSyntheticFixtures,
  lifecycleEvidenceRows,
  normalizeContractGraph,
  planSemanticGapClosure,
  rebuildSemanticGapClosureLedger,
  replaySyntheticSemanticFinding,
  countSemanticOperations,
  measureSyntheticMutationDetection,
  type SyntheticFixture,
} from "../../src/core/semanticCoverage";
import { createOwnerDossierV4 } from "../../src/core/campaignIntelligence/dossierV4";
import { createOwnerDossierV5 } from "../../src/core/campaignIntelligence/dossierV5";
import {
  phase20DifferentialContracts,
  phase20Inventory,
  phase20MetamorphicRelations,
  phase20RelationalContracts,
} from "../../corpus/phase20/contracts";
import {
  phase21BaselineGraph,
  phase21CompleteGraph,
  phase21DifferentialContracts,
  phase21DifferentialEvidence,
  phase21MembershipBindings,
  phase21MembershipContracts,
  phase21MetamorphicAudit,
  phase21MetamorphicRelations,
  phase21ScenarioBindingSuggestions,
} from "../../corpus/phase21/contracts";
import { discoverDifferentialPairs } from "../../src/core/semanticCoverage/differential";
import { PHASE21_ADVERSARIAL_CASES, PHASE21_FULL_ADVERSARIAL_CASES } from "../../corpus/phase21/adversarialMatrix";

function campaignFixtureSet(): { readonly fixtures: readonly SyntheticFixture[]; readonly measurement: ReturnType<typeof measureSyntheticMutationDetection>; readonly lifecycle: ReturnType<typeof buildSemanticLifecycleReport>; readonly finalMeasurement: ReturnType<typeof measureSyntheticMutationDetection> } {
  const inventory = phase20Inventory();
  const differentialContracts = phase21DifferentialContracts();
  const metamorphicRelations = [...phase20MetamorphicRelations(), ...phase21MetamorphicRelations()];
  const membershipContracts = phase21MembershipContracts();
  const membershipBindings = phase21MembershipBindings();
  const fixtures = generateSyntheticFixtures({ candidates: inventory.candidates, relationalContracts: phase20RelationalContracts(), differentialContracts, metamorphicRelations, membershipContracts, membershipBindings });
  const measurement = measureSyntheticMutationDetection({ fixtures, candidates: inventory.candidates, relationalContracts: phase20RelationalContracts(), differentialContracts, metamorphicRelations, membershipContracts, membershipBindings });
  const lifecycle = buildSemanticLifecycleReport({ fixtures, measurement, differentialContracts });
  const finalMeasurement = measureSyntheticMutationDetection({ fixtures, candidates: inventory.candidates, relationalContracts: phase20RelationalContracts(), differentialContracts, metamorphicRelations, membershipContracts, membershipBindings, lifecycleEvidence: lifecycleEvidenceRows(lifecycle) });
  return { fixtures, measurement, lifecycle, finalMeasurement };
}

test.describe("Phase 21 lifecycle saturation", () => {
  test("preserves the exact baseline and closes actionable graph gaps without hiding residual proof gaps", () => {
    const inventory = phase20Inventory();
    const baseline = phase21BaselineGraph();
    const complete = phase21CompleteGraph();
    const baselineLedger = buildSemanticGapClosureLedger({ inventory, graph: baseline });
    const finalLedger = rebuildSemanticGapClosureLedger({ baseline: baselineLedger, inventory, graph: complete });
    expect({ nodes: baseline.nodeCount, edges: baseline.edgeCount, gaps: baseline.gaps.length }).toEqual({ nodes: 157, edges: 151, gaps: 86 });
    expect({ nodes: complete.nodeCount, edges: complete.edgeCount, gaps: complete.gaps.length }).toEqual({ nodes: 239, edges: 233, gaps: 3 });
    expect(baselineLedger.totalGapCount).toBe(86);
    expect(finalLedger.totalGapCount).toBe(86);
    expect(finalLedger.closedGapCount).toBe(83);
    expect(finalLedger.actionableGapCount).toBe(0);
    expect(finalLedger.irreducibleGapCount).toBe(3);
    expect(finalLedger.statusCounts.OBSOLETE_AFTER_GRAPH_REBUILD).toBe(83);
    expect(finalLedger.statusCounts.IRREDUCIBLE_SOURCE_PROOF).toBe(3);
    expect(finalLedger.records.filter((record) => record.reasonCode === "DUPLICATE_EQUIVALENCE_PROOF_MISSING")).toHaveLength(2);
    // Phase 25 corrected the TS range-bound proof orientation. The resulting
    // source-bound candidate identity intentionally advances this historical
    // digest; Phase 25's analyzer matrix covers the old false-positive forms.
    expect(finalLedger.baselineGraphDigest).toBe("contract-graph:sha256:741b136e752a061c002ec47d");
    expect(JSON.stringify(finalLedger)).not.toContain("CUSTOMER_SENTINEL");
  });

  test("executes membership, differential, replay, dependency minimization, and quality evidence end to end", () => {
    const { fixtures, measurement, lifecycle, finalMeasurement } = campaignFixtureSet();
    expect(fixtures.length).toBe(175);
    expect({ generated: measurement.mutantsGenerated, applicable: measurement.mutantsApplicable, detected: measurement.mutantsDetected, surviving: measurement.mutantsSurviving, benign: measurement.benignControls, falsePositives: measurement.benignFalsePositives }).toEqual({ generated: 67, applicable: 67, detected: 67, surviving: 0, benign: 54, falsePositives: 0 });
    expect({ replay: lifecycle.replayAttempted, gaps: lifecycle.replayGapCount, minimized: lifecycle.minimizationSupported, highConfidence: lifecycle.highConfidenceCount }).toEqual({ replay: 67, gaps: 0, minimized: 67, highConfidence: 67 });
    expect(lifecycle.minimizationProofCounts.SEMANTIC_FIXED_POINT).toBe(67);
    expect({ replay: finalMeasurement.replayedDetections, minimized: finalMeasurement.minimizedDetections, highConfidence: finalMeasurement.highConfidenceDetections }).toEqual({ replay: 67, minimized: 67, highConfidence: 67 });
    expect(finalMeasurement.mutantsSurviving).toBe(0);
    expect(finalMeasurement.benignFalsePositives).toBe(0);
    expect(JSON.stringify(finalMeasurement)).not.toMatch(/open|closed|synthetic-unknown-member|CUSTOMER_SENTINEL/);
  });

  test("classifies replay equivalence and divergence by contract identity, not generic error class", () => {
    const { fixtures } = campaignFixtureSet();
    const fixture = fixtures.find((entry) => entry.mutationClass === "DIFFERENTIAL_MISMATCH")!;
    expect(replaySyntheticSemanticFinding({ fixture }).outcome).toBe("REPRODUCED_EXACT");
    expect(replaySyntheticSemanticFinding({ fixture, representationChanged: true }).outcome).toBe("REPRESENTATION_CHANGED_CONTRACT_PRESERVED");
    expect(replaySyntheticSemanticFinding({ fixture, contractChanged: true }).outcome).toBe("CONTRACT_CHANGED");
    expect(replaySyntheticSemanticFinding({ fixture, preconditionSatisfied: false }).outcome).toBe("PRECONDITION_DIVERGENCE");
    expect(replaySyntheticSemanticFinding({ fixture, nondeterministic: true }).outcome).toBe("NONDETERMINISTIC");
    expect(replaySyntheticSemanticFinding({ fixture, sourceCurrentness: "STALE" }).outcome).toBe("SOURCE_STALE");
  });

  test("ranks closure deterministically and records the honest metamorphic boundary", () => {
    const inventory = phase20Inventory();
    const baseline = phase21BaselineGraph();
    const ledger = buildSemanticGapClosureLedger({ inventory, graph: baseline });
    const campaign = campaignFixtureSet();
    const differential = discoverDifferentialPairs({ inventory, evidence: phase21DifferentialEvidence() });
    const quality = buildCoverageQualityReport({ inventory, graph: phase21CompleteGraph(), mutationMeasurement: campaign.finalMeasurement, lifecycle: campaign.lifecycle, differential });
    const operations = countSemanticOperations({ fixtures: campaign.fixtures, lifecycle: campaign.lifecycle, differential, graph: phase21CompleteGraph() });
    const plan = planSemanticGapClosure({ inventory, graph: baseline, ledger, quality });
    expect(plan.selectedCount).toBe(85);
    expect(plan.selected[0]?.selectionReason).toBe("DIFFERENTIAL_FIRST");
    expect(plan).toEqual(planSemanticGapClosure({ inventory, graph: baseline, ledger, quality }));
    expect(quality.fullLifecycleContractCount).toBe(21);
    const audit = phase21MetamorphicAudit();
    expect(audit.exercisedKindCount).toBe(4);
    expect(audit.notJustifiedKindCount).toBe(3);
    expect(audit.rows.find((row) => row.kind === "DETERMINISTIC_GROUPING")?.reasonCode).toBe("SOURCE_GROUPING_FLOW_UNPROVEN");
    expect(operations.pairDiscoveryRows).toBe(22);
    expect(operations.membershipComparisons).toBe(16);
    expect(operations.minimizationReductionProbes).toBeGreaterThan(0);
    expect(operations).toEqual(countSemanticOperations({ fixtures: campaign.fixtures, lifecycle: campaign.lifecycle, differential, graph: phase21CompleteGraph() }));
  });

  test("expands the adversarial corpus with data-driven privacy and lifecycle families", () => {
    expect(PHASE21_ADVERSARIAL_CASES.length).toBe(63);
    expect(PHASE21_FULL_ADVERSARIAL_CASES.length).toBeGreaterThan(88);
    expect(new Set(PHASE21_FULL_ADVERSARIAL_CASES.map((entry) => entry.caseId)).size).toBe(PHASE21_FULL_ADVERSARIAL_CASES.length);
    expect(new Set(PHASE21_FULL_ADVERSARIAL_CASES.map((entry) => entry.family)).size).toBeGreaterThanOrEqual(20);
    expect(PHASE21_FULL_ADVERSARIAL_CASES.every((entry) => entry.privacySafe && !JSON.stringify(entry).includes("CUSTOMER_SENTINEL"))).toBe(true);
  });

  test("normalizes only explicitly proven duplicate identities", () => {
    const inventory = phase20Inventory();
    const graph = phase21CompleteGraph();
    const duplicate = graph.gaps.filter((gap) => gap.gap === "DUPLICATE_COVERAGE").map((gap) => gap.contractId);
    expect(duplicate).toHaveLength(2);
    const primary = inventory.candidates.find((candidate) => candidate.shape?.kind === "FIELD_TYPE" && candidate.shape.field === "id")!;
    const duplicateCandidate = duplicate.find((id) => JSON.stringify(inventory.candidates.find((candidate) => candidate.candidateId === id)?.shape) === JSON.stringify(primary.shape))!;
    const proof = normalizeContractGraph({ graph, inventory, equivalences: [{ primaryContractId: primary.candidateId, duplicateContractId: duplicateCandidate, sourceEvidenceDigest: primary.source.evidenceDigest, mechanicallyProven: true }] });
    expect(proof.mergedDuplicateContractIds).toEqual([duplicateCandidate]);
    expect(proof.unresolvedDuplicateContractIds).toHaveLength(1);
    expect(proof.graph.gaps.filter((gap) => gap.gap === "DUPLICATE_COVERAGE")).toHaveLength(1);
    expect(() => normalizeContractGraph({ graph, inventory, equivalences: [{ primaryContractId: primary.candidateId, duplicateContractId: duplicateCandidate, sourceEvidenceDigest: primary.source.evidenceDigest, mechanicallyProven: false }] })).toThrow("DUPLICATE_PROOF");
  });

  test("emits a compact V5 dossier with membership, pair, replay, dependency, and gap evidence", () => {
    const base = createOwnerDossierV4({
      base: { schemaVersion: "nightwatch.owner-dossier.v3", dossierId: "dossier:sha256:000000000000000000000001", status: "ACTIONABLE", behavior: { failureClass: "RELATION_VIOLATED", product: "synthetic-phase21-product", surface: "api", semanticContractId: "contract.phase21", invariantId: "relation.phase21" }, replay: { outcome: "REPRODUCED_EXACT", deterministic: true, observationEqual: true, occurrenceBinding: "BOUND", divergenceReasons: [] }, minimization: { proof: "BOUNDED_MINIMAL", minimalActionIds: ["setup", "trigger"], removedOrdinals: [2], probesAttempted: 3 }, relatedCluster: null, limitations: [] } as never,
      derivationChain: [{ stage: "SOURCE_EVIDENCE", identity: "ev:sha256:000000000000000000000001" }, { stage: "CONTRACT_CANDIDATE", identity: "contract.phase21" }, { stage: "REPLAY_ADAPTER", identity: "replay.phase21" }, { stage: "MINIMIZER", identity: "minimizer.phase21" }],
      relationalRule: null, differentialOutcome: "CONTRACT_VIOLATION", metamorphicOutcome: null, violatedSemanticRelation: "MEMBERSHIP_VIOLATED", coverageBeforeFinding: null, stabilityClassification: "STABLE", syntheticMutantClass: "UNEXPECTED_SET_MEMBER",
    });
    const dossier = createOwnerDossierV5({ base, membershipResult: "SUPERSET_OR_UNKNOWN_MEMBER", membershipEvidenceDigest: "ev:sha256:000000000000000000000002", differentialPair: { equivalenceId: "phase21.pair", leftSurfaceId: "API", rightSurfaceId: "BROWSER", alignmentRuleKind: "NONE" }, replayEquivalence: "REPRODUCED_EXACT", minimizationDependencyProof: { edgeCount: 2, proof: "SEMANTIC_FIXED_POINT", dependencyDigest: "dep:sha256:000000000000000000000003" }, coverageQuality: "FULL_LIFECYCLE", closedGap: { gapIdentity: "gap:sha256:000000000000000000000004", gapClass: "DIFFERENTIAL_PROJECTION", closureStatus: "OBSOLETE_AFTER_GRAPH_REBUILD" }, sourceContract: { candidateId: "contract.phase21", sourceEvidenceDigest: "ev:sha256:000000000000000000000005", shapeKind: "FINITE_ENUM" }, syntheticMutationClass: "UNEXPECTED_SET_MEMBER", limitations: ["LOCAL_SYNTHETIC_ONLY"] });
    expect(dossier.schemaVersion).toBe("nightwatch.owner-dossier.v5");
    expect(dossier.membership.result).toBe("SUPERSET_OR_UNKNOWN_MEMBER");
    expect(dossier.minimizationDependencyProof?.edgeCount).toBe(2);
    expect(JSON.stringify(dossier)).not.toMatch(/CUSTOMER_SENTINEL|identityToken|rawValue|rawObservation/);
  });
});
