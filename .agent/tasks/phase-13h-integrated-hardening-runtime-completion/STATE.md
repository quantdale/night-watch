# STATE — Nightwatch Phase 13H — Integrated Hardening & Runtime Completion

## Identity

Task ID: phase-13h-integrated-hardening-runtime-completion
Phase: 13H-INTEGRATED-HARDENING-RUNTIME-COMPLETION
Status: NONE
Starting SHA: ae0f9ca706b6af4ca879873f8cd9b0ecada40251
Last validated implementation SHA: ae0f9ca706b6af4ca879873f8cd9b0ecada40251
Last substantive checkpoint SHA: ae0f9ca706b6af4ca879873f8cd9b0ecada40251
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD
Authorization class: NOT_GRANTED_AT_SPEC_PUBLICATION

## Objective

Finish the missing Phase 13 semantic/replay runtime integration and then harden C1+C2+C3 as one integrated local/source-only surface.

## Established starting evidence

- Overnight C1 implementation: `2aab111639ebcfa018d56adb62bce84f01ee4a71`.
- Overnight C2 implementation: `e0941aa3242f2af3665316ee3c6b859dcf2f5cf7`.
- Overnight C3 implementation: `967ef7afee02f3877b20193ecac83432ce778055`.
- Overnight docs/handoff closure: `ae0f9ca706b6af4ca879873f8cd9b0ecada40251`.
- Typecheck/diff checks passed during the overnight batch; complete hardening/full regression intentionally NOT_RUN.
- One Phase 12 stale-source semantic test is known failing under the stricter C1 coherence matrix.
- Current active task remains the overnight Phase 13 task until this Phase 13H authority is explicitly granted.

## Independent review findings to reproduce

- campaign semantic candidates still appear to use protocol clustering + historical triage/dossier-v1 promotion;
- real replay helpers appear able to return reproduced-failure evidence from structural validation without an executor run;
- real adapter replay appears not to make replay-plan v2 occurrence identity load-bearing;
- semantic bundle appears not to enforce top-level mapping cross-field equality;
- continuity PLAN structure currently has reported errors.

These are findings to reproduce, not pre-authorized conclusions to patch blindly.

## Current Milestone

M0 — NOT_STARTED. Waiting for exact owner authorization:

`PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`

## Work In Progress

NONE. Dormant hardening/runtime-completion specification only.

## Exact Next Action

STOP until owner authorization is supplied. Once authorized: fetch/fast-forward clean main, read the full Phase 13H package plus the original Phase 13 package and HARDENING_HANDOFF, transition this task to IN_PROGRESS, make it active, and execute M0 pre-fix reproductions.

## Blockers

Implementation authority not yet granted.

GitHub Actions may also remain externally billing/spending-limit blocked, but that does not prevent authorized local hardening once this task starts.

## Safety Events

NONE

## Deferred / Follow-Up

- Phase 13B contained DEV: NOT_AUTHORIZED.
- Phase 11B: NOT_AUTHORIZED.
- Real campaign: NOT_AUTHORIZED.
- Phase 6/data/infra: frozen/out of scope.

## Resume Recipe

Task not started. Do not implement without the exact owner token. After authorization, read SPEC/PLAN/ACCEPTANCE_MATRIX and live source before changing anything.

## Completion Snapshot

Not complete.

```text
PHASE_13H_STATUS: NONE
PHASE_13_RUNTIME_COMPLETION: NOT_VERIFIED
PHASE_13_HARDENING: NOT_STARTED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```