#!/usr/bin/env node
/**
 * Phase 19 local operator surface. Every command is offline and synthetic;
 * none accepts --env and none can contact DEV/NEXT/production.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModules as loadRuntimeTypeScriptModules } from "./lib/typescript-runtime-loader.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args[0] ?? "status";
const asJson = args.includes("--json");

const COMMANDS = new Set(["status", "plan", "coverage", "campaign", "contracts", "gaps", "differential", "replay-coverage", "minimization-coverage", "mutation-score", "findings", "explain", "source-scan", "source-gaps", "eligibility-census", "readonly-census", "surfaces", "review-queue", "explain-surface"]);
if (!COMMANDS.has(command)) {
  console.error("NIGHTWATCH_INTELLIGENCE: unknown local command");
  process.exit(2);
}
if (args.some((arg) => arg.startsWith("--env"))) {
  console.error("NIGHTWATCH_INTELLIGENCE: source/operator commands never accept environment execution");
  process.exit(2);
}

/**
 * M6 (7.9/B-17): the synthetic-preview label.
 *
 * The Phase 19-21 previews are deterministic projections of checked-in
 * synthetic fixtures. They answer "what would the campaign plan look like",
 * never "what did the product do". Measured state is `npm run status:local`
 * (and the owner-local stores the Control Center reads), so the label says so
 * rather than leaving the reader to infer it from a scope string.
 */
function labelSyntheticPreview(output) {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) return output;
  const synthetic = output.scope === 'LOCAL_SYNTHETIC_ONLY';
  if (!synthetic) return output;
  return {
    ...output,
    dataOrigin: 'SYNTHETIC_PREVIEW',
    measured: false,
    measuredStateCommand: 'npm run status:local',
    previewNote:
      'This output is a deterministic projection of checked-in synthetic fixtures. It is not a measurement of any product, run, or owner-local store.',
  };
}

function loadTypeScriptModules(files) {
  return loadRuntimeTypeScriptModules(files, { root });
}

function renderJson(value) {
  return JSON.stringify(value, null, 2);
}

function mutationMeasurementSummary(measurement) {
  return {
    schemaVersion: measurement.schemaVersion,
    mutantsGenerated: measurement.mutantsGenerated,
    mutantsApplicable: measurement.mutantsApplicable,
    mutantsDetected: measurement.mutantsDetected,
    mutantsSurviving: measurement.mutantsSurviving,
    benignControls: measurement.benignControls,
    benignFalsePositives: measurement.benignFalsePositives,
    replayedDetections: measurement.replayedDetections,
    minimizedDetections: measurement.minimizedDetections,
    highConfidenceDetections: measurement.highConfidenceDetections,
    scorePermille: measurement.scorePermille,
    survivingMutantIds: measurement.survivingMutantIds,
    survivingContractIds: measurement.survivingContractIds,
    deterministicDigest: measurement.deterministicDigest,
  };
}

