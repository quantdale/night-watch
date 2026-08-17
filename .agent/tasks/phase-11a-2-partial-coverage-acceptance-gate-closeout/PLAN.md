# PLAN — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close the remaining downstream acceptance false-PASS after Phase 11A.1 fixed the
receipt mapping: the shared Phase 9B normalized acceptance layer must never
certify a `PARTIAL_COVERAGE` receipt as full semantic acceptance, the composed
Phase 10B deep gate must inherit that rejection, historical Phase 9B/10B
behavior must be preserved, the predecessor Phase 11A.1 continuity records must
be corrected to the real corrective source checkpoint, and the truthful exact-CI
state must be established.

## Starting State

- Expected source before this task package publication: `a6eb3f274a505dc5453dd8422178487f62182929`.
- Phase 11A.1 corrective implementation: `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3` (receipt-layer fix; locally validated, exact CI blocked).
- This task's corrective implementation: `f763f3c42447c0c566f536ce6bdb38f2673ededc` (shared acceptance-gate fix; locally validated, exact CI blocked).
- Current `src/core/phase9b/summary.ts` still dropped partial coverage from the public summary, counted a partial receipt as decisive when `invariantPassCount > 0`, and did not reject partial coverage in `evaluatePhase9bAcceptance()`.
- GitHub Actions: externally blocked before job execution by the account billing/spending-limit condition.
- Phase 11B: NOT_AUTHORIZED.

## Scope

- Add an explicit, categorical `partialCoverageCount` to `Phase9bSemanticSummary`.
- Populate it from receipt outcome counts in `summarizePhase9bPass()`.
- Compare it in FIRST/REPLAY normalized comparison.
- Make `evaluatePhase9bAcceptance()` fail when `partialCoverageCount != 0`.
- Define decisive evaluation so `PARTIAL_COVERAGE` is never decisive solely because some inspected invariants passed.
- Add permanent regression tests proving a partial receipt cannot pass the Phase 9B acceptance gate or the Phase 10B deep gate that composes it.
- Preserve existing historical clean PASS and ANOMALY behavior.
- Correct stale Phase 11A.1 STATE/REPORT/ACTIVE_TASK metadata to the actual corrective implementation SHA and actual terminal blocker.
- Establish truthful exact-CI state (or terminalize `BLOCKED_EXTERNAL_CI`).

## Non-Goals

No DEV/NEXT/production. No Phase 11B. No new collection semantics. No projection change. No source-contract change. No campaign/minimization redesign. No differential. No Phase 6. No AI/model execution. No Alphaus writes. No selfDev/promotion/catalog/B adoption. No publication.

## Safety Constraints

- Fail-closed, read-only safety model preserved.
- No raw values, secrets, customer data, or network/product authority introduced.
- PARTIAL_COVERAGE stays explicit, non-anomalous, and non-accepting.
- Historical Phase 9B/10B evidence remains byte-meaning-stable.

## Architecture / Approach

The safe summary `Phase9bSemanticSummary` gains one bounded categorical count,
`partialCoverageCount`, populated from the existing internal `outcomeCounts()`
tally (which already counted `PARTIAL_COVERAGE`). The acceptance gate rejects a
nonzero `partialCoverageCount`. Decisive evaluation is redefined as
`(outcome === 'PASS' && invariantPassCount > 0) || outcome === 'ANOMALY'`, so a
PARTIAL_COVERAGE receipt is never decisive merely because inspected invariants
passed. FIRST/REPLAY comparison includes `partialCoverageCount` so replay cannot
hide a coverage-state mismatch. `evaluatePhase10bDeepAcceptance()` composes
`evaluatePhase9bAcceptance()`, so it inherits the rejection without change.

## Milestones

