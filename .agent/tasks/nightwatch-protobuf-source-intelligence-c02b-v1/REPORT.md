# REPORT — C-02b Protobuf Source Intelligence

Status: COMPLETE
Task ID: nightwatch-protobuf-source-intelligence-c02b-v1
Phase: PROTOBUF_SOURCE_INTELLIGENCE_C02B_V1
Starting SHA: fab7675883b15bdfc29bcc946d52b2762fe96b2f
Substantive implementation SHA: f479b022cc473ef2bef900c35eb9e6530e755a05
Certified head: 321f11b4de40a370e702032beafb9db838aa9e22

## What this campaign added

Nightwatch reads `.proto` source through a bounded lexer and a bounded
recursive-descent declaration reader, over roots it had already been granted.
It records package, service, RPC, request and response message, client and
server streaming, and the `google.api.http` binding as structural facts with
provenance and a completeness state. Proven HTTP bindings join the existing
route-discovery path. A new corroborator compares the proto HTTP surface to
the C-02a generated OpenAPI surface per operation identity.

It is a LANGUAGE admission, not a root admission. No root and no repository
was added.

## Requirement ledger

| Requirement | Status | Evidence |
|---|---|---|
| A1 ≥147 proven RPCs with verb/path/request/response | PASS | 147 measured at `blueapi@691422e5`; `tests/unit/c02bProtoSurface.test.ts` asserts each RPC carries all four |
| A2 zero facts from comments, strings or malformed options | PASS | `tests/unit/c02bProtoLexer.test.ts` 51/51, incl. 5 comment cases and 3 string cases |
| A3 streaming classification measured and reported | PASS | 114 unary / 0 client / 33 server / 0 bidirectional; the ~90 historical figure is refuted with its cause |
| A4 per-operation OpenAPI corroboration, seven outcomes | PASS | `src/core/source/protoCorroboration.ts`; every outcome has a fixture built to produce it |
| A5 currency upgraded only on identity evidence | PASS | probes P2/P3 and B4; counts-agree-content-differs fixtures stay non-CURRENT |
| A6 completeness propagated; C-01 no-eviction holds | PASS | no-eviction assertion over real before/after populations; ripple-api keeps 223 |
| A7 every new suite gate-registered | PASS | `config/synthetic-campaign.v1.json` + membership assertion + hardening rule; probe P7 |
| A8 hardening negative probes bite | PASS | 15 probes attempted, 15 detected, 15 restored to PASS |
| A9 regression / local / clean / exact-head CI green | PASS | see Validation below |

## Measured protobuf surface

At `alphauslabs/blueapi@691422e5dc81afd263d064986fb50fcb3ea432a9`,
`billing/v1/billing.proto`:

| Dimension | Measured |
|---|---|
| services | 1 (`blueapi.billing.v1.Billing`) |
| RPCs | 147 |
| messages | 238 |
| HTTP bindings | 147, all `PROVEN` |
| verbs | GET 39, POST 64, PUT 25, PATCH 2, DELETE 17 |
| bodies | 91 `WILDCARD`, 56 `ABSENT` |
| streaming | 114 unary, 0 client, 33 server, 0 bidirectional |
| `additional_bindings` | 0 |
| tokens / comments discarded | 9,686 / 1,121 |
| completeness | COMPLETE, 0 malformed, 0 dropped by ceiling |

`mobingilabs/ouchan` `pkg/sapphire/proto/v1/types.proto`: 0 services, 5
messages, COMPLETE — the honest negative case.

Two independent methods agree on all ten dimensions. A line-regex baseline was
taken BEFORE the parser existed and the parser reproduced it exactly.

### The ≥147 criterion, evaluated truthfully

Met, at exactly 147 — not above it. Every RPC in the approved universe carries
exactly one binding and there are no `additional_bindings` anywhere in it, so
the ambiguity machinery is exercised by synthetic fixtures only. The historical
"662 annotated RPCs" and "~90 streaming RPCs" figures count the whole blueapi
repository, most of whose roots C-05 governs and this campaign may not read.

