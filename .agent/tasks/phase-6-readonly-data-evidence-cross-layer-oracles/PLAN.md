# Nightwatch Phase 6 — Read-Only Data-Layer Evidence + Cross-Layer Oracles

## Purpose

Implement and validate a small independent datastore evidence plane without
moving Nightwatch's read-only boundary or persisting customer data.

## Starting State

- Phase 5 task: `phase-5-oops-api-generation-expansion`, status COMPLETE.
- Phase 5 implementation: `83f9d610f9ecc5c35422e91a83b9a3bc760ccadd`.
- Phase 5 final corpus/checkpoint: `6971ead8eac50df62b55aacce79d0c6f4ae4b170`.
- Phase 5 terminal clean Nightwatch HEAD at task transition:
  `abb0d446f52206390272f8d7a17e6bf6d9ecf0bf`.
- Phase 5 real API ledger: run `nightwatch-20260812T141849Z-ca02`, six first
  and six fresh replays, all passed, native relay fallback, zero safety/privacy.
- No Phase 6 implementation or datastore query has run.
- Alphaus repositories are read-only inputs; Nightwatch is the only writable
  repository.

## Scope

Mandatory docs/tool audit; environment map; source/store archaeology; typed
query-plan validators/adapters; data evidence/oracle/lineage catalogs; privacy,
consistency, numeric, budget, retention, and result-size policy; synthetic
execution; Phase 3/Phase 5 integration; optional gated real reads; final audit.

## Non-Goals

Datastore writes, protected scans, arbitrary SQL, broad customer discovery,
raw-result persistence, database credential handling, OOPS/Chrome database
access, remediation, load testing, AI query planning, scheduling, and Phase 7.

## Safety Constraints

Only structured validated plans may reach an adapter. DynamoDB access is exact
key/prefix or documented GSI only; protected scans are impossible. BigQuery
and Spanner plans are explicit, scoped, read-only, bounded, and parameterized.
Rejected plans must fail before tool invocation. Runtime scope, datastore
environment, auth, budget, and privacy gates remain fail-closed.

## Architecture / Approach

`RuntimeDataScope -> DataOracleSpec -> ReadOnlyQueryPlan -> QueryValidator ->
ValidatedReadPlan -> thin adapter -> in-memory normalizer -> cross-layer
comparator -> sanitized evidence`. The catalogs and source lineage remain
Nightwatch-owned; approved Alphaus wrappers provide capability only.

## Non-goals

Writes, scans of protected tables, arbitrary SQL, broad discovery, customer
search, raw result persistence, OOPS/Chrome DB access, remediation, load tests,
AI planning, scheduler, and Phase 7.

## Milestones

### M0 — Phase 5 reconciliation and native Phase 6 task

- Status: COMPLETED.
- Reconcile Phase 5 COMPLETE state, terminal HEAD, API catalog, ledger,
  anomaly/historical status, OOPS containment, and safety/privacy counts.
- Create SPEC/PLAN/STATE/REPORT and update ACTIVE_TASK only after the handoff is
  independently accepted.
- Validation: active task/state identity, clean Nightwatch, Alphaus HEAD/dirty
  snapshot, `npm run agent:check`.

### M1 — Mandatory datastore docs, tools, and environment map

- Status: COMPLETED.
- Record the four mandatory docs in order, relevant pipeline/source docs,
  wrapper behavior/limits, available tools, auth status, and runtime→data
  environment confidence.
- No query execution.
- Acceptance: `DATA_TOOL_STATUS` and `DATA_ENVIRONMENT_MAP` are explicit.

### M2 — Frozen schemas and catalogs

- Status: COMPLETED.
- Add versioned TypeScript contracts and durable JSON catalogs for read plans,
  data oracles, evidence, and cross-layer lineage.
- Add D1/D2/D3 candidate records without inventing unresolved semantics.
- Acceptance: provenance, privacy, consistency, and real-eligibility fields are
  complete for every record.

### M3 — Query validators and typed adapters

- Status: COMPLETED.
- Implement structured Dynamo/BQ/Spanner plan validators and deterministic
  query compilers. Enforce table/index/project/database allowlists, required
  scope, projections, limits, no mutation, no scan, and no arbitrary SQL.
- Add query budget and result-size guards. Adapters receive validated plans only.
- Acceptance: malicious plans reject before tool invocation; injection values
  remain arguments/parameters and cannot alter syntax.

### M4 — Normalization, privacy, consistency, numeric, comparator

- Status: COMPLETED.
- Implement metadata-first normalizers, run-local membership comparison,
  consistency/retention handling, numeric semantic contracts, timing classes,
  and reusable presence/cardinality/enum/schema/numeric comparators.
- Acceptance: false-positive/false-negative fixtures classify conservatively;
  raw rows/IDs/amounts never enter durable evidence.

### M5 — Source/store lineage and Phase 3/5 integration

- Status: COMPLETED.
- Trace J1/J2/J3 from UI/API to handlers/accessors/store/transform/response;
  link Phase 5 operation IDs to data oracles and source freshness edges.
- Acceptance: each oracle is REAL_ELIGIBLE, LOCAL_ONLY, STALE, or
  SEMANTIC_REVIEW_REQUIRED for evidence-backed reasons; no method/table-name
  inference.

