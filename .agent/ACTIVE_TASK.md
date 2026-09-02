# Active Task

Task ID: nightwatch-c10-provenance-truth-closure-v1
Phase: C10_PROVENANCE_TRUTH_CLOSURE_V1
Title: C-10.5 Provenance and Project-Truth Closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-c10-provenance-truth-closure-v1
Starting SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
Last validated implementation SHA: e0e3728ed273eabbc51c50bbc63889c8fb1257fc
Last checkpoint: campaign records and OpenSpec change created; verified starting truth independently — origin/main and local HEAD both cb631cc with a clean tree, C-10 substantive implementation 23523cc, and the final exact-head CI run 33601265465 / job 100155266632 at cb631cc green on Node 20 across all eleven required groups with receipt receipt:sha256:f38b272bec3a37464257e194 and SYNTHETIC_CAMPAIGN 221/221
Current milestone: M0 — campaign records and activation
Next action: complete M0 activation checks, then implement the A3/A7 provenance authority core (validated source-evidence capability types, deterministic canonical binding, computed-digest mint with no digest parameter, module-private runtime brand registry)
Authorization class: NIGHTWATCH_C10_PROVENANCE_TRUTH_CLOSURE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: cb631cc4af3c3572f4cbf78da04a8265075fbfa5
LAST_VALIDATED_IMPLEMENTATION_SHA: e0e3728ed273eabbc51c50bbc63889c8fb1257fc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e0e3728ed273eabbc51c50bbc63889c8fb1257fc
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_C10_PROVENANCE_TRUTH_CLOSURE_V1_STATUS: IN_PROGRESS

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
