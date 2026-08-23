// Phase 21 — privacy-safe finite-set membership projection.
//
// The allowed values are an ephemeral source-bound comparator input. They are
// tokenized in the caller-owned ProjectionContext and never appear in the
// returned DTO, digest input, exception detail, dossier, or graph. Only
// bounded semantic categories cross this boundary.

import type { ProjectionContext } from "../../oracles/projections/identity";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { resolvePathWithAmbiguity } from "../../oracles/invariants/paths";
import { safeSemanticDigest, type SafeSourceProvenance } from "./types";
import type { SafePath } from "./relational";

export const MEMBERSHIP_PROJECTION_VERSION = "nightwatch.semantic-membership-projection.v1" as const;
export const MAX_MEMBERSHIP_SET_SIZE = 64;
export const MAX_MEMBERSHIP_GROUPS = 16;

export type MembershipResult =
  | "NOT_APPLICABLE"
  | "ALL_ALLOWED"
  | "SOME_DISALLOWED"
  | "NONE_ALLOWED"
  | "EXACT_ALLOWED_SET"
  | "STRICT_SUBSET"
  | "SUPERSET_OR_UNKNOWN_MEMBER"
  | "MISSING"
  | "AMBIGUOUS"
  | "TRUNCATED"
  | "REQUIRED_MEMBER_PRESENT"
  | "MUTUALLY_EXCLUSIVE_HOLDS"
  | "MUTUALLY_EXCLUSIVE_VIOLATED";

export type MembershipMode = "ALL_ITEMS_ALLOWED" | "SET_RELATION" | "REQUIRED_MEMBER" | "MUTUALLY_EXCLUSIVE";

export interface SourceBoundMembershipContract {
  readonly contractId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  /** Optional fixed extractor evidence for the source enum/set structure. */
  readonly sourceValueSetDigest?: string;
  /** Ephemeral source-bound values. Never return or serialize this input. */
  readonly allowedValues: readonly string[];
  readonly mode: MembershipMode;
  readonly requiredValue?: string;
  readonly mutuallyExclusiveGroups?: readonly (readonly string[])[];
}

