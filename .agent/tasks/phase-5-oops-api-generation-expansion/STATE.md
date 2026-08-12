# Task State

## Identity

Task ID: phase-5-oops-api-generation-expansion
Phase: 5
Status: IN_PROGRESS
Starting SHA: 1d05c460ec0762c4587bb76f5d050a322f8f47a6
Current SHA: 83f9d610f9ecc5c35422e91a83b9a3bc760ccadd
Last validated implementation SHA: 83f9d610f9ecc5c35422e91a83b9a3bc760ccadd
Branch: main
Last checkpoint: 3f989a2e31bed3c128be62e8fe0a60ba94723f0a — M2–M7
implementation, durable corpus, native relay runner, and local validation
checkpoint. No Phase 5 real DEV request has run.

## Objective

Prove that Nightwatch can derive a small source-backed read-only API corpus and
reuse Alphaus OOPS without giving OOPS authority over safety, secrets,
destinations, semantics, or durable privacy.

## Current Milestone

M9 — bounded DEV first/replay corpus. M2–M8 local implementation,
source inventory, corpus generation, relay controls, lineage hooks, actual
current-source OOPS fixture execution, security review, and pre-real validation
are complete. Remaining work is the single gated DEV first/replay run and
post-run closure review.

## Completed Milestones

- M0 Phase 4 closure audit and native Phase 5 task creation.
- M1 current OOPS source, binary, network behavior, and security audit.
- M2 restricted dialect, rejection-before-spawn, private workspace, explicit
  child environment, bounded subprocess, argv checks, timeout, and sanitizer.
- M3 loopback-only operation relay, catalog destination resolution, in-memory
  auth injection, redirect revalidation, production/unknown/mutation blocks.
- M4 targeted source-backed catalog with explicit reads, mutations, and
  historical UNKNOWN.
- M5 deterministic generator, typed runtime placeholders, metadata-only
  response oracle, safe fingerprints, and durable corpus templates.
- M6 local fixture matrix, current source-built OOPS subprocess differential,
  assertion-failure privacy sentinel, and child-environment sentinel.
- M7 J1/J2/J3 API lineage plus two API-only expansion operations and Phase 3
  staleness checks.

## Work In Progress

M8 is complete and M9 is frozen around six eligible operations and a
twelve-request maximum:
first execution plus one fresh replay for each operation, serially, with a
350ms delay. OOPS authenticated DEV execution is disabled because the verified
unprivileged bubblewrap network namespace cannot reach the parent Nightwatch
relay. The permitted fallback is the native Nightwatch relay path; OOPS
remains exercised against local fixtures only.

## Exact Next Action

Run `npm run api:phase5 -- --env=dev` once after the clean-worktree, auth,
proxy, source-freshness, relay, privacy, and budget gates pass. Record the
sanitized first/replay ledger before final closure review; if a gate fails,
record the blocker and do not retry real traffic.

## CURRENT_GOAL

Build and close a small reproducible read-only API canary corpus while keeping
OOPS subordinate to Nightwatch policy and preserving all Phase 4 caveats.

## CURRENT_PHASE

M9 — bounded DEV first/replay corpus; no real API request has executed in this
Phase 5 task.

## CURRENT_EVIDENCE

- Phase 4 closure remains independently reconciled: exact real replay is
  NOT_APPLICABLE because the frozen predicate requires
  plannedActions.length > 1 && safetyIsZero, while all six real records had
  one planned action.
- Phase 4 E1/J1 seed 0x0000000000000102 and E2/J2 seed
  0x0000000000000201 remain NIGHTWATCH_RUNTIME_ARTIFACT; both had failed
  invalidated transitions, no request delta/fingerprint, zero safety, and no
  product anomaly admission. E2 optional font failures were non-causal
  DEV_INFRA_TRANSIENT signals.
- OOPS source checkout is clean master/origin/master at
  c4a129feb0b97dc0ae39f32c39a92abe834567f2, ahead/behind 0/0.
- Installed Homebrew OOPS 1.2.8 is a source mismatch and is not used. The
  Nightwatch-controlled source build is module v1.2.46, source SHA c4a129...,
  binary SHA-256
  ffa29496cf65b4e239ab4ade6001322f2be546492be26901bd4e2d8c092ad57c.
