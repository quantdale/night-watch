// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A12) — deterministic project snapshot
// + diff classification.
//
// Proves, LOCAL/SYNTHETIC only:
//   - build -> digest stability across key order (canonical serialization),
//   - UNCHANGED for identical inputs and determinism across >= 3 builds,
//   - each diff classification (UNCHANGED / COMPATIBLE_CHANGE / SEMANTIC_CHANGE
//     / AUTHORITY_CHANGE / INCOMPATIBLE_CHANGE) triggered by a minimal
//     synthetic delta,
//   - privacy screen: no sentinel leakage in serialized manifests,
//   - fail-closed input validation,
//   - real-source wiring: the CURRENT authoritative constants (lifecycle
//     registry, recipes/registry targets, analyzer/replay/receipt/dossier/
//     owner-scope versions, generated adopted-case catalog) build cleanly and
//     self-compare UNCHANGED.
//
// All values are synthetic fake architecture identifiers; no runtime/customer
// data, no timestamps, no secrets.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  PROJECT_SNAPSHOT_CLASSIFICATION_PRECEDENCE,
  PROJECT_SNAPSHOT_VERSION,
  buildProjectSnapshot,
  compareProjectSnapshots,
  projectSnapshotDigestInput,
  serializeProjectSnapshot,
  type ProjectSnapshotContractFamily,
  type ProjectSnapshotInput,
  type ProjectSnapshotManifest,
} from '../../src/core/projectSnapshot';
import { prefixedDigest24, stableJsonSorted } from '../../src/core/identity/canonicalDigest';
import type { CampaignVersionFingerprint } from '../../src/core/campaign/types';

// --- current authoritative constants (wiring spot-check only; the snapshot
// --- core itself imports none of these) ------------------------------------

