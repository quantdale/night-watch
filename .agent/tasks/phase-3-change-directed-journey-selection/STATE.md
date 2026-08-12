# Task State

## Identity

Task ID: phase-3-change-directed-journey-selection
Phase: 3
Status: IN_PROGRESS
Starting SHA: 427f10295ae2037d09741de98ebea9210f14f85a
Current SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Last validated implementation SHA: efc03de2f7396a96baaca485894df300ddcc4ce0
Branch: main
Last checkpoint: Phase 3 task created after independent Phase 2A/2B/2C closure reconciliation.

## Objective

Build trustworthy deterministic change intelligence that maps source changes to
the existing Ripple canaries, ranks them, explains positive and negative
selection, and fails safe on uncertainty without touching Alphaus repositories
or starting Phase 4.

## Current Milestone

M2 — dependency-map contract and deterministic model implementation.

## Completed Milestones

- M0 — COMPLETE. Phase 2A/2B/2C closure chain independently reconciled;
  Phase 2C full inherited suite passed (`263 passed`); native Phase 3 task
  artifacts created before implementation.
- M1 — COMPLETE. Routing/index guidance was consulted first. The six included
  repositories and six reviewed exclusions are recorded in `REPOSITORY_SCOPE.md`;
  the three canary maps and shared edges are recorded in `DEPENDENCY_MAP.md`.
  Local tracking refs were recorded without fetch, and dirty Alphaus states
  were preserved and excluded from the committed window.

## Work In Progress

The source-backed scope and dependency contract are complete. The next work is
to implement the pure Git/change representation, impact graph, selector, and
baseline state without touching Alphaus repositories.

## CURRENT_GOAL

Give Nightwatch a deterministic, explainable, conservative answer to:
“What changed, which of J1/J2/J3 could it affect, how confident/risky is the
mapping, and why were other journeys not selected?”

## CURRENT_PHASE

Phase 3 — change-directed journey selection; M1 repository/change-surface and
freshness audit.

## CURRENT_EVIDENCE

- Nightwatch HEAD is clean at `427f10295ae2037d09741de98ebea9210f14f85a`.
- Phase 2C implementation/checkpoint/terminal chain is
  `efc03de2 -> 0f894d9 -> 427f1029`; terminal changes are approved task
  documentation only.
- `npm run agent:check` passes with the expected `CHECKPOINT_ADVANCE` warning.
- `npx tsc --noEmit`, full existing Playwright, and `git diff --check` pass;
  the inherited full suite result is `263 passed`.
- Phase 2C safety vector across seven controlled contexts is zero and privacy
  is PASS; no Phase 3 live execution has occurred.
- M1 evidence is in `REPOSITORY_SCOPE.md` and `DEPENDENCY_MAP.md`; freshness is
  `LOCAL_TRACKING_REF_ONLY`, not remote/deployment confirmation.

## REPO_BASELINES

Status: `COMPLETE_M1`. Included: `mobingilabs/ripple-ui@d80b161b`,
`mobingilabs/ripple-api@27bb007a`, `mobingilabs/ouchan@565f00a8`,
`alphauslabs/blueapi@691422e5`, `alphauslabs/blue-sdk-go@8883ee3d`, and
`alphauslabs/grpc-chunk-parser@66802f28`. Full branches, tracking refs,
ahead/behind counts, dirty states, roles, provenance, and
`READ_ONLY_ONLY=true` are recorded in `REPOSITORY_SCOPE.md`. Reviewed but
excluded: `alupi`, dashboard, cost-finalization, blueinternal, blue-sdk-ts,
and mobingilabs/protobuf. No remote fetch or deployment inference occurred.

## CHANGE_WINDOW

Status: `FROZEN_M1`. Default is explicit per-repository verified baseline SHA
to checked-out HEAD, with merge-base recorded when applicable; dirty worktree
changes are a separate `DIRTY_WORKTREE_CHANGE` source and excluded from
committed/nightly selection. Initial records are `BOOTSTRAP_BASELINE`, not
verified coverage. The selector never claims deployment status from Git alone.

## CANARY_SET

- J1 `ripple-payer-exchange-read`: `/payer-exchange-rate-v2`; payer exchange
  read.
- J2 `ripple-common-exchange-read`: `/global-exchange-rate-v2`; common exchange
  read.
- J3 `ripple-account-inventory`: `/accounts`; account inventory read.

The existing Phase 2B/2C journey contracts and Phase 2C oracle/replay engine
are authoritative; no canary or action is added here.

## DEPENDENCY_MAP_STATUS

`SOURCE_AUDITED`. Durable source contract is
`nightwatch.ripple-dependency-map.v1` in `DEPENDENCY_MAP.md`; implementation
must carry source SHA, journey contract version, edge provenance, and stale
edge detection for J1/J2/J3.

## IMPACT_GRAPH_STATUS

`CONTRACT_DEFINED`. Required graph levels and stable reason codes are defined
in `DEPENDENCY_MAP.md`; implementation pending.

## SELECTION_MODEL_VERSION

`nightwatch.selector.phase3.v1` (frozen in SPEC; implementation pending).

## SELECTED_JOURNEYS

`PENDING_IMPLEMENTATION`. No current changeset has been collected and no
journey has been selected.

## SELECTION_RATIONALE

