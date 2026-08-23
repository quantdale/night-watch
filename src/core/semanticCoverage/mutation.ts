// Phase 20 — bounded contract-derived synthetic mutants and detection score.
//
// Raw synthetic observations exist only inside materializeCase and are
// immediately converted to existing safe projections. Returned fixtures and
// metrics contain no raw values, payloads, or callbacks.

import { ProjectionContext } from "../../oracles/projections/identity";
import { projectValue } from "../../oracles/projections/projector";
import type { SemanticProjection } from "../../oracles/projections/types";
import { sourceEvidenceDigest, SYNTHETIC_MUTATION_VERSION } from "./types";
import { compareSurfaceSemantics, type DifferentialEvaluation, type SurfaceEquivalenceContract, type SurfaceObservation } from "./differential";
import { evaluateMetamorphicRelation, type MetamorphicEvaluation, type MetamorphicRelation } from "./metamorphic";
import { evaluateRelationalContract, type RelationalContract, type RelationalEvaluation } from "./relational";
import { evaluateSourceBoundMembership, type MembershipEvaluation, type SourceBoundMembershipContract } from "./membership";
import type { ContractCandidate, DiscoveredContractShape, JsonTypeCategory } from "./types";

export type SyntheticMutationClass =
  | "BASELINE_VALID"
  | "MISSING_REQUIRED_FIELD"
  | "WRONG_TYPE"
  | "WRONG_ENUM"
  | "MISSING_ENUM_MEMBER"
  | "UNEXPECTED_SET_MEMBER"
  | "EXACT_SET_MISMATCH"
  | "SUBSET_VIOLATION"
  | "SUPERSET_VIOLATION"
  | "LOWER_BOUND_VIOLATION"
  | "UPPER_BOUND_VIOLATION"
  | "RELATIONSHIP_VIOLATION"
  | "ORDERING_VIOLATION"
  | "AGGREGATE_MISMATCH"
  | "DIFFERENTIAL_MISMATCH"
  | "METAMORPHIC_VIOLATION"
  | "BENIGN_ALTERNATIVE";

export const SYNTHETIC_MUTATION_CLASSES: readonly SyntheticMutationClass[] = [
  "BASELINE_VALID", "MISSING_REQUIRED_FIELD", "WRONG_TYPE", "WRONG_ENUM", "LOWER_BOUND_VIOLATION",
  "MISSING_ENUM_MEMBER", "UNEXPECTED_SET_MEMBER", "EXACT_SET_MISMATCH", "SUBSET_VIOLATION", "SUPERSET_VIOLATION",
  "UPPER_BOUND_VIOLATION", "RELATIONSHIP_VIOLATION", "ORDERING_VIOLATION", "AGGREGATE_MISMATCH",
  "DIFFERENTIAL_MISMATCH", "METAMORPHIC_VIOLATION", "BENIGN_ALTERNATIVE",
];

export type SyntheticCapabilityKind = "SOURCE_CONTRACT" | "RELATIONAL" | "DIFFERENTIAL" | "METAMORPHIC" | "MEMBERSHIP";

export interface SyntheticMembershipBinding {
  readonly contract: SourceBoundMembershipContract;
  readonly path: readonly string[];
}

export interface SyntheticFixture {
  readonly schemaVersion: typeof SYNTHETIC_MUTATION_VERSION;
  readonly fixtureId: string;
  readonly capabilityKind: SyntheticCapabilityKind;
  readonly contractId: string;
  readonly mutationClass: SyntheticMutationClass;
  readonly applicable: boolean;
  readonly expectedViolation: boolean;
  readonly observationDigests: readonly string[];
  readonly benignControl: boolean;
  readonly deterministicDigest: string;
}

export interface SyntheticMutationMeasurementRow {
  readonly fixtureId: string;
  readonly contractId: string;
  readonly mutationClass: SyntheticMutationClass;
  readonly applicable: boolean;
  readonly expectedViolation: boolean;
  readonly detected: boolean;
  readonly replayed: boolean;
  readonly minimized: boolean;
  readonly highConfidence: boolean;
  readonly benignControl: boolean;
  readonly falsePositive: boolean;
  readonly replayOutcome: string | null;
  readonly minimizationProof: string | null;
}

/** Truth supplied by a bounded replay/minimization adapter. When omitted the
 * Phase 20 compatibility behavior remains detection-derived. Phase 21 passes
 * this evidence explicitly so lifecycle counts cannot be inferred from a
 * detector result alone. */
export interface SyntheticLifecycleEvidenceRow {
  readonly fixtureId: string;
  readonly replayed: boolean;
  readonly minimized: boolean;
  readonly highConfidence: boolean;
  readonly replayOutcome: string;
  readonly minimizationProof: string;
}

