# Phase 14A — Full Hardening Handoff

## Purpose

This file is the bridge from the five-change implementation batch to the next separately authorized repository-wide hardening campaign.

The implementation session must populate this file from actual evidence before stopping. Do not pre-fill future values or claim tests that were not run.

## Five implementation checkpoints

Record exact source-bearing SHAs:

- C1 analyzer IR + bounded control-flow engine: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`
- C2 static schema/generated-interface adapters: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`
- C3 real-source re-evaluation/additive admission: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`
- C4 source-contract drift/currentness intelligence: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`
- C5 contract coverage observability/tooling: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`
- final implementation-batch checkpoint: `FILL_FROM_GIT_AFTER_IMPLEMENTATION`

These placeholders are valid only while Phase 14 has not started. The executing session must replace all of them with actual Git evidence before terminalization.

## Changed dependency cone

Populate exact changed files/modules and classify them under:

1. extractor/analyzer core;
2. generated/static schema adapters;
3. expectation recipe/admission/resolver/currentness;
4. semantic identity/cluster/bundle compatibility;
5. coverage inventory/drift intelligence;
6. CLI/report/rendering surface;
7. corpus/fixtures/tests;
8. workflow/hardening/continuity changes.

## Contract/version changes

Record every new or changed version constant and why it is load-bearing. Include:

- analyzer version;
- normalized source-evidence version;
- derivation version(s);
- any new expectation recipe/ID/version;
- drift/currentness DTO version;
- observability report version/digest format;
- any manifest/checkpoint version implication.

State explicitly which historical versions/IDs remain unchanged.

## Real-source truth

Record:

- fresh remote SHA(s);
- disposable snapshot path/class and exact HEAD;
- canonical sibling before/after proof;
- approved target count;
- before/after depth/disposition for every target;
- exact new mechanically proven uplifts, if any;
- exact remaining blockers;
- wrong-SHA/stale/unavailable fail-closed evidence.

A zero-uplift result is valid and must be recorded plainly.

## Focused validation completed in implementation batch

For each C1-C5 record:

- typecheck result;
- git diff --check result;
- focused test command(s) and raw counts;
- narrow compatibility command(s) and raw counts;
- any known focused failure and disposition.

Record end-of-batch integrated results separately.

## Tests intentionally deferred / NOT_RUN

The implementation batch should normally leave these for the next hardening campaign:

- complete canonical Playwright;
- topology-correct isolated complete Playwright;
- broad Phase 9-13 compatibility sweep;
- exhaustive Phase-14 acceptance matrix;
- full owner-provenance sweep if not directly touched;
- full agent audit/history sweep if not required by batch continuity;
- exhaustive privacy/authority adversarial matrix;
- codebase-wide static/dead-code/compatibility review;
- exact GitHub Actions success requirement while Actions remains externally blocked.

If any were run anyway, replace `NOT_RUN` with the exact evidence rather than assuming success.

## Known risks for the hardening campaign

The implementation session must list concrete risks, including at minimum whether each applies:

- analyzer false proof from incomplete branch enumeration;
- parser/tokenizer ambiguity;
- alias-cycle or traversal-limit edge cases;
- generated/proto schema interpretation drift;
- historical expectation ID compatibility;
- wrong-SHA/currentness false-current risk;
- semantic cluster fragmentation/merging due evidence-version changes;
- campaign bundle/resolver compatibility;
- CLI/report serialization privacy leak;
- fixture/corpus not exercising a changed grammar edge;
- repository topology-sensitive tests;
- CI workflow step/version drift.

## Recommended next hardening order

The implementation session should update this based on actual changed surfaces. Default order:

1. inspect final five-change diff and versions;
2. focused Phase-14 adversarial analyzer matrix;
3. expectation/admission/resolver/currentness compatibility;
4. Phase-13 semantic promotion/cluster/shadow compatibility;
5. Phase-12 coverage/yield compatibility;
6. Phase-9/10/11 historical semantic compatibility;
7. hardening/static policy checks;
8. campaign synthetic + owner provenance;
9. canonical complete Playwright;
10. topology-correct isolated complete Playwright;
11. continuity/project/catalog checks;
12. exact GitHub Actions execution/CI truth;
13. durable docs/decision closure.

## Authority boundary

The future hardening campaign remains local/source-only unless separately authorized. This handoff grants no DEV, real campaign, Phase 11B/13B, production, mutation, data/infra, Alphaus-write, AI, selfDev, or promotion authority.
