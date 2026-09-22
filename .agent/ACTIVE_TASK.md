# Active Task

Task ID: nightwatch-priority-audit-remediation-sequence-v1
Phase: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
Title: Priority audit remediation sequence implementation
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-priority-audit-remediation-sequence-v1
Starting SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
Last validated implementation SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
Last checkpoint: M4 COMPLETE at `5e2a0357` — gate:dev PASS; gate:milestone PASS (12/12 steps exit=0); probes 9/9 + 11/11; writer census 22/8/9; strict OpenSpec PASS.
Current milestone: M5 — Phase 5: NW-AUD-020 semantic request admission
Next action: Reproduce the four NW-AUD-020 defect classes from recon/wave1-aud020-census.md with focused failing regressions (passive unknown continuations, ~250ms intent-timer causality loss, navigation-as-ambient authority, host-only redirect fallback); then implement the immutable semantic admission handle, causal generations, finite bootstrap exemptions, and transport-total enforcement with zero-upstream refusal proof on synthetic fixtures only.
Authorization class: PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4a3df8cdc776c5ca47a9666f65afbd5c5519f092
LAST_VALIDATED_IMPLEMENTATION_SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5e2a03570f3e5d26bf2625478a9d501881a09cb7
LIVE_HEAD_AUTHORITY: GIT
PHASE_PRIORITY_AUDIT_REMEDIATION_SEQUENCE_V1_STATUS: IN_PROGRESS

## Mission

Implement and validate five owner-authorized audit remediations in strict
serial order — NW-AUD-010 release evidence lineage integrity, NW-AUD-014
child-process boundary totality, NW-AUD-019 private payload structural
screening, NW-AUD-018 authenticated evidence minimization, NW-AUD-020
semantic request admission — each with live reproduction, focused regression,
adversarial/mutation proof, honest OpenSpec/task truth, and a coherent
committed checkpoint; then run one cross-phase audit and one full
certification, close C-00, enumerate remaining audit backlog, and stop.

## Read order

1. `.agent/tasks/nightwatch-priority-audit-remediation-sequence-v1/{SPEC,PLAN,STATE}.md`
2. `AGENTS.md` and `docs/CURRENT_STATE.md`
3. `openspec/changes/nightwatch-priority-audit-remediation-sequence-v1/`
4. The active phase's remediation OpenSpec change and cited live source

## Routing and safety

```
CAMPAIGN: nightwatch-priority-audit-remediation-sequence-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-priority-audit-remedi-0e17af9c

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never
discard a newer canonical tip, and never touch another owner's worktree.