- M0 — fresh fetch; clean main == origin/main; read complete remote task package. COMPLETE.
- M1 — permanent reproduction that the current shared acceptance gate certified a PARTIAL_COVERAGE summary (`evaluatePhase9bAcceptance`/`evaluatePhase10bDeepAcceptance` returned `pass: true`). COMPLETE (reproduced pre-fix; removed after fix).
- M2 — add `partialCoverageCount`; prevent partial receipts from decisive/full acceptance; replay comparison includes partial count. COMPLETE at `f763f3c`.
- M3 — prove Phase 10B composed deep gate rejects partial summaries; preserve historical Phase 9B/10B clean behavior. COMPLETE.
- M4 — focused + historical regression and privacy checks. COMPLETE (full unit suite 1220 passed, 1 skipped).
- M5 — correct predecessor Phase 11A.1 STATE/REPORT metadata to actual fix SHA `51b886a4…` and actual blocker. COMPLETE.
- M6 — substantive corrective checkpoint `f763f3c`; push fast-forward; verify GitHub Actions availability. COMPLETE (push; Actions still externally blocked).
- M7 — exact CI if available; otherwise record the same external billing blocker truthfully. COMPLETE (BLOCKED_EXTERNAL_CI).
- M8 — docs/continuity terminalization; if Actions available, exact final-head CI; STOP. COMPLETE (terminalized BLOCKED_EXTERNAL_CI).

## Implementation constraints

- Do not alter semantic receipt mapping (Phase 11A.1 already fixed it).
- Do not change collection evaluator/projection/source expectations.
- Do not add network/product authority.
- PARTIAL_COVERAGE must remain explicit, non-anomalous, and non-accepting.
- Historical Phase 9B/10B evidence remains byte-meaning-stable.

## Validation Strategy

Load-bearing chain (all locally verified):

`PARTIAL_COVERAGE receipt`
→ `partialCoverageCount > 0`
→ `decisiveEvaluationCount` does not certify it
→ `evaluatePhase9bAcceptance()` FAIL
→ `evaluatePhase10bDeepAcceptance()` FAIL when composed with partial summary.

Also prove clean PASS still succeeds and ANOMALY semantics remain unchanged.

Required runs (all green locally):
- `npm run typecheck`
- `npm run hardening:check`
- `tests/unit/phase11a2PartialCoverageAcceptanceCloseout.test.ts`
- `tests/unit/phase9bHarness.test.ts`, `tests/unit/phase10bHarness.test.ts`
- `tests/unit/phase11a1ReceiptCloseout.test.ts`, `tests/unit/phase11CollectionWide.test.ts`, `tests/unit/phase9a1GapReproduction.test.ts`
- historical Phase 9/9A.1/10 focused matrices
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`, `npm run agent:audit`, `npm run project:check`
- `git diff --check`
- full Playwright unit regression (1220 passed, 1 skipped)

## Decision Log

- Added `partialCoverageCount` as an explicit categorical count (not merged into a generic failure count).
- Decisive redefined to exclude PARTIAL_COVERAGE even when invariant passes exist.
- Phase 10B deep gate inherits rejection via composition; no separate edit required.
- Predecessor Phase 11A.1 STATE/REPORT corrected: `LAST_VALIDATED_IMPLEMENTATION_SHA`/`LAST_SUBSTANTIVE_CHECKPOINT_SHA` set to `51b886a4…`; stale "implementation not performed" / "no corrective implementation claimed" language removed.

## Discoveries

- The pre-fix shared acceptance gate returned `pass: true` for a PARTIAL_COVERAGE summary with `invariantPassCount > 0` (confirmed `CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`); the new gate returns `pass: false`.
- Existing Phase 9B harness `passSummary` helpers required the new `partialCoverageCount` field (mechanically required by the interface change); set to `0` for historical clean cases.

## Deferred Work

- Phase 11B contained DEV acceptance remains NOT_AUTHORIZED.
- High-confidence real semantic triage remains NEXT_AFTER once Phase 11 is fully CI-verified.

## Completion Criteria

All SPEC tests/checks green locally; durable continuity internally consistent; catalog unchanged; no prohibited activity; exact CI green for full completion, otherwise `BLOCKED_EXTERNAL_CI`; Phase 11B remains not authorized.
