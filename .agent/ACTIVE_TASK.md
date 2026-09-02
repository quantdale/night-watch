# Active Task

Task ID: nightwatch-c10-provenance-truth-closure-v1
Phase: C10_PROVENANCE_TRUTH_CLOSURE_V1
Title: C-10.5 Provenance and Project-Truth Closure
Status: COMPLETE
Task directory: .agent/tasks/nightwatch-c10-provenance-truth-closure-v1
Starting SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
Last validated implementation SHA: c763c056d306172df3c03c03781f5ec5516944e9
Last checkpoint: exact-head GitHub run 33627408962 / job 100238317324 at 4d59235 passed all eleven required groups on Node 20 with receipt receipt:sha256:072d1ba432a39944aca0466c and SYNTHETIC_CAMPAIGN 256/256; local gate receipt:sha256:50f85aa10248ac17323c9290 and clean Node 20 gate clean-receipt:sha256:ed216b4c47ec9247d6507a40 green with siblingWrites 0; canonical regression 2,975 total / 2,962 passed / 13 skipped / 0 failed; DEF-C105-1 found and repaired before closure
Current milestone: COMPLETE / STOP — M0 through M12 are closed
Next action: STOP — Stage A (C-10.5) is complete and exact-head CI certified. Do NOT begin Stage B (C-11 PROD_OBSERVE) in this task: it requires its own separately recorded task, OpenSpec change and audit trail so the two stages stay separately auditable. Stage A passing authorizes C-11 to begin; it grants no production connectivity
Authorization class: NIGHTWATCH_C10_PROVENANCE_TRUTH_CLOSURE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
LAST_VALIDATED_IMPLEMENTATION_SHA: c763c056d306172df3c03c03781f5ec5516944e9
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c763c056d306172df3c03c03781f5ec5516944e9
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_C10_PROVENANCE_TRUTH_CLOSURE_V1_STATUS: COMPLETE

## Routing and safety

C-10.5 is a bounded prerequisite for C-11, not a reopening of C-10's privacy
architecture. It closes the residual AUTHORITY gap — a provenance label was
sufficient to mint a production-safe vocabulary, and no mechanical binding to a
source artifact existed — and the residual PROJECT-TRUTH gap, where the
machine-checked baseline still named a predecessor ancestor that the validator
could not detect because the stale fields agreed with each other.

This is a repository-local, synthetic-only campaign. No real production, DEV or
NEXT contact is authorized or performed. No authenticated browsing, no
credential or auth-state inspection, no datastore, cloud, IAM or Kubernetes
access, no sibling-repository write, no external publication.

C-10's projection algebra, persistence firewall, digest families, store layout
and Control Center exclusion all stand. C-06 remains COMPLETE and fail-closed
and is not weakened; no attempt is made to increase `READ_ONLY_PROVEN`.
Production remains non-loadable through ordinary environment selection.

C-11 `PROD_OBSERVE` is hard-gated behind the Stage-A completion gate and is NOT
started in this task.

All work happens in the owned session worktree
`session/nightwatch-c10-provenance-truth--ba3470bc`; the canonical checkout is
never used for implementation.