## OpenAPI corroboration

All 147 `Billing`-tagged artifact operations MATCH the proto on both verb and
path: 0 `PATH_MISMATCH`, 0 `METHOD_MISMATCH`, 0 `PROTO_ONLY`, 0 `OPENAPI_ONLY`,
0 `AMBIGUOUS`.

The artifact's generation currency nevertheless remains `UNKNOWN` and its
production admission `DENIED`. 444 of its 591 operations mirror services whose
protos live in unadmitted roots, recorded as
`ARTIFACT_COVERS_UNREADABLE_SERVICES`, so the state is `UNCORROBORATABLE`. A
campaign that read 147 operations may not speak for 591. Both halves of that
result are the campaign working.

## Defects introduced by this campaign

### DEF-C02B-1 — a generated mirror treated as a rival declaration
- **Symptom.** Admitting the proto degraded all 147 matching operations in
  `openapiv2/apidocs.swagger.json` from `routeProof: PROVEN` /
  `readOnlyClassification: PROVEN_MUTATION_CAPABLE` to `AMBIGUOUS` /
  `UNSUPPORTED`, and changed their `operationId`.
- **Reproduction.** Discover blueapi with and without `.proto` admitted; diff
  the operation identities. 147 differ.
- **Root cause.** The duplicate-route key in `surfaces.ts` was
  `repoId:method:routeTemplate`, with no notion of evidence class. Before
  C-02b no repository could hold both a generated artifact and its own
  generator input, so the gap was unreachable.
- **Fix.** The key now includes `classifySourceEvidenceQualifier(...)`.
  Rivalry is judged within an evidence class.
- **Regression.** Three assertions in `c02bProtoSurface.test.ts`: the
  cross-class pair stays PROVEN, two same-class protos stay AMBIGUOUS, the
  real 591 artifact operations keep PROVEN. Probes P1 and B5.
- **Disposition.** REPAIRED. Found by this campaign's own C-01 no-eviction
  assertion.

### DEF-C02B-2 — a vacuous test of my own
- **Symptom.** "An unknown HTTP verb is never coerced to a known one" passed
  with the rule it claimed to test deleted.
- **Root cause.** `{ fetch: "/v1/real" }` alone is rejected by the
  no-verbs-at-all check, so the unknown-key rule was never exercised.
- **Fix.** The replacement pairs the unknown key with a valid one. With the
  rule the binding is MALFORMED; without it `/v1/ghost` silently disappears and
  the RPC reads as a clean GET.
- **Disposition.** REPAIRED. Found by negative probe B3.

No other defect was introduced, and none was repaired silently.

## Negative probes

15 attempted, 15 detected, 15 restored to PASS: 10 against `hardening:check`
(P1 ambiguity key, P2 corroboration gate, P3 hand-written corroboration, P4
reader reaching past the lexer, P5 filesystem authority, P6 compiler
dependency, P7 suite deregistration, P8 unapproved root, P9 lexer bounding
state, P10 blueinternal admission) and 5 behavioural (B1 comments not
discarded, B2 bindings collapsed, B3 unknown verb tolerated, B4 path
differences ignored, B5 DEF-C02B-1 reintroduced).

Two vacuity findings came out of the exercise. Two of the new hardening rules
were over-broad on first run — one matched `protoc-gen-openapiv2` inside a
comment describing a real annotation, the other matched the comment recording
blueinternal's absence — and were tightened before probing. And probe B3 had to
be re-run before it meant anything: its first mutation stalled the parser
cursor so the case failed for an unrelated reason, reading NOT_DETECTED against
a test that was in fact vacuous. A NOT_DETECTED probe is now investigated as a
possible bad probe as well as a possible bad rule.

## Validation

