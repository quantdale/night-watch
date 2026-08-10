// ---------------------------------------------------------------------------
// Nightwatch — Phase 2A first controlled authenticated Ripple observation.
//
// This file is only selected by bin/observe-authenticated.mjs. It performs
// one direct landing navigation, closes that context, and repeats the exact
// same navigation once in a fresh context using the same external state.
// No click, form submission, route exploration, screenshot, trace, body, DOM
// dump, or deliberate API replay is permitted here.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { waitForStability } from '../../src/browser/observers/stability';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { buildDestinationManifest, writeDestinationManifest, type DestinationManifest } from '../../src/core/evidence/destinationManifest';
import type { RunEvent } from '../../src/core/evidence/types';
import type { RunSummary } from '../../src/core/evidence/types';
import { readProxyEvents } from '../../src/proxy/events';
import { proxyStatePath } from '../../src/proxy/server';
import { readProxyRuntimeState } from '../../src/proxy/runtime';
import type { EndpointSemanticClassification } from '../../src/core/safety/endpointSemantics';

interface ReadinessEvidence {
  finalOrigin: string | null;
  finalPath: string | null;
  targetConfirmed: boolean;
  titlePresent: boolean;
  documentReadyState: string;
  appRootPresent: boolean;
  iframeCount: number;
  stabilityReached: boolean;
  navigationFailed: boolean;
}

interface EndpointEvidence {
  method: string;
  origin: string;
  path: string;
  classification: EndpointSemanticClassification;
  count: number;
}

interface ObservationResult {
  runId: string;
  artifactDir: string;
  summary: RunSummary;
  manifest: DestinationManifest;
  readiness: ReadinessEvidence;
  endpointSemantics: EndpointEvidence[];
  oracleCategories: string[];
  consolePageErrorCategories: string[];
  responseStructure: Array<{ method: string; status: number; contentType: string | null; count: number }>;
}

function nightwatchSha(): string | null {
  const root = path.resolve(__dirname, '..', '..');
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const sha = (result.stdout ?? '').trim();
  return result.status === 0 && sha !== '' ? sha : null;
}

function readEvents(file: string): RunEvent[] {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RunEvent);
  } catch {
    return [];
  }
}

function targetFor(env: EnvironmentConfig): string {
  const configured = new URL(env.uiBaseUrl);
  const override = process.env.NIGHTWATCH_UI_URL;
  const target = new URL(override === undefined || override.trim() === '' ? env.uiBaseUrl : override);
  if (
    target.protocol !== 'https:' ||
    target.hostname.toLowerCase() !== configured.hostname.toLowerCase() ||
    target.port !== configured.port ||
    target.pathname !== configured.pathname ||
    target.username !== '' ||
    target.password !== '' ||
    target.search !== '' ||
    target.hash !== ''
  ) {
    throw new Error('fail-closed: authenticated target must exactly match the verified environment UI URL');
  }
  return validateUiUrl(env, target.toString());
}

function safeLocation(rawUrl: string): { origin: string; path: string } | null {
  try {
    const url = new URL(rawUrl);
    return { origin: url.origin, path: url.pathname || '/' };
  } catch {
    return null;
  }
}

function endpointEvidence(events: readonly RunEvent[]): EndpointEvidence[] {
  const groups = new Map<string, EndpointEvidence>();
  for (const event of events) {
    if (event.type !== 'request' && event.type !== 'response') continue;
    const data = event.data ?? {};
    const classification = data.endpointClassification;
    const method = data.method;
    const url = data.url;
    if (
      (classification !== 'KNOWN_READ' && classification !== 'KNOWN_MUTATION' && classification !== 'UNKNOWN') ||
      typeof method !== 'string' ||
      typeof url !== 'string'
    ) continue;
    const location = safeLocation(url);
    if (location === null) continue;
    const key = `${method}|${location.origin}|${location.path}|${classification}`;
    const current = groups.get(key);
    if (current === undefined) {
      groups.set(key, { method, origin: location.origin, path: location.path, classification, count: 1 });
    } else {
      current.count += 1;
    }
  }
  return [...groups.values()].sort((a, b) =>
    `${a.method}|${a.origin}|${a.path}|${a.classification}`.localeCompare(`${b.method}|${b.origin}|${b.path}|${b.classification}`),
  );
}

function oracleCategories(events: readonly RunEvent[]): string[] {
  return [...new Set(events
    .filter((event) => event.type === 'oracle' || event.type === 'issue')
    .map((event) => typeof event.data?.reason === 'string' ? event.data.reason : event.type))].sort();
}

function consolePageErrorCategories(events: readonly RunEvent[]): string[] {
  return [...new Set(events
    .filter((event) => event.type === 'console' || event.type === 'pageerror')
    .map((event) => typeof event.data?.category === 'string' ? event.data.category : event.type))].sort();
}

