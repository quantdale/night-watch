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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules as loadRuntimeTypeScriptModules } from './lib/typescript-runtime-loader.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModules(root, files) {
  return loadRuntimeTypeScriptModules(files, { root });
}

try {
  const [repoState, localReadiness] = loadTypeScriptModules(REPO_ROOT, [
    'src/core/readiness/repoState.ts',
    'src/core/readiness/localReadiness.ts',
  ]);
  const input = repoState.collectLocalReadinessInputFromRepo();
  const summary = localReadiness.summarizeLocalReadiness(input);
  const asJson = process.argv.slice(2).includes('--json');
  process.stdout.write(
    asJson ? localReadiness.renderLocalReadinessJson(summary) : localReadiness.renderLocalReadinessText(summary),
  );
  process.exitCode =
    summary.category === 'READY_LOCAL_SYNTHETIC' || summary.category === 'NOT_APPLICABLE' ? 0 : 1;
} catch {
  console.error('READINESS_CLI_FAILED');
  process.exitCode = 2;
}
