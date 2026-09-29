# Flake Ledger

Tracked record of tests that exhibit intermittent behavior, with the
reproduction evidence, the true mechanism, and the bound actually shipped.

Purpose: a flake is never closed by raising a bound alone. Every entry must
name (1) the observed failure mode, (2) the mechanism established by source
reading plus experiment, (3) the reproduction attempt and its honest outcome
(including non-reproduction), and (4) the bound that shipped and why it is
sufficient. This file is append-only in spirit: entries are corrected by
appending a dated correction, never by silently rewriting history.

---

## FLAKE-001 — observerSemanticLedger semantic evaluation wait (2 s bound)

- **Filed:** 2026-09-28 (corrections campaign VC-07, task 3.7)
- **Surface:** `tests/unit/observerSemanticLedger.test.ts:77`
  ("every evaluated 2xx JSON response yields a receipt; anomalies also yield
  findings"), the `semanticEvaluations().length === 2` and
  `semanticFindings().length >= 1` waits.
- **Observed failure mode:** the pre-`eccce619` test waited `2_000` ms after
  `page.goto()` for the semantic evaluation and findings ledgers to fill; under
  the load of a full suite run the response-handling passage (route intercept →
  body read → projection → ledger) can exceed 2 s, so the poll timed out
  intermittently. Raised to `20_000` ms in `eccce619` (D-24 / R2-65).

- **Mechanism (source, `src/browser/observers/networkObserver.ts`):**
  `recordEvaluation(receipt)` (line 1381) and `semanticFindingLedger.push(...)`
  (line 1409) run in the **same synchronous passage** of the response handler —
  there is no asynchronous gap between the evaluation landing and the findings
  projection. The actual asynchronous gap is earlier: `page.goto()` resolves on
  the navigation response while the observer's route handler (bounded body read
  with `MAX_CONCURRENT_BODY_READS = 4`, projection, ledger write) completes
  afterwards. The wait is therefore a **latency bound on the handler passage**,
  not a bound on an async projection. The pre-existing comment in
  `tests/unit/observerSemanticLedger.test.ts` ("the projection is written
  asynchronously after the evaluation lands") describes the wrong mechanism and
  is corrected by this entry.

- **Reproduction attempt (2026-09-28, honest outcome: NOT REPRODUCED):**
  the bound was temporarily restored to `2_000` ms and the test run 11 times
  at the 2 s bound under heavy load: load average 19–26 (20 CPU spinners),
  including 2 rounds of 4 concurrent browser contexts. All 11 runs PASSED
  (9.8–22.3 s each, of which the post-navigation wait remained under 2 s).
  The local loopback fixture serves two tiny JSON responses; the historical
  flake load (the ~2 000-test suite racing for the event loop) is not
  reproducible on demand at this bound on the current host. The pre-`eccce619`
  2 s bound is retained in the test (the patch was restored after the
  experiment); this entry records that the bound is empirical, not proven tight.

- **Bound shipped:** `20_000` ms on both polls. Justification: the wait is a
  response-handling latency bound under suite contention, not an event-driven
  condition (despite the D-24/R2-65 comment's claim). 20 s retains the
  fail-closed property (a genuinely dropped response still fails) while
  tolerating event-loop starvation up to 20 s. **Residual risk:** under a load
  that starves the event loop for more than 20 s the test will flake again;
  the correct fix at that point is to expose a handler-completion signal from
  the observer (e.g. an awaited drain of the body-read gate) and wait on it
  event-driven — the same shape as the `expect.poll` already used, but driven
  by the observer's own completion rather than a wall-clock bound.

- **Correction to prior comment:** the D-24/R2-65 comment in the test now
  reflects the true mechanism (handler-passage latency, synchronous projection).

---

## FLAKE-002 — observerSemanticLedger ledger-cap pacing (10 ms blind sleep)

- **Filed:** 2026-09-29 (corrections campaign, task 3.12 integration-half CI
  gate)
- **Surface:** `tests/unit/observerSemanticLedger.test.ts:138`
  ("ledger cap is bounded and overflow is explicit, never silent"), the
  `expect(evaluations.length).toBe(512)` and
  `semanticEvaluationLedgerOverflow() === true` assertions.
- **Observed failure mode:** exact-head CI run 36537649045 at `491b5ef9`
  (SEMANTIC_COMPATIBILITY lane, 2177 tests) failed exactly this test
  (`tests/unit/observerSemanticLedger.test.ts:138:UNCLASSIFIED`, 2162 passed /
  1 failed). The same test passed in CI at `2b5d8178` (2163 passed / 0 failed)
  and passes locally in isolation (2/2, 19.8 s) and at the committed tree.
  Intermittent under full-suite load only.
- **Mechanism (source, `src/browser/observers/networkObserver.ts`):** a
  page-side `fetch()` resolves at response ARRIVAL, while the observer's
  response handler (`page.on('response', onResponse)` at :1622) trails it:
  bounded body read (`MAX_CONCURRENT_BODY_READS = 4`, :131/:137) -> projection
  -> ledger. The acquisition gate REFUSES a read rather than queueing when 4
  are in flight (`noteCaptureFailure('BODY_READ_ACQUISITION_BOUND')`,
  :1195-1197), so that response is never projected and no evaluation receipt
  lands. The pre-fix loop paced itself with a blind 10 ms page-side sleep
  between 550 fetches; under event-loop contention the handler passage can
  exceed 10 ms, the in-flight burst crosses 4, reads refuse, and the ledger
  lands short of 512 while the overflow latch stays false — the cap assertion
  then fails. By FLAKE-001's established mechanism (recordEvaluation and the
  findings write are one synchronous handler passage), an ACQUIRED read always
  pushes a receipt until the cap, so an acquisition refusal is the only path
  that can land the ledger short.
- **Reproduction attempt (honest outcome: NOT REPRODUCED locally):** 2/2 local
  runs pass at the committed pre-fix tree (19.8 s each). The failure is
  CI-load-intermittent; the two exact-head CI runs cited above are the
  reproduction evidence (same test green at `2b5d8178`, red at `491b5ef9`, no
  test-file change between them).
- **Fix shipped:** event-driven pacing on the observer's OWN drain signal —
  the loop advances only while at most one response handler is outstanding
  (`activeRequests()`, the same counter the existing settlement barrier
  consumes), and drains to 0 before asserting. No source or gate text
  changes: `bodyReadAcquisition`'s structural pins (the 4-bound constant, the
  gate line, the refusal branch, both release sites) are untouched, and the
  cap/overflow assertions are unchanged. **Residual risk:** none known — the
  producer now advances strictly slower than the handler passage (≤ 1
  outstanding vs a gate of 4), so a refusal cannot accumulate; if one ever
  did, the cap assertion still fails loudly (fail-closed preserved).
