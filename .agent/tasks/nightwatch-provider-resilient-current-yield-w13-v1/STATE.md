# Task State

## Identity

Task ID: nightwatch-provider-resilient-current-yield-w13-v1
Phase: PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1
Status: IN_PROGRESS
Starting SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last validated implementation SHA: 68d834b9bf5befb7225332c2563aa261f4374794
Last substantive checkpoint SHA: 68d834b9bf5befb7225332c2563aa261f4374794
Last documentation checkpoint SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-provider-resilient-cu-623c6535
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_VALIDATED_IMPLEMENTATION_SHA: 68d834b9bf5befb7225332c2563aa261f4374794
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 68d834b9bf5befb7225332c2563aa261f4374794
LAST_DOCUMENTATION_CHECKPOINT_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1_STATUS: IN_PROGRESS

## Objective

Close every locally closable W12 residual, freeze and execute a
provider-resilient current-source campaign under a predeclared deterministic
failover policy across the eight admitted repositories, and close with exactly
one evidence-bounded W13 verdict. Provider failure is never zero yield; only
policy exhaustion before sufficient investigation is `PROVIDER_BLOCKED`.

## Current Milestone

Milestone ID: M10
Milestone status: IN_PROGRESS
What is being attempted: author the machine-readable provider-resilience
policy (ordered candidates, CLI/schema requirements, probe/runtime timeouts,
retry counts, failover-eligible classes, consecutive-failure thresholds,
maximum transitions, recovery permission, exhaustion behavior, derived budget
envelope), implement the canonical fingerprint, mutation detection, and
fail-closed resume, prove replay determinism and single-field mutation
detection with negative probes, then probe the candidates in frozen order and
freeze the first healthy one.
Next action: write the policy document and its module/tests, run the negative
probes, then probe the declared candidates in order and commit the freeze
checkpoint before any investigative call.

## Completed Milestones

- **M9 COMPLETE**: Phase A closure. All 13 residual-register entries are
  `PROVEN` with no blocking entry unresolved; the full Phase A validation
  suite passed (32/32 focused tests, typecheck, typecheck:bin reporting mode,
  hardening:check, hardening:rules 83/94/94/0, agent:check, handoff:check,
  project:check, workspace:check, session:check, validation:universe).
  Receipt: `evidence/phase-a-closure-receipt.json`.

- **M8 COMPLETE**: R-09/R-10/R-11 `PROVEN`. Group 12 items 12.7/12.8/12.11/
  12.12 carry appended W13 Phase A annotations with predecessor text
  preserved; `PROGRAMME.json` routes W13 and records W12 `complete` with its
  `PARTIAL — BLOCKED` verdict intact; governed current-state/README/ledger
  surfaces are reconciled. Receipts:
  `evidence/r09-group12-reconciliation-receipt.json`,
  `evidence/r10-programme-reconciliation-receipt.json`,
  `evidence/r11-documentation-reconciliation-receipt.json`.

- **M7 COMPLETE**: R-07 and R-08 `PROVEN`. The aggregation rejects a
  self-declared admission without a reproduction receipt, evidence refs, and
  dossier identity; the fake-failing-provider regression proves zero response
  bytes, zero tool actions, zero hypotheses/candidates/admissions/dossiers,
  and `PROVIDER_BLOCKED` rather than a valid zero-yield result. Receipts:
  `evidence/r07-admission-invariant-receipt.json`,
  `evidence/r08-fake-progress-guard-receipt.json`.
- **M6 COMPLETE**: R-04 and R-06 `PROVEN`. The W13 measurement contract
  enforces 30 required global metrics (missing metric / unknown metric /
  NOT_CAPTURED-without-reason all fail closed) and per-provider attribution
  (calls, valid responses, failures by class, retries, response/stderr bytes,
  wall time, transitions; blends and duplicates refused). Receipts:
  `evidence/r06-measurement-completeness-receipt.json`,
  `evidence/r04-provider-attribution-receipt.json`.
