// ---------------------------------------------------------------------------
// AH-1 — Alphaus-compatible human-review finding handoff, permanent matrix.
//
// Everything here is synthetic and local-only. Planted sentinels prove the
// privacy boundary; no production, DEV, or NEXT contact; no network.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';

import type { AiBugModelOutput } from '../../src/core/alphausHandoff/types';
import type { BugDossier } from '../../src/core/triage/types';
import type { AlphausHandoffInput } from '../../src/core/alphausHandoff/types';
import {
  ALPHAUS_FINDING_HANDOFF_VERSION,
  projectAlphausFindingHandoff,
} from '../../src/core/alphausHandoff';
import {
  ALPHAUS_CATCH_STAGE_VALUES,
  ALPHAUS_SEVERITY_VALUES,
  ALPHAUS_SOURCE_VALUES,
} from '../../src/core/alphausHandoff/types';
import { createBugDossier, minimizeFailure, PASSIVE_MINIMIZATION_SAFETY } from '../../src/core/triage';
import { compareBrowserAndApi } from '../../src/core/triage/differential';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { localizeFaultBoundary } from '../../src/core/triage/localization';
import { rankConfidence } from '../../src/core/triage/confidence';
import { rankTriagePriority } from '../../src/core/triage/summaries';
import type { SafetyVector } from '../../src/core/exploration/types';

const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';

const FAILURE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

