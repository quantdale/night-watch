// ---------------------------------------------------------------------------
// Schema version lifecycle — declarations, dispositions and read proofs.
//
// This suite is the structural rule's teeth:
//   - the live tree is scanned and every identifier is declared exactly once;
//   - a synthetic undeclared literal, stale declaration, missing disposition,
//     unrecorded ORPHAN and orphaned fixture each FAIL the validator;
//   - every READ_COMPATIBLE disposition is proven by feeding a fixture at the
//     accepted version through the REAL current reader;
//   - every SYNTHETIC_PROBE version is backed by its adversarial corpus.
//
// Removing support for an accepted version (a reader that stops accepting it,
// a deleted fixture, or a deleted declaration) fails this suite rather than
// passing silently.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  SCHEMA_FAMILIES,
  READ_COMPATIBILITY_FIXTURES,
  SYNTHETIC_PROBE_EVIDENCE,
  discoverSchemaIdentifiers,
  runSchemaLifecycleCheck,
  validateSchemaLifecycle,
  type DiscoveredSchemaIdentifier,
  type SchemaFamilyDeclaration,
} from '../../src/core/schemaLifecycle';
import { digest } from '../../src/core/aiReview/util';
import {
  AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION,
  AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION,
  AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_BUG_DRAFT_SCHEMA_VERSION,
  AI_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_PROVIDER_ADAPTER_VERSION,
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  AI_REVIEW_PROMPT_TEMPLATE_VERSION,
  PASS_AI_PRIVACY,
  ZERO_AI_SAFETY,
} from '../../src/core/aiReview/types';
import {
  validateLegacyAiBugDraft,
  validateLegacyAiHumanReviewRecord,
  validateLegacyAiOracleSuggestion,
} from '../../src/core/aiReview/validation';
import { validateDossierArtifact } from '../../src/core/artifactValidation/dossierKindValidation';
import { createIncompleteDossier } from '../../src/core/triage/dossier';
import { createTriageReplayPlan, validateTriageReplayPlan } from '../../src/core/triage/replayPlan';
import { parseCampaignStrategyState } from '../../src/core/investigationMemory/derive';
import { createFrozenPhase22Manifest, validatePhase22Manifest } from '../../src/core/phase22/manifest';
import { validateRealSourceRecipe } from '../../src/oracles/expectations/recipes/validator';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_LEGACY_EVALUATION_SCHEMA_VERSION,
  SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  ZERO_SELFDEV_SAFETY_VECTOR,
} from '../../src/core/selfDev/types';
import { validateLegacySessionArtifact } from '../../src/core/selfDev/validation';
import {
  buildSemanticEvaluationReceipt,
  SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
  validateSemanticEvaluationReceipt,
} from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_EXPECTATION_RECIPE_VERSION } from '../../src/oracles/expectations/recipes/types';

const ROOT = path.resolve(__dirname, '..', '..');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'DECISIONS.md');

function discovered(identifier: string, file = 'src/synthetic.ts'): DiscoveredSchemaIdentifier {
  const match = /^(nightwatch\.[A-Za-z0-9_.-]+)\.v([0-9]+)$/.exec(identifier);
  if (match === null) throw new Error(`bad test identifier ${identifier}`);
  return { identifier, family: match[1] as string, version: Number(match[2]), files: [file] };
}

function decisionsText(): string {
  return fs.readFileSync(DECISIONS_PATH, 'utf8');
}

