# Task State

## Identity

Task ID: phase-5-oops-api-generation-expansion
Phase: 5
Status: IN_PROGRESS
Starting SHA: 1d05c460ec0762c4587bb76f5d050a322f8f47a6
Current SHA: 1d05c460ec0762c4587bb76f5d050a322f8f47a6
Last validated implementation SHA: 1d05c460ec0762c4587bb76f5d050a322f8f47a6
Branch: main
Last checkpoint: 2026-08-12 — Phase 5 task setup was checkpointed at
`78ee69a1b5e4fa55915039f8c7dcc71860b80a5e`; M1 source inspection is complete
and no OOPS scenario has been executed.

## CURRENT_GOAL

Prove that Nightwatch can derive a small source-backed read-only API corpus and
reuse Alphaus OOPS without giving OOPS authority over safety, secrets,
destinations, semantics, or durable privacy.

## CURRENT_PHASE

M1 — Current OOPS source, binary, and security capability audit. Audit complete;
M2 restricted adapter implementation is next.

## Objective

Build and validate the restricted source-to-API corpus described by SPEC while
preserving the Nightwatch-only modification and read-only production-support
boundaries.

## Current Milestone

M1 — Current OOPS source, binary, and security capability audit. Status:
`COMPLETED`; the next concrete action is to implement the Nightwatch-owned
restricted dialect and process adapter.

## Completed Milestones

- Phase 4 closure audit: accepted from native Git, code, matrix, and focused
  validation evidence.
- Phase 5 frozen task artifacts: created before implementation.
- M1 OOPS source/binary/security audit: current source pinned, installed
  binary mismatch recorded, and no scenario executed.

## Work In Progress

M2 implementation is not started. The adapter must build around the current
OOPS limitations rather than relying on OOPS for policy, secrets, destination,
or result authority.

## Exact Next Action

Implement `src/core/oops/` restricted profile validation, deterministic
scenario encoding, environment scrubbing, bounded subprocess control, and
sanitized result taxonomy. Begin with rejection-before-spawn tests.

## CURRENT_EVIDENCE

- Nightwatch HEAD is clean at `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Reported Phase 4 implementation `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`
  and closure `1d05c460ec0762c4587bb76f5d050a322f8f47a6` exist and are
  ancestral in the current Nightwatch repository.
- Phase 4 focused exploration suite: 16 passed. `npx tsc --noEmit`,
  `npm run agent:check` (PASS with its documented approved-document warning),
  and `git diff --check` passed before this task was created.
- The native Phase 4 matrix
  `artifacts/phase4-nightwatch-20260812T121232Z-2e48-matrix.json` contains six
  fresh exploration records and no exact replay records. Every planned-action
  list has length one; therefore `PHASE_4_EXACT_REAL_REPLAY=NOT_APPLICABLE`.
- Phase 4 E1/J1 seed `0x0000000000000102`:
  `nightwatch-20260812T121232Z-2e48-E1-J1-payer-exchange-1`, action
  `p4.j1.vendor-local.azure`, `RUNTIME_FAILURE`, `FAILED`/
  `ACTION_TRANSITION_FAILED`, invalidated transition
  `transition_4aa9b6a86d48ce77b19289174d9298ce21c8d74e293bdf8da3ab3f5c46d4c29f`,
  no request delta/fingerprint, zero safety. Classified
  `NIGHTWATCH_RUNTIME_ARTIFACT`.
- Phase 4 E2/J2 seed `0x0000000000000201`:
  `nightwatch-20260812T121232Z-2e48-E2-J2-common-exchange-0`, action
  `p4.j2.vendor-read.aws`, `RUNTIME_FAILURE`, `FAILED`/
  `ACTION_TRANSITION_FAILED`, invalidated transition
  `transition_b75419fdd03065010146d1706d06f9fa39bed4e50fc2fa75fa5d4371797714a5`,
  no request delta/fingerprint, zero safety. The run also had non-causal
  optional font transport failures (`DEV_INFRA_TRANSIENT` fingerprints), not
  a product anomaly. Classified `NIGHTWATCH_RUNTIME_ARTIFACT`.
- Phase 4’s real safety vector is zero for all six records; no product anomaly
  was admitted. Authentication refresh and MCP absence remain separately
  documented control-plane facts.
- Read-only Alphaus integrity snapshot at task start preserved all checkout
  SHAs and dirty states. Current local tracking refs are recorded as external
  freshness inputs only; Nightwatch does not update them.
- Current OOPS checkout: branch `master`, tracking `origin/master`, ahead/behind
  `0/0`, clean worktree, HEAD
  `c4a129feb0b97dc0ae39f32c39a92abe834567f2`, merge commit dated
  `2026-07-29T20:55:53-04:00` (`skip-notif`). The inspected source is the
  latest locally available `master` checkout; no fetch or other OOPS write was
  performed.
- Installed `/home/linuxbrew/.linuxbrew/bin/oops` resolves to Homebrew OOPS
  `1.2.8`, SHA-256
  `8a52c99261875657553149ff79d3ba07b4bcae9ea1b5f19a2c99af57797a4fd0`.
  Embedded Go build metadata identifies commit
  `009440549ac37582296a26e668d1f6f105e14b6b`, Go `1.22.1`, and build date
  `2024-04-01T06:30:13Z`; this is a `BINARY_SOURCE_MISMATCH` and is not a
  Phase 5 execution binary.
- Current OOPS source confirms a broad YAML dialect: arbitrary HTTP method/URL,
  headers/query/forms/files/payload, response-file output, status and JSON
  assertions, plus `prepare`, `check`, and assertion scripts. Any value that
  begins with `#!` is extracted to a temporary file and executed.
