# Workstream E — End-to-End Shadow Campaign & Yield Backtest

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority: local/source only. No DEV.

## E1. Goal

Prove the actual Phase 13 integration path end-to-end with deterministic synthetic runtime boundaries. Do not create a second miniature campaign implementation just to make tests pass.

## E2. Harness architecture

The shadow harness must use the same source modules intended for the real campaign:

- campaign manifest/version identity;
- source semantic bundle validation;
- semantic candidate evidence mapping;
- replay plan/binding;
- existing minimizer;
- semantic cluster identity;
- semantic triage evidence;
- semantic confidence;
- dossier v2;
- checkpoint/resume/version checks.

Only the final product/browser/API executors are synthetic doubles.

## E3. Permanent corpus

Create `corpus/phase13/**` with at least the 40 classes listed in SPEC §12.1.

Every fixture must have:

- fixed ID;
- expected class;
- safe synthetic source identity;
- deterministic expected outcome;
- explicit purpose;
- no customer-derived data.

Fixtures may be grouped into response, replay, manifest, source, and privacy categories.

## E4. Baseline

Define the pre-Phase-13 structural baseline from current source behavior, not an invented weaker strawman.

At minimum baseline should faithfully represent:

- real candidate generic invalid reduced replay attachment;
- no end-to-end Phase 12 semantic-triage/dossier-v2 route in the real campaign architecture;
- existing campaign version fingerprint fields;
- historical protocol behavior.

Do not call synthetic Phase 12 replay adapters “real campaign baseline.”

## E5. Integrated metrics

Report raw integers, including:

- seededCases;
- seededSemanticAnomalies;
- seededProtocolAnomalies;
- baselineExecutableReducedReplayCandidates;
- phase13ExecutableReducedReplayCandidates;
- baselineSemanticAuthorityBoundCandidates;
- phase13SemanticAuthorityBoundCandidates;
- baselineDossierV2SemanticCandidates;
- phase13DossierV2SemanticCandidates;
- minimizedCandidates;
- unchangedCandidates;
- unsupportedJourneyReducedReplayCandidates;
- staleOrUnavailableBlocked;
- partialBlocked;
- knownFalsePositiveBlocked;
- semanticHighConfidence;
- semanticReadyDossiers;
- uniqueSemanticClusters;
- duplicatesSuppressed;
- manifestVersionDriftCaught;
- checkpointVersionDriftCaught;
- duplicateOccurrenceAmbiguityCount;
- differentFingerprintFalseReproductionCount;
- partialFalseReadyCount;
- staleFalseReadyCount;
- AIReadyConfidenceOverclaimCount;
- privacyLeakCount;
- determinismMismatchCount.

Do not require every positive productivity count to increase if honest semantics make a count smaller. Quality floors are more important than vanity totals.

## E6. Quality floors

Must be exactly zero:

- differentFingerprintFalseReproductionCount;
- partialFalseReadyCount;
- staleFalseReadyCount;
- unsafeFalseReadyCount;
- privacyLeakCount;
- AIReadyConfidenceOverclaimCount;
- duplicateOccurrenceAmbiguityCount after the fix;
- manifestSemanticDriftMisses;
- determinismMismatchCount.

## E7. Required positive proofs

At least:

- one supported multi-action candidate genuinely minimizes through the integrated replay path;
- one API single-action candidate remains truthfully UNCHANGED;
- one semantic current/full/reproduced candidate can become HIGH + READY;
- one partial candidate stays below HIGH and not READY;
- one stale candidate stays below HIGH and not READY;
- one known false positive stays below HIGH and not READY;
- one same-evidence/unrelated-SHA semantic observation dedups;
- one changed-evidence observation splits;
- one manifest semantic-version drift stops before execution;
- one checkpoint/runtime version drift stops before execution;
- one protocol-only historical anomaly retains compatible handling.

## E8. Duplicate occurrences

Include an original sequence with duplicate action IDs and distinct occurrence ordinals/context. Prove the retained candidate selects the intended occurrence exactly and that a different occurrence cannot masquerade under the same replay-plan identity.

## E9. Source remote advance

Simulate:

1. campaign freezes source bundle A;
2. remote-current metadata moves to B;
3. campaign resume detects currentness/version/source mismatch before semantic execution;
4. a new campaign may derive a new bundle B separately.

No automatic rebind.

## E10. Privacy sentinel

Plant multiple sentinel classes across synthetic body values, action-adjacent metadata, source fixtures, and rejected payloads.

Inspect every safe output surface structurally:

- replay plan;
- semantic bundle;
- candidate;
- checkpoint;
- cluster;
- triage evidence;
- dossier;
- AI-ready package;
- shadow report/metrics;
- error messages.

Require 0 leaks.

## E11. Determinism

Run the complete integrated shadow corpus at least 3 times.

Compare canonical safe serialization of all deterministic outputs.

Require zero mismatches.

## E12. Protocol compatibility

The shadow campaign must include protocol-only candidates with no semantic evidence and prove the new semantic integration does not force fake semantic identity or break historical dossier/cluster behavior.

## E13. Acceptance

Workstream E is VERIFIED only when the integrated architecture measurably closes the real-campaign binding gaps with every quality floor zero, deterministic outputs stable, and no product execution.
