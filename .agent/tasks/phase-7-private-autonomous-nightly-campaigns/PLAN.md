# Nightwatch — Private Autonomous Nightly Campaigns

## Purpose

Turn the completed private replay/triage stack into a single deterministic,
bounded, recoverable local campaign that can run unattended and leave a short
owner-only morning brief.

## Starting State

- Starting clean Nightwatch HEAD: `4f8263206f82740c47f1b25554269b59d8e03b8d`.
- Prior private-triage implementation: `ea434b57fc132c6544c4527cbaa494cb8412db92`.
- Prior closure checkpoint: `6c5e298c4b2423ce7ffc13715e259be691d71162`.
- Phase 6 remains `FROZEN_BY_OWNER` for
  `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; real data budget is 6 max,
  0 used, and no external continuation is allowed.
- Nightwatch uses the verified private `origin` remote
  (`quantdale/night-watch`, `main`) for validated source checkpoints. Real
  evidence remains owner-only local state and is never pushed.
- Phase 3/4/5/2C/private-triage contracts are frozen inputs. Do not recreate
  runners, selectors, explorers, API semantics, or minimizer logic.

## Scope

Add a versioned `src/core/campaign` orchestration layer, campaign policy and
fixture corpus, native Phase 7 task artifacts, focused tests, a guarded real
DEV campaign adapter/launcher, checkpoint/resume/brief artifacts, and final
project-state documentation.

## Non-Goals

Cloud or datastore investigation, deployment proof, production, mutation,
arbitrary browser/API control, fuzzing, load generation, external publication,
ticketing, source modification by the runtime, and AI execution.

## Safety Constraints

- Use `assertOwnerPolicyAllows` before every executor class and reject blocked
  operation classes before callbacks.
- All real contexts use existing `runRealRunGate`, browser containment,
  outbound proxy, auth provider, safe action catalog, API semantic catalog,
  and metadata-only evidence.
- Never write Alphaus repositories or expose credentials/customer values.
- Commit a clean Nightwatch checkpoint before the bounded real campaign.
- Synthetic fixtures prove the broader orchestration; no product anomaly is
  manufactured in DEV.

## Architecture / Approach

`CampaignInput -> preflight -> source snapshots/Phase 3 selection -> explicit
lineage expansion -> frozen manifest -> deterministic budget/order -> existing
journey/API/exploration executor callbacks -> normalized anomaly observations
-> Phase 2C cluster/admission -> bounded representative replay -> existing
private minimizer/triage/dossier -> atomic checkpoint -> morning brief`.

The orchestrator is callback-driven so existing engines remain authoritative.
The manifest stores only sanitized descriptors and version fingerprints; the
runtime executor registry is not serialized. A checkpoint records logical
work-item outcomes and queues. On resume, completed items are skipped,
interrupted items are re-queued as safe replay, and version drift stops the
campaign before new work.

## Milestones

### M0 — Recovery, reconciliation, and frozen task

Status: `COMPLETE`.

Reconcile prior task SHAs, clean Nightwatch HEAD, private remote topology,
Phase 6 freeze,
and create this SPEC/PLAN/STATE/REPORT plus ACTIVE_TASK before implementation.

### M1 — Campaign contracts, manifest, and budget

Status: `COMPLETE` at implementation checkpoint `dd5cef0a65f00721adf2e68db1f23ca9efc8d7b9`.

Implement canonical identity, explicit modes, sanitized manifest, source
snapshot descriptors, preflight result, budget manager, result/status classes,
and deterministic ordering. Add pure unit coverage.

### M2 — Selection and trusted primitive lineage

Status: `COMPLETE` at implementation checkpoint `dd5cef0a65f00721adf2e68db1f23ca9efc8d7b9`.

Reuse Phase 3 selection and map selected J1/J2/J3 to existing Phase 4/5
lineage. Add baseline-health and coverage-expansion selection explanations,
negative selection records, and reproduction-only isolation.

### M3 — Checkpoint/resume, drift, and failure-storm control

Status: `COMPLETE` at implementation checkpoint `dd5cef0a65f00721adf2e68db1f23ca9efc8d7b9`.

Implement atomic owner-only campaign checkpoints, interruption recovery,
completed-work skip semantics, version drift, health gates, shared-root storm
suppression, and retention planning.

### M4 — Anomaly admission, replay/minimization, dossiers, and brief

Status: `COMPLETE` at implementation checkpoint `dd5cef0a65f00721adf2e68db1f23ca9efc8d7b9`.

Adapt Phase 2C fingerprints/admission and existing private triage. Promote
only deterministic representatives, honor L0–L5 scope, invoke the existing
real minimization budget, atomically write dossiers, and create a concise
morning brief with no-findings behavior.

### M5 — Realistic synthetic campaign matrix

Status: `COMPLETE`: 16 focused tests passed, covering selection, lineage,
budget, clustering, failure storms, recovery, privacy, no-findings, drift,
owner policy, and operational `REPRODUCTION_ONLY` replay/minimization.

Run the actual orchestrator against deterministic fixtures covering all frozen
selection, ordering, anomaly, storm, recovery, privacy, and owner-policy
cases. Freeze fixture fingerprints and repair Nightwatch defects with
regressions.

### M6 — Bounded real DEV campaign and closure

Status: `COMPLETE` — the historical auth-blocked campaign remains immutable;
designated DEV page-valid auth was restored, a current manifest was frozen and
pushed, and exactly one compatible bounded DEV campaign completed.

The initial frozen real profile was run once after a clean implementation
checkpoint. It selected `CHANGE_DIRECTED` coverage but stopped at the guarded
auth preflight before any product work because the designated external DEV
state was not page-valid and MFA refresh could not complete. That campaign is
historical evidence and cannot be resumed. The existing guarded credential
provider then completed one bounded refresh with no MFA step, and fresh
page-level validation passed. The launcher required a separate
`--prepare-only` manifest/checkpoint freeze and `--resume-campaign=<id>`
execution phase, so the new manifest can be validated and pushed before any
product execution. The final campaign completed all 9 work items with zero
safety/privacy violations, no admitted finding, a READY no-findings brief, and
the bounded `BUDGET_EXHAUSTED` terminal result. No alternative credential or
scope was permitted.

## Validation Strategy

Per milestone: `npx tsc --noEmit`, focused campaign tests, `git diff --check`,
and `npm run agent:check` after task-state changes. Before real DEV: clean
Nightwatch tree, focused campaign matrix, existing owner-policy/private triage
tests, Phase 3/4/5 integrations, full Playwright, and no Alphaus changes.
After real DEV: campaign ledger/brief privacy scan, architecture/adversarial
review, `npx playwright test`, `npm run agent:check`, `git diff --check`,
Alphaus HEAD integrity, and final status/history review.

## Decision Log

- 2026-08-13 — The initial real campaign uses the empty-window
  `BASELINE_HEALTH` fallback when the committed Phase 3 range is empty; dirty
  Alphaus worktrees never become deployed source changes.
- 2026-08-13 — Phase 7 coordinates existing engines through typed callbacks;
  no duplicate browser/API/exploration/oracle implementation is introduced.
- 2026-08-13 — Execution is at-least-once safe; logical checkpoint/finalization
  is exactly-once and a running item after interruption is explicitly replayed.
- 2026-08-13 — The first real profile selects only linked J1/J2/J3 APIs and
  one seed per trusted envelope; API fresh replays are required by Phase 5.
- 2026-08-13 — The Phase 6 owner freeze is permanent and is tested as a
  pre-executor policy tripwire.

## Discoveries

- The private triage pipeline already exposes the exact minimizer budget,
  browser/API differential, source correlation, localization, dossier, and
  morning-summary primitives needed by the orchestrator.
- Existing Phase 4 and Phase 5 real runners contain the guarded DEV setup;
  Phase 7 will wrap those contracts rather than widen their catalogs.

## Deferred Work

Optional contained Chrome DevTools cross-check, private/local AI summarization,
future local scheduling, and any owner-approved scope change are deferred.
No cloud/datastore or external publication phase is recommended.

## Completion Criteria

All frozen SPEC acceptance criteria pass; synthetic and one bounded real DEV
campaign are recorded; safety/privacy counters are zero/clean; no Alphaus repo
changed; Phase 6 stayed frozen; the final Nightwatch tree is clean and
recoverable.
