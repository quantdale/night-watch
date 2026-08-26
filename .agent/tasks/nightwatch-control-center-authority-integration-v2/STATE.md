# Task State

## Identity

Task ID: nightwatch-control-center-authority-integration-v2
Phase: CONTROL-CENTER-AUTHORITY-INTEGRATION-V2
Status: IN_PROGRESS
Starting SHA: ccbb57721d99020667881481411aa961d12229e5
Last validated implementation SHA: 9d0018cb94a16f0c806d506cfbab7c4b5344d5f0
Last substantive checkpoint SHA: 9d0018cb94a16f0c806d506cfbab7c4b5344d5f0
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: M4 — owner-local findings reader at 9d0018c.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ccbb57721d99020667881481411aa961d12229e5
LAST_VALIDATED_IMPLEMENTATION_SHA: 9d0018cb94a16f0c806d506cfbab7c4b5344d5f0
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9d0018cb94a16f0c806d506cfbab7c4b5344d5f0
LIVE_HEAD_AUTHORITY: GIT
PHASE_CONTROL_CENTER_AUTHORITY_INTEGRATION_V2_STATUS: IN_PROGRESS

## Objective

Wire the V1 Control Center to bounded, authoritative local run, source,
campaign, and private-finding readers; preserve read-only/loopback/privacy
boundaries; harden snapshot/currentness/cache/SSE behavior; complete a whole-
repository hardening audit; and close with validated local/clean Git state.

## Current Milestone

M5 — snapshot lifecycle, cache/currentness, and advisory SSE.

## Completed Milestones

- M0 — COMPLETE: the canonical repository was confirmed; `git pull
  --ff-only` fast-forwarded `main` from `858c2a6` to `ccbb577`; the pulled
  change was planner-only; required durable docs and terminal V1 records were
  read; `npm run agent:check` passed with the expected documentation and
  legacy-history warnings; `npm run project:check` passed; `npm run typecheck`
  passed; and the focused V1 Control Center contracts/adapters/server suite
  passed 25/25.
- M1 — COMPLETE: current evidence producers, validators, fixed roots, bounds,
  currentness/generation contracts, adapters, routes, and UI consumers were
  traced and recorded in PLAN. The selected seams are a bounded repository
  artifact reader for runs, an approved sibling-source authority, an
  in-process Phase 24/campaign composition, and an owner-local dossier reader.
- M2 — COMPLETE: the fixed-root run reader validates summaries, ordered typed
  events, and repository metadata; strips messages/arbitrary data; rejects
  unsafe, privacy-blocked, malformed, oversized, unstable, and duplicate
  evidence; and reports explicit collection state/reason codes. The default
  collector shares one bounded snapshot across list/detail/timeline/graph.
  `npm run typecheck`, `npm run hardening:check`, and the 23-test focused
  Control Center suite passed.
- M3 — COMPLETE: the fixed approved-source authority composes bounded source
  discovery, inventory currentness, cache identity, and Phase 24 analysis;
  source/campaign generations are bound in-process; the campaign bridge uses
  Phase 24's selected IDs as its sole selection authority and feeds only the
  existing portfolio, impact, coverage, and plan contracts. Public source and
  campaign projections remain metadata-only. `npm run typecheck`,
  `npm run hardening:check`, and the focused 34-test Control Center suite
  passed.
- M4 — COMPLETE: the owner-local findings reader validates bounded private
  v1/v2 dossier artifacts through the converged artifact facade, enforces
  owner/mode/path/symlink/size/stable-read/privacy rules, ignores unrelated
  private artifacts, and emits only metadata-only finding projections. The
  default collector shares one findings snapshot with the adapter and keeps
  partial, inaccessible, duplicate, privacy-blocked, and corrupt state
  explicit. `npm run typecheck`, `npm run hardening:check`, the focused
  13-test findings/adapter/authority suite, and the affected 37-test Control
  Center suite passed.

