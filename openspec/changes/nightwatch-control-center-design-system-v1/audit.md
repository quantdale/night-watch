# Audit — Control Center design system

Measured at `36bd493` (`docs: certify the Control Center style and absence
truth campaign`) against a clean canonical checkout. Every figure below is
re-derivable by the command beside it; the numbers are measurements, not
permissions, and an executor must re-establish them at the live starting SHA
before changing anything.

Surface: `ui/control-center/src/styles.css` (1,684 lines),
`ui/control-center/src/App.tsx` (1,786 lines, nine views),
`ui/control-center/src/styles.test.ts` (93 lines).

## D-01 — Three referenced tokens are never defined, and their light-theme fallbacks are what renders

`:root` declares 18 custom properties (`sed -n '/^:root {/,/^}/p' src/styles.css
| grep -c '^  --'`). Three properties are referenced with a `var()` fallback and
never defined (`grep -c '^  --<name>:' src/styles.css` → 0 for each):

| Property | Referenced at | Fallback | Defined |
|---|---|---|---|
| `--surface-muted` | `styles.css:1583` (`.review-action` background) | `#f4f5f7` | no |
| `--ready` | `styles.css:1593` (`.review-outcome-ok` colour) | `#1d7a4c` | no |
| `--warning` | `styles.css:1594` (`.review-outcome-warn` colour) | `#a2621a` | no |

A `var()` fallback is the live value when the property is undefined, so these
light-theme literals render in a dark console. Computed with the WCAG 2.x
relative-luminance formula:

- `.review-action` — the five reviewer decision buttons (`App.tsx:982–995`,
  `REVIEW_DECISIONS.map`) — renders `#f4f5f7` under `color: inherit`
  (`--text` `#e7edf4`): **1.08:1** against a 4.5:1 AA requirement. Its own
  border `#d0d4da` against that fill is 1.36:1.
- `.review-outcome-ok` `#1d7a4c` on `--surface` `#111a24`: **3.29:1**.
- `.review-outcome-warn` `#a2621a` on `--surface` `#111a24`: **3.59:1**.

These classes render when the server reports `localReviewDecision: 'ENABLED'`
(`types.ts:47`); the stylesheet defect is unconditional.

The decision-rationale textarea (`styles.css:1551–1552`) declares
`var(--border, #d0d4da)` and `var(--surface, #fff)`. Both properties *are*
defined, so it renders correctly — the same construct, one character from the
same defect.

**Why no existing guard catches it.** `styles.test.ts` asserts a rendered class
has a rule. The A-02 browser check asserts a class changes a computed property —
it does, to the wrong value. The A-03 absence pass asserts the DOM changes when
a collection empties. No check in the repository reads a declared *value*.

## D-02 — Twelve `var()` fallbacks, seven of them a second accent identity

`grep -o 'var(--[a-z-]*, *[^)]*)' src/styles.css | sort | uniq -c`:

| Count | Fallback | Token's defined value | Diverges |
|---|---|---|---|
| 7 | `var(--accent, #6ea8fe)` | `#e4a853` | **yes — blue vs amber** |
| 2 | `var(--border, #d0d4da)` | `#263545` | **yes — light vs dark** |
| 1 | `var(--surface, #fff)` | `#111a24` | **yes — light vs dark** |
| 1 | `var(--surface-muted, #f4f5f7)` | undefined | D-01 |
| 1 | `var(--ready, #1d7a4c)` | undefined | D-01 |
| 1 | `var(--warning, #a2621a)` | undefined | D-01 |

All seven accent fallbacks are in the C-15c System Map block
(`styles.css:1488, 1492, 1499, 1501 ×2, 1524, 1531`). They are inert only while
`--accent` keeps its current name — the same shape as the A-04 divergence this
project has just closed by hand.

## D-03 — No scale for any dimension but colour

The 18 declared properties are 17 colour plus `--shadow`. Nothing for
typography, spacing, radius, elevation or motion.

`grep -o 'font-size: [^;]*' src/styles.css | sort | uniq -c` → 84 declarations
across 19 distinct values:

| Size | Count | Size | Count |
|---|---|---|---|
| `11px` | 16 | `18px` | 4 |
| `10px` | 15 | `14px` | 3 |
| `9px` | 11 | `15px` | 2 |
| `12px` | 11 | `7px`, `16px`, `24px`, `32px` | 1 each |
| `8px` | 6 | four distinct `clamp()` | 1 each |
| `13px` | 6 | `0.7rem`, `0.75rem` | 1 each |

**49 of the 84 declarations are between `7px` and `11px`.** The smallest is
`7px` (`styles.css:704`). A breakpoint rule sets `8px` on status pills
(`styles.css:1465`).

Outside the token block: ~25 distinct hex literals
(`grep -o '#[0-9a-fA-F]\{3,8\}' src/styles.css | sort | uniq -c`) and 47
`rgba()` literals (`grep -c 'rgba(' src/styles.css`).

