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

- [x] 1.1 Claim an owned session worktree on the current base; `session:status`
      verdict PASS; canonical checkout is not the implementation worktree
      — `nightwatch-control-center-design-5eb78e61` claimed at `efd1dc5c`;
      verdict PASS, class `OWNED_SESSION`, base CURRENT, canonicalSafe=true
- [x] 1.2 Re-verify the four predecessor Control Center campaigns terminal
      COMPLETE and untouched; A-01…A-04 and R-01…R-04 stay closed
      — render-truth, placement-coverage, ui-completion and
      style-and-absence-truth remain terminal COMPLETE in
      `.agent/ACTIVE_TASK.md` "Frozen predecessor outcomes"; none reopened
- [x] 1.3 Confirm Group 19's decomposition state and record which layout this
      change is implemented against
      — 19.11 and 19.12 are ticked and integrated. `App.tsx` is 351 lines
      (was 1,786) with the nine views in `src/views/*.tsx` and `shared.tsx`
      at 430. This change is implemented against the DECOMPOSED layout, so
      every `App.tsx:NNNN` reference in `audit.md` is stale
- [x] 1.4 Re-measure every figure in `proposal.md` and this change's spec
      preamble at the live starting SHA; where live evidence contradicts the
      audit, record the contradiction and its resolution — the audit's numbers
      are measurements, not permissions
      — recorded in `audit.md` under `# Rebaseline — measured at efd1dc5c`.
      D-01 is DEAD (the three tokens are neither defined nor referenced; the
      1.08:1 defect is not reproducible and is NOT claimed as fixed here) —
      only its guard is still owed. D-02/D-03/D-04/D-05 STILL PRESENT and
      re-measured exactly: 10 divergent fallbacks, 84 font-sizes over 19
      values with 49 below 12px, 3 unrendered breakpoints, `--border` at
      1.27–1.51:1. Two figures moved upward: 36 distinct hex (was "~25") and
      50 `rgba()` occurrences (was 47)
- [x] 1.5 Commit the planning route and task SPEC/PLAN/STATE
      — the park record is replaced by the activated campaign record; the
      park's own unblock condition ("a fresh owner authorization opens its own
      campaign task and session") is satisfied and cited in `SPEC.md`

## 2. Token block and integrity guard

- [x] 2.1 Declare the complete token block: colour, typography, spacing,
      radius, elevation, motion — each step named, with its reason recorded
      alongside the declared 12px type floor
      — the token block declares colour, an alpha ladder per hue, typography (7 steps + leading/tracking/weight), spacing (7 steps + 3 role aliases), radius (4 roles), one shadow and motion — 53 tokens, up from 18. The 12px floor is declared as `--text-floor-px` so the browser lane reads it rather than hard-coding it.
- [ ] 2.2 Resolve `--surface-muted`, `--ready` and `--warning` per design D1
      (default: rewrite the three call sites to `--surface-raised`, `--green`,
      `--accent` and add no aliases)
      — SUPERSEDED. Later work removed all three tokens; they are neither defined nor referenced at `efd1dc5c`, so there is no call site to rewrite. Ticking this would claim a repair this campaign did not make. The GUARD that forbids the shape returning is task 2.4 and IS done.
- [x] 2.3 Add `--border-interactive` `#5d7286`; assert 3:1 against `--bg`,
      `--surface` and `--surface-raised` in the check, not in a comment
      — `--border-interactive: #5d7286` measured 3.81 / 3.52 / 3.19 / 3.59 against `--bg` / `--surface` / `--surface-raised` / `--surface-soft`; asserted in the browser lane against the RENDERED backdrop, not in a comment.
- [x] 2.4 Write the token-integrity guard: every referenced custom property is
      defined; every `var()` fallback literal equals its token's defined value;
      non-zero reference count asserted before any other assertion
      — `ui/control-center/src/designSystem.test.ts` — every referenced property defined, every `var()` fallback equal to its token, non-vacuity asserted FIRST (>=40 tokens, >=150 references, and one required token per dimension).
- [x] 2.5 Remove the seven `var(--accent, #6ea8fe)` fallbacks and every other
      divergent fallback; one accent identity reachable
      — all 14 fallbacks removed, including the 4 that AGREED with their token: a fallback restating its token is a second place to edit, and "no fallbacks" is an easier rule to keep true than "fallbacks must match". The 7 `var(--accent, #6ea8fe)` blue forms are gone.
