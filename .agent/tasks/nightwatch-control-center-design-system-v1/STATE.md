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

Milestone ID: G1 — rebaseline and activation
Milestone status: COMPLETE_LOCAL
What is being attempted: the parked change is activated under explicit owner
authorization, an owned C-00 session is claimed at `efd1dc5c`, and every figure
in the historical audit has been re-measured at the live SHA with the
contradictions recorded rather than copied.

## Completed Milestones

- **G1 COMPLETE_LOCAL — rebaseline and activation.** The change was parked
  2026-09-14 with the unblock condition "a fresh owner authorization opens its
  own campaign task and session"; that authorization was given 2026-09-18 and
  this task and session are it. Session
  `nightwatch-control-center-design-5eb78e61` claimed at `efd1dc5c`,
  `session:status` verdict PASS, canonical checkout is not the implementation
  worktree. UI baseline at the starting SHA: typecheck PASS, 88 tests PASS,
  build PASS (323,180 js / 28,262 css).

  The audit was re-measured and one finding is genuinely DEAD: D-01's three
  undefined tokens (`--surface-muted`, `--ready`, `--warning`) are neither
  defined nor referenced, so the 1.08:1 `.review-action` defect is NOT
  reproducible here and this change must not claim to fix it. What survives is
  the missing GUARD. A structural change the audit predates: `App.tsx` is 351
  lines with nine views in `src/views/`, so every `App.tsx:NNNN` reference in
  the audit is stale, and the change's own precondition (group 19.11
  integrated) is satisfied.

  D-02, D-03, D-04 and D-05 are all STILL PRESENT and were re-measured
  exactly; two figures moved upward (36 distinct hex literals, was "~25"; 50
  `rgba()` occurrences, was 47).

## Work In Progress

Group 2 — the token block and its integrity guard — is next.

## Exact Next Action

Declare the complete token block in `ui/control-center/src/styles.css`
(colour, typography, spacing, radius, elevation, motion), add
`--border-interactive: #5d7286` (measured 3.81 / 3.52 / 3.19 / 3.59 against
`--bg` / `--surface` / `--surface-raised` / `--surface-soft`, every pair over
3:1), then write the token-integrity guard that fails an undefined referenced
property and a `var()` fallback whose literal differs from its token's defined
value — asserting a non-zero reference count before any other assertion — and
negative-probe it in both directions.

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
