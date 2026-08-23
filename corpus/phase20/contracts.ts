// Phase 20 synthetic product contract portfolio. Every relation is built from
// an admitted fixture candidate; no relation is inferred from names alone.

import {
  admitContractInventory,
  createMetamorphicRelation,
  createRelationalContract,
  createSurfaceEquivalenceContract,
  discoverContractInventoryCached,
  type MetamorphicRelation,
  type RelationalContract,
  type SurfaceEquivalenceContract,
} from "../../src/core/semanticCoverage";
import type {
  SemanticCapabilityBinding,
} from "../../src/core/semanticCoverage/campaignIntegration";
import { adapterFromProductConfig, type ProductAdapter } from "../../src/products/adapter";
import { PHASE20_SOURCE_ARTIFACTS, PHASE20_SOURCE_SHA } from "./sourceFixtures";

export function phase20Inventory() {
  return admitContractInventory(discoverContractInventoryCached({ artifacts: PHASE20_SOURCE_ARTIFACTS, currentSnapshots: { "synthetic/phase20-product": PHASE20_SOURCE_SHA } }).value);
}

function candidate(kind: string) {
  const found = phase20Inventory().candidates.find((entry) => entry.shape?.kind === kind && entry.proofStatus === "PROJECTABLE");
  if (found === undefined) throw new Error(`PHASE20_FIXTURE_CONTRACT_MISSING:${kind}`);
  return found;
}

export function phase20RelationalContracts(): readonly RelationalContract[] {
  const aggregate = candidate("AGGREGATION");
  const presence = candidate("PRESENCE_RELATION");
  const ordering = candidate("SORT_ORDER");
  const pagination = candidate("PAGINATION");
  const fields = candidate("FIELD_SET");
  const normalization = candidate("NORMALIZATION");
  return [
    createRelationalContract({ candidate: aggregate, relationId: "phase20.total", definition: { kind: "TOTAL_EQUALS_SUM", collectionPath: ["items"], numericFieldPath: ["amount"], scalarPath: ["total"] } }),
    createRelationalContract({ candidate: aggregate, relationId: "phase20.group", definition: { kind: "GROUP_AGGREGATE", collectionPath: ["items"], groupPath: ["groups"], groupCountPath: ["count"] } }),
    createRelationalContract({ candidate: presence, relationId: "phase20.presence", definition: { kind: "FIELD_PRESENT_IF", conditionPath: ["enabled"], targetPath: ["detail"], conditionExpected: true } }),
    createRelationalContract({ candidate: ordering, relationId: "phase20.ordering", definition: { kind: "ORDERING", collectionPath: ["items"], itemValuePath: ["rank"], direction: "ASCENDING" } }),
    createRelationalContract({ candidate: pagination, relationId: "phase20.pagination", definition: { kind: "PAGINATION_CONSERVATION", pageCollectionPaths: [["pageA"], ["pageB"]], totalPath: ["total"], itemIdentityPath: ["id"] } }),
    createRelationalContract({ candidate: pagination, relationId: "phase20.count", definition: { kind: "COUNT_EQUALS_CARDINALITY", collectionPath: ["items"], countPath: ["count"] } }),
    createRelationalContract({ candidate: fields, relationId: "phase20.subset", definition: { kind: "SET_SUBSET", leftCollectionPath: ["left"], rightCollectionPath: ["right"], itemIdentityPath: ["id"] } }),
    createRelationalContract({ candidate: fields, relationId: "phase20.exclusive", definition: { kind: "MUTUALLY_EXCLUSIVE", paths: [["primary"], ["secondary"]] } }),
    createRelationalContract({ candidate: fields, relationId: "phase20.exactly-one", definition: { kind: "EXACTLY_ONE_OF", paths: [["primary"], ["secondary"]] } }),
    createRelationalContract({ candidate: fields, relationId: "phase20.monotonic", definition: { kind: "MONOTONIC", beforePath: ["value"], afterPath: ["value"], direction: "NON_DECREASING" } }),
    createRelationalContract({ candidate: normalization, relationId: "phase20.normalization", definition: { kind: "NORMALIZATION_EQUIVALENCE", leftPath: ["left"], rightPath: ["right"] } }),
    createRelationalContract({ candidate: fields, relationId: "phase20.identity", definition: { kind: "IDENTITY_PRESERVATION", leftPath: ["left"], rightPath: ["right"] } }),
  ].filter((contract) => contract.proofStatus === "ADMITTED");
}

export function phase20DifferentialContracts(): readonly SurfaceEquivalenceContract[] {
  const source = candidate("FIELD_SET").source;
  return [createSurfaceEquivalenceContract({ equivalenceId: "phase20.browser-api-summary", leftSurfaceId: "browser", rightSurfaceId: "api", sourceProvenance: source, sourceCurrentness: "CURRENT", expected: "EQUAL", comparison: "EXACT", leftPath: ["summary"], rightPath: ["summary"], mechanicallyProven: true })];
}

