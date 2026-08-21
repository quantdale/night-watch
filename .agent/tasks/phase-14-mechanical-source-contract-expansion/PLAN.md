# PLAN — Nightwatch Phase 14A — Mechanical Real-Source Contract Expansion

Task ID: `phase-14-mechanical-source-contract-expansion`
Phase: `14A-MECHANICAL-SOURCE-CONTRACT-EXPANSION`
Authority at publication: NOT_GRANTED.
Owner executor prompt grants: `PHASE_14_MECHANICAL_SOURCE_CONTRACT_EXPANSION_LOCAL_ONLY`.
Extension execution grants: `PHASE_14_FIVE_CHANGE_IMPLEMENTATION_BATCH_LOCAL_ONLY` (FIVE_CHANGE_IMPLEMENTATION_EXTENSION.md supersedes the original M7-M11 validation cadence for the five-change batch only; original SPEC architecture/safety/source-proof rules remain normative).

## Purpose

Strengthen Nightwatch's deterministic source-contract analysis against the existing approved read-only semantic targets, then re-run the fresh-source coverage inventory and admit only mechanically proven contract uplifts.

## Starting State

- Phase 13I is locally/source verified but `BLOCKED_EXTERNAL_CI`; Phase 13B remains NOT_AUTHORIZED.
- Phase 12 fresh-source coverage inventory has six approved targets, four admitted targets, and zero mechanically proven depth uplifts.
- Current blocker classes include `TYPE_FLOW_AMBIGUOUS`, `AMBIGUOUS_CONDITIONAL_BLOB_RUNTIME_COMPUTED`, and `GRPC_CHUNKED_NO_PHP_MECHANICAL_CONTRACT`.
- Current extractor surface includes `src/oracles/expectations/extract/php.ts` plus evidence/admission/collection/resolver/coverage modules.

## Scope

Local/source-only implementation, synthetic corpus, read-only fresh source snapshots, registry/admission updates only for existing approved targets, regression/hardening, and durable docs.

## Non-Goals

No DEV/real campaign, new target/endpoint/transport authority, production, mutation, DB/infra, Alphaus writes, AI authority, selfDev/promotion, Phase 11B, or Phase 13B.

## Milestones

### M0 — Bootstrap and baseline freeze
Status: COMPLETE
- fetch/fast-forward clean main;
- record authorization;
- transition task to IN_PROGRESS and make active;
- resolve fresh remote source SHA + disposable snapshot;
- reproduce B1-B5 from SPEC §4.

### M1 — Analyzer contract design and synthetic grammar
Status: COMPLETE
- inspect current extractor implementation;
- define versioned result/evidence vocabulary;
- implement bounded structural/token-aware analysis architecture;
- add synthetic positive/rejection fixtures before product uplift.

### M2 — PHP finite-flow expansion
Status: COMPLETE
- support mechanically decidable finite row/type/branch/alias proof classes;
- preserve current Phase-10 extractor semantics;
- fail closed on runtime/DB/dynamic cases.

### M3 — Conditional/interface/transport contract adapters
Status: COMPLETE
- bounded conditional branch proofs;
- inspect actual static source contract for the gRPC/chunked approved target;
- add a generated/proto/interface adapter only if source justifies it;
- precise blocker if not.

### M4 — Fresh-source target re-evaluation
Status: COMPLETE
- re-run all approved targets;
- produce before/after disposition/depth table;
- distinguish analyzer capability from actual product-contract uplift.

### M5 — Additive admission/versioning
Status: COMPLETE
- if uplift is proven, add explicit recipe/expectation identities/versions;
- preserve historical IDs and semantics;
- resolver/currentness/collection/campaign-bundle compatibility;
- if no uplift, keep registry unchanged.

### M6 — Phase-14 corpus and deterministic backtest
Status: COMPLETE
- >=30 synthetic source fixtures;
- positive/rejection/drift/privacy matrix;
- >=3 repeats, zero mismatches;
- all false-admission/privacy/stale-current floors zero.

### M7 — Compatibility and hardening
Status: COMPLETE
- focused Phase-14 matrix;
- relevant Phase 9-13 suites;
- typecheck/hardening/campaign/provenance.

### M8 — Fresh-source acceptance
Status: COMPLETE
- re-resolve remote SHA;
- disposable exact snapshot;
- prove canonical sibling writes 0;
- current/wrong-SHA currentness matrix.

### M9 — Full regressions
Status: COMPLETE
- canonical complete Playwright workers=1;
- topology-correct isolated complete Playwright workers=1;
- 0 failed in both; explain only legitimate topology enumeration differences.

### M10 — Validated implementation checkpoint
Status: COMPLETE
- clean local acceptance;
- source-bearing commit/push fast-forward;
- exact Actions run/job-start inspection;
- decisive post-push recheck.

### M11 — Durable closure
Status: COMPLETE
- append decision if architecture changed materially;
- update design/current state/roadmap/task state/report;
- docs/continuity push;
- exact final Actions truth;
- Phase 11B/13B still NOT_AUTHORIZED;
- STOP.

## Extension Milestones (five-change implementation batch)

Cadence per change: implement coherent source surface -> permanent focused tests -> `npm run typecheck` + `git diff --check` -> smallest focused matrix -> one narrow compatibility matrix when a Phase 9-13 public contract is touched -> durable fast-forward checkpoint. Full hardening explicitly deferred.

### E1 — C1 mechanical analyzer IR + bounded control flow
Status: COMPLETE (`aab7859`)
- versioned IR, bounded traversal with deterministic stop codes, alias-cycle detection, finite branch unions, all-branch field presence, partial-vs-full proof distinction; analyzer version load-bearing in digests; legacy Phase-10 extractor behavior preserved.

