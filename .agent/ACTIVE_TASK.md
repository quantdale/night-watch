# Active Task

Task ID: nightwatch-control-center-placement-coverage-v1
Phase: CONTROL_CENTER_PLACEMENT_COVERAGE_V1
Title: Control Center Placement Coverage
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-control-center-placement-coverage-v1
Starting SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Last validated implementation SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Last checkpoint: M0 execution truth COMPLETE; the owned session
`nightwatch-control-center-placem-f8abc223` is claimed as
`sess-36f4ca096045` on base
`ceb8fe21f9dd90666190c9272030a0dbfabc458f`, `session:status` verdict PASS,
and the predecessor is verified terminal COMPLETE and untouched.
Current milestone: M1 — the placement guard (P-01)
Next action: implement the carrier model in
`ui/control-center/src/contractCoverage.test.ts`, run
`npm --prefix ui/control-center run test -- contractCoverage`, and record the
measured failing set in `STATE.md` before repairing any field.
Authorization class: CONTROL_CENTER_PLACEMENT_COVERAGE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LAST_VALIDATED_IMPLEMENTATION_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_CONTROL_CENTER_PLACEMENT_COVERAGE_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The measured starting state: the contract guard is
name-level over `App.tsx`; 16 fields are fetched but rendered in no carrier of
their contract; 5 fields are deliberately unrendered; the five paged lists
never render `page.truncated`; the source graph drops endpoint-less edges
silently; `PlaceholderView` is untested; and a graph-limits card states the
server's defaults as its maximum.

## Mission

Make the contract guard prove placement; close the 16 gaps it exposes; render
the server's paged truncation; give the source graph the execution graph's
undrawn-edge disclosure; export and test the placeholder fail-safe; and quote
the declared graph limits. LOCAL only; no server, contract, bound or authority
changes.

Read in this order:

1. `openspec/changes/nightwatch-control-center-placement-coverage-v1/audit.md`
2. `.agent/tasks/nightwatch-control-center-placement-coverage-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/EXECUTION_PROMPT.md`
4. `AGENTS.md`, `.agent/PLANS.md`, applicable instructions
5. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-ui-completion-v1` is terminal COMPLETE and
  integrated at `ceb8fe2`. U-01 through U-06 are CLOSED; do not reopen them.
- `nightwatch-residual-closure-and-lane-qualification-v1` is terminal
  COMPLETE; R-01 through R-07 are CLOSED; its three `UNAVAILABLE_CAPABILITY`
  lanes and the `BLOCKED_EXTERNAL` external CI state are unchanged.
- The permanent owner scope freeze, L6 containment, immutable evidence and
  review store identities with their no-replace patterns.
- Every change is additive rendering, coverage or test surface. No contract,
  route, adapter, bound or sanitizer is touched, and artifacts written by
  earlier schemas keep reading.

## Routing and safety

```
CAMPAIGN: nightwatch-control-center-placement-coverage-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-control-center-placem-f8abc223

IMPLEMENTATION AUTHORIZED:
  ui/control-center source/tests/styles,
  tests/browser/controlCenterBrowser.browser.ts,
  config/validation-universe.v1.json UI_LANE registration,
  Nightwatch docs/OpenSpec/task state,
  the five registered findings P-01 through P-05,
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
REOPENING U-01..U-06 OR R-01..R-07:   NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.
The stale `nightwatch-repository-hardening--e7b9be89` session belongs to
another owner and is not touched by this campaign.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
