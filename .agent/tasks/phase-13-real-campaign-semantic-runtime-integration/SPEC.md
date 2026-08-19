# SPEC — Nightwatch Phase 13A — Real Campaign Semantic Runtime Integration & Contract Integrity

Task ID: `phase-13-real-campaign-semantic-runtime-integration`
Phase: `13A-REAL-CAMPAIGN-SEMANTIC-RUNTIME-INTEGRATION`
Starting SHA: `c05e507c2bbab62651057c3ca883eb3dbd48f4b4`
Authorization required to execute: `PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Objective

Integrate the already-proven Phase 9–12 semantic, replay, triage, clustering, dossier, and source-currentness machinery into the real campaign architecture **without contacting DEV**, while closing the discovered Phase 12 contract-integrity gaps and preserving every historical authority boundary.

At completion, source inspection plus a local end-to-end shadow campaign must prove that a future separately authorized real campaign would:

1. freeze the correct current semantic/replay/version identity in its manifest;
2. use fresh source-derived collection expectations where current mechanically admitted authority exists;
3. feed semantic receipts/findings into campaign candidates;
4. create strict semantic triage evidence from those receipts and current source identity;
5. create occurrence-bound replay plans instead of always-invalid reduced replay callbacks;
6. execute only original approved read-only action occurrences through typed replay adapters;
7. minimize only exact-fingerprint reproductions;
8. use semantic-aware clustering/confidence/dossier-v2 readiness;
9. fail closed on partial/stale/unavailable/unsafe/private/ambiguous evidence;
10. remain bounded, deterministic, privacy-safe, and compatible with protocol-only historical triage.

## 2. Execution authority gate

Repository publication of this SPEC is design only.

Before changing implementation, the executing agent must receive the owner token:

`PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION_LOCAL_ONLY`

Then it must:

- fetch origin;
- fast-forward clean local `main` to current `origin/main`;
- verify no unrelated source task advanced the repository;
- set this task to `IN_PROGRESS` under continuity v2;
- make this task the active task;
- preserve the previous Phase 12A `BLOCKED_EXTERNAL_CI` record as historical truth.

If current source has materially advanced, inspect and reconcile. Never reset/rebase/overwrite another task.

## 3. Hard prohibitions

Phase 13A MUST NOT:

- contact DEV or NEXT;
- execute `bin/phase7-real.mjs`, Phase 9B/10B real launchers, or any real campaign;
- authorize Phase 11B/12B/13B;
- contact production;
- perform product mutations;
- query DynamoDB, BigQuery, Spanner, production SQL, or any data plane;
- query GCP/GKE/Kubernetes/AWS runtime/deployment infrastructure;
- modify Alphaus sibling repositories;
- add new endpoint/target/network authority;
- invent product/business semantics;
- execute an AI/model or grant AI authority;
- use selfDev, promotion, catalog mutation, or variant-B adoption;
- publish findings or create external team workflow.

Phase 6 remains `FROZEN_BY_OWNER` / `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.

## 4. Source precedence

For this task:

1. live Git/source/tests at execution time;
2. this SPEC and workstream files;
3. current durable decisions/docs;
4. previous reports;
5. conversation text.

A claim in a predecessor report that conflicts with source must be corrected, not preserved for convenience.

## 5. Mandatory starting reproductions

Before fixing anything, add permanent or temporary source-proven reproductions for all of the following and record the exact pre-fix behavior.

### 5.1 API replay-plan single-action validation defect

Current v1 validation contains a branch where an API plan whose original sequence has more than one action can survive if the retained sequence has exactly one action.

Prove the actual current behavior with a minimal test.

Token:

`CONFIRMED_API_REPLAY_PLAN_ORIGINAL_CARDINALITY_GAP`

### 5.2 Duplicate action occurrence ambiguity

Current replay plans persist only ordered action IDs. The pure minimizer tracks occurrence indices internally, but a replay plan cannot distinguish two occurrences of the same action ID that have different occurrence-specific route/precondition context.

Create a fixture with duplicate action IDs where occurrence identity matters and show whether current v1 can represent the intended retained occurrence unambiguously.

If ambiguous, token:

`CONFIRMED_REPLAY_PLAN_OCCURRENCE_IDENTITY_GAP`

Do not manufacture a defect if source proves duplicate occurrences cannot exist in every relevant real sequence. Record the exact scope instead.

### 5.3 Partial-coverage evidence coherence gap

Current semantic triage validation contains a `semanticOutcome === PARTIAL_COVERAGE` coherence branch that does not reject an incoherent coverage state.

