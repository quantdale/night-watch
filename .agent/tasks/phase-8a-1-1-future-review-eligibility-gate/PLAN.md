# Phase 8A.1.1 — Plan

Living document. Update as milestones complete.

## M1 — Task initialization (docs only)

Create SPEC/PLAN/STATE/REPORT and update `.agent/ACTIVE_TASK.md`. No source
change. Starting SHA `7a59b9a6a76d5213b938383fea14a773c5282a30`.

## M2 — Reproduce the defect (true positive) before fixing it

Add a focused regression against the unfixed `isFutureReviewPrerequisitePass`
proving simultaneously: `validateSessionArtifact` succeeds; `replaySession`
returns `PASS`; `assessSelfDevArtifactIntegrity` returns `VERIFIED_EXACT_BASE`
with `replayStatus: PASS` and `passCandidateCount: 0`; and the pre-fix helper
still returns `true`. Use the `UNSAFE_ACTION` synthetic fixture (one
candidate, rejected as `REJECTED_UNKNOWN_ACTION`) against a synthetic
temporary Git repository for `LOCAL_GIT_SOURCE_ATTESTED` provenance. Establish
a `VALID_MATRIX` positive control (`passCandidateCount = 1`, one regenerated
pass candidate). Record the exact pre-fix result in `STATE.md`.

## M3 — Implement the minimal correct eligibility contract

- Strengthen `isFutureReviewPrerequisitePass` in `trust.ts`: require
  `replayStatus === 'PASS'`, `sourceBundleMatch`/`contractDigestMatch ===
  'MATCH'`, a genuine positive-integer `passCandidateCount`
  (`Number.isInteger(...) && ... > 0`, not just non-zero), and the Phase 8A
  no-authority invariants (`adoptionStatus`, `publication`,
  `sourceWrites`/`gitWrites`/`externalCalls`).
- Add `assessFutureReviewEligibility(value, current)` in `trust.ts`: always
  derives its own assessment (current source view is a required parameter),
  applies the corrected prerequisite, and — only on pass — regenerates
  candidates via `verifiedPassCandidates` and cross-checks the regenerated
  count against `assessment.passCandidateCount`, failing closed on
  disagreement.
- Export `assessFutureReviewEligibility` from `src/core/selfDev/index.ts`.
- Strengthen the JSDoc on `verifiedPassCandidates` (`replay.ts`) to state
  explicitly that it is replay-only and not the future-review authority.
- No change to `assessSelfDevArtifactIntegrity`, `VERIFIED_EXACT_BASE`/
  `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` semantics, persisted schemas, or the
  contract manifest.

## M4 — Adversarial test matrix

Extend `tests/unit/selfDevProvenance.test.ts` (or a new
`tests/unit/selfDevEligibility.test.ts`) covering: zero-pass exact base;
zero-pass documentation descendant; valid-matrix exact base (positive);
valid-matrix documentation descendant (positive); replay-tamper; source-bundle
mismatch; contract-digest mismatch; dirty authoritative source; unrelated
baseline; legacy v1; malformed pass counts (`-1`, `NaN`, `Infinity`, `0.5`,
absent field); forged positive count with bad replay status; forged verified
trust status with mismatched match fields; count-agreement cross-check;
zero-candidate-authority-on-failure; zero side effects.

## M5 — Public export / authority-surface review

Re-run the exact-usage search for `isFutureReviewPrerequisitePass`,
`verifiedPassCandidates`, `assessSelfDevArtifactIntegrity`,
`SelfDevTrustAssessment`. Confirm no Phase 8B code exists and no runtime
caller can obtain candidates while skipping current-source trust.

## M6 — Hardening

Add a narrow `bin/hardening-check.mjs` assertion that the canonical gate
exists and that the prerequisite validates the pass-count shape at runtime
(not only via TypeScript types).

## M7 — Validation

Focused eligibility tests → existing selfDev provenance/schema/CLI tests →
typecheck → hardening → `agent:check` → synthetic campaign → full Playwright
→ `git diff --check`.

## M8 — CI wiring

Confirm/extend `.github/workflows/hardening.yml` so the eligibility matrix is
unmistakably exercised remotely (extend the existing Phase 8A.1 step rather
than inventing unnecessary parallel structure, if that reads cleanly).

## M9 — Substantive commit + push + verify

Commit implementation + tests + CI. Push. Verify `HEAD == origin/main`.

## M10 — Isolated full-history checkout validation

Fresh clone at the substantive SHA, `npm ci --ignore-scripts`, focused +
typecheck + hardening + agent-state + synthetic campaign + diff check.

## M11 — Observe CI at substantive SHA

Confirm the exact GitHub Actions run passes and executes the eligibility
step.

## M12 — New Phase 8A.1.1 acceptance artifact

After the substantive commit, on a clean checkout, run
`npm run selfdev:synthetic` to produce a new v2 artifact bound to the new
implementation SHA; verify `VERIFIED_EXACT_BASE`, replay `PASS`,
`passCandidateCount > 0`, and (via the new gate) `eligible: true`. Do not
touch the historical Phase 8A.1 acceptance artifact.

## M13 — Documentation closure

Update `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` (new
decision entry), `.agent/ACTIVE_TASK.md`, `STATE.md`, `REPORT.md`. Commit
docs-only. Push. Re-verify the acceptance artifact reads
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` against the new HEAD with the same
source bundle digest and replay `PASS`.

## M14 — Final report

Produce the completion report per the owner's required format. Stop; do not
begin Phase 8B.
