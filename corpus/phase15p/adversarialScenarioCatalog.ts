// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — adversarial scenario-class
// catalog.
//
// The stable registry of every adversarial scenario class exercised by
// tests/unit/phase15pAdversarialCorpus.test.ts. Each class is a small,
// independent, deterministic probe of ONE fail-closed / truthful behavior of
// the Phase 15P wave architecture (lifecycle, currentness, replay seam,
// minimization truthfulness, semantic evaluation, coverage, candidate
// lifecycle, checkpoint drift, privacy screens, malformed inputs, snapshot
// diff). Ids are permanent: SC-01..SC-NN never move between domains and are
// never renumbered; new classes append.
//
// Pure data module: no fs, no network, no environment access, no timestamps.
// ---------------------------------------------------------------------------

export const ADVERSARIAL_CORPUS_VERSION = 'nightwatch.phase15p.adversarial-corpus.v1' as const;

export type AdversarialDomain =
  | 'SOURCE_CONTRACTS'
  | 'CURRENTNESS_MOVEMENT'
  | 'REPLAY_SEAM'
  | 'MINIMIZATION_TRUTH'
  | 'SEMANTIC_EVALUATION'
  | 'PARTIAL_COVERAGE'
  | 'CANDIDATE_LIFECYCLE'
  | 'CHECKPOINT_DRIFT'
  | 'PRIVACY_SENTINELS'
  | 'MALFORMED_INPUTS'
  | 'SNAPSHOT_DIFF';

export interface AdversarialScenarioClass {
  /** Stable class id, `SC-<two digits>`..`SC-<N digits>`, unique forever. */
  readonly id: string;
  readonly domain: AdversarialDomain;
  /** One-line statement of the fail-closed / truthful property under test. */
  readonly title: string;
}

