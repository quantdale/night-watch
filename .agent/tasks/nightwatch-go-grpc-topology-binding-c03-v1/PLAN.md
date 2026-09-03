# C-03 Go/gRPC Topology Binding

## Purpose

Nightwatch knows 590 protobuf RPCs and 2,300 Go files and cannot say which Go
process serves which proto service. C-03 binds the two mechanically, at
service level, so the System Map can show a proto service and the daemon that
registers it as one proven edge rather than two names that look alike.

## Starting State

- Task ID: `nightwatch-go-grpc-topology-binding-c03-v1`
- Starting SHA: `03bab54e0758bb9aa4e9a44dacd7eb863e254e16`
- Session branch: `session/nightwatch-go-grpc-topology-bind-25187565`
- Predecessor `nightwatch-protobuf-source-intelligence-c02b-v1` COMPLETE.

Established facts, measured, not to be rediscovered:

- 17 production registrations, 15 daemons, 2 test-file registrations to
  exclude; 15 name blueapi proto services.
- 15 blueapi proto roots, one service each, 590 RPCs total.
- ouchan at `maxFiles: 1024` enumerates 857 entries and sees **zero**
  registration files; at 4,096 it sees 8 of 12 daemons; a COMPLETE walk of
  both roots exceeds `MAX_SIBLING_SOURCE_SCAN_FILES`.
- `pkg` sorts before `services` in `createRealSourceScanConfig`, which is why
  the budget is spent before the daemons are reached.
- C-02b's `readProtoDeclarations` already yields the service↔RPC symbols.
- DEF-C02B-1's evidence-class-scoped route ambiguity becomes load-bearing for
  590 operations rather than 147 once the roots are admitted.

## Scope

Raise ouchan's per-repository `maxFiles` to the existing 4,096 ceiling; admit
the fourteen further blueapi proto roots; a bounded Go registration lexer; a
proto service fact index; a categorical service-level join; hardening rules
with negative probes; gate-registered suites.

## Non-Goals

No Go type checking, no call graph, no toolchain, no `go` invocation. No
repository admission and no change to `MAX_SIBLING_SOURCE_SCAN_FILES`. No
`W-EFFECT_RPC` — its preconditions are demonstrably unmet. No production, DEV
or NEXT contact; no credentials; no customer data.

## Safety Constraints

Read-only sibling access through `siblingSource.ts` only; bounded loops and
explicit ceilings; structural facts and digests only in durable evidence; fail
closed to AMBIGUOUS/UNSUPPORTED; explicit synthetic roots in fixtures; no
repository write while `gate:clean` evidence is running.

## Architecture / Approach

Three modules, each independently testable:

1. **`src/core/source/goRegistration.ts`** — a bounded lexer over Go source
   recognising `pkg.Register<X>Server(...)` call sites and
   `Unimplemented<X>Server` embedding. It reuses the existing
   `tokenizeStaticSource` lexer so comment and string handling is not
   reimplemented, and it resolves the package qualifier through the file's own
   import block, so an aliased import is followed rather than guessed.
2. **`src/core/source/protoServiceIndex.ts`** — a deterministic index of proto
   service facts across the approved roots, keyed by the generated Go symbol
   the registration would use (`Register<Service>Server`).
3. **`src/core/source/grpcTopology.ts`** — the join, producing categorical
   states `PROVEN | AMBIGUOUS | MISSING | MULTIPLE | UNSUPPORTED | STALE` and
   never a silent best candidate.

## Milestones

### M1 — Task record, OpenSpec change, recorded baseline — COMPLETE
- Acceptance: `agent:check` and `handoff:check` pass; the enumeration table and
  registration inventory are recorded before any code.

### M2 — Adversarial Go corpus, asserted before the parser — COMPLETE
- Aliased import, same service name in two packages, multiple registrations per
  file, registration in `_test.go`, commented registration, a string containing
  registration text, conditional registration, variable reassignment, two
  candidate implementation types, missing embedding, duplicate embedding.
