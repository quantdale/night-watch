# Active Task

Task ID: nightwatch-autonomous-bug-hunting-programme-v1
Phase: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
Title: Autonomous Bug-Hunting Programme
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
Last checkpoint: W10 reproduction-surface coverage and autonomous yield COMPLETE and certified; no implementation wave is active
Current milestone: NONE — W0-W10 are frozen complete
Next action: Hold at W10 and report the certified outcome to the owner. When the owner authorizes a successor wave (strict EXACT rediscovery, previously-unknown-defect yield, or DEV/NEXT work), open that wave's own task directory from live Git truth and record it here. Do not reopen W0-W10.
Authorization class: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 62d23e2622ab0a282584c5cf27d92b6b603f9192
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1_STATUS: IN_PROGRESS

## Terminal W10 child task

Child task: `nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
Child directory: `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1`
Wave: `W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD`
Child status: COMPLETE — implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`, certified documentation head `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`.

Read in this order:

1. `.agent/EXECUTION_PROMPT.md`
2. `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/{SPEC,PLAN,STATE,REPORT}.md`
3. W9 `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/{STATE,REPORT}.md`
4. W8 `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{STATE,REPORT}.md`
5. W7 `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md`
6. parent `PROGRAMME.json`, `STATE.md`, `REPORT.md`
7. `AGENTS.md`, applicable instructions, `docs/CURRENT_STATE.md`, OpenSpec, then live Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- W7 real owner-local sensing/provider substrate, shared historical reproduction and mechanical admission;
- W8 bounded turn/campaign memory, target ledger, hypothesis lifecycle, efficacy harness and memory-aware reasoner;
- W9 host-derived current-source `GO_VENDORED_PACKAGE_TEST`, `CURRENT_SOURCE_REPEATED_TEST_FAILURE`, host-owned retry disposition and separated byte budgets.

W9's live reference was 26 unique source targets, 28 grounded hypotheses, 7 reproduction attempts, **7 `NOT_AVAILABLE`**, 1 candidate, 0 admissions. W10 closed that gap: across four HOUR_1 campaigns, 16 of 22 reproduction attempts reached real contained execution and the census-scoped run wasted none, still with zero admissions and zero fabricated findings.

## Routing and safety

```
CAMPAIGN: nightwatch-autonomous-bug-hunting-programme-v1
CHILD TASK: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
WAVE: W10
SESSION WORKTREE: session/nightwatch-reproduction-surface--0a9096be

IMPLEMENTATION AUTHORIZED:
  Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state,
  bounded owner-local reproduction capability census/surface map,
  additive capability-aware memory/strategy/metrics,
  safe host-derived offline reproduction executor expansion when live
  prerequisites and threat model justify it,
  sanitized current-source failure evidence,
  fabricated/adversarial fixtures, multiple long LOCAL subscribed-provider
  campaigns, commits/pushes/integration and local/clean-clone certification.

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

LOCAL only. Sibling repositories remain read-only. Reproduction may write only to disposable Nightwatch-owned temporary state. The model never receives arbitrary shell/Git/network/filesystem authority or arbitrary package-script execution.

C-00 governs all writers: one writing agent == one owned worktree == one session identity. Canonical checkout is not an implementation worktree.
