# Nightwatch Control Center design system

## Purpose

Apply one design system across all nine Control Center views and make its
integrity mechanical, so the drift the audit measured cannot silently return.

## Starting State

Measured at `efd1dc5c` on 2026-09-18 and recorded in full in the change's
`audit.md` under `# Rebaseline — measured at efd1dc5c`. Summary:

- 18 custom properties: 17 colour + `--shadow`. Nothing for typography,
  spacing, radius or motion.
- 84 `font-size` declarations, 19 distinct values, 49 below 12px, smallest 7px.
- 36 distinct hex literals (53 occurrences), 37 distinct `rgba()` (50
  occurrences) outside the token block.
- 37 `border-radius` declarations across 12 distinct values.
- 10 divergent `var()` fallbacks encoding a complete second light theme, inert
  today only because every token happens to be defined.
- 3 breakpoints (1080/820/560), none rendered by any lane; two remove posture.
- `--border` is 1.27–1.51:1 against the surfaces it separates.
- D-01's three undefined tokens are FIXED by later work; only the guard is owed.
- `App.tsx` is decomposed (351 lines; nine views in `src/views/`).
- UI baseline: typecheck PASS, 88 tests PASS, build PASS.

## Scope

`ui/control-center/**`, `tests/browser/controlCenterBrowser.browser.ts` and its
viewport matrix, `config/validation-universe.v1.json` lane registration, this
change's OpenSpec artefacts, this task directory, and Nightwatch docs.

## Non-Goals

No route, adapter, contract, bound, sanitizer, authority or dependency change.
No new runtime dependency, CSS framework, icon set or chart library. No light
theme. No rebrand. No backend field invented to improve a visual. No
reopening of the four terminal predecessor Control Center campaigns. No
execution of the production-completion programme's own open tails.

## Safety Constraints

LOCAL only. Sibling repositories stay read-only. No production, DEV or NEXT
contact; no network egress; no credentials; no sibling writes. C-00 governs:
one owned session worktree, fast-forward integration, never force-push. No
quality gate is weakened and no exemption list grows without a written reason.
No new runtime dependency, CSS framework, icon set, chart library or light
theme. No rebrand: `#0b1118` base and `#e4a853` amber are preserved.

## Architecture / Approach

A token block in `:root` is the single source for colour, typography, spacing,
radius, elevation and motion. Rules consume tokens; literals are forbidden
outside the block except a justified, both-directions exemption list.

Integrity is enforced by four new guards, each negative-probed:

1. **Token integrity** (unit) — every referenced property is defined; every
   `var()` fallback literal equals its token's defined value; non-vacuous.
2. **Literal freedom** (unit) — no palette/size/radius literal outside the
   block; the exemption list fails in both directions; no unused token.
3. **Rendered type floor** (browser) — computed `font-size` >= 12px for every
   text-bearing element across the walk, with a non-zero measured count.
4. **Responsive and boundary truth** (browser) — every view at every declared
   width: no horizontal page scroll, no clipped control, posture visible, and
   3:1 for controls whose boundary is their sole affordance.

Structural guards read DECLARED values; the browser guards read COMPUTED ones.
Both are needed: the divergent-fallback defect is invisible to a rendered check,
and the type floor is invisible to a structural one.

## Milestones

### G1 — rebaseline and activation

- **Status:** COMPLETE_LOCAL
- Change tasks 1.1–1.5. Re-measure every audit figure at the live SHA, record
  the contradictions rather than copying them, activate the task and claim the
  owned session.

### G2 — token block and integrity guard

- **Status:** COMPLETE_LOCAL
- Change tasks 2.1, 2.3–2.6. Declare colour, typography, spacing, radius,
  elevation and motion; add `--border-interactive`; guard defined-ness and
  fallback agreement; negative-probe. 2.2 and 2.7 are superseded — see
  `## Decision Log`.

### G3 — literal-free stylesheet and scale usage

- **Status:** COMPLETE_LOCAL
- Change tasks 3.1–3.6. The literal guard, a both-directions structural
  exemption list, the unused-token check, the full conversion, and folding the
  System Map block into the system.

