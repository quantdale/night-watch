# Task State

## Identity

Task ID: nightwatch-control-center-design-system-v1
Phase: CONTROL_CENTER_DESIGN_SYSTEM_V1
Status: COMPLETE
Starting SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
LAST_VALIDATED_IMPLEMENTATION_SHA: 1fc8eb6d4cd2cde22d6c65647538123d0457af26
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 1fc8eb6d4cd2cde22d6c65647538123d0457af26
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_DESIGN_SYSTEM_V1_STATUS: COMPLETE

## Objective

Give the Control Center one design system, applied across all nine views, with
its integrity mechanically enforced so the measured drift cannot silently
return. Full intent in `SPEC.md`; execution order in `PLAN.md`.

## Current Milestone

COMPLETE — all eight milestone groups are closed and the work is integrated.

Milestone ID: G8 — certification
Milestone status: COMPLETE_LOCAL
What is being attempted: nothing further. The work is integrated at `2f45cfc4`
with `HEAD == origin/main` verified. Certification is DIFFERENTIAL and is
recorded as such: the `gate:local` receipt matches base group-for-group and
count-for-count, and `npm test` carries the base failure set exactly.

## Completed Milestones

- **G1 COMPLETE_LOCAL — rebaseline and activation.** The change was parked
  2026-09-14 with the unblock condition "a fresh owner authorization opens its
  own campaign task and session"; that authorization was given 2026-09-18 and
  this task and session are it. Session
  `nightwatch-control-center-design-5eb78e61` claimed at `efd1dc5c`. One
  finding is DEAD: D-01's three undefined tokens are neither defined nor
  referenced, so the 1.08:1 defect is NOT reproducible and is not claimed as
  fixed here. `App.tsx` is decomposed, so the audit's line references are stale.
  D-02/D-03/D-04/D-05 all still present and re-measured exactly.

- **G2 COMPLETE_LOCAL — token block and integrity guard.** 18 tokens -> 53
  across colour, an alpha ladder per hue, typography, spacing, radius, one
  overlay shadow and motion. All 14 `var()` fallbacks removed, including the 4
  that agreed with their token. `--border-interactive: #5d7286` at 3.81 / 3.52 /
  3.19 / 3.59 against the four surfaces. Probes UI-P1..UI-P3 DETECTED.

- **G3 COMPLETE_LOCAL — literal-free stylesheet.** 54 distinct colour literals
  across 69 occurrences -> 0. 84 font-sizes -> 7 steps. 37 radii across 12
  values -> 4 roles. 85 distinct spacing values -> 7 steps. 5 structural
  exemptions, each with a reason, failing in BOTH directions. The C-15c System
  Map block folded into the system. `--weight-normal` DELETED rather than given
  a contrived use. Probes UI-P4..UI-P9 DETECTED.

- **G4 COMPLETE_LOCAL — type floor.** All 49 declarations below 12px retired;
  the 7px graph label and 8px breakpoint pill are gone. Micro labels resolved to
  uppercase + 0.08em. The floor is measured on COMPUTED font-size in the browser
  lane with the value read from `--text-floor-px`. The raised floor broke real
  layouts and they were reworked, not reverted.

- **G5 COMPLETE_LOCAL — responsive truth.** 9 views x 5 widths = 45 cells. Four
  real layout defects found and fixed, including a scroll port left
  `position: static` whose absolutely-positioned `.sr-only` captions escaped the
  clip and slid the page sideways. Both D-04 posture removals repaired. The
  declared removal list guards in both directions and forbids a posture carrier
  ever appearing on the removal side. Probes MX-P1..MX-P3, RM-P1..RM-P3 DETECTED.

- **G6 COMPLETE_LOCAL — interactive boundary contrast.** Sole-affordance
  controls enumerated from the rendered DOM, measured against the first opaque
  backdrop, required to clear 3:1. Found three the manual pass missed
  (`.icon-button`, `.button-quiet`, `.button-secondary`, all 1.51:1) now at
  3.81:1. Structural dividers deliberately keep the quiet `--border`.

- **G7 COMPLETE_LOCAL — registration and validation.** `designSystem.test.ts`
  registered in `UI_LANE`, digest refreshed, and every pre-existing UI guard
  green with NO exemption list longer than before.

## Work In Progress

NONE. The campaign is COMPLETE and integrated at `2f45cfc4`.

## Exact Next Action

NONE for this campaign. Task 6.4 (focus-ring contrast at every declared width)
is CARRIED and named in `PLAN.md` under `## Deferred Work`; it needs its own
authorization. The sibling `ripple-api` re-admission under `## Blockers`
remains an owner action.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `openspec/changes/…/audit.md` | rebaseline appended; historical audit preserved verbatim | MODIFIED |
| `.agent/tasks/…/{SPEC,PLAN,STATE}.md` | park record replaced by the activated campaign record | MODIFIED |

