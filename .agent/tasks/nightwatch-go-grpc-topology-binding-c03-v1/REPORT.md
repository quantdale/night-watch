# REPORT — C-03 Go/gRPC Topology Binding

Status: COMPLETE
Task ID: nightwatch-go-grpc-topology-binding-c03-v1
Starting SHA: 03bab54e0758bb9aa4e9a44dacd7eb863e254e16
Substantive implementation SHA: 53e963d
Certified head: 0d86b6d258fdc6aa3f36ff689950abefc4da15f1

## What this campaign added

Nightwatch binds protobuf services to the Go processes that serve them, at
service level, as mechanically proven `SOURCE_FACT`s — through three links
with no naming inference at any of them.

## The join

```
ouchan   billing.RegisterBillingServer(gs, svc)
           qualifier resolved through the file's own import block
              -> github.com/alphauslabs/blue-sdk-go/billing/v1
sdk      billing_grpc.pb.go declares func RegisterBillingServer
           AND ServiceName: "blueapi.billing.v1.Billing"
proto    billing.proto declares package blueapi.billing.v1; service Billing
```

The middle link is the point. ouchan does not import blueapi at all — it
imports the generated SDK, whose `go_package` differs from blueapi's — so the
plan's original key (proto `go_package`) would have been a naming join. The
generated file states the proto's full name itself, which is generated data.

## Requirement ledger

| Requirement | Status | Evidence |
|---|---|---|
| A1 ≥12 proto services bound as SOURCE_FACT | PASS | 12 PROVEN bindings, 12 distinct proto services |
| A2 `_test.go` registrations never facts | PASS | 421 test files excluded; probes B1/P1 |
| A3 comment/string registrations never facts | PASS | `c03GoRegistration` 29/29; probe B6 |
| A4 every ambiguous case non-SOURCE_FACT | PASS | one `evidenceClass: SOURCE_FACT` construction, hardening-pinned; probe P4 |
| A5 enumeration truth preserved | PASS | TRUNCATED, `repositoryCompleteProof` false; probes P2/P3 |
| A6 W-EFFECT_RPC UNSUPPORTED with its blocker | PASS | recorded below; probe P6 |
| A7 no repository admitted | PASS | six repositories unchanged; probes P8/P9 |
| A8 C-01 no-eviction holds | PASS | population diff over the admission; ripple-api keeps 223 |
| A9 suites gate-registered; probes bite | PASS | 2 suites registered + membership assertion; 19/19 probes |
| A10 regression / clean / exact-head CI green | PASS (local gate not re-run — see Validation) | 3,288 / 3,275 / 13 / 0; clean PASS; CI PASS |

## Measured yield

12 PROVEN bindings across 7 daemon directories, 12 distinct proto services:
Admin, Billing, Cost, Cover, Flags, Flow, GuaranteedCommitments, Iam, Luster,
Operations, Organization, Preferences.

0 AMBIGUOUS, 0 MISSING, 0 MULTIPLE, 0 STALE. 1 UNSUPPORTED
(`RegisterMetricsControlPlaneServer`, blocker `SDK_DESCRIPTOR_UNOBSERVED`).

All 15 generated SDK descriptors pair uniquely. Every proven binding is
independently corroborated by an `Unimplemented<Service>Server` embedding in
the same Go package, with a matching import path.

### The ≥12/≥12 criterion, evaluated honestly

The proto side is met exactly: 12 distinct proto services. The ouchan side
depends on what "service" counts: **13 registrations observed, 12 proven
bindings, 7 daemon directories**. `services/blued` alone registers six
services, so daemon directories and services are not the same thing and the
report gives all three numbers rather than the flattering one.

Four daemons — `prismd`, `webtoold`, `pricingd`, `vortexd` — were never
enumerated and are `TRUNCATED_ENUMERATION`, not `MISSING`.

## Completeness, stated plainly

