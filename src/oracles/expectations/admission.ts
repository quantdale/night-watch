// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — real-source expectation admission bridge (SPEC §10,
// §14, §15, §16, §17, §28).
//
//   real source (read-only snapshot)
//     + Nightwatch fixed derivation recipe
//     + bounded syntax-aware extraction
//     + deterministic source-evidence digest
//     + approved read-only target
//     -> admitted real-product expectation (bound to repo @ SHA + evidence)
//
// The bridge NEVER requires Alphaus annotations and NEVER executes
// application code. A provenance label alone cannot manufacture semantic
// authority: admission requires the mechanically verified derivation
// evidence (recipe contract == extracted structure, evidence digest bound).
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import { DEFAULT_PROJECTION_LIMITS } from '../projections/types';
import { validateExpectation } from './validator';
import { evidenceDigestFor } from './extract/evidence';
import {
  extractPhpFunctionListRowKeys,
  extractPhpFunctionReturnsListOfBuilder,
  extractPhpRouteGetBinding,
  phpFailureToDerivationFailure,
} from './extract/php';
import type { RealSourceExpectationRecipe, RealSourceReader, SourceExtraction } from './recipes/types';
import type { SemanticExpectation, SourceProvenance } from './types';

export const REAL_SOURCE_DERIVATION_VERSION = 'nightwatch.real-source-expectation-derivation.v1' as const;

export interface RecipeDerivationOutcome {
  readonly ok: boolean;
  readonly failure?: string;
  readonly detail?: string;
  readonly evidenceDigest?: string;
}

export interface DerivedRealSourceExpectation {
  readonly expectation: SemanticExpectation;
  readonly recipe: RealSourceExpectationRecipe;
  readonly evidenceDigest: string;
}

/** Run one recipe's extractors against a reader; returns the extractions in
 *  recipe order or the first failure. */
function runExtractions(
  recipe: RealSourceExpectationRecipe,
  reader: RealSourceReader,
): { ok: true; extractions: SourceExtraction[] } | { ok: false; failure: string; detail?: string } {
  const extractions: SourceExtraction[] = [];
  for (const extractor of recipe.extractors) {
    if (extractor.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null;
      if (path === null) return { ok: false, failure: 'SOURCE_PATH_MISSING' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, failure: 'SOURCE_UNAVAILABLE', detail: path };
      const result = extractPhpFunctionListRowKeys(text, extractor.symbol, extractor.accumulator, extractor.pattern);
      if (!result.ok) return { ok: false, failure: phpFailureToDerivationFailure(result.failure), detail: result.detail };
      extractions.push(result.extraction);
    }
    if (extractor.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null;
      if (path === null) return { ok: false, failure: 'SOURCE_PATH_MISSING' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, failure: 'SOURCE_UNAVAILABLE', detail: path };
      const result = extractPhpFunctionReturnsListOfBuilder(text, extractor.symbol, extractor.accumulator, extractor.builderSymbol);
      if (!result.ok) return { ok: false, failure: phpFailureToDerivationFailure(result.failure), detail: result.detail };
      extractions.push(result.extraction);
    }
    if (extractor.kind === 'PHP_ROUTE_GET_BINDING') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('Routing.yaml')) ?? null;
      if (path === null) return { ok: false, failure: 'SOURCE_PATH_MISSING' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, failure: 'SOURCE_UNAVAILABLE', detail: path };
      const result = extractPhpRouteGetBinding(text, extractor.routePath, extractor.client, extractor.method);
      if (!result.ok) return { ok: false, failure: phpFailureToDerivationFailure(result.failure), detail: result.detail };
      extractions.push(result.extraction);
    }
  }
  return { ok: true, extractions };
}

/**
 * Derive ONE admitted expectation from a validated recipe against a source
 * snapshot (repo @ sha). Fails closed (no expectation) when the source is
 * unavailable, the extraction fails, or the extracted structure no longer
 * matches the recipe's expected contract. NEVER mutates anything.
 */
