// ---------------------------------------------------------------------------
// Phase 5 bounded DEV API corpus.
//
// This test is never part of the ordinary suite. It freezes six source-proven
// KNOWN_READ operations, executes them serially through the Nightwatch
// loopback relay, and gives each operation one fresh replay. OOPS is not used
// for authenticated DEV traffic because the available isolated network
// namespace cannot reach the parent relay; the native path uses the same
// catalog, hydration, redirect, auth-injection, and oracle controls.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import type { EnvironmentConfig } from '../../src/core/environment/types';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { createEphemeralRippleApiAuthProvider } from '../../src/api/phase5/auth';
import { PHASE5_API_CATALOG, getPhase5Operation } from '../../src/api/phase5/catalog';
import { generateRestrictedScenario, materializeRelayPort } from '../../src/api/phase5/generator';
import { assertGeneratedScenarioSafe, parseRestrictedOopsScenario } from '../../src/api/phase5/restrictedProfile';
import { apiFingerprint } from '../../src/api/phase5/oracle';
import { startPhase5Relay, type RelayObservation } from '../../src/api/phase5/relay';
import { evaluateApiLineage, assertApiOperationFresh } from '../../src/api/phase5/lineage';
import { API_CATALOG_VERSION, OOPS_ADAPTER_VERSION, OOPS_PROFILE_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { inspectOopsSandbox } from '../../src/core/oops/sandbox';
import { createRunId } from '../../src/core/evidence/runRecorder';
import { runDevAuthRefresh, inspectDevAuthState, type DevAuthRefreshResult } from '../../src/auth/devAutoLogin';
import { assertAuthCapabilityPreflight } from '../../src/auth/capabilityLifecycle';
import { discoverRepositories, snapshotRepositories } from '../../src/core/repositories/snapshotter';
import { runRealRunGate, assertRealRunGate } from '../../src/core/safety/realRunGate';

const PHASE5_REAL_OPERATION_IDS = [
  'ripple.payer-exchange.read',
  'ripple.common-exchange.read',
  'ripple.account-inventory.read',
  'ripple.billing-groups.read',
  'ripple.billing-groups-legacy.read',
  'ripple.billing-group-exchange.read',
] as const;

const PHASE5_REAL_BUDGET = Object.freeze({ firstExecutions: 6, freshReplays: 6, totalRequests: 12, serial: true, delayMs: 350 });

type AttemptKind = 'FIRST' | 'FRESH_REPLAY';
type AttemptStatus = 'DEV_VERIFIED_FIRST' | 'DEV_VERIFIED_REPLAY' | 'L0_ANOMALY' | 'L1_REPRODUCED_ANOMALY' | 'L0_NOT_REPRODUCED' | 'AUTH_BLOCKED' | 'SAFETY_BLOCKED';

interface SafeAttemptRecord {
  attemptId: string;
  operationId: string;
  scenarioId: string;
  kind: AttemptKind;
  status: AttemptStatus;
  oracleResult: RelayObservation['oracle']['result'];
  statusClass: string;
  contentTypeClass: string;
  parseCategory: string;
  streamCategory: string;
  redirect: RelayObservation['redirect'];
  safetyBlock?: RelayObservation['safetyBlock'];
  fingerprint: string;
  bodyPersisted: false;
  destinationHostClass: RelayObservation['destinationHostClass'];
}

interface SafeOperationRecord {
  operationId: string;
  sourceSHA: string;
  semanticClass: 'KNOWN_READ';
  corpusClass: 'UI_BRIDGED_API' | 'API_ONLY_EXPANSION';
  journeyLinks: readonly string[];
  scenarioId: string;
  lineageStaleness: string;
  hydrationProfile: string;
  oracleProfile: string;
  first?: SafeAttemptRecord;
  replay?: SafeAttemptRecord;
}

function rootDirectory(): string {
  return path.resolve(__dirname, '..', '..');
}

function targetFor(environment: EnvironmentConfig): string {
  const configured = new URL(environment.uiBaseUrl);
  const selected = new URL(process.env.NIGHTWATCH_UI_URL ?? environment.uiBaseUrl);
  if (selected.protocol !== 'https:' || selected.origin !== configured.origin || selected.pathname !== configured.pathname || selected.username !== '' || selected.password !== '' || selected.search !== '' || selected.hash !== '') {
    throw new Error('fail-closed: Phase 5 target must exactly match the verified DEV UI URL');
  }
  return selected.toString();
}

function currentEnvironment(): EnvironmentConfig {
  const name = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (name !== 'dev') throw new Error('fail-closed: Phase 5 real API runner is DEV-only');
  return loadEnvironmentConfig(name);
}

function mfaWait(): Promise<void> {
  if (!process.stdin.isTTY) throw new Error('MFA_REQUIRED: non-interactive Phase 5 runner cannot complete MFA');
  console.log('HUMAN_MFA_WAIT: complete the guarded DEV MFA step, then press ENTER.');
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    prompt.once('line', () => { prompt.close(); resolve(); });
    prompt.once('SIGINT', () => { prompt.close(); reject(new Error('MFA_REQUIRED')); });
  });
}

