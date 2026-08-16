// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — campaign integration proof (SPEC Phase 10A §37,
// §38, §68).
//
// Feeds the four seeded DEEP defects through the REAL campaign orchestrator
// -> admission -> reproduction -> minimization -> triage -> dossier chain
// with the ENRICHED v2 expectations: source-derived deep expectation ->
// deeper synthetic defect -> safe semantic violation -> existing finding ->
// campaign admission -> existing triage -> dossier with semanticEvidence.
// The paired BASELINE run (shape-only v1 expectations) admits the same deep
// faults with NO semantic evidence — the shape-only contract cannot detect
// the deeper defect class.
//
// No test-only dossier injection; no campaign/triage core change.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createCampaignManifest,
  runCampaign,
  type CampaignAnomalyCandidate,
  type CampaignExecutionOutcome,
  type CampaignExecutor,
  type CampaignInput,
  type CampaignWorkItem,
  type CampaignSourceSnapshot,
} from '../../src/core/campaign';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION, type SafetyVector } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { ANOMALY_CLUSTER_VERSION, DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION, type MinimizationAction, type SourceFreshness } from '../../src/core/triage/types';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import { CAMPAIGN_ORCHESTRATOR_VERSION, CAMPAIGN_SCHEMA_VERSION, type CampaignVersionFingerprint } from '../../src/core/campaign';
import type { SemanticExpectation } from '../../src/oracles/expectations';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';
import { derivePhase10FixtureExpectations, deriveArchivedBaselineExpectations } from '../../corpus/phase10/source-fixture/phase10Fixtures';

const STATIC_NOW = '2026-08-16T01:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201'] as const;
const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase10');

const SAFE_TRIAGE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase10-source.v1',
  selectorVersion: SELECTOR_VERSION,
  dependencyMapVersion: DEPENDENCY_MAP_VERSION,
  journeyContractVersion: JOURNEY_CONTRACT_VERSION,
  journeyOracleVersion: ORACLE_VERSION,
  explorationCatalogVersion: SAFE_ACTION_CATALOG_VERSION,
  explorationModelVersion: EXPLORATION_MODEL_VERSION,
  explorationPlannerVersion: PLANNER_VERSION,
  apiCatalogVersion: API_CATALOG_VERSION,
  apiGeneratorVersion: SCENARIO_GENERATOR_VERSION,
  apiOracleVersion: 'nightwatch.api-oracle.phase5.v1',
  triageClusterVersion: ANOMALY_CLUSTER_VERSION,
  triageMinimizerVersion: FAILURE_MINIMIZATION_VERSION,
  dossierVersion: DOSSIER_VERSION,
  ownerScopePolicyVersion: OWNER_SCOPE_POLICY_VERSION,
  privateArtifactPolicyVersion: PRIVATE_ARTIFACT_POLICY_VERSION,
  seedCorpusVersion: 'nightwatch.phase10.synthetic-seeds.v1',
  budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
};

function snapshots(): readonly CampaignSourceSnapshot[] {
  return RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    branch: repo.branch,
    headSha: repo.checkedOutSha,
    trackingRef: repo.trackingRef,
    trackingSha: repo.trackingSha,
    ahead: repo.ahead,
    behind: repo.behind,
    dirty: false,
    dirtyFileCount: 0,
    sourceMapSha: repo.sourceMapSha,
    freshness: 'LOCAL_TRACKING_REF_ONLY' as SourceFreshness,
    readOnly: true as const,
  }));
}