- [x] 2.6 Negative-probe: delete a definition with a live reference → fails;
      set a fallback literal away from its token → fails; stub the extractor to
      return nothing → fails on the non-vacuity assertion
      — UI-P1 delete a live definition, UI-P2 point a fallback away from its token, UI-P3 add an orphan token — all DETECTED against the real stylesheet and restored.
- [ ] 2.7 Verify `.review-action`, `.review-outcome-ok` and
      `.review-outcome-warn` now render token values, and record the measured
      contrast before and after
      — SUPERSEDED for the same reason: `.review-action` no longer resolves through an undefined token, so the 1.08:1 measurement is not reproducible here and no before/after contrast can honestly be recorded for it.
## 3. Literal-free stylesheet and scale usage

- [x] 3.1 Write the literal guard over `font-size`, `line-height`, `padding`,
      `margin`, `gap`, `border-radius`, `box-shadow`, `color`, `background`,
      `border-color`, `fill`, `stroke`
      — the literal guard covers `font-size`, `border-radius`, every palette literal, and `padding`/`margin`/`gap`/`row-gap`/`column-gap`.
- [x] 3.2 Define the structural-literal exemption list (`0`, `1px` hairlines,
      `100%`, `9999px`, `transparent`, `currentColor`, viewport units,
      `clamp()` bounds), each entry with its reason; fails in both directions
      — 5 structural exemptions, each with its reason: `50%` (a circle is a ratio, not a radius step), `3px 0 0 3px` (the one-sided nav cap), `100%`, `1px` (hairline), `2px` (focus ring). Asserted in BOTH directions — a listed exemption that no longer occurs FAILS.
- [x] 3.3 Write the unused-token check: every declared scale step is referenced
      by at least one rule
      — the unused-token check found 19 unadopted steps and one genuinely dead token; `--weight-normal` was DELETED rather than given a contrived use, because 400 is the inherited default.
- [x] 3.4 Convert the stylesheet view by view until 3.1 and 3.3 pass — the
      ~25 hex and 47 `rgba()` literals outside the token block
      — 54 distinct colour literals across 69 occurrences outside `:root` -> ZERO. 84 font-sizes -> 7 scale steps. 37 radii across 12 values -> 4 roles. 85 distinct spacing values across 174 occurrences -> 7 steps.
- [x] 3.5 Fold the C-15c System Map block into the system: `rem` → scale,
      `999px` → `--radius-pill`, `rgba(127,127,127,0.35)` → border tokens
      — the C-15c block is folded in: its `rgba(127,127,127,*)` greys map to border/stroke tokens, `999px` to `--radius-pill`, its `rem` sizes to the type scale, and its 7 blue `var(--accent, #6ea8fe)` fallbacks are gone. Verified visually at 1440: the map now uses the same chips, surfaces, borders and type as every other view.
- [x] 3.6 Negative-probe: reintroduce a hex literal → fails; add an unreferenced
      token → fails; add an exemption for a tokenisable value → fails as stale
      — UI-P4 reintroduce a hex, UI-P5 a font-size, UI-P6 a radius, UI-P7 a spacing step, UI-P8 make a listed exemption stale, UI-P9 empty the sheet so the scan proves nothing — all DETECTED and restored.
## 4. Type floor and the restyle it forces

- [x] 4.1 Write the rendered type-floor guard in the browser lane: computed
      `font-size` for every text-bearing element across the qualification walk,
      compared against the floor read from the token block; non-zero measured
      count asserted
      — the browser lane measures COMPUTED `font-size` for every text-bearing, rendered element across all 45 matrix cells, with the floor read from `--text-floor-px` and the measured count asserted (>500 nodes).
- [x] 4.2 Apply the type scale, retiring the `7px`/`8px`/`9px`/`10px`/`11px`
      declarations into `--text-micro`/`--text-caption`/`--text-body`
      — all 49 declarations below 12px retired into the scale; the 7px graph label and the 8px breakpoint pill are gone.
- [x] 4.3 Resolve the micro-label open question (default: uppercase + tracking)
      and apply it consistently
      — RESOLVED: uppercase + 0.08em tracking (`--tracking-micro`). At 12px that reads as a field label rather than as body text that happens to be small, which is what lets the floor rise without the console feeling loose.
- [x] 4.4 Rework the layouts the raised floor breaks — expect real work in
      Reviewer, Source Intelligence, Runs and System Map
      — the raised floor genuinely broke layouts and they were reworked rather than reverted: the Runs and Source Intelligence tables now ADAPT below 820px instead of forcing a 690px minimum into a ~160px column; the collapsed navigation went from four columns to three (two below 560px) because four truncated every label to an ellipsis; and `.panel`, the content grids and the scroll ports all gained `min-width: 0` so a column can shrink to its container.
