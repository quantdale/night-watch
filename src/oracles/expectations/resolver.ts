// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — atomic expectation + source snapshot resolution
// (SPEC §15, §17, §18, §33, §34).
//
// One resolver returns the expectation WITH the exact source snapshot it was
// verified against — never a global "current snapshot" that could validate
// another expectation. Currentness is fail-closed:
//
//   A. current SHA == bound SHA and re-extracted evidence digest == bound
//      digest            -> RESOLVED (expectation + its snapshot)
//   B. same repo, SHA differs            -> SOURCE_STALE (never silent re-bind)
//   C. repo unavailable                  -> SOURCE_UNAVAILABLE
//   D. bound source path missing         -> SOURCE_UNAVAILABLE
//   E. re-extraction fails or digest differs (structure changed, incl. a
//      dirty working tree at the same SHA) -> SOURCE_STALE (re-derivation
//      required)
//   F. unrelated source change elsewhere -> digest unchanged -> RESOLVED
//
// Resolution keys on the target IDENTITY (Phase 5 operationId == reviewed
// journey ruleId for the DEV-reachable operations) — never on URL substrings
// or raw query strings.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import { evidenceDigestFor } from './extract/evidence';
import {
  extractPhpFunctionListRowKeys,
  extractPhpFunctionReturnsListOfBuilder,
  extractPhpRouteGetBinding,
} from './extract/php';
import type { RealSourceCurrentness, RealSourceReader, RealSourceExpectationRecipe } from './recipes/types';
import type { SemanticExpectation, SourceSnapshot } from './types';

export type RealSourceResolution =
  | {
      readonly kind: 'RESOLVED';
      readonly expectation: SemanticExpectation;
      /** The exact current snapshot the expectation was verified against
       *  (repoId + sha of the expectation's bound provenance). */
      readonly sourceSnapshot: SourceSnapshot;
    }
  | { readonly kind: 'NO_EXPECTATION'; readonly targetId?: string }
  | { readonly kind: 'SOURCE_UNAVAILABLE'; readonly expectation: SemanticExpectation }
  | { readonly kind: 'SOURCE_STALE'; readonly expectation: SemanticExpectation };

export interface RealSourceOracleOptions {
  /** Validated, admitted recipes (from the fixed registry). */
  readonly recipes: readonly RealSourceExpectationRecipe[];
  /** Expectations previously admitted by the explicit derivation run. */
  readonly expectations: readonly SemanticExpectation[];
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
}

/** Re-verify the source structure the expectation was derived from. Returns
 *  null when the evidence still matches; otherwise the failure reason. */
function reExtractEvidence(
  recipe: RealSourceExpectationRecipe,
  expectedDigest: string,
  reader: RealSourceReader,
): { ok: true } | { ok: false; reason: 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' } {
  const extractions: import('./recipes/types').SourceExtraction[] = [];
  for (const extractor of recipe.extractors) {
    if (extractor.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null;
      if (path === null) return { ok: false, reason: 'SOURCE_STALE' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, reason: 'SOURCE_UNAVAILABLE' };
      const result = extractPhpFunctionListRowKeys(text, extractor.symbol, extractor.accumulator, extractor.pattern);
      if (!result.ok) return { ok: false, reason: 'SOURCE_STALE' };
      extractions.push(result.extraction);
    }
    if (extractor.kind === 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null;
      if (path === null) return { ok: false, reason: 'SOURCE_STALE' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, reason: 'SOURCE_UNAVAILABLE' };
      const result = extractPhpFunctionReturnsListOfBuilder(text, extractor.symbol, extractor.accumulator, extractor.builderSymbol);
      if (!result.ok) return { ok: false, reason: 'SOURCE_STALE' };
      extractions.push(result.extraction);
    }
    if (extractor.kind === 'PHP_ROUTE_GET_BINDING') {
      const path = recipe.sourcePaths.find((p) => p.endsWith('Routing.yaml')) ?? null;
      if (path === null) return { ok: false, reason: 'SOURCE_STALE' };
      const text = reader.readFile(recipe.repoId, path);
      if (text === null) return { ok: false, reason: 'SOURCE_UNAVAILABLE' };
      const result = extractPhpRouteGetBinding(text, extractor.routePath, extractor.client, extractor.method);
      if (!result.ok) return { ok: false, reason: 'SOURCE_STALE' };
      extractions.push(result.extraction);
    }
  }
  const digest = evidenceDigestFor(extractions);
  if (digest !== expectedDigest) return { ok: false, reason: 'SOURCE_STALE' };
  return { ok: true };
}

export interface RealSourceResolver {
  /** Atomic resolution: expectation + the exact verified snapshot. */
  resolve(input: { targetId?: string }): RealSourceResolution;
}

export function createRealSourceResolver(options: RealSourceOracleOptions): RealSourceResolver {
  const { recipes, expectations, reader, currentness } = options;
  const recipeByTarget = new Map<string, RealSourceExpectationRecipe>();
  for (const recipe of recipes) {
    recipeByTarget.set(recipe.targetId, recipe);
  }
  const expectationByTarget = new Map<string, SemanticExpectation>();
  for (const expectation of expectations) {
    expectationByTarget.set(expectation.targetId, expectation);
  }

  return {
    resolve(input: { targetId?: string }): RealSourceResolution {
      const targetId = input.targetId;
      if (targetId === undefined) return { kind: 'NO_EXPECTATION' };
      const expectation = expectationByTarget.get(targetId);
      if (expectation === undefined) return { kind: 'NO_EXPECTATION', targetId };
      const recipe = recipeByTarget.get(targetId);
      if (recipe === undefined) return { kind: 'SOURCE_STALE', expectation };

      // C: current source snapshot unavailable.
      const current = currentness.currentSnapshot(expectation.sourceProvenance.repoId);
      if (current === null) return { kind: 'SOURCE_UNAVAILABLE', expectation };

      // B: the source advanced (or moved) — never silently re-bind.
      if (current.sha !== expectation.sourceProvenance.sha) return { kind: 'SOURCE_STALE', expectation };

      // D/E: re-verify the source structure still carries the evidence.
      const evidenceDigest = expectation.sourceProvenance.evidenceDigest;
      if (evidenceDigest === undefined) {
        // An expectation without mechanical derivation evidence is not an
        // admitted real-source expectation (SPEC §16).
        return { kind: 'SOURCE_STALE', expectation };
      }
      const recheck = reExtractEvidence(recipe, evidenceDigest, reader);
      if (!recheck.ok) {
        return recheck.reason === 'SOURCE_UNAVAILABLE'
          ? { kind: 'SOURCE_UNAVAILABLE', expectation }
          : { kind: 'SOURCE_STALE', expectation };
      }

      // A: current — the snapshot travels WITH this expectation.
      return {
        kind: 'RESOLVED',
        expectation,
        sourceSnapshot: { repoId: current.repoId, sha: current.sha },
      };
    },
  };
}
