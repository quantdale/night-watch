# Phase 14A — Five-Change Implementation Extension

## Purpose

This amendment expands the authorized Phase 14A implementation into a deliberately large five-change batch. The emphasis is implementation throughput plus focused proof, not repository-wide hardening. Full codebase hardening/regression is explicitly deferred to the next separately authorized campaign.

The owner executor prompt grants this extension together with the existing Phase 14A authority.

Required token:

`PHASE_14_FIVE_CHANGE_IMPLEMENTATION_BATCH_LOCAL_ONLY`

This token does not grant DEV, real campaign, Phase 11B/13B, production, data/infra, Alphaus writes, new endpoint/target authority, AI authority, or selfDev/promotion authority.

## Relationship to the original Phase 14A SPEC

The original Phase 14A design, authority boundary, source-truth rules, and target restrictions remain normative.

For this execution only, this amendment supersedes the original validation cadence in PLAN M7-M11 / SPEC §12-14:

- implement all five changes first;
- use focused tests after each change;
- run one moderate integrated validation pack after all five;
- do NOT spend this session on complete canonical/isolated Playwright, broad Phase 9-13 matrices, exhaustive hardening, or codebase-wide hardening;
- finish with `IMPLEMENTED_AWAITING_HARDENING`, not `COMPLETE`.

The next campaign must perform the deferred full hardening against the exact five-change checkpoint.

## Change 1 — Mechanical analyzer IR + bounded control-flow engine

Build a versioned internal representation for source-contract proof rather than extending ad-hoc regex branches indefinitely.

Minimum implementation:

- normalized source proof nodes for literals, assignments, aliases, casts, object/array field writes, return branches, finite conditionals, and explicit unsupported/dynamic nodes;
- bounded traversal limits with deterministic stop/failure codes;
- finite alias resolution with cycle detection;
- finite branch-union calculation only when every branch is enumerable;
- all-branches field-presence proof;
- normalized type-set proof vocabulary;
- canonical safe evidence serialization/digest;
- exact repo/SHA/path/symbol provenance separate from normalized semantic evidence;
- analyzer version load-bearing in derivation identity;
- legacy Phase-10 extractor behavior preserved through adapters or compatibility wrappers.

Focused tests should prove positive literal/cast/alias/branch cases plus dynamic/runtime/partial/cycle rejection. Do not run broad regressions after C1.

Checkpoint token:

`PHASE_14_C1_ANALYZER_IR: IMPLEMENTED_FOCUSED_GREEN`

## Change 2 — Static schema / generated interface / chunk-contract adapters

Add bounded non-PHP static-contract adapters where authoritative source is already inside the approved source set.

Implement support for mechanically finite schema forms such as:

- proto/generated/interface field declarations;
- nested message/object field shape;
- repeated/list item type metadata when explicitly encoded;
- explicit envelope/chunk structure where the source contract actually defines it;
- finite enum/scalar type sets;
- required/optional field distinction when mechanically represented.

Hard requirements:

- comments and names never prove transport semantics;
- missing generated source fails `GENERATED_SCHEMA_UNAVAILABLE`;
- ambiguous chunk framing fails `TRANSPORT_CONTRACT_UNPROVEN`;
- unsupported schema constructs fail closed;
- no new endpoint/target/transport authority is created by the adapter.

Use synthetic fixtures to prove both positive generated/proto cases and deceptive comment/name-only cases.

Checkpoint token:

`PHASE_14_C2_STATIC_SCHEMA_ADAPTERS: IMPLEMENTED_FOCUSED_GREEN`

## Change 3 — Real-source target re-evaluation + additive contract admission

Use a freshly resolved remote SHA and disposable exact source snapshot to re-evaluate all existing `APPROVED_READ_ONLY_TARGET_IDS` using C1+C2.

For every target produce a deterministic before/after result containing:

- target ID;
- previous depth/disposition;
- current depth/disposition;
- proof class or blocker code;
- source repo/SHA/path/symbol;
- normalized evidence digest;
- observer class;
- historical/collection expectation IDs;
- additive stronger ID/version only if mechanically proven.

If stronger product contracts are proven:

- add new recipes/expectations additively;
- preserve historical IDs and semantics;
- preserve explicit collection scope;
- wire resolver/currentness and wrong-SHA fail-closed behavior;
- preserve semantic campaign bundle coherence;
- preserve Phase-13 cluster identity semantics across SHA-only source movement with identical normalized evidence;
- changed normalized evidence or derivation version must split identity.

If a target is still ambiguous, make the blocker more precise instead of forcing an uplift.

Checkpoint token:

`PHASE_14_C3_REAL_SOURCE_ADMISSION: IMPLEMENTED_FOCUSED_GREEN`

## Change 4 — Source-contract drift/currentness intelligence

Build a deterministic local source-contract comparison layer so Nightwatch can explain why a source-derived semantic contract stayed valid, changed, or became unavailable.

Implement a safe DTO and comparison API that classifies at minimum:

- `EVIDENCE_UNCHANGED_SHA_MOVED`;
- `EVIDENCE_CHANGED_COMPATIBLE`;
- `EVIDENCE_CHANGED_BREAKING`;
- `DERIVATION_VERSION_CHANGED`;
- `SOURCE_STALE`;
- `SOURCE_UNAVAILABLE`;
- `CONTRACT_BECAME_AMBIGUOUS`;
- `CONTRACT_BECAME_PROVABLE`;
- `NO_APPROVED_TARGET` / fail-closed equivalent.

