# Nightwatch Bounded DEV Requalification

Task ID: `nightwatch-dev-requalification-v1`
Phase: `DEV_REQUALIFICATION_V1`
Starting SHA: `e51bf7730a8d79051ceb19f8ae9dd3eece5aa300`
Last validated implementation: `f8757303403dffab6039be3f51b807c8631e3c6a`
Authorization class: `NIGHTWATCH_DEV_REQUALIFICATION_V1`
Project verdict effect: `PRESERVE`
OpenSpec: `openspec/changes/nightwatch-dev-requalification-v1/`

## Purpose

Close the real-DEV evidence gap created by the predecessor's expired session
without reopening its terminal state or weakening the read-only model.

## Starting State

- Git `main` was clean and synchronized at `e51bf773` before this successor.
- Owner-led DEV authentication capture completed through the guarded browser
  and proxy; the external state passed structural and page-validity checks.
- The predecessor's historical Phase 2C divergence/retry, billinggroups
  anomaly, and auth-blocked continuation remain separate evidence categories.

## Scope

Three serial Phase 2C invocations, followed by the existing guarded Phase 4,
Phase 5, campaign prepare/resume, and safe replay paths where available. All
evidence is sanitized and owner-local.

## Non-Goals

Production/NEXT, DEV mutation, data or infrastructure access, sibling writes,
publication, new proof families, oracle relaxation, credential inspection,
opaque scoring, and retry-based correctness certification.

## Safety Constraints

Use only the existing target, proxy, browser, authentication, mutation,
source-currentness, privacy, and campaign gates. Run serially. Raw
credentials, cookies, storage state, customer values, DOM, responses, traces,
and raw findings never enter Git or task records.

## Architecture / Approach

The existing guarded launchers remain the execution authority. The task adds
no alternate browser or network path. Each launcher result is retained as an
independent sanitized observation, and any implementation defect is first
reduced to a local deterministic regression before a real run resumes.

## Milestones

### M0 — Successor activation and baseline — IN_PROGRESS

- Create and bind the continuity-v2 task and OpenSpec route.
- Run freshness, safety, handoff, project, and agent checks before DEV.
- Record the exact starting SHA and refreshed-auth boundary.

### M1 — Repeated Phase 2C sample — PENDING

- Run three serial Phase 2C invocations with the owner-managed state.
- Preserve each run, journey, replay, and cleanup category independently.
- Classify any divergence and stop for a Nightwatch defect.

### M2 — Cross-phase observation — PENDING

- Run Phase 4, Phase 5, campaign prepare/resume, and one safe replay where
  available.
- Verify product-vs-framework classification, finding deduplication, state,
  cleanup, and resource boundaries.

### M3 — Reconciliation and closure — PENDING

- Run final validation appropriate to changed implementation and evidence.
- Complete STATE/REPORT, OpenSpec task checkboxes, project/live docs, and Git
  checkpoint; commit, push, and verify clean parity.

## Execution rules

Run only the existing guarded DEV launchers serially. A retry is a new
observation. Never turn an auth, environment, timing, framework, or unknown
result into a product PASS, and never treat a product anomaly as a Nightwatch
failure without evidence.

## Validation Strategy

Before real execution: `npm run agent:check`, `npm run handoff:check`,
`npm run project:check`, `npm run hardening:check`, and the bounded DEV
preflight. After execution: focused relevant tests, full local/clean gates as
needed, state/project/handoff checks, privacy checks, and clean Git parity.

## Decision Log

- 2026-08-31 — Created this successor at the live `main` head because the
  predecessor is terminal and owner-managed authentication is freshly valid.
- 2026-08-31 — Chose explicit `PRESERVE` during bounded read-only evidence
  collection; any invalidating result must use the explicit `REEVALUATE` path.

## Discoveries

- The guarded auth capture reached the approved DEV target and completed safe
  post-login/state validation.

## Deferred Work

- Any new proof family below the existing mechanical admission bar.
- Any operation requiring production, NEXT, mutation, data, infrastructure,
  publication, or a new authorization boundary.
- A future larger DEV soak if this bounded sample leaves a measured gap.

## Completion Criteria

All scheduled observations have independent sanitized outcomes; any defect is
closed or explicitly deferred under policy; final state and Git validation
pass; and the task is closed only after its report and OpenSpec checklist are
terminal.
