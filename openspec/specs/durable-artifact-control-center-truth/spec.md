# durable-artifact-control-center-truth Specification

## Purpose
TBD - created by archiving change nightwatch-durable-artifact-and-control-center-truth-hardening-v1. Update Purpose after archive.
## Requirements
### Requirement: fresh exhaustive tracked-file audit

Before implementation, the executor SHALL repeat a local tracked-file audit over the current checkout.

#### Scenario: audit census completes

- WHEN git ls-files defines the live tracked manifest
- THEN every tracked path SHALL receive a review/disposition
- AND reviewed count SHALL equal tracked count
- AND changed-since-planning paths SHALL receive a second focused review
- AND no subsystem SHALL be declared clean from filename search alone

### Requirement: durable dossier validation is deep runtime validation

validateArtifact('dossier', unknownValue) SHALL accept only a complete runtime-valid instance of an accepted dossier schema/status.

#### Scenario: nested field has wrong runtime type

- GIVEN a producer-valid dossier
- AND one required nested field is changed to an incompatible primitive/object/array type
- WHEN dossier validation runs
- THEN validation SHALL reject
- AND the artifact SHALL NOT be cast into trust merely because TypeScript types compile

#### Scenario: nested field is missing

- GIVEN a dossier whose root keys are present
- BUT a required nested field is missing
- WHEN validation runs
- THEN validation SHALL reject

#### Scenario: nested unknown field appears

- GIVEN a frozen nested dossier structure
- WHEN an unknown authority-bearing field is inserted
- THEN validation SHALL reject when the owning schema is exact-key
- AND the unknown field SHALL never reach a consumer

### Requirement: source-change candidates are strictly validated

Every persisted SourceChangeCandidate SHALL be runtime-validated before use.

#### Scenario: malformed candidate

- GIVEN a sourceChangeCandidates entry missing a required field, carrying an invalid enum, unsafe string, unsupported prototype, or invalid field type
- WHEN dossier validation runs
- THEN the dossier SHALL be rejected

#### Scenario: sourceChangeCandidates is not an array

- WHEN a dossier supplies a non-array sourceChangeCandidates value
- THEN validation SHALL reject before any .map/.some/currentness logic is reachable

### Requirement: valid historical dossier compatibility is preserved

Tightening validation SHALL preserve valid historical v1/v2 artifacts.

#### Scenario: producer-built v1/v2 corpus

- GIVEN dossiers produced by the current canonical v1/v2 builders and committed synthetic fixtures
- WHEN validation is tightened
- THEN all semantically valid historical artifacts SHALL remain accepted
- OR each newly rejected fixture SHALL have a reproduced malformed invariant and explicit migration/compatibility decision

### Requirement: cross-field contradictions fail closed

The validator SHALL reject contradictions mechanically derivable from the artifact.

#### Scenario: observation time reverses

- GIVEN firstObserved later than lastObserved
- WHEN validation runs
- THEN the dossier SHALL be rejected

#### Scenario: categorical/result fields contradict a frozen invariant

- GIVEN a status/result/count combination that violates the owning dossier contract
- WHEN validation runs
- THEN the dossier SHALL be rejected with a bounded categorical reason

### Requirement: validation errors are privacy-safe and deterministic

Validation errors SHALL be privacy-safe and deterministic.

#### Scenario: malicious/private input is rejected

- WHEN malformed input includes a private sentinel or long attacker-controlled text
- THEN the returned rejection reason SHALL not echo the raw value
- AND repeated validation SHALL return the same categorical result
- AND validation SHALL not mutate input

### Requirement: facade-wide nested mutation audit

Every registered durable artifact kind SHALL receive a bounded nested-shape audit.

#### Scenario: another false accept is reproduced

- GIVEN an accepted artifact kind whose owning contract unambiguously requires a nested field
- WHEN a malformed mutation is still accepted
- THEN the executor SHALL either repair it inside the pure local validation scope
- OR record a fail-closed consumer mitigation and a separate follow-up when compatibility semantics are ambiguous
- AND SHALL NOT silently leave an authority-bearing false accept unexplained

### Requirement: finding currentness is conservative

A public whole-dossier sourceCurrentness SHALL never be stronger than the required source freshness facts.

