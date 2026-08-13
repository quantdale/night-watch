# Task State

## Identity

Task ID: phase-6-readonly-data-evidence-cross-layer-oracles
Phase: 6
Status: FROZEN_BY_OWNER
Starting SHA: abb0d446f52206390272f8d7a17e6bf6d9ecf0bf
Current SHA: 483fbe4f41f235e3e1e0a12e0613954f3db4aefe
Last validated implementation SHA: 483fbe4f41f235e3e1e0a12e0613954f3db4aefe
Branch: main
Last checkpoint: `483fbe4f41f235e3e1e0a12e0613954f3db4aefe` (validated narrow
continuity-checker repair; prior documentation checkpoint
`94898ef8bdb0e73a8c3bb135efef1b5036dc23e2`).
Phase 6 local architecture and validation are complete; no datastore query has
run. Any infrastructure/deployment observations later in this file are
historical records only and are not an active investigation surface.

**Authoritative current interpretation:** `FROZEN_BY_OWNER`;
`INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`;
`OWNER_DECISION_SUPERSEDES_BLOCKER`; `PHASE_6_FROZEN`;
`NO_EXTERNAL_ACTION_REQUIRED`. Do not use historical text below to reopen a
deployment, Kubernetes, cloud, AWS, or datastore investigation.

## HISTORICAL_SESSION_RECORD_2026_08_13

- Sole Nightwatch writer confirmed: no Nightwatch index lock or open Nightwatch
  file was found, and no competing Nightwatch writer was identified.
- Repository recovery is `SYNCED` for the repaired implementation at
  `483fbe4f41f235e3e1e0a12e0613954f3db4aefe`; the prior clean documentation
  HEAD was `94898ef8bdb0e73a8c3bb135efef1b5036dc23e2`.
- `alphaus-tools/bin/envcheck` passed all hard checks on this session. It
  reports a currently available AWS SSO/ADC-backed STS metadata session; this
  is a newly available operator identity path only, not workload-role proof,
  datastore authorization, or permission to query.
- Direct `aws sts get-caller-identity` succeeded for the operator SSO session.
  The account literal is intentionally not retained because the same class of
  value appears in unrelated customer/payer evidence; only the non-secret
  role class `AWSReservedSSO_PowerUserAccessForPayer` is recorded. This is
  `OPERATOR_METADATA_ONLY`, not the pod's assumed role, effective deployment
  configuration, or datastore evidence.
- A bounded exact local search using the operator identity as a discriminator
  found only unrelated investigation/customer evidence, not a deployment
  manifest or workload-role mapping. Exact `mochi-dev-pong` hits were existing
  documentation mirrors, and `ripple-api-micro-envvars` had no local hit. No
  value from those files was copied into Nightwatch.
- GCP ADC, `gcloud-ro`, Kubernetes client, and approved datastore-wrapper
  binaries are available. Chrome DevTools is not listening and remains
  optional. No datastore command or authentication probe was run.
- Historical next discriminator: retain the mapping blocker unless an
  authoritative sanitized deployment handoff arrives. This historical note is
  superseded by the owner freeze; do not seek that handoff or use operator IAM
  identity, local investigation data, or absent GitHub search results as
  workload configuration.

## Objective

Build an independent, privacy-safe, catalog-bound read-only datastore evidence
plane linked to Phase 5 API and Phase 2 browser behavior.

## Current Milestone

OWNER FREEZE — Phase 6 implementation/history preserved; real infrastructure
and datastore execution are out of scope for the current roadmap. Typed
schemas, validators, adapters, privacy/oracle logic, catalogs, synthetic
matrices, and Phase 3/Phase 5 lineage remain preserved.

## OWNER_DECISION_2026_08_13

PHASE_6_STATUS: FROZEN_BY_OWNER
Reason: INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE
Durable interpretation: OWNER_DECISION_SUPERSEDES_BLOCKER;
PHASE_6_FROZEN; NO_EXTERNAL_ACTION_REQUIRED.

