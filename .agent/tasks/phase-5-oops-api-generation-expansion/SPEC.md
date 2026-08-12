# Nightwatch Phase 5 — Restricted OOPS Integration + Source-Generated Read-Only API Corpus

Status: `FROZEN_INTENT`

## Task purpose

Extend Nightwatch from browser-derived read-only behavior to a small,
source-generated API scenario corpus while reusing Alphaus `oops` only as a
restricted local execution mechanism. Nightwatch remains the authority for
environment policy, semantic admission, request hydration, credentials,
destinations, response privacy, anomaly classification, and corpus promotion.
The observable outcome is a reproducible, metadata-only API canary corpus with
source provenance, local fixture validation, bounded DEV first/replay evidence
when every gate is proven, and an explicit semantic frontier when it is not.

## Established starting state

- Task ID: `phase-5-oops-api-generation-expansion`.
- Starting Nightwatch SHA: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 implementation: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`.
- Phase 4 closure checkpoint/current clean HEAD:
  `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 closure audit is accepted before this task. The frozen Phase 4
  `NONTRIVIAL_SEQUENCE` predicate is `plannedActions.length > 1` plus a zero
  safety vector. All six real records have one planned action, so the exact
  real replay result is `NOT_APPLICABLE`, not `PASS` and not an omitted run.
- Phase 4 real runtime failures are preserved as
  `NIGHTWATCH_RUNTIME_ARTIFACT`: E1/J1 seed `0x0000000000000102` and E2/J2
  seed `0x0000000000000201` both stopped after an anchor-successful action
  attempt with `FAILED`/`ACTION_TRANSITION_FAILED`, an invalidated transition,
  no semantic request delta, no anomaly fingerprint, and zero safety counts.
  E2 also recorded non-causal optional font failures; these are not product
  anomalies. The failures were fatal to their individual exploration
  sequence but nonfatal to the Phase 4 corpus.
- Phase 2B J1/J2/J3 contracts and Phase 2C oracle/replay/fingerprint model are
  the only browser/API lineage anchors. Phase 3 owns source-change selection;
  Phase 5 consumes its provenance and staleness decisions.
- All Alphaus repositories, including `alphauslabs/oops`, are read-only
  inputs. Only this Nightwatch repository may be modified.

## Scope

1. Audit the current checked-out `alphauslabs/oops` source and installed
   binary/version without executing a real scenario or changing that repo.
2. Define and implement a Nightwatch-owned restricted OOPS dialect and
   adapter. Generated scenarios may express only an approved HTTP read,
   bounded headers/placeholders/request body if source-proven, and metadata or
   shape assertions.
3. Implement dedicated subprocess containment, explicit environment
   allowlisting, timeout/exit handling, bounded sanitized stdout/stderr,
   owner-only temporary workspaces, and atomic run evidence.
4. Prefer a loopback-only Nightwatch relay. The relay resolves an admitted
   operation ID from the catalog, injects ephemeral DEV auth in memory when
   needed, enforces outbound and redirect policy, and never accepts an
   arbitrary destination URL.
5. Inventory a targeted set of source API surfaces, classify operations as
   `KNOWN_READ`, `KNOWN_MUTATION`, or `UNKNOWN` using backend/proto/client/UI
   evidence precedence, and retain rejected/blocked operations durably.
6. Implement a deterministic catalog-driven scenario generator with typed
   runtime placeholders, stable scenario identities, restricted-schema
   validation, oracle translation, replay metadata, and Phase 3 staleness
   links.
7. Prove the adapter against local loopback fixtures and compare the native
   Nightwatch evaluator with OOPS on the same synthetic contracts.
8. Establish the three J1/J2/J3 browser-to-API bridge operations and a small
   source-proven API-only expansion set when the source frontier supports it.
9. Execute only a frozen, serial, bounded DEV set after the pre-real gate.
   Each promoted operation requires one first execution and one fresh replay.

## Non-goals and absolute exclusions

- No arbitrary API fuzzing, random fields/IDs/enums/timestamps, load testing,
  mutation testing, AI/LLM planning, datastore oracle, Phase 6 work, or
  broad API sweep.
- No OOPS source modification, commit, reset, stash, clean, build output, or
  dependency installation inside `alphauslabs/oops`; no other Alphaus repo may
  be modified.
- No execution of existing OOPS YAML from OOPS, Ouchan, Blue API, Ripple, or
  any other repository. Existing files are reference material only.
- No generated or accepted scenario may contain shell, script, command,
  executable, Go/bash/program execution, pre-process hook, notification,
  distributed/Kubernetes/Pub/Sub/SNS/SQS/Oopshub mode, or equivalent escape.
- Never invoke `--pre-process-hook`, notifications, distributed OOPS, or
  direct unrestricted OOPS egress.
- Never pass a DEV password, secret-provider path, browser storage state,
  cookies, tokens, GitHub token, Slack URL, AWS/GCP credentials, or inherited
  parent secret to OOPS.
- No customer/company/account/billing-group/user/resource identifier, email,
  name, cost, request body, response body, DOM, screenshot, authenticated
  trace, or credential may enter durable generated corpus, task state, logs,
  fingerprints, relay evidence, or sanitized OOPS output.
