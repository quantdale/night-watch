// ---------------------------------------------------------------------------
// Phase 7 deterministic campaign identity and manifest construction.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { validateSemanticFinding } from '../../oracles/semantic/types';
import {
  CAMPAIGN_MANIFEST_VERSION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  type CampaignInput,
  type CampaignAnomalyCandidate,
  type CampaignManifest,
  type CampaignMode,
  type CampaignPrivacyPolicy,
  type CampaignSelectionResult,
  type CampaignSourceWindow,
  type CampaignWorkItem,
} from './types';
import { buildCampaignSelection, validateCampaignInputs } from './selection';
import { analyzeCampaignBudgetFeasibility, INITIAL_REAL_CAMPAIGN_BUDGET, isRealScaleBudget, validateBudgetPolicy } from './budget';
import {
  arraysExactlyEqual,
  assertBoolean,
  assertEnum,
  assertExactKeys,
  assertFiniteNonNegative,
  assertIsoTimestamp,
  assertNonNegativeInteger,
  assertString,
  assertUniqueStrings,
  requireRuntimeArray,
  requireRuntimeRecord,
  type RuntimeRecord,
} from './runtimeValidation';

const SHA_RE = /^[0-9a-f]{40}$/i;
const ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const SEED_RE = /^0x[0-9a-f]{16}$/;
const CAMPAIGN_MODES: readonly CampaignMode[] = ['CHANGE_DIRECTED', 'BASELINE_HEALTH', 'COVERAGE_EXPANSION', 'REPRODUCTION_ONLY', 'LOCAL_SYNTHETIC'];
const WORK_KINDS = ['JOURNEY', 'API', 'EXPLORATION', 'REPRODUCTION', 'MINIMIZATION'] as const;
const REPLAY_POLICIES = ['NONE', 'ON_ADMISSION', 'FIRST_PLUS_FRESH_REPLAY'] as const;
const MANIFEST_KEYS = [
  'schemaVersion', 'campaignSchemaVersion', 'campaignId', 'manifestFingerprint',
  'mode', 'createdAt', 'sourceSnapshots', 'sourceWindow', 'selection',
  'selectedJourneys', 'selectedEnvelopes', 'selectedApiScenarios', 'seedSet',
  'seedCorpusVersion', 'workItems', 'budgetPolicy', 'runtimeCeilingMs',
  'perTestTimeoutMs', 'replayBudget', 'minimizationBudget', 'versions',
  'privacyPolicy', 'ownerScopePolicy', 'deploymentStatus',
] as const;

function manifestIntegrity(reason: string): never {
  throw new Error(`CAMPAIGN_MANIFEST_INTEGRITY_INVALID:${reason}`);
}

function assertId(value: unknown, code: string): asserts value is string {
  assertString(value, code);
  if (!ID_RE.test(value)) throw new Error(`${code}:ID_INVALID`);
}

function assertNullableString(value: unknown, code: string): void {
  if (value !== null) assertId(value, code);
}

function assertStringArray(value: unknown, code: string, unique = true): asserts value is readonly string[] {
  const values = requireRuntimeArray(value, code);
  if (unique) assertUniqueStrings(values, code);
  for (const item of values) assertId(item, code);
}

function validateSelectionExplanation(value: unknown, code: string): void {
  const explanation = requireRuntimeRecord(value, code);
  assertExactKeys(explanation, ['selected', 'reason', 'sourceImpact', 'confidence', 'riskClass', 'linkedJourneyId', 'linkedEnvelopeId', 'linkedApiOperationId'], code);
  assertBoolean(explanation.selected, code);
  for (const key of ['reason', 'sourceImpact', 'confidence', 'riskClass']) assertString(explanation[key], `${code}:${key}`);
  assertNullableString(explanation.linkedJourneyId, `${code}:linkedJourneyId`);
  assertNullableString(explanation.linkedEnvelopeId, `${code}:linkedEnvelopeId`);
  assertNullableString(explanation.linkedApiOperationId, `${code}:linkedApiOperationId`);
}

function validateSelectionShape(value: unknown): void {
  const selection = requireRuntimeRecord(value, 'SELECTION');
  assertExactKeys(selection, ['mode', 'phase3', 'selectedJourneys', 'selectedEnvelopes', 'selectedApiScenarios', 'selectedSeeds', 'explanations', 'nonSelectedJourneys', 'fallbackTriggered', 'zeroSelectionJustified'], 'SELECTION');
  assertEnum(selection.mode, CAMPAIGN_MODES, 'SELECTION_MODE');
  if (selection.phase3 !== null) requireRuntimeRecord(selection.phase3, 'SELECTION_PHASE3');
  assertStringArray(selection.selectedJourneys, 'SELECTION_JOURNEYS');
  assertStringArray(selection.selectedEnvelopes, 'SELECTION_ENVELOPES');
  assertStringArray(selection.selectedApiScenarios, 'SELECTION_API_SCENARIOS');
  assertStringArray(selection.selectedSeeds, 'SELECTION_SEEDS');
  const explanations = requireRuntimeArray(selection.explanations, 'SELECTION_EXPLANATIONS');
  const explanationKeys = new Set<string>();
  for (const value of explanations) {
    const entry = requireRuntimeRecord(value, 'SELECTION_EXPLANATION_ENTRY');
    assertExactKeys(entry, ['workItemKey', 'explanation'], 'SELECTION_EXPLANATION_ENTRY');
    assertId(entry.workItemKey, 'SELECTION_WORK_ITEM_KEY');
    if (explanationKeys.has(entry.workItemKey)) manifestIntegrity(`DUPLICATE_SELECTION_EXPLANATION:${entry.workItemKey}`);
    explanationKeys.add(entry.workItemKey);
    validateSelectionExplanation(entry.explanation, `SELECTION_EXPLANATION:${entry.workItemKey}`);
  }
  const nonSelected = requireRuntimeArray(selection.nonSelectedJourneys, 'SELECTION_NON_SELECTED');
  const nonSelectedIds = new Set<string>();
  for (const value of nonSelected) {
    const entry = requireRuntimeRecord(value, 'SELECTION_NON_SELECTED_ENTRY');
    assertExactKeys(entry, ['journeyId', 'reason', 'reasonCode'], 'SELECTION_NON_SELECTED_ENTRY');
    assertId(entry.journeyId, 'SELECTION_NON_SELECTED_JOURNEY');
    assertString(entry.reason, 'SELECTION_NON_SELECTED_REASON');
    assertString(entry.reasonCode, 'SELECTION_NON_SELECTED_REASON_CODE');
    if (nonSelectedIds.has(entry.journeyId)) manifestIntegrity(`DUPLICATE_NON_SELECTED_JOURNEY:${entry.journeyId}`);
    nonSelectedIds.add(entry.journeyId);
  }
  assertBoolean(selection.fallbackTriggered, 'SELECTION_FALLBACK');
  assertBoolean(selection.zeroSelectionJustified, 'SELECTION_ZERO_JUSTIFICATION');
}