`PENDING_IMPLEMENTATION`. Must contain source-backed positive reasons, confidence, risk,
priority, provenance, and deterministic explanations.

## NEGATIVE_SELECTIONS

`PENDING_IMPLEMENTATION`. Every J1/J2/J3 not selected must have an explicit reason; unknown
relevant impact must not be represented as a silent empty result.

## BACKTEST_LEDGER

`PENDING_IMPLEMENTATION`. Expected categories are true-positive selection, false-positive
selection, false-negative selection, safe conservative fallback, correct
non-selection, and ground-truth unresolved. Ground truth must be independently
source-traced before selector comparison.

## SHADOW_RUN_LEDGER

`PENDING_IMPLEMENTATION`. Shadow mode will collect a reproducible current source window,
exclude dirty changes, and produce a human-reviewable selection without
automatically invoking DEV.

## REAL_RUN_LEDGER

No Phase 3 real execution. If the current committed window is empty or shadow
review is not independently accepted, live execution will be explicitly
recorded as not required.

## FILES_CHANGED

Task and M1 evidence: `.agent/ACTIVE_TASK.md`, `SPEC.md`, `PLAN.md`, `STATE.md`,
`REPORT.md`, `REPOSITORY_SCOPE.md`, and `DEPENDENCY_MAP.md`. No selector source
implementation has changed.

## VALIDATION_LEDGER

- Phase 2A/2B/2C SHA ancestry/path audit: PASS.
- Nightwatch worktree at task start: clean.
- `npm run agent:check`: PASS with expected Phase 2C approved-document
  `CHECKPOINT_ADVANCE` warning.
- `npx tsc --noEmit`: PASS.
- `npx playwright test --project=nightwatch`: PASS, `263 passed`.
- `git diff --check`: PASS before Phase 3 task creation.
- M1 focused validation: source/route/API/backend/proto inspection complete;
  Alphaus status checks were read-only and no Alphaus diff changed.
- Phase 3 focused validation: pending implementation.

## BUGS_FOUND

None in Phase 3. The historical Phase 2C shared comparator defect remains
closed as `PHASE_2C_DISCOVERED_SHARED_INFRA_DEFECT` and is not reopened.

## REJECTED_HYPOTHESES

- Phase 2A/2B/2C are not stale or reopened merely because this task starts.
- A Ripple repository name alone is not proof that all three canaries depend on
  it; `REPOSITORY_SCOPE.md` records reviewed exclusions.
- A commit message is not impact evidence.
- Dirty local Alphaus work is not a deployed/nightly change by default.

## UNRESOLVED

- Current committed change window and bootstrap-baseline disposition pending
  selector implementation.
- Historical direct J2 isolation may not exist; if unavailable it will be
  recorded as unresolved rather than fabricated.

## SAFETY_EVENTS

Phase 3 safety events: none. No Alphaus writes, production attempts, product
mutations, DB queries, or real Phase 3 contexts.

## PRIVACY_STATUS

PASS for inherited state and task documents. Phase 3 artifacts will contain
only sanitized Git/source metadata, paths/symbols, hashes, and mapping facts;
no credentials, auth state, customer data, raw bodies, or whole patches.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`efc03de2f7396a96baaca485894df300ddcc4ce0` — inherited Phase 2C validated
implementation. Phase 3 implementation SHA is not yet established.

## LAST_CHECKPOINT_SHA

`427f10295ae2037d09741de98ebea9210f14f85a` — clean Nightwatch starting
checkpoint for Phase 3 task creation.

## NEXT_EXACT_ACTION

Implement the pure Phase 3 model: typed changesets, source-backed Ripple
dependency edges, deterministic impact classification/selection, and atomic
baseline state. Add unit tests before collecting historical backtests.

## Exact Next Action

Implement and test the offline selection core from the frozen M1 scope and
dependency contract. Keep Git collection separate from impact/selection.

## Files Changed

See `FILES_CHANGED` above. This section remains concise; detailed implementation
files and validation are added at each milestone.

## Validation Ledger

See `VALIDATION_LEDGER` above. Add exact commands/results after each milestone.

## Decisions Made During This Task

- The Phase 3 task begins at clean closure HEAD `427f1029`, while inherited
  implementation provenance remains `efc03de`.
- The selector is deterministic and source-backed; no AI or random choice.
- All three canaries are the only selection targets.

## Discoveries

Initial discovery: the Phase 2C terminal descendant contains only approved
task-state documentation, so the existing continuity checker correctly reports
`CHECKPOINT_ADVANCE`, not implementation staleness.

## Blockers

None.

## Safety Events

None.

## Deferred / Follow-Up

Deployment identity, scheduler integration, additional products/journeys,
datastore oracles, fuzzing, model-based exploration, and bug-root-cause
correlation remain out of scope.

## Resume Recipe

1. Read root and Nightwatch `AGENTS.md`, `ACTIVE_TASK.md`, then this task's
   SPEC/PLAN/STATE in order.
2. Confirm Nightwatch status and current implementation/checkpoint SHAs.
3. Resume exactly from `NEXT_EXACT_ACTION`; if uncertain, stop editing and
   reconcile Git/diff/state before proceeding.
4. Keep all Alphaus repository operations read-only and preserve dirty state.

## Completion Snapshot

Not complete. Native Phase 3 task, repository scope, and dependency contract
are created; M2 model implementation is the next exact action.
