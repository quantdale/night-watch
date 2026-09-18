# REPORT.md

Task: nightwatch-control-center-design-system-v1

Status: IN_PROGRESS

Starting SHA: `efd1dc5c81a55db00e7698257c8b49b51a6703c5`

## Summary

The Control Center now has ONE design system, applied across all nine views,
with its integrity mechanically enforced rather than reviewed. The change was
parked 2026-09-14 with the unblock condition "a fresh owner authorization opens
its own campaign task and session"; that authorization was given 2026-09-18 and
this task and its owned C-00 session are it.

What changed, measured rather than asserted:

| Dimension | Before (`efd1dc5c`) | After |
|---|---|---|
| tokens | 18 (17 colour + 1 shadow) | 53 across six dimensions |
| `font-size` | 84 declarations / 19 values / 49 below 12px / min 7px | 7 scale steps, floor 12px |
| `border-radius` | 37 declarations / 12 values | 4 roles + 2 declared shapes |
| spacing | 85 distinct values / 174 occurrences | 7 steps + 3 role aliases |
| colour literals outside `:root` | 54 distinct / 69 occurrences | 0 |
| `var()` fallbacks | 14, of which 10 divergent | 0 |
| rendered breakpoints | 0 of 3 | 5 widths x 9 views = 45 cells |

## What the work actually found

**The divergent fallbacks were inert, and that was the point.** Every token
happened to be defined, so none of the ten fallbacks rendered. A
rendered-contrast check measured the correct amber and reported success while
the stylesheet carried a complete second light theme — blue accent, white
surface, light border — one rename away from shipping. The guard therefore
reads DECLARED values in the unit lane; a browser check structurally cannot see
this defect.

**The three breakpoints had never been rendered by any test.** No config sets a
viewport, so every browser lane measured Playwright's 1280x720 default. Laying
the console out at the declared widths for the first time found four real
defects: `1fr` grid columns that cannot shrink below their content; scroll
ports that were never narrower than the tables inside them; tables that need to
ADAPT rather than scroll below 820px; and — the one that took longest — a
scroll port left `position: static`, so it established no containing block and
every absolutely-positioned `.sr-only` caption inside those tables escaped the
clip entirely. A 1px screen-reader span at the far right of a 1097px table set
the document's scrollable width and slid the whole page sideways while the
table beside it clipped correctly. That is why it presented for a long time as
four unrelated bugs in spacing, type, radius and transitions: reverting any one
of them moved the table back across a marginal overflow threshold.

**The type floor exposed a real accessibility regression before any human saw
it.** The widened columns pushed the Runs table to exactly its container width
— 866px of 866px — and an overflowing scroll container is a keyboard-focusable
scroller in Chrome. A tab stop appeared and disappeared with the font swap,
which anchored the focus walk to the wrong tab order.

## Defaults resolved

- **Micro-label capitalization**: uppercase with 0.08em tracking. At 12px that
  reads as a field label rather than as body text that happens to be small,
  which is what lets the floor rise without the console feeling loose.
- **Token alias vs call-site rewrite**: call-site rewrite. All 14 `var()`
  fallbacks were removed, including the four that AGREED with their token — a
  fallback restating its token is a second place to edit, and "no fallbacks" is
  a far easier rule to keep true than "fallbacks must match".
- **Breakpoint matrix**: 1440 / 1080 / 820 / 560 / 380.
- **A dead token is deleted, not adopted**: `--weight-normal` was removed rather
  than given a contrived use, because 400 is the inherited default.
- **Divider vs control boundary**: `--border` stays quiet at 1.27-1.51:1 for
  structural dividers; only a control whose outline is its sole affordance takes
  `--border-interactive` at 3.81:1. Making every divider 3:1 would turn a dark
  forensic console into a wireframe.

## Stale audit facts corrected

- **D-01 is DEAD.** `--surface-muted`, `--ready` and `--warning` are neither
  defined nor referenced, so the 1.08:1 `.review-action` defect is not
  reproducible at this SHA. This campaign does NOT claim that repair; ledger
  items 2.2 and 2.7 are recorded superseded rather than ticked. What survived
  was the missing guard, which is now in place.
- **`App.tsx` is decomposed** (351 lines, nine views in `src/views/`), so every
  `App.tsx:NNNN` reference in the historical audit is stale.
- Two figures moved upward: 36 distinct hex literals (audit said "~25") and 50
  `rgba()` occurrences (said 47). `var(--accent, #6ea8fe)` was 7, as stated.

## Safety

No production, DEV or NEXT contact. No network egress. No credentials
encountered or stored. No sibling repository writes. No destructive operation.
Safety events: NONE, supported by the STATE `## Safety Events` section.

## Honest limits

- **This proves the system is APPLIED, not that the result is well designed.**
  Every guard here measures conformance — tokens resolve, literals are absent,
  text clears a floor, layouts do not overflow, boundaries clear 3:1. None of
  them measures whether the console is good to use.
- **Certification is DIFFERENTIAL, not green.** `gate:local` and `npm test` are
  red at the base checkpoint because the sibling `ripple-api` checkout has
  advanced past the Phase 5 pinned SHA. That is outside this campaign and
  requires an owner re-admission under AGENTS.md Phase 9A.1. The requirement met
  here is an identical failure set to base plus green UI and browser lanes.
- **The live Control Center instance used for visual QA had an empty local
  store**, so the dense-data states were qualified through the synthetic
  authority composition in the browser lane rather than by eye.
- **Information architecture was not rebuilt.** The campaign applied one system
  across the existing composition and fixed the layout defects that surfaced; it
  did not restructure Overview into a different cockpit or re-rank the panels on
  any view.

## Evidence

Per-item evidence is recorded in the change ledger
`openspec/changes/nightwatch-control-center-design-system-v1/tasks.md` and the
STATE `## Validation Ledger`.
