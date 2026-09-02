# Active Task

Task ID: nightwatch-proxy-gate-reliability-r11-v1
Phase: PROXY_GATE_RELIABILITY_R11_V1
Title: R-11 Proxy/Gate Reliability Closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-proxy-gate-reliability-r11-v1
Starting SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
Last validated implementation SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
Last checkpoint: 2026-09-02 — OBS-C105-1 reproduced deterministically and end-to-end against the unmodified allocator at c423e33; the allocator is correct in all four brief-specified cases and the failing assertion is the test's, reproducing the exact CI failedLocations value tests/unit/phase24ProxyLifecycle.test.ts:105
Current milestone: M2 — port-lease contract
Next action: Edit src/proxy/portLease.ts — add pure proxyPortCandidates(preferred), factor the allocation loop into a module-private core taking an explicit availability predicate, keep reserveProxyPortLease bound to the real portAvailable probe with no substitutable parameter, add the TEST ONLY availability seam, and add the candidateOffset / preferredOutcome diagnostics
Authorization class: NIGHTWATCH_PROXY_GATE_RELIABILITY_R11_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
LAST_VALIDATED_IMPLEMENTATION_SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
LAST_SUBSTANTIVE_CHECKPOINT_SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PROXY_GATE_RELIABILITY_R11_V1_STATUS: IN_PROGRESS

## Routing and safety

R-11 is a bounded prerequisite for C-11, not part of it. It closes the two
pre-existing reliability defects recorded as OBS-C105-1 during C-10.5:

1. a non-deterministic member of a REQUIRED quality-gate group — the
   `phase24ProxyLifecycle` SIGTERM/SIGINT case derived its port from
   `process.pid` and then asserted it obtained that exact port, so any
   unrelated listener on the host failed the group; and
2. a receipt that a summarizing filter can destroy — the authoritative gate
   emits its receipt to stdout only, and the clean-checkout wrapper recovers
   the inner receipt by scraping stdout.

The allocator itself is correct and is not being changed to preserve an
over-strong assertion.

This is a repository-local, offline, synthetic-only campaign. No real
production, DEV or NEXT contact is authorized or performed. No authenticated
browsing, no credential or auth-state inspection, no datastore, cloud, IAM or
Kubernetes access, no sibling-repository write, no external publication. Every
socket is loopback-only.

C-06 remains COMPLETE and fail-closed. C-10's privacy algebra and C-10.5's
provenance binding are untouched. Production remains non-loadable through
ordinary environment selection.

C-11 `PROD_OBSERVE` is hard-gated behind the R-11 completion gate and is NOT
started in this task. It requires its own task, OpenSpec change and audit trail
so the two remain separately auditable.

All work happens in the owned session worktree
`session/nightwatch-proxy-gate-reliabilit-6e648bc4`; the canonical checkout is
never used for implementation.
