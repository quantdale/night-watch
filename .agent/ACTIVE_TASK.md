# Active Task

Task ID: nightwatch-control-center-style-and-absence-truth-v1
Phase: CONTROL_CENTER_STYLE_AND_ABSENCE_TRUTH_V1
Title: Control Center Style and Absence Truth
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-style-and-absence-truth-v1
Starting SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
Last validated implementation SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
Last checkpoint: M0 execution truth COMPLETE; the owned session
`nightwatch-control-center-style--5e5ddb63` is claimed as
`sess-d0b803f0afbe` on base
`d904dc96156f8376c772e6c43a75ce8cde3fad04`, `session:status` verdict PASS,
and the predecessor is verified terminal COMPLETE and untouched.
Current milestone: M1 — family assertions and the map divergence (A-01, A-04)
Next action: assert the `status-*` and `stage-*` concrete families in
`ui/control-center/src/styles.test.ts` with intentional base-only values
stated, confirm the map tone divergence in the built composition, and remove
the inert map tone classes and dead rules; record exact results in `STATE.md`.
Authorization class: CONTROL_CENTER_STYLE_AND_ABSENCE_TRUTH_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
LAST_VALIDATED_IMPLEMENTATION_SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONTROL_CENTER_STYLE_AND_ABSENCE_TRUTH_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. Measured at the starting SHA: the source stylesheet guard
excludes seven interpolation prefixes and asserts three concrete families;
`status-*` and `stage-*` are produced but unasserted; the system map's tone
classes cannot match their rules (13-value core vocabulary versus four styled
values); and the render harness never empties an array.

## Mission

Assert every produced family value or declare it base-only; prove runtime
computed effect for every class the composition renders; prove that emptying
every collection field changes the DOM; and remove the map's inert tone
classes and dead rules. LOCAL only; no server, contract, bound or authority
changes.

Read in this order:

1. `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/audit.md`
2. `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/EXECUTION_PROMPT.md`
4. `AGENTS.md`, `.agent/PLANS.md`, applicable instructions
5. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-render-truth-v1` is terminal COMPLETE and
  integrated at `d904dc9`. R-01 through R-04 are CLOSED; do not reopen them.
- `nightwatch-control-center-placement-coverage-v1` and
  `nightwatch-control-center-ui-completion-v1` are terminal COMPLETE.
- `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
  COMPLETE; its three `UNAVAILABLE_CAPABILITY` lanes and the
  `BLOCKED_EXTERNAL` external CI state are unchanged.
- The permanent owner scope freeze, L6 containment, immutable evidence and
  review store identities with their no-replace patterns.

## Routing and safety

```
CAMPAIGN: nightwatch-control-center-style-and-absence-truth-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-control-center-style--5e5ddb63

IMPLEMENTATION AUTHORIZED:
  ui/control-center source/tests/styles,
  tests/browser/controlCenterBrowser.browser.ts,
  config/validation-universe.v1.json UI_LANE registration,
  Nightwatch docs/OpenSpec/task state,
  the four registered findings A-01 through A-04,
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
REOPENING R-01..R-04 OR P-01..P-05:   NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.
The stale `nightwatch-repository-hardening--e7b9be89` session belongs to
another owner and is not touched by this campaign.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
