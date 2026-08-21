// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A13) — privacy / authority by construction.
//
// Adversarial suite over the Phase-15P wave 1–3 cone. Proves, mechanically:
//
//   1. DURABLE ERRORS NEVER ECHO RAW PAYLOADS — every validator in the cone
//      projects rejected caller-supplied values through the bounded
//      categorical detail projection (`safeErrorDetail`): sentinel-bearing,
//      secret-shaped, or oversized inputs surface as `<redacted-detail>`,
//      while clean categorical values keep their historical exact messages
//      (compat pinned here too).
//   2. UNBOUNDED FREE-TEXT FIELDS FAIL CLOSED — project-snapshot identifiers
//      are length-bounded; readiness identity fields (target/family/kind)
//      reject sentinel-bearing or free-text values before they can enter the
//      durable summary.
//   3. PURE CORES STAY PURE — static source assertions: readiness,
//      projectSnapshot, lifecycle model/vocabulary/movement, runtime guards,
//      and owner policy import NO node builtins at all; artifactValidation
//      may import ONLY node:crypto (established hashing pattern); none of
//      them reference fetch/child_process/process.env.
//   4. OWNER GATE ORDERING — static assertions on the campaign orchestrator:
//      every executor callback site is textually preceded by its
//      owner-policy preflight call, and `executeOwnerScoped` dynamically
//      never reaches the executor for a blocked operation.
//
// LOCAL/SYNTHETIC only: no network, no browser, no real environments.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateArtifact } from '../../src/core/artifactValidation';
import {
  containsForbiddenErrorDetail,
  safeErrorDetail,
  REDACTED_ERROR_DETAIL,
} from '../../src/core/campaign/runtimeValidation';
import {
  FROZEN_OWNER_OPERATIONS,
  OWNER_POLICY_BLOCKED,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
  OwnerPolicyBlockedError,
  decideOwnerScope,
  executeOwnerScoped,
} from '../../src/core/policy/ownerScope';
import { buildProjectSnapshot } from '../../src/core/projectSnapshot';
import type { ProjectSnapshotInput } from '../../src/core/projectSnapshot';
import { summarizeLocalReadiness } from '../../src/core/readiness';
import type { LocalReadinessInput } from '../../src/core/readiness';
import {
  parseConvergedSourceCurrentness,
  parseSemanticReceiptOutcome,
  strictSemanticOutcomeToReceiptOutcome,
  unifiedFromSemanticReceiptOutcome,
  parseUnifiedContractResultDto,
} from '../../src/oracles/expectations/lifecycle/semanticVocabulary';

// ---------------------------------------------------------------------------
// Sentinel vocabulary (same family as phase10Privacy / semanticSentinel).
// ---------------------------------------------------------------------------

const SENTINELS = [
  'CUSTOMER_SENTINEL_9F3A2B',
  'TOKEN_SENTINEL_X7Q',
  'Bearer eyJhbGciOiJIUzI1NiJ9.secret-part',
  'AKIAIOSFODNN7EXAMPLE',
  'password=hunter2',
] as const;

function assertFreeOfSentinels(text: string, what: string): void {
  for (const sentinel of SENTINELS) {
    expect(text.includes(sentinel), `${what} leaked ${sentinel}`).toBe(false);
  }
}

const ROOT = join(__dirname, '..', '..');

function moduleSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

// ---------------------------------------------------------------------------
// Shared fixtures.
// ---------------------------------------------------------------------------

/** Minimal structurally-valid reproduction record (reaches referential checks). */
function reproductionRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    representativeRunId: 'run-1',
    state: 'PENDING',
    result: null,
    admissionLevel: 'L0',
    reasonCode: null,
    runId: null,
    safety: {
      productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0,
      productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0,
      externalPublicationAttempts: 0,
    },
    privacy: {
      result: 'PASS',
      rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0,
      tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0,
    },
    ...overrides,
  };
}

/** Coverage-report body that reaches the proof-class/count-record branches. */
function coverageReportBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reportVersion: 'nightwatch.contract-coverage-report.v1',
    approvedTargetCount: 0,
    admittedHistoricalCount: 0,
    admittedCollectionCount: 0,
    depthClasses: {},
    proofClasses: {},
    blockersByCode: {},
    driftClasses: {},
    normalizedEvidenceIdentities: [],
    contractAdditionsSinceBaseline: [],
    contractStrengtheningsSinceBaseline: [],
    depthUpliftedSinceBaseline: 0,
    unresolvedMechanicalCoverageGaps: [],
    privacySafe: true,
    digest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    ...overrides,
  };
}

