# Phase 12 fixed yield backtest corpus (synthetic only)

Deterministic synthetic fixtures for the Phase 12 semantic-yield backtest
(WORKSTREAM_E, Matrix H). **No real customer data, no real product bodies.**

## Composition

The backtest corpus is encoded in `response-fixtures.ts` + `source-fixture/phase12Fixtures.ts`.
A separate deterministic case-catalog helper `src/core/phase12/backtest.ts`
enumerates every class required by SPEC §8 and WORKSTREAM_E §E2:

1. later-row FIELD_PRESENT defect (common-exchange missing field at row 57)
2. later-row TYPE_MATCH defect (common-exchange wrong type at row 57)
3. TYPE_IN_SET defect (payer outside-set at row 1)
4. same invariant violated on multiple rows
5. two distinct invariant definitions violated
6. valid empty collection
7. valid full small collection
8. valid exactly-128 collection
9. valid >128 partial collection (no violation)
10. partial collection with observed in-window violation
11. stale source expectation
12. source unavailable
13. source evidence drift (digest mismatch — FAIL_CLOSED)
14. replay exact same fingerprint -> REPRODUCES
15. replay different fingerprint -> DOES_NOT_REPRODUCE
16. reducible two/three-action candidate (minimizes)
17. non-reducible / budget exhausted candidate
18. invalid reduced precondition (precondition divergence)
19. budget-exhausted minimization (BOUNDED_MINIMAL)
20. API single-action anomaly (UNCHANGED but reproduced)
21. exploration multi-action anomaly (minimizable)
22. journey multi-step anomaly (minimizable)
23. known false-positive fixture
24. protocol-only historical anomaly (not semantic)
25. unrelated source SHA movement with same evidence (still current)
26. changed semantic evidence digest (must not silently merge)
27. privacy-adversarial sentinel fixture (leak count must stay 0)

## Sentinels

Synthetic sentinel strings are planted inside raw values only to sweep
privacy leakage across every safe output surface; they must never reach
findings, fingerprints, dossiers, clusters, or receipts.