function judgement(overrides: {
  readonly discovered?: readonly DiscoveredSchemaIdentifier[];
  readonly declarations?: readonly SchemaFamilyDeclaration[];
  readonly decisions?: string;
  readonly registeredFixtureIds?: readonly string[];
  readonly registeredMigrationIds?: readonly string[];
}) {
  const declarations = overrides.declarations ?? [];
  // For synthetic cases the registries default to exactly the ids the
  // declarations reference, so an unrelated global fixture is not reported as
  // orphaned by a test that is about a different rule. The dedicated orphan
  // test overrides this.
  const referencedFixtures = declarations.flatMap((declaration) =>
    declaration.dispositions.flatMap((disposition) => (disposition.fixtureId === undefined ? [] : [disposition.fixtureId])),
  );
  return validateSchemaLifecycle({
    discovered: overrides.discovered ?? [],
    declarations,
    decisionsText: overrides.decisions ?? decisionsText(),
    registeredMigrationIds: overrides.registeredMigrationIds
      ?? declarations.flatMap((declaration) => declaration.dispositions.flatMap((disposition) => (disposition.migrationId === undefined ? [] : [disposition.migrationId]))),
    registeredFixtureIds: overrides.registeredFixtureIds ?? referencedFixtures,
  });
}

// ---------------------------------------------------------------------------
// 17.1 / 17.2 — the live declaration inventory
// ---------------------------------------------------------------------------

