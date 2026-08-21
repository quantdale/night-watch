// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — adversarial corpus fixture
// builders.
//
// Deterministic, pure builders for every adversarial scenario family. Every
// value is a synthetic structural fake: no credentials, no customer data, no
// timestamps beyond the fixed STATIC_NOW constant, no fs/network/environment
// access. Builders never randomize; calling one twice yields deep-equal
// results.
//
// Companion modules:
//   corpus/phase15p/adversarialScenarioCatalog.ts  (scenario-class registry)
//   corpus/phase15p/adversarialExecutors.ts        (synthetic executors/spies)
// ---------------------------------------------------------------------------

import {
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
  FROZEN_OWNER_OPERATIONS,
} from '../../src/core/policy/ownerScope';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import type { AnalyzerFact, AnalyzerStatus, ContractAnalysis } from '../../src/oracles/expectations/extract/analyzer';
import type {
  FamilyCurrentnessClass,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type { SourceContractObservation } from '../../src/oracles/expectations/lifecycle/sourceContractMovement';
import type {
  LocalReadinessBlocker,
  LocalReadinessInput,
  LocalReadinessContractFamily,
  LocalReadinessCurrentness,
} from '../../src/core/readiness/types';
import type {
  ProjectSnapshotContractFamily,
  ProjectSnapshotInput,
} from '../../src/core/projectSnapshot/types';
import type { CampaignVersionFingerprint } from '../../src/core/campaign/types';
import type { CandidateLifecycleRecord, CandidateLifecycleVariant } from '../../src/core/campaign/candidateLifecycle';
import { CANDIDATE_LIFECYCLE_VERSION } from '../../src/core/campaign/candidateLifecycle';
import type { MinimizationAction, MinimizationOptions } from '../../src/core/triage/types';
import { PASSIVE_MINIMIZATION_SAFETY, SYNTHETIC_MINIMIZATION_BUDGET } from '../../src/core/triage/types';
import type { SafetyVector } from '../../src/core/exploration/types';
import type { ReplayCandidateKind, ReplayOccurrence, ReplayPhase, TriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import { createTriageReplayPlanV2 } from '../../src/core/triage/replayPlan';

// ---------------------------------------------------------------------------
// Fixed synthetic identity constants (fake values only).
// ---------------------------------------------------------------------------

/** 40-hex synthetic source SHAs (isSourceSha-compatible). */
export const SOURCE_SHA_A = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';
export const SOURCE_SHA_B = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';

/** ev:sha256:<24> synthetic evidence digests (isEvidenceDigest-compatible). */
export const EVIDENCE_A = `ev:sha256:${'aa'.repeat(12)}`;
export const EVIDENCE_B = `ev:sha256:${'bb'.repeat(12)}`;
export const EVIDENCE_C = `ev:sha256:${'cc'.repeat(12)}`;

export const TARGET_READ = 'ripple.payer-exchange.read';
export const TARGET_INVENTORY = 'ripple.account-inventory.read';

export const DERIVATION_V1 = 'nightwatch.real-source-derivation.v1';
export const DERIVATION_V2 = 'nightwatch.real-source-derivation.v2';

/** Sentinel probe values used ONLY as rejected inputs (never emitted). */
export const SENTINEL_PROBES = Object.freeze([
  'CUSTOMER_SENTINEL',
  'ACCOUNT_SENTINEL',
  'EMAIL_SENTINEL',
  'COST_SENTINEL',
  'TOKEN_SENTINEL',
  'PRIVACY_SENTINEL',
] as const);

// ---------------------------------------------------------------------------
// Movement observations (sourceContractMovement).
// ---------------------------------------------------------------------------

export type MovementObservationOverrides = Partial<Omit<SourceContractObservation, 'analysis'>> & {
  readonly analysis?: ContractAnalysis | null;
};

export function movementObservation(overrides: MovementObservationOverrides = {}): SourceContractObservation {
  return {
    targetId: TARGET_READ,
    sourceSha: SOURCE_SHA_A,
    evidenceDigest: EVIDENCE_A,
    derivationVersion: DERIVATION_V2,
    currentness: 'CURRENT',
    ...overrides,
  };
}

export function analyzerAnalysis(status: AnalyzerStatus, facts: readonly AnalyzerFact[] = []): ContractAnalysis {
  return {
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    language: 'php',
    symbol: 'syntheticSymbol',
    status,
    proofClass: status === 'PROVEN' ? 'SCALAR_TYPE_FROM_CAST' : null,
    facts,
    blockerCode: null,
    safeEvidence: 'synthetic-safe-evidence',
  };
}

/** Compatible evolution: current facts are a strict superset of previous. */
export function compatibleAnalysisPair(): { readonly previous: ContractAnalysis; readonly current: ContractAnalysis } {
  return {
    previous: analyzerAnalysis('PROVEN', [
      { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['OBJECT'] },
    ]),
    current: analyzerAnalysis('PROVEN', [
      { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['ARRAY', 'OBJECT'] },
    ]),
  };
}

/** Breaking evolution: a previously proven allowed type was removed. */
export function breakingAnalysisPair(): { readonly previous: ContractAnalysis; readonly current: ContractAnalysis } {
  return {
    previous: analyzerAnalysis('PROVEN', [
      { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['ARRAY', 'OBJECT'] },
    ]),
    current: analyzerAnalysis('PROVEN', [
      { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['OBJECT'] },
    ]),
  };
}

// ---------------------------------------------------------------------------
// Local readiness inputs.
// ---------------------------------------------------------------------------

function readinessFamily(overrides: Partial<LocalReadinessContractFamily> & { readonly familyId: string; readonly targetId: string }): LocalReadinessContractFamily {
  return {
    kind: 'DEEP_TYPE',
    hasExpectationId: true,
    campaignEligible: true,
    historicalImmutable: false,
    ...overrides,
  };
}

export function healthyReadinessInput(overrides: {
  readonly families?: readonly LocalReadinessContractFamily[];
  readonly currentness?: Readonly<Record<string, LocalReadinessCurrentness>>;
  readonly blockers?: readonly LocalReadinessBlocker[];
  readonly checkpointCompatibility?: LocalReadinessInput['checkpointCompatibility'];
  readonly externalCi?: LocalReadinessInput['externalCi'];
  readonly observedVersions?: Readonly<Record<string, string>> | null;
  readonly applies?: boolean;
}): LocalReadinessInput {
  const families = overrides.families ?? [
    readinessFamily({ familyId: 'lifecycle:synthetic.deep', targetId: TARGET_READ }),
    readinessFamily({
      familyId: `lifecycle:mechanical-probe:${TARGET_READ}`,
      targetId: TARGET_READ,
      kind: 'MECHANICAL_PROBE',
      hasExpectationId: false,
      campaignEligible: false,
    }),
  ];
  return {
    applies: overrides.applies ?? true,
    sourceContracts: {
      approvedTargetIds: [TARGET_READ],
      families,
      currentnessByTargetId: overrides.currentness ?? { [TARGET_READ]: 'CURRENT' },
    },
    campaign: {
      pinnedVersions: { slot: 'nightwatch.synthetic.pinned.v1' },
      observedVersions: overrides.observedVersions !== undefined ? overrides.observedVersions : { slot: 'nightwatch.synthetic.pinned.v1' },
    },
    checkpointCompatibility: overrides.checkpointCompatibility ?? 'CURRENT_SCHEMA',
    unresolvedBlockers: overrides.blockers ?? [],
    externalCi: overrides.externalCi ?? 'UNKNOWN',
    ownerScope: {
      status: OWNER_SCOPE_STATUS,
      reason: OWNER_SCOPE_REASON,
      frozenOperationCount: FROZEN_OWNER_OPERATIONS.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Project snapshot inputs.
// ---------------------------------------------------------------------------

function snapshotFamily(overrides: Partial<ProjectSnapshotContractFamily> & { readonly familyId: string }): ProjectSnapshotContractFamily {
  return {
    targetId: TARGET_READ,
    kind: 'DEEP_TYPE',
    scope: 'ITEM_FIELD_TYPE',
    expectationId: 'exp:ripple.payer-exchange.v1',
    derivationVersion: DERIVATION_V2,
    evidenceVersion: 'nightwatch.source-evidence-digest.v1',
    currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
    campaignEligible: 'CAMPAIGN_ELIGIBLE',
    predecessorFamilyId: null,
    successorFamilyId: null,
    historicalImmutable: false,
    ...overrides,
  };
}

export function snapshotInputFixture(overrides: {
  readonly contractRegistryVersion?: string;
  readonly families?: readonly ProjectSnapshotContractFamily[];
  readonly recipeSchemaVersions?: readonly string[];
  readonly derivationVersions?: readonly string[];
  readonly approvedTargets?: readonly string[];
  readonly analyzerVersion?: string;
  readonly replayPlanVersions?: readonly string[];
  readonly semanticReceiptVersion?: string;
  readonly campaignVersions?: CampaignVersionFingerprint;
  readonly dossierVersions?: readonly string[];
  readonly ownerScope?: ProjectSnapshotInput['ownerScope'];
  readonly adoptedCaseCatalogEntries?: readonly Record<string, unknown>[];
} = {}): ProjectSnapshotInput {
  return {
    contractRegistryVersion: overrides.contractRegistryVersion ?? 'nightwatch.contract-lifecycle-registry.v1',
    contractFamilies: overrides.families ?? [snapshotFamily({ familyId: 'lifecycle:exp:ripple.payer-exchange.v1' })],
    recipeSchemaVersions: overrides.recipeSchemaVersions ?? ['nightwatch.real-source-expectation-recipe.v2'],
    derivationVersions: overrides.derivationVersions ?? [DERIVATION_V2],
    approvedTargets: overrides.approvedTargets ?? [TARGET_READ],
    analyzerVersion: overrides.analyzerVersion ?? MECHANICAL_ANALYZER_VERSION,
    replayPlanVersions: overrides.replayPlanVersions ?? ['nightwatch.triage-replay-plan.private.v1', 'nightwatch.triage-replay-plan.private.v2'],
    semanticReceiptVersion: overrides.semanticReceiptVersion ?? 'nightwatch.semantic-evaluation-receipt.v2',
    campaignVersions: overrides.campaignVersions ?? ({ campaignSchemaVersion: 'nightwatch.campaign.private.v1' } as CampaignVersionFingerprint),
    dossierVersions: overrides.dossierVersions ?? ['nightwatch.bug-dossier.private.v1', 'nightwatch.bug-dossier.private.v2'],
    ownerScope: overrides.ownerScope ?? {
      policyVersion: 'nightwatch.owner-scope-policy.v1',
      status: OWNER_SCOPE_STATUS,
      reason: OWNER_SCOPE_REASON,
    },
    adoptedCaseCatalogEntries: overrides.adoptedCaseCatalogEntries ?? [{ caseId: 'synthetic-case-1' }],
  };
}

// ---------------------------------------------------------------------------
// Candidate lifecycle records.
// ---------------------------------------------------------------------------

export function lifecycleRecordFixture(
  variant: CandidateLifecycleVariant = 'PROTOCOL_ONLY',
  overrides: Partial<Omit<CandidateLifecycleRecord, 'variant' | 'lifecycleVersion'>> = {},
): CandidateLifecycleRecord {
  return Object.freeze({
    lifecycleVersion: CANDIDATE_LIFECYCLE_VERSION,
    variant,
    state: 'OBSERVED',
    transitionCount: 0,
    lastReasonCode: null,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Minimization inputs.
// ---------------------------------------------------------------------------

export const ZERO_REPLAY_SAFETY: SafetyVector = Object.freeze({
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
});

export const MINIMIZER_ROUTE = '/ripple/exchange';
export const MINIMIZER_CATALOG_VERSION = 'nightwatch.phase15p.adversarial-catalog.v1';

export function minimizerAction(actionId: string): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass: MINIMIZER_ROUTE,
    sourceApproved: true as const,
    catalogVersion: MINIMIZER_CATALOG_VERSION,
  };
}

export function minimizerSequence(ids: readonly string[]): readonly MinimizationAction[] {
  return ids.map(minimizerAction);
}

export interface MinimizerFixtureOptions {
  /** Predicate over retained action-id sets deciding reproduction. */
  readonly reproduces: (actionIds: ReadonlySet<string>) => boolean;
  readonly anomalyFingerprint?: string;
  readonly budget?: MinimizationOptions['budget'];
  readonly safety?: MinimizationOptions['safety'];
  readonly preconditionCheck?: MinimizationOptions['preconditionCheck'];
}

export function minimizerOptions(sequenceIds: readonly string[], options: MinimizerFixtureOptions): MinimizationOptions {
  const anomalyFingerprint = options.anomalyFingerprint ?? `fp:sha256:${'ad'.repeat(12)}`;
  return {
    originalSequence: minimizerSequence(sequenceIds),
    anomalyFingerprint,
    sourceVersion: 'nightwatch.phase15p.adversarial-source.v1',
    catalogVersion: MINIMIZER_CATALOG_VERSION,
    approvedActionIds: new Set(sequenceIds),
    safety: options.safety ?? PASSIVE_MINIMIZATION_SAFETY,
    budget: options.budget ?? SYNTHETIC_MINIMIZATION_BUDGET,
    ...(options.preconditionCheck !== undefined ? { preconditionCheck: options.preconditionCheck } : {}),
    replay: (candidate) => {
      const ids = new Set(candidate.map((item) => item.actionId));
      if (options.reproduces(ids)) {
        return { status: 'FAILURE' as const, anomalyFingerprint, safety: ZERO_REPLAY_SAFETY };
      }
      return { status: 'PASS' as const, safety: ZERO_REPLAY_SAFETY };
    },
  };
}

// ---------------------------------------------------------------------------
// Replay plans (occurrence form).
// ---------------------------------------------------------------------------

export const REPLAY_FINGERPRINT = `fp:sha256:${'fa'.repeat(12)}`;
export const REPLAY_ROUTE = '/payer-exchange-rate-v2';
export const REPLAY_CONTRACT_VERSION = 'nightwatch.phase15p.adversarial-contract.v1';
export const REPLAY_CONTRACT_DIGEST = `sha256:${'cd'.repeat(32)}`;
export const REPLAY_SOURCE_VERSION = 'nightwatch.phase15p.adversarial-replay-source.v1';
/** Approved KNOWN_READ exploration actions from the ripple phase-4 catalog. */
export const EXPLORATION_ACTION_A = 'p4.j1.vendor-local.aws';
export const EXPLORATION_ACTION_B = 'p4.j1.vendor-local.azure';

export function replayOccurrences(ids: readonly string[]): ReplayOccurrence[] {
  return ids.map((id, index) => ({ ordinal: index, expectedActionId: id }));
}

export function explorationPlanFixture(
  originalIds: readonly string[],
  retainedOrdinals: readonly number[],
  phase: ReplayPhase = 'REDUCED_CANDIDATE',
  candidateKind: ReplayCandidateKind = 'EXPLORATION',
): TriageReplayPlanV2 {
  return createTriageReplayPlanV2({
    candidateKind,
    anomalyFingerprint: REPLAY_FINGERPRINT,
    originalOccurrences: replayOccurrences(originalIds),
    retainedOccurrenceOrdinals: [...retainedOrdinals],
    phase,
    targetId: 'phase15p.adversarial.exploration.target',
    contractVersion: REPLAY_CONTRACT_VERSION,
    contractDigest: REPLAY_CONTRACT_DIGEST,
    catalogVersion: MINIMIZER_CATALOG_VERSION,
    sourceVersion: REPLAY_SOURCE_VERSION,
    routeClass: REPLAY_ROUTE,
  });
}

// ---------------------------------------------------------------------------
// Family-currentness helpers shared by movement/composition scenarios.
// ---------------------------------------------------------------------------

export const ALL_FAMILY_CURRENTNESS_CLASSES: readonly FamilyCurrentnessClass[] = [
  'CURRENT',
  'STALE',
  'UNAVAILABLE',
  'NOT_APPLICABLE',
];
