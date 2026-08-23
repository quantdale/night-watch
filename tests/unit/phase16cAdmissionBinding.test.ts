// ---------------------------------------------------------------------------
// Phase 16C W2/W3/W4 — strict admission, versioned restrictive budget
// mapping, and exact selected-member -> work-item binding.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  ERR_PORTFOLIO_ADMISSION,
  PORTFOLIO_BUDGET_MAPPING_VERSION,
  mapPortfolioBudget,
  parseDevHandoffPackageDocument,
  parsePortfolioRuntimePlanDocument,
} from '../../src/core/portfolio/runtimeBinding';
import {
  allocatePortfolioBudget,
  buildCampaignPlanManifest,
  buildDevHandoffPackage,
  buildPortfolio,
} from '../../src/core/portfolio';
import { buildCurrentRealApprovedUniverse } from '../../src/core/portfolio/realUniverse';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../../src/core/campaign/budget';
import { renderDocumentJson } from '../../src/core/portfolio/report';
import type { CampaignPlanManifest, DevHandoffPackage } from '../../src/core/portfolio';
import type { RealApprovedUniverse } from '../../src/core/portfolio/runtimeBinding';
import {
  INITIAL_PROFILE_SNAPSHOT,
  FIXTURE_TOKEN,
  admitFixture,
  buildAdmissibleRuntimePlan,
  DEFAULT_ALLOCATION_POLICY,
} from '../../corpus/phase16c/runtimeBindingFixtures';

function admissionReason(operation: () => unknown): string {
  try {
    operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(message.startsWith(ERR_PORTFOLIO_ADMISSION)).toBe(true);
    return message.split(':')[1]!;
  }
  throw new Error('expected admission rejection');
}