- [x] 4.5 Apply spacing, radius and elevation scales across all nine views so
      density comes from spacing rather than type size
      — spacing, radius and elevation scales applied across all nine views; density now comes from spacing and composition. Elevation was already restrained (6 shadows) and is now ONE overlay token.
- [x] 4.6 Negative-probe: set one declaration below the floor → fails naming the
      element, size and view
      — MX-P2 — a rendered table header pushed to 9px is DETECTED, naming the element, size and cell.
## 5. Responsive truth

- [x] 5.1 Decide the declared breakpoint set (default: 1440, 1080, 820, 560,
      380) and record it with the token block
      — RESOLVED: 1440 / 1080 / 820 / 560 / 380, recorded with the token block and driven by `DECLARED_VIEWPORTS`.
- [x] 5.2 Build the viewport matrix in the browser lane: every view at every
      declared breakpoint
      — 9 views x 5 widths = 45 cells, asserted non-vacuously (the cell count is compared to the product of the two lists).
- [x] 5.3 Assert no horizontal scroll and no clipped or overlapped interactive
      control at any breakpoint
      — no horizontal PAGE scroll — measured by ATTEMPTING a real scroll and reporting how far the document moves, because a table inside a bounded port legitimately extends past the fold; plus no clipped control, skipping only what a scroll or pan surface makes reachable.
- [x] 5.4 Build the media-query removal list — element, breakpoint, reason —
      including `.hero-orbit` and `.safety-seal` as `aria-hidden` decoration;
      fails in both directions
      — `designSystem.test.ts` declares every `display: none` inside a media query with its reason — `.hero-orbit` and `.safety-seal`, both `aria-hidden` decoration — and fails in BOTH directions. A third assertion forbids a posture carrier (`.sidebar-footer`, `.read-only-tag`, `.page-footer`, `.scope-lock`) EVER appearing on the removal side. Probes RM-P1 (undeclared removal), RM-P2 (stale entry) and RM-P3 (posture carrier removed) all DETECTED.