function preview() {
  const [portfolioTypes, impactModule, coverageModule, plannerModule, yieldModule] = loadTypeScriptModules([
    "src/core/portfolio/types.ts",
    "src/core/campaignIntelligence/impact.ts",
    "src/core/campaignIntelligence/coverage.ts",
    "src/core/campaignIntelligence/planner.ts",
    "src/core/campaignIntelligence/yield.ts",
  ]);
  const input = {
    targetId: "phase19.synthetic.preview",
    journeyId: null,
    kind: "API",
    semanticScope: "phase19.preview.contract",
    currentness: "CURRENT",
    sourceSha: "0000000000000000000000000000000000000019",
    evidenceDigest: "ev:sha256:000000000000000000000019",
    derivationVersion: "nightwatch.phase19.synthetic.v1",
    contractVersion: "nightwatch.phase19.synthetic.contract.v1",
    depthClass: "TYPE",
    replayable: true,
    executionCostClass: "LOW",
    starvationAgeBuckets: 0,
    historicalYield: { admittedCount: 0, reproducedCount: 0, minimizedCount: 0, distinctClusterCount: 0, dossierReadyCount: 0, duplicateMerges: 0, invalidOrTransient: 0, executionsTotal: 0 },
    ownerBlockedOperations: [],
    phaseFrozen: false,
  };
  const portfolio = portfolioTypes.buildPortfolio({ approvedTargets: [input.targetId], memberInputs: [input] });
  const memberId = portfolio.members[0].memberId;
  const impact = impactModule.buildCampaignImpactReport({
    sourceCurrentness: "SYNTHETIC_ONLY",
    changedFiles: [],
    bindings: [{ memberId, product: "synthetic-preview", surface: "read-only-preview", journeyClass: "preview", semanticContractId: "phase19.preview.contract", expectationIds: ["phase19.preview.expectation"], scenarioIds: ["phase19.preview.scenario"], affectedPathPrefixes: ["synthetic/preview"], sourceSha: input.sourceSha, evidenceDigest: input.evidenceDigest, sourceCurrentness: "SYNTHETIC_ONLY", supported: true, impactClasses: ["COVERAGE_ONLY"] }],
  });
  const coverage = coverageModule.buildCampaignCoverageReport({ facts: [{ memberId, product: "synthetic-preview", surface: "read-only-preview", semanticContractId: "phase19.preview.contract", expectationId: "phase19.preview.expectation", sourceCurrentness: "SYNTHETIC_ONLY", sourceSurfaceExists: true, sourceMechanicallyUnderstood: true, semanticContractAdmitted: true, syntheticDetectionProven: true, scenarioExercisesContract: true, replayAvailable: true, replayReproduces: false, minimizationSupported: true, triageClassifiable: true, dossierExplainable: true, unsupported: false, reasons: [] }] });
  const plan = plannerModule.buildCampaignPlan({ portfolio, sourceCurrentness: "SYNTHETIC_ONLY", impact, coverage, candidates: [{ memberId, product: "synthetic-preview", surface: "read-only-preview", journeyClass: "preview", apiClass: "preview.read", semanticContractId: "phase19.preview.contract", oracleFamilies: ["HTTP_ENVELOPE"], applicable: true, supported: true, provenance: ["PHASE19_LOCAL_PREVIEW"] }] });
  const yieldReport = yieldModule.buildCampaignYieldReport({ outcomes: [] });
  return { portfolio, impact, coverage, plan, yieldReport };
}

function status() {
  const [repoState, localReadiness] = loadTypeScriptModules(["src/core/readiness/repoState.ts", "src/core/readiness/localReadiness.ts"]);
  const summary = localReadiness.summarizeLocalReadiness(repoState.collectLocalReadinessInputFromRepo());
  return { command: "status", scope: "LOCAL_SYNTHETIC_ONLY", safety: "FROZEN_BY_OWNER", readiness: summary };
}

