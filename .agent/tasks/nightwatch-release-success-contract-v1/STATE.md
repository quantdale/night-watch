# Task State

## Identity

Task ID: nightwatch-release-success-contract-v1
Phase: RELEASE_SUCCESS_CONTRACT_V1
Status: BLOCKED
Starting SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Last validated implementation SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Last substantive checkpoint SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-final-product-complet-12cbddff
Last checkpoint: 2026-10-19 — the release success contract is IMPLEMENTED and
gated locally. The campaign lane can now reach COMPLETED_SUCCESSFULLY through a
host-computed completion verdict over a declared, finite investigation plan,
while NO_PROGRESS, BUDGET_EXHAUSTED, PAUSED, SAFETY_BLOCKED, CANCELLED,
REASONER_FAILURE and PROVIDER_DEGRADED remain strictly distinct and
non-qualifying. Diagnostics and the sibling-observation scope are corrected.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LAST_VALIDATED_IMPLEMENTATION_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ac0cc600473a6a133636d07eecc36ed535c4fcca
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_RELEASE_SUCCESS_CONTRACT_V1_STATUS: BLOCKED

## Objective

Close the structural mismatch between the campaign runner and its release-success
evaluator without weakening any certification requirement, and make a future
provider run genuinely capable of qualifying.

## Current Milestone

M5 — gates. Implementation, diagnostics, sibling-scope separation and the A-J
proof set are complete and pass locally. Remaining: integrate and observe
exact-head CI, which is owner-gated.

## Completed Milestones

- M0 complete: defect confirmed against source; the campaign loop had six exits
  and none could emit a campaign-level COMPLETE_* reason, while the evaluator
  requires COMPLETED_SUCCESSFULLY. Population evidence: 33/33 receipts
  NO_PROGRESS, 32 with a healthy provider.
- M1 complete (R6-01): `campaignCompletion.ts` added; `localCampaign.ts` gains the
  declared plan, its persistence, the SUCCESS exit and the refusal exit, and a
  stagnation flag; `--expected-investigations` validated in the launcher.
- M2 complete (R6-02): `campaignDiagnostics.ts` added; per-investigation causes
  captured before checkpoint deletion; launch parameters and usage persisted
  through the receipt diagnostics block.
- M3 complete (R6-03): `--observe-repository` separates the observation scope
  from the investigation scope; no arbitrary observation is manufactured.
- M4 complete: 19 deterministic tests cover A-I plus J (the real G12 probe grades
  a genuinely completed receipt MET).

## Work In Progress

None. Local validation is complete and green.

## Blockers

BLOCKED_BY_TOPOLOGY_CLAIM — `npm run agent:check` fails with
`WORKSPACE_DUPLICATE_TASK_CLAIM: task nightwatch-final-product-completion-v1 is
live in worktrees nightwatch-final-product-complet-12cbddff and
nightwatch-final-product-complet-ded25ab6`. This was introduced by this
session's own `claim --adopt`, which registered this worktree under the
completion campaign's task id. It cannot be cleared from inside the session:
- the ownership record still names `nightwatch-final-product-completion-v1`, so
  `claim --task nightwatch-release-success-contract-v1 --adopt` answers
  `SESSION_ALREADY_OWNED`;
- `release`/`reconcile` refuse with `SESSION_CONTINUITY_MISMATCH` because that
  task's `STATE.md` records `Branch: main` while this worktree is on a session
  branch; `--allow-drift` does not relax the continuity rule;
- `remove` refuses with `SESSION_REMOVE_REFUSED_LIVE_HOLDER` (the holder has no
  pid, so liveness is by boot digest alone) and with
  `SESSION_CHECKOUT_CLASS_REFUSED` from the session worktree.

Owner action required: release/remove this session's claim from the canonical
checkout, or retire the stale `nightwatch-final-product-completion-v1` claim.
No file was hand-edited to work around it.

## Deferred / Follow-Up

- The remaining hard monetary-ceiling gap is NOT fixed by this task and is not
  claimed as fixed. Source byte accounting bounds the run but is conserved
  reactively after each call and `wallTimeMs` is deliberately not conserved, so
  one call can overshoot. A genuine enforced account-side ceiling is still
  required before a paid run.
- Governance: the long-lived predecessor session
  `nightwatch-final-product-complet-ded25ab6` (task
  `nightwatch-final-product-completion-v1`) holds a live-but-stale claim whose
  own continuity no longer matches, so it cannot be released by this session.
  This task therefore carries its own identity and no longer collides with it.
  The predecessor's worktree and its failed-campaign artifacts were preserved
  untouched.

## Exact Next Action

STOP for owner decision. The source remediation is complete and validated; the
only thing preventing a clean `agent:check` is the duplicate session claim named
in Blockers, which is an owner/admin topology action. Integration and any fresh
provider run are separately owner-gated; see REPORT.md.
