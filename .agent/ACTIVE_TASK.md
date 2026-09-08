# Active Task

Task ID: nightwatch-repository-hardening-implementation-v1
Phase: REPOSITORY_HARDENING_IMPLEMENTATION_V1
Title: Repository Master Hardening Implementation
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-repository-hardening-implementation-v1
Starting SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
Last validated implementation SHA: 5b909f4a9fcc5528f179323ab227e06a8bf829c7
Last checkpoint: M10 / NW-08 complete and validated — the validation universe is mechanically complete and digest-pinned, with the full suite green on a clean tree
Current milestone: M11 — NW-14 dependency, portability and release documentation truth
Next action: Assess the Vue 2.6.12 development-fixture advisory with scope, reachability, owner rationale and a review date; document the Node/OS/Bubblewrap/Chrome capability matrix; and separate current operational guidance from the indexed archives without rewriting historical receipts.
Authorization class: REPOSITORY_HARDENING_IMPLEMENTATION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 0ac7b3d037b5059f670eca715fc30adaf58e7334
LAST_VALIDATED_IMPLEMENTATION_SHA: 5b909f4a9fcc5528f179323ab227e06a8bf829c7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5b909f4a9fcc5528f179323ab227e06a8bf829c7
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_REPOSITORY_HARDENING_IMPLEMENTATION_V1_STATUS: IN_PROGRESS

## Mission

Execute `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`, which closed as
`REVIEW COMPLETE — execution has not started`, through its dependency-ordered
roadmap and its repository-level definition of done.

Fourteen findings are in scope: NW-01 through NW-14. NW-15 is the W10
reproduction-surface wave, already complete and certified under its own owner;
this campaign consumes its results and does not reopen it.

Read in this order:

1. `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` sections 4, 6, 7 and 8
2. `.agent/tasks/nightwatch-repository-hardening-implementation-v1/{SPEC,PLAN,STATE,REPORT}.md`
3. `AGENTS.md`, `.agent/PLANS.md`, applicable instructions
4. `docs/CURRENT_STATE.md`, OpenSpec, then live Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- W0-W10 of `nightwatch-autonomous-bug-hunting-programme-v1`, complete and
  certified, including the W9 `GO_VENDORED_PACKAGE_TEST` and
  `CURRENT_SOURCE_REPEATED_TEST_FAILURE` semantics and the W10
  `nightwatch.reproduction-surface-map.v1` contracts. Its terminal record
  stays untouched at implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`
  and documentation `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`.
- historical `PRE_FAIL_POST_PASS` and strict `EXACT_REDISCOVERY` semantics;
- the permanent owner scope freeze, L6 containment, the Phase 9 / 9A.1 / 10
  semantic admission rules, and mechanical dossier admission;
- immutable evidence and review store identities with their no-replace
  patterns.

Every repair in this campaign is additive or behaviour-preserving for valid
inputs, and artifacts written by earlier schemas must keep reading.

## Routing and safety

```
CAMPAIGN: nightwatch-repository-hardening-implementation-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-repository-hardening--e7b9be89

IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state,
  the fourteen open master-plan findings NW-01 through NW-14,
  shared private-path/publication/diagnostic/deadline/DTO contracts,
  fabricated adversarial fixtures in disposable temporary directories,
  commits/pushes/integration and local/clean-clone certification.

REAL PRODUCTION CONTACT:            NOT AUTHORIZED
NEXT / DEV EXECUTION:               NOT AUTHORIZED
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
