# Workstream D — Campaign Evidence, Versioning, Semantic Triage & Dossier Integration

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority: local/source only. No DEV.

## D1. Goal

Evolve the campaign architecture so semantic candidates can flow through the Phase 12 evidence/confidence/cluster/dossier machinery while protocol-only historical behavior remains valid and campaign resume detects load-bearing semantic-runtime drift.

## D2. Candidate semantic evidence

Add only safe optional fields/subobjects needed for semantic candidates.

Preferred architecture is an explicit versioned semantic-candidate evidence object rather than a loose collection of nullable fields.

It must bind:

- expectation/target/invariant identity;
- receipt/finding identity;
- coverage state;
- source/evidence/derivation identity;
- frozen source-bundle identity;
- replay/minimization result inputs;
- semantic currentness.

Protocol-only candidate remains valid without it.

## D3. Candidate privacy

Campaign `validateCandidatePrivacy()` or equivalent must validate the new semantic evidence path. Function callbacks remain excluded from serialization, but data fields must pass strict sentinel/schema checks before entering durable ledgers.

## D4. Semantic clustering

When semantic identity exists, use Phase 12 semantic cluster identity for semantic dedup/classification.

Requirements:

- evidence digest + derivation version load-bearing;
- unrelated source SHA with same evidence does not fragment;
- changed evidence/derivation splits;
- row ordinal/count do not fragment;
- protocol-only `clusterAnomalies()` behavior unchanged.

Do not merge semantically different invariant contracts merely because a generic browser fingerprint happens to match.

## D5. Reproduction/minimization -> triage evidence

After an exact reproduction/minimization attempt, construct semantic triage evidence from actual deterministic results rather than candidate claims.

At minimum reconcile:

- original semantic finding identity;
- fresh replay outcome/fingerprint;
- minimization guarantee/reproduction count;
- current source-bundle state;
- coverage state;
- safety/privacy;
- known false positive.

Candidate input must not be allowed to claim `exactReplayStatus=REPRODUCED` before replay runs.

## D6. Semantic confidence

Use `rankSemanticConfidence` only after validated semantic triage evidence exists.

HIGH remains impossible under Phase 12 blockers.

Generic protocol confidence remains available for protocol-only candidates but must not override a stricter semantic confidence for semantic dossiers.

## D7. Dossier v2 routing

Semantic candidate -> dossier v2.

Protocol-only candidate may remain on historical v1 or use a compatibility v2 path if source evidence proves it is semantically unchanged. Do not require fake semantic data.

Dossier v2 READY must be derived, never writer-provided.

## D8. Durable ledger compatibility

Determine whether checkpoint/dossier ledger DTOs need version evolution.

If the durable meaning changes, add explicit versioning and compatibility tests. Do not store a v2 dossier inside a v1 field whose validator assumes v1 semantics without a deliberate union/version contract.

Historical checkpoint fixtures must either:

- parse under documented backward compatibility; or
- fail closed with exact version drift.

No silent reinterpretation.

## D9. Manifest version fingerprint

Extend current campaign executable identity to include load-bearing contracts.

At minimum inspect and bind exact versions/digests for:

- replay-plan;
- replay binding/adapter contract if distinct;
- semantic triage evidence;
- dossier v2;
- semantic cluster;
- semantic receipt;
- semantic projection/oracle;
- expectation derivation/recipe;
- collection admission/evaluation;
- source campaign bundle.

Use repository-native actual version constants. Do not copy this list blindly if a field is redundant; every included value must participate in manifest identity/currentness.

## D10. Resume behavior

Test a frozen campaign against a later executable where each load-bearing version changes one at a time.

Required outcome:

`CAMPAIGN_VERSION_DRIFT` or a more precise fail-closed current version-drift class before executor callbacks.

No auto-migration/resume.

## D11. Dossier priority / bug candidate behavior

Review campaign promotion-to-bug-candidate semantics after dossier v2 integration.

Do not let:

- LOW/UNRESOLVED semantic confidence;
- UNRESOLVED dossier;
- partial/stale/unavailable evidence

become a high-confidence bug candidate merely because historical generic evidence-level logic would have promoted it.

At the same time, do not delete useful unresolved private evidence. Keep it explicitly unresolved.

## D12. Tests

Minimum:

1. semantic candidate strict evidence accepted;
2. unknown semantic candidate field rejected;
3. protocol-only candidate unchanged;
4. semantic same evidence / unrelated SHA dedups;
5. semantic changed evidence splits;
6. row count/ordinal does not split;
7. replay result overrides pre-run claim;
8. exact same fingerprint reaches semantic evidence reproduced;
9. different fingerprint does not;
10. stale source not HIGH;
11. partial not HIGH/READY;
12. known FP not HIGH/READY;
13. semantic dossier v2 READY positive;
14. semantic dossier unresolved negative;
15. AI-ready confidence <= semantic confidence;
16. historical dossier v1 parse;
17. historical checkpoint compatibility or explicit drift;
18. replay-plan version drift stops resume;
19. semantic evidence version drift stops resume;
20. dossier version drift stops resume;
21. semantic cluster version drift stops resume;
22. source-bundle version drift stops resume;
23. no executor callback on drift;
24. privacy sentinel zero;
25. deterministic repeat.

## D13. Acceptance

A complete local shadow campaign must demonstrate semantic candidate -> semantic cluster -> reproduction/minimization -> semantic triage evidence -> semantic confidence -> dossier v2 -> truthful campaign ledger/summary, while protocol-only behavior remains compatible and version drift fails closed.
