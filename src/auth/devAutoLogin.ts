// ---------------------------------------------------------------------------
// Nightwatch — guarded DEV authentication refresh.
//
// A valid external storage state is always preferred. This module is reached
// only when that state is absent, expired, or semantically unusable. The
// credential provider is consulted only after the DEV safety preflight and
// only this module receives the plaintext credential in memory.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from '@playwright/test';
import type { EnvironmentConfig } from '../core/environment/types';
import { validateUiUrl, createNightwatchContext, type NightwatchContext } from '../browser/context';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../browser/contract';
import {
  inspectStorageStateCookiePageReadability,
  inspectStorageStateKeySemantics,
  validateStorageStateFile,
  validateStorageStateOutputPath,
  atomicallyReplaceValidatedStorageState,
} from '../browser/fixtures/storageState';
import { inspectRipplePageAuthReadability } from '../browser/fixtures/pageAuthReadability';
import { waitForRippleStability } from '../browser/observers/stability';
import { isRippleStructurallyReady, isRippleRoutePath } from '../products/ripple/readiness';
import { RunRecorder, createRunId } from '../core/evidence/runRecorder';
import { runCanary } from '../core/safety/canary';
import { KNOWN_PRODUCTION_HOSTS } from '../core/safety/hosts';
import { OutboundPolicy, OUTBOUND_POLICY_VERSION } from '../core/safety/outboundPolicy';
import { checkProxyHealth, requireProxyRuntime } from '../proxy/runtime';
import type { DevCredentialProvider, DevLoginCredential } from './devCredentialProvider';
import { getDevCredentialProvider, DevCredentialUnavailableError } from './devCredentialProvider';
import {
  createSourceApprovedDevLoginBinding,
  fillAndSubmitSourceApprovedDevLogin,
  sourceApprovedDevLoginControls,
  type SourceApprovedDevLoginBinding,
  type SourceApprovedDevLoginControls,
} from './loginForm';

const AUTH_REFRESH_EVIDENCE_POLICY = Object.freeze({
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
});

export type DevAuthRefreshStatus = 'REUSED' | 'REFRESHED';

export interface DevAuthStateDiagnostics {
  stateExists: boolean;
  shapeValid: boolean;
  devProvenanceValid: boolean;
  requiredTokenPresent: boolean;
  requiredTokenUnexpired: boolean;
  domainApplicable: boolean;
  pathApplicable: boolean;
  pageReadable: boolean;
  applicationSemanticsValid: boolean;
  valid: boolean;
}

export interface DevAuthRefreshResult {
  status: DevAuthRefreshStatus;
  environment: 'dev';
  providerType: 'external-owner-only-file';
  accountAlias: 'ripple-dev-designated-account';
  storageClass: 'external-owner-only-secret-file';
  storageStatePath: string;
  authCaptureId?: string;
  autoRefresh: boolean;
  mfaOccurred: boolean;
}

export type DevAuthFailureCode =
  | 'AUTO_LOGIN_DEV_ONLY'
  | 'PRE_AUTH_SAFETY_FAILED'
  | 'LOCAL_DEV_SECRET_CONFIGURATION_REQUIRED'
  | 'AUTH_ROUTE_FAILURE'
  | 'AUTH_NETWORK_FAILURE'
  | 'AUTH_FORM_NOT_READY'
  | 'AUTH_FORM_BINDING_STALE'
  | 'LOGIN_FORM_REJECTED'
  | 'MFA_REQUIRED'
  | 'POST_LOGIN_AUTH_NOT_PAGE_READABLE'
  | 'AUTH_STATE_REPLACEMENT_FAILED';

export class DevAuthFailure extends Error {
  readonly code: DevAuthFailureCode;

  constructor(code: DevAuthFailureCode) {
    super(code);
    this.name = 'DevAuthFailure';
    this.code = code;
  }
}

export interface HumanMfaCompletion {
  wait(page: Page): Promise<void>;
}

export interface DevAuthRefreshOptions {
  browser: Browser;
  environment: EnvironmentConfig;
  uiUrl: string;
  storageStatePath: string;
  proxyStateFile?: string;
  provider?: DevCredentialProvider;
  mfaCompletion?: HumanMfaCompletion;
  artifactsRoot?: string;
  nightwatchRoot?: string;
}

function rootDirectory(explicit?: string): string {
  return explicit ?? path.resolve(__dirname, '..', '..');
}

