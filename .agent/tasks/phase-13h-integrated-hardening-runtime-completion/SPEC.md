# SPEC — Nightwatch Phase 13H — Integrated Hardening & Runtime Completion

Task ID: `phase-13h-integrated-hardening-runtime-completion`
Phase: `13H-INTEGRATED-HARDENING-RUNTIME-COMPLETION`
Starting SHA: `ae0f9ca706b6af4ca879873f8cd9b0ecada40251`
Required authorization: `PHASE_13_INTEGRATED_HARDENING_AND_RUNTIME_COMPLETION_LOCAL_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## 1. Objective

Finish and harden the Phase 13 overnight C1/C2/C3 implementation as one integrated local/source-only architecture. Correct any implementation that only simulates the intended behavior, add permanent regressions, execute the complete Phase 13 acceptance matrix, run canonical and isolated full regressions, and close continuity truthfully.

Phase 13H is allowed to modify Phase 13 source where hardening proves the overnight implementation incomplete or incorrect. It is not test-only.

## 2. Hard prohibitions

Do not:

- contact DEV or NEXT;
- execute a real campaign or any Phase 9B/10B/11B/13B real launcher;
- contact production;
- perform product mutations;
- query DynamoDB, BigQuery, Spanner, SQL/data-plane, cloud logs, GCP/GKE/Kubernetes/AWS runtime infrastructure;
- modify Alphaus sibling repositories;
- add endpoint/target/network authority;
- execute or authorize AI/model decisions;
- selfDev, promote, mutate catalog, adopt variant B, or publish findings.

Phase 6 remains frozen.

## 3. Source precedence

1. live Git/source/tests;
2. this SPEC + ACCEPTANCE_MATRIX;
3. original Phase 13 SPEC/workstreams;
4. overnight amendment + HARDENING_HANDOFF;
5. predecessor reports.

A predecessor status such as `IMPLEMENTED_AWAITING_HARDENING` is not evidence that behavior is correct.

## 4. Mandatory pre-fix reproductions

Before correcting the following, prove/refute each against live source with focused tests or direct source trace.

### F1 — semantic campaign routing gap

Current source review shows `CampaignOrchestrator.recomputeClusters()` uses historical `clusterAnomalies()` for all observations and promotion calls historical `triageAnomaly()` then `validateBugDossier()` / `BugDossier` v1.

Expected token if reproduced:

`CONFIRMED_C3_SEMANTIC_CAMPAIGN_ROUTING_GAP`

A semantic candidate must not be declared routed through Phase 12 semantic cluster/confidence/dossier-v2 merely because `semanticFindings` reaches a v1 dossier field.

### F2 — replay false-certification gap

Current C3 helpers in the real adapter appear to return `status: FAILURE` + the original fingerprint after structural sequence checks, without invoking a browser/API/journey replay executor.

Expected token if reproduced:

`CONFIRMED_C3_REPLAY_FALSE_CERTIFICATION_GAP`

Structural validation is not reproduction. No local helper may manufacture a reproduced anomaly for a future real campaign.

### F3 — v2 replay-plan adapter bypass

Determine whether exploration/API/journey real adapter replay actually consumes validated `nightwatch.triage-replay-plan.private.v2` occurrence identities, or merely compares `actionId` arrays.

Expected token if bypass exists:

`CONFIRMED_C3_REPLAY_PLAN_V2_ADAPTER_BYPASS`

### F4 — semantic bundle mapping coherence

Attempt to construct a bundle where top-level `targetId`/`expectationId` disagree with `approvedMapping.targetId`/`expectationId`, while all individual fields and deterministic bundleId remain valid.

Expected token if accepted:

`CONFIRMED_SEMANTIC_BUNDLE_MAPPING_COHERENCE_GAP`

### F5 — stale-source semantic receipt regression

Reproduce the Phase 12 failing stale-source test. Build the authoritative state matrix from current semantic receipt/currentness definitions.

Classify exactly one:

- `TEST_FIXTURE_STALE_RECEIPT_INVALID`
- `VALIDATOR_STALE_RECEIPT_TOO_STRICT`
- `OTHER_SOURCE_PROVEN_CAUSE`

Do not relax fail-closed source-currentness semantics without source-level proof.

### F6 — continuity structure

Run `npm run agent:check` before continuity edits and record every current Phase 13 PLAN/STATE/ACTIVE error. Repair actual continuity structure later.

## 5. Runtime completion — semantic candidate branch

Implement an explicit semantic branch in the campaign pipeline.

A candidate is semantic only from validated semantic evidence already produced by the approved semantic observer/bundle path. Caller flags cannot make a protocol candidate semantic.

For semantic candidates:

1. cluster using Phase 12 semantic cluster identity, including expectation/invariant/evidence-digest/derivation identity as defined by current semantic clustering contracts;
2. preserve protocol fingerprint as supporting runtime evidence, not the semantic cluster authority;
3. after exact replay/minimization, create strict `SemanticTriageEvidence` from actual replay result, current source bundle, safe semantic receipt/finding, and minimization result;
4. compute categorical semantic confidence with `rankSemanticConfidence`;
5. create/validate dossier v2;
6. derive READY/UNRESOLVED through `isReadySemanticDossier`; caller cannot pre-certify READY;
7. persist only sanitized v2 evidence;
8. morning brief/private summaries may expose only safe categorical v2 fields.

For protocol-only candidates:

- historical clustering/triage/dossier-v1 behavior remains supported and versioned;
- no semantic identity is invented.

If campaign checkpoint/dossier ledger types must evolve, version them explicitly and fail closed on ambiguous historical resume.

## 6. Replay architecture — validation vs execution

Separate three concepts mechanically:

1. replay plan construction/validation;
2. replay binding to an approved executor;
3. executor outcome.

A plan validator may only return valid/invalid control evidence. It may never return anomaly reproduction.

### Exploration

- construct v2 occurrence descriptors from the original approved sequence;
- retained reduced candidates must be validated by occurrence ordinal/expectedActionId, not action-ID subsequence alone;
- bind the validated plan to an executor callback supplied by the runtime adapter;
- no planner refill, no invented action, no reordered occurrence;
- only executor output with exact anomaly fingerprint can reproduce.

### API

- exactly one approved original occurrence and one retained occurrence;
- fixed operation identity must agree with the frozen campaign work item;
- plan validation cannot produce `FAILURE` itself;
- actual future API executor result is required for reproduction.

### Journey

- exact replay may be bound only to an executor that re-runs the full frozen journey in a fresh context;
- reduced journey replay remains `PRECONDITION_DIVERGENCE` unless current source mechanically provides a safe subset executor;
- never synthesize a successful exact replay merely because sequence IDs match.

### Local Phase 13H proof

Because DEV is forbidden, use deterministic synthetic/shadow executor fixtures that explicitly emulate executor outcomes. The production/manual real adapter must expose the same typed binding without executing it during this task.

## 7. Exact-fingerprint and semantic truth rules

No candidate is reproduced unless:

- a real/synthetic executor callback actually ran;
- callback result is failure/anomaly;
- anomaly fingerprint exactly equals the target fingerprint;
- safety vector is zero;
- privacy is clean;
- semantic candidates have current/resolved source identity;
- semantic outcome is an observed ANOMALY, not PARTIAL_COVERAGE, stale, unavailable, projection error, or internal error.

Different fingerprint, partial coverage, stale/unavailable source, safety/privacy nonzero, adapter unavailable, precondition divergence, or executor error => not reproduced / unresolved / blocked as appropriate.

## 8. SemanticCampaignBundle coherence

Strengthen validation so a bundle cannot be internally contradictory.

At minimum require:

- top-level `targetId === approvedMapping.targetId`;
- top-level `expectationId === approvedMapping.expectationId`;
- mapping `journeyOrOperationId` is the exact fixed-table mapping for the target;
- expectation class/ID are compatible with the fixed mapping;
- resolver state/currentness semantics cannot be caller-upgraded;
- `RESOLVED` bundle requires the identity/provenance fields needed by the resolver contract;
- deterministic bundleId changes for every load-bearing field;
- unknown field rejection;
- source branch/repo/sha are safe metadata only;
- deployment status remains unresolved.

Do not add deployment introspection.

## 9. Manifest/checkpoint/version hardening

Verify all Phase 13 load-bearing versions participate in executable identity and resume drift:

- replay plan v1/v2;
- semantic triage evidence;
- dossier v2;
- semantic cluster;
- semantic campaign bundle;
- semantic receipt/oracle/projection as applicable;
- expectation derivation/collection admission as applicable.

One-at-a-time drift tests must stop before executor invocation.

If semantic branch changes checkpoint/dossier ledger schema, bump the relevant schema version and define historical compatibility explicitly. No silent reinterpretation.

## 10. Focused permanent tests

Add/complete permanent tests for at least:

- v2 duplicate occurrence exact/reduced selection;
- API original/retained cardinality;
- invalid/reordered/foreign occurrence rejection;
- plan validator cannot certify anomaly;
- executor required to reproduce;
- different executor fingerprint rejected;
- journey reduced remains unsupported;
- semantic bundle mapping mismatch rejected;
- bundle ID tamper rejected;
- stale/unavailable bundle cannot attach semantic authority;
- semantic candidate routes to semantic cluster identity;
- same semantic evidence across unrelated source SHA movement dedups when current semantic cluster contract says it should;
- changed evidence digest or derivation splits cluster;
- protocol-only cluster behavior unchanged;
- exact replay/minimization feeds strict semantic triage evidence;
- semantic HIGH positive case;
- PARTIAL/stale/unavailable/safety/privacy/known-false-positive cannot reach HIGH/READY;
- semantic dossier v2 persistence/readback;
- protocol dossier v1 persistence/readback;
- AI-ready confidence ceiling;
- no raw sentinels through plan/bundle/candidate/checkpoint/dossier/brief/AI-ready errors.

## 11. Shadow campaign/backtest

Create or complete `corpus/phase13/**` and an integrated local shadow campaign using the actual Phase 13 runtime-completion modules plus synthetic executors.

Required classes include:

- exploration multi-action reducible anomaly;
- duplicate action-ID sequence where the second occurrence, not first, must be retained;
- API one-operation anomaly;
- journey exact anomaly + reduced unsupported;
- different-fingerprint replay;
- partial semantic result;
- stale source bundle;
- unavailable source;
- known false positive;
- safety nonzero;
- privacy sentinel;
- semantic same-evidence dedup;
- semantic changed-evidence split;
- protocol-only candidate;
- manifest/replay/bundle/dossier version drift;
- process interruption/resume where applicable.

Quality floors:

- false reproduction = 0;
- structural-validation-only reproduction = 0;
- false semantic READY = 0;
- partial false PASS/READY = 0;
- stale/unavailable false READY = 0;
- unsafe/private false READY = 0;
- privacy leaks = 0;
- version-drift misses = 0;
- duplicate-occurrence ambiguity = 0;
- determinism mismatches across >=3 runs = 0.

## 12. Hardening boundaries

Run and extend `npm run hardening:check` for all new Phase 13 pure/runtime seams.

Pure modules may not acquire browser/network/fs/child-process/DB/AI authority.

Runtime/manual adapters may only use existing contained architecture and no new destination/action authority.

No product contact during the hardening task.

## 13. Fresh current-source canary

Read-only source metadata only:

- fresh resolve `mobingilabs/ripple-api` master remote SHA;
- disposable exact snapshot;
- derive historical + collection expectations required by fixed campaign semantic mappings;
- resolve at exact SHA;
- build/validate semantic campaign bundles from current source;
- prove stale wrong-SHA resolution fails closed;
- canonical sibling writes 0.

No DEV request.

## 14. Required validation

After source corrections/focused tests:

- `npm run typecheck`
- `npm run hardening:check`
- Phase 13 focused matrices including the complete original ACCEPTANCE_MATRIX plus Phase 13H additions
- Phase 12 focused compatibility
- relevant Phase 11/10/9 matrices
- `npm run campaign:synthetic`
- `npm run test:owner-provenance`
- `npm run agent:check`
- `npm run agent:audit`
- `npm run project:check`
- `npm run selfdev:catalog-integrity`
- `git diff --check`
- canonical `npx playwright test --project=nightwatch --workers=1`
- topology-correct isolated full Playwright from a clean clone/workspace with `npm ci`

No new skip may hide a regression.

## 15. Git / CI checkpoints

Create a validated source-bearing checkpoint only after all local acceptance is green. Push fast-forward. Inspect the exact GitHub Actions run.

Then do docs/continuity closure and inspect exact final Actions run.

If billing/spending-limit still prevents the job from starting, record `BLOCKED_EXTERNAL_CI`; do not claim CI green. Do not repeatedly retry the external blocker.

## 16. Continuity cleanup

Repair current Phase 13 PLAN/STATE/ACTIVE structure so `agent:check` and `agent:audit` have 0 strict errors. Do not erase overnight history; distinguish implementation-only evidence from hardening evidence.

Append the next live decision number rather than rewriting earlier decisions.

## 17. Terminal states

If every local/source gate passes but Actions remains externally blocked:

```text
PHASE_13_RUNTIME_COMPLETION: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13_HARDENING: VERIFIED_LOCAL_NOT_CI_VERIFIED
PHASE_13A_STATUS: BLOCKED_EXTERNAL_CI
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

If exact implementation + final CI are green:

```text
PHASE_13_RUNTIME_COMPLETION: VERIFIED
PHASE_13_HARDENING: VERIFIED
PHASE_13A_STATUS: COMPLETE
PHASE_13B_STATUS: NOT_AUTHORIZED
NEXT ACTION: STOP
```

If a structural correctness/safety/privacy blocker remains, terminalize BLOCKED with the exact unresolved invariant. Never manufacture completion.