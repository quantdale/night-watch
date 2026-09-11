// ---------------------------------------------------------------------------
// Phase 9B contained DEV semantic acceptance runner (owner-authorized).
//
// ONE acceptance execution: the FIXED ripple-common-exchange-read journey
// pair (FIRST observation + ONE fresh-context replay) against the canonical
// verified DEV URL, evaluating the admitted real-source expectation
// ripple.common-exchange.read.real-source-shape through the Phase 9A.1
// semantic channel. No journey selector, no fallback, no third attempt.
//
// Pre-browser hard gates (metadata-only, no product contact):
//   - one-shot gate NIGHTWATCH_PHASE_9B_REAL=1 (the launcher sets it)
//   - read-only remote source freshness (gh api; disposable /tmp mirror)
//   - mechanical derivation at the freshness-approved snapshot
//   - resolver RESOLVED for the selected target only
//   - exact-head implementation CI green (gh api actions run)
//   - auth structural gate, proxy health, canonical target exactness
//
// The runner reuses the established Phase 2B machinery: runRealRunGate,
// createNightwatchContext, runDeclarativeJourney, endpoint registry, auth
// readability checks, replay comparison, proxy/safety accounting. Phase 9B
// ADDS: the admitted real-source semantic resolver, evaluation receipt
// collection, and semantic acceptance assertions. It does NOT become a
// parallel browser framework.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { inspectRipplePageAuthReadability } from '../../src/browser/fixtures/pageAuthReadability';
import {
  inspectStorageStateCookiePageReadability,
  inspectStorageStateKeySemantics,
  validateStorageStateFile,
} from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { assertAuthCapabilityPreflight } from '../../src/auth/capabilityLifecycle';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { assertRealRunGate, runRealRunGate } from '../../src/core/safety/realRunGate';
import { snapshotRepositories } from '../../src/core/repositories/snapshotter';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';
import { isProxyViolation, readProxyEvents } from '../../src/proxy/events';
import { checkProxyHealth, readProxyRuntimeState } from '../../src/proxy/runtime';
import { compareJourneyReplay } from '../../src/core/journeys/replay';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import type { JourneyDefinition, JourneyEvidence } from '../../src/core/journeys/types';
import {
  buildRippleJourneyEndpointRegistry,
  getRippleJourneyDefinition,
  RIPPLE_PHASE_2B_SOURCE_SHA,
} from '../../src/products/ripple/journeyContracts';
import { PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';
import {
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { createRealSourceResolver, type RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { SemanticHookOracle } from '../../src/oracles/semantic';
import type { SemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { classifySourceFreshness, freshnessBlockToken, type Phase9bFreshnessVerdict } from '../../src/core/phase9b/freshness';
import { assertPhase9bPreflight, evaluatePhase9bPreflight } from '../../src/core/phase9b/preflight';
import {
  comparePhase9bReplaySummaries,
  summarizePhase9bPass,
  type Phase9bSemanticSummary,
} from '../../src/core/phase9b/summary';
import {
  assertAcceptanceRunsAfterAuthGate,
  assertRealSourceExpectationProof,
  evaluateContainedDevAcceptance,
} from '../../src/core/semanticAcceptance';

const AUTH_CAPTURE_COMMAND = 'npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"';

// ---------------------------------------------------------------------------
// Phase 9B fixed acceptance identity (SPEC §4, §17, §18).
// ---------------------------------------------------------------------------
const SELECTED_JOURNEY_ID = 'ripple-common-exchange-read';
const SELECTED_TARGET_ID = 'ripple.common-exchange.read';
const SELECTED_EXPECTATION_ID = 'ripple.common-exchange.read.real-source-shape';
const RIPPLE_API_REPO = 'mobingilabs/ripple-api';
const RIPPLE_UI_REPO = 'mobingilabs/ripple-ui';
const RIPPLE_API_REMOTE_BRANCH = 'master';
const RIPPLE_UI_REMOTE_BRANCH = 'dev';
const REVIEWED_API_SHA = PHASE5_SOURCE_SHAS.rippleApi;
const REVIEWED_UI_SHA = RIPPLE_PHASE_2B_SOURCE_SHA;
const CANONICAL_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
const DISPOSABLE_ROOT = process.env.NIGHTWATCH_PHASE_9B_DISPOSABLE_ROOT ?? '/tmp/nightwatch-phase9b-source';
const DISPOSABLE_MARKER = '.nightwatch-phase9b-sha';

/** Relevant common-exchange contract paths (SPEC §7). */
const API_RELEVANT_PATHS = ['src/App/Handler/ExchangeRate.php', 'src/App/Route/Config/Routing.yaml'];
/** Journey callsite / route / page paths (SPEC §7). */
const UI_RELEVANT_PATHS = [
  'src/router.js',
  'src/pages/ExchangeRate_v2/GlobalExchangeRate/index.vue',
  'src/vuex/api/exchangeRateGlobal.js',
];

interface AuthFacts {
  valid: boolean;
  provenanceMatch: boolean;
  tokenStructurallyValid: boolean;
  environmentSemanticsValid: boolean;
  pageReadable: boolean;
  stateExists: boolean;
}

interface PassSafety {
  productionAttempts: number;
  proxyViolations: number;
  unknownDestinations: number;
  mutations: number;
  actionCausedUnknown: number;
  dbQueries: number;
}

interface PassObservation {
  runId: string;
  pass: 'first' | 'replay';
  evidence: JourneyEvidence;
  auth: AuthFacts;
  safety: PassSafety;
  receipts: SemanticEvaluationReceipt[];
  summary: Phase9bSemanticSummary;
}

interface FreshnessResolution {
  verdict: Phase9bFreshnessVerdict;
  approvedSha: string;
  remoteApiSha: string | null;
  remoteUiSha: string | null;
  derivation: { ok: boolean; targetId?: string; failure?: string };
}

// ---------------------------------------------------------------------------
// Local helpers (read-only; no product contact).
// ---------------------------------------------------------------------------

function rootDirectory(): string {
  return path.resolve(__dirname, '..', '..');
}

function canonicalTarget(env: EnvironmentConfig): string {
  const override = process.env.NIGHTWATCH_UI_URL;
  if (override !== undefined && override.trim() !== '') {
    throw new Error('fail-closed: Phase 9B uses the canonical fixed DEV URL only; NIGHTWATCH_UI_URL is not accepted');
  }
  return validateUiUrl(env, env.uiBaseUrl);
}

function nightwatchSha(root: string): string | null {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const value = (result.stdout ?? '').trim();
  return result.status === 0 && /^[0-9a-f]{40}$/i.test(value) ? value : null;
}

function nightwatchDirtyPaths(root: string): string[] {
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
  if (result.status !== 0) return ['git-status-unavailable'];
  return (result.stdout ?? '').split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean);
}

async function repositoryGateFacts(root: string): Promise<{
  snapshotRecorded: boolean;
  snapshotsValid: boolean;
  alphausRepositoriesSnapshotValid: boolean;
  nightwatchDirtyPaths: string[];
  documentedNightwatchDirtyPaths: string[];
  snapshots: RepoSnapshotRecord[];
}> {
  const workspaceRoot = path.resolve(root, '..', '..');
  const snapshots = await snapshotRepositories({
    reposRoot: path.join(workspaceRoot, 'REPOSITORIES', 'mobingilabs'),
    repos: ['ouchan', 'ripple-api', 'ripple-ui'],
  });
  return {
    snapshotRecorded: true,
    snapshotsValid: snapshots.length === 3 && snapshots.every((item) => item.ok),
    alphausRepositoriesSnapshotValid: true,
    nightwatchDirtyPaths: nightwatchDirtyPaths(root),
    documentedNightwatchDirtyPaths: [],
    snapshots,
  };
}

function authFacts(statePath: string, target: string, env: EnvironmentConfig): AuthFacts {
  let stateExists = false;
  try {
    validateStorageStateFile(statePath);
    stateExists = true;
  } catch {
    return {
      valid: false,
      provenanceMatch: false,
      tokenStructurallyValid: false,
      environmentSemanticsValid: false,
      pageReadable: false,
      stateExists,
    };
  }
  const semantics = inspectStorageStateKeySemantics(statePath, {
    authTokenKey: 'mo_access_token',
    apiTypeKey: 'api_type',
    apiTypeExpected: env.name,
    appTypeKey: 'app_type',
    appTypeExpected: 'alphaus',
  });
  const targetUrl = new URL(target);
  const readability = inspectStorageStateCookiePageReadability(statePath, {
    cookieKey: 'mo_access_token',
    appOrigin: targetUrl.origin,
    appPath: targetUrl.pathname,
  });
  const environmentSemanticsValid =
    (!semantics.apiTypePresent || semantics.apiTypeMatchesExpected) &&
    (!semantics.appTypePresent || semantics.appTypeMatchesExpected);
  const tokenStructurallyValid = semantics.authTokenPresent && semantics.authTokenStructurallyNonEmpty;
  return {
    valid: stateExists && tokenStructurallyValid && environmentSemanticsValid && readability.pageReadable,
    provenanceMatch: true,
    tokenStructurallyValid,
    environmentSemanticsValid,
    pageReadable: readability.pageReadable,
    stateExists,
  };
}

function contractGate(definition: JourneyDefinition): void {
  if (definition.unknownEndpoints.length > 0) throw new Error('fail-closed: selected journey requires UNKNOWN behavior');
  for (const step of definition.allowedSteps) {
    if (step.semanticClassification !== 'KNOWN_READ' && step.semanticClassification !== 'LOCAL_ONLY') {
      throw new Error(`fail-closed: selected journey step ${step.stepId} is not read-only`);
    }
  }
}

// ---------------------------------------------------------------------------
// Source freshness (read-only remote metadata; disposable /tmp mirror).
// ---------------------------------------------------------------------------

function remoteBranchHead(repoId: string, branch: string): string | null {
  try {
    const out = execFileSync('gh', ['api', `repos/${repoId}/branches/${branch}`, '--jq', '.commit.sha'], {
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const value = (out ?? '').trim();
    return /^[0-9a-f]{40}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** Recreate the disposable mirror for a repo at the exact SHA (tarball via
 *  gh api — read-only with respect to the source; writes only under /tmp).
 *  The mirror carries a synthetic pinned git ref (HEAD -> the exact SHA) so
 *  the read-only sibling source adapter can read it and resolve currentness
 *  to the freshness-approved snapshot. No commits are ever created. */
function ensureDisposableSnapshot(repoId: string, sha: string): string {
  const dir = path.join(DISPOSABLE_ROOT, repoId);
  const marker = path.join(dir, DISPOSABLE_MARKER);
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === sha) {
    return dir;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const tarball = path.join(DISPOSABLE_ROOT, `${repoId.replaceAll('/', '-')}.tar.gz`);
  const out = execFileSync('gh', ['api', `repos/${repoId}/tarball/${sha}`], {
    encoding: null,
    timeout: 180_000,
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  fs.writeFileSync(tarball, out);
  execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', dir], { stdio: 'ignore', timeout: 120_000 });
  // Synthetic pinned ref: HEAD -> refs/heads/phase9b-fresh -> <exact SHA>.
  fs.mkdirSync(path.join(dir, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/phase9b-fresh\n');
  fs.writeFileSync(path.join(dir, '.git', 'refs', 'heads', 'phase9b-fresh'), `${sha}\n`);
  fs.writeFileSync(marker, `${sha}\n`);
  return dir;
}

function fileAt(repoRoot: string, relativePath: string): string | null {
  const file = path.join(repoRoot, relativePath);
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  } catch {
    return null;
  }
}

/** Extract the global-exchange route block from router.js (route identity). */
function globalExchangeRouteBlock(routerSource: string): string | null {
  const marker = "path: '/global-exchange-rate-v2'";
  const index = routerSource.indexOf(marker);
  if (index === -1) return null;
  const close = routerSource.indexOf('},', index);
  if (close === -1) return null;
  return routerSource.slice(index, close + 2);
}

function resolveFreshness(disposableApiDir: string, disposableUiDir: string): FreshnessResolution {
  const remoteApiSha = remoteBranchHead(RIPPLE_API_REPO, RIPPLE_API_REMOTE_BRANCH);
  const remoteUiSha = remoteBranchHead(RIPPLE_UI_REPO, RIPPLE_UI_REMOTE_BRANCH);

  // Exact-range diff: relevant API contract files (canonical reviewed
  // checkout vs disposable at the remote SHA).
  const canonicalApiRoot = path.join(CANONICAL_SIBLING_ROOT, 'mobingilabs', 'ripple-api');
  const canonicalUiRoot = path.join(CANONICAL_SIBLING_ROOT, 'mobingilabs', 'ripple-ui');
  let relevantSourceChanged = false;
  for (const relativePath of API_RELEVANT_PATHS) {
    if (fileAt(canonicalApiRoot, relativePath) !== fileAt(disposableApiDir, relativePath)) relevantSourceChanged = true;
  }
  // Journey-relevant UI paths: page component + API callsite must be byte-
  // identical; the router must still carry the exact global-exchange route
  // block (unrelated route changes are not journey drift).
  let journeySourceChanged = false;
  const routerReviewed = fileAt(canonicalUiRoot, 'src/router.js');
  const routerRemote = fileAt(disposableUiDir, 'src/router.js');
  if (routerReviewed === null || routerRemote === null || globalExchangeRouteBlock(routerReviewed) !== globalExchangeRouteBlock(routerRemote)) {
    journeySourceChanged = true;
  }
  for (const relativePath of UI_RELEVANT_PATHS) {
    if (relativePath === 'src/router.js') continue;
    if (fileAt(canonicalUiRoot, relativePath) !== fileAt(disposableUiDir, relativePath)) journeySourceChanged = true;
  }

  // Mechanical derivation against the approved snapshot (disposable reader).
  const access = createSiblingSourceAccess(DISPOSABLE_ROOT);
  let derivation: { ok: boolean; targetId?: string; failure?: string };
  if (remoteApiSha === null) {
    derivation = { ok: false, failure: 'SOURCE_UNAVAILABLE' };
  } else {
    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === RIPPLE_API_REPO),
      { repoId: RIPPLE_API_REPO, sha: remoteApiSha },
      access.reader,
    );
    const selected = report.derived.find((item) => item.expectation.targetId === SELECTED_TARGET_ID);
    const failure = report.failures.find((item) => item.recipeId === `recipe.${SELECTED_TARGET_ID}`);
    derivation = {
      ok: selected !== undefined,
      ...(selected === undefined ? {} : { targetId: selected.expectation.targetId }),
      ...(failure === undefined ? {} : { failure: failure.failure }),
    };
  }

  const verdict = classifySourceFreshness({
    remoteSha: remoteApiSha,
    reviewedSha: REVIEWED_API_SHA,
    relevantSourceChanged,
    journeySourceChanged,
    derivation,
    targetId: SELECTED_TARGET_ID,
  });
  const approvedSha = verdict.kind === 'USE_REVIEWED_SNAPSHOT' ? verdict.sha : verdict.kind === 'REDERIVE_FRESH_SNAPSHOT' ? verdict.sha : REVIEWED_API_SHA;
  return { verdict, approvedSha, remoteApiSha, remoteUiSha, derivation };
}

/** Build the Phase 9B resolver exposing ONLY the selected target, bound to
 *  the freshness-approved snapshot. */
function buildPhase9bOracle(approvedSha: string): { oracle: SemanticHookOracle; resolution: RealSourceResolution } {
  const access = createSiblingSourceAccess(DISPOSABLE_ROOT);
  const snapshot = { repoId: RIPPLE_API_REPO, sha: approvedSha };
  const report = deriveRealSourceExpectations(
    REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === RIPPLE_API_REPO),
    snapshot,
    access.reader,
  );
  const selected = report.derived.filter((item) => item.expectation.targetId === SELECTED_TARGET_ID).map((item) => item.expectation);
  if (selected.length !== 1) {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: selected target derived ${selected.length} expectations (require exactly 1)`);
  }
  const expectation = selected[0]!;
  if (expectation.expectationId !== SELECTED_EXPECTATION_ID) {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: derived expectation id ${expectation.expectationId} != ${SELECTED_EXPECTATION_ID}`);
  }
  if (expectation.sourceProvenance.evidenceDigest === undefined) {
    throw new Error('PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: source evidence digest missing (not an admitted real-source expectation)');
  }
  if (expectation.sourceProvenance.sha !== approvedSha) {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: expectation bound to ${expectation.sourceProvenance.sha} != approved ${approvedSha}`);
  }
  // Phase 9A.1 is the only admission route: an expectation that cannot prove
  // its mechanical derivation evidence is refused with
  // REAL_SOURCE_EXPECTATION_PROOF_MISSING before any browser context exists.
  assertRealSourceExpectationProof(expectation);
  const resolver = createRealSourceResolver({
    // Expose ONLY the selected target to this acceptance run.
    recipes: REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.targetId === SELECTED_TARGET_ID),
    expectations: selected,
    reader: access.reader,
    currentness: { currentSnapshot: () => snapshot },
  });
  const resolution = resolver.resolve({ targetId: SELECTED_TARGET_ID });
  if (resolution.kind !== 'RESOLVED') {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: resolver returned ${resolution.kind}`);
  }
  return { oracle: { resolve: (input) => resolver.resolve(input) }, resolution };
}

// ---------------------------------------------------------------------------
// Implementation-CI exactness (read-only GitHub Actions metadata).
// ---------------------------------------------------------------------------

function exactImplementationCiGreen(headSha: string): { green: boolean; detail: string } {
  const runId = process.env.NIGHTWATCH_PHASE_9B_CI_RUN_ID;
  if (runId === undefined || runId.trim() === '') {
    return { green: false, detail: 'NIGHTWATCH_PHASE_9B_CI_RUN_ID not provided' };
  }
  try {
    const out = execFileSync(
      'gh',
      ['api', `repos/quantdale/night-watch/actions/runs/${runId.trim()}`, '--jq', '{status,conclusion,head_sha}'],
      { encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(out) as { status: string; conclusion: string | null; head_sha: string };
    const exact = parsed.head_sha === headSha;
    const green = exact && parsed.status === 'completed' && parsed.conclusion === 'success';
    return { green, detail: `run ${runId}: status=${parsed.status} conclusion=${parsed.conclusion} head_sha=${parsed.head_sha} (local ${headSha})` };
  } catch (error) {
    return { green: false, detail: `CI query failed: ${String(error instanceof Error ? error.message : error)}` };
  }
}

// ---------------------------------------------------------------------------
// One observation (FIRST or REPLAY) — fresh context, Phase 2B machinery.
// ---------------------------------------------------------------------------

async function observeOnce(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  definition: JourneyDefinition;
  oracle: SemanticHookOracle;
  runId: string;
  pass: 'first' | 'replay';
}): Promise<PassObservation> {
  contractGate(opts.definition);
  const root = rootDirectory();
  const repositoryFacts = await repositoryGateFacts(root);
  const auth = authFacts(opts.statePath, opts.target, opts.env);
  if (!auth.valid) {
    throw new Error(`PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED: ${opts.pass} auth gate; run ${AUTH_CAPTURE_COMMAND}`);
  }
  const gate = await runRealRunGate({
    environment: opts.env,
    uiUrl: opts.target,
    storageStatePath: opts.statePath,
    storageStateEnvironment: opts.env.name,
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
    repositories: repositoryFacts,
  });
  assertRealRunGate(gate);

  const recorder = new RunRecorder({
    runId: opts.runId,
    environment: opts.env.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: `ripple-phase-9b-${opts.definition.journeyId}-${opts.pass}`,
    nightwatchSha: nightwatchSha(root),
    authenticated: true,
  });
  recorder.addManifestEntry('phase9bJourney', {
    journeyId: opts.definition.journeyId,
    contractSourceSha: opts.definition.sourceSha,
    pass: opts.pass,
    environment: opts.env.name,
    authValid: auth.valid,
    authPageReadable: auth.pageReadable,
    trace: false,
    screenshots: false,
  });
  await recorder.writeRepositories(repositoryFacts.snapshots);
  recorder.event({
    type: 'start',
    severity: 'info',
    message: 'Phase 9B controlled semantic journey started',
    data: {
      journeyId: opts.definition.journeyId,
      targetId: SELECTED_TARGET_ID,
      expectationId: SELECTED_EXPECTATION_ID,
      pass: opts.pass,
      environment: opts.env.name,
      authValid: auth.valid,
    },
  });

  const context = await createNightwatchContext(opts.browser, {
    env: opts.env,
    recorder,
    uiBaseUrl: opts.target,
    storageStatePath: opts.statePath,
    trace: 'off',
    failOn: opts.env.failOn,
    bootstrapDiagnostics: true,
    endpointRegistry: buildRippleJourneyEndpointRegistry(opts.env),
    journeyId: opts.definition.journeyId,
    semanticOracle: opts.oracle,
    semanticAcceptanceClass: 'CONTAINED_DEV',
  });
  let evidence: JourneyEvidence;
  let liveAuth = false;
  try {
    evidence = await runDeclarativeJourney(
      context.page,
      { recorder, monitor: context.monitor, network: context.network },
      opts.definition,
      { uiBaseUrl: opts.target, authValid: auth.valid },
    );
    const pageAuth = await inspectRipplePageAuthReadability(context.page);
    liveAuth = pageAuth.evaluationSucceeded && pageAuth.tokenPageReadable && pageAuth.tokenNonEmpty &&
      pageAuth.aggregatePageBootstrapSemantics === 'VALID';
    recorder.addManifestEntry('authPageReadability', {
      evaluationSucceeded: pageAuth.evaluationSucceeded,
      tokenPageReadable: pageAuth.tokenPageReadable,
      tokenNonEmpty: pageAuth.tokenNonEmpty,
      apiTypePageVisible: pageAuth.apiTypePageVisible,
      apiTypeMatchesDev: pageAuth.apiTypeMatchesDev,
      appTypePageVisible: pageAuth.appTypePageVisible,
      appTypeMatchesRipple: pageAuth.appTypeMatchesRipple,
      aggregatePageBootstrapSemantics: pageAuth.aggregatePageBootstrapSemantics,
    });
    if (!liveAuth) {
      recorder.event({
        type: 'env',
        severity: 'warn',
        message: 'live page auth readability was not confirmed; classify as auth state failure',
        data: { authValid: false, pageReadable: false },
      });
    }
  } finally {
    await context.close();
  }

  const receipts = [...context.network.semanticEvaluations()];
  const findings = [...context.network.semanticFindings()];
  const ledgerOverflow = context.network.semanticEvaluationLedgerOverflow();
  recorder.syncProxyViolations();
  const proxyEvents = (() => {
    try {
      return readProxyEvents(path.join(recorder.dir, 'proxy.jsonl'));
    } catch {
      return [];
    }
  })();
  const semantics = context.network.semanticRequests();
  const safety: PassSafety = {
    productionAttempts: proxyEvents.filter((event) => event.classification === 'production').length,
    proxyViolations: proxyEvents.filter(isProxyViolation).length,
    unknownDestinations: proxyEvents.filter((event) =>
      isProxyViolation(event) && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    mutations: semantics.filter((item) => item.disposition === 'KNOWN_MUTATION').length,
    actionCausedUnknown: semantics.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    dbQueries: 0,
  };
  const summary = summarizePhase9bPass({
    passId: opts.pass,
    receipts,
    ledgerReceiptCount: receipts.length,
    ledgerOverflow,
    findings,
    targetId: SELECTED_TARGET_ID,
  });
  const finalEvidence = { ...evidence, authValid: auth.valid && liveAuth };
  const passed = finalEvidence.passed && finalEvidence.authValid &&
    safety.productionAttempts === 0 && safety.proxyViolations === 0 &&
    safety.unknownDestinations === 0 && safety.mutations === 0 &&
    safety.actionCausedUnknown === 0 && safety.dbQueries === 0 && !ledgerOverflow;
  recorder.finalize({
    passed,
    notes: [
      `Phase 9B ${opts.definition.journeyId} ${opts.pass} controlled semantic observation`,
      `safety totals: production=${safety.productionAttempts}, proxy=${safety.proxyViolations}, unknownDestinations=${safety.unknownDestinations}, mutations=${safety.mutations}, actionCausedUnknown=${safety.actionCausedUnknown}, db=${safety.dbQueries}`,
      `semantic summary: receipts=${summary.receiptCount} resolved=${summary.resolvedExpectationCount} PASS=${summary.passCount} ANOMALY=${summary.anomalyCount} N/A=${summary.notApplicableCount} decisive=${summary.decisiveEvaluationCount}`,
    ],
  });
  return { runId: opts.runId, pass: opts.pass, evidence: finalEvidence, auth, safety, receipts, summary };
}

// ---------------------------------------------------------------------------
// Post-run structural privacy audit (schema/key-level; never a dump).
// ---------------------------------------------------------------------------

function assertNoSensitiveArtifacts(runDirs: readonly string[]): void {
  for (const dir of runDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (/\.(png|jpe?g|webp|zip|webm)$/i.test(entry)) {
        throw new Error(`PHASE_9B_BLOCKED_PRIVACY: persisted media artifact ${entry} in ${dir}`);
      }
      if (/storage[_-]?state/i.test(entry)) {
        throw new Error(`PHASE_9B_BLOCKED_PRIVACY: storage-state copy ${entry} in ${dir}`);
      }
    }
    for (const file of ['events.jsonl', 'network.jsonl']) {
      const eventsPath = path.join(dir, file);
      if (!fs.existsSync(eventsPath)) continue;
      for (const line of fs.readFileSync(eventsPath, 'utf8').split(/\r?\n/)) {
        if (line.trim() === '') continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch {
          throw new Error(`PHASE_9B_BLOCKED_PRIVACY: unparseable evidence line in ${file}`);
        }
        if (parsed === null || typeof parsed !== 'object') continue;
        const data = (parsed as { data?: Record<string, unknown> }).data;
        if (data === undefined) continue;
        for (const key of Object.keys(data)) {
          if (/^(rawbody|rawtext|body|responsebody|cookies|storage_state)$/i.test(key)) {
            throw new Error(`PHASE_9B_BLOCKED_PRIVACY: forbidden evidence key "${key}" in ${file}`);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The one acceptance execution.
// ---------------------------------------------------------------------------

test('Phase 9B contained DEV semantic acceptance: common-exchange FIRST + replay', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_9B_REAL !== '1') {
    throw new Error('fail-closed: Phase 9B real acceptance requires NIGHTWATCH_PHASE_9B_REAL=1 and the gated launcher');
  }
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev') throw new Error('fail-closed: Phase 9B real acceptance requires DEV; NEXT and production are forbidden');
  const env = loadEnvironmentConfig(envName);
  const target = canonicalTarget(env);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined || statePath.trim() === '') {
    throw new Error('fail-closed: Phase 9B real acceptance requires external storage state');
  }
  const validatedStatePath = validateStorageStateFile(statePath);
  assertAuthCapabilityPreflight({
    artefactPath: validatedStatePath,
    environment: envName,
    targetOrigin: new URL(target).origin,
    requiredValidityMs: 15 * 60 * 1000,
  });
  const root = rootDirectory();
  const baseRunId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();
  const definition = getRippleJourneyDefinition(SELECTED_JOURNEY_ID);
  const localHead = nightwatchSha(root);

  // --- Pre-browser source freshness (SPEC §6, §7, §8, §45) ---
  const remoteApiSha = remoteBranchHead(RIPPLE_API_REPO, RIPPLE_API_REMOTE_BRANCH);
  const remoteUiSha = remoteBranchHead(RIPPLE_UI_REPO, RIPPLE_UI_REMOTE_BRANCH);
  if (remoteApiSha === null || remoteUiSha === null) {
    throw new Error('PHASE_9B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED: remote branch head unavailable; no DEV contact');
  }
  const disposableApiDir = ensureDisposableSnapshot(RIPPLE_API_REPO, remoteApiSha);
  const disposableUiDir = ensureDisposableSnapshot(RIPPLE_UI_REPO, remoteUiSha);
  const freshness = resolveFreshness(disposableApiDir, disposableUiDir);
  if (freshness.verdict.kind === 'BLOCK') {
    throw new Error(`${freshnessBlockToken(freshness.verdict.reason)}: ${freshness.verdict.reason} (derivation ${JSON.stringify(freshness.derivation)})`);
  }

  // --- Build the admitted resolver for the selected target only (SPEC §17,
  // §18) and REQUIRE RESOLVED immediately before browser launch (SPEC §45) ---
  const { oracle, resolution } = buildPhase9bOracle(freshness.approvedSha);
  if (resolution.kind !== 'RESOLVED') {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: pre-launch resolution ${resolution.kind}`);
  }
  if (resolution.sourceSnapshot.sha !== freshness.approvedSha) {
    throw new Error(`PHASE_9B_BLOCKED_EXPECTATION_NOT_RESOLVED: snapshot ${resolution.sourceSnapshot.sha} != approved ${freshness.approvedSha}`);
  }

  // --- Pre-dev metadata-only readiness gate (SPEC §19) ---
  const ci = exactImplementationCiGreen(localHead ?? '');
  const auth = authFacts(validatedStatePath, target, env);
  const proxyState = readProxyRuntimeState();
  const proxyHealthy = await checkProxyHealth(proxyState);
  const rules = buildRippleJourneyEndpointRegistry(env);
  const knownRead = rules.some((rule) => rule.id === SELECTED_TARGET_ID && rule.classification === 'KNOWN_READ');
  const mutationStepCount = definition.allowedSteps.filter(
    (step) => step.semanticClassification !== 'KNOWN_READ' && step.semanticClassification !== 'LOCAL_ONLY'
  ).length;
  const preflight = evaluatePhase9bPreflight({
    nightwatchHeadClean: nightwatchDirtyPaths(root).length === 0,
    implementationCiGreen: ci.green,
    freshness: freshness.verdict,
    targetId: SELECTED_TARGET_ID,
    derivedExpectationCount: 1,
    resolvedExpectationCount: 1,
    devReachable: DEV_REACHABLE_RECIPE_TARGET_IDS.includes(SELECTED_TARGET_ID),
    knownRead,
    mutationStepCount,
    authStructuralPass: auth.valid,
    proxyHealthy,
    targetExact: target === validateUiUrl(env, env.uiBaseUrl),
    tracesEnabled: false,
    screenshotsEnabled: false,
  });
  assertPhase9bPreflight(preflight);

  // --- FIRST observation ---
  const first = await observeOnce({
    browser,
    env,
    target,
    statePath: validatedStatePath,
    definition,
    oracle,
    runId: `${baseRunId}-first`,
    pass: 'first',
  });
  expect(first.evidence.authValid, 'PHASE_9B_BLOCKED_AUTH_EXPIRED: FIRST auth not valid').toBe(true);
  expect(first.evidence.passed, 'FIRST journey evidence failed; replay is prohibited').toBe(true);
  assertAcceptanceRunsAfterAuthGate({ authGatePassed: first.auth.valid && first.evidence.authValid, acceptanceRequested: true });
  const firstAcceptance = evaluateContainedDevAcceptance(first.summary, { expectationId: SELECTED_EXPECTATION_ID, approvedSha: freshness.approvedSha });
  expect(firstAcceptance.pass, `PHASE_9B_DEV_ACCEPTANCE_NOT_PROVEN: FIRST ${firstAcceptance.failures.join(', ')}`).toBe(true);

  // --- REPLAY (one fresh context; part of the one acceptance execution) ---
  const replay = await observeOnce({
    browser,
    env,
    target,
    statePath: validatedStatePath,
    definition,
    oracle,
    runId: `${baseRunId}-replay`,
    pass: 'replay',
  });
  expect(replay.evidence.authValid, 'PHASE_9B_BLOCKED_AUTH_EXPIRED: REPLAY auth not valid').toBe(true);
  expect(replay.evidence.passed, 'REPLAY journey evidence failed').toBe(true);
  assertAcceptanceRunsAfterAuthGate({ authGatePassed: replay.auth.valid && replay.evidence.authValid, acceptanceRequested: true });
  const replayAcceptance = evaluateContainedDevAcceptance(replay.summary, { expectationId: SELECTED_EXPECTATION_ID, approvedSha: freshness.approvedSha });
  expect(replayAcceptance.pass, `PHASE_9B_DEV_ACCEPTANCE_NOT_PROVEN: REPLAY ${replayAcceptance.failures.join(', ')}`).toBe(true);

  // --- Replay determinism (SPEC §28, §29, §36) ---
  const semanticComparison = comparePhase9bReplaySummaries(first.summary, replay.summary);
  const journeyComparison = compareJourneyReplay(first.evidence, replay.evidence);
  expect(semanticComparison.pass, `PHASE_9B_BLOCKED_SEMANTIC_NONDETERMINISM: ${semanticComparison.mismatches.join(',')}`).toBe(true);
  expect(journeyComparison.passed, `REPLAY strict journey invariants diverged: ${journeyComparison.strictInvariantMismatches.join(',')}`).toBe(true);

  // --- Privacy audit + safe acceptance evidence (SPEC §34, §38, §52) ---
  assertNoSensitiveArtifacts([path.join(root, 'artifacts', first.runId), path.join(root, 'artifacts', replay.runId)]);
  const acceptanceEvidence = {
    schemaVersion: 'nightwatch.phase9b-acceptance.v1',
    journeyId: SELECTED_JOURNEY_ID,
    targetId: SELECTED_TARGET_ID,
    expectationId: SELECTED_EXPECTATION_ID,
    evidenceAcceptanceClass: 'CONTAINED_DEV' as const,
    freshness: {
      remoteApiSha: freshness.remoteApiSha,
      remoteUiSha: freshness.remoteUiSha,
      approvedSha: freshness.approvedSha,
      verdict: freshness.verdict.kind,
      derivationOk: freshness.derivation.ok,
    },
    ciRunId: process.env.NIGHTWATCH_PHASE_9B_CI_RUN_ID ?? null,
    first: {
      runId: first.runId,
      resolvedExpectationCount: first.summary.resolvedExpectationCount,
      receiptCount: first.summary.receiptCount,
      passCount: first.summary.passCount,
      anomalyCount: first.summary.anomalyCount,
      notApplicableCount: first.summary.notApplicableCount,
      decisiveEvaluationCount: first.summary.decisiveEvaluationCount,
      invariantPassCount: first.summary.invariantPassCount,
      safety: first.safety,
    },
    replay: {
      runId: replay.runId,
      resolvedExpectationCount: replay.summary.resolvedExpectationCount,
      receiptCount: replay.summary.receiptCount,
      passCount: replay.summary.passCount,
      anomalyCount: replay.summary.anomalyCount,
      notApplicableCount: replay.summary.notApplicableCount,
      decisiveEvaluationCount: replay.summary.decisiveEvaluationCount,
      invariantPassCount: replay.summary.invariantPassCount,
      safety: replay.safety,
    },
    semanticReplayDeterministic: semanticComparison.pass,
    journeyReplayDeterministic: journeyComparison.passed,
  };
  const artifactsDir = path.join(root, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${baseRunId}-phase9b-acceptance.json`), JSON.stringify(acceptanceEvidence, null, 2));
});
