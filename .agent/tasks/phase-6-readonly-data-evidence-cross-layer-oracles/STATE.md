# Task State

## Identity

Task ID: phase-6-readonly-data-evidence-cross-layer-oracles
Phase: 6
Status: BLOCKED
Starting SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Current SHA: 6de063325f2afc1bafc14ce4889c6d53d2e76bed
Last validated implementation SHA: 6de063325f2afc1bafc14ce4889c6d53d2e76bed
Branch: main
Last checkpoint: Phase 6 local architecture and validation complete; no
datastore query has run.

## Objective

Build an independent, privacy-safe, catalog-bound read-only datastore evidence
plane linked to Phase 5 API and Phase 2 browser behavior.

## Current Milestone

M7 — pre-real gate blocked by unresolved runtime-to-datastore environment
mapping. Typed schemas, validators, adapters, privacy/oracle logic, catalogs,
synthetic matrices, and Phase 3/Phase 5 lineage are complete and validated.

## Completed Milestones

- Phase 5 closure independently reconciled: COMPLETE, six first plus six fresh
  API replays, zero safety/privacy counters, native relay fallback, OOPS local
  only under sandbox limitation.
- Mandatory data documents read in order: Investigation Router, DB Schema
  Reference, Triage Query Playbook, Read-Only Investigation Rules.
- Relevant PIPELINE_MAP, Nightwatch safety/architecture docs, codebase index,
  copilot instructions, and KB index consulted.
- Approved tooling inventory: `dynamo-ro`, `bq-ro`, `spanner-ro`, and
  `gcloud-ro` available; raw aliases unavailable; underlying aws/bq/gcloud
  binaries present. No tool was invoked against a datastore.
- Deployment/source re-audit completed 2026-08-12: Nightwatch DEV resolves to
  `apidev.alphaus.cloud`; the Ripple master branch is cloned as `apidev` by
  `ouchan/services/ripple-api-micro/Makefile`; the PHP API's data-plane
  configuration is deployment-provided through `API_ENV`, `AWS_REGION`, and
  `AWS_ARN_ROLE_DYNAMODB`, whose values are not checked into the read-only
  source, while its Dynamo client consumes the role/region values. The
  approved GKE inventory contains `mochi-next-pong` and
  `mochi-prod-ping` but no DEV cluster, and the local kubeconfig has no DEV
  context. This strengthens, but does not resolve, the environment gate.

## Work In Progress

Local work is complete. Keep the external data gate closed: the selected DEV
runtime's actual datastore environment and designated Nightwatch scope remain
unconfirmed. Source proves the image/branch path and configuration slots, not
their deployment values. No datastore auth probe is justified until that
mapping is proved.

## Exact Next Action

The exact next action is deployment-level configuration verification for the
selected DEV `ripple-api-micro` runtime: prove the effective datastore target
(`API_ENV`/AWS role and region or equivalent) and obtain the designated
Nightwatch test scope. The local approved cluster metadata has no DEV context,
so this proof must come from an authoritative deployment/config source. After
that proof, re-read this task state, validate one frozen plan, and only then
assess the auth/tool gate. Never run a real datastore query before the
environment gate passes.

## CURRENT_GOAL

Construct and validate a narrow independent data evidence plane without
arbitrary SQL, scans, writes, raw result persistence, or cross-environment
comparisons.

## CURRENT_PHASE

M7 — pre-real gate BLOCKED: runtime-to-datastore environment and designated
scope are not proven.

## CURRENT_EVIDENCE

- Phase 5 final corpus/checkpoint: `6971ead8eac50df62b55aacce79d0c6f4ae4b170`;
  terminal clean HEAD at transition: `abb0d446f52206390272f8d7a17e6bf6d9ecf0bf`.
- Phase 5 API catalog is `nightwatch.api-catalog.phase5.v1` with 11 inventoried,
  6 KNOWN_READ, 4 KNOWN_MUTATION, 1 UNKNOWN, 6 generated/local-OOPS verified,
  6 DEV first, and 6 fresh replay operations.
- Phase 5 historical malformed JSON remains UNKNOWN and excluded; no Phase 5
  API anomaly candidate was admitted.
- Mandatory docs state DynamoDB exact PK/prefix or named GSI, protected-table
  no-scan rules, BQ project `mobingi-main` with explicit scoped SELECT, Spanner
  documented `mobingi-main/alphaus-prod/main` with high-cardinality filters,
  and `awsdaily2` bounded retention caveat.
- Wrapper audit: `dynamo-ro` allows a scan command and only warns for protected
  tables; `bq-ro` and `spanner-ro` block obvious mutation syntax but do not
  establish Nightwatch's scope/semantics; `bq-ro --dry-run` is not a real dry
  run. Nightwatch must fail closed above them.