function validateBudgetShape(value: unknown): void {
  const budget = requireRuntimeRecord(value, 'MANIFEST_BUDGET');
  assertExactKeys(budget, ['policyVersion', 'maxTotalBrowserContexts', 'maxJourneyContexts', 'maxExplorationContexts', 'maxApiExecutions', 'maxReplays', 'maxMinimizationCandidates', 'maxTotalActions', 'maxRuntimeMs', 'maxPerTestTimeoutMs', 'maxPromotedClusters', 'maxPrivateEvidenceBytes'], 'MANIFEST_BUDGET');
  assertString(budget.policyVersion, 'MANIFEST_BUDGET_POLICY_VERSION');
  for (const key of ['maxTotalBrowserContexts', 'maxJourneyContexts', 'maxExplorationContexts', 'maxApiExecutions', 'maxReplays', 'maxMinimizationCandidates', 'maxTotalActions', 'maxRuntimeMs', 'maxPerTestTimeoutMs', 'maxPromotedClusters', 'maxPrivateEvidenceBytes']) {
    assertNonNegativeInteger(budget[key], `MANIFEST_BUDGET:${key}`);
  }
  validateBudgetPolicy(budget as unknown as CampaignManifest['budgetPolicy']);
}

function validateSourceShape(value: unknown): void {
  const snapshots = requireRuntimeArray(value, 'MANIFEST_SOURCE_SNAPSHOTS');
  const repoIds = new Set<string>();
  for (const value of snapshots) {
    const snapshot = requireRuntimeRecord(value, 'MANIFEST_SOURCE_SNAPSHOT');
    assertExactKeys(snapshot, ['repoId', 'branch', 'headSha', 'trackingRef', 'trackingSha', 'ahead', 'behind', 'dirty', 'dirtyFileCount', 'sourceMapSha', 'freshness', 'readOnly'], 'MANIFEST_SOURCE_SNAPSHOT');
    assertId(snapshot.repoId, 'MANIFEST_SOURCE_REPO');
    assertString(snapshot.branch, 'MANIFEST_SOURCE_BRANCH');
    assertString(snapshot.headSha, 'MANIFEST_SOURCE_HEAD');
    assertString(snapshot.sourceMapSha, 'MANIFEST_SOURCE_MAP');
    if (!SHA_RE.test(snapshot.headSha) || !ID_RE.test(snapshot.sourceMapSha)) manifestIntegrity(`SOURCE_SNAPSHOT_INVALID:${snapshot.repoId}`);
    if (snapshot.trackingRef !== null) assertString(snapshot.trackingRef, 'MANIFEST_SOURCE_TRACKING_REF');
    if (snapshot.trackingSha !== null) {
      assertString(snapshot.trackingSha, 'MANIFEST_SOURCE_TRACKING_SHA');
      if (!SHA_RE.test(snapshot.trackingSha)) manifestIntegrity(`SOURCE_TRACKING_SHA_INVALID:${snapshot.repoId}`);
    }
    for (const key of ['ahead', 'behind']) if (snapshot[key] !== null) assertNonNegativeInteger(snapshot[key], `MANIFEST_SOURCE:${key}`);
    assertBoolean(snapshot.dirty, 'MANIFEST_SOURCE_DIRTY');
    assertNonNegativeInteger(snapshot.dirtyFileCount, 'MANIFEST_SOURCE_DIRTY_COUNT');
    assertString(snapshot.freshness, 'MANIFEST_SOURCE_FRESHNESS');
    if (snapshot.readOnly !== true) manifestIntegrity(`SOURCE_NOT_READ_ONLY:${snapshot.repoId}`);
    if (repoIds.has(snapshot.repoId)) manifestIntegrity(`DUPLICATE_SOURCE_REPO:${snapshot.repoId}`);
    repoIds.add(snapshot.repoId);
  }
  const ordered = [...repoIds].sort((a, b) => a.localeCompare(b));
  if (!arraysExactlyEqual(snapshots.map((value) => (value as RuntimeRecord).repoId), ordered)) manifestIntegrity('SOURCE_SNAPSHOT_ORDER_NOT_CANONICAL');
}

function validateVersionShape(value: unknown): void {
  const versions = requireRuntimeRecord(value, 'MANIFEST_VERSIONS');
  const keys = ['campaignSchemaVersion', 'orchestratorVersion', 'nightwatchSourceSha', 'selectorVersion', 'dependencyMapVersion', 'journeyContractVersion', 'journeyOracleVersion', 'explorationCatalogVersion', 'explorationModelVersion', 'explorationPlannerVersion', 'apiCatalogVersion', 'apiGeneratorVersion', 'apiOracleVersion', 'triageClusterVersion', 'triageMinimizerVersion', 'dossierVersion', 'ownerScopePolicyVersion', 'privateArtifactPolicyVersion', 'seedCorpusVersion', 'budgetPolicyVersion', 'triageReplayPlanVersion', 'triageReplayPlanV2Version', 'semanticTriageEvidenceVersion', 'dossierV2Version', 'semanticClusterVersion', 'semanticBundleVersion', 'semanticReceiptVersion', 'semanticExpectationDerivationVersion'];
  assertExactKeys(versions, keys, 'MANIFEST_VERSIONS');
  for (const key of keys) assertString(versions[key], `MANIFEST_VERSION:${key}`);
  if (versions.campaignSchemaVersion !== CAMPAIGN_SCHEMA_VERSION || versions.orchestratorVersion !== CAMPAIGN_ORCHESTRATOR_VERSION) manifestIntegrity('VERSION_IDENTITY_MISMATCH');
}

