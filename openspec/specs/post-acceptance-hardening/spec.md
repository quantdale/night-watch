# post-acceptance-hardening Specification

## Purpose

Nightwatch has earned real DEV operational acceptance, but synthetic validation hides reliability, yield, source-intelligence, and lifecycle weaknesses. The next challenge is repeated, autonomous, safe, efficient, accurate discovery over long runs — not re-proving yesterday's single campaign.

## Requirements
### Requirement: reconciled operational acceptance truth

Live project documents SHALL present a consistent operational verdict. When the machine-checked truth block says `OPERATIONALLY_ACCEPTED` at a validated implementation SHA and the active task is COMPLETE, no live document SHALL claim the current campaign is `OPERATIONAL_ACCEPTANCE_BLOCKED` as present tense.

#### Scenario: stale present-tense contradiction fails closed

- **WHEN** `PROJECT_COMPLETION_STATUS` is `OPERATIONALLY_ACCEPTED` but `docs/ROADMAP.md` contains the present-tense live claim "current campaign is `nightwatch-operational-acceptance-v1` with project status `OPERATIONAL_ACCEPTANCE_BLOCKED`" or `docs/CURRENT_STATE.md` contains a live section "Current operational-acceptance campaign — blocked"
- **THEN** `hardening:check` fails with `HARDENING_DOCS_TRUTH_MISMATCH`

#### Scenario: historical blocked preserved

- **WHEN** the narrative describes the initial guarded probes that reached `OPERATIONAL_ACCEPTANCE_BLOCKED` before valid auth (e615b3b)
- **THEN** it is allowed when phrased as historical and followed by the terminal `OPERATIONALLY_ACCEPTED` at `598e7fa`

### Requirement: hardened production reliability

Nightwatch SHALL demonstrate repeated read-only DEV execution and long-run stability. Failures in replay divergence, checkpoint truth, exploration attribution, selector semantics, active detection, exact matching, anchor visibility, oracle settlement, or pending diagnostics SHALL have generalized regressions, not single-site patches.

#### Scenario: sibling pattern hardening

- **WHEN** a repair class (e.g., pending-only settlement) is applied to one call site
- **THEN** the hardening search considers sibling implementations and the shared abstraction is fixed with a regression covering the defect family

### Requirement: fresh source census and bounded expansion

The approved-source census SHALL be recalculated at current SHAs and compared to Phase 28 metrics before any new proof is admitted. A new proof family SHALL be admitted only when mechanically proven, bounded, and fail-closed with deterministic identity.

#### Scenario: no safe family

- **WHEN** no bounded sound expansion covers the top-ranked gap without weakening proof
- **THEN** the census records `NO_SAFE_NEW_FAMILY` and no coverage-only weakening is admitted

