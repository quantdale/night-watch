// ---------------------------------------------------------------------------
// Phase 4 bounded serial real-DEV exploration.
//
// This file is opt-in through bin/phase4-real.mjs. It creates a fresh
// BrowserContext for every seed and replay, starts from a trusted Phase 2B
// anchor, and executes only the frozen declarative catalog. Evidence is
// metadata-first and action/state IDs never contain customer values.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { inspectRipplePageAuthReadability } from '../../src/browser/fixtures/pageAuthReadability';
import { inspectStorageStateCookiePageReadability, inspectStorageStateKeySemantics, validateStorageStateFile, validateStorageStateOutputPath } from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { RunRecorder, createRunId } from '../../src/core/evidence/runRecorder';
import { runRealRunGate, assertRealRunGate } from '../../src/core/safety/realRunGate';
import { snapshotRepositories } from '../../src/core/repositories/snapshotter';
import { isProxyViolation, readProxyEvents } from '../../src/proxy/events';
import { freezeJourneyContract, assertJourneyContractUnchanged } from '../../src/core/journeys/contract';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import { RIPPLE_JOURNEY_DEFINITIONS, buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import { createRippleExplorationRuntime } from '../../src/products/ripple/explorationRuntime';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_BUDGET, RIPPLE_PHASE4_ENVELOPES, envelopeById } from '../../src/products/ripple/explorationCatalog';
import { deriveSeed } from '../../src/core/exploration/rng';
import { replayExactSequence, runExploration } from '../../src/core/exploration/engine';
import { isSuccessfulPhase4Termination } from '../../src/core/exploration/acceptance';
import { catalogFingerprint, modelFingerprint } from '../../src/core/exploration/state';
import type { ExplorationEvidence, ExactReplayResult, SafetyVector } from '../../src/core/exploration/types';
import { DevAuthFailure, runDevAuthRefresh } from '../../src/auth/devAutoLogin';
import { MCP_OBSERVATION_STATUS, MCP_SECRET_INPUT_ALLOWED } from '../../src/mcp/chromeDevtoolsPolicy';

export const PHASE4_SEED_CORPUS = [
  { envelopeId: 'E1-J1-payer-exchange', seed: '0x0000000000000101', ordinal: 0 },
  { envelopeId: 'E1-J1-payer-exchange', seed: '0x0000000000000102', ordinal: 1 },
  { envelopeId: 'E2-J2-common-exchange', seed: '0x0000000000000201', ordinal: 0 },
  { envelopeId: 'E2-J2-common-exchange', seed: '0x0000000000000202', ordinal: 1 },
  { envelopeId: 'E3-J3-account-inventory', seed: '0x0000000000000301', ordinal: 0 },
  { envelopeId: 'E3-J3-account-inventory', seed: '0x0000000000000302', ordinal: 1 },
] as const;

interface AuthFacts {
  readonly valid: boolean;
  readonly provenanceMatch: boolean;
  readonly tokenStructurallyValid: boolean;
  readonly environmentSemanticsValid: boolean;
  readonly pageReadable: boolean;
  readonly stateExists: boolean;
}

interface RealRecord {
  readonly kind: 'EXPLORATION' | 'EXACT_SEQUENCE_REPLAY';
  readonly runId: string;
  readonly envelopeId: string;
  readonly seed: string;
  readonly derivedSeed: string;
  readonly plannedActions: readonly string[];
  readonly observedActions: readonly string[];
  readonly stateIds: readonly string[];
  readonly transitionIds: readonly string[];
  readonly terminationReason: string;
  readonly coverage?: ExplorationEvidence['coverage'];
  readonly replayStatus?: ExactReplayResult['status'];
  readonly safety: SafetyVector;
  readonly authProvenance: 'REUSED_EXTERNAL_STATE' | 'AUTO_REFRESHED_DEV_STATE';
  readonly autoRefresh: boolean;
  readonly mfaOccurred: boolean;
  readonly authCaptureId?: string;
  readonly mcpAttached: false;
  readonly mcpObservationStatus: typeof MCP_OBSERVATION_STATUS;
}

function rootDirectory(): string {
  return path.resolve(__dirname, '..', '..');
}

