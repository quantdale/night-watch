# Task State

## Identity

Task ID: phase-6-readonly-data-evidence-cross-layer-oracles
Phase: 6
Status: IN_PROGRESS
Starting SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Current SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Last validated implementation SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Branch: main
Last checkpoint: Phase 6 task creation; no Phase 6 implementation or
datastore query has run.

## Objective

Build an independent, privacy-safe, catalog-bound read-only datastore evidence
plane linked to Phase 5 API and Phase 2 browser behavior.

## Current Milestone

M1/M2 — mandatory datastore audit and source-to-store archaeology complete;
typed schema/validator implementation is next. Phase 5 is independently
accepted; Phase 6 SPEC is frozen and no data query has executed.

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

## Work In Progress

Create the initial source/data environment map and record worker archaeology.
Then implement only the frozen Phase 6 schema/validator boundary.

## Exact Next Action

Collect the four read-only worker results, inspect current Nightwatch Phase 5
catalog/lineage and targeted Alphaus source, then update this STATE with the
environment map and M1/M2 evidence before implementation. Do not run a real
datastore query.

## CURRENT_GOAL

Construct and validate a narrow independent data evidence plane without
arbitrary SQL, scans, writes, raw result persistence, or cross-environment
comparisons.

## CURRENT_PHASE

M0/M1 — Phase 5 handoff and mandatory data-tool/document audit.

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
`apidev.alphaus.cloud`. PIPELINE_MAP/source evidence indicates DEV/next service
paths can read the production data plane, but the exact runtime binding and a
designated Nightwatch test scope were not executed or independently confirmed.
No cross-layer comparison or real query is allowed while this remains
unconfirmed. Application auth is not datastore auth.

## DATA_CATALOG_VERSION

`nightwatch.data-oracle-catalog.phase6.v1` (frozen version; implementation and
durable catalog artifact pending)

## QUERY_PLAN_VERSION

`nightwatch.readonly-query-plan.phase6.v1` (frozen by SPEC; implementation
pending)

## ORACLE_VERSION

nightwatch.data-evidence.phase6.v1; nightwatch.cross-layer-lineage.phase6.v1
(frozen by SPEC; implementation pending)

## REAL_QUERY_BUDGET

max=6 total; at most D1/D2/D3 first plus one fresh replay each; serial; no
optional D4 without SPEC amendment; currently remaining=6.

## REAL_QUERY_LEDGER

0 executed; 0 production writes; 0 protected scans; 0 DB credentials exposed;
no auth or environment probe performed.

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

## FILES_CHANGED

Phase 6 task docs only so far. No source implementation, catalog artifact, or
datastore evidence file exists yet.

## VALIDATION_LEDGER

Phase 5 terminal validation remains: TypeScript PASS, focused Phase 5 15
passed, full Playwright 333 passed, agent:check PASS with approved continuity
warning, diff-check PASS. Phase 6 validation not yet run.

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

## UNRESOLVED

- Runtime DEV datastore environment and designated scope.
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

abb0d446f52206390272f8d7a17e6bf6d9ecf0bf.

## LAST_CHECKPOINT_SHA

abb0d446f52206390272f8d7a17e6bf6d9ecf0bf.

## NEXT_EXACT_ACTION

Implement the frozen Phase 6 typed contracts, validators, budget gate, and
durable D1/D2/D3 catalog artifacts. Add synthetic tests before considering any
real datastore gate. Do not run a datastore query.

## RESUME_RECIPE

1. Read Nightwatch AGENTS.md, ACTIVE_TASK, this SPEC/PLAN/STATE/REPORT.
2. Reconfirm Phase 5 COMPLETE and current clean Git state.
3. Read the mandatory four data documents in order if context is uncertain.
4. Recover versions/catalogs/budget from this STATE; never reconstruct a plan
   or runtime scope from memory.
5. Keep all real data execution behind the frozen validators and environment/
   auth/privacy gates.

## Completion Snapshot

Not complete. Phase 6 has frozen task/spec, mandatory-doc/tool audit, and
source-derived J1/J2/J3 archaeology; no implementation or live data evidence
yet.

## Files Changed

Phase 6 task files and ACTIVE_TASK/current-state handoff only; no Alphaus repo
changed and no datastore query executed.

## Validation Ledger

Phase 6 task creation checks pending; Phase 5 inherited validation is recorded
above. Worker archaeology completed in four read-only tracks; no datastore
command was invoked.

## Decisions Made During This Task

- Phase 5 must be complete before Phase 6; this gate passed.
- Wrapper availability is not wrapper safety; Nightwatch validators are stricter.
- Real data is optional under the frozen SPEC and never claimed when absent.
- Worker evidence is recorded as source-derived conclusions only; raw worker
  transcripts and any customer-like values are not durable Nightwatch evidence.

## Discoveries

- The approved wrapper environment is present, but `dynamo-ro` does not block
  protected scans, `bq-ro --dry-run` is not a dry run, and the schema document
  contains a stale contradictory Spanner-wrapper note. Nightwatch must fail
  closed above all three wrappers.

## Blockers

No blocker yet; environment/scope/auth are unprobed and real queries are
intentionally deferred.

## Safety Events

None.

## Deferred / Follow-Up

All implementation and any optional real read stage remain pending. Phase 7 is
not started.

## Resume Recipe

Use the exact RESUME_RECIPE above and continue at NEXT_EXACT_ACTION.
