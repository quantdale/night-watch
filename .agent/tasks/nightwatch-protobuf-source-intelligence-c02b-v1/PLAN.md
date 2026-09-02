# C-02b Protobuf Source Intelligence

## Purpose

Nightwatch can currently see `alphauslabs/blueapi` only through a generated
Swagger mirror whose currency is honestly `UNKNOWN`, and it cannot see gRPC
streaming at all. After this change Nightwatch reads the protobuf source
directly, states the service/RPC symbol mechanically, classifies streaming,
and corroborates the generated artifact per operation identity — which is the
input C-03 joins Go registration against and the evidence C-02a left a seam
for.

## Starting State

- Task ID: `nightwatch-protobuf-source-intelligence-c02b-v1`
- Starting SHA: `fab7675883b15bdfc29bcc946d52b2762fe96b2f`
- Session worktree branch: `session/nightwatch-protobuf-source-intel-139a4f45`
- Predecessor: `nightwatch-prod-observe-safety-kernel-c11-v1`, COMPLETE.

Established facts that must not be rediscovered:

- `src/core/source/approvedScan.ts` is the only place a root is admitted;
  `.proto` is not in `APPROVED_EXTENSIONS` and `PROTOBUF` is not in
  `SOURCE_SCAN_LANGUAGES` (`scanTypes.ts`), so today every proto file is
  rejected `SOURCE_LANGUAGE_UNSUPPORTED`.
- `parseRoutes` (`surfaces.ts:347`) dispatches by language and is the seam a
  `parseProtoRoutes` plugs into; `ParsedRoute` carries no streaming or service
  field, so the richer proto facts need their own model.
- `generatedArtifact.ts` exposes `PROTO_SURFACE_CORROBORATIONS` (empty) and
  `evaluateGenerationCurrency`, which currently compares only an operation
  COUNT. Count similarity is not corroboration.
- Campaign suites are gate-registered in `config/synthetic-campaign.v1.json`;
  `config/semantic-compatibility.v1.json` covers phases 9–26 only.
- Sibling SHAs are pinned in `src/core/changeIntelligence/map.ts`;
  `alphauslabs/blueapi` is pinned at `691422e5dc81afd263d064986fb50fcb3ea432a9`
  and the checkout matches, so the snapshot is CURRENT, not STALE.

