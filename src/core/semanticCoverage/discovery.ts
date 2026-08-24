// Phase 20 — deterministic candidate inventory and explicit admission.

import { candidateIdentity, CONTRACT_DISCOVERY_VERSION, safeSemanticDigest, type ContractCandidate, type ContractCoverageProjection, type ContractCurrentness, type ContractDiscoveryInventory, type ContractShapeDrift, type DiscoveryRejectionCode, type DiscoveryProofStatus, type DiscoveredContractShape, type SourceArtifactInput, type SafeSourceProvenance } from "./types";
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

type SetRelation = "UNCHANGED" | "EXPANDED" | "NARROWED" | "INCOMPATIBLE_CHANGE";

function setRelation(prior: readonly string[], current: readonly string[]): SetRelation {
  const priorSet = new Set(prior);
  const currentSet = new Set(current);
  const same = priorSet.size === currentSet.size && [...priorSet].every((value) => currentSet.has(value));
  if (same) return "UNCHANGED";
  const currentContainsPrior = [...priorSet].every((value) => currentSet.has(value));
  const priorContainsCurrent = [...currentSet].every((value) => priorSet.has(value));
  if (currentContainsPrior && !priorContainsCurrent) return "EXPANDED";
  if (priorContainsCurrent && !currentContainsPrior) return "NARROWED";
  return "INCOMPATIBLE_CHANGE";
}

function combineRelations(relations: readonly SetRelation[]): ContractShapeDrift {
  const nonUnchanged = relations.filter((relation) => relation !== "UNCHANGED");
  if (nonUnchanged.length === 0) return "UNCHANGED";
  if (nonUnchanged.some((relation) => relation === "INCOMPATIBLE_CHANGE")) return "INCOMPATIBLE_CHANGE";
  const hasExpanded = nonUnchanged.some((relation) => relation === "EXPANDED");
  const hasNarrowed = nonUnchanged.some((relation) => relation === "NARROWED");
  if (hasExpanded && hasNarrowed) return "INCOMPATIBLE_CHANGE";
  return hasExpanded ? "EXPANDED" : "NARROWED";
}

