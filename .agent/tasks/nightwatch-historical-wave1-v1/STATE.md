# Task State

## Identity

Task ID: nightwatch-historical-wave1-v1
Phase: HISTORICAL_WAVE1_V1
Status: COMPLETE
Starting SHA: aaf093420ab503039256ec283226f2d09185e152
Branch: session/nightwatch-historical-wave1-v1-15ad976d
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: aaf093420ab503039256ec283226f2d09185e152
LAST_VALIDATED_IMPLEMENTATION_SHA: 0fb23a1aa6a172a55070e98e7882cd3e954af38d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 0fb23a1aa6a172a55070e98e7882cd3e954af38d
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_HISTORICAL_WAVE1_V1_STATUS: COMPLETE

## Objective

Implement the owner-approved historical Wave 1 inside Nightwatch: NW-HIST-008
RELEASE_BRANCH_FRESHNESS (C6) first, then NW-HIST-005 CACHE_KEY_CONTRACT
Phase 1a report-only (C4), against the frozen planning corpus, with fixture-first
acceptance and no product contact, network, fetch, or universe change.

## Session Receipt

BASE_SHA: aaf093420ab503039256ec283226f2d09185e152
SESSION_BRANCH: session/nightwatch-historical-wave1-v1-15ad976d
SESSION_WORKTREE: owner-local C-00 worktree (nightwatch-historical-wave1-v1-15ad976d)
INITIAL_STATUS: CLEAN
C-00: session:status PASS before creation; start used the explicit approved
--base; claim --adopt succeeded. No remote operation. Integration and push are
NOT performed in this session.

## Current Milestone

COMPLETE — Wave 1 gate closure and session checkpoint.
Milestone ID: Wave 1 gate closure and session checkpoint
Milestone status: COMPLETE
What was completed: the Wave 1 checkpoint was committed on the session branch
and the authoritative `gate:local` passed 11/11 required groups at
`0fb23a1aa6a172a55070e98e7882cd3e954af38d` (receipt
`receipt:sha256:38b46ece948a41528805f50a`); the receipt and classification are
recorded in this documentation-descendant commit for owner review.

## Completed Milestones

- C6 pure core: `releaseFreshnessInventory.ts` validator (bounded rows, safe ref
  grammar, approved repo/root paths, exact-safe keys) and `releaseFreshness.ts`
  classifier with injected ancestry oracle, the owner-frozen verdict order,
  closed reason codes, and a timestamp-free `rfr:` digest. 11/11 focused tests
  green after two test-type repairs.
- C6 driver: `bin/release-freshness.mjs` — fixed-argv read-only Git
  (`rev-parse --verify`, `cat-file -e`, `merge-base --is-ancestor`), explicit
  child environment, bounded timeout/buffer, no fetch/checkout/mutation, report
  under `artifacts/release-freshness/`.
- Registrations: schema-lifecycle families for `nightwatch.release-refs` and
  `nightwatch.release-freshness-report`; validation-universe class entries for
  the suite and the bin; universe digest advanced to
  `sha256:3dd05486e8e79031f5f941f7`.
- Wave 1 gate closure: `npm run gate:local` 11/11 PASS at `0fb23a1a` after the
  owner-authorized temporary sibling-pin alignment; append-only header
  correction `CORR-H1-001` declared; acceptance receipt recorded.

## Work In Progress

None. Both detectors are implemented, registered, and focused-green; the C4
real pair remains `UNRESOLVED_EXACT_SYMBOLS` (no real contract declared,
real-pair execution disabled); the pre-existing launcher-contract drift was
repaired; the full `gate:local` battery passed 11/11. Owner review is the only
remaining step.

## Exact Next Action

Task complete. Owner review of the completed Wave 1 implementation and the
sanitized C4/C6 reports may follow. Do not integrate or push this branch, and
do not begin C4 Phase 1b or Wave 2 without fresh owner authorization; a
ripple-api `PHASE5_SOURCE_SHAS` advance is a separate future task with its own
source-diff review and expectation re-derivation.

## Files Changed

- `src/core/changeIntelligence/releaseFreshness.ts` (new)
- `src/core/changeIntelligence/releaseFreshnessInventory.ts` (new)
- `bin/release-freshness.mjs` (new)
- `tests/unit/releaseFreshness.test.ts` (new)
- `config/release-refs.v1.json` (new)
- `config/validation-universe.v1.json` (class entries + digest)
- `src/core/schemaLifecycle/declarations.ts` (two families)
- `.agent/tasks/nightwatch-historical-wave1-v1/{SPEC,PLAN,STATE}.md` (new)

## Validation Ledger

- `npm run typecheck`: PASS.
- `tests/unit/releaseFreshness.test.ts`: 11 passed / 0 failed.
- `tests/unit/cacheKeyContract.test.ts`: 27 passed / 0 failed.
- `tests/unit/cliImplementationContract.test.ts`: 40 passed / 0 failed (after
  repairing two pre-existing stale refusal-message expectations).
