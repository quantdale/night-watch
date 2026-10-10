# Spec — Control Center design system

Measured at `36bd493` in `ui/control-center/src/`: `styles.css` is 1,684 lines
and `App.tsx` 1,786 lines carrying nine views. `:root` declares 18 custom
properties — 17 colour and one shadow — and none for typography, spacing,
radius, elevation or motion. The stylesheet carries 84 `font-size`
declarations across 19 distinct values (`7px` ×1, `8px` ×6, `9px` ×11,
`10px` ×15, `11px` ×16, plus
`12px`, `13px`, `14px`, `15px`, `16px`, `18px`, `24px`, `32px`, four `clamp()`
and two `rem`), ~25 hex literals and 47 `rgba()` literals outside the token
block, and 12 `var(--token, literal)` fallbacks. Three referenced tokens —
`--surface-muted`, `--ready`, `--warning` — are never defined; seven fallbacks
name `#6ea8fe` while `--accent` is `#e4a853`. Three breakpoints exist
(1080/820/560) and no lane sets a viewport, so all three are unrendered.
Defined text pairs measure 5.56:1 – 16.09:1 and are not a finding.

## ADDED Requirements

### Requirement: Every referenced custom property SHALL be defined, and no fallback SHALL diverge from its token

A `var()` fallback is not a safety net; it is a second, invisible definition
that becomes the live value exactly when the token is missing. `--surface-muted`,
`--ready` and `--warning` are referenced and never defined, so their light-theme
fallbacks are what the dark console actually renders — `.review-action` at
1.08:1 on the five reviewer decision buttons. Seven further fallbacks name a
blue while the accent is amber, inert only until the token is renamed.

Every custom property referenced anywhere in the stylesheet SHALL be defined in
the declared token block. A `var()` fallback SHALL be permitted only where its
literal is identical to the token's defined value, so a fallback can never
change what renders; a divergent fallback SHALL fail naming the property, both
values and the line.

The check SHALL assert a non-zero count of extracted references before
asserting anything about them, so an extractor that silently stops matching
fails first.

This is the dual of the dead-rule check in `control-center-residual-truth`:
that one finds rules no class can match; this one finds references no
declaration defines.

#### Scenario: an undefined token fails
- **WHEN** the stylesheet references a custom property with no definition in the token block
- **THEN** the check fails naming the property, the referencing rule and the line

#### Scenario: a divergent fallback fails
- **WHEN** a `var()` fallback literal differs from the token's defined value
- **THEN** the check fails naming the property, the fallback literal and the defined value

#### Scenario: the extraction is non-vacuous
- **WHEN** reference extraction yields zero references
- **THEN** the check fails before asserting definition

#### Scenario: the mutation proof holds
- **WHEN** a definition is deleted from the token block while a reference remains
- **THEN** the lane fails naming that property

### Requirement: Typography, spacing, radius, elevation and colour SHALL resolve to a declared scale

Eighty-four ad-hoc `font-size` declarations, ~25 hex literals and 47 `rgba()`
literals outside the token block are why the surface has no visual system: each
panel re-derives its own. A scale that exists but is optional is not a system.

The token block SHALL declare a complete scale for each of the five dimensions,
each step named and reasoned. Every `font-size`, `line-height`, `padding`,
`margin`, `gap`, `border-radius`, `box-shadow`, `color`, `background`,
`border-color`, `fill` and `stroke` declaration in the stylesheet SHALL resolve
to a token from the corresponding scale.

A literal outside the token block SHALL fail naming the declaration, the value
and the line, unless it appears in a reasoned exemption list — a value that
cannot be a token because it is structural rather than aesthetic (`0`, `1px`
hairlines, `100%`, `9999px`, `transparent`, `currentColor`, viewport units,
`clamp()` bounds). The list SHALL fail in both directions: an exempted value
that becomes tokenisable is stale.

The scale SHALL be consumed, not merely declared: every declared step SHALL be
referenced by at least one rule, so a token nothing uses fails as dead in the
same way a rule nothing matches does.

