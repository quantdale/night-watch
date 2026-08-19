# Workstream E — Deterministic Semantic Bug-Yield Backtest

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SYNTHETIC only.

## E1. Objective

Measure whether Phase 12 actually improves useful bug-hunting output rather than merely adding architecture. Use one permanent deterministic corpus and compare the exact starting baseline against the Phase 12 pipeline with raw integer counts.

## E2. Corpus

Create `corpus/phase12/**` or repository-native equivalent using synthetic values only.

Minimum classes:

1. later-row common FIELD_PRESENT defect;
2. later-row common TYPE_MATCH defect;
3. payer TYPE_IN_SET defect;
4. same invariant violated on multiple rows;
5. two distinct invariant definitions violated;
6. valid empty collection;
7. valid full small collection;
8. valid exactly-128 collection;
9. valid >128 partial collection;
10. partial collection with observed in-window violation;
11. stale source expectation;
12. source unavailable;
13. source evidence drift;
14. replay exact same fingerprint;
15. replay different fingerprint;
16. reducible two/three-action candidate;
17. non-reducible candidate;
18. invalid reduced precondition;
19. budget-exhausted minimization;
20. API single-action anomaly;
21. exploration multi-action anomaly;
22. journey multi-step anomaly;
23. known Nightwatch false-positive fixture;
24. protocol-only historical anomaly;
25. unrelated source SHA movement with same evidence;
26. changed semantic evidence digest;
27. privacy-adversarial sentinel fixture.

Add more where current architecture supports useful distinctions.

## E3. Baseline

The baseline must reproduce starting behavior, not a made-up weak comparator.

For replay-gap fixtures, baseline should use the exact semantics of the confirmed real candidate path: reduced replay is always INVALID.

For semantic detection, preserve current Phase 11 behavior.

For confidence/dossier/cluster comparisons, execute current starting semantics from the pre-Phase-12 implementation or a test helper mechanically proven equivalent.

Document exactly what is baseline and how equivalence is proven.

## E4. Phase 12 path

Run the same corpus through:

semantic evaluation -> candidate -> replay plan -> exact replay -> minimization -> confidence -> cluster -> dossier.

No fixture-specific branch in production code.

## E5. Metrics

Report raw integers at minimum:

- seededCases;
- seededActionableDefects;
- benignCases;
- baselineExactReproduced;
- phase12ExactReproduced;
- baselineMinimized;
- phase12Minimized;
- baselineUnchanged;
- phase12Unchanged;
- baselineInvalidReplay;
- phase12InvalidReplay;
- baselineHighConfidence;
- phase12HighConfidence;
- baselineReadyDossiers;
- phase12ReadyDossiers;
- uniqueSemanticClusters;
- duplicateObservationsSuppressed;
- falsePositiveCount;
- partialCoverageFalsePassCount;
- staleSourceFalsePassCount;
- differentFingerprintFalseReproductionCount;
- privacyLeakCount;
- determinismMismatchCount.

## E6. Required productivity delta

For the fixed replay-gap corpus:

`phase12Minimized > baselineMinimized`

and:

`phase12InvalidReplay < baselineInvalidReplay`

provided the relevant candidate is mechanically safe to replay.

Do not force a delta for API single-action candidates that cannot be reduced; exact replay + truthful UNCHANGED is acceptable.

## E7. Quality floors

Must equal zero:

- falsePositiveCount;
- partialCoverageFalsePassCount;
- staleSourceFalsePassCount;
- differentFingerprintFalseReproductionCount;
- privacyLeakCount;
- determinismMismatchCount.

No HIGH-confidence fixture may violate Workstream B blockers.

## E8. Cluster quality

The backtest must include:

- multiple-row same-invariant observations collapsing into one semantic cluster;
- repeated runs same contract/fingerprint collapsing;
- distinct invariant contracts staying separate;
- changed semantic evidence identity not silently merging.

## E9. Dossier quality

Count READY vs INCOMPLETE/UNRESOLVED dossiers.

READY is good only when evidence supports it. Do not optimize by weakening readiness.

Report missing-evidence codes for unresolved fixtures.

## E10. Privacy sentinel matrix

Plant synthetic sentinels in fields that must never survive:

- runtime strings;
- account-like IDs;
- email-like values;
- numeric cost-like values;
- bearer/cookie-like strings;
- absolute private paths;
- row values.

Search all serialized safe outputs, errors, cluster IDs, dossier fields, briefs, checkpoint-safe views, AI-ready projection if exercised.

Fixture input must prove sentinels were actually present.

Leak count 0.

## E11. Determinism

Run the complete backtest at least 3 times in-process/fresh-object style.

Canonical metrics and deterministic identities must match exactly.

No clock/random/private path in identity.

## E12. Performance boundedness

Backtest should demonstrate bounded behavior under current configured limits but not introduce benchmark theater.

Report upper-bound facts:

- max collection items inspected;
- max replay candidates;
- max total replays;
- max invariants/expectation;
- corpus case count.

No unbounded fuzzing.

## E13. Permanent command

Prefer a dedicated local command or focused test matrix, e.g. a Phase 12 backtest test file/script, that can be run in CI with synthetic fixtures only.

The command must be deterministic and must not access DEV/live Alphaus sources.

## E14. Acceptance

The backtest is the go/no-go gate for claiming Phase 12 improves productivity. Architecture without a measured fixed-corpus improvement is not sufficient.
