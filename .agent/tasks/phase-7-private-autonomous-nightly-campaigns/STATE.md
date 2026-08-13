# Task State

## Identity

Task ID: phase-7-private-autonomous-nightly-campaigns
Phase: 7 — PRIVATE AUTONOMOUS NIGHTLY CAMPAIGNS
Status: IN_PROGRESS
Starting SHA: 4f8263206f82740c47f1b25554269b59d8e03b8d
Current SHA: a9783ebe244381fe50e8387bd69af3f65a2f558d
Last validated implementation SHA: a9783ebe244381fe50e8387bd69af3f65a2f558d
Last implementation checkpoint: a9783ebe244381fe50e8387bd69af3f65a2f558d
Branch: main
REMOTE_STATUS: PRIVATE_REMOTE_CONFIRMED
REMOTE: origin
REMOTE_REPOSITORY: quantdale/night-watch
REMOTE_BRANCH: main
CANONICAL_GIT_ROOT: /home/dalepalaca/go/src/alphaus-main/REPOSITORIES/nightwatch
PARENT_WORKSPACE_GIT: RETIRED (parent workspace is not a Git repository)
REMOTE_HEAD: a9783ebe244381fe50e8387bd69af3f65a2f558d

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
dd5cef0a65f00721adf2e68db1f23ca9efc8d7b9.

## Work In Progress

The single bounded real DEV campaign stopped correctly at the guarded auth
gate and remains immutable historical evidence. Remote reconciliation is
complete. Designated DEV page-valid auth is now restored through the existing
guarded provider. The real launcher now has an explicit prepare-only freeze
and resume-by-campaign-ID path; final manifest creation, one campaign
execution, architecture review, adversarial review, and clean closure remain.

## Exact Next Action

Run `npm run campaign:real -- --env=dev --prepare-only` to create and freeze
one new current-version bounded campaign manifest, checkpoint the result as
`PHASE_7_NEW_REAL_CAMPAIGN_READY`, push the sanitized state, and then run
exactly one `--resume-campaign=<new-id>` bounded DEV campaign. Do not rerun
the historical campaign: its single attempt is durably recorded as
`PARTIAL_AUTH_BLOCKED` and the implementation SHA changed afterward, so it
cannot be silently resumed.

## Files Changed

Phase 7 task state/plan/active routing, campaign orchestrator and version/drift
guards, fixture corpus, real launcher/adapter, focused tests, and project-state
documentation, plus authenticated-artifact permission hardening and its
regression test. No Alphaus repository files or real private evidence are
included.

## Validation Ledger

Single-writer check PASS; prior task SHA reconciliation PASS; Phase 6 owner
freeze tripwires PASS; TypeScript PASS; focused campaign tests PASS (16/16);
synthetic campaign PASS; `git diff --check` PASS at implementation
checkpoints; real launcher help PASS; explicit prepare/resume workflow PASS;
auth preflight PASS; 33 focused
auth/storage tests PASS; guarded DEV refresh PASS with page-valid state and no
MFA; authenticated artifact permission regression PASS; source remote is
`PRIVATE_REMOTE_CONFIRMED` on `origin/main`; the historical single real
campaign is `PARTIAL_AUTH_BLOCKED` before product work; the existing guarded
auth refresh completed with page-valid DEV state and no MFA.

## Decisions Made During This Task

The initial real replay ceiling is 8: three linked Phase 5 fresh replays,
one representative reproduction allowance, and the existing one-exact/four-
candidate private triage allowance. `REPRODUCTION_ONLY` uses the existing
reproduction callback and bounded triage path without fresh coverage.

## Discoveries

The existing Phase 2C/3/4/5/private-triage contracts are sufficient for
orchestration through typed callbacks. The real adapter now maps admitted
representatives back to the existing guarded journey, exploration, or API
runner and reserves its declared reproduction resources. A clean or
auth-blocked DEV campaign is valid evidence; no anomaly is manufactured.

## Blockers

The historical designated external DEV auth state was not page-valid and the
single campaign's bounded refresh could not complete its MFA step. That
blocker is resolved by one later guarded refresh using the same designated
provider; no alternate credential or scope was used. The old auth-blocked
manifest is retained as evidence and is incompatible with the current
Nightwatch source version.

## Safety Events

