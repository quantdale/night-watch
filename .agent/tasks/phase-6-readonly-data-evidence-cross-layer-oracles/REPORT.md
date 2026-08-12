# NIGHTWATCH PHASE 6 — RUNTIME/DATA ENVIRONMENT MAPPING UNRESOLVED

Status: `BLOCKED`, not complete. The Phase 6 data-evidence architecture,
source lineage, typed read-only validators, synthetic data plane, privacy
boundary, and full local validation are complete. The pre-real gate correctly
remains closed because the selected DEV runtime's actual datastore environment
and designated Nightwatch scope are not proven. No datastore command, auth
probe, read, scan, or write was executed.

## Checkpoint identity

- Starting SHA: `abb0d446f52206390272f8d7a17e6bf6d9ecf0bf`.
- Final validated implementation SHA: `6de063325f2afc1bafc14ce4889c6d53d2e76bed`.
- Final documentation checkpoint SHA: `51be1311117dd2a0290ad0380e21f52124f3792b`.
- Terminal clean HEAD: verified after the final documentation sync; Git HEAD
  is the authoritative exact value and is emitted in the final handoff.
- Nightwatch only was modified. Phase 7 was not created or started.

## Phase 5 closure reconciliation

Phase 5 is durably `COMPLETE` and was independently reconciled before Phase 6.
Its implementation SHA is `83f9d610f9ecc5c35422e91a83b9a3bc760ccadd`, its
corpus/checkpoint is `6971ead8eac50df62b55aacce79d0c6f4ae4b170`, and its
terminal task-transition HEAD is `abb0d446f52206390272f8d7a17e6bf6d9ecf0bf`.
The six source-backed `KNOWN_READ` operations each have one first execution
and one fresh replay in `nightwatch-20260812T141849Z-ca02`; all passed through
the native Nightwatch relay fallback. Authenticated OOPS remained local-only
because the verified bubblewrap namespace could not reach the parent relay.

The frozen Phase 4 exact-real-replay condition is
`plannedActions.length > 1 && safetyIsZero(...)`. Each of the six real Phase 4
records had one planned action. Therefore Phase 4's `0/3` exact-real-replay
result is precisely `NOT_APPLICABLE`; it is not relabeled as `PASS` and was not
treated as an unrecorded execution.

The two Phase 4 runtime failures remain durable as follows:

| Run / envelope / seed | Failing phase and primary failure | Secondary oracles / transition | Classification and disposition |
| --- | --- | --- | --- |
| `nightwatch-20260812T121232Z-2e48-E1-J1-payer-exchange-1`, E1/J1, `0x0000000000000102` | `p4.j1.vendor-local.azure`; `ACTION_TRANSITION_FAILED` | Invalidated transition `transition_4aa9...d4c29f`; no exploration request delta or fingerprint; fatal to that sequence, nonfatal to corpus | `NIGHTWATCH_RUNTIME_ARTIFACT`; not reproduced as a product anomaly |
| `nightwatch-20260812T121232Z-2e48-E2-J2-common-exchange-0`, E2/J2, `0x0000000000000201` | `p4.j2.vendor-read.aws`; `ACTION_TRANSITION_FAILED` | Invalidated transition `transition_b754...7714a5`; no exploration request delta or fingerprint; fatal to that sequence, nonfatal to corpus; optional font failures were non-causal `DEV_INFRA_TRANSIENT` signals | `NIGHTWATCH_RUNTIME_ARTIFACT`; not reproduced as a product anomaly |

Neither transition reached a product API observation. Both had zero safety
counts, and the alternative explanation is the Nightwatch runtime/action
artifact recorded in the Phase 4 closure, not an API or datastore defect.

## OOPS and Phase 5 security handoff

- Current OOPS source: `alphauslabs/oops@c4a129feb0b97dc0ae39f32c39a92abe834567f2`,
  clean `master`/`origin/master`, ahead/behind 0/0.
- Installed Homebrew OOPS 1.2.8 was a source mismatch and was not used. The
  pinned source build was OOPS v1.2.46, binary SHA-256
  `ffa29496cf65b4e239ab4ade6001322f2be546492be26901bd4e2d8c092ad57c`.
- Current source findings remain `CONFIRMED_CURRENT`: arbitrary URLs/methods,
  scripts, inherited script environment, permissive temporary files, raw
  output, redirects, direct/proxy sockets, hooks, cloud/distribution, and
  notifications.
