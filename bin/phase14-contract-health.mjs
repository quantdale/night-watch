#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C5: local contract coverage health CLI.
//
// Read-only developer-facing surface. Consumes an injected/disposable source
// snapshot OR a pre-built coverage-inventory JSON and emits a sanitized,
// deterministic contract-health report. Performs NO writes to sibling repos and
// no network/runtime/campaign activity.
//
// Usage:
//   node bin/phase14-contract-health.mjs --inventory=<file.json> [--baseline=<file.json>] [--format=json|text]
//   node bin/phase14-contract-health.mjs --snapshot=<dir> --sha=<sha> [--format=json|text]
//
// Strict unknown-field + privacy-sentinel rejection is enforced on any JSON
// inventory input before a report is produced.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from "./lib/typescript-runtime-loader.mjs";
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from "./lib/operator-cli.mjs";

/** @type {import("./lib/operator-cli.mjs").OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: "phase14-contract-health",
  entry: "bin/phase14-contract-health.mjs",
  purpose: "Render the local Phase 14A contract-coverage health report from a sanitized inventory or snapshot.",
  group: "inspect-intelligence",
  usage: "Nightwatch Phase 14A contract coverage health CLI (local/source-only). Flags: --inventory=<file.json>, --baseline=<file.json>, --snapshot=<dir>, --sha=<sha>, --format=json|text, --help. Reads only; no sibling writes, no network, no campaign.",
  flags: [
    { name: "--inventory", shape: "path", summary: "pre-built coverage inventory JSON" },
    { name: "--baseline", shape: "path", summary: "optional baseline inventory for a delta" },
    { name: "--snapshot", shape: "path", summary: "disposable exact source snapshot directory" },
    { name: "--sha", shape: "string", summary: "current snapshot SHA for the snapshot build" },
    { name: "--format", shape: "enum", values: ["json", "text"], summary: "output format" },
  ],
  authorization: "LOCAL_ONLY",
  artifacts: [],
};

/** @typedef {{ inventory: string | null, baseline: string | null, snapshot: string | null, sha: string | null, format: string, help: boolean }} ContractHealthArgs */

/**
 * @param {ContractHealthArgs} out
 * @param {string} key
 * @param {string | boolean} value
 */
function assign(out, key, value) {
  // Every flag `assign` handles declares a value shape in the operator-CLI
  // metadata, and the shared parser refuses a value-less invocation before
  // `parseArgs` ever runs, so the bare-flag `true` form is unreachable here.
  if (typeof value !== "string") return;
  if (key === "--inventory") out.inventory = value;
  else if (key === "--baseline") out.baseline = value;
  else if (key === "--snapshot") out.snapshot = value;
  else if (key === "--sha") out.sha = value;
  else if (key === "--format") out.format = value;
}

/**
 * @param {readonly string[]} argv
 * @returns {ContractHealthArgs}
 */
function parseArgs(argv) {
  const out = {
    inventory: null,
    baseline: null,
    snapshot: null,
    sha: null,
    format: "json",
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      // --key=value form.
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      assign(out, key, value);
      continue;
    }
    // --key value form (peek next token if it is not another flag).
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      assign(out, arg, next);
      i += 1;
    } else {
      assign(out, arg, true);
    }
  }
  return out;
}

/**
 * @param {string} root
 * @param {string} file
 */
function loadTypeScriptModule(root, file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

/** @param {string} snapshotDir */
function makeSnapshotReader(snapshotDir) {
  const root = path.resolve(snapshotDir);
  return {
    /**
     * @param {string} _repoId
     * @param {string} relativePath
     * @returns {string | null}
     */
    readFile(_repoId, relativePath) {
      if (
        typeof relativePath !== "string" ||
        relativePath.includes("..") ||
        relativePath.includes("\0")
      )
        return null;
      const abs = path.resolve(root, relativePath);
      if (!abs.startsWith(root + path.sep) && abs !== root) return null;
      try {
        return fs.readFileSync(abs, "utf8");
      } catch {
        return null;
      }
    },
  };
}

/** @param {string} file */
function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error(`CONTRACT_HEALTH_INVALID_JSON:${file}`);
  }
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA);
  if (cli.stop) return;
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const reportModule = loadTypeScriptModule(
    root,
    "src/oracles/expectations/extract/contractCoverageReport.ts",
  );
  const {
    sanitizeInventoryInput,
    buildContractCoverageReport,
    renderContractCoverageReportText,
    compareBaselineCoverage,
  } = /** @type {typeof import("./../src/oracles/expectations/extract/contractCoverageReport")} */ (
    reportModule
  );

  let inventory;
  if (args.snapshot !== null) {
    if (args.sha === null) {
      process.stderr.write("ERROR: --snapshot requires --sha\n");
      process.exitCode = 2;
      return;
    }
    const coverageModule = /** @type {typeof import("./../src/oracles/expectations/coverageInventory")} */ (
      loadTypeScriptModule(
        root,
        "src/oracles/expectations/coverageInventory.ts",
      )
    );
    const reader = makeSnapshotReader(args.snapshot);
    const sha = args.sha;
    const currentness = {
      currentSnapshot: () => ({
        repoId: "mobingilabs/ripple-api",
        sha,
      }),
    };
    inventory = coverageModule.buildCoverageInventory({
      reader,
      currentness,
      snapshot: { repoId: "mobingilabs/ripple-api", sha },
      remoteSha: sha,
      canonicalUnchanged: null,
    });
  } else if (args.inventory === null) {
    process.stderr.write(
      "ERROR: provide --inventory=<file.json> or --snapshot=<dir> --sha=<sha>\n",
    );
    process.exitCode = 2;
    return;
  } else {
    const raw = readJsonFile(args.inventory);
    inventory = sanitizeInventoryInput(raw); // strict unknown-field + sentinel rejection
  }

  const report = buildContractCoverageReport({ inventory });

  let baselineDelta = null;
  if (args.baseline !== null) {
    const baselineRaw = readJsonFile(args.baseline);
    const baseline = sanitizeInventoryInput(baselineRaw);
    baselineDelta = compareBaselineCoverage(baseline, inventory);
  }

  if (args.format === "text") {
    let text = renderContractCoverageReportText(report);
    if (baselineDelta !== null) {
      text += "\n\nbaseline delta:\n";
      text += `  additions: ${baselineDelta.additions.length}\n`;
      text += `  strengthenings: ${baselineDelta.strengthenings.length}\n`;
      text += `  depth uplifted: ${baselineDelta.depthUplifted}\n`;
    }
    process.stdout.write(text + "\n");
  } else {
    const payload =
      baselineDelta === null ? report : { ...report, baselineDelta };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `ERROR: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
