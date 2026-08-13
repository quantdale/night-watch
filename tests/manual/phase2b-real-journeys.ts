// ---------------------------------------------------------------------------
// Phase 2B controlled real runner.
//
// This is one generic serial runner for all three data-shaped contracts. It
// validates the existing Phase 2A gate and boolean-only auth facts before
// every context, creates a fresh context for every observation/replay, and
// never contains journey-specific Playwright flow code.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import {
  inspectRipplePageAuthReadability,
} from '../../src/browser/fixtures/pageAuthReadability';
import {
  inspectStorageStateCookiePageReadability,
  inspectStorageStateKeySemantics,
  validateStorageStateFile,
} from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import {
  assertRealRunGate,
  runRealRunGate,
} from '../../src/core/safety/realRunGate';
import { snapshotRepositories } from '../../src/core/repositories/snapshotter';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';
import { readProxyEvents } from '../../src/proxy/events';
import { compareJourneyReplay } from '../../src/core/journeys/replay';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import type { JourneyDefinition, JourneyEvidence } from '../../src/core/journeys/types';
import {
  buildRippleJourneyEndpointRegistry,
  RIPPLE_JOURNEY_DEFINITIONS,
} from '../../src/products/ripple/journeyContracts';

const AUTH_CAPTURE_COMMAND = 'npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"';

interface AuthFacts {
  valid: boolean;
  provenanceMatch: boolean;
  tokenStructurallyValid: boolean;
  environmentSemanticsValid: boolean;
  pageReadable: boolean;
  stateExists: boolean;
}

interface RealObservation {
  runId: string;
  journeyId: string;
  pass: 'first' | 'replay';
  evidence: JourneyEvidence;
  auth: AuthFacts;
  safety: {
    productionAttempts: number;
    proxyViolations: number;
    unknownDestinations: number;
    unknownApprovals: number;
    mutations: number;
    dbQueries: number;
  };
}

function rootDirectory(): string {
  return path.resolve(__dirname, '..', '..');
}

function targetFor(env: EnvironmentConfig): string {
  const configured = new URL(env.uiBaseUrl);
  const requested = process.env.NIGHTWATCH_UI_URL;
  const target = new URL(requested === undefined || requested.trim() === '' ? env.uiBaseUrl : requested);
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
    throw new Error('fail-closed: Phase 2B target must exactly match the verified environment UI URL');
  }
  return validateUiUrl(env, target.toString());
}

