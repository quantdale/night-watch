// Phase 21 — bounded semantic replay and dependency-aware minimization.
//
// This adapter composes the existing campaign-intelligence replay V4 and
// minimization V2 primitives. It accepts only sanitized fixture metadata and
// emits categories, identities, counts, and digests. It never receives or
// stores a raw observation value.

import {
  createReplayFidelityV4,
  type ReplayFidelityV4,
  type ReplayFidelityV4Outcome,
} from "../campaignIntelligence/replayV4";
import {
  minimizeSequenceV2,
  type MinimizationV2Result,
  type ReductionAction,
  type ReductionDependencyEdge,
} from "../campaignIntelligence/minimizationV2";
import { safeCampaignDigest, type CampaignSourceCurrentness } from "../campaignIntelligence/types";
import { sourceEvidenceDigest } from "./types";
import type { SurfaceEquivalenceContract } from "./differential";
import type { SyntheticFixture, SyntheticLifecycleEvidenceRow, SyntheticMutationMeasurement } from "./mutation";

export const SEMANTIC_LIFECYCLE_VERSION = "nightwatch.semantic-lifecycle.v1" as const;

export type SemanticReplayEquivalence =
  | "REPRODUCED_EXACT"
  | "REPRODUCED_SEMANTIC_EQUIVALENT"
  | "REPRESENTATION_CHANGED_CONTRACT_PRESERVED"
  | "PRECONDITION_DIVERGENCE"
  | "OBSERVATION_DIVERGENCE"
  | "SOURCE_STALE"
  | "CONTRACT_CHANGED"
  | "NONDETERMINISTIC"
  | "NOT_REPRODUCED"
  | "INVALID";

export interface SemanticReplayReceipt {
  readonly schemaVersion: typeof SEMANTIC_LIFECYCLE_VERSION;
  readonly fixtureId: string;
  readonly contractId: string;
  readonly outcome: SemanticReplayEquivalence;
  readonly v4Outcome: ReplayFidelityV4Outcome;
  readonly occurrenceBinding: "BOUND" | "AMBIGUOUS" | "INVALID";
  readonly observationEqual: boolean | null;
  readonly contractIdentityPreserved: boolean;
  readonly deterministic: boolean;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly deterministicDigest: string;
}

export interface SemanticDependencyProof {
  readonly dependencyEdges: readonly ReductionDependencyEdge[];
  readonly requiredOrdinals: readonly number[];
  readonly retainedOrdinals: readonly number[];
  readonly proof: MinimizationV2Result["proof"];
  readonly probesAttempted: number;
  readonly preservedFinding: boolean;
  readonly deterministicDigest: string;
}

export interface SemanticLifecycleRow extends SyntheticLifecycleEvidenceRow {
  readonly fixtureId: string;
  readonly contractId: string;
  readonly replayReceipt: SemanticReplayReceipt;
  readonly dependencyProof: SemanticDependencyProof;
}

export interface SemanticLifecycleReport {
  readonly schemaVersion: typeof SEMANTIC_LIFECYCLE_VERSION;
  readonly rows: readonly SemanticLifecycleRow[];
  readonly replayAttempted: number;
  readonly replayReproducedExact: number;
  readonly replayReproducedSemanticEquivalent: number;
  readonly replayRepresentationChangedContractPreserved: number;
  readonly replayPreconditionDivergence: number;
  readonly replayObservationDivergence: number;
  readonly replayNotReproduced: number;
  readonly replayInvalid: number;
  readonly replayNondeterministic: number;
  readonly replayGapCount: number;
  readonly minimizationAttempted: number;
  readonly minimizationSupported: number;
  readonly minimizationProofCounts: Readonly<Record<MinimizationV2Result["proof"], number>>;
  readonly dependencyEdgeCount: number;
  readonly highConfidenceCount: number;
  readonly deterministicDigest: string;
}

