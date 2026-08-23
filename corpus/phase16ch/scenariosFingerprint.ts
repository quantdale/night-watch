// ---------------------------------------------------------------------------
// Phase 16CH corpus — FINGERPRINT_FIELD matrix.
// Every load-bearing portfolioBinding field is mutated one at a time (plus
// multi-field drift combos); each must either change campaign identity or be
// refused by manifest validation BEFORE executor use. An UNCHANGED outcome is
// a resume-fingerprint escape.
// ---------------------------------------------------------------------------

import { createCampaignManifest } from "../../src/core/campaign";
import { campaignDigest, validateCampaignManifest } from "../../src/core/campaign/identity";
import { admitPortfolioRuntimePlan } from "../../src/core/portfolio/runtimeBinding";
import type { CampaignPortfolioRuntimeBinding } from "../../src/core/campaign/types";
import {
  FIXTURE_AUTHORIZATION,
  OTHER_HANDOFF_ID,
  OTHER_PLAN_STYLE_ID,
  OTHER_PF_ID,
  SYNTHETIC_MEMBER_ID,
  buildScopedRuntimePlan,
  type HardeningScenario,
  type Mutable,
  type MutableBinding,
} from "./core";
import { portfolioCampaignInput } from "./seamComposition";

export function fingerprintFieldScenarios(): {
  readonly scenarios: HardeningScenario[];
  readonly baseline: {
    readonly campaignId: string;
    readonly manifestFingerprint: string;
    readonly bindingJson: string;
  };
} {
  const scope = buildScopedRuntimePlan({ targets: ["ripple.payer-exchange.read"] });
  const binding = admitPortfolioRuntimePlan({
    universe: scope.universe,
    plan: scope.plan,
    handoff: scope.handoff,
    authorizationToken: FIXTURE_AUTHORIZATION,
  });
  const baselineManifest = createCampaignManifest(portfolioCampaignInput(binding));
  validateCampaignManifest(baselineManifest);

  const scenarios: HardeningScenario[] = [];
  const add = (
    id: string,
    mutate: (binding: MutableBinding) => void,
    expectRefusal: boolean,
  ) => {
    scenarios.push({
      id,
      group: "FINGERPRINT_FIELD",
      expected: expectRefusal ? "REFUSED" : "IDENTITY_CHANGED",
      run: () => {
        try {
          const mutated = JSON.parse(JSON.stringify(binding)) as MutableBinding;
          mutate(mutated);
          const manifest = createCampaignManifest(portfolioCampaignInput(mutated as CampaignPortfolioRuntimeBinding));
          validateCampaignManifest(manifest);
          return manifest.campaignId === baselineManifest.campaignId && manifest.manifestFingerprint === baselineManifest.manifestFingerprint
            ? "UNCHANGED"
            : "IDENTITY_CHANGED";
        } catch {
          return "REFUSED";
        }
      },
    });
  };

  add("FP-001-schema-version-drift", (b) => { (b.schemaVersion as unknown as string) = "nightwatch.campaign-portfolio-runtime-binding.v0"; }, true);
  add("FP-002-plan-id-valid-format-drift", (b) => { b.planId = OTHER_PLAN_STYLE_ID; }, false);
  add("FP-003-plan-manifest-version-drift", (b) => { (b.planManifestVersion as unknown as string) = "nightwatch.campaign-plan-manifest.v0"; }, false);
  add("FP-004-plan-manifest-digest-drift", (b) => { b.planManifestDigest = OTHER_PLAN_STYLE_ID; }, false);
  add("FP-005-portfolio-digest-drift", (b) => { b.portfolioDigest = OTHER_PF_ID; }, false);
  add("FP-006-handoff-version-drift", (b) => { (b.handoffVersion as unknown as string) = "nightwatch.dev-handoff.v0"; }, false);
  add("FP-007-handoff-digest-drift", (b) => { b.handoffDigest = OTHER_HANDOFF_ID; }, false);
  add("FP-008-real-universe-version-drift", (b) => { (b.realUniverseVersion as unknown as string) = "nightwatch.portfolio-real-universe.v0"; }, false);
  add("FP-009-real-universe-digest-drift", (b) => { b.realUniverseDigest = OTHER_PF_ID; }, false);
  add("FP-010-budget-mapping-version-drift", (b) => { (b.budgetMappingVersion as unknown as string) = "nightwatch.portfolio-budget-mapping.v0"; }, false);
  add("FP-011-required-authorization-class-drift", (b) => { b.requiredAuthorizationClass = "WRONG_TOKEN_CLASS"; }, false);
  add("FP-012-environment-restriction-weakened", (b) => { (b.environmentRestriction as unknown as string) = "NEXT_ALLOWED"; }, true);
  add("FP-013-executable-at-rest-flipped", (b) => { (b.executableAtRest as unknown as boolean) = true; }, true);
  add("FP-014-members-emptied", (b) => { (b.members as unknown as unknown[]) = []; }, true);
  add("FP-015-member-target-swapped", (b) => { (b.members[0] as Mutable<{ targetId: string }>).targetId = "ripple.common-exchange.read"; }, false);
  add("FP-016-member-kind-crossed", (b) => {
    // Flip members[0]'s kind to a DIFFERENT kind (whichever it currently is):
    // the incoherent lineage/feasibility shape must be refused.
    const member0 = b.members[0]!;
    const current = member0.kind;
    (member0 as { kind: string }).kind = current === "JOURNEY" ? "API" : "JOURNEY";
  }, true);
  add("FP-017-member-plan-order-drift", (b) => { (b.members[0] as Mutable<{ planOrder: number }>).planOrder = 9; }, true);
  add("FP-018-member-zero-units", (b) => { (b.members[0] as Mutable<{ allocatedUnits: number }>).allocatedUnits = 0; }, true);
  add("FP-019-member-retry-drift", (b) => { (b.members[0] as Mutable<{ maxRetries: number }>).maxRetries = 42; }, false);
  add("FP-020-member-journey-nulled", (b) => { (b.members[0] as Mutable<{ journeyId: string | null }>).journeyId = null; }, true);
  add("FP-021-work-item-id-drift", (b) => { (b.members[0] as Mutable<{ workItemId: string }>).workItemId = "journey:bogus"; }, true);
  add("FP-022-member-id-drift", (b) => { (b.members[0] as Mutable<{ memberId: string }>).memberId = SYNTHETIC_MEMBER_ID; }, false);
  add("FP-023-api-operation-drift", (b) => {
    const api = b.members.find((member) => member.kind === "API");
    if (api !== undefined) (api as Mutable<{ apiOperationId: string | null }>).apiOperationId = "ripple.common-exchange.read";
  }, true);
  add("FP-024-envelope-leak-onto-journey", (b) => { (b.members[0] as Mutable<{ envelopeId: string | null }>).envelopeId = "E1-J1-payer-exchange"; }, true);
  add("FP-025-seed-leak-onto-journey", (b) => { (b.members[0] as Mutable<{ seed: string | null }>).seed = "0x0000000000000101"; }, true);
  // budgetCaps drift is REFUSED (not merely identity-changing): the selection
  // input boundary enforces mapped-policy == frozen caps and monotone
  // restriction against the approved profile (CAMPAIGN_PORTFOLIO_BUDGET_CAPS_
  // MISMATCH / CAMPAIGN_PORTFOLIO_BUDGET_EXPANSION_FORBIDDEN).
  add("FP-026-budget-cap-api-executions-drift", (b) => { (b.budgetCaps as { maxApiExecutions: number }).maxApiExecutions = 999; }, true);
  add("FP-027-budget-cap-negative", (b) => { (b.budgetCaps as Mutable<{ maxTotalActions: number }>).maxTotalActions = -1; }, true);
  add("FP-028-unknown-binding-field", (b) => { (b as unknown as Record<string, unknown>).TOKEN_SENTINEL = "TOKEN_SENTINEL"; }, true);
  add("FP-029-multi-field-plan-plus-universe-drift", (b) => {
    b.planId = OTHER_PLAN_STYLE_ID;
    b.realUniverseDigest = OTHER_PF_ID;
  }, false);
  add("FP-030-multi-field-members-plus-caps-drift", (b) => {
    (b.members[0] as { maxRetries: number }).maxRetries = 7;
    (b.budgetCaps as { maxApiExecutions: number }).maxApiExecutions = 55;
  }, true);
  add("FP-031-member-order-shuffle", (b) => {
    const reordered = [...b.members].reverse();
    for (const [index, member] of reordered.entries()) (member as { planOrder: number }).planOrder = index;
    (b as { members: typeof reordered }).members = reordered;
  }, false);

  return {
    scenarios,
    baseline: {
      campaignId: baselineManifest.campaignId,
      manifestFingerprint: baselineManifest.manifestFingerprint,
      bindingJson: JSON.stringify(binding),
    },
  };
}

/** Legacy byte/digest stability: binding ABSENT must recompute identically. */
export function legacyIdentityStabilityCheck(): string {
  // The conditional-spread contract: an input WITHOUT a portfolioBinding key
  // must produce exactly the same canonical identity bytes as before Phase 16C.
  const withUndefined = createCampaignManifest(portfolioCampaignInput(undefined));
  const explicitUndefinedKey = { ...portfolioCampaignInput(undefined), portfolioBinding: undefined };
  const idA = withUndefined.campaignId;
  const idB = createCampaignManifest(explicitUndefinedKey).campaignId;
  if (idA !== idB) return "LEGACY_IDENTITY_UNSTABLE";
  // Digest-level: canonical serialization of the binding-free input contains
  // no portfolioBinding key at all (present-then-null would alter bytes).
  const serialized = JSON.stringify(portfolioCampaignInput(undefined));
  return serialized.includes("portfolioBinding") ? "BINDING_KEY_LEAKED" : "LEGACY_STABLE";
}

void campaignDigest;
