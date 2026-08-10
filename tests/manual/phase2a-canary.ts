// ---------------------------------------------------------------------------
// Nightwatch — Phase 2A unauthenticated real Ripple connectivity canary.
//
// Invoked only by bin/observe-canary.mjs after no-network preflight. It makes
// one direct navigation and basic structural observation; it never loads
// storage state, follows links, or clicks.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { NIGHTWATCH_STORAGE_STATE_VAR } from '../../src/browser/fixtures/storageState';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { buildDestinationManifest, writeDestinationManifest } from '../../src/core/evidence/destinationManifest';
import type { RunEvent } from '../../src/core/evidence/types';
import { discoverRepositories, snapshotRepositories } from '../../src/core/repositories/snapshotter';
import { runRealRunGate } from '../../src/core/safety/realRunGate';
import { readProxyEvents } from '../../src/proxy/events';
import { proxyStatePath } from '../../src/proxy/server';
import { readProxyRuntimeState } from '../../src/proxy/runtime';
import { waitForStability } from '../../src/browser/observers/stability';

function nightwatchSha(): string | null {
  const root = path.resolve(__dirname, '..', '..');
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const sha = (result.stdout ?? '').trim();
  return result.status === 0 && sha !== '' ? sha : null;
}

function dirtyNightwatchPaths(): string[] {
  const root = path.resolve(__dirname, '..', '..');
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  if (result.status !== 0) return ['<status-unavailable>'];
  return (result.stdout ?? '').split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
}

function workspaceRepos(reposRoot: string): string[] {
  const repos: string[] = [];
  for (const org of ['alphauslabs', 'mobingilabs']) {
    for (const repo of discoverRepositories(path.join(reposRoot, org))) repos.push(path.join(org, repo));
  }
  return repos.sort();
}

function readEvents(file: string): RunEvent[] {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as RunEvent);
  } catch {
    return [];
  }
}

function validateCanaryTarget(env: EnvironmentConfig, raw: string): string {
  const target = new URL(raw);
  const configured = new URL(env.uiBaseUrl);
  if (target.protocol !== 'https:' || configured.protocol !== 'https:') throw new Error('fail-closed: real canary target must use HTTPS');
  if (target.username || target.password || target.search || target.hash) throw new Error('fail-closed: canary target contains credentials, query, or fragment');
  if (target.hostname.toLowerCase() !== configured.hostname.toLowerCase() || target.port !== configured.port) throw new Error('fail-closed: canary target does not match verified UI host');
  if (target.pathname !== configured.pathname) throw new Error(`fail-closed: canary target path must match verified UI path ${configured.pathname}`);
  return validateUiUrl(env, target.toString());
}

