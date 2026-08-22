// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — versioned campaign portfolio model (WORKSTREAM W1).
//
// A pure, deterministic, private/local DTO layer describing WHICH already-
// approved read-only Nightwatch targets/journeys deserve campaign budget,
// why, and in what order. The portfolio NEVER grants authority: it plans
// strictly inside the already-approved universe and encodes blockers
// explicitly as hard gates (never merely negative score weights).
//
// Hard requirements (SPEC W1 + ACCEPTANCE MATRIX A):
//   - members restricted to caller-supplied approved/read-only target
//     universe (unauthorized target => fail closed);
//   - every member carries deterministic identity + provenance/currentness;
//   - unknown/stale/unavailable authority-critical evidence fails closed;
//   - duplicate pressure computed centrally, never increases novelty;
//   - sanitized evidence only (sentinel rejection, categorical codes);
//   - strict parsers with exact-key enforcement;
//   - canonical serialization/digest reuses the campaign identity helpers
//     (single serialization authority; no parallel digest system).
//
// Reused hardened vocabularies (no competing systems):
//   - currentness: LocalReadinessCurrentness values (readiness/types.ts);
//   - semantic depth: DepthClass (oracles/expectations/coverageInventory.ts);
//   - owner blockers: decideOwnerScope / OWNER_POLICY_BLOCKED
//     (policy/ownerScope.ts);
//   - journeys: JourneyId (changeIntelligence/types.ts).
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import { containsAnySentinel } from "../../oracles/expectations/extract/analyzer";
import type { DepthClass } from "../../oracles/expectations/coverageInventory";
import type { LocalReadinessCurrentness } from "../readiness/types";
import type { JourneyId } from "../changeIntelligence/types";
import {
  REDACTED_ERROR_DETAIL,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  requireRuntimeArray,
  requireRuntimeRecord,
} from "../campaign/runtimeValidation";
import { campaignDigest } from "../campaign/identity";

/** Manifest identity version. A mismatch makes two portfolios incomparable. */
export const PORTFOLIO_SCHEMA_VERSION =
  "nightwatch.campaign-portfolio.private.v1" as const;

/**
 * Bounded member kinds. Deliberately a subset of CampaignWorkKind: a
 * portfolio plans observation/read work only; reproduction/minimization
 * budgets belong to the separately authorized runtime campaign.
 */
export const PORTFOLIO_MEMBER_KINDS = [
  "JOURNEY",
  "API",
  "EXPLORATION",
] as const;
export type PortfolioMemberKind = (typeof PORTFOLIO_MEMBER_KINDS)[number];

/** Execution cost classes (categorical; mapped to unit costs by the allocator). */
export const PORTFOLIO_COST_CLASSES = ["LOW", "MEDIUM", "HIGH"] as const;
export type PortfolioCostClass = (typeof PORTFOLIO_COST_CLASSES)[number];

/** Bounded starvation-age buckets (mechanical aging input, not wall-clock). */
export const PORTFOLIO_STARVATION_MAX_BUCKETS = 8;

/** Upper bound for any single sanitized yield counter (nonsense guard). */
export const PORTFOLIO_YIELD_COUNTER_MAX = 100_000;

/**
 * Sanitized historical/synthetic yield counters for one member. Raw customer/
 * product values can never appear here: the shape is integers only, and the
 * counters describe Nightwatch's own prior local/synthetic campaign evidence.
 */
export interface PortfolioYieldCounters {
  /** Anomaly candidates admitted by the lifecycle gate. */
  readonly admittedCount: number;
  /** Candidates whose fresh-context reproduction succeeded. */
  readonly reproducedCount: number;
  /** Candidates reduced by the failure minimizer. */
  readonly minimizedCount: number;
  /** Distinct semantic clusters observed (duplicate-suppressed view). */
  readonly distinctClusterCount: number;
  /** Candidates reaching DOSSIER_READY. */
  readonly dossierReadyCount: number;
  /** Observations merged into existing clusters as duplicates. */
  readonly duplicateMerges: number;
  /** Invalid/transient outcomes (not findings). */
  readonly invalidOrTransient: number;
  /** Total bounded executions historically spent on this member. */
  readonly executionsTotal: number;
}

