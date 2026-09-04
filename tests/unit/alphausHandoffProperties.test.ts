// ---------------------------------------------------------------------------
// AH-1 — seeded property tests over the handoff and preflight cones.
//
// Deterministic mulberry32 streams; seeds recorded below. Each property runs
// 64 cases per seed. No network, no filesystem, no clock.
// Seeds: HANDOFF_SEED = 0xA41F, PREFLIGHT_SEED = 0xC12E.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';

import type { AlphausHandoffInput, AlphausSeverityEvidenceClass, AlphausObservationStage } from '../../src/core/alphausHandoff/types';
import { projectAlphausFindingHandoff } from '../../src/core/alphausHandoff';
import type { C12ReadinessInput } from '../../src/core/c12Readiness/types';
import { evaluateC12Readiness } from '../../src/core/c12Readiness';

const HANDOFF_SEED = 0xa41f;
const PREFLIGHT_SEED = 0xc12e;
const CASES = 64;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error('PROPERTY_PICK_EMPTY');
  return item;
}
const SAFE_TOKEN = 'synthetic-token-0042';
const EVIDENCE_CLASSES = [
  'TOTAL_INABILITY_TO_USE_OR_TEST',
  'AUTHENTICATION_IMPOSSIBLE_CONFIRMED',
  'DATA_LOSS_CONFIRMED',
  'SECURITY_IMPACT_CONFIRMED',
  'DATA_CORRECTNESS_IMPACT_CONFIRMED',
  'INVOICING_FAILURE_CONFIRMED',
  'INTERMITTENT_KEY_FEATURE_FAILURE',
  'KEY_FUNCTION_TIMEOUT_CONFIRMED',
  'COSMETIC_ONLY_CONFIRMED',
] as const;
const STAGES = ['LOCAL', 'DEV', 'NEXT', 'PRODUCTION', 'SOURCE_ANALYSIS'] as const;
const SENTINELS = [
  'Bearer synthetic-planted-credential',
  'AKIAIOSFODNN7EXAMPLE',
  'CUSTOMER_SENTINEL-x',
  '-----BEGIN RSA PRIVATE KEY----- synthetic',
  'eyJhbGciOiJIUzI1NiJ9.c3ludGhldGlj.c2lnbmF0dXJl',
];

function syntheticDossier(rand: () => number): AlphausHandoffInput['dossier'] {
  const ready = rand() < 0.7;
  const level = pick(rand, ['L2', 'L3', 'L1'] as const);
  const reproduced = rand() < 0.6;
  return {
    schemaVersion: 'nightwatch.bug-dossier.private.v1',
    status: ready ? 'READY' : 'INCOMPLETE',
    candidateId: `candidate:sha256:${'a'.repeat(24)}`,
    title: 'Synthetic property dossier',
    firstObserved: '2026-09-01T00:00:00.000Z',
    lastObserved: '2026-09-02T00:00:00.000Z',
    journeys: ['synthetic-journey'],
    seeds: ['synthetic-seed'],
    minimalSequence: ['read.synthetic'],
    routeClass: '/synthetic/route',
    apiOperationFamily: null,
    oracleFingerprint: `fp:sha256:${'b'.repeat(24)}`,
    evidenceLevel: level,
    l4Datastore: 'OUT_OF_SCOPE_BY_OWNER',
    reproduction: { result: reproduced ? 'REPRODUCED' : 'NOT_REPRODUCED', count: reproduced ? 2 : 0, minimalityGuarantee: '1-MINIMAL' },
    browserApiDifferential: { status: 'MATCH' },
    sourceChangeCandidates: [],
    likelyFaultBoundary: { primaryBoundary: pick(rand, ['AUTH', 'ROUTER', 'UI_COMPONENT', 'CLIENT_STATE', 'API_CLIENT', 'API_TRANSPORT', 'BACKEND_HANDLER', 'PROTOCOL', 'RESOURCE_LOADING', 'UNKNOWN'] as const), candidateBoundaries: [], confidence: 'MEDIUM', reasons: [], rootCauseClaim: 'NONE' },
    confidence: { level: 'MEDIUM', reasons: [] },
    technicalSeverity: 'MEDIUM',
    triagePriority: 'P2',
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticEvidence: null,
    humanReproductionRecipe: {
      steps: ['observe synthetic view'],
      actionIds: ['read.synthetic'],
      observation: 'synthetic anomaly visible',
      credentialHandling: 'OWNER_AUTHENTICATES_TO_APPROVED_DEV_ACCOUNT',
      prohibitedValues: ['CREDENTIALS', 'CUSTOMER_VALUES', 'COST_VALUES', 'RAW_BODIES', 'COOKIES'],
    },
    aiReady: {
      schemaVersion: 'nightwatch.ai-ready-evidence.private.v1',
      deterministic: true as const,
      evidence: {},
      allowedUses: ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'],
      oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY',
      prohibitedUses: ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'],
    },
    safety: {
      productionAttempts: 0,
      proxyViolations: 0,
      unknownDestinations: 0,
      unknownApprovals: 0,
      productMutations: 0,
      actionCausedUnknown: 0,
      databaseQueries: 0,
    },
    privacy: {
      result: 'PASS',
      rawBodiesPersisted: false,
      customerValuesPersisted: false,
      credentialsPersisted: false,
      screenshotsPersisted: false,
      authenticatedTracesPersisted: false,
    },
  } as unknown as AlphausHandoffInput['dossier'];
}