function samePath(left: readonly string[] | null, right: readonly string[] | null): boolean {
  return left !== null && right !== null && left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameNullablePath(left: readonly string[] | null, right: readonly string[] | null): boolean {
  if (left === null || right === null) return left === right;
  return samePath(left, right);
}

function intervalContains(container: { readonly lowerBound: number | null; readonly upperBound: number | null; readonly lowerInclusive: boolean; readonly upperInclusive: boolean }, contained: { readonly lowerBound: number | null; readonly upperBound: number | null; readonly lowerInclusive: boolean; readonly upperInclusive: boolean }): boolean {
  const lowerContains = container.lowerBound === null
    || (contained.lowerBound !== null && (container.lowerBound < contained.lowerBound || (container.lowerBound === contained.lowerBound && (!contained.lowerInclusive || container.lowerInclusive))));
  const upperContains = container.upperBound === null
    || (contained.upperBound !== null && (container.upperBound > contained.upperBound || (container.upperBound === contained.upperBound && (!contained.upperInclusive || container.upperInclusive))));
  return lowerContains && upperContains;
}

function compareRange(prior: Extract<DiscoveredContractShape, { readonly kind: "RANGE" }>, current: Extract<DiscoveredContractShape, { readonly kind: "RANGE" }>): ContractShapeDrift {
  const same = prior.field === current.field
    && prior.lowerBound === current.lowerBound
    && prior.upperBound === current.upperBound
    && prior.lowerInclusive === current.lowerInclusive
    && prior.upperInclusive === current.upperInclusive;
  if (same) return "UNCHANGED";
  if (intervalContains(current, prior)) return "EXPANDED";
  if (intervalContains(prior, current)) return "NARROWED";
  return "INCOMPATIBLE_CHANGE";
}

function compareFieldSet(prior: Extract<DiscoveredContractShape, { readonly kind: "FIELD_SET" }>, current: Extract<DiscoveredContractShape, { readonly kind: "FIELD_SET" }>): ContractShapeDrift {
  return combineRelations([
    setRelation(prior.fields, current.fields),
    setRelation(prior.requiredFields, current.requiredFields),
    setRelation(prior.optionalFields, current.optionalFields),
  ]);
}

function compareType(prior: Extract<DiscoveredContractShape, { readonly kind: "FIELD_TYPE" }>, current: Extract<DiscoveredContractShape, { readonly kind: "FIELD_TYPE" }>): ContractShapeDrift {
  if (prior.field !== current.field) return "INCOMPATIBLE_CHANGE";
  return setRelation(prior.allowedTypes, current.allowedTypes);
}

function compareEnum(prior: Extract<DiscoveredContractShape, { readonly kind: "FINITE_ENUM" }>, current: Extract<DiscoveredContractShape, { readonly kind: "FINITE_ENUM" }>): ContractShapeDrift {
  if (prior.field !== current.field) return "INCOMPATIBLE_CHANGE";
  if (prior.valueCount === current.valueCount && prior.valueSetDigest === current.valueSetDigest) return "UNCHANGED";
  if (current.valueCount > prior.valueCount) return "EXPANDED";
  if (current.valueCount < prior.valueCount) return "NARROWED";
  return "INCOMPATIBLE_CHANGE";
}

function compareShapeSameOrIncompatible(prior: DiscoveredContractShape, current: DiscoveredContractShape): ContractShapeDrift {
  switch (prior.kind) {
    case "FIELD_SET": return compareFieldSet(prior, current as Extract<DiscoveredContractShape, { readonly kind: "FIELD_SET" }>);
    case "FIELD_TYPE": return compareType(prior, current as Extract<DiscoveredContractShape, { readonly kind: "FIELD_TYPE" }>);
    case "FINITE_ENUM": return compareEnum(prior, current as Extract<DiscoveredContractShape, { readonly kind: "FINITE_ENUM" }>);
    case "RANGE": return compareRange(prior, current as Extract<DiscoveredContractShape, { readonly kind: "RANGE" }>);
    case "DEFAULT": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "DEFAULT" }>;
      return prior.field === candidate.field && prior.defaultType === candidate.defaultType ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "NORMALIZATION": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "NORMALIZATION" }>;
      return prior.field === candidate.field ? setRelation(prior.operations, candidate.operations) : "INCOMPATIBLE_CHANGE";
    }
    case "SORT_ORDER": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "SORT_ORDER" }>;
      return samePath(prior.collectionPath, candidate.collectionPath) && samePath(prior.itemField, candidate.itemField) && prior.direction === candidate.direction ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "FILTERING": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "FILTERING" }>;
      return samePath(prior.collectionPath, candidate.collectionPath) && prior.predicateClass === candidate.predicateClass ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "AGGREGATION": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "AGGREGATION" }>;
      return samePath(prior.collectionPath, candidate.collectionPath) && samePath(prior.numericFieldPath, candidate.numericFieldPath) && samePath(prior.scalarPath, candidate.scalarPath) && prior.operation === candidate.operation ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "PAGINATION": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "PAGINATION" }>;
      if (!samePath(prior.collectionPath, candidate.collectionPath) || !sameNullablePath(prior.orderingPath, candidate.orderingPath)) return "INCOMPATIBLE_CHANGE";
      if (prior.pageSize === candidate.pageSize) return "UNCHANGED";
      return candidate.pageSize > prior.pageSize ? "EXPANDED" : "NARROWED";
    }
    case "DEDUPLICATION": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "DEDUPLICATION" }>;
      return samePath(prior.collectionPath, candidate.collectionPath) && samePath(prior.identityPath, candidate.identityPath) ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "GROUPING": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "GROUPING" }>;
      return samePath(prior.collectionPath, candidate.collectionPath) && samePath(prior.groupKeyPath, candidate.groupKeyPath) && prior.aggregateOperation === candidate.aggregateOperation ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "PRESENCE_RELATION": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "PRESENCE_RELATION" }>;
      return samePath(prior.conditionPath, candidate.conditionPath) && samePath(prior.targetPath, candidate.targetPath) && prior.conditionExpected === candidate.conditionExpected ? "UNCHANGED" : "INCOMPATIBLE_CHANGE";
    }
    case "MAPPING": {
      const candidate = current as Extract<DiscoveredContractShape, { readonly kind: "MAPPING" }>;
      if (!samePath(prior.sourceField, candidate.sourceField) || !samePath(prior.targetField, candidate.targetField)) return "INCOMPATIBLE_CHANGE";
      if (prior.mappingEntryCount === candidate.mappingEntryCount && prior.mappingDigest === candidate.mappingDigest) return "UNCHANGED";
      if (candidate.mappingEntryCount > prior.mappingEntryCount) return "EXPANDED";
      if (candidate.mappingEntryCount < prior.mappingEntryCount) return "NARROWED";
      return "INCOMPATIBLE_CHANGE";
    }
  }
}

