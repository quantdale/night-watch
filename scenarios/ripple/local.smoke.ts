// ---------------------------------------------------------------------------
// Nightwatch — Phase 1 scenario: Ripple passive local journey.
//
// The acceptance evidence for the Phase 1 mission: a fully offline, READ-ONLY
// passive journey against the built-in fixture app (when NIGHTWATCH_UI_URL is
// unset), gated by the policy canary, with repository snapshots and complete
// redacted evidence. `dev`/`next` runs need NIGHTWATCH_UI_URL pointing at the
// environment's allowlisted UI origin.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { runCanary, assertCanary } from '../../src/core/safety/canary';
import { discoverRepositories, snapshotRepositories } from '../../src/core/repositories/snapshotter';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { startFixtureServer, type FixtureServerHandle } from '../../src/browser/fixtures/fixtureServer';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { resolveStorageStatePath } from '../../src/browser/fixtures/storageState';
import { runPassiveJourney } from '../../src/products/ripple/journeys';

/** Nightwatch repo HEAD SHA, or null when unresolvable (never throws). */
function getNightwatchSha(): string | null {
  try {
    const root = path.resolve(__dirname, '..', '..');
    const res = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    if (res.status !== 0) return null;
    const out = (res.stdout ?? '').trim();
    return out === '' ? null : out;
  } catch {
    return null;
  }
}

/** Repos (relative to the repos root) across the alphauslabs/mobingilabs org dirs. */
function discoverWorkspaceRepos(reposRoot: string): string[] {
  const found: string[] = [];
  const selfAbs = path.resolve(__dirname, '..', '..');
  for (const entry of discoverRepositories(reposRoot)) {
    if (path.resolve(reposRoot, entry) === selfAbs) continue; // nightwatch itself
    found.push(entry);
  }
  for (const org of ['alphauslabs', 'mobingilabs']) {
    const orgDir = path.join(reposRoot, org);
    for (const repo of discoverRepositories(orgDir)) found.push(path.join(org, repo));
  }
  found.sort();
  return found;
}

test('ripple passive local journey', async ({ browser }) => {
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);

  // Fixture fallback: without NIGHTWATCH_UI_URL the local run targets the
  // built-in offline fixture app.
  let fixture: FixtureServerHandle | null = null;
  const uiUrl = process.env.NIGHTWATCH_UI_URL;
  let env: EnvironmentConfig;
  if (uiUrl === undefined || uiUrl.trim() === '') {
    fixture = await startFixtureServer('good');
    env = { ...loadEnvironmentConfig(envName), uiBaseUrl: fixture.origin };
    // Offline fixture mode: the fixture's telemetry probe targets the reserved
    // sentry.example.invalid host (never resolvable); overlay it onto the env's
    // telemetry list so the scenario exercises telemetry blocking instead of a
    // hard failure. The environment config files themselves stay untouched.
    env = { ...env, telemetryHosts: [...env.telemetryHosts, 'sentry.example.invalid'] };
  } else {
    env = loadEnvironmentConfig(envName);
  }
  const targetUrl = uiUrl ?? env.uiBaseUrl;

  // Startup gate: the target UI URL must be allowlisted for this environment.
  validateUiUrl(env, targetUrl); // throws → fail closed at startup

  const runId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();
  const recorder = new RunRecorder({
    runId,
    environment: envName,
    product: 'ripple',
    browser: 'chromium',
    scenario: 'ripple-local-passive',
    nightwatchSha: getNightwatchSha(),
  });
  recorder.event({ type: 'start', severity: 'info', message: `nightwatch run ${runId}` });
  recorder.event({
    type: 'env',
    severity: 'info',
    message: `environment: ${env.name}${fixture !== null ? ' (offline fixture app)' : ''}`,
    data: { name: env.name, uiBaseUrl: targetUrl },
  });

  // CANARY — startup gate: policy logic must be sound before any navigation.
  const policy = new OutboundPolicy(env);
  const canary = runCanary(policy);
  try {
    assertCanary(canary);
  } catch (err) {
    recorder.event({
      type: 'hard-failure',
      severity: 'fatal',
      message: `canary FAILED: ${String(err instanceof Error ? err.message : err)}`,
      data: { reason: 'canary-failed' },
    });
    throw err; // let the test fail
  }
  recorder.event({
    type: 'policy',
    severity: 'info',
    message: `canary passed: ${canary.total} checks (no network I/O)`,
  });

  // REPO SNAPSHOT — read-only git state of the workspace repos.
  // The workspace keeps clones under REPOSITORIES/<org>/<repo>, so the
  // default discovery scans the repos root plus its alphauslabs/mobingilabs
  // org directories (52 + 92 repos). C-00: the root is never derived from this
  // checkout's own location, because a writing agent's worktree lives outside
  // the workspace tree.
  const reposRoot = process.env.NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT;
  const repos = process.env.NIGHTWATCH_TRACKED_REPOS
    ? process.env.NIGHTWATCH_TRACKED_REPOS.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    : discoverWorkspaceRepos(reposRoot);
  const snapshots = await snapshotRepositories({ reposRoot, repos });
  await recorder.writeRepositories(snapshots);
  const dirtyCount = snapshots.filter((s) => s.dirty).length;
  recorder.event({
    type: 'env',
    severity: 'info',
    message: `repository snapshot: ${snapshots.length} repos (${dirtyCount} dirty)`,
  });

  // Harness context — storage-state resolution may throw (fail closed).
  const ctx = await createNightwatchContext(browser, {
    env,
    recorder,
    uiBaseUrl: targetUrl,
    storageStatePath: resolveStorageStatePath(),
    productId: 'ripple',
  });

  await runPassiveJourney(
    ctx.page,
    { recorder, monitor: ctx.monitor, network: ctx.network },
    { uiBaseUrl: targetUrl }
  );
  await recorder.captureScreenshot(ctx.page, 'dashboard');
  const summary = await recorder.finalize({
    passed: !ctx.monitor.failed,
    notes: ctx.monitor.summaryNotes(),
  });
  await ctx.close();
  if (fixture !== null) await fixture.close();

  console.log(`NIGHTWATCH artifacts: ${recorder.dir} (${summary.eventCount} events)`);

  expect(
    ctx.monitor.failed,
    `run failed — hardFailures: ${JSON.stringify(ctx.monitor.hardFailures)}; issues: ${JSON.stringify(ctx.monitor.issues)}`
  ).toBe(false);
});
