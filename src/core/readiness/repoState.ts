// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A10 — current-repo readiness input adapter.
//
// Builds a `LocalReadinessInput` from the CURRENT repository state using only
// authoritative in-source facts (contract lifecycle registry, approved target
// registry, owner-scope policy markers, campaign version constants). This is
// the honest local view:
//
//   - currentness: NOT measured here (no snapshot freshness evidence is read),
//     so every approved target is NOT_EVALUATED;
//   - campaign observed versions: null (a runtime fingerprint cannot be
//     measured offline), pinned versions come from source constants only;
//   - checkpoint compatibility: UNKNOWN (no persisted checkpoint is inspected
//     — reading private local state is out of scope for a status surface);
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
import type { LocalReadinessInput } from './types';

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

/** Build the readiness input describing the current repository state. */
export function collectLocalReadinessInputFromRepo(): LocalReadinessInput {
  const registry = getContractLifecycleRegistry();
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
      // Honest default: this adapter reads no freshness evidence.
      currentnessByTargetId: {},
    },
    campaign: {
      pinnedVersions: REPO_PINNED_CAMPAIGN_VERSIONS,
      observedVersions: null,
    },
    // No persisted checkpoint is inspected by a status surface.
    checkpointCompatibility: 'UNKNOWN',
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