function workspaceDirectory(root: string): string {
  return path.resolve(root, '..');
}

function sameHostAndPort(a: URL, b: URL): boolean {
  return a.hostname.toLowerCase() === b.hostname.toLowerCase() && a.port === b.port;
}

function hostMatchesEntry(hostname: string, port: string, entry: string): boolean {
  const normalized = entry.trim().toLowerCase();
  if (normalized.startsWith('*.')) return false;
  const colon = normalized.lastIndexOf(':');
  const entryHost = colon > -1 ? normalized.slice(0, colon) : normalized;
  const entryPort = colon > -1 ? normalized.slice(colon + 1) : '';
  return entryHost.replace(/^\[|\]$/g, '') === hostname.toLowerCase() && (entryPort === '' || entryPort === port);
}

function configuredTarget(environment: EnvironmentConfig, uiUrl: string): URL {
  if (environment.name !== 'dev') throw new DevAuthFailure('AUTO_LOGIN_DEV_ONLY');
  const configured = new URL(environment.uiBaseUrl);
  let selected: URL;
  try {
    selected = new URL(validateUiUrl(environment, uiUrl));
  } catch {
    throw new DevAuthFailure('AUTO_LOGIN_DEV_ONLY');
  }
  if (
    configured.protocol !== 'https:' ||
    selected.protocol !== 'https:' ||
    selected.username !== '' ||
    selected.password !== '' ||
    selected.search !== '' ||
    selected.hash !== '' ||
    !sameHostAndPort(selected, configured) ||
    selected.pathname !== configured.pathname
  ) {
    throw new DevAuthFailure('AUTO_LOGIN_DEV_ONLY');
  }
  return selected;
}

function approvedLoginLocation(environment: EnvironmentConfig, target: URL, rawLocation: string): boolean {
  let location: URL;
  try {
    location = new URL(rawLocation);
  } catch {
    return false;
  }
  if (location.protocol !== 'https:' || location.username !== '' || location.password !== '') return false;
  const configuredPath = new URL(environment.uiBaseUrl).pathname;
  const appOrigin = location.origin === target.origin;
  const authOrigin = environment.authHosts?.some((entry) => hostMatchesEntry(location.hostname, location.port, entry)) ?? false;
  if (!appOrigin && !authOrigin) return false;
  if (!isRippleRoutePath(configuredPath, location.pathname)) return false;
  if (appOrigin) {
    const normalized = location.pathname.replace(/\/+$/, '');
    return normalized === configuredPath.replace(/\/+$/, '') || normalized === `${configuredPath.replace(/\/+$/, '')}/login` || normalized === `${configuredPath.replace(/\/+$/, '')}/dashboard`;
  }
  return location.pathname === configuredPath || location.pathname === `${configuredPath}login`;
}

function approvedAuthenticatedLocation(environment: EnvironmentConfig, target: URL, rawLocation: string): boolean {
  let location: URL;
  try {
    location = new URL(rawLocation);
  } catch {
    return false;
  }
  return location.protocol === 'https:' && location.origin === target.origin && isRippleRoutePath(new URL(environment.uiBaseUrl).pathname, location.pathname);
}