## Validation Ledger

### G1 — measured at `efd1dc5c`, 2026-09-18

| Check | Result |
|---|---|
| `session:status` | PASS, `OWNED_SESSION`, base CURRENT, canonicalSafe |
| `npm --prefix ui/control-center run typecheck` | PASS |
| `npm --prefix ui/control-center run test` | PASS 88/88, 6 files |
| `npm --prefix ui/control-center run build` | PASS, 3 files, 352,259 bytes |
| token audit | 18 properties, 192 uses, 0 undefined, 0 unused |
| `font-size` audit | 84 declarations, 19 values, 49 below 12px, min 7px |
| literal audit | 36 distinct hex (53 uses), 37 distinct rgba (50 uses) |
| radius audit | 37 declarations, 12 distinct values |
| fallback audit | 14 fallbacks, 10 divergent across 3 forms |
| breakpoint audit | 1080 / 820 / 560 + reduced-motion; zero viewport in any lane |
| boundary contrast | `--border` 1.27–1.51:1 across the four surfaces |

## Decisions Made During This Task

- 2026-09-18 — D-01 is recorded DEAD rather than ticked. Tasks 2.2 and 2.7
  describe a repair that later work already made, so ticking them would claim
  work not done. The guard (2.4) stays fully in scope.
- 2026-09-18 — certification is DIFFERENTIAL. `gate:local` and `npm test` are
  red at base from sibling `ripple-api` SHA drift, outside this campaign; the
  requirement becomes an identical failure set plus green UI lanes, and a green
  gate is neither claimed nor engineered.

## Discoveries

- The 10 divergent `var()` fallbacks are INERT today because every token is
  defined. A rendered-contrast check therefore measures the correct amber and
  reports success while the sheet still carries a complete second light theme,
  one rename away from shipping. This is why the guard must be structural and
  read declared VALUES, not rendered ones.

## Blockers

- `gate:local` and the full offline regression cannot be green at this SHA.
  The sibling `ripple-api` checkout has advanced past the Phase 5 pinned SHA
  (`27bb007a` -> `4e3e200d`), failing 12 tests. Proven at `9fc763b3` on an
  unmodified tree. Owner action: re-derive and re-admit the affected
  real-source expectations; not self-authorizable under AGENTS.md Phase 9A.1.
  This blocks the LETTER of tasks 8.1/8.2 only; the campaign proceeds on a
  differential basis.

## Safety Events

NONE

## Deferred / Follow-Up

- Tasks 2.2 and 2.7 are moot at this SHA (see Decisions) and will be recorded
  as superseded rather than ticked.

## Resume Recipe

Task complete. Do not resume this campaign. Task 6.4 (focus-ring contrast at
every declared width) is CARRIED and a future task requires a separate fresh
owner authorization; the sibling `ripple-api` re-admission under `## Blockers`
is an owner action, not a continuation of this work.

## Completion Snapshot

COMPLETE and integrated at `2f45cfc4`, with `HEAD == origin/main` verified and
the session released through the session CLI.

All eight milestone groups are closed. 43 of 50 ledger boxes are ticked with
evidence; the seven that are not are recorded rather than quietly left open:
2.2 and 2.7 are SUPERSEDED (later work already made the repair they describe,
so ticking them would be false), 6.4 is CARRIED (focus is proven visible by the
keyboard walk, but that walk runs at one viewport), and 8.5–8.7 close with this
record.

Delivered: 53 design tokens across six dimensions, up from 18; zero colour
literals and zero `var()` fallbacks outside the token block, down from 54
distinct literals across 69 occurrences and 14 fallbacks of which 10 described
a second light theme; a 12px rendered type floor replacing 84 font-size
declarations across 19 values with 49 below it; four radius roles replacing 12
values; seven spacing steps replacing 85 distinct values; and the three
breakpoints RENDERED for the first time as a 9-view x 5-width matrix.

Five guards, all negative-probed against real source and restored: token
integrity, literal freedom, the declared breakpoint-removal list, the rendered
type floor, and the viewport matrix including interactive boundary contrast.
Fifteen probes, all DETECTED.

Certification is DIFFERENTIAL and is not claimed as green. `gate:local` at
`efdaef58` (receipt `receipt:sha256:4a1566a7937d540b78897ecf`) matches base
group-for-group and count-for-count; `npm test` is 5201 passed / 13 failed / 18
skipped against base 5198 / 12 / 18, and twelve of the thirteen are the base
failure set exactly. The thirteenth was introduced and fixed here.

This proves the system is APPLIED. It does not prove the result is well
designed, and `REPORT.md` says so.
