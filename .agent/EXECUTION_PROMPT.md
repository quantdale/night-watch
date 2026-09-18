# EXECUTION PROMPT — Nightwatch Control Center design system

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: IN_PROGRESS
Campaign ID: nightwatch-control-center-design-system-v1
OpenSpec: openspec/changes/nightwatch-control-center-design-system-v1/
Planned-From: efd1dc5c81a55db00e7698257c8b49b51a6703c5
Target Branch: main
Predecessor Task ID: nightwatch-control-center-style-and-absence-truth-v1
Predecessor Status: COMPLETE

## Mission

Give the Control Center ONE design system, applied across all nine views, and
make the system's integrity mechanically enforced so it cannot decay back into
the drift the audit measured.

The change was parked 2026-09-14 with an explicit unblock condition — "a fresh
owner authorization opens its own campaign task and session for this change" —
and was ACTIVATED 2026-09-18 when that authorization was given.

## Scope

`ui/control-center/**`, `tests/browser/controlCenterBrowser.browser.ts` and its
viewport matrix, `tests/browser/helpers/accessibility.ts`,
`config/validation-universe.v1.json` lane registration, this change's OpenSpec
artefacts, `.agent/tasks/nightwatch-control-center-design-system-v1/` and
Nightwatch docs.

No route, adapter, contract, bound, sanitizer, authority or dependency change.
No new runtime dependency, CSS framework, icon set, chart library or light
theme. No rebrand: the blue-black `#0b1118` base and amber `#e4a853` accent are
Nightwatch's identity and are preserved.

## Ordered workstreams

1. Rebaseline and activation — re-measure every audit figure at the live SHA
   and record the contradictions rather than copying them.
2. Token block and integrity guard — colour, typography, spacing, radius,
   elevation, motion; every referenced property defined; every `var()` fallback
   equal to its token.
3. Literal-free stylesheet — no palette, size, radius or spacing literal
   outside the token block except a declared structural exemption that fails in
   BOTH directions.
4. Type floor and the restyle it forces — a 12px rendered floor, measured on
   computed `font-size` in the browser lane.
5. Responsive truth — nine views at 1440 / 1080 / 820 / 560 / 380; no
   horizontal page scroll, no clipped control, posture visible at every width.
6. Interactive boundary contrast — 3:1 for controls whose outline is their sole
   affordance, measured against the rendered backdrop.
7. Registration and validation.
8. Certification, integration and release.

## Constraints

LOCAL only. Sibling repositories remain read-only. No production, DEV or NEXT
contact; no network egress; no credentials; no sibling writes. C-00 governs:
one owned session worktree, fast-forward integration, never force-push. No
quality gate is weakened and no exemption list grows without a written reason —
the target is a shorter list, not a longer one.

## Validation

`npm --prefix ui/control-center run typecheck|test|build`; `npm run typecheck`;
`node bin/hardening-check.mjs`; `npm run validation:universe`;
`npm run control-center:ui:browser` including the viewport matrix; every new
guard negative-probed and restored; `npm run gate:local`; `npm test`; and
`openspec validate nightwatch-control-center-design-system-v1 --type change
--strict`.

## Acceptance and completion gates

Certification is DIFFERENTIAL. `gate:local` and `npm test` are red at the base
checkpoint for a reason outside this campaign — the sibling `ripple-api`
checkout has advanced past the Phase 5 pinned SHA — so the requirement is an
IDENTICAL failure set to base plus green UI and browser lanes. A green gate is
neither claimed nor engineered, and the gate is not weakened to produce one.

## Git and reporting

Commit logically per workstream with evidence in the message; integrate by
fast-forward push to `origin main` through the session CLI; verify
`HEAD == origin/main`; write `REPORT.md` with residual work, defaults taken and
honest limits; release the session and leave the canonical tree clean.
