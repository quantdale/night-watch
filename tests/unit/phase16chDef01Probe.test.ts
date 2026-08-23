// ---------------------------------------------------------------------------
// Phase 16CH — narrow DEF-01 reproducer probe (temporary evidence artifact).
//
// Reproduces the suspected feasibility-guard inconsistency at the prepare
// seam: assertPortfolioBudgetFeasible treats binding.budgetCaps as "needed"
// amounts although derivePortfolioBudgetCaps already embeds the promoted
// reserve in every derived cap, so `needed + reserve > cap` is trivially true
// for the API dimension (and dead for browser/actions) — rejecting EVERY
// admitted binding, including the documented-feasible one/two-API shapes.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../../src/core/campaign/budget';
import {
  assertPortfolioBudgetFeasible,
} from '../../src/core/portfolio/runtimeBinding';
import {
  admitFixture,
  buildAdmissibleRuntimePlan,
  INITIAL_PROFILE_SNAPSHOT,
} from '../../corpus/phase16c/runtimeBindingFixtures';

test('DEF-01 probe: documented-feasible one-API binding must pass the seam guard', () => {
  const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
  const binding = admitFixture({ universe, plan, handoff });
  // The default admissible plan selects the payer-exchange journey + linked API.
  expect(binding.members.some((member) => member.kind === 'API')).toBe(true);
  // Documented mapping-v1 semantic: ONE API + its anchor journey IS feasible.
  expect(() =>
    assertPortfolioBudgetFeasible({ caps: binding.budgetCaps, initial: INITIAL_REAL_CAMPAIGN_BUDGET }),
  ).not.toThrow();
});

test('DEF-01 probe: three-API binding must still fail closed', () => {
  // Derived caps for a maximal three-API shape under the current universe:
  // maxApiExecutions = 2*3 + reserve(1) = 7; mapped against initial 6.
  const caps = {
    maxTotalBrowserContexts: 4,
    maxJourneyContexts: 3,
    maxExplorationContexts: 0,
    maxApiExecutions: 7,
    maxTotalActions: 24,
  };
  expect(() =>
    assertPortfolioBudgetFeasible({ caps, initial: INITIAL_REAL_CAMPAIGN_BUDGET }),
  ).toThrow(/BUDGET_OVERSUBSCRIBED/);
  void INITIAL_PROFILE_SNAPSHOT;
});