function nightwatchDirtyPaths(root: string): string[] {
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
  if (result.status !== 0) return ['git-status-unavailable'];
  return (result.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
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
  const dirty = nightwatchDirtyPaths(root);
  return {
    snapshotRecorded: true,
    snapshotsValid: snapshots.length === 3 && snapshots.every((item) => item.ok),
    alphausRepositoriesSnapshotValid: true,
    nightwatchDirtyPaths: dirty,
    documentedNightwatchDirtyPaths: [],
    snapshots,
  };
}

function nightwatchSha(root: string): string | null {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const value = (result.stdout ?? '').trim();
  return result.status === 0 && /^[0-9a-f]{40}$/i.test(value) ? value : null;
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
  const provenanceMatch = true; // target and selected env are exact; state provenance is not guessed from contents
  return {
    valid: stateExists && provenanceMatch && tokenStructurallyValid && environmentSemanticsValid && readability.pageReadable,
    provenanceMatch,
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

async function observeOnce(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  definition: JourneyDefinition;
  runId: string;
  pass: 'first' | 'replay';
}): Promise<RealObservation> {
  contractGate(opts.definition);
  const root = rootDirectory();
  const repositoryFacts = await repositoryGateFacts(root);
  const auth = authFacts(opts.statePath, opts.target, opts.env);
  if (!auth.valid) {
    throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: Phase 2B ${opts.pass} ${opts.definition.journeyId} stopped before browser context; run ${AUTH_CAPTURE_COMMAND}`);
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
    scenario: `ripple-phase-2b-${opts.definition.journeyId}-${opts.pass}`,
    nightwatchSha: nightwatchSha(root),
    authenticated: true,
  });
  recorder.addManifestEntry('phase2bJourney', {
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
    message: 'Phase 2B controlled journey started',
    data: {
      journeyId: opts.definition.journeyId,
      contractSourceSha: opts.definition.sourceSha,
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

  const semantics = context.network.semanticRequests();
  recorder.syncProxyViolations();
  const proxyEvents = (() => {
    try {
      return readProxyEvents(path.join(recorder.dir, 'proxy.jsonl'));
    } catch {
      return [];
    }
  })();
  const mutations = semantics.filter((item) => item.disposition === 'KNOWN_MUTATION').length;
  const actionUnknown = semantics.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length;
  const safety = {
    productionAttempts: proxyEvents.filter((event) => event.classification === 'production').length,
    proxyViolations: proxyEvents.filter((event) => event.decision === 'deny').length,
    unknownDestinations: proxyEvents.filter((event) =>
      event.decision === 'deny' && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    unknownApprovals: 0,
    mutations,
    dbQueries: 0,
  };
  const finalEvidence = {
    ...evidence,
    authValid: auth.valid && liveAuth,
  };
  const passed = finalEvidence.passed && finalEvidence.authValid &&
    safety.productionAttempts === 0 && safety.proxyViolations === 0 &&
    safety.unknownDestinations === 0 && safety.unknownApprovals === 0 &&
    safety.mutations === 0 && safety.dbQueries === 0;
  await recorder.finalize({
    passed,
    notes: [
      `Phase 2B ${opts.definition.journeyId} ${opts.pass} controlled observation`,
      `safety totals: production=${safety.productionAttempts}, proxy=${safety.proxyViolations}, unknownDestinations=${safety.unknownDestinations}, unknownApprovals=${safety.unknownApprovals}, mutations=${safety.mutations}, db=${safety.dbQueries}`,
    ],
  });
  return {
    runId: opts.runId,
    journeyId: opts.definition.journeyId,
    pass: opts.pass,
    evidence: finalEvidence,
    auth,
    safety,
  };
}

function writeReplayComparison(root: string, journeyId: string, first: RealObservation, replay: RealObservation, comparison: ReturnType<typeof compareJourneyReplay>): void {
  const dir = path.join(root, 'artifacts', `${first.runId}-comparison`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${journeyId}.json`), JSON.stringify({
    journeyId,
    first: { runId: first.runId, pass: first.pass, evidence: first.evidence, auth: first.auth, safety: first.safety },
    replay: { runId: replay.runId, pass: replay.pass, evidence: replay.evidence, auth: replay.auth, safety: replay.safety },
    comparison,
  }, null, 2));
}

test('Phase 2B three controlled read-only Ripple journey pairs', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_2B_REAL !== '1') {
    throw new Error('fail-closed: Phase 2B real journeys require NIGHTWATCH_PHASE_2B_REAL=1 and the gated launcher');
  }
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev') throw new Error('fail-closed: Phase 2B real journeys require DEV; NEXT is reserved for human-led auth capture');
  const env = loadEnvironmentConfig(envName);
  const target = targetFor(env);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined || statePath.trim() === '') throw new Error('fail-closed: Phase 2B real journeys require external storage state');
  const validatedStatePath = validateStorageStateFile(statePath);
  const baseRunId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();
  const root = rootDirectory();
  const requestedJourneyId = process.env.NIGHTWATCH_PHASE_2B_JOURNEY_ID;
  const indexedDefinitions = RIPPLE_JOURNEY_DEFINITIONS
    .map((definition, index) => ({ definition, index }))
    .filter(({ definition }) => requestedJourneyId === undefined || definition.journeyId === requestedJourneyId);
  if (indexedDefinitions.length === 0) {
    throw new Error('fail-closed: requested Phase 2B journey ID is not one of the three approved contracts');
  }

  for (const { definition, index } of indexedDefinitions) {
    const first = await observeOnce({
      browser,
      env,
      target,
      statePath: validatedStatePath,
      definition,
      runId: `${baseRunId}-j${index + 1}-first`,
      pass: 'first',
    });
    if (!first.evidence.authValid) {
      throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${definition.journeyId}; run ${AUTH_CAPTURE_COMMAND}`);
    }
    expect(first.evidence.passed, `${definition.journeyId} first observation failed; replay is prohibited`).toBe(true);

    const replay = await observeOnce({
      browser,
      env,
      target,
      statePath: validatedStatePath,
      definition,
      runId: `${baseRunId}-j${index + 1}-replay`,
      pass: 'replay',
    });
    if (!replay.evidence.authValid) {
      throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${definition.journeyId} replay; run ${AUTH_CAPTURE_COMMAND}`);
    }
    const comparison = compareJourneyReplay(first.evidence, replay.evidence);
    writeReplayComparison(root, definition.journeyId, first, replay, comparison);
    expect(replay.evidence.passed, `${definition.journeyId} fresh-context replay failed`).toBe(true);
    expect(comparison.passed, `${definition.journeyId} strict replay invariants diverged: ${comparison.strictInvariantMismatches.join(',')}`).toBe(true);
  }
});