`mobingilabs/ouchan` enumeration is **TRUNCATED** with `remainingUnknown:
true`, and `repositoryCompleteProof` is **false**. It cannot be otherwise: a
complete walk of `services` + `pkg` needs more considered entries than
`MAX_SIBLING_SOURCE_SCAN_FILES` (4,096) allows, and that ceiling was not
raised by this campaign.

So the topology says *these twelve bindings are proven*. It never says *these
are the twelve bindings that exist*.

## W-EFFECT_RPC — UNSUPPORTED

§29 requires an exact RPC→handler join, COMPLETE repository enumeration,
bounded resolution of every callee, a complete effect vocabulary, fail-closed
dynamic dispatch, and represented external and write effects.

The second condition is unsatisfiable, so `W-EFFECT_RPC` stays `UNSUPPORTED`.
This is a successful outcome, not a shortfall.

### Method-level investigation (§28)

Answered with measurements. The generated `BillingServer` interface declares
147 methods for 147 RPCs; `services/billingd` defines 143 of them on
`*service`. Across the twelve proven bindings, **531 of 549** RPCs have an
observed handler method, and six services reach an exact count (Cost 72/72,
Flow 18/18, Luster 19/19, Organization 7/7, Operations 5/5, Flags 2/2).

The prototype is therefore implemented and labelled `POSITIVE_ONLY`. The
converse is not decidable: an RPC with no observed method may be unimplemented
and inheriting the embedded base, or its file may never have been enumerated.
`completenessClaim` is `NONE` even at 72/72 — a complete-looking count does not
upgrade the evidence class.

## Scope decisions, both recorded rather than absorbed

1. **The fourteen blueapi proto roots.** With only `billing` admitted, exactly
   one join was provable and ≥12 was arithmetically unreachable. The owner was
   asked directly and chose to admit them, on the C-02a precedent that a root
   inside an already-admitted repository is not a repository admission.
2. **The fourteen matching blue-sdk-go roots.** Mechanically required by the
   join, since ouchan registers through the SDK and the SDK's `ServiceName` is
   what proves the binding. Same per-root class; entailed by the decision
   above, and flagged here because it was not separately asked.
3. **ouchan's budgets.** `maxFiles` 1,024 → 4,096 and `maxTotalBytes`
   16,000,000 → 48,000,000. At the old budget **not one** registration daemon
   was enumerated. The contract ceilings themselves are unchanged and
   hardening-pinned.

`alphauslabs/blueinternal` and `wave-api` remain outside the universe; the
approved repository set is the same six.

## Defects introduced by this campaign

### DEF-C03-1 — a blank import bound a package identifier
- **Symptom.** `import _ "…/billing/v1"` fell through the derived-package-name
  fallback and bound `billing`, so `billing.RegisterBillingServer` would have
  resolved through a package imported purely for side effects.
- **Root cause.** The `BLANK`/`DOT` forms reached the same fallback as a named
  import.
- **Fix.** Blank and dot imports bind nothing.
- **Regression.** `c03GoRegistration` — blank import, dot import.
- **Disposition.** REPAIRED. Found by the corpus, before any real data.

### DEF-C03-2 — two vacuous hardening rules of my own
- **Symptom.** The `_test.go` exclusion rule was satisfied by the import line
  while the filter it named was deleted; the `TRUNCATED_ENUMERATION` rule
  matched the comment that explains it.
- **Fix.** Both now assert the call site and the derived assignment.
- **Regression.** Probes P1 and P3, re-run.
- **Disposition.** REPAIRED. Found by probing, which is what probing is for.

### DEF-C03-3 — three tests weaker than the rules they defended
- **Symptom.** Probes B2, B4 and B7 came back NOT_DETECTED against sound
  rules. A single-service SDK fixture cannot exercise a disambiguation rule,
  because any single candidate is the right one; and nothing asserted a
  negative corroboration, so making corroboration unconditionally true went
  unnoticed.
- **Fix.** A two-service generated fixture, an ambiguous-qualifier fixture, and
  a cross-package embedding fixture.
- **Disposition.** REPAIRED, re-probed 7/7.

## Negative probes

