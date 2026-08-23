// ---------------------------------------------------------------------------
// Phase 16C W1 — real approved universe: provenance, determinism, separation.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import {
  RIPPLE_JOURNEY_IDS,
} from '../../src/core/changeIntelligence/types';
import { RIPPLE_PHASE4_ENVELOPES, RIPPLE_PHASE4_BUDGET } from '../../src/products/ripple/explorationCatalog';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { REAL_RUNTIME_LINKAGE, REAL_RUNTIME_TARGET_IDS, RUNTIME_PROFILE_VERSION, runtimeLinkageForTarget } from '../../src/core/campaign/runtimeProfile';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../../src/core/campaign/budget';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  getRealSourceRecipe,
} from '../../src/oracles/expectations/recipes/registry';
import {
  buildRealApprovedUniverse,
  PORTFOLIO_RUNTIME_BINDING_VERSION,
} from '../../src/core/portfolio/runtimeBinding';
import { buildCurrentRealApprovedUniverse } from '../../src/core/portfolio/realUniverse';
import { P16_SYNTH_EXTRA_1, P16_SYNTH_EXTRA_2, P16_SYNTH_EXTRA_3 } from '../../corpus/phase16a/portfolioFixtures';

test.describe('Phase 16C real approved universe (W1)', () => {
  test('canonical runtime profile mirror: linkage rows resolve against every canonical registry', () => {
    expect(REAL_RUNTIME_LINKAGE.length).toBe(RIPPLE_JOURNEY_IDS.length);
    for (const row of REAL_RUNTIME_LINKAGE) {
      expect(RIPPLE_JOURNEY_IDS).toContain(row.journeyId);
      // Envelope exists and anchors the same journey.
      const envelope = RIPPLE_PHASE4_ENVELOPES.find((candidate) => candidate.envelopeId === row.envelopeId);
      expect(envelope).toBeDefined();
      expect(envelope!.anchorJourney).toBe(row.journeyId);
      // Operation is a runtime-capable approved known read in the Phase-5 catalog.
      const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === row.apiOperationId);
      expect(operation).toBeDefined();
      expect(operation!.semanticClass).toBe('KNOWN_READ');
      expect(operation!.generationStatus).toBe('GENERATION_ELIGIBLE');
      expect(operation!.replayPolicy).not.toBe('NEVER');
      // Seed format matches campaign seed grammar.
      expect(row.seed).toMatch(/^0x[0-9a-f]{16}$/);
      // Target carries an admitted real-source recipe and is DEV-reachable.
      expect(APPROVED_READ_ONLY_TARGET_IDS).toContain(row.apiOperationId);
      expect(DEV_REACHABLE_RECIPE_TARGET_IDS).toContain(row.apiOperationId);
      expect(getRealSourceRecipe(row.apiOperationId)).not.toBeNull();
    }
  });

  test('universe derives mechanically: one member per target x kind with exact work-item identities', () => {
    const universe = buildCurrentRealApprovedUniverse();
    expect(universe.version).toBe('nightwatch.portfolio-real-universe.v1');
    expect(universe.approvedTargets).toEqual([...REAL_RUNTIME_TARGET_IDS]);
    // 3 targets x {JOURNEY, API, EXPLORATION}.
    expect(universe.members.length).toBe(REAL_RUNTIME_LINKAGE.length * 3);
    for (const member of universe.members) {
      const linkage = runtimeLinkageForTarget(member.targetId);
      expect(linkage).toBeDefined();
      if (member.kind === 'JOURNEY') {
        expect(member.workItemId).toBe(`journey:${linkage!.journeyId}`);
        expect(member.envelopeId).toBeNull();
        expect(member.seed).toBeNull();
      } else if (member.kind === 'API') {
        expect(member.workItemId).toBe(`api:${linkage!.apiOperationId}`);
        expect(member.apiOperationId).toBe(linkage!.apiOperationId);
      } else {
        expect(member.workItemId).toBe(`explore:${linkage!.envelopeId}:${linkage!.seed}`);
        expect(member.seed).toBe(linkage!.seed);
        expect(member.runtimeAdmissible).toBe(false);
        expect(member.runtimeRestrictionCode).not.toBeNull();
      }
      expect(member.memberId).toMatch(/^pm:sha256:[0-9a-f]{24}$/);
    }
    // Exploration restriction mirrors the current bounded real profile.
    const explorationRestricted = INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts === 0;
    const explorations = universe.members.filter((member) => member.kind === 'EXPLORATION');
    expect(explorations.every((member) => member.runtimeAdmissible === !explorationRestricted)).toBe(true);
  });

  test('synthetic fixture identities can never enter the real universe', () => {
    const universe = buildCurrentRealApprovedUniverse();
    for (const synthetic of [P16_SYNTH_EXTRA_1, P16_SYNTH_EXTRA_2, P16_SYNTH_EXTRA_3]) {
      expect(universe.approvedTargets).not.toContain(synthetic);
      expect(universe.portfolio.approvedTargets).not.toContain(synthetic);
      expect(universe.members.some((member) => member.targetId === synthetic)).toBe(false);
    }
  });

  test('deterministic: identical registries yield identical digests (x3)', () => {
    const digests = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const universe = buildCurrentRealApprovedUniverse();
      digests.add(`${universe.digest}|${universe.portfolio.portfolioDigest}|${universe.members.map((member) => member.memberId).join(',')}`);
    }
    expect(digests.size).toBe(1);
  });

  test('pure builder fails closed on empty or non-canonical descriptors', () => {
    expect(() => buildRealApprovedUniverse({
      registryVersions: [RUNTIME_PROFILE_VERSION],
      linkage: [],
      contracts: [],
      runtimeRestrictedKinds: [],
      runtimeRestrictionCode: 'X',
    })).toThrow(/UNIVERSE_EMPTY/);
    expect(() => buildRealApprovedUniverse({
      registryVersions: ['bogus-version'],
      linkage: [{
        targetId: 'ripple.payer-exchange.read',
        journeyId: 'ripple-payer-exchange-read',
        envelopeId: 'E1-J1-payer-exchange',
        seed: '0x0000000000000101',
      }],
      contracts: [{
        targetId: 'ripple.payer-exchange.read',
        depthClass: 'NONE',
        contractVersion: null,
        derivationVersion: null,
      }],
      runtimeRestrictedKinds: [],
      runtimeRestrictionCode: 'X',
    })).toThrow(/UNIVERSE_EMPTY/);
    // Missing contract for a linked target fails closed (no invented evidence).
    expect(() => buildRealApprovedUniverse({
      registryVersions: [RUNTIME_PROFILE_VERSION],
      linkage: [{
        targetId: 'ripple.payer-exchange.read',
        journeyId: 'ripple-payer-exchange-read',
        envelopeId: 'E1-J1-payer-exchange',
        seed: '0x0000000000000101',
      }],
      contracts: [],
      runtimeRestrictedKinds: [],
      runtimeRestrictionCode: 'X',
    })).toThrow(/TARGET_UNKNOWN/);
    // Binding schema version constant stays pinned.
    expect(PORTFOLIO_RUNTIME_BINDING_VERSION).toBe('nightwatch.campaign-portfolio-runtime-binding.v1');
    void RIPPLE_PHASE4_BUDGET;
  });
});
