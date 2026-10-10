# Spec — Contained DEV semantic acceptance

Closes F-10. Measured from `docs/ROADMAP.md`: `PHASE_9B_STATUS: BLOCKED`,
`PHASE_9B_DEV_RESULT: NOT_PROVEN`,
`PHASE_9B_BLOCKER: PHASE_9B_BLOCKED_HUMAN_AUTH_ACTION_REQUIRED` since
2026-08-16. Phase 10A proved LOCAL/SYNTHETIC detection depth only and states
that Phase 10B contained DEV acceptance requires separate owner authorization.
`src/oracles/**` is 54 files and 14,359 lines that have never been evaluated
against a real application.

## ADDED Requirements

### Requirement: The semantic layer's unproven status SHALL be visible wherever its capability is described

A reader of `README.md`, `docs/ARCHITECTURE.md` or the Control Center can learn
that semantic oracles exist without learning that none has ever run against a
real application. The distinction between `COMPLETE_LOCAL_SYNTHETIC` (D-54) and
DEV-accepted SHALL appear wherever the capability is presented, not only in the
roadmap.

Every semantic evaluation already yields a safe receipt in which
`NO_EXPECTATION`, `SOURCE_STALE`, `SOURCE_UNAVAILABLE`, `NOT_APPLICABLE` and
`INTERNAL_ERROR` are never PASS, and zero findings never proves PASS. That
discipline SHALL extend to the capability's own self-description: the layer
SHALL report its acceptance class as data, and a surface that renders the
capability SHALL render the class.

#### Scenario: the capability reports its own acceptance class
- **WHEN** the semantic layer's capability is queried
- **THEN** it returns `COMPLETE_LOCAL_SYNTHETIC` with the DEV result
  `NOT_PROVEN` and the blocker
- **AND** no surface presents the capability without the class

#### Scenario: synthetic acceptance is never rendered as acceptance
- **WHEN** a local synthetic evaluation passes
- **THEN** the receipt records the synthetic class
- **AND** it does not satisfy any DEV acceptance assertion

### Requirement: The unblock path SHALL be specified concretely, or the phase SHALL be closed permanently with a reason

A blocker recorded as `HUMAN_AUTH_ACTION_REQUIRED` for four weeks with no
stated action is indistinguishable from abandonment. Exactly one of two
outcomes SHALL be recorded.

**Unblock.** The path SHALL name: the exact DEV authentication artefact
required and where it is obtained; the one-shot owner authorization class; the
containment envelope the acceptance runs under (the qualified L6
`nightwatch.process-network-containment.v1` envelope, or the browser harness
with its outer proxy); the bounded target set and its approved read-only
status; the acceptance criteria; and the evidence the run would produce. The
existing `PARTIAL_AUTH_BLOCKED` and pre-browser auth-gate behaviour SHALL be
preserved — acceptance runs after the gate, never around it.

**Permanent closure.** If DEV acceptance is not going to be pursued, the phase
SHALL be recorded terminal with the reason, and the semantic layer's
self-description SHALL state permanently that it is synthetic-only. That is an
honest outcome; an indefinite BLOCKED is not.

#### Scenario: an unblock path names every artefact
- **WHEN** the unblock path is recorded
- **THEN** it names the auth artefact, authorization class, containment
  envelope, target set, acceptance criteria and expected evidence
- **AND** a path missing any of these fails the record's own check

#### Scenario: permanent closure is terminal and visible
- **WHEN** the owner chooses not to pursue DEV acceptance
- **THEN** the phase is recorded terminal with its reason
- **AND** the capability's acceptance class becomes permanently synthetic-only

### Requirement: Real-source expectation admission SHALL remain the only route, whatever the acceptance outcome

Phase 9A.1 (D-55) established the only route from real Alphaus source to a real
semantic expectation: a versioned data-only recipe, a fixed bounded
syntax-aware extractor, a deterministic `ev:sha256` evidence digest over the
normalized source structure, an approved read-only target, and an exact current
source snapshot, admitted fail-closed on contract drift.

Nothing in the acceptance work SHALL create a second route. A provenance label
alone SHALL never grant semantic authority; an expectation without mechanically
verified derivation evidence SHALL remain
`REAL_SOURCE_EXPECTATION_PROOF_MISSING`; a synthetic expectation SHALL never be
relabelled as real; and Alphaus repositories SHALL never be annotated or
modified.

#### Scenario: a DEV run cannot admit an expectation
- **WHEN** a DEV acceptance run observes behaviour matching no admitted
  expectation
- **THEN** the receipt records `NO_EXPECTATION` and is not PASS
- **AND** no expectation is created from the observation

#### Scenario: a relabel is refused
- **WHEN** a synthetic expectation is given a real-source provenance label
- **THEN** admission fails with `REAL_SOURCE_EXPECTATION_PROOF_MISSING`
