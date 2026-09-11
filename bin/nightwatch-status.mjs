#!/usr/bin/env node
/**
 * Phase 15P A10 — read-only local readiness/status renderer
 * (`npm run status:local`, nightwatch.local-readiness.v1).
 *
 * Thin wrapper: collects the CURRENT repository readiness input through
 * src/core/readiness/repoState.ts (authoritative in-source facts only) and
 * renders the ONE summary model through src/core/readiness/localReadiness.ts.
 * All summarization logic lives in the library; this script never duplicates
 * it.
 *
 * Read-only and offline: no writes, no network, no browser, no persisted
 * checkpoint inspection, no credentials. External CI is reported as its
 * caller-supplied category (UNKNOWN here), never measured live.
 *
 * Output: text (default) or JSON (--json). Exit codes:
 *   0  READY_LOCAL_SYNTHETIC or NOT_APPLICABLE
 *   1  any BLOCKED_* category
 *   2  the status surface itself failed (fail-closed)
 */
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules as loadRuntimeTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { collectOpenWorkInput } from './lib/openspec-ledger.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch-status',
  entry: 'bin/nightwatch-status.mjs',
  purpose: 'Render the local readiness and derived open-work status without writing anything.',
  group: 'inspect-intelligence',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function loadTypeScriptModules(root, files) {
  return loadRuntimeTypeScriptModules(files, { root });
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
try {
  const [repoState, localReadiness, openWork, capabilityLifecycle] = loadTypeScriptModules(REPO_ROOT, [
    'src/core/readiness/repoState.ts',
    'src/core/readiness/localReadiness.ts',
    'src/core/readiness/openWork.ts',
    'src/auth/capabilityLifecycle.ts',
  ]);
  const input = repoState.collectLocalReadinessInputFromRepo();
  // Authenticated-capability metadata only: no browser, no host contact, no
  // cookie value is read to build this section.
  const authReport = capabilityLifecycle.collectAuthCapabilityReport({
    homeDirectory: os.homedir(),
    environmentVariable: process.env.NIGHTWATCH_STORAGE_STATE ?? null,
    selectedEnvironment: process.env.NIGHTWATCH_ENV ?? null,
  });
  const summary = localReadiness.summarizeLocalReadiness({
    ...input,
    authCapability: {
      entries: authReport.entries.map((entry) => ({
        environment: entry.environment,
        present: entry.present,
        state: entry.state,
        captureInstant: entry.captureInstant,
        remainingValidityMs: entry.remainingValidityMs,
        refusalCode: entry.refusalCode,
        blockedLanes: entry.blockedLanes,
      })),
    },
  });
  // G1: one derived open-work report, net of DECLARED_NOT_IN_SCOPE entries.
  const openWorkReport = openWork.deriveOpenWorkReport(collectOpenWorkInput(REPO_ROOT));
  const asJson = process.argv.slice(2).includes('--json');
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ...summary, openWork: openWorkReport }, null, 2)}\n`);
  } else {
    process.stdout.write(
      `${localReadiness.renderLocalReadinessText(summary)}${openWork.renderOpenWorkText(openWorkReport)}`,
    );
  }
  process.exitCode =
    summary.category === 'READY_LOCAL_SYNTHETIC' || summary.category === 'NOT_APPLICABLE' ? 0 : 1;
} catch {
  console.error('READINESS_CLI_FAILED');
  process.exitCode = 2;
}
}
