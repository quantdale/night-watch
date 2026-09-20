# Active Task

Task ID: nightwatch-exhaustive-repository-audit-proposals-v1
Phase: EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1
Title: Exhaustive repository audit and OpenSpec proposals
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-exhaustive-repository-audit-proposals-v1
Starting SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last validated implementation SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last checkpoint: M0 is complete; M1 admitted NW-AUD-001, NW-AUD-004, NW-AUD-005, NW-AUD-006, NW-AUD-007, and NW-AUD-009 and created six strict-valid issue-specific remediation changes; validation-universe, bin-typecheck, and duplicate change-shadow CLI-contract leads were dispositioned.
Current milestone: M1 — repository topology, dependencies, configuration, and build/tooling
Next action: Inspect the remaining release/checkpoint and schema-renderer seams, prioritizing unsafe path/symlink, atomicity, stale-authority, and false-success behavior, and record decisive dispositions in `audit.md`.
Authorization class: EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_VALIDATED_IMPLEMENTATION_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_EXHAUSTIVE_REPOSITORY_AUDIT_PROPOSALS_V1_STATUS: IN_PROGRESS

## Mission

Inspect the complete Nightwatch repository using read-only evidence, identify and prioritize every material correctness, security, safety, reliability, performance, architecture, maintainability, validation, and test gap, and capture each coherent remediation scope in detailed OpenSpec proposal artifacts. Do not implement product changes.

## Read order

1. `.agent/tasks/nightwatch-exhaustive-repository-audit-proposals-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, and `docs/ARCHITECTURE.md`
3. Existing active and archived OpenSpec changes, tests, source, configuration, tooling, Git history, and validation evidence needed to distinguish new issues from already-planned work

## Routing and safety

```
CAMPAIGN: nightwatch-exhaustive-repository-audit-proposals-v1
CHILD TASK: NONE
WAVE: AUDIT-PROPOSALS-V1
SESSION WORKTREE: session/nightwatch-exhaustive-repository-ef157f7a

IMPLEMENTATION AUTHORIZED:
  task continuity files, OpenSpec audit/proposal/design/spec/task artifacts,
  validation of those planning artifacts, and durable planning checkpoints.

PRODUCT SOURCE IMPLEMENTATION:             NOT AUTHORIZED
ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
SIBLING READ:                              NOT REQUIRED; NIGHTWATCH REPO ONLY
LOCAL READ-ONLY COMMANDS AND TESTS:         AUTHORIZED
OPENSPEC ARTIFACT WRITES:                   AUTHORIZED
```

This is a planning-only campaign. Findings must be grounded in current code, tests, configuration, docs, and deterministic local evidence. Existing proposals must be deduplicated rather than restated as new defects. No implementation task may be checked off as performed.