| Check | Result |
|---|---|
| `typecheck` | PASS |
| `hardening:check` | PASS |
| `handoff:check` | PASS |
| `project:check` | PASS |
| `agent:check` / `agent:audit` | PASS |
| `workspace:check` | PASS |
| `gate:inventory` | PASS, 0 duplicate executions |
| `test:semantic-compat` | PASS 2,033 / 2,020 / 13 skipped / 0 failed |
| `campaign:synthetic` | PASS 451 / 451, deep containment lane PROVEN |
| canonical regression | PASS 3,228 / 3,215 / 13 skipped / 0 failed |
| `gate:local` | PASS at 321f11b, receipt `receipt:sha256:372e981fa39b01b87b8581da` |
| `gate:clean` | PASS at 321f11b, inner receipt `receipt:sha256:d3455222554c6eff68374d48`, clean receipt `clean-receipt:sha256:84458fa0a06d2182207e5a7d`, siblingWrites 0 |
| exact-head CI | PASS, run `33680339948` / job `100415095920`, receipt `receipt:sha256:1307a41faa4f1e2812939d15`, all 11 groups |

Failed attempts, none omitted:

- `gate:local` at f479b02 — FAIL, `PROJECT_TRUTH` only, receipt
  `receipt:sha256:b28d31c552ae9ab2f6c1e081`. Classification
  PROJECT_TRUTH_ORDERING.
- CI at dbc7c153 — run `33680080322` / job `100414245016`, FAIL,
  `PROJECT_TRUTH` only, receipt `receipt:sha256:40ee80f6601978eb0c13c9cb`.
  Same classification. Not retried: what the gate objected to was the project
  block, not the build.
- `gate:local` at 321f11b from the session worktree — FAIL, `HANDOFF_TRUTH`.
  Classification TOPOLOGY: the session had gone `STALE_SESSION` after
  integration, and `ownedSessionBranch` correctly refuses a released worktree
  as a writing context. Re-run from canonical `main`, where it passes. An
  intermediate hypothesis — that the stale local `main` ref caused it — was
  tested and disproved before the real cause was found.
- The first `gate:clean` invocation crashed in the wrapper with `ENOENT` on
  the clone's `package-lock.json`. Classification ENVIRONMENT. An instrumented
  copy of the wrapper ran every stage to a clean PASS, and the unmodified
  script then passed twice with byte-identical receipts. The crash was not
  reproduced and is NOT claimed as a flake; it is recorded as an unexplained
  single environment failure whose outcome is superseded by two deterministic
  passes and by CI.

## Safety confirmation

- Zero production, DEV and NEXT contact. No network, no credentials, no
  cookies, no auth state, no customer data.
- Zero sibling writes (`siblingWrites: 0` in the clean receipt). Sibling
  repositories were read only, through `siblingSource.ts`.
- No repository-universe expansion. `alphauslabs/blueinternal` and `wave-api`
  remain outside; the approved repository set and blueapi's two roots are
  unchanged, and both facts are hardening-guarded.
- No protobuf compilation, no `protoc`, no `buf`, no descriptor decoding, no
  generated-code reading, no gRPC client, no dynamic evaluation.
- C-11 is unchanged. C-12 is NOT started.
- No force push. No history rewrite. No `git reset --hard`, broad restore,
  broad clean, or stash.

## What C-03 receives

The canonical service identity `<package>.<Service>` and the ordered RPC symbol
set with streaming flags, request and response message types, and an evidence
digest bound to repository and source SHA. For the approved universe that is
`blueapi.billing.v1.Billing` with 147 RPC symbols.

This satisfies the C-02b precondition C-03 declares. C-03 is not blocked by
this campaign.

## Deferred

- Protobuf source in unadmitted `blueapi` roots (`api/`, `cost/`, `cover/`,
  `iam/`, `pricing/`, `protos/`, …) and in repositories outside the universe:
  `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.
- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` are registered in neither gate
  manifest, so the C-02a and C-06 certification suites do not run in the
  authoritative gate. Confirmed mechanically. PRE_EXISTING, not introduced
  here, and deliberately not absorbed into this campaign's scope — it is the
  C-11 lesson 5.3 failure mode still live for two earlier campaigns and it
  wants its own authorized change.
