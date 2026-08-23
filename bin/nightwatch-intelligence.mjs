#!/usr/bin/env node
/**
 * Phase 19 local operator surface. Every command is offline and synthetic;
 * none accepts --env and none can contact DEV/NEXT/production.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args[0] ?? "status";
const asJson = args.includes("--json");

const COMMANDS = new Set(["status", "plan", "coverage", "campaign", "findings", "explain"]);
if (!COMMANDS.has(command)) {
  console.error("NIGHTWATCH_INTELLIGENCE: unknown local command");
  process.exit(2);
}

function loadTypeScriptModules(files) {
  const require = createRequire(import.meta.url);
  const typescript = require("typescript");
  const previous = require.extensions[".ts"];
  require.extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const output = typescript.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }).outputText;
    module._compile(output, filename);
  };
  try {
    return files.map((file) => require(path.join(root, file)));
  } finally {
    if (previous === undefined) delete require.extensions[".ts"];
    else require.extensions[".ts"] = previous;
  }
}

function renderJson(value) {
  return JSON.stringify(value, null, 2);
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

try {
  let output;
  if (command === "status") output = status();
  else if (command === "plan" || command === "coverage") {
    const result = preview();
    output = command === "plan" ? { command, scope: "LOCAL_SYNTHETIC_ONLY", plan: result.plan } : { command, scope: "LOCAL_SYNTHETIC_ONLY", coverage: result.coverage };
  } else if (command === "campaign") {
    const result = preview();
    output = { command, scope: "LOCAL_SYNTHETIC_ONLY", execution: "PREVIEW_ONLY_NO_EXECUTOR", yield: result.yieldReport, note: "No browser, API, DEV, NEXT, or production contact is performed by this command." };
  } else if (command === "findings") {
    output = { command, scope: "OWNER_ONLY_LOCAL", actionableFindings: 0, note: "Runtime findings are not loaded or published by the default operator preview." };
  } else {
    const requested = args[1];
    if (requested !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(requested)) throw new Error("EXPLAIN_ID_UNSAFE");
    const result = preview();
    const item = result.plan.items.find((candidate) => candidate.candidateId === requested || candidate.memberId === requested) ?? null;
    output = { command, scope: "LOCAL_SYNTHETIC_ONLY", requestedId: requested ?? null, item, explanation: item === null ? "PLAN_ITEM_NOT_FOUND" : "PRIORITY_COMPONENTS_AND_GATES" };
  }
  process.stdout.write(asJson ? `${renderJson(output)}\n` : `${command} ${output.scope ?? "LOCAL_SYNTHETIC_ONLY"}\n${renderJson(output)}\n`);
} catch {
  console.error("NIGHTWATCH_INTELLIGENCE_FAILED code=CONFIG_INVALID remediation=Use_checked_in_local_configuration_and_rerun");
  process.exitCode = 2;
}