function statePendingPath(outputPath: string, captureId: string): string {
  return path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${captureId}.pending.json`);
}

function stateFacts(statePath: string, target: URL, environment: EnvironmentConfig): DevAuthStateDiagnostics {
  const empty: DevAuthStateDiagnostics = {
    stateExists: false,
    shapeValid: false,
    devProvenanceValid: false,
    requiredTokenPresent: false,
    requiredTokenUnexpired: false,
    domainApplicable: false,
    pathApplicable: false,
    pageReadable: false,
    applicationSemanticsValid: false,
    valid: false,
  };
  try {
    validateStorageStateFile(statePath);
  } catch {
    return empty;
  }
  try {
    const semantics = inspectStorageStateKeySemantics(statePath, {
      authTokenKey: 'mo_access_token',
      apiTypeKey: 'api_type',
      apiTypeExpected: 'dev',
      appTypeKey: 'app_type',
      appTypeExpected: 'alphaus',
    });
    const readability = inspectStorageStateCookiePageReadability(statePath, {
      cookieKey: 'mo_access_token',
      appOrigin: target.origin,
      appPath: target.pathname,
    });
    const applicationSemanticsValid =
      (!semantics.apiTypePresent || semantics.apiTypeMatchesExpected) &&
      (!semantics.appTypePresent || semantics.appTypeMatchesExpected);
    const valid =
      semantics.authTokenPresent &&
      semantics.authTokenStructurallyNonEmpty &&
      applicationSemanticsValid &&
      readability.pageReadable;
    return {
      stateExists: true,
      shapeValid: true,
      devProvenanceValid: applicationSemanticsValid,
      requiredTokenPresent: semantics.authTokenPresent,
      requiredTokenUnexpired: !readability.expired,
      domainApplicable: readability.domainApplicable,
      pathApplicable: readability.pathApplicable,
      pageReadable: readability.pageReadable,
      applicationSemanticsValid,
      valid,
    };
  } catch {
    return { ...empty, stateExists: true, shapeValid: true };
  }
}

export function inspectDevAuthState(statePath: string, uiUrl: string, environment: EnvironmentConfig): DevAuthStateDiagnostics {
  const target = configuredTarget(environment, uiUrl);
  return stateFacts(statePath, target, environment);
}

/**
 * Preflight for the credential-bearing path. This function intentionally
 * contains no provider call and no secret-bearing input. Callers must invoke
 * it before getDevLoginCredential().
 */
export async function runDevAuthSafetyPreflight(opts: {
  environment: EnvironmentConfig;
  uiUrl: string;
  proxyStateFile?: string;
}): Promise<void> {
  if (opts.environment.name !== 'dev') throw new DevAuthFailure('AUTO_LOGIN_DEV_ONLY');
  const target = configuredTarget(opts.environment, opts.uiUrl);
  const policy = new OutboundPolicy(opts.environment);
  if (policy.decide(target.toString()).verdict !== 'allow') throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  for (const host of [...(opts.environment.apiHosts ?? []), ...(opts.environment.authHosts ?? [])]) {
    if (policy.decide(`https://${host}/`).verdict !== 'allow') throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  }
  for (const host of KNOWN_PRODUCTION_HOSTS) {
    if (policy.decide(`https://${host}/`).verdict !== 'deny') throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  }
  const canary = runCanary(policy);
  if (!canary.pass || policy.environment.name !== 'dev') {
    throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  }
  const proxy = await requireProxyRuntime('dev', opts.proxyStateFile).catch(() => null);
  if (proxy === null || !(await checkProxyHealth(proxy))) throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  const browserValues = Object.values(AUTHENTICATED_BROWSER_CONTRACT);
  if (browserValues.length !== 7 || !browserValues.every(Boolean)) throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  const evidenceValues = Object.values(AUTH_REFRESH_EVIDENCE_POLICY);
  if (evidenceValues.length !== 10 || evidenceValues[0] !== true || evidenceValues[5] !== true || evidenceValues.slice(1).filter((value) => value === false).length !== 8) {
    throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
  }
  // The target and login origin are checked against the same selected policy;
  // a later browser/MCP consumer cannot widen this decision.
  if (!approvedLoginLocation(opts.environment, target, target.toString())) throw new DevAuthFailure('PRE_AUTH_SAFETY_FAILED');
}

async function uniqueVisible(locator: ReturnType<Page['locator']>, timeoutMs: number): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: timeoutMs });
    return (await locator.count()) === 1 && await locator.first().isVisible();
  } catch {
    return false;
  }
}

async function waitForLoginControls(page: Page, environment: EnvironmentConfig, target: URL): Promise<SourceApprovedDevLoginControls> {
  const deadline = Date.now() + 30_000;
  const controls = sourceApprovedDevLoginControls(page);
  while (Date.now() < deadline) {
    if (page.isClosed() || !approvedLoginLocation(environment, target, page.url())) throw new DevAuthFailure('AUTH_ROUTE_FAILURE');
    if (await uniqueVisible(controls.username, 500) && await uniqueVisible(controls.password, 500) && await uniqueVisible(controls.submit, 500)) {
      return controls;
    }
    await page.waitForTimeout(250);
  }
  throw new DevAuthFailure('AUTH_FORM_NOT_READY');
}

