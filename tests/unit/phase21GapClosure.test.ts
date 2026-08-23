import { expect, test } from "@playwright/test";
import {
  buildSemanticGapClosureLedger,
  type SemanticGapClosureLedger,
} from "../../src/core/semanticCoverage";
import { phase20Inventory } from "../../corpus/phase20/contracts";
import { phase21BaselineGraph } from "../../corpus/phase21/contracts";

function baselineLedger(): SemanticGapClosureLedger {
  const inventory = phase20Inventory();
  return buildSemanticGapClosureLedger({
    inventory,
    graph: phase21BaselineGraph(),
  });
}

test.describe("Phase 21 exact semantic gap closure ledger", () => {
  test("records the immutable Phase 20 graph baseline one gap at a time", () => {
    const first = baselineLedger();
    const second = baselineLedger();
    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe("nightwatch.semantic-gap-closure.v1");
    expect(first.graphNodeCount).toBe(157);
    expect(first.graphEdgeCount).toBe(151);
    expect(first.totalGapCount).toBe(86);
    expect(first.actionableGapCount).toBe(85);
    expect(first.closedGapCount).toBe(0);
    expect(first.irreducibleGapCount).toBe(1);
    expect(first.classCounts.DIFFERENTIAL_PROJECTION).toBe(20);
    expect(first.classCounts.MECHANICALLY_PROVABLE_UNCOVERED).toBe(16);
    expect(first.classCounts.REPLAY).toBe(18);
    expect(first.classCounts.MINIMIZATION).toBe(15);
    expect(first.classCounts.DUPLICATE_SEMANTIC_COVERAGE).toBe(2);
    expect(first.classCounts.OTHER_GRAPH_GAP).toBe(15);
    expect(first.reasonCounts.ANALYZER_UNSUPPORTED).toBe(1);
    expect(first.records).toHaveLength(first.totalGapCount);
    expect(new Set(first.records.map((record) => record.gapIdentity)).size).toBe(first.totalGapCount);
    expect(first.records.every((record) => record.verificationEvidence.evidenceKind === "PHASE21_BASELINE_GRAPH")).toBe(true);
    expect(JSON.stringify(first)).not.toContain("CUSTOMER_SENTINEL");
    expect(JSON.stringify(first)).not.toContain("ACCOUNT_SENTINEL");
  });

  test("distinguishes source-proof and equivalent-surface blockers from action", () => {
    const ledger = baselineLedger();
    const unsupported = ledger.records.filter((record) => record.closureStatus === "IRREDUCIBLE_SOURCE_PROOF");
    expect(unsupported).toHaveLength(1);
    expect(unsupported[0]!.closureStatus).toBe("IRREDUCIBLE_SOURCE_PROOF");
    expect(unsupported[0]!.closureEligibility).toBe("INELIGIBLE");
    const surface = ledger.records.filter((record) => record.gapClass === "NO_EQUIVALENT_SURFACE");
    expect(surface).toHaveLength(0);
    expect(ledger.records.filter((record) => record.gapClass === "DIFFERENTIAL_PROJECTION").every((record) => record.requiredCapability === "PRIVACY_SAFE_MEMBERSHIP_ORACLE")).toBe(true);
  });

  test("supports deterministic closure overrides without changing gap identity", () => {
    const baseline = baselineLedger();
    const target = baseline.records.find((record) => record.gapClass === "REPLAY");
    expect(target).toBeDefined();
    const rebuilt = buildSemanticGapClosureLedger({
      inventory: phase20Inventory(),
      graph: phase21BaselineGraph(),
      overrides: { [target!.gapIdentity]: { closureStatus: "CLOSED", evidenceKind: "PHASE21_REPLAY_CAMPAIGN" } },
    });
    const closed = rebuilt.records.find((record) => record.gapIdentity === target!.gapIdentity);
    expect(closed?.closureStatus).toBe("CLOSED");
    expect(closed?.gapIdentity).toBe(target!.gapIdentity);
    expect(closed?.verificationEvidence.evidenceKind).toBe("PHASE21_REPLAY_CAMPAIGN");
    expect(rebuilt.closedGapCount).toBe(1);
  });
});
