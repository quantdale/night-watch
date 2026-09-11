# Spec — Release definition and verdict

Closes F-12. Measured at `36bd493`: `PROJECT_COMPLETION_STATUS` is
`OPERATIONALLY_ACCEPTED`; every recent campaign closure states it "preserved,
not advanced" that status and carries `PROJECT_VERDICT_EFFECT: PRESERVE`.
Nothing anywhere states what would advance it. §7 of the master plan is a
definition of done for that plan's fifteen findings, not for the product.

## ADDED Requirements

### Requirement: The project SHALL declare, mechanically, what advances its completion status

Without a stated advance condition, no campaign can be the last one, and
"production-usable" has no meaning that any check can evaluate. The result is
visible in the record: eleven consecutive terminal campaigns, each green, each
explicitly preserving the same verdict.

`nightwatch.release-certification.v1` SHALL gain an explicit, ordered set of
advance conditions from `OPERATIONALLY_ACCEPTED` to the next status, each
condition expressed as a check that already exists or is created by this
programme, and each evaluable without human interpretation.

Derived from the measured gaps, the proposed conditions are:

1. every declared validation lane resolves `PROVEN`, or
   `BLOCKED_EXTERNAL` / `UNAVAILABLE_CAPABILITY` with a current, unexpired
   record naming its owner action (`validation-lane-closure`);
2. exact-head CI is executed or its block record is current and complete
   (`exact-head-ci-authority`);
3. the autonomous yield campaign has completed with per-case reasons recorded,
   whatever its yield (`autonomous-yield-proof`);
4. the change ledger and the spec baseline agree with task truth
   (`completion-ledger-truth`);
5. the CLI contract sweep passes over every entry point
   (`operator-cli-contract`);
6. the document-role and status-ledger checks pass (`documentation-currency`);
7. no workspace claim names a terminal task and no legacy record is
   undisposed (`workspace-continuity-drift-closure`);
8. the dependency assessment is executed or currently recorded unavailable
   (`dependency-supply-chain-currency`);
9. no tracked source module is unreferenced outside a reasoned retention list,
   and no module barrier is both unimported and unremoved
   (`dead-architecture-closure`);
10. every dynamic module path and every symbol read from one resolves
    statically, `bin/**` type-checks, and every entry point has an executing
    test (`cli-implementation-contract`);
11. every structural rule is comment-proof where positive, occurrence-complete
    where total, and has a detected mutation probe (`structural-rule-soundness`);
12. every schema identifier is declared persisted or in-memory, and no
    persisted version change lacks a disposition (`schema-version-lifecycle`);
13. every member of `ApiErrorKind` renders distinguishably and the failure path
    is covered by the render harness (`ui-error-taxonomy-rendering`);
14. every environment variable the code reads is declared and validated, and
    every environment file is schema-validated (`configuration-contract`);
15. no status distinction is colour-only, every rendered contrast pair meets
    its ratio, and every operator workflow completes by keyboard
    (`accessibility-certification`);
16. every authenticated lane pre-flights its artefact and refuses an expired,
    wrong-environment or unknown-age one before any effect
    (`authenticated-capability-lifecycle`).

Conditions 1-8 are the record-level gaps; 9-16 are the code-level gaps the
second pass found. The production path (C-12 → C-14) SHALL NOT be an advance
condition, because it
is externally gated and would make the project permanently incompletable by
another organization's decision. It SHALL be recorded as a separate, explicitly
external track with its own status.

`project:check` SHALL evaluate the conditions and refuse an advance whose
conditions are unmet, with the unmet conditions named — the same fail-closed
treatment it already applies to a blocked active task projecting a complete
status.

#### Scenario: an advance with unmet conditions is refused
- **WHEN** a document sets the completion status beyond
  `OPERATIONALLY_ACCEPTED` while any condition is unmet
- **THEN** `project:check` fails naming each unmet condition
- **AND** the status is unchanged

#### Scenario: the conditions are evaluable without interpretation
- **WHEN** the conditions are evaluated
- **THEN** each resolves from a check's output, not from prose
- **AND** a condition with no backing check fails the definition itself

#### Scenario: an external track cannot block the project verdict
- **WHEN** the production path is unauthorized or externally blocked
- **THEN** it is reported on its own track
- **AND** it is not counted among the advance conditions

### Requirement: The verdict vocabulary SHALL distinguish what is proven from what is externally blocked from what was never attempted

The project already draws this distinction well for lanes and poorly for
itself. `OPERATIONALLY_ACCEPTED` conflates "everything we could prove, we
proved" with "several things were never attempted".

The status vocabulary SHALL carry, alongside the status, the three counts that
give it meaning: lanes proven, lanes externally blocked with a current record,
and lanes never attempted. A status SHALL NOT be presentable without them. The
current values are 6, 1 and 3 respectively, and a reader today sees none of
them next to the verdict.

#### Scenario: the verdict is never presented bare
- **WHEN** `PROJECT_COMPLETION_STATUS` is rendered in any surface
- **THEN** the three lane counts accompany it
- **AND** a surface presenting the status alone fails the render guard

#### Scenario: a never-attempted lane is visible in the verdict
- **WHEN** a declared lane has no evidence of any kind
- **THEN** it counts as never attempted
- **AND** it is not folded into externally blocked

### Requirement: A release checkpoint SHALL bind its evidence, and stale evidence SHALL void it

`RELEASE_CHECKPOINT_SHA` is `2576c575…` while
`LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` is `88e3c3f` and live HEAD is `36bd493`.
The existing protocol correctly separates these anchors. What is missing is the
consequence: evidence earned at an ancestor does not certify a descendant.

A release certification SHALL name, for each advance condition, the SHA at
which its evidence was earned. A condition whose evidence predates the
checkpoint being certified SHALL be reported `STALE_EVIDENCE` and SHALL NOT
count as met. Advancing the baseline SHALL void the prior observation, as the
checkpoint-role rule already establishes for CI.

A documentation-only descendant SHALL remain a checkpoint advance and SHALL NOT
be relabelled as an implementation commit — the existing rule, restated here
because the advance conditions make it load-bearing.

#### Scenario: evidence older than the checkpoint does not certify it
- **WHEN** a condition's evidence SHA precedes the certified checkpoint
- **THEN** the condition reports `STALE_EVIDENCE` and is unmet
- **AND** the certification is refused

#### Scenario: a doc-only descendant is not an implementation anchor
- **WHEN** a documentation-only commit is proposed as the implementation anchor
- **THEN** `project:check` refuses it