- Current source writes extracted scripts with `os.ModePerm` (0777), invokes
  external commands with `exec.Command`, and appends `os.Environ()` to the
  script environment. There is no `exec.CommandContext` timeout around script
  execution.
- Current source logs header values and, when `response_out` is used, writes
  and logs the raw response body. Assertion/error paths can include raw body or
  script text. OOPS stdout/stderr therefore remains untrusted output and is not
  suitable for direct evidence persistence.
- Current source reads scenario YAML directly with no Nightwatch-style
  restricted schema. Its `run` path returns after logging `s.errs`; root
  `Execute` errors are not converted into a reliable scenario result contract.
  Exit status alone cannot be the Nightwatch oracle.
- Current source supports pre-process hooks, AWS credentials, GCP Secret
  Manager, Pub/Sub, SNS/SQS, Spanner cancellation, Slack webhook, GitHub token,
  commit-status, and repository-dispatch integrations. These are all outside
  the restricted profile and must be disabled/rejected before spawn.
- Current `httpexpect` v2.17.0 source (the exact module selected by OOPS
  `go.mod`) shows a default `http.Client` with nil `Transport`; Go therefore
  supplies `http.DefaultTransport`, whose `Proxy` is `ProxyFromEnvironment`.
  The default transport uses a normal `net.Dialer`, so direct sockets/DNS are
  possible when proxy variables do not select a proxy. Default redirects are
  followed by `http.Client` (up to its default limit), and OOPS does not install
  a host-revalidating redirect policy. Direct OOPS Alphaus egress is therefore
  prohibited; the Nightwatch loopback operation relay is required for any
  future authenticated path.

## OOPS_SOURCE_SHA

`alphauslabs/oops@c4a129feb0b97dc0ae39f32c39a92abe834567f2` (`master`,
`origin/master`, clean, 0/0). The installed binary is not source-matched:
Homebrew `oops 1.2.8` embeds `009440549ac37582296a26e668d1f6f105e14b6b`.
Any source build, if needed, must be emitted into a Nightwatch-controlled
temporary/cache directory and must retain the source SHA in its run ledger.

## OOPS_CAPABILITY_AUDIT

`COMPLETE_READ_ONLY_AUDIT`. Current findings:

- schema/HTTP: arbitrary YAML HTTP URL/method and request fields;
- chaining: `prepare`, `check`, `#!` values, and assertion scripts execute
  external commands; response files are arbitrary paths;
- assertions: status, JSON schema, and script; errors are accumulated/logged;
- result: no reliable structured scenario result; process success is not a
  sufficient scenario oracle;
- environment/temp: scripts inherit `os.Environ()`, temporary script paths use
  shared `os.TempDir()`, and script mode is 0777;
- network: `httpexpect` default client honors proxy environment variables and
  follows redirects without Nightwatch host revalidation;
- integrations: Slack, GitHub, Pub/Sub, SNS/SQS, Secret Manager, AWS, and
  Spanner paths exist in current source;
