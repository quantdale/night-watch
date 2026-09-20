# Active Task

Task ID: nightwatch-test-infrastructure-performance-v1
Phase: TEST_INFRASTRUCTURE_PERFORMANCE_V1
Title: Test infrastructure performance and parallelization
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-test-infrastructure-performance-v1
Starting SHA: 8dd8b163b567b939b977649d6ba7c371cf230ee6
Last validated implementation SHA: 5eaceb23354da3b9b4f5bab162ca29075691d9d5
Last checkpoint: Campaign activation began from live main
`8dd8b163` on 2026-09-20. W13 is the terminal predecessor (`COMPLETE`) and
remains frozen read-only evidence. This campaign measures the current
validation lanes, removes or reuses duplicated expensive work where identity
permits, parallelizes independent validation only where correctness is
mechanically preserved, adds fast development and milestone lanes that are
explicitly not certification, keeps the authoritative lanes authoritative and
measurably faster, and closes with before/after evidence and one verdict.
Current milestone: M1 — timing profiler and baseline measurement
Next action: commit the telemetry checkpoint, then capture the M1 baseline for
every named lane inside an owner-quiesced host benchmark window, with host-load
receipts and median-of-N where needed, writing the baseline table and top-N
slowest list under the task evidence directory.
Authorization class: TEST_INFRASTRUCTURE_PERFORMANCE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 8dd8b163b567b939b977649d6ba7c371cf230ee6
LAST_VALIDATED_IMPLEMENTATION_SHA: 5eaceb23354da3b9b4f5bab162ca29075691d9d5
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 5eaceb23354da3b9b4f5bab162ca29075691d9d5
LAST_DOCUMENTATION_CHECKPOINT_SHA: 8dd8b163b567b939b977649d6ba7c371cf230ee6
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_TEST_INFRASTRUCTURE_PERFORMANCE_V1_STATUS: IN_PROGRESS

## Mission

Make the Nightwatch development and validation loop significantly faster
without reducing test coverage, safety, determinism, or release confidence.
Measure the slow paths, classify and remove or reuse duplicated expensive
work, parallelize independent validation only where correctness is
mechanically preserved, add fast and milestone lanes that cannot masquerade as
certification, keep the authoritative lanes authoritative, and produce
before/after timing evidence plus exactly one verdict.

## Read order

1. `.agent/tasks/nightwatch-test-infrastructure-performance-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-test-infrastructure-performance-v1/`
3. W13 task and evidence (frozen predecessor lane measurements)
4. `AGENTS.md`, durable safety/current-state/decision/roadmap documents, then
   live Git/workspace/session truth.

## Frozen predecessor boundary

W13 is `COMPLETE`. Its measured lane receipts (synthetic 422.94-643 s,
`gate:local` 818 s, clean-gate synthetic timeout classification, `npm test`
5,310/0/18) are read-only inputs. This campaign must not re-run or rewrite
W13's evidence merely for comparability; it measures its own baseline before
changing anything.

## Routing and safety

```
CAMPAIGN: nightwatch-test-infrastructure-performance-v1
CHILD TASK: NONE
WAVE: PERFORMANCE-1
SESSION WORKTREE: session/nightwatch-test-infrastructure-p-9ce4576b

IMPLEMENTATION AUTHORIZED:
  this task directory, its OpenSpec change, test runner and Playwright
  configuration, test discovery/selection, sharding and safe parallelization,
  fixture lifecycle and process startup, shared immutable fixture caching,
  build reuse, gate orchestration and CI/local gate scheduling,
  validation-universe metadata, timing/telemetry surfaces, development-only
  fast and milestone validation lanes, documentation and task/OpenSpec
  surfaces, regression tests for the test infrastructure itself, and
  commits/pushes/integration from this owned C-00 session worktree.

ALPHAUS DEV CONTACT:                   NOT AUTHORIZED
ALPHAUS NEXT CONTACT:                  NOT AUTHORIZED
PRODUCTION CONTACT:                    NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:         NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:          NOT AUTHORIZED
GCP / GKE / KUBERNETES / AWS:          NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
ISSUE / PR CREATION:                   NOT AUTHORIZED
EXTERNAL PUBLICATION:                  NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:           NOT AUTHORIZED
WEAKENING ASSERTIONS / DELETING TESTS: NOT AUTHORIZED
INCREASING SKIPS:                      NOT AUTHORIZED
RAISING GATE TIMEOUT BOUNDS:           NOT AUTHORIZED
CLEAN-GATE STATE REUSE:                NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
```

LOCAL / OWNER-LOCAL only. All measurement, execution, and evidence stay on
this host inside the owned session worktree and the repository's ignored
artifact locations. Clean-checkout qualification keeps its independence and
never reuses local validation state. Parallel execution is allowed only for
work with an explicit execution class and a mechanical coverage-equality
proof. Mutation campaigns never run concurrently against one checkout.
