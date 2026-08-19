# Phase 12 — Semantic Yield & High-Confidence Triage

Status: AUTHORIZED_FOR_PHASE_12A_LOCAL_IMPLEMENTATION
Authorization class: `PHASE_12_SEMANTIC_TRIAGE_AND_COVERAGE_LOCAL_ONLY`
Task: `.agent/tasks/phase-12-semantic-yield-high-confidence-triage/`
Starting Nightwatch source before task package: `cc0ea71a64d06b84b73d396f1c01311513aefe2c`

## 1. Why Phase 12 now

Phase 9 introduced deterministic semantic oracles. Phase 10 deepened source-backed contracts. Phase 11 removed the item-0 collection blind spot and added honest collection coverage. The post-Phase-10 roadmap explicitly identified the next two investments after Phase 11 as:

- HIGH_CONFIDENCE_SEMANTIC_TRIAGE;
- REAL_SEMANTIC_COVERAGE_EXPANSION.

The ordering now makes sense: after increasing P(detection), Nightwatch should increase P(actionable | detected), while safely extending source-backed coverage on already approved read-only targets.

The current real-campaign triage path has a concrete blocker: `tests/manual/phase7-real-campaign.ts` gives every real journey/exploration/API candidate an `invalidReducedReplay()` callback. It returns INVALID for every reduced sequence. The deterministic minimizer is therefore architecturally present but cannot produce real reduced-sequence evidence.

## 2. Phase 12 architecture

```text
CURRENT SOURCE-BOUND SEMANTIC EXPECTATION
                 |
                 v
       DETERMINISTIC ANOMALY
                 |
                 v
      STRICT REPLAY PLAN (data only)
                 |
          +------+------+
          |             |
          v             v
   EXACT FRESH       REDUCED
     REPLAY           REPLAY
          |             |
          +------+------+ 
                 |
                 v
        HONEST MINIMALITY
                 |
                 v
  SEMANTIC/SOURCE-AWARE CONFIDENCE
                 |
                 v
     STABLE SEMANTIC CLUSTER
                 |
                 v
       READY / UNRESOLVED
          PRIVATE DOSSIER
                 |
                 v
      FIXED-CORPUS YIELD SCORECARD
```

In parallel, Phase 12 builds a current-source semantic coverage inventory:

```text
CURRENT APPROVED READ-ONLY TARGET SET
                 |
                 v
      FRESH SOURCE SNAPSHOT
                 |
                 v
  CURRENT RECIPE / EXPECTATION CENSUS
                 |
                 +---- already admitted
                 |
                 +---- depth uplift mechanically proven
                 |
                 +---- ambiguous -> reject
                 |
                 +---- unobservable -> reject
                 |
                 +---- no mechanical contract -> reject
```

No target/network authority is created by either branch.

## 3. Replay-plan design

The replay plan is declarative Nightwatch control data, not an executor and not product permission.

It binds:

- candidate kind;
- original ordered action occurrences;
- target anomaly fingerprint;
- existing approved journey/action/operation identities;
- contract/catalog/source identity;
- semantic expectation/source evidence identity when available;
- replay phase.

Candidate reduction is an order-preserving subsequence only.

A plan cannot invent selectors, routes, URLs, parameters, payloads, values, actions, source truth, or endpoint authority.

## 4. Real adapter design

The future real runtime may consume a validated replay plan only after all existing real-run gates. Phase 12A tests the adapter contract with synthetic executor doubles and may wire existing real adapter code, but it executes no DEV.

Journey, exploration, and API have different subset semantics and therefore explicit adapters rather than one free-form callback.

### Journey

Only original declarative step IDs, with dependency/precondition/route closure proven. Unsafe subset is invalid before browser exposure.

### Exploration

Only original Phase 4 approved safe actions. No planner/explorer generation during replay.

### API

Only the original Phase 5 approved operation. Single-action anomalies can reproduce exactly but may be irreducible and therefore UNCHANGED.

## 5. Minimization truth

The existing minimizer remains the reduction authority. Phase 12 does not claim global minimality.

Only exact target fingerprint reproduction counts. Different failure is not reproduction.