## Work In Progress

Map the existing collector/server snapshot and advisory SSE lifecycle. Define
one bounded generation snapshot contract, cache and refresh behavior,
concurrency/shutdown rules, and notification-only reconnect semantics. Keep
failed refreshes explicit and prevent stale or mixed authority generations
from being presented as a current coherent snapshot.

## Exact Next Action

Inspect the current Control Center collector/server snapshot composition,
SSE subscriber lifecycle, and shutdown/refresh seams. Record the M5 lifecycle
contract in PLAN, then implement the smallest bounded generation coordinator
and synthetic refresh/concurrency tests without adding HTTP mutation,
network, child-process, or second-authority behavior.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/ACTIVE_TASK.md` | Route execution to the fresh V2 campaign | added/updated |
| `.agent/tasks/nightwatch-control-center-authority-integration-v2/SPEC.md` | Freeze V2 intent and safety scope | added |
| `.agent/tasks/nightwatch-control-center-authority-integration-v2/PLAN.md` | Living milestones and authority map | added |
| `.agent/tasks/nightwatch-control-center-authority-integration-v2/STATE.md` | Continuity waypoint and preflight evidence | added |
| `.agent/tasks/nightwatch-control-center-authority-integration-v2/REPORT.md` | Initial handoff scaffold | added |
| `src/controlCenter/authorities/runEvidenceReader.ts` | Fixed-root bounded run/evidence reader and safe snapshot contract | implemented; focused tests pass |
| `tests/unit/controlCenterRunEvidenceReader.test.ts` | Synthetic reader and adversarial filesystem/privacy fixtures | added; 5/5 pass |
| `src/controlCenter/server/defaultCollector.ts` | Injected bounded run snapshot integration | implemented; focused integration tests pass |
| `src/controlCenter/adapters/runAdapter.ts` | Additive run collection state/reason projection | implemented; focused suite passes |
| `src/controlCenter/contracts/runs.ts` | Additive run collection state contract | implemented; historical fixtures remain compatible |
| `src/controlCenter/authorities/sourceAuthority.ts` | Fixed approved-source discovery/currentness/Phase 24 snapshot bridge | implemented; synthetic integration passes |
| `src/controlCenter/authorities/campaignAuthority.ts` | Phase 24-selected campaign metadata/coverage/plan bridge | implemented; synthetic integration passes |
| `src/controlCenter/adapters/sourceAdapter.ts` | Source summary authority currentness/generation projection | implemented; existing adapter suite passes |
| `tests/unit/controlCenterAuthorityIntegration.test.ts` | Synthetic source/campaign generation and privacy fixtures | added; 2/2 pass |
| `src/controlCenter/authorities/findingsAuthority.ts` | Fixed owner-local dossier validation, bounded enumeration, and metadata-only snapshot bridge | implemented; synthetic findings tests pass |
| `src/controlCenter/adapters/findingsAdapter.ts` | Consume v1/v2 metadata projections while preserving existing raw-fixture compatibility | implemented; focused suite passes |
| `tests/unit/controlCenterFindingsAuthority.test.ts` | Synthetic v1/v2, envelope, corruption, privacy, permission, metadata, and cache fixtures | added; 3/3 pass |

## Validation Ledger

- `git pull --ff-only` — PASS: fast-forwarded `858c2a6` → `ccbb577`; no merge
  or force operation.
- `git status --short --branch` before activation — PASS: clean `main`, equal
  to `origin/main`.
- `npm run agent:check` — PASS with expected documentation-checkpoint and
  historical legacy-task warnings; strict errors 0.
- `npm run project:check` — PASS: project-state v1, catalog round-trip,
  promotion authority NONE, and clean checkout.
- `npm run typecheck` — PASS.
- Focused current V1 Control Center suite — PASS: 25 passed, 0 failed.
- Authority map review — PASS: current implementation traces and selected
  reader seams are recorded in PLAN; no CLI, network, Git, or mutable
  authority path is selected.
- `npm run typecheck` after run-reader implementation — PASS.
- Focused run-reader suite — PASS: 5 passed, 0 failed.
- M2 acceptance ladder — PASS: `npm run typecheck`,
  `npm run hardening:check`, and focused Control Center suite: 23 passed,
  0 failed.
- M3 acceptance ladder — PASS: `npm run typecheck`; `npm run hardening:check`;
  focused Control Center contracts/adapters/server/run-reader/source-campaign
  suite: 34 passed, 0 failed; staged diff privacy scan found no credential or
  bearer-key patterns; implementation checkpoint is a517a3e.
- M4 acceptance ladder — PASS: `npm run typecheck`; `npm run hardening:check`;
  focused findings/adapter/authority-integration suite: 13 passed, 0 failed;
  affected Control Center suite: 37 passed, 0 failed; staged diff privacy
  scan found no credential, bearer-key, or private-key patterns; implementation
  checkpoint is 9d0018c.

## Decisions Made During This Task

- The V1 task remains immutable history; this successor is routed through a
  fresh continuity-v2 task from the pulled live `main`.
- The planner-only execution prompt is treated as the active campaign
  authorization, while live Git and current tests remain stronger evidence.

## Discoveries

- The pulled commit changed only `.agent/EXECUTION_PROMPT.md`; no implementation
  or test source moved during the pull.
- V1's default collector intentionally returns real health/meta/readiness/
  safety but placeholder empty/unavailable run, source, campaign, and findings
  snapshots. The V2 campaign must replace those branches through existing
  authorities rather than UI-only changes.
- The first implementation boundary is the repository-owned `artifacts/`
  directory written by `RunRecorder`; raw messages, event data, network, and
  console payloads are not Control Center authority data and must not cross the
  reader boundary.
- The reader uses a separately named test-only root constructor; normal
  construction is fixed to the repository-owned artifacts root. Invalid or
  partial records produce UNKNOWN/UNAVAILABLE categories and never become a
  successful EMPTY result.
- The additive run-list state/reason fields preserve historical v1 fixtures
  while allowing the normal collector to distinguish AVAILABLE, EMPTY,
  UNKNOWN, and UNAVAILABLE without changing run detail/timeline DTOs.
- The source bridge retains internal discovery/Phase 24 structures only until
  the adapter boundary; the campaign planner materializes the already-selected
  Phase 24 set and cannot introduce a second selection authority.
- The findings bridge treats `privateArtifactRoot()` and the dossier artifact
  validator as the only owner-local authority. It validates raw v1 dossiers
  and `{ dossier }` v2 envelopes but crosses into Control Center only through
  a metadata projection; raw source candidates, replay arrays, confidence
  explanations, and owner-local evidence are discarded before adapter use.
- A valid dossier does not imply a valid public row: identity, digest, and
  timestamp fields are screened again at the findings projection boundary;
  malformed/partial private state stays UNKNOWN or UNAVAILABLE.

## Blockers

None.

## Safety Events

NONE — local Git/docs/code inspection and synthetic V1 tests only. No product,
auth, data, cloud, infrastructure, sibling-write, publication, or external
network operation occurred.

## Deferred / Follow-Up

Execution/mutation controls, remote hosting, raw evidence/source views,
database/index persistence, multi-user auth, and owner-blocked infrastructure
or data operations remain excluded.

## Resume Recipe

Read this STATE after SPEC and PLAN. Inspect the collector/server snapshot and
SSE lifecycle named in the next action, record the M5 contract, then implement
and test the bounded generation coordinator. Keep all reads and refreshes
local, in-process, read-only, synthetic-testable, and notification-only.

## Completion Snapshot

INCOMPLETE — M0 through M4 are complete; M5 snapshot lifecycle and advisory
SSE hardening is active.
