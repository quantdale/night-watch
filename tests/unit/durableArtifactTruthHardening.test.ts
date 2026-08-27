// ---------------------------------------------------------------------------
// Durable Artifact + Control Center Truth Hardening — regression probes.
//
// The committed BEFORE_PROBES.json records the pre-fix red-team ledger. These
// bounded producer-built mutations now assert the repaired rejection contract
// and the conservative currentness projection.
// Synthetic values only; no credentials, customer data, network, or product
// environment are involved.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { validateArtifact } from '../../src/core/artifactValidation';
import { createFindingsAuthorityForTests, type FindingsAuthoritySnapshot } from '../../src/controlCenter/authorities/findingsAuthority';
import { projectFindings } from '../../src/controlCenter/adapters/findingsAdapter';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import {
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  compareBrowserAndApi,
  correlateSourceChanges,
  createBugDossier,
  localizeFaultBoundary,
  minimizeFailure,
  rankConfidence,
  rankTriagePriority,
  type MinimizationResult,
} from '../../src/core/triage';
import { validateBugDossier } from '../../src/core/triage/dossier';
import { createBugDossierV2, validateBugDossierV2 } from '../../src/core/triage/dossierV2';
import { PrivateArtifactStore } from '../../src/core/policy';

type MutableRecord = Record<string, unknown>;
type Mutation = { readonly id: string; readonly mutate: (value: MutableRecord) => void };

const FP = 'fp:sha256:' + 'a'.repeat(24);
const CURRENT = 'SOURCE_CURRENT_LOCALLY' as const;
const REMOTE = 'REMOTE_FRESHNESS_CONFIRMED' as const;
const STALE = 'LOCAL_TRACKING_REF_ONLY' as const;
const UNKNOWN = 'UNKNOWN' as const;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recordAt(value: MutableRecord, key: string): MutableRecord {
  return value[key] as MutableRecord;
}

function arrayAt(value: MutableRecord, key: string): unknown[] {
  return value[key] as unknown[];
}

function invoke(validator: (value: unknown) => void, value: unknown): { readonly accepted: boolean; readonly reason: string | null } {
  try {
    validator(value);
    return { accepted: true, reason: null };
  } catch (error) {
    return { accepted: false, reason: error instanceof Error ? error.message : 'NON_ERROR_THROW' };
  }
}

async function minimization(): Promise<MinimizationResult> {
  return minimizeFailure({
    originalSequence: ['a1', 'a2', 'a3'].map((actionId) => ({
      actionId,
      semanticClass: 'KNOWN_READ' as const,
      routeClass: '/synthetic/read',
      sourceApproved: true as const,
      catalogVersion: 'synthetic.catalog.v1',
    })),
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['a1', 'a2', 'a3']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: SYNTHETIC_MINIMIZATION_BUDGET,
    replay: (sequence) => {
      const reproduces = sequence.some((action) => action.actionId === 'a1');
      return {
        status: reproduces ? 'FAILURE' as const : 'PASS' as const,
        ...(reproduces ? { anomalyFingerprint: FP } : {}),
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
      };
    },
  });
}

async function dossierInputs() {
  const minimized = await minimization();
  const differential = compareBrowserAndApi(
    { failed: true, routeClass: '/synthetic/read', structuralState: 'table-missing', operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'synthetic' },
    { available: true, failed: false, operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: `fp:sha256:${'b'.repeat(24)}` },
  );
  const source = correlateSourceChanges({
    journeyIds: ['ripple-payer-exchange-read'],
    sourceFreshness: STALE,
    changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
  });
  const boundary = localizeFaultBoundary({
    authInvalid: false,
    routeDiverged: false,
    structuralDiverged: true,
    browserRuntimeFailure: false,
    resourceFailure: false,
    apiAvailable: true,
    apiFailed: false,
    apiProtocolMismatch: false,
    sourceCandidates: source.candidates,
  });
  const confidence = rankConfidence({
    freshContextReproductions: 2,
    minimalSequenceReproductions: minimized.reproductionCount,
    browserApiDifferential: differential.status,
    sourceRelevance: source.overallRelevance,
    oracleReliable: true,
    knownFalsePositive: false,
    safetyClean: true,
  });
  return { minimized, differential, source, boundary, confidence };
}

async function v1Dossier() {
  const input = await dossierInputs();
  return createBugDossier({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0001'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: FP,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: ['deployment-status-unresolved'],
  });
}

