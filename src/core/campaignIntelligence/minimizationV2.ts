// Phase 19 — deterministic reduction search with honest proof strength. The
// reducer is a pure orchestration shell around a caller-supplied safe replay
// probe; it never invents a positive result when a candidate was not run.

import {
  CAMPAIGN_MINIMIZATION_V2_VERSION,
  safeCampaignDigest,
} from "./types";

export type MinimalityProofKind =
  | "ONE_STEP_LOCAL_MINIMUM"
  | "CHUNK_AND_STEP_FIXED_POINT"
  | "SEMANTIC_FIXED_POINT"
  | "NOT_PROVEN_MINIMAL";

export interface ReductionAction {
  readonly actionId: string;
  readonly ordinal: number;
  readonly dependencyKey: string | null;
}

/** A retained dependent action is valid only when its prerequisite remains. */
export interface ReductionDependencyEdge {
  readonly prerequisiteOrdinal: number;
  readonly dependentOrdinal: number;
}

export type ReductionProbeOutcome =
  | "REPRODUCES"
  | "DOES_NOT_REPRODUCE"
  | "PRECONDITION_DIVERGENCE"
  | "EXECUTOR_FAILURE"
  | "INVALID";

export interface ReductionProbeResult {
  readonly valid: boolean;
  readonly preservesFinding: boolean;
  readonly outcome: ReductionProbeOutcome;
  readonly reason: string;
}

export interface MinimizationV2Evaluation {
  readonly retainedOrdinals: readonly number[];
  readonly retainedActionIds: readonly string[];
  readonly outcome: ReductionProbeOutcome;
  readonly preservesFinding: boolean;
  readonly valid: boolean;
  readonly reason: string;
}

