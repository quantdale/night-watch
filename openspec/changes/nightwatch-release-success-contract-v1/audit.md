# Audit — release success contract v1

A compact audit of the two defects this change closes and the evidence behind
them. (The terminal programme's 228-item census lives in
`openspec/changes/nightwatch-final-product-completion-v1/audit.md` and is not
duplicated here.)

## A. The unreachable success contract

- Claim: campaign-level `COMPLETED_SUCCESSFULLY` is unreachable by
  construction. Evidence: `runCampaignLoop` (`src/core/agentRuntime/localCampaign.ts`)
  had six `resultOf(engine, ...)` exits — `BUDGET_EXHAUSTED` (x2), `CANCELLED`,
  `PAUSED`, `SAFETY_BLOCKED`, `NO_PROGRESS` — and
  `COMPLETE_WITH_FINDING`/`COMPLETE_NO_FINDING` appeared zero times in that
  module (per-investigation reasons only), while `evaluateYieldCampaignEvidence`
  (`src/core/agentRuntime/productRunReceipt.ts`) requires
  `campaignTermination === 'COMPLETED_SUCCESSFULLY'`.
- Population evidence: 33/33 `product-run-receipt.json` on this host were
  `NO_PROGRESS`, 32 of them `VALID_PROVIDER_RUN`.
- Disposition: FIX (R6-01..R6-04) — closed by this change.

## B. The resume-path phantom

- Claim: a campaign that pauses mid-investigation and resumes can never
  complete, because `absorbPausedInvestigationPrefix` counts `PAUSED` for the
  slot and `absorbInvestigation` adds the finished reason without retiring the
  placeholder. Two pre-existing tests pinned the phantom count (6 terminations
  for 5 investigations).
- Disposition: FIX (R6-04) — closed by this change; the pinned tests are
  corrected to the reconciled semantics with an explicit population invariant.

## C. The C-00 misassigned claim

- Claim: a live session claim registered under the wrong task id had no
  supported correction, so `WORKSPACE_DUPLICATE_TASK_CLAIM` failed every gate
  and `integrate` answered `SESSION_CONTINUITY_MISMATCH`; hand-editing a record
  or deleting a worktree is forbidden.
- Disposition: FIX (D-180 `retarget-task`) — closed by this change; the single
  authorized use corrects `sess-6d6ce5780dfc` from
  `nightwatch-final-product-completion-v1` to this task, with the predecessor's
  claim and worktree preserved byte-for-byte.

## D. The hard monetary ceiling (open)

- Claim: the engine conserves byte budgets reactively after each call and has
  no monetary ceiling field, so no pre-request affordability admission exists
  (D-178). A metered provider run therefore has no enforced spend cap.
- Disposition: open, owner-gated with the provider run itself; this change
  makes no claim to have closed it (see the task REPORT §6/§8).