async function dossierFixture(evidenceLevel: 'L0' | 'L1' | 'L2' | 'L3' = 'L3'): Promise<BugDossier> {
  const minimization = await minimizeFailure({
    originalSequence: [{ actionId: 'read.exchange', semanticClass: 'KNOWN_READ', routeClass: '/ripple/exchange', sourceApproved: true, catalogVersion: 'synthetic.catalog.v1' }],
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['read.exchange']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    replay: () => ({ status: 'FAILURE' as const, anomalyFingerprint: FP, safety: FAILURE }),
  });
  const browser = { failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' };
  const api = { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' };
  const differential = compareBrowserAndApi(browser, api);
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimization.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return createBugDossier({
    firstObserved: '2026-08-14T00:00:00.000Z',
    lastObserved: '2026-08-14T00:01:00.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['synthetic-seed-1'],
    routeClass: '/ripple/exchange',
    apiOperationFamily: 'payer-exchange',
    oracleFingerprint: FP,
    evidenceLevel,
    minimization,
    browserApiDifferential: differential,
    sourceCorrelation: source,
    likelyFaultBoundary: boundary,
    confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: ['deployment identity remains unresolved'],
  });
}

function draftFixture(overrides: Partial<AiBugModelOutput> = {}): AiBugModelOutput {
  return {
    schemaVersion: 'nightwatch.ai-bug-draft-output.private.v1',
    candidateId: 'candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    inputPackageId: 'ai-input:aaaaaaaaaaaaaaaaaaaaaaaa',
    inputPackageDigest: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    evidenceLevelAtGeneration: 'L3',
    summaryDraft: 'Synthetic exchange table fails to render.',
    reproductionDraft: 'Open the synthetic payer exchange view; observe the missing table.',
    observedBehaviorDraft: 'The table region renders empty.',
    expectedBehaviorDraft: 'The table lists synthetic payer rows.',
    impactDraft: 'Synthetic-only impact; no customer consequence asserted.',
    hypotheses: [],
    evidenceRefs: ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'],
    sourceRefs: ['repo:synthetic/ripple-ui@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    uncertainties: ['synthetic uncertainty only'],
    ...overrides,
  };
}

async function handoffInput(overrides: Partial<AlphausHandoffInput> = {}): Promise<AlphausHandoffInput> {
  // DEF-FC-01: the draft is bound to the exact dossier it describes; a valid
  // fixture never pairs a draft written for another candidate.
  const dossier = overrides.dossier ?? (await dossierFixture());
  const bugDraft = overrides.bugDraft !== undefined ? overrides.bugDraft : draftFixture({ candidateId: dossier.candidateId });
  return {
    campaignRef: 'synthetic-campaign-1',
    observationProvenance: { stage: 'LOCAL', outageEvidence: false, customerReported: false, customerReportRef: null },
    severityEvidence: [],
    severityProvenance: '',
    classRemovalEvidence: null,
    ...overrides,
    dossier,
    bugDraft,
  };
}

test.describe('AH-1 schema and contract', () => {
  test('projects a valid minimal artifact without a draft', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput({ bugDraft: null }));
    expect(artifact.schemaVersion).toBe(ALPHAUS_FINDING_HANDOFF_VERSION);
    expect(artifact.findingId).toMatch(/^alphaus-finding:sha256:[0-9a-f]{24}$/);
    expect(artifact.investigation).toEqual({ reproduction: null, expected: null, actual: null, impact: null });
    expect(artifact.facts.evidenceRefs).toEqual([]);
    expect(artifact.facts.sourceRefs).toEqual([]);
    expect(artifact.facts.journeys).toEqual(['ripple-payer-exchange-read']);
  });

  test('projects a fully populated artifact with a draft', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({
        observationProvenance: { stage: 'NEXT', outageEvidence: false, customerReported: false, customerReportRef: null },
        severityEvidence: ['DATA_LOSS_CONFIRMED'],
        severityProvenance: 'dossier L3 reproduction + source contract exp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );
    expect(artifact.facts.journeys).toEqual(['ripple-payer-exchange-read']);
    expect(artifact.investigation.reproduction).toContain('synthetic payer exchange');
    expect(artifact.investigation.expected).toContain('synthetic payer rows');
    expect(artifact.severityRecommendation.value).toBe('critical');
    expect(artifact.catchStageRecommendation.value).toBe('next');
    expect(artifact.sourceRecommendation.value).toBe('self_found');
    expect(artifact.reportTypeRecommendation.value).toBe('BUG_REPORT');
  });

  test('a draft written for another candidate refuses (DEF-FC-01)', async () => {
    const base = await handoffInput();
    const foreign = draftFixture({ candidateId: 'candidate:sha256:ffffffffffffffffffffffff' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: foreign })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:BUG_DRAFT_CANDIDATE_MISMATCH',
    );
  });

  test('serialization is deterministic', async () => {
    const input = await handoffInput({ severityEvidence: ['COSMETIC_ONLY_CONFIRMED'], severityProvenance: 'visual diff exp:1' });
    const first = projectAlphausFindingHandoff(input);
    const second = projectAlphausFindingHandoff(input);
    expect(second.findingId).toBe(first.findingId);
    expect(second.deterministicDigest).toBe(first.deterministicDigest);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
  test('unknown optional classifications are first-class', async () => {
    const unreproduced = {
      ...(await dossierFixture()),
      reproduction: { result: 'NOT_REPRODUCED', count: 0, minimalityGuarantee: 'NONE' },
    } as unknown as BugDossier;
    const artifact = projectAlphausFindingHandoff(await handoffInput({ dossier: unreproduced }));
    expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
    expect(artifact.catchStageRecommendation.value).toBe('UNKNOWN');
    expect(artifact.teamRecommendation.value).toBe('UNKNOWN');
    expect(artifact.reportTypeRecommendation.value).toBe('UNKNOWN');
  });

  test('extra input fields never leak into the artifact', async () => {
    const base = await handoffInput();
    const artifact = projectAlphausFindingHandoff({ ...base, injectedField: 'must-not-appear' } as unknown as AlphausHandoffInput);
    expect(JSON.stringify(artifact)).not.toContain('must-not-appear');
    expect(JSON.stringify(artifact)).not.toContain('injectedField');
  });
});

test.describe('AH-1 severity recommendations', () => {
  test('total inability recommends blocker', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ severityEvidence: ['TOTAL_INABILITY_TO_USE_OR_TEST'], severityProvenance: 'launch crash exp:1' }),
    );
    expect(artifact.severityRecommendation.value).toBe('blocker');
    expect(artifact.severityRecommendation.provenance).toBe('launch crash exp:1');
  });

  test('data loss recommends critical', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: 'row-loss exp:2' }),
    );
    expect(artifact.severityRecommendation.value).toBe('critical');
  });

  test('intermittent key-feature failure recommends major', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ severityEvidence: ['INTERMITTENT_KEY_FEATURE_FAILURE'], severityProvenance: 'flaky finalize exp:3' }),
    );
    expect(artifact.severityRecommendation.value).toBe('major');
  });

  test('cosmetic-only recommends minor', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ severityEvidence: ['COSMETIC_ONLY_CONFIRMED'], severityProvenance: 'alignment exp:4' }),
    );
    expect(artifact.severityRecommendation.value).toBe('minor');
  });

  test('multiple evidence classes resolve to the most severe', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({
        severityEvidence: ['COSMETIC_ONLY_CONFIRMED', 'DATA_CORRECTNESS_IMPACT_CONFIRMED', 'KEY_FUNCTION_TIMEOUT_CONFIRMED'],
        severityProvenance: 'mixed exp:5',
      }),
    );
    expect(artifact.severityRecommendation.value).toBe('critical');
  });

  test('asserted evidence without provenance stays UNKNOWN', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: '' }),
    );
    expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
  });

  test('non-READY dossier stays UNKNOWN despite evidence', async () => {
    const dossier = { ...(await dossierFixture()), status: 'INCOMPLETE' as const };
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ dossier, severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: 'exp:6' }),
    );
    expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
  });

  test('L1 evidence cannot carry a severity recommendation', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ dossier: await dossierFixture('L1'), severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: 'exp:7' }),
    );
    expect(artifact.severityRecommendation.value).toBe('UNKNOWN');
  });

  test('unknown consequence class refuses', async () => {
    const base = await handoffInput();
    expect(() =>
      projectAlphausFindingHandoff({ ...base, severityEvidence: ['MADE_UP_CLASS'] } as unknown as AlphausHandoffInput),
    ).toThrow('ALPHAUS_HANDOFF_INVALID:SEVERITY_EVIDENCE_CLASS');
  });
});