### E2 — C2 static schema / generated / proto / chunk adapters
Status: COMPLETE (`487d823`; nested/repeated/required adapters also in `aab7859`)
- generated-interface and proto finite-shape proofs; map<>/oneof/unknown-type/comment-only/string-literal fail-closed; GENERATED_SCHEMA_UNAVAILABLE / TRANSPORT_CONTRACT_UNPROVEN preserved; no transport authority invented; corpus proto fixtures added.

### E3 — C4 source-contract drift/currentness intelligence
Status: COMPLETE (`030c82b`; initial module `5e107f6`)
- deterministic classification DTO (EVIDENCE_UNCHANGED_SHA_MOVED, EVIDENCE_CHANGED_COMPATIBLE/BREAKING, DERIVATION_VERSION_CHANGED, SOURCE_STALE, SOURCE_UNAVAILABLE, CONTRACT_BECAME_AMBIGUOUS/PROVABLE, NO_APPROVED_TARGET); compatible-vs-breaking refinement; inventory-level comparison; privacy-safe serialization tests.

### E4 — C5 contract coverage observability + developer tooling
Status: COMPLETE (`10136c8`)
- sanitized deterministic report module + report digest/version; read-only CLI `bin/phase14-contract-health.mjs` (snapshot or inventory input, baseline comparison mode, text renderer); strict unknown-field and privacy-sentinel rejection; corpus index generation/validation; no network/runtime authority.

### E5 — C3 fresh real-source re-evaluation + additive admission guard
Status: COMPLETE (`f554da3`)
- fresh remote SHA resolved live (`85e400a8...`, master of `mobingilabs/ripple-api`); disposable exact snapshot verified HEAD == remote SHA; canonical sibling untouched;
- six-target before/after inventory at fresh source: B1-B4 reproduce, zero uplift, no silent strengthening;
- live drift vs recorded `e026c855` evidence identities: all six targets EVIDENCE_UNCHANGED_SHA_MOVED (cluster stability across SHA-only movement proven on real data);
- B5 wrong-SHA resolver SOURCE_STALE; missing-source inventory fails closed (never CURRENT).

### E6 — Moderate integrated validation pack + terminal continuity
Status: COMPLETE
- typecheck, hardening:check, all six Phase-14 suites (133), affected Phase 9-13 suites (225), campaign:synthetic (27), agent:check, project:check, git diff --check — all green;
- canonical sibling writes = 0; deterministic repeat mismatches = 0; quality floors all zero;
- STATE/REPORT/HARDENING_HANDOFF populated from actual evidence; terminal IMPLEMENTED_AWAITING_HARDENING.

## Validation Strategy

Evidence order:

1. pre-fix blocker reproduction/current-source drift classification;
2. analyzer synthetic proof/rejection matrix;
3. real fresh-source target inventory;
4. additive admission/currentness tests if uplift exists;
5. compatibility and privacy hardening;
6. fresh-source canary;
7. canonical + isolated full regression;
8. continuity/project/catalog/diff;
9. exact Actions truth.

## Decision Rules

- Product-domain names are not type evidence.
- Database/runtime return values are not source-level type evidence without explicit source normalization.
- Comments are never sufficient mechanical proof.
- Every branch required for a full contract must be accounted for.
- Partial static proof cannot become a full invariant.
- Zero real uplift is acceptable if the analyzer is improved and current source remains honestly ambiguous.

## Completion Criteria

All SPEC requirements and acceptance-matrix rows are evidence-backed. No local gate may be replaced with a self-authored claim. CI success requires a GitHub Actions job that actually starts and passes.

## Safety Constraints

- LOCAL_ONLY: no DEV/NEXT/production contact, no real campaign, no mutation, no database/data-plane, no infrastructure/Phase 6, no Alphaus sibling writes, no AI/model authority, no selfDev/promotion/catalog mutation, no new endpoint/target/transport authority, no Phase 11B/13B.
- Git/source state wins: fetch origin and fast-forward clean main; require HEAD == origin/main. No reset/rebase/force-push.
- Fail-closed by construction: unknown syntax/flow/branch/transport semantics always yield a precise blocker, never a guessed contract.
- Privacy: source comments/string literals (including sentinels) never reach derived safe evidence.

## Architecture / Approach

- A versioned, deterministic mechanical-contract analyzer (`src/oracles/expectations/extract/analyzer.ts`) is the new capability layer; it reuses the bounded Phase-10 PHP extractor primitives and adds bounded token/symbol analysis for the SPEC §6 proof classes.
- The coverage inventory gains an additive, non-mutating `analyzerProbe` per target; historical dispositions, blocker codes, and expectation IDs are preserved exactly.
- Synthetic corpus (`corpus/phase14`) drives the focused matrix; the real-target re-evaluation runs against a disposable exact source snapshot.

## Decision Log

- Attack analyzer capability, not target authority (remaining gaps are proof/extraction gaps).
- Zero real-source uplift is a valid final result when current source remains honestly ambiguous.
- Preserve all historical expectation IDs and semantics; never silently strengthen a durable ID.

## Discoveries

- Fresh disposable snapshot `e026c85522d201724033f024456da3efa17fe07a` reproduces the Phase-12 blocker classes; canonical sibling `27bb007...` is unchanged.
- The versioned analyzer proves synthetic capability across all 8 positive proof classes and fails closed across the rejection classes; the real targets yield zero uplift.

## Deferred Work

- Phase 11B: NOT_AUTHORIZED.
- Phase 13B: NOT_AUTHORIZED.
- Real campaigns: NOT_AUTHORIZED.
- Phase 6/data/infra: frozen/out of scope.
