# Nightwatch Phase 18 — Semantic Contract Depth, Replay Fidelity and Confidence-Aware Triage

## Intent

Increase the local/source/synthetic bug-hunting value of the existing semantic
pipeline so a transport-successful response can be evaluated for business
correctness and the resulting claim can survive occurrence-bound replay,
deterministic minimization, confidence-aware triage, clustering, and sanitized
owner review.

The target flow is:

```text
source provenance -> approved change-aware portfolio -> sanitized observation
  -> deterministic semantic invariant -> anomaly -> occurrence-bound replay
  -> minimized reproducer -> evidence-backed confidence -> semantic cluster
  -> sanitized dossier
```

## Authorization and hard boundary

Authorization recorded before substantive implementation mutation:

```text
PHASE_18_SEMANTIC_REPLAY_TRIAGE_LOCAL_SOURCE_SYNTHETIC_ONLY
```

This authorization covers only the Nightwatch repository, local execution,
read-only source inspection, synthetic fixtures, deterministic local campaigns,
existing offline fixtures, tests, static analysis, and sanitized generated
evidence. It grants no authority for DEV/NEXT/production contact,
authenticated sessions or storage state, product/customer mutation,
database/datastore access, cloud/GCP/AWS/Kubernetes work, Phase 6, Phase 11B,
Phase 13B, Phase 16D, sibling writes, external publication, messaging,
canonical self-development promotion, AI authority, or real-finding storage.

Permanent owner policy remains `FROZEN_BY_OWNER /
INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`; Phase 17 remains terminal.

## Frozen scope

- Reconstruct the current semantic, replay, minimization, triage, clustering,
  portfolio, evidence, and dossier path before designing new abstractions.
- Add a bounded, versioned semantic contract model only where current source
  demonstrates duplicated or stringly-typed contract representation.
- Expand deterministic business-behavior invariants with source/fixture-backed
  expectations, positive seeds, benign controls, bounded evidence, and replay
  compatibility.
- Make source currentness, occurrence identity, replay outcomes, minimization
  decisions, confidence, semantic clustering, change impact, coverage metrics,
  dossiers, privacy, parsers, and static authority guards mutually consistent.
- Preserve historical schemas and compatibility readers unless an explicit
  additive version is required and permanently tested.

## Non-goals

No real-product campaign, no new runtime authority, no data-plane or
infrastructure investigation, no source annotation or sibling mutation, no
external coordination/publication, no AI-generated oracle truth, no new
canonical promotion, no raw-value persistence, and no broad theorem engine.

## Safety invariants

Semantic projections remain in-memory and sanitized. Raw customer-like values,
raw IDs, arbitrary text, headers, bodies, tokens, secrets, and sensitive URLs
must not cross into findings, fingerprints, replay plans, clusters, dossiers,
diagnostics, artifacts, or continuity files. Unknown contract kinds,
ambiguous provenance, stale source, ambiguous occurrence, malformed replay,
infrastructure failure, privacy failure, and authority violations fail closed.
Pure semantic/replay/triage/clustering/dossier decision layers must not gain
network, browser, database, cloud, process, AI, self-development, source-write,
or promotion authority.

## Success predicate

The task may close only after the reconstructed pipeline is recorded, the
implemented waves have focused permanent regressions, every new anomaly class
has a positive and benign fixture, occurrence-bound replay and real synthetic
minimization preserve anomaly identity, false HIGH-confidence promotions are
zero, stale confidence degrades, clusters and dossiers remain sanitized and
deterministic, the permanent corpus and quality floors are green, the full
canonical and topology-correct isolated regressions have exact parity, task
continuity/project truth is valid, and `HEAD == origin/main` with a clean tree.

## Defect policy

Any reproduced implementation defect is recorded as `DEF-18-XX` and follows
`REPRODUCED -> ROOT_CAUSED -> SOURCE_FIXED -> PERMANENT_REGRESSION ->
FOCUSED_GREEN -> AFFECTED_GREEN -> FULL_GREEN`. Disproven reports are recorded
as `REFUTED_NOT_A_DEFECT` with evidence. Tests and invariants are never
weakened to obtain green results.