export interface SyntheticMutationMeasurement {
  readonly schemaVersion: typeof SYNTHETIC_MUTATION_VERSION;
  readonly fixtures: readonly SyntheticFixture[];
  readonly rows: readonly SyntheticMutationMeasurementRow[];
  readonly mutantsGenerated: number;
  readonly mutantsApplicable: number;
  readonly mutantsDetected: number;
  readonly mutantsSurviving: number;
  readonly benignControls: number;
  readonly benignFalsePositives: number;
  readonly replayedDetections: number;
  readonly minimizedDetections: number;
  readonly highConfidenceDetections: number;
  readonly scorePermille: number;
  readonly survivingMutantIds: readonly string[];
  readonly survivingContractIds: readonly string[];
  readonly deterministicDigest: string;
}

interface MaterializedCase {
  readonly projections: readonly SemanticProjection[];
  readonly ctx: ProjectionContext;
  readonly differentialObservations?: readonly [SurfaceObservation, SurfaceObservation];
  readonly membershipEvaluation?: MembershipEvaluation;
}

function invalid(reason: string): never {
  throw new Error(`SYNTHETIC_MUTATION_INVALID:${reason}`);
}

function expectedViolation(mutationClass: SyntheticMutationClass): boolean {
  return mutationClass !== "BASELINE_VALID" && mutationClass !== "BENIGN_ALTERNATIVE";
}

function projectMany(values: readonly unknown[], ctx: ProjectionContext): readonly SemanticProjection[] {
  return values.map((value) => projectValue(value, ctx).projection);
}

function safeSyntheticValue(type: JsonTypeCategory): unknown {
  switch (type) {
    case "NULL": return null;
    case "BOOLEAN": return true;
    case "NUMBER": return 1;
    case "STRING": return "synthetic";
    case "OBJECT": return {};
    case "ARRAY": return [];
  }
}

function firstAlternative(type: JsonTypeCategory): JsonTypeCategory {
  return type === "STRING" ? "NUMBER" : "STRING";
}

function fieldObject(shape: Extract<DiscoveredContractShape, { kind: "FIELD_SET" }>, mutationClass: SyntheticMutationClass): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of shape.fields) result[field] = safeSyntheticValue(field === "id" || field === "status" ? "STRING" : "NUMBER");
  if (mutationClass === "MISSING_REQUIRED_FIELD") {
    const missing = shape.requiredFields[0];
    if (missing !== undefined) delete result[missing];
  }
  return result;
}

function materializeSourceContract(candidate: ContractCandidate, mutationClass: SyntheticMutationClass, membershipContracts?: ReadonlyMap<string, SourceBoundMembershipContract>): MaterializedCase | null {
  if (candidate.proofStatus === "REJECTED" || candidate.currentness !== "CURRENT" || candidate.shape === null) return null;
  const shape = candidate.shape;
  const ctx = new ProjectionContext();
  switch (shape.kind) {
    case "FIELD_SET": {
      if (shape.requiredFields.length === 0) return null;
      return { projections: projectMany([fieldObject(shape, mutationClass)], ctx), ctx };
    }
    case "FIELD_TYPE": {
      const expected = shape.allowedTypes[0];
      if (expected === undefined) return null;
      const actual = mutationClass === "WRONG_TYPE" ? firstAlternative(expected) : expected;
      return { projections: projectMany([{ [shape.field]: safeSyntheticValue(actual) }], ctx), ctx };
    }
    case "DEFAULT": {
      const actual = mutationClass === "WRONG_TYPE" ? firstAlternative(shape.defaultType) : shape.defaultType;
      if (mutationClass === "MISSING_REQUIRED_FIELD") return { projections: projectMany([{}], ctx), ctx };
      return { projections: projectMany([{ [shape.field]: safeSyntheticValue(actual) }], ctx), ctx };
    }
    case "FINITE_ENUM": {
      const membership = membershipContracts?.get(candidate.candidateId);
      if (membership === undefined) {
        // Preserve the Phase 20 baseline when no source-bound membership
        // contract is supplied. Wrong-enum remains honestly unapplicable.
        if (mutationClass === "WRONG_ENUM") return null;
        return { projections: projectMany([{ [shape.field]: "synthetic" }], ctx), ctx };
      }
      if (["MISSING_ENUM_MEMBER", "UNEXPECTED_SET_MEMBER", "EXACT_SET_MISMATCH", "SUBSET_VIOLATION", "SUPERSET_VIOLATION"].includes(mutationClass)) return null;
      const rawValue = mutationClass === "WRONG_ENUM" ? "synthetic-unknown-member" : membership.allowedValues[0];
      if (rawValue === undefined) return null;
      const projection = projectValue({ [shape.field]: rawValue }, ctx).projection;
      const membershipEvaluation = evaluateSourceBoundMembership({ projection, ctx, path: [shape.field], contract: membership });
      return { projections: [projection], ctx, membershipEvaluation };
    }
    case "RANGE": {
      const lower = shape.lowerBound;
      const upper = shape.upperBound;
      const valid = lower !== null ? (shape.lowerInclusive ? lower : lower + 1) : upper !== null ? (shape.upperInclusive ? upper : upper - 1) : 0;
      const invalidLower = lower === null ? valid : shape.lowerInclusive ? lower - 1 : lower;
      const invalidUpper = upper === null ? valid : shape.upperInclusive ? upper + 1 : upper;
      const value = mutationClass === "LOWER_BOUND_VIOLATION" ? invalidLower : mutationClass === "UPPER_BOUND_VIOLATION" ? invalidUpper : valid;
      return { projections: projectMany([{ [shape.field]: value }], ctx), ctx };
    }
    default:
      return null;
  }
}

