# Phase 13 — Real Campaign Semantic Runtime Integration

Status at publication: DESIGNED / NOT_STARTED / NOT_AUTHORIZED
Architecture: `REAL_CAMPAIGN_SEMANTIC_RUNTIME_INTEGRATION`
Implementation authorization: `PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION_LOCAL_ONLY`

## 1. Context

Nightwatch's semantic stack matured in layers:

- Phase 9: deterministic semantic projection/oracle foundation;
- Phase 9A.1: mechanically admitted real-source expectations;
- Phase 9B/10B: bounded contained-DEV acceptance of source-derived semantic contracts;
- Phase 10: deeper L3 source-derived type contracts;
- Phase 11: bounded collection-wide evaluation, truthful partial coverage, and real-source collection admission;
- Phase 12: replay-plan/control evidence, synthetic replay adapters, semantic confidence, dossier v2, semantic cluster identity, source coverage inventory, and yield backtest.

The architecture now has strong components, but the real autonomous campaign source path still predates much of that stack. The next useful investment is not another isolated oracle. It is disciplined integration.

## 2. Current structural bottleneck

The real Phase 7 campaign adapter still supplies an always-invalid reduced replay callback for all candidate classes. Campaign candidates can carry Phase 9 semantic findings, but the orchestrator still flows through the historical triage/dossier-v1 route. Campaign version identity also predates the Phase 12 replay/semantic contracts.

This creates a split architecture:

```text
REAL CAMPAIGN
  observation
    -> historical candidate
    -> generic clustering/reproduction
    -> invalid reduced replay
    -> historical triage/dossier

LOCAL PHASE 12
  replay plans
  replay adapters
  semantic triage evidence
  semantic confidence
  semantic clusters
  dossier v2
  yield backtest
```

Phase 13 closes that split at the source architecture level without executing DEV.

## 3. Target architecture

```text
FRESH REMOTE SOURCE METADATA
        |
        v
DISPOSABLE EXACT SOURCE SNAPSHOT
        |
        v
REAL-SOURCE EXPECTATION DERIVATION
        |
        v
FROZEN SEMANTIC CAMPAIGN BUNDLE
        |
        +-------------------------------+
        |                               |
        v                               v
EXISTING REAL CAMPAIGN              CAMPAIGN MANIFEST
JOURNEY/API/EXPLORATION             freezes semantic/replay
        |                            executable identity
        v                               |
EXISTING CONTAINMENT +                  |
NETWORK OBSERVER                         |
        |                               |
        +---- semanticOracle <----------+
        |
        v
SAFE RECEIPTS / FINDINGS
        |
        v
VERSIONED CAMPAIGN CANDIDATE EVIDENCE
        |
        +-------------------------+
        |                         |
        v                         v
SEMANTIC CLUSTER             OCCURRENCE-BOUND
IDENTITY                     REPLAY PLAN
        |                         |
        |                         v
        |                    EXACT / REDUCED
        |                    REPLAY ADAPTER
        |                         |
        +------------+------------+
                     |
                     v
              EXISTING MINIMIZER
                     |
                     v
          SEMANTIC TRIAGE EVIDENCE
                     |
                     v
          CATEGORICAL CONFIDENCE
                     |
                     v
                DOSSIER V2
                     |
                     v
         PRIVATE SANITIZED EVIDENCE
```

No element above adds product authority. It composes existing approved read-only authority with deterministic evidence processing.

## 4. Frozen semantic campaign bundle

A future campaign should not derive semantic truth ad hoc during individual findings. Before execution it freezes a bundle derived at one freshness-approved source snapshot.

The bundle binds source/evidence/derivation/target identities to existing approved campaign surfaces. That provides three properties:

1. semantic currentness is explicit;
2. resume can detect source/executable drift;
3. candidate claims cannot fabricate current source authority.

Deployment status remains unresolved. Source currentness is not deployment proof.

## 5. Replay occurrence identity

Phase 12 replay plans are order-aware by action ID, while the minimizer internally preserves occurrence index. Phase 13 aligns the control DTO with the reducer's stronger occurrence semantics.

The principle is:

> A reduced replay identifies which original occurrences remain, not merely which action names remain.

This matters when the same approved action appears twice under different route/precondition history.

Occurrence identity remains structural and safe. It does not carry runtime values.

## 6. Replay is reduction, never exploration

The real replay path must satisfy D-31:

- only original approved occurrences;
- original order;
- no new selector/action/value;
- bounded replay budget;
- exact anomaly fingerprint equality;
- invalid preconditions are not product failures.

Exploration reduction does not call the exploration planner. Journey reduction is supported only if contract dependency closure is mechanically executable. Otherwise it remains explicitly unsupported rather than guessed.

## 7. Semantic observer integration

Nightwatch already exposes an explicit semantic-oracle option in `createNightwatchContext`. Phase 13 uses that seam instead of introducing another response interception system.

The real campaign adapter supplies a resolver from its frozen semantic bundle only for fixed approved mappings. The network observer handles ephemeral response projection; the campaign receives sanitized results only.

This preserves the established privacy contract.

## 8. Semantic candidate evidence

