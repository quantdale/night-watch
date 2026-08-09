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
import { chromium, type Browser, type Page } from '@playwright/test';
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

function assertCaptureTarget(environment: EnvironmentConfig, uiUrl: string): string {
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
    const candidate: ProxyRuntimeState = {
      address: proxy.address,
      host: '127.0.0.1',
      port: proxy.port,
      environment: environment.name,
      policyVersion: OUTBOUND_POLICY_VERSION,
      eventLogPath: path.resolve(eventLog),
    };
    if (!(await checkProxyHealth(candidate))) {
      throw new Error('Nightwatch outer proxy failed its startup health check');
    }
    writeProxyRuntimeState(candidate, stateFile);
    const state = await requireProxyRuntime(environment.name, stateFile);
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
    // Runtime scratch is best-effort cleanup; it is never user state.
  }
}

/** Run one guarded capture from a parent Node process. */
export async function runDirectAuthCapture(opts: DirectAuthCaptureOptions): Promise<DirectAuthCaptureResult> {
  const testOnly = opts.testOnly === true;
  if (opts.completion.kind === 'synthetic-test-only' && (!testOnly || opts.environment.name !== 'local')) {
    throw new Error('fail-closed: synthetic capture completion is available only to local tests');
  }
  if ((process.env.NIGHTWATCH_STORAGE_STATE ?? '').trim() !== '') {
    throw new Error('fail-closed: direct auth capture refuses an existing storage state');
  }

  const root = repositoryRoot(opts.nightwatchRoot);
  const target = assertCaptureTarget(opts.environment, opts.uiUrl);
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
  });
  recorder.addManifestEntry('captureProvenance', provenance);
  recorder.addManifestEntry('browserContainment', AUTHENTICATED_BROWSER_CONTRACT);

  const managed = await startCaptureProxy(opts.environment, root, runId, testOnly);
  let browser: Browser | undefined;
  let guarded: NightwatchContext | undefined;
  let browserLaunched = false;
  let captureError: unknown;
  let closeError: unknown;
  let summary: RunSummary | undefined;

  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: opts.headless ?? false,
      ...nightwatchChromiumLaunchOptions(managed.state.address),
    });
    browserLaunched = true;
    guarded = await createNightwatchContext(browser, {
      env: opts.environment,
      recorder,
      uiBaseUrl: target,
      storageStatePath: null,
      trace: 'off',
      proxyStateFile: managed.stateFile,
    });
    await guarded.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await opts.completion.wait(guarded.page);
    if (guarded.monitor.failed) {
      throw new Error('fail-closed: guarded capture observed a safety or oracle failure before state write');
    }

    // The only state write in this workflow is Playwright's direct context
    // storageState() call to the already-validated external user path.
    await guarded.context.storageState({ path: outputPath });
    validateStorageStateFile(outputPath);
    recorder.addManifestEntry('captureResult', {
      status: 'structurally-validated',
      stateShape: provenance.stateShape,
      stateLocation: provenance.stateLocation,
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
    try {
      await guarded?.close();
    } catch (error) {
      closeError ??= error;
    }
    try {
      await browser?.close();
    } catch (error) {
      closeError ??= error;
    }
    summary = await recorder.finalize({
      passed: captureError === undefined && closeError === undefined && !guarded?.monitor.failed,
      notes: captureError === undefined && closeError === undefined ? undefined : ['direct auth capture stopped before successful completion'],
    });
    await managed.proxy.close();
    removeRuntimeFile(managed.stateFile);
    removeRuntimeFile(managed.eventLog);
  }

  if (captureError !== undefined) throw captureError;
  if (closeError !== undefined) throw closeError;
  if (summary === undefined || !summary.passed) throw new Error('fail-closed: direct auth capture did not produce a passing sanitized result');
  return {
    browserLaunched,
    artifactDir: recorder.dir,
    proxyAddress: managed.state.address,
    storageStatePath: outputPath,
    provenance,
    summary,
  };
}