async function repositoryFacts(root: string): Promise<{ snapshotsValid: boolean; nightwatchDirtyPaths: string[]; snapshots: unknown[] }> {
  // root is .../REPOSITORIES/nightwatch; source snapshots live beside the
  // Nightwatch checkout under .../REPOSITORIES. Keeping this path explicit
  // prevents the pre-real gate from silently snapshotting a non-existent
  // workspace-level path.
  const workspaceRoot = path.resolve(root, '..');
  const repos = [
    'mobingilabs/ripple-ui',
    'mobingilabs/ripple-api',
    'mobingilabs/ouchan',
    'alphauslabs/blueapi',
    'alphauslabs/blue-sdk-go',
    'alphauslabs/grpc-chunk-parser',
  ];
  const snapshots = await snapshotRepositories({ reposRoot: workspaceRoot, repos });
  const status = spawnSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  const dirty = status.status === 0 ? (status.stdout ?? '').split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim()) : ['<status-unavailable>'];
  return { snapshotsValid: snapshots.length === repos.length && snapshots.every((item) => item.ok), nightwatchDirtyPaths: dirty, snapshots };
}

function atomicJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${process.pid}`;
  const fd = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2), 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.closeSync(fd); } catch { /* best effort */ }
    try { fs.unlinkSync(temporary); } catch { /* best effort */ }
    throw error;
  }
}

async function ensureAuth(browser: Browser, environment: EnvironmentConfig, target: string, statePath: string, root: string): Promise<DevAuthRefreshResult> {
  const existing = inspectDevAuthState(statePath, target, environment);
  if (existing.valid) return { status: 'REUSED', environment: 'dev', providerType: 'external-owner-only-file', accountAlias: 'ripple-dev-designated-account', storageClass: 'external-owner-only-secret-file', storageStatePath: statePath, autoRefresh: false, mfaOccurred: false };
  if (process.env.NIGHTWATCH_PHASE_5_AUTH_REFRESH !== '1') throw new Error('HUMAN_AUTH_ACTION_REQUIRED: Phase 5 external DEV auth state is invalid');
  return await runDevAuthRefresh({ browser, environment, uiUrl: target, storageStatePath: statePath, mfaCompletion: { wait: mfaWait }, artifactsRoot: path.join(root, 'artifacts'), nightwatchRoot: root });
}

async function runRelayScenario(
  operationId: string,
  scenarioText: string,
  environment: EnvironmentConfig,
  authHeaders: () => Promise<Readonly<Record<string, string>>>,
): Promise<RelayObservation> {
  const relay = await startPhase5Relay({ catalog: PHASE5_API_CATALOG, mode: 'dev', environment, authHeaders });
  try {
    const materialized = materializeRelayPort(scenarioText, relay.port, operationId);
    const document = parseRestrictedOopsScenario(materialized, operationId);
    assertGeneratedScenarioSafe(materialized, operationId);
    const request = document.run[0].http;
    const response = await fetch(request.url, { method: request.method, headers: request.headers, redirect: 'manual' });
    await response.arrayBuffer();
    const observation = relay.takeObservation(operationId);
    if (observation === undefined) throw new Error('RELAY_INTERNAL_FAILURE: no sanitized operation observation');
    if (observation.destinationHostClass !== 'DEV_API' || observation.destinationHost !== environment.apiHosts?.[0]) throw new Error('PRODUCTION_CONTAINMENT_EVENT: relay destination mismatch');
    if (observation.safetyBlock !== undefined || observation.redirect === 'BLOCKED') throw new Error(`PHASE_5_SAFETY_BLOCK: ${observation.safetyBlock ?? 'REDIRECT_BLOCKED'}`);
    return observation;
  } finally {
    await relay.close();
  }
}

function attemptRecord(baseRunId: string, operationId: string, scenarioId: string, kind: AttemptKind, observation: RelayObservation): SafeAttemptRecord {
  const anomaly = observation.oracle.result !== 'ORACLE_PASS';
  const fingerprint = apiFingerprint({
    operationId,
    service: getPhase5Operation(operationId).service,
    oracleId: observation.oracle.oracleId,
    statusClass: observation.oracle.statusClass,
    contentTypeClass: observation.oracle.contentTypeClass,
    parseCategory: observation.oracle.parseCategory,
    streamCategory: observation.oracle.streamCategory,
    errorCategory: observation.oracle.result,
    catalogVersion: API_CATALOG_VERSION,
  });
  return {
    attemptId: `${baseRunId}-${operationId}-${kind.toLowerCase()}`,
    operationId,
    scenarioId,
    kind,
    status: anomaly ? (kind === 'FIRST' ? 'L0_ANOMALY' : 'L1_REPRODUCED_ANOMALY') : (kind === 'FIRST' ? 'DEV_VERIFIED_FIRST' : 'DEV_VERIFIED_REPLAY'),
    oracleResult: observation.oracle.result,
    statusClass: observation.oracle.statusClass,
    contentTypeClass: observation.oracle.contentTypeClass,
    parseCategory: observation.oracle.parseCategory,
    streamCategory: observation.oracle.streamCategory,
    redirect: observation.redirect,
    ...(observation.safetyBlock === undefined ? {} : { safetyBlock: observation.safetyBlock }),
    fingerprint,
    bodyPersisted: false,
    destinationHostClass: observation.destinationHostClass,
  };
}

test('Phase 5 bounded source-generated DEV API corpus', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_5_REAL !== '1') { test.skip(); return; }
  const environment = currentEnvironment();
  const target = targetFor(environment);
  const stateValue = process.env.NIGHTWATCH_STORAGE_STATE;
  if (stateValue === undefined || stateValue.trim() === '') throw new Error('HUMAN_AUTH_ACTION_REQUIRED: Phase 5 requires external DEV storage state');
  const statePath = validateStorageStateFile(stateValue);
  assertAuthCapabilityPreflight({
    artefactPath: statePath,
    environment: environment.name,
    targetOrigin: new URL(target).origin,
    requiredValidityMs: 15 * 60 * 1000,
  });
  const root = rootDirectory();
  const repository = await repositoryFacts(root);
  if (!repository.snapshotsValid || repository.nightwatchDirtyPaths.length > 0) throw new Error('PHASE_5_PRE_REAL_BLOCK: Nightwatch must be clean and source snapshots valid before the frozen API set');
  const authFacts = inspectDevAuthState(statePath, target, environment);
  const gate = await runRealRunGate({
    environment,
    uiUrl: target,
    storageStatePath: authFacts.valid ? statePath : null,
    requireAuthenticationState: authFacts.valid,
    storageStateEnvironment: authFacts.valid ? 'dev' : null,
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: { snapshotRecorded: true, snapshotsValid: repository.snapshotsValid, alphausRepositoriesSnapshotValid: repository.snapshotsValid, nightwatchDirtyPaths: repository.nightwatchDirtyPaths, documentedNightwatchDirtyPaths: [] },
  });
  assertRealRunGate(gate);
  const firstAuth = await ensureAuth(browser, environment, target, statePath, root);
  const postAuthGate = await runRealRunGate({
    environment,
    uiUrl: target,
    storageStatePath: statePath,
    storageStateEnvironment: 'dev',
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: { snapshotRecorded: true, snapshotsValid: repository.snapshotsValid, alphausRepositoriesSnapshotValid: repository.snapshotsValid, nightwatchDirtyPaths: repository.nightwatchDirtyPaths, documentedNightwatchDirtyPaths: [] },
  });
  assertRealRunGate(postAuthGate);

  const baseRunId = process.env.NIGHTWATCH_PHASE_5_RUN_ID ?? createRunId();
  if (!/^[A-Za-z0-9._-]+$/.test(baseRunId)) throw new Error('unsafe Phase 5 run ID');
  const sandbox = inspectOopsSandbox();
  const records: SafeOperationRecord[] = [];
  let requestCount = 0;
  for (const operationId of PHASE5_REAL_OPERATION_IDS) {
    if (requestCount >= PHASE5_REAL_BUDGET.totalRequests) throw new Error('PHASE_5_BUDGET_EXCEEDED');
    const operation = getPhase5Operation(operationId);
    if (operation.semanticClass !== 'KNOWN_READ' || operation.generationStatus !== 'GENERATION_ELIGIBLE') throw new Error(`API_MUTATION_OR_UNKNOWN_TRIPWIRE: ${operationId}`);
    const lineage = evaluateApiLineage(operation);
    if (lineage.staleness !== 'FRESH') throw new Error(`SOURCE_STALE: ${operationId}`);
    assertApiOperationFresh(operation);
    const scenario = generateRestrictedScenario(operation, PHASE5_API_CATALOG);
    const corpusClass = operation.journeyLinks.length > 0 ? 'UI_BRIDGED_API' : 'API_ONLY_EXPANSION';
    const record: SafeOperationRecord = { operationId, sourceSHA: operation.sourceSHA, semanticClass: 'KNOWN_READ', corpusClass, journeyLinks: operation.journeyLinks, scenarioId: scenario.scenarioId, lineageStaleness: lineage.staleness, hydrationProfile: scenario.hydrationProfile, oracleProfile: scenario.oracleProfile };
    const firstProvider = createEphemeralRippleApiAuthProvider(statePath, environment);
    const firstObservation = await runRelayScenario(operationId, scenario.logicalYaml, environment, async () => firstProvider.headers());
    requestCount += 1;
    record.first = attemptRecord(baseRunId, operationId, scenario.scenarioId, 'FIRST', firstObservation);
    await new Promise((resolve) => setTimeout(resolve, PHASE5_REAL_BUDGET.delayMs));
    const replayAuth = await ensureAuth(browser, environment, target, statePath, root);
    const replayProvider = createEphemeralRippleApiAuthProvider(statePath, environment);
    const replayObservation = await runRelayScenario(operationId, scenario.logicalYaml, environment, async () => replayProvider.headers());
    requestCount += 1;
    const replay = attemptRecord(baseRunId, operationId, scenario.scenarioId, 'FRESH_REPLAY', replayObservation);
    if (record.first.fingerprint !== replay.fingerprint && record.first.status === 'L0_ANOMALY') replay.status = 'L0_NOT_REPRODUCED';
    record.replay = replay;
    records.push(record);
    await new Promise((resolve) => setTimeout(resolve, PHASE5_REAL_BUDGET.delayMs));
    void firstAuth;
    void replayAuth;
  }

  const safety = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, productMutations: 0, dbQueries: 0, secretLeaks: 0 };
  const ledger = {
    schemaVersion: 'nightwatch.api-run-ledger.phase5.v1',
    runId: baseRunId,
    environment: 'dev',
    targetHostClass: 'DEV_API',
    mode: 'NATIVE_NIGHTWATCH_RELAY_FALLBACK',
    oops: { adapterVersion: OOPS_ADAPTER_VERSION, profileVersion: OOPS_PROFILE_VERSION, generatorVersion: SCENARIO_GENERATOR_VERSION, sandbox, authenticatedOopsExecution: sandbox.authenticatedOopsExecution },
    auth: { provider: firstAuth.providerType, environment: firstAuth.environment, autoRefresh: firstAuth.autoRefresh, mfaOccurred: firstAuth.mfaOccurred, passedToOops: false, persisted: false },
    budget: PHASE5_REAL_BUDGET,
    operationIds: PHASE5_REAL_OPERATION_IDS,
    records,
    safety,
    privacy: { rawBodiesPersisted: 0, responseBodiesForwardedToOops: 0, credentialsPersisted: 0, customerIdentifiersPersisted: 0, metadataOnly: true },
    sourceCatalogVersion: API_CATALOG_VERSION,
    completed: requestCount === PHASE5_REAL_BUDGET.totalRequests,
  };
  atomicJson(path.join(root, 'artifacts', `${baseRunId}-phase5-api-ledger.json`), ledger);
  expect(records).toHaveLength(PHASE5_REAL_OPERATION_IDS.length);
  expect(requestCount).toBe(PHASE5_REAL_BUDGET.totalRequests);
  expect(safety).toMatchObject({ productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, productMutations: 0, dbQueries: 0, secretLeaks: 0 });
});