export interface MinimizationV2Result {
  readonly schemaVersion: typeof CAMPAIGN_MINIMIZATION_V2_VERSION;
  readonly originalOrdinals: readonly number[];
  readonly minimalOrdinals: readonly number[];
  readonly removedOrdinals: readonly number[];
  readonly minimalActionIds: readonly string[];
  readonly originalReproduced: boolean;
  readonly proof: MinimalityProofKind;
  readonly probesAttempted: number;
  readonly cacheHits: number;
  readonly budgetExhausted: boolean;
  readonly fixedPointPasses: number;
  readonly dependencyEdges: readonly ReductionDependencyEdge[];
  readonly evaluations: readonly MinimizationV2Evaluation[];
  readonly reasons: readonly string[];
  readonly deterministicDigest: string;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function invalid(reason: string): never {
  throw new Error(`MINIMIZATION_V2_INVALID:${reason}`);
}

function validateAction(action: ReductionAction): void {
  if (!SAFE_ID_RE.test(action.actionId)) invalid("ACTION_ID");
  if (action.dependencyKey !== null && !SAFE_ID_RE.test(action.dependencyKey)) invalid("DEPENDENCY_KEY");
  if (!Number.isInteger(action.ordinal) || action.ordinal < 0 || action.ordinal > 999_999) invalid("ORDINAL");
}

function validateDependency(edge: ReductionDependencyEdge, ordinals: ReadonlySet<number>): void {
  if (!Number.isInteger(edge.prerequisiteOrdinal) || edge.prerequisiteOrdinal < 0 || !ordinals.has(edge.prerequisiteOrdinal)) invalid("DEPENDENCY_PREREQUISITE");
  if (!Number.isInteger(edge.dependentOrdinal) || edge.dependentOrdinal < 0 || !ordinals.has(edge.dependentOrdinal)) invalid("DEPENDENCY_DEPENDENT");
  if (edge.prerequisiteOrdinal === edge.dependentOrdinal) invalid("DEPENDENCY_SELF");
}

function sequenceKey(sequence: readonly ReductionAction[]): string {
  return sequence.map((action) => `${action.ordinal}:${action.actionId}`).join(">");
}

function splitChunks<T>(values: readonly T[], count: number): readonly (readonly T[])[] {
  const actual = Math.max(1, Math.min(count, values.length));
  const size = Math.floor(values.length / actual);
  let remainder = values.length % actual;
  let cursor = 0;
  const chunks: T[][] = [];
  for (let index = 0; index < actual; index += 1) {
    const length = size + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    chunks.push(values.slice(cursor, cursor + length) as T[]);
    cursor += length;
  }
  return chunks;
}

function withoutChunk<T>(values: readonly T[], chunk: readonly T[]): T[] {
  const remove = new Set(chunk);
  return values.filter((value) => !remove.has(value));
}

/** Search chunk reductions, then individual reductions, to a deterministic fixed point. */
export function minimizeSequenceV2(input: {
  readonly original: readonly ReductionAction[];
  readonly maxProbes: number;
  readonly semanticIdentityBound: boolean;
  readonly dependencies?: readonly ReductionDependencyEdge[];
  readonly probe: (sequence: readonly ReductionAction[]) => ReductionProbeResult;
}): MinimizationV2Result {
  if (!Array.isArray(input.original) || input.original.length === 0 || input.original.length > 128) invalid("ORIGINAL_SEQUENCE");
  if (!Number.isInteger(input.maxProbes) || input.maxProbes < 1 || input.maxProbes > 4096) invalid("MAX_PROBES");
  const original = input.original.map((action) => ({ ...action }));
  original.forEach(validateAction);
  const originalOrdinalsSet = new Set(original.map((action) => action.ordinal));
  if (originalOrdinalsSet.size !== original.length) invalid("DUPLICATE_ORDINAL");
  const dependencyEdges = [...(input.dependencies ?? [])].sort((left, right) => left.prerequisiteOrdinal - right.prerequisiteOrdinal || left.dependentOrdinal - right.dependentOrdinal);
  dependencyEdges.forEach((edge) => validateDependency(edge, originalOrdinalsSet));
  if (new Set(dependencyEdges.map((edge) => `${edge.prerequisiteOrdinal}|${edge.dependentOrdinal}`)).size !== dependencyEdges.length) invalid("DUPLICATE_DEPENDENCY");
  const evaluations: MinimizationV2Evaluation[] = [];
  const cache = new Map<string, ReductionProbeResult>();
  let probesAttempted = 0;
  let cacheHits = 0;
  let budgetExhausted = false;
  const dependencySatisfied = (sequence: readonly ReductionAction[]): boolean => {
    const retained = new Set(sequence.map((action) => action.ordinal));
    return dependencyEdges.every((edge) => !retained.has(edge.dependentOrdinal) || retained.has(edge.prerequisiteOrdinal));
  };
  const evaluate = (sequence: readonly ReductionAction[]): ReductionProbeResult => {
    const key = sequenceKey(sequence);
    const cached = cache.get(key);
    if (cached !== undefined) { cacheHits += 1; return cached; }
    if (probesAttempted >= input.maxProbes) {
      budgetExhausted = true;
      const exhausted: ReductionProbeResult = { valid: false, preservesFinding: false, outcome: "INVALID", reason: "BUDGET_EXHAUSTED" };
      evaluations.push({ retainedOrdinals: sequence.map((action) => action.ordinal), retainedActionIds: sequence.map((action) => action.actionId), ...exhausted });
      return exhausted;
    }
    if (!dependencySatisfied(sequence)) {
      const dependencyFailure: ReductionProbeResult = { valid: true, preservesFinding: false, outcome: "PRECONDITION_DIVERGENCE", reason: "DEPENDENCY_PRECONDITION_REQUIRED" };
      cache.set(key, dependencyFailure);
      evaluations.push({ retainedOrdinals: sequence.map((action) => action.ordinal), retainedActionIds: sequence.map((action) => action.actionId), ...dependencyFailure });
      return dependencyFailure;
    }
    probesAttempted += 1;
    let result: ReductionProbeResult;
    try {
      result = input.probe(sequence);
    } catch {
      result = { valid: false, preservesFinding: false, outcome: "EXECUTOR_FAILURE", reason: "EXECUTOR_FAILURE" };
    }
    if (typeof result.valid !== "boolean" || typeof result.preservesFinding !== "boolean" || !/^[A-Z_]{1,80}$/.test(result.reason)) invalid("PROBE_RESULT");
    cache.set(key, result);
    evaluations.push({ retainedOrdinals: sequence.map((action) => action.ordinal), retainedActionIds: sequence.map((action) => action.actionId), ...result });
    return result;
  };

  const fresh = evaluate(original);
  let current = original;
  let fixedPointPasses = 0;
  let chunkSearchComplete = false;
  let oneStepProof = false;
  if (!fresh.valid || !fresh.preservesFinding) {
    const core = {
      schemaVersion: CAMPAIGN_MINIMIZATION_V2_VERSION,
      originalOrdinals: original.map((action) => action.ordinal),
      minimalOrdinals: [],
      removedOrdinals: [],
      minimalActionIds: [],
      originalReproduced: false,
      proof: "NOT_PROVEN_MINIMAL" as const,
      probesAttempted,
      cacheHits,
      budgetExhausted,
      fixedPointPasses,
      dependencyEdges,
      evaluations,
      reasons: [fresh.reason],
    };
    return { ...core, deterministicDigest: safeCampaignDigest(core, "min2") };
  }

  let granularity = Math.min(2, current.length);
  while (current.length > 1 && !budgetExhausted) {
    const chunks = splitChunks(current, granularity);
    let accepted = false;
    for (const chunk of chunks) {
      const candidate = withoutChunk(current, chunk);
      if (candidate.length === 0) continue;
      const result = evaluate(candidate);
      if (result.preservesFinding && result.valid) {
        current = candidate;
        granularity = Math.max(2, granularity - 1);
        accepted = true;
        break;
      }
      if (budgetExhausted) break;
    }
    if (budgetExhausted) break;
    if (accepted) continue;
    if (granularity >= current.length) { chunkSearchComplete = true; break; }
    granularity = Math.min(current.length, granularity * 2);
  }
  if (current.length <= 1) chunkSearchComplete = !budgetExhausted;

  let changed = true;
  while (changed && !budgetExhausted && current.length > 1) {
    changed = false;
    fixedPointPasses += 1;
    const passResults: ReductionProbeResult[] = [];
    for (let index = 0; index < current.length; index += 1) {
      const candidate = current.filter((_, candidateIndex) => candidateIndex !== index);
      const result = evaluate(candidate);
      passResults.push(result);
      if (result.valid && result.preservesFinding) {
        current = candidate;
        changed = true;
        break;
      }
      if (budgetExhausted) break;
    }
    if (!changed && !budgetExhausted) {
      oneStepProof = passResults.length === current.length && passResults.every((result) => result.valid && !result.preservesFinding);
    }
  }
  if (current.length === 1 && !budgetExhausted) oneStepProof = true;
  const proof: MinimalityProofKind = budgetExhausted || !chunkSearchComplete || !oneStepProof
    ? "NOT_PROVEN_MINIMAL"
    : input.semanticIdentityBound
      ? "SEMANTIC_FIXED_POINT"
      : "CHUNK_AND_STEP_FIXED_POINT";
  const originalOrdinals = original.map((action) => action.ordinal);
  const minimalOrdinals = current.map((action) => action.ordinal);
  const minimalSet = new Set(minimalOrdinals);
  const core = {
    schemaVersion: CAMPAIGN_MINIMIZATION_V2_VERSION,
    originalOrdinals,
    minimalOrdinals,
    removedOrdinals: originalOrdinals.filter((ordinal) => !minimalSet.has(ordinal)),
    minimalActionIds: current.map((action) => action.actionId),
    originalReproduced: true,
    proof,
    probesAttempted,
    cacheHits,
    budgetExhausted,
    fixedPointPasses,
    dependencyEdges,
    evaluations,
    reasons: proof === "NOT_PROVEN_MINIMAL" ? [budgetExhausted ? "BUDGET_EXHAUSTED" : "UNEXERCISED_OR_INVALID_REDUCTION"] : ["ALL_TESTED_REDUCTIONS_DID_NOT_PRESERVE_FINDING"],
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "min2") };
}
