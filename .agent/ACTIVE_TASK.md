# Active Task

Task ID: nightwatch-autonomous-yield-proof-w11-v1
Phase: AUTONOMOUS_YIELD_PROOF_W11_V1
Title: W11 — Autonomous yield proof (strict rediscovery + owner-local yield)
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-autonomous-yield-proof-w11-v1
Starting SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last validated implementation SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last checkpoint: M0 preflight COMPLETE and measured. Provider
`opencode-go/glm-5.3` frozen by a rule declared before probing (the historical
`opencode-go/omen-alpha` is confirmed absent); 8/8 admitted repositories CURRENT
with matching SHAs; 4,124 eligible / 1,120 executable source files and 152
distinct executable targets, reproducing the W10 M0 figure; historical corpus is
9 fixture cases (1 negative control) plus 5 strict-EXACT-eligible mined cases.
No evaluation has been run and no yield figure exists.
Current milestone: M1 — freeze the evaluation definition at a committed SHA
before the first provider evaluation
Next action: create the W11 OpenSpec change, write the frozen
evaluation-definition artefact, and commit that freeze BEFORE running the first
historical evaluation.
Authorization class: AUTONOMOUS_YIELD_PROOF_W11_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LAST_VALIDATED_IMPLEMENTATION_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_AUTONOMOUS_YIELD_PROOF_W11_V1_STATUS: IN_PROGRESS

## Mission

Use the mature W7-W10 Nightwatch stack to answer two questions with evidence:
can Nightwatch achieve strict historical `EXACT_REDISCOVERY` under leak-free
conditions, and can it discover and mechanically admit a previously unknown
defect from the current owner-local source universe without fabrication?

A zero-yield answer is acceptable. A fabricated defect is not.

Read in this order:

1. `.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
   section "12. Autonomous yield proof"
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`,
   `docs/DECISIONS.md`, then live Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- W7 real owner-local sensing, System Map / Bug Atlas / System Atlas substrate,
  deterministic reproduction provider and mechanical admission.
- W8 bounded investigation memory, cross-investigation strategy, grounded
  hypotheses and the mechanical SUPPORTED / DISPROVED lifecycle.
- W9 `GO_VENDORED_PACKAGE_TEST`, disposable materialization under
  `bwrap --unshare-net`, `CURRENT_SOURCE_REPEATED_TEST_FAILURE`, host-owned
  retry disposition and separated transport/tool-payload byte accounting.
- W10 capability projection, diverse source index, cross-investigation
  capability carry, current-failure triage and host-owned `--repository` scope.

W11 EXERCISES this system. It repairs it only where execution proves a concrete
defect.

## Routing and safety

```
CAMPAIGN: nightwatch-autonomous-yield-proof-w11-v1
CHILD TASK: NONE
WAVE: W11
SESSION WORKTREE: session/nightwatch-autonomous-yield-proo-72d452ea

IMPLEMENTATION AUTHORIZED:
  this task directory, its OpenSpec change, the W11 evaluation/measurement
  harnesses, repository-local implementation needed to truthfully execute and
  measure Group 12, the Group 12 ledger, Nightwatch docs and governed
  README/current-state yield surfaces, and commits/pushes/integration from one
  owned C-00 session worktree.

ALPHAUS DEV CONTACT:                   NOT AUTHORIZED
ALPHAUS NEXT CONTACT:                  NOT AUTHORIZED
PRODUCTION CONTACT:                    NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:         NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:          NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
ISSUE / PR CREATION:                   NOT AUTHORIZED
EXTERNAL PUBLICATION:                  NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:           NOT AUTHORIZED
SIBLING DEPENDENCY INSTALLATION:       NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
WEAKENING ADMISSION CRITERIA:          NOT AUTHORIZED
LEAKING HIDDEN GROUND TRUTH:           NOT AUTHORIZED
PROVIDER EGRESS VIA REASONER CLI:      AUTHORIZED
SIBLING READ (all 8 admitted, r/o):    AUTHORIZED
CONTAINED LOCAL REPRODUCTION:          AUTHORIZED, already-admitted classes only
```

LOCAL / OWNER-LOCAL only. Provider network access is allowed ONLY through the
existing configured reasoner CLI path; that is not authorization for Nightwatch
or product traffic to any Alphaus environment. Sibling repositories are READ
ONLY, with identity checked before and after reproduction. Hidden historical
ground truth must never reach the reasoner; leakage aborts yield publication.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
