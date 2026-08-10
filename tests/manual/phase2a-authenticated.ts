// ---------------------------------------------------------------------------
// Nightwatch — Phase 2A first controlled authenticated Ripple observation.
//
// This file is only selected by bin/observe-authenticated.mjs. It performs
// one direct landing navigation, closes that context, and repeats the exact
// same navigation once in a fresh context using the same external state.
// No click, form submission, route exploration, screenshot, trace, body, DOM
// dump, or deliberate API replay is permitted here.
// ---------------------------------------------------------------------------

import { test, expect, type Browser, type Frame, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { waitForRippleStability } from '../../src/browser/observers/stability';
import {
  classifyRippleReadiness,
  confirmsRippleTarget,
  isRippleStructurallyReady,
  RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
  RIPPLE_RENDERED_SHELL_SELECTOR,
  RIPPLE_SOURCE_SHELL_CONTRACT,
  type RippleReadinessDiagnosis,
} from '../../src/products/ripple/readiness';
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
  sourceShellContract: typeof RIPPLE_SOURCE_SHELL_CONTRACT;
  finalOrigin: string | null;
  finalPath: string | null;
  targetConfirmed: boolean;
  titlePresent: boolean;
  documentReadyState: string;
  topLevelPage: boolean;
  frameCount: number;
  bootstrapMountSelector: string;
  bootstrapMountTargetPresent: boolean;
  renderedShellSelector: string;
  renderedShellPresent: boolean;
  renderedShellFrameCount: number;
  bodyPresent: boolean;
  bodyChildCount: number | null;
  evaluationFrame: 'top-level-main-frame' | 'unavailable';
  evaluationSucceeded: boolean;
  evaluationPhase: 'stability-poll' | 'post-stability-final';
  renderedShellQueryTiming: 'same-document-evaluation';
  renderedShellQueriedBeforeDocumentComplete: boolean;
  routeStable: boolean;
  routeStableMs: number;
  navigationInProgress: boolean;
  pageClosed: boolean;
  fatalPageErrorCount: number;
  readinessDiagnosis: RippleReadinessDiagnosis;
  pageReferenceCapturedBeforeNavigation: boolean;
  navigationAfterPageReference: boolean;
  mainFrameNavigationCount: number;
  firstReadinessSampleElapsedMs: number | null;
  firstReadinessDocumentReadyState: string;
  firstReadinessRenderedShellPresent: boolean;
  firstReadinessEvaluationSucceeded: boolean;
  lastReadinessSampleElapsedMs: number;
  iframeCount: number;
  stabilityReached: boolean;
  navigationFailed: boolean;
}

interface FrameStructure {
  documentReadyState: string;
  bootstrapMountTargetPresent: boolean;
  renderedShellPresent: boolean;
  bodyPresent: boolean;
  bodyChildCount: number;
  iframeCount: number;
}