Measured baseline of the approved protobuf surface (approximation by line
regex, to be replaced by the parser's own measurement in M3):

- 1 service, `blueapi.billing.v1.Billing`; 147 `rpc` declarations, all on one
  line; 238 messages; 147 `google.api.http` options; 0 `additional_bindings`;
  91 bindings with a `body`.
- Verbs: GET 39, POST 64, PUT 25, PATCH 2, DELETE 17 — summing to 147.
- Streaming: 114 unary, 0 client-streaming, 33 server-streaming, 0
  bidirectional. The historical "~90 streaming RPCs" figure counts the whole
  blueapi repository, most of whose roots are not admitted; it is an
  expectation to verify, and it does not hold inside the approved universe.
- The C-02a artifact carries exactly 147 `Billing`-tagged operations with
  `Billing_<RpcName>` operationIds — an exact per-RPC join key.

## Scope

See `SPEC.md`. Summarised: bounded proto lexer/parser; proto fact model;
`PROTOBUF`/`.proto` admission; route-discovery participation; per-operation
OpenAPI corroboration; hardening + negative probes; gate registration.

## Non-Goals

No protoc/buf/compilation/descriptors, no generated-code reading, no gRPC
client, no runtime networking, no new repository admission, no C-03
implementation, no production/DEV/NEXT contact.

## Safety Constraints

Read-only sibling access through `siblingSource.ts`; every loop and budget
explicitly bounded; structural facts and digests only in durable evidence;
fail closed to UNKNOWN/AMBIGUOUS; explicit synthetic roots in tests; no writes
during `gate:clean`.

## Architecture / Approach

Four layers, each independently testable:

1. **`src/core/source/protoLexer.ts`** — a bounded character-level tokenizer.
   It is the only place that understands comment and string syntax. It emits a
   bounded token stream with kind/value/line, and a categorical bounding
   result. It never returns source text beyond safe identifiers and literals
   it has already validated.
2. **`src/core/source/protoDeclarations.ts`** — a bounded recursive-descent
   reader over the token stream producing the durable fact model: package,
   services, RPCs, streaming flags, request/response message references, and
   `google.api.http` bindings including `additional_bindings` and ambiguity.
   Anything it cannot prove becomes an explicit state, never a default.
3. **`surfaces.ts` participation** — `parseProtoRoutes` maps proven HTTP
   bindings into `ParsedRoute`, so proto operations flow through the existing
   C-01 truncation, completeness, join and census machinery unchanged.
4. **`src/core/source/protoCorroboration.ts`** — deterministic per-operation
   comparison against the C-02a OpenAPI surface, producing the categorical
   outcome set and a corroboration record that the existing
   `evaluateGenerationCurrency` seam can consume without loosening it.

## Milestones

### M1 — Task record, OpenSpec change, and measured baseline — IN_PROGRESS
- Objective: frozen intent, living plan, operational waypoint, OpenSpec change
  with `audit.md` / `proposal.md` / `design.md` / `tasks.md` /
  `specs/*/spec.md`, and a recorded pre-implementation baseline.
- Acceptance: `npm run agent:check` and `npm run handoff:check` pass; the
  baseline numbers above are recorded before any parser exists.
- Validation: `npm run agent:check`, `npm run handoff:check`.

### M2 — Adversarial corpus, reproduced before implementation — NOT_STARTED
- Objective: the comment/string/malformed corpus of SPEC §Acceptance 2 exists
  as explicit synthetic fixtures, and each case is asserted against the
  intended behaviour before the parser is written.
- Files: `tests/unit/c02bProtoLexer.test.ts`, fixtures inline and explicit.
- Acceptance: every adversarial case has a named assertion; no fixture derives
  its root from the checkout location.

### M3 — Bounded lexer and declaration reader — NOT_STARTED
- Objective: `protoLexer.ts` + `protoDeclarations.ts` implemented and bounded.
- Acceptance: the adversarial corpus passes with zero facts from comments or
  strings; the measured blueapi distribution is produced by the parser itself
  and matches or truthfully explains its divergence from the M1 baseline.

### M4 — Admission and route-discovery participation — NOT_STARTED
- Objective: `PROTOBUF` language, `.proto` extension, `parseProtoRoutes`.
- Acceptance: blueapi/billing proto operations are discovered; C-01
  no-eviction regression holds; completeness propagates; no new repository is
  admitted.

### M5 — Per-operation OpenAPI corroboration — NOT_STARTED
- Objective: `protoCorroboration.ts` with the seven categorical outcomes, wired
  to the `generatedArtifact.ts` seam without weakening it.
- Acceptance: currency leaves UNKNOWN only on per-operation identity evidence;
  a count-only agreement provably does not upgrade it.

### M6 — Hardening rules and negative probes — NOT_STARTED
- Objective: load-bearing invariants guarded, each probe recorded as
  mutation→FAIL, restore→PASS.
- Acceptance: zero vacuous rules; every probe bites.

### M7 — Gate registration and full validation matrix — NOT_STARTED
- Objective: suites registered in `config/synthetic-campaign.v1.json` with a
  membership assertion; SPEC §Validation executed.
- Acceptance: canonical regression zero failures; `gate:local` PASS;
  `gate:clean` PASS with writes frozen.

### M8 — Integration, exact-head CI, closure — NOT_STARTED
- Objective: integrate per C-00, observe exact-head CI, reconcile project
  truth, close and release.
- Acceptance: `origin/main` advanced by fast-forward; exact-head CI PASS;
  canonical clean; session released.

## Validation Strategy

Per SPEC §Acceptance and the campaign prompt §18: focused proto suites, source
inventory and operation completeness, C-01 no-eviction regression, C-02a
OpenAPI and generated-artifact suites, source currentness, `typecheck`,
`hardening:check`, `handoff:check`, `project:check`, `agent:check`,
`agent:audit`, `gate:inventory`, `test:semantic-compat`, `campaign:synthetic`,
full canonical regression, `gate:local`, `gate:clean`, exact-head CI.

## Decision Log

- 2026-09-03 — Corroborate per operation identity, not by count. Reason: the
  artifact exposes `Billing_<RpcName>` operationIds, which is an exact join
  key; `evaluateGenerationCurrency`'s existing count comparison would call 147
  vs 147 "CURRENT" without ever comparing a single route. Evidence: measured
  147 `Billing`-tagged operations against 147 proto RPCs. Consequence: C-02b
  supplies a per-operation record and the count path alone can never upgrade
  currency.
- 2026-09-03 — Keep the richer proto facts in their own model rather than
  widening `ParsedRoute`. Reason: `ParsedRoute` is the route-discovery
  contract; streaming and service identity are not route properties, and C-03
  consumes them directly. Consequence: two artifacts, one seam.

## Discoveries

- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` appear in neither
  `config/synthetic-campaign.v1.json` nor `config/semantic-compatibility.v1.json`,
  and the CI workflow runs only `npm run gate:ci`. If that holds, the C-02a and
  C-06 certification suites do not execute in the authoritative gate — exactly
  the C-11 lesson 5.3 failure mode, pre-existing rather than introduced here.
  To be confirmed mechanically in M7 and reported; repairing it is a scope
  question for the report, not a silent widening of this campaign.

## Deferred Work

- Unadmitted `blueapi` proto roots (`api/`, `cost/`, `cover/`, `iam/`,
  `pricing/`, `protos/`, …) and out-of-universe repositories:
  `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.

## Completion Criteria

Every SPEC §Acceptance row PASS in the requirement ledger with exact evidence,
or a truthful documented failure the specification permits; canonical
repository clean and synced; session released.
