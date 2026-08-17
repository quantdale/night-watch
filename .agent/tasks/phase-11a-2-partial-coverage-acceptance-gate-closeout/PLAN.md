# PLAN — Nightwatch Phase 11A.2 — Partial-Coverage Acceptance-Gate Closeout

Task ID: phase-11a-2-partial-coverage-acceptance-gate-closeout
Phase: 11A.2-PARTIAL-COVERAGE-ACCEPTANCE-CLOSEOUT
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Purpose

Close the remaining downstream acceptance false-PASS after Phase 11A.1 fixed the receipt mapping, repair stale Phase 11A.1 durable metadata, validate locally, and establish truthful exact-CI state.

## Starting state

- Expected source before package publication: `a6eb3f274a505dc5453dd8422178487f62182929`.
- Phase 11A.1 corrective implementation: `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`.
- Receipt mapping/source correctness: independently verified.
- Remaining acceptance-gate defect: confirmed in current `src/core/phase9b/summary.ts`.
- GitHub Actions: externally blocked before job execution.
- Phase 11B: NOT_AUTHORIZED.

## Milestones

- M0 — fresh fetch; require clean main == origin/main; read complete remote task package.
- M1 — permanent pre-fix test proving PARTIAL_COVERAGE can currently pass `evaluatePhase9bAcceptance()`.
- M2 — add explicit `partialCoverageCount`; prevent partial receipts from decisive/full acceptance; replay comparison includes partial count.
- M3 — prove Phase 10B composed deep gate rejects partial summaries; preserve historical Phase 9B/10B clean behavior.
- M4 — focused + historical regression and privacy checks.
- M5 — correct predecessor Phase 11A.1 STATE/REPORT metadata to actual fix SHA and actual blocker.
- M6 — substantive corrective checkpoint; push fast-forward; verify GitHub Actions availability.
- M7 — exact CI if available; otherwise record the same external billing blocker truthfully.
- M8 — docs/continuity terminalization; if Actions available, exact final-head CI; STOP.

## Implementation constraints

- Do not alter semantic receipt mapping unless a new defect is proven; Phase 11A.1 already fixed it.
- Do not change collection evaluator/projection/source expectations.
- Do not add network/product authority.
- PARTIAL_COVERAGE must remain explicit, non-anomalous, and non-accepting.
- Historical Phase 9B/10B evidence remains byte-meaning-stable.

## Validation strategy

Load-bearing chain:

`PARTIAL_COVERAGE receipt`
→ `partialCoverageCount > 0`
→ `decisiveEvaluationCount does not certify it`
→ `evaluatePhase9bAcceptance() FAIL`
→ `evaluatePhase10bDeepAcceptance() FAIL when composed with partial summary`.

Also prove clean PASS still succeeds and ANOMALY semantics remain unchanged.

## CI truth

Runs `32001807202` (fix SHA) and `32001874321` (previous docs head) were blocked externally before execution. Do not treat those failures as code failures or as green CI. After the new corrective checkpoint, exact CI must actually start and complete successfully for full Phase 11 completion.

## Completion criteria

All SPEC tests/checks green locally; durable continuity internally consistent; catalog unchanged; no prohibited activity; exact CI green for full completion, otherwise `BLOCKED_EXTERNAL_CI`; Phase 11B remains not authorized.