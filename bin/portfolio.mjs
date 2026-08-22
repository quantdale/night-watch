#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — local read-only portfolio operator CLI.
//
// Subcommands (all deterministic, sanitized, stdout-only):
//   inspect          — member table over the demo portfolio or an input JSON
//   explain-score    — per-member component contributions
//   plan             — deterministic budget allocation + campaign-plan manifest
//   compare-plan     — diff two plan manifests (--previous/--current JSON)
//   shadow-simulate  — baseline-vs-optimized shadow backtest (synthetic only)
//   dev-handoff      — separately owner-gated DEV handoff package (NOT executed)
//
// This tool is READ-ONLY: it never executes a campaign, never touches
// DEV/NEXT/production, never queries databases, and never writes artifacts.
// The produced plan carries no runtime authority; execution requires a
// separately granted owner authorization.
//
// Usage: node bin/portfolio.mjs <subcommand> [--input <portfolio.json>] [--compact]
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { buildChildEnvironment } from "./child-environment.mjs";

const nightwatchRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const compileRoot = path.join(
  nightwatchRoot,
  ".tmp-nightwatch",
  "phase16a-portfolio",
);

function fail(message) {
  console.error(`portfolio: ${message}`);
  process.exit(1);
}

function compileCore() {
  fs.rmSync(compileRoot, { recursive: true, force: true });
  fs.mkdirSync(compileRoot, { recursive: true });
  const result = spawnSync(
    "npx",
    [
      "tsc",
      // Two entry roots -> outDir preserves src/... and corpus/... paths.
      "src/core/portfolio/index.ts",
      "corpus/phase16a/portfolioFixtures.ts",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--esModuleInterop",
      "--skipLibCheck",
      // Parity with tsconfig.json: the portfolio layer relies on strict
      // discriminated-union narrowing; non-strict compiles widen boolean
      // literals and break eligibility handling.
      "--strict",
      "--noUncheckedIndexedAccess",
      "--outDir",
      compileRoot,
    ],
    {
      cwd: nightwatchRoot,
      encoding: "utf8",
      env: buildChildEnvironment(process.env),
      timeout: 180_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `core compile failed: ${(result.stderr || result.stdout || "").trim().slice(0, 500)}`,
    );
  }
}

async function loadCore() {
  compileCore();
  return import(
    pathToFileURL(path.join(compileRoot, "src/core/portfolio/index.js")).href
  );
}

async function loadFixtures() {
  compileCore();
  return import(
    pathToFileURL(
      path.join(compileRoot, "corpus/phase16a/portfolioFixtures.js"),
    ).href
  );
}

/** Build the demo portfolio (fixture-derived; synthetic identities only). */
function demoPortfolio(core, fixtures) {
  return core.buildPortfolio({
    approvedTargets: fixtures.P16_APPROVED_EXTENDED,
    memberInputs: fixtures.buildDemoPortfolioInput().memberInputs,
  });
}

/** Portfolio from --input JSON (strict parse, fail closed) or demo. */
function inputPortfolio(core, args) {
  const inputPath = args.get("--input");
  if (!inputPath) return null;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  } catch (error) {
    fail(`cannot read/parse --input ${inputPath}: ${error.message}`);
  }
  try {
    return core.parsePortfolioDocument(raw);
  } catch (error) {
    fail(`invalid portfolio document: ${error.message}`);
  }
  return null;
}

function defaultPolicy() {
  return {
    policyVersion: "nightwatch.portfolio-allocation.v1",
    totalUnits: 24,
    perMemberCeiling: 6,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 3,
  };
}

const SUBCOMMANDS = new Set([
  "inspect",
  "explain-score",
  "plan",
  "compare-plan",
  "shadow-simulate",
  "dev-handoff",
]);

async function main() {
  const argv = process.argv.slice(2);
  const subcommand = argv[0];
  if (!SUBCOMMANDS.has(subcommand)) {
    fail(
      `usage: node bin/portfolio.mjs <${[...SUBCOMMANDS].join("|")}> [--input portfolio.json] [--previous plan.json] [--current plan.json]`,
    );
  }
  const args = new Map();
  for (let index = 1; index < argv.length - 1; index += 2) {
    if (argv[index]?.startsWith("--")) args.set(argv[index], argv[index + 1]);
  }

  const core = await loadCore();

  if (subcommand === "inspect") {
    const portfolio =
      inputPortfolio(core, args) ?? demoPortfolio(core, await loadFixtures());
    process.stdout.write(core.renderPortfolioInspect(portfolio));
    return;
  }

  if (subcommand === "explain-score") {
    const portfolio =
      inputPortfolio(core, args) ?? demoPortfolio(core, await loadFixtures());
    for (const member of portfolio.members) {
      const score = core.scorePortfolioMember(member, null);
      for (const line of core.explainScoreLines(
        score,
        member.duplicatePressure,
      )) {
        process.stdout.write(line + "\n");
      }
    }
    return;
  }

  if (subcommand === "plan" || subcommand === "dev-handoff") {
    const portfolio =
      inputPortfolio(core, args) ?? demoPortfolio(core, await loadFixtures());
    const allocation = core.allocatePortfolioBudget({
      portfolio,
      policy: defaultPolicy(),
    });
    const manifest = core.buildCampaignPlanManifest({ portfolio, allocation });
    if (subcommand === "plan") {
      process.stdout.write(core.renderPlan(manifest));
      process.stdout.write("---\n" + core.renderDocumentJson(manifest) + "\n");
      return;
    }
    const handoff = core.buildDevHandoffPackage(
      manifest,
      portfolio.portfolioDigest,
    );
    process.stdout.write(core.renderDocumentJson(handoff) + "\n");
    return;
  }

  if (subcommand === "compare-plan") {
    const previousPath = args.get("--previous");
    const currentPath = args.get("--current");
    if (!previousPath || !currentPath)
      fail(
        "compare-plan requires --previous <plan.json> --current <plan.json>",
      );
    const readJson = (value) => {
      try {
        return JSON.parse(fs.readFileSync(path.resolve(value), "utf8"));
      } catch (error) {
        return fail(`cannot read ${value}: ${error.message}`);
      }
    };
    const comparison = core.comparePlanManifests(
      readJson(previousPath),
      readJson(currentPath),
    );
    process.stdout.write(JSON.stringify(comparison, null, 2) + "\n");
    return;
  }

  // shadow-simulate
  const fixtures = await loadFixtures();
  const portfolio = inputPortfolio(core, args) ?? demoPortfolio(core, fixtures);
  const yieldModels = {};
  for (const member of portfolio.members) {
    yieldModels[member.memberId] = core.yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: Math.max(
        1,
        member.input.historicalYield.distinctClusterCount,
      ),
      duplicatePressure: member.duplicatePressure,
      replayable: member.input.replayable,
    });
  }
  const allocation = core.allocatePortfolioBudget({
    portfolio,
    policy: defaultPolicy(),
  });
  const result = core.runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels,
    starvationThresholdBuckets: defaultPolicy().starvationThresholdBuckets,
  });
  process.stdout.write(core.renderSimulation(result));
  process.stdout.write("---\n" + core.renderDocumentJson(result) + "\n");
}

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