export function deriveRealSourceExpectation(
  recipe: RealSourceExpectationRecipe,
  sha: string,
  reader: RealSourceReader,
): { ok: true; derived: DerivedRealSourceExpectation } | { ok: false; failure: string; detail?: string } {
  const extractionRun = runExtractions(recipe, reader);
  if (!extractionRun.ok) return { ok: false, failure: extractionRun.failure, detail: extractionRun.detail };

  // The row-keys extraction is the contract-bearing one.
  const rowKeys = extractionRun.extractions.find((e) => e.kind === 'PHP_FUNCTION_LIST_ROW_KEYS');
  if (rowKeys === undefined || rowKeys.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') {
    return { ok: false, failure: 'CONTRACT_MISMATCH', detail: 'no-row-keys-extraction' };
  }
  // Top-level ARRAYness is proven by at least one list-bearing extractor in
  // the recipe (PUSH row-keys or RETURNS_LIST_OF_BUILDER) — enforced at
  // recipe validation and re-verified here from the actual extractions.
  const provesTopLevelArray = extractionRun.extractions.some(
    (e) =>
      (e.kind === 'PHP_FUNCTION_LIST_ROW_KEYS' && e.pattern === 'PUSH') ||
      e.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER',
  );
  if (!provesTopLevelArray) {
    return { ok: false, failure: 'TOP_LEVEL_NOT_ARRAY', detail: 'no-list-bearing-extractor' };
  }
  const expectedKeys = [...recipe.expectedContract.requiredItemKeys].sort();
  const extractedKeys = [...rowKeys.itemKeys].sort();
  if (expectedKeys.length !== extractedKeys.length || expectedKeys.some((key, index) => key !== extractedKeys[index])) {
    return { ok: false, failure: 'ITEM_KEYS_MISMATCH', detail: `expected:${expectedKeys.join(',')} extracted:${extractedKeys.join(',')}` };
  }

  const rowKeysExtractor = recipe.extractors.find((e) => e.kind === 'PHP_FUNCTION_LIST_ROW_KEYS');
  const digest = evidenceDigestFor(extractionRun.extractions);
  const provenance: SourceProvenance = {
    repoId: recipe.repoId,
    sha,
    relativePath: recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0]!,
    symbol: rowKeysExtractor !== undefined && rowKeysExtractor.kind === 'PHP_FUNCTION_LIST_ROW_KEYS'
      ? rowKeysExtractor.symbol
      : undefined,
    derivationVersion: REAL_SOURCE_DERIVATION_VERSION,
    evidenceDigest: digest,
  };

  const invariants: import('./types').InvariantDefinition[] = [
    // The source-established success class: a top-level JSON array. Stronger
    // than "parses as JSON": a 2xx error-envelope object or a wrapper object
    // violates it (the roadmap's HTTP-200-error-envelope bug class).
    { kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' },
    ...recipe.blueprint.itemFieldPaths.map((field) => ({
      kind: 'FIELD_PRESENT' as const,
      path: [String(recipe.blueprint.itemIndex), field],
      expected: true,
    })),
  ];

  const expectation: SemanticExpectation = {
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId: recipe.blueprint.expectationId,
    targetKind: 'API_OPERATION',
    targetId: recipe.targetId,
    sourceProvenance: provenance,
    projectionContract: {
      limits: { ...DEFAULT_PROJECTION_LIMITS, ...recipe.blueprint.projectionContractLimits },
    },
    invariantDefinitions: invariants,
  };

  // Strict validation is the admission gate: an expectation that does not
  // survive it is NEVER admitted.
  try {
    validateExpectation(expectation);
  } catch (error) {
    return { ok: false, failure: 'CONTRACT_MISMATCH', detail: String(error instanceof Error ? error.message : 'validation-failed') };
  }
  return { ok: true, derived: { expectation, recipe, evidenceDigest: digest } };
}

export interface RealSourceDerivationReport {
  readonly derived: readonly DerivedRealSourceExpectation[];
  readonly failures: readonly { recipeId: string; failure: string; detail?: string }[];
}

/**
 * Explicit offline derivation run (the real-source canary / Phase 9B run
 * start): derive + admit ALL validated recipes against one snapshot.
 * Returns counts; NEVER silently re-binds an existing expectation — each
 * derivation is a fresh admission against the snapshot's sha.
 */
export function deriveRealSourceExpectations(
  recipes: readonly RealSourceExpectationRecipe[],
  snapshot: { repoId: string; sha: string } | null,
  reader: RealSourceReader,
): RealSourceDerivationReport {
  const derived: DerivedRealSourceExpectation[] = [];
  const failures: { recipeId: string; failure: string; detail?: string }[] = [];
  for (const recipe of recipes) {
    if (snapshot === null || snapshot.repoId !== recipe.repoId) {
      failures.push({ recipeId: recipe.recipeId, failure: 'SOURCE_UNAVAILABLE' });
      continue;
    }
    const result = deriveRealSourceExpectation(recipe, snapshot.sha, reader);
    if (result.ok) {
      derived.push(result.derived);
    } else {
      failures.push({ recipeId: recipe.recipeId, failure: result.failure, detail: result.detail });
    }
  }
  return { derived, failures };
}