Synthetic and real safety vectors are zero. The real preflight created no
product context and recorded production attempts 0, proxy violations 0,
unknown destinations 0, unknown approvals 0, product mutations 0,
action-caused UNKNOWN 0, database queries 0, infrastructure queries 0, and
external publication attempts 0.

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

Implementation checkpoint a9783ebe244381fe50e8387bd69af3f65a2f558d is clean;
synthetic matrix, focused tests, typecheck, auth refresh, page-validity,
authenticated privacy hardening, frozen-manifest workflow, and remote push
pass. The historical real campaign remains durably auth-blocked; a new
campaign is not yet created.

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

## AUTH_STATUS / AUTH_REFRESH_LEDGER

`AUTH_STATUS=VALID`; `AUTH_ENV=DEV`; `PAGE_VALID=true`; `MFA_USED=false`.
The existing guarded refresh completed once on 2026-08-13 with sanitized
capture/run ID `nightwatch-20260813T151556Z-3210`; `refresh_attempts=1`.
Structural storage validation, DEV provenance, token freshness, cookie
domain/path applicability, page-JavaScript readability, authenticated Ripple
shell/readiness, metadata-only evidence, and atomic replacement all passed.
Credential contents, storage-state contents, and identity values remain
outside Nightwatch state.

## CAMPAIGN_SCHEMA_VERSION

`nightwatch.campaign.private.v1`

## ORCHESTRATOR_VERSION

`nightwatch.orchestrator.private.v1`

## HISTORICAL_BLOCKED_CAMPAIGN_ID / CURRENT_CAMPAIGN_ID

Historical real campaign: `campaign:sha256:ed4520e8fa7c3a9d2b1481f5`. Manifest fingerprint:
`manifest:sha256:861ae8b3dffdb88ea8a262e7`. Identity was derived from the frozen
manifest inputs; timestamp was not an identity input.
Current campaign: `NONE — create a new manifest from current SHA before product execution`.

## MANIFEST_STATUS

Historical manifest/checkpoint: immutable and not resumable. New manifest:
not created; it must use current Nightwatch versions, source snapshots,
selection, lineage, seeds, budget, privacy policy, and owner-scope policy.

## CAMPAIGN_MODE

Real mode: `CHANGE_DIRECTED`; the committed-only source window was non-empty.
Synthetic coverage also passed `LOCAL_SYNTHETIC`; manifest tests cover
`BASELINE_HEALTH`, `COVERAGE_EXPANSION`, and `REPRODUCTION_ONLY` contracts.

## SOURCE_SNAPSHOTS

The real run captured only the Phase 3-relevant Ripple repositories immediately
before its manifest, including branch, HEAD, tracking ref/SHA, ahead/behind,
dirty state, source-map SHA, freshness, and `readOnly=true`. It recorded
`COMMITTED_ONLY`, 940 changed files, and 82 dirty files; dirty files remained
excluded from committed/deployment inference. Closure read-only verification
found all relevant Alphaus HEADs unchanged. The current `ouchan` worktree has
79 dirty entries versus the campaign manifest's 71; this pre-existing dirty
worktree drift was not touched, cleaned, or used as deployment evidence.

## SELECTION_RESULT

Synthetic selection passed J1-only, J2/J3/shared-change, baseline, fallback,
negative-selection, and reproduction-only checks. Real Phase 3 selection
conservatively selected all three trusted journeys under fallback, with linked
E1/E2/E3 envelopes and J1/J2/J3 API scenarios; no dirty change was treated as
deployed.

## SELECTED_JOURNEYS / SELECTED_ENVELOPES / SELECTED_API_SCENARIOS

Synthetic lineage is deterministic and ordered `JOURNEY → API → EXPLORATION`.
Real selected and ordered J1/J2/J3, one linked E1/E2/E3 envelope/seed each,
and one linked Phase 5 read-only API operation each. No work item completed
because preflight stopped at auth.

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
triage allowance. Real used: browser 0, journey 0, exploration 0, API 0,
replays 0, minimization candidates 0, actions 0, evidence 807202 bytes.
Real remaining: browser 6, journey 3, exploration 3, API 6, replays 8,
minimization candidates 4, actions 24, evidence 9678558 bytes.

## EXECUTION_LEDGER

Synthetic orchestrator execution ledger, checkpoint writes, at-least-once
replay-required interruption, and completed-work skip behavior passed. The real
ledger is atomic at checkpoint ordinal 0: all 9 selected work items remain
PENDING, no attempt ran, and the next exact action is the first J1 journey only
after a new compatible campaign is created.

