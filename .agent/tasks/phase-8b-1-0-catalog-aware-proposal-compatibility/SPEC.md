# Phase 8B.1.0 — Catalog-Aware Synthetic Proposal & Test-Baseline Compatibility — SPEC

Task ID: `phase-8b-1-0-catalog-aware-proposal-compatibility`
Title: Nightwatch Phase 8B.1.0 — Catalog-Aware Synthetic Proposal & Test-Baseline Compatibility Closeout
Status: IN_PROGRESS

## Owner authorization

`PHASE_8B_1_0_COMPATIBILITY_REPAIR_ONLY`. This authorization is ONLY for
repairing the structural compatibility blocker that prevented the first real
Phase 8B.1 canonical promotion from being committed. It does NOT authorize:
another canonical promotion, another canonical APPLY, another owner approval,
reuse of the consumed approval, a second canonical catalog write, runtime Git
mutation, Alphaus repository mutation, product traffic, database/
infrastructure work, AI/model execution, or publication.

## Mission

Nightwatch needs a small bounded deterministic portfolio of genuinely
distinct safe synthetic proposal semantics, and its historical test suites
must stop accidentally using "whatever is in the live canonical adopted-case
catalog" as an implicit fixture. The production synthetic pipeline must choose
the first currently-novel portfolio candidate relative to the live adopted
catalog; the tests must explicitly state which adopted-catalog state they are
proving (EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE / EXHAUSTED). Portfolio
exhaustion must be a valid, non-failing terminal state
(`passCandidateCount = 0`, `futureReviewEligible = false`).

The end state must make a FUTURE fresh Phase 8B.1 promotion attempt possible,
but that retry requires a separate owner authorization after this task.

## Portfolio (frozen intent)

Version: `nightwatch.selfdev-synthetic-portfolio.v1` (exact name per repo
conventions). Fixed ordered portfolio:

1. `EXPAND_SUMMARY` (A) — actionIds `['selfdev.synthetic.expand-summary']`,
   final state `selfdev.state.expanded.v1`, terminal transition
   `READ_ONLY_EXPANSION`. This formalizes the existing default candidate with
   unchanged semantics.
2. `EXPAND_THEN_COLLAPSE` (B) — actionIds
   `['selfdev.synthetic.expand-summary', 'selfdev.synthetic.collapse-summary']`,
   final state `selfdev.state.ready.v1`, terminal transition
   `READ_ONLY_COLLAPSE`. Distinct coverage: collapse classes
   `state-action:expanded:selfdev.synthetic.collapse-summary` and
   `transition:expanded-read-only-collapse` remain novel after A is adopted.

No third candidate. Portfolio exhaustion is the intended terminal condition
after both are adopted. No new registry action is added.

## Selection (frozen intent)

One pure deterministic selector, `selectNextSyntheticProposalVariant({adoptedEquivalentFingerprints, adoptedCoverageClasses})`,
that: iterates the fixed portfolio in fixed order; derives each variant's
semantic fingerprint and action-derived coverage from the trusted registry
(never candidate coverageClaims); requires BOTH fingerprint-not-adopted AND
at least one coverage class not covered by baseline+adopted; returns the first
novel variant or EXHAUSTED/null. Selection MUST NOT depend on
`baseNightwatchSha`, `seed`, `createdAt`, or `candidateId`.

## Replay fixtures (frozen intent)

New concrete fixtures `VALID_MATRIX_EXPAND` and `VALID_MATRIX_EXPAND_COLLAPSE`
in the proposer. Historical `VALID_MATRIX` remains a fixed expansion matrix
for direct proposer calls and historical artifacts. The CONTROLLER resolves
omitted/`VALID_MATRIX` fixture requests to a concrete portfolio member before
creating the replay descriptor; the persisted descriptor always names the
concrete fixture. Matrix shape stays 3: `[selected-valid, semantic-duplicate-
of-selected, unsafe]`; the duplicate duplicates the SELECTED member.

## Schemas (frozen intent)

No candidate/evaluation/session/replay-descriptor schema shape changes.
Replay descriptor fixture enum gains the two concrete values only. Replay
algorithm version unchanged (replay still regenerates the concrete recorded
fixture and evaluates it exactly). Contract manifest gains the portfolio
binding; manifest version decision (v1→v2) documented with evidence.

## Test baselines (frozen intent)

One centralized test-only source-fixture mechanism (temp source trees / temp
Git repos rendered with explicit catalogs via the real renderer and
validators): states EMPTY, EXPAND_ONLY, EXPAND_AND_COLLAPSE. No production
catalog-bypass switch, no env-var bypass, no monkey patching, no mutation of
imported global arrays, no module-cache leakage, no replay/eligibility
inconsistency between evaluation and replay within one test harness. Temp
checkouts stay clean/committed so digests and HEAD are coherent.

## Non-goals (explicitly out of scope)

No real canonical promotion prepare/approve/apply; no new approval; no reuse
of the spent approval; no `--variant`/`--candidate-slot`/`--empty-baseline`
production CLI options; no third portfolio variant; no new synthetic action;
no weakening of duplicate/eligibility/provenance rules; no historical artifact
rewrite; no AI/model/product/DB/infra/publication/Alphaus activity.
