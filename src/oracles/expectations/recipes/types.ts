// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — real-source expectation recipe (SPEC §11, §12,
// §14, §17).
//
// A recipe is DATA ONLY. It describes HOW to mechanically derive/prove one
// expectation from a read-only Alphaus source snapshot:
//
//   - repoId + exact relative source paths + symbol identifiers;
//   - one extractor kind from a FIXED vocabulary with parameters from a
//     fixed vocabulary (no code, no callbacks, no shell, no regex-as-data,
//     no expressions, no user/model-authored scripts);
//   - the expected source contract the extractor must reproduce (the
//     derivation FAILS CLOSED when the source no longer carries it);
//   - the expectation blueprint (target binding + fixed invariant
//     vocabulary) the admitted expectation is built from.
//
// A recipe never contains raw customer values and never grants authority: a
// provenance label cannot manufacture semantic authority — only
//   real source + deterministic source evidence + mechanically verified
//   derivation + approved read-only target + current source snapshot
// equals an admitted real-product expectation.
// ---------------------------------------------------------------------------

import type { ProjectionLimits, ProjectionNodeType } from '../../projections/types';

export const REAL_SOURCE_EXPECTATION_RECIPE_VERSION = 'nightwatch.real-source-expectation-recipe.v1' as const;
/** Phase 10A: richer recipe contract — v1 semantics are byte-meaning-stable;
 *  v2 ADDITIVELY carries item-level field type contracts derived from fixed
 *  bounded type-flow extraction (SPEC Phase 10A §6). A v1 recipe never
 *  carries the deep contract; a v2 recipe always does. */
export const REAL_SOURCE_EXPECTATION_RECIPE_VERSION_V2 = 'nightwatch.real-source-expectation-recipe.v2' as const;

// ---------------------------------------------------------------------------
// Fixed extractor vocabulary (SPEC §12) — only the kinds required by the
// admitted Phase 9A.1 candidates are implemented.
// ---------------------------------------------------------------------------

/** PHP handler returning a top-level JSON array of row literals: find the
 *  named function, verify `$acc[] = [...]`-style accumulation (pattern PUSH)
 *  or a single `$acc = [...]` row literal (pattern ASSIGN), plus the
 *  matching return, and extract the literal string-key set of the row(s).
 *  Deterministic lexical extraction; no PHP execution. */
export type PhpFunctionListRowKeysParams = {
  readonly kind: 'PHP_FUNCTION_LIST_ROW_KEYS';
  /** Exact PHP function name (e.g. `getCommonExchangeRate`). */
  readonly symbol: string;
  /** Accumulator variable name WITHOUT the `$` (e.g. `res`). */
  readonly accumulator: string;
  /** PUSH: `$acc[] = [...]` rows accumulated and returned as a list.
   *  ASSIGN: `$acc = [...]` single row-literal builder (`return $acc;`). */
  readonly pattern: 'PUSH' | 'ASSIGN';
};

/** PHP list accumulation proof: the route-bound function pushes rows built
 *  by `$this-><builderSymbol>(...)` into `$acc[]` and RETURNS the accumulator
 *  (possibly as the first argument of a row-level filter call, e.g.
 *  `return $this->rbac->filter($res, ...)` — the filter only subsets rows,
 *  never the item shape). */
export type PhpFunctionReturnsListOfBuilderParams = {
  readonly kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER';
  /** Route-bound function symbol (e.g. `getAccountVendor`). */
  readonly symbol: string;
  /** Accumulator variable name WITHOUT the `$`. */
  readonly accumulator: string;
  /** Builder method whose result is pushed (`$this-><builderSymbol>(`). */
  readonly builderSymbol: string;
};

/** PHP route binding check: the named route key must exist in Routing.yaml
 *  and bind client + method to the expected handler symbol. Bounded exact
 *  key matching; no YAML interpreter needed. */
export type PhpRouteGetBindingParams = {
  readonly kind: 'PHP_ROUTE_GET_BINDING';
  /** Exact route key, e.g. `/exchange_rate/global/{vendor}`. */
  readonly routePath: string;
  /** Expected client class, e.g. `App\Handler\ExchangeRate`. */
  readonly client: string;
  /** Expected method, e.g. `getCommonExchangeRate`. */
  readonly method: string;
};

/** Phase 10A: item field JSON type-flow proof (SPEC Phase 10A §7). The
 *  extractor scans ONE function body for the fixed assignment pattern of a
 *  named field variable (`$fieldVariable`) and proves the JSON type set the
 *  variable can serialize to. Fixed patterns only; anything outside the
 *  pattern is TYPE_FLOW_AMBIGUOUS (fail-closed). Never executes PHP. */
