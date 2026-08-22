// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — cross-phase adversarial
// scenario registry.
//
// Frozen catalog of concrete adversarial scenario definitions spanning every
// roadmap family P1..P15P plus the marker-guard families P6 / P11B / P13B.
// Each definition names ONE probed property; ids are permanent
// (`AF-<family>-<nn>`), never renumbered, never moved between families; new
// scenarios append. Exactly one catalog-wide FROZEN_BY_OWNER marker exists
// (Phase 6 data-oracle boundary); P11B and P13B carry NOT_AUTHORIZED markers
// (their contained-DEV acceptance gates stay closed absent separate owner
// authorization). A marker never authorizes anything.
//
// Pure data module: no fs, no network, no environment access, no timestamps,
// no execution. Coverage aggregation is deterministic (canonical orders).
// ---------------------------------------------------------------------------

import type {
  AdversarialPhaseFamily,
  AdversarialScenarioDefinition,
  AdversarialScenarioDomain,
} from './types';
import { ADVERSARIAL_PHASE_FAMILIES, ADVERSARIAL_SCENARIO_DOMAINS } from './types';

export const ADVERSARIAL_CORPUS_REGISTRY_VERSION = 'nightwatch.adversarial-corpus-registry.v1' as const;

/** Builder ids exported by corpus/phase15p/architecture/builders.ts. */
const B_LIFECYCLE = 'lifecycleTransitionSequence' as const;
const B_CLUSTERED = 'clusteredObservationPayload' as const;
const B_MOVEMENT_PAIR = 'movementObservationPair' as const;
const B_MOVEMENT_CLASSIFIED = 'classifiedMovementPair' as const;
const B_VOCABULARY = 'vocabularyAdapterSample' as const;
const B_ARTIFACTS = 'artifactKindPayloads' as const;
const B_SNAPSHOT_DELTA = 'snapshotDeltaPair' as const;