async function v2Dossier(knownNightwatchDefect: string | null = null) {
  const input = await dossierInputs();
  return createBugDossierV2({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0002'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: FP,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'LOW',
    triagePriority: rankTriagePriority({ technicalSeverity: 'LOW', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: knownNightwatchDefect !== null }),
    knownNightwatchDefect,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticTriageEvidence: null,
  });
}

function commonMutations(): readonly Mutation[] {
  return [
    { id: 'candidateId_type', mutate: (value) => { value.candidateId = 7; } },
    { id: 'candidateId_malformed', mutate: (value) => { value.candidateId = 'candidate-bad'; } },
    { id: 'title_type', mutate: (value) => { value.title = 7; } },
    { id: 'firstObserved_malformed', mutate: (value) => { value.firstObserved = 'not-a-timestamp'; } },
    { id: 'lastObserved_malformed', mutate: (value) => { value.lastObserved = 'not-a-timestamp'; } },
    { id: 'observed_chronology_reversed', mutate: (value) => { value.firstObserved = '2026-08-27T00:00:00.000Z'; value.lastObserved = '2026-08-26T00:00:00.000Z'; } },
    { id: 'journeys_type', mutate: (value) => { value.journeys = 'not-an-array'; } },
    { id: 'journeys_member_type', mutate: (value) => { value.journeys = [7]; } },
    { id: 'journeys_duplicate', mutate: (value) => { value.journeys = ['same', 'same']; } },
    { id: 'seeds_type', mutate: (value) => { value.seeds = 'not-an-array'; } },
    { id: 'seeds_member_type', mutate: (value) => { value.seeds = [7]; } },
    { id: 'minimalSequence_type', mutate: (value) => { value.minimalSequence = 'not-an-array'; } },
    { id: 'minimalSequence_member_type', mutate: (value) => { value.minimalSequence = [7]; } },
    { id: 'routeClass_type', mutate: (value) => { value.routeClass = 7; } },
    { id: 'apiOperationFamily_type', mutate: (value) => { value.apiOperationFamily = 7; } },
    { id: 'oracleFingerprint_malformed', mutate: (value) => { value.oracleFingerprint = 'bad-fingerprint'; } },
    { id: 'evidenceLevel_invalid', mutate: (value) => { value.evidenceLevel = 'L9'; } },
    { id: 'reproduction_missing_result', mutate: (value) => { delete recordAt(value, 'reproduction').result; } },
    { id: 'reproduction_invalid_result', mutate: (value) => { recordAt(value, 'reproduction').result = 'INVALID'; } },
    { id: 'reproduction_negative_count', mutate: (value) => { recordAt(value, 'reproduction').count = -1; } },
    { id: 'reproduction_fractional_count', mutate: (value) => { recordAt(value, 'reproduction').count = 1.5; } },
    { id: 'reproduction_unknown_nested_field', mutate: (value) => { recordAt(value, 'reproduction').future = true; } },
    { id: 'browserApiDifferential_malformed', mutate: (value) => { value.browserApiDifferential = null; } },
    { id: 'browserApiDifferential_unknown_nested_field', mutate: (value) => { recordAt(value, 'browserApiDifferential').future = true; } },
    { id: 'sourceChangeCandidates_non_array', mutate: (value) => { value.sourceChangeCandidates = 'not-an-array'; } },
    { id: 'sourceCandidate_missing_field', mutate: (value) => { delete (arrayAt(value, 'sourceChangeCandidates')[0] as MutableRecord).relevance; } },
    { id: 'sourceCandidate_invalid_relevance', mutate: (value) => { (arrayAt(value, 'sourceChangeCandidates')[0] as MutableRecord).relevance = 'INVALID'; } },
    { id: 'sourceCandidate_invalid_confidence', mutate: (value) => { (arrayAt(value, 'sourceChangeCandidates')[0] as MutableRecord).confidence = 'INVALID'; } },
    { id: 'sourceCandidate_invalid_freshness', mutate: (value) => { (arrayAt(value, 'sourceChangeCandidates')[0] as MutableRecord).sourceFreshness = 'INVALID'; } },
    { id: 'likelyFaultBoundary_malformed', mutate: (value) => { value.likelyFaultBoundary = {}; } },
    { id: 'confidence_malformed', mutate: (value) => { value.confidence = {}; } },
    { id: 'technicalSeverity_invalid', mutate: (value) => { value.technicalSeverity = 'INVALID'; } },
    { id: 'triagePriority_invalid', mutate: (value) => { value.triagePriority = 'INVALID'; } },
    { id: 'alternativesRuledOut_type', mutate: (value) => { value.alternativesRuledOut = 'not-an-array'; } },
    { id: 'missingEvidence_member_type', mutate: (value) => { value.missingEvidence = [7]; } },
    { id: 'semanticEvidence_malformed', mutate: (value) => { value.semanticEvidence = { schemaVersion: 'wrong' }; } },
    { id: 'root_unknown_field', mutate: (value) => { value.unknownNestedAuthority = true; } },
    { id: 'sentinel_payload', mutate: (value) => { value.title = 'CUSTOMER_SENTINEL'; } },
    { id: 'root_custom_prototype', mutate: (value) => { Object.setPrototypeOf(value, { hostile: true }); } },
    { id: 'nested_custom_prototype', mutate: (value) => { Object.setPrototypeOf(recordAt(value, 'reproduction'), { hostile: true }); } },
  ];
}