### M6 — Synthetic data plane and adversarial matrix

- Status: COMPLETED.
- Exercise all three datastore adapters through the actual plan/validator/
  normalizer/comparator boundary. Cover valid reads, malicious plans, query
  injection, protected scans, empty/large results, retention, async lag, and
  privacy sentinels.
- Acceptance: focused Phase 6 suite passes and no approved tool is called by
  rejected plans. Result: 8 Phase 6 tests passed; synthetic invokers only;
  rejected plans were proven to stop before adapter invocation.

### M7 — Pre-real audit and optional bounded real data

- Status: BLOCKED historically; superseded by `FROZEN_BY_OWNER` on 2026-08-13
  because `INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`.
- Freeze at most D1–D3 and six total read queries. Prove environment, exact
  scope, designated-account policy, auth, budget, privacy, and tool health.
- Execute serially only if every gate passes; otherwise record exact blocker and
  complete local work without pretending live verification.
- Acceptance remains conditional: every real query must be catalog-bound,
  read-only, narrow, and metadata-only; no query repeats beyond the frozen
  pair. The runtime-to-datastore binding and designated scope are not proven,
  so the gate correctly remains closed and zero live queries are reported.

### M8 — Final validation, adversarial review, and clean closure

- Status: COMPLETED — local validation, blocker handoff, and narrow continuity
  checker repair.
- Run all focused suites, Phase 5 lineage tests, full Playwright, typecheck,
  agent check, diff check, Alphaus integrity audit, privacy scan, and closure
  review. Commit Nightwatch only; keep the task BLOCKED because the explicit
  safe environment gate is unresolved rather than marking live evidence
  complete.
- Do not create or start Phase 7.

## Validation Strategy

Use source/doc checks first, then typed unit tests and synthetic adapters.
Rejected plans must be proven to stop before tool invocation. Run full
Nightwatch validation only after focused tests are green. Real data, if
eligible, is serial and bounded by the frozen six-query budget; raw tool output
is captured in memory and reduced before evidence.

## Decision Log

- Phase 6 consumes Phase 5 catalog and lineage; it does not rediscover API
  semantics from endpoint names or table names.
- Approved wrappers are capability inputs, not Nightwatch safety authority;
  Nightwatch validators are stricter than wrapper blocklists.
- Real execution is optional and cannot be claimed when zero queries run.
- Initial real frontier is D1/D2/D3 only; no endpoint/data expansion is allowed
  because a first result is interesting.
- Owner decision supersedes the M7 external environment blocker. No deployment
  metadata, cloud/Kubernetes/AWS investigation, datastore auth, or query is a
  valid next action. Preserve all Phase 6 local implementation/history and
  route the roadmap to the private local triage task.

## Discoveries

- J1/J2 exchange-rate key families are distinct and source-pinned; no method or
  endpoint-name inference is used.
- J3 account membership is derived from Companies + WAVE_CB_CUSTOMER and is
  metadata-oracle feasible, subject to scope/permission proof.
- Direct-Dynamo checks of cache-backed Phase 5 responses are rejected as
  full-response oracles; a non-user-scoped billing-group exchange read is an
  additional candidate but outside the frozen real D1-D3 budget.
- `DB_SCHEMA_REFERENCE.md` §3.3 conflicts with the current `spanner-ro` source
  and its own §3/§5 on `--database=main`; this is retained as a documentation
  conflict and does not authorize bypassing Nightwatch validation.
- The 2026-08-12 deployment/source re-audit proves the DEV image/branch path
  but not its effective datastore binding: `ripple-api-micro` builds the
  Ripple master branch as `apidev`, while `API_ENV`, AWS role, and AWS region
  remain deployment-provided. An explicit approved metadata query confirms
  `mochi-dev-pong` in `labs-169405` with DEV labels, but the deployment source
  carrying effective service values is absent, so the runtime/data gate
  remains blocked.
- The 2026-08-13 follow-up used a temporary isolated GKE metadata context and
  exact GCR/Cloud Build/GitHub/source checks. It confirmed the live owner chain,
  image digest, default ServiceAccount, and Secret reference names, but found
  no non-secret effective AWS/API_ENV mapping or designated scope. The image
  tag's temporal proximity to Ripple master is not promoted to provenance;
  the real-data gate remains blocked.
- The fresh 2026-08-13 session found that `agent:check` classified the
  already-approved Phase 6 runtime-binding audit artifact as `STALE` because
  the shared checkpoint allowlist omitted its exact README/audit paths. This
  was repaired in Nightwatch only with a regression test; the checker retains
  the existing `SYNCED`, `CHECKPOINT_ADVANCE`, and `STALE` semantics.

## Deferred Work

Broader data coverage, customer investigations, multi-hop escalation beyond the
frozen budget, scheduled overnight execution, mutation/remediation, and Phase 7.

## Completion Criteria

All frozen SPEC criteria were validated locally, while the owner intentionally
freezes the live data boundary. The task status is `FROZEN_BY_OWNER`, not
complete; no external handoff is required and no blocker may be used to
weaken read-only or privacy policy.