Prove with a strict validator test.

Token:

`CONFIRMED_SEMANTIC_TRIAGE_PARTIAL_COHERENCE_GAP`

### 5.4 AI-ready confidence coherence

Construct a semantic dossier whose legacy generic confidence is HIGH but deterministic semantic confidence is lower because of a semantic blocker. Inspect the AI-ready package.

If the package reports the stronger generic confidence, token:

`CONFIRMED_AI_READY_SEMANTIC_CONFIDENCE_OVERCLAIM`

### 5.5 Real campaign replay integration gap

Permanently prove that the current real Phase 7 adapter still assigns `invalidReducedReplay()` to journey, exploration, and API candidates.

Token:

`CONFIRMED_REAL_CAMPAIGN_PHASE12_REPLAY_NOT_BOUND`

### 5.6 Real campaign semantic-triage integration gap

Trace the current real campaign path from browser/API observation -> `CampaignAnomalyCandidate` -> orchestrator triage -> dossier. Prove whether Phase 12 `SemanticTriageEvidence`, semantic confidence, dossier v2, and semantic cluster identity are actually consumed.

If not, token:

`CONFIRMED_REAL_CAMPAIGN_PHASE12_TRIAGE_NOT_BOUND`

## 6. Workstream A — Phase 12 contract integrity

Implement every confirmed integrity fix from §5.1–§5.4.

### 6.1 Replay-plan versioning

Do not silently change immutable v1 semantics if a stronger representation is required.

If duplicate-occurrence identity requires schema evolution, introduce an explicit v2 replay-plan schema while retaining v1 parsing for historical/local evidence.

Preferred v2 concepts:

- original occurrence descriptors with deterministic ordinal;
- retained occurrence ordinals, not only action IDs;
- action ID repeated as safe descriptive metadata;
- occurrence identity participating in plan ID;
- exact replay retains all original occurrences in order;
- reduced replay selects an order-preserving subsequence of occurrence ordinals;
- no duplicate/invented ordinal;
- occurrence metadata cannot contain raw product values.

Do not add selectors, URLs, params, bodies, values, customer IDs, credentials, or DOM data.

### 6.2 API cardinality

API replay plans must prove:

- original occurrence count exactly 1;
- retained occurrence count exactly 1;
- retained occurrence is the original operation;
- empty/reordered/multi-operation forms reject before executor exposure.

### 6.3 Semantic triage coherence matrix

Make the DTO validator reject impossible cross-field combinations.

At minimum define and test:

- `PARTIAL_COVERAGE` semantic outcome <-> receipt `PARTIAL_COVERAGE` <-> coverage state `PARTIAL_COVERAGE_NO_VIOLATION`;
- `PASS` with collection coverage may only represent `FULLY_EVALUATED_PASS` (or no collection state for non-collection expectations);
- `ANOMALY` may carry observed `VIOLATION`; a truncated tail does not erase an observed violation;
- `NOT_APPLICABLE` may align with `EMPTY_NOT_APPLICABLE`;
- stale/unavailable receipt outcomes cannot claim source currentness CURRENT;
- source currentness STALE/UNAVAILABLE cannot be paired with a contradictory fully-current receipt;
- exactFingerprintMatch cannot be true when exactReplayStatus is NOT_REPRODUCED/INVALID/NOT_EVALUATED;
- minimality `1-MINIMAL`/`BOUNDED_MINIMAL` requires reproduced evidence, not zero minimal reproductions.

Choose exact rules from current architecture and preserve valid historical states.

### 6.4 AI-ready semantic confidence

When semantic triage evidence exists, any sanitized downstream AI-ready package must expose the deterministic semantic confidence, or an explicitly weaker combined confidence, never the stronger legacy generic confidence.

AI remains downstream and non-authoritative. No model is called.

## 7. Workstream B — Current-source semantic campaign bundle

Create a typed data model that binds a future campaign to the semantic authority it is allowed to use.

It must be built outside pure cores from read-only source metadata and then consumed as data.

Required concepts:

- source repo ID;
- remote branch/reference;
- freshness-approved source SHA;
- disposable snapshot identity/class;
- expectation IDs;
- target IDs;
- source evidence digests;
- derivation versions;
- collection-admission version;
- DEV-reachability classification;
- exact journey/API mapping where mechanically established;
- resolver currentness result.

No deployment identity claim. `DEPLOYMENT_STATUS_UNRESOLVED` remains true because Phase 6 is frozen.

### 7.1 Freshness

Use the Phase 9B/10B/11A.4 pattern:

- resolve remote branch SHA fresh;
- use disposable source snapshot outside canonical sibling checkout;
- derive expectations at that exact snapshot;
- fail closed on stale/unavailable/derivation failure;
- do not mutate canonical siblings;
- do not auto-rebind a frozen campaign if remote source moves later.

This is implemented and tested locally with synthetic/fake metadata plus optional read-only source canary. It is not executed against product DEV.

### 7.2 Existing authority only

Use only already-approved read-only campaign surface.

Do not add a journey, route, API operation, host, method, or product action.

A source expectation without an existing approved runtime path is inventory only, not new network authority.

## 8. Workstream C — Real semantic observer wiring

Refactor the real campaign adapter narrowly so current source-derived semantic authority can be injected into the existing `createNightwatchContext(...semanticOracle)` seam.

Requirements:

- reuse the existing semantic hook/oracle implementation;
- no second browser/network observer stack;
- fixed mapping from approved real campaign journey/operation to semantic target;
- resolver must be current/resolved before semantic authority is attached;
- no environment-variable-selected arbitrary expectation;
- no caller-supplied target selector;
- semantic receipts remain metadata-only;
- raw response exists ephemerally only for projection;
- raw values are never persisted by the new integration.

### 8.1 Campaign semantic observations

The integration must make available enough safe facts to create/attach:

- semantic finding(s);
- semantic evaluation receipt(s) or sanitized summary;
- expectation ID;
- target ID;
- invariant definition identity;
- source SHA/evidence digest/derivation;
- coverage state;
- source currentness.

Protocol-only anomalies must remain supported.

## 9. Workstream D — Real replay binding

Replace the generic always-invalid callback in the real campaign adapter only where a mechanically safe binding is proven.

### 9.1 General rules

A real replay callback must:

- receive only validated replay-plan data;
- execute only original approved occurrences;
- preserve occurrence order;
- never invoke planner/explorer logic that adds actions;
- remain within original route/endpoint authority;
- use the original anomaly fingerprint as the only reproduction target;
- return exact existing `CandidateReplayOutcome` classes;
- preserve the current real minimization budget;
- never execute in Phase 13A tests except through synthetic executors/doubles.

### 9.2 API

API reduced replay is single-operation and normally `UNCHANGED` after exact replay. Bind only the existing Phase 5 approved operation through its existing restricted catalog semantics.

### 9.3 Exploration

Bind retained Phase 4 approved safe actions only. No fresh action planning. Validate route/precondition closure before execution.

### 9.4 Journey

Journey reduction is the hardest case.

Inspect the current journey engine and contract definitions.

If a safe subset executor can be implemented from the frozen original journey without inventing semantics, implement it with explicit dependency/precondition closure.

If not, represent journey reduced replay as a precise fail-closed unsupported capability such as `PRECONDITION_DIVERGENCE` / `REDUCED_JOURNEY_NOT_MECHANICALLY_EXECUTABLE`, while still supporting exact replay. Do not pretend journey minimization works.

No DEV execution is needed to complete the local architecture.

## 10. Workstream E — Campaign evidence, clustering, dossier, checkpoint and version identity

### 10.1 Candidate evolution

Extend campaign candidate evidence additively and explicitly so semantic candidates can carry Phase 12 semantic-triage evidence or the deterministic inputs required to construct it after replay.

Do not make semantic fields mandatory for protocol-only candidates.

### 10.2 Orchestrator triage route

For semantic candidates:

- use current semantic cluster identity rather than protocol-only clustering identity where appropriate;
- after reproduction/minimization, construct validated semantic triage evidence;
- compute semantic confidence;
- construct/validate dossier v2;
- mark READY only under dossier-v2 readiness rules;
- preserve semantic evidence in sanitized form only.

For protocol-only candidates:

- preserve historical behavior and compatibility;
- do not force fake semantic identity.

### 10.3 No confidence as oracle

Confidence/dossier READY affects triage packaging/prioritization only.

It must never:

- decide whether the product response is anomalous;
- override semantic/protocol oracle results;
- override safety;
- invent a root cause;
- expand runtime authority.

### 10.4 Manifest/version fingerprint

A future campaign manifest must drift when any load-bearing semantic runtime contract changes.

Inspect current version fingerprint and include explicit identities for the relevant current contracts, such as:

- replay-plan version;
- replay-adapter version if versioned;
- semantic triage evidence version;
- dossier v2 version;
- semantic cluster version;
- semantic receipt version;
- semantic expectation/admission/collection-admission versions;
- semantic projection/oracle version;
- source-bundle/attestation version.