This is intentional scope control, not COMPLETE, FAILED,
BLOCKED_WAITING_FOR_HANDOFF, or ABANDONED_DUE_TO_IMPLEMENTATION_DEFECT.
Phase 6 implementation/history and synthetic safety tests remain intact. Its
real datastore execution path is owner-policy quarantined and must return
`OWNER_POLICY_BLOCKED` before any external invocation. No future session should
request effective deployment metadata, coworker/platform handoff, Kubernetes,
GCP, AWS, or datastore investigation to advance Nightwatch.

The frozen datastore budget remains maximum 6, used 0, remaining 6; real data
oracles D1/D2/D3 remain preserved design artifacts; datastore execution is
permanently out of scope and the query ledger remains 0.

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
  approved GKE metadata now also confirms `mochi-dev-pong` is RUNNING in
  `labs-169405` with `env=dev` and `network=dev` when queried explicitly by
  project. Master-to-DEV cluster mapping is therefore proven; effective
  service environment values and designated scope remain unresolved.
- Deployment-presence recheck completed 2026-08-13 through approved
  `gcloud-ro logging read`: sanitized resource labels matched a live
  `ripple-api-micro` container in `mochi-dev-pong/default`. Payloads were not
  emitted or persisted. Bounded searches for literal `API_ENV=dev` in text and
  structured message fields returned no timestamps, so this does not prove
  the effective service environment value.
- External metadata-channel audit completed 2026-08-13: `gcloud`, `kubectl`,
  `gh`, `jq`, and the approved `gcloud-ro`/datastore wrappers are available;
  GCP read access is confirmed for `labs-169405` and `mobingi-main`; Artifact
  Registry metadata, Cloud Build metadata, and authenticated GitHub CLI
  channels are available. Cloud Asset Inventory is
  `AUTH_REQUIRED/UNAVAILABLE` for this target because the API is disabled or
  inaccessible. The GitHub MCP search channel is `AUTH_REQUIRED`, while the
  authenticated `gh` CLI metadata channel is available; two new exact
  deployment searches returned no matches. AWS STS is
  `AVAILABLE_OPERATOR_IDENTITY_ONLY`. No datastore tool or auth probe was
  invoked.
- Temporary isolated GKE metadata context completed 2026-08-13 without
  changing the normal kube context. Read-only Kubernetes API access proved the
  live owner chain `Pod ripple-api-micro-666f6b6b44-pc8cc` → `ReplicaSet
  ripple-api-micro-666f6b6b44` → `Deployment ripple-api-micro` in
  `default`; the pod is `Running`/`Ready` with zero restarts. The deployment
  uses `default` ServiceAccount, has no GKE workload-identity annotation, and
  runs image `asia.gcr.io/labs-169405/ripple-api-micro:b7d124bb517632050de59ccd5ba9032d2caac0e2`
  at live digest `sha256:48f3e00b4ee417619d080119a83a2e387e77405af4cdcc26158beb9378dcab23`.
  `API_ENV`, `AWS_REGION`, and `AWS_ARN_ROLE_DYNAMODB` are SecretKeyRefs in
  `ripple-api-micro-envvars`; AWS STS key refs are in `common-envvars`.
  Secret payload values were not selected, inspected, printed, or persisted.
  The exact GCR tag/digest metadata is present and dated 2026-08-12
  09:47:40 +08:00; no Cloud Build record was returned by the exact
  image/tag searches.

## Work In Progress

Phase 6 local work is preserved. The active roadmap has moved to
`.agent/tasks/private-evidence-minimization-and-triage/`; no external data
gate, deployment handoff, or cloud investigation is pending.

## Exact Next Action

No Phase 6 external action is required. Continue only with the active private
local evidence/minimization task. Do not request deployment metadata, inspect
Kubernetes/cloud runtime state, probe datastore auth, query a datastore, or
reopen the M7 handoff.

## CURRENT_GOAL

Historical objective only: construct and validate a narrow independent data
evidence plane without arbitrary SQL, scans, writes, raw result persistence, or
cross-environment comparisons. It is frozen and no longer an active goal.

## CURRENT_PHASE