export function isApprovedDevAuthTokenExchange(environment: EnvironmentConfig, target: URL, rawLocation: string): boolean {
  let location: URL;
  try {
    location = new URL(rawLocation);
  } catch {
    return false;
  }
  const configuredPath = new URL(environment.uiBaseUrl).pathname;
  const expectedPath = `${configuredPath.replace(/\/+$/, '')}/access_token`;
  const authOrigin = environment.authHosts?.some((entry) => hostMatchesEntry(location.hostname, location.port, entry)) ?? false;
  return location.protocol === 'https:' && location.username === '' && location.password === '' &&
    authOrigin && location.pathname === expectedPath && location.search === '' && location.hash === '' &&
    target.protocol === 'https:';
}

async function waitForAuthTokenExchange(
  page: Page,
  environment: EnvironmentConfig,
  target: URL,
): Promise<number> {
  try {
    const response = await page.waitForResponse(
      candidate => isApprovedDevAuthTokenExchange(environment, target, candidate.url()),
      { timeout: 30_000 },
    );
    return response.status();
  } catch {
    throw new DevAuthFailure('AUTH_NETWORK_FAILURE');
  }
}

async function authenticatedShellCheckpoint(page: Page, environment: EnvironmentConfig, target: URL): Promise<boolean> {
  if (!approvedAuthenticatedLocation(environment, target, page.url())) return false;
  const readability = await inspectRipplePageAuthReadability(page);
  if (!readability.evaluationSucceeded || !readability.tokenPageReadable || !readability.tokenNonEmpty || readability.aggregatePageBootstrapSemantics !== 'VALID') {
    return false;
  }
  const structural = {
    documentReadyState: await page.evaluate(() => {
      const pageGlobal = globalThis as unknown as { document?: { readyState?: string } };
      return pageGlobal.document?.readyState ?? 'unavailable';
    }).catch(() => 'unavailable'),
    bootstrapMountSelector: '#app',
    renderedShellSelector: '.q-layout-container.layout',
    renderedShellPresent: await page.locator('.q-layout-container.layout').count() === 1,
  };
  return isRippleStructurallyReady(structural);
}

async function verifyAuthenticatedPage(
  page: Page,
  context: NightwatchContext,
  environment: EnvironmentConfig,
  target: URL,
): Promise<void> {
  if (context.monitor.safetyFailed || !approvedAuthenticatedLocation(environment, target, page.url())) {
    throw new DevAuthFailure('AUTH_ROUTE_FAILURE');
  }
  const readability = await inspectRipplePageAuthReadability(page);
  if (!readability.evaluationSucceeded || !readability.tokenPageReadable || !readability.tokenNonEmpty || readability.aggregatePageBootstrapSemantics !== 'VALID') {
    throw new DevAuthFailure('POST_LOGIN_AUTH_NOT_PAGE_READABLE');
  }
  const stable = await waitForRippleStability({
    quietMs: 750,
    timeoutMs: 30_000,
    monitor: context.monitor,
    sample: async () => {
      const route = (() => {
        try {
          const current = new URL(page.url());
          return current.origin === target.origin ? current.pathname : 'UNAPPROVED';
        } catch {
          return 'UNAVAILABLE';
        }
      })();
      const structural = {
        documentReadyState: await page.evaluate(() => {
          const pageGlobal = globalThis as unknown as { document?: { readyState?: string } };
          return pageGlobal.document?.readyState ?? 'unavailable';
        }).catch(() => 'unavailable'),
        bootstrapMountSelector: '#app',
        renderedShellSelector: '.q-layout-container.layout',
        renderedShellPresent: await page.locator('.q-layout-container.layout').count() === 1,
      };
      return {
        ...structural,
        route,
        fatal: page.isClosed() || context.monitor.safetyFailed,
      };
    },
  });
  if (!stable) throw new DevAuthFailure('POST_LOGIN_AUTH_NOT_PAGE_READABLE');
  const finalStructure = {
    documentReadyState: await page.evaluate(() => {
      const pageGlobal = globalThis as unknown as { document?: { readyState?: string } };
      return pageGlobal.document?.readyState ?? 'unavailable';
    }).catch(() => 'unavailable'),
    bootstrapMountSelector: '#app',
    renderedShellSelector: '.q-layout-container.layout',
    renderedShellPresent: await page.locator('.q-layout-container.layout').count() === 1,
  };
  if (!isRippleStructurallyReady(finalStructure) || !approvedAuthenticatedLocation(environment, target, page.url())) {
    throw new DevAuthFailure('POST_LOGIN_AUTH_NOT_PAGE_READABLE');
  }
}

