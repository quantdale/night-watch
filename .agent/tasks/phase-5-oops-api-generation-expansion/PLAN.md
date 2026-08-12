# Nightwatch Phase 5 — Restricted OOPS + Generated Read-Only API Corpus

## Purpose

Build a small, reusable source-to-API-corpus path in Nightwatch while treating
OOPS as an untrusted execution engine. The result should add a new admitted
read operation through catalog, hydration, and oracle data rather than bespoke
browser or subprocess code, and should remain recoverable from task state if
the session is compacted.

## Starting State

- Task ID: `phase-5-oops-api-generation-expansion`.
- Starting Nightwatch SHA: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Phase 4 implementation/checkpoint: `6bc3cfcebff749d477e3b65f8642db3ecfb6dd8b`.
- Phase 4 terminal clean HEAD: `1d05c460ec0762c4587bb76f5d050a322f8f47a6`.
- Relevant architecture: canonical OutboundPolicy and loopback proxy,
  endpoint semantic registry, Phase 2B journey engine, Phase 2C oracle/
  fingerprint/replay/evidence model, and Phase 3 dependency/staleness map.
- Dependencies: read-only source access to targeted Alphaus repos; an OOPS
  checkout/binary may be audited or built outside that repo; no database work.
- Established facts not to rediscover: J1/J2/J3 contracts and source lineage,
  historical malformed-JSON status, Phase 4 replay/runtime caveats, and the
  Nightwatch-only modification boundary.

## Scope

Phase 4 closure audit; native task creation; OOPS source/binary/security audit;
restricted dialect and adapter; child environment/temp/process controls;
loopback relay and redirect policy; targeted source inventory and semantic
catalog; deterministic scenario generation and oracle adapter; local fixture
and native/OOPS differential; J1/J2/J3 lineage plus small API-only expansion;
Phase 3 staleness links; frozen serial DEV first/replay if safe; final report.

## Non-Goals

Production or mutation traffic, arbitrary OOPS YAML, shell/script/preprocess,
notification/distributed OOPS, direct unrestricted OOPS egress, API fuzzing,
datastore queries, broad endpoint discovery, AI planning, source modification,
other-repository writes, and Phase 6.

## Safety Constraints

- Only Nightwatch may be edited. All Alphaus repos are read-only; preserve
  dirty state and never fetch/checkout/reset/stash/clean/install there.
- Nightwatch policy and semantic catalog outrank OOPS. `UNKNOWN` and
  `KNOWN_MUTATION` are rejected before spawn and tripwired at runtime.
- OOPS receives a minimal allowlisted environment and no credentials,
  storage-state path, or browser state. Generated YAML contains no resolved
  customer values.
- OOPS is local-only behind a loopback relay. If process/network sandbox or
  output privacy cannot be proven, authenticated OOPS DEV execution is
  disabled; a native Nightwatch verifier may be considered only within SPEC.
- Real DEV calls are serial, frozen, bounded, and require first + fresh replay
  for promotion. Any safety/privacy escape stops work.

## Architecture / Approach

1. Freeze task intent and reconcile Phase 4 from the actual matrix, code, Git,
   and focused checks.
2. Audit the current OOPS source and binary, including schema and dangerous
   capabilities, without running real scenarios. Pin source/binary identity.
3. Implement a Nightwatch-owned restricted profile validator and generator.
   Make forbidden YAML keys/values, arbitrary destinations, mutations,
   UNKNOWNs, credentials, and unsupported features fail before process spawn.
4. Implement dedicated workspaces, environment scrub, subprocess lifecycle,
   bounded sanitizer, output taxonomy, and available OS containment. Start a
   loopback relay that resolves catalog operation IDs and revalidates redirects.
5. Build a targeted source catalog with provenance, semantic proof, hydration,
   oracle, streaming, host, lineage, and staleness records. Include explicit
   mutation/unknown/rejected entries.
6. Generate stable restricted scenarios and validate them before execution.
   Add local fixture matrix and native-vs-OOPS differential tests, including
   secret/body leak sentinels and child-environment/argv checks.
7. Link bridge operations to J1/J2/J3 and add only a small source-proven
   API-only expansion. Freeze the operation ledger and budget before DEV.
8. Execute first/replay serially only after the adversarial gate. Classify
   failures before any allowed fresh replay and never promote on one call.
9. Integrate Phase 3 staleness, complete privacy/safety/integrity audits,
   run all validation, update task/docs, commit Nightwatch only, and do not
   start Phase 6.

## Milestones

### M0 — Phase 4 closure audit and native Phase 5 task

- Objective: establish the exact starting checkpoint and freeze acceptance.
- Files/areas: `.agent/ACTIVE_TASK.md`, new Phase 5 task docs.
- Implementation actions: verify SHAs/ancestry, replay predicate, two runtime
  records, inherited focused checks, Alphaus integrity snapshot; create task.
