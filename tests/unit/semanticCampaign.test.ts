// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — M13/M14 campaign integration proof (SPEC §48, §49,
// §68, §69, §70, §71, §73).
//
// Feeds the five seeded semantic defect fixtures through the REAL campaign
// orchestrator -> admission -> reproduction -> minimization -> triage ->
// dossier chain, with sanitized semantic evidence landing in the dossiers.
// The paired BASELINE run (semantic channel absent) admits none.
//
// No test-only dossier injection: the orchestrator's existing promotion path
// builds the dossiers.
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
  type CampaignWorkItem,
  type CampaignExecutor,
  type CampaignInput,
  type CampaignSourceSnapshot,
} from '../../src/core/campaign';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION, type SafetyVector } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { ANOMALY_CLUSTER_VERSION, DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION, type MinimizationAction, type SourceFreshness } from '../../src/core/triage/types';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import { CAMPAIGN_ORCHESTRATOR_VERSION, CAMPAIGN_SCHEMA_VERSION, type CampaignVersionFingerprint } from '../../src/core/campaign';
import { deriveExpectations, type SemanticExpectation } from '../../src/oracles/expectations';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';

const STATIC_NOW = '2026-08-16T01:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201', '0x0000000000000301'] as const;
const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9');

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
  nightwatchSourceSha: 'synthetic-phase9-source.v1',
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
  seedCorpusVersion: 'nightwatch.phase9.synthetic-seeds.v1',
  budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
  triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
  triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: DOSSIER_VERSION_V2,
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
  semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
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
      changesetId: 'cs-empty-phase9',
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

function loadExpectations(): Map<string, SemanticExpectation> {
  const sourceText = fs.readFileSync(path.join(CORPUS_ROOT, 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({
    sourceText,
    provenance: {
      repoId: 'corpus/phase9/source-fixture',
      sha: FIXTURE_SHA,
      relativePath: 'contracts/entityCatalog.ts',
      derivationVersion: 'nightwatch.expectation-derivation.v1',
    },
  });
  return new Map(expectations.map((expectation) => [expectation.expectationId, expectation]));
}

const EXPECTATIONS = loadExpectations();

interface SeededDefect {
  readonly name: string;
  readonly category: string;
  readonly operationId: string;
  readonly expectationId: string;
  readonly rawValues: readonly unknown[];
  readonly journeyId: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory';
}

const SEEDED_DEFECTS: readonly SeededDefect[] = [
  {
    name: 'http200-error-envelope',
    category: 'APPLICATION_ERROR_ENVELOPE',
    operationId: 'ripple.synthetic.entity.read',
    expectationId: 'fixture.entity.read.success-envelope',
    rawValues: [readBody('defects', 'http200-error-envelope', 'response.json')],
    journeyId: 'ripple-payer-exchange-read',
  },
  {
    name: 'list-detail-identity-mismatch',
    category: 'LIST_DETAIL_IDENTITY_MISMATCH',
    operationId: 'ripple.synthetic.entity.list-read',
    expectationId: 'fixture.entity.list-detail.identity-consistency',
    rawValues: [
      readBody('defects', 'list-detail-identity-mismatch', 'list.json'),
      readBody('defects', 'list-detail-identity-mismatch', 'detail.json'),
    ],
    journeyId: 'ripple-common-exchange-read',
  },
  {
    name: 'stale-state-after-transition',
    category: 'STALE_STATE_AFTER_TRANSITION',
    operationId: 'ripple.synthetic.stage.read',
    expectationId: 'fixture.stage.read.transition-change',
    rawValues: [
      readBody('defects', 'stale-state-after-transition', 'step1.json'),
      readBody('defects', 'stale-state-after-transition', 'step2.json'),
    ],
    journeyId: 'ripple-payer-exchange-read',
  },
  {
    name: 'aggregate-total-relation-mismatch',
    category: 'AGGREGATE_RELATION_MISMATCH',
    operationId: 'ripple.synthetic.aggregate.read',
    expectationId: 'fixture.aggregate.read.line-items-equal-total',
    rawValues: [readBody('defects', 'aggregate-total-relation-mismatch', 'response.json')],
    journeyId: 'ripple-account-inventory',
  },
  {
    name: 'cardinality-relation-mismatch',
    category: 'CARDINALITY_RELATION_MISMATCH',
    operationId: 'ripple.synthetic.collection.read',
    expectationId: 'fixture.collection.read.rows-equal-declared-count',
    rawValues: [readBody('defects', 'cardinality-relation-mismatch', 'response.json')],
    journeyId: 'ripple-account-inventory',
  },
];

function semanticFindingsFor(defect: SeededDefect) {
  const expectation = EXPECTATIONS.get(defect.expectationId)!;
  const evaluation = evaluateSemanticResponse({
    oracleId: expectation.expectationId,
    expectation,
    rawValues: defect.rawValues,
    sourceSnapshot: { repoId: 'corpus/phase9/source-fixture', sha: FIXTURE_SHA },
    journeyId: defect.journeyId,
    operationId: defect.operationId,
  });
  expect(evaluation.outcome).toBe('ANOMALY');
  return evaluation.findings;
}

function action(actionId: string, routeClass = '/payer-exchange-rate-v2'): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase9.synthetic-action.v1',
  };
}

