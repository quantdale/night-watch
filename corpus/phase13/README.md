# Phase 13 integrated shadow corpus (synthetic only)

Deterministic synthetic fixtures and integrated shadow harness for Phase 13I
residual runtime completion (SPEC §§11, 9). **No real customer data, no real
product bodies, no DEV.**

## Location and authority

Fixtures live in:

- `corpus/phase13/source-fixture/phase13Fixtures.ts` — deterministic source
  expectations / provenance constants (repoId, SHA, derivationVersion,
  evidenceDigest).
- `corpus/phase13/response-fixtures.ts` — synthetic response generators (only
  synthetic sentinels inside raw values).
- `src/core/phase13/shadow.ts` — integrated shadow harness that uses the
  actual Phase-13 modules (semantic cluster, replay-plan V2, execution binding,
  semantic triage evidence, semantic confidence, dossier V2, campaign manifest
  drift) with synthetic executors only.

All fixtures are `synthetic-only`. The harness is `local/synthetic only`:
no browser, no network, no DB, no AI, no selfDev.

## Composition (>=40 classes)

### Replay / occurrence (11)
1. duplicate action ID retain first occurrence
2. duplicate action ID retain second occurrence
3. reordered occurrence rejected
4. invented occurrence rejected
5. wrong action for ordinal rejected
6. API multi-original rejected
7. API exact one-operation reproduced only via executor
8. executor different fingerprint not reproduced
9. executor throw invalid / fail-closed
10. journey exact reproduced via executor
11. journey reduced always unsupported (PRECONDITION_DIVERGENCE)

### Semantic truth (15)
12. current full ANOMALY + exact replay + minimization -> HIGH + READY
13. current ANOMALY but not reproduced -> not READY
14. PARTIAL -> not READY/HIGH
15. SOURCE_STALE -> not READY/HIGH
16. SOURCE_UNAVAILABLE -> not READY/HIGH
17. wrong target / expectation / bundle contradiction rejected
18. known false positive -> not READY
19. safety nonzero -> not READY
20. privacy nonzero -> not READY
21. same evidence/derivation across different SHA -> same cluster
22. changed evidence digest -> different cluster
23. changed derivation version -> different cluster
24. row ordinal / count change -> same cluster
25. two distinct invariant contracts (same kind) -> distinct clusters
26. (extra) current full without minimization evidence -> not HIGH

### Protocol compatibility (3)
27. protocol-only candidate still clusters/promotes via historical path
28. no semantic data required for protocol candidate
29. historical v1 dossier / checkpoint parse remains compatible

### Drift / resume (12)
30. replay-plan v1 version drift stops before executor
31. replay-plan v2 version drift stops before executor
32. semantic triage evidence version drift stops before executor
33. dossier-v2 version drift stops before executor
34. semantic cluster version drift stops before executor
35. semantic bundle version drift stops before executor
36. receipt version drift stops before executor
37. expectation derivation version drift stops before executor
38. checkpoint schema / ledger semantic-version mismatch fail-closed
39. frozen bundle cannot auto-rebind on source movement
40. manifest VERSION field one-at-a-time matrix (8+ fields) stops before executor

Total fixture classes: >=41. The harness `buildPhase13Corpus()` enumerates each
class with a fixed ID, expected class, safe synthetic source identity, and
deterministic expected outcome.

## Sentinels and privacy

Synthetic sentinel strings (`PH13_*_SENTINEL`) are planted only inside raw
values to sweep leakage. No sentinel may reach findings, fingerprints,
dossiers, clusters, receipts, or error messages. The harness asserts
`privacyLeakCount == 0`.

## Integrated harness

`src/core/phase13/shadow.ts` imports the actual integration modules:

- `src/oracles/semantic/cluster.ts` (semanticContractIdentity / semanticClusterKey / clusterSemanticObservations)
- `src/core/triage/replayPlan.ts` (validateTriageReplayPlan V1/V2)
- `src/core/triage/replayBinding.ts` (validateReplayPlanV2, executeReplayPlanV2)
- `src/core/triage/semanticTriageEvidence.ts`
- `src/core/triage/semanticConfidence.ts`
- `src/core/triage/dossierV2.ts`
- `src/core/campaign/types.ts` + `src/core/campaign/identity.ts` (manifest version drift)

Only the final executor callback is synthetic (injected). `validateReplayPlanV2`
never certifies FAILURE. The harness requires deterministic serialized outputs
across 3 identical repeats (`determinismMismatchCount == 0`) and all quality
floors zero.

## Determinism

```
npm run typecheck
playwright test tests/unit/phase13Shadow.test.ts
```

The harness serializes a canonical safe payload for every fixture and requires
zero mismatches across 3 runs.
