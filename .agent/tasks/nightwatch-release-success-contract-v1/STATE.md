# Task State

## Identity

Task ID: nightwatch-release-success-contract-v1
Phase: RELEASE_SUCCESS_CONTRACT_V1
Status: COMPLETE
TASK_GROUP_LEDGER: nightwatch.task-group-ledger.v1
TASK_GROUPS_COMPLETE: 1,2,3
TASK_GROUP_NEXT: NONE
TASK_NEXT_ID: NONE
Starting SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Last validated implementation SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
Last substantive checkpoint SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: main
Last checkpoint: 2026-10-19 — S6 `d78e6c55b5c79ccb97e958e777a9c54e0dbcb742`
is certified: exact-head CI green (run 39254273491), the full checkpoint-bound
evidence set re-earned at it (25 receipts verified 25/25 offline), and the
canonical and independent fresh-clone evaluators agree per-condition exactly
(15/16 effective MET, `autonomous-yield-proof` UNMET by design). The D-175-2
swallowed-receipt defect class was exposed by the fresh clone and repaired
forward for both S5 and S6.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LAST_VALIDATED_IMPLEMENTATION_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d78e6c55b5c79ccb97e958e777a9c54e0dbcb742
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_RELEASE_SUCCESS_CONTRACT_V1_STATUS: COMPLETE

The implementation anchors name S6 `d78e6c55b5c79ccb97e958e777a9c54e0dbcb742`
— the substantive checkpoint established by the anchor-advance commit after
its exact-head green run (39254273491) was observed, exactly the S5 pattern
(substantive push, exact-head run, documentary binding commits).

## Objective

Close the structural mismatch between the campaign runner and its release-success
evaluator without weakening any certification requirement, make a future
provider run genuinely capable of qualifying, and complete the governed
engineering path (C-00 recovery, integration, S6 certification, provider
readiness) around it.

## Current Milestone

COMPLETE — the governed engineering path is closed at S6. The release success
contract (R6) is implemented and proven, the C-00 claim deadlock is resolved
through the D-180 recovery, the D-181 pre-request spend admission is
implemented and detected by its mutants, and the S6 checkpoint
`d78e6c55b5c79ccb97e958e777a9c54e0dbcb742` is certified with its green
exact-head run (39254273491) and 15/16 effective MET (condition #3 UNMET by
design until a qualifying provider run).
## Completed Milestones

- **M0 COMPLETE** — defect confirmed against source; the campaign loop had six
  exits and none could emit a campaign-level COMPLETE_* reason, while the
  evaluator requires COMPLETED_SUCCESSFULLY. Population evidence: 33/33
  receipts NO_PROGRESS, 32 with a healthy provider.
- **M1 COMPLETE** — R6-01: `campaignCompletion.ts` added; `localCampaign.ts`
  gains the declared plan, its persistence, the SUCCESS exit and the refusal
  exit, and a stagnation flag; `--expected-investigations` validated in the
  launcher.
- **M2 COMPLETE** — R6-02: `campaignDiagnostics.ts` added;
  per-investigation causes captured before checkpoint deletion; launch
  parameters and usage persisted through the receipt diagnostics block.
- **M3 COMPLETE** — R6-03: `--observe-repository` separates the observation
  scope from the investigation scope; no arbitrary observation is
  manufactured.
- **M4 COMPLETE** — 21 deterministic tests cover A-I, J (the real G12 probe
  grades a genuinely completed receipt MET) and K (a resumed campaign can
  complete).
- **M4b COMPLETE** — R6-04: found and fixed during staged validation — a
  campaign that paused mid-investigation then resumed could never complete,
  because the PAUSED suspension placeholder was never retired when that slot
  finished. Two pre-existing tests had pinned the phantom count (6
  terminations for 5 investigations) and were corrected to the reconciled
  semantics.
- **M4c COMPLETE** — the owner-approved `retarget-task` recovery is
  implemented in the session CLI with its pure admission core
  (`admitTaskRetarget`, `admitRetargetReplacement`), the bounded audit line,
  and the D-180 decision record; this session's mistaken claim
  `nightwatch-final-product-completion-v1` was corrected to this task through
  the governed transition (record revision CAS under the transition lock), and
  `workspace:check` is green with the predecessor preserved byte-for-byte.