- Read-only archaeology tracks completed. J1/J2 source evidence is pinned to
  `ripple-api@27bb007a` and `ouchan@565f00a87f`; J3 source evidence is pinned to
  the same local checkouts plus `blueapi`/`blueinternal` contracts. No source
  repository was modified.
- J1 payer exchange reads RIPPLE with a single `YYYY-MM` month and distinct
  payer key families (`type|payer_exchangerate|...` for JPY and
  `vendor|...|month|...` under `{msp}|payer_exchange_rate` otherwise). J2
  common exchange reads a distinct 13-month user window with
  `type|setting_exchangerate|...` for AWS JPY and
  `type|exchangerate|vendor|...` for non-AWS JPY. These are not interchangeable.
- J3 modern and legacy account/billing-group paths derive membership from
  Companies (`msp_id-index`) plus WAVE_CB_CUSTOMER (`msp_id-index` or
  `company_id-index`); the modern Ripple root fetches the MSP inventory and
  groups by `company_id`. A metadata-only membership oracle is feasible, but
  authorization scope and vendor-specific non-AWS paths require explicit
  review.
- Phase 5 oracle feasibility review rejects direct-Dynamo full-response claims
  for user-scoped J1/J2 responses and cache-backed account/billing-group
  responses. The strongest additional candidate is the non-user-scoped
  billing-group exchange read; it remains outside the frozen D1-D3 real budget
  unless the SPEC is amended.
- Phase 6 hardened implementation checkpoint `6de063325f2afc1bafc14ce4889c6d53d2e76bed`
  adds `src/data/phase6`, four Nightwatch-owned corpus artifacts, and the
  focused synthetic test. The runtime API accepts only `ValidatedReadPlan`;
  the default `GatedReadToolInvoker` cannot invoke an external datastore.
- Current catalog counts: 7 structured query plans, 4 data-oracle records, 11
  lineage edges. Phase 5 remains 11 inventoried / 6 KNOWN_READ / 4
  KNOWN_MUTATION / 1 UNKNOWN.
- Focused Phase 5 + Phase 6 suite is 23/23 PASS; full Playwright is 341/341
  PASS; TypeScript is PASS. No datastore tool, auth probe, query, scan, or
  write has executed.

## PHASE_5_RECONCILIATION

COMPLETE; preserved in Phase 5 STATE/REPORT and corpus index. No Phase 5
operation is reclassified here.

## DB_DOC_VERSION_STATUS

Current local documents were read 2026-08-12 in the mandatory order. Relevant
paths are `DOCUMENTATIONS/docs/INVESTIGATION_ROUTER.md`,
`DB_SCHEMA_REFERENCE.md`, `TRIAGE_QUERY_PLAYBOOK.md`, and
`READ_ONLY_INVESTIGATION_RULES.md`, followed by `PIPELINE_MAP.md`, codebase
index, copilot instructions, and KB index. A documented conflict is preserved:
DB_SCHEMA_REFERENCE §3.3 still says `spanner-ro --database=main` fails, while
its §3 header/§5 and the current wrapper source show that form works. Phase 6
will use the current wrapper behavior only through its stricter validator and
will not edit the Alphaus documentation. Live schema freshness is not claimed.

## DATA_TOOL_STATUS

AVAILABLE: `/home/dalepalaca/go/src/alphaus-main/alphaus-tools/bin/dynamo-ro`,
`bq-ro`, `spanner-ro`, `gcloud-ro`; underlying `/usr/local/bin/aws`,
`/snap/bin/bq`, `/snap/bin/gcloud` present. AUTH_STATUS: NOT_PROBED; no real
tool invocation has occurred. Raw aliases `dynamo_query`, `bq_query`, and
`spanner_query` unavailable.

## DATA_ENVIRONMENT_MAP

`RUNTIME_DATA_ENV_SOURCE_DERIVED` only. Phase 5 runtime target is DEV API
`apidev.alphaus.cloud`; Nightwatch's DEV config is explicit at
`config/environments/dev.json:4-12`. The current read-only source audit proves
that the Ripple master branch is built as the `apidev` image input by
`mobingilabs/ouchan/services/ripple-api-micro/Makefile:12-26`, and that the PHP
API selects its Dynamo client from deployment-provided `API_ENV`,
`AWS_REGION`, and `AWS_ARN_ROLE_DYNAMODB` slots
(`mobingilabs/ripple-api/docker/ripple-api.env.dist:15-55` and
`src/App/Core/Factory/AwsSdkClientFactory.php:63-80`). It does not prove the
effective values for the selected running deployment. The approved GKE
metadata lists `mochi-next-pong`, `mochi-prod-ping`, `curmx`, and
`mcx-us-east1-cfg-ping`; the local kubeconfig exposes only next/prod mochi
contexts and no DEV context. No context was switched and no deployment or
datastore query was run. The designated Nightwatch scope is also absent.
No cross-layer comparison or real query is allowed while this remains
unconfirmed. Application auth is not datastore auth.