export function phase20MetamorphicRelations(): readonly MetamorphicRelation[] {
  const source = candidate("NORMALIZATION").source;
  return [
    createMetamorphicRelation({ relationId: "phase20.metamorphic.presentation", sourceProvenance: source, sourceCurrentness: "CURRENT", definition: { kind: "IRRELEVANT_FIELD_INVARIANCE", comparedPath: ["summary"] }, mechanicallyProven: true }),
    createMetamorphicRelation({ relationId: "phase20.metamorphic.order", sourceProvenance: source, sourceCurrentness: "CURRENT", definition: { kind: "STABLE_ORDER", collectionPath: ["items"], itemValuePath: ["rank"], direction: "ASCENDING" }, mechanicallyProven: true }),
    createMetamorphicRelation({ relationId: "phase20.metamorphic.pagination", sourceProvenance: source, sourceCurrentness: "CURRENT", definition: { kind: "PAGINATION_MONOTONIC", countPath: ["count"], direction: "NON_DECREASING" }, mechanicallyProven: true }),
  ];
}

function sourceCandidateIdForEvidence(evidenceDigest: string): string {
  const found = phase20Inventory().candidates.find((entry) => entry.source.evidenceDigest === evidenceDigest);
  if (found === undefined) throw new Error("PHASE20_FIXTURE_SOURCE_CANDIDATE_MISSING");
  return found.candidateId;
}

/** Capability bindings consumed by the Phase 19-integrated gap ranker. */
export function phase20CapabilityBindings(): readonly SemanticCapabilityBinding[] {
  const relational = phase20RelationalContracts().map((contract) => ({
    capabilityId: contract.contractId,
    sourceCandidateId: contract.sourceCandidateId,
    capabilityKind: "RELATIONAL" as const,
    scenarioBound: true,
    replaySupported: contract.kind === "TOTAL_EQUALS_SUM" || contract.kind === "PAGINATION_CONSERVATION",
    replayReproduces: contract.kind === "TOTAL_EQUALS_SUM",
    minimizationSupported: contract.kind !== "PAGINATION_CONSERVATION",
    dossierExplainable: true,
    observationSurfaceCount: contract.observationSurfaces.length,
  }));
  const differential = phase20DifferentialContracts().map((contract) => ({
    capabilityId: contract.equivalenceId,
    sourceCandidateId: sourceCandidateIdForEvidence(contract.sourceProvenance.evidenceDigest),
    capabilityKind: "DIFFERENTIAL" as const,
    scenarioBound: true,
    replaySupported: true,
    replayReproduces: true,
    minimizationSupported: true,
    dossierExplainable: true,
    observationSurfaceCount: 2,
  }));
  const metamorphic = phase20MetamorphicRelations().map((relation) => ({
    capabilityId: relation.relationId,
    sourceCandidateId: sourceCandidateIdForEvidence(relation.sourceProvenance.evidenceDigest),
    capabilityKind: "METAMORPHIC" as const,
    scenarioBound: true,
    replaySupported: relation.definition.kind !== "PAGINATION_MONOTONIC",
    replayReproduces: relation.definition.kind === "STABLE_ORDER",
    minimizationSupported: relation.definition.kind !== "PAGINATION_MONOTONIC",
    dossierExplainable: true,
    observationSurfaceCount: 1,
  }));
  return [...relational, ...differential, ...metamorphic].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

/** Synthetic-only adapter; it is deliberately not registered as a real product. */
export const PHASE20_SYNTHETIC_PRODUCT_ADAPTER: ProductAdapter = adapterFromProductConfig({
  id: "synthetic-phase20-product",
  label: "Phase 20 multi-surface synthetic fixture",
  candidateRoutes: [
    { id: "summary-browser", path: "/summary", passive: true },
    { id: "summary-api", path: "/api/summary", passive: true },
    { id: "summary-replay", path: "/replay/summary", passive: true },
    { id: "paged-list", path: "/summary/items", passive: true },
  ],
}, { syntheticFixtureOnly: true });

export const PHASE20_SYNTHETIC_PRODUCT_MODEL = Object.freeze({
  productId: "synthetic-phase20-product",
  syntheticFixtureOnly: true as const,
  surfaces: [
    { surfaceId: "browser", kind: "BROWSER", contracts: ["phase20.browser-api-summary"] },
    { surfaceId: "api", kind: "API", contracts: ["phase20.browser-api-summary"] },
    { surfaceId: "replay", kind: "REPLAY", contracts: ["phase20.total", "phase20.pagination"] },
  ],
  divergentSurface: "presentation",
  benignDifference: "expected-difference",
  duplicateDefectClass: "aggregate-mismatch",
  flakyDefectClass: "ordering-transient",
  sharedContracts: ["phase20.total", "phase20.pagination", "phase20.browser-api-summary"],
  relationalContracts: ["phase20.total", "phase20.group", "phase20.presence", "phase20.ordering", "phase20.pagination", "phase20.count", "phase20.subset", "phase20.exclusive", "phase20.exactly-one", "phase20.monotonic", "phase20.normalization", "phase20.identity"],
  pagination: { pageSize: 2, conservation: true, monotonicTraversal: true },
  grouping: { supported: true, aggregate: "COUNT" },
  filtering: { supported: true, predicate: "FIELD_PRESENT" },
  totals: { supported: true, relation: "SUM" },
  sourceDrift: { oldSha: "0000000000000000000000000000000000000020", changedSha: "0000000000000000000000000000000000000021", rederivationRequired: true },
  replayAdapters: ["phase20.replay.summary", "phase20.replay.pagination"],
  minimizers: ["phase20.minimize.semantic-subsequence"],
});
