# Design — Control Center design system

## Context

`ui/control-center` is a React 19 + Vite single-page console with nine views,
two runtime dependencies (`react`, `react-dom`), 1,684 lines of hand-written
CSS and no framework, no CSS-in-JS and no token layer. It reads bounded,
read-only snapshots from a loopback service and holds no execution authority.

Its stylesheet grew campaign by campaign — C-15b added the graph toolbar,
C-15c the System Map, NW-09/NW-10 the reviewer decision controls — and each
arrival brought its own values. The result is not ugly by accident; it is
unsystematised by construction. `:root` holds 18 properties, all colour, and
every other dimension is decided per rule.

Four predecessor campaigns built guards that read the stylesheet
mechanically — every rendered class has a rule, every rule takes effect, every
collection's absence changes the DOM. All of them reason about *structure*.
None reads a *value*. That is the gap through which three undefined tokens
render light-theme colours in a dark console, and through which a `7px` label
ships.

## Goals / Non-Goals

**Goals**

- One declared token system for colour, typography, spacing, radius, elevation
  and motion, applied across all nine views.
- Make the class of defect that produced `.review-action` at 1.08:1
  mechanically impossible, not merely fixed once.
- Raise the rendered type floor and prove it from computed styles.
- Render and prove every breakpoint; keep posture visible at all of them.
- Bring the System Map's divergent idiom into the system.

**Non-Goals**

- **No new dependency.** No Tailwind, no CSS-in-JS, no design-token build step,
  no icon library, no font package. Native CSS custom properties are already
  the mechanism; the change is that they become complete and mandatory.
- **No light theme.** `color-scheme: dark` is a deliberate decision for an
  operator console and is recorded as one, not fixed. The undefined-token
  fallbacks are a defect *because* they smuggle light values in, not because a
  light theme is wanted.
- **No new information.** No view gains a field, a chart, a route or a control.
  This change restyles what is rendered; `ui-error-taxonomy-rendering` owns
  what *should* additionally be rendered.
- **No decomposition.** `App.tsx` structure is Group 19's surface.
- **No contrast/keyboard/non-colour-encoding certification.** That is Group 20.

## Design direction

Retrieved through the Refero MCP (`refero_search_styles`, `refero_get_style`)
and used as calibration, not as a template to copy:

| Reference | Style id | What it settles |
|---|---|---|
| **Axiom** | `6e9baa82-2f2f-4e77-8b0d-566325635dbe` | The closest peer: dark console, three surface levels, a *single* warm accent used only for action and active state, 12px caption / 14px body, monospace for technical content, tight radii. |
| **Linear (Changelog)** | `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6` | Compact density done without shrinking type: depth from borders and tonal shifts rather than shadow; headings at weight 500 rather than bold; 8px element gap, 16px card padding, 24px section gap. |
| **Checkly**, **Better Stack**, **Depot**, **ClickHouse** | — | Corroborate the same grammar: near-black canvas, layered blue-grey surfaces, one restrained accent, dense technical panels, monochrome line icons. |

Two things these references agree on that the Control Center currently
violates: **the accent is never decorative**, and **density comes from spacing,
not from shrinking the type**. The current sheet does the opposite — it buys
density with `7–11px` text and spends colour freely.