OWNER FREEZE: Phase 6 infrastructure/data work is out of scope by owner.

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
- Phase 6 hardened implementation checkpoint `483fbe4f41f235e3e1e0a12e0613954f3db4aefe`
  adds `src/data/phase6`, Nightwatch-owned corpus artifacts, and the
  focused synthetic test. The runtime API accepts only `ValidatedReadPlan`;
  the default `GatedReadToolInvoker` cannot invoke an external datastore.
- Current catalog counts: 7 structured query plans, 4 data-oracle records, 11
  lineage edges. Phase 5 remains 11 inventoried / 6 KNOWN_READ / 4
  KNOWN_MUTATION / 1 UNKNOWN.
- Focused Phase 5 + Phase 6 suite is 23/23 PASS; full Playwright is 342/342
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
`/snap/bin/bq`, `/snap/bin/gcloud` present. GCP project metadata access is
`AVAILABLE` for `labs-169405` and `mobingi-main`; Artifact Registry metadata,
Cloud Build metadata, and authenticated GitHub CLI are `AVAILABLE`; the
GitHub MCP search channel is `AUTH_REQUIRED`; Cloud
Asset Inventory is `AUTH_REQUIRED/UNAVAILABLE` for this target because its API
is disabled or inaccessible; AWS STS is `AVAILABLE_OPERATOR_IDENTITY_ONLY`.
`DATASTORE_AUTH_STATUS` is
`NOT_PROBED`; no real datastore tool invocation or datastore auth probe has
occurred. AWS STS is `AVAILABLE_OPERATOR_IDENTITY_ONLY`; it has not been used
for DynamoDB, BigQuery, or Spanner access. GKE metadata
access is `AVAILABLE` through a temporary isolated kubeconfig; the normal
context was unchanged. `gcloud-ro` metadata-only
cluster-listing/describe and sanitized logging resource-label checks succeeded
for `labs-169405`; no workload environment payload or datastore query was run.
Raw aliases `dynamo_query`, `bq_query`, and `spanner_query`
unavailable.

## DATA_ENVIRONMENT_MAP

The compute runtime is `RUNTIME_COMPUTE_ENV_CONFIRMED`; the effective data
environment is `RUNTIME_DATA_ENV_UNRESOLVED`. Phase 5 runtime target is DEV API
`apidev.alphaus.cloud`; Nightwatch's DEV config is explicit at
`config/environments/dev.json:4-12`. The current read-only source audit proves
that the Ripple master branch is built as the `apidev` image input by
`mobingilabs/ouchan/services/ripple-api-micro/Makefile:12-26`, and that the PHP
API selects its Dynamo client from deployment-provided `API_ENV`, `AWS_REGION`,
and `AWS_ARN_ROLE_DYNAMODB` slots
(`mobingilabs/ripple-api/docker/ripple-api.env.dist:15-55` and
`src/App/Core/Factory/AwsSdkClientFactory.php:63-80`). A temporary isolated
GKE context explicitly scoped to `labs-169405` confirms the live
`mochi-dev-pong/default/ripple-api-micro` workload and owner chain, its GCR
image/tag/digest, default ServiceAccount, and Secret reference names. The
effective Secret-backed values are not checked in and were not inspected.
GCR has no matching Cloud Build record; the `ouchan` deployment trigger and
Ripple master commit provide only source/build correlation, not effective
runtime configuration. The checked-in `kubeconf-dev.yaml` remains unusable,
but no normal context was changed. The designated Nightwatch scope is absent
from the durable Phase 5 runtime/API evidence.
No cross-layer comparison or real query is allowed while this remains
unconfirmed. Application auth is not datastore auth.

## LIVE_WORKLOAD_IDENTITY

`CONFIRMED` from exact read-only GKE metadata: project `labs-169405`, cluster
`mochi-dev-pong`, location `asia-northeast1-a`, namespace `default`, Pod →
ReplicaSet → Deployment owner chain for `ripple-api-micro`, Ready workload,
image tag/digest recorded in `corpus/phase6/runtime-binding-audit.json`, and
Kubernetes ServiceAccount `default`. Only Secret reference names are known;
Secret payloads remain unread.

## DEPLOYMENT_BINDING_MATRIX