- Acceptance criteria: `PHASE_4_CLOSURE_AUDIT_ACCEPTED`; SPEC exists before
  broad implementation; ACTIVE_TASK routes to Phase 5.
- Validation commands: `git status --short --branch`; SHA/object checks;
  Phase 4 focused suite; `npx tsc --noEmit`; `npm run agent:check`.
- Status: `COMPLETED`; `PHASE_4_CLOSURE_AUDIT_ACCEPTED`.

### M1 — Current OOPS source, binary, and security capability audit

- Objective: know exactly what OOPS can do and pin its identity.
- Files/areas: read-only OOPS repo; Nightwatch task ledgers.
- Implementation actions: record branch/HEAD/tracking/ahead-behind/dirty,
  installed path/version/checksum, source schema and execution paths, HTTP,
  script/chaining/assertions/output/env/temp/notifications/distribution/hooks,
  exit/error behavior and old finding classifications.
- Acceptance criteria: current source audit and `OOPS_CAPABILITY_AUDIT` are
  complete; no real scenario is executed; source/binary mismatch is explicit.
- Validation commands: read-only Git/source inspection; no OOPS scenario run.
- Status: `COMPLETED`; current source pinned at
  `alphauslabs/oops@c4a129feb0b97dc0ae39f32c39a92abe834567f2`, installed
  binary mismatch recorded, and no scenario executed.

### M2 — Restricted OOPS adapter, profile validator, and process sandbox

- Objective: make unsafe OOPS capabilities impossible through Nightwatch.
- Files/areas: `src/core/oops/`, adapter tests, temporary build/cache path.
- Implementation actions: restricted schema/parser, forbidden-key/value checks,
  no preprocess/notification/distributed flags, allowlisted environment,
  dedicated workspace, timeout/termination, argv audit, output sanitizer,
  OOPS result taxonomy, atomic evidence.
- Acceptance criteria: forbidden synthetic scenarios are rejected before OOPS;
  child sentinel and argv tests pass; no shell/script path is entered.
- Validation commands: focused adapter/dialect/env/process/privacy tests.
- Status: `IN_PROGRESS`

### M3 — Loopback relay, outbound containment, and redirect controls

- Objective: prevent OOPS from selecting destinations or bypassing Nightwatch.
- Files/areas: `src/api/relay/` or repository-native equivalent, proxy/policy
  integration, sink/redirect tests.
- Implementation actions: loopback-only server, operation-ID resolution,
  in-memory auth injection, approved host/method/path checks, redirect
  revalidation, unknown/production/mutation fail-closed, no open-proxy URL.
- Acceptance criteria: local sink tests prove direct/redirect/unknown/
  production paths; relay is not reachable on LAN and has no arbitrary target.
- Validation commands: relay/network containment tests and policy tests.
- Status: `NOT_STARTED`

### M4 — Source inventory and semantic API catalog

- Objective: produce a durable, evidence-backed operation frontier.
- Files/areas: `src/api/catalog/`, durable Phase 5 catalog/ledger, source
  snapshots; read-only targeted Alphaus source.
- Implementation actions: trace J1/J2/J3 operations first, classify reads,
  mutations, unknowns, rejected operations, source SHA/freshness, request/
  response/stream/oracle/host/auth metadata, and Phase 3 lineage.
- Acceptance criteria: catalog counts and every classification are source-
  backed; no method/name-only admission; unknown/mutation entries are explicit.
- Validation commands: catalog schema/semantic/staleness tests and source
  provenance checks.
- Status: `NOT_STARTED`

### M5 — Deterministic hydration, scenario generation, and oracle adapter

- Objective: generate stable restricted scenarios from catalog entries only.
- Files/areas: `src/api/generator/`, `src/api/oracle/`, corpus/index, tests.
- Implementation actions: typed placeholders, safe hydration profiles, stable
  identity hash, YAML generation, pre-execution validation, response-shape
  oracle profiles, replay identity and sanitized fingerprints.
- Acceptance criteria: same inputs produce identical logical scenarios; no
  customer values/credentials; a new read operation needs catalog + profiles,
  not bespoke execution code.
- Validation commands: generator/determinism/hydration/oracle/replay/privacy
  tests.
- Status: `NOT_STARTED`

### M6 — Local OOPS fixture matrix and native differential

- Objective: prove the adapter/relay/oracle path without Alphaus traffic.
- Files/areas: loopback fixture, OOPS subprocess harness, focused tests.
- Implementation actions: exercise 200/NDJSON/204/404/500/wrong-content-type/
  malformed/slow/redirect/close/bounded-large/secret-sentinel cases and
  synthetic OOPS failure; compare native and OOPS semantic outcomes.
- Acceptance criteria: fixture matrix passes; raw bodies never persist; OOPS
  engine failures are separated from API failures; local OOPS output is safe.
