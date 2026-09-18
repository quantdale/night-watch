# Active Task

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Title: Nightwatch production completion programme
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-completion-programme-v1
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
Last checkpoint: G16.9/G16.10/G16.11 hardening rule-engine decomposition.
`bin/hardening-check.mjs` goes from 6045 lines to 85 of orchestration over
`bin/lib/hardening/` — 83 rules in 11 invariant-family modules, a
mechanically authoritative registry, and the mutation campaign as its own
module. Behaviour preservation is measured against `9fc763b3`, not asserted:
`--list-rules`, the plain run and the documentation-currency report are
byte-identical and every exit code matches; the base and decomposed
`gate:local` receipts agree on group status, counts and failed locations under
one `gateDefinitionDigest`. Probe campaign 83 rules / 90 probes / 90 detected,
`statusUnchanged=true`. The preceding G6.10/G6.11 consolidation remains
integrated at `f3a31ed9`.
Current milestone: G16.9/G16.10/G16.11 hardening rule-engine decomposition
Next action: G16.12 is BLOCKED on pre-existing sibling `ripple-api` source
drift proven at base `9fc763b3` and needing an owner re-admission; continue
the remaining owner-gated programme groups (G16.5, G8, G9, G12, G18, G19,
G21) under their own authorizations.
Owner decisions stay OPEN; none is self-authorized.
Authorization class: PRODUCTION_COMPLETION_PROGRAMME_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PRODUCTION_COMPLETION_PROGRAMME_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The programme executes the 21 task groups of
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`,
starting with ledger truth so that every later estimate is checkable. The
baseline, findings F-01 … F-21 and their measured evidence are in that
change's `audit.md`.

W1 is complete and integrated: the three sibling audit changes planned at
`ebe26ce` repair the truth surfaces the first wave left behind — the
continuity live-waypoint binding, the published-spec baseline integrity, and
the validation classification / skip-identity truth. Their ledgers are fully
ticked; the programme's own remaining boxes stay open until their owner gates
clear.

## Mission

Close every locally closable gap the programme names, with evidence; record
every owner or external dependency as a blocking class with a named owner
action and revisit condition; never weaken a gate to make a lane executable.
LOCAL only; sibling repositories remain read-only; the permanent owner scope
freeze, C-00, C-10, D-4 and the fail-closed egress policy are unchanged.

Read in this order:

1. `openspec/changes/nightwatch-production-completion-programme-v1/audit.md`
2. `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
3. `.agent/tasks/nightwatch-production-completion-programme-v1/{SPEC,PLAN,STATE}.md`
4. the three W1 changes' `proposal.md`, `design.md`, specs and `tasks.md`
5. `.agent/EXECUTION_PROMPT.md`
6. `AGENTS.md`, `.agent/PLANS.md`, `docs/CURRENT_STATE.md`,
   `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, then live
   Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-style-and-absence-truth-v1` is terminal COMPLETE
  and integrated at `36bd493`. A-01 through A-04 are CLOSED; do not reopen
  them.
- `nightwatch-control-center-render-truth-v1`,
  `nightwatch-control-center-placement-coverage-v1`,
  `nightwatch-control-center-ui-completion-v1` and
  `nightwatch-residual-closure-and-lane-qualification-v1` are terminal
  COMPLETE.
- `nightwatch-control-center-design-system-v1` and
  `nightwatch-production-observability-system-map-master-plan-v1` are parked
  IN_PROGRESS with named owner blockers by W1; they are not executed here.
- The permanent owner scope freeze, L6 containment, and immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-production-completion-programme-v1
CHILD TASK: NONE
WAVE: G16_RULE_ENGINE_DECOMPOSITION
SESSION WORKTREE: NONE

IMPLEMENTATION AUTHORIZED:
  G16.9/G16.10/G16.11 hardening rule-engine decomposition (the engine entry
  point, `bin/lib/hardening/**`, the rule probe registry, the validation
  universe registration and the rule parity suite), this task directory, the
  programme change ledger, Nightwatch docs/OpenSpec state, and
  commits/pushes/integration from one owned C-00 session worktree.

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:   NOT AUTHORIZED
NEXT / DEV EXECUTION:                  NOT AUTHORIZED except where a group's
                                       own owner decision explicitly grants it
NETWORK EGRESS / ADVISORY SCAN:        NOT AUTHORIZED except where G9's owner
                                       decision explicitly grants one query
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
EXTERNAL FILING:                       NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:              NOT AUTHORIZED
SIBLING WRITES:                        NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
REOPENING TERMINAL FINDINGS:           NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