const SAFE_FIXTURE_RE = /^ev:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_LIFECYCLE_INVALID:${reason}`);
}

function safeFixtureId(value: string, field: string): void {
  if (!SAFE_FIXTURE_RE.test(value)) invalid(`${field}_ID`);
}

function normalizeOutcome(input: { readonly v4: ReplayFidelityV4; readonly contractIdentityPreserved: boolean }): SemanticReplayEquivalence {
  switch (input.v4.outcome) {
    case "REPRODUCED_EXACT": return "REPRODUCED_EXACT";
    case "REPRODUCED_SEMANTIC_EQUIVALENT": return input.v4.observationEqual === false && input.contractIdentityPreserved ? "REPRESENTATION_CHANGED_CONTRACT_PRESERVED" : "REPRODUCED_SEMANTIC_EQUIVALENT";
    case "PRECONDITION_DIVERGENCE": return "PRECONDITION_DIVERGENCE";
    case "SOURCE_STALE": return "SOURCE_STALE";
    case "NONDETERMINISTIC": return "NONDETERMINISTIC";
    case "GENUINELY_NOT_REPRODUCED": return "NOT_REPRODUCED";
    case "SEMANTIC_DIVERGENCE": return input.contractIdentityPreserved ? "OBSERVATION_DIVERGENCE" : "CONTRACT_CHANGED";
    case "INVALID_REPLAY_PLAN":
    case "EXECUTOR_FAILURE":
    case "ENVIRONMENT_DIVERGENCE":
    case "ORDERING_DIVERGENCE":
    case "TIMING_SENSITIVE":
    case "NO_LONGER_APPLICABLE": return "INVALID";
  }
}

function findingFingerprint(fixture: SyntheticFixture): string {
  return safeCampaignDigest({ fixtureId: fixture.fixtureId, contractId: fixture.contractId, mutationClass: fixture.mutationClass }, "fp");
}

function contractIdentity(contractId: string): string {
  return safeCampaignDigest({ contractId }, "sci");
}

function observationDigest(fixture: SyntheticFixture, representation: string): string {
  return safeCampaignDigest({ observationDigests: fixture.observationDigests, representation }, "obs");
}

function replayDigest(prefix: "occ" | "dep" | "env" | "sem", value: unknown): string {
  return safeCampaignDigest(value, prefix);
}

/** Classify one bounded replay, retaining the existing V4 precedence rules. */
export function replaySyntheticSemanticFinding(input: {
  readonly fixture: SyntheticFixture;
  readonly sourceCurrentness?: CampaignSourceCurrentness;
  readonly representationChanged?: boolean;
  readonly contractChanged?: boolean;
  readonly preconditionSatisfied?: boolean;
  readonly occurrenceBinding?: "BOUND" | "AMBIGUOUS" | "INVALID";
  readonly nondeterministic?: boolean;
}): SemanticReplayReceipt {
  safeFixtureId(input.fixture.fixtureId, "FIXTURE");
  const sourceCurrentness = input.sourceCurrentness ?? "CURRENT";
  const representationChanged = input.representationChanged ?? false;
  const contractChanged = input.contractChanged ?? false;
  const expectedFingerprint = findingFingerprint(input.fixture);
  const expectedContract = contractIdentity(input.fixture.contractId);
  const observedFingerprint = contractChanged
    ? safeCampaignDigest({ fixtureId: input.fixture.fixtureId, changed: true }, "fp")
    : representationChanged
      ? safeCampaignDigest({ fixtureId: input.fixture.fixtureId, equivalent: true }, "fp")
      : expectedFingerprint;
  const observedContract = contractChanged ? safeCampaignDigest({ contractId: `${input.fixture.contractId}.changed` }, "sci") : expectedContract;
  const observedObservation = representationChanged ? observationDigest(input.fixture, "semantic-equivalent") : observationDigest(input.fixture, "exact");
  const v4 = createReplayFidelityV4({
    expectedSemanticFindingFingerprint: expectedFingerprint,
    expectedContractIdentity: expectedContract,
    observedSemanticFindingFingerprint: observedFingerprint,
    observedContractIdentity: observedContract,
    expectedObservationDigest: observationDigest(input.fixture, "exact"),
    observedObservationDigest: observedObservation,
    originalOccurrenceDigest: replayDigest("occ", { fixtureId: input.fixture.fixtureId, occurrence: "original" }),
    retainedOccurrenceDigest: replayDigest("occ", { fixtureId: input.fixture.fixtureId, occurrence: "retained" }),
    originalOccurrenceCount: 4,
    retainedOccurrenceCount: 3,
    occurrenceBinding: input.occurrenceBinding ?? "BOUND",
    orderingPreserved: true,
    dependencyStateDigest: replayDigest("dep", { fixtureId: input.fixture.fixtureId, preconditionSatisfied: input.preconditionSatisfied ?? true }),
    environmentInputDigest: replayDigest("env", { fixtureId: input.fixture.fixtureId, environment: "LOCAL_SYNTHETIC" }),
    semanticStateDigest: replayDigest("sem", { fixtureId: input.fixture.fixtureId, contractId: input.fixture.contractId }),
    sourceCurrentness,
    terminalStatus: "FAILURE",
    preconditionSatisfied: input.preconditionSatisfied ?? true,
    environmentDiverged: false,
    noLongerApplicable: false,
    timingSensitive: false,
    executorFailed: false,
    executorNondeterministic: input.nondeterministic ?? false,
    safetyClean: true,
    repeatedOutcomeClasses: input.nondeterministic ? ["FAILURE", "PASS"] : ["FAILURE"],
  });
  const contractIdentityPreserved = observedContract === expectedContract;
  const core = {
    schemaVersion: SEMANTIC_LIFECYCLE_VERSION,
    fixtureId: input.fixture.fixtureId,
    contractId: input.fixture.contractId,
    outcome: normalizeOutcome({ v4, contractIdentityPreserved }),
    v4Outcome: v4.outcome,
    occurrenceBinding: v4.baseV3Receipt.occurrenceBinding,
    observationEqual: v4.observationEqual,
    contractIdentityPreserved,
    deterministic: v4.deterministic,
    sourceCurrentness,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function actionsForFixture(fixture: SyntheticFixture): { readonly actions: readonly ReductionAction[]; readonly dependencies: readonly ReductionDependencyEdge[]; readonly requiredOrdinals: readonly number[] } {
  const prefix = fixture.fixtureId.replace(/[^A-Za-z0-9_.:/-]/g, "_");
  const actions: readonly ReductionAction[] = [
    { actionId: `phase21.${prefix}.precondition`, ordinal: 0, dependencyKey: `${prefix}.precondition` },
    { actionId: `phase21.${prefix}.observation`, ordinal: 1, dependencyKey: `${prefix}.observation` },
    { actionId: `phase21.${prefix}.finding`, ordinal: 2, dependencyKey: `${prefix}.finding` },
    { actionId: `phase21.${prefix}.noise`, ordinal: 3, dependencyKey: null },
  ];
  const dependencies: readonly ReductionDependencyEdge[] = fixture.capabilityKind === "DIFFERENTIAL"
    ? [{ prerequisiteOrdinal: 0, dependentOrdinal: 2 }, { prerequisiteOrdinal: 1, dependentOrdinal: 2 }]
    : [{ prerequisiteOrdinal: 0, dependentOrdinal: 1 }, { prerequisiteOrdinal: 1, dependentOrdinal: 2 }];
  return { actions, dependencies, requiredOrdinals: [0, 1, 2] };
}

function minimizeSyntheticSemanticFinding(fixture: SyntheticFixture): { readonly result: MinimizationV2Result; readonly proof: SemanticDependencyProof } {
  const setup = actionsForFixture(fixture);
  const result = minimizeSequenceV2({
    original: setup.actions,
    dependencies: setup.dependencies,
    maxProbes: 64,
    semanticIdentityBound: true,
    probe: (sequence) => {
      const retained = new Set(sequence.map((action) => action.ordinal));
      const preservesFinding = setup.requiredOrdinals.every((ordinal) => retained.has(ordinal));
      return { valid: true, preservesFinding, outcome: preservesFinding ? "REPRODUCES" : "DOES_NOT_REPRODUCE", reason: preservesFinding ? "SAME_SEMANTIC_FINDING" : "FINDING_IDENTITY_LOST" };
    },
  });
  const proofCore = { dependencyEdges: result.dependencyEdges, requiredOrdinals: setup.requiredOrdinals, retainedOrdinals: result.minimalOrdinals, proof: result.proof, probesAttempted: result.probesAttempted, preservedFinding: result.originalReproduced };
  return { result, proof: { ...proofCore, deterministicDigest: sourceEvidenceDigest(proofCore) } };
}

/** Build actual lifecycle evidence for every applicable detected synthetic mutant. */
export function buildSemanticLifecycleReport(input: {
  readonly fixtures: readonly SyntheticFixture[];
  readonly measurement: SyntheticMutationMeasurement;
  readonly differentialContracts?: readonly SurfaceEquivalenceContract[];
}): SemanticLifecycleReport {
  const differentialIds = new Set((input.differentialContracts ?? []).filter((contract) => contract.alignmentRule !== undefined).map((contract) => contract.equivalenceId));
  const measurementByFixture = new Map(input.measurement.rows.map((row) => [row.fixtureId, row]));
  const rows: SemanticLifecycleRow[] = [];
  for (const fixture of [...input.fixtures].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId))) {
    const measured = measurementByFixture.get(fixture.fixtureId);
    if (measured?.expectedViolation !== true || measured.applicable !== true || measured.detected !== true) continue;
    const replayReceipt = replaySyntheticSemanticFinding({ fixture, representationChanged: differentialIds.has(fixture.contractId) });
    const minimized = minimizeSyntheticSemanticFinding(fixture);
    const replayed = ["REPRODUCED_EXACT", "REPRESENTATION_CHANGED_CONTRACT_PRESERVED", "REPRODUCED_SEMANTIC_EQUIVALENT"].includes(replayReceipt.outcome);
    const minimizedValue = minimized.result.originalReproduced && minimized.result.proof !== "NOT_PROVEN_MINIMAL";
    const highConfidence = replayed && minimizedValue && replayReceipt.deterministic && replayReceipt.occurrenceBinding === "BOUND";
    rows.push({
      fixtureId: fixture.fixtureId,
      contractId: fixture.contractId,
      replayed,
      minimized: minimizedValue,
      highConfidence,
      replayOutcome: replayReceipt.outcome,
      minimizationProof: minimized.result.proof,
      replayReceipt,
      dependencyProof: minimized.proof,
    });
  }
  const count = (outcome: SemanticReplayEquivalence) => rows.filter((row) => row.replayOutcome === outcome).length;
  const proofValues: readonly MinimizationV2Result["proof"][] = ["ONE_STEP_LOCAL_MINIMUM", "CHUNK_AND_STEP_FIXED_POINT", "SEMANTIC_FIXED_POINT", "NOT_PROVEN_MINIMAL"];
  const minimizationProofCounts = Object.fromEntries(proofValues.map((proof) => [proof, rows.filter((row) => row.minimizationProof === proof).length])) as Record<MinimizationV2Result["proof"], number>;
  const core = {
    schemaVersion: SEMANTIC_LIFECYCLE_VERSION,
    rows,
    replayAttempted: rows.length,
    replayReproducedExact: count("REPRODUCED_EXACT"),
    replayReproducedSemanticEquivalent: count("REPRODUCED_SEMANTIC_EQUIVALENT"),
    replayRepresentationChangedContractPreserved: count("REPRESENTATION_CHANGED_CONTRACT_PRESERVED"),
    replayPreconditionDivergence: count("PRECONDITION_DIVERGENCE"),
    replayObservationDivergence: count("OBSERVATION_DIVERGENCE"),
    replayNotReproduced: count("NOT_REPRODUCED"),
    replayInvalid: count("INVALID"),
    replayNondeterministic: count("NONDETERMINISTIC"),
    replayGapCount: rows.filter((row) => !row.replayed).length,
    minimizationAttempted: rows.length,
    minimizationSupported: rows.filter((row) => row.minimized).length,
    minimizationProofCounts,
    dependencyEdgeCount: rows.reduce((sum, row) => sum + row.dependencyProof.dependencyEdges.length, 0),
    highConfidenceCount: rows.filter((row) => row.highConfidence).length,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

export function lifecycleEvidenceRows(report: SemanticLifecycleReport): readonly SyntheticLifecycleEvidenceRow[] {
  return report.rows.map(({ fixtureId, replayed, minimized, highConfidence, replayOutcome, minimizationProof }) => ({ fixtureId, replayed, minimized, highConfidence, replayOutcome, minimizationProof }));
}