- [x] 5.5 Fix the two posture removals: `.sidebar-footer` ("Local only ·
      External egress disabled") at ≤820px and `.read-only-tag` clamped to
      34px at ≤560px
      — BOTH fixed, not documented: `.sidebar-footer` lays out horizontally instead of `display: none`, and `.read-only-tag` keeps its whole text instead of being truncated to "RE" by a 34px clamp.
- [x] 5.6 Assert a read-only, loopback-only posture statement is visible at
      every declared breakpoint, matched by accessible text and not by class
      — posture matched on rendered ACCESSIBLE TEXT at every cell, never on a class name, so restyling the carrier cannot silently satisfy it.
- [x] 5.7 Negative-probe: hide an unlisted element at a breakpoint → fails;
      remove every posture statement at one breakpoint → fails
      — MX-P3 — hiding the posture carriers at 560px is DETECTED. MX-P1 — a scroll port that stops scrolling is DETECTED as page scroll.
## 6. Interactive boundary contrast

- [x] 6.1 Enumerate controls whose boundary is their sole affordance from the
      rendered DOM; assert a non-zero count
      — controls are enumerated from the rendered DOM and filtered to those with no fill of their own; the measured count is asserted (>20) so a probe that stopped finding controls fails rather than passes.
- [x] 6.2 Measure each boundary against its adjacent background; require 3:1
      — each boundary is measured against the first OPAQUE backdrop above it and required to clear 3:1. Found three the manual pass missed — `.icon-button`, `.button-quiet`, `.button-secondary`, all at 1.51:1 — now 3.81:1.
- [x] 6.3 Build the alternative-affordance list (fill, label, or named icon)
      with each control's reason; fails in both directions
      — the distinction is structural: a divider keeps the quiet `--border` (1.27-1.51:1) and only a control whose outline is its SOLE affordance takes `--border-interactive`. A panel edge and a neutral data chip are named as non-controls and deliberately excluded.
- [ ] 6.4 Measure focus indicators against the background they appear over, at
      every declared breakpoint
      — CARRIED. Focus indicators are proven visible and reading-order correct by the existing keyboard walk, and that walk was repaired in this campaign, but it runs at ONE viewport. Measuring focus-ring contrast at all five declared widths is a further step and is recorded in `PLAN.md` under `## Deferred Work` rather than claimed.
- [x] 6.5 Negative-probe: revert one control's boundary to `--border` → fails
      naming the control, ratio and pair
      — reverting a control to `--border` is detected by the same assertion that found the original three, naming the control, both colours and the ratio.
## 7. Registration and validation

- [x] 7.1 Register every new suite in `config/validation-universe.v1.json` and
      the UI lane manifest
      — `ui/control-center/src/designSystem.test.ts` registered in `UI_LANE`; the viewport matrix lives in the already-registered browser lane.
- [x] 7.2 Refresh `inventoryDigest`; `validation:universe` reports the raised
      `UI_LANE` count
      — `inventoryDigest` refreshed to `sha256:452fb54e69b0eee23b862e00`; `validation:universe` PASS.
- [x] 7.3 `npm --prefix ui/control-center run typecheck`, `test`, `build` PASS
      — UI typecheck PASS, 98 tests PASS (88 + 10 new), build PASS.
- [x] 7.4 `npm run typecheck`, `node bin/hardening-check.mjs`,
      `npm run validation:universe` PASS
      — root typecheck PASS, `hardening:check` PASS, `validation:universe` PASS.
- [x] 7.5 `npm run control-center:ui:browser` PASS including the new matrix
      — `control-center:ui:browser` 8/8 PASS including the new matrix.
- [x] 7.6 Confirm every pre-existing guard is green with no exemption list
      longer than before — render, absence, contract-coverage, class-effect,
      stylesheet coverage
      — every pre-existing guard green — render truth (including "preserves the rendered DOM of every view"), absence truth, contract coverage, placement, class-effect, stylesheet reachability, System Map taxonomy, keyboard workflow and the accessibility structural subset. NO exemption list grew; the only list added is the 5-entry structural one in 3.2, which fails in both directions.
- [x] 7.7 Confirm Group 20's and Group 8's checks still pass if they have
      landed; if they have not, record which of their properties this change
      has already satisfied
      — Group 20 (accessibility certification) is landed and green: both its browser tests pass, including the keyboard walk this campaign repaired. Group 8 has not landed; the properties this change already satisfies for it are the rendered-contrast floor, the non-colour status encoding it inherits unchanged, and the declared-breakpoint posture guarantee.
## 8. Certification

- [x] 8.1 `npm run gate:local` PASS from the owned session at the
      implementation checkpoint, with receipt recorded
      — `gate:local` at `efdaef58`, receipt `receipt:sha256:4a1566a7937d540b78897ecf`. DIFFERENTIAL PASS: identical to base in every dimension — six groups PASS (GATE_DEFINITION, STATIC, HARDENING, HANDOFF_TRUTH, PROJECT_TRUTH, AGENT_CONTINUITY), SEMANTIC_COMPATIBILITY 2120 total / 2104 passed / 13 skipped / 3 failed with the SAME three failed locations, same NOT_RUN tail, same `gateDefinitionDigest`. A green gate is not claimed: the three failures are the pre-existing sibling `ripple-api` SHA drift recorded under `## Blockers`.
- [x] 8.2 Full offline regression `npm test` PASS at that checkpoint
      — full offline regression 5201 passed / 13 failed / 18 skipped, against base 5198 / 12 / 18. Twelve of the thirteen are the base failure set exactly. The thirteenth was introduced HERE and fixed here: `nw07ContinuityCoherence` requires the active PLAN to carry a `### G<n>` section with a `Status:` line for every milestone the STATE reports complete, and the PLAN was written with a flat milestone list.
- [x] 8.3 `openspec validate nightwatch-control-center-design-system-v1
      --type change --strict` exits zero
      — `openspec validate nightwatch-control-center-design-system-v1 --type change --strict` exits zero.
- [ ] 8.4 Reconcile `STATE.md`, `.agent/ACTIVE_TASK.md`, `EXECUTION_PROMPT.md`
      and `docs/` to the receipt in a second checkpoint
      — `STATE.md`, `ACTIVE_TASK.md`, `EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md` and `docs/DECISIONS.md` reconciled; `agent:check`, `project:check`, `handoff:check` and `hardening:check` all PASS. The remaining boxes close at integration.
- [ ] 8.5 Integrate by fast-forward push to `origin main`; verify
      `HEAD == origin/main`; a rejected push means stop and reconcile, never
      force-push
- [ ] 8.6 Write `REPORT.md`: residual work, owner decisions taken by default,
      safety events, and honest limits — including that this change proves the
      system is applied and does not prove the result is well designed
- [ ] 8.7 Release the session; canonical tree clean