test.describe('Phase 16C strict handoff/plan admission (W2)', () => {
  test('positive path: full document parse -> admission -> frozen binding', () => {
    const { universe, plan, handoff, document } = buildAdmissibleRuntimePlan();
    // Round-trip the combined document through canonical JSON exactly like a
    // launcher file read.
    const parsed = parsePortfolioRuntimePlanDocument(JSON.parse(renderDocumentJson(document)));
    expect(parsed.handoff.digest).toBe(handoff.digest);
    expect(parsed.plan.planId).toBe(plan.planId);
    const binding = admitFixture({ universe, plan: parsed.plan, handoff: parsed.handoff });
    expect(binding.schemaVersion).toBe('nightwatch.campaign-portfolio-runtime-binding.v1');
    expect(binding.executableAtRest).toBe(false);
    expect(binding.environmentRestriction).toBe('DEV_ONLY_NEVER_PRODUCTION');
    expect(binding.handoffDigest).toBe(handoff.digest);
    expect(binding.planId).toBe(plan.planId);
    expect(binding.planManifestDigest).toBe(plan.manifestDigest);
    expect(binding.portfolioDigest).toBe(plan.portfolioDigest);
    expect(binding.realUniverseVersion).toBe(universe.version);
    expect(binding.realUniverseDigest).toBe(universe.digest);
    expect(binding.budgetMappingVersion).toBe(PORTFOLIO_BUDGET_MAPPING_VERSION);
    expect(binding.members.length).toBe(plan.selectedMembers.length);
    // Every bound member carries the full provenance chain.
    for (const [index, member] of binding.members.entries()) {
      const planMember = plan.selectedMembers[index]!;
      expect(member.memberId).toBe(planMember.memberId);
      expect(member.targetId).toBe(planMember.targetId);
      expect(member.kind).toBe(planMember.kind);
      expect(member.planOrder).toBe(planMember.order);
      expect(member.allocatedUnits).toBe(planMember.allocatedUnits);
      expect(member.workItemId).toMatch(/^(journey|api):/);
      expect(member.journeyId).not.toBeNull();
    }
  });

  test('handoff remains inert and strictly parsed; tampered digest fails closed', () => {
    const { handoff } = buildAdmissibleRuntimePlan();
    expect(parseDevHandoffPackageDocument(JSON.parse(renderDocumentJson(handoff))).digest).toBe(handoff.digest);
    const raw = JSON.parse(renderDocumentJson(handoff)) as Record<string, unknown>;
    expect(() => parseDevHandoffPackageDocument({ ...raw, digest: 'handoff:sha256:000000000000000000000000' })).toThrow(/digestRecomputationMismatch/);
    expect(() => parseDevHandoffPackageDocument({ ...raw, executable: true })).toThrow(/not-inert/);
    expect(() => parseDevHandoffPackageDocument({ ...raw, extra: 1 })).toThrow(/DEV_HANDOFF_UNKNOWN_FIELD/);
  });

  test('authorization: missing and wrong tokens rejected categorically', () => {
    const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
    expect(admissionReason(() => admitFixture({ universe, plan, handoff, token: null }))).toBe('AUTHORIZATION_MISSING');
    expect(admissionReason(() => admitFixture({ universe, plan, handoff, token: '' }))).toBe('AUTHORIZATION_MISSING');
    expect(admissionReason(() => admitFixture({ universe, plan, handoff, token: 'PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE' }))).toBe('AUTHORIZATION_MISMATCH');
    expect(admissionReason(() => admitFixture({ universe, plan, handoff, token: `${FIXTURE_TOKEN}X` }))).toBe('AUTHORIZATION_MISMATCH');
  });

  test('authorization never mutates plan identity, members, order, or budgets', () => {
    const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
    const withAuth = admitFixture({ universe, plan, handoff });
    expect(withAuth.requiredAuthorizationClass).toBe(DEV_HANDOFF_REQUIRED_AUTHORIZATION);
    // Binding output is a pure function of (plan, handoff, universe); the
    // authorization value appears ONLY as the recorded class marker.
    const snapshotA = JSON.stringify(withAuth);
    const withAuthAgain = admitFixture({ universe, plan, handoff });
    expect(snapshotA).toBe(JSON.stringify(withAuthAgain));
    // Source artifacts untouched by admission.
    expect(handoff.executable).toBe(false);
    expect(plan.manifestDigest.length).toBeGreaterThan(0);
  });

  test('synthetic-only member ids resolve to SYNTHETIC_TARGET_REJECTED', () => {
    const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
    // Forge a CONSISTENT member-list swap across plan AND handoff (so the
    // list-coherence gate passes) with an id that belongs to no real-universe
    // identity — exactly the synthetic-fixture-member attack shape.
    const syntheticId = 'pm:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    const forgedPlan = JSON.parse(renderDocumentJson(plan)) as Record<string, unknown>;
    const members = forgedPlan.selectedMembers as Array<Record<string, unknown>>;
    members[0] = { ...members[0]!, memberId: syntheticId };
    const forgedHandoff = JSON.parse(renderDocumentJson(handoff)) as Record<string, unknown>;
    forgedHandoff.selectedMemberIds = [syntheticId, ...((handoff.selectedMemberIds ?? []).slice(1))];
    expect(admissionReason(() => admitFixture({
      universe,
      plan: forgedPlan as unknown as CampaignPlanManifest,
      handoff: forgedHandoff as unknown as DevHandoffPackage,
    }))).toBe('SYNTHETIC_TARGET_REJECTED');
  });

  test('cross-plan admission rejects mismatched member lists, digests, and totals', () => {
    const first = buildAdmissibleRuntimePlan({ totalUnits: 12 });
    const second = buildAdmissibleRuntimePlan({ totalUnits: 6 });
    // Both sides individually parser-valid; identities differ.
    expect(first.plan.planId).not.toBe(second.plan.planId);
    const reasons = new Set<string>();
    reasons.add(admissionReason(() => admitFixture({ universe: first.universe, plan: second.plan, handoff: first.handoff })));
    reasons.add(admissionReason(() => admitFixture({ universe: first.universe, plan: first.plan, handoff: second.handoff })));
    expect(reasons.size).toBeGreaterThanOrEqual(1);
    for (const reason of reasons) {
      expect(['MEMBER_LIST_MISMATCH', 'MANIFEST_DIGEST_MISMATCH', 'TOTAL_UNITS_MISMATCH', 'PLAN_ID_MISMATCH']).toContain(reason);
    }
  });

  test('exploration members are explicitly runtime-restricted and fail admission closed', () => {
    const universe = buildCurrentRealApprovedUniverse();
    const explorations = universe.members.filter((member) => member.kind === 'EXPLORATION');
    expect(explorations.length).toBeGreaterThan(0);
    expect(explorations.every((member) => !member.runtimeAdmissible)).toBe(true);
    const allocation = allocatePortfolioBudget({ portfolio: universe.portfolio, policy: DEFAULT_ALLOCATION_POLICY });
    const explorationSelected = allocation.selected.some((entry) => entry.kind === 'EXPLORATION');
    const plan = buildCampaignPlanManifest({ portfolio: universe.portfolio, allocation });
    const handoff = buildDevHandoffPackage(plan, universe.portfolio.portfolioDigest);
    if (explorationSelected) {
      expect(admissionReason(() => admitFixture({ universe, plan, handoff }))).toBe('MEMBER_RUNTIME_RESTRICTED');
    } else {
      expect(admitFixture({ universe, plan, handoff }).members.every((member) => member.kind !== 'EXPLORATION')).toBe(true);
    }
  });

  test('API members without their anchor journey fail lineage completeness', () => {
    const { universe } = buildAdmissibleRuntimePlan();
    const apiOnlyInputs = universe.members
      .filter((member) => member.kind === 'API')
      .map((member) => universe.portfolio.members.find((candidate) => candidate.memberId === member.memberId)!.input);
    const portfolio = buildPortfolio({ approvedTargets: universe.approvedTargets, memberInputs: apiOnlyInputs });
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: { policyVersion: 'nightwatch.portfolio-allocation.v1', totalUnits: 12, perMemberCeiling: 6, floorUnits: 2, starvationThresholdBuckets: 5, retryCeilingPerMember: 1, reservedExplorationUnits: 0 },
    });
    expect(allocation.selected.length).toBeGreaterThan(0);
    const plan = buildCampaignPlanManifest({ portfolio, allocation });
    const handoff = buildDevHandoffPackage(plan, portfolio.portfolioDigest);
    expect(admissionReason(() => admitFixture({ universe, plan, handoff }))).toBe('MEMBER_LINEAGE_INCOMPLETE');
  });

  test('blocked/frozen members can never be admitted even if planned', () => {
    const { universe } = buildAdmissibleRuntimePlan();
    // Build a plan over a portfolio whose journey member carries an owner blocker.
    const inputs = universe.portfolio.members.map((member) =>
      member.input.kind === 'JOURNEY'
        ? { ...member.input, ownerBlockedOperations: ['DYNAMODB_DATA_ORACLE'] }
        : member.input,
    );
    const blockedPortfolio = buildPortfolio({ approvedTargets: universe.approvedTargets, memberInputs: inputs });
    const allocation = allocatePortfolioBudget({
      portfolio: blockedPortfolio,
      policy: DEFAULT_ALLOCATION_POLICY,
    });
    // The planner itself must hard-gate the blocked member to zero budget.
    const blockedSelected = allocation.selected.filter((entry) => entry.kind === 'JOURNEY' && entry.memberId === universe.portfolio.members.find((candidate) => candidate.input.kind === 'JOURNEY')!.memberId);
    expect(blockedSelected.length).toBe(0);
  });

  test('duplicate (target, kind) pairs cannot be manufactured through admission', () => {
    const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
    const duplicated = JSON.parse(renderDocumentJson(plan)) as Record<string, unknown>;
    const members = duplicated.selectedMembers as Array<Record<string, unknown>>;
    const first = members[0]!;
    const duplicate = { ...JSON.parse(renderDocumentJson(first)), order: members.length };
    members.push(duplicate);
    duplicated.totalAllocatedUnits = (duplicated.totalAllocatedUnits as number) + (duplicate.allocatedUnits as number);
    // Keep the handoff member list "coherent" so the duplicate-detection gate
    // inside the binding loop is what fires.
    const forgedHandoff = JSON.parse(renderDocumentJson(handoff)) as Record<string, unknown>;
    forgedHandoff.selectedMemberIds = [...(forgedHandoff.selectedMemberIds as string[]), duplicate.memberId];
    forgedHandoff.totalAllocatedUnits = duplicated.totalAllocatedUnits;
    expect(admissionReason(() => admitFixture({
      universe,
      plan: duplicated as unknown as CampaignPlanManifest,
      handoff: forgedHandoff as unknown as DevHandoffPackage,
    }))).toBe('DUPLICATE_TARGET_MAPPING');
  });
});