#### Scenario: an untokenised value fails
- **WHEN** a declaration carries a literal that is not a token reference and is not exempted
- **THEN** the check fails naming the property, the value and the line

#### Scenario: the exemption list is honest in both directions
- **WHEN** an exempted literal becomes expressible as a token
- **THEN** the check fails as stale

#### Scenario: an unused token fails as dead
- **WHEN** a declared scale step is referenced by no rule
- **THEN** the check fails naming the token

#### Scenario: a single accent identity
- **WHEN** the composition renders
- **THEN** exactly one accent hue is reachable through the token block

### Requirement: The rendered type floor SHALL be measured from computed styles

Forty-nine of the stylesheet's 84 `font-size` declarations sit between `7px`
and `11px`,
the smallest being `7px`. WCAG sets no minimum text size, so the contrast
requirement in `accessibility-certification` cannot catch this — a 7px label at
16:1 passes contrast and is still unreadable. The reference systems this design
direction draws from set their caption at 12px and body at 13–14px.

Every text-bearing element the built composition renders SHALL be measured for
its computed `font-size`, and each SHALL meet the declared minimum for its role.
The minimum SHALL be stated in the token block with its reason, not embedded in
the check.

Measurement SHALL be over computed styles on the built bundle, not over the
source stylesheet, so a size that only arises through the cascade or a media
query is measured. The check SHALL assert a non-zero count of measured elements.

An element below the floor SHALL fail naming the element, its computed size and
its view. No element SHALL be exempted on the grounds of being decorative
unless it carries no accessible text.

#### Scenario: sub-floor text fails
- **WHEN** a rendered text-bearing element computes below the declared minimum
- **THEN** the check fails naming the element, the size and the view

#### Scenario: the floor is measured on the built bundle
- **WHEN** a size arises only through a media query or the cascade
- **THEN** it is still measured

#### Scenario: the measurement is non-vacuous
- **WHEN** zero text-bearing elements are measured
- **THEN** the check fails before comparing sizes

#### Scenario: the minimum is declared, not hard-coded
- **WHEN** the floor changes
- **THEN** it changes in the token block and the check reads it from there

### Requirement: The design system SHALL be applied across every view as one composition

Tokenising values without applying them leaves nine views that each look
locally reasonable and collectively unrelated. The System Map block added by
C-15c is the clearest case: it uses `rem` units, `999px` radii and
`rgba(127, 127, 127, 0.35)` neutral borders while the rest of the stylesheet
uses `px`, 8–10px radii and `var(--border)` — one stylesheet carrying two
design idioms.

All nine views SHALL be restyled against the declared system: surface levels,
section rhythm, panel density, typographic hierarchy, status treatment and
control affordances drawn from the same scales. The System Map's divergent
idiom SHALL be folded into the system rather than left as an exception.

This change deliberately alters rendered pixels, so it SHALL NOT claim a
before/after DOM-identity proof — that proof belongs to the decomposition in
`accessibility-certification` and this change SHALL leave it intact by landing
after it. Instead the applied direction SHALL be evidenced by the guards in
this spec passing over every view, and by the existing render, style, absence
and coverage guards remaining green with no exemption list longer than before.

#### Scenario: no view is exempt from the system
- **WHEN** the token and literal guards run
- **THEN** they run over the rules of all nine views including the System Map

#### Scenario: no existing guard is weakened to accommodate the restyle
- **WHEN** the restyle lands
- **THEN** every existing exemption list is unchanged or shorter

#### Scenario: behaviour is preserved even though pixels change
- **WHEN** the existing render, absence and contract-coverage guards run after the restyle
- **THEN** they pass unchanged

### Requirement: Every declared breakpoint SHALL be rendered, and removed content SHALL be declared

Three breakpoints exist and no lane sets a viewport, so every media query in
the stylesheet ships unrendered. Two of them remove posture information:
`.sidebar-footer`, which states "Local only · External egress disabled", is
`display: none` at ≤820px; `.read-only-tag` is clamped to `max-width: 34px`
with `overflow: hidden` at ≤560px, leaving only its `aria-hidden` glyph. For a
console whose entire identity is having no authority, the narrow viewport is
where it stops saying so.