export interface MembershipEvaluation {
  readonly schemaVersion: typeof MEMBERSHIP_PROJECTION_VERSION;
  readonly contractId: string;
  readonly sourceEvidenceDigest: string;
  readonly mode: MembershipMode;
  readonly result: MembershipResult;
  readonly observedCardinalityClass: "NOT_APPLICABLE" | "EMPTY" | "SINGLE" | "SMALL" | "LARGE";
  readonly allowedCardinalityClass: "EMPTY" | "SINGLE" | "SMALL" | "LARGE";
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_MEMBERSHIP_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;
const SAFE_EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safePath(path: SafePath): void {
  if (!Array.isArray(path) || path.length === 0 || path.length > 16 || path.some((part) => !SAFE_PATH_RE.test(part) || FORBIDDEN_FIELD_NAMES.has(part))) invalid("PATH");
}

function safeContract(contract: SourceBoundMembershipContract): void {
  safeId(contract.contractId, "CONTRACT");
  if (!SAFE_EVIDENCE_RE.test(contract.sourceProvenance.evidenceDigest)) invalid("SOURCE_EVIDENCE");
  if (contract.sourceValueSetDigest !== undefined && !SAFE_EVIDENCE_RE.test(contract.sourceValueSetDigest)) invalid("SOURCE_VALUE_SET_EVIDENCE");
  if (!Array.isArray(contract.allowedValues) || contract.allowedValues.length > MAX_MEMBERSHIP_SET_SIZE) invalid("ALLOWED_SET_CAP");
  const values = new Set<string>();
  for (const value of contract.allowedValues) {
    if (typeof value !== "string" || value.length > 4096) invalid("ALLOWED_VALUE");
    if (values.has(value)) invalid("DUPLICATE_ALLOWED_VALUE");
    values.add(value);
  }
  if (contract.mode === "REQUIRED_MEMBER" && typeof contract.requiredValue !== "string") invalid("REQUIRED_VALUE");
  if (contract.mode === "MUTUALLY_EXCLUSIVE") {
    if (!Array.isArray(contract.mutuallyExclusiveGroups) || contract.mutuallyExclusiveGroups.length === 0 || contract.mutuallyExclusiveGroups.length > MAX_MEMBERSHIP_GROUPS) invalid("GROUPS");
    for (const group of contract.mutuallyExclusiveGroups) {
      if (!Array.isArray(group) || group.length === 0 || group.length > MAX_MEMBERSHIP_SET_SIZE) invalid("GROUP");
    }
  }
}

function cardinality(size: number): MembershipEvaluation["allowedCardinalityClass"] {
  if (size === 0) return "EMPTY";
  if (size === 1) return "SINGLE";
  return size <= 8 ? "SMALL" : "LARGE";
}

function observedCardinality(size: number): MembershipEvaluation["observedCardinalityClass"] {
  if (size === 0) return "EMPTY";
  if (size === 1) return "SINGLE";
  return size <= 8 ? "SMALL" : "LARGE";
}

function nodeAt(projection: SemanticProjection, path: SafePath): { readonly node: ProjectionNode | undefined; readonly ambiguous: boolean } {
  const resolved = resolvePathWithAmbiguity(projection.root, path);
  return { node: resolved.na ? undefined : resolved.node, ambiguous: resolved.na };
}

function stringTokens(node: ProjectionNode): { readonly tokens: ReadonlySet<string>; readonly scalar: boolean; readonly invalid: boolean; readonly truncated: boolean; readonly duplicate: boolean } {
  if (node.type === "STRING" && node.identityToken !== undefined) return { tokens: new Set([node.identityToken]), scalar: true, invalid: false, truncated: false, duplicate: false };
  if (node.type !== "ARRAY") return { tokens: new Set(), scalar: false, invalid: true, truncated: false, duplicate: false };
  if (node.arrayTruncated === true) return { tokens: new Set(), scalar: false, invalid: false, truncated: true, duplicate: false };
  const tokens = new Set<string>();
  let duplicate = false;
  for (const item of node.items ?? []) {
    if (item.type !== "STRING" || item.identityToken === undefined) return { tokens: new Set(), scalar: false, invalid: true, truncated: false, duplicate: false };
    if (tokens.has(item.identityToken)) duplicate = true;
    tokens.add(item.identityToken);
  }
  return { tokens, scalar: false, invalid: false, truncated: false, duplicate };
}

function resultForSet(input: {
  readonly mode: MembershipMode;
  readonly scalar: boolean;
  readonly observed: ReadonlySet<string>;
  readonly allowed: ReadonlySet<string>;
  readonly requiredToken?: string;
  readonly groups?: readonly (readonly string[])[];
}): MembershipResult {
  if (input.mode === "REQUIRED_MEMBER") return input.requiredToken !== undefined && input.observed.has(input.requiredToken) ? "REQUIRED_MEMBER_PRESENT" : "MISSING";
  if (input.mode === "MUTUALLY_EXCLUSIVE") {
    let presentGroups = 0;
    for (const group of input.groups ?? []) {
      if (group.some((token) => input.observed.has(token))) presentGroups += 1;
    }
    return presentGroups > 1 ? "MUTUALLY_EXCLUSIVE_VIOLATED" : "MUTUALLY_EXCLUSIVE_HOLDS";
  }
  let allowedObserved = 0;
  for (const token of input.observed) if (input.allowed.has(token)) allowedObserved += 1;
  const disallowed = input.observed.size - allowedObserved;
  if (input.scalar) return allowedObserved === 1 ? "ALL_ALLOWED" : "NONE_ALLOWED";
  if (input.mode === "ALL_ITEMS_ALLOWED") {
    if (input.observed.size === 0 || allowedObserved === 0) return "NONE_ALLOWED";
    return disallowed === 0 ? "ALL_ALLOWED" : "SOME_DISALLOWED";
  }
  if (input.observed.size === 0 || allowedObserved === 0) return "NONE_ALLOWED";
  if (disallowed > 0 && allowedObserved === input.allowed.size) return "SUPERSET_OR_UNKNOWN_MEMBER";
  if (disallowed > 0) return "SOME_DISALLOWED";
  if (allowedObserved === input.allowed.size) return "EXACT_ALLOWED_SET";
  return "STRICT_SUBSET";
}

/**
 * Evaluate a source-bound finite membership contract over a sanitized
 * projection. Raw observed/source values are never returned or included in a
 * digest. The shared ProjectionContext is the only in-memory correlation
 * boundary.
 */
export function evaluateSourceBoundMembership(input: {
  readonly projection: SemanticProjection;
  readonly ctx: ProjectionContext;
  readonly path: SafePath;
  readonly contract: SourceBoundMembershipContract;
}): MembershipEvaluation {
  safePath(input.path);
  safeContract(input.contract);
  const located = nodeAt(input.projection, input.path);
  const allowedCardinalityClass = cardinality(input.contract.allowedValues.length);
  const base = {
    schemaVersion: MEMBERSHIP_PROJECTION_VERSION,
    contractId: input.contract.contractId,
    sourceEvidenceDigest: input.contract.sourceProvenance.evidenceDigest,
    mode: input.contract.mode,
  } as const;
  const output = (result: MembershipResult, observedCardinalityClass: MembershipEvaluation["observedCardinalityClass"]): MembershipEvaluation => {
    const core = { ...base, result, observedCardinalityClass, allowedCardinalityClass };
    return { ...core, deterministicDigest: safeSemanticDigest(core, "membership") };
  };
  if (located.ambiguous) return output("AMBIGUOUS", "NOT_APPLICABLE");
  if (located.node === undefined) return output("MISSING", "NOT_APPLICABLE");
  const tokens = stringTokens(located.node);
  if (tokens.truncated) return output("TRUNCATED", "LARGE");
  if (tokens.invalid) return output("NOT_APPLICABLE", "NOT_APPLICABLE");
  if (tokens.duplicate) return output("AMBIGUOUS", observedCardinality(tokens.tokens.size));
  const allowed = new Set(input.contract.allowedValues.map((value) => input.ctx.tokenForString(value)));
  const observedClass = tokens.scalar ? "SINGLE" : observedCardinality(tokens.tokens.size);
  const requiredToken = input.contract.requiredValue === undefined ? undefined : input.ctx.tokenForString(input.contract.requiredValue);
  const groups = input.contract.mutuallyExclusiveGroups?.map((group) => group.map((value) => input.ctx.tokenForString(value)));
  return output(resultForSet({ mode: input.contract.mode, scalar: tokens.scalar, observed: tokens.tokens, allowed, requiredToken, groups }), observedClass);
}
