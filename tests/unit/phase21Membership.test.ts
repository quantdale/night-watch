import { expect, test } from "@playwright/test";
import { ProjectionContext } from "../../src/oracles/projections/identity";
import { projectValue } from "../../src/oracles/projections/projector";
import { DEFAULT_PROJECTION_LIMITS } from "../../src/oracles/projections/types";
import { evaluateSourceBoundMembership, type SourceBoundMembershipContract } from "../../src/core/semanticCoverage";

const provenance = {
  repoId: "synthetic-phase21",
  sha: "0000000000000000000000000000000000000021",
  relativePath: "fixtures/membership.ts",
  symbol: "statusContract",
  derivationVersion: "phase21.synthetic.membership.v1",
  evidenceDigest: "ev:sha256:000000000000000000000021",
} as const;

function contract(overrides: Partial<SourceBoundMembershipContract> = {}): SourceBoundMembershipContract {
  return {
    contractId: "phase21.membership.status",
    sourceProvenance: provenance,
    allowedValues: ["category-alpha", "category-beta", "category-gamma"],
    mode: "SET_RELATION",
    ...overrides,
  };
}

function evaluate(value: unknown, membership: SourceBoundMembershipContract = contract(), ctx = new ProjectionContext()) {
  return evaluateSourceBoundMembership({ projection: projectValue(value, ctx).projection, ctx, path: ["items"], contract: membership });
}

test.describe("Phase 21 privacy-safe membership projection", () => {
  test("evaluates scalar and finite-set membership using categories only", () => {
    const scalarCtx = new ProjectionContext();
    const scalar = evaluateSourceBoundMembership({
      projection: projectValue({ status: "category-alpha" }, scalarCtx).projection,
      ctx: scalarCtx,
      path: ["status"],
      contract: contract({ mode: "ALL_ITEMS_ALLOWED" }),
    });
    const outsideCtx = new ProjectionContext();
    const outside = evaluateSourceBoundMembership({
      projection: projectValue({ status: "category-private-probe" }, outsideCtx).projection,
      ctx: outsideCtx,
      path: ["status"],
      contract: contract({ mode: "ALL_ITEMS_ALLOWED" }),
    });
    expect(scalar.result).toBe("ALL_ALLOWED");
    expect(outside.result).toBe("NONE_ALLOWED");
    expect(JSON.stringify(scalar)).not.toContain("category-alpha");
    expect(JSON.stringify(outside)).not.toContain("category-private-probe");
    expect(JSON.stringify(scalar)).not.toContain("entity#");
  });

  test("distinguishes all-allowed, disallowed, exact, subset, and superset sets", () => {
    expect(evaluate({ items: ["category-alpha", "category-beta", "category-gamma"] }).result).toBe("EXACT_ALLOWED_SET");
    expect(evaluate({ items: ["category-alpha", "category-beta"] }).result).toBe("STRICT_SUBSET");
    expect(evaluate({ items: ["category-alpha", "category-beta", "category-gamma", "category-delta"] }).result).toBe("SUPERSET_OR_UNKNOWN_MEMBER");
    expect(evaluate({ items: ["category-alpha", "category-unknown"] }, contract({ mode: "ALL_ITEMS_ALLOWED" })).result).toBe("SOME_DISALLOWED");
    expect(evaluate({ items: ["category-unknown"] }, contract({ mode: "ALL_ITEMS_ALLOWED" })).result).toBe("NONE_ALLOWED");
    expect(evaluate({ items: [] }).result).toBe("NONE_ALLOWED");
    expect(evaluate({ items: ["category-alpha", "category-alpha"] }).result).toBe("AMBIGUOUS");
  });

  test("supports required categories and mutually exclusive groups without exposing members", () => {
    const required = contract({ mode: "REQUIRED_MEMBER", allowedValues: ["category-alpha"], requiredValue: "category-alpha" });
    expect(evaluate({ items: ["category-alpha", "category-beta"] }, required).result).toBe("REQUIRED_MEMBER_PRESENT");
    expect(evaluate({ items: ["category-beta"] }, required).result).toBe("MISSING");
    const exclusive = contract({
      mode: "MUTUALLY_EXCLUSIVE",
      allowedValues: ["category-alpha", "category-beta", "category-gamma"],
      mutuallyExclusiveGroups: [["category-alpha"], ["category-beta"]],
    });
    expect(evaluate({ items: ["category-alpha"] }, exclusive).result).toBe("MUTUALLY_EXCLUSIVE_HOLDS");
    expect(evaluate({ items: ["category-alpha", "category-beta"] }, exclusive).result).toBe("MUTUALLY_EXCLUSIVE_VIOLATED");
  });

  test("fails closed for missing, hostile, truncated, duplicate, and high-cardinality inputs", () => {
    const ctx = new ProjectionContext();
    const projection = projectValue({ items: ["category-alpha"] }, ctx).projection;
    expect(evaluateSourceBoundMembership({ projection, ctx, path: ["missing"], contract: contract() }).result).toBe("MISSING");
    expect(() => evaluateSourceBoundMembership({ projection, ctx, path: ["constructor"], contract: contract() })).toThrow("PATH");
    expect(() => evaluateSourceBoundMembership({ projection, ctx, path: ["items"], contract: contract({ allowedValues: ["category-alpha", "category-alpha"] }) })).toThrow("DUPLICATE_ALLOWED_VALUE");
    expect(() => evaluateSourceBoundMembership({ projection, ctx, path: ["items"], contract: contract({ allowedValues: Array.from({ length: 65 }, (_, index) => `category-${index}`) }) })).toThrow("ALLOWED_SET_CAP");
    const boundedLimits = { ...DEFAULT_PROJECTION_LIMITS, maxArrayItemsInspected: 1 };
    const boundedCtx = new ProjectionContext(boundedLimits);
    const boundedProjection = projectValue({ items: ["category-alpha", "category-beta"] }, boundedCtx, boundedLimits).projection;
    expect(evaluateSourceBoundMembership({ projection: boundedProjection, ctx: boundedCtx, path: ["items"], contract: contract() }).result).toBe("TRUNCATED");
  });

  test("repeated membership probes remain bounded and cannot serialize the ephemeral context", () => {
    const values = ["category-alpha", "category-beta", "category-private-probe", "category-crafted-label"];
    const results = values.map((value, index) => {
      const ctx = new ProjectionContext();
      const projection = projectValue({ status: value }, ctx).projection;
      return evaluateSourceBoundMembership({ projection, ctx, path: ["status"], contract: contract({ contractId: `phase21.membership.probe${index}`, mode: "ALL_ITEMS_ALLOWED" }) });
    });
    expect(results.map((result) => result.result)).toEqual(["ALL_ALLOWED", "ALL_ALLOWED", "NONE_ALLOWED", "NONE_ALLOWED"]);
    const encoded = JSON.stringify(results);
    expect(encoded).not.toContain("category-alpha");
    expect(encoded).not.toContain("category-private-probe");
    expect(encoded).not.toContain("entity#");
    expect(() => JSON.stringify(new ProjectionContext())).toThrow("serialization-forbidden");
  });
});