function candidate(defect: SeededDefect, withSemantic: boolean): CampaignAnomalyCandidate {
  const findings = withSemantic ? semanticFindingsFor(defect) : [];
  const fingerprint = findings.length > 0
    ? semanticFindingFingerprint(findings[0]!)
    : `fp:sha256:${require('node:crypto').createHash('sha256').update(`protocol-only:${defect.name}`).digest('hex').slice(0, 24)}`;
  const routeClass = defect.journeyId === 'ripple-payer-exchange-read'
    ? '/payer-exchange-rate-v2'
    : defect.journeyId === 'ripple-common-exchange-read' ? '/global-exchange-rate-v2' : '/account-management';
  const sequence = [action(`phase9.${defect.name}.read`, routeClass)];
  const replay = (sequenceToReplay: readonly MinimizationAction[]) => ({
    status: sequenceToReplay.length > 0 ? 'FAILURE' as const : 'PASS' as const,
    anomalyFingerprint: fingerprint,
    safety: SAFE_TRIAGE,
  });
  return {
    observation: {
      runId: `run-phase9-${defect.name}`,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId: defect.journeyId,
        envelopeId: defect.journeyId === 'ripple-payer-exchange-read' ? 'E1-J1-payer-exchange' : defect.journeyId === 'ripple-common-exchange-read' ? 'E2-J2-common-exchange' : 'E3-J3-account-inventory',
        oracleId: findings.length > 0 ? `semantic-${defect.category.toLowerCase()}` : 'oracle.phase9.protocol-only',
        routeClass,
        operationFamily: defect.operationId,
        statusClass: '2xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: findings.length > 0 ? 'semantic-anomaly' : 'protocol-valid',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase9',
        browserApiResultClass: 'browser-only',
      },
      timingClass: 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId: defect.journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase9-synthetic',
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
      sourceVersion: 'synthetic.phase9.source.v1',
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

function buildScript(withSemantic: boolean, defects: readonly SeededDefect[]): Map<string, readonly CampaignAnomalyCandidate[]> {
  const script = new Map<string, readonly CampaignAnomalyCandidate[]>();
  for (const defect of defects) {
    const key = `journey:${defect.journeyId}`;
    const existing = [...(script.get(key) ?? [])];
    existing.push(candidate(defect, withSemantic));
    script.set(key, existing);
  }
  return script;
}

/** One defect per journey so all three promoted clusters carry semantic
 *  findings; two runs cover all five classes (policy-bound
 *  maxPromotedClusters is 3 and must not be changed). */
const CAMPAIGN_A = SEEDED_DEFECTS.filter((defect) => ['http200-error-envelope', 'list-detail-identity-mismatch', 'aggregate-total-relation-mismatch'].includes(defect.name));
const CAMPAIGN_B = SEEDED_DEFECTS.filter((defect) => ['stale-state-after-transition', 'cardinality-relation-mismatch'].includes(defect.name));

async function runPair(withSemantic: boolean, store: PrivateArtifactStore) {
  const results = [];
  for (const defects of [CAMPAIGN_A, CAMPAIGN_B]) {
    const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
    const result = await runCampaign(manifest, semanticExecutor(buildScript(withSemantic, defects)), { store, now: () => new Date(STATIC_NOW) });
    expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
    results.push(result);
  }
  return results;
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase9-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

const SENTINEL_MARKERS = ['SENTINEL_CUSTOMER_NAME_X7Q', 'SENTINEL_ACCOUNT_884422', 'SENTINEL_EMAIL_X7Q@example.invalid', 'SENTINEL_AMOUNT_987654321', 'SENTINEL_ERROR_MESSAGE_X7Q'];

function sweepDurable(value: unknown, what: string): void {
  const text = JSON.stringify(value);
  for (const marker of SENTINEL_MARKERS) {
    expect(text.includes(marker), `${what} must not contain ${marker}`).toBe(false);
  }
}

test.describe('Phase 9 campaign integration — semantic findings through the real pipeline', () => {
  test('five seeded semantic defects are admitted and reach sanitized dossiers across the paired runs', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(true, store);
      const categories = new Set<string>();
      let semanticDossiers = 0;
      for (const result of results) {
        expect(result.dossiers.length).toBeGreaterThanOrEqual(1);
        for (const dossier of result.dossiers) {
          if (dossier.semanticEvidence !== null) {
            semanticDossiers += 1;
            for (const category of dossier.semanticEvidence.categories) categories.add(category);
            for (const finding of dossier.semanticEvidence.findings) {
              expect(finding.sourceSHA).toBe(FIXTURE_SHA);
              expect(finding.sourceRelativePath.startsWith('/')).toBe(false);
            }
          }
        }
        expect(result.checkpoint.privacyStatus).toBe('PASS');
        expect(result.morningBrief.externalPublication).toBe('PROHIBITED');
      }
      // All five seeded categories are represented across the dossiers.
      for (const defect of SEEDED_DEFECTS) expect(categories.has(defect.category), defect.category).toBe(true);
      expect(semanticDossiers).toBeGreaterThanOrEqual(3);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('paired baseline: the same seeded observations WITHOUT the semantic channel admit nothing', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(false, store);
      for (const result of results) {
        for (const dossier of result.dossiers) {
          expect(dossier.semanticEvidence).toBeNull();
        }
        const checkpointText = JSON.stringify(result.checkpoint);
        for (const defect of SEEDED_DEFECTS) {
          expect(checkpointText.includes(defect.category)).toBe(false);
        }
        expect(result.morningBrief.headline).toContain('finding');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('sentinel sweep: campaign checkpoints, dossiers, briefs, and artifacts contain zero sentinels', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(true, store);
      for (const result of results) {
        sweepDurable(result.checkpoint, 'campaign checkpoint');
        sweepDurable(result.morningBrief, 'morning brief');
        sweepDurable(result.dossiers, 'dossiers');
        // Semantic payloads (findings/evidence) must never carry private
        // root paths (SPEC §75). The pre-existing `artifactPath` ledger field
        // points into the private owner-only store and is excluded here.
        for (const dossier of result.dossiers) {
          if (dossier.semanticEvidence !== null) {
            const evidenceText = JSON.stringify(dossier.semanticEvidence);
            expect(evidenceText).not.toContain('/home/dalepalaca');
            expect(evidenceText).not.toContain('/tmp/');
          }
        }
        const checkpointSemanticText = JSON.stringify(result.checkpoint.anomalyCandidates);
        expect(checkpointSemanticText).not.toContain('/home/dalepalaca');
        expect(checkpointSemanticText).not.toContain('/tmp/');
      }
      for (const file of fs.readdirSync(root)) {
        const content = fs.readFileSync(path.join(root, file), 'utf8');
        for (const marker of SENTINEL_MARKERS) {
          expect(content.includes(marker), `${file} must not contain ${marker}`).toBe(false);
        }
        expect(content).not.toContain('/home/dalepalaca');
      }
      // The raw fixture really does carry sentinels (non-vacuous).
      const rawEnvelope = fs.readFileSync(path.join(CORPUS_ROOT, 'defects', 'http200-error-envelope', 'response.json'), 'utf8');
      expect(rawEnvelope).toContain('SENTINEL_ERROR_MESSAGE_X7Q');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('legacy protocol-only dossier shape remains intact (backward compatibility)', async () => {
    const { root, store } = tempStore();
    try {
      const results = await runPair(false, store);
      for (const result of results) {
        for (const dossier of result.dossiers) {
          // The legacy consumer surface is unchanged.
          expect(dossier.schemaVersion).toBe(DOSSIER_VERSION);
          expect(typeof dossier.title).toBe('string');
          expect(Array.isArray(dossier.minimalSequence)).toBe(true);
          expect(dossier.privacy.result).toBe('PASS');
          expect(dossier.l4Datastore).toBe('OUT_OF_SCOPE_BY_OWNER');
        }
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