/** Compare supported contract shapes without serialized-size heuristics. */
export function compareContractShapes(prior: DiscoveredContractShape | null, current: DiscoveredContractShape | null): ContractShapeDrift {
  if (prior === null && current === null) return "REDERIVATION_REQUIRED";
  if (prior === null) return "EXPANDED";
  if (current === null) return "NARROWED";
  if (prior.kind !== current.kind) return "INCOMPATIBLE_CHANGE";
  return compareShapeSameOrIncompatible(prior, current);
}

/** Compare exact source/evidence identities without silently rebinding. */
export function classifyContractDrift(input: {
  readonly prior: ContractCandidate | null;
  readonly current: ContractCandidate | null;
  readonly sourceAvailable?: boolean;
}): import("./types").ContractDriftResult {
  if (input.current === null) return { candidateId: input.prior?.candidateId ?? "contract-unknown", currentness: input.sourceAvailable === false ? "SOURCE_UNAVAILABLE" : "CONTRACT_REMOVED", shapeChange: input.sourceAvailable === false ? "SOURCE_UNAVAILABLE" : "REMOVED", affected: true, reasonCode: input.sourceAvailable === false ? "SOURCE_UNAVAILABLE" : "CONTRACT_MISSING", priorEvidenceDigest: input.prior?.source.evidenceDigest ?? null, currentEvidenceDigest: null };
  if (input.prior === null) return { candidateId: input.current.candidateId, currentness: "CONTRACT_EXPANDED", shapeChange: "EXPANDED", affected: true, reasonCode: "SOURCE_SHA_CHANGED", priorEvidenceDigest: null, currentEvidenceDigest: input.current.source.evidenceDigest };
  const shaChanged = input.prior.source.sha !== input.current.source.sha;
  const evidenceChanged = input.prior.source.evidenceDigest !== input.current.source.evidenceDigest;
  if (!shaChanged && !evidenceChanged) return { candidateId: input.current.candidateId, currentness: "CURRENT", shapeChange: "UNCHANGED", affected: false, reasonCode: "EVIDENCE_UNCHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
  if (shaChanged && !evidenceChanged) return { candidateId: input.current.candidateId, currentness: "EVIDENCE_CHANGED_SEMANTICS_UNCHANGED", shapeChange: "EVIDENCE_CHANGED_SEMANTICS_UNCHANGED", affected: false, reasonCode: "EVIDENCE_UNCHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
  const shapeChange: ContractShapeDrift = compareContractShapes(input.prior.shape, input.current.shape);
  const currentness: import("./types").ContractCurrentness = shapeChange === "EXPANDED"
    ? "CONTRACT_EXPANDED"
    : shapeChange === "NARROWED"
      ? "CONTRACT_NARROWED"
      : shapeChange === "INCOMPATIBLE_CHANGE"
        ? "INCOMPATIBLE_CHANGE"
        : shapeChange === "REDERIVATION_REQUIRED"
          ? "REDERIVATION_REQUIRED"
          : "SEMANTIC_REDERIVATION_REQUIRED";
  return { candidateId: input.current.candidateId, currentness, shapeChange, affected: true, reasonCode: "EVIDENCE_CHANGED", priorEvidenceDigest: input.prior.source.evidenceDigest, currentEvidenceDigest: input.current.source.evidenceDigest };
}
