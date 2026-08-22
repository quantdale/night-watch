// ---------------------------------------------------------------------------
// Nightwatch Phase 16H — operator CLI hardening (bin/portfolio.mjs).
//
// Covers ACCEPTANCE MATRIX H01-H07 plus DEF-04 sanitized-error proof:
//   - every subcommand runs green with byte-stable stdout;
//   - malformed inputs fail closed with bounded categorical errors;
//   - no sentinel/secret-shaped text ever reaches stderr;
//   - dev-handoff output stays data-only/inert.
//
// Each invocation compiles the portfolio core (tsc) first, so these tests are
// intentionally few and coarse-grained.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  allocatePortfolioBudget,
  PORTFOLIO_ALLOCATION_VERSION,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import { buildCampaignPlanManifest } from "../../src/core/portfolio/manifest";
import { buildPortfolio } from "../../src/core/portfolio/types";
import { renderDocumentJson } from "../../src/core/portfolio/report";
import {
  P16_APPROVED_BASE,
  P16_TARGET_COMMON,
  P16_TARGET_PAYER,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI = path.join(REPO_ROOT, "bin", "portfolio.mjs");

test.describe.configure({ mode: "serial" });
const SPAWN_TIMEOUT_MS = 180_000;

interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runCli(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    timeout: SPAWN_TIMEOUT_MS,
    cwd: REPO_ROOT,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const SECRET_SHAPES =
  /CUSTOMER_SENTINEL|EMAIL_SENTINEL|Bearer\s|eyJ[A-Za-z0-9_-]{8}\.|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY/;

let workspace: string;

test.beforeAll(() => {
  test.setTimeout(SPAWN_TIMEOUT_MS);
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "phase16h-cli-"));
});

test.afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

function writeManifestPair(): {
  readonly previousPath: string;
  readonly currentPath: string;
  readonly tamperedPath: string;
} {
  const portfolio = buildPortfolio({
    approvedTargets: [...P16_APPROVED_BASE],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "cli.one" }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "cli.two",
        depthClass: "SHAPE",
      }),
      p16Member(P16_APPROVED_BASE[2]!, {
        semanticScope: "cli.stale",
        currentness: "STALE" as const,
      }),
    ],
  });
  const policy: PortfolioBudgetPolicy = {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 3,
    perMemberCeiling: 3,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
  };
  const manifest = buildCampaignPlanManifest({
    portfolio,
    allocation: allocatePortfolioBudget({ portfolio, policy }),
  });
  const previousPath = path.join(workspace, "previous.json");
  const currentPath = path.join(workspace, "current.json");
  const tamperedPath = path.join(workspace, "tampered.json");
  const document = JSON.parse(renderDocumentJson(manifest)) as Record<
    string,
    unknown
  >;
  fs.writeFileSync(previousPath, JSON.stringify(document));
  fs.writeFileSync(currentPath, JSON.stringify(document));
  fs.writeFileSync(
    tamperedPath,
    JSON.stringify({
      ...document,
      totalAllocatedUnits: (document.totalAllocatedUnits as number) + 99,
    }),
  );
  return { previousPath, currentPath, tamperedPath };
}

// H03 — plan is deterministic and authority-inert.
test("H03 plan stdout is byte-identical across repeats and authority-inert", () => {
  const first = runCli(["plan"]);
  const second = runCli(["plan"]);
  expect(first.status).toBe(0);
  expect(first.stderr).toBe("");
  expect(first.stdout).toBe(second.stdout);
  expect(first.stdout).toContain("ownerScope=FROZEN_BY_OWNER");
  expect(first.stdout).toContain("runtimeAuthority=NONE");
});

// H01 — inspect is deterministic.
test("H01 inspect emits stable sanitized member table", () => {
  const first = runCli(["inspect"]);
  const second = runCli(["inspect"]);
  expect(first.status).toBe(0);
  expect(first.stdout).toBe(second.stdout);
  expect(SECRET_SHAPES.test(first.stdout)).toBe(false);
});

