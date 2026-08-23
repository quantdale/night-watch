import { expect, test } from "@playwright/test";
import { ProjectionContext } from "../../src/oracles/projections/identity";
import { projectValue } from "../../src/oracles/projections/projector";
import {
  compareSurfaceSemantics,
  createSurfaceEquivalenceContract,
  discoverDifferentialPairs,
  type DifferentialAlignmentRule,
} from "../../src/core/semanticCoverage";
import { phase20Inventory } from "../../corpus/phase20/contracts";
import { phase21DifferentialContracts, phase21DifferentialEvidence } from "../../corpus/phase21/contracts";

const source = phase20Inventory().candidates.find((candidate) => candidate.shape?.kind === "FIELD_TYPE")!.source;

function observations(ctx: ProjectionContext, leftValue: unknown, rightValue: unknown) {
  return {
    left: { surfaceId: "API", observationId: "phase21.api", sourceCurrentness: "CURRENT" as const, applicable: true, projection: projectValue(leftValue, ctx).projection },
    right: { surfaceId: "BROWSER", observationId: "phase21.browser", sourceCurrentness: "CURRENT" as const, applicable: true, projection: projectValue(rightValue, ctx).projection },
  };
}

function contractFor(rule: DifferentialAlignmentRule, leftPath: readonly string[], rightPath: readonly string[]) {
  return createSurfaceEquivalenceContract({ equivalenceId: `phase21.alignment.${rule.kind}`, leftSurfaceId: "API", rightSurfaceId: "BROWSER", sourceProvenance: source, sourceCurrentness: "CURRENT", expected: "EQUAL", comparison: "SEMANTIC", leftPath, rightPath, alignmentRule: rule, mechanicallyProven: true });
}

test.describe("Phase 21 differential discovery and alignment", () => {
  test("admits only explicit mechanically proven synthetic pairs", () => {
    const evidence = phase21DifferentialEvidence();
    const report = discoverDifferentialPairs({ inventory: phase20Inventory(), evidence });
    expect(report.schemaVersion).toBe("nightwatch.semantic-differential-pair-discovery.v1");
    expect(report.pairCount).toBe(21);
    expect(report.admittedPairCount).toBe(21);
    expect(report.outcomeCounts.PAIR_ADMITTED).toBe(21);
    expect(report.admittedContracts).toHaveLength(21);
    expect(phase21DifferentialContracts()).toEqual(report.admittedContracts);
    expect(JSON.stringify(report)).not.toContain("CUSTOMER_SENTINEL");
  });

  test("classifies absent/default and scalar/list equivalent representations through fixed rules", () => {
    const scalarRule: DifferentialAlignmentRule = { schemaVersion: "nightwatch.semantic-differential-alignment.v1", kind: "SCALAR_TO_SINGLETON_LIST" };
    const scalarCtx = new ProjectionContext();
    const scalarPair = observations(scalarCtx, { value: "synthetic-category" }, { value: ["synthetic-category"] });
    expect(compareSurfaceSemantics({ contract: contractFor(scalarRule, ["value"], ["value"]), ...scalarPair }).outcome).toBe("SEMANTICALLY_EQUIVALENT");
    const absentRule: DifferentialAlignmentRule = { schemaVersion: "nightwatch.semantic-differential-alignment.v1", kind: "ABSENT_TO_NULL" };
    const absentCtx = new ProjectionContext();
    const absentPair = observations(absentCtx, {}, { value: null });
    expect(compareSurfaceSemantics({ contract: contractFor(absentRule, ["value"], ["value"]), ...absentPair }).outcome).toBe("SEMANTICALLY_EQUIVALENT");
    const setRule: DifferentialAlignmentRule = { schemaVersion: "nightwatch.semantic-differential-alignment.v1", kind: "ORDERED_LIST_TO_SET" };
    const setCtx = new ProjectionContext();
    const setPair = observations(setCtx, { items: ["synthetic-a", "synthetic-b"] }, { items: ["synthetic-b", "synthetic-a"] });
    expect(compareSurfaceSemantics({ contract: contractFor(setRule, ["items"], ["items"]), ...setPair }).outcome).toBe("SEMANTICALLY_EQUIVALENT");
    expect(JSON.stringify(scalarPair)).not.toContain("synthetic-category");
  });

  test("fails closed on missing explicit evidence, stale source, and incompatible rules", () => {
    const inventory = phase20Inventory();
    const candidate = inventory.candidates.find((entry) => entry.coverage.semanticContractAdmitted)!;
    const noEvidence = discoverDifferentialPairs({ inventory, evidence: [] });
    expect(noEvidence.admittedPairCount).toBe(0);
    expect(noEvidence.outcomeCounts.AMBIGUOUS).toBeGreaterThan(0);
    const staleInventory = { ...inventory, candidates: inventory.candidates.map((entry) => entry.candidateId === candidate.candidateId ? { ...entry, currentness: "STALE_SOURCE" as const } : entry) };
    const stale = discoverDifferentialPairs({ inventory: staleInventory, evidence: phase21DifferentialEvidence() });
    expect(stale.outcomeCounts.SOURCE_STALE).toBe(1);
    const unknown = { ...contractFor({ schemaVersion: "nightwatch.semantic-differential-alignment.v1", kind: "SCALAR_TO_SINGLETON_LIST" }, ["value"], ["value"]), alignmentRule: { schemaVersion: "nightwatch.semantic-differential-alignment.v1", kind: "UNKNOWN" } as never };
    const ctx = new ProjectionContext();
    const pair = observations(ctx, { value: "synthetic-category" }, { value: "synthetic-category" });
    expect(compareSurfaceSemantics({ contract: unknown, ...pair }).outcome).toBe("PROJECTION_INCOMPATIBLE");
  });
});
