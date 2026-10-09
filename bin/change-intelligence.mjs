#!/usr/bin/env node

// Offline Phase 3 shadow selector. It compiles and loads the local pure
// TypeScript core, reads only Git metadata from the six audited repositories,
// and writes sanitized selection metadata. It never fetches, checks out, or
// executes product code. The default window is HEAD -> HEAD (bootstrap shadow)
// so an empty current range is represented honestly rather than fabricated.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const nightwatchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(nightwatchRoot, 'artifacts', 'change-intelligence-shadow', 'current.json');
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
// The repositories root is NEVER derived from this checkout's own location. A
// writing agent's worktree lives outside the workspace tree (C-00), so
// `resolve(nightwatchRoot, '../..')` resolved to `$HOME/.nightwatch` there and
// every git call failed with ENOENT. Resolution goes through
// DEFAULT_SIBLING_ROOT, with the same NIGHTWATCH_REPOS_ROOT override the rest
// of the toolchain honours.
const compileRoot = path.join(nightwatchRoot, '.tmp-nightwatch', 'change-intelligence');

/** @typedef {{ repoId: string, productRole: string, scope: string, checkedOutSha: string, trackingRef: string | null, sourceMapSha: string, readOnlyOnly: boolean }} AuditedRepository */
/** @typedef {AuditedRepository & { observedBranch: string, observedHeadSha: string, observedTrackingSha: string | null, observedAhead: number | null, observedBehind: number | null, observedDirty: boolean, pinnedSourceSha: string, movedOffPin: boolean }} ObservedAuditedRepository */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} [cwd]
 */