Canonical sanitized matrix: `corpus/phase6/runtime-binding-audit.json`.
Workload/pod/deployment/image identity: `CONFIRMED`. Deployment source/image
correlation: `PARTIAL_METADATA`. Effective `API_ENV`, AWS account/role/region,
physical Dynamo namespace, and any BQ/Spanner target: `UNRESOLVED` or
`NOT_PROVEN`. Designated Nightwatch scope: `UNRESOLVED`.

## EFFECTIVE_ENV_STATUS

`API_ENV_UNRESOLVED`; no `API_ENV_LIVE_VERIFIED`,
`API_ENV_DEPLOYMENT_DERIVED`, or `API_ENV_AUTHORITATIVE_HANDOFF` evidence is
available. Operator STS identity is explicitly excluded from this proof.

## DATASTORE_BINDINGS

- DynamoDB: source family `POSSIBLY_USED`; effective AWS account/role/region
  and physical table namespace unresolved; real execution blocked.
- BigQuery: `NOT_PROVEN_FOR_SELECTED_LEGACY_PHP_WORKLOAD`; no query allowed.
- Spanner: `NOT_PROVEN_FOR_SELECTED_LEGACY_PHP_WORKLOAD`; no query allowed.

## DESIGNATED_SCOPE_STATUS

`DESIGNATED_SCOPE_UNRESOLVED`. No MSP/company/payer/billing-group/account value
is retained in Nightwatch. The only approved next path is ephemeral derivation
from an already-approved KNOWN_READ after deployment/data binding proof; DB
discovery by email, name, scan, or broad search remains prohibited.

## SOURCE_PROVENANCE

J1/J2 source lineage is pinned to `mobingilabs/ripple-api@27bb007a`; J3 lineage
to `mobingilabs/ouchan@565f00a8`; the live image/deployment trigger is recorded
as partial provenance in the sanitized matrix. Current source explains how
deployment-provided values are consumed but does not supply their effective
values. The targeted `alphauslabs/mochi` repository lookup also returned not
found.

## EXHAUSTED_EVIDENCE_PATHS

Exact live GKE metadata, image/GCR metadata, Cloud Build exact image/tag
searches, deployment-trigger/GitHub metadata, authenticated `gh` exact
searches for `ripple-api-micro-envvars` and `mochi-dev-pong`, targeted
`mobingilabs/mochi` and `alphauslabs/mochi` lookups, current service-source
resolution, ConfigMap/annotation checks, and bounded Cloud Logging metadata
checks are exhausted. Cloud Asset Inventory is unavailable. AWS STS now proves
only operator identity. No Secret payload, pod exec, port-forward, datastore
auth probe, or datastore query is an admissible substitute.

### DEPLOYMENT_BINDING_MATRIX

| Question | Evidence path | Result | Confidence | Next discriminator |
|---|---|---|---|---|
| Live workload | GKE Deployment/Pod API, exact `ripple-api-micro` objects | Confirmed in `labs-169405/mochi-dev-pong/default`; Ready | LIVE_METADATA | none for presence |
| Owner chain | Pod and ReplicaSet ownerReferences | Pod → ReplicaSet → Deployment confirmed | LIVE_METADATA | none |
| Image | Pod status `imageID`; Deployment spec | GCR image/tag and digest confirmed | LIVE_METADATA | registry/source provenance |
| Deployment source/provenance | GCR exact tag, Cloud Build exact search, authenticated GitHub metadata, `ouchan` build rules | Image/branch path proven; source commit and effective deploy config unresolved | PARTIAL_METADATA | authoritative `mochi` deployment/config artifact |
| Effective `API_ENV` | Deployment env source | SecretKeyRef `ripple-api-micro-envvars/API_ENV`; value not read | UNRESOLVED | non-secret deployment/build/source evidence |
| AWS region | Deployment env source | SecretKeyRef `ripple-api-micro-envvars/AWS_REGION`; value not read | UNRESOLVED | non-secret deployment/build/source evidence |
| Dynamo role/account | Deployment env source + source client | SecretKeyRef `ripple-api-micro-envvars/AWS_ARN_ROLE_DYNAMODB`; value not read | UNRESOLVED | image/deployment provenance or sanitized platform mapping |
| AWS credential path | Deployment env source | `common-envvars` keys `AWS_ACCESS_KEY_ID_ASSUME`/`AWS_SECRET_ACCESS_KEY_ASSUME` are referenced; values not read | SOURCE_DERIVED | non-secret platform binding |
| GCP workload identity | Pod/ServiceAccount metadata | `default` ServiceAccount; no relevant annotation | LIVE_METADATA | source/deployment config only |
| GCP BQ/Spanner target | Live workload config + selected service source | No binding proven for this legacy PHP workload | UNRESOLVED/NOT_PROVEN | source/deployment evidence |
| Designated Nightwatch scope | approved runtime/API evidence | Not obtained during metadata-only stage | UNRESOLVED | after binding proof, existing KNOWN_READ scope bridge |

