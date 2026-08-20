# Phase 14A — Mechanical Real-Source Contract Expansion

## Status at publication

Designed, not started, not authorized.

Required implementation authority:

`PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY`

## Why this phase exists

Phase 12 proved that Nightwatch can inventory real semantic source coverage against a fresh disposable source snapshot without writing sibling repositories. It also established that the current bottleneck is no longer simply semantic evaluation depth: several already-approved read-only targets remain shallow or unadmitted because the source extractor cannot mechanically prove stronger contracts.

The known blocker classes are:

- `TYPE_FLOW_AMBIGUOUS` for account-inventory and billing-group-exchange depth;
- `AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED` for the legacy billing-groups target;
- `GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT` for the chunked billing-groups target.

These must not be solved by guessing product semantics. Phase 14 improves the proof engine, then asks the source again.

## Design principle

The analyzer is a theorem prover over a deliberately small source vocabulary, not a general program interpreter.

A contract may be admitted only when every fact needed by that invariant is mechanically derivable from bounded static source or an authoritative generated/interface schema already present in an approved source repository.

Runtime likelihood is not proof.

Examples of non-proof:

- a database column called `exchange_rate` does not prove object/string/number type;
- a route named `billing-groups` does not prove response envelope shape;
- a comment saying "chunked" does not prove transport semantics;
- one conditional branch with a literal schema does not prove all branches have that schema.

## Analyzer layers

### Layer 1 — Source envelope

Inputs are explicit repo/SHA/path/symbol coordinates through the existing read-only source adapter. The analyzer never discovers or authorizes a new product target by itself.

Outputs carry safe provenance and normalized evidence digests.

### Layer 2 — Bounded structure extraction

Recognize only fixed proof classes such as:

- literal row/object construction;
- explicit scalar casts/literals;
- finite branch unions;
- bounded aliases within one source symbol;
- explicit empty/non-empty conversion patterns;
- guaranteed fields present in every statically enumerable return branch;
- finite generated/proto/interface field sets.

Unknown control flow returns a blocker, not a contract.

### Layer 3 — Proof normalization

Normalize equivalent evidence so unrelated source-SHA movement does not necessarily fragment semantic identity. Source SHA remains currentness/provenance evidence, while normalized evidence + derivation version remain semantic identity inputs consistent with Phase 12/13.

### Layer 4 — Product-target admission

Existing target recipes consume analyzer proof. Stronger semantics receive additive IDs/versioning. Historical IDs are immutable.

### Layer 5 — Fresh-source currentness

Every source-derived contract is checked against a freshly resolved remote SHA and disposable exact snapshot. Wrong/missing source fails closed.

## Target strategy

### Account inventory

Look for literal row keys, explicit casts, finite normalization, or all-branch envelope guarantees. Do not infer DB-returned types.

### Billing-group exchange

Trace copied values and explicit normalization. If the value remains a direct runtime structure read, preserve type ambiguity.

### Legacy billing-groups

Only admit a finite branch-union contract when all relevant branches are mechanically enumerable. Runtime-computed blob branches keep the blocker.

### gRPC/chunked billing-groups

The blocker name says only that a PHP contract was unavailable. Phase 14 must locate the actual authoritative static source. If approved proto/generated/interface definitions mechanically encode field or chunk structure, a bounded non-PHP adapter is valid. If not, retain the blocker. No DEV observation is used to fill the gap.

## Identity/versioning

Any new analyzer behavior requires a version that is load-bearing in derivation identity.

If a real-source target gains a stronger contract:

- keep old expectation ID/meaning intact;
- add a new recipe/expectation identity or explicit stronger version;
- preserve explicit collection scope;
- currentness and evidence digest participate correctly;
- semantic cluster identity remains stable across source-SHA-only movement when normalized evidence is identical;
- changed normalized evidence or derivation semantics split identity.

## Failure vocabulary

Use precise stable blocker classes rather than catch-all failure. Expected categories include:

- `SOURCE_UNAVAILABLE`
- `SOURCE_STALE`
- `SYMBOL_UNAVAILABLE`
- `UNSUPPORTED_SYNTAX`
- `DYNAMIC_KEY_FLOW`
- `RUNTIME_VALUE_TYPE_UNPROVEN`
- `BRANCH_SET_INCOMPLETE`
- `CONDITIONAL_BLOB_AMBIGUOUS`
- `GENERATED_SCHEMA_UNAVAILABLE`
- `TRANSPORT_CONTRACT_UNPROVEN`
- `PARTIAL_PROOF_ONLY`

The implementation may choose exact names, but they must be deterministic, bounded, and tested.

## Corpus philosophy

`corpus/phase14` is source text, not product data. It should be large enough to prove the analyzer cannot be tricked by superficially similar source.

Required adversarial cases include:

- comments that look like contracts;
- string literals containing field names without structural meaning;
- branch where one path lacks the field;
- dynamic array keys;
- alias cycles;
- runtime database result copies;
- generated schema missing;
- proto field present but no chunk/cardinality guarantee;
- privacy sentinel strings that must never leak into safe evidence.

## Success definition

Phase 14 is not measured by how many product contracts it manages to add. It is measured by whether Nightwatch can make a stronger mechanically justified distinction between:

1. PROVEN current contract;
2. AMBIGUOUS source;
3. UNSUPPORTED source form;
4. UNAVAILABLE/STALE source.

A zero-uplift fresh-source result is acceptable and useful if that distinction becomes materially stronger and all false-proof floors remain zero.

## Deferred real-environment work

No DEV acceptance belongs to Phase 14A. Any future contained real acceptance remains a separate owner authorization after exact CI policy is satisfied. Phase 11B and Phase 13B remain NOT_AUTHORIZED by this design.