function run(command, args, cwd = nightwatchRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: buildChildEnvironment(process.env), timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim().slice(0, 300)}`);
  }
  return (result.stdout || '').trim();
}

/**
 * The exact TypeScript entries the shadow run compiles into `compileRoot`.
 *
 * `src/core/policy/sourceTopology.ts` is one of them because `main()` imports
 * the compiled `core/policy/sourceTopology.js` for the ONE sibling-root
 * resolution: an entry that is imported but never compiled is a hard
 * module-resolution failure at runtime, which is exactly what this list makes
 * impossible.
 */
const COMPILED_ENTRIES = Object.freeze([
  'src/core/changeIntelligence/index.ts',
  'src/core/source/siblingSource.ts',
  'src/core/policy/sourceTopology.ts',
]);

function compileCore() {
  // NW-AUD-007: the offline shadow compile runs the repository's OWN pinned
  // compiler, admitted by the local-toolchain authority BEFORE anything is
  // created or compiled. A missing install, a linked or non-regular compiler
  // entry, or a version that disagrees with the lockfile pin is a refusal,
  // never a package-runner or fetch fallback.
  const { admitLocalTypeScriptCompiler } = loadTypeScriptModule('src/core/policy/localToolchain.ts', { root: nightwatchRoot });
  const admitted = admitLocalTypeScriptCompiler({ repositoryRoot: nightwatchRoot });
  if (!admitted.ok) {
    throw new Error(`LOCAL_TOOLCHAIN_ADMISSION_FAILED:${admitted.failure}`);
  }
  fs.rmSync(compileRoot, { recursive: true, force: true });
  fs.mkdirSync(compileRoot, { recursive: true });
  for (const entry of COMPILED_ENTRIES) {
    // The exact same Node runtime drives the exact repository-pinned
    // compiler; there is no PATH lookup and no shim.
    run(process.execPath, [
      ...admitted.toolchain.argv,
      entry,
      '--target', 'ES2022',
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--esModuleInterop',
      '--skipLibCheck',
      // rootDir is PINNED rather than inferred. tsc derives its own root from the
      // common ancestor of every file it actually pulls in, so the emitted entry
      // point MOVES whenever the entry module gains a transitive import outside
      // its own directory. That is what silently broke this script: `baseline.ts`,
      // `git.ts` and `selection.ts` import from `../campaign`, `../process` and
      // `../identity`, which moved the inferred root to `src/core` and the entry
      // to `<out>/changeIntelligence/index.js` while this file still imported
      // `<out>/index.js`. Pinning the root to `src` makes the emitted layout a
      // function of the source path alone, and an import from outside `src` now
      // fails loudly instead of relocating the entry point.
      '--rootDir', 'src',
      '--outDir', compileRoot,
    ]);
  }
}

/**
 * NW-AUD-009: the caller's exact schema validator for the shadow selection
 * report. The publication boundary admits nothing this shape does not carry,
 * before any filesystem change.
 *
 * @param {unknown} payload
 */
function validateShadowReport(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('REPORT_NOT_AN_OBJECT');
  const report = /** @type {Record<string, unknown>} */ (payload);
  if (report.mode !== 'SHADOW') throw new Error('REPORT_MODE_INVALID');
  if (report.freshness !== 'LOCAL_TRACKING_REF_ONLY') throw new Error('REPORT_FRESHNESS_INVALID');
  if (typeof report.generatedAt !== 'string') throw new Error('REPORT_GENERATED_AT_INVALID');
  if (typeof report.deploymentStatus !== 'string') throw new Error('REPORT_DEPLOYMENT_STATUS_INVALID');
  if (report.changeset === null || typeof report.changeset !== 'object' || Array.isArray(report.changeset)) throw new Error('REPORT_CHANGESET_INVALID');
  if (report.selection === null || typeof report.selection !== 'object' || Array.isArray(report.selection)) throw new Error('REPORT_SELECTION_INVALID');
  if (!Array.isArray(report.reviewedRepositories)) throw new Error('REPORT_REPOSITORIES_INVALID');
  if (report.execution === null || typeof report.execution !== 'object' || Array.isArray(report.execution)) throw new Error('REPORT_EXECUTION_INVALID');
  const execution = /** @type {Record<string, unknown>} */ (report.execution);
  // Shadow mode never invokes DEV; a report that claims otherwise is refused.
  if (execution.invoked !== false) throw new Error('REPORT_EXECUTION_INVOKED_INVALID');
}

/**
 * NW-AUD-009: publish the sanitized shadow report through the ONE governed
 * local-report boundary — complete admission in memory, then same-directory
 * exclusive staging and an atomic replace, so an observer sees the previous
 * complete report or the new complete report, never a truncated intermediate,
 * and a symlinked or non-regular destination is refused rather than followed.
 *
 * @param {Record<string, unknown>} report
 * @returns {string} the published absolute path
 */
function publishReport(report) {
  const { publishLocalReport } = loadTypeScriptModule('src/core/policy/localReportPublication.ts', { root: nightwatchRoot });
  const published = publishLocalReport({
    profile: 'CURRENT_REPLACE',
    payload: report,
    validate: validateShadowReport,
    maxBytes: MAX_REPORT_BYTES,
    destination: outputPath,
    digest: (canonical) => `sha256:${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24)}`,
  });
  if (!published.ok) throw new Error(`LOCAL_REPORT_PUBLICATION_FAILED:${published.failure}`);
  return published.path;
}

/**
 * @param {string} repoId
 */
function repoPath(repoId) {
  const [org, name] = repoId.split('/');
  if (!org || !name || !/^[a-z0-9._-]+$/i.test(org) || !/^[a-z0-9._-]+$/i.test(name)) {
    throw new Error(`invalid audited repository id: ${repoId}`);
  }
  return path.join(/** @type {string} */ (repositoriesRoot), org, name);
}

/**
 * Observe the CURRENT Git state of an audited repository.
 *
 * C-05: `branch`, `trackingSha`, `ahead`, `behind` and `dirty` used to come
 * from the persisted dependency map, and this report published them under
 * `freshness: LOCAL_TRACKING_REF_ONLY` — a provenance label it did not have,
 * because it had read a literal rather than a ref. Measured at the time, 10 of
 * 18 of those persisted fields had diverged from live: this report claimed
 * `mobingilabs/ouchan` was 25 behind while it was actually 310 behind.
 *
 * They are now derived here, from LOCAL refs only. No fetch is performed, so
 * the `LOCAL_TRACKING_REF_ONLY` label is exactly what it says: the comparison
 * is against whatever the last fetch left in the local ref.
 *
 * `checkedOutSha` on the definition stays a PIN and is not overwritten; the
 * live revision is reported separately, so a checkout that has moved off its
 * pin is visible instead of silently rebinding.
 * @param {AuditedRepository} repo
 */
function observedRepo(repo) {
  const root = repoPath(repo.repoId);
  const headSha = run('git', ['rev-parse', 'HEAD'], root);
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], root);
  const status = run('git', ['status', '--porcelain'], root);
  let trackingSha = null;
  let ahead = null;
  let behind = null;
  if (repo.trackingRef !== null) {
    // A missing local tracking ref stays UNKNOWN rather than becoming zero
    // divergence, because "not measured" and "not behind" are different facts.
    const resolved = spawnSync('git', ['rev-parse', repo.trackingRef], { cwd: root, encoding: 'utf8', env: buildChildEnvironment(process.env), timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    if (resolved.status === 0 && typeof resolved.stdout === 'string' && resolved.stdout.trim().length > 0) {
      trackingSha = resolved.stdout.trim();
      const counts = spawnSync('git', ['rev-list', '--left-right', '--count', `HEAD...${repo.trackingRef}`], { cwd: root, encoding: 'utf8', env: buildChildEnvironment(process.env), timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
      if (counts.status === 0 && typeof counts.stdout === 'string') {
        const parts = counts.stdout.trim().split(/\s+/);
        if (parts.length === 2) {
          ahead = Number.parseInt(/** @type {string} */ (parts[0]), 10);
          behind = Number.parseInt(/** @type {string} */ (parts[1]), 10);
          if (!Number.isSafeInteger(ahead) || !Number.isSafeInteger(behind)) { ahead = null; behind = null; }
        }
      }
    }
  }
  return {
    ...repo,
    observedBranch: branch,
    observedHeadSha: headSha,
    observedTrackingSha: trackingSha,
    observedAhead: ahead,
    observedBehind: behind,
    observedDirty: status.length > 0,
    pinnedSourceSha: repo.checkedOutSha,
    movedOffPin: headSha !== repo.checkedOutSha,
  };
}

/**
 * A-12 / 10.2: the shared operator-CLI contract. The surface declares no flags:
 * `--help` and `--print-metadata` answer through the shared parser without
 * compiling, reading sibling metadata or writing a report, and any other
 * argument is refused with exit 2.
 */
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'change-intelligence',
  entry: 'bin/change-intelligence.mjs',
  purpose: 'Compile the local change-intelligence core and write one sanitized shadow selection report. Shadow mode never invokes DEV.',
  group: 'inspect-intelligence',
  flags: [],
  json: false,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/change-intelligence-shadow/current.json'],
};

const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });

 /** @type {string | null} */
let repositoriesRoot = null;

async function main() {
  // The shared parser above owns --help/--print-metadata and refuses anything
  // else, so reaching here means the argv was empty.
  compileCore();
  // M6 (7.8/B-10/C-22): the ONE sibling-root resolution.
  const topologyModule = await import(pathToFileURL(path.join(compileRoot, 'core', 'policy', 'sourceTopology.js')).href);
  repositoriesRoot = topologyModule.resolveSiblingRoot();
  const core = await import(pathToFileURL(path.join(compileRoot, 'core', 'changeIntelligence', 'index.js')).href);
  /** @type {ObservedAuditedRepository[]} */
  const repos = core.RIPPLE_REPOSITORIES.map(observedRepo);
  const changesets = repos.map((repo) => core.collectChangeset({
    repoPath: repoPath(repo.repoId),
    repoId: repo.repoId,
    baseSha: repo.observedHeadSha,
    headSha: repo.observedHeadSha,
    source: 'COMMITTED_UPSTREAM_CHANGE',
    sourceWindow: 'COMMITTED_ONLY',
    generatedAt: new Date('2026-08-12T00:00:00.000Z'),
  }));
  const changeset = core.combineChangesets(changesets, new Date('2026-08-12T00:00:00.000Z'));
  const selection = core.selectJourneys(changeset, { repos });
  const report = {
    mode: 'SHADOW',
    generatedAt: '2026-08-12T00:00:00.000Z',
    freshness: 'LOCAL_TRACKING_REF_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
    changeset,
    selection,
    reviewedRepositories: repos.map((repo) => ({
      repoId: repo.repoId,
      // Observed live from local refs at report time.
      branch: repo.observedBranch,
      checkedOutSha: repo.observedHeadSha,
      trackingRef: repo.trackingRef,
      trackingSha: repo.observedTrackingSha,
      ahead: repo.observedAhead,
      behind: repo.observedBehind,
      dirty: repo.observedDirty,
      // Pinned, and whether the checkout has moved off it.
      pinnedSourceSha: repo.pinnedSourceSha,
      movedOffPin: repo.movedOffPin,
      sourceMapSha: repo.sourceMapSha,
      readOnlyOnly: true,
    })),
    execution: { invoked: false, reason: 'Shadow mode does not invoke DEV.' },
  };
  publishReport(report);
  process.stdout.write(`${JSON.stringify({ outputPath, changesetId: changeset.changesetId, selectedJourneys: selection.selectedJourneys.map(/** @param {{ journeyId: string }} journey */ (journey) => journey.journeyId), priorityOrder: selection.priorityOrder, fallbackTriggered: selection.fallbackTriggered, dirtyFiles: changeset.dirtyFiles.length }, null, 2)}\n`);
}

if (cli.ok !== true || cli.stop === true) {
  // The shared parser answered --help/--print-metadata or refused an argument;
  // nothing was compiled and no report was written.
} else {
  main().catch((error) => {
    process.stderr.write(`change-intelligence shadow failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
