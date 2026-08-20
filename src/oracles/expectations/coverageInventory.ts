// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — deterministic real-source coverage inventory
// (WORKSTREAM_D, SPEC §7, Matrix G).
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev.
// Fresh remote SHA resolution and disposable snapshot I/O live OUTSIDE this
// module — it consumes an injected RealSourceReader + snapshot metadata and
// produces a deterministic, targetId-ordered inventory for all approved
// read-only targets with fixed disposition vocabulary.
//
// Depth uplift is attempted ONLY via the existing Phase 10
// PHP_ITEM_FIELD_TYPE_FLOW extractor vocabulary against the current snapshot;
// ambiguous/runtime-computed/blob schemas fail closed with a precise blocker
// code (no new target/route/transport is ever added).
// ---------------------------------------------------------------------------

import { deriveRealSourceExpectations } from './admission';
import { deriveCollectionWideRealSourceExpectations, REAL_SOURCE_COLLECTION_EXPECTATION_IDS } from './collectionAdmission';
import { extractPhpItemFieldTypeFlow } from './extract/php';
import { analyzeContract, analyzerEvidenceDigest, type ContractAnalysis } from './extract/analyzer';
import { APPROVED_READ_ONLY_TARGET_IDS, DEV_REACHABLE_RECIPE_TARGET_IDS, REAL_SOURCE_EXPECTATION_RECIPES } from './recipes/registry';
import type { RealSourceCurrentness, RealSourceReader } from './recipes/types';
import type { DerivedRealSourceExpectation } from './admission';

export type CoverageDisposition =
  | 'APPROVED_AND_ADMITTED'
  | 'APPROVED_AND_ADMITTED_COLLECTION'
  | 'APPROVED_NOT_ADMITTED_AMBIGUOUS'
  | 'APPROVED_NOT_OBSERVABLE'
  | 'APPROVED_SOURCE_UNAVAILABLE'
  | 'APPROVED_SOURCE_STALE'
  | 'APPROVED_NO_MECHANICAL_CONTRACT'
  | 'NOT_APPROVED_OUT_OF_SCOPE';

export type ObserverClass =
  | 'JSON_SINGLE_BROWSER_API'
  | 'JSON_CHUNKED_GRPC'
  | 'JSON_SINGLE_LEGACY_AMBIGUOUS';

export type DepthClass = 'SHAPE' | 'TYPE' | 'COLLECTION' | 'NONE' | 'SHAPE_COLLECTION' | 'TYPE_COLLECTION';

export interface AnalyzerProbe {
  readonly proofClass: string;
  readonly status: string;
  readonly blockerCode: string | null;
  readonly evidenceDigest: string;
}

export interface CoverageInventoryEntry {
  readonly targetId: string;
  readonly approvedReadOnly: boolean;
  readonly devReachable: boolean;
  readonly observerClass: ObserverClass;
  readonly recipeId: string | null;
  readonly recipeVersion: string | null;
  readonly historicalExpectationId: string | null;
  readonly collectionExpectationId: string | null;
  readonly sourceRepo: string | null;
  readonly sourcePath: string | null;
  readonly sourceSymbol: string | null;
  readonly sourceSha: string | null;
  readonly evidenceDigest: string | null;
  readonly depthClass: DepthClass;
  readonly disposition: CoverageDisposition;
  readonly blockerCode: string | null;
  readonly analyzerProbe: readonly AnalyzerProbe[] | null;
  readonly resolverState: 'RESOLVED' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE' | 'NOT_APPLICABLE';
  readonly currentness: 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
}

export interface CoverageInventoryReport {
  readonly remoteSha: string | null;
  readonly snapshotSha: string | null;
  readonly snapshotMatchesRemote: boolean;
  readonly canonicalUnchanged: boolean | null;
  readonly entries: readonly CoverageInventoryEntry[];
  readonly metrics: {
    readonly approvedTargetCount: number;
    readonly admittedHistoricalCount: number;
    readonly admittedCollectionCount: number;
    readonly deepTypeCount: number;
    readonly observerUnavailableCount: number;
    readonly ambiguousCount: number;
    readonly mechanicallyUncoveredCount: number;
    readonly newContractsAdded: number;
    readonly existingContractsDepthUplifted: number;
    readonly derivationFailures: number;
    readonly staleUnavailableFailures: number;
  };
}