- **M4e COMPLETE** — D-181: the pre-request monetary admission is implemented
  (`nightwatch.spend-ceiling.v1` + the `AgentRuntime` pre-dispatch seam +
  campaign plumbing) and validated end to end: a refused request never reaches
  the provider, a one-call-sized ceiling admits exactly one dispatch, and a
  metered run without a declared ceiling fails closed. Two stale R6-04 test
  pins the original repair missed are corrected with the population invariant.
- **M4d COMPLETE** — governance proof: the NW-AUD-006 `retarget-task` matrix
  (9 cases: atomic correction with identity preservation, stale/missing
  expectations, destination refusals, untracked/symlinked replacement STATE,
  unexpected branch, ambiguous active task, non-held and malformed/symlinked
  records, worktree confinement, revision CAS refusal, concurrent single
  transition) passes, and `checkC00WorkspaceIntegrity` now requires the new
  admission controls.

## Work In Progress

None. Task complete; no work is open in this task's scope.
## Exact Next Action

STOP — task complete. The release success contract is closed at S6 with 15/16
effective MET and condition #3 honestly UNMET. The one remaining step — a
single qualifying provider campaign — belongs to a future task under a
separate fresh owner authorization (the parent-12.5 grant with its monetary
cap) and is not in scope here.
## Files Changed

Source (R6, commits fe193a3a):
- `src/core/agentRuntime/campaignCompletion.ts` (new) — pure completion verdict.
- `src/core/agentRuntime/campaignDiagnostics.ts` (new) — per-investigation causes.
- `src/core/agentRuntime/localCampaign.ts` — declared plan, SUCCESS/refusal exits,
  stagnation flag, PAUSED placeholder retirement (R6-04), sibling-scope split.
- Launchers/validators carrying `--expected-investigations` and
  `--observe-repository`.

Source (C-00 recovery, commit 9084cff7):
- `bin/lib/session-authority.mjs` — `admitTaskRetarget`, `admitRetargetReplacement`,
  `TASK_ID_PATTERN`, the `retarget-task` authority-matrix entry.
- `bin/nightwatch-session.mjs` — `commandRetargetTask`, the sanitized audit line,
  the `AFTER_RETARGET_OBSERVE` bounded test seam, CLI metadata/parser entries.
- `bin/lib/hardening/rules/workspace-and-layout.mjs` — required control tokens.

Source (D-181 monetary admission):
- `src/core/agentRuntime/spendCeiling.ts` (new) — the pure pre-request
  admission (`nightwatch.spend-ceiling.v1`).
- `src/core/agentRuntime/runtime.ts` — the pre-dispatch admission seam.
- `src/core/agentRuntime/localCampaign.ts`, `types.ts`, `index.ts` — plumbing.

Tests:
- `tests/unit/campaignCompletionSuccess.test.ts` (new, 19 tests) and the
  receipt/evaluator integration tests (21 total new).
- `tests/unit/sessionMutationAuthority.test.ts` — the 9-case `retarget-task`
  matrix.
- `tests/unit/spendCeiling.test.ts` (new, 7 tests) — the D-181 admission and
  its runtime enforcement.
- `tests/unit/campaignStrategyMemory.test.ts`,
  `tests/unit/w10LongRunResilience.test.ts` — the two stale R6-04 phantom
  PAUSED pins corrected to the reconciled semantics (the repair had already
  corrected `campaignEndurance` and `localCampaign`).
- `tests/unit/workspaceIsolation.test.ts` — dry-run totality extraction widened
  to the operator-CLI command-name vocabulary (both directions unchanged).

Documentation:
- `docs/DECISIONS.md` — D-180.
- `AGENTS.md` — the `retarget-task` recovery contract.
- `.agent/tasks/nightwatch-release-success-contract-v1/*` — this record.

## Validation Ledger

At 9084cff7 (implementation + governance tests, 2026-10-19):
- `npx tsc -p tsconfig.bin.json` / `npm run typecheck:bin` — PASS,
  conformance 77/77, mode BLOCKING, errors 0, exemptions 0.