`DynamoDB` is source-proven as the selected legacy PHP client family for J1/J2,
but its effective AWS account/region/table environment remains
`POSSIBLY_USED`, not `CONFIRMED_USED`, until the Secret-backed binding is
independently established. No candidate datastore was queried. The durable
sanitized matrix is `corpus/phase6/runtime-binding-audit.json`.

### GKE metadata safety result — 2026-08-13

`get-credentials` wrote only a mode-700 temporary kubeconfig outside the
repository; it was removed after the read-only checks. The normal context was
unchanged. Reads were limited to exact Deployment/Pod/ReplicaSet/
ServiceAccount/Secret metadata and image identity. Secret payload values were
not selected, inspected, printed, or persisted. No pod exec, port-forward,
ConfigMap value, datastore tool, or application request was used.

### Metadata-channel waypoint — 2026-08-13

The external read-only environment can reach both candidate GCP projects and
the DEV cluster API metadata path. Artifact Registry metadata, Cloud Build
metadata, and authenticated GitHub CLI are available for targeted reads; the
Cloud Asset Inventory path is unavailable for this target because its API is
disabled/inaccessible. AWS STS cannot establish an identity without
unavailable/expired credentials and remains out of scope. The checked-in
kubeconfig was not used; a temporary isolated context was created and fully
removed. The deployment/image/source cross-check is now exhausted without an
effective non-secret binding. No Secret payload, pod exec, port-forward, or
datastore command is permitted.

### Deployment/image/source provenance waypoint — 2026-08-13

- Live GCR metadata confirms tag `b7d124bb517632050de59ccd5ba9032d2caac0e2`,
  digest `sha256:48f3e00b4ee417619d080119a83a2e387e77405af4cdcc26158beb9378dcab23`,
  and timestamp `2026-08-12T09:47:40+08:00`.
- The exact Cloud Build image/tag searches returned no matching build record.
- Authenticated GitHub metadata identifies the `ouchan` deployment trigger as
  commit `b7d124bb517632050de59ccd5ba9032d2caac0e2`, whose message says it
  triggered `ripple-api-micro` from master. Current `ripple-api` master is
  `07114cb2506c9bc8c47c90e8e01b5d9edd6bb9de`; its temporal proximity is only
  a candidate correlation, not image provenance.
- The targeted `mobingilabs/mochi` lookup returned 404/not found, and no
  authoritative deployment manifest/config source was obtained. The
  `ouchan` build rules establish the image/branch/cluster path but not the
  Secret payload values.
- Kubernetes metadata shows no ConfigMap references, no useful Deployment
  labels/annotations beyond the revision, and the default ServiceAccount has
  no relevant workload-identity annotation. This does not establish AWS
  account, role, region, or physical table environment.

Result: compute environment and live workload are `CONFIRMED`; effective
datastore binding remains `UNRESOLVED`; designated scope remains
`UNRESOLVED`. The exact question/evidence matrix is machine-readable in
`corpus/phase6/runtime-binding-audit.json`.

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
no datastore auth or runtime-data environment probe performed; operator STS
identity metadata only; remaining=6. This is intentionally not
`DATASTORE_VERIFIED`.

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

