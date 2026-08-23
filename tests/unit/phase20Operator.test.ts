import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { validateProductAdapter } from "../../src/products";
import { PHASE20_SYNTHETIC_PRODUCT_ADAPTER } from "../../corpus/phase20/contracts";

const ROOT = process.cwd();

function run(command: string): Record<string, unknown> {
  const output = execFileSync(process.execPath, [path.join(ROOT, "bin/nightwatch.mjs"), command, "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return JSON.parse(output) as Record<string, any>;
}

test.describe("Phase 20 local semantic operator workflow", () => {
  test("exposes contracts and graph inventory without registering a real product", () => {
    validateProductAdapter(PHASE20_SYNTHETIC_PRODUCT_ADAPTER);
    expect(PHASE20_SYNTHETIC_PRODUCT_ADAPTER.syntheticFixtureOnly).toBe(true);
    expect(PHASE20_SYNTHETIC_PRODUCT_ADAPTER.surfaces.length).toBeGreaterThanOrEqual(4);
    const output = run("contracts");
    expect(output.scope).toBe("LOCAL_SYNTHETIC_ONLY");
    const inventory = output.inventory as { readonly candidateCount: number; readonly admittedCount: number };
    const graph = output.graph as { readonly nodeCount: number; readonly contractCount: number };
    expect(inventory.candidateCount).toBeGreaterThanOrEqual(20);
    expect(inventory.admittedCount).toBeGreaterThan(0);
    expect(graph.nodeCount).toBeGreaterThan(graph.contractCount);
    expect(JSON.stringify(output)).not.toContain("open");
    expect(JSON.stringify(output)).not.toContain("closed");
  });

  test("ranks semantic gaps and composes a planner preview with no executor", () => {
    const gaps = run("gaps");
    expect(gaps.scope).toBe("LOCAL_SYNTHETIC_ONLY");
    const gapReport = gaps.gaps as { readonly schemaVersion: string; readonly rows: readonly unknown[] };
    const measurement = gaps.mutationMeasurement as { readonly mutantsSurviving: number };
    expect(gapReport.schemaVersion).toBe("nightwatch.semantic-campaign-integration.v1");
    expect(gapReport.rows.length).toBeGreaterThan(0);
    expect(measurement.mutantsSurviving).toBe(0);
    const campaign = run("campaign");
    expect(campaign.execution).toBe("PREVIEW_ONLY_NO_EXECUTOR");
    const plan = campaign.plan as { readonly ownerScopeStatus: string; readonly selectedItems: readonly unknown[] };
    expect(plan.ownerScopeStatus).toBe("FROZEN_BY_OWNER");
    expect(plan.selectedItems.length).toBeGreaterThan(0);
    expect(JSON.stringify(campaign)).not.toContain("CUSTOMER_SENTINEL");
  });
});
