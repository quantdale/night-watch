# Active Task

Task ID: nightwatch-concurrency-workspace-hardening-c00-v1
Phase: CONCURRENCY_WORKSPACE_HARDENING_C00_V1
Title: Nightwatch Concurrency and Workspace Hardening (C-00)
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-concurrency-workspace-hardening-c00-v1
Starting SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
Last validated implementation SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
Last checkpoint: M0/M1 bootstrap and durable task creation adopted from the interrupted predecessor session in worktree branch session/c00-a396cd1f
Current milestone: M2 — deterministic worktree/session ownership model
Next action: Implement bin/workspace-integrity.mjs ownership classification and config/workspace-integrity.v1.json, then wire M3 hygiene invariants
Authorization class: NIGHTWATCH_CONCURRENCY_WORKSPACE_HARDENING_C00_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
LAST_VALIDATED_IMPLEMENTATION_SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 2517c26a019bbf8aa53008cd57658b917cc79bea
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONCURRENCY_WORKSPACE_HARDENING_C00_V1_STATUS: IN_PROGRESS

## Routing and safety

C-00 is the concurrency and workspace hardening campaign required by the
independent second-reviewer architecture review (MA-13, review §11, threat
T-48 OBSERVED, F-32) before any substantial parallel implementation of the
production-observability roadmap. It establishes the invariant
`ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY`, deterministic
repository-global Git hygiene invariants, a declared-deletion gate, and a
fast-forward-only integration protocol.

C-00 grants no new product or runtime authority. No production, NEXT, DEV
contact, credential inspection, datastore/database, cloud/IAM/Kubernetes,
sibling-repository write, publication, or C-01 implementation authority is
granted. Destructive Git behaviour is exercised only against disposable
synthetic repositories created by the tests.
