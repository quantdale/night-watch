// ---------------------------------------------------------------------------
// Nightwatch Phase 11A.3 — real-source collection admission bridge
// (SPEC §2-§11, §13-§19, §21).
//
//   real source + Nightwatch fixed recipe
//     -> existing deriveRealSourceExpectation()            (UNCHANGED)
//     -> historical positional expectation (unchanged IDs)  (UNCHANGED)
//     -> deterministic collection admission transform       (this module)
//     -> distinct ...real-source-collection expectation
//
// Additive, deterministic, fail-closed. The transform consumes an already
// mechanically derived positional real-source expectation plus its originating
// recipe and converts the supported item-position invariants (those whose path
// begins with exactly String(recipe.blueprint.itemIndex)) into explicit
// COLLECTION_ITEM_CONTRACT definitions. Root invariants (path []) are preserved
// exactly once. The rooted source proof, source-evidence digest, current SHA,
// and target binding are reused; only evaluation breadth changes, never
// product semantic authority.
//
// No historical derivation behavior, IDs, or recipe semantics are modified.
// No network, filesystem, child-process, or persistence authority is
// introduced (hardening-guarded pure module).
// ---------------------------------------------------------------------------

import { validateExpectation } from './validator';
import { validateSafePath } from './paths';
import type { DerivedRealSourceExpectation } from './admission';
import type { RealSourceExpectationRecipe } from './recipes/types';
import type {
  CollectionItemContract,
  InvariantDefinition,
  SafePath,
  SemanticExpectation,
} from './types';

/** Distinct derivation identity recording that a positional source contract
 *  was mechanically converted into explicit collection scope (SPEC §6). The
 *  source-evidence digest is preserved because the same source structure is
 *  bound; the derivation version identifies the representation transform. */
export const REAL_SOURCE_COLLECTION_DERIVATION_VERSION = 'nightwatch.real-source-collection-expectation-derivation.v1' as const;

/** Fixed target -> current collection expectation identity table (SPEC §4).
 *  Closed, explicit, Nightwatch-owned. No runtime free-form suffix selection. */
export const REAL_SOURCE_COLLECTION_EXPECTATION_IDS: Readonly<Record<string, string>> = Object.freeze({
  'ripple.common-exchange.read': 'ripple.common-exchange.read.real-source-collection',
  'ripple.payer-exchange.read': 'ripple.payer-exchange.read.real-source-collection',
  'ripple.account-inventory.read': 'ripple.account-inventory.read.real-source-collection',
  'ripple.billing-group-exchange.read': 'ripple.billing-group-exchange.read.real-source-collection',
});

const SUPPORTED_ITEM_KINDS = new Set(['FIELD_PRESENT', 'FIELD_ABSENT', 'TYPE_MATCH', 'TYPE_IN_SET']);

export type RealSourceCollectionAdmissionFailure =
  | 'COLLECTION_ADMISSION_PROOF_MISSING'
  | 'COLLECTION_ADMISSION_TARGET_MISMATCH'
  | 'COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH'
  | 'COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT'
  | 'COLLECTION_ADMISSION_UNKNOWN_TARGET'
  | 'COLLECTION_ADMISSION_NOT_DERIVED'
  | 'COLLECTION_ADMISSION_INVALID'
  | 'COLLECTION_ADMISSION_DUPLICATE_ID';

export interface DerivedCollectionRealSourceExpectation {
  readonly expectation: SemanticExpectation;
  readonly recipe: RealSourceExpectationRecipe;
  readonly evidenceDigest: string;
  readonly collectionExpectationId: string;
}

export interface CollectionRealSourceDerivationReport {
  readonly derived: readonly DerivedCollectionRealSourceExpectation[];
  readonly failures: readonly { recipeId: string; targetId: string; failure: string; detail?: string }[];
}

function buildCollectionContract(
  invariant: InvariantDefinition,
  relative: SafePath,
): CollectionItemContract {
  const collectionPath: SafePath = [];
  switch (invariant.kind) {
    case 'FIELD_PRESENT':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'FIELD_PRESENT',
        itemRelativePath: relative,
        itemExpected: invariant.expected,
      };
    case 'FIELD_ABSENT':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'FIELD_ABSENT',
        itemRelativePath: relative,
      };
    case 'TYPE_MATCH':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'TYPE_MATCH',
        itemRelativePath: relative,
        itemExpectedType: invariant.expectedType,
      };
    case 'TYPE_IN_SET':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'TYPE_IN_SET',
        itemRelativePath: relative,
        itemAllowedTypes: invariant.allowedTypes,
      };
    default:
      throw new Error(`COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT:${invariant.kind}`);
  }
}

/**
 * Convert one already mechanically derived positional real-source expectation
 * into a distinct collection-wide expectation for the same approved target.
 *
 * Fail-closed (no collection expectation) when: the historical expectation
 * lacks mechanical source evidence, its target does not match the recipe, the
 * recipe target is not in the fixed collection-ID table, a positional invariant
 * uses a non-matching item index, a relative item path is empty / unsafe / of
 * an unsupported kind, or the transformed expectation fails strict
 * `validateExpectation()`.
 */