interface RipplePageDiagnostics {
  finalOrigin: string | null;
  finalPath: string | null;
  targetConfirmed: boolean;
  documentReadyState: string;
  topLevelPage: boolean;
  frameCount: number;
  bootstrapMountTargetPresent: boolean;
  renderedShellPresent: boolean;
  bootstrapMountSelector: string;
  renderedShellSelector: string;
  renderedShellFrameCount: number;
  bodyPresent: boolean;
  bodyChildCount: number | null;
  iframeCount: number;
  evaluationFrame: 'top-level-main-frame' | 'unavailable';
  evaluationSucceeded: boolean;
  evaluationPhase: 'stability-poll' | 'post-stability-final';
  renderedShellQueryTiming: 'same-document-evaluation';
  renderedShellQueriedBeforeDocumentComplete: boolean;
  navigationInProgress: boolean;
  pageClosed: boolean;
  fatalPageErrorCount: number;
  readinessDiagnosis: RippleReadinessDiagnosis;
  readinessSampleElapsedMs: number;
  route: string;
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

function pageErrorCount(events: readonly RunEvent[]): number {
  return events.filter((event) => event.type === 'issue' && event.data?.reason === 'pageerror').length;
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

async function evaluateFrameStructure(frame: Frame): Promise<FrameStructure | null> {
  return frame.evaluate((selector) => {
    const pageGlobal = globalThis as unknown as {
      document?: {
        readyState?: string;
        body?: { children?: { length: number } } | null;
        querySelector: (value: string) => unknown;
        querySelectorAll: (value: string) => { length: number };
      };
    };
    const doc = pageGlobal.document;
    const body = doc?.body;
    return {
      documentReadyState: doc?.readyState ?? 'unavailable',
      bootstrapMountTargetPresent: doc?.querySelector(selector.bootstrapMountSelector) !== null &&
        doc?.querySelector(selector.bootstrapMountSelector) !== undefined,
      renderedShellPresent: doc?.querySelector(selector.renderedShellSelector) !== null &&
        doc?.querySelector(selector.renderedShellSelector) !== undefined,
      bodyPresent: body !== null && body !== undefined,
      bodyChildCount: body?.children?.length ?? 0,
      iframeCount: doc?.querySelectorAll('iframe').length ?? 0,
    };
  }, {
    bootstrapMountSelector: RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
    renderedShellSelector: RIPPLE_RENDERED_SHELL_SELECTOR,
  }).catch(() => null);
}

async function sampleRipplePage(opts: {
  page: Page;
  target: string;
  evaluationPhase: 'stability-poll' | 'post-stability-final';
  navigationInProgress: boolean;
  navigationStartedAt: number;
  monitorIssueCount: number;
}): Promise<RipplePageDiagnostics> {
  const pageClosed = opts.page.isClosed();
  const route = (() => {
    try {
      return opts.page.url();
    } catch {
      return '';
    }
  })();
  const location = safeLocation(route);
  const configured = new URL(opts.target);
  const targetConfirmed = location !== null && confirmsRippleTarget(
    configured.origin,
    configured.pathname,
    location.origin,
    location.path,
  );

  let frames: Frame[] = [];
  let mainFrame: Frame | null = null;
  if (!pageClosed) {
    try {
      frames = opts.page.frames();
      mainFrame = opts.page.mainFrame();
    } catch {
      frames = [];
      mainFrame = null;
    }
  }
  const frameStructures = await Promise.all(frames.map((frame) => evaluateFrameStructure(frame)));
  const mainIndex = mainFrame === null ? -1 : frames.indexOf(mainFrame);
  const mainStructure = mainIndex >= 0 ? frameStructures[mainIndex] ?? null : null;
  const renderedShellFrameCount = frameStructures.filter((structure) => structure?.renderedShellPresent === true).length;
  const documentReadyState = mainStructure?.documentReadyState ?? 'unavailable';
  const bootstrapMountTargetPresent = mainStructure?.bootstrapMountTargetPresent ?? false;
  const renderedShellPresent = mainStructure?.renderedShellPresent ?? false;
  const bodyPresent = mainStructure?.bodyPresent ?? false;
  const bodyChildCount = mainStructure?.bodyChildCount ?? null;
  const iframeCount = mainStructure?.iframeCount ?? 0;
  const evaluationSucceeded = mainStructure !== null;
  const structural = {
    documentReadyState,
    bootstrapMountSelector: RIPPLE_BOOTSTRAP_MOUNT_SELECTOR,
    renderedShellSelector: RIPPLE_RENDERED_SHELL_SELECTOR,
    renderedShellPresent,
  };
  const readinessDiagnosis = classifyRippleReadiness({
    ...structural,
    targetConfirmed,
    bodyPresent,
    renderedShellFrameCount,
    evaluationSucceeded,
    navigationInProgress: opts.navigationInProgress,
    pageClosed,
  });
  return {
    finalOrigin: location?.origin ?? null,
    finalPath: location?.path ?? null,
    targetConfirmed,
    ...structural,
    bootstrapMountTargetPresent,
    topLevelPage: true,
    frameCount: frames.length,
    renderedShellFrameCount,
    bodyPresent,
    bodyChildCount,
    iframeCount,
    evaluationFrame: evaluationSucceeded ? 'top-level-main-frame' : 'unavailable',
    evaluationSucceeded,
    evaluationPhase: opts.evaluationPhase,
    renderedShellQueryTiming: 'same-document-evaluation',
    renderedShellQueriedBeforeDocumentComplete: evaluationSucceeded && documentReadyState !== 'complete',
    navigationInProgress: opts.navigationInProgress,
    pageClosed,
    fatalPageErrorCount: opts.monitorIssueCount,
    readinessDiagnosis,
    readinessSampleElapsedMs: Math.max(0, Date.now() - opts.navigationStartedAt),
    route,
  };
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
  let navigationInProgress = false;
  let navigationStartedAt = Date.now();
  let mainFrameNavigationCount = 0;
  const pageReferenceCapturedBeforeNavigation = true;
  let latestDiagnostics: RipplePageDiagnostics | null = null;
  let firstReadinessSampleElapsedMs: number | null = null;
  let firstReadinessDocumentReadyState = 'unavailable';
  let firstReadinessRenderedShellPresent = false;
  let firstReadinessEvaluationSucceeded = false;
  let lastStabilityRoute: string | null = null;
  let lastRouteStable = false;
  let lastRouteStableMs = 0;

  // The Page object is captured by createNightwatchContext before this direct
  // navigation. Track only main-frame navigation count; URLs remain
  // sanitized at the final evidence boundary.
  context.page.on('framenavigated', (frame) => {
    try {
      if (frame === context.page.mainFrame()) mainFrameNavigationCount += 1;
    } catch {
      // A closed page is represented by the structural diagnostics below.
    }
  });
  try {
    recorder.event({
      type: 'navigation',
      severity: 'info',
      message: 'direct authenticated landing navigation',
      data: { url: recorder.redactUrl(target), action: 'navigate-only', pass },
    });
    navigationStartedAt = Date.now();
    navigationInProgress = true;
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
    } finally {
      navigationInProgress = false;
    }

    stabilityReached = await waitForRippleStability({
      quietMs: 750,
      timeoutMs: 15_000,
      recorder,
      monitor: context.monitor,
      sample: async () => {
        const sample = await sampleRipplePage({
          page: context.page,
          target,
          evaluationPhase: 'stability-poll',
          navigationInProgress,
          navigationStartedAt,
          monitorIssueCount: pageErrorCount(context.monitor.issues),
        });
        latestDiagnostics = sample;
        if (firstReadinessSampleElapsedMs === null) {
          firstReadinessSampleElapsedMs = sample.readinessSampleElapsedMs;
          firstReadinessDocumentReadyState = sample.documentReadyState;
          firstReadinessRenderedShellPresent = sample.renderedShellPresent;
          firstReadinessEvaluationSucceeded = sample.evaluationSucceeded;
        }
        return {
          documentReadyState: sample.documentReadyState,
          bootstrapMountSelector: sample.bootstrapMountSelector,
          renderedShellSelector: sample.renderedShellSelector,
          renderedShellPresent: sample.renderedShellPresent,
          route: sample.route,
          fatal: sample.pageClosed || context.monitor.safetyFailed || sample.fatalPageErrorCount > 0,
          diagnostics: sample,
        };
      },
      onSample: (progress) => {
        if (latestDiagnostics !== null) {
          lastStabilityRoute = latestDiagnostics.route;
          lastRouteStable = progress.routeStable;
          lastRouteStableMs = progress.routeStableMs;
        }
      },
    });

    const finalDiagnostics = await sampleRipplePage({
      page: context.page,
      target,
      evaluationPhase: 'post-stability-final',
      navigationInProgress,
      navigationStartedAt,
      monitorIssueCount: pageErrorCount(context.monitor.issues),
    });
    latestDiagnostics = finalDiagnostics;
    const finalProgressMatches = lastStabilityRoute !== null && lastStabilityRoute === finalDiagnostics.route;
    const routeStable = finalProgressMatches ? lastRouteStable : false;
    const routeStableMs = finalProgressMatches && isRippleStructurallyReady(finalDiagnostics)
      ? lastRouteStableMs
      : 0;
    stabilityReached = stabilityReached && routeStable && isRippleStructurallyReady(finalDiagnostics);
    const titlePresent = await context.page.title().then((title) => title.trim().length > 0).catch(() => false);
    readiness = {
      sourceShellContract: RIPPLE_SOURCE_SHELL_CONTRACT,
      finalOrigin: finalDiagnostics.finalOrigin,
      finalPath: finalDiagnostics.finalPath,
      targetConfirmed: finalDiagnostics.targetConfirmed,
      titlePresent,
      documentReadyState: finalDiagnostics.documentReadyState,
      topLevelPage: finalDiagnostics.topLevelPage,
      frameCount: finalDiagnostics.frameCount,
      bootstrapMountSelector: finalDiagnostics.bootstrapMountSelector,
      bootstrapMountTargetPresent: finalDiagnostics.bootstrapMountTargetPresent,
      renderedShellSelector: finalDiagnostics.renderedShellSelector,
      renderedShellPresent: finalDiagnostics.renderedShellPresent,
      renderedShellFrameCount: finalDiagnostics.renderedShellFrameCount,
      bodyPresent: finalDiagnostics.bodyPresent,
      bodyChildCount: finalDiagnostics.bodyChildCount,
      evaluationFrame: finalDiagnostics.evaluationFrame,
      evaluationSucceeded: finalDiagnostics.evaluationSucceeded,
      evaluationPhase: finalDiagnostics.evaluationPhase,
      renderedShellQueryTiming: finalDiagnostics.renderedShellQueryTiming,
      renderedShellQueriedBeforeDocumentComplete: finalDiagnostics.renderedShellQueriedBeforeDocumentComplete,
      routeStable,
      routeStableMs,
      navigationInProgress: finalDiagnostics.navigationInProgress,
      pageClosed: finalDiagnostics.pageClosed,
      fatalPageErrorCount: finalDiagnostics.fatalPageErrorCount,
      readinessDiagnosis: finalDiagnostics.readinessDiagnosis,
      pageReferenceCapturedBeforeNavigation,
      navigationAfterPageReference: mainFrameNavigationCount > 0,
      mainFrameNavigationCount,
      firstReadinessSampleElapsedMs,
      firstReadinessDocumentReadyState,
      firstReadinessRenderedShellPresent,
      firstReadinessEvaluationSucceeded,
      lastReadinessSampleElapsedMs: finalDiagnostics.readinessSampleElapsedMs,
      iframeCount: finalDiagnostics.iframeCount,
      stabilityReached,
      navigationFailed,
    };
    recorder.event({
      type: 'env',
      severity: readiness.targetConfirmed && readiness.renderedShellPresent && readiness.stabilityReached && !navigationFailed ? 'info' : 'warn',
      message: 'authenticated landing readiness observed',
      data: { ...readiness, sourceShellContract: RIPPLE_SOURCE_SHELL_CONTRACT, pass },
    });
    if (!readiness.targetConfirmed || !readiness.renderedShellPresent || !readiness.stabilityReached || navigationFailed) {
      const issue = recorder.event({
        type: 'issue',
        severity: 'error',
        message: 'authenticated Ripple readiness was not confirmed',
        data: {
          reason: 'ripple-readiness-not-confirmed',
          targetConfirmed: readiness.targetConfirmed,
          bootstrapMountSelector: readiness.bootstrapMountSelector,
          postMountShellSelector: readiness.renderedShellSelector,
          postMountShellPresent: readiness.renderedShellPresent,
          stabilityReached: readiness.stabilityReached,
          navigationFailed,
          pass,
        },
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
  const passed = !context.monitor.safetyFailed && !unsafeDestination && readiness.targetConfirmed && readiness.renderedShellPresent && readiness.stabilityReached && !navigationFailed;
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