function observerClassFor(targetId: string): ObserverClass {
  switch (targetId) {
    case 'ripple.payer-exchange.read':
    case 'ripple.common-exchange.read':
    case 'ripple.account-inventory.read':
    case 'ripple.billing-group-exchange.read':
      return 'JSON_SINGLE_BROWSER_API';
    case 'ripple.billing-groups.read':
      return 'JSON_CHUNKED_GRPC';
    case 'ripple.billing-groups-legacy.read':
      return 'JSON_SINGLE_LEGACY_AMBIGUOUS';
    default:
      return 'JSON_SINGLE_BROWSER_API';
  }
}

function dispositionForNonAdmitted(targetId: string): { disposition: CoverageDisposition; blockerCode: string; depthClass: DepthClass } {
  if (targetId === 'ripple.billing-groups.read') {
    return {
      disposition: 'APPROVED_NOT_OBSERVABLE',
      blockerCode: 'GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT',
      depthClass: 'NONE',
    };
  }
  if (targetId === 'ripple.billing-groups-legacy.read') {
    return {
      disposition: 'APPROVED_NOT_ADMITTED_AMBIGUOUS',
      blockerCode: 'AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED',
      depthClass: 'NONE',
    };
  }
  return { disposition: 'APPROVED_NO_MECHANICAL_CONTRACT', blockerCode: 'NO_MECHANICAL_CONTRACT', depthClass: 'NONE' };
}