function inputFor(mode: CampaignInput['mode']): CampaignInput {
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase10',
      baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
      changedFiles: [],
      dirtyFiles: [],
      sourceWindow: 'COMMITTED_ONLY' as const,
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
    },
    changeset: null,
    phase3Selection: null,
    seedCorpusVersion: VERSIONS.seedCorpusVersion,
    seedSet: SEEDS,
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: {
      policyVersion: 'nightwatch.campaign-budget.private.v1',
      maxTotalBrowserContexts: 6,
      maxJourneyContexts: 3,
      maxExplorationContexts: 3,
      maxApiExecutions: 12,
      maxReplays: 70,
      maxMinimizationCandidates: 64,
      maxTotalActions: 100,
      maxRuntimeMs: 60_000,
      maxPerTestTimeoutMs: 5_000,
      maxPromotedClusters: 3,
      maxPrivateEvidenceBytes: 20 * 1024 * 1024,
    },
    privacyPolicy: {
      storageClass: 'OWNER_ONLY_LOCAL',
      remotePrivacy: 'NO_REMOTE',
      externalPublication: 'PROHIBITED',
      rawBodiesPersisted: false,
      customerValuesPersisted: false,
      credentialsPersisted: false,
      cookiesPersisted: false,
      tokensPersisted: false,
      domPersisted: false,
      screenshotsPersisted: false,
      authenticatedTracesPersisted: false,
    },
  };
}

function readBody(...segments: string[]): unknown {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_ROOT, ...segments), 'utf8'));
}

interface SeededDefect {
  readonly name: string;
  readonly operationId: string;
  readonly journeyId: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read';
  readonly rawValues: readonly unknown[];
  readonly enrichedExpectation: SemanticExpectation;
  readonly baselineExpectation: SemanticExpectation;
}

const DEEP = new Map(derivePhase10FixtureExpectations().derived.map((item) => [item.expectation.targetId, item.expectation]));
const BASELINE = new Map(deriveArchivedBaselineExpectations().derived.map((item) => [item.expectation.targetId, item.expectation]));

function buildDefects(): SeededDefect[] {
  const rows: SeededDefect[] = [];
  const plan: { target: string; journey: SeededDefect['journeyId']; defects: [string, string][] }[] = [
    { target: 'fixture-10.common-exchange.read', journey: 'ripple-common-exchange-read', defects: [['common-exchange-type-string', 'type-string'], ['common-exchange-type-empty-array', 'type-empty-array']] },
    { target: 'fixture-10.payer-exchange.read', journey: 'ripple-payer-exchange-read', defects: [['payer-exchange-type-number', 'type-number'], ['payer-exchange-type-string', 'type-string']] },
  ];
  for (const row of plan) {
    for (const [dirName, _] of row.defects) {
      rows.push({
        name: dirName,
        operationId: row.target,
        journeyId: row.journey,
        rawValues: [readBody('defects', dirName, 'response.json')],
        enrichedExpectation: DEEP.get(row.target)!,
        baselineExpectation: BASELINE.get(row.target.replace('fixture-10', 'ripple'))!,
      });
    }
  }
  return rows;
}

const DEFECTS = buildDefects();

function semanticFindingsFor(defect: SeededDefect, enriched: boolean) {
  const expectation = enriched ? defect.enrichedExpectation : defect.baselineExpectation;
  const evaluation = evaluateSemanticResponse({
    oracleId: expectation.expectationId,
    expectation,
    rawValues: defect.rawValues,
    sourceSnapshot: { repoId: expectation.sourceProvenance.repoId, sha: expectation.sourceProvenance.sha },
    journeyId: defect.journeyId,
    operationId: defect.operationId,
  });
  return { evaluation, expectation };
}

function action(actionId: string, routeClass: string): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase10.synthetic-action.v1',
  };
}

