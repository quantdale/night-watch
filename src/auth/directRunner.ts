// ---------------------------------------------------------------------------
// Nightwatch — direct authenticated capture runner (Phase 2A).
//
// This module is deliberately a Playwright Library API runner, not a
// Playwright Test file. The parent CLI supplies the completion signal; the
// runner owns the browser, proxy, guarded context, storage-state write, and
// sanitized capture provenance.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { EnvironmentConfig } from '../core/environment/types';
import { validateUiUrl, createNightwatchContext, type NightwatchContext } from '../browser/context';
import {
  AUTHENTICATED_BROWSER_CONTRACT,
  nightwatchChromiumLaunchOptions,
} from '../browser/contract';
import {
  validateStorageStateFile,
  validateStorageStateOutputPath,
} from '../browser/fixtures/storageState';
import { createRunId, RunRecorder } from '../core/evidence/runRecorder';
import type { RunSummary } from '../core/evidence/types';
import { OutboundPolicy, OUTBOUND_POLICY_VERSION } from '../core/safety/outboundPolicy';
import { checkProxyHealth, requireProxyRuntime } from '../proxy/runtime';
import {
  DEFAULT_PROXY_PORT,
  proxyEventLogPath,
  proxyServerUrl,
  proxyStatePath,
  startOutboundProxy,
  writeProxyRuntimeState,
} from '../proxy/server';
import type { OutboundProxyServer } from '../proxy/server';
import type { ProxyRuntimeState } from '../proxy/types';
import {
  AuthCaptureStageError,
  type AuthCaptureStage,
  type AuthCaptureStageEvent,
  type AuthCaptureStageReporter,
  sanitizedLocation,
  type SanitizedLocation,
} from './stages';

export type CaptureCompletion =
  | {
      kind: 'human-parent-cli';
      wait(page: Page): Promise<void>;
    }
  | {
      /** Only local synthetic tests may use this completion mechanism. */
      kind: 'synthetic-test-only';
      wait(page: Page): Promise<void>;
    };

export interface DirectAuthCaptureOptions {
  environment: EnvironmentConfig;
  uiUrl: string;
  outputPath: string;
  completion: CaptureCompletion;
  /** Test-only switch. The normal CLI never sets this. */
  testOnly?: boolean;
  /** Real capture is headed by default. Synthetic tests may use headless. */
  headless?: boolean;
  /** Repository root; supplied explicitly by the parent CLI/tests. */
  nightwatchRoot?: string;
  /** Test-only artifact location; real capture always uses artifacts/. */
  artifactsRoot?: string;
  /** Sanitized stage callbacks used by the parent CLI and local tests. */
  stageReporter?: AuthCaptureStageReporter;
  /** Called only after target verification, immediately before human wait. */
  onReady?: (location: SanitizedLocation) => void;
  /** Dependency injection used only by local failure-injection tests. */
  storageStateWriter?: (context: BrowserContext, outputPath: string) => Promise<void>;
  /** Dependency injection used only by local failure-injection tests. */
  stateValidator?: (outputPath: string) => string;
  /** Dependency injection used only by local target-verification tests. */
  targetVerificationUrl?: string;
  /** Dependency injection used only by local navigation failure tests. */
  targetNavigator?: (page: Page, target: string) => Promise<void>;
}

export interface DirectAuthCaptureResult {
  browserLaunched: boolean;
  artifactDir: string;
  proxyAddress: string;
  storageStatePath: string;
  provenance: {
    schemaVersion: 'phase-2a-auth-capture-v1';
    mode: 'human-parent-cli' | 'synthetic-test-only';
    environment: EnvironmentConfig['name'];
    uiOrigin: string;
    uiPath: string;
    stateShape: 'playwright-storage-state';
    stateLocation: 'external-requested-path';
  };
  summary: RunSummary;
}

function repositoryRoot(explicit?: string): string {
  return explicit ?? path.resolve(__dirname, '..', '..');
}