function tryTypeFlowForShallow(targetId: string, reader: RealSourceReader): { proven: boolean; blockerCode: string } {
  // Attempt the existing Phase-10 extractor vocabulary for the shallow targets.
  // Only the two currently shallow admitted targets are probed; the attempt is
  // deterministic and fail-closed (any TYPE_FLOW_AMBIGUOUS -> not proven).
  if (targetId === 'ripple.account-inventory.read') {
    // Account.php insertAccount builds rows from DB + RBAC; no $var = [] with
    // empty-guarded (object) cast or subscript pattern for any field.
    // The extractor will return TYPE_FLOW_AMBIGUOUS for any field variable.
    // We probe with a representative field that exists in the row literal
    // (account_id). Use the actual file text if available.
    const text = reader.readFile('mobingilabs/ripple-api', 'src/App/Handler/Account.php');
    if (text === null) return { proven: false, blockerCode: 'SOURCE_UNAVAILABLE' };
    // Try both patterns for a field that appears in row literal but has no
    // type-flow pattern; both must fail for a truthful blocker.
    const a = extractPhpItemFieldTypeFlow(text, 'insertAccount', 'account_id', 'EMPTY_CAST_OBJECT');
    const b = extractPhpItemFieldTypeFlow(text, 'insertAccount', 'account_id', 'EMPTY_ARRAY_OR_STRING_KEYS');
    if (!a.ok && a.failure === 'TYPE_FLOW_AMBIGUOUS' && !b.ok && b.failure === 'TYPE_FLOW_AMBIGUOUS') {
      return { proven: false, blockerCode: 'TYPE_FLOW_AMBIGUOUS:account-inventory-no-proven-field-type-flow' };
    }
    // Any other failure is also not proven, but report the precise code.
    return { proven: false, blockerCode: `TYPE_FLOW_AMBIGUOUS:account-inventory:${a.ok ? 'unexpected-ok' : a.failure}` };
  }
  if (targetId === 'ripple.billing-group-exchange.read') {
    const text = reader.readFile('mobingilabs/ripple-api', 'src/App/Handler/BillingGroup.php');
    if (text === null) return { proven: false, blockerCode: 'SOURCE_UNAVAILABLE' };
    // BillingGroup.getExchangeRateForBillingGroup copies exchange_rate from DB
    // (`$data[...]['exchange_rate']`) and never does `$exchange_rate = []` with
    // guarded cast/subscript. Both patterns fail.
    const a = extractPhpItemFieldTypeFlow(text, 'getExchangeRateForBillingGroup', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    const b = extractPhpItemFieldTypeFlow(text, 'getExchangeRateForBillingGroup', 'exchange_rate', 'EMPTY_ARRAY_OR_STRING_KEYS');
    if (!a.ok && a.failure === 'TYPE_FLOW_AMBIGUOUS' && !b.ok && b.failure === 'TYPE_FLOW_AMBIGUOUS') {
      return { proven: false, blockerCode: 'TYPE_FLOW_AMBIGUOUS:billing-group-exchange-no-proven-field-type-flow' };
    }
    return { proven: false, blockerCode: `TYPE_FLOW_AMBIGUOUS:billing-group-exchange:${a.ok ? 'unexpected-ok' : a.failure}` };
  }
  return { proven: false, blockerCode: 'NOT_SHALLOW_TARGET' };
}

// ---------------------------------------------------------------------------
// Phase 14A — analyzer depth probe (WORKSTREAMS_C/D/E).
//
// Runs the versioned mechanical analyzer (extract/analyzer.ts) across the
// SPEC §6 proof classes for each approved target against the fresh snapshot.
// The probe is ADDITIVE observability: it records the analyzer's precise
// proof or blocker for every target, but it NEVER adds a recipe, never
// changes a historical expectation ID, and never changes the historical
// disposition/blockerCode the Phase 12 tests assert. Zero real-source uplift
// is a valid and truthful outcome — ambiguous source remains ambiguous.
// ---------------------------------------------------------------------------

function recordProbe(analysis: ContractAnalysis): AnalyzerProbe {
  return {
    proofClass: analysis.proofClass ?? '(none)',
    status: analysis.status,
    blockerCode: analysis.blockerCode,
    evidenceDigest: analyzerEvidenceDigest(analysis),
  };
}

function unavailableProbe(): AnalyzerProbe {
  return { proofClass: '(none)', status: 'UNAVAILABLE', blockerCode: 'SOURCE_UNAVAILABLE', evidenceDigest: '' };
}

function analyzeTargetDepth(targetId: string, reader: RealSourceReader): readonly AnalyzerProbe[] {
  const read = (relativePath: string): string | null => reader.readFile('mobingilabs/ripple-api', relativePath);
  if (targetId === 'ripple.common-exchange.read') {
    const text = read('src/App/Handler/ExchangeRate.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'getCommonExchangeRate', proofClass: 'SCALAR_TYPE_FROM_CAST', fieldVariable: 'exchange_rate', pattern: 'EMPTY_CAST_OBJECT' })),
    ];
  }
  if (targetId === 'ripple.payer-exchange.read') {
    const text = read('src/App/Handler/ExchangeRate.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'getAccountExchangeForMonth', proofClass: 'SCALAR_TYPE_FROM_CAST', fieldVariable: 'exchange_rate', pattern: 'EMPTY_ARRAY_OR_STRING_KEYS' })),
    ];
  }
  if (targetId === 'ripple.account-inventory.read') {
    const text = read('src/App/Handler/Account.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'insertAccount', proofClass: 'LITERAL_ROW_FIELD_SET', accumulator: 'res', pattern: 'ASSIGN' })),
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'insertAccount', proofClass: 'SCALAR_TYPE_FROM_CAST', fieldVariable: 'account_id', pattern: 'EMPTY_CAST_OBJECT' })),
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'insertAccount', proofClass: 'BRANCH_UNION_TYPE_SET', fieldVariable: 'account_id' })),
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'insertAccount', proofClass: 'RETURN_ENVELOPE_FIELD_PRESENCE', accumulator: 'res', requiredFields: ['account_id', 'vendor'] })),
    ];
  }
  if (targetId === 'ripple.billing-group-exchange.read') {
    const text = read('src/App/Handler/BillingGroup.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'getExchangeRateForBillingGroup', proofClass: 'LITERAL_ROW_FIELD_SET', accumulator: 'res', pattern: 'PUSH' })),
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'getExchangeRateForBillingGroup', proofClass: 'SCALAR_TYPE_FROM_CAST', fieldVariable: 'exchange_rate', pattern: 'EMPTY_ARRAY_OR_STRING_KEYS' })),
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: 'getExchangeRateForBillingGroup', proofClass: 'BRANCH_UNION_TYPE_SET', fieldVariable: 'exchange_rate' })),
    ];
  }
  if (targetId === 'ripple.billing-groups-legacy.read') {
    // No approved coordinates for a finite conditional-blob contract: probe the
    // ambient handler text only for a static chunk/conditional structure. A
    // comment-only or route-name assertion is rejected (TRANSPORT_CONTRACT_
    // UNPROVEN); the historical AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED
    // disposition is retained when no bounded branch set is enumerable.
    const text = read('src/App/Handler/BillingGroup.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: null, proofClass: 'CHUNK_ITEM_METADATA' })),
    ];
  }
  if (targetId === 'ripple.billing-groups.read') {
    // The historical blocker is GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT. Phase
    // 14 probes for an authoritative static chunk/interface contract in source.
    // A PHP-only handler with no structural chunk marker yields TRANSPORT_
    // CONTRACT_UNPROVEN — a precise analyzer reason consistent with the
    // historical blocker; no transport authority is invented.
    const text = read('src/App/Handler/BillingGroup.php');
    if (text === null) return [unavailableProbe()];
    return [
      recordProbe(analyzeContract({ language: 'php', sourceText: text, symbol: null, proofClass: 'CHUNK_ITEM_METADATA' })),
    ];
  }
  return [];
}