test.describe('Phase 16C versioned budget mapping (W3)', () => {
  test('mapping is monotone-restrictive for every admitted shape', () => {
    const shapes = [
      { journeys: 1, apis: 0 },
      { journeys: 1, apis: 1 },
      { journeys: 2, apis: 1 },
      { journeys: 2, apis: 2 },
      { journeys: 3, apis: 2 },
    ];
    for (const shape of shapes) {
      const caps = {
        maxTotalBrowserContexts: shape.journeys + 1,
        maxJourneyContexts: shape.journeys,
        maxExplorationContexts: 0,
        maxApiExecutions: 2 * shape.apis + 1,
        maxTotalActions: 24,
      };
      const mapped = mapPortfolioBudget({
        binding: { members: [], budgetCaps: caps },
        initial: INITIAL_PROFILE_SNAPSHOT,
      });
      expect(mapped.expansionViolations).toEqual([]);
      expect(mapped.policy.maxTotalBrowserContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalBrowserContexts);
      expect(mapped.policy.maxJourneyContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxJourneyContexts);
      expect(mapped.policy.maxExplorationContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts);
      expect(mapped.policy.maxApiExecutions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxApiExecutions);
      expect(mapped.policy.maxTotalActions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalActions);
      // Unmapped dimensions stay at the initial bounded values.
      expect(mapped.policy.maxReplays).toBe(INITIAL_PROFILE_SNAPSHOT.maxReplays);
      expect(mapped.policy.maxRuntimeMs).toBe(INITIAL_PROFILE_SNAPSHOT.maxRuntimeMs);
      expect(mapped.policy.policyVersion).toBe(INITIAL_REAL_CAMPAIGN_BUDGET.policyVersion);
    }
  });

  test('budget-expansion attempt is detected as a violation and clamped', () => {
    const expansionCaps = {
      maxTotalBrowserContexts: 60,
      maxJourneyContexts: 30,
      maxExplorationContexts: 5,
      maxApiExecutions: 600,
      maxTotalActions: 240,
    };
    const mapped = mapPortfolioBudget({
      binding: { members: [], budgetCaps: expansionCaps },
      initial: INITIAL_PROFILE_SNAPSHOT,
    });
    expect(mapped.expansionViolations).toEqual([
      'maxTotalBrowserContexts',
      'maxJourneyContexts',
      'maxExplorationContexts',
      'maxApiExecutions',
      'maxTotalActions',
    ]);
    expect(mapped.policy.maxApiExecutions).toBe(INITIAL_REAL_CAMPAIGN_BUDGET.maxApiExecutions);
  });

  test('invalid numeric caps fail mapping validation', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => mapPortfolioBudget({
        binding: { members: [], budgetCaps: { maxTotalBrowserContexts: 3, maxJourneyContexts: 1, maxExplorationContexts: 0, maxApiExecutions: 3, maxTotalActions: bad } },
        initial: INITIAL_PROFILE_SNAPSHOT,
      })).toThrow(/PORTFOLIO_BUDGET_MAPPING_INVALID/);
    }
  });
});