/** Resolve a capture target from the selected config and an explicit URL. */
export function resolveCaptureTarget(environment: EnvironmentConfig, uiUrl: string): string {
  const selected = new URL(validateUiUrl(environment, uiUrl));
  const configured = new URL(environment.uiBaseUrl);
  if (environment.name === 'dev' || environment.name === 'next') {
    if (
      selected.protocol !== 'https:' ||
      selected.hostname.toLowerCase() !== configured.hostname.toLowerCase() ||
      selected.port !== configured.port ||
      selected.pathname !== configured.pathname ||
      selected.search !== '' ||
      selected.hash !== '' ||
      selected.username !== '' ||
      selected.password !== ''
    ) {
      throw new Error('fail-closed: manual capture target must be the verified HTTPS Ripple path without query or fragment');
    }
  }
  return selected.toString();
}

function configuredProxyPort(): number {
  const configured = new URL(proxyServerUrl());
  return Number(configured.port) || DEFAULT_PROXY_PORT;
}

async function startCaptureProxy(
  environment: EnvironmentConfig,
  root: string,
  runId: string,
  testOnly: boolean
): Promise<{ proxy: OutboundProxyServer; state: ProxyRuntimeState; stateFile: string; eventLog: string }> {
  const runtimeRoot = path.join(root, '.tmp-nightwatch');
  const stateFile = testOnly
    ? path.join(runtimeRoot, `auth-capture-${runId}-proxy-state.json`)
    : proxyStatePath(root);
  const eventLog = testOnly
    ? path.join(runtimeRoot, `auth-capture-${runId}-proxy-events.jsonl`)
    : proxyEventLogPath(root);
  const proxy = await startOutboundProxy({
    policy: new OutboundPolicy(environment),
    environment: environment.name,
    host: '127.0.0.1',
    // An ephemeral port isolates local synthetic runs from Playwright global
    // setup. Real capture uses the canonical configured loopback port.
    port: testOnly ? 0 : configuredProxyPort(),
    eventLogPath: eventLog,
    runId,
  });
  try {
    const state: ProxyRuntimeState = {
      address: proxy.address,
      host: '127.0.0.1',
      port: proxy.port,
      environment: environment.name,
      policyVersion: OUTBOUND_POLICY_VERSION,
      eventLogPath: path.resolve(eventLog),
    };
    writeProxyRuntimeState(state, stateFile);
    return { proxy, state, stateFile, eventLog };
  } catch (error) {
    await proxy.close();
    throw error;
  }
}

function removeRuntimeFile(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch {
    // Runtime scratch and a state file created by this failed attempt are
    // best-effort cleanup targets; neither is a pre-existing user file.
  }
}

function reportStage(opts: DirectAuthCaptureOptions, event: AuthCaptureStageEvent): void {
  try {
    opts.stageReporter?.(event);
  } catch {
    // Diagnostics must never change the safety or cleanup behavior.
  }
}

function defaultStageReason(stage: AuthCaptureStage): string {
  return `${stage}_FAILED`;
}

function stageErrorFor(stage: AuthCaptureStage, error: unknown): AuthCaptureStageError {
  if (error instanceof AuthCaptureStageError && error.stage === stage) return error;
  return new AuthCaptureStageError({ stage, reason: defaultStageReason(stage) });
}

async function runStage<T>(
  opts: DirectAuthCaptureOptions,
  stage: AuthCaptureStage,
  action: () => Promise<T> | T
): Promise<T> {
  reportStage(opts, { stage, status: 'START' });
  try {
    const result = await action();
    reportStage(opts, { stage, status: 'PASS' });
    return result;
  } catch (error) {
    const failure = stageErrorFor(stage, error);
    reportStage(opts, {
      stage,
      status: 'FAIL',
      reason: failure.reason,
      expected: failure.expected,
      actual: failure.actual,
      detail: failure.detail,
    });
    throw failure;
  }
}

