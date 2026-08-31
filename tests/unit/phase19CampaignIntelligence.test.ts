import { expect, test } from "@playwright/test";
import { syntheticChangeset } from "../../src/core/changeIntelligence/git";
import { selectJourneys, RIPPLE_REPOSITORIES } from "../../src/core/changeIntelligence";
import { buildCampaignCoverageReport } from "../../src/core/campaignIntelligence/coverage";
import { buildCampaignImpactReport } from "../../src/core/campaignIntelligence/impact";
import { buildCampaignPlan } from "../../src/core/campaignIntelligence/planner";
import { buildCampaignYieldReport } from "../../src/core/campaignIntelligence/yield";
import { createReplayFidelityV4 } from "../../src/core/campaignIntelligence/replayV4";
import { minimizeSequenceV2, type ReductionAction } from "../../src/core/campaignIntelligence/minimizationV2";
import { detectNondeterminism } from "../../src/core/campaignIntelligence/stability";
import { clusterFindings, findingClusterIdentity } from "../../src/core/campaignIntelligence/clusterV2";
import { calculateConfidenceV2 } from "../../src/core/campaignIntelligence/confidenceV2";
import { createOwnerDossierV3 } from "../../src/core/campaignIntelligence/dossierV3";
import { campaignDiagnostic } from "../../src/core/campaignIntelligence/diagnostics";
import { buildPortfolio, portfolioMemberId } from "../../src/core/portfolio/types";
import { p16Member, P16_SHA_A, P16_EV_A, P16_TARGET_INVENTORY } from "../../corpus/phase16a/portfolioFixtures";

const FP = "fp:sha256:000000000000000000000001";
const FP_2 = "fp:sha256:000000000000000000000002";
const CONTRACT = "sci:sha256:000000000000000000000001";
const OBS = "obs:sha256:000000000000000000000001";
const OCC = "occ:sha256:000000000000000000000001";
const DEP = "dep:sha256:000000000000000000000001";
const ENV = "env:sha256:000000000000000000000001";
const SEM = "sem:sha256:000000000000000000000001";

function coverageFact(memberId: string, overrides: Partial<Parameters<typeof buildCampaignCoverageReport>[0]["facts"][number]> = {}) {
  return {
    memberId,
    product: "ripple",
    surface: "exchange-read",
    semanticContractId: "contract.exchange.v1",
    expectationId: "expectation.exchange.v1",
    sourceCurrentness: "CURRENT" as const,
    sourceSurfaceExists: true,
    sourceMechanicallyUnderstood: true,
    semanticContractAdmitted: true,
    syntheticDetectionProven: true,
    scenarioExercisesContract: true,
    replayAvailable: true,
    replayReproduces: true,
    minimizationSupported: true,
    triageClassifiable: true,
    dossierExplainable: true,
    unsupported: false,
    reasons: [] as const,
    ...overrides,
  };
}

function replay(overrides: Partial<Parameters<typeof createReplayFidelityV4>[0]> = {}) {
  return createReplayFidelityV4({
    expectedSemanticFindingFingerprint: FP,
    expectedContractIdentity: CONTRACT,
    observedSemanticFindingFingerprint: FP,
    observedContractIdentity: CONTRACT,
    expectedObservationDigest: OBS,
    observedObservationDigest: OBS,
    originalOccurrenceDigest: OCC,
    retainedOccurrenceDigest: OCC,
    originalOccurrenceCount: 2,
    retainedOccurrenceCount: 2,
    occurrenceBinding: "BOUND",
    orderingPreserved: true,
    dependencyStateDigest: DEP,
    environmentInputDigest: ENV,
    semanticStateDigest: SEM,
    sourceCurrentness: "CURRENT",
    terminalStatus: "FAILURE",
    preconditionSatisfied: true,
    environmentDiverged: false,
    noLongerApplicable: false,
    timingSensitive: false,
    executorFailed: false,
    executorNondeterministic: false,
    safetyClean: true,
    repeatedOutcomeClasses: ["FAILURE"],
    ...overrides,
  });
}

