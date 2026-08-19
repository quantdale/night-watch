# PROPOSAL — Nightwatch Phase 12A — Semantic Yield & High-Confidence Triage Productivity Pack

Task ID: `phase-12-semantic-yield-high-confidence-triage`
Phase: `12A-SEMANTIC-YIELD-TRIAGE-LOCAL`
Authorization class: `PHASE_12_SEMANTIC_TRIAGE_AND_COVERAGE_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## Why this task exists

Phase 11 materially increased semantic detection breadth inside collection responses, but the next bottleneck is now the ability to convert a deterministic semantic anomaly into a small, source-bound, privacy-safe, high-confidence bug candidate and to extend semantic coverage on already approved read-only surfaces.

The repository roadmap already names both as `NEXT_AFTER` investments after Phase 11:

- `HIGH_CONFIDENCE_SEMANTIC_TRIAGE`
- `REAL_SEMANTIC_COVERAGE_EXPANSION`

A concrete current defect/gap makes this immediately actionable: the real Phase 7 campaign adapter assigns `invalidReducedReplay()` to journey, exploration, and API candidates. Every reduced replay therefore returns `INVALID`, so the existing deterministic minimizer cannot provide genuine reduced-sequence evidence for real candidates. The minimizer itself already has bounded ddmin/one-deletion logic, strict safe-action gates, exact-fingerprint matching, explicit budgets, and honest minimality states; the missing layer is a safe replay contract and real-candidate wiring.

Phase 11A.4 has separately verified fresh current Ripple source and complete canonical/isolated regressions locally. GitHub Actions remains externally unavailable because jobs are refused before execution by the account billing/spending-limit condition. That external CI condition does not grant DEV authority and does not prevent a new owner-authorized LOCAL/SOURCE-ONLY implementation program.

## Objective

Deliver one substantial, measurable local/source-only productivity increment that does all of the following together:

1. replace the always-invalid real-candidate replay stub with a deterministic, bounded replay-plan architecture that can be tested without contacting DEV;
2. make semantic triage confidence depend on actual semantic/source/replay evidence rather than generic heuristics alone;
3. strengthen clustering, deduplication, and dossier evidence for semantic anomalies without retaining raw customer values;
4. inventory and, where mechanically proven, expand real-source semantic coverage on already-approved read-only targets without adding endpoint authority;
5. build a permanent synthetic backtest corpus and yield scorecard proving the new pipeline produces more actionable bug candidates with zero additional false positives/privacy leakage;
6. leave the real runtime ready for a future separately-authorized contained validation, but execute no DEV in this task.

## Fixed direction

This is not a grab-bag refactor. Every workstream must improve one of two quantities:

- **P(detection)** on already approved read-only surfaces; or
- **P(actionable | detected)** by improving deterministic reproduction, minimization, confidence, clustering, and dossiers.

No workstream may widen product/network authority.

## Workstreams

- A — Real replay plans + minimization correctness.
- B — Semantic-aware confidence + dossier evidence.
- C — Semantic clustering/dedup + contract identity.
- D — Current-source semantic coverage inventory + bounded expansion.
- E — Synthetic bug-yield backtest + productivity scorecard.
- F — Hardening, compatibility, complete regression, continuity, CI truth.

Detailed workstream contracts live beside this proposal.

## Success condition

Phase 12A succeeds locally only if the permanent test corpus proves all of the following:

- the historical `invalidReducedReplay()` behavior is reproduced first;
- a safe replay-plan path can represent journey, exploration, and API candidates without inventing actions or values;
- fresh exact replay and reduced-candidate replay are distinguishable and fail closed;
- later semantic anomalies can be minimized when a safe subsequence reproduces the exact same semantic fingerprint;
- partial coverage, stale source, source-unavailable, safety events, privacy failures, different fingerprints, invalid preconditions, and known Nightwatch defects can never be upgraded into high confidence;
- semantic contract identity remains stable enough for deduplication and does not fragment on row ordinal/raw value;
- source coverage inventory is derived from a fresh disposable current source snapshot;
- no new product target/route authority is created;
- any new semantic contract is mechanically source-proven and restricted to already approved read-only targets;
- Phase 12 detects/minimizes more seeded actionable cases than the current baseline while benign false positives remain zero;
- privacy sentinel leakage remains zero;
- full canonical and topology-correct isolated Playwright regressions have zero failures.

## Owner boundary

Pasting the later short CLI bootstrap prompt authorizes only the LOCAL/SOURCE-ONLY Phase 12A task represented by these GitHub specs.

It does NOT authorize Phase 11B, DEV, NEXT, production, a real campaign, database/data-plane work, infrastructure/Phase 6, product mutation, Alphaus writes, external publication, AI/model authority, selfDev/promotion/catalog mutation, or variant-B adoption.