- Never intentionally execute `UNKNOWN` or `KNOWN_MUTATION`, target
  production, query DynamoDB/BigQuery/Spanner, or chase the historical
  malformed-JSON endpoint without an independent source-backed admission.

## Safety authority and OOPS boundary

The authority order is:

`Nightwatch environment policy > production deny > outbound containment >
semantic operation catalog > mutation/UNKNOWN tripwires > scenario validator >
Nightwatch relay > restricted OOPS adapter > OOPS process`.

OOPS receives only a generated, validated Nightwatch scenario and a minimal
sanitized environment. It is never allowed to choose an operation, host,
credential, script, notification, or execution mode. The adapter must reject
unsafe input before spawning OOPS and must fail closed if the inspected OOPS
version is incompatible with the pinned restricted dialect.

## Restricted OOPS profile

The Nightwatch-owned profile is `nightwatch.oops-profile.phase5.v1`, and the
adapter is `nightwatch.oops-adapter.phase5.v1`. The logical allowed dialect is
limited to:

- profile/schema version and deterministic scenario identity;
- one catalog `operationId` already admitted as `KNOWN_READ`;
- one relay-resolved HTTP request with a fixed method/path template, typed
  runtime placeholders, bounded timeout, and safe source-proven headers/body;
- status-class, expected content-type, bounded parseability, JSON field-name
  shape, NDJSON chunk/terminal shape, or 204/empty completion assertions;
- safe run metadata that contains no resolved customer value or credential.

The physical YAML mapping must be validated recursively before execution. Any
unknown key, duplicate key, arbitrary URL/destination, mutation/UNKNOWN ID,
shell/script/command/preprocess/notification/distribution primitive, literal
secret/customer identifier, unbounded input, unsupported assertion, or OOPS
feature outside the profile is rejected before process start. The generator
never emits forbidden constructs, but validation is an independent defense.

## Process, filesystem, and environment containment

- Each run gets a unique Nightwatch-controlled owner-only temporary directory.
  Scenario and evidence writes are atomic, files are owner-only, and cleanup
  is attempted without deleting any user directory or Alphaus repository.
- OOPS is a local subprocess only, with a hard timeout, graceful termination,
  bounded kill fallback, no orphan process, bounded captured stdout/stderr,
  sanitized output, explicit exit/signal classification, and no raw tee to
  disk.
- The child environment is constructed from an allowlist, never from
  wholesale `process.env`. Only proven nonsecret values such as `PATH`, a
  dedicated temporary `HOME` if required, locale, loopback relay metadata,
  and nonsecret run identifiers may be present. AWS/GCP credentials, GitHub,
  Slack, DEV credentials, storage-state variables, proxy secrets, and a
  synthetic parent sentinel must be absent.
- Available OS-level containment (`bubblewrap`, `firejail`, network namespace,
  or an existing safe equivalent) is investigated without installing system
  software. If OOPS cannot be proven safe for authenticated DEV execution,
  the durable result is `OOPS_REAL_DEV_EXECUTION_DISABLED_BY_SANDBOX`; OOPS
  remains local-fixture/validator-only and the Nightwatch-native verifier may
  perform DEV checks only if all other gates and this SPEC permit it.

## Loopback relay and network policy

The preferred topology is:

`restricted OOPS -> 127.0.0.1 ephemeral Nightwatch relay -> approved DEV API`.

The relay binds to loopback only. A request must carry an admitted
`operationId`; the relay resolves host, method, path, request shape, and
redirect policy from the catalog. It must not accept `?url=...`, an arbitrary
host header, arbitrary method, dynamic host approval, or a production
representation. Redirects are reclassified and revalidated on every hop;
production, unknown, mutation, and non-approved host redirects fail closed.
The relay records sanitized method/operation/host-class/status/content-type
metadata only. Direct authenticated OOPS egress is prohibited until actual
client proxy/redirect/DNS/TLS behavior and containment are proven by source
inspection and sink tests.

## Source inventory and semantic admission

The targeted source set is `alphauslabs/blueapi`,
`alphauslabs/blueapi-functions`, `alphauslabs/blueapidocs`,
`alphauslabs/blue-sdk-go`, `alphauslabs/blue-sdk-ts`,
`mobingilabs/ripple-api`, `mobingilabs/ouchan`, and the existing Ripple UI
callsites only where they establish J1/J2/J3 lineage. Source precedence is
backend handler, proto/service contract, frontend/SDK callsite, generated API
description, then documentation. Method/name alone is never proof.

The catalog is `nightwatch.api-catalog.phase5.v1`. Each operation records only
available evidence: operation ID, product/service, source repo and SHA,
frontend callsites, proto/RPC identity, HTTP method/path template or RPC
identity, semantic purpose/class, auth class, request schema, safe hydration,
response-shape policy, streaming type, expected content type, required host
class, oracle/replay policy, source provenance, and Phase 3 lineage/staleness.
`KNOWN_MUTATION` operations are explicitly cataloged and rejected for
generation. Operations whose semantics cannot be proven remain first-class
`UNKNOWN` and cannot produce executable real scenarios.