function validatePrivacyShape(value: unknown): void {
  const privacy = requireRuntimeRecord(value, 'MANIFEST_PRIVACY');
  assertExactKeys(privacy, ['storageClass', 'remotePrivacy', 'externalPublication', 'rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'cookiesPersisted', 'tokensPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'], 'MANIFEST_PRIVACY');
  assertEnum(privacy.storageClass, ['OWNER_ONLY_LOCAL'], 'MANIFEST_PRIVACY_STORAGE');
  assertEnum(privacy.remotePrivacy, ['NO_REMOTE', 'PRIVATE_REMOTE_CONFIRMED', 'REMOTE_PRIVACY_UNRESOLVED'], 'MANIFEST_PRIVACY_REMOTE');
  assertEnum(privacy.externalPublication, ['PROHIBITED'], 'MANIFEST_PRIVACY_PUBLICATION');
  for (const key of ['rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'cookiesPersisted', 'tokensPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted']) {
    if (privacy[key] !== false) manifestIntegrity(`PRIVACY_POLICY_WEAKENED:${key}`);
  }
}

function validateWorkItemShape(value: unknown, code: string): RuntimeRecord {
  const item = requireRuntimeRecord(value, code);
  assertExactKeys(item, ['workItemId', 'kind', 'order', 'journeyId', 'envelopeId', 'apiOperationId', 'seed', 'linkedWorkItemIds', 'replayPolicy', 'selection'], code);
  assertId(item.workItemId, `${code}:ID`);
  assertEnum(item.kind, WORK_KINDS, `${code}:KIND`);
  assertNonNegativeInteger(item.order, `${code}:ORDER`);
  assertNullableString(item.journeyId, `${code}:JOURNEY`);
  assertNullableString(item.envelopeId, `${code}:ENVELOPE`);
  assertNullableString(item.apiOperationId, `${code}:API`);
  if (item.seed !== null) {
    assertString(item.seed, `${code}:SEED`);
    if (item.kind === 'EXPLORATION' && !SEED_RE.test(item.seed)) manifestIntegrity(`${code}:SEED_INVALID`);
    if (item.kind !== 'EXPLORATION' && !ID_RE.test(item.seed)) manifestIntegrity(`${code}:SEED_ID_INVALID`);
  }
  assertStringArray(item.linkedWorkItemIds, `${code}:LINKS`);
  assertEnum(item.replayPolicy, REPLAY_POLICIES, `${code}:REPLAY_POLICY`);
  validateSelectionExplanation(item.selection, `${code}:SELECTION`);
  return item;
}

function assertNullableStringValue(value: unknown, code: string): void {
  if (value !== null) assertString(value, code);
}

/**
 * Validate the metadata-only candidate DTO that may cross a durable boundary.
 * The executable replay callback is intentionally absent; nested structures
 * are allowlisted so recomputing a digest cannot make arbitrary execution
 * material authoritative.
 */
export function assertPersistedCandidateShape(value: unknown, code: string): void {
  const candidate = requireRuntimeRecord(value, code);
  assertExactKeys(candidate, [
    'observation', 'journeyId', 'contractVersion', 'contractDigest', 'contextKind',
    'originalSequence', 'technicalSeverity', 'breadth', 'browser', 'api',
    'sourceCorrelation', 'alternativesRuledOut', 'missingEvidence', 'knownNightwatchDefect',
  ], code, ['sourceRelevance', 'semanticFindings']);
  if (candidate.semanticFindings !== undefined) {
    const findings = requireRuntimeArray(candidate.semanticFindings, `${code}:SEMANTIC_FINDINGS`);
    for (const finding of findings) {
      validateSemanticFinding(requireRuntimeRecord(finding, `${code}:SEMANTIC_FINDING`) as unknown as import('../../oracles/semantic/types').SemanticOracleFinding);
    }
  }
  assertNullableStringValue(candidate.journeyId, `${code}:JOURNEY_ID`);
  for (const key of ['contractVersion', 'contractDigest']) assertString(candidate[key], `${code}:${key.toUpperCase()}`);
  assertEnum(candidate.contextKind, ['FIRST_OBSERVATION', 'FRESH_CONTEXT_REPLAY', 'BOUNDED_REPETITION'], `${code}:CONTEXT_KIND`);
  assertEnum(candidate.technicalSeverity, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'], `${code}:TECHNICAL_SEVERITY`);
  assertEnum(candidate.breadth, ['NARROW', 'MULTI_JOURNEY', 'SHARED_CORE'], `${code}:BREADTH`);
  if (candidate.sourceRelevance !== undefined) assertEnum(candidate.sourceRelevance, ['DIRECT_CHANGE_RELEVANCE', 'SHARED_CHANGE_RELEVANCE', 'TRANSITIVE_CHANGE_RELEVANCE', 'NO_CURRENT_CHANGE_RELEVANCE', 'UNKNOWN'], `${code}:SOURCE_RELEVANCE`);
  assertBoolean(candidate.knownNightwatchDefect, `${code}:KNOWN_NIGHTWATCH_DEFECT`);

  const observation = requireRuntimeRecord(candidate.observation, `${code}:OBSERVATION`);
  assertExactKeys(observation, ['runId', 'observedAt', 'fingerprint', 'features', 'reproduced', 'minimized', 'sourceFreshness'], `${code}:OBSERVATION`, ['timingClass', 'knownFalsePositiveId']);
  for (const key of ['runId', 'observedAt', 'fingerprint']) assertString(observation[key], `${code}:OBSERVATION_${key.toUpperCase()}`);
  assertIsoTimestamp(observation.observedAt, `${code}:OBSERVATION_TIMESTAMP`);
  assertBoolean(observation.reproduced, `${code}:OBSERVATION_REPRODUCED`);
  assertBoolean(observation.minimized, `${code}:OBSERVATION_MINIMIZED`);
  assertEnum(observation.sourceFreshness, ['SOURCE_CURRENT_LOCALLY', 'LOCAL_TRACKING_REF_ONLY', 'REMOTE_FRESHNESS_CONFIRMED', 'UNKNOWN'], `${code}:OBSERVATION_SOURCE_FRESHNESS`);
  if (observation.timingClass !== undefined) assertEnum(observation.timingClass, ['NONE', 'BOUNDED', 'TRANSIENT'], `${code}:OBSERVATION_TIMING`);
  if (observation.knownFalsePositiveId !== undefined) assertString(observation.knownFalsePositiveId, `${code}:OBSERVATION_FALSE_POSITIVE`);
  const features = requireRuntimeRecord(observation.features, `${code}:FEATURES`);
  const featureKeys = ['journeyId', 'envelopeId', 'oracleId', 'routeClass', 'operationFamily', 'statusClass', 'contentTypeClass', 'runtimeCategory', 'structuralState', 'failureActionId', 'sourceImpactRegion', 'browserApiResultClass'];
  assertExactKeys(features, featureKeys, `${code}:FEATURES`);
  for (const key of featureKeys) assertNullableStringValue(features[key], `${code}:FEATURES_${key.toUpperCase()}`);

  const sequence = requireRuntimeArray(candidate.originalSequence, `${code}:ORIGINAL_SEQUENCE`);
  for (const action of sequence) {
    const record = requireRuntimeRecord(action, `${code}:ACTION`);
    assertExactKeys(record, ['actionId', 'semanticClass', 'routeClass', 'sourceApproved', 'catalogVersion'], `${code}:ACTION`, ['preconditionKey']);
    for (const key of ['actionId', 'routeClass', 'catalogVersion']) assertString(record[key], `${code}:ACTION_${key.toUpperCase()}`);
    assertEnum(record.semanticClass, ['KNOWN_READ', 'LOCAL_ONLY'], `${code}:ACTION_SEMANTIC`);
    if (record.sourceApproved !== true) throw new Error(`${code}:ACTION_SOURCE_NOT_APPROVED`);
    if (record.preconditionKey !== undefined) assertString(record.preconditionKey, `${code}:ACTION_PRECONDITION`);
  }

  const browser = requireRuntimeRecord(candidate.browser, `${code}:BROWSER`);
  assertExactKeys(browser, ['failed', 'routeClass', 'structuralState', 'operationFamily', 'statusClass', 'contentTypeClass', 'oracleFingerprint', 'runtimeCategory'], `${code}:BROWSER`);
  assertBoolean(browser.failed, `${code}:BROWSER_FAILED`);
  for (const key of ['routeClass', 'structuralState', 'operationFamily', 'statusClass', 'contentTypeClass', 'oracleFingerprint', 'runtimeCategory']) assertString(browser[key], `${code}:BROWSER_${key.toUpperCase()}`);

  if (candidate.api !== null) {
    const api = requireRuntimeRecord(candidate.api, `${code}:API`);
    assertExactKeys(api, ['available', 'failed', 'operationFamily', 'statusClass', 'contentTypeClass', 'parseCategory', 'oracleFingerprint'], `${code}:API`, ['routeClass', 'structuralState']);
    assertBoolean(api.available, `${code}:API_AVAILABLE`);
    assertBoolean(api.failed, `${code}:API_FAILED`);
    for (const key of ['operationFamily', 'statusClass', 'contentTypeClass', 'parseCategory', 'oracleFingerprint']) assertString(api[key], `${code}:API_${key.toUpperCase()}`);
    for (const key of ['routeClass', 'structuralState']) if (api[key] !== undefined) assertString(api[key], `${code}:API_${key.toUpperCase()}`);
  }

  const source = requireRuntimeRecord(candidate.sourceCorrelation, `${code}:SOURCE_CORRELATION`);
  assertExactKeys(source, ['journeyIds', 'changedFiles', 'sourceFreshness'], `${code}:SOURCE_CORRELATION`, ['sourceVersion']);
  const journeyIds = requireRuntimeArray(source.journeyIds, `${code}:SOURCE_JOURNEYS`);
  for (const journeyId of journeyIds) assertString(journeyId, `${code}:SOURCE_JOURNEY`);
  assertEnum(source.sourceFreshness, ['SOURCE_CURRENT_LOCALLY', 'LOCAL_TRACKING_REF_ONLY', 'REMOTE_FRESHNESS_CONFIRMED', 'UNKNOWN'], `${code}:SOURCE_FRESHNESS`);
  if (source.sourceVersion !== undefined) assertString(source.sourceVersion, `${code}:SOURCE_VERSION`);
  const changedFiles = requireRuntimeArray(source.changedFiles, `${code}:CHANGED_FILES`);
  for (const changedFile of changedFiles) {
    const record = requireRuntimeRecord(changedFile, `${code}:CHANGED_FILE`);
    assertExactKeys(record, ['repoId', 'path', 'status'], `${code}:CHANGED_FILE`, ['previousPath', 'additions', 'deletions', 'symbols']);
    for (const key of ['repoId', 'path', 'status']) assertString(record[key], `${code}:CHANGED_FILE_${key.toUpperCase()}`);
    for (const key of ['previousPath']) if (record[key] !== undefined) assertString(record[key], `${code}:CHANGED_FILE_${key.toUpperCase()}`);
    for (const key of ['additions', 'deletions']) if (record[key] !== undefined) assertNonNegativeInteger(record[key], `${code}:CHANGED_FILE_${key.toUpperCase()}`);
    if (record.symbols !== undefined) {
      const symbols = requireRuntimeArray(record.symbols, `${code}:CHANGED_FILE_SYMBOLS`);
      for (const symbol of symbols) assertString(symbol, `${code}:CHANGED_FILE_SYMBOL`);
    }
  }
  for (const key of ['alternativesRuledOut', 'missingEvidence']) {
    const values = requireRuntimeArray(candidate[key], `${code}:${key.toUpperCase()}`);
    for (const item of values) assertString(item, `${code}:${key.toUpperCase()}_ITEM`);
  }
}

type RuntimeWorkRecord = RuntimeRecord & {
  readonly workItemId: string;
  readonly kind: string;
  readonly order: number;
  readonly journeyId: string | null;
  readonly envelopeId: string | null;
  readonly apiOperationId: string | null;
  readonly seed: string | null;
  readonly linkedWorkItemIds: readonly string[];
  readonly replayPolicy: string;
  readonly selection: RuntimeRecord;
};

function validateManifestWorkLineage(manifest: CampaignManifest): void {
  const workItems = manifest.workItems as unknown as readonly RuntimeWorkRecord[];
  const workIds = new Set(workItems.map((item) => item.workItemId as string));
  const selectedJourneys = new Set<string>(manifest.selectedJourneys as readonly string[]);
  const selectedEnvelopes = new Set(manifest.selectedEnvelopes);
  const selectedApis = new Set(manifest.selectedApiScenarios);
  const selectedSeeds = new Set(manifest.seedSet);
  const journeyItems = workItems.filter((item) => item.kind === 'JOURNEY');
  const apiItems = workItems.filter((item) => item.kind === 'API');
  const expectedJourneyOrder: readonly string[] = [...manifest.selectedJourneys];
  const kindRank: Record<string, number> = { JOURNEY: 0, API: 1, EXPLORATION: 2, REPRODUCTION: 3, MINIMIZATION: 4 };
  let previousKey = '';
  for (const [index, item] of workItems.entries()) {
    if (item.order !== index) manifestIntegrity('WORK_ORDER_NOT_CANONICAL');
    const journeyRank = item.journeyId === null ? 999 : expectedJourneyOrder.indexOf(item.journeyId);
    const sortKey = `${String(kindRank[item.kind]).padStart(2, '0')}|${String(journeyRank < 0 ? 998 : journeyRank).padStart(3, '0')}|${item.workItemId}`;
    if (sortKey < previousKey) manifestIntegrity('WORK_ITEM_ORDER_CHANGED');
    previousKey = sortKey;
    for (const linked of item.linkedWorkItemIds) {
      if (!workIds.has(linked) || linked === item.workItemId) manifestIntegrity(`WORK_LINK_INVALID:${item.workItemId}`);
    }
    const expectedSelection = item.selection as RuntimeRecord;
    if (expectedSelection.selected !== true) manifestIntegrity(`WORK_SELECTION_NOT_SELECTED:${item.workItemId}`);
    const expectedEnvelopeLink = item.kind === 'JOURNEY' ? expectedSelection.linkedEnvelopeId : item.envelopeId;
    if (expectedSelection.linkedJourneyId !== item.journeyId || expectedSelection.linkedEnvelopeId !== expectedEnvelopeLink || expectedSelection.linkedApiOperationId !== item.apiOperationId) {
      manifestIntegrity(`WORK_SELECTION_LINEAGE_MISMATCH:${item.workItemId}`);
    }
    if (item.kind === 'JOURNEY') {
      if (item.journeyId === null || !selectedJourneys.has(item.journeyId) || item.envelopeId !== null || item.apiOperationId !== null || item.seed !== null || item.linkedWorkItemIds.length !== 0 || item.replayPolicy !== 'ON_ADMISSION' || item.workItemId !== `journey:${item.journeyId}`) manifestIntegrity(`JOURNEY_LINEAGE_INVALID:${item.workItemId}`);
    } else if (item.kind === 'API') {
      if (item.journeyId === null || !selectedJourneys.has(item.journeyId) || item.apiOperationId === null || !selectedApis.has(item.apiOperationId) || item.envelopeId !== null || item.seed !== null || !arraysExactlyEqual(item.linkedWorkItemIds, [`journey:${item.journeyId}`]) || !['NONE', 'FIRST_PLUS_FRESH_REPLAY'].includes(item.replayPolicy) || item.workItemId !== `api:${item.apiOperationId}`) manifestIntegrity(`API_LINEAGE_INVALID:${item.workItemId}`);
    } else if (item.kind === 'EXPLORATION') {
      const expectedLinks = [`journey:${item.journeyId}`, ...apiItems.filter((api) => api.journeyId === item.journeyId).map((api) => api.workItemId)];
      if (item.journeyId === null || !selectedJourneys.has(item.journeyId) || item.envelopeId === null || !selectedEnvelopes.has(item.envelopeId) || item.apiOperationId !== null || item.seed === null || !selectedSeeds.has(item.seed) || !arraysExactlyEqual(item.linkedWorkItemIds, expectedLinks) || item.replayPolicy !== 'ON_ADMISSION' || item.workItemId !== `explore:${item.envelopeId}:${item.seed}`) manifestIntegrity(`EXPLORATION_LINEAGE_INVALID:${item.workItemId}`);
    } else if (item.kind === 'REPRODUCTION') {
      if (manifest.mode !== 'REPRODUCTION_ONLY' || !manifest.reproductionTarget || item.workItemId !== `reproduction:${manifest.reproductionTarget.clusterId}` || item.linkedWorkItemIds.length !== 0 || item.replayPolicy !== 'ON_ADMISSION') manifestIntegrity(`REPRODUCTION_LINEAGE_INVALID:${item.workItemId}`);
    } else {
      manifestIntegrity(`UNEXPECTED_EXECUTION_KIND:${item.kind}`);
    }
  }
  if (manifest.mode === 'REPRODUCTION_ONLY') {
    if (workItems.length !== 1 || workItems[0]?.kind !== 'REPRODUCTION' || journeyItems.length !== 0 || apiItems.length !== 0) manifestIntegrity('REPRODUCTION_ONLY_COVERAGE_INVALID');
  } else if (journeyItems.length !== manifest.selectedJourneys.length || journeyItems.some((item, index) => item.journeyId !== manifest.selectedJourneys[index])) {
    manifestIntegrity('JOURNEY_SELECTION_WORK_MISMATCH');
  }
  const derivedJourneys = manifest.mode === 'REPRODUCTION_ONLY' ? [] : journeyItems.map((item) => item.journeyId);
  const derivedEnvelopes = workItems.filter((item) => item.kind === 'EXPLORATION').map((item) => item.envelopeId);
  const derivedApis = apiItems.map((item) => item.apiOperationId);
  const derivedSeeds = workItems.filter((item) => item.kind === 'EXPLORATION').map((item) => item.seed);
  if (!arraysExactlyEqual(manifest.selectedJourneys, derivedJourneys) || !arraysExactlyEqual(manifest.selection.selectedJourneys, derivedJourneys)) manifestIntegrity('SELECTED_JOURNEYS_LINEAGE_MISMATCH');
  if (!arraysExactlyEqual(manifest.selectedEnvelopes, derivedEnvelopes) || !arraysExactlyEqual(manifest.selection.selectedEnvelopes, derivedEnvelopes)) manifestIntegrity('SELECTED_ENVELOPES_LINEAGE_MISMATCH');
  if (!arraysExactlyEqual(manifest.selectedApiScenarios, derivedApis) || !arraysExactlyEqual(manifest.selection.selectedApiScenarios, derivedApis)) manifestIntegrity('SELECTED_API_LINEAGE_MISMATCH');
  if (!arraysExactlyEqual(manifest.seedSet, derivedSeeds) || !arraysExactlyEqual(manifest.selection.selectedSeeds, derivedSeeds)) manifestIntegrity('SEED_SET_LINEAGE_MISMATCH');
  const explanationEntries = new Map(manifest.selection.explanations.map((entry) => [entry.workItemKey, entry.explanation]));
  for (const item of workItems) {
    const explanation = explanationEntries.get(item.workItemId);
    if (explanation === undefined || explanation.selected !== true) manifestIntegrity(`MISSING_WORK_EXPLANATION:${item.workItemId}`);
  }
}

/** Canonical key-ordered JSON used for IDs and deterministic ordering. */
export function stableCampaignJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'undefined') return 'null';
  if (Array.isArray(value)) return `[${value.map(stableCampaignJson).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(String(value));
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableCampaignJson(child)}`)
    .join(',')}}`;
}

export function campaignDigest(value: unknown): string {
  return crypto.createHash('sha256').update(stableCampaignJson(value), 'utf8').digest('hex');
}

function persistedCandidate(candidate: CampaignAnomalyCandidate): Omit<CampaignAnomalyCandidate, 'replay'> {
  const { replay: _replay, ...metadata } = candidate;
  return metadata;
}

export function campaignIdFromManifestInput(input: Pick<CampaignInput, 'mode' | 'sourceSnapshots' | 'sourceWindow' | 'phase3Selection' | 'seedCorpusVersion' | 'seedSet' | 'versions' | 'budgetPolicy' | 'privacyPolicy' | 'reproductionTarget'>): string {
  const identity = {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    orchestratorVersion: input.versions.orchestratorVersion,
    mode: input.mode,
    sourceSnapshots: input.sourceSnapshots,
    sourceWindow: input.sourceWindow,
    phase3Selection: input.phase3Selection,
    seedCorpusVersion: input.seedCorpusVersion,
    seedSet: [...input.seedSet].sort(),
    versions: input.versions,
    budgetPolicy: input.budgetPolicy,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget === undefined ? null : {
      clusterId: input.reproductionTarget.clusterId,
      candidate: persistedCandidate(input.reproductionTarget.candidate),
    },
  };
  return `campaign:sha256:${campaignDigest(identity).slice(0, 24)}`;
}

export function manifestFingerprint(input: {
  readonly campaignId: string;
  readonly mode: CampaignMode;
  readonly sourceSnapshots: CampaignInput['sourceSnapshots'];
  readonly sourceWindow: CampaignSourceWindow;
  readonly selection: CampaignSelectionResult;
  readonly seedSet: readonly string[];
  readonly workItems: readonly CampaignWorkItem[];
  readonly budgetPolicy: CampaignInput['budgetPolicy'];
  readonly versions: CampaignInput['versions'];
  readonly privacyPolicy: CampaignPrivacyPolicy;
  readonly reproductionTarget?: CampaignInput['reproductionTarget'];
}): string {
  return `manifest:sha256:${campaignDigest({
    schemaVersion: CAMPAIGN_MANIFEST_VERSION,
    campaignId: input.campaignId,
    mode: input.mode,
    sourceSnapshots: input.sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: input.selection,
    seedSet: [...input.seedSet].sort(),
    workItems: input.workItems,
    budgetPolicy: input.budgetPolicy,
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget === undefined ? null : {
      clusterId: input.reproductionTarget.clusterId,
      candidate: persistedCandidate(input.reproductionTarget.candidate),
    },
  }).slice(0, 24)}`;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  const objectValue = value as object;
  if (seen.has(objectValue)) return value;
  seen.add(objectValue);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function validateManifestIdentity(manifest: CampaignManifest): void {
  if (manifest.schemaVersion !== CAMPAIGN_MANIFEST_VERSION || manifest.campaignSchemaVersion !== CAMPAIGN_SCHEMA_VERSION) {
    throw new Error('CAMPAIGN_MANIFEST_SCHEMA_INVALID');
  }
  if (!/^campaign:sha256:[a-f0-9]{24}$/i.test(manifest.campaignId)) throw new Error('CAMPAIGN_ID_INVALID');
  if (!/^manifest:sha256:[a-f0-9]{24}$/i.test(manifest.manifestFingerprint)) throw new Error('CAMPAIGN_MANIFEST_FINGERPRINT_INVALID');
  if (!ID_RE.test(manifest.versions.nightwatchSourceSha)) throw new Error('CAMPAIGN_NIGHTWATCH_SOURCE_VERSION_INVALID');
  if (!ID_RE.test(manifest.seedCorpusVersion)) throw new Error('CAMPAIGN_SEED_CORPUS_VERSION_INVALID');
  for (const seed of manifest.seedSet) if (!SEED_RE.test(seed)) throw new Error('CAMPAIGN_SEED_INVALID');
  if (manifest.deploymentStatus !== 'DEPLOYMENT_STATUS_UNRESOLVED') throw new Error('CAMPAIGN_DEPLOYMENT_CLAIM_INVALID');
  if (manifest.ownerScopePolicy.status !== 'FROZEN_BY_OWNER' || manifest.ownerScopePolicy.l4 !== 'OUT_OF_SCOPE_BY_OWNER') {
    throw new Error('CAMPAIGN_OWNER_SCOPE_INVALID');
  }
  for (const snapshot of manifest.sourceSnapshots) {
    if (!ID_RE.test(snapshot.repoId) || !SHA_RE.test(snapshot.headSha) || !SHA_RE.test(snapshot.sourceMapSha) || snapshot.readOnly !== true) {
      throw new Error(`CAMPAIGN_SOURCE_SNAPSHOT_INVALID:${snapshot.repoId}`);
    }
  }
  const ids = new Set<string>();
  for (const item of manifest.workItems) {
    if (!ID_RE.test(item.workItemId) || ids.has(item.workItemId)) throw new Error(`CAMPAIGN_WORK_ITEM_INVALID:${item.workItemId}`);
    ids.add(item.workItemId);
    if (item.order < 0 || !Number.isInteger(item.order)) throw new Error(`CAMPAIGN_WORK_ORDER_INVALID:${item.workItemId}`);
  }
  if (manifest.workItems.some((item, index) => item.order !== index)) throw new Error('CAMPAIGN_WORK_ORDER_NOT_CANONICAL');
}

function validateManifestRuntimeShape(value: unknown): asserts value is CampaignManifest {
  const manifest = requireRuntimeRecord(value, 'CAMPAIGN_MANIFEST_INTEGRITY_INVALID');
  try {
    assertExactKeys(manifest, MANIFEST_KEYS, 'CAMPAIGN_MANIFEST_INTEGRITY_INVALID', ['reproductionTarget']);
    assertString(manifest.schemaVersion, 'CAMPAIGN_MANIFEST_SCHEMA_INVALID');
    assertString(manifest.campaignSchemaVersion, 'CAMPAIGN_MANIFEST_SCHEMA_INVALID');
    assertString(manifest.campaignId, 'CAMPAIGN_ID_INVALID');
    assertString(manifest.manifestFingerprint, 'CAMPAIGN_MANIFEST_FINGERPRINT_INVALID');
    assertEnum(manifest.mode, CAMPAIGN_MODES, 'CAMPAIGN_MODE_INVALID');
    assertIsoTimestamp(manifest.createdAt, 'CAMPAIGN_CREATED_AT_INVALID');
    validateSourceShape(manifest.sourceSnapshots);
    const sourceWindow = requireRuntimeRecord(manifest.sourceWindow, 'MANIFEST_SOURCE_WINDOW');
    assertExactKeys(sourceWindow, ['changesetId', 'baselines', 'changedFiles', 'dirtyFiles', 'sourceWindow', 'deploymentStatus'], 'MANIFEST_SOURCE_WINDOW');
    assertId(sourceWindow.changesetId, 'MANIFEST_CHANGESET_ID');
    for (const key of ['baselines', 'changedFiles', 'dirtyFiles']) requireRuntimeArray(sourceWindow[key], `MANIFEST_SOURCE_WINDOW:${key}`);
    assertString(sourceWindow.sourceWindow, 'MANIFEST_SOURCE_WINDOW_KIND');
    if (sourceWindow.deploymentStatus !== 'DEPLOYMENT_STATUS_UNRESOLVED') manifestIntegrity('SOURCE_WINDOW_DEPLOYMENT_CLAIM_INVALID');
    validateSelectionShape(manifest.selection);
    assertStringArray(manifest.selectedJourneys, 'MANIFEST_SELECTED_JOURNEYS');
    assertStringArray(manifest.selectedEnvelopes, 'MANIFEST_SELECTED_ENVELOPES');
    assertStringArray(manifest.selectedApiScenarios, 'MANIFEST_SELECTED_API_SCENARIOS');
    assertStringArray(manifest.seedSet, 'MANIFEST_SEED_SET');
    assertString(manifest.seedCorpusVersion, 'MANIFEST_SEED_CORPUS_VERSION');
    for (const seed of manifest.seedSet) if (!SEED_RE.test(seed)) manifestIntegrity(`SEED_INVALID:${seed}`);
    const workItems = requireRuntimeArray(manifest.workItems, 'MANIFEST_WORK_ITEMS');
    const ids = new Set<string>();
    for (const item of workItems) {
      const record = validateWorkItemShape(item, 'MANIFEST_WORK_ITEM');
      if (ids.has(record.workItemId as string)) manifestIntegrity(`DUPLICATE_WORK_ITEM:${record.workItemId}`);
      ids.add(record.workItemId as string);
    }
    validateBudgetShape(manifest.budgetPolicy);
    assertNonNegativeInteger(manifest.runtimeCeilingMs, 'MANIFEST_RUNTIME_CEILING');
    assertNonNegativeInteger(manifest.perTestTimeoutMs, 'MANIFEST_TEST_TIMEOUT');
    const replayBudget = requireRuntimeRecord(manifest.replayBudget, 'MANIFEST_REPLAY_BUDGET');
    assertExactKeys(replayBudget, ['maxReplays', 'maxPromotedClusters'], 'MANIFEST_REPLAY_BUDGET');
    assertNonNegativeInteger(replayBudget.maxReplays, 'MANIFEST_REPLAY_BUDGET_REPLAYS');
    assertNonNegativeInteger(replayBudget.maxPromotedClusters, 'MANIFEST_REPLAY_BUDGET_CLUSTERS');
    const minimizationBudget = requireRuntimeRecord(manifest.minimizationBudget, 'MANIFEST_MINIMIZATION_BUDGET');
    assertExactKeys(minimizationBudget, ['maxCandidateEvaluations', 'maxTotalReplays'], 'MANIFEST_MINIMIZATION_BUDGET');
    assertNonNegativeInteger(minimizationBudget.maxCandidateEvaluations, 'MANIFEST_MINIMIZATION_BUDGET_CANDIDATES');
    assertNonNegativeInteger(minimizationBudget.maxTotalReplays, 'MANIFEST_MINIMIZATION_BUDGET_REPLAYS');
    validateVersionShape(manifest.versions);
    validatePrivacyShape(manifest.privacyPolicy);
    const owner = requireRuntimeRecord(manifest.ownerScopePolicy, 'MANIFEST_OWNER_SCOPE');
    assertExactKeys(owner, ['status', 'reason', 'l4'], 'MANIFEST_OWNER_SCOPE');
    if (owner.status !== 'FROZEN_BY_OWNER' || owner.reason !== 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE' || owner.l4 !== 'OUT_OF_SCOPE_BY_OWNER') manifestIntegrity('OWNER_SCOPE_WEAKENED');
    if (manifest.deploymentStatus !== 'DEPLOYMENT_STATUS_UNRESOLVED') manifestIntegrity('DEPLOYMENT_CLAIM_INVALID');
    if (manifest.runtimeCeilingMs !== (manifest.budgetPolicy as RuntimeRecord).maxRuntimeMs || manifest.perTestTimeoutMs !== (manifest.budgetPolicy as RuntimeRecord).maxPerTestTimeoutMs) manifestIntegrity('TIME_BUDGET_DERIVATION_MISMATCH');
    if (replayBudget.maxReplays !== (manifest.budgetPolicy as RuntimeRecord).maxReplays || replayBudget.maxPromotedClusters !== (manifest.budgetPolicy as RuntimeRecord).maxPromotedClusters) manifestIntegrity('REPLAY_BUDGET_DERIVATION_MISMATCH');
    const expectedCandidates = Math.min((manifest.budgetPolicy as RuntimeRecord).maxMinimizationCandidates as number, Math.max(0, (manifest.budgetPolicy as RuntimeRecord).maxReplays as number - 1));
    const expectedReplays = Math.min((manifest.budgetPolicy as RuntimeRecord).maxReplays as number, (manifest.budgetPolicy as RuntimeRecord).maxMinimizationCandidates as number + 1);
    if (minimizationBudget.maxCandidateEvaluations !== expectedCandidates || minimizationBudget.maxTotalReplays !== expectedReplays) manifestIntegrity('MINIMIZATION_BUDGET_DERIVATION_MISMATCH');
    if (manifest.reproductionTarget !== undefined) {
      const target = requireRuntimeRecord(manifest.reproductionTarget, 'MANIFEST_REPRODUCTION_TARGET');
      assertExactKeys(target, ['clusterId', 'candidate'], 'MANIFEST_REPRODUCTION_TARGET');
      assertId(target.clusterId, 'MANIFEST_REPRODUCTION_CLUSTER');
      const candidate = requireRuntimeRecord(target.candidate, 'MANIFEST_REPRODUCTION_CANDIDATE');
      if ('replay' in candidate) manifestIntegrity('REPRODUCTION_TARGET_CONTAINS_EXECUTABLE');
      assertPersistedCandidateShape(candidate, 'MANIFEST_REPRODUCTION_CANDIDATE');
    }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('CAMPAIGN_MANIFEST_INTEGRITY_INVALID:') || error.message.startsWith('CAMPAIGN_MANIFEST_SCHEMA_INVALID:') || error.message.startsWith('CAMPAIGN_ID_INVALID:') || error.message.startsWith('CAMPAIGN_MANIFEST_FINGERPRINT_INVALID:'))) throw error;
    manifestIntegrity(error instanceof Error ? error.message : 'SHAPE_INVALID');
  }
}

/** Build and deep-freeze the execution manifest before any executor runs. */
export function createCampaignManifest(input: CampaignInput): CampaignManifest {
  validateCampaignInputs(input);
  const selection = buildCampaignSelection(input);
  const sourceSnapshots = [...input.sourceSnapshots].sort((a, b) => a.repoId.localeCompare(b.repoId));
  // Identity is based on the work that can actually run. Unselected seed
  // entries are not allowed to make a J1-only campaign incompatible with its
  // own persisted manifest.
  const campaignId = campaignIdFromManifestInput({ ...input, sourceSnapshots, seedSet: selection.result.selectedSeeds });
  const workItems = selection.workItems;
  const feasibility = analyzeCampaignBudgetFeasibility({
    mode: input.mode,
    policy: input.budgetPolicy,
    workItems,
    applicable: input.mode !== 'LOCAL_SYNTHETIC' && isRealScaleBudget(input.budgetPolicy),
  });
  if (!feasibility.feasible) throw new Error(`CAMPAIGN_BUDGET_FEASIBILITY_INVALID:${feasibility.reasons.join(',')}`);
  const fingerprint = manifestFingerprint({
    campaignId,
    mode: input.mode,
    sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: selection.result,
    seedSet: selection.result.selectedSeeds,
    workItems,
    budgetPolicy: input.budgetPolicy,
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget,
  });
  const manifest: CampaignManifest = {
    schemaVersion: CAMPAIGN_MANIFEST_VERSION,
    campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
    campaignId,
    manifestFingerprint: fingerprint,
    mode: input.mode,
    createdAt: input.createdAt,
    sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: selection.result,
    selectedJourneys: selection.result.selectedJourneys,
    selectedEnvelopes: selection.result.selectedEnvelopes,
    selectedApiScenarios: selection.result.selectedApiScenarios,
    seedSet: [...selection.result.selectedSeeds],
    seedCorpusVersion: input.seedCorpusVersion,
    workItems,
    budgetPolicy: input.budgetPolicy,
    runtimeCeilingMs: input.budgetPolicy.maxRuntimeMs,
    perTestTimeoutMs: input.budgetPolicy.maxPerTestTimeoutMs,
    replayBudget: {
      maxReplays: input.budgetPolicy.maxReplays,
      maxPromotedClusters: input.budgetPolicy.maxPromotedClusters,
    },
    minimizationBudget: {
      maxCandidateEvaluations: Math.min(input.budgetPolicy.maxMinimizationCandidates, Math.max(0, input.budgetPolicy.maxReplays - 1)),
      maxTotalReplays: Math.min(input.budgetPolicy.maxReplays, input.budgetPolicy.maxMinimizationCandidates + 1),
    },
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    ...(input.reproductionTarget === undefined ? {} : {
      reproductionTarget: {
        clusterId: input.reproductionTarget.clusterId,
        candidate: persistedCandidate(input.reproductionTarget.candidate),
      },
    }),
    ownerScopePolicy: {
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      l4: 'OUT_OF_SCOPE_BY_OWNER',
    },
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  validateCampaignManifest(manifest);
  return deepFreeze(manifest);
}

export function assertManifestCompatible(manifest: CampaignManifest, checkpoint: { readonly manifestFingerprint: string; readonly campaignId: string }): void {
  if (manifest.campaignId !== checkpoint.campaignId || manifest.manifestFingerprint !== checkpoint.manifestFingerprint) {
    throw new Error('CAMPAIGN_VERSION_DRIFT');
  }
}

export function validateCampaignManifest(manifest: CampaignManifest | unknown): void {
  validateManifestRuntimeShape(manifest);
  validateManifestIdentity(manifest);
  const expectedId = campaignIdFromManifestInput({
    mode: manifest.mode,
    sourceSnapshots: manifest.sourceSnapshots,
    sourceWindow: manifest.sourceWindow,
    phase3Selection: manifest.selection.phase3,
    seedCorpusVersion: manifest.seedCorpusVersion,
    seedSet: manifest.seedSet,
    versions: manifest.versions,
    budgetPolicy: manifest.budgetPolicy,
    privacyPolicy: manifest.privacyPolicy,
    reproductionTarget: manifest.reproductionTarget === undefined ? undefined : {
      clusterId: manifest.reproductionTarget.clusterId,
      candidate: manifest.reproductionTarget.candidate,
    },
  });
  if (expectedId !== manifest.campaignId) throw new Error('CAMPAIGN_ID_RECOMPUTATION_MISMATCH');
  const expectedFingerprint = manifestFingerprint({
    campaignId: manifest.campaignId,
    mode: manifest.mode,
    sourceSnapshots: manifest.sourceSnapshots,
    sourceWindow: manifest.sourceWindow,
    selection: manifest.selection,
    seedSet: manifest.seedSet,
    workItems: manifest.workItems,
    budgetPolicy: manifest.budgetPolicy,
    versions: manifest.versions,
    privacyPolicy: manifest.privacyPolicy,
    reproductionTarget: manifest.reproductionTarget === undefined ? undefined : {
      clusterId: manifest.reproductionTarget.clusterId,
      candidate: manifest.reproductionTarget.candidate,
    },
  });
  if (expectedFingerprint !== manifest.manifestFingerprint) throw new Error('CAMPAIGN_MANIFEST_INTEGRITY_INVALID:MANIFEST_FINGERPRINT_MISMATCH');
  if (!arraysExactlyEqual(manifest.selectedJourneys, manifest.selection.selectedJourneys)
    || !arraysExactlyEqual(manifest.selectedEnvelopes, manifest.selection.selectedEnvelopes)
    || !arraysExactlyEqual(manifest.selectedApiScenarios, manifest.selection.selectedApiScenarios)
    || !arraysExactlyEqual(manifest.seedSet, manifest.selection.selectedSeeds)) {
    throw new Error('CAMPAIGN_MANIFEST_INTEGRITY_INVALID:SELECTION_CROSS_FIELD_MISMATCH');
  }
  validateManifestWorkLineage(manifest);
  if (manifest.mode !== 'LOCAL_SYNTHETIC' && manifest.budgetPolicy.maxRuntimeMs > INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs) {
    throw new Error('CAMPAIGN_BUDGET_PROFILE_NOT_AUTHORIZED');
  }
  const feasibility = analyzeCampaignBudgetFeasibility({
    mode: manifest.mode,
    policy: manifest.budgetPolicy,
    workItems: manifest.workItems,
    applicable: manifest.mode !== 'LOCAL_SYNTHETIC' && isRealScaleBudget(manifest.budgetPolicy),
  });
  if (!feasibility.feasible) throw new Error(`CAMPAIGN_BUDGET_FEASIBILITY_INVALID:${feasibility.reasons.join(',')}`);
}