- Current OOPS dangerous capabilities remain confirmed in source: arbitrary
  URL/method, shell/script/pre-process paths, 0777 temporary scripts,
  inherited environment, raw response/error output, default proxy/direct
  sockets, default redirects, cloud/distribution/notification integrations,
  and no reliable structured result.
- Current source-built OOPS executed only Nightwatch-generated local fixture
  scenarios: six eligible reads succeeded; a synthetic 500 assertion case was
  classified as a scenario assertion failure; no raw fixture body reached the
  OOPS process or durable output.
- Bubblewrap 0.9.0 network-namespace probe passed. Its isolated loopback is
  not reachable from the parent relay, so it is available but not compatible
  with authenticated OOPS relay execution. Native Nightwatch relay fallback
  is the only real DEV path considered.
- Full local validation before the real gate: TypeScript PASS; focused Phase 5
  suite 15 passed; full Nightwatch Playwright suite 333 passed; agent:check
  PASS with the approved checkpoint-advance warning; git diff --check PASS;
  Nightwatch worktree clean at the checkpoint.
- The first guarded DEV command stopped before any API request because the
  runner resolved source repositories two directory levels above
  `REPOSITORIES`; all six snapshots were therefore invalid. This was a
  `NIGHTWATCH_GATE_DEFECT`, repaired by resolving repositories beside the
  Nightwatch checkout. After repair, TypeScript and the 15-test Phase 5 suite
  passed; no real endpoint was reached.

## PRE_REAL_SECURITY_REVIEW

1. Generated YAML shell/script execution: REJECTED by the restricted parser
   and fixed generated dialect; no shell/script/command primitive is emitted.
2. Pre-process hook: rejected before OOPS spawn and unavailable in fixed argv.
3. Slack/GitHub/PubSub/distributed reporting: rejected; fixed argv uses only
   local scenario execution and disabled result notification.
4. Parent environment secrets: not inherited; explicit allowlist and sentinel
   regression pass.
5. DEV password: never passed to OOPS.
6. Browser storage state: never passed to OOPS.
7. Arbitrary host: impossible in generated schema and relay operation-ID API.
8. Production target: not representable in the approved DEV host policy.
9. Redirect escape: revalidated and blocked by relay/outbound policy.
10. Open proxy: impossible; relay accepts only catalog operation IDs.
11. Raw response body through OOPS: local sentinel regression found zero leaks;
    real authenticated OOPS is disabled by sandbox/relay incompatibility.
12. OOPS stdout/stderr: bounded, captured, and sanitized in memory.
13. Subprocess lifetime: hard timeout with terminate/kill fallback.
14. UNKNOWN operation: rejected before execution.
15. KNOWN_MUTATION operation: rejected before execution and tripwired at runtime.
16. Runtime mutation: method/path policy and catalog resolution are active.
17. Source freshness: Phase 3 lineage gate is active for every frozen read.
18. Customer runtime values: typed placeholders only; no durable resolution.
19. API budget: six first executions plus six fresh replays, serial, 350ms
    delay, maximum twelve requests.
20. Alphaus repository integrity: no Alphaus repository modification.

## PHASE_4_CLOSURE_AUDIT

PHASE_4_CLOSURE_AUDIT_ACCEPTED.

## PHASE_4_EXACT_REAL_REPLAY

NOT_APPLICABLE — proven from the frozen runner predicate, not a pass label.

## PHASE_4_RUNTIME_FAILURES

1. Run nightwatch-20260812T121232Z-2e48-E1-J1-payer-exchange-1, seed
   0x0000000000000102, envelope E1/J1: RUNTIME_FAILURE at
   p4.j1.vendor-local.azure; failed ACTION_TRANSITION_FAILED, invalidated
   transition transition_4aa9...d4c29f, no exploration request delta or
   fingerprint, fatal to that sequence but nonfatal to the corpus. Class:
   NIGHTWATCH_RUNTIME_ARTIFACT; not reproduced as a product anomaly.