export const ADVERSARIAL_SCENARIO_CLASSES: readonly AdversarialScenarioClass[] = Object.freeze([
  // --- SOURCE_CONTRACTS (registry families, lifecycle model) ---------------
  { id: 'SC-01', domain: 'SOURCE_CONTRACTS', title: 'registry builds deterministically with only known kinds/scopes/derivation versions' },
  { id: 'SC-02', domain: 'SOURCE_CONTRACTS', title: 'archived historical-shape families are immutable and never terminal' },
  { id: 'SC-03', domain: 'SOURCE_CONTRACTS', title: 'every approved target resolves a unique terminal family' },
  { id: 'SC-04', domain: 'SOURCE_CONTRACTS', title: 'unknown target fails closed to UNKNOWN_TARGET' },
  { id: 'SC-05', domain: 'SOURCE_CONTRACTS', title: 'probe-only target terminates at its mechanical-probe singleton' },
  { id: 'SC-06', domain: 'SOURCE_CONTRACTS', title: 'duplicate family id is rejected (REGISTRY_DUPLICATE_FAMILY_ID)' },
  { id: 'SC-07', domain: 'SOURCE_CONTRACTS', title: 'unknown derivation version is rejected (REGISTRY_UNKNOWN_DERIVATION_VERSION)' },
  { id: 'SC-08', domain: 'SOURCE_CONTRACTS', title: 'dangling predecessor lineage is rejected (REGISTRY_INVALID_LINEAGE)' },
  { id: 'SC-09', domain: 'SOURCE_CONTRACTS', title: 'asymmetric lineage links are rejected (REGISTRY_INVALID_LINEAGE)' },
  { id: 'SC-10', domain: 'SOURCE_CONTRACTS', title: 'lifecycle model maps compatibilityState/admissionAuthority exactly per kind' },
  { id: 'SC-11', domain: 'SOURCE_CONTRACTS', title: 'composed currentness state blocks disagreement and floors emptiness' },
  { id: 'SC-12', domain: 'SOURCE_CONTRACTS', title: 'historical-id stability forbids removal/rebinding and allows additive growth' },

  // --- CURRENTNESS_MOVEMENT (movement classifications, ceilings) ------------
  { id: 'SC-13', domain: 'CURRENTNESS_MOVEMENT', title: 'identical evidence across a moved SHA is SEMANTICALLY_STABLE, never drifted' },
  { id: 'SC-14', domain: 'CURRENTNESS_MOVEMENT', title: 'compatible evidence change classifies EVIDENCE_DRIFTED_COMPATIBLE' },
  { id: 'SC-15', domain: 'CURRENTNESS_MOVEMENT', title: 'proven-type shrinkage classifies EVIDENCE_DRIFTED_BREAKING' },
  { id: 'SC-16', domain: 'CURRENTNESS_MOVEMENT', title: 'a stale side caps the pair at SOURCE_STALE even with identical evidence' },
  { id: 'SC-17', domain: 'CURRENTNESS_MOVEMENT', title: 'an unavailable side caps the pair at SOURCE_UNAVAILABLE' },
  { id: 'SC-18', domain: 'CURRENTNESS_MOVEMENT', title: 'derivation-version movement splits at identical SHA and evidence' },
  { id: 'SC-19', domain: 'CURRENTNESS_MOVEMENT', title: 'provability loss/gain classify PROVABILITY_LOST / PROVABILITY_GAINED' },
  { id: 'SC-20', domain: 'CURRENTNESS_MOVEMENT', title: 'malformed observation fields are rejected before evaluation' },
  { id: 'SC-21', domain: 'CURRENTNESS_MOVEMENT', title: 'sentinel-bearing derivation versions are privacy-rejected' },
  { id: 'SC-22', domain: 'CURRENTNESS_MOVEMENT', title: 'movement composition blocks mixed ceilings and floors empty participation' },

  // --- REPLAY_SEAM (validated-plan value, occurrence identity) --------------
  { id: 'SC-23', domain: 'REPLAY_SEAM', title: 'structurally invalid plans return INVALID with zero executor calls' },
  { id: 'SC-24', domain: 'REPLAY_SEAM', title: 'reduced journey replay stays unsupported (no invented subset executor)' },
  { id: 'SC-25', domain: 'REPLAY_SEAM', title: 'unapproved exploration actions are rejected before the executor' },
  { id: 'SC-26', domain: 'REPLAY_SEAM', title: 'occurrence identity tokens distinguish duplicate actions deterministically' },
  { id: 'SC-27', domain: 'REPLAY_SEAM', title: 'retained duplicate occurrences map 1:1 onto actions, never deduplicated' },
  { id: 'SC-28', domain: 'REPLAY_SEAM', title: 'duplicate retained ordinals are rejected before any executor call' },
  { id: 'SC-29', domain: 'REPLAY_SEAM', title: 'executor throw/rejection degrades to INVALID, never a certification' },
  { id: 'SC-30', domain: 'REPLAY_SEAM', title: 'mismatched-fingerprint FAILURE normalizes to PASS (no false reproduction)' },
  { id: 'SC-31', domain: 'REPLAY_SEAM', title: 'unresolved retained ordinal fails closed (RETAINED_OCCURRENCE_UNRESOLVED)' },

  // --- MINIMIZATION_TRUTH (truthful evidence classes) -----------------------
  { id: 'SC-32', domain: 'MINIMIZATION_TRUTH', title: 'fresh non-reproduction reports NO_REPRODUCTION with guarantee NONE' },
  { id: 'SC-33', domain: 'MINIMIZATION_TRUTH', title: 'single-action survivor is vacuously minimal without reduced replays' },
  { id: 'SC-34', domain: 'MINIMIZATION_TRUTH', title: 'budget exhaustion always downgrades to MINIMALITY_NOT_PROVEN' },
  { id: 'SC-35', domain: 'MINIMIZATION_TRUTH', title: 'fully exercised one-deletion audit earns 1-MINIMAL + MINIMALITY_PROVEN' },
  { id: 'SC-36', domain: 'MINIMIZATION_TRUTH', title: 'guard-failing original reports INVALID_ORIGINAL with zero replays' },
  { id: 'SC-37', domain: 'MINIMIZATION_TRUTH', title: 'nonzero safety vectors reject candidates as SAFETY_VECTOR_NONZERO' },
  { id: 'SC-38', domain: 'MINIMIZATION_TRUTH', title: 'different-fingerprint failures never count as reproductions' },
  { id: 'SC-39', domain: 'MINIMIZATION_TRUTH', title: 'invalid budgets and empty sequences throw before any replay' },
  { id: 'SC-40', domain: 'MINIMIZATION_TRUTH', title: 'mixed audit (genuine + unexercised deletions) stays MINIMALITY_NOT_PROVEN' },

  // --- SEMANTIC_EVALUATION (receipt outcomes, vocabulary DTOs) --------------
  { id: 'SC-41', domain: 'SEMANTIC_EVALUATION', title: 'never-PASS receipt outcomes land strictly below PROVEN' },
  { id: 'SC-42', domain: 'SEMANTIC_EVALUATION', title: 'strict outcome parsing rejects unknown strings and maps triage outcomes totally' },
  { id: 'SC-43', domain: 'SEMANTIC_EVALUATION', title: 'unified-result DTO validation rejects tampering and sentinel details' },
  { id: 'SC-44', domain: 'SEMANTIC_EVALUATION', title: 'canonical round-trip of built results is byte-stable' },
  { id: 'SC-45', domain: 'SEMANTIC_EVALUATION', title: 'aggregation picks the worst category and refuses empty input' },
  { id: 'SC-46', domain: 'SEMANTIC_EVALUATION', title: 'known vocabularies fail closed on unknown member values' },
  { id: 'SC-47', domain: 'SEMANTIC_EVALUATION', title: 'semantic vocabulary provenance integrity verifies' },
  { id: 'SC-48', domain: 'SEMANTIC_EVALUATION', title: 'DTO parsing rejects non-JSON and accepts canonical serializations' },

  // --- PARTIAL_COVERAGE ------------------------------------------------------
  { id: 'SC-49', domain: 'PARTIAL_COVERAGE', title: 'partial coverage reports validate truthfully with stale failures counted' },
  { id: 'SC-50', domain: 'PARTIAL_COVERAGE', title: 'readiness coverage distinguishes COVERED / PARTIAL / MISSING' },
  { id: 'SC-51', domain: 'PARTIAL_COVERAGE', title: 'structural gaps or stale currentness block READY (BLOCKED_SOURCE)' },

  // --- CANDIDATE_LIFECYCLE (states, GATE_BLOCK, transitions) -----------------
  { id: 'SC-52', domain: 'CANDIDATE_LIFECYCLE', title: 'happy-path progressions reach terminals with exact transition counts' },
  { id: 'SC-53', domain: 'CANDIDATE_LIFECYCLE', title: 'terminal states are edge-free against every event' },
  { id: 'SC-54', domain: 'CANDIDATE_LIFECYCLE', title: 'illegal jumps fail closed with exact transition codes' },
  { id: 'SC-55', domain: 'CANDIDATE_LIFECYCLE', title: 'GATE_BLOCK routes pre-triage states to UNRESOLVED and demands a reason' },
  { id: 'SC-56', domain: 'CANDIDATE_LIFECYCLE', title: 'gate-blocking a terminal record is an idempotent no-op' },
  { id: 'SC-57', domain: 'CANDIDATE_LIFECYCLE', title: 'corrupt lifecycle records fail validation before transitions' },
  { id: 'SC-58', domain: 'CANDIDATE_LIFECYCLE', title: 'canonical lifecycle JSON is key-sorted and deterministic' },

  // --- CHECKPOINT_DRIFT (version matrices, resume-before-executor) ----------
  { id: 'SC-59', domain: 'CHECKPOINT_DRIFT', title: 'every persisted version component classifies its exact resume-drift kind' },
  { id: 'SC-60', domain: 'CHECKPOINT_DRIFT', title: 'fingerprint slot drift reports the sorted union key set' },
  { id: 'SC-61', domain: 'CHECKPOINT_DRIFT', title: 'runtime-contract drift stops resume before any executor callback' },
  { id: 'SC-62', domain: 'CHECKPOINT_DRIFT', title: 'schema-drifted persisted bytes are refused at read with zero callbacks' },
  { id: 'SC-63', domain: 'CHECKPOINT_DRIFT', title: 'clean resume positive control reaches the executor' },

  // --- PRIVACY_SENTINELS ------------------------------------------------------
  { id: 'SC-64', domain: 'PRIVACY_SENTINELS', title: 'readiness blocker details enforce charset and denylist fail-closed' },
  { id: 'SC-65', domain: 'PRIVACY_SENTINELS', title: 'lifecycle records reject every sentinel class in any field' },
  { id: 'SC-66', domain: 'PRIVACY_SENTINELS', title: 'resolution screens free-text probe status and malformed snapshot SHAs' },

  // --- MALFORMED_INPUTS (validateArtifact kinds, coherence contradictions) ---
  { id: 'SC-67', domain: 'MALFORMED_INPUTS', title: 'snapshot builder fails closed on duplicates and malformed strings' },
  { id: 'SC-68', domain: 'MALFORMED_INPUTS', title: 'artifact facade rejects unknown and non-string kinds' },
  { id: 'SC-69', domain: 'MALFORMED_INPUTS', title: 'truncated shapes are rejected for every artifact kind' },
  { id: 'SC-70', domain: 'MALFORMED_INPUTS', title: 'checkpoint artifacts reject identity drift and missing context' },
  { id: 'SC-71', domain: 'MALFORMED_INPUTS', title: 'observation/cluster/reproduction artifacts reject tampered identities and dirty counters' },
  { id: 'SC-72', domain: 'MALFORMED_INPUTS', title: 'receipt/replay-plan artifacts reject id tampering and version/cardinality drift' },
  { id: 'SC-73', domain: 'MALFORMED_INPUTS', title: 'dossier/brief/bundle/coverage artifacts reject scope, publication, and digest violations' },

  // --- SNAPSHOT_DIFF (version matrices, precedence) ---------------------------
  { id: 'SC-74', domain: 'SNAPSHOT_DIFF', title: 'identical inputs classify UNCHANGED with deterministic digests' },
  { id: 'SC-75', domain: 'SNAPSHOT_DIFF', title: 'set/slot deltas split additive, upgrade, downgrade, and removal classes' },
  { id: 'SC-76', domain: 'SNAPSHOT_DIFF', title: 'target-registry and owner-scope changes are AUTHORITY_CHANGE' },
  { id: 'SC-77', domain: 'SNAPSHOT_DIFF', title: 'family field drift is semantic; family removal is incompatible' },
  { id: 'SC-78', domain: 'SNAPSHOT_DIFF', title: 'precedence puts authority above incompatible above semantic; schema mismatch short-circuits' },
]);

export function scenarioClassesByDomain(domain: AdversarialDomain): readonly AdversarialScenarioClass[] {
  return ADVERSARIAL_SCENARIO_CLASSES.filter((scenario) => scenario.domain === domain);
}

export const ADVERSARIAL_DOMAINS: readonly AdversarialDomain[] = Object.freeze([
  'SOURCE_CONTRACTS',
  'CURRENTNESS_MOVEMENT',
  'REPLAY_SEAM',
  'MINIMIZATION_TRUTH',
  'SEMANTIC_EVALUATION',
  'PARTIAL_COVERAGE',
  'CANDIDATE_LIFECYCLE',
  'CHECKPOINT_DRIFT',
  'PRIVACY_SENTINELS',
  'MALFORMED_INPUTS',
  'SNAPSHOT_DIFF',
]);
