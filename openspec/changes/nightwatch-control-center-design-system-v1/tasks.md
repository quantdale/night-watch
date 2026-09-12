# Tasks — Control Center design system

Single-package campaign under C-00: one owned session worktree, one session
identity, `session:status` PASS before work, fast-forward integration, session
released. Authorized surface: `ui/control-center/**`,
`tests/browser/controlCenterBrowser.browser.ts`,
`config/validation-universe.v1.json` UI_LANE registration, and this change's
own OpenSpec and task state. No route, adapter, contract, bound, sanitizer,
authority or dependency changes.

**Precondition.** Group 19 of `nightwatch-production-completion-programme-v1`
(`App.tsx` decomposition) is integrated, or this change is explicitly
re-planned against the undecomposed file. Do not start while any Control Center
group is in flight.

## 1. Execution truth

- [ ] 1.1 Claim an owned session worktree on the current base; `session:status`
      verdict PASS; canonical checkout is not the implementation worktree
- [ ] 1.2 Re-verify the four predecessor Control Center campaigns terminal
      COMPLETE and untouched; A-01…A-04 and R-01…R-04 stay closed
- [ ] 1.3 Confirm Group 19's decomposition state and record which layout this
      change is implemented against
- [ ] 1.4 Re-measure every figure in `proposal.md` and this change's spec
      preamble at the live starting SHA; where live evidence contradicts the
      audit, record the contradiction and its resolution — the audit's numbers
      are measurements, not permissions
- [ ] 1.5 Commit the planning route and task SPEC/PLAN/STATE

## 2. Token block and integrity guard

- [ ] 2.1 Declare the complete token block: colour, typography, spacing,
      radius, elevation, motion — each step named, with its reason recorded
      alongside the declared 12px type floor
- [ ] 2.2 Resolve `--surface-muted`, `--ready` and `--warning` per design D1
      (default: rewrite the three call sites to `--surface-raised`, `--green`,
      `--accent` and add no aliases)
- [ ] 2.3 Add `--border-interactive` `#5d7286`; assert 3:1 against `--bg`,
      `--surface` and `--surface-raised` in the check, not in a comment
- [ ] 2.4 Write the token-integrity guard: every referenced custom property is
      defined; every `var()` fallback literal equals its token's defined value;
      non-zero reference count asserted before any other assertion
- [ ] 2.5 Remove the seven `var(--accent, #6ea8fe)` fallbacks and every other
      divergent fallback; one accent identity reachable
- [ ] 2.6 Negative-probe: delete a definition with a live reference → fails;
      set a fallback literal away from its token → fails; stub the extractor to
      return nothing → fails on the non-vacuity assertion
- [ ] 2.7 Verify `.review-action`, `.review-outcome-ok` and
      `.review-outcome-warn` now render token values, and record the measured
      contrast before and after

## 3. Literal-free stylesheet and scale usage

- [ ] 3.1 Write the literal guard over `font-size`, `line-height`, `padding`,
      `margin`, `gap`, `border-radius`, `box-shadow`, `color`, `background`,
      `border-color`, `fill`, `stroke`
- [ ] 3.2 Define the structural-literal exemption list (`0`, `1px` hairlines,
      `100%`, `9999px`, `transparent`, `currentColor`, viewport units,
      `clamp()` bounds), each entry with its reason; fails in both directions
- [ ] 3.3 Write the unused-token check: every declared scale step is referenced
      by at least one rule
- [ ] 3.4 Convert the stylesheet view by view until 3.1 and 3.3 pass — the
      ~25 hex and 47 `rgba()` literals outside the token block
- [ ] 3.5 Fold the C-15c System Map block into the system: `rem` → scale,
      `999px` → `--radius-pill`, `rgba(127,127,127,0.35)` → border tokens
- [ ] 3.6 Negative-probe: reintroduce a hex literal → fails; add an unreferenced
      token → fails; add an exemption for a tokenisable value → fails as stale

## 4. Type floor and the restyle it forces

- [ ] 4.1 Write the rendered type-floor guard in the browser lane: computed
      `font-size` for every text-bearing element across the qualification walk,
      compared against the floor read from the token block; non-zero measured
      count asserted