- hooks/distribution: pre-process hook and distributed worker/controller modes
  exist and are prohibited;
- no current OOPS scenario was executed during this audit.

## OOPS_SECURITY_POSTURE

`UNPROVEN_FAIL_CLOSED` — OOPS is not trusted and cannot be used for real
authenticated traffic until the restricted adapter, environment scrub,
relay/sandbox, redirect, and output privacy proofs are complete.

## SANDBOX_STATUS

`DIRECT_EGRESS_PROHIBITED; LOOPBACK_RELAY_REQUIRED; OS_SANDBOX_PENDING`.
The current OOPS HTTP client can use proxy-selected or direct sockets and can
follow redirects. M2/M3 must establish a Nightwatch loopback-only relay and
record whether an unprivileged OS-level network sandbox is available. If it is
not available, authenticated OOPS DEV execution remains disabled.

## API_CATALOG_VERSION

`nightwatch.api-catalog.phase5.v1` — schema frozen; catalog not yet populated.

## API_OPERATION_COUNTS

`inventoried=0; KNOWN_READ=0; KNOWN_MUTATION=0; UNKNOWN=0; generationEligible=0;
generated=0; localOopsVerified=0; devFirst=0; devReplay=0; blocked=0;
anomalous=0`.

## KNOWN_READ_OPERATIONS

None admitted yet. J1/J2/J3 bridge candidates are pending source inventory.

## KNOWN_MUTATION_OPERATIONS

None inventoried yet. Mutations must be cataloged explicitly before any
generation decision.

## UNKNOWN_OPERATIONS

None inventoried yet. The historical malformed-JSON operation remains outside
the corpus pending independent source admission.

## SCENARIO_GENERATOR_VERSION

`nightwatch.scenario-generator.phase5.v1` — implementation not started.

## GENERATED_SCENARIO_LEDGER

`none`; no YAML or scenario metadata exists yet.

## LOCAL_OOPS_RUN_LEDGER

`none`; no OOPS scenario has been executed, including locally, during M0.

## DEV_API_RUN_LEDGER

`none`; no Phase 5 DEV API execution is authorized before the pre-real gate.

## REPLAY_LEDGER

`Phase 4 inherited: 0/3 exact real replays, NOT_APPLICABLE by frozen
plannedActions.length > 1 predicate. Phase 5: none.`

## AUTH_STATUS

Phase 4 external DEV auth remains outside the repository and is not passed to
OOPS. Phase 5 API auth strategy is `PENDING_M3/M8`; password, provider path,
storage state, and tokens are prohibited from OOPS and durable artifacts.

## Files Changed

M0/M1 task artifacts only: `.agent/ACTIVE_TASK.md` and
`.agent/tasks/phase-5-oops-api-generation-expansion/{SPEC,PLAN,STATE,REPORT}.md`.
No implementation, generated scenario, or Alphaus repository file has been
changed. M1 was source inspection only.

## Validation Ledger

- `git status --short --branch`: PASS before task creation; clean `main` at
  `1d05c46`.
- Phase 4 SHA object/ancestry checks: PASS.
- `npx tsc --noEmit`: PASS before task creation.
- `npx playwright test tests/unit/exploration.test.ts --project=nightwatch
  --workers=1`: 16 passed.
- `npm run agent:check`: PASS with the expected Phase 4 approved-document
  `CHECKPOINT_ADVANCE` warning.
- `git diff --check`: PASS before task creation.
- Alphaus read-only integrity: checkout SHAs unchanged; pre-existing dirty
  states preserved. Current local tracking-ref drift is a freshness caveat,
  not a Nightwatch mutation.
- OOPS source identity/capability inspection: PASS; branch, tracking, SHA,
  ahead/behind, dirty state, source paths, and installed binary metadata were
  read without executing a scenario.
- OOPS network-client inspection: PASS; `httpexpect` v2.17.0 and Go
  `net/http` defaults establish proxy-environment inheritance, direct-socket
  fallback, and default redirect following.

## BUG_CANDIDATES

None for Phase 5. Inherited Phase 4 runtime failures are classified
`NIGHTWATCH_RUNTIME_ARTIFACT`; inherited malformed JSON remains unresolved
historical `GENUINE_PROTOCOL_ANOMALY` and is not a generated operation.

## REJECTED_OPERATIONS

