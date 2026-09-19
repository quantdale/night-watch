# Active Task

Task ID: nightwatch-provider-resilient-current-yield-w13-v1
Phase: PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1
Title: W13 — Provider-resilient current-source unknown-defect yield
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1
Starting SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
Last validated implementation SHA: 68d834b9bf5befb7225332c2563aa261f4374794
Last checkpoint: W13 activation is COMPLETE at `a95004a0` (follow-up
`bdb781d4`) from live main `34517c9b`. W12 is preserved as
`PARTIAL — BLOCKED`: one valid broad run with
2 candidates and 0 admissions, and eight scoped runs provider-blocked on the
single frozen provider. W13 is a distinct owner-authorized successor whose
Phase A must close every locally closable W12 residual before Phase B freezes
a provider-resilience policy and executes the fixed broad-plus-eight-scoped
matrix.
Current milestone: M6 — measurement completeness and per-provider attribution (R-04, R-06)
Next action: define and implement the W13 run-receipt and aggregate
completeness contract with per-provider attribution and explicit NOT_CAPTURED
fields, add the required-metric regression, and update register entries R-04
and R-06 to PROVEN with receipts. Do not probe any provider before the Phase B
provider-resilience policy freeze is committed.
Authorization class: PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LAST_VALIDATED_IMPLEMENTATION_SHA: 68d834b9bf5befb7225332c2563aa261f4374794
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 68d834b9bf5befb7225332c2563aa261f4374794
LAST_DOCUMENTATION_CHECKPOINT_SHA: 34517c9ba11c97407168fe5879ee03794dfff3e3
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PROVIDER_RESILIENT_CURRENT_YIELD_W13_V1_STATUS: IN_PROGRESS

## Mission

Close every locally closable W12 measurement and governance residual, then
freeze and execute a provider-resilient current-source campaign against the
owner-authorized eight-repository universe under a predeclared deterministic
failover policy. Preserve W11 and W12 as frozen predecessor evidence, keep
provider failure distinct from zero yield, keep candidates distinct from
admissions, keep provider transitions deterministic and result-independent,
and finish with a truthful W13 verdict or an evidenced `PARTIAL — BLOCKED`
outcome.

## Read order

1. `.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-provider-resilient-current-yield-w13-v1/`
3. W11/W12 task and evidence records and the Production Completion Group 12
   predecessor record
4. `AGENTS.md`, durable safety/current-state/decision/roadmap documents, then
   live Git/workspace/session truth.

## Frozen predecessor boundary

W11's historical EXACT arm and hidden corpus, and W12's provider-blocked
scoped receipts and measured broad result, are read-only predecessor inputs.
W13 MUST NOT expose W11 or W12 hidden truth to the investigative reasoner,
re-run a predecessor arm, or alter a predecessor measured result.

## Routing and safety

```
CAMPAIGN: nightwatch-provider-resilient-current-yield-w13-v1
CHILD TASK: NONE
WAVE: W13
SESSION WORKTREE: session/nightwatch-provider-resilient-cu-623c6535

IMPLEMENTATION AUTHORIZED:
  this task directory, its OpenSpec change, the W12 archive/sync baseline,
  Phase A residual-closure fixes and their regressions/negative probes, the
  provider-resilience policy and W13 evaluation freeze, W13 measurement
  harnesses, the Group 12 successor ledger, parent autonomous-programme state,
  Nightwatch docs and governed README/current-state yield surfaces, and
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
SIBLING DEPENDENCY INSTALLATION:       NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
WEAKENING ADMISSION CRITERIA:          NOT AUTHORIZED
RAISING GATE TIMEOUT BOUNDS:           NOT AUTHORIZED
LEAKING HIDDEN GROUND TRUTH:           NOT AUTHORIZED
PROVIDER EGRESS VIA REASONER CLI:      AUTHORIZED, frozen candidate order only
SIBLING READ (all 8 admitted, r/o):    AUTHORIZED
CONTAINED LOCAL REPRODUCTION:          AUTHORIZED, already-admitted classes only
NOVELTY ADJUDICATION:                  AUTHORIZED, post-admission/read-only only
```

LOCAL / OWNER-LOCAL only. Provider network access is allowed ONLY through the
existing configured reasoner CLI path under the frozen provider-resilience
policy; that is not authorization for Nightwatch or product traffic to any
Alphaus environment. Sibling repositories are read only, with identity checked
before and after reproduction. Hidden historical ground truth must never reach
the reasoner; leakage aborts yield publication.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