## DATA_CATALOG_VERSION

`nightwatch.data-oracle-catalog.phase6.v1` implemented in
`src/data/phase6/catalog.ts` and `corpus/phase6/data-oracle-catalog.json`.

## QUERY_PLAN_VERSION

`nightwatch.readonly-query-plan.phase6.v1` implemented in
`src/data/phase6/types.ts`/`validators.ts` and
`corpus/phase6/query-plan-catalog.json`.

## ORACLE_VERSION

`nightwatch.data-evidence.phase6.v1` and
`nightwatch.cross-layer-lineage.phase6.v1` implemented with metadata-only
normalization/comparison and Nightwatch-owned lineage artifacts.

## REAL_QUERY_BUDGET

max=6 total; at most D1/D2/D3 first plus one fresh replay each; serial; no
optional D4 without SPEC amendment; currently remaining=6.

## REAL_QUERY_LEDGER

0 executed; 0 production writes; 0 protected scans; 0 DB credentials exposed;
no auth or environment probe performed; remaining=6. This is intentionally
not `DATASTORE_VERIFIED`.

## CROSS_LAYER_LEDGER

No Phase 6 oracle evaluated. D1/D2/D3 remain design candidates only; no live
data evidence exists. J1/J2/J3 lineage is source-derived, not live-verified.

## SOURCE_LINEAGE_LEDGER

- J1: `ripple-api@27bb007a` ExchangeRate route/handler → RIPPLE master table;
  payer response is user-scoped and the store oracle may only test the
  source-proven stored-rate subset unless the user scope is independently
  bridged.
- J2: `ripple-api@27bb007a` ExchangeRate global route/handler → RIPPLE master
  table; common-rate key grammar and 13-month response window differ from J1.
- J3: `ouchan@565f00a87f` billingd/costd → Companies plus WAVE_CB_CUSTOMER,
  with `blueapi`/`blueinternal` streaming contracts; membership is derived by
  grouping account rows by `company_id`.
- Phase 5 cache-backed billing/account operations are not automatically
  data-oracle eligible because Redis/cache freshness and async fan-out can
  contradict a direct-Dynamo read without implying a product defect.
- Implemented in `src/data/phase6/lineage.ts`: Phase 5 operation lineage and
  source-proven J1/J2/J3 store edges are evaluated against the Phase 3
  snapshot; source changes mark affected data oracles stale/review-required.

## FILES_CHANGED

Phase 6 task docs, `src/data/phase6/*`, `corpus/phase6/*`, and
`tests/unit/phase6Data.test.ts`. No live datastore evidence file exists.

## VALIDATION_LEDGER

Phase 5 terminal validation remains: TypeScript PASS, focused Phase 5 15
passed, full Playwright 333 passed, agent:check PASS with approved continuity
warning, diff-check PASS. Phase 6 final validation: focused Phase 5 + Phase 6
23/23 passed, full Playwright 341/341 passed, TypeScript PASS, agent:check
PASS with the approved continuity warning, diff-check PASS, privacy scan PASS,
and Alphaus integrity audit PASS.

## BUG_CANDIDATES

None. Phase 5's repaired snapshot-root defect remains in its own report and is
not a data-layer finding.

## REJECTED_QUERY_PLANS

All scans, protected-table scans, arbitrary SQL, SELECT *, unscoped BQ/Spanner,
mutations/DDL, unknown tables/indexes/datasets, missing scope, broad joins,
and query-widening fallbacks are rejected by frozen intent.

## REJECTED_HYPOTHESES

- DEV API does not imply production datastore or the reverse.
- A table name or endpoint name does not prove authoritative lineage.
- An empty retained-history result does not mean no costs.
- BQ `tu_` is not automatically the billing source; PIPELINE_MAP distinguishes
  raw CUR, Spanner awsdaily2, REPORTS, and forecasting mirrors.
- J1 and J2 exchange-rate families must not be collapsed.
- A direct RIPPLE read proves the complete user-scoped J1/J2 response.
- A direct Dynamo read proves a cache-backed Phase 5 response while cache
  freshness/eviction is unknown.
- The modern billing-group stream is a per-group datastore query; source shows
  it fetches the MSP inventory and derives groups in memory.
- The real adapter default is fail-closed; a synthetic invoker is the only
  exercised execution path in this checkpoint.
