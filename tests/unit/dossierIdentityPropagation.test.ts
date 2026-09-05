// Dossier expectation / semantic-contract identity propagation.
//
// The reviewer surface reported these identities as absent because the
// Control Center projection dropped them, not because they did not exist:
// SemanticTriageEvidence has carried `expectationId` and
// `invariantDefinitionId` since Phase 12A, mechanically established and
// privacy-validated at construction.
//
// So this is a CARRY, not a derivation, and the tests are shaped accordingly.
// Part A proves the value reaches the projection unchanged through the real
// authority, and that absence stays absence. Part B measures what the carry
// does to classification on a permanent synthetic corpus. Part C is the
// half that matters most: propagation must not over-collapse distinct
// findings, so the corpus deliberately contains families that SHOULD share an
// identity and SHOULD NOT become duplicates.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { createFindingsAuthorityForTests } from '../../src/controlCenter/authorities/findingsAuthority';
import { reviewerInputsFromFindings } from '../../src/controlCenter/authorities/reviewerAuthority';
import { projectReviewer } from '../../src/controlCenter/adapters/reviewerAdapter';
import { classifyRelationship } from '../../src/core/findingIntel';
import {
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  compareBrowserAndApi,
  correlateSourceChanges,
  createBugDossier,
  createBugDossierV2,
  localizeFaultBoundary,
  minimizeFailure,
  rankConfidence,
  rankTriagePriority,
  type MinimizationResult,
} from '../../src/core/triage';
import { createSemanticTriageEvidence } from '../../src/core/triage/semanticTriageEvidence';
import { CORPUS_FAMILIES, reviewerCorpus, withoutIdentities, type CorpusFamily, type CorpusFinding } from '../helpers/reviewerCorpus';

const EXPECTATION_ID = 'fixture-10.common-exchange.read.real-source-deep';
const CONTRACT_ID = 'inv:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FINGERPRINT = `fp:sha256:${'a'.repeat(24)}`;

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-identity-'));
  fs.chmodSync(root, 0o700);
  return root;
}

// Dossiers are built through the real constructors, so the fixtures are
// artifacts the findings authority genuinely accepts. Hand-written JSON would
// be rejected by artifact validation and every assertion below would then be
// vacuous.

async function minimization(fingerprint: string): Promise<MinimizationResult> {
  return minimizeFailure({
    originalSequence: ['a1', 'a2', 'a3'].map((actionId) => ({ actionId, semanticClass: 'KNOWN_READ' as const, routeClass: '/synthetic/read', sourceApproved: true as const, catalogVersion: 'synthetic.catalog.v1' })),
    anomalyFingerprint: fingerprint,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['a1', 'a2', 'a3']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: SYNTHETIC_MINIMIZATION_BUDGET,
    replay: (sequence) => {
      const failure = sequence.some((action) => action.actionId === 'a1');
      return {
        status: failure ? ('FAILURE' as const) : ('PASS' as const),
        ...(failure ? { anomalyFingerprint: fingerprint } : {}),
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
      };
    },
  });
}

async function dossierInputs(fingerprint: string) {
  const minimized = await minimization(fingerprint);
  const differential = compareBrowserAndApi(
    { failed: true, routeClass: '/synthetic/read', structuralState: 'table-missing', operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: fingerprint, runtimeCategory: 'synthetic' },
    { available: true, failed: false, operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: `fp:sha256:${'c'.repeat(24)}` },
  );
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'synthetic/repo', path: 'src/reader.ts', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimized.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return { minimized, differential, source, boundary, confidence };
}