function candidate(defect: SeededDefect, enriched: boolean): CampaignAnomalyCandidate {
  const { evaluation, expectation } = semanticFindingsFor(defect, enriched);
  const findings = evaluation.outcome === 'ANOMALY' ? evaluation.findings : [];
  const fingerprint = findings.length > 0
    ? semanticFindingFingerprint(findings[0]!)
    : `fp:sha256:${require('node:crypto').createHash('sha256').update(`protocol-only:${defect.name}`).digest('hex').slice(0, 24)}`;
  const routeClass = defect.journeyId === 'ripple-payer-exchange-read' ? '/payer-exchange-rate-v2' : '/global-exchange-rate-v2';
  const sequence = [action(`phase10.${defect.name}.read`, routeClass)];
  const replay = (sequenceToReplay: readonly MinimizationAction[]) => ({
    status: sequenceToReplay.length > 0 ? 'FAILURE' as const : 'PASS' as const,
    anomalyFingerprint: fingerprint,
    safety: SAFE_TRIAGE,
  });
  return {
    observation: {
      runId: `run-phase10-${defect.name}`,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId: defect.journeyId,
        envelopeId: defect.journeyId === 'ripple-common-exchange-read' ? 'E2-J2-common-exchange' : 'E1-J1-payer-exchange',
        oracleId: findings.length > 0 ? `semantic-${expectation.expectationId}` : 'oracle.phase10.protocol-only',
        routeClass,
        operationFamily: defect.operationId,
        statusClass: '2xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: findings.length > 0 ? 'semantic-anomaly' : 'protocol-valid',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase10',
        browserApiResultClass: 'browser-only',
      },
      timingClass: 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId: defect.journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase10-synthetic',
    contextKind: 'FIRST_OBSERVATION',
    originalSequence: sequence,
    technicalSeverity: 'MEDIUM',
    breadth: 'NARROW',
    browser: {
      failed: true,
      routeClass,
      structuralState: 'semantic-anomaly',
      operationFamily: defect.operationId,
      statusClass: '2xx',
      contentTypeClass: 'json',
      oracleFingerprint: fingerprint,
      runtimeCategory: 'product',
    },
    api: null,
    sourceCorrelation: {
      journeyIds: [defect.journeyId],
      changedFiles: [],
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: 'synthetic.phase10.source.v1',
    },
    sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: false,
    semanticFindings: findings,
    replay,
  };
}

function defaultOutcome(overrides: Partial<CampaignExecutionOutcome> = {}): CampaignExecutionOutcome {
  return {
    result: 'PASS',
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
    privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
    actionsExecuted: 0,
    apiExecutions: 0,
    browserContextCreated: false,
    replay: false,
    observations: [],
    ...overrides,
  };
}

