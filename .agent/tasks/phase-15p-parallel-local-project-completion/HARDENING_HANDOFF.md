# Phase 15P — Integrated Hardening Handoff

Status at publication: ACCUMULATING (populated continuously from actual
evidence; finalized before terminal closure).

This file is the complete dependency-cone input for the future integrated
hardening campaign (`PHASE_15_INTEGRATED_HARDENING_LOCAL_ONLY`, separately
owner-gated). Nothing here grants hardening authority.

## Program starting SHA

`e07630238d314f48718b1ca9fce2dc9ee31317eb` (Phase-15P session start;
HEAD == origin/main verified after fetch --prune; the prior Session-2 closure
adoption lands as the first baseline checkpoint on top of it).

## Sub-agent assignments and outcomes

Recorded in SUBAGENT_LEDGER.md (live truth) and summarized here at closure.

## Accepted implementation SHAs

Recorded in INTEGRATION_LEDGER.md (live truth) and summarized here at closure.

## Canonical integration-wave SHAs

Recorded in INTEGRATION_LEDGER.md ## Wave checkpoints.

## Changed dependency cone

To be finalized from `git diff --name-only <starting-SHA>..<final-implementation-SHA>`
(machine-readable list produced at closure; see ## Changed-file manifest).

## New/changed schemas, versions, lifecycles

To be populated from accepted patches (PUBLIC_TYPES_OR_VERSIONS_CHANGED per
sub-agent handoff).

## Compatibility decisions; deleted/retained legacy surfaces

To be populated at closure.

## Synthetic corpus totals; focused/wave test raw counts

To be populated from actual runs (STATE.md Validation Ledger is the live
truth during execution).

## Quality floors

Required zeros at closure: determinismMismatchCount, privacyLeakCount,
falseCurrentCount, falseAdmissionCount,
falseMinimalityCertificationCount, versionDriftExecutorEscapeCount,
ownerPolicyEscapeCount.

## Known residual risks

To be populated at closure.

## Tests deliberately NOT_RUN / DEFERRED_TO_INTEGRATED_HARDENING

Complete canonical Playwright workers=1; topology-correct isolated complete
Playwright; exhaustive Phase 1–14 compatibility sweep; repository-wide
adversarial fuzz campaign; complete historical migration matrix; exhaustive
static/dead-code audit outside the touched cone; final CI-equivalent
reproduction; the integrated hardening campaign itself. Never marked PASS.

## GitHub Actions truth

FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD. Known pre-existing external
billing/spending-limit block produces zero-step failures in seconds; recorded
once per push, never retried in a loop. Local/source green is the only
acceptance evidence until Actions executes for live HEAD. Exact run IDs
recorded at closure.

## Changed-file manifest (machine-readable)

At closure: deterministic list of all files changed from the Phase-15P
starting SHA to the final implementation SHA, produced with
`git diff --name-only --no-renames <start>..<final>` and stored as a fenced
block below plus `artifacts/`-free plain text inline (no binaries).

## Recommended FINAL integrated hardening order

To be populated at closure.