Do not add cosmetic version fields that do not participate in manifest identity/currentness checks.

### 10.5 Checkpoint compatibility

If campaign durable structures change meaning, version them explicitly.

Historical v1 checkpoint/manifest parsing must either remain valid under a documented compatibility path or fail closed with a specific version-drift class. Do not silently reinterpret historical campaign evidence.

### 10.6 Resume drift

A resumed campaign must stop if its frozen semantic/replay identity no longer matches the current executable integration.

Do not auto-upgrade an existing campaign in place.

## 11. Workstream F — Dossier/AI-ready/cluster truth

### 11.1 Semantic cluster identity

Use the Phase 12 cluster identity rules:

- evidence digest + derivation version are load-bearing;
- unrelated source SHA movement with byte-equivalent evidence must not fragment an anomaly class;
- changed evidence/derivation must not silently merge;
- row ordinal/violating item count must not create cluster explosion.

### 11.2 Dossier v2

Prove end-to-end semantic dossiers satisfy:

- stale/unavailable/partial/non-reproduced/unsafe/private/known-false-positive -> not READY;
- current full anomaly + exact fingerprint replay + sufficient minimization -> may become READY;
- missing deterministic evidence remains explicit;
- L4 datastore remains `OUT_OF_SCOPE_BY_OWNER`.

### 11.3 AI-ready

AI-ready output remains a deterministic sanitized projection only.

When semantic evidence exists, exposed confidence must not exceed semantic confidence. Expose no raw customer values, bodies, IDs, cost values, tokens, cookies, source text, or raw item payloads.

## 12. Workstream G — End-to-end local shadow campaign

Build a permanent local integration harness that exercises the **actual Phase 13 campaign integration modules**, not a separate parallel implementation.

No browser network and no DEV.

Use synthetic executor doubles at the final runtime boundary.

### 12.1 Fixed Phase 13 corpus

Create `corpus/phase13/**` with at least these deterministic classes:

1. current full semantic anomaly;
2. current full semantic pass;
3. collection later-row violation;
4. collection partial/no violation;
5. observed violation in truncated collection;
6. empty collection;
7. stale expectation;
8. unavailable expectation;
9. no expectation;
10. source evidence drift;
11. unrelated SHA / same evidence;
12. changed derivation;
13. exact replay same fingerprint;
14. exact replay different fingerprint;
15. reduced replay preserves anomaly;
16. reduced replay loses anomaly;
17. invalid precondition;
18. journey unsupported reduced replay if applicable;
19. exploration reducible sequence;
20. API single operation unchanged;
21. duplicate action IDs with distinct occurrence identity;
22. replay-plan reorder attempt;
23. replay-plan invented occurrence;
24. replay-plan API multi-original rejection;
25. safety nonzero;
26. privacy nonzero;
27. known false positive;
28. protocol-only anomaly;
29. semantic cluster duplicate;
30. semantic cluster evidence-digest split;
31. semantic cluster unrelated-SHA merge;
32. manifest semantic-version drift;
33. checkpoint version drift;
34. resume with executable replay-version drift;
35. source remote advance after manifest freeze;
36. semantic HIGH/READY positive case;
37. partial semantic confidence block;
38. stale semantic confidence block;
39. AI-ready semantic-confidence coherence;
40. privacy sentinel across integrated outputs.

Add more if implementation surfaces require them.

### 12.2 Baseline comparison

Compare the current pre-Phase-13 real-campaign architecture with Phase 13 integration using deterministic structural metrics.

At minimum report integers for:

- candidatesWithExecutableReducedReplay;
- candidatesWithSemanticAuthorityBound;
- semanticCandidatesUsingDossierV2;
- staleOrPartialFalseReady;
- differentFingerprintFalseReproduction;
- duplicateOccurrenceAmbiguity;
- manifestSemanticDriftMisses;
- protocolCompatibilityFailures;
- privacyLeaks;
- determinismMismatches.

Do not optimize a vanity aggregate score. Quality floors must remain zero.

### 12.3 Determinism

Run the entire shadow campaign >=3 times.

Require byte-stable safe identities/results where deterministic by contract and zero semantic/cluster/replay-plan drift.

## 13. Workstream H — Hardening and regression

Add narrow hardening guards for:

- replay-plan core has no network/browser/fs/child process;
- semantic evidence/confidence/dossier/cluster pure cores stay isolated;
- real runtime binding is reachable only from explicit manual real-campaign boundary;
- no ordinary Playwright suite path invokes product DEV;
- no new host/route/method authority;
- no `invalidReducedReplay()` remains attached where a safe Phase 13 binding is claimed;
- no semantic currentness can be fabricated by caller input without source-bundle validation;
- AI-ready confidence cannot exceed semantic confidence when semantic evidence exists;
- Phase 6/data/infra imports absent;
- selfDev/promotion imports absent.

## 14. CI matrix

Add a local/synthetic workflow step:

`Phase 13 real campaign semantic runtime integration matrix`

It must not contact DEV.

The job remains useful when GitHub Actions becomes available again.

## 15. Required validation

Run at minimum:

- typecheck;
- hardening:check;
- focused Phase 13 matrix;
- Phase 12 full focused matrices;
- Phase 9/10/11 compatibility matrices;
- campaign:synthetic;
- owner-provenance;
- agent:check;
- agent:audit;
- project:check;
- selfdev:catalog-integrity;
- git diff --check;
- canonical complete Playwright `--project=nightwatch --workers=1`;
- topology-correct isolated complete Playwright using the repository's required sibling/workspace topology.

No new skips to hide failures.

## 16. Current-source canary

Before local closure, resolve current `mobingilabs/ripple-api` remote master fresh and use a disposable snapshot to rederive the semantic expectation bundle required by the fixed campaign mapping.

If current source moved:

- classify relevance;
- rederive;
- fail closed if the required contracts no longer resolve;
- do not mutate canonical siblings.

This is source metadata only, not product DEV.

## 17. Git workflow

Use validated direct-to-main checkpoints per D-34:

1. local implementation checkpoint after focused + full + isolated validation;
2. push fast-forward;
3. verify `HEAD == origin/main`;
4. inspect exact Actions truth;
5. rerun critical clean post-push acceptance;
6. docs/continuity closure checkpoint;
7. inspect exact final Actions truth.

No force push.

## 18. External CI rule

The documented GitHub billing/spending-limit blocker is not a reason to stop Phase 13A local/source engineering early.

If Actions still refuses to start jobs after all authorized work is complete:

- record exact run IDs/SHAs;
- record that jobs had zero steps / did not start;
- terminalize `BLOCKED_EXTERNAL_CI`;
- retain local verification facts;
- do not claim CI success;
- do not authorize DEV.

If Actions is restored, require exact-head success before any future DEV readiness token.

## 19. Phase 13B readiness

Phase 13A may recommend Phase 13B only if:

- all local integration criteria pass;
- exact CI is green;
- current-source bundle resolves;
- no real-runtime authority expansion occurred.

Then set only:

`PHASE_13B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION`

Never execute DEV in Phase 13A.

If CI is still externally blocked:

`PHASE_13B_DEV_READINESS: NOT_READY_EXTERNAL_CI`

## 20. Success criteria

Local implementation quality requires all of the following:

- every confirmed Phase 12 contract-integrity gap closed;
- strict replay occurrence identity with no ambiguous duplicates;
- API original/retained single-operation invariant enforced;
- semantic evidence coherence strict;
- AI-ready confidence coherence strict;
- current-source semantic campaign bundle derives/resolves at fresh SHA;
- real campaign source path has semantic-oracle wiring for supported existing authority;
- real campaign no longer uses generic always-invalid replay where a safe binding is implemented;
- semantic candidate -> replay/minimize -> semantic triage evidence -> semantic cluster/confidence -> dossier v2 is proven in the shadow campaign;
- protocol-only path remains compatible;
- manifest/checkpoint drift catches load-bearing semantic/replay version changes;
- quality floors 0;
- privacy leaks 0;
- deterministic mismatches 0;
- canonical full regression 0 failed;
- isolated full regression 0 failed;
- catalog unchanged;
- safety vector 0;
- no DEV.

## 21. Truthful terminal tokens

If local/source implementation passes and CI executes green:

```text
PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION: COMPLETE
PHASE_13A_STATUS: COMPLETE
PHASE_13B_DEV_ACCEPTANCE: RECOMMENDED_SEPARATE_AUTHORIZATION
NEXT ACTION: STOP
```

If local/source implementation passes but Actions remains externally blocked:

```text
PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13A_STATUS: BLOCKED_EXTERNAL_CI
PHASE_13B_DEV_READINESS: NOT_READY_EXTERNAL_CI
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

If a source correctness blocker remains:

```text
PHASE_13A_STATUS: BLOCKED
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

Do not weaken a safety, privacy, source-currentness, replay, identity, or historical-compatibility invariant to avoid a blocker.
