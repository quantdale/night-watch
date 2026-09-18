# Task State

## Identity

Task ID: nightwatch-control-center-design-system-v1
Phase: CONTROL_CENTER_DESIGN_SYSTEM_V1
Status: IN_PROGRESS
Starting SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
Branch: session/nightwatch-control-center-design-5eb78e61
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: efd1dc5c81a55db00e7698257c8b49b51a6703c5
LAST_VALIDATED_IMPLEMENTATION_SHA: faacf8262dea0c6a42bf03242d5d1c44d6f70e9e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: faacf8262dea0c6a42bf03242d5d1c44d6f70e9e
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_DESIGN_SYSTEM_V1_STATUS: IN_PROGRESS

## Objective

Give the Control Center one design system, applied across all nine views, with
its integrity mechanically enforced so the measured drift cannot silently
return. Full intent in `SPEC.md`; execution order in `PLAN.md`.

## Current Milestone

Milestone ID: G8 — certification
Milestone status: IN_PROGRESS
What is being attempted: differential certification against the base failure
set, strict OpenSpec validation, documentation reconciliation, integration by
fast-forward push, the report, and session release. G1 through G7 are closed.

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

G8 certification: the differential evidence is captured below; integration,
report and release remain.

## Exact Next Action

Integrate by fast-forward push through the session CLI, verify
`HEAD == origin/main`, then release and remove the session.

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

Read `SPEC.md`, then `PLAN.md`, then this file, then the change's `audit.md`
rebaseline section. Verify the session with `node bin/nightwatch-session.mjs
status`. Continue from `## Exact Next Action`.

## Completion Snapshot

Not complete. G1 of 8 groups is closed; groups 2–8 remain.
