#!/usr/bin/env node

// Offline Phase 3 shadow selector. It compiles and loads the local pure
// TypeScript core, reads only Git metadata from the six audited repositories,
// and writes sanitized selection metadata. It never fetches, checks out, or
// executes product code. The default window is HEAD -> HEAD (bootstrap shadow)
// so an empty current range is represented honestly rather than fabricated.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const nightwatchRoot = process.cwd();
const workspaceRoot = path.resolve(nightwatchRoot, '../..');
const outputPath = path.join(nightwatchRoot, 'artifacts', 'change-intelligence-shadow', 'current.json');
const compileRoot = path.join(nightwatchRoot, '.tmp-nightwatch', 'change-intelligence');

function run(command, args, cwd = nightwatchRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim().slice(0, 300)}`);
  }
  return (result.stdout || '').trim();
}

function compileCore() {
  fs.rmSync(compileRoot, { recursive: true, force: true });
  fs.mkdirSync(compileRoot, { recursive: true });
  run('npx', [
    'tsc',
    'src/core/changeIntelligence/index.ts',
    '--target', 'ES2022',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir', compileRoot,
  ]);
}

function repoPath(repoId) {
  const [org, name] = repoId.split('/');
  if (!org || !name || !/^[a-z0-9._-]+$/i.test(org) || !/^[a-z0-9._-]+$/i.test(name)) {
    throw new Error(`invalid audited repository id: ${repoId}`);
  }
  return path.join(workspaceRoot, 'REPOSITORIES', org, name);
}

function actualRepo(repo) {
  const root = repoPath(repo.repoId);
  const checkedOutSha = run('git', ['rev-parse', 'HEAD'], root);
  const status = run('git', ['status', '--porcelain'], root);
  return { ...repo, checkedOutSha, dirty: status.length > 0 };
}

async function main() {
  compileCore();
  const core = await import(pathToFileURL(path.join(compileRoot, 'index.js')).href);
  const repos = core.RIPPLE_REPOSITORIES.map(actualRepo);
  const changesets = repos.map((repo) => core.collectChangeset({
    repoPath: repoPath(repo.repoId),
    repoId: repo.repoId,
    baseSha: repo.checkedOutSha,
    headSha: repo.checkedOutSha,
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
      branch: repo.branch,
      checkedOutSha: repo.checkedOutSha,
      trackingRef: repo.trackingRef,
      trackingSha: repo.trackingSha,
      ahead: repo.ahead,
      behind: repo.behind,
      dirty: repo.dirty,
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