function readinessInput(overrides: {
  approvedTargetIds?: string[];
  families?: Array<Record<string, unknown>>;
  currentnessByTargetId?: Record<string, string>;
  blockers?: Array<Record<string, unknown>>;
}): LocalReadinessInput {
  return {
    applies: true,
    sourceContracts: {
      approvedTargetIds: overrides.approvedTargetIds ?? ['x.a.read'],
      families: (overrides.families ?? [{
        familyId: 'lifecycle:x.a.read.deep',
        targetId: 'x.a.read',
        kind: 'DEEP_TYPE',
        hasExpectationId: true,
        campaignEligible: true,
        historicalImmutable: false,
      }]) as unknown as LocalReadinessInput['sourceContracts']['families'],
      currentnessByTargetId: (overrides.currentnessByTargetId ?? {}) as LocalReadinessInput['sourceContracts']['currentnessByTargetId'],
    },
    campaign: { pinnedVersions: { budgetPolicyVersion: 'v1' }, observedVersions: null },
    checkpointCompatibility: 'UNKNOWN',
    unresolvedBlockers: (overrides.blockers ?? []) as unknown as LocalReadinessInput['unresolvedBlockers'],
    externalCi: 'UNKNOWN',
    ownerScope: {
      status: OWNER_SCOPE_STATUS,
      reason: OWNER_SCOPE_REASON,
      frozenOperationCount: FROZEN_OWNER_OPERATIONS.length,
    },
  };
}