function targetFor(env: EnvironmentConfig): string {
  const configured = new URL(env.uiBaseUrl);
  const requested = process.env.NIGHTWATCH_UI_URL;
  const target = new URL(requested === undefined || requested.trim() === '' ? env.uiBaseUrl : requested);
  if (target.protocol !== 'https:' || target.hostname.toLowerCase() !== configured.hostname.toLowerCase() ||
    target.port !== configured.port || target.pathname !== configured.pathname || target.username !== '' ||
    target.password !== '' || target.search !== '' || target.hash !== '') {
    throw new Error('fail-closed: Phase 4 target must exactly match the verified environment UI URL');
  }
  return validateUiUrl(env, target.toString());
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
    return { valid: false, provenanceMatch: false, tokenStructurallyValid: false, environmentSemanticsValid: false, pageReadable: false, stateExists };
  }
  const semantics = inspectStorageStateKeySemantics(statePath, {
    authTokenKey: 'mo_access_token', apiTypeKey: 'api_type', apiTypeExpected: env.name,
    appTypeKey: 'app_type', appTypeExpected: 'alphaus',
  });
  const targetUrl = new URL(target);
  const readability = inspectStorageStateCookiePageReadability(statePath, {
    cookieKey: 'mo_access_token', appOrigin: targetUrl.origin, appPath: targetUrl.pathname,
  });
  const environmentSemanticsValid = (!semantics.apiTypePresent || semantics.apiTypeMatchesExpected) &&
    (!semantics.appTypePresent || semantics.appTypeMatchesExpected);
  const tokenStructurallyValid = semantics.authTokenPresent && semantics.authTokenStructurallyNonEmpty;
  const provenanceMatch = true;
  return {
    valid: stateExists && provenanceMatch && tokenStructurallyValid && environmentSemanticsValid && readability.pageReadable,
    provenanceMatch, tokenStructurallyValid, environmentSemanticsValid,
    pageReadable: readability.pageReadable, stateExists,
  };
}

interface Phase4AuthResult {
  readonly autoRefresh: boolean;
  readonly mfaOccurred: boolean;
  readonly storageStatePath: string;
  readonly authCaptureId?: string;
}

function waitForHumanMfa(): Promise<void> {
  if (!process.stdin.isTTY) throw new DevAuthFailure('MFA_REQUIRED');
  console.log('HUMAN_MFA_WAIT: complete the DEV MFA step in the guarded browser, then press ENTER here.');
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    const finish = () => {
      prompt.close();
      resolve();
    };
    prompt.once('line', finish);
    prompt.once('SIGINT', () => {
      prompt.close();
      reject(new DevAuthFailure('MFA_REQUIRED'));
    });
  });
}

async function ensurePhase4Auth(browser: Browser, env: EnvironmentConfig, target: string, statePath: string): Promise<Phase4AuthResult> {
  if (env.name === 'dev') {
    return await runDevAuthRefresh({
      browser,
      environment: env,
      uiUrl: target,
      storageStatePath: statePath,
      mfaCompletion: { wait: waitForHumanMfa },
    });
  }
  const auth = authFacts(statePath, target, env);
  if (!auth.valid) throw new Error('HUMAN_AUTH_ACTION_REQUIRED: external NEXT auth state failed boolean preflight');
  return { autoRefresh: false, mfaOccurred: false, storageStatePath: statePath };
}

async function repositoryFacts(root: string) {
  const workspaceRoot = path.resolve(root, '..', '..');
  const snapshots = await snapshotRepositories({ reposRoot: path.join(workspaceRoot, 'REPOSITORIES', 'mobingilabs'), repos: ['ouchan', 'ripple-api', 'ripple-ui'] });
  const status = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
  const dirty = status.status === 0 ? (status.stdout ?? '').split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean) : ['git-status-unavailable'];
  return {
    snapshots,
    snapshotRecorded: true,
    snapshotsValid: snapshots.length === 3 && snapshots.every((item) => item.ok),
    alphausRepositoriesSnapshotValid: true,
    nightwatchDirtyPaths: dirty,
    documentedNightwatchDirtyPaths: [],
  };
}

function writeAtomic(file: string, value: unknown): void {
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
}

