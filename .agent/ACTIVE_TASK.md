# Active Task

Task ID: nightwatch-autonomous-yield-proof-w11-v1
Phase: AUTONOMOUS_YIELD_PROOF_W11_V1
Title: W11 — Autonomous yield proof (strict rediscovery + owner-local yield)
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-autonomous-yield-proof-w11-v1
Starting SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last validated implementation SHA: 158a97b8feceb6abf4ea4ccbacab1f20cc46bc35
Last checkpoint: VERDICT PARTIAL — BLOCKED. M0-M4, M7 and M8 COMPLETE; M5
blocked externally. The frozen historical arm
(`sha256:824deef9922975feab5af69f`, provider `opencode-go/glm-5.3`) evaluated
14/14 cases in 66.8 min: **EXACT = 0, exact rate 0/13**, 10 near matches, 4
reproductions, 7 candidates, 3 mechanical admissions, 4 refused
`MISSING_REPRODUCTION`, 0 false positives, 0 `ENVIRONMENT_BLOCKED`, 0 leakage
across 78 audited request blobs. M3 established mechanically WHY EXACT is 0:
`testMatch` failed in 13/13 while file recall reached 1.00 in 9 cases, and the
hidden failing test is absent from the whole visible context for every fixture
and is a fix-ADDED file for mined cases, so it is not derivable under leak-free
conditions. EXACT was not weakened and no near match was promoted.
Current milestone: M5 — BLOCKED on an external subscribed-provider outage
Next action: finish the remaining non-provider validation and integrate, then
STOP on the unknown arm until `opencode-go/glm-5.3` answers a structured probe within
the frozen timeout, then run the four frozen runs in
`evaluation-freeze.unknown.json` (`sha256:6145bd666dd08369ec38b018`) unchanged.
Do NOT substitute a provider to get past the blocker: choosing one after results
are visible is the contamination the freeze prevents, and it would require a new
fingerprint and a full rerun of both arms. That is an owner decision.
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