function sourceDiscoveryPreview() {
  const [sourceBoundary, approvedScan, universe, surfacesModule, reviewModule, readonlyModule, populationModule] = loadTypeScriptModules([
    "src/core/source/siblingSource.ts",
    "src/core/source/approvedScan.ts",
    "src/core/source/universe.ts",
    "src/core/source/surfaces.ts",
    "src/core/source/review.ts",
    "src/core/source/readonlyCandidateCensus.ts",
    "src/core/source/populationCompleteness.ts",
  ]);
  const requestedRepo = args.find((arg) => arg.startsWith("--repo="))?.slice("--repo=".length);
  const repositoryIds = requestedRepo === undefined ? undefined : [requestedRepo];
  const config = approvedScan.createApprovedRealSourceScanConfig({ repositoryIds });
  // C-05: the boundary itself enforces the owner-approved set, so a caller
  // that built its own scan config still cannot open an unadmitted repository.
  // M6 (7.8/B-10/C-22): the intelligence surface reads the ONE resolver, so a
  // relocated sibling universe is honoured here exactly as elsewhere.
  const [topology] = loadTypeScriptModules(['src/core/policy/sourceTopology.ts']);
  const repositoriesRoot = topology.resolveSiblingRoot();
  const access = sourceBoundary.createSiblingSourceAccess(repositoriesRoot, {
    admittedRepositoryIds: universe.ownerApprovedRepositoryIds(),
  });
  const discovery = surfacesModule.discoverSourceSurfaces({ access, config });
  const inventory = discovery.inventory;
  const safeInventory = { schemaVersion: inventory.schemaVersion, configDigest: inventory.configDigest, extractorVersion: inventory.extractorVersion, files: inventory.files, repositories: inventory.repositories, counters: inventory.counters, completeness: inventory.completeness, snapshotDigest: inventory.snapshotDigest };
  const safeInventorySummary = { schemaVersion: inventory.schemaVersion, configDigest: inventory.configDigest, extractorVersion: inventory.extractorVersion, repositories: inventory.repositories, counters: inventory.counters, completeness: inventory.completeness, snapshotDigest: inventory.snapshotDigest };
  // Every source projection states the population it measured. Counts printed
  // without this block would silently read as whole-product totals.
  const completeness = populationModule.buildSourcePopulationCompleteness({ operationCompleteness: discovery.operationCompleteness, inventoryCompleteness: inventory.completeness });
  if (command === "source-scan") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, approvedRepositoryIds: config.approvedRepositories.map((repository) => repository.repoId), inventory: safeInventory };
  if (command === "source-gaps") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventorySummary, counters: discovery.counters, gapTaxonomy: discovery.gapTaxonomy, performance: discovery.performance, deterministicDigest: discovery.deterministicDigest };
  if (command === "readonly-census") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventorySummary, candidateCensus: readonlyModule.buildReadOnlyCandidateCensus({ access, discovery }) };
  if (discovery.phase24Inputs.length === 0) return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventory, counters: discovery.counters, operations: discovery.operations, surfaces: discovery.surfaces, portfolio: null, queue: null, note: "NO_MECHANICALLY_PROVABLE_SOURCE_SURFACE" };
  const integration = surfacesModule.analyzeSourceSurfacesIntoPhase24({ access, config, discovery, maxCandidates: 6 });
  const review = reviewModule.buildSourceReviewQueue({ discovery: integration.discovery, portfolio: integration.portfolio, selection: integration.selection });
  if (command === "eligibility-census") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventorySummary, census: integration.eligibilityCensus, performance: integration.discovery.performance };
  if (command === "surfaces") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventory, counters: integration.discovery.counters, operations: integration.discovery.operations, surfaces: integration.discovery.surfaces, gapTaxonomy: integration.discovery.gapTaxonomy, performance: integration.discovery.performance, eligibilityCensus: integration.eligibilityCensus, portfolio: { considered: integration.portfolio.consideredCount, eligible: integration.portfolio.eligibleCount, excluded: integration.portfolio.excludedCount, reasonCodeCoverage: integration.portfolio.reasonCodeCoverage, deterministicDigest: integration.portfolio.deterministicDigest }, deterministicDigest: integration.discovery.deterministicDigest };
  if (command === "review-queue") return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, operationCompleteness: discovery.operationCompleteness, inventory: safeInventory, queue: review };
  // The README documents `--surface=<id>`; the positional form stays for
  // compatibility. The explicit flag wins on conflict; otherwise the first
  // non-flag token after the command is the positional id (flags may
  // precede it in any order). The shape gate below applies unchanged to
  // whichever form supplies the id.
  const explicitSurface = args.find((arg) => arg.startsWith("--surface="))?.slice("--surface=".length) || undefined;
  const positionalSurface = args.slice(1).find((arg) => !arg.startsWith("--"));
  const requestedSurface = explicitSurface || positionalSurface;
  if (requestedSurface === undefined || !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(requestedSurface)) throw new Error("EXPLAIN_SURFACE_ID_UNSAFE");
  return { command, scope: "LOCAL_SOURCE_ONLY", safety: "NO_NETWORK_NO_AUTH_NO_PRODUCT_CONTACT", completeness, requestedSurface, surface: reviewModule.explainSourceSurface({ discovery: integration.discovery, portfolio: integration.portfolio, selection: integration.selection, surfaceId: requestedSurface }), queueDigest: review.deterministicDigest };
}

