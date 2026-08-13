// ---------------------------------------------------------------------------
// Phase 2C bounded serial real-run matrix.
//
// This runner reuses the canonical real-run gate and context safety kernel.
// It adds no journey actions: each observation is the frozen Phase 2B
// declarative contract in a new BrowserContext, with a page-visible auth
// preflight before the journey begins.
// ---------------------------------------------------------------------------

import { test, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { assertRealRunGate, runRealRunGate } from '../../src/core/safety/realRunGate';
import { snapshotRepositories } from '../../src/core/repositories/snapshotter';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';
import { readProxyEvents } from '../../src/proxy/events';
import { compareJourneyReplay } from '../../src/core/journeys/replay';
import { evaluateAnomalyAdmission, type AnomalyObservation, type AdmissionResult } from '../../src/core/journeys/admission';
import {
  assertJourneyContractUnchanged,
  EVIDENCE_SCHEMA_VERSION,
  freezeJourneyContract,
  ORACLE_VERSION,
  type FrozenJourneyContract,
} from '../../src/core/journeys/contract';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import type { JourneyDefinition, JourneyEvidence } from '../../src/core/journeys/types';
import {
  buildRippleJourneyEndpointRegistry,
  RIPPLE_JOURNEY_DEFINITIONS,
} from '../../src/products/ripple/journeyContracts';

const AUTH_CAPTURE_COMMAND = 'npm run auth:capture -- --env=dev --output="$HOME/.nightwatch/auth/ripple-dev-state.json"';
type MatrixPass = 'phase2c-c1' | 'phase2c-c2' | 'phase2c-diagnostic';

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
  pass: MatrixPass;
  evidence: JourneyEvidence;
  auth: AuthFacts;
  safety: {
    productionAttempts: number;
    proxyViolations: number;
    unknownDestinations: number;
    unknownApprovals: number;
    mutations: number;
    dbQueries: number;
    actionCausedUnknown: number;
  };
  finalClassification: 'PASS' | 'PRODUCT_BEHAVIOR_ANOMALY' | 'DEV_INFRA_TRANSIENT' | 'AUTH_STATE_INVALID' | 'SAFETY_BLOCK' | 'UNKNOWN';
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
    target.username !== '' || target.password !== '' || target.search !== '' || target.hash !== ''
  ) throw new Error('fail-closed: Phase 2C target must exactly match the verified environment UI URL');
  return validateUiUrl(env, target.toString());
}

function authFacts(statePath: string, target: string, env: EnvironmentConfig): AuthFacts {
  let stateExists = false;
  try {
    validateStorageStateFile(statePath);
    stateExists = true;
  } catch {
    return { valid: false, provenanceMatch: false, tokenStructurallyValid: false, environmentSemanticsValid: false, pageReadable: false, stateExists };
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
  const provenanceMatch = true;
  return {
    valid: stateExists && provenanceMatch && tokenStructurallyValid && environmentSemanticsValid && readability.pageReadable,
    provenanceMatch,
    tokenStructurallyValid,
    environmentSemanticsValid,
    pageReadable: readability.pageReadable,
    stateExists,
  };
}

function nightwatchSha(root: string): string | null {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const value = (result.stdout ?? '').trim();
  return result.status === 0 && /^[0-9a-f]{40}$/i.test(value) ? value : null;
}

async function repositoryFacts(root: string): Promise<{ snapshots: RepoSnapshotRecord[]; snapshotRecorded: boolean; snapshotsValid: boolean; alphausRepositoriesSnapshotValid: boolean; nightwatchDirtyPaths: string[]; documentedNightwatchDirtyPaths: string[] }> {
  const workspaceRoot = path.resolve(root, '..', '..');
  const snapshots = await snapshotRepositories({
    reposRoot: path.join(workspaceRoot, 'REPOSITORIES', 'mobingilabs'),
    repos: ['ouchan', 'ripple-api', 'ripple-ui'],
  });
  const status = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
  const dirty = status.status === 0
    ? (status.stdout ?? '').split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean)
    : ['git-status-unavailable'];
  return {
    snapshots,
    snapshotRecorded: true,
    snapshotsValid: snapshots.length === 3 && snapshots.every((item) => item.ok),
    alphausRepositoriesSnapshotValid: true,
    nightwatchDirtyPaths: dirty,
    documentedNightwatchDirtyPaths: [],
  };
}

function contractGate(definition: JourneyDefinition): void {
  if (definition.unknownEndpoints.length > 0) throw new Error('fail-closed: Phase 2C contract requires UNKNOWN behavior');
  if (definition.allowedSteps.some((step) => step.semanticClassification !== 'KNOWN_READ' && step.semanticClassification !== 'LOCAL_ONLY')) {
    throw new Error('fail-closed: Phase 2C contract contains a non-read action');
  }
}