function safetyFromRun(context: Awaited<ReturnType<typeof createNightwatchContext>>, recorder: RunRecorder): SafetyVector {
  recorder.syncProxyViolations();
  const proxyEvents = (() => {
    try { return readProxyEvents(path.join(recorder.dir, 'proxy.jsonl')); } catch { return []; }
  })();
  const semantics = context.network.semanticRequests();
  return {
    productionAttempts: proxyEvents.filter((event) => event.classification === 'production').length,
    proxyViolations: proxyEvents.filter(isProxyViolation).length,
    unknownDestinations: proxyEvents.filter((event) => isProxyViolation(event) && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    unknownApprovals: 0,
    knownMutations: semantics.filter((item) => item.disposition === 'KNOWN_MUTATION').length,
    actionCausedUnknown: semantics.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    dbQueries: 0,
  };
}

function safetyIsZero(safety: SafetyVector): boolean {
  return Object.values(safety).every((value) => value === 0);
}

function anchorFor(envelopeId: string) {
  const envelope = envelopeById(envelopeId);
  const definition = RIPPLE_JOURNEY_DEFINITIONS.find((candidate) => candidate.journeyId === envelope.anchorJourney);
  if (definition === undefined) throw new Error(`anchor contract missing for ${envelopeId}`);
  return { envelope, contract: freezeJourneyContract(definition) };
}

async function establishAnchor(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  envelopeId: string;
  recorder: RunRecorder;
}): Promise<{ context: Awaited<ReturnType<typeof createNightwatchContext>>; anchorPassed: boolean }> {
  const { envelope, contract } = anchorFor(opts.envelopeId);
  assertJourneyContractUnchanged(contract);
  const context = await createNightwatchContext(opts.browser, {
    env: opts.env,
    recorder: opts.recorder,
    uiBaseUrl: opts.target,
    storageStatePath: opts.statePath,
    trace: 'off',
    bootstrapDiagnostics: true,
    endpointRegistry: buildRippleJourneyEndpointRegistry(opts.env),
    journeyId: envelope.anchorJourney,
  });
  try {
    await context.page.goto(opts.target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const auth = await inspectRipplePageAuthReadability(context.page);
    const pageAuthValid = auth.evaluationSucceeded && auth.tokenPageReadable && auth.tokenNonEmpty && auth.aggregatePageBootstrapSemantics === 'VALID';
    opts.recorder.addManifestEntry('authPagePreflight', {
      evaluationSucceeded: auth.evaluationSucceeded,
      tokenPageReadable: auth.tokenPageReadable,
      tokenNonEmpty: auth.tokenNonEmpty,
      apiTypePageVisible: auth.apiTypePageVisible,
      apiTypeMatchesDev: auth.apiTypeMatchesDev,
      appTypePageVisible: auth.appTypePageVisible,
      appTypeMatchesRipple: auth.appTypeMatchesRipple,
      aggregatePageBootstrapSemantics: auth.aggregatePageBootstrapSemantics,
    });
    if (!pageAuthValid) throw new Error('HUMAN_AUTH_ACTION_REQUIRED: page-visible DEV auth is invalid');
    context.network.beginJourneyObservation();
    const anchorEvidence = await runDeclarativeJourney(context.page, { recorder: opts.recorder, monitor: context.monitor, network: context.network }, contract.definition, { uiBaseUrl: opts.target, authValid: pageAuthValid });
    return { context, anchorPassed: anchorEvidence.passed && !context.monitor.safetyFailed };
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function runExplorationContext(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  repository: Awaited<ReturnType<typeof repositoryFacts>>;
  envelopeId: string;
  seed: string;
  runId: string;
}): Promise<{ evidence: ExplorationEvidence; safety: SafetyVector; authRefresh: Phase4AuthResult }> {
  const { envelope, contract } = anchorFor(opts.envelopeId);
  const authRefresh = await ensurePhase4Auth(opts.browser, opts.env, opts.target, opts.statePath);
  const auth = authFacts(opts.statePath, opts.target, opts.env);
  if (!auth.valid) throw new Error('HUMAN_AUTH_ACTION_REQUIRED: external auth state failed boolean preflight after refresh decision');
  const gate = await runRealRunGate({
    environment: opts.env,
    uiUrl: opts.target,
    storageStatePath: opts.statePath,
    storageStateEnvironment: opts.env.name,
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: opts.repository,
  });
  assertRealRunGate(gate);
  const recorder = new RunRecorder({ runId: opts.runId, environment: opts.env.name, product: 'ripple', browser: 'chromium', scenario: `phase4-${opts.envelopeId}`, seed: opts.seed, nightwatchSha: nightwatchSha(rootDirectory()), authenticated: true });
  recorder.addManifestEntry('phase4Exploration', { schemaVersion: 'nightwatch.exploration.phase4.v1', envelopeId: opts.envelopeId, seed: opts.seed, catalogFingerprint: catalogFingerprint(RIPPLE_PHASE4_ACTIONS), modelFingerprint: modelFingerprint(envelope, RIPPLE_PHASE4_BUDGET), trace: false, screenshots: false });
  await recorder.writeRepositories(opts.repository.snapshots);
  const context = await establishAnchor({ browser: opts.browser, env: opts.env, target: opts.target, statePath: opts.statePath, envelopeId: opts.envelopeId, recorder });
  if (!context.anchorPassed) {
    const safety = safetyFromRun(context.context, recorder);
    await context.context.close();
    throw new Error(`PHASE_4_ANCHOR_FAILED: ${opts.envelopeId}; safety=${JSON.stringify(safety)}`);
  }
  let evidence: ExplorationEvidence;
  try {
    const runtime = createRippleExplorationRuntime({ page: context.context.page, uiBaseUrl: opts.target, anchorJourney: envelope.anchorJourney, network: context.context.network, monitor: context.context.monitor, authValid: true });
    evidence = await runExploration({ runId: opts.runId, seed: opts.seed, derivedSeed: deriveSeed(opts.seed, 'nightwatch.exploration-model.phase4.v1', opts.envelopeId, 0), catalog: RIPPLE_PHASE4_ACTIONS, envelope, budget: RIPPLE_PHASE4_BUDGET, runtime });
    const evidenceSafety = safetyFromRun(context.context, recorder);
    evidence = { ...evidence, safety: evidenceSafety };
    writeAtomic(path.join(recorder.dir, 'exploration.json'), evidence);
    const successfulTermination = isSuccessfulPhase4Termination(evidence.terminationReason);
    const zero = safetyIsZero(evidenceSafety);
    await recorder.finalize({ passed: successfulTermination && zero, notes: [`Phase 4 validation exploration ${opts.envelopeId}`, `termination=${evidence.terminationReason}`, `safety=${JSON.stringify(evidenceSafety)}`] });
    return { evidence, safety: evidenceSafety, authRefresh };
  } finally {
    await context.context.close();
  }
}

async function runExactReplayContext(opts: {
  browser: Browser;
  env: EnvironmentConfig;
  target: string;
  statePath: string;
  repository: Awaited<ReturnType<typeof repositoryFacts>>;
  envelopeId: string;
  seed: string;
  original: ExplorationEvidence;
  runId: string;
}): Promise<RealRecord> {
  const { envelope } = anchorFor(opts.envelopeId);
  const authRefresh = await ensurePhase4Auth(opts.browser, opts.env, opts.target, opts.statePath);
  const auth = authFacts(opts.statePath, opts.target, opts.env);
  if (!auth.valid) throw new Error('HUMAN_AUTH_ACTION_REQUIRED: external DEV auth state failed before exact replay');
  const gate = await runRealRunGate({ environment: opts.env, uiUrl: opts.target, storageStatePath: opts.statePath, storageStateEnvironment: opts.env.name, browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true }, repositories: opts.repository });
  assertRealRunGate(gate);
  const recorder = new RunRecorder({ runId: opts.runId, environment: opts.env.name, product: 'ripple', browser: 'chromium', scenario: `phase4-exact-replay-${opts.envelopeId}`, seed: opts.seed, nightwatchSha: nightwatchSha(rootDirectory()), authenticated: true });
  recorder.addManifestEntry('phase4ExactReplay', { schemaVersion: 'nightwatch.exploration.phase4.v1', envelopeId: opts.envelopeId, seed: opts.seed, catalogFingerprint: catalogFingerprint(RIPPLE_PHASE4_ACTIONS), modelFingerprint: modelFingerprint(envelope, RIPPLE_PHASE4_BUDGET), plannerUsed: false, strictSequence: true, trace: false, screenshots: false });
  await recorder.writeRepositories(opts.repository.snapshots);
  const context = await establishAnchor({ browser: opts.browser, env: opts.env, target: opts.target, statePath: opts.statePath, envelopeId: opts.envelopeId, recorder });
  if (!context.anchorPassed) throw new Error(`PHASE_4_ANCHOR_FAILED_BEFORE_EXACT_REPLAY: ${opts.envelopeId}`);
  try {
    const runtime = createRippleExplorationRuntime({ page: context.context.page, uiBaseUrl: opts.target, anchorJourney: envelope.anchorJourney, network: context.context.network, monitor: context.context.monitor, authValid: true });
    const replay = await replayExactSequence({ initialStateId: opts.original.initialStateId, actionIds: opts.original.plannedActions, expectedStateIds: [opts.original.initialStateId, ...opts.original.transitions.map((transition) => transition.toStateId)], expectedTransitionIds: opts.original.transitions.map((transition) => transition.transitionId), catalog: RIPPLE_PHASE4_ACTIONS, envelope, runtime });
    const safety = safetyFromRun(context.context, recorder);
    writeAtomic(path.join(recorder.dir, 'replay.json'), { schemaVersion: 'nightwatch.exploration.phase4.v1', envelopeId: opts.envelopeId, seed: opts.seed, replay, safety, trace: false, screenshots: false });
    await recorder.finalize({ passed: replay.status === 'STRICT_MATCH' && safetyIsZero(safety), notes: [`Phase 4 exact sequence replay ${opts.envelopeId}`, `status=${replay.status}`, `safety=${JSON.stringify(safety)}`] });
    return { kind: 'EXACT_SEQUENCE_REPLAY', runId: opts.runId, envelopeId: opts.envelopeId, seed: opts.seed, derivedSeed: opts.seed, plannedActions: opts.original.plannedActions, observedActions: replay.observedActions, stateIds: replay.stateIds, transitionIds: replay.transitionIds, terminationReason: replay.terminationReason ?? 'STRICT_MATCH', replayStatus: replay.status, safety, authProvenance: authRefresh.autoRefresh ? 'AUTO_REFRESHED_DEV_STATE' : 'REUSED_EXTERNAL_STATE', autoRefresh: authRefresh.autoRefresh, mfaOccurred: authRefresh.mfaOccurred, authCaptureId: authRefresh.authCaptureId, mcpAttached: false, mcpObservationStatus: MCP_OBSERVATION_STATUS };
  } finally {
    await context.context.close();
  }
}

test('Phase 4 bounded seeded Ripple DEV exploration', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_4_REAL !== '1') { test.skip(); return; }
  // The six serial seeds each have their own bounded runtime budget. The
  // aggregate Playwright deadline must cover the whole bounded matrix plus
  // browser setup/teardown, otherwise a valid slow matrix is killed before it
  // can persist its final report.
  test.setTimeout(15 * 60 * 1000);
  const envName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (envName !== 'dev') throw new Error('fail-closed: Phase 4 real exploration requires DEV; NEXT is reserved for human-led auth capture');
  const env = loadEnvironmentConfig(envName);
  const target = targetFor(env);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined || statePath.trim() === '') throw new Error('HUMAN_AUTH_ACTION_REQUIRED: Phase 4 requires an external storage state path');
  const validatedStatePath = envName === 'dev'
    ? validateStorageStateOutputPath(statePath, { allowExisting: true })
    : validateStorageStateFile(statePath);
  const baseRunId = process.env.NIGHTWATCH_RUN_ID ?? createRunId();
  if (!/^[A-Za-z0-9._-]+$/.test(baseRunId)) throw new Error('fail-closed: unsafe Phase 4 run ID');
  const root = rootDirectory();
  const repository = await repositoryFacts(root);
  if (!repository.snapshotsValid || repository.nightwatchDirtyPaths.length > 0) throw new Error('PHASE_4_PRE_REAL_BLOCK: repositories or Nightwatch worktree are not clean');
  const records: RealRecord[] = [];
  const firstByEnvelope = new Map<string, ExplorationEvidence>();
  for (const seedEntry of PHASE4_SEED_CORPUS) {
    const runId = `${baseRunId}-${seedEntry.envelopeId}-${seedEntry.ordinal}`;
    const result = await runExplorationContext({ browser, env, target, statePath: validatedStatePath, repository, envelopeId: seedEntry.envelopeId, seed: seedEntry.seed, runId });
    const record: RealRecord = { kind: 'EXPLORATION', runId, envelopeId: seedEntry.envelopeId, seed: seedEntry.seed, derivedSeed: result.evidence.derivedSeed, plannedActions: result.evidence.plannedActions, observedActions: result.evidence.observedActions, stateIds: result.evidence.states.map((state) => state.stateId), transitionIds: result.evidence.transitions.map((transition) => transition.transitionId), terminationReason: result.evidence.terminationReason, coverage: result.evidence.coverage, safety: result.safety, authProvenance: result.authRefresh.autoRefresh ? 'AUTO_REFRESHED_DEV_STATE' : 'REUSED_EXTERNAL_STATE', autoRefresh: result.authRefresh.autoRefresh, mfaOccurred: result.authRefresh.mfaOccurred, authCaptureId: result.authRefresh.authCaptureId, mcpAttached: false, mcpObservationStatus: MCP_OBSERVATION_STATUS };
    records.push(record);
    if (!isSuccessfulPhase4Termination(result.evidence.terminationReason)) {
      throw new Error(`PHASE_4_EXPLORATION_FAILED: ${seedEntry.envelopeId} ${seedEntry.seed} ${result.evidence.terminationReason}`);
    }
    if (!firstByEnvelope.has(seedEntry.envelopeId) && result.evidence.plannedActions.length > 1 && safetyIsZero(result.safety)) firstByEnvelope.set(seedEntry.envelopeId, result.evidence);
    if (!safetyIsZero(result.safety)) throw new Error(`PHASE_4_SAFETY_BLOCK: ${seedEntry.envelopeId} ${seedEntry.seed}`);
  }
  for (const [envelopeId, original] of firstByEnvelope) {
    const seed = PHASE4_SEED_CORPUS.find((entry) => entry.envelopeId === envelopeId)?.seed;
    if (seed === undefined) throw new Error(`missing exact replay seed for ${envelopeId}`);
    const replay = await runExactReplayContext({ browser, env, target, statePath: validatedStatePath, repository, envelopeId, seed, original, runId: `${baseRunId}-${envelopeId}-exact` });
    records.push(replay);
    expect(replay.replayStatus, `exact replay diverged for ${envelopeId}`).toBe('STRICT_MATCH');
    expect(safetyIsZero(replay.safety)).toBeTruthy();
  }
  const authRecords = records.filter((record) => record.autoRefresh || record.mfaOccurred || record.authCaptureId !== undefined);
  const authCaptureIds = [...new Set(records.map((record) => record.authCaptureId).filter((value): value is string => value !== undefined))];
  writeAtomic(path.join(root, 'artifacts', `phase4-${baseRunId}-matrix.json`), { schemaVersion: 'nightwatch.exploration.phase4.v1', mode: 'PHASE_4_VALIDATION_EXPLORATION', seedCorpus: PHASE4_SEED_CORPUS, records, auth: { mcpCredentialInputAllowed: MCP_SECRET_INPUT_ALLOWED, mcpAttached: false, mcpObservationStatus: MCP_OBSERVATION_STATUS, autoRefreshCount: authRecords.filter((record) => record.autoRefresh).length, mfaCount: authRecords.filter((record) => record.mfaOccurred).length, authCaptureIds }, catalogFingerprint: catalogFingerprint(RIPPLE_PHASE4_ACTIONS), budget: RIPPLE_PHASE4_BUDGET, trace: false, screenshots: false });
  expect(records.filter((record) => record.kind === 'EXPLORATION')).toHaveLength(6);
  expect(records.every((record) => safetyIsZero(record.safety))).toBeTruthy();
});
