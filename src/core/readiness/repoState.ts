// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 — current-repo readiness input adapter.
//
// Builds a `LocalReadinessInput` from the CURRENT repository state using only
// authoritative in-source facts (contract lifecycle registry, approved target
// registry, owner-scope policy markers, campaign version constants). This is
// the honest local view:
//
//   - currentness: NOT measured here (no snapshot freshness evidence is read),
//     so every approved target is NOT_EVALUATED — UNLESS the caller supplies
//     sourceContractMovement classifications (Phase 15P A16 seam), which then
//     populate currentness categories for known approved targets only;
//   - campaign observed versions: null (a runtime fingerprint cannot be
//     measured offline), pinned versions come from source constants only;
//   - checkpoint compatibility: UNKNOWN (no persisted checkpoint is inspected
//     — reading private local state is out of scope for a status surface);
//   - analyzer status: availability NOT_EVALUATED and observed version null
//     (the pinned MECHANICAL_ANALYZER_VERSION constant is carried as pinned
//     truth, but nothing is executed or observed offline);
//   - deferred verification: testing/typecheck/hardening are explicitly
//     DEFERRED_TO_HARDENING per owner direction (categorical, never PASS/FAIL);
//   - external CI: UNKNOWN (never a live network call);
//   - blockers: none assumed; structural source problems surface through the
//     summarizer instead of pre-seeded blocker entries.
//
// Deterministic and read-only: no fs, no network, no child processes, no env.
// ---------------------------------------------------------------------------

import {
  getContractLifecycleRegistry,
} from '../../oracles/expectations/lifecycle/contractLifecycleRegistry';
import { APPROVED_READ_ONLY_TARGET_IDS } from '../../oracles/expectations/recipes/registry';
import {
  FROZEN_OWNER_OPERATIONS,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
} from '../policy/ownerScope';
import {
  CAMPAIGN_BUDGET_POLICY_VERSION,
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  CAMPAIGN_SCHEMA_VERSION,
} from '../campaign/types';
import type { LocalReadinessCurrentness, LocalReadinessInput } from './types';
import type { SourceContractMovementClassification } from '../../oracles/expectations/lifecycle/sourceContractMovement';

/**
 * Version fingerprint keys with an authoritative pinned constant in source.
 * Keys without a pinned constant are deliberately omitted (never guessed).
 */
export const REPO_PINNED_CAMPAIGN_VERSIONS: Readonly<Record<string, string>> = Object.freeze({
  budgetPolicyVersion: CAMPAIGN_BUDGET_POLICY_VERSION,
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  candidateLifecycle: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle,
  checkpointSchemaVersion: CAMPAIGN_CHECKPOINT_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  promotionResult: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.promotionResult,
  replayBinding: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.replayBinding,
});

/**
 * Phase 15P A16 seam: fixed movement-API -> readiness-currentness projection.
 * The movement classification's fail-closed currentness CEILING (the worse of
 * its two captured observations) maps onto the readiness vocabulary:
 * CURRENT -> CURRENT, STALE -> STALE, UNAVAILABLE -> SOURCE_UNAVAILABLE, and
 * NOT_APPLICABLE (nothing evaluated) stays honestly NOT_EVALUATED.
 */
export function currentnessFromFamilyMovement(movement: SourceContractMovementClassification): LocalReadinessCurrentness {
  switch (movement.currentnessCeiling) {
    case 'CURRENT':
      return 'CURRENT';
    case 'STALE':
      return 'STALE';
    case 'UNAVAILABLE':
      return 'SOURCE_UNAVAILABLE';
    case 'NOT_APPLICABLE':
      return 'NOT_EVALUATED';
  }
}

const CURRENTNESS_SEVERITY: Readonly<Record<LocalReadinessCurrentness, number>> = Object.freeze({
  CURRENT: 0,
  NOT_EVALUATED: 1,
  STALE: 2,
  SOURCE_UNAVAILABLE: 3,
});

/**
 * Optional caller-supplied movement evidence (Phase 15P A16 seam). When
 * supplied, per-family movement classifications from
 * oracles/expectations/lifecycle/sourceContractMovement populate the
 * currentness categories of KNOWN approved targets; when absent, the adapter
 * keeps its honest all-NOT_EVALUATED default unchanged.
 */
export interface RepoStateMovementInput {
  readonly familyMovements?: readonly SourceContractMovementClassification[];
}

/** Build the readiness input describing the current repository state. */
export function collectLocalReadinessInputFromRepo(movement: RepoStateMovementInput = {}): LocalReadinessInput {
  const registry = getContractLifecycleRegistry();
  const knownTargets: ReadonlySet<string> = new Set(APPROVED_READ_ONLY_TARGET_IDS);
  // Fail-closed merge: an unknown targetId is never fabricated into state;
  // conflicting records for one target collapse to the WORSE category.
  const currentnessByTargetId: Record<string, LocalReadinessCurrentness> = {};
  for (const record of movement.familyMovements ?? []) {
    if (!knownTargets.has(record.targetId)) continue;
    const projected = currentnessFromFamilyMovement(record);
    const existing = currentnessByTargetId[record.targetId];
    if (existing === undefined || CURRENTNESS_SEVERITY[projected] > CURRENTNESS_SEVERITY[existing]) {
      currentnessByTargetId[record.targetId] = projected;
    }
  }
  return {
    applies: true,
    sourceContracts: {
      approvedTargetIds: [...APPROVED_READ_ONLY_TARGET_IDS],
      families: registry.map((family) => ({
        familyId: family.familyId,
        targetId: family.targetId,
        kind: family.kind,
        hasExpectationId: family.expectationId !== null,
        campaignEligible: family.campaignEligible === 'CAMPAIGN_ELIGIBLE',
        historicalImmutable: family.historicalImmutable,
      })),
      // Honest default: this adapter reads no freshness evidence itself;
      // currentness categories appear ONLY through the caller-supplied
      // movement records above (absent input leaves the map empty).
      currentnessByTargetId,
    },
    campaign: {
      pinnedVersions: REPO_PINNED_CAMPAIGN_VERSIONS,
      observedVersions: null,
    },
    // No persisted checkpoint is inspected by a status surface.
    checkpointCompatibility: 'UNKNOWN',
    // Analyzer status: the pinned constant is authoritative source truth; this
    // offline adapter cannot execute the analyzer or observe a stamped
    // version, so availability stays NOT_EVALUATED and observed stays null.
    analyzer: {
      availability: 'NOT_EVALUATED',
      observedVersion: null,
    },
    // Owner direction (PHASE_15P_MASS_BULK_IMPLEMENTATION_ONLY): testing,
    // typecheck and hardening validation are explicitly DEFERRED_TO_HARDENING.
    // Categorical deferment state only — never a fabricated PASS/FAIL.
    verification: {
      statesByDimension: {
        TESTING: 'DEFERRED_TO_HARDENING',
        TYPECHECK: 'DEFERRED_TO_HARDENING',
        HARDENING: 'DEFERRED_TO_HARDENING',
      },
    },
    unresolvedBlockers: [],
    // Never a live network call; callers with recorded CI truth may override.
    externalCi: 'UNKNOWN',
    ownerScope: {
      status: OWNER_SCOPE_STATUS,
      reason: OWNER_SCOPE_REASON,
      frozenOperationCount: FROZEN_OWNER_OPERATIONS.length,
    },
  };
}