test.describe('schema version lifecycle — declarations', () => {
  test('the live tree validates: every discovered identifier is declared exactly once, non-vacuously', () => {
    const result = runSchemaLifecycleCheck({ root: ROOT });
    expect(result.judgement.findings).toEqual([]);
    expect(result.judgement.ok).toBe(true);
    // The audit measured 319 identifiers at 36bd493. A floor rather than an
    // equality: growth is legitimate, a scanner that stops matching is not.
    expect(result.judgement.discoveredCount).toBeGreaterThanOrEqual(319);
    expect(result.judgement.familyCount).toBe(SCHEMA_FAMILIES.length);
    expect(result.judgement.persistedFamilyCount).toBeGreaterThan(0);
    expect(result.judgement.fixtureCount).toBeGreaterThan(0);
    expect(result.judgement.migrationCount).toBe(1);
  });

  test('a zero-identifier scan fails before declarations are evaluated', () => {
    const result = judgement({ discovered: [] });
    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_SCAN_EMPTY');
  });

  test('an undeclared literal fails naming the identifier and its file', () => {
    const result = judgement({
      discovered: [discovered('nightwatch.undeclared-synthetic.v1', 'src/core/undeclared.ts')],
      declarations: [],
    });
    const finding = result.findings.find((entry) => entry.code === 'SCHEMA_UNDECLARED');
    expect(finding?.detail).toContain('nightwatch.undeclared-synthetic.v1');
    expect(finding?.detail).toContain('src/core/undeclared.ts');
  });

  test('a declaration naming a schema that no longer exists fails', () => {
    const result = judgement({
      discovered: [discovered('nightwatch.live-synthetic.v1')],
      declarations: [
        { family: 'nightwatch.live-synthetic', persisted: false, store: 'IN_MEMORY', currentVersion: 1, versions: { 1: 'CURRENT' }, dispositions: [], note: '' },
        { family: 'nightwatch.retired-synthetic', persisted: false, store: 'IN_MEMORY', currentVersion: 1, versions: { 1: 'CURRENT' }, dispositions: [], note: '' },
      ],
    });
    const finding = result.findings.find((entry) => entry.code === 'SCHEMA_DECLARATION_STALE');
    expect(finding?.detail).toContain('nightwatch.retired-synthetic.v1');
  });

  test('the scanner deduplicates per file and includes the declaring files', () => {
    const files = [
      { path: 'src/a.ts', text: "const a = 'nightwatch.alpha.v1'; const b = 'nightwatch.alpha.v1';" },
      { path: 'src/b.ts', text: "const c = 'nightwatch.alpha.v1';" },
      { path: 'outside.ts', text: "const d = 'nightwatch.ignored.v1';" },
    ];
    const found = discoverSchemaIdentifiers(files);
    expect(found.map((entry) => entry.identifier)).toEqual(['nightwatch.alpha.v1']);
    expect(found[0]?.files).toEqual(['src/a.ts', 'src/b.ts']);
  });

  test('the schema-lifecycle bin executes check as a process and reports the same judgement', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'schema-lifecycle.mjs'), 'check', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    expect(result.status).toBe(0);
    const judgement = JSON.parse(result.stdout) as { schemaVersion: string; ok: boolean; discoveredCount: number };
    expect(judgement.schemaVersion).toBe('nightwatch.schema-version-lifecycle.v1');
    expect(judgement.ok).toBe(true);
    expect(judgement.discoveredCount).toBeGreaterThanOrEqual(319);
  });

  test('the bump-report reports the declared disposition and the affected store count from disk', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-schema-bump-'));
    fs.writeFileSync(
      path.join(root, `${'a'.repeat(24)}.checkpoint.json`),
      JSON.stringify({
        schemaVersion: 'nightwatch.agent-checkpoint.v1',
        state: { budget: { policy: { schemaVersion: 'nightwatch.agent-budget.v1' } } },
      }),
      { mode: 0o600 },
    );
    const result = spawnSync(process.execPath, [
      path.join(ROOT, 'bin', 'schema-lifecycle.mjs'),
      'bump-report',
      '--schema=nightwatch.agent-budget',
      '--from=1',
      '--to=2',
      `--root=${root}`,
      '--json',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      disposition: string | null;
      ok: boolean;
      impacts: readonly { readonly store: string; readonly affectedRecords: number }[];
    };
    expect(report.disposition).toBe('MIGRATE');
    expect(report.ok).toBe(true);
    expect(report.impacts.find((impact) => impact.store === 'AGENT_RECORDS')?.affectedRecords).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 17.3 / 17.7 — dispositions, and ORPHAN as a recorded decision
// ---------------------------------------------------------------------------

const BUMP_DISCOVERED = [discovered('nightwatch.bump-synthetic.v1'), discovered('nightwatch.bump-synthetic.v2')];

function bumpDeclaration(overrides: Partial<SchemaFamilyDeclaration> = {}): SchemaFamilyDeclaration {
  return {
    family: 'nightwatch.bump-synthetic',
    persisted: true,
    store: 'REVIEW_STORE',
    currentVersion: 2,
    versions: { 1: 'READ_COMPATIBLE', 2: 'CURRENT' },
    dispositions: [
      { fromVersion: 1, toVersion: 2, kind: 'READ_COMPATIBLE', fixtureId: 'bug-dossier-v1', reason: 'synthetic proof reuses a registered fixture id' },
    ],
    note: '',
    ...overrides,
  };
}

test.describe('schema version lifecycle — dispositions', () => {
  test('a persisted bump with no disposition fails', () => {
    const result = judgement({
      discovered: BUMP_DISCOVERED,
      declarations: [bumpDeclaration({ versions: { 1: 'IN_MEMORY_HISTORICAL', 2: 'CURRENT' }, dispositions: [] })],
    });
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_DISPOSITION_MISSING');
  });

  test('a persisted family with no CURRENT version fails', () => {
    const result = judgement({
      discovered: BUMP_DISCOVERED,
      declarations: [bumpDeclaration({ currentVersion: null, versions: { 1: 'READ_COMPATIBLE', 2: 'READ_COMPATIBLE' } })],
    });
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_CURRENT_VERSION_INVALID');
  });

  test('an in-memory family carrying a disposition fails', () => {
    const result = judgement({
      discovered: BUMP_DISCOVERED,
      declarations: [bumpDeclaration({ persisted: false, store: 'IN_MEMORY' })],
    });
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_MEMORY_DISPOSITION_PRESENT');
  });

  test('an unknown runtime disposition kind fails closed rather than defaulting to ORPHAN', () => {
    // 17.4: no disposition is the presumed default. A declaration carrying a
    // kind outside the closed vocabulary must mismatch its version role, not
    // silently cover an ORPHANED version.
    const result = judgement({
      discovered: BUMP_DISCOVERED,
      declarations: [
        bumpDeclaration({
          versions: { 1: 'ORPHANED', 2: 'CURRENT' },
          dispositions: [{ fromVersion: 1, toVersion: 2, kind: 'DEFAULT' as never, reason: 'an out-of-vocabulary kind must not cover an ORPHANED role' }],
        }),
      ],
    });
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_DISPOSITION_ROLE_MISMATCH');
  });

  test('ORPHAN without a recorded decision fails; with the D-126 heading it passes', () => {
    const orphan = bumpDeclaration({
      versions: { 1: 'ORPHANED', 2: 'CURRENT' },
      dispositions: [{ fromVersion: 1, toVersion: 2, kind: 'ORPHAN', decisionRef: 'D-126', reason: 'old bytes deliberately unreadable' }],
    });
    const absent = judgement({ discovered: BUMP_DISCOVERED, declarations: [orphan], decisions: '# Decisions\n\nno headings here\n' });
    expect(absent.findings.map((finding) => finding.code)).toContain('SCHEMA_ORPHAN_DECISION_MISSING');
    const present = judgement({ discovered: BUMP_DISCOVERED, declarations: [orphan], decisions: '# Decisions\n\n## D-126 — orphan is a recorded decision\n' });
    expect(present.findings).toEqual([]);
  });

  test('a registered fixture that proves nothing fails', () => {
    const result = judgement({
      discovered: BUMP_DISCOVERED,
      declarations: [bumpDeclaration({ versions: { 1: 'MIGRATED', 2: 'CURRENT' }, dispositions: [] })],
    });
    const codes = result.findings.map((finding) => finding.code);
    expect(codes).toContain('SCHEMA_DISPOSITION_MISSING');
  });

  test('a registered read-compatibility fixture is orphaned when no disposition references it', () => {
    // Empty declarations means every registered fixture proves nothing.
    const result = judgement({
      discovered: [discovered('nightwatch.only.v1')],
      declarations: [],
      registeredFixtureIds: READ_COMPATIBILITY_FIXTURES.map((fixture) => fixture.fixtureId),
    });
    expect(result.findings.map((finding) => finding.code)).toContain('SCHEMA_FIXTURE_ORPHANED');
  });
});

// ---------------------------------------------------------------------------
// 17.6 — READ_COMPATIBLE proof: a fixture read at each accepted version
// ---------------------------------------------------------------------------

/** Minimal safe digest used by manually built AI fixtures. */
const HEX64 = 'a'.repeat(64);

function legacyAiBugDraft(): Record<string, unknown> {
  const base = {
    schemaVersion: AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION,
    inputPackageId: 'input-package:test-1',
    inputPackageDigest: `sha256:${HEX64}`,
    candidateId: 'finding:test-1',
    evidenceLevelAtGeneration: 'L2',
    modelProviderClass: 'SYNTHETIC_LOCAL',
    modelIdentifier: 'synthetic-test',
    promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION,
    inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    providerAdapterVersion: AI_PROVIDER_ADAPTER_VERSION,
    dossierVersion: 'nightwatch.bug-dossier.private.v1',
    generatedAt: '2026-01-01T00:00:00Z',
    status: 'OWNER_APPROVED_DRAFT',
    provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED',
    summaryDraft: 'Synthetic summary for the schema lifecycle proof.',
    reproductionDraft: 'Synthetic reproduction steps.',
    observedBehaviorDraft: 'Synthetic observed behavior.',
    expectedBehaviorDraft: 'Synthetic expected behavior.',
    impactDraft: 'Synthetic impact statement.',
    hypotheses: [],
    evidenceRefs: ['evidence:one'],
    sourceRefs: ['source:one'],
    sourceSnapshotRefs: ['snapshot:one'],
    uncertainties: ['Synthetic uncertainty.'],
    responseDigest: `sha256:${HEX64}`,
    humanReviewRequired: true,
    externalPublication: 'PROHIBITED',
    safety: { ...ZERO_AI_SAFETY },
    privacy: { ...PASS_AI_PRIVACY },
  };
  const draftId = `draft:${digest({
    schemaVersion: base.schemaVersion,
    inputPackageDigest: base.inputPackageDigest,
    providerClass: base.modelProviderClass,
    modelIdentifier: base.modelIdentifier,
    promptTemplateVersion: base.promptTemplateVersion,
    inputSchemaVersion: base.inputSchemaVersion,
    responseDigest: base.responseDigest,
  })}`;
  const modelInvocationId = `invocation:${digest({
    inputPackageDigest: base.inputPackageDigest,
    providerClass: base.modelProviderClass,
    modelIdentifier: base.modelIdentifier,
    promptTemplateVersion: base.promptTemplateVersion,
    responseDigest: base.responseDigest,
  })}`;
  return { ...base, draftId, modelInvocationId };
}

function legacyAiOracleSuggestion(): Record<string, unknown> {
  const base = {
    schemaVersion: AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION,
    inputChangePackageId: 'change-package:test-1',
    inputChangePackageDigest: `sha256:${HEX64}`,
    modelProviderClass: 'SYNTHETIC_LOCAL',
    modelIdentifier: 'synthetic-test',
    promptTemplateVersion: AI_REVIEW_PROMPT_TEMPLATE_VERSION,
    inputSchemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    providerAdapterVersion: AI_PROVIDER_ADAPTER_VERSION,
    generatedAt: '2026-01-01T00:00:00Z',
    changeEvidenceRefs: ['change:one'],
    sourceSnapshotRefs: ['snapshot:one'],
    affectedSurface: 'surface-alpha',
    proposedInvariant: 'The alpha surface keeps its observed shape.',
    proposedObservationClasses: ['class-alpha'],
    rationale: 'Synthetic rationale for the schema lifecycle proof.',
    possibleFalsePositiveModes: ['mode-alpha'],
    requiredDeterministicEvidence: ['evidence-alpha'],
    requiredFixtureCoverage: ['fixture-alpha'],
    riskNotes: ['risk-alpha'],
    humanReviewRequired: true,
    executable: false,
    status: 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW',
    provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED',
    externalPublication: 'PROHIBITED',
    safety: { ...ZERO_AI_SAFETY },
    privacy: { ...PASS_AI_PRIVACY },
    responseDigest: `sha256:${HEX64}`,
  };
  const suggestionId = `suggestion:${digest({
    schemaVersion: base.schemaVersion,
    inputChangePackageDigest: base.inputChangePackageDigest,
    providerClass: base.modelProviderClass,
    modelIdentifier: base.modelIdentifier,
    promptTemplateVersion: base.promptTemplateVersion,
    inputSchemaVersion: base.inputSchemaVersion,
    responseDigest: base.responseDigest,
  })}`;
  const modelInvocationId = `invocation:${digest({
    inputChangePackageDigest: base.inputChangePackageDigest,
    providerClass: base.modelProviderClass,
    modelIdentifier: base.modelIdentifier,
    promptTemplateVersion: base.promptTemplateVersion,
    responseDigest: base.responseDigest,
  })}`;
  return { ...base, suggestionId, modelInvocationId };
}

function legacyAiHumanReview(): Record<string, unknown> {
  return {
    schemaVersion: AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION,
    artifactId: 'draft:test-1',
    artifactKind: 'BUG_DRAFT',
    decision: 'APPROVE_DRAFT',
    reviewedAt: '2026-01-01T00:00:00Z',
    reviewerClass: 'OWNER',
    notes: 'Synthetic review note.',
    artifactDigest: `sha256:${HEX64}`,
    reviewSchemaVersion: AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION,
    publication: 'PROHIBITED',
  };
}

function legacySelfDevSession(): Record<string, unknown> {
  return {
    schemaVersion: SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION,
    artifactId: `session:sha256:${'c'.repeat(64)}`,
    baseNightwatchSha: 'd'.repeat(40),
    proposerClass: SELFDEV_PROPOSER_CLASS,
    candidateCount: 1,
    evaluations: [{ schemaVersion: SELFDEV_LEGACY_EVALUATION_SCHEMA_VERSION, evaluationId: `evaluation:sha256:${'e'.repeat(64)}` }],
    adoptionStatus: SELFDEV_ADOPTION_STATUS,
    publication: SELFDEV_PUBLICATION,
    sourceWrites: 0,
    gitWrites: 0,
    externalCalls: 0,
    safetyVector: { ...ZERO_SELFDEV_SAFETY_VECTOR },
  };
}

const FIXTURE_BYTES: Readonly<Record<string, () => unknown>> = Object.freeze({
  'ai-bug-draft-v1': legacyAiBugDraft,
  'ai-human-review-v1': legacyAiHumanReview,
  'ai-oracle-suggestion-v1': legacyAiOracleSuggestion,
  'bug-dossier-v1': () => createIncompleteDossier({
    anomalyFingerprint: `fp:sha256:${'a'.repeat(24)}`,
    journeyOrApiFamily: 'journey-alpha',
    missingSections: ['minimization'],
  }),
  'campaign-strategy-state-v1': () => ({
    schemaVersion: 'nightwatch.campaign-strategy-state.v1',
    campaignId: 'campaign.test.1',
    investigationsCompleted: 0,
    stagnantInvestigations: 0,
    inspectedTargets: [],
    unproductiveTargets: [],
    reproducedTargets: [],
    candidateIds: [],
    priorOutcomes: [],
  }),
  'phase22-manifest-v1': () => createFrozenPhase22Manifest({ nightwatchSha: 'a'.repeat(40), candidates: [], additionalExclusions: [] }),
  'real-source-recipe-v1': () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((entry) => entry.schemaVersion === REAL_SOURCE_EXPECTATION_RECIPE_VERSION);
    if (recipe === undefined) throw new Error('NO_V1_RECIPE_FIXTURE');
    return recipe;
  },
  'selfdev-evaluation-v1': legacySelfDevSession,
  'selfdev-session-v1': legacySelfDevSession,
  'semantic-receipt-v1': () => {
    const { acceptanceClass: _v2OnlyField, ...v2Receipt } = buildSemanticEvaluationReceipt({ oracleId: 'oracle:test-1', outcome: 'PASS' });
    return { ...v2Receipt, schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 };
  },
  'triage-replay-plan-v1': () => createTriageReplayPlan({
    candidateKind: 'JOURNEY',
    anomalyFingerprint: `fp:sha256:${'a'.repeat(24)}`,
    originalActionIds: ['action-1'],
    retainedActionIds: ['action-1'],
    phase: 'FRESH_EXACT_REPLAY',
    targetId: 'target-1',
    contractVersion: 'nightwatch.contract.v1',
    contractDigest: `sha256:${'b'.repeat(64)}`,
    catalogVersion: 'nightwatch.catalog.v1',
    sourceVersion: 'nightwatch.source.v1',
    routeClass: '/safe/route',
  }),
});

const READERS: Readonly<Record<string, (value: unknown) => unknown>> = Object.freeze({
  validateLegacyAiBugDraft: (value) => validateLegacyAiBugDraft(value),
  validateLegacyAiHumanReviewRecord: (value) => validateLegacyAiHumanReviewRecord(value),
  validateLegacyAiOracleSuggestion: (value) => validateLegacyAiOracleSuggestion(value),
  validateDossierArtifact: (value) => {
    validateDossierArtifact(value);
    return value;
  },
  parseCampaignStrategyState: (value) => {
    const parsed = parseCampaignStrategyState(value, 'campaign.test.1');
    if (parsed === null) throw new Error('CAMPAIGN_STRATEGY_V1_NOT_ACCEPTED');
    return parsed;
  },
  validatePhase22Manifest: (value) => {
    validatePhase22Manifest(value as never);
    return value;
  },
  validateRealSourceRecipe: (value) => validateRealSourceRecipe(value),
  validateLegacySessionArtifact: (value) => validateLegacySessionArtifact(value),
  validateSemanticEvaluationReceipt: (value) => {
    validateSemanticEvaluationReceipt(value as never);
    return value;
  },
  validateTriageReplayPlan: (value) => {
    const result = validateTriageReplayPlan(value);
    if (!result.valid) throw new Error(`TRIAGE_REPLAY_PLAN_V1_NOT_ACCEPTED:${result.reason}`);
    return result.plan;
  },
});

test.describe('schema version lifecycle — read-compatible proofs', () => {
  test('every READ_COMPATIBLE disposition has a fixture and the real reader accepts it at the declared version', () => {
    const declarations = SCHEMA_FAMILIES.filter((family) => family.persisted);
    const readCompatible = declarations.flatMap((family) =>
      family.dispositions
        .filter((disposition) => disposition.kind === 'READ_COMPATIBLE')
        .map((disposition) => ({ family, disposition })),
    );
    expect(readCompatible.length).toBeGreaterThanOrEqual(11);
    for (const { family, disposition } of readCompatible) {
      const fixtureId = disposition.fixtureId;
      expect(typeof fixtureId, `${family.family} fixture id`).toBe('string');
      const registered = READ_COMPATIBILITY_FIXTURES.find((fixture) => fixture.fixtureId === fixtureId);
      expect(registered, `${family.family} -> ${String(fixtureId)}`).toBeDefined();
      expect(registered?.schemaFamily).toBe(family.family);
      expect(registered?.acceptedVersion).toBe(disposition.fromVersion);
      const builder = FIXTURE_BYTES[fixtureId as string];
      const reader = READERS[registered?.readerId ?? ''];
      expect(builder, `fixture builder for ${String(fixtureId)}`).toBeDefined();
      expect(reader, `reader for ${registered?.readerId ?? ''}`).toBeDefined();
      const bytes = builder?.();
      expect(() => reader?.(bytes), `${family.family}.v${disposition.fromVersion}`).not.toThrow();
    }
  });

  test('removing support fails the proof: the v1 dossier fixture is rejected by a v2-only reader', () => {
    const v1 = createIncompleteDossier({ anomalyFingerprint: `fp:sha256:${'a'.repeat(24)}`, journeyOrApiFamily: 'journey-alpha', missingSections: ['minimization'] });
    // A v2-only reader (the shape a careless bump produces) must reject the v1 fixture.
    const reject = (value: unknown): void => {
      if ((value as { schemaVersion?: string }).schemaVersion !== 'nightwatch.bug-dossier.private.v2') throw new Error('SCHEMA_VERSION_UNSUPPORTED');
    };
    expect(() => reject(v1)).toThrow(/SCHEMA_VERSION_UNSUPPORTED/);
    expect(() => validateDossierArtifact(v1)).not.toThrow();
  });

  test('every SYNTHETIC_PROBE version has registered adversarial evidence containing the literal', () => {
    const probesByFamily = new Map<string, Set<number>>();
    for (const family of SCHEMA_FAMILIES) {
      for (const [version, role] of Object.entries(family.versions)) {
        if (role !== 'SYNTHETIC_PROBE') continue;
        if (!probesByFamily.has(family.family)) probesByFamily.set(family.family, new Set());
        probesByFamily.get(family.family)?.add(Number(version));
      }
    }
    expect(probesByFamily.size).toBeGreaterThan(0);
    for (const [family, versions] of probesByFamily) {
      for (const version of versions) {
        const evidence = SYNTHETIC_PROBE_EVIDENCE.find((probe) => probe.schemaFamily === family && probe.version === version);
        expect(evidence, `${family}.v${version}`).toBeDefined();
        const text = fs.readFileSync(path.join(ROOT, evidence?.evidencePath ?? ''), 'utf8');
        expect(text).toContain(`${family}.v${version}`);
      }
    }
  });
});
