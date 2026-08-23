// Phase 20 — deterministic candidate inventory and explicit admission.

import { candidateIdentity, CONTRACT_DISCOVERY_VERSION, safeSemanticDigest, type ContractCandidate, type ContractCoverageProjection, type ContractCurrentness, type ContractDiscoveryInventory, type DiscoveryRejectionCode, type DiscoveryProofStatus, type SourceArtifactInput, type SafeSourceProvenance } from "./types";
import { analyzerSetIdentity, analyzeSourceArtifact, type AnalyzerObservation, type SourceAnalyzerArtifact } from "./sourceAnalyzers";

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const REJECTION_CODES: readonly DiscoveryRejectionCode[] = [
  "SOURCE_UNAVAILABLE", "SOURCE_STALE", "SOURCE_PATH_INVALID", "SOURCE_TOO_LARGE", "PRIVACY_UNSAFE_SOURCE",
  "UNSUPPORTED_LANGUAGE", "UNSUPPORTED_SYNTAX", "DYNAMIC_KEY_FLOW", "RUNTIME_VALUE_UNPROVEN",
  "BRANCH_SET_INCOMPLETE", "FIELD_NAME_UNSAFE", "MALFORMED_STATIC_SCHEMA", "RELATION_PROOF_MISSING",
  "SURFACE_NOT_APPROVED", "DUPLICATE_CONTRACT", "CONTRACT_DRIFT", "INTERNAL_ANALYZER_ERROR",
];

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_DISCOVERY_INVALID:${reason}`);
}

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function sourceProvenance(artifact: SourceArtifactInput, observation: AnalyzerObservation): SafeSourceProvenance {
  return {
    repoId: artifact.repoId,
    sha: artifact.sha,
    relativePath: artifact.relativePath,
    symbol: observation.symbol,
    derivationVersion: `${observation.analyzerVersion}/${observation.analyzerId}`,
    evidenceDigest: observation.evidenceDigest,
  };
}

function currentnessFor(artifact: SourceArtifactInput, currentSnapshots: Readonly<Record<string, string>> | undefined): ContractCurrentness {
  if (currentSnapshots === undefined || currentSnapshots[artifact.repoId] === undefined) return "SOURCE_UNAVAILABLE";
  return currentSnapshots[artifact.repoId] === artifact.sha ? "CURRENT" : "STALE_SOURCE";
}

function defaultCoverage(observation: AnalyzerObservation, currentness: ContractCurrentness): ContractCoverageProjection {
  const usable = observation.status === "MECHANICALLY_PROVABLE" && currentness === "CURRENT";
  return {
    sourceSurfaceExists: true,
    sourceMechanicallyUnderstood: observation.status === "MECHANICALLY_PROVABLE",
    semanticContractAdmitted: false,
    syntheticDetectionProven: false,
    scenarioExercisesContract: false,
    replayAvailable: false,
    replayReproduces: false,
    minimizationSupported: false,
    triageClassifiable: usable,
    dossierExplainable: usable,
  };
}

function candidateFrom(artifact: SourceAnalyzerArtifact, observation: AnalyzerObservation, currentness: ContractCurrentness): ContractCandidate {
  const source = sourceProvenance(artifact, observation);
  const proofStatus: DiscoveryProofStatus = observation.status === "MECHANICALLY_PROVABLE" && currentness === "CURRENT" ? "MECHANICALLY_PROVABLE" : observation.status === "MECHANICALLY_PROVABLE" ? "DISCOVERED" : "REJECTED";
  const core = {
    artifactId: artifact.artifactId,
    source,
    analyzerId: observation.analyzerId,
    analyzerVersion: observation.analyzerVersion,
    behaviorClass: observation.behaviorClass,
    shape: observation.shape,
    proofStatus,
    rejectionCode: observation.rejectionCode,
    rejectionDetail: observation.rejectionDetail,
    currentness,
    observationSurfaces: observation.observationSurfaces,
  };
  const candidateId = candidateIdentity(core);
  return {
    candidateId,
    ...core,
    coverage: defaultCoverage(observation, currentness),
    impactWeight: observation.status === "MECHANICALLY_PROVABLE" ? 3 : 0,
    deterministicDigest: safeSemanticDigest({ candidateId, ...core }, "candidate-record"),
  };
}

function sortCandidates(candidates: readonly ContractCandidate[]): ContractCandidate[] {
  return [...candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId) || left.analyzerId.localeCompare(right.analyzerId));
}

function buildInventory(candidates: readonly ContractCandidate[], sourceArtifactCount: number): ContractDiscoveryInventory {
  const ordered = sortCandidates(candidates);
  const rejectionCounts = Object.fromEntries(REJECTION_CODES.map((code) => [code, 0])) as Record<DiscoveryRejectionCode, number>;
  for (const candidate of ordered) {
    if (candidate.rejectionCode !== null) rejectionCounts[candidate.rejectionCode] = (rejectionCounts[candidate.rejectionCode] ?? 0) + 1;
  }
  const admittedCandidateIds = ordered.filter((candidate) => candidate.proofStatus === "ADMITTED" || candidate.proofStatus === "PROJECTABLE" || candidate.proofStatus === "SYNTHETICALLY_VERIFIED" || candidate.proofStatus === "SCENARIO_BOUND" || candidate.proofStatus === "REPLAY_SUPPORTED" || candidate.proofStatus === "MINIMIZATION_SUPPORTED" || candidate.proofStatus === "FULLY_COVERED").map((candidate) => candidate.candidateId);
  const mechanicallyProvableCount = ordered.filter((candidate) => candidate.proofStatus !== "REJECTED" && candidate.currentness === "CURRENT").length;
  const projectableCount = ordered.filter((candidate) => candidate.coverage.semanticContractAdmitted && candidate.coverage.sourceMechanicallyUnderstood).length;
  const core = {
    schemaVersion: CONTRACT_DISCOVERY_VERSION,
    analyzerSetVersion: analyzerSetIdentity(),
    candidates: ordered,
    admittedCandidateIds,
    rejectedCandidateIds: ordered.filter((candidate) => candidate.proofStatus === "REJECTED").map((candidate) => candidate.candidateId),
    rejectionCounts,
    sourceArtifactCount,
    mechanicallyProvableCount,
    admittedCount: admittedCandidateIds.length,
    projectableCount,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "discovery-inventory") };
}

/** Discover candidate contracts without granting semantic authority. */
export function discoverContractInventory(input: {
  readonly artifacts: readonly SourceAnalyzerArtifact[];
  readonly currentSnapshots?: Readonly<Record<string, string>>;
}): ContractDiscoveryInventory {
  if (!Array.isArray(input.artifacts) || input.artifacts.length > 128) invalid("ARTIFACT_COUNT");
  const candidates: ContractCandidate[] = [];
  const seenArtifacts = new Set<string>();
  for (const artifact of input.artifacts) {
    if (seenArtifacts.has(artifact.artifactId)) invalid("DUPLICATE_ARTIFACT");
    seenArtifacts.add(artifact.artifactId);
    const observations = analyzeSourceArtifact(artifact);
    const currentness = currentnessFor(artifact, input.currentSnapshots);
    for (const observation of observations) candidates.push(candidateFrom(artifact, observation, currentness));
  }
  if (candidates.length > 2048) invalid("CANDIDATE_COUNT");
  const unique = new Map<string, ContractCandidate>();
  for (const candidate of candidates) {
    if (!unique.has(candidate.candidateId)) unique.set(candidate.candidateId, candidate);
  }
  return buildInventory([...unique.values()], input.artifacts.length);
}

function admittedCandidate(candidate: ContractCandidate, projectableBehaviorClasses: readonly string[]): ContractCandidate {
  if (candidate.proofStatus !== "MECHANICALLY_PROVABLE" || candidate.currentness !== "CURRENT" || candidate.shape === null || candidate.behaviorClass === null) return candidate;
  const projectable = projectableBehaviorClasses.includes(candidate.behaviorClass);
  const proofStatus: DiscoveryProofStatus = projectable ? "PROJECTABLE" : "ADMITTED";
  return {
    ...candidate,
    proofStatus,
    coverage: { ...candidate.coverage, semanticContractAdmitted: true },
    deterministicDigest: safeSemanticDigest({ ...candidate, proofStatus, coverage: { ...candidate.coverage, semanticContractAdmitted: true } }, "candidate-record"),
  };
}

/** Admit only current, mechanically proven candidates; stale/rejected records remain visible. */
export function admitContractInventory(input: ContractDiscoveryInventory, options: { readonly projectableBehaviorClasses?: readonly string[] } = {}): ContractDiscoveryInventory {
  if (input.schemaVersion !== CONTRACT_DISCOVERY_VERSION) invalid("VERSION");
  const projectable = options.projectableBehaviorClasses ?? ["REQUIRED_FIELD", "OPTIONAL_FIELD", "FINITE_ENUM", "FIELD_TYPE", "RANGE_BOUND", "DEFAULT_VALUE", "NORMALIZATION", "SORT_ORDER", "FILTERING", "AGGREGATION", "PAGINATION", "FIELD_PRESENCE_RELATION", "MAPPING"];
  const candidates = input.candidates.map((candidate) => admittedCandidate(candidate, projectable));
  return buildInventory(candidates, input.sourceArtifactCount);
}

/** Bind later synthetic/replay stages without changing source proof. */
export function updateCandidateCoverage(input: ContractDiscoveryInventory, updates: Readonly<Record<string, Partial<ContractCoverageProjection>>>): ContractDiscoveryInventory {
  const candidates = input.candidates.map((candidate) => {
    const update = updates[candidate.candidateId];
    if (update === undefined) return candidate;
    const coverage = { ...candidate.coverage, ...update };
    const proofStatus: DiscoveryProofStatus = coverage.dossierExplainable && coverage.minimizationSupported && coverage.replayAvailable && coverage.scenarioExercisesContract && coverage.semanticContractAdmitted
      ? "FULLY_COVERED"
      : coverage.minimizationSupported && coverage.replayAvailable && coverage.semanticContractAdmitted
        ? "MINIMIZATION_SUPPORTED"
        : coverage.replayAvailable && coverage.semanticContractAdmitted
          ? "REPLAY_SUPPORTED"
          : coverage.scenarioExercisesContract && coverage.semanticContractAdmitted
            ? "SCENARIO_BOUND"
            : coverage.syntheticDetectionProven && coverage.semanticContractAdmitted
              ? "SYNTHETICALLY_VERIFIED"
              : candidate.proofStatus;
    return { ...candidate, proofStatus, coverage, deterministicDigest: safeSemanticDigest({ ...candidate, proofStatus, coverage }, "candidate-record") };
  });
  return buildInventory(candidates, input.sourceArtifactCount);
}

/** Compare exact source/evidence identities without silently rebinding. */
export function classifyContractDrift(input: {
  readonly prior: ContractCandidate | null;
  readonly current: ContractCandidate | null;
  readonly sourceAvailable?: boolean;
}): import("./types").ContractDriftResult {
  if (input.current === null) return { candidateId: input.prior?.candidateId ?? "contract-unknown", currentness: input.sourceAvailable === false ? "SOURCE_UNAVAILABLE" : "CONTRACT_REMOVED", affected: true, reasonCode: input.sourceAvailable === false ? "SOURCE_UNAVAILABLE" : "CONTRACT_MISSING", priorEvidenceDigest: input.prior?.source.evidenceDigest ?? null, currentEvidenceDigest: null };
  if (input.prior === null) return { candidateId: input.current.candidateId, currentness: "CONTRACT_EXPANDED", affected: true, reasonCode: "SOURCE_SHA_CHANGED", priorEvidenceDigest: null, currentEvidenceDigest: input.current.source.evidenceDigest };
  const shaChanged = input.prior.source.sha !== input.current.source.sha;
  const evidenceChanged = input.prior.source.evidenceDigest !== input.current.source.evidenceDigest;
  if (!shaChanged && !evidenceChanged) return { candidateId: input.current.candidateId, currentness: "CURRENT", affected: false, reasonCode: "EVIDENCE_UNCHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
  if (shaChanged && !evidenceChanged) return { candidateId: input.current.candidateId, currentness: "EVIDENCE_CHANGED_SEMANTICS_UNCHANGED", affected: false, reasonCode: "EVIDENCE_UNCHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
  const priorShape = JSON.stringify(input.prior.shape);
  const currentShape = JSON.stringify(input.current.shape);
  const currentness: import("./types").ContractCurrentness = priorShape === currentShape ? "SEMANTIC_REDERIVATION_REQUIRED" : currentShape.length > priorShape.length ? "CONTRACT_EXPANDED" : "CONTRACT_NARROWED";
  return { candidateId: input.current.candidateId, currentness, affected: true, reasonCode: "EVIDENCE_CHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
}