function sourceContractDefectDetected(candidate: ContractCandidate, materialized: MaterializedCase, mutationClass: SyntheticMutationClass): boolean {
  if (materialized.projections.length === 0 || candidate.shape === null) return false;
  const root = materialized.projections[0]!.root;
  if (root.type !== "OBJECT" || root.fields === undefined) return false;
  const field = (name: string) => root.fields!.find((entry) => entry.name === name)?.node;
  switch (candidate.shape.kind) {
    case "FIELD_SET":
      return candidate.shape.requiredFields.some((required) => field(required) === undefined);
    case "FIELD_TYPE": {
      const node = field(candidate.shape.field);
      return node === undefined || !candidate.shape.allowedTypes.includes(node.type as JsonTypeCategory);
    }
    case "RANGE": {
      const node = field(candidate.shape.field);
      if (node?.type !== "NUMBER" || node.numericRef === undefined) return false;
      const value = materialized.ctx.numericValue(node.numericRef);
      if (value === undefined) return false;
      if (candidate.shape.lowerBound !== null && (candidate.shape.lowerInclusive ? value < candidate.shape.lowerBound : value <= candidate.shape.lowerBound)) return true;
      if (candidate.shape.upperBound !== null && (candidate.shape.upperInclusive ? value > candidate.shape.upperBound : value >= candidate.shape.upperBound)) return true;
      return false;
    }
    case "FINITE_ENUM":
      if (materialized.membershipEvaluation !== undefined) return ["NONE_ALLOWED", "SOME_DISALLOWED", "SUPERSET_OR_UNKNOWN_MEMBER"].includes(materialized.membershipEvaluation.result) && mutationClass === "WRONG_ENUM";
      return mutationClass === "WRONG_ENUM";
    case "DEFAULT": {
      const node = field(candidate.shape.field);
      return node === undefined || node.type !== candidate.shape.defaultType;
    }
    default:
      return false;
  }
}

function objectForPaths(paths: readonly (readonly string[])[], values: readonly unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  paths.forEach((path, index) => {
    if (path.length !== 1) return;
    if (values[index] !== undefined) result[path[0]!] = values[index];
  });
  return result;
}

function materializeMembership(binding: SyntheticMembershipBinding, mutationClass: SyntheticMutationClass): MaterializedCase | null {
  const values = binding.contract.allowedValues;
  if (values.length === 0) return null;
  if (binding.path.length !== 1) return null;
  let observed: readonly string[];
  switch (mutationClass) {
    case "BASELINE_VALID":
    case "BENIGN_ALTERNATIVE":
      observed = [...values].reverse();
      break;
    case "WRONG_ENUM":
      observed = ["synthetic-unknown-member"];
      break;
    case "MISSING_ENUM_MEMBER":
    case "EXACT_SET_MISMATCH":
      observed = values.slice(0, Math.max(0, values.length - 1));
      break;
    case "UNEXPECTED_SET_MEMBER":
    case "SUPERSET_VIOLATION":
      observed = [...values, "synthetic-unknown-member"];
      break;
    case "SUBSET_VIOLATION":
      observed = ["synthetic-unknown-member"];
      break;
    default:
      return null;
  }
  const ctx = new ProjectionContext();
  const projection = projectValue({ [binding.path[0]!]: observed }, ctx).projection;
  const membershipEvaluation = evaluateSourceBoundMembership({ projection, ctx, path: binding.path, contract: binding.contract });
  return { projections: [projection], ctx, membershipEvaluation };
}

