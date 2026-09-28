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