function v2OnlyMutations(): readonly Mutation[] {
  return [
    { id: 'status_invalid', mutate: (value) => { value.status = 'INVALID'; } },
    { id: 'semanticConfidence_invalid_reasons', mutate: (value) => { value.semanticConfidence = { level: 'HIGH', reasons: 7, blockers: [] }; } },
    { id: 'semanticTriageEvidence_malformed', mutate: (value) => { value.semanticTriageEvidence = { schemaVersion: 'wrong' }; } },
    { id: 'humanRecipe_missing_observation', mutate: (value) => { delete recordAt(value, 'humanReproductionRecipe').observation; } },
    { id: 'humanRecipe_invalid_actionIds', mutate: (value) => { recordAt(value, 'humanReproductionRecipe').actionIds = [7]; } },
    { id: 'aiReady_missing_allowedUses', mutate: (value) => { delete recordAt(value, 'aiReady').allowedUses; } },
    { id: 'aiReady_invalid_evidence', mutate: (value) => { recordAt(value, 'aiReady').evidence = []; } },
    { id: 'required_nested_incomplete', mutate: (value) => { value.reproduction = {}; } },
    { id: 'nested_unknown_field', mutate: (value) => { recordAt(value, 'aiReady').future = true; } },
    { id: 'semanticConfidence_unknown_field', mutate: (value) => { value.semanticConfidence = { level: 'HIGH', reasons: [], blockers: [], future: true }; } },
  ];
}

function mutationRows(base: unknown, mutations: readonly Mutation[], owning: (value: unknown) => void) {
  return mutations.map((mutation) => {
    const mutated = cloneJson(base) as MutableRecord;
    mutation.mutate(mutated);
    const owner = invoke(owning, mutated);
    const facade = validateArtifact('dossier', mutated);
    return { id: mutation.id, owner, facade: facade.valid ? { accepted: true, reason: null } : { accepted: false, reason: facade.reason } };
  });
}

function freshnessDossier(base: MutableRecord, values: readonly string[]): MutableRecord {
  const source = arrayAt(base, 'sourceChangeCandidates')[0] as MutableRecord;
  const result = {
    ...cloneJson(base),
    sourceChangeCandidates: values.map((sourceFreshness, index) => ({
      ...cloneJson(source),
      edgeId: `synthetic-edge-${index}`,
      path: `src/reader-${index}.ts`,
      sourceFreshness,
    })),
  };
  recordAt(recordAt(result, 'aiReady'), 'evidence').sourceCandidateCount = values.length;
  return result;
}

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-durable-artifact-truth-'));
  fs.chmodSync(root, 0o700);
  return root;
}

function permutations(values: readonly string[]): readonly (readonly string[])[] {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]));
}