function materializeRelational(contract: RelationalContract, mutationClass: SyntheticMutationClass): MaterializedCase | null {
  const ctx = new ProjectionContext();
  const definition = contract.definition;
  switch (definition.kind) {
    case "FIELD_PRESENT_IF": {
      const baseline = { enabled: true, detail: "safe" };
      const mutant = { enabled: true };
      const benign = { enabled: false };
      return { projections: projectMany([mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : mutationClass === "BENIGN_ALTERNATIVE" ? benign : baseline], ctx), ctx };
    }
    case "TOTAL_EQUALS_SUM":
    case "GROUP_AGGREGATE": {
      const baseline = definition.kind === "TOTAL_EQUALS_SUM" ? { items: [{ amount: 1 }, { amount: 2 }], total: 3 } : { items: [{ id: "a" }, { id: "b" }], groups: [{ count: 1 }, { count: 1 }] };
      const mutant = definition.kind === "TOTAL_EQUALS_SUM" ? { items: [{ amount: 1 }, { amount: 2 }], total: 4 } : { items: [{ id: "a" }, { id: "b" }], groups: [{ count: 2 }, { count: 1 }] };
      return { projections: projectMany([mutationClass === "AGGREGATE_MISMATCH" ? mutant : baseline], ctx), ctx };
    }
    case "COUNT_EQUALS_CARDINALITY": {
      const baseline = { items: [{ id: "a" }, { id: "b" }], count: 2 };
      const mutant = { items: [{ id: "a" }, { id: "b" }], count: 1 };
      return { projections: projectMany([mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : baseline], ctx), ctx };
    }
    case "SET_SUBSET": {
      const baseline = { left: [{ id: "a" }], right: [{ id: "a" }, { id: "b" }] };
      const mutant = { left: [{ id: "c" }], right: [{ id: "a" }, { id: "b" }] };
      return { projections: projectMany([mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : baseline], ctx), ctx };
    }
    case "MUTUALLY_EXCLUSIVE":
    case "EXACTLY_ONE_OF": {
      const paths = definition.paths;
      const baselineValues = definition.kind === "EXACTLY_ONE_OF" ? [true, undefined] : [true, undefined];
      const mutantValues = definition.kind === "EXACTLY_ONE_OF" ? [undefined, undefined] : [true, true];
      const benignValues = definition.kind === "EXACTLY_ONE_OF" ? [undefined, true] : [undefined, undefined];
      const values = mutationClass === "RELATIONSHIP_VIOLATION" ? mutantValues : mutationClass === "BENIGN_ALTERNATIVE" ? benignValues : baselineValues;
      return { projections: projectMany([objectForPaths(paths, values)], ctx), ctx };
    }
    case "MONOTONIC": {
      const baseline = [{ value: 1 }, { value: 2 }];
      const mutant = [{ value: 2 }, { value: 1 }];
      return { projections: projectMany(mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : baseline, ctx), ctx };
    }
    case "ORDERING": {
      const baseline = { items: [{ rank: 1 }, { rank: 2 }] };
      const mutant = { items: [{ rank: 2 }, { rank: 1 }] };
      return { projections: projectMany([mutationClass === "ORDERING_VIOLATION" ? mutant : baseline], ctx), ctx };
    }
    case "PAGINATION_CONSERVATION": {
      const baseline = { pageA: [{ id: "a" }], pageB: [{ id: "b" }], total: 2 };
      const mutant = { pageA: [{ id: "a" }], pageB: [{ id: "a" }], total: 2 };
      return { projections: projectMany([mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : baseline], ctx), ctx };
    }
    case "NORMALIZATION_EQUIVALENCE":
    case "IDENTITY_PRESERVATION":
    case "MAPPING_CONSISTENCY": {
      const baseline = { left: "same", right: "same" };
      const mutant = { left: "same", right: "different" };
      return { projections: projectMany([mutationClass === "RELATIONSHIP_VIOLATION" ? mutant : baseline], ctx), ctx };
    }
  }
}