export const EMPTY_PORTFOLIO_YIELD: PortfolioYieldCounters = Object.freeze({
  admittedCount: 0,
  reproducedCount: 0,
  minimizedCount: 0,
  distinctClusterCount: 0,
  dossierReadyCount: 0,
  duplicateMerges: 0,
  invalidOrTransient: 0,
  executionsTotal: 0,
});

/**
 * Construction input for one portfolio member. Everything is caller-
 * supplied and sanitized; this module owns normalization and validation.
 */
export interface PortfolioMemberInput {
  /** Already-approved read-only target id (must be in the approved universe). */
  readonly targetId: string;
  /** Optional linked approved journey id (null for pure API/exploration members). */
  readonly journeyId: JourneyId | null;
  readonly kind: PortfolioMemberKind;
  /**
   * Normalized semantic/contract scope key (part of member identity).
   * Categorical token, e.g. 'exchange-rate.read'. Two members sharing a
   * semantic scope exert duplicate pressure on each other.
   */
  readonly semanticScope: string;
  readonly currentness: LocalReadinessCurrentness;
  /** Provenance/currentness evidence: current source SHA (or null). */
  readonly sourceSha: string | null;
  /** Normalized source-evidence digest (`ev:sha256:<24>`) or null. */
  readonly evidenceDigest: string | null;
  readonly derivationVersion: string | null;
  readonly contractVersion: string | null;
  /** Semantic-contract depth class (reused DepthClass vocabulary). */
  readonly depthClass: DepthClass;
  /** Whether deterministic replay of this member is supported. */
  readonly replayable: boolean;
  readonly executionCostClass: PortfolioCostClass;
  /** Mechanical starvation age in bounded buckets (0..PORTFOLIO_STARVATION_MAX_BUCKETS). */
  readonly starvationAgeBuckets: number;
  /** Sanitized prior local/synthetic yield evidence for this member. */
  readonly historicalYield: PortfolioYieldCounters;
  /**
   * Owner-policy blocked operation codes attached to this member (categorical
   * codes validated through decideOwnerScope semantics). Non-empty => the
   * member is a hard gate block, not a low score.
   */
  readonly ownerBlockedOperations: readonly string[];
  /**
   * True when the member belongs to a frozen program boundary (e.g. the
   * Phase-6 frozen surface). Frozen members are unselectable hard gates.
   */
  readonly phaseFrozen: boolean;
}

/**
 * Normalized portfolio member. `memberId` derives from stable authorized
 * target/journey identity plus normalized semantic scope ONLY (never from
 * timestamps or raw source SHA alone), so SHA-only movement keeps identity —
 * and therefore comparability — stable.
 */
export interface PortfolioMember {
  readonly memberId: string;
  readonly input: PortfolioMemberInput;
  /** Number of OTHER members sharing this member's normalized semanticScope. */
  readonly duplicatePressure: number;
}

/** The versioned portfolio container. */
export interface CampaignPortfolio {
  readonly schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION;
  /** Sorted unique copy of the authorized universe (authority proof). */
  readonly approvedTargets: readonly string[];
  /** Members sorted by memberId (deterministic order). */
  readonly members: readonly PortfolioMember[];
  /** `pf:sha256:<24>` over the canonical serialization above. */
  readonly portfolioDigest: string;
}

// ---------------------------------------------------------------------------
// Error vocabulary (categorical codes only; details redacted).
// ---------------------------------------------------------------------------

export const PORTFOLIO_ERROR_PREFIX = "PORTFOLIO_";
export const ERR_PORTFOLIO_INVALID_DOCUMENT = "PORTFOLIO_INVALID_DOCUMENT";
export const ERR_PORTFOLIO_UNKNOWN_FIELD = "PORTFOLIO_UNKNOWN_FIELD";
export const ERR_PORTFOLIO_UNAUTHORIZED_TARGET =
  "PORTFOLIO_UNAUTHORIZED_TARGET";
export const ERR_PORTFOLIO_DUPLICATE_MEMBER_IDENTITY =
  "PORTFOLIO_DUPLICATE_MEMBER_IDENTITY";