Phase 6 task docs, `src/data/phase6/*`, `corpus/phase6/*`,
`bin/agent-state.mjs`, and the agent-state regression test.
`corpus/phase6/runtime-binding-audit.json` contains only sanitized
deployment-binding metadata; no live datastore evidence file exists. This
session changed the Phase 6 `STATE.md` waypoint and the narrow shared
continuity allowlist/test repair; no Alphaus repository or real-data adapter
was changed.

## VALIDATION_LEDGER

Phase 5 terminal validation remains: TypeScript PASS, focused Phase 5 15
passed, full Playwright 333 passed, agent:check PASS with approved continuity
warning, diff-check PASS. Phase 6 final validation before this continuation:
focused Phase 5 + Phase 6 23/23 passed, full Playwright 341/341 passed,
TypeScript PASS, agent:check PASS with the approved continuity warning,
diff-check PASS, privacy scan PASS, and Alphaus integrity audit PASS.
Post-repair validation: agent-state focused 14/14 passed, TypeScript PASS, full
Playwright 342/342 passed, agent:check PASS with `CHECKPOINT_ADVANCE` only for
approved task/docs paths, and `git diff --check` PASS. The exact account-literal
scan returned no matches.

## BUG_CANDIDATES

- `NW6-SESSION-PRIVACY-LITERAL`: a raw operator account literal was briefly
  written to an uncommitted STATE edit during metadata recovery. It was removed
  before checkpointing, verified absent from Nightwatch, and no committed or
  final durable artifact contains it. This is a repaired Nightwatch evidence-
  handling defect, not a product/data finding.
- `PHASE_6_DISCOVERED_SHARED_INFRA_DEFECT`: `bin/agent-state.mjs` did not
  recognize the Phase 6 sanitized runtime-binding artifact as an approved
  checkpoint path, so the valid documentation-only descendant was reported as
  `STALE` rather than `CHECKPOINT_ADVANCE`. Repair is scoped to the exact
  Phase 6 README/audit paths plus a regression test; prior phase history is not
  reopened.
- Phase 5's repaired snapshot-root defect remains in its own report and is not
  a data-layer finding.

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
  or `API_ENV` values. Temporary isolated GKE metadata now proves the live
  workload, image, ServiceAccount, and Secret reference names, but not those
  values. The image tag's temporal proximity to Ripple master is not promoted
  to source provenance.
  `billingd` and `costd` source also contains production Spanner
  bindings for their current non-local paths, but that is not proof of the
  selected legacy `apidev` runtime and must not be substituted for deployment
  evidence.

## UNRESOLVED

- Runtime DEV datastore environment and designated scope.
- Effective deployment values for the selected `ripple-api-micro` runtime
  (`API_ENV`, AWS role/region/account or equivalent) are not available in
  checked-in source, image/build metadata, or approved non-secret cluster
  metadata; only Secret reference names are available.
- Current live auth state for approved datastore tooling.
- Exact runtime DEV→datastore binding and designated Nightwatch test scope.
- Datastore-tool auth status; no auth probe was attempted.
- Authoritative `mochi` deployment configuration is not present locally and
  the targeted authenticated remote lookup returned 404/not found.
- J3 permission/restricted-role scope and non-AWS vendor source boundary.
- Whether any real datastore query is safe/necessary under this SPEC.
- Stale §3.3 Spanner wrapper statement in the read-only schema document.

## SAFETY_EVENTS

0 datastore queries; 0 writes; 0 scans; 0 production attempts; 0 unknown
approvals; 0 final durable customer identifiers. One transient local STATE
privacy repair was required and completed before checkpointing; no live data,
credential, Secret payload, or datastore output was involved.

## PRIVACY_STATUS

PASS after local repair. During session recovery, an operator AWS account
literal was briefly written to the uncommitted STATE edit as metadata; because
the same class of literal occurs in unrelated customer/payer evidence, it was
removed immediately before checkpointing. No raw account literal remains in
Nightwatch, no customer value entered a committed artifact, and no raw query
or datastore value was handled. Treat this as a repaired Nightwatch privacy
handling defect, not as live-data evidence.

## LAST_VERIFIED_IMPLEMENTATION_SHA

483fbe4f41f235e3e1e0a12e0613954f3db4aefe.