export type PhpItemFieldTypeFlowParams = {
  readonly kind: 'PHP_ITEM_FIELD_TYPE_FLOW';
  /** Exact PHP function name (e.g. `getCommonExchangeRate`). */
  readonly symbol: string;
  /** Field variable name WITHOUT the `$` (e.g. `exchange_rate`). */
  readonly fieldVariable: string;
  /** EMPTY_CAST_OBJECT: `[]` inits + `if (empty($var)) { $var = (object)$var; }`
   *  + no other assignment => JSON type OBJECT (empty case serializes `{}`).
   *  EMPTY_ARRAY_OR_STRING_KEYS: `[]` inits + NO cast + `$var[...] =` string-
   *  key subscripts + no other assignment => JSON type OBJECT-or-ARRAY. */
  readonly pattern: 'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS';
};

export type ExtractorParams =
  | PhpFunctionListRowKeysParams
  | PhpFunctionReturnsListOfBuilderParams
  | PhpRouteGetBindingParams
  | PhpItemFieldTypeFlowParams;

export type ExtractorKind = ExtractorParams['kind'];

export const MAX_RECIPE_EXTRACTORS = 4;

// ---------------------------------------------------------------------------
// Phase 10A — item-level field type contracts (recipe v2; SPEC §16).
//
// Represents ONLY mechanically proven facts: the JSON type set a row field
// can serialize to, established by the PHP_ITEM_FIELD_TYPE_FLOW extractor
// from fixed source patterns. No business-language prose, no runtime values,
// no raw key text, no arbitrary predicates.
// ---------------------------------------------------------------------------

export const MAX_ITEM_FIELD_TYPE_CONTRACTS = 8;

export interface RealSourceItemFieldTypeContract {
  /** Row field name (must be a member of the source-established row key set). */
  readonly field: string;
  /** Inspected item index (0 = first inspected item; matches the blueprint
   *  item index convention). */
  readonly itemIndex: number;
  /** Exact JSON type set the source establishes for the field. Canonical
   *  sorted order; 1..MAX_TYPE_SET_SIZE entries; known ProjectionNodeType
   *  values only; no duplicates. */
  readonly allowedTypes: readonly ProjectionNodeType[];
}

// ---------------------------------------------------------------------------
// Expected source contract (SPEC §9, §31 — never stronger than the source
// literally establishes).
// ---------------------------------------------------------------------------

export interface RealSourceContract {
  /** Top-level JSON class the handler return literal establishes. */
  readonly topLevel: 'ARRAY';
  /** Exact sorted literal key set of each row literal. The extraction must
   *  reproduce this set EXACTLY or the derivation fails closed. */
  readonly requiredItemKeys: readonly string[];
}

// ---------------------------------------------------------------------------
// Expectation blueprint (SPEC §17, §20, §22) — fixed invariant vocabulary
// only.
// ---------------------------------------------------------------------------

export interface RealSourceExpectationBlueprint {
  readonly expectationId: string;
  /** Bounded projection limits; empty object = defaults. */
  readonly projectionContractLimits: Readonly<Partial<ProjectionLimits>>;
  /** The root must be a JSON array (the source-established success class).
   *  This is STRONGER than "parses as JSON": a 2xx error-envelope object or
   *  a wrapper object violates it. */
  readonly rootType: 'ARRAY';
  /** Inspected item index for the per-item field checks (0 = first
   *  inspected item). */
  readonly itemIndex: number;
  /** Item fields whose literal presence the source establishes. */
  readonly itemFieldPaths: readonly string[];
}

// ---------------------------------------------------------------------------
// Recipe DTO (SPEC §11; Phase 10A §6).
// ---------------------------------------------------------------------------

interface RealSourceExpectationRecipeBase {
  readonly recipeId: string;
  /** Approved read-only target identity: Phase 5 operationId (which equals
   *  the reviewed journey ruleId for the DEV-reachable operations). */
  readonly targetId: string;
  readonly repoId: string;
  /** Repository-relative source paths (never absolute, no traversal). */
  readonly sourcePaths: readonly string[];
  /** Fixed extractor sequence (at most MAX_RECIPE_EXTRACTORS, each kind at
   *  most once) whose combined evidence proves the contract. */
  readonly extractors: readonly ExtractorParams[];
  readonly expectedContract: RealSourceContract;
  readonly blueprint: RealSourceExpectationBlueprint;
}

export interface RealSourceExpectationRecipeV1 extends RealSourceExpectationRecipeBase {
  readonly schemaVersion: typeof REAL_SOURCE_EXPECTATION_RECIPE_VERSION;
}