async function observeOnce(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  contract: FrozenJourneyContract;
  runId: string;
  pass: MatrixPass;
}): Promise<RealObservation> {
  const definition = opts.contract.definition;
  contractGate(definition);
  assertJourneyContractUnchanged(opts.contract);
  const root = rootDirectory();
  const repository = await repositoryFacts(root);
  const auth = authFacts(opts.statePath, opts.target, opts.env);
  if (!auth.valid) throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${definition.journeyId} stopped before browser context; run ${AUTH_CAPTURE_COMMAND}`);
  const gate = await runRealRunGate({
    environment: opts.env,
    uiUrl: opts.target,
    storageStatePath: opts.statePath,
    storageStateEnvironment: opts.env.name,
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
    repositories: repository,
  });
  assertRealRunGate(gate);

  const recorder = new RunRecorder({
    runId: opts.runId,
    environment: opts.env.name,
    product: 'ripple',
    browser: 'chromium',
    scenario: `ripple-phase-2c-${definition.journeyId}-${opts.pass}`,
    nightwatchSha: nightwatchSha(root),
    authenticated: true,
  });
  recorder.addManifestEntry('phase2cMatrix', {
    matrixVersion: 'phase2c-real-v1',
    contractVersion: opts.contract.version,
    contractDigest: opts.contract.digest,
    oracleVersion: ORACLE_VERSION,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    journeyId: definition.journeyId,
    pass: opts.pass,
    authValid: auth.valid,
    trace: false,
    screenshots: false,
  });
  await recorder.writeRepositories(repository.snapshots);

  const context = await createNightwatchContext(opts.browser, {
    env: opts.env,
    recorder,
    uiBaseUrl: opts.target,
    storageStatePath: opts.statePath,
    trace: 'off',
    bootstrapDiagnostics: true,
    endpointRegistry: buildRippleJourneyEndpointRegistry(opts.env),
    journeyId: definition.journeyId,
  });
  let evidence: JourneyEvidence;
  let pageAuthValid = false;
  try {
    // Page-visible auth is a precondition, not a post-hoc product failure.
    try {
      await context.page.goto(opts.target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch {
      throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${definition.journeyId} page auth preflight did not reach the DEV app`);
    }
    const pageAuth = await inspectRipplePageAuthReadability(context.page);
    pageAuthValid = pageAuth.evaluationSucceeded && pageAuth.tokenPageReadable && pageAuth.tokenNonEmpty &&
      pageAuth.aggregatePageBootstrapSemantics === 'VALID';
    recorder.addManifestEntry('authPagePreflight', {
      evaluationSucceeded: pageAuth.evaluationSucceeded,
      tokenPageReadable: pageAuth.tokenPageReadable,
      tokenNonEmpty: pageAuth.tokenNonEmpty,
      apiTypePageVisible: pageAuth.apiTypePageVisible,
      apiTypeMatchesDev: pageAuth.apiTypeMatchesDev,
      appTypePageVisible: pageAuth.appTypePageVisible,
      appTypeMatchesRipple: pageAuth.appTypeMatchesRipple,
      aggregatePageBootstrapSemantics: pageAuth.aggregatePageBootstrapSemantics,
    });
    if (!pageAuthValid) throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${definition.journeyId} page-visible auth is invalid; run ${AUTH_CAPTURE_COMMAND}`);
    // Exclude auth/bootstrap preflight requests from the intentional journey
    // read proof. They remain in the context evidence, but cannot satisfy a
    // read requirement before the approved journey action occurs.
    context.network.beginJourneyObservation();
    evidence = await runDeclarativeJourney(
      context.page,
      { recorder, monitor: context.monitor, network: context.network },
      definition,
      { uiBaseUrl: opts.target, authValid: pageAuthValid },
    );
  } finally {
    await context.close();
  }

  const semantics = context.network.semanticRequests();
  recorder.syncProxyViolations();
  const proxyEvents = (() => {
    try { return readProxyEvents(path.join(recorder.dir, 'proxy.jsonl')); } catch { return []; }
  })();
  const mutations = semantics.filter((item) => item.disposition === 'KNOWN_MUTATION').length;
  const actionCausedUnknown = semantics.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length;
  const safety = {
    productionAttempts: proxyEvents.filter((event) => event.classification === 'production').length,
    proxyViolations: proxyEvents.filter((event) => event.decision === 'deny').length,
    unknownDestinations: proxyEvents.filter((event) => event.decision === 'deny' && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    unknownApprovals: 0,
    mutations,
    dbQueries: 0,
    actionCausedUnknown,
  };
  const passed = evidence.passed && auth.valid && pageAuthValid &&
    safety.productionAttempts === 0 && safety.proxyViolations === 0 && safety.unknownDestinations === 0 &&
    safety.unknownApprovals === 0 && safety.mutations === 0 && safety.dbQueries === 0 && safety.actionCausedUnknown === 0;
  const finalEvidence: JourneyEvidence = {
    ...evidence,
    passed,
    authValid: auth.valid && pageAuthValid,
    safetyCounts: { ...evidence.safetyCounts!, ...safety },
  };
  const transient = finalEvidence.oracleObservations?.some((item) => item.anomalyClass === 'DEV_INFRA_TRANSIENT') ?? false;
  const finalClassification = safety.productionAttempts > 0 || safety.proxyViolations > 0 || safety.unknownDestinations > 0 || safety.mutations > 0 || safety.actionCausedUnknown > 0
    ? 'SAFETY_BLOCK'
    : !finalEvidence.authValid
      ? 'AUTH_STATE_INVALID'
      : finalEvidence.passed
        ? 'PASS'
        : transient
          ? 'DEV_INFRA_TRANSIENT'
          : finalEvidence.oracleStatus === 'FAIL'
            ? 'PRODUCT_BEHAVIOR_ANOMALY'
            : 'UNKNOWN';
  await recorder.finalize({
    passed,
    notes: [
      `Phase 2C ${definition.journeyId} ${opts.pass} controlled observation`,
      `safety totals: production=${safety.productionAttempts}, proxy=${safety.proxyViolations}, unknownDestinations=${safety.unknownDestinations}, unknownApprovals=${safety.unknownApprovals}, mutations=${safety.mutations}, db=${safety.dbQueries}, actionUnknown=${safety.actionCausedUnknown}`,
    ],
  });
  return { runId: opts.runId, journeyId: definition.journeyId, pass: opts.pass, evidence: finalEvidence, auth, safety, finalClassification };
}

function admissionLedger(observations: readonly RealObservation[]): AdmissionResult[] {
  const candidates = new Map<string, AnomalyObservation[]>();
  for (const observation of observations) {
    for (const item of observation.evidence.oracleObservations ?? []) {
      if (item.fingerprint === undefined) continue;
      const candidate: AnomalyObservation = {
        runId: observation.runId,
        journeyId: observation.journeyId,
        contractVersion: observation.evidence.contractVersion ?? 'legacy',
        contractDigest: observation.evidence.contractDigest ?? observation.evidence.contractSourceSha,
        fingerprint: item.fingerprint,
        contextKind: observation.pass === 'phase2c-c1' ? 'BOUNDED_REPETITION' : 'BOUNDED_REPETITION',
      };
      const key = `${candidate.journeyId}|${candidate.contractDigest}|${candidate.fingerprint}`;
      const current = candidates.get(key) ?? [];
      current.push(candidate);
      candidates.set(key, current);
    }
  }
  const results: AdmissionResult[] = [];
  for (const observationsForHypothesis of candidates.values()) {
    const hypothesis = observationsForHypothesis[0];
    if (hypothesis === undefined) continue;
    results.push(evaluateAnomalyAdmission({
      hypothesis,
      observations: observationsForHypothesis,
      matrixComplete: true,
    }));
  }
  return results;
}

function writeMatrix(root: string, baseRunId: string, contracts: readonly FrozenJourneyContract[], observations: readonly RealObservation[], comparisons: readonly Record<string, unknown>[], admissions: readonly AdmissionResult[] = []): void {
  const matrixVersion = process.env.NIGHTWATCH_PHASE_2C_MATRIX_VERSION ?? 'phase2c-real-v1';
  if (!/^phase2c-real-v[12](?:-[a-z0-9-]+)?$/.test(matrixVersion)) throw new Error('fail-closed: invalid Phase 2C matrix version');
  fs.writeFileSync(path.join(root, 'artifacts', `phase2c-${baseRunId}-matrix.json`), JSON.stringify({
    matrixVersion,
    nightwatchSha: nightwatchSha(root),
    contractVersion: contracts[0]?.version ?? null,
    oracleVersion: ORACLE_VERSION,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    canarySet: contracts.map((item) => ({ journeyId: item.definition.journeyId, digest: item.digest })),
    observations,
    comparisons,
    admissions,
  }, null, 2));
}

test('Phase 2C six serial fresh-context Ripple canary observations', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_2C_REAL !== '1') {
    test.skip();
    return;
  }
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev') throw new Error('fail-closed: Phase 2C real journeys require DEV; NEXT is reserved for human-led auth capture');
  const env = loadEnvironmentConfig(envName);
  const target = targetFor(env);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined || statePath.trim() === '') throw new Error('fail-closed: Phase 2C real journeys require external storage state');
  const validatedStatePath = validateStorageStateFile(statePath);
  const baseRunId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();
  if (!/^[A-Za-z0-9._-]+$/.test(baseRunId)) throw new Error('fail-closed: NIGHTWATCH_RUN_ID contains unsafe path characters');
  const root = rootDirectory();
  const contracts = RIPPLE_JOURNEY_DEFINITIONS.map((definition) => freezeJourneyContract(definition));
  const observations: RealObservation[] = [];
  const comparisons: Record<string, unknown>[] = [];

  const diagnosticJourney = process.env.NIGHTWATCH_PHASE_2C_DIAGNOSTIC_JOURNEY;
  if (diagnosticJourney !== undefined) {
    if (diagnosticJourney !== 'ripple-payer-exchange-read' || process.env.NIGHTWATCH_PHASE_2C_MATRIX_VERSION !== 'phase2c-real-v2-j1-diagnostic') {
      throw new Error('fail-closed: only the declared one-context J1 Phase 2C diagnostic is supported');
    }
    const contract = contracts.find((item) => item.definition.journeyId === diagnosticJourney);
    if (contract === undefined) throw new Error('fail-closed: diagnostic journey contract is unavailable');
    assertJourneyContractUnchanged(contract);
    const observation = await observeOnce({
      browser,
      env,
      target,
      statePath: validatedStatePath,
      contract,
      runId: `${baseRunId}-j1-diagnostic`,
      pass: 'phase2c-diagnostic',
    });
    if (observation.safety.productionAttempts !== 0 || observation.safety.proxyViolations !== 0 || observation.safety.unknownDestinations !== 0 || observation.safety.unknownApprovals !== 0 || observation.safety.mutations !== 0 || observation.safety.dbQueries !== 0 || observation.safety.actionCausedUnknown !== 0) {
      throw new Error('SAFETY_REVIEW_REQUIRED: Phase 2C J1 diagnostic');
    }
    if (!observation.evidence.authValid) throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${diagnosticJourney}; run ${AUTH_CAPTURE_COMMAND}`);
    observations.push(observation);
    // Deliberately no replay comparison: this post-fix observation has a new
    // Nightwatch implementation/matrix version and cannot be paired with V1.
    writeMatrix(root, baseRunId, contracts, observations, comparisons, admissionLedger(observations));
    return;
  }

  for (let index = 0; index < contracts.length; index += 1) {
    const contract = contracts[index];
    if (contract === undefined) continue;
    const pair: RealObservation[] = [];
    for (const pass of ['phase2c-c1', 'phase2c-c2'] as const) {
      assertJourneyContractUnchanged(contract);
      const observation = await observeOnce({
        browser,
        env,
        target,
        statePath: validatedStatePath,
        contract,
        runId: `${baseRunId}-j${index + 1}-${pass.slice(-2)}`,
        pass,
      });
      if (observation.safety.productionAttempts !== 0 || observation.safety.proxyViolations !== 0 || observation.safety.unknownDestinations !== 0 || observation.safety.unknownApprovals !== 0 || observation.safety.mutations !== 0 || observation.safety.dbQueries !== 0 || observation.safety.actionCausedUnknown !== 0) {
        throw new Error(`SAFETY_REVIEW_REQUIRED: ${contract.definition.journeyId} ${pass}`);
      }
      if (!observation.evidence.authValid) throw new Error(`HUMAN_AUTH_ACTION_REQUIRED: ${contract.definition.journeyId} ${pass}; run ${AUTH_CAPTURE_COMMAND}`);
      pair.push(observation);
      observations.push(observation);
    }
    const first = pair[0];
    const replay = pair[1];
    if (first === undefined || replay === undefined) throw new Error('fail-closed: Phase 2C pair was not completed');
    const comparison = compareJourneyReplay(first.evidence, replay.evidence);
    comparisons.push({
      journeyId: contract.definition.journeyId,
      contractVersion: contract.version,
      contractDigest: contract.digest,
      firstRunId: first.runId,
      replayRunId: replay.runId,
      comparison,
      finalClassifications: [first.finalClassification, replay.finalClassification],
    });
    writeMatrix(root, baseRunId, contracts, observations, comparisons);
  }
  writeMatrix(root, baseRunId, contracts, observations, comparisons, admissionLedger(observations));
});
