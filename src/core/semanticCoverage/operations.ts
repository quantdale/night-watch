// Phase 21 — deterministic operation-count telemetry. Counts are bounded
// planning/evaluation units, not wall-clock performance claims.

import { sourceEvidenceDigest } from "./types";
import type { DifferentialPairDiscoveryReport } from "./differential";
import type { SemanticLifecycleReport } from "./lifecycle";
import type { SyntheticFixture } from "./mutation";
import type { ContractGraph } from "./types";

export const SEMANTIC_OPERATION_COUNT_VERSION = "nightwatch.semantic-operation-count.v1" as const;

export interface SemanticOperationCounts {
  readonly schemaVersion: typeof SEMANTIC_OPERATION_COUNT_VERSION;
  readonly projectionFeatureDerivations: number;
  readonly membershipComparisons: number;
  readonly graphRebuilds: number;
  readonly pairDiscoveryRows: number;
  readonly replayPreparation: number;
  readonly minimizationReductionProbes: number;
  readonly mutationGeneration: number;
  readonly graphNodeCount: number;
  readonly graphEdgeCount: number;
  readonly deterministicDigest: string;
}

export function countSemanticOperations(input: {
  readonly fixtures: readonly SyntheticFixture[];
  readonly lifecycle: SemanticLifecycleReport;
  readonly differential: DifferentialPairDiscoveryReport;
  readonly graph: ContractGraph;
}): SemanticOperationCounts {
  const core = {
    schemaVersion: SEMANTIC_OPERATION_COUNT_VERSION,
    projectionFeatureDerivations: input.fixtures.filter((fixture) => fixture.observationDigests.length > 0).length,
    membershipComparisons: input.fixtures.filter((fixture) => fixture.capabilityKind === "MEMBERSHIP" && fixture.applicable).length,
    graphRebuilds: 1,
    pairDiscoveryRows: input.differential.candidateCount,
    replayPreparation: input.lifecycle.replayAttempted,
    minimizationReductionProbes: input.lifecycle.rows.reduce((sum, row) => sum + row.dependencyProof.probesAttempted, 0),
    mutationGeneration: input.fixtures.filter((fixture) => fixture.expectedViolation).length,
    graphNodeCount: input.graph.nodeCount,
    graphEdgeCount: input.graph.edgeCount,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}