- The current deployment/source audit cannot close the runtime gate: the
  checked-in legacy deployment path does not carry effective AWS role/region
  or `API_ENV` values, and the approved local cluster metadata has no DEV
  context. `billingd` and `costd` source also contains production Spanner
  bindings for their current non-local paths, but that is not proof of the
  selected legacy `apidev` runtime and must not be substituted for deployment
  evidence.

## UNRESOLVED

- Runtime DEV datastore environment and designated scope.
- Effective deployment values for the selected `ripple-api-micro` runtime
  (`API_ENV`, AWS role/region or equivalent) are not available in checked-in
  source or the approved local cluster metadata.
- Current live auth state for approved datastore tooling.
- Exact runtime DEV→datastore binding and designated Nightwatch test scope.
- Datastore-tool auth status; no auth probe was attempted.
- J3 permission/restricted-role scope and non-AWS vendor source boundary.
- Whether any real datastore query is safe/necessary under this SPEC.
- Stale §3.3 Spanner wrapper statement in the read-only schema document.

## SAFETY_EVENTS

0 datastore queries; 0 writes; 0 scans; 0 production attempts; 0 unknown
approvals; 0 privacy events.

## PRIVACY_STATUS

PASS for task creation. No customer values, credentials, query parameters,
rows, bodies, or datastore output entered Nightwatch.

## LAST_VERIFIED_IMPLEMENTATION_SHA

6de063325f2afc1bafc14ce4889c6d53d2e76bed.

## LAST_CHECKPOINT_SHA

8f2c2a5ed6e7d794f9d2b159c1f6f39923c7fee3.

## NEXT_EXACT_ACTION

Obtain authoritative deployment/config proof of the selected DEV runtime's
datastore environment and designated Nightwatch scope. If that proof remains
absent, keep this task blocked and do not run a datastore query or auth probe.

## RESUME_RECIPE

1. Read Nightwatch AGENTS.md, ACTIVE_TASK, this SPEC/PLAN/STATE/REPORT.
2. Reconfirm Phase 5 COMPLETE and current clean Git state.
3. Read the mandatory four data documents in order if context is uncertain.
4. Recover versions/catalogs/budget from this STATE; never reconstruct a plan
   or runtime scope from memory.
5. Keep all real data execution behind the frozen validators and environment/
   auth/privacy gates.

## Completion Snapshot

Blocked, not complete. Phase 6 architecture, synthetic boundary, adversarial
matrix, privacy review, and full local validation are complete. No live
datastore evidence exists and no real-read decision is possible until the
runtime-to-datastore environment and designated scope are proven.

## Files Changed

Phase 6 task files, implementation, corpus, focused tests, ACTIVE_TASK, and
current-state handoff; no Alphaus repo changed and no datastore query executed.

## Validation Ledger

Phase 6 focused Phase 5 + Phase 6: 23/23 PASS; full Playwright: 341/341 PASS;
`npx tsc --noEmit`: PASS; `npm run agent:check`: PASS with the approved
continuity warning; `git diff --check`: PASS. Privacy scan and Alphaus
integrity audit: PASS. Four read-only source archaeology tracks completed; no
datastore command was invoked.

## Decisions Made During This Task

- Phase 5 must be complete before Phase 6; this gate passed.
- Wrapper availability is not wrapper safety; Nightwatch validators are stricter.
- Real data is optional under the frozen SPEC and never claimed when absent.
- Worker evidence is recorded as source-derived conclusions only; raw worker
  transcripts and any customer-like values are not durable Nightwatch evidence.
- A real read is not eligible while the environment map is only
  `RUNTIME_DATA_ENV_SOURCE_DERIVED`; no live result is labeled verified.

## Discoveries

- The approved wrapper environment is present, but `dynamo-ro` does not block
  protected scans, `bq-ro --dry-run` is not a dry run, and the schema document
  contains a stale contradictory Spanner-wrapper note. Nightwatch must fail
  closed above all three wrappers.

## Blockers

BLOCKED: `PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED`. Nightwatch config and
PIPELINE_MAP/source evidence show possible DEV/production data-plane sharing,
but do not prove the exact datastore selected by `apidev.alphaus.cloud` or a
designated safe runtime scope. Comparing against production, or probing DB auth
first, would be unsafe and potentially misleading.

## Safety Events

None.

## Deferred / Follow-Up

Any real read stage remains blocked on environment/scope proof. Broader data
coverage, multi-hop escalation, scheduling, mutation/remediation, and Phase 7
remain out of scope; Phase 7 is not started.

## Resume Recipe

Use the exact RESUME_RECIPE above and continue at NEXT_EXACT_ACTION.