import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
} from '../../src/core/triage/replayPlan';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { DOSSIER_VERSION } from '../../src/core/triage/types';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import {
  OWNER_SCOPE_POLICY_VERSION,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
} from '../../src/core/policy/ownerScope';
import {
  CONTRACT_LIFECYCLE_REGISTRY_VERSION,
  buildContractLifecycleRegistry,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import {
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
} from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { SELFDEV_ADOPTED_CASES } from '../../src/core/selfDev/adoptedCaseCatalog.generated';

// ---------------------------------------------------------------------------
// Synthetic fixtures
// ---------------------------------------------------------------------------

const FAKE_SOURCE_SHA = 'a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0';

function syntheticFamily(familyId: string, targetId: string): ProjectSnapshotContractFamily {
  return {
    familyId,
    targetId,
    kind: 'HISTORICAL_SHAPE',
    scope: 'ROOT_ARRAY_SHAPE',
    expectationId: `${targetId}.real-source-shape`,
    derivationVersion: 'nightwatch.real-source-expectation-derivation.v1',
    evidenceVersion: 'nightwatch.source-evidence-digest.v1',
    currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
    predecessorFamilyId: null,
    successorFamilyId: null,
    historicalImmutable: false,
  };
}

function syntheticCampaignVersions(): CampaignVersionFingerprint {
  return {
    campaignSchemaVersion: 'nightwatch.campaign.private.v1',
    orchestratorVersion: 'nightwatch.orchestrator.private.v1',
    nightwatchSourceSha: FAKE_SOURCE_SHA,
    selectorVersion: 'nightwatch.selector.synthetic.v1',
    dependencyMapVersion: 'nightwatch.dependency-map.synthetic.v1',
    journeyContractVersion: 'nightwatch.journey-contract.synthetic.v1',
    journeyOracleVersion: 'nightwatch.journey-oracle.synthetic.v1',
    explorationCatalogVersion: 'nightwatch.exploration-catalog.synthetic.v1',
    explorationModelVersion: 'nightwatch.exploration-model.synthetic.v1',
    explorationPlannerVersion: 'nightwatch.planner.synthetic.v1',
    apiCatalogVersion: 'nightwatch.api-catalog.synthetic.v1',
    apiGeneratorVersion: 'nightwatch.api-generator.synthetic.v1',
    apiOracleVersion: 'nightwatch.api-oracle.synthetic.v1',
    triageClusterVersion: 'nightwatch.anomaly-cluster.synthetic.v1',
    triageMinimizerVersion: 'nightwatch.failure-minimization.synthetic.v1',
    dossierVersion: 'nightwatch.bug-dossier.private.v1',
    ownerScopePolicyVersion: 'nightwatch.owner-scope-policy.v2',
    privateArtifactPolicyVersion: 'nightwatch.private-artifact.policy.v1',
    seedCorpusVersion: 'nightwatch.synthetic-seeds.v1',
    budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
    triageReplayPlanVersion: 'nightwatch.triage-replay-plan.private.v1',
    triageReplayPlanV2Version: 'nightwatch.triage-replay-plan.private.v2',
    semanticTriageEvidenceVersion: 'nightwatch.semantic-triage-evidence.v1',
    dossierV2Version: 'nightwatch.bug-dossier.private.v2',
    semanticClusterVersion: 'nightwatch.semantic-cluster.v1',
    semanticBundleVersion: 'nightwatch.semantic-campaign-bundle.private.v1',
    semanticReceiptVersion: 'nightwatch.semantic-evaluation-receipt.v2',
    semanticExpectationDerivationVersion: 'nightwatch.real-source-expectation-derivation.v1',
  };
}

function syntheticCatalogEntry(fixtureId: string): Record<string, unknown> {
  return {
    schemaVersion: 'nightwatch.selfdev-adopted-case.v1',
    adoptedCaseId: `adopted-case:sha256:${'0'.repeat(24)}${fixtureId}`,
    fixtureId,
    actionIds: [`selfdev.synthetic.action.${fixtureId}`],
    assertionIds: [`selfdev.assert.${fixtureId}`],
    equivalentFingerprint: `sha256:${'f'.repeat(64)}`,
    coverageClasses: ['oracle:synthetic-stable'],
    strategyClass: 'DECLARATIVE_REGRESSION_CATALOG_PROMOTION',
  };
}

function baseInputEntries(): [string, unknown][] {
  return [
    ['contractRegistryVersion', 'nightwatch.contract-lifecycle-registry.v1'],
    [
      'contractFamilies',
      [
        syntheticFamily('lifecycle:synthetic.target-one.read.real-source-shape', 'synthetic.target-one.read'),
        syntheticFamily('lifecycle:synthetic.target-two.read.real-source-shape', 'synthetic.target-two.read'),
      ],
    ],
    [
      'recipeSchemaVersions',
      [
        'nightwatch.real-source-expectation-recipe.v1',
        'nightwatch.real-source-expectation-recipe.v2',
      ],
    ],
    [
      'derivationVersions',
      [
        'nightwatch.real-source-expectation-derivation.v1',
        'nightwatch.real-source-expectation-derivation.v2',
      ],
    ],
    ['approvedTargets', ['synthetic.target-one.read', 'synthetic.target-two.read']],
    ['analyzerVersion', 'nightwatch.mechanical-contract-analyzer.v1'],
    [
      'replayPlanVersions',
      ['nightwatch.triage-replay-plan.private.v1', 'nightwatch.triage-replay-plan.private.v2'],
    ],
    ['semanticReceiptVersion', 'nightwatch.semantic-evaluation-receipt.v2'],
    ['campaignVersions', syntheticCampaignVersions()],
    [
      'dossierVersions',
      ['nightwatch.bug-dossier.private.v1', 'nightwatch.bug-dossier.private.v2'],
    ],
    [
      'ownerScope',
      {
        policyVersion: 'nightwatch.owner-scope-policy.v2',
        status: 'FROZEN_BY_OWNER',
        reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      },
    ],
    ['adoptedCaseCatalogEntries', [syntheticCatalogEntry('one')]],
  ];
}

function inputFromEntries(entries: readonly [string, unknown][]): ProjectSnapshotInput {
  const input: Record<string, unknown> = {};
  for (const [key, value] of entries) input[key] = value;
  return input as unknown as ProjectSnapshotInput;
}

function baseInput(): ProjectSnapshotInput {
  return inputFromEntries(baseInputEntries());
}

function modified(
  apply: (input: ProjectSnapshotInput) => ProjectSnapshotInput,
): { previous: ProjectSnapshotManifest; current: ProjectSnapshotManifest } {
  return {
    previous: buildProjectSnapshot(baseInput()),
    current: buildProjectSnapshot(apply(baseInput())),
  };
}

/** Deep copy of a manifest with every object's keys inserted in reverse order. */
function reverseKeyOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeyOrder);
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort().reverse()) {
      copy[key] = reverseKeyOrder((value as Record<string, unknown>)[key]);
    }
    return copy;
  }
  return value;
}

