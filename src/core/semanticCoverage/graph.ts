// Phase 20 — one deterministic contract lifecycle graph.

import { CONTRACT_GRAPH_VERSION, graphIdentity, safeSemanticDigest, type ContractCandidate, type ContractDiscoveryInventory, type ContractGraph, type ContractGraphEdge, type ContractGraphGap, type ContractGraphNode, type DiscoveryProofStatus, type GraphEdgeReason, type GraphNodeKind } from "./types";

export interface GraphExpectationBinding {
  readonly contractId: string;
  readonly expectationId: string;
  readonly supported: boolean;
}

export interface GraphProjectionBinding {
  readonly contractId: string;
  readonly projectionId: string;
  readonly surfaces: readonly string[];
  readonly supported: boolean;
}

export interface GraphScenarioBinding {
  readonly contractId: string;
  readonly scenarioId: string;
  readonly replaySupported: boolean;
}

export interface GraphOracleBinding {
  readonly contractId: string;
  readonly oracleId: string;
  readonly relational: boolean;
  readonly differential: boolean;
}

export interface GraphReplayBinding {
  readonly contractId: string;
  readonly replayAdapterId: string;
  readonly reproduces: boolean;
}

export interface GraphMinimizerBinding {
  readonly contractId: string;
  readonly minimizerId: string;
  readonly supported: boolean;
}

export interface GraphDossierBinding {
  readonly contractId: string;
  readonly dossierId: string;
  readonly explainable: boolean;
}

export interface GraphDifferentialBinding {
  readonly contractId: string;
  readonly pairId: string;
  readonly eligible: boolean;
}

