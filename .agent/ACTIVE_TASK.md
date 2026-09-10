# Active Task

Task ID: nightwatch-control-center-render-truth-v1
Phase: CONTROL_CENTER_RENDER_TRUTH_V1
Title: Control Center Render Truth
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-render-truth-v1
Starting SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Last validated implementation SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Last checkpoint: M1 harness core COMPLETE — the differential render harness
exists and passes for the Overview/Safety family; it exposed and four unbound
constant fields were rendered, two single-value constants exempted, and the
mutation proof passed. The owned session
`nightwatch-control-center-render-287b0e00` is claimed as
`sess-390d800d5900` on base
`f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`, `session:status` verdict PASS,
and the predecessor is verified terminal COMPLETE and untouched.
Current milestone: M2 — list, graph, campaign and finding views (R-01)
Next action: extend the harness in
`ui/control-center/src/contractRender.test.tsx` to runs (list, detail,
timeline), the execution graph, campaigns and findings, render or exempt every
field it exposes, and record the exact results in `STATE.md`.
Authorization class: CONTROL_CENTER_RENDER_TRUTH_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LAST_VALIDATED_IMPLEMENTATION_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONTROL_CENTER_RENDER_TRUTH_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. Measured at the starting SHA: the full regression is
4789/18/0; the placement guard passes with five reasoned exemptions; the UI
renders every field it fetches in a carrier component, but no check proves any
field's value reaches the DOM; navigation moves no focus and sets no document
title; and the browser lane computes a style for exactly one class.

## Mission

Prove the Control Center's rendered DOM is the contract it claims: a
differential render harness over generated fixtures, view-change
announcement for keyboard and assistive-technology operators, and runtime
application proofs for the interpolated style classes. LOCAL only; no server,
contract, bound or authority changes.

Read in this order:

1. `openspec/changes/nightwatch-control-center-render-truth-v1/audit.md`
2. `.agent/tasks/nightwatch-control-center-render-truth-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/EXECUTION_PROMPT.md`
4. `AGENTS.md`, `.agent/PLANS.md`, applicable instructions
5. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-placement-coverage-v1` is terminal COMPLETE and
  integrated at `f0180d1`. P-01 through P-05 are CLOSED; do not reopen them.
- `nightwatch-control-center-ui-completion-v1` is terminal COMPLETE; U-01
  through U-06 are CLOSED.
- `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
  COMPLETE; its three `UNAVAILABLE_CAPABILITY` lanes and the
  `BLOCKED_EXTERNAL` external CI state are unchanged.
- The permanent owner scope freeze, L6 containment, immutable evidence and
  review store identities with their no-replace patterns.
- Every change is additive rendering, coverage or test surface. No contract,
  route, adapter, bound or sanitizer is touched, and artifacts written by
  earlier schemas keep reading.

## Routing and safety

```
CAMPAIGN: nightwatch-control-center-render-truth-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-control-center-render-287b0e00

IMPLEMENTATION AUTHORIZED:
  ui/control-center source/tests/styles,
  tests/browser/controlCenterBrowser.browser.ts,
  config/validation-universe.v1.json UI_LANE registration,
  Nightwatch docs/OpenSpec/task state,
  the four registered findings R-01 through R-04,
  commits/pushes/integration and local certification from the owned session.

REAL PRODUCTION CONTACT:              NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:  NOT AUTHORIZED
SERVER BOUND OR SANITIZER CHANGE:     NOT AUTHORIZED
NEXT / DEV EXECUTION:                 NOT AUTHORIZED
NETWORK EGRESS / ADVISORY SCAN:       NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:      NOT AUTHORIZED
EXTERNAL FILING:                      NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:             NOT AUTHORIZED
SIBLING WRITES:                       NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:         NOT AUTHORIZED
REOPENING P-01..P-05 OR U-01..U-06:   NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.
The stale `nightwatch-repository-hardening--e7b9be89` session belongs to
another owner and is not touched by this campaign.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