function hostMatchesEntry(hostname: string, port: string, entry: string): boolean {
  const normalized = entry.trim().toLowerCase();
  if (normalized.startsWith('*.')) return false;
  const colon = normalized.lastIndexOf(':');
  const entryHost = colon > -1 ? normalized.slice(0, colon) : normalized;
  const entryPort = colon > -1 ? normalized.slice(colon + 1) : '';
  return entryHost.replace(/^\[|\]$/g, '') === hostname.toLowerCase() && (entryPort === '' || entryPort === port);
}

function approvedAuthenticationHost(environment: EnvironmentConfig, location: URL): boolean {
  return environment.authHosts?.some((entry) => hostMatchesEntry(location.hostname, location.port, entry)) ?? false;
}

function captureTargetLocation(target: string): SanitizedLocation {
  return sanitizedLocation(target);
}

function verifyTargetLocation(
  environment: EnvironmentConfig,
  target: string,
  actualRaw: string
): SanitizedLocation {
  const expected = captureTargetLocation(target);
  const actual = sanitizedLocation(actualRaw);
  let location: URL;
  try {
    location = new URL(actualRaw);
  } catch {
    throw new AuthCaptureStageError({
      stage: 'TARGET_VERIFICATION',
      reason: 'TARGET_ORIGIN_MISMATCH',
      expected,
      actual,
    });
  }

  const configured = new URL(environment.uiBaseUrl);
  const exactTarget =
    location.protocol === configured.protocol &&
    location.hostname.toLowerCase() === configured.hostname.toLowerCase() &&
    location.port === configured.port &&
    location.pathname === configured.pathname;
  const allowedAuthRedirect =
    (environment.name === 'dev' || environment.name === 'next') &&
    location.protocol === 'https:' &&
    approvedAuthenticationHost(environment, location);
  const allowedLocalTarget =
    environment.name === 'local' &&
    location.origin === new URL(target).origin &&
    location.pathname === new URL(target).pathname;

  if (!exactTarget && !allowedAuthRedirect && !allowedLocalTarget) {
    throw new AuthCaptureStageError({
      stage: 'TARGET_VERIFICATION',
      reason: 'TARGET_ORIGIN_MISMATCH',
      expected,
      actual,
    });
  }
  return actual;
}

function verifyPostLoginLocation(
  environment: EnvironmentConfig,
  target: string,
  actualRaw: string,
  titlePresent: boolean
): SanitizedLocation {
  const expected = captureTargetLocation(target);
  const actual = sanitizedLocation(actualRaw);
  let location: URL;
  try {
    location = new URL(actualRaw);
  } catch {
    throw new AuthCaptureStageError({
      stage: 'POST_LOGIN_VERIFICATION',
      reason: 'POST_LOGIN_NOT_CONFIRMED',
      expected,
      actual,
    });
  }
  const configured = new URL(environment.uiBaseUrl);
  const configuredPath = configured.pathname.endsWith('/') ? configured.pathname : `${configured.pathname}/`;
  const onRippleTarget =
    location.protocol === 'https:' &&
    location.hostname.toLowerCase() === configured.hostname.toLowerCase() &&
    location.port === configured.port &&
    (location.pathname === configured.pathname || location.pathname.startsWith(configuredPath));
  const onLocalSyntheticTarget =
    environment.name === 'local' &&
    location.origin === new URL(target).origin &&
    location.pathname !== '/';
  if ((!onRippleTarget && !onLocalSyntheticTarget) || !titlePresent) {
    throw new AuthCaptureStageError({
      stage: 'POST_LOGIN_VERIFICATION',
      reason: 'POST_LOGIN_NOT_CONFIRMED',
      expected,
      actual,
    });
  }
  return actual;
}