export const ERR_PORTFOLIO_FIELD_INVALID = "PORTFOLIO_FIELD_INVALID";
export const ERR_PORTFOLIO_SENTINEL_REJECTED = "PORTFOLIO_SENTINEL_REJECTED";
export const ERR_PORTFOLIO_EMPTY_APPROVED_TARGETS =
  "PORTFOLIO_EMPTY_APPROVED_TARGETS";

function portfolioFieldError(field: string): string {
  return `${ERR_PORTFOLIO_FIELD_INVALID}:${field}:${REDACTED_ERROR_DETAIL}`;
}

/**
 * Portfolio-local privacy screen: the analyzer sentinel vocabulary PLUS the
 * lifecycle-style structural sentinels (customer/account/email/cost/token,
 * JWT/AKIA/private-key shapes) used by the hardened campaign layers.
 */
const PORTFOLIO_SENTINEL_RE =
  /(?:PRIVACY_SENTINEL|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

/** Sentinel-bearing text never enters a portfolio (privacy contract A/D). */
export function portfolioTextSafe(value: string): boolean {
  return !PORTFOLIO_SENTINEL_RE.test(value) && !containsAnySentinel(value);
}

const MEMBER_ID_PATTERN = /^pm:sha256:[0-9a-f]{24}$/;

export function isPortfolioMemberId(value: string): boolean {
  return MEMBER_ID_PATTERN.test(value);
}

/** Deterministic member identity (stable target/journey/scope triple). */
export function portfolioMemberId(
  input: Pick<
    PortfolioMemberInput,
    "targetId" | "journeyId" | "kind" | "semanticScope"
  >,
): string {
  return `pm:sha256:${campaignDigest({
    identityVersion: PORTFOLIO_SCHEMA_VERSION,
    targetId: input.targetId,
    journeyId: input.journeyId,
    kind: input.kind,
    semanticScope: input.semanticScope,
  }).slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// Strict validation helpers.
// ---------------------------------------------------------------------------

function assertSafeString(
  value: unknown,
  field: string,
): asserts value is string {
  assertString(value, portfolioFieldError(field));
  if (!portfolioTextSafe(value))
    throw new Error(
      `${ERR_PORTFOLIO_SENTINEL_REJECTED}:${field}:${REDACTED_ERROR_DETAIL}`,
    );
}

function assertOptionalSafeStringOrNull(
  value: unknown,
  field: string,
): asserts value is string | null {
  if (value === null) return;
  assertOptionalSafeStringOrNullInner(value, field);
}

function assertOptionalSafeStringOrNullInner(
  value: unknown,
  field: string,
): void {
  assertString(value, portfolioFieldError(field));
  if (!portfolioTextSafe(value))
    throw new Error(
      `${ERR_PORTFOLIO_SENTINEL_REJECTED}:${field}:${REDACTED_ERROR_DETAIL}`,
    );
}

function assertCounter(value: unknown, field: string): asserts value is number {
  assertNonNegativeInteger(value, portfolioFieldError(field));
  if (value > PORTFOLIO_YIELD_COUNTER_MAX)
    throw new Error(portfolioFieldError(field));
}

function assertEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): asserts value is T {
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw new Error(portfolioFieldError(field));
  }
}

const MEMBER_INPUT_KEYS = [
  "targetId",
  "journeyId",
  "kind",
  "semanticScope",
  "currentness",
  "sourceSha",
  "evidenceDigest",
  "derivationVersion",
  "contractVersion",
  "depthClass",
  "replayable",
  "executionCostClass",
  "starvationAgeBuckets",
  "historicalYield",
  "ownerBlockedOperations",
  "phaseFrozen",
] as const;

const YIELD_KEYS = [
  "admittedCount",
  "reproducedCount",
  "minimizedCount",
  "distinctClusterCount",
  "dossierReadyCount",
  "duplicateMerges",
  "invalidOrTransient",
  "executionsTotal",
] as const;

const CURRENTNESS_VALUES: readonly LocalReadinessCurrentness[] = [
  "CURRENT",
  "STALE",
  "SOURCE_UNAVAILABLE",
  "NOT_EVALUATED",
];
/** Public for the strict plan-manifest parser (single depth vocabulary). */
export const PORTFOLIO_DEPTH_CLASSES: readonly DepthClass[] = [
  "SHAPE",
  "TYPE",
  "COLLECTION",
  "NONE",
  "SHAPE_COLLECTION",
  "TYPE_COLLECTION",
];

/**
 * Strict structural validator for one member input. Accepts already-typed
 * values (identity-checked) and unknown records (tooling parse path) alike.
 */
export function validatePortfolioMemberInput(
  value: unknown,
): asserts value is PortfolioMemberInput {
  const record = requireRuntimeRecord(value, ERR_PORTFOLIO_INVALID_DOCUMENT);
  assertExactKeys(record, MEMBER_INPUT_KEYS, ERR_PORTFOLIO_UNKNOWN_FIELD);

  assertSafeString(record.targetId, "targetId");
  if (record.journeyId !== null)
    assertSafeString(record.journeyId, "journeyId");
  assertEnumValue(record.kind, PORTFOLIO_MEMBER_KINDS, "kind");
  assertSafeString(record.semanticScope, "semanticScope");
  if (!/^[a-z0-9][a-z0-9._:/-]{0,127}$/.test(record.semanticScope))
    throw new Error(portfolioFieldError("semanticScope"));
  assertEnumValue(record.currentness, CURRENTNESS_VALUES, "currentness");
  assertOptionalSafeStringOrNull(record.sourceSha, "sourceSha");
  assertOptionalSafeStringOrNull(record.evidenceDigest, "evidenceDigest");
  if (
    record.evidenceDigest !== null &&
    !/^ev:sha256:[0-9a-f]{24}$/.test(record.evidenceDigest)
  ) {
    throw new Error(portfolioFieldError("evidenceDigest"));
  }
  assertOptionalSafeStringOrNull(record.derivationVersion, "derivationVersion");
  assertOptionalSafeStringOrNull(record.contractVersion, "contractVersion");
  assertEnumValue(record.depthClass, PORTFOLIO_DEPTH_CLASSES, "depthClass");
  if (typeof record.replayable !== "boolean")
    throw new Error(portfolioFieldError("replayable"));
  assertEnumValue(
    record.executionCostClass,
    PORTFOLIO_COST_CLASSES,
    "executionCostClass",
  );
  assertNonNegativeInteger(
    record.starvationAgeBuckets,
    portfolioFieldError("starvationAgeBuckets"),
  );
  if (record.starvationAgeBuckets > PORTFOLIO_STARVATION_MAX_BUCKETS)
    throw new Error(portfolioFieldError("starvationAgeBuckets"));

  const y = requireRuntimeRecord(
    record.historicalYield,
    ERR_PORTFOLIO_INVALID_DOCUMENT,
  );
  assertExactKeys(y, YIELD_KEYS, ERR_PORTFOLIO_UNKNOWN_FIELD);
  for (const key of YIELD_KEYS) assertCounter(y[key], `historicalYield.${key}`);

  const blockers = requireRuntimeArray(
    record.ownerBlockedOperations,
    ERR_PORTFOLIO_INVALID_DOCUMENT,
  );
  for (const blocker of blockers) {
    assertSafeString(blocker, "ownerBlockedOperations");
    if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(blocker))
      throw new Error(portfolioFieldError("ownerBlockedOperations"));
  }
  if (typeof record.phaseFrozen !== "boolean")
    throw new Error(portfolioFieldError("phaseFrozen"));
}

/**
 * Build the versioned portfolio. Fails closed on: unauthorized target ids,
 * duplicate member identities, sentinel-bearing text, and structural drift.
 *
 * Duplicate pressure is computed centrally here so downstream scoring can
 * treat it as a monotone suppressor (it can never increase novelty).
 */
export function buildPortfolio(input: {
  readonly approvedTargets: readonly string[];
  readonly memberInputs: readonly PortfolioMemberInput[];
}): CampaignPortfolio {
  const approved = [...input.approvedTargets];
  if (approved.length === 0)
    throw new Error(ERR_PORTFOLIO_EMPTY_APPROVED_TARGETS);
  for (const target of approved) {
    assertSafeString(target, "approvedTargets");
  }
  const approvedSet = new Set(approved);
  if (approvedSet.size !== approved.length) {
    throw new Error(
      `${ERR_PORTFOLIO_DUPLICATE_MEMBER_IDENTITY}:approvedTargets`,
    );
  }

  const pressureByScope = new Map<string, number>();
  for (const memberInput of input.memberInputs) {
    validatePortfolioMemberInput(memberInput);
    if (!approvedSet.has(memberInput.targetId)) {
      throw new Error(
        `${ERR_PORTFOLIO_UNAUTHORIZED_TARGET}:${REDACTED_ERROR_DETAIL}`,
      );
    }
    pressureByScope.set(
      memberInput.semanticScope,
      (pressureByScope.get(memberInput.semanticScope) ?? 0) + 1,
    );
  }

  const seen = new Set<string>();
  const members: PortfolioMember[] = input.memberInputs.map((memberInput) => {
    const memberId = portfolioMemberId(memberInput);
    if (seen.has(memberId))
      throw new Error(`${ERR_PORTFOLIO_DUPLICATE_MEMBER_IDENTITY}:memberId`);
    seen.add(memberId);
    return {
      memberId,
      input: memberInput,
      // Other members with the same normalized scope.
      duplicatePressure:
        (pressureByScope.get(memberInput.semanticScope) ?? 1) - 1,
    };
  });
  members.sort((left, right) => left.memberId.localeCompare(right.memberId));

  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    approvedTargets: [...approvedSet].sort((left, right) =>
      left.localeCompare(right),
    ),
    members,
    portfolioDigest: `pf:sha256:${campaignDigest({
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
      approvedTargets: [...approvedSet].sort((left, right) =>
        left.localeCompare(right),
      ),
      members: members.map((member) => ({
        memberId: member.memberId,
        input: member.input,
        duplicatePressure: member.duplicatePressure,
      })),
    }).slice(0, 24)}`,
  };
}

/** Canonical digest helper shared by scoring/allocation/manifest layers. */
export function portfolioDigestOf(value: unknown): string {
  return `sha256:${campaignDigest(value).slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// Tooling parse path (W8): strict JSON document parsing.
// ---------------------------------------------------------------------------

/** Parse a portfolio document produced by renderers/CLIs. Fail closed. */
export function parsePortfolioDocument(value: unknown): CampaignPortfolio {
  const record = requireRuntimeRecord(value, ERR_PORTFOLIO_INVALID_DOCUMENT);
  assertExactKeys(
    record,
    ["schemaVersion", "approvedTargets", "members", "portfolioDigest"],
    ERR_PORTFOLIO_UNKNOWN_FIELD,
  );
  if (record.schemaVersion !== PORTFOLIO_SCHEMA_VERSION) {
    throw new Error(`${ERR_PORTFOLIO_INVALID_DOCUMENT}:schemaVersion`);
  }
  const approved = requireRuntimeArray(
    record.approvedTargets,
    ERR_PORTFOLIO_INVALID_DOCUMENT,
  ).map((entry) => {
    assertSafeString(entry, "approvedTargets");
    return entry;
  });
  const rawMembers = requireRuntimeArray(
    record.members,
    ERR_PORTFOLIO_INVALID_DOCUMENT,
  );
  const memberInputs: PortfolioMemberInput[] = rawMembers.map((raw) => {
    const memberRecord = requireRuntimeRecord(
      raw,
      ERR_PORTFOLIO_INVALID_DOCUMENT,
    );
    assertExactKeys(
      memberRecord,
      ["memberId", "input", "duplicatePressure"],
      ERR_PORTFOLIO_UNKNOWN_FIELD,
    );
    assertSafeString(memberRecord.memberId, "memberId");
    if (!isPortfolioMemberId(memberRecord.memberId))
      throw new Error(portfolioFieldError("memberId"));
    validatePortfolioMemberInput(memberRecord.input);
    return memberRecord.input;
  });
  const rebuilt = buildPortfolio({ approvedTargets: approved, memberInputs });
  if (record.portfolioDigest !== rebuilt.portfolioDigest) {
    throw new Error(`${ERR_PORTFOLIO_INVALID_DOCUMENT}:portfolioDigest`);
  }
  return rebuilt;
}
