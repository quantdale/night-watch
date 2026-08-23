// ---------------------------------------------------------------------------
// Nightwatch canonical real-campaign runtime profile.
//
// Single source of truth for WHICH already-approved read-only Ripple targets
// have an existing Phase-7 campaign runtime work-item binding, and how those
// identities link together:
//
//   target (read operation id) <-> journey <-> exploration envelope <-> seed
//
// Before Phase 16C this linkage knowledge was duplicated in private tables:
// `API_BY_JOURNEY`/`ENVELOPE_BY_JOURNEY`/`DEFAULT_SEEDS` (campaign/selection.ts)
// and `REAL_OPERATION_IDS`/`REAL_SEEDS` (tests/manual/phase7-real-campaign.ts).
// This module converges them; the former definitions now derive from here so
// they can never drift apart silently. Mirror assertions live in
// tests/unit/phase16cRealUniverse.test.ts (envelopes, Phase-5 catalog safety,
// journey ids, recipe registry).
//
// This module adds NO authority: it names existing approved read-only
// identities only. Pure data module: no fs/network/child-process/browser/AI/
// DB/persistence, no wall clock, no randomness.
// ---------------------------------------------------------------------------

import type { JourneyId } from '../changeIntelligence/types';

/** Runtime-profile identity version. */
export const RUNTIME_PROFILE_VERSION =
  'nightwatch.campaign-runtime-profile.v1' as const;

/** One canonical runtime work-item lineage (already-approved, read-only). */
export interface RealRuntimeLinkage {
  /** Approved Phase-5 read operation id (the canonical target identity). */
  readonly apiOperationId: string;
  /** Approved trusted-canary journey anchoring the target. */
  readonly journeyId: JourneyId;
  /** Approved Phase-4 exploration envelope anchored on the journey. */
  readonly envelopeId: string;
  /** Fixed deterministic exploration seed for the envelope. */
  readonly seed: string;
}

/**
 * The complete current real runtime linkage set, in canonical
 * RIPPLE_JOURNEY_IDS order. Every entry must resolve mechanically to existing
 * campaign work-item identities (`journey:<id>`, `api:<op>`,
 * `explore:<envelope>:<seed>`); mirror-asserted against the canonical
 * registries by tests.
 */
export const REAL_RUNTIME_LINKAGE: readonly RealRuntimeLinkage[] = [
  {
    apiOperationId: 'ripple.payer-exchange.read',
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    seed: '0x0000000000000101',
  },
  {
    apiOperationId: 'ripple.common-exchange.read',
    journeyId: 'ripple-common-exchange-read',
    envelopeId: 'E2-J2-common-exchange',
    seed: '0x0000000000000201',
  },
  {
    apiOperationId: 'ripple.account-inventory.read',
    journeyId: 'ripple-account-inventory',
    envelopeId: 'E3-J3-account-inventory',
    seed: '0x0000000000000301',
  },
];

/** Canonical real target ids (sorted unique read-operation identities). */
export const REAL_RUNTIME_TARGET_IDS: readonly string[] = [
  ...new Set(REAL_RUNTIME_LINKAGE.map((entry) => entry.apiOperationId)),
].sort((left, right) => left.localeCompare(right));

/** Canonical real seeds (linkage order). */
export const REAL_RUNTIME_SEEDS: readonly string[] = REAL_RUNTIME_LINKAGE.map(
  (entry) => entry.seed,
);

/** Canonical journey->operation map derived from the linkage table. */
export const API_BY_JOURNEY: Readonly<Record<JourneyId, readonly string[]>> =
  Object.fromEntries(
    REAL_RUNTIME_LINKAGE.map((entry) => [entry.journeyId, [entry.apiOperationId]]),
  ) as unknown as Readonly<Record<JourneyId, readonly string[]>>;

/** Canonical journey->envelope map derived from the linkage table. */
export const ENVELOPE_BY_JOURNEY: Readonly<Record<JourneyId, string>> =
  Object.fromEntries(
    REAL_RUNTIME_LINKAGE.map((entry) => [entry.journeyId, entry.envelopeId]),
  ) as unknown as Readonly<Record<JourneyId, string>>;

/** Look up one linkage entry by journey id; undefined when unknown. */
export function runtimeLinkageForJourney(
  journeyId: JourneyId,
): RealRuntimeLinkage | undefined {
  return REAL_RUNTIME_LINKAGE.find((entry) => entry.journeyId === journeyId);
}

/** Look up one linkage entry by target id; undefined when unknown. */
export function runtimeLinkageForTarget(
  targetId: string,
): RealRuntimeLinkage | undefined {
  return REAL_RUNTIME_LINKAGE.find((entry) => entry.apiOperationId === targetId);
}
