# Spec — Evidence lifecycle hygiene

Closes F-06. Measured in the canonical checkout at `36bd493`: `artifacts/` is
919 MB across 13,389 entries; 19 separate `test-results*` directories exist at
the repository root, the oldest dated 2026-08-09; `.tmp-narrow-test/` 920 K,
`.tmp-narrow-test2/` 920 K, `.tmp-nightwatch/` 4.1 M, `.tmp-test/` 20 K. All
are correctly ignored — `git ls-files` shows zero tracked entries under them —
so no privacy boundary is crossed. R-06 delivered a refusal-first retention
capability, measured 13,368 entries / 204 refused / 13,164 candidates / ~670 MB
reclaimable, and removed nothing because `--apply` is the owner's decision.
That decision has not been taken.

## ADDED Requirements

### Requirement: Evidence growth SHALL have an executed reclaim, not only a capability

A refusal-first retention capability that has never reclaimed anything is a
plan, not a bound. The owner decision SHALL be taken, and the reclaim SHALL be
executed once, with its before and after figures recorded.

The refusal-first discipline SHALL be preserved exactly: an artifact referenced
by tracked state is refused, an artifact whose referencing status cannot be
proven is refused, and unprovable means refused. The 204 refusals measured by
R-06 SHALL be re-derived at execution time rather than reused, because the
referencing set changes with every campaign.

The reclaim SHALL be a dry run first, and the plan SHALL be reviewed against
the refusal set before `--apply`. `--apply` SHALL require an explicit
confirmation token, SHALL never run inside a gate, and SHALL never run
unattended.

Deletion SHALL be recorded: which entries, how many bytes, at what SHA, under
which refusal set, on what date.

#### Scenario: the refusal set is re-derived, not reused
- **WHEN** `retention:plan` runs
- **THEN** the referencing set is computed from the current tracked state
- **AND** a cached refusal set from a prior run is not consulted

#### Scenario: unprovable is refused
- **WHEN** an artifact's referencing status cannot be established
- **THEN** it is refused and counted in the refusal total
- **AND** it is never a reclaim candidate

#### Scenario: apply is deliberate and recorded
- **WHEN** `--apply` runs with the confirmation token
- **THEN** the deleted set, byte total, SHA, refusal set and date are recorded
- **AND** a run without the token deletes nothing

### Requirement: Test and scratch output SHALL have one owned location and a bounded lifetime

Nineteen `test-results*` roots accumulated because each ad-hoc run chose its own
output directory and nothing ever removed one. Four `.tmp-*` trees accumulated
the same way. These are not evidence; they are runner output and scratch.

Playwright output SHALL resolve to a single configured root per lane, and the
eleven root-level `playwright.*.config.ts` files SHALL share that resolution
rather than each naming its own. Scratch trees SHALL live under one ignored
root.

`npm run hygiene:clean` SHALL remove runner output and scratch — which it does
not do today for the nineteen historical roots — while never touching
`artifacts/`, the owner-only finding store, the review store, or any tracked
file. Its dry-run SHALL list exactly what it would remove.

A structural rule SHALL fail when a new root-level output or scratch directory
pattern appears that is not the owned location, so the nineteen cannot become
twenty.

#### Scenario: historical runner output is removable
- **WHEN** `hygiene:clean` runs in this checkout
- **THEN** the 19 `test-results*` roots and the 4 `.tmp-*` trees are listed and
  removed
- **AND** `artifacts/`, `$HOME/.nightwatch/findings` and
  `$HOME/.nightwatch/reviews` are untouched

#### Scenario: no tracked file is ever removed
- **WHEN** `hygiene:clean` runs with tracked files present under any candidate
  path
- **THEN** it refuses that path and reports it
- **AND** `git status --porcelain` is unchanged afterwards

#### Scenario: a new stray output root is rejected
- **WHEN** a config or test writes to a root-level directory that is not the
  owned output location
- **THEN** `hardening:check` fails naming the path

### Requirement: A fresh clone SHALL be a viable working copy, and that SHALL be measured

The honest statement of the current situation is that a fresh clone plus one
regression is cheap while this working copy is 919 MB of accumulated evidence.
The project SHALL state the expected steady-state disk footprint of a working
checkout, distinguishing the repository, `node_modules`, one run's artifacts,
and accumulated evidence, and SHALL measure it rather than estimate it.

`docs/HOST-CAPABILITY-MATRIX.md` §1 SHALL carry the figure alongside the Node
and OS requirements, because disk is a host requirement and is currently
unstated.

#### Scenario: the footprint is measured and stated
- **WHEN** the matrix is read
- **THEN** it states the measured checkout, dependency and per-run artifact
  sizes with the date measured
- **AND** the figures are governed by the census-figure ledger