export function deriveCollectionWideRealSourceExpectation(params: {
  recipe: RealSourceExpectationRecipe;
  historical: DerivedRealSourceExpectation;
}): { ok: true; derived: DerivedCollectionRealSourceExpectation } | { ok: false; failure: RealSourceCollectionAdmissionFailure; detail?: string } {
  const { recipe, historical } = params;
  const historicalExpectation = historical.expectation;

  // §4: collection identity must exist in the fixed target->ID table.
  const collectionExpectationId = REAL_SOURCE_COLLECTION_EXPECTATION_IDS[recipe.targetId];
  if (collectionExpectationId === undefined) {
    return { ok: false, failure: 'COLLECTION_ADMISSION_UNKNOWN_TARGET', detail: recipe.targetId };
  }
  // §8.3: source provenance / mechanical evidence must be present.
  if (historicalExpectation.sourceProvenance.evidenceDigest === undefined) {
    return { ok: false, failure: 'COLLECTION_ADMISSION_PROOF_MISSING' };
  }
  // §8.2: historical expectation target must match the recipe target.
  if (historicalExpectation.targetId !== recipe.targetId) {
    return {
      ok: false,
      failure: 'COLLECTION_ADMISSION_TARGET_MISMATCH',
      detail: `${historicalExpectation.targetId} != ${recipe.targetId}`,
    };
  }

  const itemIndexStr = String(recipe.blueprint.itemIndex);
  const invariants: InvariantDefinition[] = [];

  for (const invariant of historicalExpectation.invariantDefinitions) {
    // Only path-bearing invariant kinds can be root (path []) or positional.
    // A historical positional expectation carries only the item invariant
    // vocabulary; fail closed on anything else rather than silently keep it.
    if (!('path' in invariant)) {
      return {
        ok: false,
        failure: 'COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT',
        detail: `non-path-invariant:${invariant.kind}`,
      };
    }
    // Root invariants (path []) are preserved exactly once (§7, §8.1).
    if (invariant.path.length === 0) {
      invariants.push(invariant);
      continue;
    }
    // §8.4: a positional invariant must begin with exactly the item index.
    if (invariant.path[0] !== itemIndexStr) {
      return {
        ok: false,
        failure: 'COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH',
        detail: `invariant path ${JSON.stringify(invariant.path)}`,
      };
    }
    const relative = invariant.path.slice(1);
    // §8.5: remaining item-relative path must be non-empty and SafePath-valid.
    if (relative.length === 0) {
      return { ok: false, failure: 'COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT', detail: 'empty-relative-path' };
    }
    try {
      validateSafePath(relative, 'collection-item-relative');
    } catch {
      return { ok: false, failure: 'COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT', detail: 'unsafe-relative-path' };
    }
    // §8.6: only the fixed supported item classes are collection-promoted.
    if (!SUPPORTED_ITEM_KINDS.has(invariant.kind)) {
      return { ok: false, failure: 'COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT', detail: invariant.kind };
    }
    invariants.push(buildCollectionContract(invariant, relative));
  }

  const collectionExpectation: SemanticExpectation = {
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId: collectionExpectationId,
    targetKind: historicalExpectation.targetKind,
    targetId: recipe.targetId,
    sourceProvenance: {
      ...historicalExpectation.sourceProvenance,
      derivationVersion: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
    },
    projectionContract: historicalExpectation.projectionContract,
    invariantDefinitions: invariants,
  };

  // §8.8: the transformed expectation must survive strict validation.
  try {
    validateExpectation(collectionExpectation);
  } catch (error) {
    return {
      ok: false,
      failure: 'COLLECTION_ADMISSION_INVALID',
      detail: String(error instanceof Error ? error.message : 'validation-failed'),
    };
  }

  return {
    ok: true,
    derived: {
      expectation: collectionExpectation,
      recipe,
      evidenceDigest: historical.evidenceDigest,
      collectionExpectationId,
    },
  };
}

/**
 * Batch collection admission over a set of mechanically derived historical
 * expectations. Each derived record carries its originating recipe, so the
 * transform is matched deterministically. Returns derived collection
 * expectations plus an explicit failure list (fail-closed per recipe).
 */
export function deriveCollectionWideRealSourceExpectations(
  derived: readonly DerivedRealSourceExpectation[],
): CollectionRealSourceDerivationReport {
  const result: DerivedCollectionRealSourceExpectation[] = [];
  const failures: CollectionRealSourceDerivationReport['failures'][number][] = [];
  const seenCollectionIds = new Set<string>();

  for (const historical of derived) {
    const recipe = historical.recipe;
    const outcome = deriveCollectionWideRealSourceExpectation({ recipe, historical });
    if (!outcome.ok) {
      failures.push({
        recipeId: recipe.recipeId,
        targetId: recipe.targetId,
        failure: outcome.failure,
        ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
      });
      continue;
    }
    const id = outcome.derived.collectionExpectationId;
    if (seenCollectionIds.has(id)) {
      failures.push({
        recipeId: recipe.recipeId,
        targetId: recipe.targetId,
        failure: 'COLLECTION_ADMISSION_DUPLICATE_ID',
        detail: id,
      });
      continue;
    }
    seenCollectionIds.add(id);
    result.push(outcome.derived);
  }

  return { derived: result, failures };
}