## Generation and hydration

Generation eligibility requires `KNOWN_READ`, current-enough provenance,
known DEV destination, safe auth strategy, safe in-memory hydration for all
inputs, no customer-sensitive durable fixture, no proven mutation side
channel, and a defined metadata/shape oracle. Hydration may use only fixed
source enums, empty/default read requests, bounded source-approved periods,
Nightwatch local fixtures, or ephemeral values extracted in memory by
Nightwatch from an earlier safe read. OOPS shell extraction is forbidden.

The deterministic generator version is `nightwatch.scenario-generator.phase5.v1`.
Logical scenario identity hashes operation ID, catalog version, generator
version, hydration-profile version, and oracle-profile version. No timestamp or
random filename enters identity. Durable YAML contains typed placeholders,
never resolved customer values or auth. First/replay records retain the same
logical scenario and versions while permitting fresh in-memory runtime values.

## Local fixture and oracle requirements

The loopback fixture matrix must exercise actual adapter and, where feasible,
actual OOPS subprocess paths for 200 JSON, 200 NDJSON, 204, 404, 500, wrong
content type, malformed JSON, slow response, approved-loopback redirect,
forbidden-host redirect, connection close, bounded large-response metadata,
secret/customer-sentinel failure privacy, and synthetic OOPS engine/adapter
failure. Native and OOPS results are compared semantically, not by message
text. Raw bodies remain in memory only and are bounded.

Oracle profiles are metadata/shape based: status class, content-type class,
parse category, JSON field-name shape, NDJSON chunk/terminal validity,
completion/timeout, and error category. HTTP 200 alone is never success.
OOPS output maps to `OOPS_PROCESS_SUCCESS`, `SCENARIO_SUCCESS`,
`SCENARIO_ASSERTION_FAILURE`, `SCENARIO_PARSE_FAILURE`, `OOPS_INTERNAL_FAILURE`,
`OOPS_TIMEOUT`, `OOPS_SIGNALLED`, `RELAY_SAFETY_BLOCK`, or
`API_ORACLE_ANOMALY`. OOPS/internal/adapter failures are never product API
findings.

## DEV eligibility, replay, and anomaly admission

Before each serial DEV scenario the gate must prove DEV environment, frozen
operation set, `KNOWN_READ`, source freshness, restricted scenario validation,
active relay/containment, production/unknown deny, safe auth, mutation
tripwire, privacy writer, and remaining budget. OOPS never receives the
password or storage state. The initial target is three UI-bridged operations
(one each for J1/J2/J3) plus two to four additional source-proven API-only
reads, for an initial eligible target of five to seven operations. If fewer
operations are defensible, the task reports the semantic frontier and does not
manufacture a count.

The real budget is frozen after catalog review and before the first DEV call:
one first execution and one fresh-context replay per admitted operation,
serially, with bounded delay and no retries beyond one fresh replay. A replay
uses the same operation/catalog/generator/hydration/oracle versions and a
fresh auth/session context; it is not an immediate retry or altered scenario.
Any production attempt, unknown destination/approval, mutation, scenario-caused
UNKNOWN, redirect escape, privacy leak, credential provenance failure, sandbox
escape, or unexpected OOPS shell/script execution stops the appropriate scope;
shell/script execution stops all real work.

API anomaly admission reuses Phase 2C: L0 first observation, L1 exact fresh
replay fingerprint, L2 repeated independent reproduction under the same
versions and policy. Fingerprints contain operation/service/oracle/status
class/content class/parse-stream-error categories/catalog version only.
Historical malformed JSON remains `GENUINE_PROTOCOL_ANOMALY` with unresolved
semantics unless independently proven current `KNOWN_READ`; it is not part of
the initial set merely because this task handles APIs.

## Privacy, safety, and evidence

Evidence is atomic, bounded, metadata-first, and sanitized before persistence.
It contains no raw OOPS output, bodies, headers, cookies, tokens, customer
values, authenticated traces, screenshots, or request/response content. A
synthetic parent secret sentinel must be absent from child environment, argv,
logs, scenario, evidence, and process summaries. Real safety accounting must
be exactly zero for production attempts, proxy/relay violations, unknown
destinations, unknown approvals, `KNOWN_MUTATION` invocations,
scenario-caused UNKNOWN, product mutations, database queries, and secret
leaks. Authentication control-plane refresh is reported separately.

## Completion criteria

Phase 5 may close only when Phase 4 audit, current OOPS provenance/security
audit, restricted profile/adapter, child-environment isolation, process
containment, relay/redirect fail-closed behavior, privacy leak tests, versioned
catalog, evidence-backed semantic classes, deterministic generator,
source-staleness/lineage integration, local OOPS fixture/differential matrix,
bridge and small expansion set, frozen DEV budget, first+fresh replay for each
promoted operation, anomaly attribution, full validation, Alphaus integrity,
adversarial review, and clean Nightwatch-only closure all pass. If the sandbox
or response privacy blocker prevents authenticated OOPS execution, the task
may close only with the explicit blocker heading and a safe native-verifier
fallback or semantic-frontier result; containment is never weakened. Phase 6
is not started.