async function waitForPostSubmit(
  page: Page,
  context: NightwatchContext,
  environment: EnvironmentConfig,
  target: URL,
  authResponseStatus: number,
): Promise<'AUTHENTICATED' | 'MFA_REQUIRED'> {
  const deadline = Date.now() + 30_000;
  const mfa = page.locator('input[name="mfaToken"], input[name="emailOtp"]');
  if (authResponseStatus === 401 || authResponseStatus === 403) {
    const mfaDeadline = Date.now() + 5_000;
    while (Date.now() < mfaDeadline) {
      if (await uniqueVisible(mfa, 200)) return 'MFA_REQUIRED';
      await page.waitForTimeout(100);
    }
    throw new DevAuthFailure('LOGIN_FORM_REJECTED');
  }
  if (authResponseStatus < 200 || authResponseStatus >= 300) throw new DevAuthFailure('AUTH_NETWORK_FAILURE');
  while (Date.now() < deadline) {
    if (context.monitor.safetyFailed) throw new DevAuthFailure('AUTH_ROUTE_FAILURE');
    if (await uniqueVisible(mfa, 200)) return 'MFA_REQUIRED';
    if (await authenticatedShellCheckpoint(page, environment, target)) {
      await verifyAuthenticatedPage(page, context, environment, target);
      return 'AUTHENTICATED';
    }
    if (!approvedLoginLocation(environment, target, page.url())) throw new DevAuthFailure('AUTH_ROUTE_FAILURE');
    await page.waitForTimeout(250);
  }
  throw new DevAuthFailure('LOGIN_FORM_REJECTED');
}

function safeErrorCode(error: unknown): DevAuthFailureCode {
  if (error instanceof DevAuthFailure) return error.code;
  if (error instanceof Error && error.message === 'AUTH_FORM_BINDING_STALE') return 'AUTH_FORM_BINDING_STALE';
  return 'AUTH_NETWORK_FAILURE';
}

async function writeAndValidatePendingState(
  context: NightwatchContext,
  pendingPath: string,
  target: URL,
  environment: EnvironmentConfig,
  recorder: RunRecorder,
  browser: Browser,
  proxyStateFile: string | undefined,
): Promise<void> {
  await context.context.storageState({ path: pendingPath });
  const pendingFacts = stateFacts(pendingPath, target, environment);
  if (!pendingFacts.valid) throw new DevAuthFailure('AUTH_STATE_REPLACEMENT_FAILED');
  const validationContext = await createNightwatchContext(browser, {
    env: environment,
    recorder,
    uiBaseUrl: target.toString(),
    storageStatePath: pendingPath,
    trace: 'off',
    proxyStateFile,
  });
  try {
    await validationContext.page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await verifyAuthenticatedPage(validationContext.page, validationContext, environment, target);
  } catch (error) {
    throw error instanceof DevAuthFailure ? error : new DevAuthFailure('AUTH_STATE_REPLACEMENT_FAILED');
  } finally {
    await validationContext.close();
  }
}