19 attempted, 19 detected, 19 restored: 12 against `hardening:check` (test-file
exclusion, completeness derivation, absence semantics, evidence-class
promotion, method completeness claim, W-EFFECT_RPC, filesystem authority,
blueinternal admission, contract ceiling, ouchan budget, suite deregistration,
Go toolchain) and 7 behavioural.

Five failed on the first pass and every one was my own work rather than a bad
probe — recorded above as DEF-C03-2 and DEF-C03-3.

## Validation

| Check | Result |
|---|---|
| `typecheck`, `hardening:check`, `handoff:check` | PASS |
| `agent:check`, `agent:audit`, `workspace:check`, `gate:inventory` | PASS |
| `test:semantic-compat` | PASS 2,033 / 2,020 / 13 skipped / 0 failed |
| `campaign:synthetic` | PASS 511 / 511, containment lane PROVEN |
| canonical regression | PASS 3,288 / 3,275 / 13 skipped / 0 failed |
| `gate:clean` | PASS at 0d86b6d, inner `receipt:sha256:7d05be06a2eaa16eb8cf6163`, clean `clean-receipt:sha256:8594f0440841e7ccfbd6f4ed`, siblingWrites 0 |
| exact-head CI | PASS, run `33689899601` / job `100445996051`, receipt `receipt:sha256:b8765cd35533224fa4f8090e`, all 11 groups |
| `gate:local` at the final head | **NOT RE-RUN** — the operator interrupted it |

On the last row: `gate:local` was not re-run at `0d86b6d`. It is not claimed.
The head is nevertheless certified twice over by full eleven-group runs —
`gate:clean` executes the same gate on a pristine Node 20 checkout of that
exact SHA, and exact-head CI executed it again on GitHub — so the missing row
costs no evidence that the other two do not already supply.

Failed attempts, none omitted:

- CI at `07b90fbb` — run `33689763052` / job `100445559315`, FAIL,
  `PROJECT_TRUTH` only, receipt `receipt:sha256:465abad0896dedcdb57c53fd`.
  Classification PROJECT_TRUTH_ORDERING; not retried, because the gate objects
  to the project block rather than the build.
- Three assertions in C-02a and C-02b failed after the root admission. Two
  described blueapi's root list rather than the property they defend; the third
  compared a repository-wide counter to the artifact's own total. All three
  updated truthfully, and one C-02b hardening rule that pinned the root list
  literally was corrected the same way.

## Safety confirmation

- Zero production, DEV and NEXT contact. No network, credentials, cookies,
  auth state or customer data.
- Zero sibling writes (`siblingWrites: 0`). Siblings read only, through
  `siblingSource.ts`.
- No repository admitted; `MAX_SIBLING_SOURCE_SCAN_FILES` and
  `MAX_SIBLING_SOURCE_SCAN_BYTES` unchanged, both hardening-pinned.
- No Go toolchain, type checking, call graph, compilation or dynamic
  evaluation.
- C-11 unchanged. C-12 NOT started.
- No force push, no history rewrite, no destructive git operation.

## What C-15b receives

Twelve proven service edges, each carrying repository, source SHA, source path,
registration symbol, import path, proto service identity, evidence digest, an
independent embedding corroboration, and a positive-only handler observation —
plus an explicit statement that the set is not complete.

## Deferred

- Raising `MAX_SIBLING_SOURCE_SCAN_FILES` so a repository the size of ouchan
  can be completely enumerated: its own authorized change, and the precondition
  for any future `W-EFFECT_RPC`.
- `prismd`, `webtoold`, `pricingd`, `vortexd`: `TRUNCATED_ENUMERATION`.
- The `src/core/source/**` authority guard matches the process-spawning
  identifier as bare text and cannot tell it from the regular-expression method
  of the same name. Worth narrowing the way the sibling-reader rule already
  does; deliberately not narrowed here.
- `tests/unit/c02aOpenApiAdmission.test.ts` and
  `tests/unit/c06PhpReadOnlyProof.test.ts` are still in neither gate manifest.
  PRE_EXISTING; still wants its own authorized change.