2. Run nightwatch-20260812T121232Z-2e48-E2-J2-common-exchange-0, seed
   0x0000000000000201, envelope E2/J2: RUNTIME_FAILURE at
   p4.j2.vendor-read.aws; failed ACTION_TRANSITION_FAILED, invalidated
   transition transition_b754...7714a5, no exploration request delta or
   fingerprint, fatal to that sequence but nonfatal to the corpus. Class:
   NIGHTWATCH_RUNTIME_ARTIFACT; optional font fingerprints were non-causal
   DEV_INFRA_TRANSIENT signals.

## OOPS_SOURCE_SHA

alphauslabs/oops@c4a129feb0b97dc0ae39f32c39a92abe834567f2; branch master,
tracking origin/master, clean, ahead/behind 0/0, latest locally available
source. No OOPS repository write, fetch, reset, stash, clean, or commit.

## OOPS_CAPABILITY_AUDIT

COMPLETE_READ_ONLY_AUDIT; ALL_PRIOR_FINDINGS_CONFIRMED_CURRENT.
OOPS is an untrusted execution mechanism. Nightwatch passes only fixed
--scenarios <private-file> --skip-result-notif arguments, a JSON-subset YAML
document, an explicit environment allowlist, and a loopback relay URL.

## OOPS_SECURITY_POSTURE

LOCAL_RESTRICTED_ONLY; REAL_AUTHENTICATED_OOPS_DISABLED_BY_SANDBOX.
Shell/script/command/pre-process/notification/distributed/cloud capabilities
are rejected before spawn or absent from the generated dialect. Direct OOPS
DEV egress is never used.

## SANDBOX_STATUS

BUBBLEWRAP_AVAILABLE_0.9.0_NAMESPACE_PROBE_PASS; RELAY_NAMESPACE_INCOMPATIBLE;
NATIVE_RELAY_FALLBACK. The actual OOPS local path is protected by fixed
operation-ID scenarios, loopback binding, no proxy variables, no credentials,
and Nightwatch relay resolution. Authenticated OOPS is not enabled merely
because bubblewrap is installed.

## API_CATALOG_VERSION

nightwatch.api-catalog.phase5.v1

## API_OPERATION_COUNTS

inventoried=11; KNOWN_READ=6; KNOWN_MUTATION=4; UNKNOWN=1;
generationEligible=6; generated=6; localOopsVerified=6; devFirst=0;
devReplay=0; blocked=5; anomalous=0.

## KNOWN_READ_OPERATIONS

ripple.payer-exchange.read (J1 bridge);
ripple.common-exchange.read (J2 bridge);
ripple.account-inventory.read (J3 bridge);
ripple.billing-groups.read (J3 bridge stream);
ripple.billing-groups-legacy.read (API-only expansion);
ripple.billing-group-exchange.read (API-only expansion).

## KNOWN_MUTATION_OPERATIONS

ripple.payer-exchange.write, ripple.common-exchange.write,
ripple.account-inventory.write, ripple.billing-group-exchange.write.
All are cataloged with GENERATION_BLOCKED and DEV=NEVER.

## UNKNOWN_OPERATIONS

ripple.historical-blue-cost.unknown — historical malformed-JSON finding;
current semantic class remains UNKNOWN, HISTORICAL_ANOMALY_PRESENT, and it is
neither generated nor deliberately replayed.

## SCENARIO_GENERATOR_VERSION

nightwatch.scenario-generator.phase5.v1; adapter
nightwatch.oops-adapter.phase5.v1; restricted profile
nightwatch.oops-profile.phase5.v1.

## GENERATED_SCENARIO_LEDGER

Six deterministic templates under corpus/phase5/scenarios/:
nw-s5-5a0630ca92ca24d00349d53b, nw-s5-b928e70a21dcf49838b3faf4,
nw-s5-2a9f447b4437883efd1d504a, nw-s5-19120f948294275d3d8cbb18,
nw-s5-82b419ed9049519ae61eb312, nw-s5-e93116bd803fc423c635a0cd.
Durable corpus index: corpus/phase5/api-corpus-index.json.

## LOCAL_OOPS_RUN_LEDGER

6/6 current-source OOPS local restricted scenarios passed. Synthetic
assertion failure passed privacy checks and remained separate from process
failure. OOPS workspace was owner-only, scenario files mode 0600, stdout/stderr
bounded and sanitized, and workspaces cleaned.

