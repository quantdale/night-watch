# Phase 18 Workstreams

All workstreams are local/source/synthetic and subordinate to SPEC.md.

## Gate Zero — current pipeline reconstruction

Trace projection creation, expectation derivation/currentness, invariant
evaluation, CampaignSemanticEvidence, fingerprints, semanticContractIdentity,
clustering, replay-plan creation/binding, minimization, confidence, dossier-v2
admission, and rendering. Record where evidence is created, transformed,
dropped, protocol-reduced, unused, unreplayed, confidence-irrelevant, or
absent from dossier output.

## A — semantic contract classes

Add only source/fixture-proven bounded business-behavior classes: aggregate ↔
detail, cross-step state, pagination/window, empty-state, enum/lifecycle,
cross-surface sanitized equivalence, and source-backed HTTP-200 error-envelope
semantics. Each class requires a positive seed, benign control, deterministic
bounded evidence, expectation provenance, and replay compatibility.

## B — contract model hardening

Use a minimal versioned discriminated union for supported semantic primitives;
strict-parse it, evaluate exhaustively, preserve compatibility, and fail closed
on unknown kinds. Do not create a general theorem engine.

## C — provenance/currentness

Make CURRENT, STALE, AMBIGUOUS, MISSING, UNSUPPORTED, and SYNTHETIC_ONLY
explicit where needed. Source digest changes, removed files, ambiguity,
missing provenance, renamed surfaces, and formatting-only equivalent changes
must have deterministic outcomes. Stale evidence cannot justify current HIGH.

## D — observation boundary

Keep only abstract types/presence/nullability/cardinality/sanitized identity
relations/order/quantity relations/enum/lifecycle facts and bounded categorical
metadata. Hostile sentinels must not leak through findings, replay, clusters,
dossiers, diagnostics, or continuity.

## E — replay V3/fidelity

Bind anomaly occurrences by action kind, step ordinal, expectation identity,
predecessor context, and observation fingerprint. Preserve V2 readers where
possible; ambiguous occurrence binding is explicit INCONCLUSIVE/AMBIGUOUS,
never guessed.

## F — synthetic minimization semantics

Run actual fixture replay through the minimizer. Test removable first/middle/
last non-trigger steps, assertions, joint reductions, order/predecessor/
repeated occurrence/expectation requirements, precondition and semantic
divergence, executor throw, and nondeterminism. Accept only the same anomaly
identity; record bounded rejection reasons.

## G — replay outcome taxonomy

Define and test REPRODUCED_EXACT, REPRODUCED_EQUIVALENT_SEMANTIC,
PRECONDITION_DIVERGENCE, SEMANTIC_DIVERGENCE, NOT_REPRODUCED,
AMBIGUOUS_OCCURRENCE, SOURCE_STALE, INVALID_REPLAY, and INFRA_FAILURE.
Infrastructure failure must not become NOT_REPRODUCED.

## H/I — confidence and degradation

Represent confidence evidence explicitly. HIGH requires current provenance,
deterministic semantic firing, same anomaly identity on replay, verified
minimization where claimed, and clean privacy/safety/ambiguity/precondition/
infra gates. Preserve historical observation confidence while lowering current
confidence after source invalidation without hidden mutable state.

## J — semantic clustering

Make identity deterministic across run IDs, harmless ordering, and minimized
forms while separating invariant/surface/provenance/stale-vs-current and
protocol-vs-semantic differences. Never include raw values, timestamps, paths,
or run IDs.

## K/L — change impact and coverage

Consume Phase 17 source-selection evidence and approved portfolio without new
authority. Explain source-change relevance to semantic coverage using bounded
tokens. Account for approved members with semantic coverage, invariant classes,
current/stale expectations, benign controls, replayable/minimizable anomalies,
and HIGH-eligible anomalies. Metrics do not grant authority.

## M — dossier V3

Version additive dossier evidence so owner review sees failed invariant,
supporting contract/provenance, sanitized contradictory observations, replay
outcome and occurrence binding, minimization status, confidence and reason,
source currentness, missing evidence, and passed safety/privacy gates. Keep
legacy readers and fail closed on malformed documents.

## N/O/P/Q — corpus, parser/privacy, static safety, dead surface

Build a substantial deterministic adversarial corpus with benign controls and
three repetitions where protocol expects it. Exercise hostile documents and
safe serialization; enforce no forbidden imports/authority; remove duplication
only after caller analysis and regression proof. Required floors include zero
privacy leaks, safety escapes, unauthorized operations, false HIGH promotions,
semantic identity escapes, accepted occurrence ambiguities, stale HIGH
promotions, nondeterministic artifacts, and wrong-anomaly minimizations.