// H02 — explain-score exposes bounded components.
test("H02 explain-score lists components deterministically", () => {
  const first = runCli(["explain-score"]);
  const second = runCli(["explain-score"]);
  expect(first.status).toBe(0);
  expect(first.stdout).toBe(second.stdout);
  expect(first.stdout).toContain("SOURCE_MOVEMENT_RELEVANCE");
  expect(first.stdout).toContain("DUPLICATE_PRESSURE");
  expect(SECRET_SHAPES.test(first.stdout)).toBe(false);
});

// H04 — compare-plan classifies no-drift vs drift; tampering fails closed.
test("H04 compare-plan reports identical for equal manifests, rejects tampering", () => {
  const { previousPath, currentPath, tamperedPath } = writeManifestPair();
  const same = JSON.parse(runCli([
    "compare-plan",
    "--previous",
    previousPath,
    "--current",
    currentPath,
  ]).stdout) as { identical: boolean };
  expect(same.identical).toBe(true);

  const tamperedRun = runCli([
    "compare-plan",
    "--previous",
    previousPath,
    "--current",
    tamperedPath,
  ]);
  expect(tamperedRun.status).toBe(1);
  expect(tamperedRun.stderr).toContain("PLAN_MANIFEST_INVALID");
  expect(tamperedRun.stdout).toBe("");

  const missingRun = runCli([
    "compare-plan",
    "--previous",
    path.join(workspace, "does-not-exist.json"),
    "--current",
    currentPath,
  ]);
  expect(missingRun.status).toBe(1);
  expect(missingRun.stderr).toContain("cannot read plan document");
  expect(missingRun.stderr).not.toContain("does-not-exist");
});

// H05 — shadow-simulate is deterministic synthetic-only.
test("H05 shadow-simulate repeats byte-identically with synthetic-only marker", () => {
  const first = runCli(["shadow-simulate"]);
  const second = runCli(["shadow-simulate"]);
  expect(first.status).toBe(0);
  expect(first.stdout).toBe(second.stdout);
  expect(first.stdout).toContain("PLANNER_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD");
  expect(first.stdout).toContain("realWorldBugYieldClaim=false");
});

// H06/I01-I05 — dev-handoff stays inert and separately gated.
test("H06 dev-handoff output pins executable=false and separate-token gate", () => {
  const first = runCli(["dev-handoff"]);
  const second = runCli(["dev-handoff"]);
  expect(first.status).toBe(0);
  expect(first.stdout).toBe(second.stdout);
  const parsed = JSON.parse(first.stdout) as Record<string, unknown>;
  expect(parsed.executable).toBe(false);
  expect(parsed.environmentRestriction).toBe("DEV_ONLY_NEVER_PRODUCTION");
  expect(String(parsed.requiredAuthorizationToken)).toContain(
    "SEPARATE_TOKEN_REQUIRED",
  );
  expect(JSON.stringify(parsed.runtimeObligations)).toContain(
    "NO_PRODUCTION_CONTACT",
  );
});

// DEF-04/H07 — malformed input fails closed WITHOUT echoing raw content.
test("DEF-04 malformed sentinel-bearing input produces sanitized failure only", () => {
  const hostile = path.join(workspace, "hostile.json");
  fs.writeFileSync(
    hostile,
    '{"schemaVersion":"nightwatch.campaign-portfolio.private.v1","approvedTargets":["Bearer abcsecretcookie"],"members":',
  );
  const result = runCli(["inspect", "--input", hostile]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(SECRET_SHAPES.test(result.stderr)).toBe(false);
  // Bounded categorical surface only.
  expect(result.stderr.startsWith("portfolio:")).toBe(true);
  expect(result.stderr.length).toBeLessThan(300);
});

test("H01 unknown subcommand exits with usage and no stdout", () => {
  const result = runCli(["definitely-not-a-subcommand"]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("usage:");
});