The comparison must use normalized evidence and explicit derivation semantics, not raw source SHA equality alone. It must not interpret runtime behavior or customer values.

Integrate it with coverage inventory/currentness reporting so future campaigns can distinguish harmless source movement from semantic contract drift mechanically.

Add focused tests for same-evidence SHA movement, changed evidence, stale/missing source, derivation-version change, ambiguity transitions, and privacy-safe serialization.

Checkpoint token:

`PHASE_14_C4_CONTRACT_DRIFT_INTELLIGENCE: IMPLEMENTED_FOCUSED_GREEN`

## Change 5 — Contract coverage observability + developer tooling

Add a deterministic local developer-facing contract health/reporting surface that makes the source-oracle system easier to inspect and maintain without rereading raw source manually.

Implement a read-only command/module, using existing local tool conventions, that can consume an injected/disposable source snapshot and emit a sanitized machine-readable report containing:

- approved target count;
- admitted historical count;
- admitted collection count;
- depth classes;
- proof classes;
- blockers grouped by stable blocker code;
- currentness/drift classifications from C4;
- normalized evidence/derivation identities;
- contract additions/strengthenings since a supplied baseline inventory;
- unresolved mechanical coverage gaps;
- zero raw product/customer values.

Also add:

- stable JSON ordering;
- deterministic report digest/version;
- a concise text renderer for owner/developer use;
- fixture/corpus index generation or validation for `corpus/phase14`;
- a baseline-vs-current local comparison mode that performs no writes to sibling repos;
- strict unknown-field and privacy-sentinel rejection.

Do not add remote publication or runtime campaign execution.

Checkpoint token:

`PHASE_14_C5_CONTRACT_OBSERVABILITY: IMPLEMENTED_FOCUSED_GREEN`

## Testing cadence for this batch

### After each change

Run only:

1. `npm run typecheck`;
2. `git diff --check`;
3. the smallest focused unit test file(s) for that change;
4. one narrow compatibility test if the changed public contract touches an established Phase 9-13 surface.

A change may not receive its `IMPLEMENTED_FOCUSED_GREEN` token if these fail.

Create and push one durable fast-forward checkpoint per completed change when practical. At minimum preserve the exact implementation SHA for C1-C5 in STATE/REPORT/HARDENING_HANDOFF.

### End-of-batch integrated validation

After C1-C5 are implemented, run one moderate integrated pack only:

- `npm run typecheck`;
- `npm run hardening:check`;
- all Phase-14 focused tests/corpus tests;
- the directly affected expectation/admission/resolver/currentness/semantic-cluster tests from Phases 9-13;
- `npm run campaign:synthetic`;
- `npm run agent:check`;
- `npm run project:check`;
- `git diff --check`.

Also run the fresh-source disposable-snapshot acceptance required to prove any real-source contract changes and canonical sibling writes = 0.

Do not run the complete Playwright suite or topology-correct isolated full suite in this implementation batch unless a focused failure cannot be resolved without them.

## Explicitly deferred to the next hardening campaign

The next campaign, not this batch, must perform:

- complete canonical Playwright workers=1;
- topology-correct isolated complete Playwright workers=1;
- broad Phase 9/10/11/12/13 compatibility matrix;
- exhaustive Phase-14 acceptance matrix replay;
- owner-provenance full gate;
- full agent audit/project/catalog integrity;
- CI workflow review and exact green-CI requirement once GitHub Actions is available;
- adversarial privacy/authority sweep across the entire changed dependency cone;
- codebase-wide dead-code/compatibility/version-drift review.

Populate `HARDENING_HANDOFF.md` with exact evidence so that future task starts from the five-change implementation checkpoint rather than rediscovering it.

## Stop conditions

Stop the affected stream immediately if implementation would require:

- DEV/NEXT/production product contact;
- a real campaign;
- new endpoint/target/transport authority;
- product mutation;
- DB/data-plane/infra/Phase-6 work;
- Alphaus sibling writes;
- customer/raw runtime data persistence;
- AI/model authority;
- selfDev/promotion/catalog mutation;
- Phase 11B/13B authority.

Continue independent authorized changes if one change is mechanically blocked.

## Truthful terminal state for this extension

Do not claim Phase 14 COMPLETE from this implementation batch.

Expected successful terminal state:

```text
PHASE_14_C1_ANALYZER_IR: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C2_STATIC_SCHEMA_ADAPTERS: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C3_REAL_SOURCE_ADMISSION: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C4_CONTRACT_DRIFT_INTELLIGENCE: IMPLEMENTED_FOCUSED_GREEN
PHASE_14_C5_CONTRACT_OBSERVABILITY: IMPLEMENTED_FOCUSED_GREEN
PHASE_14A_STATUS: IMPLEMENTED_AWAITING_HARDENING
PHASE_14_FULL_HARDENING_CAMPAIGN: REQUIRED_NEXT
PHASE_13B_STATUS: NOT_AUTHORIZED
PHASE_11B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

If any change cannot be completed, record exact residuals and use `BLOCKED` rather than manufacturing the token.