function phase20Preview() {
  const [corpus, semantic, portfolioTypes, impactModule] = loadTypeScriptModules([
    "corpus/phase20/contracts.ts",
    "src/core/semanticCoverage/index.ts",
    "src/core/portfolio/types.ts",
    "src/core/campaignIntelligence/impact.ts",
  ]);
  const inventory = corpus.phase20Inventory();
  const relationalContracts = corpus.phase20RelationalContracts();
  const differentialContracts = corpus.phase20DifferentialContracts();
  const metamorphicRelations = corpus.phase20MetamorphicRelations();
  const capabilityBindings = corpus.phase20CapabilityBindings();
  const admitted = inventory.candidates.filter((candidate) => candidate.coverage.semanticContractAdmitted);
  const byCandidate = (candidateId) => capabilityBindings.filter((binding) => binding.sourceCandidateId === candidateId);
  const graph = semantic.buildContractGraph({
    inventory,
    expectations: admitted.map((candidate) => ({ contractId: candidate.candidateId, expectationId: `expectation.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, supported: true })),
    projections: admitted.map((candidate) => ({ contractId: candidate.candidateId, projectionId: `projection.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, surfaces: candidate.observationSurfaces, supported: candidate.observationSurfaces.length > 0 })),
    scenarios: admitted.filter((candidate) => byCandidate(candidate.candidateId).length > 0).map((candidate) => ({ contractId: candidate.candidateId, scenarioId: `scenario.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, replaySupported: byCandidate(candidate.candidateId).some((binding) => binding.replaySupported) })),
    oracles: admitted.filter((candidate) => byCandidate(candidate.candidateId).length > 0).map((candidate) => ({ contractId: candidate.candidateId, oracleId: byCandidate(candidate.candidateId)[0].capabilityId, relational: byCandidate(candidate.candidateId).some((binding) => binding.capabilityKind === "RELATIONAL"), differential: byCandidate(candidate.candidateId).some((binding) => binding.capabilityKind === "DIFFERENTIAL") })),
    replays: admitted.filter((candidate) => byCandidate(candidate.candidateId).some((binding) => binding.replaySupported)).map((candidate) => ({ contractId: candidate.candidateId, replayAdapterId: `replay.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, reproduces: byCandidate(candidate.candidateId).some((binding) => binding.replayReproduces) })),
    minimizers: admitted.filter((candidate) => byCandidate(candidate.candidateId).some((binding) => binding.minimizationSupported)).map((candidate) => ({ contractId: candidate.candidateId, minimizerId: `minimizer.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, supported: true })),
    dossiers: admitted.map((candidate) => ({ contractId: candidate.candidateId, dossierId: `dossier.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, explainable: true })),
    differentials: admitted.flatMap((candidate) => byCandidate(candidate.candidateId).filter((binding) => binding.capabilityKind === "DIFFERENTIAL").map((binding) => ({ contractId: candidate.candidateId, pairId: binding.capabilityId, eligible: true }))),
  });
  const fixtures = semantic.generateSyntheticFixtures({ candidates: inventory.candidates, relationalContracts, differentialContracts, metamorphicRelations });
  const measurement = semantic.measureSyntheticMutationDetection({ fixtures, candidates: inventory.candidates, relationalContracts, differentialContracts, metamorphicRelations });
  const gapReport = semantic.buildSemanticCoverageGapInputs({ inventory, graph, capabilityBindings, mutationMeasurement: measurement });
  const primaryCandidate = relationalContracts[0]?.sourceCandidateId ?? admitted[0]?.candidateId;
  let planPreview = null;
  let coverage = null;
  if (primaryCandidate !== undefined) {
    const candidate = inventory.candidates.find((entry) => entry.candidateId === primaryCandidate);
    if (candidate !== undefined) {
      const targetId = "phase20.synthetic.coverage-member";
      const memberInput = {
        targetId,
        journeyId: null,
        kind: "API",
        semanticScope: candidate.candidateId,
        currentness: "CURRENT",
        sourceSha: candidate.source.sha,
        evidenceDigest: candidate.source.evidenceDigest,
        derivationVersion: candidate.source.derivationVersion,
        contractVersion: "nightwatch.phase20.synthetic.contract.v1",
        depthClass: "TYPE",
        replayable: true,
        executionCostClass: "LOW",
        starvationAgeBuckets: 0,
        historicalYield: { admittedCount: 0, reproducedCount: 0, minimizedCount: 0, distinctClusterCount: 0, dossierReadyCount: 0, duplicateMerges: 0, invalidOrTransient: 0, executionsTotal: 0 },
        ownerBlockedOperations: [],
        phaseFrozen: false,
      };
      const portfolio = portfolioTypes.buildPortfolio({ approvedTargets: [targetId], memberInputs: [memberInput] });
      const memberId = portfolio.members[0].memberId;
      const capability = capabilityBindings.filter((binding) => binding.sourceCandidateId === candidate.candidateId);
      const memberBinding = [{ candidateId: candidate.candidateId, memberId, product: "synthetic-phase20-product", surface: "summary-api", expectationId: `expectation.${candidate.candidateId.replace(/[^A-Za-z0-9_.:/-]/g, "_")}`, scenarioBound: true, replaySupported: capability.some((binding) => binding.replaySupported), replayReproduces: capability.some((binding) => binding.replayReproduces), minimizationSupported: capability.some((binding) => binding.minimizationSupported), triageClassifiable: true, dossierExplainable: true, supported: true }];
      coverage = semantic.buildPhase20CoverageReport({ inventory, gapReport, memberBindings: memberBinding, mutationMeasurement: measurement });
      const impact = impactModule.buildCampaignImpactReport({ sourceCurrentness: "SYNTHETIC_ONLY", changedFiles: [], bindings: [{ memberId, product: "synthetic-phase20-product", surface: "summary-api", journeyClass: "phase20.semantic.coverage", semanticContractId: candidate.candidateId, expectationIds: memberBinding.map((binding) => binding.expectationId).filter((value) => value !== null), scenarioIds: ["scenario.phase20.semantic"], affectedPathPrefixes: ["synthetic/phase20"], sourceSha: candidate.source.sha, evidenceDigest: candidate.source.evidenceDigest, sourceCurrentness: "SYNTHETIC_ONLY", supported: true, impactClasses: ["COVERAGE_ONLY"] }] });
      planPreview = semantic.composeSemanticCampaignPlan({ portfolio, sourceCurrentness: "SYNTHETIC_ONLY", impact, coverage, candidates: [{ memberId, product: "synthetic-phase20-product", surface: "summary-api", journeyClass: "phase20.semantic.coverage", apiClass: "summary.read", semanticContractId: candidate.candidateId, oracleFamilies: capability.map((binding) => binding.capabilityKind), applicable: true, supported: true, provenance: ["PHASE20_SYNTHETIC_CONTRACT_GRAPH"] }], gapReport, candidateBindings: [{ candidateId: candidate.candidateId, memberId }], maxSelectedItems: 1 });
    }
  }
  return { inventory, graph, gapReport, measurement, coverage, plan: planPreview, capabilityBindings, syntheticProduct: corpus.PHASE20_SYNTHETIC_PRODUCT_MODEL };
}