What is deliberately kept: the amber accent `#e4a853` (already a single, warm,
distinctive identity, and precisely Axiom's discipline) and the blue-tinted
near-black base (`#0b1118`), which reads warmer and less severe than pure
black and is already the product's look. This change is a systematisation of
the existing visual identity, not a rebrand.

## Decisions

### D1 — The three undefined tokens are defined by mapping, not by inventing

`--surface-muted`, `--ready` and `--warning` are defined against the palette
that already exists: `--surface-muted` → the `--surface-raised` value,
`--ready` → the `--green` value, `--warning` → the `--accent` value. No new
hues enter the palette.

*Alternative considered:* delete the three references and rewrite the rules to
use `--surface-raised`, `--green` and `--accent` directly. Rejected as the
primary fix because it repairs three sites and leaves the fourth possible; the
integrity guard is what actually closes the class. Whether the aliases survive
or the call sites are rewritten is an implementation detail the guard is
indifferent to — either satisfies it.

### D2 — Fallbacks are constrained, not banned

Banning `var()` fallbacks outright is simpler to check but loses a legitimate
use. Requiring the fallback to be *identical to the definition* keeps the
construct, removes its ability to change what renders, and makes the
blue/amber accent split fail immediately. A fallback that agrees with its token
is documentation; one that disagrees is a hidden second theme.

### D3 — The type scale sets a 12px floor, and density moves to spacing

| Role | Size | Use | Replaces |
|---|---|---|---|
| `--text-micro` | 12px / 1.4, +0.06em tracking, uppercase | eyebrows, chips, table labels, pill text | `7px`, `8px`, `9px` |
| `--text-caption` | 12px / 1.5 | secondary and helper text | `10px` |
| `--text-body` | 13px / 1.5 | default body | `11px` |
| `--text-body-lg` | 14px / 1.5 | panel intros, emphasised rows | `12px`, `13px` |
| `--text-heading` | 16px / 1.4, weight 600 | panel headings | `14px`, `15px` |
| `--text-heading-lg` | 20px / 1.35, weight 600 | view headings | `18px` |
| `--text-display` | 24px / 1.3, weight 600 | metric values | `24px` |
| `--text-hero` | `clamp(28px, 4vw, 40px)` | hero only | the four `clamp()`s |

Uppercase micro-labels at 12px with tracking is how both references carry a
dense label layer without going below 12px. The lost vertical space is
recovered from the spacing scale, which is where density belongs.

*Alternative considered:* an 11px floor, a smaller change. Rejected — 11px is
already the single most common size in the sheet, so an 11px floor would
certify the status quo and catch only the `7–10px` tail.

### D4 — Spacing, radius and elevation scales sized for a dense console

- **Spacing** `--space-1..7` = 4, 8, 12, 16, 20, 24, 32. Element gap 8, panel
  padding 20, section gap 24 — between Linear's 16/24 and Axiom's 32/40,
  because this surface is denser than either.
- **Radius** `--radius-sm` 4 (chips, inputs, small controls), `--radius-md` 8
  (panels, cards), `--radius-lg` 12 (hero, modals), `--radius-pill` 9999.
  Resolves the current 4/8/10/999 mix and the System Map's `999px` chips.
- **Elevation** four surface levels stay as they are (`--bg`, `--surface`,
  `--surface-soft`, `--surface-raised`); shadows reduce to `--shadow-0` (none),
  `--shadow-1` (hairline border + faint drop) and `--shadow-2` (the existing
  `--shadow`, reserved for overlays). Depth comes from tonal shift and border,
  following both references.
- **Motion** `--duration-fast` 120ms, `--duration-base` 200ms, one easing
  token; the existing `prefers-reduced-motion` block is unchanged.

### D5 — A separate token for interactive boundaries, not a uniform border raise

`--border` is 1.40:1 on `--surface` and `--border-soft` 1.20:1. Raising every
border to 3:1 would satisfy the requirement and wreck the design — the
references are explicit that dark-console depth comes from *barely-there*
dividers, and a UI where every panel edge is a 3:1 line reads as a spreadsheet.

So the dividers keep their values, and a new `--border-interactive` = `#5d7286`
serves boundaries that are a control's sole affordance. Measured against every
surface a control can sit on:

| Against | Ratio |
|---|---|
| `--bg` `#0b1118` | 3.81:1 |
| `--surface` `#111a24` | 3.52:1 |
| `--surface-raised` `#172331` | 3.19:1 |

`#5d7286` is close to the lightest-needed value rather than comfortably past
it, keeping the borders quiet while clearing 3:1 on the worst-case surface.
Controls that carry a fill, a label or a named icon keep the quiet border and
are listed with that reason.

### D6 — Guards read text where they can and computed styles where they must

Three of the new guards are static and belong in the fast UI suite
(`vitest`, no browser): token definition and fallback integrity, the
literal-free stylesheet check, and scale-step usage. All three are regex and
set arithmetic over `styles.css`, which `styles.test.ts` already reads.

Two must be runtime and belong in the browser lane: the rendered type floor and
the viewport matrix, because a size or a removal that arises from a media query
or the cascade is invisible to a source read. They extend the existing
qualification walk rather than adding a lane.

This split matters for cost: the expensive checks are the two that cannot be
done any other way.

### D7 — The exemption lists follow the established both-directions pattern

Every list this change introduces — structural literals, alternative-affordance
controls, media-query removals — fails in both directions, as the base-only
class list and the absence-exemption list already do. A listed item that stops
needing its exemption is stale and fails. This is the repository's existing
discipline and no new mechanism is invented for it.

## Risks / Trade-offs

- **A restyle cannot use DOM-identity as its proof, so a behavioural regression
  could hide in it.** → The existing render, absence, contract-coverage and
  class-effect guards all continue to run and must stay green with no
  lengthened exemption list; those guards assert content and binding, which a
  restyle must not change. What is genuinely unproven is aesthetic quality, and
  this change does not claim to prove it.

- **Raising ~50 declarations from 7–11px to 12–14px makes everything taller and
  could push content below the fold or overflow panels.** → The viewport matrix
  is the mitigation and must run at the widest range too, asserting no
  horizontal scroll and no clipped control. Expect real layout work in the
  dense views (Reviewer, Source Intelligence, System Map); this is the
  substantial cost of the change and should not be estimated as a token swap.

- **Collision with Groups 19, 20 and 8, all of which touch this surface.** →
  Strict ordering after Group 19, and the overlap table in `proposal.md`. Under
  C-00 this is one owned session at a time; this change must not start while a
  Control Center group is in flight.

- **The literal-free check could become a rule nobody can satisfy, inviting a
  long exemption list that means nothing.** → The list fails in both directions
  and is reviewed as a deliverable in its own right. If it grows past a few
  structural entries, the scale is wrong and the scale is what should change.

- **`#5d7286` clears 3:1 by 0.19 on `--surface-raised`.** → The ratio is
  computed by the check against the pair actually rendered, not asserted once
  here; if a control lands on a lighter surface the check fails and the token,
  not the check, is adjusted.

- **A 12px floor is a judgement, not a standard.** → WCAG sets no minimum, so
  this is a stated product decision. It is recorded in the token block with its
  reason so it can be revisited as a decision rather than discovered as a
  constant.

## Migration Plan

No data, schema, route or contract changes, so there is nothing to migrate and
no rollback beyond reverting the commits. The order within the change is:

1. Token block complete (all six dimensions; the three undefined tokens
   defined) with the integrity guard, negative-probed. This alone fixes the
   1.08:1 defect.
2. Static guards for literals and scale usage, with the stylesheet converted
   view by view until they pass.
3. Type floor guard, then the restyle work the raised floor forces.
4. Viewport matrix and the boundary-contrast check.
5. Registration, digest refresh, `validation:universe`, then certification.

Step 1 is independently valuable and independently shippable; if the change is
cut short, it is the part to keep.

## Open Questions

- **Does the owner want the micro-label layer uppercase with tracking, or
  sentence-case at 12px?** The former preserves the current density signal and
  matches both references; the latter is plainer. Affects roughly thirty
  declarations. Default if unanswered: uppercase with tracking.
- **Should `--surface-muted`, `--ready` and `--warning` survive as aliases or
  should their three call sites be rewritten to the underlying tokens?** Both
  satisfy the guard (D1). Default if unanswered: rewrite the call sites and do
  not add aliases, so the palette has one name per value.
- **Which breakpoints are *declared*?** The stylesheet has 1080/820/560; the
  matrix should also cover the range above 1080 and, if the console is ever
  opened on a phone, something near 380. Default if unanswered: 1440, 1080,
  820, 560, 380.
