// ---------------------------------------------------------------------------
// Phase 16CH W3/W4 — budget-mapping hardening (DEF-01 permanent regressions)
// and exact-one selected-member -> work-item binding.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../../src/core/campaign/budget';
import {
  assertPortfolioBudgetFeasible,
  admitPortfolioRuntimePlan,
  mapPortfolioBudget,
} from '../../src/core/portfolio/runtimeBinding';
import type { CampaignPortfolioRuntimeBinding } from '../../src/core/campaign/types';
import {
  FIXTURE_AUTHORIZATION,
  INITIAL_PROFILE_SNAPSHOT,
  buildScopedRuntimePlan,
} from '../../corpus/phase16ch/core';
import { portfolioCampaignInput, createCampaignManifest, validateCampaignManifest } from '../../corpus/phase16ch/seamComposition';

function guardFor(journeys: number, apis: number): 'FEASIBLE' | string {
  const caps = {
    maxTotalBrowserContexts: journeys + apis + 1,
    maxJourneyContexts: journeys,
    maxExplorationContexts: 0,
    maxApiExecutions: 2 * apis + 1,
    maxTotalActions: Math.max(journeys * 8 + apis * 2, journeys + 1),
  };
  try {
    assertPortfolioBudgetFeasible({ caps, initial: INITIAL_REAL_CAMPAIGN_BUDGET });
    return 'FEASIBLE';
  } catch (error) {
    return error instanceof Error ? error.message.split(':')[1]! : String(error);
  }
}

test.describe('Phase 16CH W3 — DEF-01 permanent regressions (seam feasibility guard)', () => {
  test('documented-feasible shapes pass the guard: all-journey, one-API pair, two-API plans', () => {
    expect(guardFor(3, 0)).toBe('FEASIBLE');
    expect(guardFor(1, 1)).toBe('FEASIBLE');
    expect(guardFor(2, 2)).toBe('FEASIBLE');
    expect(guardFor(3, 2)).toBe('FEASIBLE');
  });

  test('three linked APIs STILL fail closed under the bounded reserve arithmetic', () => {
    expect(guardFor(3, 3)).toBe('BUDGET_OVERSUBSCRIBED');
    expect(guardFor(3, 500)).toBe('BUDGET_OVERSUBSCRIBED');
  });

  test('browser and actions branches are provably reachable (not dead code)', () => {
    // Oversized journey shape: derived browser cap exceeds the initial profile;
    // the mapped cap clamps to 6 and needed+reserve must exceed it.
    try {
      assertPortfolioBudgetFeasible({
        caps: { maxTotalBrowserContexts: 99, maxJourneyContexts: 90, maxExplorationContexts: 0, maxApiExecutions: 1, maxTotalActions: 200 },
        initial: INITIAL_PROFILE_SNAPSHOT,
      });
      throw new Error('expected browser-branch refusal');
    } catch (error) {
      expect((error as Error).message).toContain('BUDGET_OVERSUBSCRIBED');
    }
    // Actions branch: mandatory actions floor above the mapped action cap.
    try {
      assertPortfolioBudgetFeasible({
        caps: { maxTotalBrowserContexts: 4, maxJourneyContexts: 3, maxExplorationContexts: 0, maxApiExecutions: 1, maxTotalActions: 2 },
        initial: INITIAL_PROFILE_SNAPSHOT,
      });
      throw new Error('expected actions-branch refusal');
    } catch (error) {
      expect((error as Error).message).toContain('BUDGET_OVERSUBSCRIBED');
    }
  });

  test('mapped policy never expands any canonical dimension; unmapped dimensions pass through', () => {
    for (const shape of [
      { journeys: 0, apis: 0 },
      { journeys: 1, apis: 0 },
      { journeys: 1, apis: 1 },
      { journeys: 3, apis: 3 },
    ]) {
      const caps = {
        maxTotalBrowserContexts: shape.journeys + shape.apis + 1,
        maxJourneyContexts: shape.journeys,
        maxExplorationContexts: 0,
        maxApiExecutions: 2 * shape.apis + 1,
        maxTotalActions: Math.max(shape.journeys * 8 + shape.apis * 2, shape.journeys + 1),
      };
      const mapped = mapPortfolioBudget({ binding: { members: [], budgetCaps: caps }, initial: INITIAL_REAL_CAMPAIGN_BUDGET });
      const dims = ['maxTotalBrowserContexts', 'maxJourneyContexts', 'maxExplorationContexts', 'maxApiExecutions', 'maxTotalActions'] as const;
      for (const dim of dims) {
        expect(mapped.policy[dim]).toBe(Math.min(caps[dim], INITIAL_PROFILE_SNAPSHOT[dim]));
        // Expansion ATTEMPTS are flagged; expansion EFFECTS never happen.
        if (caps[dim] > INITIAL_PROFILE_SNAPSHOT[dim]) {
          expect(mapped.expansionViolations).toContain(dim);
        } else {
          expect(mapped.expansionViolations).not.toContain(dim);
        }
      }
      // Unmapped dimensions keep the approved values exactly.
      expect(mapped.policy.maxReplays).toBe(INITIAL_PROFILE_SNAPSHOT.maxReplays);
      expect(mapped.policy.maxMinimizationCandidates).toBe(INITIAL_PROFILE_SNAPSHOT.maxMinimizationCandidates);
      expect(mapped.policy.maxRuntimeMs).toBe(INITIAL_PROFILE_SNAPSHOT.maxRuntimeMs);
      expect(mapped.policy.maxPerTestTimeoutMs).toBe(INITIAL_PROFILE_SNAPSHOT.maxPerTestTimeoutMs);
      expect(mapped.policy.maxPromotedClusters).toBe(INITIAL_PROFILE_SNAPSHOT.maxPromotedClusters);
      expect(mapped.policy.maxPrivateEvidenceBytes).toBe(INITIAL_PROFILE_SNAPSHOT.maxPrivateEvidenceBytes);
    }
  });

  test('a three-API binding refuses manifest creation BEFORE executor state (fail-closed, pre-guard)', () => {
    const wide = buildScopedRuntimePlan({ kinds: ['JOURNEY', 'API'], totalUnits: 48 });
    const binding = admitPortfolioRuntimePlan({
      universe: wide.universe,
      plan: wide.plan,
      handoff: wide.handoff,
      authorizationToken: FIXTURE_AUTHORIZATION,
    });
    expect(binding.members.filter((member) => member.kind === 'API').length).toBe(3);
    expect(binding.budgetCaps.maxApiExecutions).toBeGreaterThan(INITIAL_PROFILE_SNAPSHOT.maxApiExecutions);
    // The selection input boundary requires mapped policy == frozen caps AND
    // monotone restriction; caps above the profile cannot become a manifest.
    expect(() => createCampaignManifest(portfolioCampaignInput(binding)))
      .toThrow(/CAMPAIGN_PORTFOLIO_BUDGET_(CAPS_MISMATCH|EXPANSION_FORBIDDEN)/);
    // And the seam feasibility guard independently rejects the same binding.
    expect(() => assertPortfolioBudgetFeasible({ caps: binding.budgetCaps, initial: INITIAL_PROFILE_SNAPSHOT }))
      .toThrow(/BUDGET_OVERSUBSCRIBED/);
    void validateCampaignManifest;
  });
});