test.describe('AH-1 catch-stage classification', () => {
  test('production observation supports production but never outage', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ observationProvenance: { stage: 'PRODUCTION', outageEvidence: false, customerReported: false, customerReportRef: null } }),
    );
    expect(artifact.catchStageRecommendation.value).toBe('production');
  });

  test('production outage requires explicit outage evidence', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ observationProvenance: { stage: 'PRODUCTION', outageEvidence: true, customerReported: false, customerReportRef: null } }),
    );
    expect(artifact.catchStageRecommendation.value).toBe('production_outage');
  });

  test('local never becomes next', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    expect(artifact.catchStageRecommendation.value).toBe('UNKNOWN');
    expect(artifact.catchStageRecommendation.basis).toContain('not NEXT');
  });

  test('dev never becomes next', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ observationProvenance: { stage: 'DEV', outageEvidence: false, customerReported: false, customerReportRef: null } }),
    );
    expect(artifact.catchStageRecommendation.value).toBe('UNKNOWN');
  });

  test('source analysis never becomes pr_review', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({ observationProvenance: { stage: 'SOURCE_ANALYSIS', outageEvidence: false, customerReported: false, customerReportRef: null } }),
    );
    expect(artifact.catchStageRecommendation.value).toBe('UNKNOWN');
    expect(artifact.catchStageRecommendation.basis).toContain('not PR review');
  });
});

test.describe('AH-1 source integrity', () => {
  test('customer report is preserved as customer_escaped', async () => {
    const artifact = projectAlphausFindingHandoff(
      await handoffInput({
        observationProvenance: { stage: 'PRODUCTION', outageEvidence: false, customerReported: true, customerReportRef: 'leslie/report/4242' },
      }),
    );
    expect(artifact.sourceRecommendation.value).toBe('customer_escaped');
    expect(artifact.sourceRecommendation.basis).toContain('leslie/report/4242');
  });

  test('customer report without a reference refuses', async () => {
    const base = await handoffInput();
    expect(() =>
      projectAlphausFindingHandoff({
        ...base,
        observationProvenance: { stage: 'PRODUCTION', outageEvidence: false, customerReported: true, customerReportRef: null },
      }),
    ).toThrow('ALPHAUS_HANDOFF_INVALID:CUSTOMER_REPORT_REF_MISSING');
  });

  test('a report reference without a report refuses', async () => {
    const base = await handoffInput();
    expect(() =>
      projectAlphausFindingHandoff({
        ...base,
        observationProvenance: { stage: 'LOCAL', outageEvidence: false, customerReported: false, customerReportRef: 'leslie/report/4242' },
      }),
    ).toThrow('ALPHAUS_HANDOFF_INVALID:CUSTOMER_REPORT_REF_WITHOUT_REPORT');
  });

  test('independent discovery stays self_found', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    expect(artifact.sourceRecommendation.value).toBe('self_found');
  });
});

