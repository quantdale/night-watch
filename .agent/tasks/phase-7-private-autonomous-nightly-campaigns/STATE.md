# Task State

## Identity

Task ID: phase-7-private-autonomous-nightly-campaigns
Phase: 7 — PRIVATE AUTONOMOUS NIGHTLY CAMPAIGNS
Status: IN_PROGRESS
Starting SHA: 4f8263206f82740c47f1b25554269b59d8e03b8d
Current SHA: 9d260689065fb1ba38cf144ae336d181c248c67c
Last validated implementation SHA: 9d260689065fb1ba38cf144ae336d181c248c67c
Last implementation checkpoint: 9d260689065fb1ba38cf144ae336d181c248c67c
Branch: main
Nightwatch remote: NO_REMOTE

## Objective

Coordinate existing source selection, trusted journeys, safe exploration,
read-only API replay, deterministic clustering/minimization, private dossier
writing, checkpoint recovery, and morning briefing into one bounded local
DEV-only campaign.

## Current Milestone

M6 — bounded real DEV campaign and closure.

## Completed Milestones

M0 recovery/task creation, M1 contracts/manifest/budget, M2 Phase 3/4/5
lineage selection, M3 checkpoint/resume/drift/storm control, M4 anomaly
admission/replay/minimization/dossier/brief integration, and M5 synthetic
campaign validation are complete at implementation checkpoint
9d260689065fb1ba38cf144ae336d181c248c67c.

## Work In Progress

The single bounded real DEV campaign, final validation, architecture review,
adversarial review, and clean closure remain.

## Exact Next Action

Commit this task-state checkpoint, verify a clean Nightwatch tree, then run
exactly one bounded `npm run campaign:real -- --env=dev` campaign with the
external owner-only DEV storage state. Stop with the precise auth/safety/
owner-policy/privacy blocker if preflight cannot pass.

## Files Changed

Phase 7 task state/plan/active routing plus the implementation checkpoint's
campaign orchestrator, fixture corpus, real launcher/adapter, and focused
tests. No Alphaus repository files or real private evidence are included.

## Validation Ledger

Single-writer check PASS; prior task SHA reconciliation PASS; Phase 6 owner
freeze tripwires PASS; TypeScript PASS; `npm run campaign:synthetic` PASS with
13 tests; `git diff --check` PASS; real launcher help PASS; Nightwatch remote
is `NO_REMOTE`; real campaign pending.

## Decisions Made During This Task

The initial real replay ceiling is 8: three linked Phase 5 fresh replays,
one representative reproduction allowance, and the existing one-exact/four-
candidate private triage allowance. `REPRODUCTION_ONLY` uses the existing
reproduction callback and bounded triage path without fresh coverage.

## Discoveries

The existing Phase 2C/3/4/5/private-triage contracts are sufficient for
orchestration through typed callbacks. A clean DEV campaign is valid evidence;
no anomaly is manufactured.

## Blockers

None at implementation checkpoint. Real DEV auth or safety may fail closed;
that would be a precise campaign blocker, not permission to widen scope.

## Safety Events

No Phase 7 external execution yet. Synthetic and implementation safety vectors
are zero. Required real values are zero for production, proxy, unknown
destinations/approvals, mutations, action-caused UNKNOWN, database,
infrastructure, and external publication.

## Deferred / Follow-Up

Optional contained DevTools corroboration, private/local AI summarization,
future local scheduling, and any owner-approved scope change. No cloud,
datastore, deployment, or external-publication work is recommended.

## Resume Recipe

Read `AGENTS.md`, `docs/CURRENT_STATE.md`, this task's SPEC/PLAN/STATE/REPORT,
inspect `git status --short`, validate manifest/checkpoint fingerprints, and
resume only pending or explicitly `REPLAY_REQUIRED` work. Never restart
completed work or widen catalogs/policy.

## Completion Snapshot

Implementation checkpoint 9d260689065fb1ba38cf144ae336d181c248c67c is clean;
synthetic matrix passes; real campaign and final closure are pending.