## DEV_API_RUN_LEDGER

Frozen set is six KNOWN_READ operations; maximum 12 serial calls. The first
guarded attempt was blocked before relay/API execution by a repaired
Nightwatch repository-snapshot path defect; no real endpoint was reached.
real runner is native Nightwatch through the catalog-resolving relay because
authenticated OOPS is disabled by the sandbox decision.

## REPLAY_LEDGER

Phase 4 inherited 0/3 exact real replays — NOT_APPLICABLE.
Phase 5 real budget is one first plus one fresh replay for each of the six
frozen operation IDs; no Phase 5 replay has executed yet.

## AUTH_STATUS

Phase 4 external owner-only DEV state remains outside Nightwatch and is never
passed to OOPS. Phase 5 synthetic auth bridge passed: it validates the same
Phase 4 storage-state semantics and creates a bearer header only in relay
memory. Real runner refreshes only through existing runDevAuthRefresh; OOPS
receives neither password, storage-state path, browser state, nor token.

## FILES_CHANGED

Nightwatch-only Phase 5 implementation and tests:
src/api/phase5/{types,catalog,generator,restrictedProfile,oracle,relay,lineage,auth}.ts,
src/core/oops/{process,sandbox}.ts, tests/unit/phase5Api.test.ts,
tests/unit/phase5Fixture.test.ts, tests/manual/phase5-real-api.ts,
playwright.phase5.config.ts, bin/phase5-real.mjs, package.json, and
corpus/phase5/. Task docs ACTIVE_TASK.md, this task's PLAN.md, STATE.md, and
REPORT.md are also being checkpointed. No Alphaus repository is changed.

## VALIDATION_LEDGER

- TypeScript: PASS after current Phase 5 implementation.
- Focused Phase 5 API/fixture suite: 15 passed after corpus, auth, sandbox,
  and argument-rejection coverage.
- Actual current-source OOPS local fixture execution: 6/6 PASS plus one
  sanitized assertion-failure regression.
- Durable corpus-vs-generator test: PASS.
- Bubblewrap read-only network namespace probe: PASS on this host.
- Phase 4 inherited focused suite: 16 passed; Phase 4 full suite: 318 passed
  at closure.
- Full Nightwatch Playwright suite: 333 passed.
- TypeScript: PASS.
- `npm run agent:check`: PASS with the approved checkpoint-advance warning.
- `git diff --check`: PASS.
- Pre-real gate: PASS; no real request has executed yet.
- Post-gate repair validation: TypeScript PASS; focused Phase 5 suite 15
  passed; diff check PASS.

## BUG_CANDIDATES

One Nightwatch preflight defect was found and repaired: the Phase 5 runner
resolved the Alphaus repository root two levels above `REPOSITORIES`, making
all source snapshots invalid. It stopped before API execution and was fixed in
`83f9d610f9ecc5c35422e91a83b9a3bc760ccadd`. No product/API anomaly is admitted.
Phase 4 runtime artifacts and historical J2 font signal remain classified as
above.

## REJECTED_OPERATIONS

All shell/script/command/pre-process/response-file/form/payload/notification/
distributed/cloud OOPS features; arbitrary URLs/queries; all four known
mutations; the historical UNKNOWN; stale source operations; literal auth or
customer identifiers; unbounded bodies.

## REJECTED_HYPOTHESES

- OOPS source compatibility does not imply OOPS safety.
- Bubblewrap availability does not prove compatibility with a parent relay.
- HTTP method/name or proto List/Get naming alone does not prove read semantics.
- A first API result is not a promoted canary; fresh replay is required.
- HTTP 200 alone is not an API oracle pass.
- Historical malformed JSON does not admit its endpoint.

## UNRESOLVED

- Actual DEV first/replay outcomes for the frozen six-operation set.
- Whether any current DEV endpoint returns a source-contract-compatible body;
  failures will be classified without widening the operation set.
- Authenticated OOPS execution remains intentionally disabled by the network
  namespace/relay incompatibility; local OOPS and native DEV fallback are the
  approved scope.

## SAFETY_EVENTS