function differentialLeaf(path: readonly string[], mismatch: boolean, alignmentKind: string | undefined, side: "LEFT" | "RIGHT"): unknown {
  const key = path[path.length - 1] ?? "summary";
  if (alignmentKind === "SCALAR_TO_SINGLETON_LIST") return side === "LEFT" ? (mismatch ? "synthetic-unknown-member" : "synthetic-category") : (mismatch ? ["synthetic-unknown-member"] : ["synthetic-category"]);
  if (alignmentKind === "ABSENT_TO_NULL") return mismatch ? "synthetic-category" : null;
  if (alignmentKind === "ORDERED_LIST_TO_SET") return mismatch ? [{ id: "synthetic-a" }, { id: "synthetic-c" }] : [{ id: "synthetic-b" }, { id: "synthetic-a" }];
  if (key === "summary") return { count: mismatch ? 3 : 2 };
  if (key === "items") return mismatch ? [{ id: "synthetic-a" }, { id: "synthetic-c" }] : [{ id: "synthetic-a" }, { id: "synthetic-b" }];
  if (["count", "amount", "rank", "value", "total", "page"].includes(key)) return mismatch ? 3 : 2;
  return mismatch ? "synthetic-unknown-member" : "synthetic-category";
}

function valueAtPath(path: readonly string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return { summary: value };
  let current: Record<string, unknown> = { [path[path.length - 1]!]: value };
  for (let index = path.length - 2; index >= 0; index -= 1) current = { [path[index]!]: current };
  return current;
}

function materializeDifferential(contract: SurfaceEquivalenceContract, mutationClass: SyntheticMutationClass): MaterializedCase {
  const ctx = new ProjectionContext();
  const mismatch = mutationClass === "DIFFERENTIAL_MISMATCH";
  const alignmentKind = contract.alignmentRule?.kind;
  const leftValue = differentialLeaf(contract.leftPath, mismatch && contract.expected === "DIFFERENT", alignmentKind, "LEFT");
  const rightValue = differentialLeaf(contract.rightPath, mismatch, alignmentKind, "RIGHT");
  const leftPayload = alignmentKind === "ABSENT_TO_NULL" && !mismatch ? {} : valueAtPath(contract.leftPath, leftValue);
  const rightPayload = valueAtPath(contract.rightPath, rightValue);
  const leftProjection = projectValue(leftPayload, ctx).projection;
  const rightProjection = projectValue(rightPayload, ctx).projection;
  const left: SurfaceObservation = { surfaceId: contract.leftSurfaceId, observationId: "synthetic.browser", sourceCurrentness: "CURRENT", applicable: true, projection: leftProjection };
  const right: SurfaceObservation = { surfaceId: contract.rightSurfaceId, observationId: "synthetic.api", sourceCurrentness: "CURRENT", applicable: true, projection: rightProjection };
  return { projections: [leftProjection, rightProjection], ctx, differentialObservations: [left, right] };
}

function membershipDefectDetected(materialized: MaterializedCase, mutationClass: SyntheticMutationClass): boolean {
  const result = materialized.membershipEvaluation?.result;
  if (result === undefined) return false;
  switch (mutationClass) {
    case "WRONG_ENUM": return result === "NONE_ALLOWED" || result === "SOME_DISALLOWED";
    case "MISSING_ENUM_MEMBER":
    case "EXACT_SET_MISMATCH": return result === "STRICT_SUBSET" || result === "NONE_ALLOWED";
    case "UNEXPECTED_SET_MEMBER":
    case "SUPERSET_VIOLATION": return result === "SUPERSET_OR_UNKNOWN_MEMBER";
    case "SUBSET_VIOLATION": return result === "SOME_DISALLOWED" || result === "NONE_ALLOWED";
    default: return false;
  }
}

function materializeMetamorphic(relation: MetamorphicRelation, mutationClass: SyntheticMutationClass): MaterializedCase {
  const ctx = new ProjectionContext();
  if (relation.definition.kind === "IDEMPOTENT_NORMALIZATION") {
    const baseline = { value: "synthetic-category" };
    const transformed = { value: mutationClass === "METAMORPHIC_VIOLATION" ? "synthetic-other" : "synthetic-category" };
    return { projections: projectMany([baseline, transformed], ctx), ctx };
  }
  if (relation.definition.kind === "DUPLICATE_INPUT_NORMALIZATION") {
    const baseline = { items: ["synthetic-category"] };
    const transformed = { items: mutationClass === "METAMORPHIC_VIOLATION" ? ["synthetic-other"] : ["synthetic-category"] };
    return { projections: projectMany([baseline, transformed], ctx), ctx };
  }
  if (relation.definition.kind === "DETERMINISTIC_GROUPING" || relation.definition.kind === "PRESENTATION_IDENTITY") {
    const baseline = { summary: { state: true } };
    const transformed = { summary: { state: mutationClass === "METAMORPHIC_VIOLATION" ? false : true } };
    return { projections: projectMany([baseline, transformed], ctx), ctx };
  }
  const baseline = relation.definition.kind === "PAGINATION_MONOTONIC" ? { count: 1 } : { summary: { state: true }, items: [{ rank: 1 }, { rank: 2 }] };
  const transformed = relation.definition.kind === "PAGINATION_MONOTONIC"
    ? { count: mutationClass === "METAMORPHIC_VIOLATION" ? 0 : 2 }
    : { summary: { state: mutationClass === "METAMORPHIC_VIOLATION" ? false : true }, items: mutationClass === "METAMORPHIC_VIOLATION" ? [{ rank: 2 }, { rank: 1 }] : [{ rank: 1 }, { rank: 2 }] };
  return { projections: projectMany([baseline, transformed], ctx), ctx };
}

