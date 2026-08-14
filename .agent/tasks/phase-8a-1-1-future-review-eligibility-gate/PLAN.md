# Nightwatch Phase 8A.1.1 — Living ExecPlan

Task ID: phase-8a-1-1-future-review-eligibility-gate

## Purpose

Close the confirmed gap between "this self-development artifact is
authentic/current/replay-valid" and "this self-development artifact contains
at least one candidate eligible to enter a future controlled review/adoption
design." See `SPEC.md` for the frozen intent and confirmed defect.

## Starting State

Starting SHA `7a59b9a6a76d5213b938383fea14a773c5282a30`. Phase 8A.1 is
historically `COMPLETE`. Phase 8B remains `NOT_STARTED`. Working tree clean;
local `HEAD` and `origin/main` both equal the starting SHA at task open.

## Scope

`src/core/selfDev/trust.ts` (`isFutureReviewPrerequisitePass`, new
`assessFutureReviewEligibility`), `src/core/selfDev/types.ts` (new
`SelfDevFutureReviewEligibility`), `src/core/selfDev/replay.ts` (doc comment
only), `src/core/selfDev/index.ts` (export), `bin/hardening-check.mjs`
(narrow authority-boundary assertion), `.github/workflows/hardening.yml` (CI
wiring if not already sufficient), and focused regression tests.

## Non-Goals

No Phase 8B, no adoption authority, no source/patch/candidate mutation
authority, no runtime Git write authority, no publication authority, no
AI/model authority, no browser/product/API authority, no database/
infrastructure authority. No historical artifact rewritten.

## Safety Constraints

Read-only eligibility layer only. Zero source/Git/external-call authority
added anywhere in this task's code paths. All Phase 8A no-authority
invariants (`adoptionStatus`, `publication`, zero counters) remain intact and
are defensively re-checked by the corrected prerequisite.

## Architecture / Approach

`assessFutureReviewEligibility(value, current)` in `trust.ts` is the one
canonical, source-currentness-aware future-review candidate gate: `current`
is a required parameter, it always derives its own trust assessment, applies
the corrected `isFutureReviewPrerequisitePass`, and — only on pass —
regenerates candidates via the existing `verifiedPassCandidates` and
cross-checks the regenerated count against `assessment.passCandidateCount`,
failing closed on disagreement. `verifiedPassCandidates` is kept as-is
(existing tests depend on it) with strengthened documentation that it is
replay-only, not the future-review authority. See `SPEC.md` for the full
architecture and contract/versioning decisions.

## Validation Strategy

Focused eligibility tests → existing selfDev provenance/schema/CLI tests →
typecheck → hardening → `agent:check` → synthetic campaign → full Playwright
→ isolated full-history checkout → `git diff --check` → remote CI at the
substantive SHA.

## Decision Log

- Kept `verifiedPassCandidates` exported as-is (no rename/removal) because it
  has existing test call sites and no runtime call sites; renaming would be
  aesthetic churn against explicit task guidance.
- No new persisted schema or contract-version constant: `trust.ts` is already
  in `SELFDEV_AUTHORITATIVE_PATHS`, so eligibility-logic changes already
  produce a new `sourceBundleDigest` without a separate version field.
- `isFutureReviewPrerequisitePass` defensively re-checks `sourceBundleMatch`,
  `contractDigestMatch`, `adoptionStatus`, `publication`, and the zero-counter
  invariants (not only `trustStatus`/`replayStatus`/`passCandidateCount`) so a
  hand-forged assessment DTO cannot claim eligibility via a hand-forged
  `trustStatus` alone.

## Discoveries

`isFutureReviewPrerequisitePass` had zero runtime call sites and zero
existing tests before this task (confirmed by repository-wide grep) — the
defect was real but entirely dormant; no CLI or production code path was
actually exposed to it.

## Deferred Work

None identified. Phase 8B (controlled candidate source adoption) remains a
separate, future, separately authorized task.

## Completion Criteria

All Phase 8A.1.1 acceptance criteria in `SPEC.md`/the owner's task brief are
met; see `REPORT.md` for the final verdict.

## Milestones

See `STATE.md` "Completed Milestones" / "Exact Next Action" for the current
live milestone ledger.