function snapshotInput(overrides: Partial<ProjectSnapshotInput> = {}): ProjectSnapshotInput {
  return {
    contractRegistryVersion: 'nightwatch.contract-lifecycle-registry.v1',
    contractFamilies: [{
      familyId: 'lifecycle:x.a.read.deep',
      targetId: 'x.a.read',
      kind: 'DEEP_TYPE',
      scope: 'ITEM_FIELD_TYPE',
      expectationId: 'x.a.read.deep',
      derivationVersion: 'v2',
      evidenceVersion: 'ev1',
      currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
      campaignEligible: 'CAMPAIGN_ELIGIBLE',
      predecessorFamilyId: null,
      successorFamilyId: null,
      historicalImmutable: false,
    }],
    recipeSchemaVersions: ['nightwatch.real-source-expectation-recipe.v2'],
    derivationVersions: ['nightwatch.derivation.v2'],
    approvedTargets: ['x.a.read'],
    analyzerVersion: 'nightwatch.mechanical-analyzer.v1',
    replayPlanVersions: ['nightwatch.triage-replay-plan.private.v2'],
    semanticReceiptVersion: 'nightwatch.semantic-evaluation-receipt.v2',
    campaignVersions: {
      campaignSchemaVersion: 'nightwatch.campaign.private.v1',
      ownerScopePolicyVersion: 'nightwatch.owner-scope-policy.v2',
    } as ProjectSnapshotInput['campaignVersions'],
    dossierVersions: ['nightwatch.bug-dossier.private.v2'],
    ownerScope: { policyVersion: 'nightwatch.owner-scope-policy.v2', status: OWNER_SCOPE_STATUS, reason: OWNER_SCOPE_REASON },
    adoptedCaseCatalogEntries: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1a. Facade: unknown kinds and unsupported schema versions never echo raws.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A13 — durable errors carry bounded categorical detail only', () => {
  test('safeErrorDetail projects sentinels/secrets/oversize to the fixed marker', () => {
    expect(safeErrorDetail('CLEAN_CODE')).toBe('CLEAN_CODE');
    for (const sentinel of SENTINELS) {
      expect(safeErrorDetail(sentinel)).toBe(REDACTED_ERROR_DETAIL);
      expect(containsForbiddenErrorDetail(sentinel)).toBe(true);
    }
    expect(safeErrorDetail('x'.repeat(500))).toBe(REDACTED_ERROR_DETAIL);
    expect(safeErrorDetail(123)).toBe('123');
    expect(REDACTED_ERROR_DETAIL).toMatch(/^[a-z<>-]+$/);
  });

  test('unknown artifact kind: sentinel-bearing kind is redacted in reason AND result', () => {
    const adversarialKind = `dossier-v3 ${SENTINELS[0]}`;
    const result = validateArtifact(adversarialKind, {});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe(`ARTIFACT_KIND_UNKNOWN:${REDACTED_ERROR_DETAIL}`);
      expect(result.kind).toBe(REDACTED_ERROR_DETAIL);
      assertFreeOfSentinels(JSON.stringify(result), 'unknown-kind result');
    }
  });

  test('unknown artifact kind: clean categorical kinds keep their exact historical echo', () => {
    for (const kind of ['dossier-v3', 'nope', '', 'COVERAGE']) {
      const result = validateArtifact(kind, {});
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.reason).toBe(`ARTIFACT_KIND_UNKNOWN:${kind}`);
    }
  });

  test('unsupported schema versions with sentinel content are redacted per kind', () => {
    const cases: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
      ['semantic-receipt', { schemaVersion: `nightwatch.semantic-evaluation-receipt.v9 ${SENTINELS[1]}` }],
      ['replay-plan', { schemaVersion: SENTINELS[2] }],
      ['dossier', { schemaVersion: `${SENTINELS[0]}v3`, status: 'READY' }],
    ];
    for (const [kind, value] of cases) {
      const result = validateArtifact(kind, value);
      expect(result.valid, `${kind} must reject`).toBe(false);
      if (!result.valid) assertFreeOfSentinels(result.reason, `${kind} unsupported-version reason`);
    }
    // Clean unsupported versions still classify identically (prefix pinned).
    const clean = validateArtifact('semantic-receipt', { schemaVersion: 'nightwatch.semantic-evaluation-receipt.v9' });
    expect(clean.valid).toBe(false);
    if (!clean.valid) expect(clean.reason).toContain('SCHEMA_VERSION_UNSUPPORTED:nightwatch.semantic-evaluation-receipt.v9');
  });

  test('reproduction-record referential failures redact sentinel-bearing ids', () => {
    const context = { knownClusterIds: ['cluster:sha256:000000000000000000000000'], knownObservationRunIds: ['other-run'] };
    const adversarial = reproductionRecord({
      clusterId: `cluster:sha256:${SENTINELS[0]}`,
      representativeRunId: `run-${SENTINELS[1]}`,
      runId: SENTINELS[4],
    });
    // Non-vacuous: the raw sentinels ARE present in the input.
    expect(JSON.stringify(adversarial)).toContain(SENTINELS[0]);
    const result = validateArtifact('reproduction-record', adversarial, context);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('UNKNOWN_CLUSTER:');
      assertFreeOfSentinels(result.reason, 'referential failure reason');
    }
  });

  test('coverage-report map keys are echoed only through the bounded projection', () => {
    const badCountKey = coverageReportBody({ blockersByCode: { [SENTINELS[0]]: -1 } });
    const countResult = validateArtifact('coverage-report', badCountKey);
    expect(countResult.valid).toBe(false);
    if (!countResult.valid) {
      expect(countResult.reason).toContain('_ENTRY:');
      assertFreeOfSentinels(countResult.reason, 'count-entry key echo');
    }

    const badProofBucket = coverageReportBody({ proofClasses: { [SENTINELS[1]]: { proven: 0 } } });
    const proofResult = validateArtifact('coverage-report', badProofBucket);
    expect(proofResult.valid).toBe(false);
    if (!proofResult.valid) {
      expect(proofResult.reason).toContain(`PROOF_CLASS:${REDACTED_ERROR_DETAIL}:MISSING_FIELD`);
      assertFreeOfSentinels(proofResult.reason, 'proof-class key echo');
    }
  });
});

