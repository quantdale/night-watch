// ---------------------------------------------------------------------------
// Nightwatch Phase 13A — fixed approved campaign -> semantic target mapping.
//
// A closed, source-derived table listing only already-approved campaign
// journeys/operations that have a mechanically derived semantic target. No
// arbitrary selector and no new target. An approved campaign operation with no
// mechanically valid semantic expectation, or no existing semantic observer
// path, is explicitly unsupported (returns null) and remains protocol-only.
//
// Pure, no browser/network/fs/process/AI. Uses only the existing approved
// recipe registry; it never widens runtime authority.
// ---------------------------------------------------------------------------

import { APPROVED_READ_ONLY_TARGET_IDS, DEV_REACHABLE_RECIPE_TARGET_IDS, getRealSourceRecipe } from '../../oracles/expectations/recipes/registry';
import type { SemanticBundleExpectationClass, SemanticCampaignBundleApprovedMapping } from '../../core/source/semanticCampaignBundle';

export interface CampaignSemanticTargetMapping {
  readonly targetId: string;
  readonly expectationId: string;
  readonly expectationClass: SemanticBundleExpectationClass;
  readonly browserObservationAvailable: boolean;
  readonly apiObservationAvailable: boolean;
  readonly devReachable: boolean;
}

function expectationClassForRecipe(recipe: { readonly schemaVersion: string }): SemanticBundleExpectationClass {
  return recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2' ? 'COLLECTION' : 'HISTORICAL';
}

/**
 * Resolve a fixed approved semantic mapping for an already-approved campaign
 * journey or operation ID (these equal the recipe targetId for ripple). Returns
 * null when the target is not approved or has no mechanically derived recipe,
 * so the caller must preserve protocol-only behavior.
 */
export function resolveApprovedCampaignSemanticTarget(journeyOrOperationId: string): CampaignSemanticTargetMapping | null {
  const recipe = getRealSourceRecipe(journeyOrOperationId);
  if (recipe === null) return null;
  if (!APPROVED_READ_ONLY_TARGET_IDS.includes(recipe.targetId)) return null;
  const devReachable = DEV_REACHABLE_RECIPE_TARGET_IDS.includes(recipe.targetId);
  return {
    targetId: recipe.targetId,
    expectationId: recipe.targetId,
    expectationClass: expectationClassForRecipe(recipe),
    browserObservationAvailable: true,
    apiObservationAvailable: true,
    devReachable,
  };
}

export function approvedMappingForBundle(journeyOrOperationId: string): SemanticCampaignBundleApprovedMapping | null {
  const mapping = resolveApprovedCampaignSemanticTarget(journeyOrOperationId);
  if (mapping === null) return null;
  return {
    journeyOrOperationId,
    targetId: mapping.targetId,
    expectationId: mapping.expectationId,
    expectationClass: mapping.expectationClass,
    browserObservationAvailable: mapping.browserObservationAvailable,
    apiObservationAvailable: mapping.apiObservationAvailable,
  };
}

/** True only for already-approved semantic targets (fixed, never invented). */
export function isApprovedSemanticCampaignTarget(targetId: string): boolean {
  return APPROVED_READ_ONLY_TARGET_IDS.includes(targetId);
}