## LAST_CHECKPOINT_SHA

483fbe4f41f235e3e1e0a12e0613954f3db4aefe (validated implementation
checkpoint).

## NEXT_EXACT_ACTION

No Phase 6 external action is required. The owner decision permanently
supersedes the former M7 handoff. Continue via the active private local
evidence/minimization task; never request deployment metadata or reopen a
datastore/auth preflight.

## RESUME_RECIPE

1. Read Nightwatch AGENTS.md, ACTIVE_TASK, and the active private task files.
2. Treat this Phase 6 task as preserved historical context with
   `FROZEN_BY_OWNER` status.
3. Do not read deployment metadata, use Kubernetes/cloud tooling, probe auth,
   query a datastore, or request external handoff.
4. Continue only with local source/app evidence and synthetic compatibility.

## Completion Snapshot

Frozen by owner, not complete. Phase 6 architecture, synthetic boundary,
adversarial matrix, privacy review, and full local validation are preserved.
No live datastore evidence exists; no real-read decision is needed because the
owner selected the application-level roadmap.

## Files Changed

Phase 6 task files, implementation, corpus, focused tests, ACTIVE_TASK, and
current-state handoff; no Alphaus repo changed and no datastore query executed.

## Validation Ledger

Phase 6 focused Phase 5 + Phase 6: 23/23 PASS; full Playwright: 342/342 PASS;
`npx tsc --noEmit`: PASS; `npm run agent:check`: PASS with
`CHECKPOINT_ADVANCE` for approved documentation paths; `git diff --check`:
PASS. Privacy scan and Alphaus
integrity audit: PASS. Four read-only source archaeology tracks completed; no
datastore command was invoked. Session recovery checks: `envcheck` hard checks
PASS; operator STS identity metadata read PASS and classified
`OPERATOR_METADATA_ONLY`; authenticated `gh` exact deployment searches returned
no matches; GitHub MCP exact searches were `AUTH_REQUIRED`; Nightwatch raw
account-literal scan returned none after repair. Post-repair full validation is
`342/342`, and the continuity checker regression is `14/14`.

## Decisions Made During This Task

- Phase 5 must be complete before Phase 6; this gate passed.
- Wrapper availability is not wrapper safety; Nightwatch validators are stricter.
- Real data is optional under the frozen SPEC and never claimed when absent.
- Worker evidence is recorded as source-derived conclusions only; raw worker
  transcripts and any customer-like values are not durable Nightwatch evidence.
- The former real-read gate is preserved as historical evidence; owner policy
  now blocks the real path before invocation and no live result is labeled
  verified.

## Discoveries

- The approved wrapper environment is present, but `dynamo-ro` does not block
  protected scans, `bq-ro --dry-run` is not a dry run, and the schema document
  contains a stale contradictory Spanner-wrapper note. Nightwatch must fail
  closed above all three wrappers.
- A temporary isolated GKE metadata query confirmed the live
  `ripple-api-micro` owner chain, image digest, default ServiceAccount, and
  deployment Secret reference names. This proves compute/workload identity,
  not the PHP service's AWS account/role/region/table target or test-account
  scope.
- GCR metadata, exact Cloud Build searches, authenticated GitHub metadata, and
  targeted `ouchan` build/source inspection found no non-secret authoritative
  mapping for the effective Secret-backed values. The image tag's temporal
  proximity to Ripple master is deliberately not promoted to provenance.

## Blockers

None for the active roadmap. The former
`PHASE_6_RUNTIME_DATA_ENVIRONMENT_UNRESOLVED` condition is preserved as
historical evidence, but the owner decision supersedes it and removes the
external-handoff requirement.

## Safety Events

No datastore, production, mutation, or secret-boundary safety event occurred.
The transient local STATE privacy repair is recorded above and was completed
before checkpointing.

## Deferred / Follow-Up

Real reads, broader data coverage, multi-hop escalation, scheduling,
mutation/remediation, and Phase 7 remain out of scope. Local synthetic
compatibility is retained for the private triage task.

## Resume Recipe

Use the exact RESUME_RECIPE above and continue at NEXT_EXACT_ACTION.