function handoffCase(rand: () => number): AlphausHandoffInput {
  const customerReported = rand() < 0.3;
  const evidenceCount = Math.floor(rand() * 3);
  const evidence: AlphausSeverityEvidenceClass[] = [];
  for (let index = 0; index < evidenceCount; index += 1) evidence.push(pick(rand, EVIDENCE_CLASSES));
  return {
    dossier: syntheticDossier(rand),
    bugDraft: null,
    campaignRef: null,
    observationProvenance: {
      stage: pick(rand, STAGES) as AlphausObservationStage,
      outageEvidence: rand() < 0.2,
      customerReported,
      customerReportRef: customerReported ? `leslie/report/${Math.floor(rand() * 10000)}` : null,
    },
    severityEvidence: evidence,
    severityProvenance: evidence.length === 0 || rand() < 0.3 ? '' : `property-exp:${SAFE_TOKEN}`,
    classRemovalEvidence: null,
  };
}

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function preflightCase(rand: () => number): { input: C12ReadinessInput; expectReady: boolean } {
  const drop = (): boolean => rand() < 0.25;
  const implementation = drop()
    ? { currentSha: SHA_B, requiredSha: SHA_A }
    : { currentSha: SHA_A, requiredSha: SHA_A };
  const input: C12ReadinessInput = {
    implementation,
    pqBinding: drop() ? { receiptDigest: null, boundSha: null } : { receiptDigest: 'receipt:sha256:f55ec47acdc38825941c2061', boundSha: SHA_A },
    operatorSubject: drop() ? { present: false, provenance: 'UNKNOWN' as const } : { present: true, provenance: 'OPERATOR_CREATED' as const },
    scopeConfig: drop()
      ? null
      : {
          host: 'synthetic-prod-fixture.alphaus.local',
          windowStartIso: '2026-09-04T12:00:00.000Z',
          windowEndIso: '2026-09-04T12:10:00.000Z',
          evidenceDestination: '.nightwatch/findings/synthetic-c12',
          destinationApproved: true,
          killSwitchArmed: true,
        },
    deploymentFact: { state: drop() ? ('UNKNOWN' as const) : ('PROVEN' as const) },
    attribution: { capability: drop() ? ('UNKNOWN' as const) : ('ATTRIBUTING_PROXY' as const) },
    authorization: drop() ? null : { authClass: 'P1_OBSERVE', fresh: true, consumed: false },
    killSwitchEngaged: false,
    nowIso: '2026-09-04T12:00:00.000Z',
  };
  const expectReady =
    implementation.currentSha === implementation.requiredSha &&
    input.pqBinding.receiptDigest !== null &&
    input.operatorSubject.present &&
    input.scopeConfig !== null &&
    input.deploymentFact.state === 'PROVEN' &&
    input.attribution.capability === 'ATTRIBUTING_PROXY' &&
    input.authorization !== null;
  return { input, expectReady };
}