#### Scenario: all candidates are current

- GIVEN a non-empty sourceChangeCandidates list
- AND every sourceFreshness is SOURCE_CURRENT_LOCALLY or REMOTE_FRESHNESS_CONFIRMED
- THEN public sourceCurrentness MAY be CURRENT

#### Scenario: current and stale candidates are mixed

- GIVEN at least one current freshness
- AND at least one LOCAL_TRACKING_REF_ONLY freshness
- THEN whole-dossier sourceCurrentness SHALL NOT be CURRENT
- AND SHALL be SOURCE_STALE unless a stronger unavailable/unknown condition exists

#### Scenario: current and unknown candidates are mixed

- GIVEN at least one current freshness
- AND at least one UNKNOWN freshness
- THEN whole-dossier sourceCurrentness SHALL be SOURCE_UNAVAILABLE or an equivalently conservative existing category
- AND SHALL NOT be CURRENT

#### Scenario: candidate list is empty

- THEN sourceCurrentness SHALL be SOURCE_UNAVAILABLE
- AND SHALL NOT be CURRENT

#### Scenario: candidate order changes

- WHEN the same candidate multiset is permuted
- THEN sourceCurrentness SHALL be identical

### Requirement: one currentness authority

The same source-currentness semantics SHALL not be independently reimplemented in both findings authority and presentation adapter.

#### Scenario: normal authority path

- WHEN the findings authority emits validated metadata
- THEN the adapter SHALL project that metadata without re-deriving stronger source currentness

#### Scenario: raw-dossier compatibility path is retained

- IF a real non-test caller still requires direct raw dossier projection
- THEN it SHALL use the same shared pure reducer as the authority
- AND a differential test SHALL prove parity

### Requirement: malformed artifacts cannot produce valid public finding rows

Malformed artifacts SHALL NOT produce valid public finding rows.

#### Scenario: one corrupt dossier and one valid dossier coexist

- WHEN the owner-local findings authority snapshots the directory
- THEN collection state SHALL remain explicitly UNKNOWN / partial corruption
- AND the malformed dossier SHALL not produce a finding row
- AND the valid dossier MAY remain visible only under that explicit collection state
- AND no raw private detail SHALL be exposed

### Requirement: Control Center remains authority-inert

Control Center SHALL remain authority-inert.

#### Scenario: hardening executes

- THEN no selector, campaign eligibility, promotion, execution, mutation, storage-write, browser product, network, auth, DEV/NEXT/production, data, infrastructure, AI, or publication authority SHALL be added to Control Center

### Requirement: validation identity changes are explicit

Validation identity changes SHALL be explicit.

#### Scenario: facade semantics materially change

- WHEN strict validation changes a load-bearing validation/version fingerprint
- THEN the owning validation identity SHALL be versioned deliberately
- AND compatibility/currentness/hardening expectations SHALL be updated
- AND unrelated source/replay/dossier schema identities SHALL remain unchanged unless their wire semantics actually change

### Requirement: no test weakening

Test weakening SHALL NOT be permitted.

#### Scenario: old false accept is fixed

- THEN tests SHALL assert the corrected rejection/currentness
- AND no pre-existing test may be deleted, skipped, loosened, or snapshot-updated without an explicit correctness explanation

### Requirement: complete local acceptance

The campaign SHALL achieve complete local acceptance.

#### Scenario: campaign completion

- WHEN implementation is declared complete
- THEN focused artifact-validation tests SHALL pass
- AND focused Control Center authority/adapter/server/snapshot tests SHALL pass
- AND UI unit/build/browser qualification SHALL pass when touched/applicable
- AND typecheck, hardening, owner-provenance, project-state, continuity, local quality gate, clean Node20 gate, and canonical serial regression SHALL pass
- AND exact skip counts / known external blocks SHALL be reported
- AND no DEV/NEXT/production or external mutation SHALL have occurred

### Requirement: external zero-step CI is non-evidence

External zero-step CI SHALL be classified as non-evidence.

#### Scenario: exact-head Actions executes no job steps

- THEN the result SHALL be classified as external billing/platform blocked
- AND SHALL NOT be called green
- AND workflow logic SHALL NOT be weakened or churned solely to hide the condition

