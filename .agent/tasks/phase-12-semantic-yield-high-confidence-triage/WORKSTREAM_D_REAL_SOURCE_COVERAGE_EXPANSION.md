# Workstream D — Current Real-Source Semantic Coverage Inventory & Bounded Expansion

Parent task: `phase-12-semantic-yield-high-confidence-triage`
Authority: LOCAL/SOURCE-ONLY only. Alphaus repositories read-only.

## D1. Objective

Turn semantic-coverage discussion into a source-current deterministic inventory and safely increase coverage only where current source mechanically proves additional semantics on targets already approved by Nightwatch.

## D2. Fresh source is mandatory

Before claiming current coverage:

1. resolve current `mobingilabs/ripple-api` remote `master` SHA fresh;
2. use a disposable exact snapshot outside canonical sibling checkouts;
3. verify exact snapshot HEAD;
4. keep canonical sibling checkout HEAD/status byte-state unchanged by the task;
5. report remote SHA and source-contract drift facts structurally.

Never call a historical pin current.

## D3. Inventory scope

Inventory the current Nightwatch approved read-only target set, including targets without recipes.

For each target record safe deterministic metadata:

- targetId;
- approved-read-only yes/no;
- DEV-reachable yes/no (existing authority only);
- observer class (JSON browser/API observer, gRPC/unobservable, legacy ambiguous, etc.);
- recipeId/version if any;
- historical expectationId if any;
- collection expectationId if any;
- source repo/path/symbol;
- source SHA;
- source evidence digest if derived;
- semantic depth class;
- currentness/resolver state;
- coverage disposition/rejection code.

Canonical target ordering by targetId.

## D4. Fixed coverage dispositions

Use a bounded vocabulary, repository-native equivalent allowed:

- APPROVED_AND_ADMITTED
- APPROVED_AND_ADMITTED_COLLECTION
- APPROVED_NOT_ADMITTED_AMBIGUOUS
- APPROVED_NOT_OBSERVABLE
- APPROVED_SOURCE_UNAVAILABLE
- APPROVED_SOURCE_STALE
- APPROVED_NO_MECHANICAL_CONTRACT
- NOT_APPROVED_OUT_OF_SCOPE

No free-form classification as authority.

## D5. Existing four contracts

Re-derive current historical + collection expectations for the existing four recipes from the fresh snapshot.

Verify:

- IDs;
- recipe versions;
- evidence digests;
- root/item/collection invariant counts;
- currentness;
- DEV-reachability set unchanged.

Any drift must be resolved by fresh source evidence, not automatic rebinding.

## D6. Depth uplift on shallow targets

Assess existing v1/shallow admitted targets first, especially account inventory and billing-group exchange, for mechanically provable type contracts using the existing Phase 10 deterministic extractor vocabulary.

If existing extractors can prove stable item-field type flow:

- add explicit versioned/deep recipe/expectation identity;
- retain historical shallow identity;
- derive collection form through the Phase 11 bridge;
- add mutation/benign precision tests;
- preserve source evidence/currentness rules.

If type flow is ambiguous/runtime-computed, reject with a precise code. Do not guess.

## D7. Approved but not admitted targets

Assess approved read-only targets that currently have no real-source expectation only if the current observer can actually observe their response class.

Known historical considerations may include legacy billing-group or gRPC surfaces, but current source wins.

Rules:

- do not add a new transport;
- do not add a new route/target ID;
- do not make an unobservable gRPC response magically JSON-observable;
- conditional/blob/runtime-computed schemas remain fail-closed;
- no Alphaus annotations;
- use existing extractor vocabulary first;
- a narrowly extended extractor is allowed only if deterministic, bounded, source-only, heavily negative-tested, and does not execute application code.

## D8. Expansion quota

There is NO required count of new contracts.

A truthful zero-addition result with precise blockers is better than invented semantics.

However, if current source mechanically proves one or more additional contracts, implement all clearly in-scope ones that can be validated within this task rather than arbitrarily stopping after the first.

## D9. Authority invariants

Before/after require byte/semantic equality of:

- approved read-only target IDs;
- DEV-reachable target IDs;
- mutation/unknown authority sets;
- production deny rules;
- catalog count/digest;
- Phase 11B authorization state.

Coverage expectations do not grant network authority.

## D10. Coverage quality metrics

Report raw counts:

- approved target count;
- admitted historical target count;
- admitted collection target count;
- deep/type target count;
- observer-unavailable count;
- ambiguous count;
- mechanically uncovered count;
- new contracts added;
- existing contracts depth-uplifted;
- derivation failures;
- stale/unavailable failures.

Do not turn these into fake coverage percentages unless a denominator is explicitly defined and still report raw counts.

## D11. Precision tests for any new contract

For each new/deeper contract:

- conforming synthetic fixture PASS;
- planted source-relevant semantic defect ANOMALY;
- benign alternate allowed representation PASS;
- ambiguous source mutation fails derivation/currentness;
- source evidence digest changes when load-bearing proof changes;
- unrelated source change with identical evidence follows existing currentness design;
- collection later-row defect detected if collection-style;
- partial coverage stays PARTIAL_COVERAGE;
- privacy sentinels zero leaks.

## D12. Durable coverage inventory

Prefer a deterministic source/test-backed inventory generator/module plus a docs snapshot, rather than a manually maintained table that can drift.

The inventory core must be pure over registered target/recipe/source-derived metadata.

Fresh remote source acquisition remains owner-local outside CI.

## D13. CI

CI uses repository-owned synthetic source fixtures only. It must not fetch live Alphaus source.

## D14. Acceptance

This workstream is locally VERIFIED when the current-source inventory is complete, deterministic, source-current, and every coverage addition/rejection is evidence-backed without any target/network authority expansion.