function phase21Preview() {
  const [corpus, semantic, adversarial, phase20] = loadTypeScriptModules([
    "corpus/phase21/contracts.ts",
    "src/core/semanticCoverage/index.ts",
    "corpus/phase21/adversarialMatrix.ts",
    "corpus/phase20/contracts.ts",
  ]);
  const inventory = phase20.phase20Inventory();
  const differentialContracts = corpus.phase21DifferentialContracts();
  const metamorphicRelations = [...phase20.phase20MetamorphicRelations(), ...corpus.phase21MetamorphicRelations()];
  const membershipContracts = corpus.phase21MembershipContracts();
  const membershipBindings = corpus.phase21MembershipBindings();
  const relationalContracts = phase20.phase20RelationalContracts();
  const fixtures = semantic.generateSyntheticFixtures({ candidates: inventory.candidates, relationalContracts, differentialContracts, metamorphicRelations, membershipContracts, membershipBindings });
  const firstMeasurement = semantic.measureSyntheticMutationDetection({ fixtures, candidates: inventory.candidates, relationalContracts, differentialContracts, metamorphicRelations, membershipContracts, membershipBindings });
  const lifecycle = semantic.buildSemanticLifecycleReport({ fixtures, measurement: firstMeasurement, differentialContracts });
  const measurement = semantic.measureSyntheticMutationDetection({ fixtures, candidates: inventory.candidates, relationalContracts, differentialContracts, metamorphicRelations, membershipContracts, membershipBindings, lifecycleEvidence: semantic.lifecycleEvidenceRows(lifecycle) });
  const baselineGraph = corpus.phase21BaselineGraph();
  const graph = corpus.phase21CompleteGraph();
  const baselineLedger = semantic.buildSemanticGapClosureLedger({ inventory, graph: baselineGraph });
  const ledger = semantic.rebuildSemanticGapClosureLedger({ baseline: baselineLedger, inventory, graph });
  const differential = semantic.discoverDifferentialPairs({ inventory, evidence: corpus.phase21DifferentialEvidence() });
  const quality = semantic.buildCoverageQualityReport({ inventory, graph, mutationMeasurement: measurement, lifecycle, differential });
  const plan = semantic.planSemanticGapClosure({ inventory, graph: baselineGraph, ledger: baselineLedger, quality });
  const operations = semantic.countSemanticOperations({ fixtures, lifecycle, differential, graph });
  return { inventory, baselineGraph, graph, baselineLedger, ledger, differential, quality, plan, fixtures, measurement, lifecycle, operations, metamorphicAudit: corpus.phase21MetamorphicAudit(), corpusSize: adversarial.PHASE21_FULL_ADVERSARIAL_CASES.length, corpusFamilies: new Set(adversarial.PHASE21_FULL_ADVERSARIAL_CASES.map((entry) => entry.family)).size };
}

