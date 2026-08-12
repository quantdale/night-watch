# Nightwatch Phase 6 — Read-Only Data-Layer Evidence + Cross-Layer Oracles

Status: FROZEN INTENT

## Objective

Build an independent, catalog-bound data evidence plane that can correlate a
sanitized Nightwatch UI/API observation with a pre-approved read-only
DynamoDB, BigQuery, or Spanner predicate without making Nightwatch a generic
database console or persisting customer data.

The authoritative chain is:

`runtime evidence -> source/API lineage -> approved query plan -> typed
read-only adapter -> in-memory normalization -> cross-layer comparator ->
sanitized evidence`.

Phase 5 is a prerequisite and is consumed as evidence. Phase 6 does not
reclassify Phase 5 operations from memory.

## Scope

- Native Phase 6 task, waypoint, report, and machine-readable catalogs.
- Mandatory Alphaus datastore-document audit and wrapper capability audit.
- Explicit runtime-to-datastore environment mapping.
- Source-to-store lineage for J1 payer exchange, J2 common exchange, J3 account
  inventory/billing-group stream, and only source-proven Phase 5 API mappings.
- Versioned data evidence, query-plan, data-oracle, and cross-layer-lineage
  schemas.
- Structured validators for narrow DynamoDB, BigQuery, and Spanner reads.
- Thin adapters that receive validated plans, never arbitrary query text.
- Query budget, result-size, timeout, deduplication, and retention gates.
- Metadata-first in-memory normalization, privacy reduction, consistency
  classes, numeric semantic contracts, and reusable comparators.
- Local synthetic Dynamo-like, BigQuery-like, and Spanner-like execution
  matrices, including malicious-plan and injection cases.
- Phase 3 staleness integration and Phase 5 operation-to-data lineage.
- Optional, serial, tightly bounded real read-only verification only if the
  runtime environment, exact scope, approved tool, auth, cost, and privacy
  gates all pass. Zero real queries must never be reported as live datastore
  verification.

## Non-goals and absolute exclusions

- Any production or non-production datastore mutation, DDL, export with side
  effects, repair, or remediation command.
- DynamoDB scans on `REPORTS`, `TAGS`, `RIPPLE_FEES`, `RIPPLE_INVOICES`, or
  `UNBLENDED_EXPORT`; in practice Phase 6 generates no DynamoDB scan plan.
- Arbitrary SQL, arbitrary table/dataset selection, `SELECT *`, unscoped BQ,
  unscoped Spanner, broad joins, table discovery as a runtime fallback, or
  query widening after an empty result.
- Customer discovery by email, name, substring, or broad identifiers.
- Persisting raw rows, query parameters, customer IDs, account IDs, exact
  costs, request/response bodies, credentials, or stable customer hashes.
- Passing database credentials to OOPS, Playwright, Chrome DevTools MCP, or
  any Phase 5 process.
- Logs as a substitute for independent datastore evidence.
- A universal SQL engine, database browser, ETL service, scheduler, fuzzer,
  LLM query planner, or Phase 7.

## Source and documentation precedence

Before any data query design or execution, the following were consulted in
order and their current versions/paths are recorded in STATE.md:

1. `DOCUMENTATIONS/docs/INVESTIGATION_ROUTER.md`
2. `DOCUMENTATIONS/docs/DB_SCHEMA_REFERENCE.md`
3. `DOCUMENTATIONS/docs/TRIAGE_QUERY_PLAYBOOK.md`
4. `DOCUMENTATIONS/docs/READ_ONLY_INVESTIGATION_RULES.md`

Relevant pipeline/source docs are consulted after that. Evidence precedence is
live read-only data (if any), current schema/rules, current playbook, current
source, pipeline map, other docs, and finally explicit assumption. Conflicts
are recorded, never silently merged.

## Data environment gate

No runtime/datastore comparison is admitted until the service configuration and
source path establish which datastore environment the selected DEV runtime
reads. The status is one of:

- `RUNTIME_DATA_ENV_CONFIRMED`
- `RUNTIME_DATA_ENV_SOURCE_DERIVED`
- `RUNTIME_DATA_ENV_UNRESOLVED`

`RUNTIME_DATA_ENV_UNRESOLVED` blocks all cross-layer comparison and all real
datastore reads. A DEV application credential is not a datastore credential.

## Query-plan boundary

Durable plans use `nightwatch.readonly-query-plan.phase6.v1`. A plan is a
structured value with literal catalog IDs, table/dataset families, key grammar,
scope roles, explicit projections, bounded limits, and source provenance. The
runtime API accepts `ValidatedReadPlan` only. There is no
`executeSql(string)`, shell interpolation, free-form table name, or AI-provided
query text path.

Allowed plan kinds:

- `DYNAMO_GET`
- `DYNAMO_QUERY_PREFIX`
- `DYNAMO_QUERY_GSI`
- `BQ_SELECT_SCOPED`
- `SPANNER_SELECT_SCOPED`

No scan, mutation, DDL, arbitrary SQL, scripting, multi-statement query,
unknown table, unknown index, unknown dataset, or unbounded projection can be
represented or validated.

## Data safety invariants

