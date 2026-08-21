// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — cross-phase adversarial corpus
// type vocabulary.
//
// Shared types for the cross-phase adversarial scenario registry
// (./registry) and its data-only builder seam
// (corpus/phase15p/architecture/builders.ts). The vocabulary is DESCRIPTIVE
// ONLY: it names what each scenario asserts and where it belongs; it grants
// no execution, network, persistence, or authority capability.
//
// Pure type module: no imports, no runtime values except the frozen
// vocabulary arrays used for deterministic fail-closed membership checks.
// ---------------------------------------------------------------------------

/**
 * Cross-phase adversarial family tokens. The twenty roadmap families named
 * by the Phase 15P adversarial-corpus architecture, plus the three
 * marker-guard families whose whole corpus presence IS a standing owner
 * boundary: P6 (FROZEN_BY_OWNER data oracles), P11B / P13B (NOT_AUTHORIZED
 * contained-DEV acceptance gates).
 */
export type AdversarialPhaseFamily =
  | 'P1'
  | 'P2A'
  | 'P2B'
  | 'P2C'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6'
  | 'P7'
  | 'P7B'
  | 'P8'
  | 'P9A'
  | 'P9B'
  | 'P10'
  | 'P10B'
  | 'P11A'
  | 'P11B'
  | 'P12'
  | 'P13'
  | 'P13B'
  | 'P14'
  | 'P15'
  | 'P15P';

/** Canonical family order (registry insertion order; never renumbered). */
export const ADVERSARIAL_PHASE_FAMILIES: readonly AdversarialPhaseFamily[] = Object.freeze([
  'P1',
  'P2A',
  'P2B',
  'P2C',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P7B',
  'P8',
  'P9A',
  'P9B',
  'P10',
  'P10B',
  'P11A',
  'P11B',
  'P12',
  'P13',
  'P13B',
  'P14',
  'P15',
  'P15P',
]);

/**
 * What kind of property the scenario adversarially probes:
 * - FAIL_CLOSED: an illegal input/authority must be rejected before effect.
 * - TRUTHFUL_OUTCOME: reported status/evidence classes must match reality
 *   (no false certification, no silent downgrade).
 * - PRIVACY_SCREEN: sentinel-bearing or raw customer-shaped values are
 *   screened out and never emitted.
 * - DETERMINISM: repeated construction/serialization is byte-stable.
 */
export type AdversarialExpectationKind = 'FAIL_CLOSED' | 'TRUTHFUL_OUTCOME' | 'PRIVACY_SCREEN' | 'DETERMINISM';

/** Cross-phase domain tags used by coverage summaries. */
export type AdversarialScenarioDomain =
  | 'SAFETY_KERNEL'
  | 'JOURNEY_CONTAINMENT'
  | 'CHANGE_INTELLIGENCE'
  | 'EXPLORATION_BOUNDING'
  | 'CONFIRMATION_LADDER'
  | 'DATA_ORACLE_AUTHORITY'
  | 'CAMPAIGN_RUNTIME'
  | 'AI_REVIEW_AUTHORITY'
  | 'SELF_DEV_SANDBOX'
  | 'SEMANTIC_ORACLE'
  | 'REAL_SOURCE_ADMISSION'
  | 'DEV_ACCEPTANCE_GATE'
  | 'HIGH_CONFIDENCE_TRIAGE'
  | 'RUNTIME_COMPLETION'
  | 'MECHANICAL_CONTRACTS'
  | 'ADVERSARIAL_CORPUS';

/** Canonical domain order for deterministic coverage summaries. */
export const ADVERSARIAL_SCENARIO_DOMAINS: readonly AdversarialScenarioDomain[] = Object.freeze([
  'SAFETY_KERNEL',
  'JOURNEY_CONTAINMENT',
  'CHANGE_INTELLIGENCE',
  'EXPLORATION_BOUNDING',
  'CONFIRMATION_LADDER',
  'DATA_ORACLE_AUTHORITY',
  'CAMPAIGN_RUNTIME',
  'AI_REVIEW_AUTHORITY',
  'SELF_DEV_SANDBOX',
  'SEMANTIC_ORACLE',
  'REAL_SOURCE_ADMISSION',
  'DEV_ACCEPTANCE_GATE',
  'HIGH_CONFIDENCE_TRIAGE',
  'RUNTIME_COMPLETION',
  'MECHANICAL_CONTRACTS',
  'ADVERSARIAL_CORPUS',
]);

/**
 * Standing owner boundary carried by the definition, if any. Exactly one
 * catalog definition carries FROZEN_BY_OWNER (the Phase 6 data-oracle
 * boundary); the P11B / P13B gate definitions carry NOT_AUTHORIZED. A
 * marker NEVER authorizes execution — it records that the boundary must
 * stay closed and that probing it beyond synthetic structural checks is
 * itself out of scope.
 */
export type AdversarialScenarioMarker = 'FROZEN_BY_OWNER' | 'NOT_AUTHORIZED';

/**
 * One concrete cross-phase adversarial scenario definition. Ids follow
 * `AF-<family>-<nn>`, are permanent, and are never renumbered or moved
 * between families; new scenarios append.
 */
export interface AdversarialScenarioDefinition {
  /** Stable id, `AF-<family>-<two digits>` and upward. */
  readonly id: string;
  /** Owning cross-phase family token. */
  readonly phaseFamily: AdversarialPhaseFamily;
  /** Cross-phase domain tag used by coverage aggregation. */
  readonly domain: AdversarialScenarioDomain;
  /** One-line statement of the adversarially probed property. */
  readonly title: string;
  /**
   * Builder function id exported from
   * corpus/phase15p/architecture/builders.ts producing this scenario's
   * synthetic fixture payload, or null when the scenario is data-only at
   * this checkpoint (execution deferred to the hardening campaign).
   */
  readonly fixtureBuilderId: string | null;
  /** Kind of property asserted (see AdversarialExpectationKind). */
  readonly expectationKind: AdversarialExpectationKind;
  /** Standing owner boundary marker, when the definition IS a boundary. */
  readonly marker?: AdversarialScenarioMarker;
}