## CURRENT_GOAL

Build a deterministic private/local campaign orchestrator that safely selects,
runs, clusters, reproduces, minimizes, triages, checkpoints, resumes, and
summarizes existing Nightwatch work without infrastructure/data access.

## CURRENT_PHASE

M6 — bounded real DEV campaign and closure.

## OWNER_SCOPE_POLICY

`FROZEN_BY_OWNER`; reason `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
Phase 6 real datastore budget: maximum 6, used 0. L4 is
`OUT_OF_SCOPE_BY_OWNER`. GCP/GKE/Kubernetes, kubectl, AWS infrastructure/IAM/
STS, DynamoDB, BigQuery, Spanner, production SQL, deployment archaeology,
external publication, and coworker/platform-owner requests remain blocked.

## CAMPAIGN_SCHEMA_VERSION

`nightwatch.campaign.private.v1`

## ORCHESTRATOR_VERSION

`nightwatch.orchestrator.private.v1`

## CAMPAIGN_ID

Real campaign not created yet; identity will be derived from the frozen
manifest, source snapshots, catalogs, seeds, budget, and policy versions.
Timestamp is not an identity input.

## CAMPAIGN_MODE

Real mode is selected from the committed source window only:
`CHANGE_DIRECTED` when non-empty, otherwise explicit `BASELINE_HEALTH`.
Synthetic coverage also passed `LOCAL_SYNTHETIC`; manifest tests cover
`COVERAGE_EXPANSION` and `REPRODUCTION_ONLY` contracts.

## SOURCE_SNAPSHOTS

Synthetic snapshots are deterministic read-only fixtures. The real run will
capture only the Phase 3-relevant Ripple repositories immediately before its
manifest, including branch, HEAD, tracking ref/SHA, ahead/behind, dirty state,
source-map SHA, freshness, and `readOnly=true`. Dirty files remain excluded
from committed/deployment inference.

## SELECTION_RESULT

Synthetic selection passed J1-only, J2/J3/shared-change, baseline, fallback,
negative-selection, and reproduction-only checks. Real selection is pending
the current committed source snapshot and will reuse Phase 3 unchanged.

## SELECTED_JOURNEYS / SELECTED_ENVELOPES / SELECTED_API_SCENARIOS

Synthetic lineage is deterministic and ordered `JOURNEY → API → EXPLORATION`;
real selection is pending. The initial real profile permits only linked J1/J2/
J3 canaries, one linked Phase 4 envelope/seed each, and one linked Phase 5
read-only API operation each.

## SEED_LEDGER

Real seed corpus: `nightwatch.phase7.real-dev-seeds.v1`; fixed seeds are one
per approved E1/J1, E2/J2, and E3/J3 envelope. Synthetic corpus:
`nightwatch.phase7.synthetic-seeds.v1`.

## BUDGET_POLICY / BUDGET_USED / BUDGET_REMAINING

Initial real maximums: 6 total browser contexts, 3 journey contexts, 3
exploration contexts, 6 API executions, 8 replays, 4 minimization candidates,
24 actions, 15 minutes, 120 seconds/test, 3 promoted clusters, and 10 MiB
private evidence. The 8 replay maximum covers 3 required API fresh replays
plus one representative replay and the existing one-exact/four-candidate
triage allowance. Real used/remaining is not yet created.

## EXECUTION_LEDGER

Synthetic orchestrator execution ledger, checkpoint writes, at-least-once
replay-required interruption, and completed-work skip behavior passed. Real
ledger will be written atomically after manifest creation and each major work
unit.

## ANOMALY_CLUSTERS

Synthetic matrix: 5 stable clusters, including UI, API, irreducible,
transient, and known Nightwatch false-positive cases. A two-surface shared
fingerprint storm stopped before reproduction. Real clusters: none observed
yet.

## REPRODUCTION_QUEUE / MINIMIZATION_QUEUE

Synthetic representative admission, reproduction prioritization, bounded
minimization, and reproduction-only execution passed. Real queues are empty
until a natural anomaly is admitted; no product failure is manufactured.

## DOSSIER_LEDGER / MORNING_BRIEF_STATUS

Synthetic matrix produced 3 private dossiers and a concise top-3 brief; clean
baseline produced `NO ADMITTED PRODUCT ANOMALIES`. Real owner-only findings
remain outside Git under `$HOME/.nightwatch/findings/`; no remote or external
publication exists.

## FILES_CHANGED

`src/core/campaign/`, `tests/unit/campaign.test.ts`,
`tests/manual/phase7-real-campaign.ts`, `corpus/phase7/`,
`playwright.phase7.config.ts`, `bin/phase7-real.mjs`, package scripts, and
native Phase 7 task artifacts.

## VALIDATION_LEDGER

- Prior task reconciliation: PASS; prior implementation/closure/final SHAs
  exist and starting clean HEAD is `4f826320...`.
- Single-writer check: PASS; no competing Nightwatch writer was present.
- Phase 6 freeze and owner-policy tripwires: PASS in focused tests.
- `npx tsc --noEmit`: PASS at implementation checkpoint.
- `npm run campaign:synthetic`: PASS, 13 tests.
- `git diff --check`: PASS at implementation checkpoint.
- `npm run campaign:real -- --help`: PASS; launcher is opt-in and DEV-only.
- Real campaign: pending auth/preflight and bounded execution.

## BUG_CANDIDATES

No real product candidate. Synthetic candidates are fixture-only and are not
reported as product findings.

## REJECTED_HYPOTHESES

- An empty committed source window must not become fabricated change.
- Dirty Alphaus worktrees are not deployment proof.
- Source relevance is not causal attribution.
- A clean DEV campaign is not a failure of Phase 7.
- Historical J2 font 502 must remain `L0_NOT_REPRODUCED` unless it naturally
  recurs; malformed JSON must not be deliberately triggered.

## UNRESOLVED

No naturally admitted DEV anomaly is currently available for minimization.
Real auth/DEV availability and current source-window mode remain to be
observed by the frozen bounded gate.

## SAFETY_EVENTS

Implementation and synthetic safety vectors are zero. Required real vector:
production attempts 0, proxy violations 0, unknown destinations 0, unknown
approvals 0, product mutations 0, action-caused UNKNOWN 0, database queries 0,
infrastructure queries 0, external publication attempts 0.

## PRIVACY_STATUS

Synthetic privacy PASS. Real evidence destination is owner-only local storage;
credentials, cookies, tokens, customer values, raw bodies, DOM, screenshots,
and authenticated traces must remain absent.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`9d260689065fb1ba38cf144ae336d181c248c67c`

## LAST_CHECKPOINT_SHA

`9d260689065fb1ba38cf144ae336d181c248c67c`

## NEXT_EXACT_ACTION

Commit this task-state checkpoint, verify the Nightwatch tree is clean, then
run exactly one bounded `npm run campaign:real -- --env=dev` campaign with the
external owner-only DEV storage state. If auth or safety cannot pass, stop
with the precise blocker class and do not use an alternative credential or
scope.

## RESUME_RECIPE

Read Nightwatch `AGENTS.md`, `docs/CURRENT_STATE.md`, this task's SPEC/PLAN/
STATE/REPORT, inspect `git status --short`, validate manifest/checkpoint
fingerprints, read the completed-work ledger, and resume only pending or
explicitly `REPLAY_REQUIRED` work. Never restart completed work or widen
catalogs/policy.

## CHECKPOINT_SEMANTICS

Manifest/checkpoint/finalization are `EXACTLY_ONCE_LOGICAL`; browser/API
execution is `AT_LEAST_ONCE_SAFE`; an interrupted `RUNNING` item is explicitly
`REPLAY_REQUIRED`. The runtime campaign cannot modify Nightwatch code.