### G4 — type floor and the restyle it forces

- **Status:** COMPLETE_LOCAL
- Change tasks 4.1–4.6. The rendered floor guard in the browser lane, the type
  scale applied, the micro-label default resolved, and the layouts the raised
  floor broke reworked.

### G5 — responsive truth

- **Status:** COMPLETE_LOCAL
- Change tasks 5.1–5.7. The declared breakpoint set, the viewport matrix over
  every view, no-scroll and no-clip assertions, the declared removal list, and
  the two posture repairs.

### G6 — interactive boundary contrast

- **Status:** COMPLETE_LOCAL
- Change tasks 6.1–6.3, 6.5. Sole-affordance controls enumerated from the
  rendered DOM and required to clear 3:1 against their real backdrop. 6.4
  (focus indicators at every breakpoint) is carried — see `## Deferred Work`.

### G7 — registration and validation

- **Status:** COMPLETE_LOCAL
- Change tasks 7.1–7.6. Suite registration, digest refresh, and the UI, root
  and browser lanes green with no exemption list longer than before.

### G8 — certification

- **Status:** IN_PROGRESS
- Change tasks 8.1–8.7. Differential gate and regression evidence, strict
  OpenSpec validation, docs reconciled, integration, report and release.

## Sequencing constraints

- G4 must follow G3, or the restyle reintroduces literals G3 would reject.
- G5 must follow G4, because the raised floor is what breaks the narrow
  layouts G5 has to qualify.
- G6 must follow G2, because `--border-interactive` is the repair.

## Validation Strategy

Continuous during implementation: `npm --prefix ui/control-center run
typecheck` and `test`, plus the focused new guards.

Before certification: UI typecheck/test/build; `npm run typecheck`,
`node bin/hardening-check.mjs`, `npm run validation:universe`;
`npm run control-center:ui:browser` including the viewport matrix; every new
guard negative-probed and restored; `npm run gate:local`; `npm test`; and
`openspec validate nightwatch-control-center-design-system-v1 --type change
--strict`.

Certification is DIFFERENTIAL. `gate:local` and `npm test` are red at base from
sibling `ripple-api` SHA drift outside this campaign, so the requirement is an
IDENTICAL failure set to base plus green UI and browser lanes. A green gate is
neither claimed nor engineered.

## Decision Log

- 2026-09-18 — Activated from PARKED under explicit owner authorization; the
  park record's own unblock condition is satisfied and cited in `SPEC.md`.
- 2026-09-18 — D-01 recorded DEAD rather than ticked: later work already made
  the repair, so tasks 2.2 and 2.7 are superseded. The guard (2.4) stays in
  scope.
- 2026-09-18 — `--border-interactive: #5d7286` adopted; measured 3.81 / 3.52 /
  3.19 / 3.59 against the four surfaces, every pair over 3:1.
- 2026-09-18 — Certification is differential (see Validation Strategy).

## Discoveries

- The 10 divergent `var()` fallbacks are inert today because every token is
  defined, so a rendered-contrast check measures the correct amber and reports
  success while the sheet carries a complete second light theme one rename away
  from shipping. The guard must therefore be structural and read declared
  values.

## Deferred Work

- Tasks 2.2 and 2.7 are moot at this SHA and are recorded as superseded rather
  than ticked: later work removed the three undefined tokens, so the repair
  they describe is already made and claiming it would be false.
- Task 6.4 — focus-ring contrast measured at every declared breakpoint — is
  CARRIED. Focus is proven visible and reading-order correct by the keyboard
  walk (repaired in this campaign), but that walk runs at one viewport.
- Information architecture was not rebuilt. This campaign applied one system
  across the existing composition and fixed the layout defects that surfaced;
  it did not restructure Overview into a different cockpit or re-rank panels.

## Completion Criteria

The eight acceptance criteria in `SPEC.md`, each with recorded evidence tied to
the implementation SHA, every change ledger box either ticked with evidence or
explicitly recorded as superseded/blocked with a named owner action, the work
integrated by fast-forward to `origin main` with `HEAD == origin/main`
verified, `REPORT.md` written with honest limits, and the session released with
a clean canonical tree.
