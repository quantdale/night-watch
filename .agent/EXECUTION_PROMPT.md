# EXECUTION PROMPT — Control Center UI Completion

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-control-center-ui-completion-v1
OpenSpec: openspec/changes/nightwatch-control-center-ui-completion-v1/
Planned-From: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
Target Branch: main
Predecessor Task ID: nightwatch-residual-closure-and-lane-qualification-v1
Predecessor Status: COMPLETE

Task directory: `.agent/tasks/nightwatch-control-center-ui-completion-v1`
Live HEAD: discover from Git; never trust a stale SHA in prose.

## Mission

The Control Center has all nine of its views and shows a subset of what they
fetch. Nine snapshot contracts arrive in full and reach the screen in part;
the execution graph draws a twenty-fourth of what the server sends and labels
the result complete; and a toolbar shipped with correct markup, correct state
and no stylesheet rule, so its filter changes no pixel.

Complete the UI in the sense this repository means it: every field the client
fetches reaches the operator or is declared unrendered with a reason; no bound
the client imposes on itself is presented as the server's bound or as
completeness; and every class the UI renders has a rule.

This is a bounded, single-package campaign. It adds no route, no authority and
no data, and it needs no owner capability that is currently absent.

## Read first

1. `openspec/changes/nightwatch-control-center-ui-completion-v1/audit.md` —
   it holds the measured field-by-field and class-by-class baseline
2. `.agent/tasks/nightwatch-control-center-ui-completion-v1/{SPEC,PLAN,STATE}.md`
3. `.agent/ACTIVE_TASK.md`, `AGENTS.md`, `.agent/PLANS.md`
4. `docs/ARCHITECTURE.md` for the Control Center boundary, then live
   Git/workspace/session truth

## Re-establish truth before implementation

The audit's field and class lists are measurements, not permissions. Before
changing anything, determine independently: live `HEAD` and `origin/main`; all
worktrees, session claims and C-00 ownership; and whether each registered
finding still holds against the current source. Where live evidence
contradicts the audit, the live evidence wins; record the contradiction and
its resolution.

## Ordered workstreams

1. **M0 — execution truth.** Owned session on a current base, workspace
   verdict PASS, predecessor re-verified terminal COMPLETE and untouched.
2. **M1 — U-01.** Remove both client slices from `GraphCanvas`; share one
   deterministic layered layout with the source graph; add pan, zoom, search,
   an execution-state filter and selection; separate nodes drawn from filter
   matches and edges drawn from edges received; quote the server's bound; count
   and name undrawn edges.
3. **M2 — U-02, run surfaces.** Repository provenance, event censuses,
   screenshot count, browser, ended timestamp, hard-failure count, hard-failure
   and note codes, and timeline truncation.
4. **M3 — U-03.** List every safety check by name with state and reason code;
   name the refused operation classes; render the declared service authority
   and feature flags.
5. **M4 — U-04.** Render the readiness measurements behind the verdict, keeping
   deferred and never-measured dimensions separate.
6. **M5 — U-02, remaining surfaces.** Source binding, capabilities and
   exclusions; the proof-family portfolio and stage census; reviewer
   counterevidence, basis, shared invariant and non-equivalence; the map's
   projection version.
7. **M6 — U-05.** Add every missing rule. Remove dangling modifier classes
   rather than inventing styles for them.
8. **M7 — U-06.** Add the two coverage checks. Each asserts its own extraction
   is non-vacuous, carries a reasoned exempt list, states its own limit, and is
   verified to FAIL on a reintroduced defect. Register both in
   `config/validation-universe.v1.json` UI_LANE and refresh `inventoryDigest`.
9. **M8 — certification.** UI typecheck/tests/build, root typecheck,
   `hardening:check`, the browser workflow lane, then `gate:local` from the
   owned session. Commit, reconcile state and documentation, integrate.

## Constraints

```
CAMPAIGN: nightwatch-control-center-ui-completion-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-control-center-ui-com-9a04214f

IMPLEMENTATION AUTHORIZED:
  ui/control-center source/tests/styles,
  tests/browser/controlCenterBrowser.browser.ts,
  config/validation-universe.v1.json UI_LANE registration,
  Nightwatch docs/OpenSpec/task state,
  the six registered findings U-01 through U-06,
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
REOPENING R-01..R-07:               NOT AUTHORIZED
```

LOCAL only. The UI gains no authority it lacked. Every field newly rendered
was already sanitized and already sent by the server. Owner-local findings,
raw evidence, source text, paths, credentials, authenticated traces and
customer values stay outside the boundary.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.

## Validation

- `npm --prefix ui/control-center run typecheck`
- `npm --prefix ui/control-center run test`
- `npm --prefix ui/control-center run build`
- `npm run typecheck`
- `node bin/hardening-check.mjs`
- `npm run control-center:ui:browser`
- `npm run gate:local` from the owned session

## Acceptance and completion gates

- Reintroducing either slice in `GraphCanvas` fails `App.test.tsx`.
- Removing a rule for a rendered class fails `styles.test.ts`.
- Removing a rendered contract field, or leaving a stale exemption, fails
  `contractCoverage.test.ts`.
- An empty safety check set renders as absence of evidence; a populated one
  lists every check with its reason code.
- A truncated timeline page states that it is truncated.
- The browser lane proves the toolbar's rule applies in the built bundle.
- `gate:local` PASS from the owned session, with task and project state
  reconciled to that checkpoint.

## Git and reporting

Commit the implementation checkpoint from the owned session, run `gate:local`
at that checkpoint, then reconcile `STATE.md`, `.agent/ACTIVE_TASK.md`, this
prompt and `docs/` to its result in a second checkpoint. Integrate by
fast-forward push to `origin main` from the session worktree and verify
`HEAD == origin/main`. A rejected push means stop and reconcile; never
force-push.
