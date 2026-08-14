# Nightwatch Phase 8A.1.1 — Future Review Eligibility Gate Closeout

Status: `FROZEN INTENT`
Frozen: 2026-08-15

## Objective

Close the confirmed gap between "this self-development artifact is
authentic/current/replay-valid" and "this self-development artifact actually
contains at least one candidate eligible to enter a future controlled
review/adoption design." Those are proven distinct today: a replay-valid,
source-attested, `VERIFIED_EXACT_BASE` artifact can have zero pass candidates,
and the current `isFutureReviewPrerequisitePass` returns `true` for it anyway.

This is a narrow read-only eligibility-layer fix. It adds no adoption
authority, no source/Git-mutation authority, and no Phase 8B capability.
Phase 8B remains `NOT_STARTED` throughout and after this task.

## Confirmed defect

`src/core/selfDev/trust.ts` `isFutureReviewPrerequisitePass(assessment)`
returns `true` whenever `trustStatus` is `VERIFIED_EXACT_BASE` or
`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`, without requiring
`replayStatus === 'PASS'` or `passCandidateCount > 0`. A replay-valid artifact
built from an ordinary deterministic zero-pass proposer fixture (e.g.
`UNSAFE_ACTION`, which yields exactly one candidate rejected as
`REJECTED_UNKNOWN_ACTION`) is provenance/trust valid and replay `PASS`, with
`passCandidateCount = 0`, yet the current helper reports the prerequisite as
satisfied. No test currently exercises `isFutureReviewPrerequisitePass` at
all, and it has zero runtime call sites (`selfdev-synthetic.mjs` and
`selfdev-verify.mjs` both call `assessSelfDevArtifactIntegrity` directly and
never call the prerequisite helper).

## Required outcome

One canonical, fail-closed eligibility contract such that a future Phase 8B
cannot confuse artifact integrity with candidate eligibility.

Eligibility requires all of:

1. current-source trust is `VERIFIED_EXACT_BASE` or
   `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT`;
2. `sourceBundleMatch === 'MATCH'` and `contractDigestMatch === 'MATCH'`
   (defense in depth against a hand-forged assessment DTO whose trust status
   contradicts its own match fields);
3. `replayStatus === 'PASS'`;
4. `passCandidateCount` is a genuine positive integer (`Number.isInteger`,
   `> 0`) — `NaN`, `Infinity`, negative, and non-integer values are rejected
   at runtime, not merely by TypeScript's compile-time type;
5. the Phase 8A no-authority invariants remain intact on the assessment
   (`adoptionStatus = NOT_AUTHORIZED_PHASE_8A`, `publication = PROHIBITED`,
   `sourceWrites = gitWrites = externalCalls = 0`);
6. a canonical current-source-aware gate additionally regenerates the pass
   candidates via replay and requires the regenerated count to agree exactly
   with the assessment's `passCandidateCount` — it never takes `Math.min()`
   or silently reconciles a disagreement.

`VERIFIED_EXACT_BASE`/`VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` themselves are
NOT redefined to mean "contains an eligible candidate" — a zero-pass artifact
remains genuinely provenance/trust valid; it is simply future-review
ineligible. This is an additive layer, not a change to Phase 8A.1 trust
semantics.

## Architecture decision

Three existing surfaces:

- `assessSelfDevArtifactIntegrity` — derives current-source provenance/trust;
  knows current Git/source state; returns `passCandidateCount`.
- `verifiedPassCandidates` (in `replay.ts`) — performs deterministic replay
  and regenerates pass candidates; does **not** itself prove current-source
  equivalence (it operates purely on the artifact's own persisted content).
- `isFutureReviewPrerequisitePass` — consumes only a derived trust assessment;
  had the zero-pass defect.

`verifiedPassCandidates` has no external runtime callers (only test
callers) and existing deterministic replay tests depend on its current
signature/behavior. Per the task's explicit guidance not to break existing
tests for aesthetic churn, it is kept as-is with strengthened documentation
of its replay-only scope, rather than renamed or removed. The fix instead adds
one new canonical export, `assessFutureReviewEligibility(value, current)`, in
`trust.ts`, which:

1. always derives its own trust assessment via `assessSelfDevArtifactIntegrity`
   (the `current` source view is a required parameter — a future Phase 8B
   consumer cannot obtain an eligibility verdict while skipping
   source-currentness by calling a replay-only helper instead);
2. applies the corrected `isFutureReviewPrerequisitePass` prerequisite;
3. on prerequisite failure, returns `{ eligible: false, assessment,
   candidates: [] }` — it never throws for an ordinary ineligible artifact,
   so callers get a stable structured non-eligible result;
4. on prerequisite pass, regenerates candidates via `verifiedPassCandidates`
   and cross-checks the regenerated count against
   `assessment.passCandidateCount`; a disagreement fails closed
   (`eligible: false`), it is never silently reconciled.

This keeps exactly one authoritative source-aware future-review candidate
gate (`assessFutureReviewEligibility`) while leaving the lower-level
provenance (`assessSelfDevArtifactIntegrity`) and replay-only
(`verifiedPassCandidates`) primitives available for their existing internal
and test uses, now documented as non-authoritative on their own.

## Contract/versioning decision

No new persisted schema or contract-version constant is introduced.
`src/core/selfDev/trust.ts` is already a member of
`SELFDEV_AUTHORITATIVE_PATHS` (`provenanceManifest.ts`), so any change to
eligibility logic in this file automatically changes `sourceBundleDigest` —
the existing dual-bound provenance model already gives eligibility-logic
changes exactly the detectability property they need. `contractDigest` binds
the declared evaluator/schema/budget/registry/replay-algorithm contract, which
this task does not change. Eligibility is a read-only downstream consumer of
an already-computed trust assessment, not part of the evaluator's semantic
contract, so it does not need its own version constant.

## Non-goals

No Phase 8B, no adoption authority, no source/patch/candidate mutation
authority, no runtime Git write authority, no publication authority, no
AI/model authority, no browser/product/API authority, no database/
infrastructure authority. No historical artifact is rewritten or migrated.
