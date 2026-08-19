# Workstream A — Contract Integrity Hardening

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority when executed: `PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION_LOCAL_ONLY`
No DEV.

## A1. Purpose

Close the contract-level defects and ambiguities found while reviewing the Phase 12 implementation before any real campaign binding is considered ready.

## A2. Mandatory reproduce-before-fix set

Permanently reproduce or explicitly refute from live source:

- API replay-plan original-cardinality gap;
- duplicate action occurrence ambiguity;
- semantic triage partial-coverage coherence gap;
- AI-ready semantic-confidence overclaim.

Do not change implementation first and reconstruct the old behavior from memory afterward.

## A3. Replay-plan API cardinality

Current intended API semantics are one approved Phase 5 operation per candidate.

Require mechanically:

- original occurrence count == 1;
- retained occurrence count == 1;
- retained occurrence == original occurrence;
- targetId == the fixed approved operation;
- no other action occurrence can enter the plan.

Reject before executor exposure.

## A4. Replay occurrence identity

The minimizer is occurrence-aware internally. The replay-control DTO must be at least equally precise.

If duplicates can occur in any supported original sequence, introduce a strict v2 plan representation with explicit deterministic occurrence identity.

Recommended safe descriptor:

```text
ordinal: bounded non-negative integer
expectedActionId: safe catalog ID
```

Optional additional descriptor fields are allowed only when already source/catalog-known and needed for precondition binding, e.g. route class or precondition key. No raw product values.

Retained occurrences must be a strict order-preserving subsequence of original occurrence ordinals.

Reject:

- duplicate ordinal;
- unknown ordinal;
- wrong action ID for ordinal;
- reordering;
- invented occurrence;
- out-of-range ordinal;
- occurrence descriptor containing unknown fields.

If source proves duplicate occurrences cannot exist on one candidate class, record that class-specific fact; do not use it to weaken other classes.

## A5. Replay-plan compatibility

Historical v1 parsing remains supported where safe.

A v1 plan must not be silently upgraded to an ambiguous v2 execution. Provide a deterministic conversion only if the v1 sequence is provably unambiguous; otherwise fail closed.

Plan IDs must include every load-bearing v2 occurrence field.

## A6. Semantic evidence cross-field coherence

The validator must reject impossible tuples rather than treating fields as independent enums.

Required matrix includes:

- semantic PARTIAL_COVERAGE requires receipt PARTIAL_COVERAGE and coverage PARTIAL_COVERAGE_NO_VIOLATION;
- receipt PARTIAL_COVERAGE requires semantic PARTIAL_COVERAGE;
- PASS + collection coverage requires FULLY_EVALUATED_PASS;
- ANOMALY + collection coverage requires observed VIOLATION when a collection state is present;
- NOT_APPLICABLE may pair with EMPTY_NOT_APPLICABLE;
- stale receipt/currentness combinations agree;
- unavailable receipt/currentness combinations agree;
- exactFingerprintMatch true requires exactReplayStatus REPRODUCED;
- NOT_REPRODUCED/INVALID/NOT_EVALUATED require exactFingerprintMatch false;
- minimality other than NONE requires reproduced minimal sequence evidence;
- source currentness CURRENT cannot coexist with receipt SOURCE_STALE/SOURCE_UNAVAILABLE;
- PARTIAL does not become ANOMALY or PASS through a coherence exception.

Preserve valid protocol-only/non-collection cases.

## A7. AI-ready semantic confidence

For semantic dossier v2:

- compute semantic confidence once through the deterministic Phase 12 rule;
- AI-ready sanitized projection may expose that semantic confidence or a deliberately weaker combined confidence;
- it must never expose a stronger legacy generic confidence;
- semantic blockers remain visible as safe categorical metadata if already policy-allowed;
- AI-ready status cannot influence oracle/dossier READY truth.

No model call.

## A8. Privacy

Plant sentinels in every new occurrence/evidence path. Require zero leaks through:

- plan serialization;
- parse errors;
- replay adapter errors;
- semantic evidence;
- dossier;
- AI-ready projection;
- fingerprints/IDs.

## A9. Required focused tests

At minimum:

1. pre-fix API multi-original acceptance reproduction;
2. fixed API multi-original rejection;
3. API one-original exact valid;
4. duplicate action IDs / first occurrence retained;
5. duplicate action IDs / second occurrence retained;
6. duplicate occurrence reorder rejected;
7. invented occurrence rejected;
8. v1 unambiguous compatibility;
9. v1 ambiguous execution fails closed;
10. partial semantic tuple mismatch rejected;
11. stale/current mismatch rejected;
12. unavailable/current mismatch rejected;
13. replay fingerprint/status mismatch rejected;
14. minimality/reproduction mismatch rejected;
15. valid anomaly tuple accepted;
16. valid full pass tuple accepted;
17. valid partial tuple accepted;
18. valid empty/N-A tuple accepted;
19. AI-ready generic HIGH / semantic LOW does not output HIGH;
20. AI-ready semantic HIGH remains HIGH;
21. sentinels 0 leaks;
22. deterministic >=3 repeats.

## A10. Acceptance

Workstream A is VERIFIED only when every confirmed integrity gap has a permanent regression, schema compatibility is explicit, privacy is clean, and no runtime authority is added.
