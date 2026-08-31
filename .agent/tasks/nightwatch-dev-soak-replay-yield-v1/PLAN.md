# Nightwatch DEV Capture Soak, Replay, and Yield — Plan

Task ID: nightwatch-dev-soak-replay-yield-v1
Phase: DEV_SOAK_REPLAY_YIELD_V1
Status: COMPLETE
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

Status: COMPLETE

Five Phase 4 explorations and five Phase 5 API first/fresh-replay cycles ran
serially. Phase 4 consistently stopped at the account anchor after four
successful payer/common records; Phase 5 completed its full six-operation
first/replay corpus in every cycle.

## M3 — Fresh campaign soak

Status: COMPLETE

Five fresh prepare/resume pairs ran from current source. All used newly written
manifests in isolated owner-only roots; no predecessor checkpoint was resumed.
One campaign was capture/settlement-limited after the payer journey; four
completed all five work items and emitted two strict product candidates each.

## M4 — Current replay/dossier closure

Status: COMPLETE

The fresh campaigns emitted eight product candidates across two stable
fingerprints, but every candidate remained `PROTOCOL_ONLY / UNRESOLVED`.
Four one-cluster reproduction queues were blocked by the bounded
`journeyContexts` budget before executor entry. No stale candidate was replayed,
no attack replay executor ran, and no dossier was generated. Terminal outcome:
`SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE`.

## M5 — Quantitative diagnosis

Status: COMPLETE

M1/M2/M3 capture, settlement, account reach, candidate, replay, dossier,
duplication, cleanup, and before/after repair rates are recorded in STATE.md
and REPORT.md. The evidence attributes the remaining weakness to bounded DEV
capture/settlement and the per-kind campaign budget, not a newly reproduced
Nightwatch Critical/High defect.

## M6 — Final validation and closure

Status: COMPLETE

All required local/source, continuity, project, synthetic, privacy, and
clean-checkout validation passed or was recorded as external non-evidence.
The task truth is reconciled and the terminal outcome is
`SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE`. No additional DEV
execution is authorized.

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
