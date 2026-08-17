# PLAN — Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring

Task ID: `phase-11a-3-real-source-collection-admission-wiring`
Phase: `11A.3-REAL-SOURCE-COLLECTION-ADMISSION`
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Continuity protocol: `nightwatch.agent-continuity.v2`

## Purpose

Close the confirmed gap between the Phase 11 collection evaluator and the real-source expectation admission path. Build an additive deterministic collection-admission bridge, prove it with current production derivation code and synthetic/current-source canaries, preserve every historical positional expectation, and stop before DEV.

## Starting state

- Expected task-package base: `5669146332d357b09a49b29404a603e3fa1e828e`.
- Phase 11 collection evaluator exists and is locally validated.
- Phase 11A.1 receipt false-PASS is fixed locally at `51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3`.
- Phase 11A.2 shared acceptance false-PASS is fixed locally at `f763f3c42447c0c566f536ce6bdb38f2673ededc`.
- Current real-source admission still emits positional `itemIndex: 0` invariants and historical IDs.
- Phase 11 tests construct collection expectations through synthetic fixture helpers.
- GitHub Actions is externally blocked before job start by billing/spending-limit.
- Phase 11B is NOT_AUTHORIZED.

## Scope

Implement only the missing real-source-to-collection expectation admission wiring plus tests, hardening, CI matrix, continuity, and docs.

## Non-goals

No DEV/NEXT/production. No product mutation. No new product target or route. No Alphaus writes. No DB/data plane. No infrastructure/Phase 6. No campaign/minimization redesign. No differential. No new source semantics. No AI/model execution. No selfDev/promotion/catalog/B adoption. No publication.

## Safety constraints

- Existing real-source extraction remains the semantic authority.
- Historical derivation output remains unchanged.
- Collection scope is explicit, not numeric-path magic.
- Unsupported positional invariants fail closed.
- Current resolver stays target-identity based.
- No hidden semantic-generation priority in resolver.
- No network authority derives from expectation presence.
- No raw product values enter collection admission.

## Milestones

### M0 — bootstrap and reproduce the integration gap

- fetch origin;
- require clean main == origin/main;
- read AGENTS, ACTIVE_TASK, task package, Phase 11 design, Phase 11A.1/11A.2 closeouts;
- inspect current admission, registry, resolver, Phase 11 tests;
- permanently prove historical real-source derivation returns positional expectations and no current collection expectation path exists.

### M1 — define collection admission contract

- add explicit fixed target-to-collection expectation identity mapping;
- define distinct collection derivation version;
- define fail-closed transform result/failure vocabulary;
- choose narrow module location.

### M2 — implement additive transform

- consume validated recipe + mechanically derived historical expectation;
- retain root invariants once;
- convert only exact itemIndex-prefixed FIELD_PRESENT/FIELD_ABSENT/TYPE_MATCH/TYPE_IN_SET invariants;
- reject unsupported/mismatched cases;
- strict validate final collection expectation.

### M3 — implement batch collection derivation

- preserve existing `deriveRealSourceExpectation(s)` behavior;
- add explicit collection-wide derivation API;
- return derived + failures;
- keep source evidence/current SHA binding intact.

### M4 — resolver/currentness proof

- historical expectation set resolves historical ID;
- collection set resolves collection ID;
- source stale/unavailable/evidence drift fail closed;
- no resolver hidden priority or mixed generation.

### M5 — real-source fixture semantic proof

- use actual derivation functions with repository-owned synthetic source reader;
- common-exchange: historical later-row miss vs collection later-row detection;
- payer TYPE_IN_SET later-row detection;
- >128 collection response -> PARTIAL_COVERAGE through receipt/acceptance;
- no synthetic-only `createCollectionExpectation()` in load-bearing proof.

### M6 — four-recipe structural matrix

- derive collection expectations for every mechanically transformable current recipe;
- verify exact IDs, source evidence, invariant counts/kinds, no positional item contract remains;
- v1 recipes remain shape-only, no invented types.

### M7 — privacy, determinism, hardening

- sentinel sweep zero leaks;
- repeated collection derivation >=3, zero mismatches;
- pure-module hardening;
- approved/DEV-reachable target lists unchanged.

### M8 — current-source owner-local canary

- discover current ripple-api remote SHA;
- disposable read-only source snapshot;
- derive historical + collection sets;
- report safe structural facts only;
- no DEV contact.

### M9 — full local validation

Run all SPEC-required Phase 9 through Phase 11A.3 matrices, campaign synthetic, owner provenance, continuity/project/catalog checks, full and isolated Playwright, git diff check.

### M10 — substantive checkpoint

- commit/push validated source/tests/hardening/task state;
- fetch and verify HEAD == origin/main;
- re-check exact GitHub Actions run.

If Actions refuses to start because of the known billing/spending-limit condition, record `BLOCKED_EXTERNAL_CI`; do not claim CI success.

### M11 — clean post-checkpoint acceptance

- rerun focused Phase 11A.3 + load-bearing real-source fixture proof from clean checkout;
- if source changed after substantive checkpoint, fully revalidate before replacing the implementation anchor.

### M12 — docs/continuity closure

- record D-63 or actual next decision number;
- update Phase 11 design/current state/roadmap only from actual evidence;
- keep Phase 11B NOT_AUTHORIZED;
- if CI remains blocked, Phase 11B readiness is NOT_READY_EXTERNAL_CI.

### M13 — final exact CI truth

If Actions is available, require completed/success at exact final SHA. Otherwise terminalize external-CI-blocked truthfully.

## Expected implementation areas

Likely:

- `src/oracles/expectations/collectionAdmission.ts` or equivalent;
- `src/oracles/expectations/index.ts` exports;
- possibly narrow types in `src/oracles/expectations/types.ts` if required;
- tests for Phase 11A.3;
- hardening guard;
- `.github/workflows/hardening.yml` local matrix;
- `.agent/**` and docs.

Do not modify recipe source semantics unless a separately proven structural blocker requires a new task.

## Validation strategy

The decisive proof is not merely that a collection expectation can be constructed. It is:

```text
real-source-style source fixture
  -> existing recipe extraction/derivation
  -> explicit collection admission
  -> current collection expectation
  -> existing resolver/currentness
  -> semantic evaluation
  -> later-row anomaly detected
  -> partial tail remains PARTIAL_COVERAGE
  -> shared acceptance gate rejects partial coverage
```

with the paired historical expectation missing the later-row-only defect, proving the real-source integration gap has actually been closed.

## Decision log

- D-61 selected bounded collection-wide semantic evaluation.
- Phase 11A implemented the collection evaluator but did not alter real-source admission.
- Phase 11A.1 fixed receipt-layer partial coverage truth.
- Phase 11A.2 fixed shared acceptance-gate partial coverage truth.
- Phase 11A.3 is the missing real-source admission bridge; no DEV is authorized.

## Completion criteria

All SPEC gates pass locally, the current-source canary derives at least one valid collection expectation (preferably all four), historical semantics remain unchanged, no endpoint authority expands, and full regression is green.

Exact CI must be green before `PHASE_11B_DEV_READINESS: READY_FOR_SEPARATE_AUTHORIZATION`. If Actions remains externally blocked, terminal state is local-verified + external-CI-blocked and Phase 11B remains not ready/not authorized.