/** Run one guarded capture from a parent Node process. */
export async function runDirectAuthCapture(opts: DirectAuthCaptureOptions): Promise<DirectAuthCaptureResult> {
  const testOnly = opts.testOnly === true;
  const hasTestOnlyOverrides =
    opts.artifactsRoot !== undefined ||
    opts.storageStateWriter !== undefined ||
    opts.stateValidator !== undefined ||
    opts.targetVerificationUrl !== undefined ||
    opts.targetNavigator !== undefined;
  if (hasTestOnlyOverrides && !testOnly) {
    throw new Error('fail-closed: direct capture test overrides are unavailable in real mode');
  }
  if (opts.completion.kind === 'synthetic-test-only' && (!testOnly || opts.environment.name !== 'local')) {
    throw new Error('fail-closed: synthetic capture completion is available only to local tests');
  }
  if ((process.env.NIGHTWATCH_STORAGE_STATE ?? '').trim() !== '') {
    throw new Error('fail-closed: direct auth capture refuses an existing storage state');
  }

  const root = repositoryRoot(opts.nightwatchRoot);
  const target = resolveCaptureTarget(opts.environment, opts.uiUrl);
  const outputPath = validateStorageStateOutputPath(opts.outputPath);
  const runId = createRunId();
  const provenance: DirectAuthCaptureResult['provenance'] = {
    schemaVersion: 'phase-2a-auth-capture-v1',
    mode: testOnly ? 'synthetic-test-only' : 'human-parent-cli',
    environment: opts.environment.name,
    uiOrigin: new URL(target).origin,
    uiPath: new URL(target).pathname,
    stateShape: 'playwright-storage-state',
    stateLocation: 'external-requested-path',
  };
  const recorder = new RunRecorder({
    runId,
    environment: opts.environment.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: 'direct-auth-capture',
    authenticated: true,
    artifactsRoot: opts.artifactsRoot,
  });
  recorder.addManifestEntry('captureProvenance', provenance);
  recorder.addManifestEntry('browserContainment', AUTHENTICATED_BROWSER_CONTRACT);

  let managed: Awaited<ReturnType<typeof startCaptureProxy>> | undefined;
  let browser: Browser | undefined;
  let guarded: NightwatchContext | undefined;
  let browserLaunched = false;
  let captureError: unknown;
  let cleanupError: unknown;
  let stateWriteAttempted = false;
  let summary: RunSummary | undefined;

  try {
    managed = await runStage(opts, 'PROXY_START', () => startCaptureProxy(opts.environment, root, runId, testOnly));
    await runStage(opts, 'PROXY_HEALTH', async () => {
      if (!(await checkProxyHealth(managed!.state))) {
        throw new AuthCaptureStageError({ stage: 'PROXY_HEALTH', reason: 'PROXY_HEALTH_FAILED' });
      }
      managed!.state = await requireProxyRuntime(opts.environment.name, managed!.stateFile);
    });
    browser = await runStage(opts, 'BROWSER_LAUNCH', () => chromium.launch({
      channel: 'chrome',
      headless: opts.headless ?? false,
      ...nightwatchChromiumLaunchOptions(managed!.state.address),
    }));
    browserLaunched = true;
    guarded = await runStage(opts, 'GUARD_INSTALL', () => createNightwatchContext(browser!, {
      env: opts.environment,
      recorder,
      uiBaseUrl: target,
      storageStatePath: null,
      trace: 'off',
      proxyStateFile: managed!.stateFile,
    }));
    await runStage(opts, 'TARGET_NAVIGATION', async () => {
      try {
        if (opts.targetNavigator !== undefined) {
          await opts.targetNavigator(guarded!.page, target);
        } else {
          await guarded!.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        }
      } catch {
        throw new AuthCaptureStageError({
          stage: 'TARGET_NAVIGATION',
          reason: 'TARGET_NAVIGATION_FAILED',
          expected: captureTargetLocation(target),
          actual: sanitizedLocation(guarded!.page.url()),
          detail: 'transport-failure',
        });
      }
    });

    const actualAfterNavigation = await runStage(opts, 'TARGET_VERIFICATION', () => {
      const actualRaw = opts.targetVerificationUrl ?? guarded!.page.url();
      const location = verifyTargetLocation(opts.environment, target, actualRaw);
      recorder.event({
        type: 'navigation',
        severity: 'info',
        message: 'target navigation verified',
        data: {
          fromOrigin: captureTargetLocation(target).origin,
          fromPath: captureTargetLocation(target).path,
          toOrigin: location.origin,
          toPath: location.path,
        },
      });
      return location;
    });
    opts.onReady?.(actualAfterNavigation);

    await runStage(opts, 'HUMAN_WAIT', async () => {
      await opts.completion.wait(guarded!.page);
      if (guarded!.monitor.failed) {
        throw new AuthCaptureStageError({ stage: 'HUMAN_WAIT', reason: 'SAFETY_MONITOR_FAILED' });
      }
    });

    await runStage(opts, 'POST_LOGIN_VERIFICATION', async () => {
      if (guarded!.monitor.failed) {
        throw new AuthCaptureStageError({ stage: 'POST_LOGIN_VERIFICATION', reason: 'SAFETY_MONITOR_FAILED' });
      }
      let titlePresent = false;
      try {
        titlePresent = (await guarded!.page.title()).trim().length > 0;
      } catch {
        titlePresent = false;
      }
      verifyPostLoginLocation(opts.environment, target, guarded!.page.url(), titlePresent);
    });

    stateWriteAttempted = true;
    await runStage(opts, 'STORAGE_STATE_WRITE', async () => {
      if (opts.storageStateWriter !== undefined) {
        await opts.storageStateWriter(guarded!.context, outputPath);
      } else {
        await guarded!.context.storageState({ path: outputPath });
      }
    });
    await runStage(opts, 'PROVENANCE_WRITE', () => {
      recorder.addManifestEntry('captureResult', {
        status: 'structurally-validated',
        stateShape: provenance.stateShape,
        stateLocation: provenance.stateLocation,
      });
    });
    await runStage(opts, 'STATE_VALIDATION', () => {
      if (opts.stateValidator !== undefined) return opts.stateValidator(outputPath);
      return validateStorageStateFile(outputPath);
    });
  } catch (error) {
    captureError = error;
    recorder.event({
      type: 'policy',
      severity: 'error',
      message: 'direct auth capture did not complete',
      data: { reason: 'capture-failed' },
    });
  } finally {
    reportStage(opts, { stage: 'CLEANUP', status: 'START' });
    try {
      await guarded?.close();
    } catch (error) {
      cleanupError ??= error;
    }
    try {
      await browser?.close();
    } catch (error) {
      cleanupError ??= error;
    }
    try {
      await managed?.proxy.close();
    } catch (error) {
      cleanupError ??= error;
    }
    if (cleanupError !== undefined) {
      const failure = new AuthCaptureStageError({ stage: 'CLEANUP', reason: 'CLEANUP_FAILED' });
      reportStage(opts, { stage: 'CLEANUP', status: 'FAIL', reason: failure.reason });
      captureError ??= failure;
    } else {
      reportStage(opts, { stage: 'CLEANUP', status: 'PASS' });
    }

    if (stateWriteAttempted && captureError !== undefined) removeRuntimeFile(outputPath);
    try {
      summary = await recorder.finalize({
        passed: captureError === undefined && cleanupError === undefined && !guarded?.monitor.failed,
        notes: captureError === undefined && cleanupError === undefined ? undefined : ['direct auth capture stopped before successful completion'],
      });
    } catch {
      captureError ??= new AuthCaptureStageError({ stage: 'CLEANUP', reason: 'CLEANUP_FAILED' });
    }
    if (managed !== undefined) {
      removeRuntimeFile(managed.stateFile);
      removeRuntimeFile(managed.eventLog);
    }
  }

  if (captureError !== undefined) throw captureError;
  if (cleanupError !== undefined) throw cleanupError;
  if (summary === undefined || !summary.passed) throw new AuthCaptureStageError({ stage: 'CLEANUP', reason: 'CLEANUP_FAILED' });
  return {
    browserLaunched,
    artifactDir: recorder.dir,
    proxyAddress: managed!.state.address,
    storageStatePath: outputPath,
    provenance,
    summary,
  };
}