function triageEvidence(overrides: Record<string, unknown> = {}) {
  return createSemanticTriageEvidence({
    expectationId: EXPECTATION_ID,
    targetId: 'target.common-exchange.read',
    semanticFindingFingerprint: `fp:sha256:${'b'.repeat(24)}`,
    invariantDefinitionId: CONTRACT_ID,
    semanticOutcome: 'ANOMALY',
    receiptOutcome: 'ANOMALY',
    receiptVersion: 'nightwatch.semantic-evaluation-receipt.v1',
    sourceRepoId: 'repo.synthetic',
    sourceSha: 'c'.repeat(40),
    sourceEvidenceDigest: `ev:sha256:${'d'.repeat(24)}`,
    sourceDerivationVersion: 'nightwatch.real-source-expectation-recipe.v2',
    sourceCurrentness: 'CURRENT',
    exactReplayStatus: 'REPRODUCED',
    exactFingerprintMatch: true,
    minimalityGuarantee: 'BOUNDED_MINIMAL',
    freshContextReproductions: 2,
    minimalSequenceReproductions: 2,
    ...overrides,
  } as Parameters<typeof createSemanticTriageEvidence>[0]);
}

async function v2Dossier(overrides: Record<string, unknown> = {}) {
  const input = await dossierInputs(FINGERPRINT);
  return createBugDossierV2({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0002'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: FINGERPRINT,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'LOW',
    triagePriority: rankTriagePriority({ technicalSeverity: 'LOW', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticTriageEvidence: null,
    ...overrides,
  } as Parameters<typeof createBugDossierV2>[0]);
}

async function v1Dossier() {
  const input = await dossierInputs(FINGERPRINT);
  return createBugDossier({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0001'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: FINGERPRINT,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
  } as Parameters<typeof createBugDossier>[0]);
}

function writeDossierFile(root: string, name: string, dossier: unknown, patch?: (value: Record<string, unknown>) => Record<string, unknown>): void {
  const value = patch === undefined ? dossier : patch(JSON.parse(JSON.stringify(dossier)) as Record<string, unknown>);
  const target = path.join(root, name);
  fs.writeFileSync(target, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(target, 0o600);
}

/** The single projected dossier from a one-dossier store. */
function projectOne(root: string): { expectationId: string | null; semanticContractId: string | null } | null {
  const dossier = createFindingsAuthorityForTests(root).snapshot().dossiers[0];
  return dossier === undefined ? null : { expectationId: dossier.expectationId, semanticContractId: dossier.semanticContractId };
}

test.describe('A — identity is carried, never derived', () => {
  test('a v2 dossier carries both identities forward unchanged', async () => {
    const root = tempRoot();
    try {
      writeDossierFile(root, 'candidate-one.json', await v2Dossier({ semanticTriageEvidence: triageEvidence() }));
      const projected = projectOne(root);
      expect(projected).not.toBeNull();
      expect(projected!.expectationId).toBe(EXPECTATION_ID);
      expect(projected!.semanticContractId).toBe(CONTRACT_ID);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the carried identity reaches the reviewer projection as the shared invariant', () => {
    // A defect class needs several members over one contract, so this runs
    // over the permanent corpus rather than a pair of hand-built dossiers.
    // Part A above already proved the authority carries the value out of a
    // real dossier file; what is proven here is that the projection does not
    // drop or rewrite it on the way to the wire.
    const corpus = reviewerCorpus(120).filter((finding) => finding.family === 'SAME_EXPECTATION_SAME_FINGERPRINT');
    const inputs = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign.local.1' });
    const projected = projectReviewer(inputs, 50);

    const classes = projected.items
      .map((item) => item.defectClass.value)
      .filter((value): value is NonNullable<typeof value> => value !== null);
    expect(classes.length).toBeGreaterThan(0);

    // The shared invariant is the UPSTREAM identity, not a fallback scope.
    const invariants = new Set(classes.map((value) => String(value.sharedInvariant)));
    for (const invariant of invariants) expect(invariant.startsWith('inv:family-a.')).toBe(true);
    expect(invariants.has('UNKNOWN_SCOPE')).toBe(false);
  });

  test('with the identities stripped, the same corpus forms no defect class', () => {
    // The control for the test above: the classes exist BECAUSE of the carry.
    const corpus = withoutIdentities(reviewerCorpus(120).filter((finding) => finding.family === 'SAME_EXPECTATION_SAME_FINGERPRINT'));
    const inputs = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign.local.1' });
    const projected = projectReviewer(inputs, 50);
    expect(projected.items.every((item) => item.defectClass.value === null)).toBe(true);
  });

  test('a v2 dossier without semantic triage evidence keeps both null', async () => {
    const root = tempRoot();
    try {
      writeDossierFile(root, 'candidate-one.json', await v2Dossier({ semanticTriageEvidence: null }));
      expect(projectOne(root)).toEqual({ expectationId: null, semanticContractId: null });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a v1 dossier keeps both null', async () => {
    const root = tempRoot();
    try {
      writeDossierFile(root, 'candidate-one.json', await v1Dossier());
      expect(projectOne(root)).toEqual({ expectationId: null, semanticContractId: null });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // Defence in depth. These values could never come from
  // validateSemanticTriageEvidence — they are what a foreign or hand-edited
  // file could contain, so they are patched into a valid dossier AFTER
  // construction. The projection must drop rather than forward them.
  for (const [label, expectationId] of [
    ['a customer sentinel', 'CUSTOMER_SENTINEL'],
    ['an account sentinel', 'ACCOUNT_SENTINEL'],
    ['a cost sentinel', 'COST_SENTINEL'],
    ['an email address', 'person@example.com'],
    ['a path-shaped value', 'expectation/invoice-total'],
    ['a bearer token', 'Bearer abcdefghijklmnop'],
    ['an AWS key', 'AKIAIOSFODNN7EXAMPLE'],
    ['a non-string', 42 as unknown as string],
    ['an over-long identifier', 'e'.repeat(180)],
  ] as const) {
    test(`${label} is dropped, not projected`, async () => {
      const root = tempRoot();
      try {
        writeDossierFile(root, 'candidate-one.json', await v2Dossier({ semanticTriageEvidence: triageEvidence() }), (value) => ({
          ...value,
          semanticTriageEvidence: { ...(value.semanticTriageEvidence as Record<string, unknown>), expectationId },
        }));
        const projected = projectOne(root);
        // Upstream validation may refuse the dossier outright, which is also
        // a pass: what must never happen is the value reaching the surface.
        if (projected !== null) expect(projected.expectationId).toBeNull();
        // Scoped to the projected dossiers: the snapshot also carries a
        // content digest, and a short value like `42` occurs in hex by
        // chance, which would make a whole-snapshot scan a false alarm.
        expect(JSON.stringify(createFindingsAuthorityForTests(root).snapshot().dossiers)).not.toContain(String(expectationId));
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }

  test('nothing is inferred from severity, route, title or fingerprint', async () => {
    const root = tempRoot();
    try {
      writeDossierFile(root, 'candidate-one.json', await v2Dossier({ semanticTriageEvidence: null }), (value) => ({
        ...value,
        title: 'Rounding error in the invoice total expectation',
        technicalSeverity: 'CRITICAL',
      }));
      const projected = projectOne(root);
      if (projected !== null) expect(projected).toEqual({ expectationId: null, semanticContractId: null });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------

const CORPUS_SIZE = 300;

interface Measurement {
  readonly relationships: Readonly<Record<string, number>>;
  readonly defectClassMembers: number;
  readonly duplicateSuggestions: number;
}

function measure(corpus: readonly CorpusFinding[]): Measurement {
  const inputs = reviewerInputsFromFindings({ dossiers: corpus, campaignId: 'campaign.local.1' });
  const relationships: Record<string, number> = {};
  let defectClassMembers = 0;
  let duplicateSuggestions = 0;
  for (const finding of inputs.findings) {
    const key = finding.relationship?.relationship ?? 'UNKNOWN';
    relationships[key] = (relationships[key] ?? 0) + 1;
    if (finding.defectClass !== null) defectClassMembers += 1;
    duplicateSuggestions += finding.probableDuplicates.length;
  }
  return { relationships, defectClassMembers, duplicateSuggestions };
}

test.describe('B — measured effect on a permanent synthetic corpus', () => {
  test('propagation adds mechanically justified classification, and the corpus is real', () => {
    const corpus = reviewerCorpus(CORPUS_SIZE);
    const after = measure(corpus);
    const before = measure(withoutIdentities(corpus));

    // Guard the measurement itself: a corpus that produced nothing would let
    // every assertion below pass while proving nothing.
    expect(corpus).toHaveLength(CORPUS_SIZE);
    expect(Object.values(before.relationships).reduce((sum, count) => sum + count, 0)).toBe(CORPUS_SIZE);

    // The identities do work: more findings participate in a defect class.
    expect(after.defectClassMembers).toBeGreaterThan(before.defectClassMembers);

    // The goal is NOT maximizing non-UNKNOWN. Duplicate suggestions —
    // the strongest, most consequential claim — must not inflate.
    expect(after.duplicateSuggestions).toBeLessThanOrEqual(before.duplicateSuggestions);

    // Nothing was invented: UNKNOWN is unchanged, because a finding with no
    // identity gains nothing from other findings having one.
    expect(after.relationships.UNKNOWN).toBe(before.relationships.UNKNOWN);

    // The measured shape of the improvement, pinned so a future classifier
    // change shows up here as a failure rather than as a feeling:
    //
    //   defect-class members   0   -> 150   (classes need an identity to exist)
    //   duplicate suggestions  146 -> 146   (no inflation of the strongest claim)
    //   RELATED_FINDING        225 -> 151   (74 refined to SHARED_DEFECT_CLASS)
    //   PROBABLE_DUPLICATE     74  -> 37    (37 confirmed to EXACT_SAME_FINDING)
    //
    // The two reclassifications are refinements, not new claims: a pair whose
    // expectation AND fingerprint agree is more than probably the same, and a
    // pair sharing a contract is more specific than merely related.
    expect(before.defectClassMembers).toBe(0);
    expect(after.defectClassMembers).toBe(150);
    expect(after.duplicateSuggestions).toBe(before.duplicateSuggestions);
    expect(after.relationships.SHARED_DEFECT_CLASS ?? 0).toBe(
      (before.relationships.RELATED_FINDING ?? 0) - (after.relationships.RELATED_FINDING ?? 0)
    );
    expect(after.relationships.EXACT_SAME_FINDING ?? 0).toBe(
      (before.relationships.PROBABLE_DUPLICATE ?? 0) - (after.relationships.PROBABLE_DUPLICATE ?? 0)
    );

    // Report the distribution too, so the numbers are readable in the log.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ before, after }, null, 2));
  });

  test('the measurement is deterministic across runs', () => {
    const first = measure(reviewerCorpus(CORPUS_SIZE));
    const second = measure(reviewerCorpus(CORPUS_SIZE));
    expect(second).toEqual(first);
  });

  test('every family is actually represented', () => {
    const corpus = reviewerCorpus(CORPUS_SIZE);
    for (const family of CORPUS_FAMILIES) {
      expect(corpus.filter((finding) => finding.family === family).length, family).toBeGreaterThan(5);
    }
  });
});

// ---------------------------------------------------------------------------

function descriptorOf(finding: CorpusFinding) {
  return {
    findingId: finding.candidateId,
    fingerprint: /^fp:sha256:[a-f0-9]{12,64}$/i.test(finding.oracleFingerprint) ? finding.oracleFingerprint : null,
    expectationId: finding.expectationId,
    semanticContractId: finding.semanticContractId,
    failureSignature: null,
    route: finding.routeClass,
    sourceLineage: null,
    replayOutcome: 'FAILURE' as const,
  };
}

function firstTwoOf(family: CorpusFamily): readonly [CorpusFinding, CorpusFinding] {
  const members = reviewerCorpus(CORPUS_SIZE).filter((finding) => finding.family === family);
  return [members[1] as CorpusFinding, members[2] as CorpusFinding];
}

test.describe('C — propagation must not over-collapse distinct findings', () => {
  test('same expectation, different failure: related, never the same finding', () => {
    const [a, b] = firstTwoOf('SAME_EXPECTATION_DIFFERENT_FAILURE');
    expect(a.expectationId).toBe(b.expectationId);
    expect(a.oracleFingerprint).not.toBe(b.oracleFingerprint);

    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    expect(result.relationship).not.toBe('EXACT_SAME_FINDING');
    expect(result.relationship).not.toBe('PROBABLE_DUPLICATE');
    // The shared expectation is still recorded as the evidence it is.
    expect(result.evidence.map((item) => item.kind)).toContain('SAME_EXPECTATION');
  });

  test('same semantic contract, unrelated operation: not a duplicate', () => {
    const [a, b] = firstTwoOf('SAME_CONTRACT_UNRELATED_OPERATION');
    expect(a.semanticContractId).toBe(b.semanticContractId);
    expect(a.expectationId).not.toBe(b.expectationId);

    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    expect(result.relationship).not.toBe('EXACT_SAME_FINDING');
    expect(result.relationship).not.toBe('PROBABLE_DUPLICATE');
  });

  test('same fingerprint, different expectation: the identity is counterevidence', () => {
    const [a, b] = firstTwoOf('SAME_FINGERPRINT_DIFFERENT_EXPECTATION');
    expect(a.oracleFingerprint).toBe(b.oracleFingerprint);
    expect(a.expectationId).not.toBe(b.expectationId);

    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    const kinds = result.counterevidence.map((item) => item.kind);
    expect(kinds).toContain('DIFFERENT_EXPECTATION');
    expect(kinds).toContain('DIFFERENT_SEMANTIC_CONTRACT');

    // This is the precise gain from propagation. Without the identities the
    // classifier could only say it was MISSING the comparison input; with
    // them it can say the two findings genuinely DIFFER. "I don't know"
    // became "these are not the same", which is a stronger, safer claim.
    const stripped = classifyRelationship(
      { ...descriptorOf(a), expectationId: null, semanticContractId: null },
      { ...descriptorOf(b), expectationId: null, semanticContractId: null }
    );
    const strippedKinds = stripped.counterevidence.map((item) => item.kind);
    expect(strippedKinds).not.toContain('DIFFERENT_EXPECTATION');
    expect(strippedKinds).not.toContain('DIFFERENT_SEMANTIC_CONTRACT');
    expect(strippedKinds).toContain('MISSING_COMPARISON_INPUT');
  });

  test('same route, different contract: the route alone collapses nothing', () => {
    const [a, b] = firstTwoOf('SAME_ROUTE_DIFFERENT_CONTRACT');
    expect(a.routeClass).toBe(b.routeClass);
    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    expect(result.relationship).not.toBe('EXACT_SAME_FINDING');
    expect(result.relationship).not.toBe('PROBABLE_DUPLICATE');
  });

  test('no identity: UNKNOWN stays UNKNOWN rather than becoming a weak yes', () => {
    const [a, b] = firstTwoOf('NO_IDENTITY');
    expect(a.expectationId).toBeNull();
    expect(b.expectationId).toBeNull();

    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    // No identity evidence is manufactured, and the absence is recorded as an
    // absence rather than treated as agreement. Whatever relationship the
    // classifier reaches, it reaches on other evidence — route and
    // fingerprint — exactly as it did before this campaign.
    const evidence = result.evidence.map((item) => item.kind);
    expect(evidence).not.toContain('SAME_EXPECTATION');
    expect(evidence).not.toContain('SAME_SEMANTIC_CONTRACT');
    expect(result.counterevidence.map((item) => item.kind)).toContain('MISSING_COMPARISON_INPUT');
    expect(result.relationship).not.toBe('EXACT_SAME_FINDING');
    expect(result.relationship).not.toBe('PROBABLE_DUPLICATE');

    // And the answer is unchanged from the pre-propagation behaviour.
    const stripped = classifyRelationship(
      { ...descriptorOf(a), expectationId: null, semanticContractId: null },
      { ...descriptorOf(b), expectationId: null, semanticContractId: null }
    );
    expect(stripped.relationship).toBe(result.relationship);
  });

  test('a genuine duplicate is still recognized', () => {
    // The defence must not have made the classifier useless.
    const [a, b] = firstTwoOf('SAME_EXPECTATION_SAME_FINGERPRINT');
    expect(a.oracleFingerprint).toBe(b.oracleFingerprint);
    const result = classifyRelationship(descriptorOf(a), descriptorOf(b));
    expect(['EXACT_SAME_FINDING', 'PROBABLE_DUPLICATE']).toContain(result.relationship);
  });
});