// ---------------------------------------------------------------------------
// 1b. Vocabulary + movement: parse/adapt failures never echo raw payloads.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A13 — semantic vocabulary sentinel screening', () => {
  test('clean unknown values keep their exact historical messages (compat)', () => {
    expect(() => parseSemanticReceiptOutcome('MAYBE'))
      .toThrow('SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-receipt-outcome:MAYBE');
    expect(() => parseConvergedSourceCurrentness('CURRENTISH'))
      .toThrow('SEMANTIC_VOCABULARY_UNKNOWN_VALUE:converged-source-currentness:CURRENTISH');
    expect(() => strictSemanticOutcomeToReceiptOutcome('BOGUS'))
      .toThrow('SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-runner-outcome:BOGUS');
  });

  test('sentinel-bearing unknown values are redacted, never echoed', () => {
    for (const probe of [SENTINELS[0], SENTINELS[1], SENTINELS[3]]) {
      let message = '';
      try {
        parseSemanticReceiptOutcome(probe);
      } catch (error) {
        message = error instanceof Error ? error.message : '';
      }
      expect(message).toContain('SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-receipt-outcome:');
      assertFreeOfSentinels(message, 'parse receipt outcome');
    }
  });

  test('persisted DTO parsing rejects sentinel-shaped categorical fields fail-closed', () => {
    const legit = unifiedFromSemanticReceiptOutcome('PASS', { targetId: 'x.a.read' });
    // Round-trip compat: historically emitted payloads still parse.
    const parsed = parseUnifiedContractResultDto(JSON.stringify(legit));
    expect(parsed.category).toBe(legit.category);

    const poisonedSourceValue = { ...legit, sourceValue: SENTINELS[1] };
    expect(() => parseUnifiedContractResultDto(JSON.stringify(poisonedSourceValue)))
      .toThrow(/SEMANTIC_VOCABULARY_DTO_INVALID:field-sentinel/);

    const poisonedTargetId = { ...legit, targetId: SENTINELS[0] };
    expect(() => parseUnifiedContractResultDto(JSON.stringify(poisonedTargetId)))
      .toThrow('SEMANTIC_VOCABULARY_DTO_INVALID:target-id-sentinel');
  });
});

// ---------------------------------------------------------------------------
// 2. Unbounded free-text fields fail closed (snapshot identifiers, readiness
//    identity fields).
// ---------------------------------------------------------------------------