## ANOMALY_CLUSTERS

Synthetic matrix: 5 stable clusters, including UI, API, irreducible, transient,
and known Nightwatch false-positive cases. A two-surface shared fingerprint
storm stopped before reproduction. Real clusters: 0; no product work ran.

## REPRODUCTION_QUEUE / MINIMIZATION_QUEUE

Synthetic representative admission, reproduction prioritization, bounded
minimization, and reproduction-only execution passed. Real reproduction and
minimization queues are empty because auth blocked before anomaly intake; no
product failure is manufactured.

## DOSSIER_LEDGER / MORNING_BRIEF_STATUS

Synthetic matrix produced 3 private dossiers and a concise top-3 brief; clean
baseline produced `NO ADMITTED PRODUCT ANOMALIES`. The real owner-only brief is
READY with headline `NO ADMITTED PRODUCT ANOMALIES`; no dossier was produced.
Private artifacts remain outside Git under `/home/dalepalaca/.nightwatch/findings/`
with mode 0600; there is no runtime findings remote or external publication.

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
- `npx tsc --noEmit`: PASS after the replay/drift guard checkpoint.
- `npx playwright test tests/unit/campaign.test.ts --workers=1`: PASS, 16/16.
- `npm run campaign:synthetic`: PASS, 16/16.
- `npx playwright test --workers=1`: PASS, 375/375.
- `npm run agent:check`: PASS with one expected approved-checkpoint warning.
- `git diff --check`: PASS.
- `npm run campaign:real -- --help`: PASS; launcher is opt-in, DEV-only, and
  requires an explicit prepare-only or resume-by-ID phase.
- Real campaign: PASS for fail-closed auth stop; `PARTIAL_AUTH_BLOCKED`, zero
  product work, zero anomalies, private brief READY.
- Owner-only private artifact permissions/privacy audit: PASS.
- Relevant Alphaus repository HEAD integrity: PASS; all unchanged. Current
  `ouchan` dirty count is 79 and is treated as pre-existing/unowned drift, not
  as a Nightwatch change or deployment claim.
- Final clean-tree check remains until this documentation checkpoint is committed.

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

No naturally admitted DEV anomaly is available for minimization. The historical
campaign is blocked on its prior designated DEV auth state/MFA completion; that
blocker is resolved for the next attempt. A fresh compatible campaign must be
created from the current Nightwatch source SHA; the previous manifest cannot
be silently resumed.

## SAFETY_EVENTS

Implementation, synthetic, and real safety vectors are zero: production
attempts 0, proxy violations 0, unknown destinations 0, unknown approvals 0,
product mutations 0, action-caused UNKNOWN 0, database queries 0,
infrastructure queries 0, and external publication attempts 0. L4 remains
`OUT_OF_SCOPE_BY_OWNER`.

## PRIVACY_STATUS

Synthetic privacy PASS. Real privacy PASS: owner-only local storage, mode 0600;
credentials, cookies, tokens, customer values, raw bodies, DOM, screenshots,
and authenticated traces were absent from campaign artifacts.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`a9783ebe244381fe50e8387bd69af3f65a2f558d`

## LAST_CHECKPOINT_SHA

`a9783ebe244381fe50e8387bd69af3f65a2f558d`

## LAST_PUSHED_SHA

`a9783ebe244381fe50e8387bd69af3f65a2f558d`

## PUSH_LEDGER

- Remote reconciliation checkpoint: `2aa2742d6a062e633fcb3faf2ca119a408b06758` pushed to `origin/main`.
- Authenticated-artifact implementation checkpoint: `adb8aa11caf5d74dafd091c8ff9680b3bd7ba460` pushed to `origin/main`.
- Frozen-manifest workflow implementation checkpoint: `a9783ebe244381fe50e8387bd69af3f65a2f558d` pushed to `origin/main`.
- Auth-ready state update: current implementation and auth evidence are
  recorded above; this documentation checkpoint is the next validated push.

## NEXT_EXACT_ACTION

Run the guarded prepare-only command, record the new campaign ID/fingerprint
and selected lineage here, push `PHASE_7_NEW_REAL_CAMPAIGN_READY`, then run
exactly one bounded DEV campaign by that frozen ID. Never reuse the historical
campaign ID, use an alternative credential, or widen scope.

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