Safety/privacy nonzero or invalid precondition is not reproduction.

## 6. Semantic confidence design

Generic reproduction heuristics are insufficient for modern semantic evidence. Phase 12 introduces explicit semantic triage evidence and categorical confidence predicates.

HIGH confidence requires current/resolved semantic authority, a full observed anomaly, exact fingerprint replay, clean safety/privacy, no known false positive, and sufficient deterministic reproduction/minimality evidence.

PARTIAL_COVERAGE, stale/unavailable source, INTERNAL_ERROR, NO_EXPECTATION, different replay fingerprint, or nonzero safety/privacy are hard blockers to HIGH.

No percentages or model scoring.

## 7. Dossier design

Historical protocol-only dossiers remain interpretable.

If new evidence changes immutable schema meaning, use a new version instead of silently mutating v1.

Semantic dossiers carry only safe contract/replay/source/coverage metadata and explicit missing-evidence codes. READY is a derived state, never a writer-controlled optimistic label.

## 8. Semantic cluster identity

A semantic cluster represents a violated source-backed contract, not a row.

Identity should include safe contract facts such as expectation/target/invariant/evidence identity, while excluding row ordinal, violation count, raw value, customer identity, timestamp, and private path.

Unrelated source SHA movement with identical normalized evidence should not fragment the semantic class. Changed evidence/derivation semantics must not silently merge.

## 9. Coverage expansion design

Coverage expansion is strictly subordinate to source proof.

The inventory begins from the current approved read-only target set. It does not discover arbitrary endpoints.

Order of investment:

1. re-derive current four contracts at fresh source;
2. attempt deeper type contracts for currently shallow admitted targets using existing Phase 10 machinery;
3. assess other already-approved targets only when current observer compatibility exists;
4. reject ambiguity/unobservability rather than building new transport or semantics.

A zero-addition result can be correct.

## 10. Source freshness

Fresh source means remote SHA resolved during the task and an exact disposable snapshot. Canonical siblings are never used as proof of remote freshness merely because they are clean.

The triage core itself remains source/network agnostic; any source attestation it consumes is data-only.

## 11. Fixed-corpus yield measurement

Phase 12 is accepted on measured behavior, not code volume.

The permanent corpus compares the exact starting baseline and the new pipeline on the same cases.

Primary productivity assertions:

- more safely replayable/minimized seeded anomalies;
- fewer invalid-replay outcomes for mechanically safe candidates;
- zero new benign false positives;
- zero partial/stale false passes;
- zero wrong-fingerprint reproductions;
- zero privacy leaks;
- stable clustering;
- deterministic results.

Raw counts are canonical.

## 12. Hardening

Pure cores cannot reach browser/network/fs/process/DB/infra/AI/selfDev/product execution.

Real runtime wiring remains at the existing explicit manual/launcher boundary and retains existing gates.

## 13. Compatibility

Phase 12 must preserve:

- Phase 9 source-backed semantic authority;
- Phase 10 deep contract semantics;
- Phase 11 collection/partial-coverage truth;
- Phase 11 historical positional and current collection identity separation;
- Phase 7 budget/scheduling unless a correctness defect is independently proven;
- owner-scope Phase 6 freeze;
- catalog count/digest and promotion authority NONE.

## 14. External CI condition

GitHub Actions is currently refusing jobs before steps due account billing/spending-limit. Phase 12A may perform its authorized local/source work despite this, but exact CI success cannot be claimed until jobs actually execute and pass.

This condition does not authorize DEV.

## 15. Future runtime validation

Any future real validation of Phase 12 replay/triage behavior requires separate owner authorization. It is not included in Phase 12A.

Phase 11B also remains separately unauthorized.

## 16. Success state

Locally successful but externally CI-blocked:

```text
PHASE_12_REAL_REPLAY: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_HIGH_CONFIDENCE_TRIAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_REAL_SOURCE_COVERAGE: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12_YIELD_BACKTEST: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_12A_STATUS: BLOCKED_EXTERNAL_CI
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Exact CI-green completion may later upgrade the Phase 12A task state without implying any DEV authority.
