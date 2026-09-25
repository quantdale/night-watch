## ADDED Requirements

### Requirement: Every census item ends in exactly one recorded disposition
The campaign SHALL record, for every item in `audit.md`, exactly one
disposition from FIX, NARROW, QUARANTINE, ACCEPTED_RESIDUAL, COMPLETED_LATER,
SUPERSEDED, HISTORICAL, NON_GOAL, or EXTERNAL, together with the evidence that
disposition requires. It SHALL NOT close while any item lacks a disposition.

#### Scenario: Item fixed
- **WHEN** an item's disposition is FIX
- **THEN** a regression test exists that fails on the pre-fix behaviour, and
  a registered mutation probe exists when the fix is a guard

#### Scenario: Item completed elsewhere
- **WHEN** an item's disposition is COMPLETED_LATER or SUPERSEDED
- **THEN** the record cites the commit SHA and file:line that prove it

#### Scenario: Item left without disposition
- **WHEN** closure is attempted with any undispositioned census item
- **THEN** closure is refused and the undispositioned item IDs are listed

### Requirement: Tier rules bind which dispositions are admissible
The campaign SHALL apply the tier rules from owner decision OD-1. T0-SPINE,
T0-D129, T1 and T2-FIX items SHALL be FIX or NARROW. T2-GATE items SHALL be
QUARANTINE. T3 items SHALL be FIX when estimated S, and otherwise
ACCEPTED_RESIDUAL. T4 items SHALL be FIX when estimated S, and otherwise
RATCHET. TF items SHALL be EXTERNAL with a named owner action.

#### Scenario: A T1 item is proposed as residual
- **WHEN** a T1 item is given ACCEPTED_RESIDUAL
- **THEN** the disposition is rejected as inadmissible for its tier

#### Scenario: A latent frozen-path defect is accepted
- **WHEN** a T3 item estimated above S is dispositioned ACCEPTED_RESIDUAL
- **THEN** a DECISIONS entry names the defect, cites OD-1, explains why the
  path is unreachable under the owner scope freeze, and states a revisit
  trigger

### Requirement: The owner confirms the residual list before the final commit
Before creating the final substantive checkpoint, the campaign SHALL present
the complete ACCEPTED_RESIDUAL and QUARANTINE lists to the owner and record
the confirmation. Absent confirmation, it SHALL NOT create the final
substantive checkpoint.

#### Scenario: Owner rejects a residual
- **WHEN** the owner rejects an ACCEPTED_RESIDUAL item
- **THEN** that item is re-tiered and fixed or narrowed before closure

### Requirement: No discovery loop
The campaign SHALL NOT select a successor campaign. A new finding discovered
during execution SHALL enter implementation scope only if it is T0 or T1
class. Every other new finding SHALL be added to the census with a
disposition.

#### Scenario: A T3-class defect is found mid-campaign
- **WHEN** a latent defect on a frozen path is discovered during M7
- **THEN** it is added to the census with a T3 disposition and is not
  implemented unless it is estimated S

### Requirement: Struck ledger items require a disposition token
The ledger parser SHALL treat a struck-through checklist item as settled only
when its text carries a recognised disposition token. It SHALL report a struck
item without one as `LEDGER_UNDISPOSITIONED_ITEM`, and it SHALL report BLOCKED
tasks as their own open-work class with their blocker text.

#### Scenario: Legacy "declared not in scope" strike
- **WHEN** a tasks.md line reads `~~…~~ — declared not in scope` with no
  disposition token
- **THEN** agent:check reports `LEDGER_UNDISPOSITIONED_ITEM` for that change

#### Scenario: BLOCKED task in open work
- **WHEN** a task STATE says BLOCKED
- **THEN** status:local lists it under a BLOCKED class with its blocker text
  instead of omitting it

### Requirement: Authorization block is exact
The campaign SHALL permit exactly these external effects: GitHub Actions
read/observe; fast-forward pushes to `origin/main` through the C-00 flow; one
bounded paid provider proof run; one npm registry advisory query covering the
root and UI lockfiles; and deletion of local branch
`session/nightwatch-successor-campaign-en-c8bcb74c` after its SHA `1441cc8a`
is recorded. Every other external effect SHALL remain refused.

#### Scenario: Second paid provider run attempted
- **WHEN** a second paid provider run is requested after the authorized one
  executed
- **THEN** it is refused as unauthorized

#### Scenario: Alphaus environment contact attempted
- **WHEN** any step would contact Alphaus DEV, NEXT or production
- **THEN** it is refused before any effect

### Requirement: Terminal verdict vocabulary is fixed
The task SHALL end with `Status: COMPLETE`. Its phase status SHALL begin with
the token `COMPLETE`, followed by `— WITH EXTERNAL PREREQUISITES: <list>` when
any EXTERNAL item remains. The project status SHALL be
`PROJECT_COMPLETE_AND_CI_CERTIFIED` only when all sixteen release conditions
are MET and exact-head CI passed at the final substantive checkpoint. Otherwise
the project status SHALL remain `OPERATIONALLY_ACCEPTED`, and the report
verdict SHALL be `NOT_COMPLETE` with the structural reason stated.

#### Scenario: Certified with production track external
- **WHEN** all sixteen conditions are MET, CI passed at S, and the production
  track remains `EXTERNAL_PREREQUISITE_UNMET`
- **THEN** the project status is `PROJECT_COMPLETE_AND_CI_CERTIFIED` and the
  report verdict is `COMPLETE_WITH_EXTERNAL_PREREQUISITES`

#### Scenario: Single-token status
- **WHEN** a phase status is written as the single token
  `COMPLETE_WITH_EXTERNAL_PREREQUISITES`
- **THEN** it is rejected in favour of the `COMPLETE — WITH EXTERNAL
  PREREQUISITES:` form

### Requirement: Terminal topology is main only
At closure, the repository SHALL have only branch `main` locally, `origin/main`
equal to local HEAD, no registered worktree other than the canonical checkout,
a clean working tree, a canonical session record that names the terminal task,
and exactly zero active OpenSpec changes other than this one before its own
archive step.

#### Scenario: Leftover session branch
- **WHEN** any `refs/heads/session/*` remains at closure
- **THEN** closure is refused until its unique commits are proven reachable
  from `main` or deliberately preserved, and the branch is removed