The browser lane SHALL render every view at every declared breakpoint —
each media query's own range and the range above the widest — and SHALL assert
that no view scrolls horizontally and that no interactive control is clipped or
overlapped at any of them.

Content that a media query removes or truncates SHALL appear in a reasoned
list naming the element, the breakpoint and why its removal is acceptable. The
list SHALL fail in both directions. Purely decorative elements already marked
`aria-hidden` — `.hero-orbit`, `.safety-seal` — are legitimately removable and
SHALL be listed with that reason.

At least one statement of read-only, loopback-only posture SHALL remain visible
at every declared breakpoint, and the lane SHALL assert it by text rather than
by class, so satisfying it by restyling the selector is not possible.

#### Scenario: every breakpoint is rendered
- **WHEN** the viewport matrix runs
- **THEN** every view renders at every declared breakpoint and the range above the widest

#### Scenario: undeclared content removal fails
- **WHEN** a media query hides or truncates an element that is not in the reasoned list
- **THEN** the lane fails naming the element and the breakpoint

#### Scenario: the removal list is honest in both directions
- **WHEN** a listed element stops being removed at its breakpoint
- **THEN** the lane fails as stale

#### Scenario: posture survives every width
- **WHEN** any declared breakpoint renders
- **THEN** the accessible text states read-only, loopback-only posture

#### Scenario: no view scrolls horizontally
- **WHEN** a view renders at any declared breakpoint
- **THEN** its scroll width does not exceed its client width

### Requirement: Interactive boundaries SHALL meet the non-text contrast floor

Text contrast is not a finding here — defined pairs measure 5.56:1 to 16.09:1.
Boundaries are: `--border` against `--surface` is 1.40:1 and `--border-soft`
1.20:1, against a WCAG 2.2 1.4.11 requirement of 3:1 for the visual boundary of
a control. Controls whose only affordance is that border — `.chip`,
`.review-action`, the decision textarea — are not reliably perceivable as
controls.

Every interactive element whose boundary is the sole indicator of its
interactive area SHALL have that boundary measured against its adjacent
background and SHALL meet 3:1. An element that conveys its affordance by fill,
text or an icon with an accessible name instead SHALL be listed with that
reason and is not required to meet the boundary ratio.

Focus indicators SHALL be measured on the same basis against the background
they appear over, at every declared breakpoint.

#### Scenario: a sub-3:1 control boundary fails
- **WHEN** a control's boundary is its only affordance and measures below 3:1
- **THEN** the check fails naming the control, the ratio and the pair

#### Scenario: an alternative affordance is declared, not assumed
- **WHEN** a control relies on fill, text or a named icon instead of its boundary
- **THEN** it appears in the reasoned list with that affordance stated

#### Scenario: focus indicators are measured too
- **WHEN** a control receives focus at any declared breakpoint
- **THEN** its focus indicator meets 3:1 against the background it appears over

### Requirement: The new guards SHALL be registered and bound to the inventory digest

R-12 made suite registration a totality rule: the gate runs only declared and
manifest-listed suites, so a written-but-unregistered check proves nothing.

Every guard added by this change SHALL be registered in
`config/validation-universe.v1.json`, SHALL appear in the UI lane manifest, and
the `inventoryDigest` SHALL be refreshed. `validation:universe` SHALL report the
raised `UI_LANE` count, and each guard SHALL be negative-probed before it is
recorded as passing.

#### Scenario: an unregistered guard fails the universe check
- **WHEN** a new UI suite exists but is not classified
- **THEN** `validation:universe` reports it unclassified and `hardening:check` fails

#### Scenario: the digest binds the new inventory
- **WHEN** registration completes
- **THEN** the gate receipt binds the refreshed `inventoryDigest`

#### Scenario: every guard is negative-probed
- **WHEN** a guard is recorded as passing
- **THEN** a deliberate violation of the property it asserts has been shown to fail it