- Validation commands: focused Phase 5 fixture/differential/privacy suite.
- Status: `NOT_STARTED`

### M7 — Browser/API bridge, expansion, and Phase 3 lineage

- Objective: link trusted browser canaries to source-generated API operations.
- Files/areas: catalog lineage, Phase 2B contracts, Phase 3 map/staleness,
  corpus index and API-only candidates.
- Implementation actions: identify one defensible bridge for J1/J2/J3; add
  two to four additional safe reads only if source permits; implement stale
  invalidation and browser/API behavioral equivalence metadata.
- Acceptance criteria: exact counts and bridge/expansion labels are durable;
  stale operations become review-required and cannot execute.
- Validation commands: lineage/staleness/catalog tests; no real traffic yet.
- Status: `NOT_STARTED`

### M8 — Pre-real gate and frozen operation/budget ledger

- Objective: prove every real-run prerequisite before any DEV API call.
- Files/areas: Phase 5 STATE/REPORT ledgers, adversarial review, preflight.
- Implementation actions: security audit answers, freeze operation IDs,
  source SHAs, scenario IDs, hydration/oracle profiles, first/replay budget,
  auth/relay/sandbox/privacy status.
- Acceptance criteria: `PHASE_5_PRE_REAL_API_READY`; unresolved safety/privacy
  blocker prevents real execution.
- Validation commands: typecheck, focused suites, full Playwright,
  `npm run agent:check`, diff check, privacy scans.
- Status: `NOT_STARTED`

### M9 — Bounded DEV first/replay corpus

- Objective: verify only frozen source-proven reads serially.
- Files/areas: generated corpus, relay/OOPS/native ledgers, sanitized evidence.
- Implementation actions: validate auth before each operation set, execute
  bridge operations first, then API-only expansion, one fresh replay each;
  checkpoint any anomaly before permitted replay.
- Acceptance criteria: all executed operations are `KNOWN_READ`, safety vector
  remains zero, every promoted operation has first + fresh replay, anomalies
  retain L0/L1/L2 status, budget is not exceeded.
- Validation commands: guarded DEV runner and post-run privacy/safety audit.
- Status: `NOT_STARTED`

### M10 — Final review, validation, and clean closure

- Objective: close Phase 5 with a recoverable corpus and adversarial proof.
- Files/areas: SPEC/PLAN/STATE/REPORT, catalog/corpus/lineage/docs, ACTIVE_TASK.
- Implementation actions: final safety/privacy/adversarial review, architecture
  review, Alphaus integrity comparison, full validation, update docs, commit
  Nightwatch only, mark task complete; no Phase 6.
- Acceptance criteria: all SPEC gates or explicit blocker/frontier heading;
  Nightwatch clean; Alphaus repos unchanged; `ACTIVE_TASK` complete.
- Validation commands: full required validation plus all adapter/generator/
  sandbox/privacy regressions.
- Status: `NOT_STARTED`

## Validation Strategy

Use read-only source/Git checks first, focused TypeScript/Playwright unit tests
for each adapter/catalog/generator/relay invariant, actual local OOPS
subprocess execution where the binary/source supports it, loopback fixture
matrix and native differential, then the inherited full Playwright suite. A
pre-real gate must pass typecheck, focused Phase 5 suites, full Playwright,
continuity, diff-check, privacy/sentinel scans, and the 20-question security
audit before any DEV call. Real calls are serial, fresh, bounded, and followed
by metadata-only ledger review.

## Decision Log

- 2026-08-12 — Treat OOPS as an untrusted executor and keep Nightwatch policy
  authoritative; this is required by the Phase 5 security boundary.
- 2026-08-12 — Freeze a target of three UI bridges plus two to four API-only
  reads, with an explicit semantic-frontier outcome if fewer can be proven;
  endpoint count is subordinate to evidence.
- 2026-08-12 — Prefer a loopback operation-ID relay and disable authenticated
  OOPS DEV execution if sandbox/output privacy cannot be proven; no direct
  egress relaxation is allowed.

## Discoveries

- Phase 4’s exact replay implementation condition is a strict `plannedActions`
  length greater than one and zero safety, not merely “a seed was run.”
- The two Phase 4 runtime failures have no persisted anomaly fingerprint or
  semantic request delta; the current evidence supports a Nightwatch runtime
  artifact classification only.

## Deferred Work

- Phase 6 data-layer evidence/cross-layer oracles; broad API coverage/fuzzing;
  distributed OOPS; AI planning; production or mutation verification; source
  deployment identity; arbitrary user-authored OOPS scenario import.

## Completion Criteria

All SPEC completion criteria pass, or the task closes under the explicitly
named sandbox/privacy/semantic-frontier blocker without weakening containment.
The catalog, generated corpus, lineage/staleness evidence, safety/privacy
accounting, validation, Alphaus integrity, and clean Nightwatch handoff are
durable. Phase 6 is not started.
