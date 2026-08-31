# Nightwatch Bounded DEV Requalification

Task ID: `nightwatch-dev-requalification-v1`
Phase: `DEV_REQUALIFICATION_V1`
Starting SHA: `e51bf7730a8d79051ceb19f8ae9dd3eece5aa300`
Last validated implementation: `374ad71e0ebbaadecf17b1c9a767f36b6f054552`
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

### M0 — Successor activation and baseline — COMPLETE

- Create and bind the continuity-v2 task and OpenSpec route.
- Run freshness, safety, handoff, project, and agent checks before DEV.
- Record the exact starting SHA and refreshed-auth boundary.
- Result: successor/OpenSpec activation and all pre-DEV checks passed at
  `2e7e84f`; the guarded DEV preflight passed with production explicitly
  denied.

### M1 — Repeated Phase 2C sample / capture repair — COMPLETE

- Run three serial Phase 2C invocations with the owner-managed state.
- Preserve each run, journey, replay, and cleanup category independently.
- Classify any divergence and stop for a Nightwatch defect.
- Repair the over-broad `activeJourneyRequests` settlement signal exposed by
  the second invocation, with a local hanging-subresource regression.
- Investigate DVR-003 from the third invocation: a settled source-reviewed
  known-read JSON response had unavailable body capture. Bounded body reads,
  categorical diagnostics, and a deterministic local truncated-response
  regression are implemented at `1d3eb0a`.
- The next post-fix invocation exposed DVR-004: a passive `UNKNOWN` JSON/XHR
  body timeout still made aggregate capture health incomplete even though both
  intentional known reads completed. Scope verdict-affecting capture health
  to intentional source-reviewed known reads while retaining passive response
  diagnostics, then requalify independently.
- The following invocation confirmed the payer pair replays cleanly, then
  exposed DVR-005 on the common journey: a bootstrap 5xx prevented the
  required read, but `CAPTURE_STATUS_UNKNOWN` masked the explicit structural
  and oracle failure. Let independent failed evidence classify before unknown
  capture; retain framework classification for an otherwise passing journey
  without established capture health. This precedence repair is checkpointed
  at `d1b9f31`; post-fix DEV confirmation completed at
  `nightwatch-20260831T094029Z-e57a`: payer and common journeys passed with
  complete intentional capture and no strict replay mismatches;
  account-inventory reproduced a stable product oracle in both contexts and
  replay classified the bounded difference as expected product-state drift.

### M2 — Cross-phase observation — IN_PROGRESS

- Run Phase 4, Phase 5, campaign prepare/resume, and one safe replay where
  available.
- The first Phase 4 run at `nightwatch-20260831T095007Z-246e` passed the gate
  and completed one bounded payer exploration, then stopped on a fresh-context
  critical bootstrap HTTP 502 product oracle with zero safety violations.
  Take one bounded Phase 4 confirmation before proceeding to Phase 5.
- The confirmation at `nightwatch-20260831T095337Z-c375` passed payer/common
  contexts and stopped at account inventory on the already observed
  `malformed-json` product oracle; exact replay remained unavailable after the
  failed anchor. Phase 4 evidence is complete as a truthful bounded outcome,
  not as an all-seeds PASS.
- The guarded Phase 5 run at `nightwatch-20260831T095813Z-09be` passed all six
  source-generated first executions and six fresh replays with stable
  fingerprints and zero safety/privacy counters. Proceed to campaign state.
- Campaign prepare passed with five bounded work items, but exact resume
  exposed DVR-006: two legitimate repeated anomaly observations were copied
  into the set-valued execution fingerprint summary without deduplication.
  Stop real execution, reduce this at the orchestrator/checkpoint boundary,
  and prove recovery locally before resuming the persisted campaign. The
  repair is implemented at `3cbe5f2`; focused campaign/checkpoint/triage
  coverage, typecheck, and hardening pass. The old manifest then refused
  before execution on its frozen source SHA; the launcher now reports that
  expected drift truthfully at `c1f5f52`. Prepare a fresh current-source
  campaign next and retain both prior outcomes separately. The fresh campaign
  `campaign:sha256:4b8372d920d9694ca6c67c77` completed 5/5 work items exactly
  once, ran two API replay pairs, retained one account product fingerprint,
  and stopped at the bounded reproduction reserve. Run one independent fresh
  cycle to test cross-campaign identity stability before final reconciliation.
  The second prepare-only attempt exposed DVR-008: an OpenSpec-only task
  checkpoint changed `nightwatchSourceSha`; the implementation pathspec repair
  is validated at `374ad71`, including a temporary-Git regression and the full
  31-test campaign suite. Prepare a fresh current-source manifest and resume
  only that manifest; do not reuse `campaign:sha256:ceae02f22573c85f4a6d6c5e`.
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
- The first exact campaign resume failed closed on duplicate execution
  fingerprints after prepare had passed. This is a Nightwatch-owned High
  checkpoint defect, not a reason to weaken the validator or discard repeated
  anomaly occurrences.

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