function authorityForDossier(dossier: MutableRecord): FindingsAuthoritySnapshot {
  const root = tempRoot();
  try {
    const store = new PrivateArtifactStore({ root });
    store.writeJson('candidate-synthetic.json', dossier);
    return createFindingsAuthorityForTests(root).snapshot();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test.describe('durable dossier mutation regression probes', () => {
  test('owning validators and the facade reject every bounded v1 mutation', async () => {
    const dossier = await v1Dossier();
    expect(validateArtifact('dossier', dossier).valid).toBe(true);
    const rows = mutationRows(dossier, commonMutations(), (value) => { validateBugDossier(value as never); });
    console.log(`AFTER_DOSSIER_V1_MUTATION_LEDGER=${JSON.stringify(rows)}`);
    expect(rows).toHaveLength(commonMutations().length);
    expect(rows.filter((row) => row.owner.accepted || row.facade.accepted)).toEqual([]);
  });

  test('owning validators and the facade reject every bounded v2 mutation', async () => {
    const dossier = await v2Dossier();
    expect(validateArtifact('dossier', dossier).valid).toBe(true);
    const rows = mutationRows(dossier, [...commonMutations(), ...v2OnlyMutations()], (value) => { validateBugDossierV2(value); });
    console.log(`AFTER_DOSSIER_V2_MUTATION_LEDGER=${JSON.stringify(rows)}`);
    const unresolved = await v2Dossier('known-synthetic-defect');
    expect(unresolved.status).toBe('UNRESOLVED');
    expect(validateBugDossierV2(unresolved)).toBeUndefined();
    expect(validateArtifact('dossier', unresolved).valid).toBe(true);
    expect(rows).toHaveLength(commonMutations().length + v2OnlyMutations().length);
    expect(rows.filter((row) => row.owner.accepted || row.facade.accepted)).toEqual([]);
  });
});

test.describe('Control Center currentness regression probes', () => {
  test('keeps raw adapter, authority, and normal collector paths conservative and equivalent', async () => {
    const base = await v1Dossier();
    const multisets: readonly { readonly id: string; readonly values: readonly string[] }[] = [
      { id: 'current-only', values: [CURRENT] },
      { id: 'remote-only', values: [REMOTE] },
      { id: 'current-remote', values: [CURRENT, REMOTE] },
      { id: 'current-stale', values: [CURRENT, STALE] },
      { id: 'remote-stale', values: [REMOTE, STALE] },
      { id: 'current-unknown', values: [CURRENT, UNKNOWN] },
      { id: 'stale-unknown', values: [STALE, UNKNOWN] },
      { id: 'unknown-unknown', values: [UNKNOWN, UNKNOWN] },
      { id: 'stale-only', values: [STALE] },
      { id: 'unknown-only', values: [UNKNOWN] },
      { id: 'empty', values: [] },
      { id: 'maximum-current-members', values: Array.from({ length: 256 }, () => CURRENT) },
    ];
    const cases = multisets.flatMap((item) => item.id === 'maximum-current-members'
      ? [{ id: item.id, values: item.values }]
      : permutations(item.values).map((values, index) => ({ id: `${item.id}-${index + 1}`, values })));
    const rows = [] as Array<Record<string, unknown>>;
    for (const item of cases) {
      const dossier = freshnessDossier(dossierToRecord(base), item.values);
      const raw = projectFindings({ dossiers: [dossier as never] });
      const authority = authorityForDossier(dossier);
      const metadata = authority.dossiers[0];
      const projected = projectFindings({ dossiers: metadata === undefined ? [] : [metadata] as never[], state: authority.state });
      const sourceAuthority = { snapshot: () => ({ schemaVersion: 'nightwatch.control-center-source-authority.v1' as const, state: 'UNKNOWN' as const, inventoryDigest: null, repositoryCount: 0, repositoryStatuses: [], discovery: null, phase24: null, generation: null, reasonCodes: ['SOURCE_DISCOVERY_UNAVAILABLE'] as const }) };
      const campaignAuthority = { snapshot: () => ({ schemaVersion: 'nightwatch.control-center-campaign-authority.v1' as const, state: 'UNKNOWN' as const, sourceCurrentness: 'AMBIGUOUS' as const, plan: null, coverage: null, findingCount: 0, blockerCodes: ['CAMPAIGN_COMPOSITION_UNAVAILABLE'], sourceCurrentnessByMemberId: {}, sourceGeneration: null, generation: null }) };
      const findingsAuthority = { snapshot: () => authority };
      const collector = createDefaultControlCenterCollector({ sourceAuthority, campaignAuthority, findingsAuthority, sourceSnapshotTtlMs: 10_000 });
      const collected = await collector.findings({ limit: 50, cursor: null });
      const expected = item.values.length === 0 || item.values.includes(UNKNOWN)
        ? 'SOURCE_UNAVAILABLE'
        : item.values.includes(STALE) ? 'SOURCE_STALE' : 'CURRENT';
      expect(metadata?.sourceCurrentness, item.id).toBe(expected);
      expect(projected.items[0]?.sourceCurrentness, item.id).toBe(expected);
      expect(collected.items[0]?.sourceCurrentness, item.id).toBe(expected);
      rows.push({ id: item.id, values: item.values, raw: raw.items[0]?.sourceCurrentness ?? null, authority: metadata?.sourceCurrentness ?? null, projected: projected.items[0]?.sourceCurrentness ?? null, collected: collected.items[0]?.sourceCurrentness ?? null });
    }
    console.log(`AFTER_CURRENTNESS_TRUTH_TABLE=${JSON.stringify(rows)}`);
    expect(rows).toHaveLength(cases.length);
  });

  test('rejects malformed freshness before authority metadata and keeps labels stable through sanitization', async () => {
    const base = await v1Dossier();
    const malformed = freshnessDossier(dossierToRecord(base), [CURRENT, 'NOT_A_FRESHNESS']);
    expect(validateArtifact('dossier', malformed).valid).toBe(false);
    const authority = authorityForDossier(malformed);
    expect(authority.state).toBe('UNKNOWN');
    expect(authority.dossiers).toHaveLength(0);
    const raw = projectFindings({ dossiers: [malformed as never] });
    expect(raw.items[0]?.sourceCurrentness).toBe('SOURCE_UNAVAILABLE');
  });

  test('allows duplicate source candidates without weakening conservative aggregation', async () => {
    const base = await v1Dossier();
    const duplicated = freshnessDossier(dossierToRecord(base), [CURRENT, CURRENT]);
    const candidates = arrayAt(duplicated, 'sourceChangeCandidates');
    candidates[1] = cloneJson(candidates[0]);
    expect(validateArtifact('dossier', duplicated).valid).toBe(true);
    const authority = authorityForDossier(duplicated);
    expect(authority.dossiers[0]?.sourceCurrentness).toBe('CURRENT');
  });

  test('changes findings generation when the authoritative source currentness changes', async () => {
    const base = await v1Dossier();
    const root = tempRoot();
    try {
      const store = new PrivateArtifactStore({ root });
      const fileName = 'candidate-generation.json';
      store.writeJson(fileName, freshnessDossier(dossierToRecord(base), [CURRENT]));
      const current = createFindingsAuthorityForTests(root).snapshot();
      store.writeJson(fileName, freshnessDossier(dossierToRecord(base), [STALE]));
      const stale = createFindingsAuthorityForTests(root).snapshot();
      expect(current.state).toBe('AVAILABLE');
      expect(stale.state).toBe('AVAILABLE');
      expect(current.dossiers[0]?.sourceCurrentness).toBe('CURRENT');
      expect(stale.dossiers[0]?.sourceCurrentness).toBe('SOURCE_STALE');
      expect(stale.generation).not.toBe(current.generation);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('collector rejects a malformed authority snapshot instead of upgrading it to AVAILABLE', async () => {
    const base = await v1Dossier();
    const valid = authorityForDossier(freshnessDossier(dossierToRecord(base), [CURRENT]));
    const malformed = {
      ...valid,
      state: 'AVAILABLE' as const,
      dossiers: valid.dossiers.map((dossier) => ({ ...dossier, sourceCurrentness: 'CURRENTISH' })),
    } as unknown as FindingsAuthoritySnapshot;
    const sourceAuthority = { snapshot: () => ({ schemaVersion: 'nightwatch.control-center-source-authority.v1' as const, state: 'UNKNOWN' as const, inventoryDigest: null, repositoryCount: 0, repositoryStatuses: [], discovery: null, phase24: null, generation: null, reasonCodes: ['SOURCE_DISCOVERY_UNAVAILABLE'] as const }) };
    const campaignAuthority = { snapshot: () => ({ schemaVersion: 'nightwatch.control-center-campaign-authority.v1' as const, state: 'UNKNOWN' as const, sourceCurrentness: 'AMBIGUOUS' as const, plan: null, coverage: null, findingCount: 0, blockerCodes: ['CAMPAIGN_COMPOSITION_UNAVAILABLE'], sourceCurrentnessByMemberId: {}, sourceGeneration: null, generation: null }) };
    const collector = createDefaultControlCenterCollector({
      sourceAuthority,
      campaignAuthority,
      findingsAuthority: { snapshot: () => malformed },
      sourceSnapshotTtlMs: 10_000,
    });
    const findings = await collector.findings({ limit: 50, cursor: null });
    expect(findings.state).toBe('UNAVAILABLE');
    expect(findings.items).toEqual([]);
  });
});

function dossierToRecord(value: unknown): MutableRecord {
  return cloneJson(value) as MutableRecord;
}