test.describe('AH-1 team and report type', () => {
  test('team is always UNKNOWN: repository ownership never manufactures accountability', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    expect(artifact.teamRecommendation.value).toBe('UNKNOWN');
    expect(artifact.teamRecommendation.basis).toContain('never guessed');
  });
  test('no code-owner or accountability assignment exists', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    const serialized = JSON.stringify(artifact).toLowerCase();
    expect(serialized).not.toContain('codeowner');
    expect(serialized).not.toContain('code_owner');
    expect(artifact).not.toHaveProperty('codeOwner');
    expect(artifact).not.toHaveProperty('assignee');
  });

  test('reproduced findings suggest BUG_REPORT', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    expect(artifact.reportTypeRecommendation.value).toBe('BUG_REPORT');
  });

  test('class removal requires systematic evidence, never a single fix', async () => {
    const withoutEvidence = projectAlphausFindingHandoff(await handoffInput());
    expect(withoutEvidence.reportTypeRecommendation.value).not.toBe('BUG_CLASS_REMOVAL');
    const withEvidence = projectAlphausFindingHandoff(
      await handoffInput({ classRemovalEvidence: 'preventative lint rule exp:class-1 eliminates the recurring class' }),
    );
    expect(withEvidence.reportTypeRecommendation.value).toBe('BUG_CLASS_REMOVAL');
  });
});