- Restricted profile: `nightwatch.oops-profile.phase5.v1`.
- Adapter: `nightwatch.oops-adapter.phase5.v1`.
- Child environment is explicit-allowlist only; the synthetic parent sentinel
  was absent. No password, storage state, token, DB credential, or customer
  value reached OOPS. Shell/script/command/pre-process, notification,
  distributed/cloud, arbitrary URL, mutation, and UNKNOWN features reject
  before process start.
- Bubblewrap namespace probing passed, but authenticated OOPS DEV execution is
  disabled as `OOPS_REAL_DEV_EXECUTION_DISABLED_BY_SANDBOX`; the native
  Nightwatch relay fallback is the only authorized real API path.
- Loopback relay operation IDs resolve destinations internally, inject auth
  only in Nightwatch memory, revalidate redirects, and cannot be an open
  proxy. OOPS stdout/stderr are bounded and sanitized; local failure fixtures
  had zero sentinel leakage.

## Phase 6 artifacts and architecture

The implemented chain is:

`RuntimeDataScope -> DataOracleSpec -> ReadOnlyQueryPlan -> QueryValidator ->
ValidatedReadPlan -> thin adapter -> in-memory normalizer -> cross-layer
comparator -> sanitized evidence`.

Versions:

- Data evidence: `nightwatch.data-evidence.phase6.v1`.
- Read-only query plans: `nightwatch.readonly-query-plan.phase6.v1`.
- Data oracle catalog: `nightwatch.data-oracle-catalog.phase6.v1`.
- Cross-layer lineage: `nightwatch.cross-layer-lineage.phase6.v1`.
- Query validator: `nightwatch.query-validator.phase6.v1`.
- Adapter: `nightwatch.data-adapter.phase6.v1`.
- Normalizer: `nightwatch.data-normalizer.phase6.v1`.
- Comparator: `nightwatch.cross-layer-comparator.phase6.v1`.

The durable corpus contains 7 structured query plans, all DynamoDB plans in
the initial D1–D3 frontier, 4 data-oracle records, and 11 lineage edges. D1,
D2, and D3 are `ENVIRONMENT_BLOCKED`; the additional Phase 5 billing-group
candidate is `SPEC_BLOCKED` outside the frozen real budget. Thus real-execution
eligible plans/oracles: 0; local synthetic candidates: 4. BigQuery and
Spanner typed plans are exercised through the synthetic adapter tests rather
than invented as real candidates without source-backed J1/J2/J3 lineage.

The Phase 5 API catalog remains unchanged: 11 inventoried, 6 `KNOWN_READ`, 4
`KNOWN_MUTATION`, 1 `UNKNOWN`; 6 generated, 6 local-OOPS verified, 6 DEV first,
and 6 fresh replay results. The historical malformed-JSON operation remains
`UNKNOWN`/`HISTORICAL_ANOMALY_PRESENT`, was not generated or deliberately
replayed, and is not a Phase 6 data oracle. The J2 font 502 remains
`L0_NOT_REPRODUCED` and is not a data-layer issue.

## Source-to-data lineage

- J1 payer exchange: Ripple UI/API → `ripple-api` `getAccountExchangeForMonth`
  at source SHA `27bb007ad0c798800b6bd3b29760c966422966e7` → RIPPLE table,
  with distinct JPY and non-JPY key grammars. The oracle is intentionally
  partial: a raw row check does not reproduce user scope or API transformation.
- J2 common exchange: Ripple UI/API → `ripple-api`
  `getCommonExchangeRate` at the same source SHA → a distinct common-rate key
  family and 13-month response window. J1 key grammar is never reused.
- J3 account/billing-group lineage: Ripple UI/API → `ouchan` billingd/costd
  at source SHA `565f00a87fb7616cc23c45d4ffeabee38a41c65f` → Companies
  `msp_id-index` plus WAVE_CB_CUSTOMER `company_id-index`, followed by
  in-memory company grouping. Cache-backed legacy inventory is shape-only and
  is not falsely mapped to a direct datastore oracle.
- Phase 3 staleness integration marks affected data oracles stale/review-
  required when relevant source paths change. Phase 5 operation IDs and
  browser journey IDs are preserved in the lineage catalog.

## Mandatory data-document and tool audit

The required Alphaus references were read in this order before query design:

1. `DOCUMENTATIONS/docs/INVESTIGATION_ROUTER.md`
2. `DOCUMENTATIONS/docs/DB_SCHEMA_REFERENCE.md`
3. `DOCUMENTATIONS/docs/TRIAGE_QUERY_PLAYBOOK.md`
4. `DOCUMENTATIONS/docs/READ_ONLY_INVESTIGATION_RULES.md`