export async function runDevAuthRefresh(opts: DevAuthRefreshOptions): Promise<DevAuthRefreshResult> {
  const target = configuredTarget(opts.environment, opts.uiUrl);
  const outputPath = validateStorageStateOutputPath(opts.storageStatePath, { allowExisting: true });
  const existing = stateFacts(outputPath, target, opts.environment);
  if (existing.valid) {
    return {
      status: 'REUSED',
      environment: 'dev',
      providerType: 'external-owner-only-file',
      accountAlias: 'ripple-dev-designated-account',
      storageClass: 'external-owner-only-secret-file',
      storageStatePath: outputPath,
      autoRefresh: false,
      mfaOccurred: false,
    };
  }

  await runDevAuthSafetyPreflight({ environment: opts.environment, uiUrl: target.toString(), proxyStateFile: opts.proxyStateFile });
  const provider = opts.provider ?? getDevCredentialProvider();
  let credential: DevLoginCredential | undefined;
  const captureId = createRunId();
  const recorder = new RunRecorder({
    runId: captureId,
    environment: 'dev',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'dev-auth-refresh',
    authenticated: true,
    artifactsRoot: opts.artifactsRoot,
  });
  recorder.addManifestEntry('authentication', {
    kind: 'AUTH_SESSION_CREATION',
    productStateMutation: false,
    providerType: provider.providerType,
    environment: 'dev',
    accountAlias: provider.accountAlias,
    storageClass: provider.storageClass,
    mcpSecretInputAllowed: false,
    authenticatedEvidencePolicy: 'metadata-first-no-bodies-no-dom-no-storage-no-screenshots-no-traces',
  });
  let guarded: NightwatchContext | undefined;
  let loginBinding: SourceApprovedDevLoginBinding | undefined;
  let pendingPath: string | undefined;
  let mfaOccurred = false;
  let recorderFinalized = false;
  try {
    try {
      guarded = await createNightwatchContext(opts.browser, {
        env: opts.environment,
        recorder,
        uiBaseUrl: target.toString(),
        storageStatePath: null,
        trace: 'off',
        proxyStateFile: opts.proxyStateFile,
      });
      await guarded.page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (!approvedLoginLocation(opts.environment, target, guarded.page.url())) throw new DevAuthFailure('AUTH_ROUTE_FAILURE');
      const controls = await waitForLoginControls(guarded.page, opts.environment, target);
      loginBinding = await createSourceApprovedDevLoginBinding(guarded.page, controls);
      await loginBinding.assertCurrent();
      const activeBinding = loginBinding;

      // Mandatory ordering: all safety conditions and the one-shot document
      // binding are established before the provider is asked for plaintext.
      credential = provider.getDevLoginCredential();
      if (credential.username.trim() === '' || credential.password === '') throw new DevAuthFailure('LOCAL_DEV_SECRET_CONFIGURATION_REQUIRED');
      const [authResponseStatus] = await Promise.all([
        waitForAuthTokenExchange(guarded.page, opts.environment, target),
        fillAndSubmitSourceApprovedDevLogin(activeBinding, credential),
      ]);
      const postSubmit = await waitForPostSubmit(guarded.page, guarded, opts.environment, target, authResponseStatus);
      if (postSubmit === 'MFA_REQUIRED') {
        mfaOccurred = true;
        if (opts.mfaCompletion === undefined) throw new DevAuthFailure('MFA_REQUIRED');
        await opts.mfaCompletion.wait(guarded.page);
        await verifyAuthenticatedPage(guarded.page, guarded, opts.environment, target);
      }

      pendingPath = statePendingPath(outputPath, captureId);
      validateStorageStateOutputPath(pendingPath);
      await writeAndValidatePendingState(guarded, pendingPath, target, opts.environment, recorder, opts.browser, opts.proxyStateFile);
      atomicallyReplaceValidatedStorageState(pendingPath, outputPath, { allowExisting: true });
      pendingPath = undefined;
      await recorder.finalize({
        passed: !guarded.monitor.safetyFailed,
        notes: ['DEV-only automatic authentication session creation', 'product-state-mutation=false', `mfa=${mfaOccurred}`],
      });
      recorderFinalized = true;
      return {
        status: 'REFRESHED',
        environment: 'dev',
        providerType: 'external-owner-only-file',
        accountAlias: 'ripple-dev-designated-account',
        storageClass: 'external-owner-only-secret-file',
        storageStatePath: outputPath,
        authCaptureId: captureId,
        autoRefresh: true,
        mfaOccurred,
      };
    } catch (error) {
      const code = safeErrorCode(error);
      if (error instanceof DevCredentialUnavailableError) throw new DevAuthFailure('LOCAL_DEV_SECRET_CONFIGURATION_REQUIRED');
      throw new DevAuthFailure(code);
    }
  } finally {
    await loginBinding?.revoke();
    if (credential !== undefined) {
      credential.username = '';
      credential.password = '';
    }
    if (pendingPath !== undefined) {
      try { fs.unlinkSync(pendingPath); } catch { /* preserve the previous state */ }
    }
    try { await guarded?.close(); } catch { /* cleanup is best effort; recorder remains sanitized */ }
    if (!recorderFinalized) {
      try { await recorder.finalize({ passed: false, notes: ['DEV auth refresh stopped before a successful authenticated capture'] }); } catch { /* best effort */ }
    }
  }
}

export function authRefreshStorageClass(): string {
  return 'external-owner-only-secret-file';
}

export function authRefreshPolicyVersion(): string {
  return OUTBOUND_POLICY_VERSION;
}

export function authRefreshRootForDiagnostics(root = rootDirectory()): string {
  return workspaceDirectory(root);
}