/** v2 = v1 semantics (row shape + route binding + blueprint) PLUS the
 *  mechanically proven item-level field type contracts. A v2 recipe MUST
 *  carry at least one itemFieldTypeContract and MUST include a matching
 *  PHP_ITEM_FIELD_TYPE_FLOW extractor per contract (enforced by the strict
 *  validator). */
export interface RealSourceExpectationRecipeV2 extends RealSourceExpectationRecipeBase {
  readonly schemaVersion: typeof REAL_SOURCE_EXPECTATION_RECIPE_VERSION_V2;
  readonly itemFieldTypeContracts: readonly RealSourceItemFieldTypeContract[];
}

export type RealSourceExpectationRecipe = RealSourceExpectationRecipeV1 | RealSourceExpectationRecipeV2;

// ---------------------------------------------------------------------------
// Derivation outputs (SPEC §14, §15).
// ---------------------------------------------------------------------------

export type SourceExtraction =
  | {
      readonly kind: 'PHP_FUNCTION_LIST_ROW_KEYS';
      readonly symbol: string;
      readonly pattern: 'PUSH' | 'ASSIGN';
      /** Sorted literal key set of the row literal(s). */
      readonly itemKeys: readonly string[];
      readonly rowLiteralCount: number;
    }
  | {
      readonly kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER';
      readonly symbol: string;
      readonly builderSymbol: string;
      readonly pushCount: number;
      readonly returnsAccumulatorList: boolean;
    }
  | {
      readonly kind: 'PHP_ROUTE_GET_BINDING';
      readonly routePath: string;
      readonly client: string;
      readonly method: string;
      readonly found: boolean;
    }
  | {
      readonly kind: 'PHP_ITEM_FIELD_TYPE_FLOW';
      readonly symbol: string;
      readonly fieldVariable: string;
      readonly pattern: 'EMPTY_CAST_OBJECT' | 'EMPTY_ARRAY_OR_STRING_KEYS';
      /** `$var = []` initialization sites. */
      readonly arrayInitSites: number;
      /** `if (empty($var)) { $var = (object)$var; }` sites. */
      readonly emptyGuardedCastSites: number;
      /** `$var[...] =` subscript assignment sites. */
      readonly subscriptAssignments: number;
      /** `$var = <other>` sites (RHS neither `[]` nor `(object)$var`). */
      readonly otherAssignments: number;
      /** `'<field>' => $<var>` row-literal binding found. */
      readonly rowFieldBinding: boolean;
      /** JSON type set proven by the fixed pattern decision table. */
      readonly allowedJsonTypes: readonly ProjectionNodeType[];
    };

/** Deterministic evidence digest over the NORMALIZED source structure used
 *  to derive the expectation (the canonical extraction), never over the
 *  entire unrelated repository (SPEC §14). Format: ev:sha256:<24>. */
export type EvidenceDigest = string;

export const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

export type RealSourceDerivationFailure =
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_PATH_MISSING'
  | 'FUNCTION_NOT_FOUND'
  | 'ACCUMULATOR_NOT_FOUND'
  | 'NO_ROW_LITERAL'
  | 'TOP_LEVEL_NOT_ARRAY'
  | 'ITEM_KEYS_MISMATCH'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_BINDING_MISMATCH'
  | 'BUILDER_PUSH_NOT_FOUND'
  | 'EXTRACTION_UNSUPPORTED'
  | 'TYPE_FLOW_AMBIGUOUS'
  | 'TYPE_FLOW_CONTRACT_MISMATCH'
  | 'CONTRACT_MISMATCH';

export type RealSourceDerivationResult =
  | {
      readonly ok: true;
      readonly extraction: SourceExtraction;
      readonly evidenceDigest: EvidenceDigest;
    }
  | {
      readonly ok: false;
      readonly failure: RealSourceDerivationFailure;
      readonly detail?: string;
    };

// ---------------------------------------------------------------------------
// Read-only source access interfaces (SPEC §41, §42). Implementations live
// OUTSIDE the purity-guarded oracle directories (src/core/source/) and are
// injected here: the expectations core itself performs no filesystem, no
// child processes, and no network I/O.
// ---------------------------------------------------------------------------

/** Bounded read-only source file access for one repo snapshot. */
export interface RealSourceReader {
  /** Returns the static text of a repository-relative source path, or null
   *  when the repo or the path is unavailable. Must never resolve outside
   *  the configured read-only sibling root. */
  readFile(repoId: string, relativePath: string): string | null;
}

/** Currentness of one repo snapshot (read-only git metadata). */
export interface RealSourceCurrentness {
  /** Current HEAD snapshot for a repoId, or null when unavailable. */
  currentSnapshot(repoId: string): { repoId: string; sha: string } | null;
}