function phase21Summary(phase21) {
  return {
    baselineGraph: { nodes: phase21.baselineGraph.nodeCount, edges: phase21.baselineGraph.edgeCount, gaps: phase21.baselineGraph.gaps.length, digest: phase21.baselineGraph.deterministicDigest },
    finalGraph: { nodes: phase21.graph.nodeCount, edges: phase21.graph.edgeCount, gaps: phase21.graph.gaps.length, digest: phase21.graph.deterministicDigest },
    closure: { totalBaselineRecords: phase21.ledger.totalGapCount, gapsClosed: phase21.ledger.closedGapCount, actionable: phase21.ledger.actionableGapCount, irreducible: phase21.ledger.irreducibleGapCount, remainingGraphGaps: phase21.ledger.remainingGapCount, statusCounts: phase21.ledger.statusCounts, reasonCounts: phase21.ledger.reasonCounts },
    differential: { candidates: phase21.differential.candidateCount, pairs: phase21.differential.admittedPairCount, outcomes: phase21.differential.outcomeCounts },
    replay: { attempted: phase21.lifecycle.replayAttempted, exact: phase21.lifecycle.replayReproducedExact, semanticEquivalent: phase21.lifecycle.replayReproducedSemanticEquivalent, representationChangedContractPreserved: phase21.lifecycle.replayRepresentationChangedContractPreserved, gaps: phase21.lifecycle.replayGapCount },
    minimization: { attempted: phase21.lifecycle.minimizationAttempted, supported: phase21.lifecycle.minimizationSupported, proofs: phase21.lifecycle.minimizationProofCounts },
    quality: { counts: phase21.quality.counts, fullLifecycle: phase21.quality.fullLifecycleContractCount },
    mutation: mutationMeasurementSummary(phase21.measurement),
    metamorphic: phase21.metamorphicAudit,
    adversarialCorpus: { cases: phase21.corpusSize, families: phase21.corpusFamilies },
    operations: phase21.operations,
  };
}