The C-15c System Map block (`styles.css:1476+`) uses a different idiom from the
rest of the sheet: `rem` units, `999px` radii and `rgba(127, 127, 127, 0.35)`
borders against the sheet's `px`, 8–10px radii and `var(--border)`.

**WCAG sets no minimum text size**, so the contrast requirement in the pending
`accessibility-certification` group cannot catch this: a `7px` label at 16:1
passes contrast and is unreadable.

## D-04 — Three breakpoints, none rendered; two remove posture information

`grep -n '@media' src/styles.css` → `max-width: 1080px`, `820px`, `560px`, plus
`prefers-reduced-motion: reduce`.

No lane sets a viewport: `tests/browser/controlCenterBrowser.browser.ts`
contains no `viewport` or `setViewportSize`, and
`playwright.control-center.config.ts` extends `playwright.config.ts`, whose
`nightwatch` project sets `browserName`, `channel`, `headless` and a launch
proxy but no viewport — so everything renders at Playwright's 1280×720 default
and all three breakpoints ship unrendered.

Two rules remove posture information:

- `styles.css:1444` — `.sidebar-footer { display: none }` at ≤820px. That
  element (`App.tsx:1771`) carries the pulse indicator and the text **"Local
  only" / "External egress disabled"**, plus the `API v1` version tag.
- `styles.css:1455` — `.read-only-tag { max-width: 34px; overflow: hidden;
  white-space: nowrap; padding: 7px }` at ≤560px. The element
  (`App.tsx:1774`) reads "◉ Read-only session" where `◉` is `aria-hidden`, so
  the visible remainder is the glyph.

**Not a finding, stated to avoid overclaiming:** the page footer
(`App.tsx:1778`) reads "Read-only · Loopback · No external network" and is not
hidden at any breakpoint — it only becomes a column at ≤560px. Posture is
degraded, not lost. Likewise `.hero-orbit` and `.safety-seal` are hidden at
≤820px and both are `aria-hidden` decoration (`App.tsx:376`, `App.tsx:1164`);
removing them is legitimate and they belong in a declared removal list, not in
a defect.

## D-05 — Interactive boundaries below the non-text contrast floor

Computed against the WCAG 2.2 1.4.11 3:1 requirement for the visual boundary of
a control:

| Pair | Ratio |
|---|---|
| `--border` `#263545` on `--surface` `#111a24` | 1.40:1 |
| `--border` on `--bg` `#0b1118` | 1.51:1 |
| `--border-soft` `#1d2a38` on `--surface` | 1.20:1 |
| `--border-soft` on `--bg` | 1.30:1 |

Controls whose boundary is their only affordance: `.chip`
(`styles.css:1495`, a transparent-background button), `.review-action`, and the
decision textarea.

## Not a finding — text contrast

Every defined foreground on every defined surface, measured:

| | `--bg` | `--surface` | `--surface-raised` | `--surface-soft` |
|---|---|---|---|---|
| `--text` `#e7edf4` | 16.09 | 14.88 | 13.49 | 15.18 |
| `--muted` `#a8b6c4` | 9.17 | 8.48 | 7.68 | 8.65 |
| `--faint` `#91a1b0` | 7.16 | 6.62 | 6.00 | 6.75 |
| `--accent` `#e4a853` | 9.05 | 8.37 | 7.59 | 8.54 |
| `--green` `#70c39b` | 9.00 | 8.33 | 7.54 | 8.49 |
| `--blue` `#86b7e8` | 8.99 | 8.31 | 7.53 | 8.48 |
| `--red` `#e07c7c` | 6.63 | 6.13 | 5.56 | 6.25 |

All pass AA for normal text, the lowest at 5.56:1. **The palette is not the
problem.** The problems are tokens that are referenced and never defined, a
type floor of 7px, an unguarded responsive surface and sub-3:1 control
boundaries.

## Design references

Retrieved through the Refero MCP (`https://api.refero.design/mcp`,
`refero_search_styles` then `refero_get_style`) and recorded so the direction
in `design.md` is attributable:

| Reference | Style id |
|---|---|
| Axiom | `6e9baa82-2f2f-4e77-8b0d-566325635dbe` |
| Linear (Changelog) | `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6` |
| Checkly | `0a2ad49e-4339-48ad-a62d-56a47cc0b654` |
| Better Stack | `57de4778-3318-488d-bc12-110d95f7654b` |
| Depot | `707c2922-e428-4ee4-847c-9791290712d1` |
| ClickHouse | `289021a2-4f3b-45b2-9009-972d72393ab7` |

## Relationship to `nightwatch-production-completion-programme-v1`

That change is `READY_FOR_EXECUTION` at this same SHA and three of its groups
touch this surface. Overlap is bounded and stated in `proposal.md`. The one
genuine intersection: Group 20's rendered-pair contrast requirement would
independently report `.review-action` at 1.08:1 *if the reviewer capability is
enabled in the composition it sweeps*. It reports the symptom; D-01's guard
removes the cause and forbids the class. Neither replaces the other.
