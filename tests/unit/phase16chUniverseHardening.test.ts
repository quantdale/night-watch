// ---------------------------------------------------------------------------
// Phase 16CH W1 — real approved universe hardening.
//
// Canonical provenance mirrors: every REAL_RUNTIME_LINKAGE row must resolve
// mechanically against the CURRENT canonical registries (journeys, Phase-4
// envelopes, Phase-5 catalog, recipe registry, bounded budget), and the
// assembly must stay deterministic and synthetic-free. Descriptor-level
// adversarials live in the corpus; this suite pins the CANONICAL truth.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { RIPPLE_JOURNEY_IDS } from '../../src/core/changeIntelligence/types';
import { RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import {
  REAL_RUNTIME_LINKAGE,
  REAL_RUNTIME_TARGET_IDS,
  REAL_RUNTIME_SEEDS,
  API_BY_JOURNEY,
  ENVELOPE_BY_JOURNEY,
  RUNTIME_PROFILE_VERSION,
  runtimeLinkageForJourney,
  runtimeLinkageForTarget,
} from '../../src/core/campaign/runtimeProfile';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../../src/core/campaign/budget';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
} from '../../src/oracles/expectations/recipes/registry';
import { buildCurrentRealApprovedUniverse } from '../../src/core/portfolio/realUniverse';
import { P16_SYNTH_EXTRA_1, P16_SYNTH_EXTRA_2, P16_SYNTH_EXTRA_3 } from '../../corpus/phase16a/portfolioFixtures';

test.describe('Phase 16CH W1 — real-universe provenance hardening', () => {
  test('linkage rows are in canonical journey order with unique targets/journeys/envelopes', () => {
    expect(REAL_RUNTIME_LINKAGE.map((row) => row.journeyId)).toEqual([...RIPPLE_JOURNEY_IDS]);
    const targets = new Set(REAL_RUNTIME_LINKAGE.map((row) => row.apiOperationId));
    const journeys = new Set(REAL_RUNTIME_LINKAGE.map((row) => row.journeyId));
    const envelopes = new Set(REAL_RUNTIME_LINKAGE.map((row) => row.envelopeId));
    expect(targets.size).toBe(REAL_RUNTIME_LINKAGE.length);
    expect(journeys.size).toBe(REAL_RUNTIME_LINKAGE.length);
    expect(envelopes.size).toBe(REAL_RUNTIME_LINKAGE.length);
    // Derived tables mirror the linkage exactly (no shadow drift possible).
    for (const [journeyId, operations] of Object.entries(API_BY_JOURNEY)) {
      const linkage = runtimeLinkageForJourney(journeyId as (typeof REAL_RUNTIME_LINKAGE)[number]['journeyId']);
      expect(linkage).toBeDefined();
      expect(operations).toEqual([linkage!.apiOperationId]);
    }
    for (const [journeyId, envelopeId] of Object.entries(ENVELOPE_BY_JOURNEY)) {
      expect(runtimeLinkageForJourney(journeyId as (typeof REAL_RUNTIME_LINKAGE)[number]['journeyId'])!.envelopeId).toBe(envelopeId);
    }
    expect(REAL_RUNTIME_SEEDS).toEqual(REAL_RUNTIME_LINKAGE.map((row) => row.seed));
  });

  test('wrong-API / wrong-envelope / wrong-seed linkages cannot hide: every field resolves canonically', () => {
    for (const row of REAL_RUNTIME_LINKAGE) {
      // API linkage: exact Phase-5 catalog membership + safety properties.
      const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === row.apiOperationId);
      expect(operation, `operation ${row.apiOperationId}`).toBeDefined();
      expect(operation!.semanticClass).toBe('KNOWN_READ');
      expect(operation!.generationStatus).toBe('GENERATION_ELIGIBLE');
      expect(operation!.replayPolicy).not.toBe('NEVER');
      // Exploration linkage: envelope exists and anchors EXACTLY this journey.
      const envelope = RIPPLE_PHASE4_ENVELOPES.find((candidate) => candidate.envelopeId === row.envelopeId);
      expect(envelope, `envelope ${row.envelopeId}`).toBeDefined();
      expect(envelope!.anchorJourney).toBe(row.journeyId);
      // Seed grammar + registry approval surfaces.
      expect(row.seed).toMatch(/^0x[0-9a-f]{16}$/);
      expect(APPROVED_READ_ONLY_TARGET_IDS).toContain(row.apiOperationId);
      expect(DEV_REACHABLE_RECIPE_TARGET_IDS).toContain(row.apiOperationId);
      // Reverse lookup is total over the linkage table.
      expect(runtimeLinkageForTarget(row.apiOperationId)).toBe(row);
    }
    // Unknown target/journey lookups stay undefined (no invented rows).
    expect(runtimeLinkageForTarget('phase16a.synthetic-extra.one.read')).toBeUndefined();
    expect(runtimeLinkageForJourney('nonexistent-journey' as never)).toBeUndefined();
  });

  test('runtime restriction derives mechanically from the CURRENT bounded budget', () => {
    const universe = buildCurrentRealApprovedUniverse();
    const explorationRestrictedByBudget = INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts === 0;
    for (const member of universe.members) {
      if (member.kind === 'EXPLORATION') {
        expect(member.runtimeAdmissible).toBe(!explorationRestrictedByBudget);
        if (!member.runtimeAdmissible) expect(member.runtimeRestrictionCode).not.toBeNull();
      } else {
        expect(member.runtimeAdmissible).toBe(true);
        expect(member.runtimeRestrictionCode).toBeNull();
      }
    }
  });

  test('assembly stays deterministic under repeat builds and exposes a stable digest shape', () => {
    const builds = Array.from({ length: 3 }, () => buildCurrentRealApprovedUniverse());
    const serialized = builds.map((universe) => JSON.stringify({
      version: universe.version,
      digest: universe.digest,
      approvedTargets: universe.approvedTargets,
      members: universe.members,
      portfolioDigest: universe.portfolio.portfolioDigest,
    }));
    expect(new Set(serialized).size).toBe(1);
    expect(builds[0]!.version).toBe('nightwatch.portfolio-real-universe.v1');
    expect(builds[0]!.digest).toMatch(/^pf:sha256:[a-f0-9]{24}$/);
    expect(builds[0]!.approvedTargets).toEqual([...new Set(REAL_RUNTIME_TARGET_IDS)].sort((a, b) => a.localeCompare(b)));
  });

  test('synthetic/demo fixture identities remain excluded from every universe surface', () => {
    const universe = buildCurrentRealApprovedUniverse();
    for (const synthetic of [P16_SYNTH_EXTRA_1, P16_SYNTH_EXTRA_2, P16_SYNTH_EXTRA_3]) {
      expect(universe.approvedTargets).not.toContain(synthetic);
      expect(universe.portfolio.approvedTargets).not.toContain(synthetic);
      expect(universe.members.some((member) => member.targetId === synthetic || member.memberId.includes(synthetic))).toBe(false);
      expect(universe.portfolio.members.some((member) => member.input.targetId === synthetic)).toBe(false);
    }
  });

  test('profile version constant is pinned', () => {
    expect(RUNTIME_PROFILE_VERSION).toBe('nightwatch.campaign-runtime-profile.v1');
  });
});