- `npm run typecheck` — PASS.
- `npm run hardening:check` — PASS.
- `npm run hardening:rules` — 274/274 probes detected, 0 undetected.
- `npm run hardening:mutants` — 122/122 behavioural mutants detected, 0 survived.
- `tests/unit/sessionMutationAuthority.test.ts` — 24/24 PASS (15 existing + 9 new).
- `tests/unit/workspaceIsolation.test.ts` — 76/76 PASS.
- `tests/unit/hardeningRuleParity.test.ts`, `tests/unit/validationLane.test.ts`,
  `tests/unit/cliImplementationContract.test.ts` — PASS (134 tests in batch).
- `npm run agent:check` — the WORKSPACE_DUPLICATE_TASK_CLAIM error is gone after
  the D-180 recovery (verified on the live topology).
- `npm run workspace:check` — PASS (one ATTENTION cleared by this commit's
  status update).

At the D-181 commit (monetary admission + ledger registration, 2026-10-19):
- `tests/unit/spendCeiling.test.ts` — 7/7 PASS, incl. the provider-never-
  invoked proof and the one-call-sized ceiling refusing the second dispatch.
- The 109-test agent-runtime batch (agentRuntime, localCampaign,
  campaignEndurance, campaignCompletionSuccess, productRunReceipt,
  providerAttribution, byteAccounting, agentRuntimeW9, w10LongRunResilience,
  huntModeComparison, campaignStrategyMemory, reasonerIdentityBinding,
  schemaLifecycle) — PASS after correcting the two stale R6-04 phantom
  PAUSED pins.
- `npm run hardening:check`, `npm run schema:check`, `npm run hardening:rules`
  — PASS (274/274 probes; the spend-ceiling schema family is declared
  IN_MEMORY under D-130).

At S6 `d78e6c55` (the certified checkpoint, 2026-10-19):
- Exact-head GitHub Actions run `39254273491` (job `118065505236`) — SUCCESS
  at exactly the checkpoint.
- `npm run prepush` at the substantive tip — PASS (11 steps; 6265/6265 tests).
- `npm run gate:local` (authoritative gate) at S6 — PASS, 15/15 groups,
  topology PROVEN under BUBBLEWRAP, UI 105/105.
- `npm run gate:clean` (pristine fresh clone of S6) — PASS, 15/15 groups,
  sibling identity unchanged before/after.
- The six COMMAND lanes through the guarded measurement root — all PASS;
  `certify-evidence verify` — 25/25 tracked receipts valid, 0 invalid.
