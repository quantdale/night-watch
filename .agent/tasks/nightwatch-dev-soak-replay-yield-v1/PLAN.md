# Nightwatch DEV Capture Soak, Replay, and Yield — Plan

Task ID: nightwatch-dev-soak-replay-yield-v1
Phase: DEV_SOAK_REPLAY_YIELD_V1
Status: IN_PROGRESS
Starting SHA: 754aa629b4b24bda0eca98fe567cc44ef536e30d
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Milestones

## M0 — Baseline, freshness, safety, auth readiness

Status: COMPLETE

Canonical Git, continuity/audit, handoff, project truth, reading-order,
approved-source/runtime identity, DEV preflight, and owner-managed storage
state were all revalidated. No executable source change belongs to this
milestone; the task lives at the fetched documentation checkpoint.

## M1 — Phase 2C capture soak

Status: COMPLETE

Ten independent serial launchers ran. They produced 10 fresh matrix files,
56 observations (four observations were not reached after one bounded run
stopped at the first payer pair), and 28 replay comparisons. All auth,
safety, and privacy fields remained valid. The observed product anomalies,
settlement timeouts, and two `BODY_READ_TIMEOUT` codes remain evidence; no
Nightwatch-owned Critical/High defect was found by the local timeout
regression.

## M2 — Cross-phase reliability

Status: IN_PROGRESS

Run five Phase 4 explorations and five Phase 5 API first+fresh-replay cycles
serially. Preserve every categorical outcome.


## M3 — Fresh campaign soak

Status: NOT_STARTED

Run five independently prepared current-source Phase 7 campaigns. Never reuse
a stale manifest. Measure completion, account coverage, capture-limited stops,
candidate/cluster/dossier yield, duplication/loss, and safety/privacy.

## M4 — Current replay/dossier closure

Status: NOT_STARTED

Use only fresh DVR-011-admitted product candidates. Execute at most five safe
attack replays total. If none exist after the full sample, record replay as
STARVED_BY_CURRENT_ADMISSION rather than PASS.

## M5 — Quantitative diagnosis

Status: NOT_STARTED

Compute capture success/failure rates, journey/context correlations,
account-inventory reach, candidate-to-replay-to-dossier conversion, and
before/after repair impact.

## M6 — Final validation and closure

Status: NOT_STARTED

Run focused/full gates, clean Node 20 qualification, parity where required,
single exact-head CI observation, reconcile task/project truth, push clean
main, and record one terminal soak outcome.

## Purpose

Measure residual real-DEV capture instability after DVR-012 and obtain fresh
current-source replay/dossier evidence without weakening DVR-011.

## Starting State

- Canonical `main` was reconciled to `origin/main` at the fetched live head
  before execution.
- The predecessor is terminal and preserved `OPERATIONALLY_ACCEPTED`.
- The predecessor's current-source campaign ended at `BODY_UNAVAILABLE` with
  zero candidates and no replay authority.
- Owner-managed DEV storage state remains external and must pass page-visible
  authentication checks before target work.

## Scope

Ten independent serial Phase 2C invocations, five bounded Phase 4
explorations, five Phase 5 first-plus-fresh-replay cycles, five fresh
current-source Phase 7 campaigns, and current replay/minimization/dossier
closure only when DVR-011 admits a candidate.

## Non-Goals

Production or NEXT contact, mutation, datastore or infrastructure work,
sibling writes, publication, credential persistence, raw authenticated
evidence, stale-manifest replay, weakened admission, and retry-based claims.

## Safety Constraints

Use only the existing DEV-only guarded launchers, mandatory containment,
owner-managed external storage state, passive/read-only contracts, redaction,
source-currentness, privacy, and strict replay gates. Preserve every
independent failure and stop for a newly reproduced Critical/High Nightwatch
defect.

## Architecture / Approach

The existing launchers and evidence contracts are the sole execution
authority. Each invocation is a distinct sample. Sanitized categorical
metrics are aggregated from owner-local artifacts; implementation changes are
reproduced locally, regression-tested, validated, and checkpointed before any
fresh DEV execution.

## Validation Strategy

Before DEV: dependency restore, typecheck, hardening, continuity/audit,
handoff, project truth, quality/spec, inventory, semantic compatibility,
owner provenance, synthetic campaign, local gate, focused capture/replay
tests, source identity, DEV preflight, containment readiness, and auth
readiness. After execution: focused regressions, final gates, clean/parity
validation where required, exact-head CI inspection, and clean Git parity.

## Decision Log

- 2026-08-31 — Reconciled local `main` to fetched `origin/main` before
  continuing; no branch or worktree alternative is authorized.
- 2026-08-31 — Retained the existing task and predecessor closure; no
  successor task and no reopening of `nightwatch-dev-requalification-v1`.
- 2026-08-31 — Preserve `OPERATIONALLY_ACCEPTED`; use only the five terminal
  soak outcomes defined by the execution handoff.

## Discoveries

- The fetched remote advanced the clean local checkout by fourteen
  documentation/continuity commits; execution must use the reconciled head.
- The active task scaffold required the full continuity-v2 headings before
  `agent:check` could pass.

## Deferred Work

- Any new proof family or unrelated refactor.
- Any operation outside local source intelligence, contained DEV
  browser/API testing, deterministic replay, minimization, sanitized
  evidence, and private local triage.

## Completion Criteria

All authorized samples attempted or stopped at a genuine auth/environment or
defect boundary; every outcome is retained with actual quantitative rates;
only current DVR-011-admitted candidates are replayed; defects are repaired or
explicitly dispositioned; continuity, project truth, safety/privacy,
validation, CI-truth, and clean Git closure are reconciled.
