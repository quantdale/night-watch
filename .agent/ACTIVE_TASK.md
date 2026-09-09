# Active Task

Task ID: nightwatch-residual-closure-and-lane-qualification-v1
Phase: RESIDUAL_CLOSURE_AND_LANE_QUALIFICATION_V1
Title: Residual Closure and Lane Qualification
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1
Starting SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Last validated implementation SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
Last checkpoint: M0 COMPLETE — planning checkpoint validated and integrated at `a180a081d92f32a75fd26909d6e3362459cea990`; R-07 registered from live use
Current milestone: M0b — restore the planning-only handoff checkpoint (R-07)
Next action: Teach `bin/project-state-check.mjs` to assert the predecessor binding for a `READY_FOR_EXECUTION` prompt instead of the campaign binding the handoff protocol forbids, add a regression covering the planning and active prompt states, then validate and continue to M1.
Authorization class: RESIDUAL_CLOSURE_AND_LANE_QUALIFICATION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LAST_VALIDATED_IMPLEMENTATION_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 58bbf2d028ce2d59e6c5616ffeeb65ab43eec142
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_RESIDUAL_CLOSURE_AND_LANE_QUALIFICATION_V1_STATUS: IN_PROGRESS

## Mission

Resolve the four lanes `nightwatch-repository-hardening-implementation-v1`
recorded UNAVAILABLE into `PROVEN`, `BLOCKED_EXTERNAL` or
`UNAVAILABLE_CAPABILITY`; prove what this host can prove; close the
bookkeeping that campaign deferred; and give local evidence growth a bounded,
refusal-first retention policy.

Read in this order:

1. `openspec/changes/nightwatch-residual-closure-and-lane-qualification-v1/audit.md`
2. `.agent/tasks/nightwatch-residual-closure-and-lane-qualification-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/EXECUTION_PROMPT.md`
4. `AGENTS.md`, `.agent/PLANS.md`, applicable instructions
5. `docs/HOST-CAPABILITY-MATRIX.md` §4-§5, `docs/CI_HARDENING.md`, then live
   Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-repository-hardening-implementation-v1` is terminal COMPLETE.
  NW-01 through NW-14 are CLOSED with acceptance evidence and NW-15 is closed
  by the W10 owner. Its terminal record stays untouched.
- W0-W10 of `nightwatch-autonomous-bug-hunting-programme-v1`, including the
  W9 `GO_VENDORED_PACKAGE_TEST` and `CURRENT_SOURCE_REPEATED_TEST_FAILURE`
  semantics and the W10 `nightwatch.reproduction-surface-map.v1` contracts.
- historical `PRE_FAIL_POST_PASS` and strict `EXACT_REDISCOVERY` semantics;
- the permanent owner scope freeze, L6 containment, the Phase 9 / 9A.1 / 10
  semantic admission rules, and mechanical dossier admission;
- immutable evidence and review store identities with their no-replace
  patterns.

Every repair in this campaign is additive or behaviour-preserving for valid
inputs, and artifacts written by earlier schemas must keep reading.

## Routing and safety

```
CAMPAIGN: nightwatch-residual-closure-and-lane-qualification-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-residual-closure-and--e130f226

IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state,
  the seven registered findings R-01 through R-07,
  the handoff/project-state cross-check contract,
  evidence retention over repository-owned generated outputs,
  fabricated adversarial fixtures in disposable temporary directories,
  commits/pushes/integration and local certification.

REAL PRODUCTION CONTACT:            NOT AUTHORIZED
NEXT / DEV EXECUTION:               NOT AUTHORIZED
NETWORK EGRESS / ADVISORY SCAN:     NOT AUTHORIZED
C-12 / C-13 / C-14 LIVE EXECUTION:  NOT AUTHORIZED
C-08b:                              NOT AUTHORIZED
C-07 DEV:                           NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:    NOT AUTHORIZED
EXTERNAL FILING:                    NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:           NOT AUTHORIZED
SIBLING WRITES:                     NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:       NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Adversarial tests write
only to disposable temporary state they create. Never retire, prune, adopt or
edit another session, and never create worktree capacity by removing one.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