function minimization(semanticIdentityBound = true) {
  const actions: ReductionAction[] = [
    { actionId: "setup", ordinal: 0, dependencyKey: null },
    { actionId: "trigger-a", ordinal: 1, dependencyKey: "trigger" },
    { actionId: "trigger-b", ordinal: 2, dependencyKey: "trigger" },
    { actionId: "noise", ordinal: 3, dependencyKey: null },
  ];
  return minimizeSequenceV2({
    original: actions,
    maxProbes: 64,
    semanticIdentityBound,
    probe: (sequence) => {
      const ids = new Set(sequence.map((action) => action.actionId));
      return {
        valid: true,
        preservesFinding: ids.has("setup") && ids.has("trigger-a") && ids.has("trigger-b"),
        outcome: ids.has("setup") && ids.has("trigger-a") && ids.has("trigger-b") ? "REPRODUCES" : "DOES_NOT_REPRODUCE",
        reason: ids.has("setup") && ids.has("trigger-a") && ids.has("trigger-b") ? "SAME_SEMANTIC_FINDING" : "FINDING_NOT_REPRODUCED",
      };
    },
  });
}

test.describe("Phase 19 integrated campaign intelligence", () => {
  test("source impact, coverage gaps, deterministic priority, and explicit exclusions compose", () => {
    const first = p16Member("phase19.ripple.exchange.one", {
      journeyId: "ripple-payer-exchange-read",
      semanticScope: "contract.exchange.v1",
      historicalYield: { distinctClusterCount: 1 },
    });
    const second = p16Member("phase19.ripple.exchange.two", {
      journeyId: "ripple-common-exchange-read",
      semanticScope: "contract.exchange.v2",
      executionCostClass: "HIGH",
      replayable: false,
    });
    const portfolio = buildPortfolio({ approvedTargets: [first.targetId, second.targetId], memberInputs: [first, second] });
    const changeset = syntheticChangeset({
      repoId: RIPPLE_REPOSITORIES[0]!.repoId,
      files: [{ repoId: RIPPLE_REPOSITORIES[0]!.repoId, path: "src/vuex/api/exchangeRatePayer_v2.js", status: "modify" }],
    });
    const selection = selectJourneys(changeset);
    const impact = buildCampaignImpactReport({
      sourceCurrentness: "CURRENT",
      changedFiles: changeset.changedFiles,
      selection,
      knownExpectationIds: ["expectation.exchange.v1", "orphan.expectation"],
      bindings: [
        {
          memberId: portfolio.members[0]!.memberId,
          product: "ripple",
          surface: "exchange-read",
          journeyClass: "ripple-payer-exchange-read",
          semanticContractId: "contract.exchange.v1",
          expectationIds: ["expectation.exchange.v1"],
          scenarioIds: ["scenario.exchange.read"],
          affectedPathPrefixes: ["src/vuex/api"],
          sourceSha: P16_SHA_A,
          evidenceDigest: P16_EV_A,
          sourceCurrentness: "CURRENT",
          supported: true,
          impactClasses: ["CHANGED_CONTRACT", "CHANGED_REQUEST_SHAPE"],
        },
      ],
    });
    expect(impact.affectedContractIds).toEqual(["contract.exchange.v1"]);
    expect(impact.affectedScenarioIds).toEqual(["scenario.exchange.read"]);
    expect(impact.orphanedExpectationIds).toEqual(["orphan.expectation"]);
    expect(impact.selectionDigest).toBe(selection.deterministicDigest);

    const coverage = buildCampaignCoverageReport({ facts: [
      coverageFact(portfolio.members[0]!.memberId),
      coverageFact(portfolio.members[1]!.memberId, {
        semanticContractId: "contract.exchange.v2",
        expectationId: null,
        replayAvailable: false,
        replayReproduces: false,
        minimizationSupported: false,
        dossierExplainable: false,
        reasons: ["CHANGED_CONTRACT", "NO_DETERMINISTIC_REPLAY"],
      }),
    ] });
    const candidates = [
      {
        memberId: portfolio.members[0]!.memberId,
        product: "ripple",
        surface: "exchange-read",
        journeyClass: "ripple-payer-exchange-read",
        apiClass: "exchange.read",
        semanticContractId: "contract.exchange.v1",
        oracleFamilies: ["RELATION", "HTTP_ENVELOPE"],
        applicable: true,
        supported: true,
        provenance: ["synthetic.phase19"],
      },
      {
        memberId: portfolio.members[1]!.memberId,
        product: "ripple",
        surface: "exchange-read-secondary",
        journeyClass: "ripple-common-exchange-read",
        apiClass: "exchange.read",
        semanticContractId: "contract.exchange.v2",
        oracleFamilies: ["RELATION"],
        applicable: true,
        supported: true,
        provenance: ["synthetic.phase19"],
      },
    ] as const;
    const planA = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates, maxSelectedItems: 1 });
    const planB = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates, maxSelectedItems: 1 });
    expect(planA).toEqual(planB);
    expect(planA.selectedItems).toHaveLength(1);
    expect(planA.selectedItems[0]!.sourceImpactReasons).toContain("CHANGED_CONTRACT");
    expect(planA.excludedItems.some((item) => item.exclusionReasons.includes("BUDGET_EXHAUSTED"))).toBe(true);
    expect(planA.ownerScopeStatus).toBe("FROZEN_BY_OWNER");
  });

  test("stale source and missing evidence never become selected priority", () => {
    const member = p16Member("phase19.stale", { semanticScope: "contract.stale.v1" });
    const portfolio = buildPortfolio({ approvedTargets: [member.targetId], memberInputs: [member] });
    const impact = buildCampaignImpactReport({
      sourceCurrentness: "STALE",
      changedFiles: [],
      bindings: [{
        memberId: portfolio.members[0]!.memberId,
        product: "ripple",
        surface: "stale-surface",
        journeyClass: "journey.stale",
        semanticContractId: "contract.stale.v1",
        expectationIds: ["expectation.stale"],
        scenarioIds: ["scenario.stale"],
        affectedPathPrefixes: ["src/stale"],
        sourceSha: P16_SHA_A,
        evidenceDigest: P16_EV_A,
        sourceCurrentness: "STALE",
        supported: true,
        impactClasses: ["CHANGED_CONTRACT"],
      }],
    });
    const coverage = buildCampaignCoverageReport({ facts: [coverageFact(portfolio.members[0]!.memberId, { semanticContractId: "contract.stale.v1", sourceCurrentness: "STALE" })] });
    const plan = buildCampaignPlan({ portfolio, sourceCurrentness: "STALE", impact, coverage, candidates: [] });
    expect(plan.selectedItems).toHaveLength(0);
    expect(plan.excludedItems[0]!.exclusionReasons).toEqual(expect.arrayContaining(["CURRENTNESS_STALE", "STALE_SEMANTIC_AUTHORITY", "MISSING_CANDIDATE_METADATA"]));
  });

  test("priority exposes bounded mechanical signals and diversity defers equivalent duplicates", () => {
    const members = [
      p16Member("phase19.diversity.one", {
        semanticScope: "phase19.diversity.scope.one",
        journeyId: "ripple-payer-exchange-read",
        historicalYield: { distinctClusterCount: 2 },
        starvationAgeBuckets: 1,
      }),
      p16Member("phase19.diversity.two", {
        semanticScope: "phase19.diversity.scope.two",
        journeyId: "ripple-common-exchange-read",
        historicalYield: { distinctClusterCount: 0 },
      }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "phase19.diversity.scope.three",
        journeyId: "ripple-account-inventory",
        historicalYield: { distinctClusterCount: 0 },
      }),
    ];
    const portfolio = buildPortfolio({
      approvedTargets: members.map((member) => member.targetId),
      memberInputs: members,
    });
    const memberIdFor = (targetId: string) => portfolio.members.find((member) => member.input.targetId === targetId)!.memberId;
    const impact = buildCampaignImpactReport({ sourceCurrentness: "CURRENT", changedFiles: [], bindings: [] });
    const coverage = buildCampaignCoverageReport({ facts: members.map((member, index) => coverageFact(memberIdFor(member.targetId), {
      surface: `diversity-surface-${index + 1}`,
      semanticContractId: `contract.diversity.${index + 1}`,
    })) });
    const candidates = [
      {
        memberId: memberIdFor("phase19.diversity.one"),
        product: "ripple",
        surface: "diversity-surface-1",
        journeyClass: "journey.one",
        apiClass: "GET",
        semanticContractId: "contract.diversity.1",
        oracleFamilies: ["RELATION", "HTTP_ENVELOPE"],
        applicable: true,
        supported: true,
        provenance: ["synthetic.phase19"],
        semanticContractCount: 2,
        relationCount: 3,
        proofConfidence: 5,
        diversityDimensions: {
          repository: "repo-a",
          routeFamily: "list",
          entityType: "account",
          semanticInvariant: "invariant-a",
          journeyType: "journey-one",
          interfaceType: "API",
          sourceChangeCluster: "change-a",
        },
        redundancyKey: "same-surface",
      },
      {
        memberId: memberIdFor("phase19.diversity.two"),
        product: "ripple",
        surface: "diversity-surface-2",
        journeyClass: "journey.two",
        apiClass: "GET",
        semanticContractId: "contract.diversity.2",
        oracleFamilies: ["HTTP_ENVELOPE"],
        applicable: true,
        supported: true,
        provenance: ["synthetic.phase19"],
        diversityDimensions: {
          repository: "repo-a",
          routeFamily: "list",
          entityType: "account",
          semanticInvariant: "invariant-a",
          journeyType: "journey-two",
          interfaceType: "API",
          sourceChangeCluster: "change-a",
        },
        redundancyKey: "same-surface",
      },
      {
        memberId: memberIdFor(P16_TARGET_INVENTORY),
        product: "ripple",
        surface: "diversity-surface-3",
        journeyClass: "journey.three",
        apiClass: "BROWSER_READ_ONLY",
        semanticContractId: "contract.diversity.3",
        oracleFamilies: ["COLLECTION"],
        applicable: true,
        supported: true,
        provenance: ["synthetic.phase19"],
        diversityDimensions: {
          repository: "repo-b",
          routeFamily: "detail",
          entityType: "billing-group",
          semanticInvariant: "invariant-b",
          journeyType: "journey-three",
          interfaceType: "BROWSER_READ_ONLY",
          sourceChangeCluster: "change-b",
        },
        redundancyKey: "distinct-surface",
      },
    ] as const;
    const planA = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates, maxSelectedItems: 2 });
    const planB = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates: [...candidates].reverse(), maxSelectedItems: 2 });
    const planC = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates, maxSelectedItems: 2 });
    expect(planA).toEqual(planB);
    expect(planA).toEqual(planC);
    expect(planA.selectedItems).toHaveLength(2);
    expect(new Set(planA.selectedItems.map((item) => item.redundancyKey)).size).toBe(2);
    expect(planA.selectedItems.some((item) => item.redundancyKey === "distinct-surface")).toBe(true);
    expect(planA.excludedItems.some((item) => item.redundancyKey === "same-surface" && item.exclusionReasons.includes("BUDGET_EXHAUSTED"))).toBe(true);
    const dense = planA.items.find((item) => item.memberId === memberIdFor("phase19.diversity.one"))!;
    expect(dense.priority.semanticDensity).toBe(4);
    expect(dense.priority.relationDensity).toBe(3);
    expect(dense.priority.proofConfidence).toBe(5);
    expect(dense.priority.anomalyDensity).toBe(2);
    expect(dense.diversityDimensions?.sourceChangeCluster).toBe("change-a");
    expect(dense.selectionScorePermille).toBeGreaterThan(0);

    const changedMetadata = candidates.map((candidate) => candidate.memberId === memberIdFor("phase19.diversity.one")
      ? { ...candidate, relationCount: 4 }
      : candidate);
    const changedPlan = buildCampaignPlan({ portfolio, sourceCurrentness: "CURRENT", impact, coverage, candidates: changedMetadata, maxSelectedItems: 2 });
    expect(changedPlan.inputDigest).not.toBe(planA.inputDigest);
    expect(changedPlan.deterministicDigest).not.toBe(planA.deterministicDigest);
  });

  test("replay V4 distinguishes exact, semantic equivalent, environment, precondition, stale, and no-longer-applicable", () => {
    expect(replay().outcome).toBe("REPRODUCED_EXACT");
    expect(replay({ observedSemanticFindingFingerprint: FP_2 }).outcome).toBe("REPRODUCED_SEMANTIC_EQUIVALENT");
    expect(replay({ environmentDiverged: true }).outcome).toBe("ENVIRONMENT_DIVERGENCE");
    expect(replay({ preconditionSatisfied: false }).outcome).toBe("PRECONDITION_DIVERGENCE");
    expect(replay({ sourceCurrentness: "STALE" }).outcome).toBe("SOURCE_STALE");
    expect(replay({ noLongerApplicable: true }).outcome).toBe("NO_LONGER_APPLICABLE");
    expect(replay({ orderingPreserved: false }).outcome).toBe("INVALID_REPLAY_PLAN");
  });

  test("reduction search reaches a semantic fixed point and refuses a budget-limited claim", () => {
    const result = minimization(true);
    expect(result.minimalActionIds).toEqual(["setup", "trigger-a", "trigger-b"]);
    expect(result.proof).toBe("SEMANTIC_FIXED_POINT");
    expect(result.removedOrdinals).toEqual([3]);
    const limited = minimizeSequenceV2({
      original: [{ actionId: "a", ordinal: 0, dependencyKey: null }, { actionId: "b", ordinal: 1, dependencyKey: null }],
      maxProbes: 1,
      semanticIdentityBound: true,
      probe: () => ({ valid: true, preservesFinding: true, outcome: "REPRODUCES", reason: "SAME_SEMANTIC_FINDING" }),
    });
    expect(limited.proof).toBe("NOT_PROVEN_MINIMAL");
    expect(limited.budgetExhausted).toBe(true);
  });

  test("bounded repeats classify environment, ordering, timing, source, and genuine instability", () => {
    const observation = (ordinal: number, overrides: Partial<Parameters<typeof detectNondeterminism>[0]["execute"] extends (ordinal: number) => infer O ? O : never> = {}) => ({
      resultIdentity: `result:sha256:00000000000000000000000${ordinal + 1}`,
      normalizedEvidenceDigest: "evidence:sha256:000000000000000000000001",
      semanticReceiptDigest: "receipt:sha256:000000000000000000000001",
      replayOutcome: "REPRODUCED_EXACT",
      findingFingerprint: FP,
      clusterIdentity: "cluster:sha256:000000000000000000000001",
      environmentInputDigest: "env:sha256:000000000000000000000001",
      orderingDigest: "order:sha256:000000000000000000000001",
      timingClass: "NONE" as const,
      sourceCurrentness: "CURRENT",
      ...overrides,
    });
    expect(detectNondeterminism({ repeats: 2, execute: () => observation(0) }).class).toBe("DETERMINISTIC");
    expect(detectNondeterminism({ repeats: 2, execute: (ordinal) => observation(ordinal, { environmentInputDigest: `env:sha256:00000000000000000000000${ordinal + 2}` }) }).class).toBe("ENVIRONMENT_SENSITIVE");
    expect(detectNondeterminism({ repeats: 2, execute: (ordinal) => observation(ordinal, { orderingDigest: `order:sha256:00000000000000000000000${ordinal + 2}` }) }).class).toBe("ORDERING_SENSITIVE");
    expect(detectNondeterminism({ repeats: 2, execute: (ordinal) => observation(ordinal, { timingClass: ordinal === 0 ? "NONE" : "TRANSIENT" }) }).class).toBe("TIMING_SENSITIVE");
    expect(detectNondeterminism({ repeats: 2, execute: (ordinal) => observation(ordinal, { sourceCurrentness: ordinal === 0 ? "CURRENT" : "STALE" }) }).class).toBe("SOURCE_CURRENTNESS_SENSITIVE");
    expect(detectNondeterminism({ repeats: 2, execute: (ordinal) => observation(ordinal, { replayOutcome: ordinal === 0 ? "REPRODUCED_EXACT" : "FAILED" }) }).class).toBe("GENUINELY_NONDETERMINISTIC");
  });

  test("semantic clustering separates invariant identities but merges syntactic reproductions", () => {
    const first = { findingId: "finding.one", semanticContractId: "contract.one", invariantId: "invariant.one", behaviorClass: "RELATION", normalizedFailureLocation: "api.exchange", sourceImpactIdentity: "impact.one", replayFingerprint: FP, minimizedStructureDigest: "min:sha256:000000000000000000000001", protocolClass: "HTTP_200", sourceCurrentness: "CURRENT" } as const;
    const second = { ...first, findingId: "finding.two", normalizedFailureLocation: "api.exchange.alias", replayFingerprint: FP_2, sourceCurrentness: "STALE" };
    const distinct = { ...first, findingId: "finding.three", invariantId: "invariant.two" };
    const groups = clusterFindings([first, second, distinct]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.findingIds.includes("finding.one"))!.duplicateCount).toBe(1);
    expect(findingClusterIdentity(first).clusterId).toBe(findingClusterIdentity(second).clusterId);
    expect(findingClusterIdentity(first).clusterId).not.toBe(findingClusterIdentity(distinct).clusterId);
  });

  test("protocol anomaly clustering is stable across context and approved timing variation", () => {
    const first = {
      findingId: "protocol.one",
      semanticContractId: null,
      invariantId: null,
      behaviorClass: "MALFORMED_JSON",
      normalizedFailureLocation: "api.billinggroups",
      sourceImpactIdentity: "impact.billinggroups",
      replayFingerprint: FP,
      minimizedStructureDigest: null,
      protocolClass: "HTTP_200_BODY_INVALID",
      sourceCurrentness: "CURRENT",
    } as const;
    const equivalent = {
      ...first,
      findingId: "protocol.two",
      sourceCurrentness: "STALE",
      minimizedStructureDigest: "min:sha256:000000000000000000000002",
    } as const;
    const meaningful = { ...first, findingId: "protocol.three", replayFingerprint: FP_2 } as const;
    expect(findingClusterIdentity(first).clusterId).toBe(findingClusterIdentity(equivalent).clusterId);
    expect(findingClusterIdentity(first).clusterId).not.toBe(findingClusterIdentity(meaningful).clusterId);
    expect(clusterFindings([equivalent, first])).toEqual(expect.arrayContaining([
      expect.objectContaining({ duplicateCount: 1, findingIds: ["protocol.one", "protocol.two"] }),
    ]));
  });

  test("confidence V2 and owner dossier retain blockers, limitations, and the next action", () => {
    const confidence = calculateConfidenceV2({
      firstRunEvidence: true,
      exactReplay: true,
      semanticEquivalentReplay: false,
      repeatStability: "DETERMINISTIC",
      minimizationProof: "SEMANTIC_FIXED_POINT",
      sourceCurrentness: "CURRENT",
      oracleAuthoritative: true,
      benignControlPassed: true,
      evidenceComplete: true,
      preconditionStable: true,
    });
    expect(confidence.level).toBe("HIGH");
    const stale = calculateConfidenceV2({
      firstRunEvidence: true,
      exactReplay: true,
      semanticEquivalentReplay: false,
      repeatStability: "DETERMINISTIC",
      minimizationProof: "SEMANTIC_FIXED_POINT",
      sourceCurrentness: "STALE",
      oracleAuthoritative: true,
      benignControlPassed: true,
      evidenceComplete: true,
      preconditionStable: true,
    });
    expect(stale.level).toBe("UNRESOLVED");
    const dossier = createOwnerDossierV3({
      behaviorFailure: "AGGREGATE_RELATION_VIOLATED",
      product: "ripple",
      surface: "exchange-read",
      semanticContractId: "contract.exchange.v1",
      invariantId: "invariant.exchange.total",
      whyTested: ["CHANGED_CONTRACT", "SEMANTIC_COVERAGE_DEFICIT"],
      sourceImpactDigest: "cimpact:sha256:000000000000000000000001",
      sourceImpactReasons: ["CHANGED_CONTRACT"],
      oracleFamilies: ["RELATION"],
      semanticFindingFingerprint: FP,
      firstObservationDigest: FP,
      firstObservationClass: "SEMANTIC_ANOMALY",
      replay: replay(),
      minimization: minimization(),
      confidence,
      cluster: findingClusterIdentity({ findingId: "finding.one", semanticContractId: "contract.exchange.v1", invariantId: "invariant.exchange.total", behaviorClass: "RELATION", normalizedFailureLocation: "api.exchange", sourceImpactIdentity: "impact.one", replayFingerprint: FP, minimizedStructureDigest: null, protocolClass: null, sourceCurrentness: "CURRENT" }),
      coverage: null,
      limitations: [],
      nextHumanVerificationAction: "VERIFY_CONTAINED_READ_ONLY_ROUTE_AND_SEMANTIC_CONTRACT",
    });
    expect(dossier.status).toBe("ACTIONABLE");
    expect(dossier.behavior.semanticContractId).toBe("contract.exchange.v1");
    expect(dossier.nextHumanVerificationAction).toContain("VERIFY");
    expect(JSON.stringify(dossier)).not.toContain("CUSTOMER_SENTINEL");
  });

  test("yield attribution, benign controls, empty plans, and diagnostics remain explicit", () => {
    const outcomes = [
      { candidateId: "candidate.one", scenarioGroup: "group.one", oracleFamilies: ["RELATION"], disposition: "ATTEMPTED", protocolFinding: false, semanticFinding: true, clusterId: "cluster:sha256:000000000000000000000001", replayOutcome: "REPRODUCED_EXACT", minimized: true, confidence: "HIGH", benignControl: false, falsePositive: false, staleSource: false, coverageGained: ["contract.one.replay"] },
      { candidateId: "candidate.two", scenarioGroup: "group.one", oracleFamilies: ["RELATION"], disposition: "ATTEMPTED", protocolFinding: false, semanticFinding: true, clusterId: "cluster:sha256:000000000000000000000001", replayOutcome: "DIVERGED", minimized: false, confidence: "LOW", benignControl: false, falsePositive: false, staleSource: false, coverageGained: [] },
      { candidateId: "candidate.three", scenarioGroup: "group.benign", oracleFamilies: ["RELATION"], disposition: "NO_FINDING", protocolFinding: false, semanticFinding: true, clusterId: null, replayOutcome: "FAILED", minimized: false, confidence: "UNRESOLVED", benignControl: true, falsePositive: true, staleSource: false, coverageGained: [] },
      { candidateId: "candidate.four", scenarioGroup: "group.blocked", oracleFamilies: [], disposition: "SKIPPED_AUTHORITY", protocolFinding: false, semanticFinding: false, clusterId: null, replayOutcome: "NOT_APPLICABLE", minimized: false, confidence: "UNRESOLVED", benignControl: false, falsePositive: false, staleSource: false, coverageGained: [] },
    ] as const;
    const yieldReport = buildCampaignYieldReport({ outcomes });
    const reorderedYieldReport = buildCampaignYieldReport({ outcomes: [...outcomes].reverse() });
    expect(reorderedYieldReport).toEqual(yieldReport);
    expect(yieldReport.uniqueClusters).toBe(1);
    expect(yieldReport.duplicatesRemoved).toBe(1);
    expect(yieldReport.benignControlFalsePositives).toBe(1);
    expect(yieldReport.scenariosSkippedByAuthority).toBe(1);
    expect(yieldReport.coverageGained).toEqual(["contract.one.replay"]);
    expect(yieldReport.deterministicDigest).toMatch(/^cyield:sha256:/);
    const diagnostic = campaignDiagnostic("EMPTY_CAMPAIGN", ["LOCAL_SYNTHETIC", "PLAN"]);
    expect(diagnostic.code).toBe("EMPTY_CAMPAIGN");
    expect(diagnostic.remediation).toContain("coverage");
    expect(() => campaignDiagnostic("EMPTY_CAMPAIGN", ["Bearer SECRET"])).toThrow("CONTEXT_UNSAFE");
    expect(portfolioMemberId(p16Member("phase19.empty"))).toMatch(/^pm:sha256:/);
  });
});
