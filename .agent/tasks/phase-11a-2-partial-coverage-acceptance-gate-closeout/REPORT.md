# REPORT — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Status: BLOCKED_EXTERNAL_CI
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Verified starting facts

- live predecessor source fix exists at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3` (receipt-layer PARTIAL_COVERAGE -> receipt PARTIAL_COVERAGE, non-pass; receipt-v2 coherence rejects PASS with partial-coverage metadata).
- current `src/core/phase9b/summary.ts` still dropped partial coverage from the public summary, counted a partial receipt as decisive when some inspected invariants passed, and did not reject partial coverage in `evaluatePhase9bAcceptance()`.
- GitHub Actions runs `32001807202` (`51b886a4…`) and `32001874321` (`a6eb3f2…`) were blocked before job execution by the billing/spending-limit condition.

Classification:

`CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS`

## Pre-fix reproduction

Permanent reproduction confirmed the defect against the unmodified shared gate:
- `evaluatePhase9bAcceptance()` returned `pass: true` for a `PARTIAL_COVERAGE` summary carrying `invariantPassCount > 0` (decisive solely via invariant passes; no partial-coverage rejection).
- `evaluatePhase10bDeepAcceptance()` (which composes the Phase 9B gate) also returned `pass: true` for the same partial summary.

The temporary reproduction was removed once the permanent regression suite encoded the corrected behavior.

## Corrective implementation

Committed at `f763f3c42447c0c566f536ce6bdb38f2673ededc`:

- `Phase9bSemanticSummary` gains an explicit, categorical `partialCoverageCount`.
- `summarizePhase9bPass()` populates it from the internal `outcomeCounts()` tally (`PARTIAL_COVERAGE`).
- `comparePhase9bReplaySummaries()` compares `partialCoverageCount` (FIRST/REPLAY cannot hide a coverage-state mismatch).
- `evaluatePhase9bAcceptance()` fails when `partialCoverageCount !== 0`.
- Decisive evaluation redefined as `(outcome === 'PASS' && invariantPassCount > 0) || outcome === 'ANOMALY'`: a PARTIAL_COVERAGE receipt is never decisive merely because inspected invariants passed.
- `evaluatePhase10bDeepAcceptance()` needs no separate edit — it composes `evaluatePhase9bAcceptance()` and inherits the rejection.

## Permanent regression (SPEC §6)

`tests/unit/phase11a2PartialCoverageAcceptanceCloseout.test.ts` (13 tests) locks down:
1. PARTIAL_COVERAGE receipt appears as `partialCoverageCount = 1`;
2. PARTIAL_COVERAGE receipt is not counted as decisive;
3. `evaluatePhase9bAcceptance()` rejects partial coverage even with `invariantPassCount > 0`;
4. clean PASS still passes Phase 9B acceptance;
5. ANOMALY remains eligible evaluation evidence;
6. replay comparison detects FIRST/REPLAY partial-count mismatch;
7. replay comparison accepts identical partial summaries;
8. Phase 10B deep acceptance rejects a partial summary;
9. existing Phase 9B harness matrix remains green;
10. existing Phase 10B harness matrix remains green;
11. Phase 11A.1 receipt-closeout matrix remains green;
12. Phase 11 collection matrix remains green;
13. no raw-value/privacy fields are introduced.

## Historical compatibility

Phase 9B/10B harness matrices and the historical Phase 9/9A.1/10 focused matrices remain green. The Phase 10B historical successful DEV run is unaffected: its fixed item-0 deep expectation did not produce collection partial coverage. No journey, target, expectation, source-freshness, or product-authority semantics changed.

## Predecessor continuity correction (M5)

Phase 11A.1 durable records corrected to the real corrective source checkpoint:
- `LAST_VALIDATED_IMPLEMENTATION_SHA` = `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- `LAST_SUBSTANTIVE_CHECKPOINT_SHA` = `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`;
- STATE no longer says the implementation is unperformed; REPORT no longer says "No corrective implementation is claimed yet";
- confirmed-finding text now distinguishes historical pre-fix behavior from the fixed source;
- CI blocker remains explicit and external until exact CI actually runs.

## Validation results

- typecheck: PASS
- hardening:check: PASS
- phase11a2PartialCoverageAcceptanceCloseout: 13/13 PASS
- phase9bHarness / phase10bHarness / phase11a1ReceiptCloseout / phase11CollectionWide / phase9a1GapReproduction: PASS
- historical Phase 9/9A.1/10 focused matrices: PASS
- full Playwright unit suite: 1220 passed, 1 skipped
- campaign:synthetic: 27/27 PASS
- owner-provenance: 91/91 PASS
- agent:check / agent:audit / project:check: continuity consistent (catalog digest unchanged)
- git diff --check: clean

## GitHub Actions / final state

GitHub Actions is BLOCKED before job start by the account billing/spending-limit
condition. The corrective heads `f763f3c4…` (this task) and `51b886a4…` (Phase
11A.1) have NOT executed in Actions. A billing/spending-limit refusal before job
start is not code failure and is not green CI.

Per the terminal-state rule, Phase 11 is NOT declared fully COMPLETE while exact
CI has not actually completed successfully. Terminalized as:

- `PHASE_11A_2_STATUS: BLOCKED_EXTERNAL_CI`
- `PHASE_11A_STATUS: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11_COLLECTION_WIDE_SEMANTIC: COMPLETE_LOCAL_VALIDATED_NOT_CI_VERIFIED`
- `PHASE_11B_STATUS: NOT_AUTHORIZED`

Phase 11B remains NOT_AUTHORIZED in all branches.