function semanticExecutor(script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>): CampaignExecutor {
  return {
    preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
      const observations = [...(script.get(workItem.workItemId) ?? [])];
      return defaultOutcome({
        result: observations.length > 0 ? 'ANOMALY' : 'PASS',
        actionsExecuted: observations.length > 0 ? observations[0]!.originalSequence.length : 1,
        apiExecutions: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : workItem.kind === 'API' ? 1 : 0,
        browserContextCreated: workItem.kind !== 'API',
        replay: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY',
        observations,
      });
    },
    reproduce: async ({ representative }: { readonly representative: CampaignAnomalyCandidate }) => {
      return {
        result: 'REPRODUCED' as const,
        runId: `${representative.observation.runId}-fresh`,
        fingerprint: representative.observation.fingerprint,
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
        privacy: { result: 'PASS' as const, rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
        candidate: { ...representative, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
      };
    },
  };
}

function buildScript(enriched: boolean, defects: readonly SeededDefect[]): Map<string, readonly CampaignAnomalyCandidate[]> {
  const script = new Map<string, readonly CampaignAnomalyCandidate[]>();
  for (const defect of defects) {
    const key = `journey:${defect.journeyId}`;
    const existing = [...(script.get(key) ?? [])];
    existing.push(candidate(defect, enriched));
    script.set(key, existing);
  }
  return script;
}

/** One defect per target per run: the finding fingerprint is derived from
 *  categorical metadata only (expectationId + classes + category), so two
 *  defects of the SAME invariant class on the SAME target legitimately share
 *  a fingerprint — the checkpoint rejects duplicate fingerprints, hence the
 *  split (same pattern as the Phase 9 two-run campaign). */
const RUN_1 = DEFECTS.filter((defect) => ['common-exchange-type-string', 'payer-exchange-type-number'].includes(defect.name));
const RUN_2 = DEFECTS.filter((defect) => ['common-exchange-type-empty-array', 'payer-exchange-type-string'].includes(defect.name));

async function runPair(enriched: boolean, store: PrivateArtifactStore) {
  const results = [];
  for (const defects of [RUN_1, RUN_2]) {
    const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
    const result = await runCampaign(manifest, semanticExecutor(buildScript(enriched, defects)), { store, now: () => new Date(STATIC_NOW) });
    expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
    results.push(result);
  }
  return results;
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase10-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

test.describe('Phase 10A — enriched campaign integration (§37, §68)', () => {
  test('the four deep defects are admitted with TYPE_CONTRADICTED semantic evidence in dossiers', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(true, store);
      const evidence = results.flatMap((result) => result.dossiers.flatMap((dossier) => (dossier.semanticEvidence !== null ? [dossier.semanticEvidence] : [])));
      const observedClasses = new Set(evidence.flatMap((e) => e.findings.map((finding) => finding.observedClass)));
      const expectationIds = new Set(evidence.flatMap((e) => e.findings.map((finding) => finding.expectationId)));
      expect(evidence.length).toBeGreaterThanOrEqual(1);
      expect(observedClasses.has('TYPE_CONTRADICTED')).toBe(true);
      // All four deep defect identities participate (across the promoted
      // clusters and their dossiers).
      for (const defect of DEFECTS) {
        expect(expectationIds.has(defect.enrichedExpectation.expectationId)).toBe(true);
      }
      for (const result of results) expect(result.checkpoint.privacyStatus).toBe('PASS');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('paired baseline: the shape-only v1 contract admits the SAME deep faults with NO semantic evidence', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(false, store);
      let semanticDossiers = 0;
      for (const result of results) for (const dossier of result.dossiers) {
        if (dossier.semanticEvidence !== null) semanticDossiers += 1;
        expect(dossier.semanticEvidence).toBeNull();
      }
      // The observations are admitted as protocol-level anomalies (the
      // orchestrator pipeline is unchanged), but NONE carries the deeper
      // semantic fault — the shape-only contract cannot detect it.
      expect(semanticDossiers).toBe(0);
      const checkpointText = JSON.stringify(results.map((result) => result.checkpoint));
      expect(checkpointText.includes('TYPE_CONTRADICTED')).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('sentinel sweep: checkpoints, dossiers, briefs and artifacts carry zero sentinels', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(true, store);
      const markers = ['SENTINEL_MONTH_77AA', 'SENTINEL_RATE_STRING_77AA', 'SENTINEL_PAYER_ID_77CC', 'SENTINEL_PAYER_NAME_77CC', 'SENTINEL_MONTH_77BB', 'SENTINEL_PAYER_ID_77DD'];
      const sweep = (value: unknown, what: string) => {
        const text = JSON.stringify(value);
        for (const marker of markers) expect(text.includes(marker), `${what} must not contain ${marker}`).toBe(false);
      };
      for (const result of results) {
        sweep(result.checkpoint, 'campaign checkpoint');
        sweep(result.morningBrief, 'morning brief');
        sweep(result.dossiers, 'dossiers');
      }
      for (const dossier of results.flatMap((result) => result.dossiers)) {
        if (dossier.semanticEvidence !== null) {
          const evidenceText = JSON.stringify(dossier.semanticEvidence);
          expect(evidenceText).not.toContain('/home/dalepalaca');
          expect(evidenceText).not.toContain('/tmp/');
        }
      }
      for (const file of fs.readdirSync(root)) {
        const content = fs.readFileSync(path.join(root, file), 'utf8');
        for (const marker of markers) expect(content.includes(marker), `${file} must not contain ${marker}`).toBe(false);
      }
      // Non-vacuous: the raw defect bodies really carry sentinels.
      const raw = fs.readFileSync(path.join(CORPUS_ROOT, 'defects', 'common-exchange-type-string', 'response.json'), 'utf8');
      expect(raw).toContain('SENTINEL_MONTH_77AA');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