test.describe('Phase 16CH W4 — exact-one work-item binding', () => {
  test('every runtime-admissible member kind binds exactly once onto existing identities', async () => {
    for (const scope of [
      { kinds: ['JOURNEY'], targets: ['ripple.payer-exchange.read'] },
      { kinds: ['JOURNEY', 'API'], targets: ['ripple.payer-exchange.read'] },
      { kinds: ['JOURNEY', 'API'], targets: ['ripple.payer-exchange.read', 'ripple.common-exchange.read'] },
    ] as const) {
      const built = buildScopedRuntimePlan({ ...scope });
      const binding: CampaignPortfolioRuntimeBinding = admitPortfolioRuntimePlan({
        universe: built.universe,
        plan: built.plan,
        handoff: built.handoff,
        authorizationToken: FIXTURE_AUTHORIZATION,
      });
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      validateCampaignManifest(manifest);

      // Exact-one mapping per bound member.
      const workItemIds = manifest.workItems.map((item) => item.workItemId);
      expect(new Set(workItemIds).size).toBe(workItemIds.length);
      expect(manifest.workItems.length).toBe(binding.members.length);
      for (const member of binding.members) {
        expect(workItemIds.filter((id) => id === member.workItemId)).toHaveLength(1);
        const item = manifest.workItems.find((candidate) => candidate.workItemId === member.workItemId)!;
        expect(item.kind).toBe(member.kind);
        expect(item.journeyId).toBe(member.journeyId);
        expect(item.apiOperationId).toBe(member.apiOperationId);
        expect(item.envelopeId).toBe(member.envelopeId);
        expect(item.seed).toBe(member.seed);
      }
      // Plan order preserved within the frozen binding.
      const orders = binding.members.map((member) => member.planOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      // Bound manifests pass canonical campaign validation with no fixture fallback:
      // every work item traces to an admitted member identity.
      const memberWorkItems = new Set(binding.members.map((member) => member.workItemId));
      for (const id of workItemIds) expect(memberWorkItems.has(id)).toBe(true);
    }
  });

  test('bound manifests keep the mapped budget inside every canonical dimension', () => {
    const built = buildScopedRuntimePlan({ kinds: ['JOURNEY', 'API'], targets: ['ripple.payer-exchange.read'] });
    const binding = admitPortfolioRuntimePlan({ universe: built.universe, plan: built.plan, handoff: built.handoff, authorizationToken: FIXTURE_AUTHORIZATION });
    const manifest = createCampaignManifest(portfolioCampaignInput(binding));
    expect(manifest.budgetPolicy.maxTotalBrowserContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalBrowserContexts);
    expect(manifest.budgetPolicy.maxJourneyContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxJourneyContexts);
    expect(manifest.budgetPolicy.maxExplorationContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts);
    expect(manifest.budgetPolicy.maxApiExecutions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxApiExecutions);
    expect(manifest.budgetPolicy.maxTotalActions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalActions);
    expect(manifest.budgetPolicy.maxReplays).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxReplays);
    expect(manifest.budgetPolicy.maxRuntimeMs).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs);
    expect(manifest.budgetPolicy.maxPromotedClusters).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxPromotedClusters);
    void validateCampaignManifest;
  });
});