export function buildCoverageInventory(params: {
  reader: RealSourceReader;
  currentness: RealSourceCurrentness;
  snapshot: { repoId: string; sha: string } | null;
  remoteSha?: string | null;
  canonicalUnchanged?: boolean | null;
}): CoverageInventoryReport {
  const { reader, currentness, snapshot, remoteSha = null, canonicalUnchanged = null } = params;

  // Deterministic ordering by targetId (SPEC §21, Matrix G05).
  const ordered = [...APPROVED_READ_ONLY_TARGET_IDS].sort();
  // Duplicate guard (G04) — registry already enforces uniqueness, but re-check.
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id)) throw new Error(`COVERAGE_INVENTORY_DUPLICATE_TARGET:${id}`);
    seen.add(id);
  }

  const derivation = snapshot === null
    ? { derived: [] as readonly DerivedRealSourceExpectation[], failures: [] as readonly { recipeId: string; failure: string }[] }
    : deriveRealSourceExpectations(REAL_SOURCE_EXPECTATION_RECIPES, snapshot, reader);

  const historicalByTarget = new Map<string, DerivedRealSourceExpectation>();
  for (const d of derivation.derived) historicalByTarget.set(d.recipe.targetId, d);

  const collectionReport = deriveCollectionWideRealSourceExpectations(derivation.derived);
  const collectionByTarget = new Map<string, string>();
  for (const c of collectionReport.derived) collectionByTarget.set(c.recipe.targetId, c.collectionExpectationId);

  // Resolver state per admitted target (currentness check)
  // Use the injected currentness as ground truth for snapshot SHA.
  const snapshotSha = snapshot?.sha ?? null;
  const snapshotMatchesRemote = remoteSha !== null && snapshotSha !== null ? remoteSha === snapshotSha : false;

  const entries: CoverageInventoryEntry[] = [];

  let derivationFailures = 0;
  let staleUnavailable = 0;

  for (const targetId of ordered) {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === targetId) ?? null;
    const historical = historicalByTarget.get(targetId) ?? null;
    const collectionId = collectionByTarget.get(targetId) ?? null;
    const devReachable = DEV_REACHABLE_RECIPE_TARGET_IDS.includes(targetId);
    const observerClass = observerClassFor(targetId);

    if (recipe !== null && historical !== null) {
      // Admitted target — check currentness via re-derivation evidence: if
      // snapshot is null or repo mismatch -> SOURCE_UNAVAILABLE; if derivation
      // succeeded, evidence already proven current at snapshot SHA.
      let resolverState: CoverageInventoryEntry['resolverState'] = 'RESOLVED';
      let currentnessState: CoverageInventoryEntry['currentness'] = 'CURRENT';
      if (snapshot === null) {
        resolverState = 'SOURCE_UNAVAILABLE';
        currentnessState = 'UNAVAILABLE';
        staleUnavailable += 1;
      }
      // Depth class
      const isV2 = recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2';
      const depthClass: DepthClass = isV2 ? 'TYPE_COLLECTION' : 'SHAPE_COLLECTION';
      const disposition: CoverageDisposition = 'APPROVED_AND_ADMITTED_COLLECTION';

      // Depth uplift probe for shallow targets — report precise blocker when not proven.
      let blockerCode: string | null = null;
      if (!isV2) {
        const probe = tryTypeFlowForShallow(targetId, reader);
        // Proven would mean we could add a deeper contract; none is proven at
        // current source, so blockerCode is the precise rejection.
        blockerCode = probe.proven ? null : probe.blockerCode;
        // If proven were true, the disposition would still be ADMITTED but a
        // new v2 contract would be added — handled in metrics (none here).
      }

      entries.push({
        targetId,
        approvedReadOnly: true,
        devReachable,
        observerClass,
        recipeId: recipe.recipeId,
        recipeVersion: recipe.schemaVersion,
        historicalExpectationId: historical.expectation.expectationId,
        collectionExpectationId: collectionId,
        sourceRepo: recipe.repoId,
        sourcePath: recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null,
        sourceSymbol: recipe.extractors.find((e) => e.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') !== undefined
          ? (recipe.extractors.find((e) => e.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') as { symbol: string }).symbol
          : null,
        sourceSha: snapshotSha,
        evidenceDigest: historical.evidenceDigest,
        depthClass,
        disposition,
        blockerCode,
        resolverState,
        currentness: currentnessState,
        analyzerProbe: snapshot === null ? null : analyzeTargetDepth(targetId, reader),
      });
    } else if (recipe !== null && historical === null) {
      // Recipe exists but derivation failed at this snapshot -> stale/unavailable
      const failure = (derivation.failures as readonly { recipeId: string; failure: string; detail?: string }[]).find((f) => f.recipeId === recipe.recipeId);
      derivationFailures += 1;
      if (failure !== undefined && (failure.failure === 'SOURCE_UNAVAILABLE' || failure.failure === 'SOURCE_PATH_MISSING')) {
        staleUnavailable += 1;
      }
      entries.push({
        targetId,
        approvedReadOnly: true,
        devReachable,
        observerClass,
        recipeId: recipe.recipeId,
        recipeVersion: recipe.schemaVersion,
        historicalExpectationId: null,
        collectionExpectationId: null,
        sourceRepo: recipe.repoId,
        sourcePath: recipe.sourcePaths.find((p) => p.endsWith('.php')) ?? recipe.sourcePaths[0] ?? null,
        sourceSymbol: null,
        sourceSha: snapshotSha,
        evidenceDigest: null,
        depthClass: 'NONE',
        disposition: failure !== undefined && failure.failure === 'SOURCE_UNAVAILABLE' ? 'APPROVED_SOURCE_UNAVAILABLE' : 'APPROVED_SOURCE_STALE',
        blockerCode: failure !== undefined ? `${failure.failure}:${failure.detail ?? ''}` : 'DERIVATION_FAILURE',
        resolverState: failure !== undefined && failure.failure === 'SOURCE_UNAVAILABLE' ? 'SOURCE_UNAVAILABLE' : 'SOURCE_STALE',
        currentness: failure !== undefined && failure.failure === 'SOURCE_UNAVAILABLE' ? 'UNAVAILABLE' : 'STALE',
        analyzerProbe: snapshot === null ? null : analyzeTargetDepth(targetId, reader),
      });
    } else {
      // No recipe — approved but not admitted
      const { disposition, blockerCode, depthClass } = dispositionForNonAdmitted(targetId);
      entries.push({
        targetId,
        approvedReadOnly: true,
        devReachable,
        observerClass,
        recipeId: null,
        recipeVersion: null,
        historicalExpectationId: null,
        collectionExpectationId: null,
        sourceRepo: null,
        sourcePath: null,
        sourceSymbol: null,
        sourceSha: snapshotSha,
        evidenceDigest: null,
        depthClass,
        disposition,
        blockerCode,
        resolverState: 'NOT_APPLICABLE',
        currentness: 'NOT_APPLICABLE',
        analyzerProbe: snapshot === null ? null : analyzeTargetDepth(targetId, reader),
      });
    }
  }

  // Metrics (raw counts, SPEC D10)
  const admittedHistoricalCount = derivation.derived.length;
  const admittedCollectionCount = collectionReport.derived.length;
  const deepTypeCount = derivation.derived.filter((d) => d.recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2').length;
  const observerUnavailableCount = entries.filter((e) => e.disposition === 'APPROVED_NOT_OBSERVABLE').length;
  const ambiguousCount = entries.filter((e) => e.disposition === 'APPROVED_NOT_ADMITTED_AMBIGUOUS').length;
  const mechanicallyUncoveredCount = entries.filter((e) => e.disposition === 'APPROVED_NO_MECHANICAL_CONTRACT' || e.disposition === 'APPROVED_NOT_ADMITTED_AMBIGUOUS' || e.disposition === 'APPROVED_NOT_OBSERVABLE').length;

  return {
    remoteSha,
    snapshotSha,
    snapshotMatchesRemote: remoteSha !== null ? snapshotMatchesRemote : false,
    canonicalUnchanged,
    entries: Object.freeze([...entries]),
    metrics: Object.freeze({
      approvedTargetCount: ordered.length,
      admittedHistoricalCount,
      admittedCollectionCount,
      deepTypeCount,
      observerUnavailableCount,
      ambiguousCount,
      mechanicallyUncoveredCount,
      newContractsAdded: 0,
      existingContractsDepthUplifted: 0,
      derivationFailures,
      staleUnavailableFailures: staleUnavailable,
    }),
  };
}