function responseStructure(events: readonly RunEvent[]): ObservationResult['responseStructure'] {
  const groups = new Map<string, ObservationResult['responseStructure'][number]>();
  for (const event of events) {
    if (event.type !== 'response') continue;
    const data = event.data ?? {};
    if (typeof data.method !== 'string' || typeof data.status !== 'number') continue;
    const contentType = typeof data.contentType === 'string' ? data.contentType : null;
    const key = `${data.method}|${data.status}|${contentType ?? ''}`;
    const current = groups.get(key);
    if (current === undefined) groups.set(key, { method: data.method, status: data.status, contentType, count: 1 });
    else current.count += 1;
  }
  return [...groups.values()].sort((a, b) =>
    `${a.method}|${a.status}|${a.contentType ?? ''}`.localeCompare(`${b.method}|${b.status}|${b.contentType ?? ''}`),
  );
}

async function observeOnce(
  browser: Browser,
  env: EnvironmentConfig,
  target: string,
  storageStatePath: string,
  runId: string,
  pass: 'first' | 'replay',
): Promise<ObservationResult> {
  const recorder = new RunRecorder({
    runId,
    environment: env.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: `ripple-phase-2a-authenticated-${pass}`,
    nightwatchSha: nightwatchSha(),
    authenticated: true,
  });
  recorder.addManifestEntry('runMode', 'authenticated-metadata-first');
  recorder.addManifestEntry('observation', {
    pass,
    action: 'direct-landing-navigation-only',
    route: 'approved-ripple-landing',
    screenshots: false,
    traces: false,
  });
  recorder.event({ type: 'start', severity: 'info', message: `Phase 2A authenticated ${pass} observation started` });
  recorder.event({
    type: 'env',
    severity: 'info',
    message: 'selected explicit authenticated Ripple landing target',
    data: { environment: env.name, url: recorder.redactUrl(target), storageStateLoaded: true, pass },
  });

  const proxyEventLogStart = (() => {
    try {
      return readProxyEvents(readProxyRuntimeState(proxyStatePath()).eventLogPath).length;
    } catch {
      return 0;
    }
  })();

  const context = await createNightwatchContext(browser, {
    env,
    recorder,
    uiBaseUrl: target,
    storageStatePath,
    trace: 'off',
    failOn: ['hard-failure'],
  });
  let navigationFailed = false;
  let stabilityReached = false;
  let readiness: ReadinessEvidence;
  try {
    recorder.event({
      type: 'navigation',
      severity: 'info',
      message: 'direct authenticated landing navigation',
      data: { url: recorder.redactUrl(target), action: 'navigate-only', pass },
    });
    try {
      await context.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (error) {
      navigationFailed = true;
      recorder.event({
        type: 'navigation',
        severity: 'error',
        message: 'authenticated landing navigation failed',
        data: {
          reason: 'navigation-failed',
          errorText: recorder.classifyNetworkFailure(String(error instanceof Error ? error.message : error)),
          pass,
        },
      });
    }

    stabilityReached = await waitForStability({
      network: context.network,
      quietMs: 750,
      timeoutMs: 15_000,
      recorder,
      monitor: context.monitor,
    });

    const finalUrl = context.page.url();
    const final = safeLocation(finalUrl);
    const configured = new URL(target);
    const titlePresent = await context.page.title().then((title) => title.trim().length > 0).catch(() => false);
    const shell = await context.page.evaluate(() => {
      const pageGlobal = globalThis as unknown as { document?: { readyState?: string; querySelector: (selector: string) => unknown; querySelectorAll: (selector: string) => { length: number } } };
      const doc = pageGlobal.document;
      return {
        documentReadyState: doc?.readyState ?? 'unavailable',
        appRootPresent: doc?.querySelector('#app') !== null && doc?.querySelector('#app') !== undefined,
        iframeCount: doc?.querySelectorAll('iframe').length ?? 0,
      };
    }).catch(() => ({ documentReadyState: 'unavailable', appRootPresent: false, iframeCount: 0 }));
    readiness = {
      finalOrigin: final?.origin ?? null,
      finalPath: final?.path ?? null,
      targetConfirmed: final?.origin === configured.origin && final?.path === configured.pathname,
      titlePresent,
      documentReadyState: shell.documentReadyState,
      appRootPresent: shell.appRootPresent,
      iframeCount: shell.iframeCount,
      stabilityReached,
      navigationFailed,
    };
    recorder.event({
      type: 'env',
      severity: readiness.targetConfirmed && !navigationFailed ? 'info' : 'warn',
      message: 'authenticated landing readiness observed',
      data: { ...readiness, pass },
    });
    if (!readiness.targetConfirmed || navigationFailed) {
      const issue = recorder.event({
        type: 'issue',
        severity: 'error',
        message: 'authenticated landing target was not confirmed',
        data: { reason: 'landing-target-not-confirmed', pass },
      });
      context.monitor.recordIssue(issue);
    }
  } finally {
    await context.close();
  }

  const events = readEvents(path.join(recorder.dir, 'events.jsonl'));
  const proxyEvents = (() => {
    try {
      return readProxyEvents(readProxyRuntimeState(proxyStatePath()).eventLogPath).slice(proxyEventLogStart);
    } catch {
      return [];
    }
  })();
  recorder.syncProxyViolations();
  const manifest = buildDestinationManifest(env, proxyEvents, events);
  writeDestinationManifest(path.join(recorder.dir, 'destination-manifest.json'), manifest);
  recorder.addManifestEntry('destinationManifest', {
    expected: manifest.expected.length,
    newButVerified: manifest.newButVerified.length,
    blocked: manifest.blocked.length,
    unresolved: manifest.unresolved.length,
  });
  const unsafeDestination = manifest.unresolved.length > 0 || manifest.blocked.some((entry) => entry.decision === 'deny');
  const passed = !context.monitor.safetyFailed && !unsafeDestination && readiness.targetConfirmed && !navigationFailed;
  const summary = await recorder.finalize({
    passed,
    notes: [
      `authenticated ${pass} landing observation; direct navigation only`,
      `destination manifest: ${manifest.expected.length} expected, ${manifest.newButVerified.length} new-but-verified, ${manifest.blocked.length} blocked, ${manifest.unresolved.length} unresolved`,
      `semantic endpoint calls remain metadata-only; unknown calls were not deliberately replayed`,
    ],
  });
  return {
    runId,
    artifactDir: recorder.dir,
    summary,
    manifest,
    readiness,
    endpointSemantics: endpointEvidence(events),
    oracleCategories: oracleCategories(events),
    consolePageErrorCategories: consolePageErrorCategories(events),
    responseStructure: responseStructure(events),
  };
}

function writeComparison(root: string, runId: string, first: ObservationResult, replay: ObservationResult | null): void {
  const dir = path.join(root, 'artifacts', `${runId}-comparison`);
  fs.mkdirSync(dir, { recursive: true });
  const comparable = (result: ObservationResult | null) => result === null ? null : ({
    runId: result.runId,
    passed: result.summary.passed,
    destinationManifest: result.manifest,
    endpointSemantics: result.endpointSemantics,
    readiness: result.readiness,
    oracleCategories: result.oracleCategories,
    consolePageErrorCategories: result.consolePageErrorCategories,
    responseStructure: result.responseStructure,
    timing: { durationMs: result.summary.durationMs, eventCount: result.summary.eventCount },
  });
  const firstComparable = comparable(first);
  const replayComparable = comparable(replay);
  fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify({
    runId,
    mode: 'sanitized-first-vs-fresh-context-replay',
    first: firstComparable,
    replay: replayComparable,
    differencesObserved: replayComparable === null ? ['replay-not-run'] : [
      ...(JSON.stringify(firstComparable?.destinationManifest) !== JSON.stringify(replayComparable.destinationManifest) ? ['destination-set-or-classification'] : []),
      ...(JSON.stringify(firstComparable?.endpointSemantics) !== JSON.stringify(replayComparable.endpointSemantics) ? ['endpoint-semantic-observations'] : []),
      ...(JSON.stringify(firstComparable?.readiness) !== JSON.stringify(replayComparable.readiness) ? ['shell-readiness'] : []),
      ...(JSON.stringify(firstComparable?.oracleCategories) !== JSON.stringify(replayComparable.oracleCategories) ? ['oracle-categories'] : []),
      ...(JSON.stringify(firstComparable?.consolePageErrorCategories) !== JSON.stringify(replayComparable.consolePageErrorCategories) ? ['console-page-error-categories'] : []),
      ...(JSON.stringify(firstComparable?.responseStructure) !== JSON.stringify(replayComparable.responseStructure) ? ['response-status-content-type-structure'] : []),
    ],
  }, null, 2));
}

test('Phase 2A first controlled authenticated Ripple observation', async ({ browser }) => {
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev' && envName !== 'next') throw new Error('fail-closed: authenticated observation requires exactly dev or next');
  const env = loadEnvironmentConfig(envName);
  const target = targetFor(env);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined || statePath.trim() === '') throw new Error('fail-closed: authenticated observation requires external storage state');
  const validatedStatePath = validateStorageStateFile(statePath);
  const root = path.resolve(__dirname, '..', '..');
  const baseRunId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();

  const first = await observeOnce(browser, env, target, validatedStatePath, `${baseRunId}-first`, 'first');
  if (!first.summary.passed) {
    writeComparison(root, baseRunId, first, null);
    expect(first.summary.passed, 'first authenticated observation failed; replay is prohibited').toBe(true);
    return;
  }

  // The first context was closed by observeOnce before this fresh context is
  // created. The state path is reused as-is; it is never copied or inspected.
  const replay = await observeOnce(browser, env, target, validatedStatePath, `${baseRunId}-replay`, 'replay');
  writeComparison(root, baseRunId, first, replay);
  expect(replay.summary.passed, 'fresh-context replay failed').toBe(true);
});