- DynamoDB requires an exact catalog table, exact partition-key role, and an
  exact documented sort-key prefix or named GSI. Protected-table scans are
  rejected before tool invocation.
- BigQuery is fixed to project `mobingi-main` only when current docs/source
  confirm it. Plans select explicit columns, one exact `msp_{suffix}` dataset,
  and a required month/date/payer scope. Cost estimation uses the supported
  direct BigQuery dry-run mechanism, never a fake `bq-ro --dry-run` flag.
- Spanner is fixed to the documented project/instance/database only after
  re-verification. Plans require high-cardinality scope, explicit projection,
  bounded limits, and date bounds where the lineage requires them.
- Adapters use structured process arguments or approved function arguments and
  capture output in memory. Raw tool stdout is never written to task docs.
- A small query budget is checked before execution and decremented only after a
  validated invocation. A single oracle may use one first probe and one fresh
  semantic replay; no polling or recursive pipeline traversal is allowed.

## Privacy and normalization

Raw rows can exist only in memory for the minimum normalization interval.
Durable evidence contains safe cardinality classes (`ZERO`, `ONE`, `MANY`),
presence/enum/shape predicates, comparison classes, timing classes, query-plan
IDs, normalized template fingerprints, and parameter roles—not values.

Numeric comparisons are allowed only after a source-backed contract fixes
metric, currency, vendor, time grain, aggregation grain, scope, rounding,
exchange-rate stage, fee/tax treatment, and transform/rebucketing semantics.
Exact numeric values are never persisted. Membership comparison uses a
run-local salt held in memory, never a stable identifier hash.

## Consistency and anomaly policy

Every oracle declares one consistency class: `DIRECT_READ`,
`DERIVED_SYNCHRONOUS`, `DERIVED_ASYNC`, `EVENTUALLY_CONSISTENT`,
`SNAPSHOT_MONTHLY`, `HISTORICAL_ONLY`, or `UNKNOWN_CONSISTENCY`. Async lag,
retention misses, wrong environment, wrong month grammar, scope mismatch, and
metric mismatch produce explicit non-bug classes rather than `DATA_MISMATCH`.

Evidence levels are L0 runtime anomaly, L1 fresh replay, L2 repeated runtime
reproduction, L3 independent API/state contradiction, L4 independent
datastore contradiction/corroboration, and L5 source/change relevance. A data
query executing is not itself L4; the result must materially test the runtime
claim and the data source must be independent enough.

## Initial oracle frontier

The frozen design candidates are:

- `D1.j1.payer-exchange`: J1 API/UI behavior to the source-authoritative payer
  exchange-rate row, if current source proves the exact key and environment.
- `D2.j2.common-exchange`: J2 behavior to its distinct common exchange-rate
  source; it must not reuse J1's key family by analogy.
- `D3.j3.account-inventory`: J3 inventory membership/cardinality to the
  authoritative registry, with permission/filter scope proven.
- Optional Phase 5 API-only mappings only if their data lineage is independent,
  narrow, and source-proven. No operation is admitted solely because it has a
  useful-looking table name.

An oracle can remain `LOCAL_ONLY`, `SEMANTIC_REVIEW_REQUIRED`, `STALE`,
`AUTH_BLOCKED`, `ENVIRONMENT_BLOCKED`, or `QUERY_COST_BLOCKED`. The semantic
frontier is a valid result.

## Real execution budget and order

The optional real budget is frozen at a maximum of six read-only datastore
queries total: one first probe and one fresh semantic replay for each of at
most three admitted D1–D3 oracles. Execution is serial. No optional D4 probe
may consume this budget unless a new frozen SPEC amendment is made and the
environment/scope/privacy gates are re-run. A first contradiction stops broad
querying and permits at most the already-budgeted replay after environment,
scope, key grammar, authority, and consistency self-checks.

If approved datastore auth is expired, the real stage stops as
`DATA_TOOL_AUTH_REQUIRED`; it does not loop or reuse application auth. If the
DEV data environment or designated scope is not proven, the real stage stops
as `PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED`.

## Completion criteria

Phase 6 may close only when:

1. Phase 5 is durably complete and reconciled.
2. This SPEC is frozen before implementation and real data work.
3. Mandatory docs and wrapper behavior are recorded.
4. Data evidence, query-plan, oracle, and lineage schemas/catalogs exist.
5. Dynamo, BQ, and Spanner validators reject unsafe plans before tool calls.
6. No generic runtime SQL or protected scan path exists.
7. Query budget, scope, environment, retention, consistency, and privacy gates
   are tested.
8. Synthetic matrices cover valid reads, malicious plans, injection values,
   privacy sentinels, numeric semantics, and async/retention false positives.
9. Phase 3 staleness and Phase 5 API lineage integration pass.
10. Any real reads are narrow, serial, approved, and metadata-only; if none run,
    the report says so explicitly and does not claim live verification.
11. All Alphaus repositories remain byte/state unchanged by Nightwatch.
12. Full TypeScript, focused Phase 6/Phase 5 suites, full Playwright,
    `agent:check`, and `git diff --check` pass.

Phase 7 is not created or started by this task.
