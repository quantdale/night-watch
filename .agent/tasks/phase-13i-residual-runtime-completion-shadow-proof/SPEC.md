# SPEC — Nightwatch Phase 13I — Residual Runtime Completion & Integrated Shadow Proof

Task ID: `phase-13i-residual-runtime-completion-shadow-proof`
Phase: `13I-RESIDUAL-RUNTIME-COMPLETION-SHADOW-PROOF`
Starting source anchor: `a7abfee678bc752f705cf910e98fa1f114042e74`
Required authorization: `PHASE_13I_RESIDUAL_RUNTIME_COMPLETION_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Objective

Close every residual local/source Phase-13 runtime gap left by Phase 13H, prove the integrated architecture with a permanent synthetic shadow campaign, then rerun the full local hardening/regression stack. No DEV.

The task is complete locally only when all of the following are true:

1. semantic candidates take a real semantic promotion branch instead of the historical protocol branch;
2. protocol-only candidates retain historical behavior;
3. semantic cluster identity is source-contract based and does not fragment on row ordinal, count, runtime timestamp, or source SHA movement when normalized evidence/derivation are unchanged;
4. exact replay/minimization facts create a strict `SemanticTriageEvidence` object;
5. categorical semantic confidence and `BugDossierV2` READY/UNRESOLVED are the authoritative semantic promotion result;
6. structural replay validation cannot certify reproduction;
7. the real-adapter boundary consumes occurrence-bound `TriageReplayPlanV2` and an injected executor result;
8. journey reduced replay remains unsupported/fail-closed;
9. an integrated `corpus/phase13/**` shadow campaign proves all above deterministically;
10. version/resume drift is exhaustively fail-closed before executor callbacks;
11. safety/privacy remain zero and no new product authority is introduced.

## 2. Hard prohibitions

Do not contact DEV or NEXT. Do not execute `bin/phase7-real.mjs` or any real Phase 9B/10B/11B/13B launcher. No production, mutation, database/data-plane, cloud/infra/Phase 6, Alphaus repo writes, new endpoint/target/network authority, AI/model execution or authority, selfDev/promotion/catalog mutation, publication, or coworker/team workflow.

## 3. Bootstrap and source truth

Fetch origin and fast-forward clean `main`. Git state wins. The current source anchor at publication is `a7abfee...`; spec-publication commits may be docs-only descendants. If substantive source advanced independently, stop and reconcile rather than resetting/rebasing.

Read:

- `AGENTS.md`
- `.agent/ACTIVE_TASK.md`
- original Phase 13 task package and `HARDENING_HANDOFF.md`
- Phase 13H package/report/state
- this complete Phase 13I package
- `docs/design/PHASE_13_REAL_CAMPAIGN_SEMANTIC_INTEGRATION.md`
- `docs/design/PHASE_13H_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION.md`
- `docs/design/PHASE_13I_RESIDUAL_RUNTIME_COMPLETION.md`

After authorization, transition Phase 13I `NONE -> IN_PROGRESS` and make it active. Preserve Phase 13H as historical BLOCKED truth. Correct any stale Recovery text that treats an implementation SHA as live HEAD; live HEAD is discovered from Git.

## 4. Mandatory pre-fix confirmations

Before source edits, permanently reproduce from current source/tests where possible:

- `R1_SEMANTIC_PROMOTION_ROUTE_MISSING`: semantic candidates still flow through protocol `clusterAnomalies()` and `triageAnomaly()`/dossier-v1.
- `R2_REAL_ADAPTER_STRUCTURAL_REPLAY_CERTIFICATION`: Phase-7 adapter helpers can return `FAILURE` without an executor callback.
- `R3_REPLAY_PLAN_V2_NOT_LOAD_BEARING_AT_ADAPTER`: real adapter does not consume a validated V2 occurrence plan as the actual execution control object.
- `R4_PHASE13_SHADOW_PROOF_MISSING`: no permanent integrated Phase-13 corpus/shadow harness exists.
- `R5_VERSION_DRIFT_MATRIX_INCOMPLETE`: one-at-a-time replay/semantic/bundle/dossier/version mutations are not exhaustively proven stop-before-executor.

If current source refutes any claim, record the refutation and adjust only that branch.

## 5. Semantic candidate control evidence

Introduce the smallest strict/versioned safe DTO needed for campaign semantic promotion if current candidate fields are insufficient. It may be named `CampaignSemanticEvidence` or equivalent.

It must be mechanically derived from existing safe semantic findings/receipts and frozen semantic campaign bundle/current resolver facts. It must carry only safe categorical/control identity needed downstream, such as:

- bundle ID/version;
- target ID and expectation ID;
- source repo/SHA/evidence digest/derivation/admission identity;
- resolver/currentness state;
- semantic receipt outcome/version and collection coverage state when applicable;
- finding identity/fingerprint/category;
- deterministic invariant/contract identity needed for semantic clustering.

No raw response/body/value/DOM/customer identifier/cost/string payload. Unknown fields reject. Candidate callers cannot set `REPRODUCED`, `HIGH`, `READY`, `CURRENT`, or `SAFE` as authority flags.

If the invariant/contract identity cannot be mechanically recovered from current expectation + finding/bundle, fail closed to protocol-only/unresolved rather than guessing.

## 6. Dual clustering architecture

`CampaignOrchestrator` must deliberately distinguish:

### Protocol-only candidates

Use existing `clusterAnomalies()` / `AnomalyCluster` semantics unchanged.

### Semantic candidates

Use `semanticContractIdentity` / `semanticClusterKey` or `clusterSemanticObservations` from the existing Phase-12 semantic cluster core.

Semantic identity must:

- bind expectation + target + invariant identity + source repo + evidence digest + derivation version;
- ignore occurrence ordinal, violating count, timestamp, runtime path, raw values, and source SHA movement when evidence digest and derivation semantics are unchanged;
- split when evidence digest, derivation semantics, target, expectation, or invariant definition changes.

Do not globally replace protocol clustering. Keep one explicit routing decision.

Checkpoint persistence must remain strict. If current `CampaignCheckpoint.anomalyClusters` cannot safely represent both kinds, version/evolve the ledger explicitly rather than shoehorning semantic keys into the historical schema. Historical checkpoints must fail closed or remain parseable according to an explicit compatibility decision.

## 7. Semantic promotion pipeline

Do not mutate historical `triageAnomaly()` into an ambiguous dual-semantics function unless source proves that is safest. Prefer a separate semantic promotion function or explicit branch that reuses deterministic primitives:

1. exact replay/minimization;
2. browser/API differential;
3. source correlation;
4. fault localization;
5. construct strict `SemanticTriageEvidence` from actual evidence only;
6. `rankSemanticConfidence`;
7. `createBugDossierV2` / `isReadySemanticDossier`;
8. strict v2 validation/readback;
9. sanitized ledger/morning-brief projection.

Semantic READY requires current source, ANOMALY receipt/outcome, exact fingerprint replay, required reproduction/minimality, clean safety/privacy, reliable oracle, semantic identity, and no known false positive. PARTIAL, stale, unavailable, unknown, non-reproduced, wrong fingerprint, privacy/safety nonzero, or known false positive must not be READY/HIGH.

Protocol-only candidates continue through historical dossier-v1 behavior.

## 8. Replay plan V2 must become load-bearing

The real Phase-7 adapter must stop synthesizing `FAILURE` from structural validation.

For exploration/API/journey exact replay:

- build a strict `TriageReplayPlanV2` from original occurrences;
- map the minimizer-supplied retained sequence back to an unambiguous ordered occurrence selection;
- if duplicate action IDs make that mapping ambiguous, fail closed unless occurrence identity is already provided by the caller/control object;
- validate with `validateReplayPlanV2`;
- call `executeReplayPlanV2(plan, injectedExecutor)`;
- only the injected executor result may return `FAILURE` reproduction;
- exact fingerprint mismatch normalizes to not-reproduced;
- executor throw/error fails closed;
- safety/privacy nonzero cannot reproduce.

API retains exactly one approved operation. Journey reduced replay remains `PRECONDITION_DIVERGENCE`; no subset semantics invented.

The manual real adapter may define interfaces/factories for future contained executor injection, but this task must not invoke DEV.

## 9. Reproduction and promotion evidence coupling

A semantic dossier must be created from the exact representative semantic cluster and its actual replay/minimization result. Prevent cross-cluster evidence mixing.

Required invariants:

- replay target cluster key/contract identity matches the promoted finding;
- exact anomaly fingerprint equals the semantic finding replay fingerprint;
- source bundle expectation/target matches semantic evidence;
- source currentness used for confidence is derived, not caller-asserted;
- minimization counts and minimality guarantee agree with actual minimizer output;
- dossier ledger state matches dossier-v2 `READY`/`UNRESOLVED` and schema version;
- an unresolved semantic dossier is not placed into `bugCandidates` or morning-brief top findings as READY.

## 10. Morning brief and private persistence

Evolve the private campaign ledger/brief only as necessary to represent semantic dossier-v2 truth safely.

Allowed brief fields are categorical/sanitized: candidate ID, priority, semantic confidence, evidence level, minimal action IDs, fault boundary, reproduction count, safe semantic status/expectation/target IDs if needed. No raw customer values or source code text.

Historical protocol dossier-v1 readback remains compatible. Semantic dossier-v2 readback must validate v2, not `validateBugDossier(v1)`.

## 11. Permanent `corpus/phase13/**` shadow campaign

Create a permanent synthetic-only corpus and an integrated shadow harness that uses the actual Phase-13 integration modules and synthetic executor callbacks. Minimum classes:

### Replay / occurrence
- duplicate action ID, retain first occurrence;
- duplicate action ID, retain second occurrence;
- reordered occurrence rejected;
- invented occurrence rejected;
- wrong action for ordinal rejected;
- API multi-original rejected;
- API exact one-operation reproduced only via executor;
- executor different fingerprint not reproduced;
- executor throw invalid/fail-closed;
- journey exact reproduced via executor;
- journey reduced always unsupported.

### Semantic truth
- current full ANOMALY + exact replay + minimization -> semantic HIGH + dossier-v2 READY;
- current ANOMALY but not reproduced -> not READY;
- PARTIAL -> not READY/HIGH;
- SOURCE_STALE -> not READY/HIGH;
- SOURCE_UNAVAILABLE -> not READY/HIGH;
- wrong target/expectation/bundle contradiction rejected;
- known false positive -> not READY;
- safety nonzero -> not READY;
- privacy nonzero -> not READY;
- same evidence/derivation across different source SHA -> same semantic cluster;
- changed evidence digest -> different cluster;
- changed derivation version -> different cluster;
- row ordinal/count changes -> same cluster;
- two distinct invariant contracts of same kind -> distinct cluster.

### Protocol compatibility
- protocol-only candidate still clusters/promotes with historical path;
- no semantic data required for protocol candidate;
- historical v1 dossier/checkpoint parse behavior explicitly tested.

### Drift / resume
- mutate each load-bearing campaign version field one at a time and prove `CAMPAIGN_VERSION_DRIFT` before executor;
- replay-plan v1 version drift;
- replay-plan v2 version drift;
- semantic triage evidence version drift;
- dossier-v2 version drift;
- semantic cluster version drift;
- semantic bundle version drift;
- receipt version drift;
- expectation derivation version drift;
- checkpoint schema/ledger semantic-version mismatch fail-closed;
- frozen semantic bundle/source move does not auto-rebind.

Run the complete integrated shadow campaign at least 3 times. Require deterministic serialized safe outputs and zero mismatches.

Quality floors must all be zero:

- false reproduction;
- structural-only reproduction certification;
- false semantic READY;
- false semantic HIGH;
- PARTIAL false PASS/READY;
- stale/unavailable false READY;
- unsafe/private false READY;
- semantic cluster fragmentation on row ordinal/count/SHA-only movement;
- semantic cross-contract merge;
- drift missed before executor;
- privacy sentinel leaks;
- authority expansion.

## 12. Hardening and validation

After runtime completion, execute the full local/source proof stack:

- `npm run typecheck` or exact repo equivalent;
- `npm run hardening:check`, extending guards for any new pure/runtime boundary;
- dedicated Phase 13I focused matrix;
- original Phase 13 / Phase 13H applicable acceptance rows;
- Phase 12 compatibility;
- relevant Phase 9/9A.1/9B/10/10B/11/11A.x compatibility;
- `npm run campaign:synthetic`;
- `npm run test:owner-provenance`;
- fresh current-source remote SHA + disposable exact snapshot canary; rederive/resolve current approved collection expectations; canonical sibling writes 0;
- canonical complete Playwright `--project=nightwatch --workers=1`, 0 failed;
- topology-correct isolated clean clone + `npm ci` + same full Playwright, 0 failed;
- `npm run agent:check`;
- `npm run agent:audit` strict errors 0;
- `npm run project:check`;
- catalog integrity unchanged;
- `git diff --check`.

Do not describe `npm run test:unit` as the complete Playwright regression.

## 13. Git / CI

Create a validated source-bearing checkpoint only after every local source gate is green. Push fast-forward; verify HEAD==origin/main and clean. Inspect the exact Actions run and whether jobs actually started.

If Actions still fails before job execution because of the documented billing/spending-limit condition, do not retry-loop and do not claim CI green. Local completion may still be `VERIFIED_LOCAL_NOT_CI_VERIFIED` if every local acceptance row is green.

Then finalize docs/continuity, push, and inspect exact final Actions truth.

## 14. Historical continuity repair

Do not rewrite Phase 13H historical findings, but correct stale live-head instructions if touched: implementation anchor remains `d672b62...`; docs closure is `a7abfee...`; live HEAD is always `DISCOVER_FROM_GIT`.

Append the next live decision number discovered from `docs/DECISIONS.md`; never assume the number.

## 15. Terminal states

### Local runtime completion proven, CI externally blocked

```text
PHASE_13_RUNTIME_COMPLETION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_SEMANTIC_PROMOTION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_REPLAY_V2_BINDING: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_SHADOW_CAMPAIGN: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13I_STATUS: BLOCKED_EXTERNAL_CI
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

### Exact CI green as well

```text
PHASE_13_RUNTIME_COMPLETION: COMPLETE
PHASE_13_SEMANTIC_PROMOTION: COMPLETE
PHASE_13_REPLAY_V2_BINDING: COMPLETE
PHASE_13_SHADOW_CAMPAIGN: COMPLETE
PHASE_13I_STATUS: COMPLETE
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

### Any residual local gap

Use `PHASE_13I_STATUS: BLOCKED` with the exact residual blocker. Do not call Phase 13 locally verified.