- **M5 COMPLETE**: R-05 `PROVEN`. `MAX_SIBLING_SOURCE_SCAN_FILES = 4096` is
  the hard per-repository contract ceiling; Ouchan is already pinned to it and
  still truncates; the walk has no resumable cursor, so raising/paginating is
  outside the existing resource contract. Floor-only denominator semantics
  (`src/core/currentSourceYield/truncationFloor.ts`) reuse the shared
  completeness vocabulary and reject a TRUNCATED population presented as an
  exhaustive total (5/5 regressions). Receipt:
  `evidence/r05-census-truncation-receipt.json`.
- **M4 COMPLETE**: R-03 `PROVEN`. The ten-member provider failure taxonomy
  (`nightwatch.provider-failure-classification.v1`) is implemented, wired
  into the CLI driver with PROBE/RUNTIME phase distinction and bounded
  enumerated text signals, never retains raw provider text, and is covered by
  5 regressions plus 120/120 focused compatibility tests. Receipt:
  `evidence/r03-provider-taxonomy-receipt.json`.
- **M3 COMPLETE**: R-02 `PROVEN` as `EXPECTED_ENVIRONMENT_VARIANCE`. The
  direct synthetic lane passed 1,897/1,897 at 643 s and again at 422.94 s
  (122% CPU) on the same clean tree; the gate-dispatched lane passed all 12
  groups (receipt `receipt:sha256:1fdfbdad9607ea8997aa46d1`); the manifest is
  byte-identical to base `6ac0b546` at 105 files / 1,897 tests; the timeout
  bound was not changed. Receipt:
  `evidence/r02-gate-timeout-receipt.json`.
- **M2 COMPLETE**: R-01 `PROVEN`. `defaultAgentBudgetPolicy` is the single
  runtime-ceiling authority; declared wave envelopes are derived and validated
  field-by-field with fail-closed `RUNTIME_BUDGET_ENVELOPE_MISMATCH` /
  `RUNTIME_BUDGET_ENVELOPE_MALFORMED` errors before any provider call; 7/7
  new regression/negative-probe tests pass; `npm run typecheck` passes; D-139
  recorded. Receipt: `evidence/r01-budget-envelope-receipt.json`.
- **M1 COMPLETE**: the 13-entry Phase A residual register was written and
  committed (`residual-register.json`, `createdAtSha` `e1651121`) before any
  entry was fixed; every entry carries exactly one taxonomy class and a
  Phase B blocking flag.
- **M0 COMPLETE** at activation checkpoint `a95004a0` (follow-up `bdb781d4`):
  C-00 session `session/nightwatch-provider-resilient-cu-623c6535` created and
  claimed; W12 OpenSpec change archived into the specs baseline
  (`openspec/specs/current-source-yield-measurement/`); W13 task/OpenSpec/
  audit surfaces created; `.agent/ACTIVE_TASK.md` and
  `.agent/EXECUTION_PROMPT.md` routed to W13; governed current-state snapshot
  updated; all activation checks pass.

## Work In Progress

M10 is authoring the provider-resilience policy and its fingerprint/probe
machinery; no candidate has been probed yet.

## Exact Next Action

Author `provider-resilience-policy.json` and the policy module (canonical
fingerprint, structural validation, field-level mutation diff, fail-closed
resume, deterministic failover replay); add the negative probes (fixed
failure-sequence replay determinism, single-field mutation, mutated-policy
resume refusal); then probe the candidates strictly in the frozen order with
`callPhase: PROBE` and commit the freeze checkpoint before the first
investigative call.

## Files Changed

- `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md` — route W13.
- `.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/**` — W13
  continuity, register, policy, freeze, evidence, and report surfaces.
- `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/**` —
  governed W13 proposal, design, specs, tasks, and audit.