- **Relationship to FLAKE-001:** same surface family (the observer's
  asynchronous handler passage) but a distinct test and mechanism —
  FLAKE-001 is a wall-clock latency bound on a 2-response wait; FLAKE-002 is
  acquire-refusal under a 550-response concurrency burst. FLAKE-001's named
  remedy ("wait on the observer's own completion rather than a wall-clock
  bound") is exactly what FLAKE-002 ships.

---

## Corrections and status register (2026-09-30, corrections task 7.11 / RV-13)

Appended, never rewritten: the entries above stay as filed. Two of their
statements are corrected here, and every entry now carries an explicit status.

### Status vocabulary

- `OPEN` — the flake has neither been reproduced and fixed nor honestly closed.
- `CLOSED_FIXED` — a mechanism was established and a fix shipped that removes
  it, observed green in exact-head CI; residual risk (if any) is named.
- `CLOSED_UNREPRODUCED` — the mechanism is established from source, the flake
  could not be reproduced on demand, and the shipped bound is accepted as
  EMPIRICAL (not proven tight) with its residual risk and remedy recorded. This
  is an honest closure of an unreproduced flake, never a claim that it cannot
  recur.

### Status register

| Entry | Status | Basis |
| --- | --- | --- |
| FLAKE-001 | `CLOSED_UNREPRODUCED` | Mechanism established (a handler-passage latency bound); 11 loaded local runs at a 2 s bound all passed; the shipped bound is `20_000` ms and is empirical. Residual risk: an event-loop stall above 20 s flakes again. Remedy if it recurs: wait on the observer's own completion signal (the drain FLAKE-002 already uses) instead of a wall-clock bound. |
| FLAKE-002 | `CLOSED_FIXED` (residual risk named below) | Fixed by event-driven pacing on the observer's `activeRequests()` drain signal (D-147). The test then passed in exact-head CI at `3c9c1a06` (run 36552500573), at `eef9c00e`/`fae2f8f6` (runs 36630587780, 36632405948) and at `b9306626` (run 36639792380) — four consecutive green observations, none of them a reproduction of the failure. |

### Corrections

1. **FLAKE-001, "Reproduction attempt" paragraph.** It states that "the
   pre-`eccce619` 2 s bound is retained in the test (the patch was restored
   after the experiment)". That is wrong about what shipped: the test carries
   `20_000` ms on both polls (`tests/unit/observerSemanticLedger.test.ts:109`
   and `:118`), which is also what the entry's own "Bound shipped" paragraph
   says. The experiment restored the 20 s bound, not the 2 s one; the 2 s
   figure is the bound the 11 unreproduced runs were made AT. The "empirical,
   not proven tight" conclusion stands and is the reason for the
   `CLOSED_UNREPRODUCED` status.
2. **FLAKE-002, "Fix shipped" paragraph, "Residual risk: none known".** That
   omits a second path to the same symptom. `RESPONSE_BODY_TIMEOUT_MS` is
   `5_000`: a body read that does not complete within 5 s resolves
   `{ completed: false }`, the handler records `BODY_READ_TIMEOUT` and marks the
   capture incomplete, and — because oracles never run on a failed capture —
   no evaluation receipt lands, so the ledger can still finish short of 512.
   The paced producer (at most one outstanding handler) makes a timeout far
   less likely than the acquisition refusal did, but a host that starves the
   event loop for more than 5 s per read can still trip it. Residual risk:
   starvation above the 5 s body-read bound; the cap assertion would still fail
   loudly (fail-closed preserved). Remedy if observed: make the fixture assert
   on the observer's capture-failure counters so the failing path is named in
   the failure, rather than raising the bound.

### Consequence for task 3.7 (VC-07)

VC-07 asked for a flake ledger that is honest about what was reproduced. It is
now: both entries carry a status, the two inaccurate statements are corrected,
and the unreproduced entry is closed as unreproduced rather than presented as
fixed. Task 3.7 stays ticked on that basis.