export interface ContractGraphInput {
  readonly inventory: ContractDiscoveryInventory;
  readonly expectations?: readonly GraphExpectationBinding[];
  readonly projections?: readonly GraphProjectionBinding[];
  readonly scenarios?: readonly GraphScenarioBinding[];
  readonly oracles?: readonly GraphOracleBinding[];
  readonly replays?: readonly GraphReplayBinding[];
  readonly minimizers?: readonly GraphMinimizerBinding[];
  readonly dossiers?: readonly GraphDossierBinding[];
  readonly differentials?: readonly GraphDifferentialBinding[];
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_GRAPH_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${label}_PRIVACY`);
}

function node(kind: GraphNodeKind, safeIdentity: string, status: ContractGraphNode["status"]): ContractGraphNode {
  safeId(safeIdentity, "NODE");
  return { nodeId: safeSemanticDigest({ kind, safeIdentity }, "graph-node"), kind, safeIdentity, status };
}

function edge(from: string, to: string, reason: GraphEdgeReason): ContractGraphEdge {
  return { from, to, reason };
}

function relationNode(kind: GraphNodeKind, identity: string, status: ContractGraphNode["status"]): ContractGraphNode {
  return node(kind, identity, status);
}

function addNode(nodes: Map<string, ContractGraphNode>, candidate: ContractGraphNode): void {
  const prior = nodes.get(candidate.nodeId);
  if (prior !== undefined && JSON.stringify(prior) !== JSON.stringify(candidate)) invalid("NODE_COLLISION");
  nodes.set(candidate.nodeId, candidate);
}

function addEdge(edges: Map<string, ContractGraphEdge>, value: ContractGraphEdge): void {
  const key = `${value.from}|${value.to}|${value.reason}`;
  edges.set(key, value);
}

function statusForCandidate(candidate: ContractCandidate): ContractGraphNode["status"] {
  if (candidate.currentness !== "CURRENT") return "STALE";
  return candidate.proofStatus;
}

function bindRecord<T extends { readonly contractId: string }>(records: readonly T[] | undefined, candidateIds: ReadonlySet<string>, label: string): readonly T[] {
  const result = records ?? [];
  for (const record of result) {
    safeId(record.contractId, "CONTRACT");
    if (!candidateIds.has(record.contractId)) invalid(`${label}_ORPHAN:${record.contractId}`);
  }
  return result;
}

function addBindingNode(nodes: Map<string, ContractGraphNode>, edges: Map<string, ContractGraphEdge>, contractNodeId: string, kind: GraphNodeKind, identity: string, status: ContractGraphNode["status"], reason: GraphEdgeReason): void {
  const bindingNode = relationNode(kind, identity, status);
  addNode(nodes, bindingNode);
  addEdge(edges, edge(contractNodeId, bindingNode.nodeId, reason));
}

/** Build the source-to-dossier graph and classify lifecycle gaps. */
export function buildContractGraph(input: ContractGraphInput): ContractGraph {
  if (input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  const candidates = [...input.inventory.candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
  const expectations = bindRecord(input.expectations, candidateIds, "EXPECTATION");
  const projections = bindRecord(input.projections, candidateIds, "PROJECTION");
  const scenarios = bindRecord(input.scenarios, candidateIds, "SCENARIO");
  const oracles = bindRecord(input.oracles, candidateIds, "ORACLE");
  const replays = bindRecord(input.replays, candidateIds, "REPLAY");
  const minimizers = bindRecord(input.minimizers, candidateIds, "MINIMIZER");
  const dossiers = bindRecord(input.dossiers, candidateIds, "DOSSIER");
  const differentials = bindRecord(input.differentials, candidateIds, "DIFFERENTIAL");
  const nodes = new Map<string, ContractGraphNode>();
  const edges = new Map<string, ContractGraphEdge>();
  const gaps: ContractGraphGap[] = [];
  const expectationIds = new Set(expectations.map((record) => record.expectationId));

  for (const candidate of candidates) {
    const artifactIdentity = `${candidate.source.repoId}:${candidate.source.relativePath}`;
    const artifact = node("SOURCE_ARTIFACT", artifactIdentity, "AVAILABLE");
    const evidence = node("SOURCE_EVIDENCE", candidate.source.evidenceDigest, candidate.currentness === "CURRENT" ? "AVAILABLE" : "STALE");
    const candidateNode = node("CONTRACT_CANDIDATE", candidate.candidateId, statusForCandidate(candidate));
    addNode(nodes, artifact);
    addNode(nodes, evidence);
    addNode(nodes, candidateNode);
    addEdge(edges, edge(artifact.nodeId, evidence.nodeId, "EXTRACTED_FROM"));
    addEdge(edges, edge(evidence.nodeId, candidateNode.nodeId, "EVIDENCE_PROVES"));

    const admitted = candidate.proofStatus !== "REJECTED" && candidate.currentness === "CURRENT" && candidate.coverage.semanticContractAdmitted;
    const projection = projections.filter((record) => record.contractId === candidate.candidateId);
    const expectation = expectations.filter((record) => record.contractId === candidate.candidateId);
    const scenario = scenarios.filter((record) => record.contractId === candidate.candidateId);
    const oracle = oracles.filter((record) => record.contractId === candidate.candidateId);
    const replay = replays.filter((record) => record.contractId === candidate.candidateId);
    const minimizer = minimizers.filter((record) => record.contractId === candidate.candidateId);
    const dossier = dossiers.filter((record) => record.contractId === candidate.candidateId);
    const differential = differentials.filter((record) => record.contractId === candidate.candidateId);

    if (!admitted) {
      gaps.push({ contractId: candidate.candidateId, gap: candidate.currentness === "CURRENT" ? "NOT_ADMITTED" : "STALE_SOURCE", priorityComponent: candidate.impactWeight + 5, reasonCode: candidate.currentness === "CURRENT" ? "MECHANICALLY_PROVABLE_NOT_ADMITTED" : "STALE_SOURCE_REDERIVATION_REQUIRED" });
    } else {
      const admittedNode = node("ADMITTED_CONTRACT", candidate.candidateId, candidate.proofStatus);
      addNode(nodes, admittedNode);
      addEdge(edges, edge(candidateNode.nodeId, admittedNode.nodeId, "ADMITTED_AS"));
      if (expectation.length === 0) gaps.push({ contractId: candidate.candidateId, gap: "NOT_PROJECTABLE", priorityComponent: 6 + candidate.impactWeight, reasonCode: "ADMITTED_CONTRACT_NO_EXPECTATION" });
      for (const record of expectation) {
        safeId(record.expectationId, "EXPECTATION");
        expectationIds.delete(record.expectationId);
        addBindingNode(nodes, edges, admittedNode.nodeId, "EXPECTATION", record.expectationId, record.supported ? "AVAILABLE" : "UNSUPPORTED", "BOUND_TO_EXPECTATION");
      }
      for (const record of projection) addBindingNode(nodes, edges, admittedNode.nodeId, "PROJECTION", record.projectionId, record.supported ? "AVAILABLE" : "UNSUPPORTED", "PROJECTED_BY");
      if (projection.length === 0 || projection.every((record) => !record.supported)) gaps.push({ contractId: candidate.candidateId, gap: "NOT_PROJECTABLE", priorityComponent: 7 + candidate.impactWeight, reasonCode: "PROJECTION_MISSING" });
      for (const record of scenario) addBindingNode(nodes, edges, admittedNode.nodeId, "SCENARIO", record.scenarioId, "AVAILABLE", "EXERCISED_BY");
      if (scenario.length === 0) gaps.push({ contractId: candidate.candidateId, gap: "UNEXERCISED", priorityComponent: 8 + candidate.impactWeight, reasonCode: "SCENARIO_UNBOUND" });
      for (const record of oracle) {
        addBindingNode(nodes, edges, admittedNode.nodeId, "ORACLE", record.oracleId, "AVAILABLE", "EVALUATED_BY");
      }
      if (oracle.length === 0) gaps.push({ contractId: candidate.candidateId, gap: "UNEXERCISED", priorityComponent: 9 + candidate.impactWeight, reasonCode: "ORACLE_MISSING" });
      for (const record of replay) addBindingNode(nodes, edges, admittedNode.nodeId, "REPLAY_ADAPTER", record.replayAdapterId, record.reproduces ? "AVAILABLE" : "MISSING", "REPLAYED_BY");
      if (replay.length === 0 || replay.every((record) => !record.reproduces)) gaps.push({ contractId: candidate.candidateId, gap: "REPLAY_GAP", priorityComponent: 5 + candidate.impactWeight, reasonCode: "REPLAY_UNSUPPORTED" });
      for (const record of minimizer) addBindingNode(nodes, edges, admittedNode.nodeId, "MINIMIZER", record.minimizerId, record.supported ? "AVAILABLE" : "MISSING", "MINIMIZED_BY");
      if (minimizer.length === 0 || minimizer.every((record) => !record.supported)) gaps.push({ contractId: candidate.candidateId, gap: "MINIMIZATION_GAP", priorityComponent: 4 + candidate.impactWeight, reasonCode: "MINIMIZATION_UNSUPPORTED" });
      for (const record of dossier) addBindingNode(nodes, edges, admittedNode.nodeId, "DOSSIER", record.dossierId, record.explainable ? "AVAILABLE" : "MISSING", "EXPLAINED_BY");
      if (dossier.length === 0 || dossier.every((record) => !record.explainable)) gaps.push({ contractId: candidate.candidateId, gap: "NOT_PROJECTABLE", priorityComponent: 3 + candidate.impactWeight, reasonCode: "DOSSIER_EXPLANATION_MISSING" });
      const surfaceCount = projection.reduce((count, record) => count + new Set(record.surfaces).size, 0);
      if (surfaceCount <= 1) gaps.push({ contractId: candidate.candidateId, gap: "SINGLE_SURFACE", priorityComponent: 2 + candidate.impactWeight, reasonCode: "ONLY_ONE_OBSERVATION_SURFACE" });
      else if (differential.length === 0) gaps.push({ contractId: candidate.candidateId, gap: "DIFFERENTIAL_ELIGIBLE", priorityComponent: 10 + candidate.impactWeight, reasonCode: "DIFFERENTIAL_PAIR_AVAILABLE" });
      for (const record of differential) addBindingNode(nodes, edges, admittedNode.nodeId, "ORACLE", record.pairId, record.eligible ? "AVAILABLE" : "UNSUPPORTED", "DIFFERENTIAL_EQUIVALENCE");
      if (candidate.impactWeight >= 4 && scenario.length === 0) gaps.push({ contractId: candidate.candidateId, gap: "HIGH_IMPACT_UNCOVERED", priorityComponent: 12 + candidate.impactWeight, reasonCode: "HIGH_IMPACT_NO_SCENARIO" });
    }
  }

  for (const orphan of [...expectationIds].sort()) gaps.push({ contractId: orphan, gap: "ORPHANED_EXPECTATION", priorityComponent: 11, reasonCode: "EXPECTATION_ORPHANED" });
  const shapeGroups = new Map<string, string[]>();
  for (const candidate of candidates.filter((candidate) => candidate.shape !== null)) {
    const key = JSON.stringify(candidate.shape);
    const values = shapeGroups.get(key) ?? [];
    values.push(candidate.candidateId);
    shapeGroups.set(key, values);
  }
  for (const ids of shapeGroups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids.sort().slice(1)) gaps.push({ contractId: id, gap: "DUPLICATE_COVERAGE", priorityComponent: 1, reasonCode: "DUPLICATE_SEMANTIC_SHAPE" });
  }
  const orderedNodes = [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const orderedEdges = [...edges.values()].sort((left, right) => `${left.from}|${left.to}|${left.reason}`.localeCompare(`${right.from}|${right.to}|${right.reason}`));
  const orderedGaps = [...gaps].sort((left, right) => right.priorityComponent - left.priorityComponent || left.contractId.localeCompare(right.contractId) || left.gap.localeCompare(right.gap));
  const core = { schemaVersion: CONTRACT_GRAPH_VERSION, nodes: orderedNodes, edges: orderedEdges, gaps: orderedGaps, contractCount: candidates.length, nodeCount: orderedNodes.length, edgeCount: orderedEdges.length };
  return { ...core, deterministicDigest: graphIdentity(core) };
}

export function graphGapCounts(graph: ContractGraph): Readonly<Record<ContractGraphGap["gap"], number>> {
  const keys: readonly ContractGraphGap["gap"][] = ["NOT_ADMITTED", "NOT_PROJECTABLE", "UNEXERCISED", "REPLAY_GAP", "MINIMIZATION_GAP", "STALE_SOURCE", "ORPHANED_EXPECTATION", "SINGLE_SURFACE", "DIFFERENTIAL_ELIGIBLE", "HIGH_IMPACT_UNCOVERED", "DUPLICATE_COVERAGE"];
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<ContractGraphGap["gap"], number>;
  for (const gap of graph.gaps) counts[gap.gap] += 1;
  return counts;
}

export interface GraphDuplicateEquivalenceProof {
  readonly primaryContractId: string;
  readonly duplicateContractId: string;
  readonly sourceEvidenceDigest: string;
  readonly mechanicallyProven: boolean;
}

export interface ContractGraphNormalization {
  readonly graph: ContractGraph;
  readonly mergedDuplicateContractIds: readonly string[];
  readonly unresolvedDuplicateContractIds: readonly string[];
  readonly deterministicDigest: string;
}

/** Normalize only duplicates backed by an explicit source-bound join. */
export function normalizeContractGraph(input: {
  readonly graph: ContractGraph;
  readonly inventory: ContractDiscoveryInventory;
  readonly equivalences?: readonly GraphDuplicateEquivalenceProof[];
}): ContractGraphNormalization {
  if (input.graph.schemaVersion !== CONTRACT_GRAPH_VERSION || input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("VERSION");
  const candidates = new Map(input.inventory.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const duplicateIds = new Set(input.graph.gaps.filter((gap) => gap.gap === "DUPLICATE_COVERAGE").map((gap) => gap.contractId));
  const merged = new Set<string>();
  for (const proof of input.equivalences ?? []) {
    safeId(proof.primaryContractId, "PRIMARY");
    safeId(proof.duplicateContractId, "DUPLICATE");
    if (!duplicateIds.has(proof.duplicateContractId) || proof.primaryContractId === proof.duplicateContractId || !proof.mechanicallyProven) invalid("DUPLICATE_PROOF");
    if (!/^(?:ev|contract-candidate):sha256:[0-9a-f]{24}$/.test(proof.sourceEvidenceDigest)) invalid("DUPLICATE_EVIDENCE");
    const primary = candidates.get(proof.primaryContractId);
    const duplicate = candidates.get(proof.duplicateContractId);
    if (primary === undefined || duplicate === undefined || JSON.stringify(primary.shape) !== JSON.stringify(duplicate.shape) || (proof.sourceEvidenceDigest !== primary.source.evidenceDigest && proof.sourceEvidenceDigest !== duplicate.source.evidenceDigest)) invalid("DUPLICATE_SHAPE_MISMATCH");
    merged.add(proof.duplicateContractId);
  }
  const gaps = input.graph.gaps.filter((gap) => !(gap.gap === "DUPLICATE_COVERAGE" && merged.has(gap.contractId)));
  const core = { schemaVersion: input.graph.schemaVersion, nodes: input.graph.nodes, edges: input.graph.edges, gaps, contractCount: input.graph.contractCount, nodeCount: input.graph.nodeCount, edgeCount: input.graph.edgeCount };
  const graph = { ...core, deterministicDigest: graphIdentity(core) };
  const resultCore = { graph, mergedDuplicateContractIds: [...merged].sort(), unresolvedDuplicateContractIds: [...duplicateIds].filter((id) => !merged.has(id)).sort() };
  return { ...resultCore, deterministicDigest: safeSemanticDigest(resultCore, "graph-normalization") };
}