The campaign candidate should distinguish:

- protocol evidence;
- semantic evidence.

Semantic evidence is optional so protocol-only historical behavior remains intact. When present it must be strict and versioned, carrying only safe deterministic identity/currentness/coverage facts.

Replay success is not a candidate-provided fact. It is added or derived only after reproduction/minimization actually executes.

## 9. Clustering

Protocol anomalies continue using historical stable-feature clustering.

Semantic anomalies use semantic contract identity:

- normalized evidence digest;
- derivation version;
- invariant/expectation identity;
- stable semantic fingerprint.

Source SHA alone is not semantic identity because irrelevant SHA movement should not fragment the same mechanically derived contract.

Likewise row ordinal/count is execution detail and must not create one cluster per failing row.

## 10. Confidence and dossier readiness

The deterministic oracle decides anomaly truth. Confidence summarizes evidence quality only.

For semantic candidates:

- stale/unavailable/partial/non-reproduced/unsafe/private/known-FP cannot reach HIGH;
- full current exact-fingerprint reproduced evidence with sufficient minimization may reach HIGH;
- dossier v2 READY is derived from evidence;
- unresolved evidence remains useful but explicitly UNRESOLVED.

Generic browser/API confidence may support localization but cannot override stricter semantic confidence.

## 11. AI-ready projection

AI-ready evidence remains a sanitized deterministic package. No model is part of Phase 13.

A subtle but important invariant is added:

> When semantic evidence exists, downstream displayed confidence may not be stronger than deterministic semantic confidence.

Otherwise a package could accurately carry a semantic blocker while simultaneously advertising legacy HIGH confidence.

## 12. Campaign executable identity

Campaign manifests currently freeze a broad set of runtime versions. Phase 13 extends that identity only with load-bearing semantic/replay contracts.

A resumed campaign must not mix:

- one replay-plan representation with another;
- one semantic evidence/readiness contract with another;
- one source-bundle derivation contract with another;
- one semantic cluster identity with another.

Drift causes STOP/new campaign, not automatic migration.

## 13. Shadow campaign

Phase 13A cannot prove actual DEV behavior because DEV is excluded. Instead it proves architectural integration through a permanent shadow campaign that uses the same integration modules and substitutes synthetic executors only at the final external boundary.

This is stronger than isolated unit tests because it exercises:

```text
manifest
 -> frozen semantic bundle
 -> observation/candidate mapping
 -> replay plan
 -> minimizer
 -> cluster
 -> triage evidence
 -> semantic confidence
 -> dossier v2
 -> checkpoint/resume
```

The corpus contains normal, anomaly, partial, stale, drift, duplicate-occurrence, replay, privacy, and protocol-only cases.

## 14. Quality metrics

Phase 13 uses integer structural metrics instead of a weighted score.

The most important metrics are zero floors:

- false reproduction;
- false READY from partial/stale/unsafe states;
- AI-ready confidence overclaim;
- occurrence ambiguity;
- manifest drift misses;
- privacy leakage;
- nondeterministic mismatch.

Positive productivity metrics include executable replay coverage and semantic-dossier coverage, but those must never be improved by weakening gates.

## 15. Safety and privacy

Unchanged hard boundaries:

- no production;
- no NEXT;
- no mutation;
- Phase 6 frozen;
- no DB/infra;
- no Alphaus writes;
- no raw customer values persisted;
- no auth traces/screenshots from this integration;
- no AI authority;
- no selfDev/promotion/catalog mutation.

Pure integration cores remain network/browser/fs independent. Read-only source discovery is isolated at an explicit producer boundary.

## 16. Phase 13A vs 13B

Phase 13A is implementation + local/source proof only.

Phase 13B, if later justified, is a separately authorized contained DEV canary. It is not implied by Phase 13A success.

A future 13B should prefer one bounded fixed journey/expectation/replay acceptance over an overnight campaign. The purpose is to validate that the integrated real path behaves as the local architecture predicts, not to maximize runtime coverage immediately.

Exact CI green is a prerequisite for 13B readiness.

## 17. External CI blocker

GitHub Actions billing is an external verification blocker, not a reason to leave useful local architecture work undone.

If the blocker persists, Phase 13A should end:

`VERIFIED_LOCAL_NOT_CI_VERIFIED / BLOCKED_EXTERNAL_CI`

and Phase 13B remains not ready.

## 18. Non-goals

Phase 13A does not:

- run DEV;
- add semantic business rules;
- add endpoints/targets;
- build browser/API differential expansion;
- reopen Phase 6;
- expand to another product;
- run AI;
- perform self-development;
- publish findings.

## 19. Completion proof

The architecture is locally complete only when:

- Phase 12 integrity gaps are permanently closed;
- fresh-source semantic bundle derives/resolves;
- real campaign source code contains bounded semantic/replay integration;
- manifest/checkpoint identity covers the new contracts;
- the end-to-end shadow campaign passes with quality floors zero;
- protocol compatibility remains green;
- canonical and topology-correct isolated full suites have zero failures;
- privacy/safety/authority sets remain unchanged;
- durable task/project truth is reconciled.

Then STOP.
