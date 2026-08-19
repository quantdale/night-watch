# Workstream B — Semantic-Aware Confidence & Dossier Evidence

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SOURCE-ONLY only.

## B1. Problem

Current triage confidence is generic. It reasons from fresh-context reproduction count, minimization reproduction count, browser/API differential, source relevance, oracle reliability, known false-positive status, and safety cleanliness. That predates Phase 9–11 semantic receipts, source-bound expectations, collection coverage states, and real-source evidence digests.

Phase 12 must make high-confidence semantic triage depend on those deterministic facts without breaking protocol-only triage.

## B2. Semantic triage evidence DTO

Introduce a strict, versioned safe DTO or equivalent typed sub-object.

Suggested semantic fields:

- expectationId;
- targetId;
- semanticFindingFingerprint;
- invariantDefinitionId or canonical safe invariant descriptor;
- semanticOutcome;
- receiptOutcome;
- coverageState when applicable;
- sourceRepoId;
- sourceSha;
- sourceEvidenceDigest;
- sourceDerivationVersion;
- sourceCurrentness;
- exactReplayStatus;
- exactFingerprintMatch;
- minimalityGuarantee;
- bounded reproduction counts;
- explicit missingEvidence codes.

No raw product values.

## B3. Source-currentness categories

Use existing currentness semantics where possible. High-confidence semantic evidence must never treat these as equivalent:

- exact/current/resolved;
- local tracking only;
- stale;
- unavailable;
- unknown.

If a new source-attestation DTO is introduced, it must remain data-only. The triage core must not execute git/gh/network/fs.

## B4. Confidence rule

Keep categorical confidence: HIGH / MEDIUM / LOW / UNRESOLVED.

No percentages, learned models, or arbitrary weights.

Define explicit predicates.

For a semantic candidate, HIGH must require at least:

- original semantic outcome ANOMALY;
- full/observed violation semantics, not PARTIAL_COVERAGE;
- source expectation current/resolved under the selected source-evidence identity;
- exact fresh replay reproduced the exact same anomaly fingerprint;
- replay safety clean;
- privacy clean;
- no known Nightwatch false-positive match;
- oracle/expectation reliability resolved;
- enough independent reproduction/minimization evidence under the chosen deterministic rule.

Do not require source-change relevance to be DIRECT in order to be high confidence; unchanged source can still exhibit a bug. Source relevance is supporting localization evidence, not truth of the anomaly.

## B5. Mandatory blockers to HIGH

HIGH is impossible when any is true:

- PARTIAL_COVERAGE;
- NO_EXPECTATION;
- EXPECTATION_SOURCE_STALE;
- EXPECTATION_SOURCE_UNAVAILABLE;
- INVALID_INPUT;
- PROJECTION_LIMIT_EXCEEDED without an observed target anomaly;
- INTERNAL_ERROR;
- exact replay NOT_REPRODUCED or INVALID;
- different replay fingerprint;
- safety nonzero;
- privacy failure;
- known false-positive match;
- required semantic/source identity missing.

## B6. Browser/API differential

Browser/API evidence may raise confidence only as independent corroboration.

It may not convert unresolved/stale/partial semantic evidence into HIGH.

`BROWSER_API_FAILURE_AGREE` is not proof of root cause.

`UI_FAILURE_API_PASS` is useful localization evidence but not alone sufficient for HIGH.

## B7. Dossier evolution

If current `nightwatch.bug-dossier.private.v1` cannot carry new semantic-triage evidence without changing immutable meaning, introduce an explicit v2 schema with backward-compatible reading/validation of v1.

Do not silently add required fields to v1.

New dossier evidence should remain sanitized and deterministic.

## B8. READY predicate

A semantic dossier may become READY only if the new readiness predicate passes.

At minimum block READY when:

- source expectation stale/unavailable/unresolved;
- semantic outcome partial/non-anomaly;
- replay required but not reproduced;
- nonzero safety/privacy;
- known false-positive;
- essential contract identity missing;
- deterministic evidence contradiction exists.

An INCOMPLETE/UNRESOLVED dossier is an acceptable honest result.

## B9. Missing evidence

Replace vague missing-evidence strings where practical with a fixed safe vocabulary, for example:

- EXACT_REPLAY_REQUIRED
- SOURCE_CURRENTNESS_UNRESOLVED
- SEMANTIC_EXPECTATION_UNRESOLVED
- PARTIAL_COLLECTION_COVERAGE
- MINIMIZATION_BUDGET_EXHAUSTED
- BROWSER_API_DIFFERENTIAL_UNAVAILABLE
- SOURCE_CHANGE_RELEVANCE_UNRESOLVED
- DEPLOYMENT_STATUS_UNRESOLVED
- DATASTORE_EVIDENCE_OUT_OF_SCOPE_BY_OWNER

Do not remove the owner-frozen L4/data-layer out-of-scope truth.

## B10. Human reproduction recipe

The dossier's human reproduction recipe may contain only safe action IDs / route classes / expected categorical observation wording.

No credentials, customer values, raw API parameters, bodies, cost values, or tokens.

## B11. AI-ready compatibility

If a dossier still projects into the existing AI-ready package, the new semantic triage fields may be exposed only as sanitized deterministic facts already allowed by policy.

No model is called in this task.

AI remains non-authoritative.

## B12. Required tests

- semantic clean full anomaly + exact replay can reach the configured HIGH rule;
- partial coverage cannot reach HIGH;
- stale source cannot reach HIGH;
- unavailable source cannot reach HIGH;
- exact replay different fingerprint cannot reach HIGH;
- safety nonzero cannot reach HIGH;
- known false-positive cannot reach HIGH;
- browser/API agreement alone cannot reach HIGH;
- protocol-only historical confidence behavior remains valid;
- dossier v1 compatibility;
- v2/new semantic triage evidence strict validation;
- unknown field rejection;
- missing essential semantic identity blocks READY;
- missing-evidence vocabulary deterministic;
- human reproduction recipe privacy;
- AI-ready projection privacy if exercised;
- repeated confidence/dossier deterministic.

## B13. Acceptance

The workstream succeeds only if the Phase 12 backtest shows high-confidence dossiers correlate with genuinely replayed exact semantic anomalies and no partial/stale/known-false-positive fixture is falsely upgraded.