test('Phase 2A unauthenticated Ripple connectivity canary', async ({ browser }) => {
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev' && envName !== 'next') throw new Error('fail-closed: canary requires exactly dev or next');
  const env = loadEnvironmentConfig(envName);
  const target = validateCanaryTarget(env, process.env.NIGHTWATCH_UI_URL ?? env.uiBaseUrl);
  if ((process.env[NIGHTWATCH_STORAGE_STATE_VAR] ?? '').trim() !== '') throw new Error('fail-closed: canary refuses inherited storage state');

  const recorder = new RunRecorder({
    runId: process.env.NIGHTWATCH_RUN_ID ?? createRunId(),
    environment: env.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: 'ripple-phase-2a-unauthenticated-canary',
    nightwatchSha: nightwatchSha(),
    // Metadata-first mode is used even without auth because this artifact is
    // a real-environment observation and must not retain page data by default.
    authenticated: true,
  });
  recorder.addManifestEntry('runMode', 'unauthenticated-connectivity-canary');
  recorder.event({ type: 'start', severity: 'info', message: 'Phase 2A unauthenticated canary started' });
  recorder.event({ type: 'env', severity: 'info', message: 'selected explicit Ripple canary target', data: { environment: env.name, url: recorder.redactUrl(target), storageStateLoaded: false } });

  const reposRoot = process.env.NIGHTWATCH_REPOS_ROOT ?? path.resolve(__dirname, '..', '..', '..');
  const repos = process.env.NIGHTWATCH_TRACKED_REPOS
    ? process.env.NIGHTWATCH_TRACKED_REPOS.split(',').map((item) => item.trim()).filter(Boolean)
    : workspaceRepos(reposRoot);
  const snapshots = await snapshotRepositories({ reposRoot, repos });
  await recorder.writeRepositories(snapshots);

  const gate = await runRealRunGate({
    environment: env,
    uiUrl: target,
    storageStatePath: null,
    requireAuthenticationState: false,
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
      alphausRepositoriesSnapshotValid: snapshots.length > 0 && snapshots.every((snapshot) => snapshot.ok),
      nightwatchDirtyPaths: dirtyNightwatchPaths(),
      documentedNightwatchDirtyPaths: [],
    },
  });
  recorder.addManifestEntry('preRealRunGate', gate);
  if (!gate.pass) {
    recorder.event({ type: 'hard-failure', severity: 'fatal', message: 'Phase 2A pre-real-run gate failed', data: { reason: 'pre-real-run-gate-failed' } });
    const summary = await recorder.finalize({ passed: false, notes: ['pre-real-run-gate-failed'] });
    expect(summary.passed, 'pre-real-run gate failed; no target navigation was permitted').toBe(true);
    return;
  }

  const context = await createNightwatchContext(browser, { env, recorder, uiBaseUrl: target, storageStatePath: null, trace: 'off', failOn: ['hard-failure'] });
  let navigationError = false;
  try {
    recorder.event({ type: 'navigation', severity: 'info', message: 'direct landing navigation', data: { url: recorder.redactUrl(target), action: 'navigate-only' } });
    try {
      await context.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (error) {
      navigationError = true;
      recorder.event({ type: 'navigation', severity: 'error', message: 'unauthenticated landing navigation failed', data: { reason: 'navigation-failed', errorText: recorder.classifyNetworkFailure(String(error instanceof Error ? error.message : error)) } });
    }
    await waitForStability({ network: context.network, quietMs: 500, timeoutMs: 5_000, recorder, monitor: context.monitor });
    recorder.event({ type: 'env', severity: 'info', message: 'unauthenticated landing structure observed', data: { finalUrl: recorder.redactUrl(context.page.url()), titlePresent: (await context.page.title()).trim().length > 0, navigationError, policyVersion: 'phase-2a-browser-background-policy-v1' } });
  } finally {
    await context.close();
  }

  const proxyEvents = (() => {
    try { return readProxyEvents(readProxyRuntimeState(proxyStatePath()).eventLogPath); } catch { return []; }
  })();
  recorder.syncProxyViolations();
  const manifest = buildDestinationManifest(env, proxyEvents, readEvents(path.join(recorder.dir, 'events.jsonl')));
  writeDestinationManifest(path.join(recorder.dir, 'destination-manifest.json'), manifest);
  recorder.addManifestEntry('destinationManifest', { expected: manifest.expected.length, newButVerified: manifest.newButVerified.length, blocked: manifest.blocked.length, unresolved: manifest.unresolved.length });

  if (manifest.unresolved.length > 0) recorder.event({ type: 'hard-failure', severity: 'fatal', message: 'UNCLASSIFIED_REQUIRED_HOST', data: { reason: 'UNCLASSIFIED_REQUIRED_HOST' } });
  if (manifest.blocked.some((entry) => entry.decision === 'deny')) recorder.event({ type: 'hard-failure', severity: 'fatal', message: 'production destination attempted', data: { reason: 'production-destination-attempted' } });
  const summary = await recorder.finalize({
    passed: !context.monitor.failed && manifest.unresolved.length === 0 && !manifest.blocked.some((entry) => entry.decision === 'deny'),
    notes: ['unauthenticated canary; no storage state loaded', `destination manifest: ${manifest.expected.length} expected, ${manifest.newButVerified.length} new-but-verified, ${manifest.blocked.length} blocked, ${manifest.unresolved.length} unresolved`],
  });
  console.log(`NIGHTWATCH canary artifacts: ${recorder.dir} (${summary.eventCount} events)`);
  expect(summary.passed, 'Phase 2A canary failed; inspect sanitized destination manifest and passive oracle output').toBe(true);
});
