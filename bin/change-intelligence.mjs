#!/usr/bin/env node

// Offline Phase 3 shadow selector. It compiles and loads the local pure
// TypeScript core, reads only Git metadata from the six audited repositories,
// and writes sanitized selection metadata. It never fetches, checks out, or
// executes product code. The default window is HEAD -> HEAD (bootstrap shadow)
// so an empty current range is represented honestly rather than fabricated.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildChildEnvironment } from './child-environment.mjs';

const nightwatchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(nightwatchRoot, 'artifacts', 'change-intelligence-shadow', 'current.json');
// The repositories root is NEVER derived from this checkout's own location. A
// writing agent's worktree lives outside the workspace tree (C-00), so
// `resolve(nightwatchRoot, '../..')` resolved to `$HOME/.nightwatch` there and
// every git call failed with ENOENT. Resolution goes through
// DEFAULT_SIBLING_ROOT, with the same NIGHTWATCH_REPOS_ROOT override the rest
// of the toolchain honours.
const compileRoot = path.join(nightwatchRoot, '.tmp-nightwatch', 'change-intelligence');

function run(command, args, cwd = nightwatchRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: buildChildEnvironment(process.env), timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim().slice(0, 300)}`);
  }
  return (result.stdout || '').trim();
}

function compileCore() {
  fs.rmSync(compileRoot, { recursive: true, force: true });
  fs.mkdirSync(compileRoot, { recursive: true });
  run(path.join(root, 'node_modules', '.bin', 'tsc'), [
    'src/core/changeIntelligence/index.ts',
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
  run(path.join(root, 'node_modules', '.bin', 'tsc'), [
    'src/core/source/siblingSource.ts',
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--rootDir', 'src',
    '--outDir', compileRoot,
  ]);
}

function repoPath(repoId) {
  const [org, name] = repoId.split('/');
  if (!org || !name || !/^[a-z0-9._-]+$/i.test(org) || !/^[a-z0-9._-]+$/i.test(name)) {
    throw new Error(`invalid audited repository id: ${repoId}`);
  }
  return path.join(repositoriesRoot, org, name);
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
          ahead = Number.parseInt(parts[0], 10);
          behind = Number.parseInt(parts[1], 10);
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

let repositoriesRoot = null;

async function main() {
  // `--help` is the bounded, side-effect-free observation surface: it prints
  // usage without compiling, reading sibling metadata, or writing a report.
  if (process.argv.slice(2).includes('--help') || process.argv.slice(2).includes('-h')) {
    process.stdout.write('Usage: node bin/change-intelligence.mjs [--help]\nCompiles the local change-intelligence core and writes one sanitized shadow selection report.\n');
    return;
  }
  compileCore();
  const sourceBoundary = await import(pathToFileURL(path.join(compileRoot, 'core', 'source', 'siblingSource.js')).href);
  repositoriesRoot = process.env.NIGHTWATCH_REPOS_ROOT ?? sourceBoundary.DEFAULT_SIBLING_ROOT;
  const core = await import(pathToFileURL(path.join(compileRoot, 'core', 'changeIntelligence', 'index.js')).href);
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
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ outputPath, changesetId: changeset.changesetId, selectedJourneys: selection.selectedJourneys.map((journey) => journey.journeyId), priorityOrder: selection.priorityOrder, fallbackTriggered: selection.fallbackTriggered, dirtyFiles: changeset.dirtyFiles.length }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`change-intelligence shadow failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
