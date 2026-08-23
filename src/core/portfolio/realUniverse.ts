// ---------------------------------------------------------------------------
// Nightwatch Phase 16C — real approved universe assembly (W1).
//
// Assembles the pure universe descriptor from CANONICAL CURRENT registries and
// builds the deterministic RealApprovedUniverse. No identity is hand-duplicated
// here: linkage rows come from the canonical runtime profile, operation safety
// from the Phase-5 catalog, semantic contract evidence from the approved
// real-source recipe registry, and the runtime restriction from the currently
// approved bounded campaign budget.
//
// Deterministic: identical registry content yields an identical digest.
// Read-only: no sibling repository is read; contract evidence digests derive
// mechanically from the in-repo canonical recipe documents themselves.
// ---------------------------------------------------------------------------

import {
  REAL_RUNTIME_LINKAGE,
  RUNTIME_PROFILE_VERSION,
} from '../campaign/runtimeProfile';
import { INITIAL_REAL_CAMPAIGN_BUDGET } from '../campaign/budget';
import { API_CATALOG_VERSION } from '../../api/phase5/types';
import { PHASE5_API_CATALOG } from '../../api/phase5/catalog';
import { JOURNEY_CONTRACT_VERSION } from '../journeys/contract';
import { SAFE_ACTION_CATALOG_VERSION } from '../exploration/types';
import {
  getRealSourceRecipe,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../oracles/expectations/recipes/registry';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../oracles/expectations/admission';
import type { DepthClass } from '../../oracles/expectations/coverageInventory';
import type { PortfolioMemberKind } from './types';
import {
  buildRealApprovedUniverse,
  type RealApprovedUniverse,
  type RealApprovedUniverseDescriptor,
  type RealUniverseTargetContract,
} from './runtimeBinding';

/** Restriction code for member kinds the bounded real profile cannot fund. */
export const EXPLORATION_RUNTIME_RESTRICTION_CODE =
  'RUNTIME_EXPLORATION_CONTEXTS_ZERO_IN_BOUNDED_REAL_PROFILE';

/**
 * Derive the per-target semantic contract evidence mechanically from the
 * approved recipe registry. Recipe v2 (deep) proves TYPE-level depth;
 * recipe v1 (shape) proves SHAPE-level depth over a collection root; targets
 * without a recipe claim no semantic depth and no derivation evidence.
 */
function targetContracts(): readonly RealUniverseTargetContract[] {
  return REAL_RUNTIME_LINKAGE.map((row) => {
    const recipe = getRealSourceRecipe(row.apiOperationId);
    if (recipe === null) {
      return {
        targetId: row.apiOperationId,
        depthClass: 'NONE' as DepthClass,
        contractVersion: null,
        derivationVersion: null,
      };
    }
    const deep = recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2';
    return {
      targetId: row.apiOperationId,
      depthClass: (deep ? 'TYPE_COLLECTION' : 'SHAPE_COLLECTION') as DepthClass,
      contractVersion: recipe.schemaVersion,
      derivationVersion: deep ? REAL_SOURCE_DERIVATION_VERSION_V2 : REAL_SOURCE_DERIVATION_VERSION,
    };
  });
}

/**
 * Build the current real approved universe from live canonical registries.
 * Deterministic for identical registry content.
 */
export function buildCurrentRealApprovedUniverse(): RealApprovedUniverse {
  // Safety mirror: every linked operation must exist in the Phase-5 catalog as
  // a runtime-capable known read before it may enter the universe.
  for (const row of REAL_RUNTIME_LINKAGE) {
    const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === row.apiOperationId);
    if (operation === undefined || operation.semanticClass !== 'KNOWN_READ' || operation.generationStatus !== 'GENERATION_ELIGIBLE' || operation.replayPolicy === 'NEVER') {
      throw new Error('REAL_UNIVERSE_REGISTRY_MIRROR_INVALID');
    }
  }
  const runtimeRestrictedKinds: readonly PortfolioMemberKind[] =
    INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts === 0 ? ['EXPLORATION'] : [];
  const descriptor: RealApprovedUniverseDescriptor = {
    registryVersions: [
      RUNTIME_PROFILE_VERSION,
      JOURNEY_CONTRACT_VERSION,
      SAFE_ACTION_CATALOG_VERSION,
      API_CATALOG_VERSION,
      INITIAL_REAL_CAMPAIGN_BUDGET.policyVersion,
    ],
    linkage: REAL_RUNTIME_LINKAGE.map((row) => ({
      targetId: row.apiOperationId,
      journeyId: row.journeyId,
      envelopeId: row.envelopeId,
      seed: row.seed,
    })),
    contracts: targetContracts(),
    runtimeRestrictedKinds,
    runtimeRestrictionCode: EXPLORATION_RUNTIME_RESTRICTION_CODE,
  };
  return buildRealApprovedUniverse(descriptor);
}