try {
  let output;
  if (["source-scan", "source-gaps", "eligibility-census", "readonly-census", "surfaces", "review-queue", "explain-surface"].includes(command)) output = sourceDiscoveryPreview();
  else if (command === "status") output = status();
  else if (["differential", "replay-coverage", "minimization-coverage", "mutation-score"].includes(command)) {
    const phase21 = phase21Preview();
    const summary = phase21Summary(phase21);
    output = command === "differential" ? { command, scope: "LOCAL_SYNTHETIC_ONLY", differential: summary.differential } : command === "replay-coverage" ? { command, scope: "LOCAL_SYNTHETIC_ONLY", replay: summary.replay } : command === "minimization-coverage" ? { command, scope: "LOCAL_SYNTHETIC_ONLY", minimization: summary.minimization } : { command, scope: "LOCAL_SYNTHETIC_ONLY", mutation: summary.mutation };
  } else if (command === "gaps" && (args.includes("--actionable") || args.includes("--irreducible"))) {
    const phase21 = phase21Preview();
    const records = phase21.ledger.records.filter((record) => args.includes("--actionable") ? record.closureStatus === "OPEN_ACTIONABLE" : record.closureStatus.startsWith("IRREDUCIBLE_"));
    output = { command, scope: "LOCAL_SYNTHETIC_ONLY", filter: args.includes("--actionable") ? "ACTIONABLE" : "IRREDUCIBLE", records, summary: phase21Summary(phase21) };
  } else if (command === "plan") {
    const phase21 = phase21Preview();
    const legacy = preview();
    output = { command, scope: "LOCAL_SYNTHETIC_ONLY", ...legacy, phase21: phase21Summary(phase21) };
  } else if (command === "gaps" || command === "contracts" || command === "coverage" || command === "campaign") {
    const phase20 = phase20Preview();
    const phase21 = phase21Preview();
    const summary = phase21Summary(phase21);
    const legacyInventory = { sourceArtifactCount: phase20.inventory.sourceArtifactCount, candidateCount: phase20.inventory.candidates.length, mechanicallyProvableCount: phase20.inventory.mechanicallyProvableCount, admittedCount: phase20.inventory.admittedCount, rejectedCount: phase20.inventory.rejectedCandidateIds.length, rejectionCounts: phase20.inventory.rejectionCounts, deterministicDigest: phase20.inventory.deterministicDigest };
    const legacyGraph = { contractCount: phase20.graph.contractCount, nodeCount: phase20.graph.nodeCount, edgeCount: phase20.graph.edgeCount, gapCount: phase20.graph.gaps.length, deterministicDigest: phase20.graph.deterministicDigest };
    if (command === "contracts") output = { command, scope: "LOCAL_SYNTHETIC_ONLY", inventory: legacyInventory, graph: legacyGraph, phase20: { inventory: legacyInventory, graph: legacyGraph }, phase21: summary };
    else if (command === "gaps") output = { command, scope: "LOCAL_SYNTHETIC_ONLY", gaps: phase20.gapReport, mutationMeasurement: mutationMeasurementSummary(phase20.measurement), graphGaps: phase20.graph.gaps, phase20Baseline: { graphGaps: phase20.graph.gaps, gapReport: phase20.gapReport, mutationMeasurement: mutationMeasurementSummary(phase20.measurement) }, phase21: summary, phase21GapRecords: phase21.ledger.records };
    else if (command === "coverage") output = { command, scope: "LOCAL_SYNTHETIC_ONLY", phase20: phase20.coverage, phase21: summary.quality };
    else output = { command, scope: "LOCAL_SYNTHETIC_ONLY", execution: "PREVIEW_ONLY_NO_EXECUTOR", plan: phase20.plan?.plan ?? null, phase20: { plan: phase20.plan?.plan ?? null, gapReport: phase20.gapReport }, phase21: summary, note: "No browser, API, DEV, NEXT, or production contact is performed by this command." };
  } else if (command === "findings") {
    // M5 (6.14/C-12/B-12): the actionable count is MEASURED from the durable
    // owner-local records, never a constant zero. Only sanitized identity
    // fields cross this surface; no dossier prose, evidence or source is read.
    const [storeMod] = loadTypeScriptModules(["src/core/localInvestigation/agentFindingStore.ts"]);
    let rows = [];
    let storeRoot = null;
    let unavailable = null;
    try {
      const store = new storeMod.AgentFindingStore();
      storeRoot = store.root;
      rows = store.list();
    } catch (error) {
      unavailable = error instanceof Error ? error.message : String(error);
    }
    const perCampaign = new Map();
    for (const record of rows) {
      const entry = perCampaign.get(record.campaignId) ?? { campaignId: record.campaignId, admissions: 0, candidates: [] };
      entry.admissions += 1;
      if (!entry.candidates.includes(record.candidateId)) entry.candidates.push(record.candidateId);
      perCampaign.set(record.campaignId, entry);
    }
    output = {
      command,
      scope: "OWNER_ONLY_LOCAL",
      storeRoot,
      actionableFindings: rows.length,
      perCampaign: [...perCampaign.values()].sort((left, right) => left.campaignId.localeCompare(right.campaignId)),
      records: rows.map((record) => ({
        campaignId: record.campaignId,
        candidateId: record.candidateId,
        dossierId: record.dossierId,
        sources: record.sources.length,
        reproductions: record.reproductionIds.length,
      })),
      unavailable,
      note: "Rows are read from the owner-local agent-finding store; no runtime finding is published by this preview.",
    };
  } else {
    // Flags (e.g. `--json`) may precede the id in any order; the id is the
    // first non-flag token after the command. The shape gate below applies
    // unchanged to whichever token that is.
    const requested = args.slice(1).find((arg) => !arg.startsWith("--"));
    if (requested !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(requested)) throw new Error("EXPLAIN_ID_UNSAFE");
    const result = preview();
    const item = result.plan.items.find((candidate) => candidate.candidateId === requested || candidate.memberId === requested) ?? null;
    output = { command, scope: "LOCAL_SYNTHETIC_ONLY", requestedId: requested ?? null, item, explanation: item === null ? "PLAN_ITEM_NOT_FOUND" : "PRIORITY_COMPONENTS_AND_GATES" };
  }
  // M6 (7.9/B-17/NW-AUD-041/042): every Phase 19-21 preview is labelled as a
  // SYNTHETIC PREVIEW in ONE place. The previews are computed from checked-in
  // synthetic fixtures, so a reader must never mistake them for a measured
  // product state; the label also names where measured state lives.
  const labelled = labelSyntheticPreview(output);
  process.stdout.write(
    asJson
      ? `${renderJson(labelled)}\n`
      : `${command} ${labelled.scope ?? "LOCAL_SYNTHETIC_ONLY"} ${labelled.dataOrigin}\n${renderJson(labelled)}\n`,
  );
} catch (error) {
  const detail = error instanceof Error && /^[A-Z0-9_:-]{1,120}$/.test(error.message) ? error.message : "CONFIG_INVALID";
  console.error(`NIGHTWATCH_INTELLIGENCE_FAILED code=${detail} remediation=Use_checked_in_local_configuration_and_rerun`);
  process.exitCode = 2;
}
