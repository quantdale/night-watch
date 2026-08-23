import { expect, test } from "@playwright/test";
import {
  admitContractInventory,
  buildContractGraph,
  classifyContractDrift,
  createMetamorphicRelation,
  createRelationalContract,
  createSurfaceEquivalenceContract,
  discoverContractInventory,
  compareSurfaceSemantics,
  evaluateMetamorphicRelation,
  evaluateRelationalContract,
  buildDifferentialCoverageReport,
  deriveProjectionFeatures,
  graphGapCounts,
  buildSemanticCoverageGapInputs,
  buildPhase20CoverageReport,
  composeSemanticCampaignPlan,
  clearSemanticCoverageCaches,
  discoverContractInventoryCached,
  buildContractGraphCached,
  semanticCacheStats,
  type ContractDiscoveryInventory,
} from "../../src/core/semanticCoverage";
import { ProjectionContext } from "../../src/oracles/projections/identity";
import { projectValue } from "../../src/oracles/projections/projector";
import { analyzeSourceArtifact } from "../../src/core/semanticCoverage/sourceAnalyzers";
import {
  PHASE20_PHP_ARTIFACT,
  PHASE20_SOURCE_ARTIFACTS,
  PHASE20_SOURCE_SHA,
  PHASE20_TYPESCRIPT_ARTIFACT,
  PHASE20_UNSUPPORTED_ARTIFACT,
} from "../../corpus/phase20/sourceFixtures";
import { phase20CapabilityBindings, phase20DifferentialContracts, phase20MetamorphicRelations, phase20RelationalContracts, PHASE20_SYNTHETIC_PRODUCT_ADAPTER, PHASE20_SYNTHETIC_PRODUCT_MODEL } from "../../corpus/phase20/contracts";
import { generateSyntheticFixtures, measureSyntheticMutationDetection } from "../../src/core/semanticCoverage/mutation";
import { PHASE20_ADVERSARIAL_CASES } from "../../corpus/phase20/adversarialMatrix";
import { p16Member } from "../../corpus/phase16a/portfolioFixtures";
import { buildPortfolio } from "../../src/core/portfolio/types";
import { buildCampaignImpactReport } from "../../src/core/campaignIntelligence/impact";
import { createOwnerDossierV4 } from "../../src/core/campaignIntelligence/dossierV4";
import type { OwnerDossierV3 } from "../../src/core/campaignIntelligence/dossierV3";

function inventory(): ContractDiscoveryInventory {
  return discoverContractInventory({
    artifacts: PHASE20_SOURCE_ARTIFACTS,
    currentSnapshots: { "synthetic/phase20-product": PHASE20_SOURCE_SHA },
  });
}