test.describe('Phase 15P A13 — bounded categorical DTO surfaces', () => {
  test('project snapshot rejects overlong identifiers before digesting them', () => {
    const overlong = 'x'.repeat(201);
    expect(() => buildProjectSnapshot(snapshotInput({ approvedTargets: [overlong] })))
      .toThrow('PROJECT_SNAPSHOT_IDENTIFIER_TOO_LONG:approvedTargets');
  });

  test('project snapshot duplicate entries redact sentinel-bearing values', () => {
    let message = '';
    try {
      buildProjectSnapshot(snapshotInput({ approvedTargets: [SENTINELS[0], SENTINELS[0]] }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toBe(`PROJECT_SNAPSHOT_DUPLICATE_SET_ENTRY:approvedTargets:${REDACTED_ERROR_DETAIL}`);

    message = '';
    try {
      buildProjectSnapshot(snapshotInput({
        contractFamilies: [{
          familyId: SENTINELS[1],
          targetId: 'x.a.read',
          kind: 'DEEP_TYPE',
          scope: 'ITEM_FIELD_TYPE',
          expectationId: 'x.a.read.deep',
          derivationVersion: 'v2',
          evidenceVersion: 'ev1',
          currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
          campaignEligible: 'CAMPAIGN_ELIGIBLE',
          predecessorFamilyId: null,
          successorFamilyId: null,
          historicalImmutable: false,
        }, {
          familyId: SENTINELS[1],
          targetId: 'x.a.read',
          kind: 'DEEP_TYPE',
          scope: 'ITEM_FIELD_TYPE',
          expectationId: 'x.a.read.deep',
          derivationVersion: 'v2',
          evidenceVersion: 'ev1',
          currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
          campaignEligible: 'CAMPAIGN_ELIGIBLE',
          predecessorFamilyId: null,
          successorFamilyId: null,
          historicalImmutable: false,
        }],
      }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toBe(`PROJECT_SNAPSHOT_DUPLICATE_FAMILY_ID:${REDACTED_ERROR_DETAIL}`);
  });

  test('project snapshot duplicate set entries keep clean-value echoes (compat)', () => {
    expect(() => buildProjectSnapshot(snapshotInput({ approvedTargets: ['dup', 'dup'] })))
      .toThrow('PROJECT_SNAPSHOT_DUPLICATE_SET_ENTRY:approvedTargets:dup');
  });

  test('readiness rejects sentinel-bearing target/family/kind identity fail-closed', () => {
    const cases: ReadonlyArray<() => void> = [
      () => summarizeLocalReadiness(readinessInput({ approvedTargetIds: [`x.${SENTINELS[0]}`] })),
      () => summarizeLocalReadiness(readinessInput({
        families: [{
          familyId: `lifecycle:${SENTINELS[1]}`,
          targetId: 'x.a.read',
          kind: 'DEEP_TYPE',
          hasExpectationId: true,
          campaignEligible: true,
          historicalImmutable: false,
        }],
      })),
      () => summarizeLocalReadiness(readinessInput({
        families: [{
          familyId: 'lifecycle:x.a.read.deep',
          targetId: 'x.a.read',
          kind: `DEEP_TYPE ${SENTINELS[2]}`,
          hasExpectationId: true,
          campaignEligible: true,
          historicalImmutable: false,
        }],
      })),
      () => summarizeLocalReadiness(readinessInput({ currentnessByTargetId: { [SENTINELS[0]]: 'STALE' } })),
    ];
    for (const [index, probe] of cases.entries()) {
      let message = '';
      try {
        probe();
      } catch (error) {
        message = error instanceof Error ? error.message : '';
      }
      expect(message, `case ${index} must fail closed`).toMatch(/^READINESS_PRIVACY_BLOCKED:/);
      assertFreeOfSentinels(message, `readiness case ${index}`);
    }
  });

  test('readiness success summaries stay free of sentinel content (non-vacuous sweep)', () => {
    const input = readinessInput({});
    // Non-vacuous: the fixture vocabulary is exercised on the happy path.
    expect(JSON.stringify(input)).toContain('x.a.read');
    const summary = summarizeLocalReadiness(input);
    assertFreeOfSentinels(JSON.stringify(summary), 'readiness summary');
    expect(summary.readyClaim).toBe('LOCAL_SYNTHETIC_ONLY');
  });
});

// ---------------------------------------------------------------------------
// 3. Pure cores stay pure — static source assertions.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A13 — pure-core import authority (static)', () => {
  const NO_NODE_IMPORTS = [
    'src/core/readiness/localReadiness.ts',
    'src/core/readiness/repoState.ts',
    'src/core/readiness/types.ts',
    'src/core/readiness/index.ts',
    'src/core/readiness/service.ts',
    'src/core/projectSnapshot/build.ts',
    'src/core/projectSnapshot/compare.ts',
    'src/core/projectSnapshot/types.ts',
    'src/core/projectSnapshot/index.ts',
    'src/oracles/expectations/lifecycle/contractLifecycleModel.ts',
    'src/oracles/expectations/lifecycle/semanticVocabulary.ts',
    'src/oracles/expectations/lifecycle/sourceContractMovement.ts',
    'src/core/campaign/runtimeValidation.ts',
    'src/core/policy/ownerScope.ts',
  ];

  const ARTIFACT_VALIDATION_FILES = [
    'src/core/artifactValidation/index.ts',
    'src/core/artifactValidation/types.ts',
    'src/core/artifactValidation/observationClusterValidation.ts',
    'src/core/artifactValidation/reproductionValidation.ts',
    'src/core/artifactValidation/coverageReportValidation.ts',
    'src/core/artifactValidation/dossierKindValidation.ts',
  ];

  test('readiness/projectSnapshot/lifecycle cores import NO node builtins', () => {
    for (const file of NO_NODE_IMPORTS) {
      const source = moduleSource(file);
      expect(/from\s+['"]node:[a-z]+['"]/.test(source), `${file} imports a node builtin`).toBe(false);
      expect(/\b(?:fetch\s*\(|child_process|process\.env)\b/.test(source), `${file} references a prohibited capability`).toBe(false);
    }
  });

  test('artifactValidation facade imports node builtins ONLY as node:crypto', () => {
    for (const file of ARTIFACT_VALIDATION_FILES) {
      const source = moduleSource(file);
      const nodeImports = [...source.matchAll(/from\s+['"]node:([a-z]+)['"]/g)].map((match) => match[1]);
      for (const imported of nodeImports) {
        expect(imported, `${file} imports unexpected node:${imported}`).toBe('crypto');
      }
      expect(/\b(?:fetch\s*\(|child_process|process\.env)\b/.test(source), `${file} references a prohibited capability`).toBe(false);
    }
  });

  test('runtimeValidation stays a dependency-free leaf module', () => {
    const source = moduleSource('src/core/campaign/runtimeValidation.ts');
    expect(/^import\s/m.test(source), 'runtimeValidation must not import anything').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Authority by construction — owner gate ordering.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A13 — owner-policy gate ordering', () => {
  const ORCHESTRATOR = 'src/core/campaign/orchestrator.ts';

  test('preflight wrapper gates global owner policy BEFORE any executor callback', () => {
    const source = moduleSource(ORCHESTRATOR);
    const start = source.indexOf('private async preflight(item');
    const end = source.indexOf('private stopForPreflight');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    const gate = body.indexOf('this.globalOwnerPreflight(item)');
    const executor = body.indexOf('this.executor.preflight(');
    expect(gate).toBeGreaterThan(-1);
    expect(executor).toBeGreaterThan(gate);
  });

  test('executeWorkItem runs preflight BEFORE executor.execute', () => {
    const source = moduleSource(ORCHESTRATOR);
    const start = source.indexOf('private async executeWorkItem(item');
    const end = source.indexOf('private reserveReproductionBudget(cluster');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    const preflight = body.indexOf('await this.preflight(item)');
    const execute = body.indexOf('await this.executor.execute(');
    expect(preflight).toBeGreaterThan(-1);
    expect(execute).toBeGreaterThan(preflight);
  });

  test('every executor.reproduce site is preceded by an owner-policy preflight', () => {
    const source = moduleSource(ORCHESTRATOR);
    const firstRepro = source.indexOf('await this.executor.reproduce(');
    expect(firstRepro).toBeGreaterThan(-1);
    const promoteGate = source.indexOf('globalOwnerPreflight({ workItemId: `reproduce:');
    expect(promoteGate).toBeGreaterThan(-1);
    expect(promoteGate).toBeLessThan(firstRepro);

    const secondRepro = source.indexOf('await this.executor.reproduce(', firstRepro + 1);
    expect(secondRepro).toBeGreaterThan(-1);
    const nearestPreflightBeforeSecond = source.lastIndexOf('await this.preflight(item)', secondRepro);
    expect(nearestPreflightBeforeSecond).toBeGreaterThan(firstRepro);
    expect(nearestPreflightBeforeSecond).toBeLessThan(secondRepro);
  });

  test('estimateReproduction is reachable only after its gating preflights', () => {
    const source = moduleSource(ORCHESTRATOR);
    const estimate = source.indexOf('this.executor.estimateReproduction');
    expect(estimate).toBeGreaterThan(-1);
    // Both reserveReproductionBudget call sites sit after their preflight gates.
    const promoteGate = source.indexOf('globalOwnerPreflight({ workItemId: `reproduce:');
    const reproOnlyStart = source.indexOf('private async runReproductionOnly');
    const reproOnlyPreflight = source.indexOf('await this.preflight(item)', reproOnlyStart);
    const firstReserve = source.indexOf('this.reserveReproductionBudget(cluster, representative)');
    const secondReserve = source.indexOf('this.reserveReproductionBudget(cluster, representative)', firstReserve + 1);
    expect(promoteGate).toBeLessThan(firstReserve);
    expect(reproOnlyPreflight).toBeGreaterThan(-1);
    expect(reproOnlyPreflight).toBeLessThan(secondReserve);
    expect(estimate).toBeGreaterThan(promoteGate);
  });

  test('executeOwnerScoped never reaches the executor for blocked operations', () => {
    let executed = false;
    expect(() => executeOwnerScoped('DYNAMODB_DATA_ORACLE', () => { executed = true; }))
      .toThrow(OWNER_POLICY_BLOCKED);
    expect(executed).toBe(false);

    executed = false;
    const value = executeOwnerScoped('PRIVATE_TRIAGE', () => {
      executed = true;
      return 'ran';
    });
    expect(executed).toBe(true);
    expect(value).toBe('ran');
  });

  test('blocked-operation error messages carry bounded categorical detail only', () => {
    const adversarial = `DYNAMODB_DATA_ORACLE ${SENTINELS[0]}`;
    let message = '';
    try {
      throw new OwnerPolicyBlockedError(adversarial);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message.startsWith(`${OWNER_POLICY_BLOCKED}: `)).toBe(true);
    assertFreeOfSentinels(message, 'owner-policy blocked error');
    // The decision record keeps the canonicalized operation identity...
    expect(decideOwnerScope(adversarial).operation).toContain('DYNAMODB_DATA_ORACLE');
    // ...while every frozen class stays blocked and allowed classes pass.
    for (const operation of FROZEN_OWNER_OPERATIONS) {
      expect(decideOwnerScope(operation).allowed, operation).toBe(false);
    }
    expect(decideOwnerScope('PRIVATE_TRIAGE').allowed).toBe(true);
  });
});