Phase 5 real safety counters remain zero because the guarded attempt stopped
before any real API call. The source-snapshot gate defect was repaired before
the next checkpoint.
Local synthetic safety blocks (arbitrary target, UNKNOWN, mutation, redirect)
were rejected before target execution. No production attempt, proxy violation,
unknown approval, product mutation, action-caused UNKNOWN, DB query, or
Alphaus write occurred.

## PRIVACY_STATUS

PASS_LOCAL; REAL_GATE_PENDING. Generated corpus contains no credentials,
customer identifiers, request bodies, response bodies, browser state,
screenshots, or traces. Local OOPS output/body sentinel tests found zero leaks.

## LAST_VERIFIED_IMPLEMENTATION_SHA

83f9d610f9ecc5c35422e91a83b9a3bc760ccadd.

## LAST_CHECKPOINT_SHA

83f9d610f9ecc5c35422e91a83b9a3bc760ccadd.

## NEXT_EXACT_ACTION

After the repaired runner is checkpointed, run `npm run api:phase5 -- --env=dev`
once. On completion, inspect only the
sanitized ledger, update the corpus/task closure records, and run final
validation. If a preflight or auth gate fails, record the exact blocker and do
not retry real traffic.

## RESUME_RECIPE

1. Read AGENTS.md, ACTIVE_TASK.md, this task SPEC/PLAN/REPORT/STATE.
2. Confirm no concurrent Nightwatch editor and inspect git status --short.
3. Reconfirm OOPS SHA c4a129..., source-built binary identity, sandbox result,
   catalog/index counts, and the six frozen operation IDs.
4. Run the smallest pending validation, then resume exactly at NEXT_EXACT_ACTION;
   never reconstruct an operation from memory.
5. Before any DEV request, require a clean committed checkpoint, valid auth,
   healthy loopback proxy, fresh source lineage, relay, privacy writer, and
   remaining budget.

## Completion Snapshot

Not complete. Finalize only after the frozen DEV first/replay decision,
privacy/safety audit, full validation, task closure, and clean Nightwatch
checkpoint. Do not create or start Phase 6 from this state.

## Files Changed

The Phase 5 implementation, local corpus, real-run harness, tests, and task
documents listed in FILES_CHANGED above are Nightwatch-only. No Alphaus
repository is changed.

## Validation Ledger

The current validation results are recorded in VALIDATION_LEDGER above. The
pre-real validation checkpoint is complete; the frozen DEV ledger and final
post-run closure validation remain pending.

## Decisions Made During This Task

- OOPS remains an untrusted executor and never receives auth or destination
  authority.
- Bubblewrap is recorded as available but is not used for authenticated OOPS
  because its isolated namespace cannot reach the parent relay.
- Native Nightwatch relay execution is the only real DEV fallback.
- Six source-proven reads are frozen; no endpoint expansion is permitted.
- A preflight failure caused by Nightwatch's incorrect repository-root
  resolution is repaired and must be rechecked before the single real run;
  it is not an API anomaly.

## Discoveries

- The current OOPS source still confirms all previously reported dangerous
  capabilities.
- The current source-built OOPS process returns success at the process level
  for a status assertion failure; Nightwatch must use relay/oracle metadata.
- The generated scenario is a JSON-subset YAML document so no broad YAML
  parser or permissive external schema is introduced.
- The Phase 5 source snapshot root is the `REPOSITORIES` directory beside the
  Nightwatch checkout, not the meta-workspace root.

## Blockers

No human blocker yet. The first preflight was blocked by a repaired Nightwatch
snapshot-path defect; no real request reached the relay. Authenticated OOPS execution is intentionally disabled
by the relay/network-namespace incompatibility; native Nightwatch relay
execution remains in scope.

## Safety Events

No Phase 5 real request, production attempt, proxy violation, unknown
destination/approval, mutation, database query, or Alphaus write occurred.
Local synthetic safety rejection tests passed.

## Deferred / Follow-Up

Phase 6 data-layer evidence, broad API coverage/fuzzing, distributed OOPS, AI
planning, and production/mutation verification remain deferred.

## Resume Recipe

Use the exact RESUME_RECIPE above after rereading AGENTS.md, ACTIVE_TASK, SPEC,
PLAN, REPORT, and STATE. Never reconstruct operation semantics from memory.