function fixtureId(contractId: string, capabilityKind: SyntheticCapabilityKind, mutationClass: SyntheticMutationClass): string {
  return sourceEvidenceDigest({ contractId, capabilityKind, mutationClass });
}

function fixtureFrom(input: { readonly contractId: string; readonly capabilityKind: SyntheticCapabilityKind; readonly mutationClass: SyntheticMutationClass; readonly materialized: MaterializedCase | null }): SyntheticFixture {
  const applicable = input.materialized !== null;
  const observationDigests = input.materialized?.projections.map((projection) => sourceEvidenceDigest(projection)) ?? [];
  const core = { schemaVersion: SYNTHETIC_MUTATION_VERSION, fixtureId: fixtureId(input.contractId, input.capabilityKind, input.mutationClass), capabilityKind: input.capabilityKind, contractId: input.contractId, mutationClass: input.mutationClass, applicable, expectedViolation: expectedViolation(input.mutationClass), observationDigests, benignControl: input.mutationClass === "BENIGN_ALTERNATIVE" };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

/** Generate bounded fixtures for each admitted relation/cross-surface pair. */
export function generateSyntheticFixtures(input: {
  readonly candidates?: readonly ContractCandidate[];
  readonly relationalContracts?: readonly RelationalContract[];
  readonly differentialContracts?: readonly SurfaceEquivalenceContract[];
  readonly metamorphicRelations?: readonly MetamorphicRelation[];
  readonly membershipContracts?: readonly SourceBoundMembershipContract[];
  readonly membershipBindings?: readonly SyntheticMembershipBinding[];
}): readonly SyntheticFixture[] {
  const fixtures: SyntheticFixture[] = [];
  const membershipContracts = new Map((input.membershipContracts ?? []).map((contract) => [contract.contractId, contract]));
  for (const candidate of [...(input.candidates ?? [])].sort((left, right) => left.candidateId.localeCompare(right.candidateId))) {
    if (candidate.proofStatus === "REJECTED" || candidate.currentness !== "CURRENT") continue;
    const mutationClasses: readonly SyntheticMutationClass[] = candidate.shape?.kind === "FIELD_SET"
      ? ["BASELINE_VALID", "MISSING_REQUIRED_FIELD", "BENIGN_ALTERNATIVE"]
      : candidate.shape?.kind === "FIELD_TYPE"
        ? ["BASELINE_VALID", "WRONG_TYPE", "BENIGN_ALTERNATIVE"]
        : candidate.shape?.kind === "DEFAULT"
          ? ["BASELINE_VALID", "WRONG_TYPE", "MISSING_REQUIRED_FIELD", "BENIGN_ALTERNATIVE"]
        : candidate.shape?.kind === "FINITE_ENUM"
          ? ["BASELINE_VALID", "WRONG_ENUM", "BENIGN_ALTERNATIVE"]
          : candidate.shape?.kind === "RANGE"
            ? ["BASELINE_VALID", "LOWER_BOUND_VIOLATION", "UPPER_BOUND_VIOLATION", "BENIGN_ALTERNATIVE"]
            : [];
    for (const mutationClass of mutationClasses) fixtures.push(fixtureFrom({ contractId: candidate.candidateId, capabilityKind: "SOURCE_CONTRACT", mutationClass, materialized: materializeSourceContract(candidate, mutationClass, membershipContracts) }));
  }
  const relationalDefectFor = (contract: RelationalContract): SyntheticMutationClass => contract.definition.kind === "TOTAL_EQUALS_SUM" || contract.definition.kind === "GROUP_AGGREGATE" ? "AGGREGATE_MISMATCH" : contract.definition.kind === "ORDERING" ? "ORDERING_VIOLATION" : "RELATIONSHIP_VIOLATION";
  for (const contract of input.relationalContracts ?? []) {
    if (contract.proofStatus !== "ADMITTED") continue;
    for (const mutationClass of ["BASELINE_VALID", relationalDefectFor(contract), "BENIGN_ALTERNATIVE"] as const) fixtures.push(fixtureFrom({ contractId: contract.contractId, capabilityKind: "RELATIONAL", mutationClass, materialized: materializeRelational(contract, mutationClass) }));
  }
  for (const contract of input.differentialContracts ?? []) {
    if (contract.proofStatus !== "ADMITTED") continue;
    for (const mutationClass of ["BASELINE_VALID", "DIFFERENTIAL_MISMATCH", "BENIGN_ALTERNATIVE"] as const) fixtures.push(fixtureFrom({ contractId: contract.equivalenceId, capabilityKind: "DIFFERENTIAL", mutationClass, materialized: materializeDifferential(contract, mutationClass) }));
  }
  for (const relation of input.metamorphicRelations ?? []) {
    if (relation.proofStatus !== "ADMITTED") continue;
    for (const mutationClass of ["BASELINE_VALID", "METAMORPHIC_VIOLATION", "BENIGN_ALTERNATIVE"] as const) fixtures.push(fixtureFrom({ contractId: relation.relationId, capabilityKind: "METAMORPHIC", mutationClass, materialized: materializeMetamorphic(relation, mutationClass) }));
  }
  for (const binding of [...(input.membershipBindings ?? [])].sort((left, right) => left.contract.contractId.localeCompare(right.contract.contractId))) {
    if (binding.contract.mode !== "SET_RELATION") continue;
    for (const mutationClass of ["BASELINE_VALID", "WRONG_ENUM", "MISSING_ENUM_MEMBER", "UNEXPECTED_SET_MEMBER", "EXACT_SET_MISMATCH", "SUBSET_VIOLATION", "SUPERSET_VIOLATION", "BENIGN_ALTERNATIVE"] as const) {
      fixtures.push(fixtureFrom({ contractId: binding.contract.contractId, capabilityKind: "MEMBERSHIP", mutationClass, materialized: materializeMembership(binding, mutationClass) }));
    }
  }
  return Object.freeze(fixtures.sort((left, right) => left.fixtureId.localeCompare(right.fixtureId)));
}

function evaluateFixture(input: { readonly fixture: SyntheticFixture; readonly candidates: ReadonlyMap<string, ContractCandidate>; readonly relationalContracts: ReadonlyMap<string, RelationalContract>; readonly differentialContracts: ReadonlyMap<string, SurfaceEquivalenceContract>; readonly metamorphicRelations: ReadonlyMap<string, MetamorphicRelation>; readonly membershipContracts: ReadonlyMap<string, SourceBoundMembershipContract>; readonly membershipBindings: ReadonlyMap<string, SyntheticMembershipBinding> }): { readonly detected: boolean; readonly materialized: MaterializedCase | null } {
  if (!input.fixture.applicable) return { detected: false, materialized: null };
  if (input.fixture.capabilityKind === "SOURCE_CONTRACT") {
    const candidate = input.candidates.get(input.fixture.contractId);
    if (candidate === undefined) return { detected: false, materialized: null };
    const materialized = materializeSourceContract(candidate, input.fixture.mutationClass, input.membershipContracts);
    if (materialized === null) return { detected: false, materialized: null };
    return { detected: sourceContractDefectDetected(candidate, materialized, input.fixture.mutationClass), materialized };
  }
  if (input.fixture.capabilityKind === "RELATIONAL") {
    const contract = input.relationalContracts.get(input.fixture.contractId);
    if (contract === undefined) return { detected: false, materialized: null };
    const materialized = materializeRelational(contract, input.fixture.mutationClass);
    if (materialized === null) return { detected: false, materialized: null };
    const result: RelationalEvaluation = evaluateRelationalContract({ contract, projections: materialized.projections, ctx: materialized.ctx });
    return { detected: result.verdict === "VIOLATED", materialized };
  }
  if (input.fixture.capabilityKind === "DIFFERENTIAL") {
    const contract = input.differentialContracts.get(input.fixture.contractId);
    if (contract === undefined) return { detected: false, materialized: null };
    const materialized = materializeDifferential(contract, input.fixture.mutationClass);
    const pair = materialized.differentialObservations!;
    const result: DifferentialEvaluation = compareSurfaceSemantics({ contract, left: pair[0], right: pair[1] });
    return { detected: result.outcome === "CONTRACT_VIOLATION", materialized };
  }
  if (input.fixture.capabilityKind === "MEMBERSHIP") {
    const binding = input.membershipBindings.get(input.fixture.contractId);
    if (binding === undefined) return { detected: false, materialized: null };
    const materialized = materializeMembership(binding, input.fixture.mutationClass);
    if (materialized === null) return { detected: false, materialized: null };
    return { detected: membershipDefectDetected(materialized, input.fixture.mutationClass), materialized };
  }
  const relation = input.metamorphicRelations.get(input.fixture.contractId);
  if (relation === undefined) return { detected: false, materialized: null };
  const materialized = materializeMetamorphic(relation, input.fixture.mutationClass);
  const result: MetamorphicEvaluation = evaluateMetamorphicRelation({ relation, baseline: materialized.projections[0]!, transformed: materialized.projections[1]!, ctx: materialized.ctx });
  return { detected: result.outcome === "VIOLATED", materialized };
}

/** Measure synthetic detection strength; this is not a real-world probability. */
export function measureSyntheticMutationDetection(input: {
  readonly fixtures: readonly SyntheticFixture[];
  readonly candidates?: readonly ContractCandidate[];
  readonly relationalContracts?: readonly RelationalContract[];
  readonly differentialContracts?: readonly SurfaceEquivalenceContract[];
  readonly metamorphicRelations?: readonly MetamorphicRelation[];
  readonly membershipContracts?: readonly SourceBoundMembershipContract[];
  readonly membershipBindings?: readonly SyntheticMembershipBinding[];
  readonly lifecycleEvidence?: readonly SyntheticLifecycleEvidenceRow[];
}): SyntheticMutationMeasurement {
  const candidates = new Map((input.candidates ?? []).map((candidate) => [candidate.candidateId, candidate]));
  const relationalContracts = new Map((input.relationalContracts ?? []).map((contract) => [contract.contractId, contract]));
  const differentialContracts = new Map((input.differentialContracts ?? []).map((contract) => [contract.equivalenceId, contract]));
  const metamorphicRelations = new Map((input.metamorphicRelations ?? []).map((relation) => [relation.relationId, relation]));
  const membershipContracts = new Map((input.membershipContracts ?? []).map((contract) => [contract.contractId, contract]));
  const membershipBindings = new Map((input.membershipBindings ?? []).map((binding) => [binding.contract.contractId, binding]));
  const lifecycleEvidence = new Map((input.lifecycleEvidence ?? []).map((row) => [row.fixtureId, row]));
  const lifecycleEvidenceSupplied = input.lifecycleEvidence !== undefined;
  const rows: SyntheticMutationMeasurementRow[] = [];
  for (const fixture of [...input.fixtures].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId))) {
    const result = evaluateFixture({ fixture, candidates, relationalContracts, differentialContracts, metamorphicRelations, membershipContracts, membershipBindings });
    const detected = result.detected;
    const defect = fixture.expectedViolation && fixture.applicable;
    const benignControl = fixture.benignControl && fixture.applicable;
    const lifecycle = lifecycleEvidence.get(fixture.fixtureId);
    const replayed = defect && detected && (lifecycleEvidenceSupplied ? lifecycle?.replayed === true : true);
    const minimized = defect && detected && (lifecycleEvidenceSupplied ? lifecycle?.minimized === true : true);
    const highConfidence = defect && detected && (lifecycleEvidenceSupplied ? lifecycle?.highConfidence === true : true);
    rows.push({ fixtureId: fixture.fixtureId, contractId: fixture.contractId, mutationClass: fixture.mutationClass, applicable: fixture.applicable, expectedViolation: fixture.expectedViolation, detected, replayed, minimized, highConfidence, benignControl, falsePositive: benignControl && detected, replayOutcome: lifecycle?.replayOutcome ?? null, minimizationProof: lifecycle?.minimizationProof ?? null });
  }
  const defectRows = rows.filter((row) => row.expectedViolation);
  const applicableDefects = defectRows.filter((row) => row.applicable);
  const surviving = applicableDefects.filter((row) => !row.detected);
  const core = {
    schemaVersion: SYNTHETIC_MUTATION_VERSION,
    fixtures: [...input.fixtures].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId)),
    rows,
    mutantsGenerated: defectRows.length,
    mutantsApplicable: applicableDefects.length,
    mutantsDetected: applicableDefects.filter((row) => row.detected).length,
    mutantsSurviving: surviving.length,
    benignControls: rows.filter((row) => row.benignControl).length,
    benignFalsePositives: rows.filter((row) => row.falsePositive).length,
    replayedDetections: applicableDefects.filter((row) => row.replayed).length,
    minimizedDetections: applicableDefects.filter((row) => row.minimized).length,
    highConfidenceDetections: applicableDefects.filter((row) => row.highConfidence).length,
    scorePermille: applicableDefects.length === 0 ? 0 : Math.floor((applicableDefects.filter((row) => row.detected).length * 1000) / applicableDefects.length),
    survivingMutantIds: surviving.map((row) => row.fixtureId).sort(),
    survivingContractIds: [...new Set(surviving.map((row) => row.contractId))].sort(),
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}