Relevant `PIPELINE_MAP.md`, codebase index, copilot instructions, KB index, and
Nightwatch safety documents were then consulted. The approved wrapper tools are
available: `dynamo-ro`, `bq-ro`, `spanner-ro`, and `gcloud-ro`; raw aliases are
unavailable. Auth status is `NOT_PROBED`, because environment and scope were
not proven and no auth workaround is allowed. The wrapper audit is preserved:
`dynamo-ro` warns rather than blocks protected scans, `bq-ro --dry-run` is not a
real dry run, and the schema document has a stale Spanner wrapper note that
conflicts with current wrapper behavior. Nightwatch validators fail closed
above these wrappers.

## Environment and real-query gate

Current status is `RUNTIME_DATA_ENV_SOURCE_DERIVED`, not confirmed. Nightwatch
configuration identifies the DEV API host as `apidev.alphaus.cloud`. Current
pipeline/config/source evidence indicates DEV/next service paths may share
production data-plane resources, but it does not prove which datastore
environment this selected runtime reads or establish a designated safe
Nightwatch test scope. Application DEV authentication is not datastore
authentication.

Because this mapping is unresolved, a production read would be unsafe and
potentially misleading even if an approved wrapper were available. No DB auth
probe was attempted. The frozen real budget remains 6 maximum queries: one
first and one fresh replay for each of D1–D3, serially. The real query ledger is
0 executed, 0 production writes, 0 protected scans, 0 DB mutations, and 0
credentials exposed. No result is labeled `DATASTORE_VERIFIED`.

### Deployment/source re-audit — 2026-08-12

The re-audit narrowed the missing proof without weakening the gate:

- `config/environments/dev.json:4-12` identifies the UI/API runtime as
  `apidev.alphaus.cloud` and records the existing caveat that DEV services may
  share production data-plane resources.
- The read-only `ripple-api-micro` build path clones `ripple-api` and checks out
  `origin/master` as `apidev` (`ouchan/services/ripple-api-micro/Makefile:12-26`).
  This proves the image/branch lineage, not the data environment.
- The PHP API's deployment template exposes `API_ENV`, `AWS_REGION`, and
  `AWS_ARN_ROLE_DYNAMODB` (`ripple-api/docker/ripple-api.env.dist:15-55`), and
  the AWS client factory consumes those deployment-provided values for its
  Dynamo client (`ripple-api/src/App/Core/Factory/AwsSdkClientFactory.php:63-80`).
  Their effective values are not in the checked-in source.
- The current source also shows mixed service behavior: `billingd` declares a
  separate DEV Spanner identifier but selects its production identifier in the
  current `run` path, while `costd` constructs the production Spanner and
  BigQuery clients directly. Those services are not proof of the selected
  legacy `apidev` PHP runtime and cannot be used as a substitute for its
  deployment binding.
- The approved read-only GKE metadata query, explicitly scoped to
  `labs-169405`, confirms `mochi-dev-pong` is RUNNING in
  `asia-northeast1-a` with `env=dev` and `network=dev`. The default
  `mobingi-main` inventory still contains the next/prod clusters only. No
  context was switched. The checked-in `kubeconf-dev.yaml` has no usable
  server endpoint, so no workload deployment metadata was obtained; no
  datastore tool, auth probe, or application request was run.
- The documented `mobingilabs/mochi` deployment source is not present in the
  local repository set, and an unauthenticated read-only remote lookup did not
  resolve it. Its absence leaves the effective `API_ENV`, AWS role/region, and
  secret/config references unproven.

Therefore the compute environment is confirmed as DEV, but the state remains
`RUNTIME_DATA_ENV_SOURCE_DERIVED` for the datastore binding. The exact
deployment-level datastore target and designated Nightwatch scope must come
from an authoritative external deployment/config source before any datastore
authentication or read. A production read would otherwise risk a
cross-environment comparison.

## Local synthetic validation

The local matrix exercised the actual typed plan, validator, adapter,
normalizer, comparator, budget, and privacy boundaries:

| Area | Result |
| --- | --- |
| Dynamo exact get, prefix query, named GSI | PASS |
| BigQuery scoped SELECT generation | PASS |
| Spanner scoped SELECT generation, LIMIT, retention gate | PASS |
| Protected-table scan and mutation rejection before invocation | PASS |
| Arbitrary SQL, `SELECT *`, unknown fields/tables, broad scope | PASS |
| Injection values with quotes, semicolons, comments, and shell-like forms | PASS |
| Empty/large-result, row/byte/budget bounds | PASS |
| Async lag, retention miss, scope ambiguity, numeric semantic mismatch | PASS |
| Privacy sentinel and metadata-only normalization | PASS |
| Phase 3 staleness and Phase 5 lineage | PASS |

Focused Phase 5 + Phase 6 suites: **23/23 passed**. Full Playwright suite:
**341/341 passed**. `npx tsc --noEmit`: **PASS**. `npm run agent:check`:
**PASS** with the repository's approved continuity warning. `git diff --check`:
**PASS**.

## Safety and privacy accounting

| Counter | Result |
| --- | ---: |
| Real datastore queries | 0 |
| Production writes | 0 |
| Protected DynamoDB scans | 0 |
| DB mutations | 0 |
| Raw rows persisted | 0 |
| Customer identifiers persisted | 0 |
| Financial values persisted | 0 |
| DB credentials leaked | 0 |
| Production attempts | 0 |
| Safety events | 0 |

Privacy review is `PASS`: no raw rows, exact identifiers, costs, query
parameters, credentials, browser state, or datastore output entered durable
Nightwatch evidence. Synthetic sentinel values remained in memory only.
Alphaus repository integrity is unchanged from the Phase 5 handoff:

| Repository | HEAD | Dirty entries |
| --- | --- | ---: |
| `alphauslabs/oops` | `c4a129feb0b97dc0ae39f32c39a92abe834567f2` | 0 |
| `alphauslabs/blueapi` | `691422e5dc81afd263d064986fb50fcb3ea432a9` | 1 pre-existing |
| `alphauslabs/blue-sdk-go` | `8883ee3d3a073352626c8c35e20e9fc5ed765373` | 1 pre-existing |
| `alphauslabs/grpc-chunk-parser` | `66802f281698dfcf0903f0a117d4637fce3fd945` | 0 |
| `mobingilabs/ripple-ui` | `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | 8 pre-existing |
| `mobingilabs/ripple-api` | `27bb007ad0c798800b6bd3b29760c966422966e7` | 1 pre-existing |
| `mobingilabs/ouchan` | `565f00a87fb7616cc23c45d4ffeabee38a41c65f` | 71 pre-existing |

## Adversarial review

1. Arbitrary SQL: impossible; no runtime raw-SQL API exists.
2. DynamoDB Scan: absent from the plan type and rejected before adapters;
   protected tables cannot be represented as a scan.
3. Mutation syntax: rejected before tool invocation for all three datastores.
4. Unknown table/index/dataset/database: rejected by allowlists.
5. BQ `SELECT *`, unscoped dataset, scripting, and fake dry-run reliance:
   rejected or not used.
6. Spanner high-cardinality/date scope and retention: required and tested.
7. Query injection: typed scope validation and structured compilation pass.
8. Empty results never broaden to a scan, `SELECT *`, or an unscoped query.
9. Wrong environment, async lag, retention miss, scope mismatch, and numeric
   semantic mismatch remain explicit non-bug result classes.
10. Raw datastore rows, identifiers, financial values, and DB credentials are
    not durably persisted.
11. OOPS receives no DB access; Chrome DevTools MCP receives no DB access.
12. Source-derived lineage is not called live verification; zero real queries
    are reported honestly.
13. No Phase 7 work was started.

## Architecture review and verdict

An additional source-proven read oracle can be added through a catalog entry,
typed hydration scope, query plan, provenance, and comparison contract without
bespoke shell or database code. Mutation/unknown plans reject automatically;
Phase 3 can mark affected data lineage stale; and UI/API/datastore lineage is
durable. The architecture is locally ready for the environment gate, but live
cross-layer evidence is not established.

Nightwatch defects found and repaired in this task were limited to hardening
the Phase 6 contracts: raw field names and Spanner key/date semantics were
corrected, catalog provenance/privacy fields were completed, and the structured
compiler was aligned with the approved wrapper argument forms. No product,
datastore, or Alphaus-repository defect was found.

Acceptance verdict: **PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED**. Phase 6
must not be marked complete or promoted to live data verification until the
selected DEV runtime's actual datastore environment and designated scope are
proven. The local implementation is validated and the task is durably blocked
at that safety gate.

Recommended next task only: verify the DEV service configuration/source and
designated Nightwatch test scope, then resume from `STATE.md` before probing
datastore auth. Do not start Phase 7.
