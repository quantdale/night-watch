# EXECUTION PROMPT — Control Center Placement Coverage

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-control-center-placement-coverage-v1
OpenSpec: openspec/changes/nightwatch-control-center-placement-coverage-v1/
Planned-From: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Target Branch: main
Predecessor Task ID: nightwatch-control-center-ui-completion-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-control-center-placement-coverage-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

The predecessor's contract guard proves a field name reaches `App.tsx`, not
that it reaches a view that owns the data. `RunListItemSnapshot.passed` passes
only because an unrelated Safety Center sentence contains the word. Measured
with a carrier model at the starting SHA: 16 fields are fetched and rendered
in no carrier of their contract, while 5 fields are deliberately unrendered.

Make the guard prove placement; close every gap it exposes; render the paged
lists' server truncation; give the source graph the execution graph's
undrawn-edge disclosure; export and test the placeholder fail-safe; and quote
the declared graph limits instead of a hardcoded default.

This is a bounded, single-package campaign. It adds no route, no authority and
no data, and it needs no owner capability that is currently absent.

## Read first

1. `openspec/changes/nightwatch-control-center-placement-coverage-v1/audit.md`
   — it holds the measured field-by-field baseline
2. `.agent/tasks/nightwatch-control-center-placement-coverage-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Re-establish truth before implementation

The audit's counts are measurements, not permissions. Before changing
anything, determine independently: live `HEAD` and `origin/main`; all
worktrees, session claims and C-00 ownership; and whether each registered
finding still holds against the current source. Where live evidence
contradicts the audit, the live evidence wins; record the contradiction and
its resolution.

## Ordered workstreams

1. **M0 — execution truth.** Owned session on a current base, workspace
   verdict PASS, predecessor re-verified terminal COMPLETE and untouched,
   planning route committed.
2. **M1 — P-01, the placement guard.** Replace the name-level assertion in
   `contractCoverage.test.ts` with the carrier model: component bodies plus
   generic consumers bound at the call site, closed transitively over
   containment; a reasoned, staleness-checked exempt list; measured
   anti-vacuity; and a mutation proof that removing a rendered field's carrier
   occurrence fails the guard.
3. **M2 — the exposed fields.** Render or exempt all 16 measured gaps:
   service identity, declared execution/mutation authority, owner-scope status
   and declared limits in the Safety Center; readiness owner-scope status;
   execution-graph edge proof in an edge inventory; campaign owner scope and
   coverage gap reasons; source-surface repository; and the paged truncation
   fields through M3. Exempt `passed` and `layer` with reasons.
4. **M3 — P-02, paged truncation.** `PagedSnapshot` and `PagedCollection`
   carry `truncated`; `usePagedCollection` reads `page.truncated`;
   `LoadMoreControl` states the server truncation independently of the cursor.
5. **M4 — P-03, source-graph parity.** Count endpoint-less edges, separate the
   footer's drawn/received counts, and disclose the remainder as a projection
   fact.
6. **M5 — P-04 and P-05.** Export and test `PlaceholderView`; quote the
   declared `maxGraphNodes` / `maxGraphEdges` in the limits card.
7. **M6 — certification.** UI typecheck/tests/build, root typecheck,
   `hardening:check`, `validation:universe`, the browser workflow lane, then
   `gate:local` from the owned session. Reconcile state and documentation,
   integrate by fast-forward, release the session.

## Constraints

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
REOPENING U-01..U-06:               NOT AUTHORIZED
```

LOCAL only. The UI gains no authority it lacked. Every field newly rendered
was already sanitized and already sent. Owner-local findings, raw evidence,
source text, paths, credentials, authenticated traces and customer values
stay outside the boundary.

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
- `npm run gate:local` from the owned session

## Acceptance and completion gates

- The placement guard passes on the repaired source with five reasoned
  exemptions, measures its own extraction, and fails when a rendered field's
  carrier occurrence is removed.
- A page whose `page.truncated` is true renders the server-truncation
  statement, and the hook reads the declared flag rather than inferring it.
- A source graph with an endpoint-less edge separates drawn from received and
  attributes the remainder to the projection.
- `PlaceholderView` renders its declared fallback under test; the limits card
  quotes the declared maximums.
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
