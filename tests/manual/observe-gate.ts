// ---------------------------------------------------------------------------
// Phase 2A local pre-real-run gate harness.
//
// This is intentionally under tests/manual and is invoked explicitly by
// bin/observe-gate.mjs. It starts no browser context. The Playwright global
// setup supplies only the mandatory loopback proxy runtime.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { selectEnvironment } from '../../src/core/environment';
import { runRealRunGate } from '../../src/core/safety/realRunGate';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { NIGHTWATCH_STORAGE_STATE_VAR } from '../../src/browser/fixtures/storageState';
import { discoverRepositories, snapshotRepositories } from '../../src/core/repositories/snapshotter';

function nightwatchDirtyPaths(): string[] {
  const root = path.resolve(__dirname, '..', '..');
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  if (result.status !== 0) return ['<status-unavailable>'];
  return (result.stdout ?? '')
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.slice(3).trim())
    .filter((file) => file.length > 0);
}

function workspaceRepos(reposRoot: string): string[] {
  const result: string[] = [];
  for (const org of ['alphauslabs', 'mobingilabs']) {
    const orgRoot = path.join(reposRoot, org);
    for (const repo of discoverRepositories(orgRoot)) result.push(path.join(org, repo));
  }
  return result.sort();
}

test('Phase 2A pre-real-run safety gate', async () => {
  const env = selectEnvironment(process.env.NIGHTWATCH_ENV);
  const target = process.env.NIGHTWATCH_UI_URL ?? env.uiBaseUrl;
  const reposRoot = process.env.NIGHTWATCH_REPOS_ROOT ?? path.resolve(__dirname, '..', '..', '..');
  const repos = process.env.NIGHTWATCH_TRACKED_REPOS
    ? process.env.NIGHTWATCH_TRACKED_REPOS.split(',').map((item) => item.trim()).filter(Boolean)
    : workspaceRepos(reposRoot);
  const snapshots = await snapshotRepositories({ reposRoot, repos });
  const statePath = process.env[NIGHTWATCH_STORAGE_STATE_VAR] ?? null;
  const result = await runRealRunGate({
    environment: env,
    uiUrl: target,
    storageStatePath: statePath,
    proxyStateFile: undefined,
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: {
      metadataFirst: true,
      requestHeadersPersisted: false,
      requestBodiesPersisted: false,
      responseBodiesPersisted: false,
      queryValuesPersisted: false,
      querySanitized: true,
      storageStatePersisted: false,
      customerDomPersisted: false,
      screenshotsEnabled: false,
      tracesEnabled: false,
    },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: {
      snapshotRecorded: true,
      snapshotsValid: snapshots.length > 0 && snapshots.every((snapshot) => snapshot.ok),
      alphausRepositoriesClean: snapshots.every((snapshot) => !snapshot.dirty),
      nightwatchDirtyPaths: nightwatchDirtyPaths(),
      documentedNightwatchDirtyPaths: [],
    },
  });

  console.log(JSON.stringify(result, null, 2));
  expect(result.pass, result.checks.filter((item) => item.status === 'FAIL').map((item) => `${item.name}: ${item.detail}`).join('; ')).toBe(true);
});