- Acceptance: every case has a named assertion and every ambiguous case is
  asserted non-`SOURCE_FACT`.

### M3 — Bounded Go registration lexer — COMPLETE
- Acceptance: the corpus passes; comments and strings yield nothing; import
  aliases are resolved from the file's own import block.

### M4 — Root admission and budget correction — COMPLETE
- Admit the fourteen blueapi proto roots; raise ouchan `maxFiles` to 4,096.
- Acceptance: C-01 no-eviction holds over the enlarged population; ouchan
  enumeration is reported TRUNCATED with `remainingUnknown: true`; the four
  unobserved daemons are `TRUNCATED_ENUMERATION`, never `MISSING`.

### M5 — Proto service index and the join — COMPLETE
- Acceptance: ≥12 proto services bound as `SOURCE_FACT` or a truthful
  shortfall; every non-proven case carries a categorical state.

### M6 — Method-level investigation and W-EFFECT_RPC determination — COMPLETE
- Acceptance: a recorded, evidence-backed determination. `UNSUPPORTED` is the
  expected and acceptable outcome; the exact blocker is named.

### M7 — Hardening, negative probes, gate registration — COMPLETE
- Acceptance: every load-bearing rule probed, mutation FAIL and restore PASS
  recorded; suites registered with a membership assertion.

### M8 — Validation, integration, exact-head CI, closure — COMPLETE
- Acceptance: regression zero failures; local/clean/exact-head green;
  siblingWrites 0; session released.

## Validation Strategy

C-02b suites, Go topology suites, source inventory and completeness, source
joins, source graph, C-06 proof regression, typecheck, hardening, project,
handoff, agent, agent audit, workspace, gate inventory, semantic compatibility,
synthetic campaign, full canonical regression, `gate:local`, `gate:clean`,
exact-head CI.

## Decision Log

- 2026-09-03 — Admit the fourteen further blueapi proto roots. Reason: the
  `≥12` acceptance is otherwise arithmetically unreachable, and C-02a
  established that a root inside an admitted repository is not a repository
  admission. Evidence: owner answered the question directly. Consequence: the
  proto surface grows from 147 to 590 RPCs.
- 2026-09-03 — Raise ouchan `maxFiles` to the existing 4,096 ceiling rather
  than raising the ceiling itself. Reason: at 1,024 not one registration file
  is enumerated, so C-03 has no input at all; but
  `MAX_SIBLING_SOURCE_SCAN_FILES` is a safety contract constant and changing it
  is a separate authorized change. Consequence: 8 of 12 daemons observable,
  12 proto services bindable, enumeration honestly still TRUNCATED.
- 2026-09-03 — Do not narrow ouchan's roots to `services` to buy COMPLETE
  enumeration. Reason: it would drop `pkg`, which holds the
  `pkg/sapphire/proto/v1/types.proto` negative case C-02b relies on, and a
  scope reduction to make a completeness claim look better is exactly the
  trade §85 forbids.

## Discoveries

- The enumeration walk counts every considered directory entry, not only
  admitted source files, so a root's cost is its whole tree. `pkg` sorting
  before `services` is the entire reason C-03 had no input.
- ouchan can never report COMPLETE enumeration over both approved roots under
  the current contract ceiling. This is a real architectural limit and is
  reported rather than worked around.

## Deferred Work

- Raising `MAX_SIBLING_SOURCE_SCAN_FILES` so a repository the size of ouchan
  can be completely enumerated: its own authorized change.
- `prismd`, `webtoold`, `pricingd`, `vortexd` registrations remain unobserved:
  `TRUNCATED_ENUMERATION`.

## Completion Criteria

Every SPEC acceptance row PASS in the REPORT ledger with exact evidence, or a
truthful documented shortfall the specification permits; canonical repository
clean and synced; session released.