- Canonical vs independent fresh-clone evaluator — EXACT per-condition
  agreement (15/16 MET; condition #3 UNMET).

At the S6 candidate tip (task-record coherence + mutation contract, 2026-10-19):
- The NW-07 PLAN/STATE milestone-coherence failure found by the prepush
  affected-shards run is fixed at its root: the completed milestones are
  recorded as `**M<N> COMPLETE**` markers and every PLAN milestone section
  carries its `- **Status:**` line, so the live records satisfy the enforced
  coherence rule (5/5 nw07 tests pass).
- The mutation contract for the new guards (D-174's standard: every new guard
  is behaviourally detected) registers BM-123..BM-126 under findings
  R5-16/task-retarget-recovery and R5-16/spend-pre-request-admission; the
  census pin moves 122 -> 126 exactly as its own documented procedure
  prescribes. `npm run hardening:mutants` — 126/126 detected, 0 survived.
- `npm run gate:milestone` — every step green (validation-universe,
  execution-classes, typecheck, hardening-check, agent-check, handoff-check,
  typecheck-bin, hardening-rules 274/274, mutation-harness 122/122 at the
  time, project-check); the full prepush lane is re-run at the committed tip.

Earlier R6 staged validation (fe193a3a/ba84217d, recorded in the previous
milestones): 21/21 new tests, 114 focused tests, 13 localCampaign/endurance
tests, 77/77 blocking binary checks, 274/274 hardening probes, 122/122
behavioural mutants.

## Decisions Made During This Task

- D-180: the owner-approved `retarget-task` recovery — the one narrow
  correction for a misassigned live claim, its exact admission bounds, its
  mutation contract, and its single authorized use (this session's claim).
- D-181: the pre-request monetary admission — a metered call is admitted
  BEFORE dispatch only when its cumulative worst-case spend fits the declared
  ceiling; a metered run without a ceiling fails closed.
- The R6 completion semantics (host-computed verdict over a declared finite
  plan; no success through stagnation, NO_PROGRESS or budget exhaustion) are
  recorded in `REPORT.md` §2.

## Discoveries

- C-00 had no supported live-self-claim retargeting operation: `claim` creates
  a new session identity and refuses a live holder, `recover` only clears a
  crashed transition lock, so a mistaken task id was uncorrectable without
  hand-editing a record (forbidden).
- `checkContinuity` requires LAST_VALIDATED_IMPLEMENTATION_SHA to EQUAL
  LAST_SUBSTANTIVE_CHECKPOINT_SHA (a different value is refused in both
  branches), and the named commit must be a real implementation commit on the
  STARTING_SHA lineage.
- The workspace checker reports its ERROR lines on stdout (renderText), while
  the session CLI's own refusals go to stderr.
- The R6-04 PAUSED-placeholder repair had corrected two of the four tests that
  pinned the phantom count; `campaignStrategyMemory` and `w10LongRunResilience`
  still pinned it and failed once the full agent-runtime suites ran.

## Blockers

None in this task's scope. The provider proof is gated on the owner/account-
side actions recorded under Deferred / Follow-Up and D-182 (the parent-12.5
approval with its monetary cap, the account-side revocation and auto-top-up
confirmations, and the prepared stale-credential-copy removal).
## Safety Events

- D-180 recovery executed with the exact expectations
  (`--expect-session sess-6d6ce5780dfc --expect-head 9084cff7…`, `--expect-task
  nightwatch-final-product-completion-v1 --task
  nightwatch-release-success-contract-v1 --owner-recovery`); the transition
  published only `taskId`/defaulted `campaignId`; the predecessor session's
  record and worktree were verified byte-for-byte unchanged; one sanitized
  audit line was written to the worktree's private untracked git directory.
- No provider contacted, no credit consumed, no credential read into any
  record, no Alphaus contact, no sibling mutation, no force operation.

## Deferred / Follow-Up

- The remaining hard monetary-ceiling gap is NOT fixed by this task and is not
  claimed as fixed. Source byte accounting bounds the run but is conserved
  reactively after each call and `wallTimeMs` is deliberately not conserved, so
  one call can overshoot. A genuine enforced account-side ceiling is still
  required before a paid run.
- The predecessor session `nightwatch-final-product-complet-ded25ab6` (task
  `nightwatch-final-product-completion-v1`) keeps its live claim and its S5
  measurement-root worktree untouched by owner decision; releasing or removing
  it remains an owner action outside this task.
- Stale OpenDesign credential copies (the old `amr` provider entry,
  `models.json` literal, `auth.json.bak`) are a credential-hygiene action on
  the owner's machine and are reported, not silently deleted.

## Resume Recipe

Task complete. Do not resume this task. Any future provider proof requires a
separate fresh owner authorization (the parent-12.5 grant with its monetary
cap) and belongs to a new task; nothing here is resumed or left mid-flight.
The certification state at closure is S6 `d78e6c55` with 15/16 effective MET.
## Completion Snapshot

Complete — the task is closed at S6 `d78e6c55b5c79ccb97e958e777a9c54e0dbcb742`.
R6 completion reachable and proven (21 deterministic tests plus the resumed
population invariant); the C-00 `retarget-task` recovery implemented, tested
(9 governance cases) and applied to this session with the predecessor
preserved byte-for-byte; the D-181 pre-request spend admission implemented and
behaviourally detected (BM-123..BM-126; 126/126 mutants); prepush and the
milestone gate green at the substantive tip (6265/6265 tests); governed
fast-forward integration of all seven repair commits; exact-head CI green at
S6 (run 39254273491); the full checkpoint-bound evidence set re-earned at S6
(25 receipts, verify 25/25) with the canonical and independent fresh-clone
evaluators in exact per-condition agreement (15/16, condition #3 UNMET); the
parent-12.5 provider package prepared without any provider call or spend.