- `npm run schema:check`: PASS (393 families discovered / 370 declared / 102 persisted).
- `npm run validation:universe`: PASS (universe digest recomputed and recorded).
- `npm run hardening:check`: PASS.
- `npm run frontier:determinism`: PASS (1 unique digest across 20 fresh processes).
- `npm run test:semantic-compat`: PASS (2120/2107/13/0, skip policy PASS).
- `npm run test:unit`: 5130 passed / 18 skipped / 2 failed before the repair;
  focused re-run of the repaired suite green.
- `npm run gate:inventory`: PASS (report emitted).
- `npm run gate:local`: PASS — 11/11 required groups at
  `0fb23a1aa6a172a55070e98e7882cd3e954af38d` (receipt
  `receipt:sha256:38b46ece948a41528805f50a`).
- Focused re-run of the three sibling-pin suites after the temporary alignment:
  33 passed / 0 failed (`realSourceCanary`, `oracleExpectationRealSource`,
  `phase12CoverageInventory`).
- WAVE1_GATE_STATUS: PASS
- REQUIRED_SIBLING_PIN: 27bb007ad0c798800b6bd3b29760c966422966e7
- ENVIRONMENTAL_BLOCKER: RESOLVED_BY_TEMPORARY_OWNER_PIN_ALIGNMENT
- NIGHTWATCH_PIN_ADVANCE: NOT_PERFORMED
- NIGHTWATCH_IMPLEMENTATION_DIFF_CHANGED_FOR_BLOCKER: NO
- RIPPLE_API_SOURCE_MODIFIED: NO
- RIPPLE_API_TEMPORARILY_CHECKED_OUT: YES
- RIPPLE_API_FINAL_STATE_RESTORED: YES
- C6_IMPLEMENTATION_STATUS: COMPLETE
- C6_TEST_STATUS: FOCUSED_GREEN
- C6_HARDENING_STATUS: PASS
- C4_IMPLEMENTATION_STATUS: COMPLETE (Phase 1a report only)
- C4_TEST_STATUS: FOCUSED_GREEN
- C4_REAL_PAIR_STATUS: UNRESOLVED_EXACT_SYMBOLS

## Decisions Made During This Task

- The ouchan integration ref is declared as `refs/remotes/origin/master` (the
  repository's own change-intelligence convention for local observation of
  "master"): the local `refs/heads/master` checkout branch is stale (2026-08-07)
  and cannot answer the containment question honestly, while the tracking ref
  contains the fix. Missing `next`/`production` refs stay `REF_UNAVAILABLE`;
  Nightwatch never fetches to repair the environment.
- `servicePaths` for the real row are the two exact files the fix commit
  provably modified (`services/sapphired/trueunblended/fees.go`,
  `services/sapphired/trueunblended/fees_test.go`), taken from pinned local
  history — not inferred from naming.
- Verdict order follows the owner-frozen sequence exactly; declared model modes
  (deploy-from-integration, cherry-pick) are evaluated after release-ref
  resolution, so a missing ref is reported as `REF_UNAVAILABLE`, never hidden
  behind a declaration, and never becomes `STALE`.

## Discoveries

- `bin/hardening-check.mjs` enforces `checkBinExecutionCoverage` (every
  top-level bin needs a test that spawns it) and the CLI implementation
  contract (loader literal paths + generated declaration map).
- The frontier probe file contains a literal NUL byte (`parts.join('\0')`),
  which is why byte-oriented tooling detects it as binary; edits must preserve
  it exactly.
- The earlier SEMANTIC_COMPATIBILITY failure was caused by the sibling
  `mobingilabs/ripple-api` checkout resolving to `4e3e200d` while Nightwatch
  pins `27bb007a`; the ripple-api reflog shows the owner-side merge that
  advanced it on 2026-09-17. It was not corrected by weakening or advancing
  Nightwatch's source expectations.

## Blockers

None. If the real inventory cannot be safely resolved, the row is reported as
it is observed; no environment repair is attempted.

## Resume Recipe

Task complete; do not resume this task. A future task requires fresh owner
authorization before any C4 Phase 1b, Wave 2, or source-pin advance.

## Completion Snapshot

Complete. Wave 1 is closed at the session-branch checkpoint `0fb23a1a` with an
11/11 local quality-gate receipt (`receipt:sha256:38b46ece948a41528805f50a`);
both detectors are implemented and registered, the C4 real pair remains
`UNRESOLVED_EXACT_SYMBOLS` with real-pair execution disabled, and no product,
network, cloud, database, sibling-write, integration, or push operation was
performed or authorized. Owner review is pending.

## Deferred / Follow-Up

- C4 CACHE_KEY_CONTRACT Phase 1a (not started; requires the bounded
  exact-symbol resolution first).
- Phase 1b is NOT authorized in this session.
- OQ-5/OQ-6 remain roadmap decisions only; no C8 code.
