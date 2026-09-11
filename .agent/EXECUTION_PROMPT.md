# EXECUTION PROMPT — Control Center Style and Absence Truth

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-control-center-style-and-absence-truth-v1
OpenSpec: openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/
Planned-From: d904dc96156f8376c772e6c43a75ce8cde3fad04
Target Branch: main
Predecessor Task ID: nightwatch-control-center-render-truth-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

The render-truth campaign left three verification limits and recon found a
real divergence behind them. The stylesheet guard excludes seven
interpolation prefixes and asserts three concrete families, so `status-*` and
`stage-*` are unasserted. The built composition has no runtime proof that a
class applies beyond four selectors. The render harness never empties an
array, so an empty collection can look like a short one. And the system map
builds tone classes from a 13-value vocabulary that cannot match its four
stylesheet rules.

Assert the produced families and state base-only values; prove computed
effect for every class the composition renders; add an absence pass for every
array field; and remove the map's inert tone classes and dead rules.

This is a bounded, single-package campaign. It adds no route, authority or
data, and no pixel changes.

## Read first

1. `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/audit.md`
2. `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Re-establish truth before implementation

The audit's numbers are measurements, not permissions. Before changing
anything, determine independently: live `HEAD` and `origin/main`; all
worktrees, session claims and C-00 ownership; and whether each finding still
holds. Where live evidence contradicts the audit, the live evidence wins;
record the contradiction and its resolution.

## Ordered workstreams

1. **M0 — execution truth.** Owned session on the current base, workspace
   verdict PASS, predecessor re-verified terminal COMPLETE and untouched,
   planning route committed.
2. **M1 — A-01 and A-04.** Assert the `status-*` and `stage-*` concrete
   families with intentional base-only values stated; confirm the map tone
   divergence in the built composition; remove the inert interpolation and
   dead tone rules.
3. **M2 — A-02.** Browser-lane computed-effect check: toggle each class on
   its carrying element, compare computed styles, restore; a reasoned
   base-only list is asserted in both directions.
4. **M3 — A-03.** Generator records every array; the absence pass empties
   each one and requires the owning view's DOM to change, with a reasoned
   exemption list and a mutation proof.
5. **M4 — registration and validation.** UI_LANE registration if needed,
   digest refresh, UI typecheck/tests/build, root typecheck,
   `hardening:check`, `validation:universe`.
6. **M5 — certification.** `gate:local` and the full offline regression at
   the implementation checkpoint, docs reconciliation, fast-forward
   integration, session release.

## Constraints

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
REOPENING R-01..R-04:               NOT AUTHORIZED
```

LOCAL only. The UI gains no authority it lacked. No pixel changes: A-04
removes classes and rules that never applied. Owner-local findings, raw
evidence, source text, paths, credentials and traces stay outside the
boundary.

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

- Every produced family value is asserted or declared base-only with a
  reason; deleting a live family rule fails the guard.
- The runtime check proves computed effect for every rendered class, with a
  reasoned base-only list that fails in both directions.
- Emptying every array changes its view's DOM or is exempt with a reason; the
  pass is non-vacuous and mutation-proven.
- The map carries no impossible tone class and no tone rule for an impossible
  value remains.
- `gate:local` PASS from the owned session, task and project state reconciled
  to the checkpoint, integrated by fast-forward with `HEAD == origin/main`.

## Git and reporting

Commit the implementation checkpoint from the owned session, run `gate:local`
at that checkpoint, then reconcile `STATE.md`, `.agent/ACTIVE_TASK.md`, this
prompt and `docs/` to its result in a second checkpoint. Integrate by
fast-forward push to `origin main` from the session worktree and verify
`HEAD == origin/main`. A rejected push means stop and reconcile; never
force-push. Write `REPORT.md` at closure with residual work, owner decisions,
safety events and honest limits.