test.describe("Phase 20 contract discovery and graph", () => {
  test("discovers deterministic multi-language behavior with explicit rejection", () => {
    const first = inventory();
    const second = inventory();
    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe("nightwatch.contract-discovery.v1");
    expect(first.sourceArtifactCount).toBe(6);
    expect(first.mechanicallyProvableCount).toBeGreaterThanOrEqual(12);
    expect(first.candidates.some((candidate) => candidate.behaviorClass === "FINITE_ENUM")).toBe(true);
    expect(first.candidates.some((candidate) => candidate.behaviorClass === "RANGE_BOUND")).toBe(true);
    expect(first.candidates.some((candidate) => candidate.behaviorClass === "NORMALIZATION")).toBe(true);
    expect(first.candidates.some((candidate) => candidate.behaviorClass === "AGGREGATION")).toBe(true);
    expect(first.candidates.some((candidate) => candidate.behaviorClass === "PAGINATION")).toBe(true);
    expect(first.rejectedCandidateIds.length).toBeGreaterThan(0);
    expect(first.rejectionCounts.UNSUPPORTED_SYNTAX).toBeGreaterThan(0);
    expect(JSON.stringify(first)).not.toContain('"open"');
    expect(JSON.stringify(first)).not.toContain('"closed"');
  });

  test("composes the existing PHP mechanical analyzer and remains fail-closed", () => {
    const observations = analyzeSourceArtifact(PHASE20_PHP_ARTIFACT);
    expect(observations.some((observation) => observation.status === "MECHANICALLY_PROVABLE")).toBe(true);
    expect(observations.every((observation) => observation.evidenceDigest.startsWith("ev:sha256:"))).toBe(true);
    const dynamic = analyzeSourceArtifact(PHASE20_UNSUPPORTED_ARTIFACT);
    expect(dynamic).toHaveLength(1);
    expect(dynamic[0]!.rejectionCode).toBe("UNSUPPORTED_SYNTAX");
    const privacy = analyzeSourceArtifact({ ...PHASE20_TYPESCRIPT_ARTIFACT, artifactId: "phase20.privacy", sourceText: "const x = 'PRIVACY_SENTINEL';" });
    expect(privacy[0]!.rejectionCode).toBe("PRIVACY_UNSAFE_SOURCE");
  });

  test("admission only upgrades current mechanically proven candidates", () => {
    const discovered = inventory();
    const admitted = admitContractInventory(discovered);
    expect(admitted.admittedCount).toBeGreaterThan(0);
    expect(admitted.candidates.filter((candidate) => candidate.proofStatus === "ADMITTED" || candidate.proofStatus === "PROJECTABLE").every((candidate) => candidate.currentness === "CURRENT")).toBe(true);
    const stale = discoverContractInventory({ artifacts: [PHASE20_TYPESCRIPT_ARTIFACT], currentSnapshots: { "synthetic/phase20-product": "0000000000000000000000000000000000000099" } });
    const staleAdmitted = admitContractInventory(stale);
    expect(staleAdmitted.admittedCount).toBe(0);
    expect(staleAdmitted.candidates.every((candidate) => candidate.currentness === "STALE_SOURCE")).toBe(true);
  });

  test("drift distinguishes unchanged evidence, semantic changes, and removal", () => {
    const current = admitContractInventory(inventory()).candidates.find((candidate) => candidate.shape?.kind === "FINITE_ENUM");
    expect(current).toBeDefined();
    const same = classifyContractDrift({ prior: current!, current: current! });
    expect(same.currentness).toBe("CURRENT");
    const changed = { ...current!, source: { ...current!.source, sha: "0000000000000000000000000000000000000021", evidenceDigest: "ev:sha256:111111111111111111111111" } };
    const changedResult = classifyContractDrift({ prior: current!, current: changed });
    expect(changedResult.currentness).toBe("SEMANTIC_REDERIVATION_REQUIRED");
    const removed = classifyContractDrift({ prior: current!, current: null });
    expect(removed.currentness).toBe("CONTRACT_REMOVED");
  });

  test("graph retains lifecycle edges and ranks explicit gaps", () => {
    const admitted = admitContractInventory(inventory());
    const contract = admitted.candidates.find((candidate) => candidate.proofStatus === "PROJECTABLE");
    expect(contract).toBeDefined();
    const graph = buildContractGraph({
      inventory: admitted,
      expectations: [{ contractId: contract!.candidateId, expectationId: "expectation.phase20.one", supported: true }],
      projections: [{ contractId: contract!.candidateId, projectionId: "projection.phase20.api", surfaces: ["API", "BROWSER"], supported: true }],
      scenarios: [{ contractId: contract!.candidateId, scenarioId: "scenario.phase20.one", replaySupported: true }],
      oracles: [{ contractId: contract!.candidateId, oracleId: "oracle.phase20.one", relational: false, differential: true }],
    });
    expect(graph.schemaVersion).toBe("nightwatch.semantic-contract-graph.v1");
    expect(graph.nodes.some((node) => node.kind === "SOURCE_EVIDENCE")).toBe(true);
    expect(graph.edges.some((edge) => edge.reason === "ADMITTED_AS")).toBe(true);
    expect(graph.gaps.some((gap) => gap.gap === "REPLAY_GAP")).toBe(true);
    expect(graph.gaps.some((gap) => gap.gap === "MINIMIZATION_GAP")).toBe(true);
    expect(graphGapCounts(graph).REPLAY_GAP).toBeGreaterThan(0);
    expect(buildContractGraph({ inventory: admitted }).deterministicDigest).toBeDefined();
    expect(JSON.stringify(graph)).not.toContain("PRIVACY_SENTINEL");
  });

  test("evaluates source-proven relational contracts through sanitized projections", () => {
    const admitted = admitContractInventory(inventory());
    const aggregateCandidate = admitted.candidates.find((candidate) => candidate.shape?.kind === "AGGREGATION");
    const presenceCandidate = admitted.candidates.find((candidate) => candidate.shape?.kind === "PRESENCE_RELATION");
    const orderingCandidate = admitted.candidates.find((candidate) => candidate.shape?.kind === "SORT_ORDER");
    expect(aggregateCandidate && presenceCandidate && orderingCandidate).toBeTruthy();
    const total = createRelationalContract({ candidate: aggregateCandidate!, relationId: "relation.total", definition: { kind: "TOTAL_EQUALS_SUM", collectionPath: ["items"], numericFieldPath: ["amount"], scalarPath: ["total"] } });
    const presence = createRelationalContract({ candidate: presenceCandidate!, relationId: "relation.presence", definition: { kind: "FIELD_PRESENT_IF", conditionPath: ["enabled"], targetPath: ["detail"], conditionExpected: true } });
    const ordering = createRelationalContract({ candidate: orderingCandidate!, relationId: "relation.ordering", definition: { kind: "ORDERING", collectionPath: ["items"], itemValuePath: ["rank"], direction: "ASCENDING" } });
    expect(total.proofStatus).toBe("ADMITTED");
    const ctx = new ProjectionContext();
    const passing = projectValue({ items: [{ amount: 1 }, { amount: 2 }], total: 3 }, ctx).projection;
    const violating = projectValue({ items: [{ amount: 1 }, { amount: 2 }], total: 4 }, ctx).projection;
    expect(evaluateRelationalContract({ contract: total, projections: [passing], ctx }).verdict).toBe("PASS");
    expect(evaluateRelationalContract({ contract: total, projections: [violating], ctx }).verdict).toBe("VIOLATED");
    expect(evaluateRelationalContract({ contract: presence, projections: [projectValue({ enabled: true, detail: "safe" }, ctx).projection], ctx }).verdict).toBe("PASS");
    expect(evaluateRelationalContract({ contract: presence, projections: [projectValue({ enabled: true }, ctx).projection], ctx }).verdict).toBe("VIOLATED");
    expect(evaluateRelationalContract({ contract: ordering, projections: [projectValue({ items: [{ rank: 1 }, { rank: 2 }] }, ctx).projection], ctx }).verdict).toBe("PASS");
    expect(evaluateRelationalContract({ contract: ordering, projections: [projectValue({ items: [{ rank: 2 }, { rank: 1 }] }, ctx).projection], ctx }).verdict).toBe("VIOLATED");
    expect(JSON.stringify(evaluateRelationalContract({ contract: total, projections: [violating], ctx }))).not.toContain('"total"');
  });

  test("differential comparisons require declared equivalence and classify every major outcome", () => {
    const candidate = admitContractInventory(inventory()).candidates.find((entry) => entry.shape?.kind === "FIELD_SET")!;
    const contract = createSurfaceEquivalenceContract({ equivalenceId: "equivalence.summary", leftSurfaceId: "browser", rightSurfaceId: "api", sourceProvenance: candidate.source, sourceCurrentness: "CURRENT", expected: "EQUAL", comparison: "EXACT", leftPath: ["summary"], rightPath: ["summary"], mechanicallyProven: true });
    const ctx = new ProjectionContext();
    const left = { surfaceId: "browser", observationId: "obs.browser", sourceCurrentness: "CURRENT" as const, applicable: true, projection: projectValue({ summary: { count: 2 } }, ctx).projection };
    const right = { surfaceId: "api", observationId: "obs.api", sourceCurrentness: "CURRENT" as const, applicable: true, projection: projectValue({ summary: { count: 2 } }, ctx).projection };
    expect(compareSurfaceSemantics({ contract, left, right }).outcome).toBe("EXACT_EQUIVALENT");
    const mismatch = { ...right, projection: projectValue({ summary: { count: 3 } }, ctx).projection };
    expect(compareSurfaceSemantics({ contract, left, right: mismatch }).outcome).toBe("CONTRACT_VIOLATION");
    expect(compareSurfaceSemantics({ contract, left: { ...left, applicable: false }, right }).outcome).toBe("SURFACE_NOT_APPLICABLE");
    expect(compareSurfaceSemantics({ contract: { ...contract, proofStatus: "REJECTED" }, left, right }).outcome).toBe("INSUFFICIENT_AUTHORITY");
    expect(compareSurfaceSemantics({ contract, left: { ...left, sourceCurrentness: "STALE_SOURCE" }, right }).outcome).toBe("SOURCE_STALE");
    const expectedDifference = createSurfaceEquivalenceContract({ equivalenceId: "equivalence.expected-difference", leftSurfaceId: "browser", rightSurfaceId: "api", sourceProvenance: candidate.source, sourceCurrentness: "CURRENT", expected: "DIFFERENT", comparison: "SEMANTIC", leftPath: ["summary"], rightPath: ["summary"], mechanicallyProven: true });
    expect(compareSurfaceSemantics({ contract: expectedDifference, left, right: mismatch }).outcome).toBe("EXPECTED_DIFFERENCE");
    expect(compareSurfaceSemantics({ contract: expectedDifference, left, right }).outcome).toBe("CONTRACT_VIOLATION");
    const incompatible = { ...left, projection: { schemaVersion: "nightwatch.semantic-projection.v1", root: { type: "UNSUPPORTED" } } as never };
    expect(compareSurfaceSemantics({ contract, left: incompatible, right }).outcome).toBe("PROJECTION_INCOMPATIBLE");
    expect(compareSurfaceSemantics({ contract: { ...contract, schemaVersion: "future" as never }, left, right }).outcome).toBe("INTERNAL_ERROR");
    const report = buildDifferentialCoverageReport([compareSurfaceSemantics({ contract, left, right }), compareSurfaceSemantics({ contract, left, right: mismatch })]);
    expect(report.contractViolationCount).toBe(1);
  });

  test("metamorphic relations detect stable-order, irrelevant-field, and monotonicity violations", () => {
    const candidate = admitContractInventory(inventory()).candidates.find((entry) => entry.shape?.kind === "NORMALIZATION")!;
    const relation = createMetamorphicRelation({ relationId: "metamorphic.irrelevant", sourceProvenance: candidate.source, sourceCurrentness: "CURRENT", definition: { kind: "IRRELEVANT_FIELD_INVARIANCE", comparedPath: ["summary"] }, mechanicallyProven: true });
    const order = createMetamorphicRelation({ relationId: "metamorphic.order", sourceProvenance: candidate.source, sourceCurrentness: "CURRENT", definition: { kind: "STABLE_ORDER", collectionPath: ["items"], itemValuePath: ["rank"], direction: "ASCENDING" }, mechanicallyProven: true });
    const monotonic = createMetamorphicRelation({ relationId: "metamorphic.page", sourceProvenance: candidate.source, sourceCurrentness: "CURRENT", definition: { kind: "PAGINATION_MONOTONIC", countPath: ["count"], direction: "NON_DECREASING" }, mechanicallyProven: true });
    const ctx = new ProjectionContext();
    const base = projectValue({ summary: { state: true }, items: [{ rank: 1 }, { rank: 2 }], count: 1 }, ctx).projection;
    const benign = projectValue({ summary: { state: true }, noise: "presentation", items: [{ rank: 1 }, { rank: 2 }], count: 2 }, ctx).projection;
    const defective = projectValue({ summary: { state: true }, items: [{ rank: 2 }, { rank: 1 }], count: 0 }, ctx).projection;
    expect(evaluateMetamorphicRelation({ relation, baseline: base, transformed: benign, ctx }).outcome).toBe("HOLDS");
    expect(evaluateMetamorphicRelation({ relation, baseline: base, transformed: projectValue({ summary: { state: false } }, ctx).projection, ctx }).outcome).toBe("VIOLATED");
    expect(evaluateMetamorphicRelation({ relation: order, baseline: base, transformed: defective, ctx }).outcome).toBe("VIOLATED");
    expect(evaluateMetamorphicRelation({ relation: monotonic, baseline: base, transformed: benign, ctx }).outcome).toBe("HOLDS");
    expect(evaluateMetamorphicRelation({ relation: monotonic, baseline: base, transformed: defective, ctx }).outcome).toBe("VIOLATED");
  });

  test("projection depth exposes only bounded categories and rejects unsafe probes", () => {
    const ctx = new ProjectionContext();
    const projection = projectValue({ items: [{ id: "safe-a", rank: 1 }, { id: "safe-b", rank: 2 }], enabled: true }, ctx).projection;
    const features = deriveProjectionFeatures({
      projection,
      ctx,
      probes: [
        { label: "items", path: ["items"] },
        { label: "enabled", path: ["enabled"] },
        { label: "missing", path: ["missing"] },
      ],
      relationTruth: { enabled: true },
    });
    expect(features.schemaVersion).toBe("nightwatch.semantic-observation-features.v1");
    expect(features.rows.find((row) => row.label === "items")?.cardinalityClass).toBe("SMALL");
    expect(features.rows.find((row) => row.label === "enabled")?.relationTruthClass).toBe("TRUE");
    expect(JSON.stringify(features)).not.toContain("safe-a");
    expect(JSON.stringify(features)).not.toContain("safe-b");
    expect(() => deriveProjectionFeatures({ projection, ctx, probes: [{ label: "__proto__", path: ["items"] }] })).toThrow("LABEL");
    expect(() => deriveProjectionFeatures({ projection, ctx, probes: [{ label: "unsafe", path: ["constructor"] }] })).toThrow("PROJECTION");
  });

  test("contract-derived synthetic mutants are bounded, replayable, and measured without benign/privacy regressions", () => {
    const relationalContracts = phase20RelationalContracts();
    const differentialContracts = phase20DifferentialContracts();
    const metamorphicRelations = phase20MetamorphicRelations();
    const admitted = admitContractInventory(inventory());
    const fixtures = generateSyntheticFixtures({ candidates: admitted.candidates, relationalContracts, differentialContracts, metamorphicRelations });
    const repeated = generateSyntheticFixtures({ candidates: admitted.candidates, relationalContracts, differentialContracts, metamorphicRelations });
    expect(fixtures).toEqual(repeated);
    expect(fixtures.length).toBeGreaterThanOrEqual(90);
    expect(new Set(fixtures.map((fixture) => fixture.mutationClass))).toEqual(new Set(["BASELINE_VALID", "MISSING_REQUIRED_FIELD", "WRONG_TYPE", "WRONG_ENUM", "LOWER_BOUND_VIOLATION", "UPPER_BOUND_VIOLATION", "RELATIONSHIP_VIOLATION", "AGGREGATE_MISMATCH", "ORDERING_VIOLATION", "DIFFERENTIAL_MISMATCH", "METAMORPHIC_VIOLATION", "BENIGN_ALTERNATIVE"]));
    expect(fixtures.every((fixture) => fixture.schemaVersion === "nightwatch.synthetic-semantic-mutation.v1")).toBe(true);
    expect(fixtures.some((fixture) => fixture.capabilityKind === "SOURCE_CONTRACT" && fixture.mutationClass === "WRONG_ENUM")).toBe(true);
    const measurement = measureSyntheticMutationDetection({ fixtures, candidates: admitted.candidates, relationalContracts, differentialContracts, metamorphicRelations });
    expect(measurement.mutantsGenerated).toBeGreaterThanOrEqual(30);
    expect(measurement.mutantsDetected).toBe(measurement.mutantsApplicable);
    expect(measurement.mutantsSurviving).toBe(0);
    expect(measurement.scorePermille).toBe(1000);
    expect(measurement.benignFalsePositives).toBe(0);
    expect(measurement.replayedDetections).toBe(measurement.mutantsDetected);
    expect(measurement.minimizedDetections).toBe(measurement.mutantsDetected);
    expect(measurement.highConfidenceDetections).toBe(measurement.mutantsDetected);
    expect(PHASE20_SYNTHETIC_PRODUCT_MODEL.syntheticFixtureOnly).toBe(true);
    expect(JSON.stringify(measurement)).not.toContain("safe-a");
    expect(JSON.stringify(measurement)).not.toContain("CUSTOMER_SENTINEL");
  });

  test("the Phase 20 adversarial matrix substantially expands combinations without privacy sentinels", () => {
    expect(PHASE20_ADVERSARIAL_CASES.length).toBeGreaterThanOrEqual(80);
    expect(new Set(PHASE20_ADVERSARIAL_CASES.map((entry) => entry.caseId)).size).toBe(PHASE20_ADVERSARIAL_CASES.length);
    expect(new Set(PHASE20_ADVERSARIAL_CASES.map((entry) => entry.family)).size).toBeGreaterThanOrEqual(12);
    expect(PHASE20_ADVERSARIAL_CASES.filter((entry) => entry.benignControl)).toHaveLength(6);
    expect(PHASE20_ADVERSARIAL_CASES.every((entry) => entry.privacySafe && !entry.caseId.includes("SENTINEL") && !entry.behaviorClass.includes("CUSTOMER"))).toBe(true);
  });

  test("semantic gaps compose through Phase 19 coverage and planner with bounded priority", () => {
    const admitted = admitContractInventory(inventory());
    const relationalContracts = phase20RelationalContracts();
    const differentialContracts = phase20DifferentialContracts();
    const metamorphicRelations = phase20MetamorphicRelations();
    const capabilities = phase20CapabilityBindings();
    const fixtures = generateSyntheticFixtures({ relationalContracts, differentialContracts, metamorphicRelations });
    const measurement = measureSyntheticMutationDetection({ fixtures, relationalContracts, differentialContracts, metamorphicRelations });
    const graph = buildContractGraph({ inventory: admitted });
    const gaps = buildSemanticCoverageGapInputs({ inventory: admitted, graph, capabilityBindings: capabilities, mutationMeasurement: measurement });
    expect(gaps.schemaVersion).toBe("nightwatch.semantic-campaign-integration.v1");
    expect(gaps.rows.length).toBeGreaterThan(0);
    expect(gaps.reasonCounts.MECHANICALLY_PROVABLE_UNCOVERED).toBeGreaterThan(0);
    expect(gaps.rows.every((row) => Object.values(row.priorityComponents).every((value) => value >= 0 && value <= 1000))).toBe(true);
    const sourceCandidateId = relationalContracts[0]!.sourceCandidateId;
    const memberInput = p16Member("phase20.semantic-planner-member", { semanticScope: sourceCandidateId });
    const portfolio = buildPortfolio({ approvedTargets: [memberInput.targetId], memberInputs: [memberInput] });
    const memberId = portfolio.members[0]!.memberId;
    const candidate = admitted.candidates.find((entry) => entry.candidateId === sourceCandidateId)!;
    const impact = buildCampaignImpactReport({
      sourceCurrentness: "SYNTHETIC_ONLY",
      changedFiles: [],
      bindings: [{ memberId, product: "synthetic-phase20-product", surface: "summary-api", journeyClass: "phase20.semantic", semanticContractId: sourceCandidateId, expectationIds: ["expectation.phase20.semantic"], scenarioIds: ["scenario.phase20.semantic"], affectedPathPrefixes: ["synthetic/phase20"], sourceSha: candidate.source.sha, evidenceDigest: candidate.source.evidenceDigest, sourceCurrentness: "SYNTHETIC_ONLY", supported: true, impactClasses: ["COVERAGE_ONLY"] }],
    });
    const capability = capabilities.filter((entry) => entry.sourceCandidateId === sourceCandidateId);
    const coverage = buildPhase20CoverageReport({
      inventory: admitted,
      gapReport: gaps,
      memberBindings: [{ candidateId: sourceCandidateId, memberId, product: "synthetic-phase20-product", surface: "summary-api", expectationId: "expectation.phase20.semantic", scenarioBound: true, replaySupported: capability.some((entry) => entry.replaySupported), replayReproduces: capability.some((entry) => entry.replayReproduces), minimizationSupported: capability.some((entry) => entry.minimizationSupported), triageClassifiable: true, dossierExplainable: true, supported: true }],
      mutationMeasurement: measurement,
    });
    const composed = composeSemanticCampaignPlan({
      portfolio,
      sourceCurrentness: "SYNTHETIC_ONLY",
      impact,
      coverage,
      gapReport: gaps,
      candidateBindings: [{ candidateId: sourceCandidateId, memberId }],
      candidates: [{ memberId, product: "synthetic-phase20-product", surface: "summary-api", journeyClass: "phase20.semantic", apiClass: "summary.read", semanticContractId: sourceCandidateId, oracleFamilies: capability.map((entry) => entry.capabilityKind), applicable: true, supported: true, provenance: ["PHASE20_SYNTHETIC"] }],
      maxSelectedItems: 1,
    });
    expect(composed.plan.schemaVersion).toBe("nightwatch.campaign-plan.v1");
    expect(composed.plan.ownerScopeStatus).toBe("FROZEN_BY_OWNER");
    expect(composed.plan.items[0]!.coverageGapReasons.some((reason) => reason === "REPLAY_GAP" || reason === "MINIMIZATION_GAP" || reason === "MECHANICALLY_PROVABLE_UNCOVERED")).toBe(true);
    expect(composed.plan.items[0]!.selectionReasons).toContain("CAMPAIGN_AUTO_COMPOSED");
  });

  test("source-keyed semantic caches reuse exact evidence and invalidate changed source", () => {
    clearSemanticCoverageCaches();
    const first = discoverContractInventoryCached({ artifacts: PHASE20_SOURCE_ARTIFACTS, currentSnapshots: { "synthetic/phase20-product": PHASE20_SOURCE_SHA } });
    const second = discoverContractInventoryCached({ artifacts: [...PHASE20_SOURCE_ARTIFACTS], currentSnapshots: { "synthetic/phase20-product": PHASE20_SOURCE_SHA } });
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.value).toEqual(first.value);
    const changed = discoverContractInventoryCached({ artifacts: [PHASE20_TYPESCRIPT_ARTIFACT, { ...PHASE20_TYPESCRIPT_ARTIFACT, artifactId: "phase20.changed-source", sha: "0000000000000000000000000000000000000021", sourceText: PHASE20_TYPESCRIPT_ARTIFACT.sourceText.replace("toLowerCase", "toUpperCase") }], currentSnapshots: { "synthetic/phase20-product": PHASE20_SOURCE_SHA } });
    expect(changed.cacheHit).toBe(false);
    const graphFirst = buildContractGraphCached({ inventory: first.value });
    const graphSecond = buildContractGraphCached({ inventory: first.value });
    expect(graphFirst.cacheHit).toBe(false);
    expect(graphSecond.cacheHit).toBe(true);
    expect(semanticCacheStats().inventoryBuilds).toBe(2);
    expect(semanticCacheStats().graphBuilds).toBe(1);
  });

  test("dossier V4 retains derivation, relation, replay, minimality, and coverage evidence without raw values", () => {
    const base = {
      schemaVersion: "nightwatch.owner-dossier.v3",
      dossierId: "dossier:sha256:000000000000000000000001",
      status: "ACTIONABLE",
      behavior: { failureClass: "RELATION_VIOLATED", product: "synthetic-phase20-product", surface: "summary-api", semanticContractId: "contract.phase20", invariantId: "relation.phase20" },
      replay: { outcome: "REPRODUCED_EXACT", deterministic: true, observationEqual: true, occurrenceBinding: "BOUND", divergenceReasons: [] },
      minimization: { proof: "BOUNDED_MINIMAL", minimalActionIds: ["setup", "trigger"], removedOrdinals: [2], probesAttempted: 3 },
      relatedCluster: null,
      limitations: [],
    } as unknown as OwnerDossierV3;
    const dossier = createOwnerDossierV4({
      base,
      derivationChain: [
        { stage: "SOURCE_ARTIFACT", identity: "synthetic/phase20-product:src/contracts/summary.ts" },
        { stage: "SOURCE_EVIDENCE", identity: "ev:sha256:000000000000000000000001" },
        { stage: "CONTRACT_CANDIDATE", identity: "contract.phase20" },
        { stage: "ORACLE", identity: "phase20.total" },
        { stage: "REPLAY_ADAPTER", identity: "phase20.replay.summary" },
        { stage: "MINIMIZER", identity: "phase20.minimize.semantic-subsequence" },
      ],
      relationalRule: "TOTAL_EQUALS_SUM",
      differentialOutcome: null,
      metamorphicOutcome: null,
      violatedSemanticRelation: "TOTAL_DOES_NOT_EQUAL_SUM",
      coverageBeforeFinding: { memberId: "member.phase20", product: "synthetic-phase20-product", surface: "summary-api", semanticContractId: "contract.phase20", expectationId: "expectation.phase20", stages: [], gapReasons: ["RELATIONAL_ORACLE_GAP"], fullyCovered: false },
      stabilityClassification: "STABLE",
      syntheticMutantClass: "AGGREGATE_MISMATCH",
    });
    expect(dossier.schemaVersion).toBe("nightwatch.owner-dossier.v4");
    expect(dossier.contractDerivationChain.some((link) => link.stage === "SOURCE_EVIDENCE")).toBe(true);
    expect(dossier.semanticRule.violatedSemanticRelation).toBe("TOTAL_DOES_NOT_EQUAL_SUM");
    expect(dossier.syntheticMutantClass).toBe("AGGREGATE_MISMATCH");
    expect(JSON.stringify(dossier)).not.toContain("CUSTOMER_SENTINEL");
    expect(JSON.stringify(dossier)).not.toContain("raw");
  });
});