test.describe('AH-1 privacy boundary', () => {
  test('planted bearer token in a draft refuses', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, impactDraft: 'call with Authorization: Bearer synthetic-planted-token-value' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID:(DRAFT_IMPACT_SENTINEL|PRIVACY_BLOCKED)/);
  });

  test('planted JWT in expected behavior refuses', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, expectedBehaviorDraft: 'token eyJhbGciOiJIUzI1NiJ9.c3ludGhldGlj.c2lnbmF0dXJl' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('planted AWS key in reproduction refuses', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, reproductionDraft: 'export AWS_KEY=AKIAIOSFODNN7EXAMPLE' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('planted customer sentinel in uncertainties refuses', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, uncertainties: ['CUSTOMER_SENTINEL-alpha'] });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });
  test('planted plain email in observed behavior refuses (D-AH1-001)', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, observedBehaviorDraft: 'alice@alphaus.cloud customer data visible' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('planted SSN-shaped value in impact refuses (D-AH1-001)', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, impactDraft: 'customer ID 123-45-6789 leaked in output' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('bounty identifiers in provenance refuse (D-AH1-010)', async () => {
    const base = await handoffInput();
    expect(() =>
      projectAlphausFindingHandoff({ ...base, severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: 'bountyPoints 100 expected' }),
    ).toThrow('ALPHAUS_HANDOFF_INVALID:SEVERITY_PROVENANCE_BOUNTY');
    expect(() => projectAlphausFindingHandoff({ ...base, classRemovalEvidence: 'rule with estimatedReward' })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:CLASS_REMOVAL_BOUNTY',
    );
  });

  test('planted private key block in a draft refuses', async () => {
    const base = await handoffInput();
    const _dossierId = base.dossier.candidateId;
    const draft = draftFixture({ candidateId: _dossierId, summaryDraft: 'key -----BEGIN RSA PRIVATE KEY----- synthetic' });
    expect(() => projectAlphausFindingHandoff({ ...base, bugDraft: draft })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('tainted dossier journey value refuses', async () => {
    const dossier = { ...(await dossierFixture()), journeys: ['ok-journey?token=planted'] };
    const base = await handoffInput();
    expect(() => projectAlphausFindingHandoff({ ...base, dossier })).toThrow(/ALPHAUS_HANDOFF_INVALID/);
  });

  test('clean artifact carries no raw-body-shaped content', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toMatch(/Bearer\s+|AKIA[0-9A-Z]{16}|PRIVATE KEY/);
  });
});

test.describe('AH-1 authority and scoring exclusion', () => {
  test('authority invariants hold on every artifact', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput());
    expect(artifact.authority.humanReviewRequired).toBe(true);
    expect(artifact.authority.executable).toBe(false);
    expect(artifact.authority.externalPublication).toBe('PROHIBITED');
    expect(artifact.authority.autoFile).toBe(false);
    expect(artifact.authority.autoApprove).toBe(false);
  });

  test('no bounty-scoring surface exists', async () => {
    const artifact = projectAlphausFindingHandoff(await handoffInput({ severityEvidence: ['DATA_LOSS_CONFIRMED'], severityProvenance: 'exp:score' }));
    const serialized = JSON.stringify(artifact).toLowerCase();
    for (const banned of ['bounty', 'expectedpoints', 'rewardtier', 'estimatedreward', 'leaderboard', 'points']) {
      expect(serialized).not.toContain(banned);
    }
    expect(artifact).not.toHaveProperty('bountyPoints');
    expect(artifact).not.toHaveProperty('expectedPoints');
  });

  test('malformed dossier shapes refuse instead of projecting', async () => {
    const base = await handoffInput();
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: null } as unknown as AlphausHandoffInput)).toThrow(
      'ALPHAUS_HANDOFF_INVALID:DOSSIER_SHAPE',
    );
    const badLevel = { ...(await dossierFixture()), evidenceLevel: 'L9' } as unknown as BugDossier;
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: badLevel })).toThrow('ALPHAUS_HANDOFF_INVALID:EVIDENCE_LEVEL');
    const badCount = {
      ...(await dossierFixture()),
      reproduction: { result: 'REPRODUCED', count: -1, minimalityGuarantee: '1-MINIMAL' },
    } as unknown as BugDossier;
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: badCount })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:REPRODUCTION_COUNT',
    );
    const badBoundary = { ...(await dossierFixture()), likelyFaultBoundary: { primaryBoundary: 'MADE_UP' } } as unknown as BugDossier;
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: badBoundary })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:FAULT_BOUNDARY',
    );
    const badConfidence = { ...(await dossierFixture()), confidence: { level: 'CERTAIN' } } as unknown as BugDossier;
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: badConfidence })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:CONFIDENCE_LEVEL',
    );
    // The reproduction RESULT vocabulary, not only its count (mutation M30).
    for (const result of ['MAYBE', 'reproduced', '', null]) {
      const badResult = {
        ...(await dossierFixture()),
        reproduction: { result, count: 2, minimalityGuarantee: '1-MINIMAL' },
      } as unknown as BugDossier;
      expect(() => projectAlphausFindingHandoff({ ...base, dossier: badResult }), String(result)).toThrow(
        'ALPHAUS_HANDOFF_INVALID:REPRODUCTION_RESULT',
      );
    }
    const badMinimality = {
      ...(await dossierFixture()),
      reproduction: { result: 'REPRODUCED', count: 2, minimalityGuarantee: 'VERY' },
    } as unknown as BugDossier;
    expect(() => projectAlphausFindingHandoff({ ...base, dossier: badMinimality })).toThrow(
      'ALPHAUS_HANDOFF_INVALID:MINIMALITY_GUARANTEE',
    );
  });

  // The organizational vocabularies are owner-supplied facts, not Nightwatch
  // choices. Pinning them here means a future edit that widens or renames a
  // value fails a test rather than silently changing what Nightwatch
  // recommends to a human reviewer (mutations M25-M27).
  test('the Alphaus vocabularies are exactly the owner-supplied sets', () => {
    expect([...ALPHAUS_SEVERITY_VALUES]).toEqual(['blocker', 'critical', 'major', 'minor']);
    expect([...ALPHAUS_CATCH_STAGE_VALUES]).toEqual(['pr_review', 'next', 'production', 'production_outage']);
    expect([...ALPHAUS_SOURCE_VALUES]).toEqual(['self_found', 'customer_escaped']);
    // No LOW/MEDIUM/HIGH <-> S1-S4 mapping may appear anywhere in the vocabulary.
    const all = [...ALPHAUS_SEVERITY_VALUES, ...ALPHAUS_CATCH_STAGE_VALUES, ...ALPHAUS_SOURCE_VALUES].join(' ');
    expect(all).not.toMatch(/\bS[1-4]\b|\bLOW\b|\bMEDIUM\b|\bHIGH\b/);
  });
});