export const ADVERSARIAL_SCENARIO_DEFINITIONS: readonly AdversarialScenarioDefinition[] = Object.freeze([
  // --- P1 — scaffold, safety kernel, passive Ripple observer ---------------
  { id: 'AF-P1-01', phaseFamily: 'P1', domain: 'SAFETY_KERNEL', title: 'safety kernel rejects uncontained egress destinations before any browser action', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P1-02', phaseFamily: 'P1', domain: 'JOURNEY_CONTAINMENT', title: 'passive observer records observed route classes without mutating page state', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P1-03', phaseFamily: 'P1', domain: 'SAFETY_KERNEL', title: 'kernel startup fails closed when containment configuration is structurally invalid', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },

  // --- P2A — controlled authenticated landing observation ------------------
  { id: 'AF-P2A-01', phaseFamily: 'P2A', domain: 'JOURNEY_CONTAINMENT', title: 'landing observation classifies only approved structural states', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P2A-02', phaseFamily: 'P2A', domain: 'JOURNEY_CONTAINMENT', title: 'captured landing evidence screens sentinel-bearing values before persistence', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },
  { id: 'AF-P2A-03', phaseFamily: 'P2A', domain: 'JOURNEY_CONTAINMENT', title: 're-observing an unchanged landing produces byte-stable sanitized captures', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P2B — deterministic read-only journeys -------------------------------
  { id: 'AF-P2B-01', phaseFamily: 'P2B', domain: 'JOURNEY_CONTAINMENT', title: 'journey steps stay read-only; any write-shaped step is rejected pre-executor', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P2B-02', phaseFamily: 'P2B', domain: 'JOURNEY_CONTAINMENT', title: 'journey outcome classes reflect observed evidence, never assumed success', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P2B-03', phaseFamily: 'P2B', domain: 'JOURNEY_CONTAINMENT', title: 'identical journey runs yield identical digests across repetitions', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P2C — replay/oracle evidence journeys --------------------------------
  { id: 'AF-P2C-01', phaseFamily: 'P2C', domain: 'JOURNEY_CONTAINMENT', title: 'replay evidence is bound to its producing journey run identity', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P2C-02', phaseFamily: 'P2C', domain: 'JOURNEY_CONTAINMENT', title: 'oracle evidence classes separate observed failure from inferred failure', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P2C-03', phaseFamily: 'P2C', domain: 'JOURNEY_CONTAINMENT', title: 'replayed oracle evidence serializes deterministically for comparison', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P3 — change intelligence ----------------------------------------------
  { id: 'AF-P3-01', phaseFamily: 'P3', domain: 'CHANGE_INTELLIGENCE', title: 'change reports classify only evidenced changes; unknown change kinds fail closed', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P3-02', phaseFamily: 'P3', domain: 'CHANGE_INTELLIGENCE', title: 'change relevance classes match actual repository movement', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P3-03', phaseFamily: 'P3', domain: 'CHANGE_INTELLIGENCE', title: 'change report ordering is deterministic for identical inputs', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P4 — bounded generative/model exploration -----------------------------
  { id: 'AF-P4-01', phaseFamily: 'P4', domain: 'EXPLORATION_BOUNDING', title: 'exploration actions outside the approved catalog are rejected before execution', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P4-02', phaseFamily: 'P4', domain: 'EXPLORATION_BOUNDING', title: 'model-proposed actions carry provenance and are never auto-trusted', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P4-03', phaseFamily: 'P4', domain: 'EXPLORATION_BOUNDING', title: 'bounded exploration plans serialize identically across regenerations', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P5 — API/oops integration and confirmation ladder ---------------------
  { id: 'AF-P5-01', phaseFamily: 'P5', domain: 'CONFIRMATION_LADDER', title: 'confirmation ladder refuses promotion without reproduced confirmation evidence', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P5-02', phaseFamily: 'P5', domain: 'CONFIRMATION_LADDER', title: 'ladder step verdicts distinguish confirmed from unconfirmed signals truthfully', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P5-03', phaseFamily: 'P5', domain: 'CONFIRMATION_LADDER', title: 'integrated API payloads are privacy-screened before ladder evidence storage', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },

  // --- P6 — read-only data oracles: THE frozen owner boundary ----------------
  { id: 'AF-P6-01', phaseFamily: 'P6', domain: 'DATA_ORACLE_AUTHORITY', title: 'the Phase 6 real-query data-oracle path stays quarantined behind executable owner policy at every probe', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED', marker: 'FROZEN_BY_OWNER' },

  // --- P7 — private autonomous nightly campaigns -----------------------------
  { id: 'AF-P7-01', phaseFamily: 'P7', domain: 'CAMPAIGN_RUNTIME', title: 'campaign launch against a production-classified environment fails closed', fixtureBuilderId: B_LIFECYCLE, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P7-02', phaseFamily: 'P7', domain: 'CAMPAIGN_RUNTIME', title: 'candidate lifecycle progressions record exact transition counts with no invented edges', fixtureBuilderId: B_LIFECYCLE, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P7-03', phaseFamily: 'P7', domain: 'CAMPAIGN_RUNTIME', title: 'campaign findings stay in owner-only local storage and screen sentinels en route', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },

  // --- P7B — private AI review assistance ------------------------------------
  { id: 'AF-P7B-01', phaseFamily: 'P7B', domain: 'AI_REVIEW_AUTHORITY', title: 'AI review output can never satisfy an oracle or gate by itself', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P7B-02', phaseFamily: 'P7B', domain: 'AI_REVIEW_AUTHORITY', title: 'AI review verdicts are labeled advisory and never merged into evidence classes', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P7B-03', phaseFamily: 'P7B', domain: 'AI_REVIEW_AUTHORITY', title: 'review request/response payloads denylist sentinel-bearing content', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },

  // --- P8 — evaluated self-development sandbox --------------------------------
  { id: 'AF-P8-01', phaseFamily: 'P8', domain: 'SELF_DEV_SANDBOX', title: 'canonical promotion requires fresh owner authorization and one bounded APPLY', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P8-02', phaseFamily: 'P8', domain: 'SELF_DEV_SANDBOX', title: 'evaluation provenance is content-bound; replayed results must re-verify', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P8-03', phaseFamily: 'P8', domain: 'SELF_DEV_SANDBOX', title: 'adopted-case catalog entries render deterministically through the canonical renderer', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P9A — real-source expectation admission ---------------------------------
  { id: 'AF-P9A-01', phaseFamily: 'P9A', domain: 'REAL_SOURCE_ADMISSION', title: 'an expectation without mechanically verified derivation evidence is rejected (REAL_SOURCE_EXPECTATION_PROOF_MISSING semantics)', fixtureBuilderId: B_MOVEMENT_PAIR, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P9A-02', phaseFamily: 'P9A', domain: 'REAL_SOURCE_ADMISSION', title: 'expectations are never silently re-bound to a changed source SHA', fixtureBuilderId: B_MOVEMENT_PAIR, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P9A-03', phaseFamily: 'P9A', domain: 'REAL_SOURCE_ADMISSION', title: 'source-evidence digests are deterministic over the normalized derivation structure', fixtureBuilderId: B_MOVEMENT_CLASSIFIED, expectationKind: 'DETERMINISM' },
  { id: 'AF-P9A-04', phaseFamily: 'P9A', domain: 'REAL_SOURCE_ADMISSION', title: 'ambiguous type flow admits nothing (TYPE_FLOW_AMBIGUOUS is never weakened to fit the source)', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },

  // --- P9B — contained DEV semantic acceptance ----------------------------------
  { id: 'AF-P9B-01', phaseFamily: 'P9B', domain: 'DEV_ACCEPTANCE_GATE', title: 'never-PASS receipt outcomes land strictly below PROVEN in the unified vocabulary', fixtureBuilderId: B_VOCABULARY, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P9B-02', phaseFamily: 'P9B', domain: 'DEV_ACCEPTANCE_GATE', title: 'raw authenticated evidence never crosses the projection boundary into receipts', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },
  { id: 'AF-P9B-03', phaseFamily: 'P9B', domain: 'DEV_ACCEPTANCE_GATE', title: 'built unified results round-trip canonically byte-stable', fixtureBuilderId: B_VOCABULARY, expectationKind: 'DETERMINISM' },

  // --- P10 — deeper real-source semantic contracts -------------------------------
  { id: 'AF-P10-01', phaseFamily: 'P10', domain: 'REAL_SOURCE_ADMISSION', title: 'item field type contracts come only from proven source flow; unproven enums stay NOT admitted (SOURCE_ENUM_FLOW_UNPROVEN)', fixtureBuilderId: B_MOVEMENT_CLASSIFIED, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P10-02', phaseFamily: 'P10', domain: 'REAL_SOURCE_ADMISSION', title: 'TYPE_IN_SET observations outside the bounded known set classify VIOLATED', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P10-03', phaseFamily: 'P10', domain: 'REAL_SOURCE_ADMISSION', title: 'deep expectation identities stay distinct from historical shape identities', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P10-04', phaseFamily: 'P10', domain: 'REAL_SOURCE_ADMISSION', title: 'normalized type-flow extraction participates in the ev:sha256 digest deterministically', fixtureBuilderId: B_MOVEMENT_CLASSIFIED, expectationKind: 'DETERMINISM' },

  // --- P10B — deeper-contract contained DEV acceptance ---------------------------
  { id: 'AF-P10B-01', phaseFamily: 'P10B', domain: 'DEV_ACCEPTANCE_GATE', title: 'stale or unavailable source sides cap composed currentness below PASS', fixtureBuilderId: B_MOVEMENT_CLASSIFIED, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P10B-02', phaseFamily: 'P10B', domain: 'DEV_ACCEPTANCE_GATE', title: 'deep evaluation receipts screen raw values out of every detail field', fixtureBuilderId: null, expectationKind: 'PRIVACY_SCREEN' },
  { id: 'AF-P10B-03', phaseFamily: 'P10B', domain: 'DEV_ACCEPTANCE_GATE', title: 'receipt emission is deterministic for identical evaluation inputs', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P11A — collection-wide semantics (LOCAL/SYNTHETIC only) -------------------
  { id: 'AF-P11A-01', phaseFamily: 'P11A', domain: 'SEMANTIC_ORACLE', title: 'collection-wide semantic evaluation yields safe receipts, zero findings never proving PASS', fixtureBuilderId: B_VOCABULARY, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P11A-02', phaseFamily: 'P11A', domain: 'SEMANTIC_ORACLE', title: 'semantic projections stay additive to protocol oracles and deterministic only', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P11A-03', phaseFamily: 'P11A', domain: 'SEMANTIC_ORACLE', title: 'collection-wide coverage inventories serialize deterministically', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P11B — collection-wide DEV acceptance gate (NOT AUTHORIZED) ----------------
  { id: 'AF-P11B-01', phaseFamily: 'P11B', domain: 'DEV_ACCEPTANCE_GATE', title: 'collection-wide contained-DEV acceptance stays closed without separate owner authorization', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED', marker: 'NOT_AUTHORIZED' },

  // --- P12 — semantic yield & high-confidence triage -------------------------------
  { id: 'AF-P12-01', phaseFamily: 'P12', domain: 'HIGH_CONFIDENCE_TRIAGE', title: 'high-confidence triage never certifies without provenance-bound evidence', fixtureBuilderId: B_LIFECYCLE, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P12-02', phaseFamily: 'P12', domain: 'HIGH_CONFIDENCE_TRIAGE', title: 'confidence blocker codes bind to owning constants, never free text', fixtureBuilderId: B_VOCABULARY, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P12-03', phaseFamily: 'P12', domain: 'HIGH_CONFIDENCE_TRIAGE', title: 'triage brief shapes keep stable key-sorted serialization', fixtureBuilderId: null, expectationKind: 'DETERMINISM' },

  // --- P13 — residual runtime completion & integrated shadow proof -----------------
  { id: 'AF-P13-01', phaseFamily: 'P13', domain: 'RUNTIME_COMPLETION', title: 'checkpoint resume drift stops before any executor callback on version mismatch', fixtureBuilderId: B_ARTIFACTS, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P13-02', phaseFamily: 'P13', domain: 'RUNTIME_COMPLETION', title: 'integrated shadow proofs report zero false-certification outcomes truthfully', fixtureBuilderId: B_CLUSTERED, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P13-03', phaseFamily: 'P13', domain: 'RUNTIME_COMPLETION', title: 'shadow-proof fixture matrices deep-equal themselves across repeated construction', fixtureBuilderId: B_CLUSTERED, expectationKind: 'DETERMINISM' },

  // --- P13B — runtime-completion DEV gate (NOT AUTHORIZED) --------------------------
  { id: 'AF-P13B-01', phaseFamily: 'P13B', domain: 'DEV_ACCEPTANCE_GATE', title: 'runtime-completion contained-DEV acceptance remains a separate owner authority and stays closed', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED', marker: 'NOT_AUTHORIZED' },

  // --- P14 — mechanical real-source contract expansion -------------------------------
  { id: 'AF-P14-01', phaseFamily: 'P14', domain: 'MECHANICAL_CONTRACTS', title: 'mechanical analyzer re-evaluation preserves precise blocker codes instead of collapsing them', fixtureBuilderId: B_MOVEMENT_PAIR, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P14-02', phaseFamily: 'P14', domain: 'MECHANICAL_CONTRACTS', title: 'unknown derivation versions are rejected before contract comparison', fixtureBuilderId: B_MOVEMENT_PAIR, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P14-03', phaseFamily: 'P14', domain: 'MECHANICAL_CONTRACTS', title: 'analyzer version binding keeps drift classifications deterministic', fixtureBuilderId: B_MOVEMENT_CLASSIFIED, expectationKind: 'DETERMINISM' },

  // --- P15 — parallel implementation completion ---------------------------------------
  { id: 'AF-P15-01', phaseFamily: 'P15', domain: 'ADVERSARIAL_CORPUS', title: 'compatibility aliases delegate byte-identically to canonical serializers', fixtureBuilderId: B_ARTIFACTS, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P15-02', phaseFamily: 'P15', domain: 'ADVERSARIAL_CORPUS', title: 'artifact facade version acceptance references owning module constants', fixtureBuilderId: B_ARTIFACTS, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P15-03', phaseFamily: 'P15', domain: 'ADVERSARIAL_CORPUS', title: 'parallel-lane artifacts converge to identical canonical forms across lanes', fixtureBuilderId: B_ARTIFACTS, expectationKind: 'DETERMINISM' },

  // --- P15P — this parallel campaign's own architecture --------------------------------
  { id: 'AF-P15P-01', phaseFamily: 'P15P', domain: 'ADVERSARIAL_CORPUS', title: 'adversarial scenario-class ids are permanent and append-only across waves', fixtureBuilderId: null, expectationKind: 'TRUTHFUL_OUTCOME' },
  { id: 'AF-P15P-02', phaseFamily: 'P15P', domain: 'ADVERSARIAL_CORPUS', title: 'corpus modules stay pure: no fs/network/environment access, no wall-clock timestamps', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
  { id: 'AF-P15P-03', phaseFamily: 'P15P', domain: 'ADVERSARIAL_CORPUS', title: 'project snapshot deltas classify deterministically under fixed precedence', fixtureBuilderId: B_SNAPSHOT_DELTA, expectationKind: 'DETERMINISM' },
  { id: 'AF-P15P-04', phaseFamily: 'P15P', domain: 'ADVERSARIAL_CORPUS', title: 'implementation-only lanes defer all matrix execution to the dedicated hardening campaign', fixtureBuilderId: null, expectationKind: 'FAIL_CLOSED' },
]);

/**
 * All catalog definitions in insertion order (deterministic; callers must
 * not mutate). Returns the frozen array itself — treat as read-only.
 */
export function listAdversarialScenarios(): readonly AdversarialScenarioDefinition[] {
  return ADVERSARIAL_SCENARIO_DEFINITIONS;
}

/** Catalog definitions for one cross-phase family, insertion order. */
export function adversarialScenariosByFamily(family: AdversarialPhaseFamily): readonly AdversarialScenarioDefinition[] {
  return ADVERSARIAL_SCENARIO_DEFINITIONS.filter((definition) => definition.phaseFamily === family);
}

export interface AdversarialDomainCount {
  readonly domain: AdversarialScenarioDomain;
  readonly scenarioCount: number;
}

export interface AdversarialFamilyCoverage {
  readonly family: AdversarialPhaseFamily;
  readonly scenarioCount: number;
  /** Domains present in this family (>0), canonical domain order. */
  readonly domains: readonly AdversarialDomainCount[];
  /** Marker values carried by this family's definitions, if any. */
  readonly markers: readonly string[];
}

export interface AdversarialCoverageSummary {
  readonly registryVersion: typeof ADVERSARIAL_CORPUS_REGISTRY_VERSION;
  readonly totalScenarios: number;
  readonly familyCount: number;
  /** Every family in canonical order, including families with scenarios. */
  readonly perFamily: readonly AdversarialFamilyCoverage[];
  /** Every known domain in canonical order, zeros included. */
  readonly perDomain: readonly AdversarialDomainCount[];
  /** Whole-catalog marker census (FROZEN_BY_OWNER must be exactly 1). */
  readonly markerCounts: Readonly<Record<string, number>>;
}

/**
 * Deterministic per-family/per-domain coverage summary of the frozen
 * catalog. Pure aggregation over insertion-order data; identical calls
 * return deep-equal summaries.
 */
export function summarizeAdversarialCoverage(): AdversarialCoverageSummary {
  const perFamily = ADVERSARIAL_PHASE_FAMILIES.map((family) => {
    const definitions = adversarialScenariosByFamily(family);
    const domains = ADVERSARIAL_SCENARIO_DOMAINS
      .map((domain) => ({
        domain,
        scenarioCount: definitions.filter((definition) => definition.domain === domain).length,
      }))
      .filter((entry) => entry.scenarioCount > 0);
    const markers = [...new Set(definitions.flatMap((definition) => (definition.marker !== undefined ? [definition.marker] : [])))];
    return { family, scenarioCount: definitions.length, domains, markers };
  });

  const perDomain = ADVERSARIAL_SCENARIO_DOMAINS.map((domain) => ({
    domain,
    scenarioCount: ADVERSARIAL_SCENARIO_DEFINITIONS.filter((definition) => definition.domain === domain).length,
  }));

  const markerCounts: Record<string, number> = {};
  for (const definition of ADVERSARIAL_SCENARIO_DEFINITIONS) {
    if (definition.marker === undefined) continue;
    markerCounts[definition.marker] = (markerCounts[definition.marker] ?? 0) + 1;
  }

  return Object.freeze({
    registryVersion: ADVERSARIAL_CORPUS_REGISTRY_VERSION,
    totalScenarios: ADVERSARIAL_SCENARIO_DEFINITIONS.length,
    familyCount: perFamily.length,
    perFamily,
    perDomain,
    markerCounts: Object.freeze(markerCounts),
  });
}
