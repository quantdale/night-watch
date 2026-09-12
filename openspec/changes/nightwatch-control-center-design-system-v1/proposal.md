# Proposal — Control Center design system and responsive truth

## Why

Four consecutive campaigns proved that the Control Center's classes exist,
bind, take effect and disappear when their data does. None of them asked what
the resulting pixels look like, and the answer is that `ui/control-center` has
no design system at all: `:root` declares eighteen custom properties, all of
them colour plus one shadow, and nothing for typography, spacing, radius or
elevation. The stylesheet then carries 84 `font-size` declarations across
nineteen distinct values — one at `7px`, six at `8px`, eleven at `9px`,
fifteen at `10px`, sixteen at `11px` — roughly twenty-five hex literals and forty-seven `rgba()`
literals outside the token block.

The absence is not only cosmetic. Three custom properties are *referenced and
never defined*: `--surface-muted`, `--ready` and `--warning`. A `var()`
fallback is the live value when the token is undefined, and all three
fallbacks are **light-theme colours**, so in a dark console today:

| Element | Declared | Renders | Contrast |
|---|---|---|---|
| `.review-action` (the five decision buttons) | `var(--surface-muted, #f4f5f7)` | `#f4f5f7` fill under `color: inherit` `#e7edf4` | **1.08:1** |
| `.review-outcome-ok` | `var(--ready, #1d7a4c)` | `#1d7a4c` on `#111a24` | **3.29:1** |
| `.review-outcome-warn` | `var(--warning, #a2621a)` | `#a2621a` on `#111a24` | **3.59:1** |

The decision rationale textarea sits one character away from the same defect:
it declares `var(--surface, #fff)`, and only because `--surface` happens to be
defined does it render `#111a24` instead of white.

The reviewer decision controls — the product's human half, the surface the
owner-local review campaign existed to build — render near-white text on a
near-white fill at 1.08:1. Every guard passes: the classes exist, have rules,
and change a computed property. They change it to the wrong value, and no
check in this repository looks at values.

The same absence produced a second accent identity. Twelve
`var(--token, literal)` fallbacks exist; seven are `var(--accent, #6ea8fe)` —
a blue — while `--accent` is amber `#e4a853`. That fallback is inert only for
as long as the token keeps its current name, which is exactly the shape of the
A-04 defect this project just closed by hand.

And the three breakpoints have never been rendered. No lane sets a viewport,
so every one of them is unproven — including `.sidebar-footer { display: none }`
at ≤820px, which is where the shell states **"Local only · External egress
disabled"**, and `.read-only-tag { max-width: 34px; overflow: hidden }` at
≤560px, which reduces "Read-only session" to an `aria-hidden` glyph. A
read-only, loopback-only console drops two of its posture markers at narrow
width and nothing notices. (The page footer's "Read-only · Loopback · No
external network" does survive, so the posture is degraded rather than lost.)

Stated plainly so it is not overclaimed: **text contrast is fine.** Every
defined foreground/background pair measures between 5.56:1 and 16.09:1. The
defects are undefined tokens, an unscaled typography floor, an unguarded
responsive surface and sub-3:1 interactive boundaries — not the palette.

## What Changes

**A declared design system replaces ad-hoc values.** One token block owns
colour, typography, spacing, radius, elevation and motion. Every `font-size`,
`padding`, `gap`, `border-radius`, `box-shadow` and colour in the stylesheet
resolves to a token; a literal outside the token block fails a guard. The
typographic floor rises from 7px to a stated minimum, and the scale is applied
across all nine views rather than re-derived per panel.

**Token integrity becomes mechanical.** Every referenced custom property must
be defined. A `var()` fallback whose literal differs from the token's defined
value fails — which removes the blue/amber accent split and makes the three
undefined-token defects impossible to reintroduce. This is the dual of the
dead-rule check: that one finds rules nothing can match, this one finds
references nothing defines.

**The design direction is applied, not just tokenised.** The Control Center is
restyled as one composition — surface levels, section rhythm, panel density,
status treatment and the System Map's detached `rem`/`999px`/neutral-grey
idiom folded into the same system. Grounded in curated dark-console references
(Axiom, Linear, Checkly, Better Stack) retrieved through the Refero MCP; see
`design.md`.

**BREAKING (visually, by intent):** unlike the decomposition in
`accessibility-certification`, this change deliberately changes rendered
pixels. It therefore cannot use a before/after DOM-identity proof, and states
its own proof obligations instead.

**Responsive behaviour becomes proven.** A viewport matrix renders every view
at every declared breakpoint. Content a media query removes must appear in a
reasoned, both-directions list, and a posture statement must remain reachable
at every viewport.

**Interactive boundaries reach 3:1.** Controls whose only affordance is a
border are raised to the WCAG 1.4.11 non-text floor.

## Capabilities

### New Capabilities

- `control-center-design-system`: a declared token system for colour,
  typography, spacing, radius and elevation; token-integrity and
  literal-free-stylesheet guards; a rendered type floor; the applied visual
  direction across all nine views; responsive truth across a viewport matrix;
  and the non-text contrast floor for interactive boundaries.

### Modified Capabilities

None. `openspec/specs/` does not yet exist — Group 1 of
`nightwatch-production-completion-programme-v1` publishes the first
consolidated baseline. This change adds a capability and modifies no existing
requirement.

## Impact

**Code.** `ui/control-center/src/styles.css` (1,684 lines) and the class usage
in the view modules; `ui/control-center/src/styles.test.ts`; new UI suites for
token integrity and the type floor; `tests/browser/controlCenterBrowser.browser.ts`
for the viewport matrix and boundary contrast; registration in
`config/validation-universe.v1.json` with an `inventoryDigest` refresh.

**No new dependencies.** The UI's two runtime dependencies stay `react` and
`react-dom`; contrast and token parsing are arithmetic and regex over text the
repository already reads.

**No new authority.** No route, adapter, contract, bound, sanitizer or
capability. The UI gains nothing it lacked; `LOCAL_LOOPBACK_ONLY`,
`executionAuthority: NONE` and the owner scope freeze are untouched.

**Sequencing against `nightwatch-production-completion-programme-v1`.** That
programme is `READY_FOR_EXECUTION` and three of its groups touch this surface.
This change is ordered **after Group 19** (`App.tsx` decomposition), because
restyling a 1,786-line single file and decomposing it at the same time makes
both unreviewable, and Group 19's proof is DOM-identity which a restyle would
break. It is **complementary to Group 20** (`accessibility-certification`) and
**Group 8** (`control-center-residual-truth`), and deliberately does not
duplicate them:

| Concern | Owner |
|---|---|
| Rendered-pair contrast, non-colour status encoding, keyboard workflows, decomposition | Group 20 |
| Whole-stylesheet dead rules, native form controls, system-map taxonomy | Group 8 |
| Token definition and fallback integrity, the type scale and rendered floor, spacing/radius/elevation scales, literal-free stylesheet, the applied visual direction, the viewport matrix | **this change** |

The overlap is bounded and stated: Group 20 measures contrast on pairs the DOM
produces and would independently catch `.review-action` at 1.08:1 *if the
reviewer capability is enabled in the composition it sweeps*. It would report
the symptom. This change removes the cause — an undefined token — and forbids
the class of defect. Whichever lands first, the other's check must still pass.