test.describe('AH-1 handoff properties', () => {
  test(`authority literals hold over fuzz inputs (seed ${HANDOFF_SEED})`, () => {
    const rand = mulberry32(HANDOFF_SEED);
    for (let index = 0; index < CASES; index += 1) {
      const artifact = projectAlphausFindingHandoff(handoffCase(rand));
      expect(artifact.authority).toEqual({
        humanReviewRequired: true,
        executable: false,
        externalPublication: 'PROHIBITED',
        autoFile: false,
        autoApprove: false,
      });
      expect(JSON.stringify(artifact).toLowerCase()).not.toContain('bountypoints');
    }
  });

  test(`customer_escaped never becomes self_found (seed ${HANDOFF_SEED})`, () => {
    const rand = mulberry32(HANDOFF_SEED + 1);
    for (let index = 0; index < CASES; index += 1) {
      const input = handoffCase(rand);
      const artifact = projectAlphausFindingHandoff(input);
      if (input.observationProvenance.customerReported) {
        expect(artifact.sourceRecommendation.value).toBe('customer_escaped');
      } else {
        expect(artifact.sourceRecommendation.value).toBe('self_found');
      }
    }
  });

  test(`missing provenance never produces a severity recommendation (seed ${HANDOFF_SEED})`, () => {
    const rand = mulberry32(HANDOFF_SEED + 2);
    for (let index = 0; index < CASES; index += 1) {
      const input = handoffCase(rand);
      const artifact = projectAlphausFindingHandoff(input);
      if (input.severityProvenance === '' && input.severityEvidence.length > 0) {
        expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
      }
      if (input.severityEvidence.length === 0) {
        expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
      }
    }
  });

  test(`production never implies outage (seed ${HANDOFF_SEED})`, () => {
    const rand = mulberry32(HANDOFF_SEED + 3);
    for (let index = 0; index < CASES; index += 1) {
      const input = handoffCase(rand);
      const artifact = projectAlphausFindingHandoff(input);
      if (input.observationProvenance.stage === 'PRODUCTION' && !input.observationProvenance.outageEvidence) {
        expect(artifact.catchStageRecommendation.value).toBe('production');
      }
      if (input.observationProvenance.stage !== 'PRODUCTION' && input.observationProvenance.stage !== 'NEXT') {
        expect(artifact.catchStageRecommendation.value).toBe('UNKNOWN');
      }
    }
  });

  test(`planted sentinels always refuse (seed ${HANDOFF_SEED})`, () => {
    const rand = mulberry32(HANDOFF_SEED + 4);
    for (let index = 0; index < CASES; index += 1) {
      const input = handoffCase(rand);
      const sentinel = pick(rand, SENTINELS);
      const tainted = {
        ...input,
        bugDraft: {
          schemaVersion: 'nightwatch.ai-bug-draft-output.private.v1',
          candidateId: input.dossier.candidateId,
          inputPackageId: 'ai-input:prop',
          inputPackageDigest: 'prop',
          evidenceLevelAtGeneration: 'L3' as const,
          summaryDraft: `property ${sentinel}`,
          reproductionDraft: 'property reproduction',
          observedBehaviorDraft: 'property actual',
          expectedBehaviorDraft: 'property expected',
          impactDraft: 'property impact',
          hypotheses: [],
          evidenceRefs: [],
          sourceRefs: [],
          uncertainties: [],
        },
      } as unknown as AlphausHandoffInput;
      expect(() => projectAlphausFindingHandoff(tainted)).toThrow(/ALPHAUS_HANDOFF_INVALID/);
    }
  });
});

test.describe('AH-1 preflight properties', () => {
  test(`READY iff every prerequisite holds (seed ${PREFLIGHT_SEED})`, () => {
    const rand = mulberry32(PREFLIGHT_SEED);
    for (let index = 0; index < CASES; index += 1) {
      const { input, expectReady } = preflightCase(rand);
      const report = evaluateC12Readiness(input);
      expect(report.status).toBe(expectReady ? 'READY' : 'BLOCKED');
      expect(report.blockers.length === 0).toBe(expectReady);
    }
  });

  test(`INFERRED deployment never admits (seed ${PREFLIGHT_SEED})`, () => {
    const rand = mulberry32(PREFLIGHT_SEED + 1);
    for (let index = 0; index < CASES; index += 1) {
      const { input } = preflightCase(rand);
      const report = evaluateC12Readiness({ ...input, deploymentFact: { state: 'INFERRED' } });
      expect(report.status).toBe('BLOCKED');
      expect(report.blockers.map((blocker) => blocker.code)).toContain('BLOCKED_DEPLOYMENT_FACT');
    }
  });
});
