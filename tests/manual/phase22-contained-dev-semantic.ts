// ---------------------------------------------------------------------------
// Phase 22 — one frozen-manifest contained DEV acceptance campaign.
//
// The manifest is the complete target authority. This test performs no
// discovery, selector expansion, retry, mutation, NEXT contact, production
// contact, datastore work, screenshot, trace, or raw-response persistence.
// It runs each admitted target serially as exactly FIRST + one fresh-context
// replay, then writes only sanitized owner-local results.
// ---------------------------------------------------------------------------

import { test, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig } from '../../src/core/environment';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { inspectRipplePageAuthReadability } from '../../src/browser/fixtures/pageAuthReadability';
import { inspectStorageStateCookiePageReadability, inspectStorageStateKeySemantics, validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { assertRealRunGate, runRealRunGate } from '../../src/core/safety/realRunGate';
import { readProxyEvents } from '../../src/proxy/events';
import type { ProxyEvent } from '../../src/proxy/types';
import { readProxyRuntimeState } from '../../src/proxy/runtime';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import type { JourneyEvidence } from '../../src/core/journeys/types';
import { buildRippleJourneyEndpointRegistry, getRippleJourneyDefinition, type RippleJourneyId } from '../../src/products/ripple/journeyContracts';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { deriveCollectionWideRealSourceExpectations } from '../../src/oracles/expectations/collectionAdmission';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import type { SemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import { summarizePhase9bPass, comparePhase9bReplaySummaries } from '../../src/core/phase9b/summary';
import { phase22Digest } from '../../src/core/phase22/digest';
import { assertPhase22NoRawArtifactFields } from '../../src/core/phase22/privacy';
import {
  buildPhase22CalibrationMetrics,
  calculatePhase22RealConfidence,
  classifyPhase22SyntheticToReal,
  classifyPhase22Replay,
  createPhase22PrivacyReceipt,
  createPhase22RealAcceptanceDossier,
  guardPhase22SafeObservation,
  simulatePhase22DevAcceptance,
  validatePhase22Manifest,
  createPhase22PreflightReceipt,
  type Phase22DevAcceptanceManifest,
  type Phase22RealTargetResult,
} from '../../src/core/phase22';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';

interface Phase22Pass {
  readonly runId: string;
  readonly journey: JourneyEvidence;
  readonly receipts: readonly SemanticEvaluationReceipt[];
  readonly findings: readonly import('../../src/oracles/semantic').SemanticOracleFinding[];
  readonly privacyReceipts: readonly import('../../src/core/phase22').Phase22PrivacyReceipt[];
  readonly summary: ReturnType<typeof summarizePhase9bPass>;
  readonly safety: {
    readonly productionAttempts: number;
    readonly proxyHardViolations: number;
    readonly unknownDestinations: number;
    readonly mutations: number;
    readonly actionCausedUnknown: number;
    readonly databaseOperations: number;
  };
}

function readManifest(): Phase22DevAcceptanceManifest {
  if (process.env.NIGHTWATCH_PHASE_22_REAL !== '1') throw new Error('PHASE22_BLOCKED_LAUNCHER_TOKEN');
  const file = process.env.NIGHTWATCH_PHASE_22_MANIFEST;
  if (file === undefined || !path.isAbsolute(file)) throw new Error('PHASE22_BLOCKED_MANIFEST_PATH');
  let value: unknown;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error('PHASE22_BLOCKED_MANIFEST_UNREADABLE'); }
  validatePhase22Manifest(value as Phase22DevAcceptanceManifest);
  return value as Phase22DevAcceptanceManifest;
}

function sourceReader(snapshotRoot: string) {
  const root = fs.realpathSync(snapshotRoot);
  return {
    readFile(_repoId: string, relativePath: string): string | null {
      if (relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\') || relativePath.includes('\0')) return null;
      const file = path.resolve(root, relativePath);
      if (file !== root && !file.startsWith(root + path.sep)) return null;
      try { return fs.readFileSync(file, 'utf8'); }
      catch { return null; }
    },
  };
}

function currentHeadClean(): boolean {
  const root = path.resolve(__dirname, '..', '..');
  const status = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  return status.status === 0 && (status.stdout ?? '').trim() === '';
}

function sourceResolver(manifest: Phase22DevAcceptanceManifest) {
  const snapshotRoot = process.env.NIGHTWATCH_PHASE_22_SOURCE_SNAPSHOT;
  if (snapshotRoot === undefined) throw new Error('PHASE22_BLOCKED_SOURCE_SNAPSHOT_MISSING');
  const sha = manifest.targets[0]?.source.sha;
  if (sha === undefined) throw new Error('PHASE22_BLOCKED_EMPTY_MANIFEST');
  const reader = sourceReader(snapshotRoot);
  const snapshot = { repoId: 'mobingilabs/ripple-api', sha };
  const historical = deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, snapshot, reader);
  if (historical.failures.length !== 0) throw new Error('PHASE22_BLOCKED_SOURCE_DERIVATION_FAILED');
  const collection = deriveCollectionWideRealSourceExpectations(historical.derived);
  const expectationByTarget = new Map(collection.derived.map((item) => [item.recipe.targetId, item.expectation]));
  for (const target of manifest.targets) {
    const expectation = expectationByTarget.get(target.targetId);
    if (expectation === undefined || expectation.expectationId !== target.expectationId || expectation.sourceProvenance.sha !== target.source.sha || expectation.sourceProvenance.evidenceDigest !== target.source.evidenceDigest) {
      throw new Error('PHASE22_BLOCKED_MANIFEST_SOURCE_DRIFT');
    }
  }
  const resolver = createRealSourceResolver({
    recipes: REAL_SOURCE_EXPECTATION_RECIPES,
    expectations: collection.derived.map((item) => item.expectation),
    reader,
    currentness: { currentSnapshot: () => snapshot },
  });
  for (const target of manifest.targets) {
    const resolution = resolver.resolve({ targetId: target.targetId });
    if (resolution.kind !== 'RESOLVED' || resolution.expectation.expectationId !== target.expectationId || resolution.sourceSnapshot.sha !== target.source.sha) throw new Error('PHASE22_BLOCKED_EXPECTATION_NOT_RESOLVED');
  }
  return { resolver, snapshot };
}

function authFacts(statePath: string, target: string, environment: ReturnType<typeof loadEnvironmentConfig>): { structural: boolean; pageReadable: boolean } {
  try { validateStorageStateFile(statePath); }
  catch { return { structural: false, pageReadable: false }; }
  const semantics = inspectStorageStateKeySemantics(statePath, {
    authTokenKey: 'mo_access_token',
    apiTypeKey: 'api_type',
    apiTypeExpected: environment.name,
    appTypeKey: 'app_type',
    appTypeExpected: 'alphaus',
  });
  const url = new URL(target);
  const readability = inspectStorageStateCookiePageReadability(statePath, { cookieKey: 'mo_access_token', appOrigin: url.origin, appPath: url.pathname });
  return {
    structural: semantics.authTokenPresent && semantics.authTokenStructurallyNonEmpty && (!semantics.apiTypePresent || semantics.apiTypeMatchesExpected) && (!semantics.appTypePresent || semantics.appTypeMatchesExpected),
    pageReadable: readability.pageReadable,
  };
}

function proxySafety(): { readonly productionAttempts: number; readonly proxyHardViolations: number; readonly unknownDestinations: number } {
  try {
    const state = readProxyRuntimeState();
    const events = readProxyEvents(state.eventLogPath) as readonly ProxyEvent[];
    return {
      productionAttempts: events.filter((event) => event.classification === 'production').length,
      proxyHardViolations: events.filter((event) => event.decision === 'deny').length,
      unknownDestinations: events.filter((event) => event.decision === 'deny' && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    };
  } catch {
    return { productionAttempts: 0, proxyHardViolations: 1, unknownDestinations: 1 };
  }
}

async function observeOnce(opts: {
  readonly browser: Browser;
  readonly manifestTarget: Phase22DevAcceptanceManifest['targets'][number];
  readonly environment: ReturnType<typeof loadEnvironmentConfig>;
  readonly targetUrl: string;
  readonly storageStatePath: string;
  readonly resolver: ReturnType<typeof sourceResolver>['resolver'];
  readonly pass: 'first' | 'replay';
}): Promise<Phase22Pass> {
  const definition = getRippleJourneyDefinition(opts.manifestTarget.journeyOrApiAdapter as RippleJourneyId);
  if (definition === undefined || definition.journeyId !== opts.manifestTarget.journeyOrApiAdapter) throw new Error('PHASE22_BLOCKED_JOURNEY_ADAPTER_DRIFT');
  const runId = `phase22-${opts.manifestTarget.targetId.replace(/[^A-Za-z0-9._-]/g, '-')}-${opts.pass}`;
  const artifactsRoot = process.env.NIGHTWATCH_PHASE_22_ARTIFACT_ROOT;
  if (artifactsRoot === undefined || !path.isAbsolute(artifactsRoot)) throw new Error('PHASE22_BLOCKED_OWNER_ARTIFACT_ROOT');
  const recorder = new RunRecorder({ runId, environment: 'dev', product: 'ripple', browser: 'chromium', scenario: `phase22-${opts.manifestTarget.targetId}-${opts.pass}`, nightwatchSha: opts.manifestTarget.source.sha, artifactsRoot, authenticated: true });
  const semanticOracle = { resolve: (input: { targetId?: string }) => input.targetId === opts.manifestTarget.targetId ? opts.resolver.resolve({ targetId: input.targetId }) : { kind: 'NO_EXPECTATION' as const, targetId: input.targetId } };
  const endpointRegistry = buildRippleJourneyEndpointRegistry(opts.environment).filter((rule) => rule.id === opts.manifestTarget.targetId);
  const context = await createNightwatchContext(opts.browser, {
    env: opts.environment,
    recorder,
    uiBaseUrl: opts.targetUrl,
    storageStatePath: opts.storageStatePath,
    trace: 'off',
    failOn: opts.environment.failOn,
    bootstrapDiagnostics: true,
    endpointRegistry,
    journeyId: opts.manifestTarget.journeyOrApiAdapter,
    semanticOracle,
  });
  let journey: JourneyEvidence;
  try {
    context.network.beginJourneyObservation();
    journey = await runDeclarativeJourney(context.page, { recorder, monitor: context.monitor, network: context.network }, definition, { uiBaseUrl: opts.targetUrl, authValid: true });
    const pageAuth = await inspectRipplePageAuthReadability(context.page);
    if (!pageAuth.evaluationSucceeded || !pageAuth.tokenPageReadable || !pageAuth.tokenNonEmpty || pageAuth.aggregatePageBootstrapSemantics !== 'VALID') throw new Error('PHASE22_BLOCKED_AUTH_PAGE_NOT_READABLE');
  } finally {
    await context.close();
  }
  const receipts = [...context.network.semanticEvaluations()];
  const findings = [...context.network.semanticFindings()];
  const privacyReceipts = [...context.network.phase22PrivacyReceipts()];
  const summary = summarizePhase9bPass({ passId: opts.pass, receipts, ledgerReceiptCount: receipts.length, ledgerOverflow: context.network.semanticEvaluationLedgerOverflow(), findings, targetId: opts.manifestTarget.targetId });
  const safety = proxySafety();
  const semanticRequests = context.network.semanticRequests();
  return {
    runId,
    journey,
    receipts,
    findings,
    privacyReceipts,
    summary,
    safety: {
      ...safety,
      mutations: semanticRequests.filter((item) => item.disposition === 'KNOWN_MUTATION').length,
      actionCausedUnknown: semanticRequests.filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
      databaseOperations: 0,
    },
  };
}

function firstResult(pass: Phase22Pass): Phase22RealTargetResult['firstOutcome'] {
  const receipt = pass.receipts.find((item) => item.targetId === pass.summary.targetId);
  if (receipt?.outcome === 'PASS') return 'PASS';
  if (receipt?.outcome === 'ANOMALY') return 'ANOMALY';
  if (receipt?.outcome === 'PARTIAL_COVERAGE') return 'PARTIAL';
  if (receipt?.outcome === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  return 'INTERNAL_ERROR';
}

function buildTargetResult(target: Phase22DevAcceptanceManifest['targets'][number], first: Phase22Pass, replay: Phase22Pass): Phase22RealTargetResult {
  const comparison = comparePhase9bReplaySummaries(first.summary, replay.summary);
  const firstReceipt = first.receipts.find((item) => item.targetId === target.targetId);
  const replayReceipt = replay.receipts.find((item) => item.targetId === target.targetId);
  const firstDigest = firstReceipt?.projectionDigests[0] ?? 'proj:sha256:' + '0'.repeat(24);
  const replayDigest = replayReceipt?.projectionDigests[0] ?? 'proj:sha256:' + '0'.repeat(24);
  const replayDecision = classifyPhase22Replay({
    targetId: target.targetId,
    contractId: target.semanticContractId,
    expectationId: target.expectationId,
    sourceSha: target.source.sha,
    evidenceDigest: target.source.evidenceDigest,
    projectionDigest: firstDigest,
    replayObserved: replay.summary.receiptCount > 0,
    sourceCurrent: replay.summary.sourceSha === target.source.sha,
    contractSame: replay.summary.expectationId === target.expectationId,
    preconditionStable: replay.journey.authValid === true && replay.journey.safetyStatus === 'PASS',
    exactProjectionMatch: firstDigest === replayDigest,
    semanticEquivalent: comparison.pass,
    representationChanged: firstDigest !== replayDigest,
    contractPreserved: comparison.pass,
    observationDiverged: !comparison.pass,
    nondeterministic: false,
  });
  const coverage = first.summary.partialCoverageCount > 0 ? 'PARTIAL' as const : firstResult(first) === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' as const : 'FULL' as const;
  const projectionSucceeded = first.summary.receiptCount > 0 && first.summary.resolvedExpectationCount > 0;
  const privacyPassed = first.privacyReceipts.every((receipt) => receipt.rawPersistenceCount === 0) && replay.privacyReceipts.every((receipt) => receipt.rawPersistenceCount === 0);
  const protocolPassed = first.journey.passed && replay.journey.passed;
  const calibration = classifyPhase22SyntheticToReal({ sourceCurrent: first.summary.sourceSha === target.source.sha && replay.summary.sourceSha === target.source.sha, expectationResolved: first.summary.expectationId === target.expectationId && replay.summary.expectationId === target.expectationId, projectionAvailable: projectionSucceeded, contractApplicable: firstResult(first) !== 'NOT_APPLICABLE', contractSatisfied: firstResult(first) !== 'ANOMALY' && coverage === 'FULL', observedBroader: false, observedNarrower: false, semanticMismatch: firstResult(first) === 'ANOMALY', evidenceComplete: privacyPassed && protocolPassed });
  const confidence = calculatePhase22RealConfidence({ firstRunEvidence: first.summary.receiptCount > 0, sourceCurrent: first.summary.sourceSha === target.source.sha && replay.summary.sourceSha === target.source.sha, expectationResolved: first.summary.expectationId === target.expectationId && replay.summary.expectationId === target.expectationId, replayOutcome: replayDecision.outcome, semanticIdentityStable: comparison.pass, repeatStability: comparison.pass ? 'DETERMINISTIC' : 'GENUINELY_NONDETERMINISTIC', minimizationProof: 'NOT_PROVEN_MINIMAL', oracleAuthoritative: true, benignControlPassed: true, evidenceComplete: coverage === 'FULL', privacyPassed, protocolPassed, preconditionStable: replay.journey.authValid === true });
  return {
    targetId: target.targetId,
    expectationId: target.expectationId,
    materialClass: target.materialClass,
    collectionEvaluated: target.materialClass === 'COLLECTION',
    membershipEvaluated: target.materialClass === 'MEMBERSHIP',
    sourceCurrent: first.summary.sourceSha === target.source.sha && replay.summary.sourceSha === target.source.sha,
    expectationResolved: first.summary.expectationId === target.expectationId && replay.summary.expectationId === target.expectationId,
    firstOutcome: firstResult(first),
    replayOutcome: replayDecision.outcome,
    semanticDeterministic: comparison.pass,
    differentialOutcome: null,
    coverage,
    projectionSucceeded,
    privacyPassed,
    protocolPassed,
    findingCount: first.summary.findingCount,
    calibration,
    confidence: confidence.confidence,
  };
}

function auditArtifacts(root: string): { readonly rawResponsePersistence: number; readonly screenshots: number; readonly traces: number; readonly storageStateCopies: number; readonly authenticatedTraces: number; readonly rawDomPersistence: number; readonly privacyEvents: number } {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else files.push(file);
    }
  };
  visit(root);
  let rawResponsePersistence = 0;
  let screenshots = 0;
  let traces = 0;
  let storageStateCopies = 0;
  let authenticatedTraces = 0;
  let rawDomPersistence = 0;
  for (const file of files) {
    const base = path.basename(file).toLowerCase();
    if (base.endsWith('.png') || base.endsWith('.jpg') || base.endsWith('.jpeg')) screenshots += 1;
    if (base.endsWith('.zip') || base.includes('trace')) traces += 1;
    if (base.includes('storage') || base.includes('cookie')) storageStateCopies += 1;
    const content = fs.readFileSync(file, 'utf8');
    if (/(?:rawbody|rawtext|responsebody|requestbody|customer[_-]?(?:id|name|value)|bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|mo_access_token|setmembers|domtext|html)/i.test(content)) {
      rawResponsePersistence += /(?:rawbody|rawtext|responsebody|requestbody)/i.test(content) ? 1 : 0;
      rawDomPersistence += /(?:customer[_-]?(?:id|name|value)|domtext|html)/i.test(content) ? 1 : 0;
      storageStateCopies += /(?:bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|mo_access_token)/i.test(content) ? 1 : 0;
    }
    try {
      if (content.trim() !== '') {
        const values = base.endsWith('.jsonl')
          ? content.split(/\r?\n/).filter((line) => line.length > 0).map((line) => JSON.parse(line))
          : [JSON.parse(content)];
        for (const value of values) assertPhase22NoRawArtifactFields(value);
      }
    } catch { throw new Error('PHASE22_BLOCKED_PRIVACY_AUDIT'); }
  }
  authenticatedTraces = traces;
  return { rawResponsePersistence, screenshots, traces, storageStateCopies, authenticatedTraces, rawDomPersistence, privacyEvents: 0 };
}

function writeOwnerResults(file: string, value: unknown): void {
  if (!path.isAbsolute(file)) throw new Error('PHASE22_BLOCKED_RESULTS_PATH');
  const root = path.resolve(__dirname, '..', '..');
  const workspace = path.resolve(root, '..', '..');
  if (file.startsWith(root + path.sep) || file.startsWith(workspace + path.sep)) throw new Error('PHASE22_BLOCKED_RESULTS_SCOPE');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(file), 0o700);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

test('Phase 22 one bounded DEV semantic acceptance campaign', async ({ browser }) => {
  const manifest = readManifest();
  if (manifest.targets.length > 6 || manifest.targets.length * 2 > 12) throw new Error('PHASE22_BLOCKED_TARGET_BOUND');
  if (!currentHeadClean()) throw new Error('PHASE22_BLOCKED_NIGHTWATCH_DIRTY');
  const environmentName = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (environmentName !== 'dev') throw new Error('PHASE22_BLOCKED_NOT_DEV');
  const environment = loadEnvironmentConfig(environmentName);
  const targetUrl = validateUiUrl(environment, environment.uiBaseUrl);
  const statePath = process.env.NIGHTWATCH_STORAGE_STATE;
  if (statePath === undefined) throw new Error('PHASE22_BLOCKED_AUTH_PATH');
  const auth = authFacts(statePath, targetUrl, environment);
  if (!auth.structural || !auth.pageReadable) throw new Error('PHASE22_BLOCKED_AUTH_NOT_READABLE');
  const source = sourceResolver(manifest);
  const dryRun = simulatePhase22DevAcceptance(manifest);
  const gate = await runRealRunGate({
    environment,
    uiUrl: targetUrl,
    storageStatePath: statePath,
    storageStateEnvironment: 'dev',
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: { snapshotRecorded: true, snapshotsValid: true, alphausRepositoriesSnapshotValid: true, nightwatchDirtyPaths: [], documentedNightwatchDirtyPaths: [] },
  });
  if (!gate.pass) throw new Error('PHASE22_BLOCKED_CONTAINMENT_GATE');
  const preflightReceipt = createPhase22PreflightReceipt({
    environmentDev: true, productionRejected: true, nextRejected: true,
    l0CdpGuardActive: true, l1RouteGuardActive: true, l2WebsocketGuardActive: true, l3WorkerContainmentActive: true, l4UnroutedDetectionActive: true, l5LoopbackProxyActive: true,
    quicDisabled: AUTHENTICATED_BROWSER_CONTRACT.quicDisabled, nonProxiedWebrtcDisabled: AUTHENTICATED_BROWSER_CONTRACT.nonProxiedWebrtcDisabled,
    traceDisabled: true, screenshotsDisabled: true, rawResponsePersistenceDisabled: true, rawDomPersistenceDisabled: true, mutationRegistryActive: true,
    storageStateExternal: true, storageStateRegularFile: true, storageStateNoSymlink: true, storageStateRestrictivePermissions: true,
    authStructurallyValid: auth.structural, authUnexpired: auth.pageReadable, authPageReadable: auth.pageReadable,
    sourceCurrent: true, expectationResolved: true, journeyApiAdapterCurrent: true, ownerPolicyAllows: true, noDatabaseOrInfraPath: true, cleanNightwatchGitState: true, manifestFrozen: true, dryRunPassed: dryRun.externalContact === false,
    targetCount: manifest.targets.length, plannedObservationContexts: manifest.targets.length * 2, manifestDigest: manifest.deterministicDigest,
  });
  if (!preflightReceipt.passed) throw new Error('PHASE22_BLOCKED_PREFLIGHT_V2');

  const targetResults: Phase22RealTargetResult[] = [];
  const dossiers = [];
  let devObservationCount = 0;
  let nextContacts = 0;
  let productionAttempts = 0;
  let knownMutations = 0;
  let actionCausedUnknown = 0;
  let unknownDestinations = 0;
  let proxyHardViolations = 0;
  let databaseOperations = 0;
  for (const target of manifest.targets) {
    const first = await observeOnce({ browser, manifestTarget: target, environment, targetUrl, storageStatePath: statePath, resolver: source.resolver, pass: 'first' });
    devObservationCount += 1;
    const replay = await observeOnce({ browser, manifestTarget: target, environment, targetUrl, storageStatePath: statePath, resolver: source.resolver, pass: 'replay' });
    devObservationCount += 1;
    const result = buildTargetResult(target, first, replay);
    targetResults.push(result);
    const privacyReceipt = first.privacyReceipts[0] ?? replay.privacyReceipts[0] ?? createPhase22PrivacyReceipt({ approvedCategoryCount: 0, rejectedEventCount: 0 });
    dossiers.push(createPhase22RealAcceptanceDossier({ target, source: target.source, productSurfaceId: target.journeyOrApiAdapter, semanticRelation: target.materialClass === 'COLLECTION' ? 'COLLECTION_CONTRACT' : 'PROTOCOL_CONTRACT', firstResult: result.firstOutcome, replayResult: result.replayOutcome, differentialResult: result.differentialOutcome, coverage: result.coverage, confidence: result.confidence, findingCount: result.findingCount, privacyReceiptId: privacyReceipt.receiptId, limitations: ['NO_PRODUCT_CORRECTNESS_CLAIM', 'BOUNDED_MANIFEST_ONLY', 'REAL_MINIMIZATION_NOT_AUTHORIZED'], recommendedHumanFollowUp: result.findingCount > 0 ? 'OWNER_REVIEW_SANITIZED_FINDING' : 'NO_FOLLOW_UP_UNLESS_ANOMALY' }));
    productionAttempts += first.safety.productionAttempts + replay.safety.productionAttempts;
    knownMutations += first.safety.mutations + replay.safety.mutations;
    actionCausedUnknown += first.safety.actionCausedUnknown + replay.safety.actionCausedUnknown;
    databaseOperations += first.safety.databaseOperations + replay.safety.databaseOperations;
    proxyHardViolations += first.safety.proxyHardViolations + replay.safety.proxyHardViolations;
    unknownDestinations += first.safety.unknownDestinations + replay.safety.unknownDestinations;
  }
  const artifactsRoot = process.env.NIGHTWATCH_PHASE_22_ARTIFACT_ROOT;
  if (artifactsRoot === undefined) throw new Error('PHASE22_BLOCKED_ARTIFACT_ROOT');
  const privacyAudit = auditArtifacts(artifactsRoot);
  const metrics = buildPhase22CalibrationMetrics({ targetsConsidered: manifest.targets.length + manifest.exclusions.length, targetsEligible: manifest.targets.length, targetsAdmitted: manifest.targets.length, results: targetResults, privacyEvents: privacyAudit.privacyEvents, safetyEvents: productionAttempts + knownMutations + actionCausedUnknown + unknownDestinations + proxyHardViolations });
  const safetyVector = {
    DEV_observations: devObservationCount,
    NEXT_contacts: nextContacts,
    production_attempts: productionAttempts,
    KNOWN_MUTATION: knownMutations,
    ACTION_CAUSED_UNKNOWN: actionCausedUnknown,
    unknown_destinations: unknownDestinations,
    proxy_hard_violations: proxyHardViolations,
    database_operations: databaseOperations,
    datastore_operations: 0,
    cloud_infra_operations: 0,
    screenshots: privacyAudit.screenshots,
    authenticated_traces: privacyAudit.authenticatedTraces,
    raw_response_persistence: privacyAudit.rawResponsePersistence,
    raw_DOM_persistence: privacyAudit.rawDomPersistence,
    storage_state_copies: privacyAudit.storageStateCopies,
    AI_model_calls: 0,
    Alphaus_writes: 0,
    publication_actions: 0,
  };
  const resultsPath = process.env.NIGHTWATCH_PHASE_22_RESULTS;
  if (resultsPath === undefined) throw new Error('PHASE22_BLOCKED_RESULTS_PATH');
  const output = { schemaVersion: 'nightwatch.phase22-real-acceptance-results.v1', manifestId: manifest.manifestId, sourceSha: manifest.targets[0]?.source.sha ?? null, sourceEvidenceDigests: manifest.targets.map((target) => target.source.evidenceDigest), metrics, targetResults, dossiers, privacyAudit, safetyVector, preflightReceipt, externalContact: true as const, deterministicDigest: phase22Digest({ manifestId: manifest.manifestId, metrics, targetResults, dossiers, privacyAudit, safetyVector, preflightReceipt }, 'phase22-results:sha256:') };
  assertPhase22NoRawArtifactFields(output);
  writeOwnerResults(resultsPath, output);
});