No source operation catalog entries yet. Independently of the future catalog,
the adapter rejects all mutations, UNKNOWNs, stale operations, arbitrary URLs,
scripts, shell, command, pre-process, response-file, notification, and
distributed features.

## REJECTED_HYPOTHESES

- OOPS is not a safety authority.
- A proto RPC or HTTP method/name does not prove read semantics.
- An installed OOPS binary is not assumed to match inspected source.
- A Phase 4 exact-replay count of zero is not equivalent to a passing replay.
- The current OOPS source has every previously reported security concern still
  present: arbitrary shell/script execution, 0777 script files, inherited
  environment, weak tests, ignored errors, and external optional integrations;
  each is `CONFIRMED_CURRENT`.

## Decisions Made During This Task

- OOPS is an untrusted executor; Nightwatch remains the safety authority.
- The initial generated corpus target is three browser bridges plus two to
  four API-only reads, subject to a source-backed semantic frontier.
- Direct authenticated OOPS egress is prohibited until relay, sandbox, and
  response-privacy proofs pass.

## Discoveries

- The Phase 4 replay predicate is implemented in the real runner as
  `plannedActions.length > 1 && safetyIsZero(...)`.
- Both Phase 4 runtime failures have no response-level API anomaly evidence;
  the narrow supported classification is `NIGHTWATCH_RUNTIME_ARTIFACT`.
- The installed OOPS binary is materially older/different from the current
  inspected source; using it would invalidate source-backed compatibility
  evidence.
- The current OOPS HTTP path has no relay-safe destination authority and its
  redirect behavior is not environment-aware. Nightwatch must resolve an
  operation ID to the destination and perform redirect revalidation itself.

## Blockers

None at M1. Potential M2/M3 sandbox or output-privacy blockers remain
unresolved, not silently waived.

## UNRESOLVED

- Whether a safe OS egress sandbox is available.
- Which additional source operations can be proven `KNOWN_READ` without
  customer-specific durable hydration.
- Whether authenticated OOPS DEV execution can pass privacy and containment.
- Whether OOPS assertion/error output can be fully sanitized for all local
  failure paths; the current raw-body behavior makes this a hard gate.

## Safety Events

`NONE` in M0/M1. No OOPS scenario, DEV API request, production attempt, mutation,
database query, or Alphaus write occurred.

## PRIVACY_STATUS

`PASS_FOR_M0_M1_AUDIT`. No credential, auth value, customer value, body, DOM,
screenshot, trace, or raw OOPS output entered the new task artifacts. OOPS
stdout/stderr is explicitly classified as untrusted until the M2 sanitizer and
sentinel tests pass.

## LAST_VERIFIED_IMPLEMENTATION_SHA

`1d05c460ec0762c4587bb76f5d050a322f8f47a6` (clean Phase 4 closure; no Phase 5
implementation yet).

## LAST_CHECKPOINT_SHA

`78ee69a1b5e4fa55915039f8c7dcc71860b80a5e` — M0 task-setup checkpoint; M1
source findings are currently uncommitted and must be checkpointed before M2
implementation. The validated implementation baseline remains
`1d05c460ec0762c4587bb76f5d050a322f8f47a6`.

## NEXT_EXACT_ACTION

Update `ACTIVE_TASK.md`, `PLAN.md`, `REPORT.md`, and this state with the M1
audit, checkpoint the documentation, then implement the M2 restricted adapter
and its rejection-before-spawn tests. Do not execute an authenticated OOPS
scenario or use the mismatched installed binary.

## Deferred / Follow-Up

- Phase 6 data-layer evidence, broad API coverage/fuzzing, distributed OOPS,
  AI planning, and production/mutation verification remain out of scope.

## Resume Recipe

1. Read Nightwatch `AGENTS.md`, `.agent/ACTIVE_TASK.md`, this task’s SPEC,
   PLAN, and STATE.
2. Verify `git status --short --branch`, current SHA, and current diff.
3. Continue only from `NEXT_EXACT_ACTION`; keep OOPS and every Alphaus repo
   read-only.
4. After each milestone, update this state with the required OOPS/catalog/
   scenario/run/validation/privacy/safety fields before changing subproblem.

## Completion Snapshot

Not complete. Populate at M10 only after all SPEC criteria or an explicit
sandbox/privacy/semantic-frontier blocker are durably reported.