- [ ] 4.2 Apply the type scale, retiring the `7px`/`8px`/`9px`/`10px`/`11px`
      declarations into `--text-micro`/`--text-caption`/`--text-body`
- [ ] 4.3 Resolve the micro-label open question (default: uppercase + tracking)
      and apply it consistently
- [ ] 4.4 Rework the layouts the raised floor breaks — expect real work in
      Reviewer, Source Intelligence, Runs and System Map
- [ ] 4.5 Apply spacing, radius and elevation scales across all nine views so
      density comes from spacing rather than type size
- [ ] 4.6 Negative-probe: set one declaration below the floor → fails naming the
      element, size and view

## 5. Responsive truth

- [ ] 5.1 Decide the declared breakpoint set (default: 1440, 1080, 820, 560,
      380) and record it with the token block
- [ ] 5.2 Build the viewport matrix in the browser lane: every view at every
      declared breakpoint
- [ ] 5.3 Assert no horizontal scroll and no clipped or overlapped interactive
      control at any breakpoint
- [ ] 5.4 Build the media-query removal list — element, breakpoint, reason —
      including `.hero-orbit` and `.safety-seal` as `aria-hidden` decoration;
      fails in both directions
- [ ] 5.5 Fix the two posture removals: `.sidebar-footer` ("Local only ·
      External egress disabled") at ≤820px and `.read-only-tag` clamped to
      34px at ≤560px
- [ ] 5.6 Assert a read-only, loopback-only posture statement is visible at
      every declared breakpoint, matched by accessible text and not by class
- [ ] 5.7 Negative-probe: hide an unlisted element at a breakpoint → fails;
      remove every posture statement at one breakpoint → fails

## 6. Interactive boundary contrast

- [ ] 6.1 Enumerate controls whose boundary is their sole affordance from the
      rendered DOM; assert a non-zero count
- [ ] 6.2 Measure each boundary against its adjacent background; require 3:1
- [ ] 6.3 Build the alternative-affordance list (fill, label, or named icon)
      with each control's reason; fails in both directions
- [ ] 6.4 Measure focus indicators against the background they appear over, at
      every declared breakpoint
- [ ] 6.5 Negative-probe: revert one control's boundary to `--border` → fails
      naming the control, ratio and pair

## 7. Registration and validation

- [ ] 7.1 Register every new suite in `config/validation-universe.v1.json` and
      the UI lane manifest
- [ ] 7.2 Refresh `inventoryDigest`; `validation:universe` reports the raised
      `UI_LANE` count
- [ ] 7.3 `npm --prefix ui/control-center run typecheck`, `test`, `build` PASS
- [ ] 7.4 `npm run typecheck`, `node bin/hardening-check.mjs`,
      `npm run validation:universe` PASS
- [ ] 7.5 `npm run control-center:ui:browser` PASS including the new matrix
- [ ] 7.6 Confirm every pre-existing guard is green with no exemption list
      longer than before — render, absence, contract-coverage, class-effect,
      stylesheet coverage
- [ ] 7.7 Confirm Group 20's and Group 8's checks still pass if they have
      landed; if they have not, record which of their properties this change
      has already satisfied

## 8. Certification

- [ ] 8.1 `npm run gate:local` PASS from the owned session at the
      implementation checkpoint, with receipt recorded
- [ ] 8.2 Full offline regression `npm test` PASS at that checkpoint
- [ ] 8.3 `openspec validate nightwatch-control-center-design-system-v1
      --type change --strict` exits zero
- [ ] 8.4 Reconcile `STATE.md`, `.agent/ACTIVE_TASK.md`, `EXECUTION_PROMPT.md`
      and `docs/` to the receipt in a second checkpoint
- [ ] 8.5 Integrate by fast-forward push to `origin main`; verify
      `HEAD == origin/main`; a rejected push means stop and reconcile, never
      force-push
- [ ] 8.6 Write `REPORT.md`: residual work, owner decisions taken by default,
      safety events, and honest limits — including that this change proves the
      system is applied and does not prove the result is well designed
- [ ] 8.7 Release the session; canonical tree clean
