# SPEC — nightwatch-systemmap-browser-stability-v1

## Frozen intent

Stabilize `tests/browser/systemMapV2.browser.ts` (C-15c operator-journey
browser spec) against stale-UI races observed as intermittent failures
(~30–50% under serial `--repeat-each`): missing commit-specific gates let
keyboard navigation and query clicks run against a not-yet-committed
render. Test-only change; zero product-code modification.

## Diagnosis (frozen evidence)

- L4 traffic logs prove the server/adapter/projection path is correct in
  every run (`/l4?focus=op:op-0 => [consumer:e1,op:op-0]`); unit suites
  (`c15bSystemMap`, `c15cSystemMapTransport`) prove consumer projection.
- React-fiber probe of a failing run: trail `l4:op:op-0`, query null, L4
  data ready, search clear — but `selectedNodeId: "op:op-1"`. The step-241
  ArrowRight was processed against the pre-drill L3 member list
  (`at(op-0)=0 → next=op-1`), because the step-240 `map-authority`
  assertion passes on the STALE pre-drill view (authority text is identical
  across levels). Selection then points outside the L4 view and the
  consumer heading can never appear.
- Same defect class at step 6d: arrows run after a crumb-only gate (line
  208) without L2-member readiness (observed line-212 failure).
- Product behavior in the bad states is correct (empty detail for absent
  selection; wrap-around selection); the selection model is sound. No
  product change is warranted or made.

## Hard boundaries (frozen)

Test file only (`tests/browser/systemMapV2.browser.ts`): ADD assertions,
never remove or relax any; no `test.skip`, no timeout inflation as a fix,
no product-code change, no manifest/registry change, no force-push, no
history rewrite. C-00 worktree discipline throughout.

## Declared deletions

None. Additive-only (assertion insertions + comments).

## Acceptance (frozen)

- The two member-readiness gates are present and pinned by comment to the
  diagnosed race.
- `tests/browser/systemMapV2.browser.ts` passes 10/10 serial repeats plus
  the sibling browser spec in the same lane run.
- `tsc --noEmit`, `hardening:check`, `agent:check`, `project:check`,
  `handoff:check` green in the session worktree.
- Adjacent unit suites (`c15bSystemMap`, `c15cSystemMapTransport`) green
  (unchanged code, regression guard).
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.

## Amendment A1 — query-answer gate (M2 scope extension, frozen sections above unchanged)

Evidence gathered after the freeze (fixed-file repeat run): with 6e
stabilized, a later run failed at the step-7 `Mutation-capable routes`
click (`Element is not visible`) while the UI_CONTROL query answer was
still committing — the step-251 `map-authority` gate passes on the stale
L4 view for the same level-identical reason. Fix: gate the step-7 click
on the answer-specific node bound (`limit 1000` query ceiling replaces
the `limit 256` level ceiling), which flips atomically with the answer
commit. Steps 8/9 already carry answer-specific gates (bound text,
UNMEASURED banner) and need no change.

## Amendment A2 — painted-button gates at steps 7/9 (same class, click layer)

With the 6e gates holding (10-run batch: 6e green every run), one run
failed at the step-7 `Mutation-capable routes` force-click with
`Element is not visible` while the UI_CONTROL answer was committing:
force-clicks still need a laid-out box for coordinates, and the
commit swaps the node the click resolved. Fix: explicit `toBeVisible`
before the step-7 and step-9 Mutation-capable clicks. This encodes the
operator invariant (only a painted button is clickable) with the
unchanged default expect timeout — not a timeout inflation, not a
relaxation: a genuinely invisible button still fails loud.
