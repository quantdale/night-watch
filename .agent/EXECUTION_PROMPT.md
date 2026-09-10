# EXECUTION PROMPT — Control Center Render Truth

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-control-center-render-truth-v1
OpenSpec: openspec/changes/nightwatch-control-center-render-truth-v1/
Planned-From: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Target Branch: main
Predecessor Task ID: nightwatch-control-center-placement-coverage-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-control-center-render-truth-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

The placement guard proves a contract field name occurs inside a carrier
component; it does not prove the field's value reaches the rendered DOM. A
feasibility probe generated 213 Overview-family leaves from the declared
TypeScript contracts and found all 137 flipped leaves observable, in under
five seconds. Build that harness for every view; make view changes announce
themselves through focus and document title; and prove the interpolated style
classes apply in the built bundle.

This is a bounded, single-package campaign. It adds no route, authority or
data, and it needs no owner capability that is currently absent.

## Read first

1. `openspec/changes/nightwatch-control-center-render-truth-v1/audit.md` —
   it holds the measured baseline and the probe results
2. `.agent/tasks/nightwatch-control-center-render-truth-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Re-establish truth before implementation

The audit's numbers are measurements, not permissions. Before changing
anything, determine independently: live `HEAD` and `origin/main`; all
worktrees, session claims and C-00 ownership; and whether each registered
finding still holds against the current source. Where live evidence
contradicts the audit, the live evidence wins; record the contradiction and
its resolution.

## Ordered workstreams

1. **M0 — execution truth.** Owned session on the current base, workspace
   verdict PASS, predecessor re-verified terminal COMPLETE and untouched,
   planning route committed.
2. **M1 — harness core (R-01).** The TypeScript-AST fixture generator, the
   differential DOM runner, the reasoned exempt list, and the Overview/Safety
   family; measured non-vacuity and a mutation proof.
3. **M2 — list, graph, campaign and finding views (R-01).** Runs, run detail,
   timeline, execution graph, campaigns and findings, including selection
   flows; render or exempt every exposed field.
4. **M3 — reviewer, source and system map (R-01).** The remaining views; no
   non-exempt leaf unobservable.
5. **M4 — view-change announcement (R-02).** One navigation function owning
   hash, view, title and focus; initial load and SSE refresh leave focus
   alone.
6. **M5 — dynamic-class runtime proof (R-03).** Browser-lane computed styles
   for the interpolated families.
7. **M6 — registration and UI validation.** UI_LANE registration and digest,
   UI typecheck/tests/build, root typecheck, `hardening:check`,
   `validation:universe`.
8. **M7 — certification.** `gate:local` from the owned session, full offline
   regression, state and docs reconciled, fast-forward integration, session
   released.

## Constraints

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
  commits and local certification from the owned session.

REAL PRODUCTION CONTACT:            NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY: NOT AUTHORIZED
SERVER-SIDE BOUND OR SANITIZER CHANGE: NOT AUTHORIZED
NEXT / DEV EXECUTION:               NOT AUTHORIZED
NETWORK EGRESS:                     NOT AUTHORIZED
SLACK / LESLIE / PONDR / NOTION:    NOT AUTHORIZED
EXTERNAL FILING:                    NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:           NOT AUTHORIZED
SIBLING WRITES:                     NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:       NOT AUTHORIZED
REOPENING P-01..P-05:               NOT AUTHORIZED
```

LOCAL only. The UI gains no authority it lacked. Owner-local findings, raw
evidence, source text, paths, credentials, authenticated traces and customer
values stay outside the boundary.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.

## Validation

- `npm --prefix ui/control-center run typecheck`
- `npm --prefix ui/control-center run test`
- `npm --prefix ui/control-center run build`
- `npm run typecheck`
- `node bin/hardening-check.mjs`
- `npm run validation:universe`
- `npm run control-center:ui:browser`
- `npm test` (full offline regression at certification)
- `npm run gate:local` from the owned session

## Acceptance and completion gates

- The harness renders every view with generated fixtures and proves every
  non-exempt contract leaf observably affects the DOM; the exempt list is
  reasoned, staleness-checked, and small relative to the field population.
- Removing a rendered field's DOM effect fails the harness; restoring it
  passes.
- `document.title` names the current view and user navigation focuses the
  main content region, while initial load and background refresh do not move
  focus.
- The browser lane proves representative dynamic classes apply in the built
  bundle.
- `gate:local` PASS from the owned session, with task and project state
  reconciled to that checkpoint and the checkpoint integrated by fast-forward
  with `HEAD == origin/main` verified.

## Git and reporting

Commit the implementation checkpoint from the owned session, run `gate:local`
at that checkpoint, then reconcile `STATE.md`, `.agent/ACTIVE_TASK.md`, this
prompt and `docs/` to its result in a second checkpoint. Integrate by
fast-forward push to `origin main` from the session worktree and verify
`HEAD == origin/main`. A rejected push means stop and reconcile; never
force-push. Write `REPORT.md` at closure with residual work, owner decisions,
safety events and honest limits.
