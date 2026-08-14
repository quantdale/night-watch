# Phase 8A.1.1 — Report

Status: COMPLETE

## Summary

Closed the confirmed gap between "this self-development artifact is
authentic/current/replay-valid" and "this self-development artifact contains
at least one candidate eligible to enter a future controlled review/adoption
design." A replay-valid, source-attested `VERIFIED_EXACT_BASE` artifact built
from an ordinary zero-pass proposer fixture (`UNSAFE_ACTION`) had
`passCandidateCount = 0` yet the pre-fix `isFutureReviewPrerequisitePass`
returned `true` for it — reproduced as a true positive against a synthetic
temporary Git checkout before any fix landed.

## What changed

- `isFutureReviewPrerequisitePass` (`src/core/selfDev/trust.ts`) now requires
  `replayStatus === 'PASS'`, a runtime-validated genuine positive-integer
  `passCandidateCount`, matching `sourceBundleMatch`/`contractDigestMatch`,
  and intact `adoptionStatus`/`publication`/zero-counter invariants — not only
  the trust status.
- New `assessFutureReviewEligibility(value, current)` in `trust.ts`: the one
  canonical, source-currentness-aware future-review candidate gate. `current`
  is a required parameter; it always derives its own assessment and, only on
  prerequisite pass, cross-checks replay-regenerated candidates against the
  assessment's pass count, failing closed on disagreement.
- New `SelfDevFutureReviewEligibility` type (`types.ts`); new export from
  `index.ts`.
- `verifiedPassCandidates` (`replay.ts`) kept as-is (no runtime callers,
  existing tests depend on it) with a strengthened doc comment stating it is
  replay-only, not the future-review authority.
- New `bin/hardening-check.mjs` assertion enforcing the gate's existence,
  runtime pass-count validation, and required current-source parameter.
- New `tests/unit/selfDevEligibility.test.ts` (15 tests) and a new CI step
  in `.github/workflows/hardening.yml`.
- No new persisted schema/contract version; `docs/CURRENT_STATE.md`,
  `docs/ROADMAP.md`, `docs/DECISIONS.md` (D-46) updated.

## Validation

577/577 full Playwright (up from 562; 15 new eligibility tests), typecheck,
hardening, `agent:check`, 27/27 synthetic campaign, `git diff --check`, an
isolated full-history clone (86/86 focused tests + full gate), and exact CI
run `31847511710` (green, eligibility step executed 15/15).

## Acceptance artifact

`session:sha256:0cdcbb79062e93582db244feb6321c85398c323243f6cba53fbc071ecc1deff4`
bound to `d33a8c1cc062b435a7b2bc4f69567286dd56ebb4`: `VERIFIED_EXACT_BASE`,
replay `PASS`, one pass/one duplicate/one rejected candidate, `eligible: true`
with one regenerated candidate via the new gate. Historical Phase 8A.1
artifact untouched.

## Boundaries preserved

No adoption authority, no source/patch/candidate mutation authority, no
runtime Git write authority, no publication authority, no AI/model authority,
no browser/product/API authority, no database/infrastructure authority.
Phase 8B remains `NOT_STARTED`. No historical artifact rewritten. All pushes
were fast-forward; no force-push.

See `SPEC.md` for frozen intent and `STATE.md` for the full milestone-by-
milestone ledger.
