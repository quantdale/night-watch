# SPEC — Nightwatch Phase 14A — Mechanical Real-Source Contract Expansion

Task ID: `phase-14-mechanical-source-contract-expansion`
Phase: `14A-MECHANICAL-SOURCE-CONTRACT-EXPANSION`
Starting SHA: discover from Git at execution; authoring anchor `22106ad6b1745b6486d649b37513210eb74a20d8`
Required authorization: `PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Objective

Increase Nightwatch's mechanically proven semantic depth across the EXISTING approved read-only source targets by extending deterministic source-contract extraction. Close or sharpen the Phase-12 blockers without inventing runtime semantics, endpoint authority, target authority, or product values.

The phase is successful when the analyzer capability is stronger, current-source classification is more precise, and every admitted uplift is backed by exact fresh-source evidence. Real-source uplift count may be zero if source truth remains ambiguous.

## 2. Frozen authority boundary

Allowed:

- Nightwatch source/tests/synthetic corpus/docs only;
- read-only Git/source inspection of already-approved Alphaus sibling source;
- fresh remote SHA resolution and disposable exact snapshots;
- deterministic mechanical extraction from source text / existing schemas / generated interface definitions where already present in approved source repos;
- additive expectation recipes/IDs only for existing approved targets and only after proof;
- local synthetic tests, hardening, compatibility, canonical and isolated regressions.

Forbidden:

- DEV/NEXT/production contact;
- real campaign execution;
- browser/API product calls;
- new endpoint, route, target, transport, mutation, or credential authority;
- DynamoDB/BigQuery/Spanner/SQL/data-plane access;
- GCP/GKE/Kubernetes/AWS runtime/deployment investigation;
- Alphaus sibling writes;
- AI/model authority;
- selfDev/promotion/catalog mutation or variant-B adoption;
- Phase 11B or Phase 13B execution.

Phase 6 remains `FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## 3. Required bootstrap

1. Fetch origin and fast-forward clean local `main`; require local HEAD == origin/main. No reset/rebase/force-push.
2. Read `AGENTS.md`, Phase-12 coverage report/current `coverageInventory.ts`, Phase-13I terminal state, this task package, and `docs/design/PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION.md`.
3. Record exact owner token.
4. Transition this task from `NONE` to `IN_PROGRESS` and make it active.
5. Resolve the CURRENT remote SHA for the approved source repo(s); use disposable exact snapshots. Canonical siblings remain byte-identical.

## 4. Baseline blockers to reproduce before implementation

Reproduce and freeze permanent regression cases for:

- B1 `ripple.account-inventory.read` -> current Phase-12 `TYPE_FLOW_AMBIGUOUS` depth probe;
- B2 `ripple.billing-group-exchange.read` -> current Phase-12 `TYPE_FLOW_AMBIGUOUS` depth probe;
- B3 `ripple.billing-groups-legacy.read` -> `AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`;
- B4 `ripple.billing-groups.read` -> `GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`;
- B5 fresh-source vs wrong-SHA currentness: wrong source must never be admitted as current.

If current source changed and a blocker no longer reproduces, classify the drift from exact source evidence before proceeding. Do not force the historical blocker to remain true.

## 5. Mechanical analyzer architecture

Build a versioned analyzer capability that is deterministic and fail-closed. It may extend `src/oracles/expectations/extract/**` and supporting evidence types. Requirements:

- source input only; no runtime values;
- no arbitrary eval/exec;
- bounded file/symbol/statement traversal;
- deterministic canonical evidence digest;
- exact source repo/SHA/path/symbol provenance;
- unknown syntax/flow/branch/transport semantics -> explicit blocker, never guessed contract;
- output vocabulary must distinguish PROVEN contract facts from AMBIGUOUS/UNSUPPORTED/UNAVAILABLE;
- no source SHA in semantic identity when normalized evidence + derivation semantics are otherwise unchanged, consistent with existing semantic identity rules;
- source SHA still remains provenance/currentness evidence;
- analyzer version is load-bearing in derivation identity.

Prefer token-/structure-aware bounded analysis over adding more fragile unconstrained regex matching. Do not add an external parser dependency unless the repository already has an appropriate dependency or the implementation can prove the dependency is local, deterministic, and authority-neutral.

## 6. Supported proof classes

At minimum implement synthetic proof support for these source-level classes where mechanically decidable:

1. finite literal row/object field set;
2. finite scalar type set from bounded assignments/casts/literals;
3. branch-union type set where every branch is statically enumerable;
4. explicit empty/non-empty type bifurcation;
5. bounded alias/copy flow within one symbol;
6. return-envelope field presence when all return branches prove it;
7. generated/proto/interface field shape when an approved source file is authoritative and statically finite;
8. chunk/envelope cardinality or item-shape metadata only when mechanically encoded in source/interface definitions.

Required rejection classes:

- dynamic property/index names;
- unbounded reflection/eval/dynamic include;
- database/runtime value type with no source-level guarantee;
- conditional blob whose branches are not all mechanically enumerable;
- transport semantics inferred only from naming/comments;
- generated/runtime schema unavailable;
- cross-service assumption with no source contract;
- partial proof misrepresented as full proof.

## 7. Existing-target re-evaluation

Re-run the complete `APPROVED_READ_ONLY_TARGET_IDS` inventory against the fresh disposable snapshot.

For each approved target record:

- previous disposition/depth;
- current fresh-source disposition/depth;
- exact analyzer proof or blocker;
- source repo/SHA/path/symbol;
- evidence digest;
- observer class;
- historical expectation ID if any;
- collection expectation ID if any;
- proposed uplift ID/version if and only if proven.

Do not add targets. Do not change target meaning.

## 8. Admission/versioning rules

If a stronger real-source contract becomes mechanically proven:

- preserve all historical expectation IDs and historical semantics;
- use an additive new recipe/expectation identity or explicit version bump that participates in derivation identity;
- never silently strengthen an existing durable ID;
- collection-wide semantics remain explicit and versioned;
- resolver/currentness must work for the new contract;
- stale/wrong-SHA must fail closed;
- semantic campaign bundle mapping must remain coherent;
- Phase-13 semantic clustering identity must not fragment merely because source SHA advances with identical normalized contract evidence.

If no stronger contract is proven, leave the registry unchanged and record the precise blocker.

## 9. Target-specific work

### 9.1 Account inventory

Inspect the exact fresh source flow. Attempt only mechanically supportable stronger contracts. DB-returned value types are not proof by themselves. A finite literal key set, explicit casts, normalized enumerations, or guaranteed branch envelope may be admissible if source proves them.

### 9.2 Billing-group exchange

Trace the exact function and assignments. Values copied from runtime/database structures remain type-ambiguous unless source introduces an explicit finite normalization/cast/guard. Do not infer domain type from field names.

### 9.3 Legacy billing-groups conditional blob

Model conditional branches only if all relevant branches can be bounded and their resulting envelope/class mechanically enumerated. Otherwise keep an explicit conditional-blob blocker; do not flatten runtime-computed branches into a fake union.

### 9.4 gRPC/chunked billing-groups target

Locate the actual approved source contract. A PHP extractor is not required if the authoritative static contract lives in proto/generated/interface source. Add a language/contract adapter only if that source mechanically proves the payload/chunk/item contract. Never infer semantics from route names, comments, or observed DEV behavior.

## 10. Synthetic corpus

Add `corpus/phase14/**` with at least 30 deterministic synthetic source fixtures covering positive and negative proof classes, including:

- literal row keys;
- scalar cast flow;
- finite branch union;
- alias chain;
- empty/object and empty/array bifurcation;
- all-branches field presence;
- one branch missing field;
- dynamic key reject;
- runtime DB value reject;
- nested conditional reject;
- generated-interface/proto finite shape;
- chunk contract positive and ambiguous cases;
- source drift same evidence;
- source drift changed evidence;
- stale SHA;
- missing source;
- privacy sentinels in comments/string literals not leaking into derived safe output.

Run deterministic repeats >=3 with zero digest/result mismatches.

## 11. Measured acceptance metrics

Final report must provide integer counts:

- approved target count;
- previous admitted historical count;
- previous admitted collection count;
- previous deep-type count;
- new mechanically proven uplift count;
- new contracts added count;
- stronger versions admitted count;
- ambiguous blocker count;
- unsupported transport blocker count;
- stale/unavailable count;
- analyzer synthetic positive count;
- analyzer synthetic rejection count;
- false-admission count;
- privacy leak count;
- determinism mismatch count.

Hard floors:

- false-admission count = 0;
- privacy leak count = 0;
- stale-source false-current count = 0;
- unsupported syntax/transport false-proof count = 0;
- determinism mismatch count = 0.

No minimum real-source uplift is required. Truthful zero is preferable to invented semantics.

## 12. Compatibility and hardening

Run, at minimum:

- typecheck;
- hardening:check;
- Phase-14 focused analyzer/inventory matrix;
- Phase 9/9A.1/10/10B/11/11A.3 semantic expectation/resolver/collection suites;
- Phase 12 coverage inventory + semantic triage/yield suites;
- Phase 13 semantic promotion/shadow suites;
- campaign:synthetic;
- owner-provenance;
- fresh-source disposable-snapshot canary;
- canonical complete Playwright workers=1;
- topology-correct isolated complete Playwright workers=1;
- agent:check / agent:audit / project:check / catalog integrity / git diff --check.

CI workflow may gain a dedicated Phase-14 local matrix step. Do not change CI authority or weaken existing steps.

## 13. Checkpoints

Create at least:

1. a substantive source/test checkpoint after local acceptance is green;
2. a durable docs/continuity closure descendant.

Push fast-forward only. Inspect the exact GitHub Actions run for both checkpoints. If the known billing/spending-limit condition still prevents jobs from starting, record `BLOCKED_EXTERNAL_CI`; never call CI green.

## 14. Completion states

Use one truthful terminal state:

### A. Local implementation green, CI green

`PHASE_14A_STATUS: COMPLETE`

### B. All local/source acceptance green, CI externally blocked

`PHASE_14A_STATUS: BLOCKED_EXTERNAL_CI`
`PHASE_14_MECHANICAL_SOURCE_EXPANSION: VERIFIED_LOCAL_NOT_CI_VERIFIED`

### C. Analyzer implemented but a local acceptance gate remains unresolved

`PHASE_14A_STATUS: BLOCKED`

A real-source uplift count of zero does NOT itself block completion if all analysis/acceptance gates are green and the zero result is evidence-backed.

Phase 13B and Phase 11B remain NOT_AUTHORIZED in every terminal state.