- `openspec/specs/current-source-yield-measurement/**` and
  `openspec/changes/archive/**` — W12 archive/sync baseline.
- `docs/CURRENT_STATE.md` — live-state cross-check and W13 successor snapshot.

## Validation Ledger

- `npm run session:status`: PASS for the owned W13 session
  (`session/nightwatch-provider-resilient-cu-623c6535`, base `34517c9b`); the
  four pre-existing stale worktrees remain warnings and are untouched.
- `npm ci --ignore-scripts`: PASS in the fresh worktree.
- `openspec validate nightwatch-provider-resilient-current-yield-w13-v1 --strict`:
  PASS; `openspec validate --all --strict`: 67 passed / 0 failed.
- `openspec archive nightwatch-current-source-unknown-yield-w12-v1 -y`: PASS;
  archived as `2026-09-19-nightwatch-current-source-unknown-yield-w12-v1`
  with 12 requirements published to `openspec/specs/current-source-yield-measurement/`.
- `npm run agent:check`: PASS at activation with pre-existing warnings
  (stale-baseline/orphan tasks and the four stale worktrees); W13 strict
  continuity errors: 0.
- `npm run handoff:check`: PASS at activation; the prompt binds active task
  W13 IN_PROGRESS, Campaign ID, tracked OpenSpec route, and Planned-From
  `34517c9b`.
- `npm run project:check`: PASS at clean activation commit `bdb781d4`.
- `npm run workspace:check` and `npm run session:check`: PASS; owned session
  valid, base CURRENT, canonical safe.

## Decisions Made During This Task

- W13 is a distinct successor wave; W11 and W12 remain immutable predecessor
  evidence.
- Phase A closes before Phase B opens; a blocking residual stops the wave
  rather than opening an ambiguous experiment.
- The provider-resilience policy is declared and fingerprinted before probing;
  failover is deterministic, never result-driven, and recovery is forbidden
  unless explicitly declared.
- The fixed matrix remains one broad all-eight run plus eight scoped runs in
  stable registry order, with Ouchan's longer budget permitted only if the
  pre-experiment census still proves it the sole deterministic-reproduction
  repository.

## Discoveries

- Live canonical main and `origin/main` both resolve to
  `34517c9ba11c97407168fe5879ee03794dfff3e3` at activation.
- W12 is `PARTIAL — BLOCKED`: one valid broad run with 2 candidates, 0
  admissions, and all eight scoped runs provider-blocked on the single frozen
  provider `opencode-go/glm-5.3`.
- The existing campaign runner is `node bin/nightwatch-agent.mjs campaign run`
  over `src/core/agentRuntime/localCampaign.ts`; the W12 freeze supplemental
  `providerFailures: 3` and the runtime `HOUR_1` ceiling `8` are both live
  sources of the D-138 mismatch to reconcile in Phase A.
- Existing topology has four stale owner-attention worktrees. W13 does not
  adopt or modify them.

## Blockers

None at activation. Provider availability remains a measured prerequisite;
the provider-resilience policy exists to distinguish one provider's failure
from a blocked wave.

## Safety Events

NONE.

## Deferred / Follow-Up

DEV/NEXT/production, authenticated runtime, databases/data plane, cloud/
infrastructure, sibling mutation, external publication, new reproduction
authority, and raising any gate timeout remain out of scope for this wave.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md`, this task's `SPEC.md`, `PLAN.md`, and
   `STATE.md`.
2. Confirm the owned W13 session `session/nightwatch-provider-resilient-cu-623c6535`
   and discover live Git/workspace truth.
3. Continue from `Exact Next Action`; Phase A fixes follow the committed
   residual register order, and no provider probe may precede the Phase B
   policy freeze.
4. Update this state after every milestone, decision, safety event, and before
   any context compaction or session end.

## Completion Snapshot

W13 is IN_PROGRESS. No provider probe, Phase B investigation result,
current-source yield, novelty class, or completion verdict exists yet.