const PRIVACY_SENTINELS: readonly string[] = [
  'bearer ',
  'private key',
  'begin openssh',
  'password',
  'cookie',
  'authorization:',
  '/home/',
  '/users/',
  'aws_secret',
  'akia',
  'id_rsa',
];

function expectPrivacyClean(serialized: string): void {
  const lowered = serialized.toLowerCase();
  for (const sentinel of PRIVACY_SENTINELS) {
    expect(lowered.includes(sentinel), `sentinel leakage: ${sentinel}`).toBe(false);
  }
  expect(serialized.match(/\d{4}-\d{2}-\d{2}/), 'timestamp-like value in identity-bearing data').toBeNull();
}

// ---------------------------------------------------------------------------
// Build + digest identity
// ---------------------------------------------------------------------------

test.describe('Phase 15P A12 — deterministic project snapshot', () => {
  test('builds a deterministic manifest with canonical digest identity', () => {
    const manifest = buildProjectSnapshot(baseInput());
    expect(manifest.snapshotSchemaVersion).toBe(PROJECT_SNAPSHOT_VERSION);
    expect(manifest.manifestDigest).toMatch(/^psnap:sha256:[0-9a-f]{24}$/);
    expect(manifest.adoptedCaseCatalog.catalogDigest).toMatch(/^pscat:sha256:[0-9a-f]{24}$/);
    // Canonical serialization is exactly the stable sorted JSON of the manifest.
    expect(serializeProjectSnapshot(manifest)).toBe(stableJsonSorted(manifest));
    // Sets arrive normalized (sorted, unique).
    expect([...manifest.approvedTargets]).toEqual([
      'synthetic.target-one.read',
      'synthetic.target-two.read',
    ]);
    expect([...manifest.recipeSchemaVersions]).toEqual([
      'nightwatch.real-source-expectation-recipe.v1',
      'nightwatch.real-source-expectation-recipe.v2',
    ]);
    expect([...manifest.contractFamilies.map((family) => family.familyId)]).toEqual([
      'lifecycle:synthetic.target-one.read.real-source-shape',
      'lifecycle:synthetic.target-two.read.real-source-shape',
    ]);
  });

  test('manifest digest is reproducible from the exported digest payload', () => {
    const manifest = buildProjectSnapshot(baseInput());
    expect(prefixedDigest24('psnap', projectSnapshotDigestInput(manifest))).toBe(manifest.manifestDigest);
  });

  test('digest stability across key order (input literals and manifest copies)', () => {
    const ordered = buildProjectSnapshot(inputFromEntries(baseInputEntries()));
    const reversed = buildProjectSnapshot(inputFromEntries([...baseInputEntries()].reverse()));
    expect(reversed.manifestDigest).toBe(ordered.manifestDigest);
    expect(serializeProjectSnapshot(reversed)).toBe(serializeProjectSnapshot(ordered));

    const shuffledCopy = reverseKeyOrder(ordered) as unknown as ProjectSnapshotManifest;
    expect(serializeProjectSnapshot(shuffledCopy)).toBe(serializeProjectSnapshot(ordered));
    expect(prefixedDigest24('psnap', projectSnapshotDigestInput(shuffledCopy))).toBe(ordered.manifestDigest);
  });

  test('UNCHANGED for identical inputs', () => {
    const { previous, current } = modified((input) => input);
    expect(compareProjectSnapshots(previous, current).classification).toBe('UNCHANGED');
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.findings).toEqual([]);
  });

  test('determinism: >= 3 builds deep-equal including digest', () => {
    const builds = [buildProjectSnapshot(baseInput()), buildProjectSnapshot(baseInput()), buildProjectSnapshot(baseInput())];
    expect(builds[1]).toEqual(builds[0]);
    expect(builds[2]).toEqual(builds[0]);
    expect(new Set(builds.map((manifest) => manifest.manifestDigest)).size).toBe(1);
    expect(new Set(builds.map((manifest) => serializeProjectSnapshot(manifest))).size).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Classification matrix — one minimal synthetic delta per classification
  // -------------------------------------------------------------------------

  test('COMPATIBLE_CHANGE: additive recipe schema version', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      recipeSchemaVersions: [...input.recipeSchemaVersions, 'nightwatch.real-source-expectation-recipe.v3'],
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('COMPATIBLE_CHANGE');
    expect(diff.findings).toEqual([
      {
        section: 'recipeSchemaVersions',
        kind: 'ADDED',
        classification: 'COMPATIBLE_CHANGE',
        detail: 'nightwatch.real-source-expectation-recipe.v3',
      },
    ]);
  });

  test('COMPATIBLE_CHANGE: additive lifecycle family', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      contractFamilies: [...input.contractFamilies, syntheticFamily('lifecycle:synthetic.target-three.read.real-source-shape', 'synthetic.target-three.read')],
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('COMPATIBLE_CHANGE');
    expect(diff.findings.map((finding) => finding.kind)).toEqual(['ADDED']);
  });

  test('COMPATIBLE_CHANGE: additive adopted-case catalog entry', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      adoptedCaseCatalogEntries: [...input.adoptedCaseCatalogEntries, syntheticCatalogEntry('two')],
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('COMPATIBLE_CHANGE');
    expect(diff.findings.map((finding) => finding.section)).toEqual(['adoptedCaseCatalog.entryDigests']);
  });

  test('SEMANTIC_CHANGE: analyzer version replacement', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      analyzerVersion: 'nightwatch.mechanical-contract-analyzer.v2',
    }));
    expect(compareProjectSnapshots(previous, current).classification).toBe('SEMANTIC_CHANGE');
  });

  test('SEMANTIC_CHANGE: lifecycle family field drift', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      contractFamilies: input.contractFamilies.map((family) =>
        family.familyId === 'lifecycle:synthetic.target-one.read.real-source-shape'
          ? { ...family, derivationVersion: 'nightwatch.real-source-expectation-derivation.v2' }
          : family,
      ),
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('SEMANTIC_CHANGE');
    expect(diff.findings[0]?.detail).toBe(
      'lifecycle:synthetic.target-one.read.real-source-shape:derivationVersion',
    );
  });

  test('INCOMPATIBLE_CHANGE: lifecycle family removal', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      contractFamilies: input.contractFamilies.filter(
        (family) => family.familyId !== 'lifecycle:synthetic.target-two.read.real-source-shape',
      ),
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('INCOMPATIBLE_CHANGE');
    expect(diff.findings.map((finding) => finding.kind)).toEqual(['REMOVED']);
  });

  test('INCOMPATIBLE_CHANGE: supported-generation removal (recipe schema set)', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      recipeSchemaVersions: input.recipeSchemaVersions.filter(
        (version) => version !== 'nightwatch.real-source-expectation-recipe.v1',
      ),
    }));
    expect(compareProjectSnapshots(previous, current).classification).toBe('INCOMPATIBLE_CHANGE');
  });

  test('INCOMPATIBLE_CHANGE: version slot downgrade (semantic receipt)', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      semanticReceiptVersion: 'nightwatch.semantic-evaluation-receipt.v1',
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('INCOMPATIBLE_CHANGE');
    expect(diff.findings[0]?.section).toBe('semanticReceiptVersion');
  });

  test('SEMANTIC_CHANGE: version slot advance within the same prefix family', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      analyzerVersion: 'nightwatch.mechanical-contract-analyzer.v3',
    }));
    expect(compareProjectSnapshots(previous, current).classification).toBe('SEMANTIC_CHANGE');
  });

  test('INCOMPATIBLE_CHANGE: replay plan generation removal', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      replayPlanVersions: input.replayPlanVersions.filter(
        (version) => version !== 'nightwatch.triage-replay-plan.private.v2',
      ),
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('INCOMPATIBLE_CHANGE');
    expect(diff.findings[0]?.section).toBe('replayPlanVersions');
  });

  test('AUTHORITY_CHANGE: owner-scope marker change', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      ownerScope: { ...input.ownerScope, status: 'THAWED_BY_OWNER' },
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('AUTHORITY_CHANGE');
    expect(diff.findings[0]?.section).toBe('ownerScope.status');
  });

  test('AUTHORITY_CHANGE: approved-target expansion and revocation', () => {
    const expanded = modified((input) => ({
      ...input,
      approvedTargets: [...input.approvedTargets, 'synthetic.target-three.read'],
    }));
    expect(compareProjectSnapshots(expanded.previous, expanded.current).classification).toBe('AUTHORITY_CHANGE');

    const revoked = modified((input) => ({
      ...input,
      approvedTargets: input.approvedTargets.filter((target) => target !== 'synthetic.target-two.read'),
    }));
    const revokedDiff = compareProjectSnapshots(revoked.previous, revoked.current);
    expect(revokedDiff.classification).toBe('AUTHORITY_CHANGE');
    expect(revokedDiff.findings[0]?.kind).toBe('REMOVED');
  });

  test('precedence: AUTHORITY_CHANGE outranks INCOMPATIBLE_CHANGE; findings keep both', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      ownerScope: { ...input.ownerScope, reason: 'SYNTHETIC_POLICY_REASON' },
      contractFamilies: input.contractFamilies.filter(
        (family) => family.familyId !== 'lifecycle:synthetic.target-one.read.real-source-shape',
      ),
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('AUTHORITY_CHANGE');
    expect(diff.findings.map((finding) => finding.classification)).toEqual([
      'AUTHORITY_CHANGE',
      'INCOMPATIBLE_CHANGE',
    ]);
  });

  test('campaign fingerprint drift: semantic field -> SEMANTIC_CHANGE', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      campaignVersions: { ...input.campaignVersions, selectorVersion: 'nightwatch.selector.synthetic.v2' },
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('SEMANTIC_CHANGE');
    expect(diff.findings[0]?.section).toBe('campaignVersions.selectorVersion');
  });

  test('campaign fingerprint drift: ownerScopePolicyVersion -> AUTHORITY_CHANGE', () => {
    const { previous, current } = modified((input) => ({
      ...input,
      campaignVersions: {
        ...input.campaignVersions,
        ownerScopePolicyVersion: 'nightwatch.owner-scope-policy.v3',
      },
    }));
    const diff = compareProjectSnapshots(previous, current);
    expect(diff.classification).toBe('AUTHORITY_CHANGE');
    expect(diff.findings[0]?.section).toBe('campaignVersions.ownerScopePolicyVersion');
  });

  test('snapshot schema mismatch fails closed as INCOMPATIBLE_CHANGE SCHEMA_MISMATCH', () => {
    const previous = buildProjectSnapshot(baseInput());
    const mutated = JSON.parse(serializeProjectSnapshot(previous)) as Record<string, unknown>;
    mutated['snapshotSchemaVersion'] = 'nightwatch.project-snapshot.v0';
    const diff = compareProjectSnapshots(previous, mutated as unknown as ProjectSnapshotManifest);
    expect(diff.classification).toBe('INCOMPATIBLE_CHANGE');
    expect(diff.findings).toHaveLength(1);
    expect(diff.findings[0]?.kind).toBe('SCHEMA_MISMATCH');
  });

  test('classification precedence constant is pinned', () => {
    expect([...PROJECT_SNAPSHOT_CLASSIFICATION_PRECEDENCE]).toEqual([
      'UNCHANGED',
      'COMPATIBLE_CHANGE',
      'SEMANTIC_CHANGE',
      'INCOMPATIBLE_CHANGE',
      'AUTHORITY_CHANGE',
    ]);
  });

  // -------------------------------------------------------------------------
  // Privacy screen
  // -------------------------------------------------------------------------

  test('privacy screen: no sentinel leakage in serialized manifests', () => {
    expectPrivacyClean(serializeProjectSnapshot(buildProjectSnapshot(baseInput())));
    expectPrivacyClean(serializeProjectSnapshot(buildProjectSnapshot(realSourceInput())));
  });

  // -------------------------------------------------------------------------
  // Fail-closed validation
  // -------------------------------------------------------------------------

  test('fail-closed: duplicate set entries are rejected', () => {
    const entries = baseInputEntries();
    const duplicated: [string, unknown][] = entries.map(([key, value]) =>
      key === 'approvedTargets' ? [key, ['synthetic.target-one.read', 'synthetic.target-one.read']] : [key, value],
    );
    expect(() => buildProjectSnapshot(inputFromEntries(duplicated)))
      .toThrow(/PROJECT_SNAPSHOT_DUPLICATE_SET_ENTRY:approvedTargets/);
  });

  test('fail-closed: empty version strings are rejected', () => {
    const entries = baseInputEntries();
    const emptied: [string, unknown][] = entries.map(([key, value]) =>
      key === 'analyzerVersion' ? [key, ''] : [key, value],
    );
    expect(() => buildProjectSnapshot(inputFromEntries(emptied)))
      .toThrow(/PROJECT_SNAPSHOT_INVALID_INPUT:analyzerVersion/);
  });

  test('fail-closed: duplicate lifecycle family ids are rejected', () => {
    const entries = baseInputEntries();
    const duplicatedFamily: [string, unknown][] = entries.map(([key, value]) =>
      key === 'contractFamilies'
        ? [key, [syntheticFamily('lifecycle:duplicate', 'synthetic.target-one.read'), syntheticFamily('lifecycle:duplicate', 'synthetic.target-two.read')]]
        : [key, value],
    );
    expect(() => buildProjectSnapshot(inputFromEntries(duplicatedFamily)))
      .toThrow(/PROJECT_SNAPSHOT_DUPLICATE_FAMILY_ID:lifecycle:duplicate/);
  });

  test('fail-closed: duplicate adopted-case catalog entries are rejected', () => {
    const entries = baseInputEntries();
    const duplicatedEntry: [string, unknown][] = entries.map(([key, value]) =>
      key === 'adoptedCaseCatalogEntries'
        ? [key, [syntheticCatalogEntry('one'), syntheticCatalogEntry('one')]]
        : [key, value],
    );
    expect(() => buildProjectSnapshot(inputFromEntries(duplicatedEntry)))
      .toThrow(/PROJECT_SNAPSHOT_DUPLICATE_CATALOG_ENTRY/);
  });

  // -------------------------------------------------------------------------
  // Real-source wiring (current authoritative constants)
  // -------------------------------------------------------------------------

  function realSourceInput(): ProjectSnapshotInput {
    const registry = buildContractLifecycleRegistry();
    return {
      contractRegistryVersion: CONTRACT_LIFECYCLE_REGISTRY_VERSION,
      contractFamilies: registry.map((family) => ({ ...family })),
      recipeSchemaVersions: [...new Set(REAL_SOURCE_EXPECTATION_RECIPES.map((recipe) => recipe.schemaVersion))],
      derivationVersions: [
        REAL_SOURCE_DERIVATION_VERSION,
        REAL_SOURCE_DERIVATION_VERSION_V2,
        REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
        MECHANICAL_ANALYZER_VERSION,
      ],
      approvedTargets: [...APPROVED_READ_ONLY_TARGET_IDS],
      analyzerVersion: MECHANICAL_ANALYZER_VERSION,
      replayPlanVersions: [TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION],
      semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
      campaignVersions: {
        ...syntheticCampaignVersions(),
        triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
        semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
        dossierVersion: DOSSIER_VERSION,
        dossierV2Version: DOSSIER_VERSION_V2,
        ownerScopePolicyVersion: OWNER_SCOPE_POLICY_VERSION,
      },
      dossierVersions: [DOSSIER_VERSION, DOSSIER_VERSION_V2],
      ownerScope: {
        policyVersion: OWNER_SCOPE_POLICY_VERSION,
        status: OWNER_SCOPE_STATUS,
        reason: OWNER_SCOPE_REASON,
      },
      adoptedCaseCatalogEntries: SELFDEV_ADOPTED_CASES.map((entry) => ({ ...entry }) as Record<string, unknown>),
    };
  }

  test('real-source wiring: current authoritative constants build and self-compare UNCHANGED', () => {
    const first = buildProjectSnapshot(realSourceInput());
    const second = buildProjectSnapshot(realSourceInput());
    expect(first.manifestDigest).toBe(second.manifestDigest);
    expect(compareProjectSnapshots(first, second).classification).toBe('UNCHANGED');
    // The real registry families flow through structurally unchanged.
    expect(first.contractFamilies.length).toBe(buildContractLifecycleRegistry().length);
    expect(first.approvedTargets.length).toBe(APPROVED_READ_ONLY_TARGET_IDS.length);
    expect(first.adoptedCaseCatalog.entryCount).toBe(SELFDEV_ADOPTED_CASES.length);
    // Analyzer/replay/receipt slots carry the exact current source constants.
    expect(first.analyzerVersion).toBe(MECHANICAL_ANALYZER_VERSION);
    expect([...first.replayPlanVersions]).toContain(TRIAGE_REPLAY_PLAN_V2_VERSION);
    expect(first.semanticReceiptVersion).toBe(SEMANTIC_EVALUATION_RECEIPT_VERSION);
    expect(first.ownerScope.status).toBe('FROZEN_BY_OWNER');
  });
});
