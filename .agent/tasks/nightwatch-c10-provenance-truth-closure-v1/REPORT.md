# C-10.5 Provenance and Project-Truth Closure — Stage-A Report

Status: COMPLETE

## 1. Starting SHA

`cb631cc4af3c3572f4cbf78da04a8265075fbfa5`, verified as both local HEAD and
`origin/main`, clean tree, single canonical worktree, before any modification.

Every §0 expectation in the authorizing prompt was independently confirmed
read-only before any file changed — including the C-10 substantive
implementation `23523cc`, and the final C-10 exact-head run `33601265465` /
job `100155266632` at `cb631cc` on Node 20 with receipt
`receipt:sha256:f38b272bec3a37464257e194` and `SYNTHETIC_CAMPAIGN` 221/221. No
plan rebase was needed.

Two repository documents were BEHIND that verified truth, which is the defect
this campaign repaired: `ACTIVE_TASK.md` named run `33600603779` at `1234daf`,
and `docs/CURRENT_STATE.md` named run `33590645175` at `b99ce4e`.

## 2. Provenance-forgery reproduction

Reproduced before repair, with synthetic sentinels only, captured in the
OpenSpec `audit.md`:

```
ROUTE_FORGERY_ACCEPTED={"provenanceClass":"SOURCE_PROVEN_OPENAPI_OPERATION","provenanceDigest":"ev:sha256:deadbeefdeadbeefdeadbeef","templateCount":1}
ROUTE_SENTINEL_TREATED_AS_PROVEN=true
KEY_FORGERY_ACCEPTED={"provenanceClass":"SOURCE_PROVEN_FIXED_CONTRACT","provenanceDigest":"ev:sha256:deadbeefdeadbeefdeadbeef","keyCount":1}
KEY_SENTINEL_TREATED_AS_PROVEN=true
JSON_REVIVED_ACCEPTED_BY_CONSUMER=true
```

Four distinct failures: a caller-chosen provenance label was granted; a
fabricated digest passed because only its shape was checked; arbitrary members
were treated as proven; and an object rebuilt from `JSON.parse` was accepted by
the consumer.

## 3. Root cause

C-10 built and tested the CONSUMPTION side of the route/key provenance
boundary and never built the MINTING side. `createProvenRouteVocabulary` and
`createProvenKeyVocabulary` were public functions accepting a provenance class,
any `ev:sha256:<24 hex>`-shaped string, and an arbitrary member array. Nothing
computed or verified the digest against a source artifact.

The gap was wider than the brief assumed: a search across `src/` and `bin/`
found NO non-test producer of either vocabulary, so every `SOURCE_PROVEN_*`
capability that had ever existed in the shipped system came from a test
fixture. `routeVocabulary.ts`'s own header asserted that "the provenance digest
binds this set to that source" — no code performed that binding, which is
plausibly how the gap survived review: the module read as though it existed.

## 4. Route vocabulary authority, before and after

**Before.** `createProvenRouteVocabulary({ provenanceClass, provenanceDigest,
templates })` — all three caller-supplied; validation was closed-enum
membership, a digest shape regex, size bounds, and a per-template shape regex.

**After.** `deriveOpenApiRouteVocabulary` in `src/core/prodProvenance/**`
consumes C-02a `SourceOperationDescriptor`s plus
`SourceOperationProjectionCompleteness` and `GenerationCurrency`, and
establishes repository identity, source root, source SHA, evidence class,
inventory completeness, generation currentness, `operationId`, HTTP method and
path template. Members are canonical `"<METHOD> <template>"` pairs, so method
is part of route identity. The digest is computed inside the cone. There is no
digest parameter.

`derivePhpRouteVocabulary` FAILS CLOSED with `PHP_ROUTE_PROOF_UNAVAILABLE`:
C-06 measured `READ_ONLY_PROVEN` at zero across 814 operations, so there is no
admissible PHP production route vocabulary to derive. Completeness was not
invented, and a hardening rule keeps that fail-closed.

## 5. Key vocabulary authority, before and after

**Before.** `createProvenKeyVocabulary({ provenanceClass, provenanceDigest,
keys })`, same shape, so any code could self-assert
`SOURCE_PROVEN_FIXED_CONTRACT`.

**After.** Three trusted adapters — `deriveOpenApiKeyVocabulary` (requires a
`RESOLVED` definition binding), `derivePhpRowKeyVocabulary`, and
`deriveFixedContractKeyVocabulary`, which requires the committed contract's own
repository, path and snapshot SHA, so naming a different contract yields a
different identity. The label-accepting constructors are gone from the cone's
public surface, which is now enumerated rather than a wildcard re-export.

## 6. Source binding mechanism

Three properties, each mechanically enforced:

1. **Identity is an output, not an input.** The mint exposes NO digest
   parameter, so the forgery is inexpressible rather than merely detectable.
   Validating a supplied digest against a recomputation would only prove
   internal consistency — a caller supplying both members and digest supplies a
   self-consistent pair.
2. **The brand is object identity, not shape.** A module-private `WeakSet`
   records minted capabilities; consumers require membership. A perfectly
   reconstructed JSON revival carrying the genuine derived digest is refused,
   because object identity does not survive serialization. A TypeScript brand
   cannot express this, being erased at runtime.
3. **Evidence invariants fail closed.** Non-`COMPLETE` inventory, truncation,
   unknown remainder, `STALE`/`UNKNOWN` generation currency, malformed source
   SHA, unapproved repository, missing `operationId`, mixed repository or SHA,
   and evidence-class/vocabulary-kind mismatch all DENY.

Derivation lives outside `src/core/prodPrivacy/**`; the cone retains its
`node:crypto`-only import profile. `hardening:check` bounds the mint's
importers to `src/core/prodProvenance/**` and the TEST-ONLY seam's to
`tests/**`; both rules were negative-probed.

## 7. Digest binding inputs

Length-prefixed (`<byteLength>:<value>`) and joined, so no member literal can
imitate a field boundary: authority version, vocabulary kind, evidence class,
qualifier, repository, source root, source SHA, inventory state, currency
state, member count, then SORTED members.

Sorting gives intentional set semantics — permutation canonicalizes
identically, while addition or removal changes identity, as does any change to
source identity, evidence class, completeness or currentness. Proven by test,
including a collision probe (`['a|b','c']` vs `['a','b|c']`).

## 8. Project-state drift found

All five live anchors named `b99ce4e`, an ANCESTOR of the validated C-10
implementation `23523cc`. Because the five agreed with each other,
`project:check` reported PASS over a globally stale baseline. The
"Exact-head CI is green" narrative was stale in the same direction.

Reconciled per field semantics rather than bulk-set to HEAD, with a semantics
table added beside the truth block. The implementation anchor legitimately
trails the CI anchor, and git confirms the intervening commits touch only
approved documentation paths.

## 9. Project-state validator repair

The pre-existing check compares the CI anchor to the substantive anchor, so it
fires only when they DISAGREE — pairwise agreement between stale fields cannot
detect global staleness, because the fields are each other's only reference.

Added a DIRECTIONAL cross-authority invariant against `.agent/ACTIVE_TASK.md`,
which the truth block already names `VALIDATED_IMPLEMENTATION_AUTHORITY`. The
project baseline must not be a strict ancestor of what the active task
validated. The range is CLASSIFIED, not merely compared, reusing the continuity
protocol's existing `isApprovedCheckpointPath` allowlist, so a
documentation-only descendant still passes and a campaign does not fail its own
closeout. An unclassifiable range fails closed
(`PROJECT_STATE_SUBSTANTIVE_BASELINE_UNVERIFIABLE`). The CI anchor is held to
the same reference with its own semantics
(`PROJECT_STATE_CI_BASELINE_STALE`). Everything uses the local object database;
no network.

Eight adversarial cases pin the behaviour. Two findings surfaced while writing
them: the validator read only the uppercase `LAST_VALIDATED_IMPLEMENTATION_SHA`
and silently did not fire against records using the long-standing prose
spelling (both are now accepted); and importing the allowlist from
`bin/agent-state.mjs` executed that CLI's top-level code and corrupted the
checker's JSON receipt, breaking 13 pre-existing tests — the allowlist now
lives in the side-effect-free protocol module with a single source of truth.

## 10. C-10 certification reconciliation

The master task row carried an intermediate checkpoint (81 tests, 2,920 /
2,907 / 13 / 0, a 128→209 synthetic campaign). Replaced with the verified final
C-10 certification: 93 tests, 2,932 / 2,919 / 13 / 0, synthetic campaign
221/221, run `33601265465` / job `100155266632` at `cb631cc`, receipt
`receipt:sha256:f38b272bec3a37464257e194`. The intermediate values are retained
in place and labelled historical.

Digest semantics (A12) were reconciled at four sites: `prodstruct:sha256:*`
structural only, unsalted, deterministic, cross-campaign comparable; durable
value digest ABSENT, so there is no salt to persist. The superseded
single/salted model is marked historical, not deleted, and every site
references D-113 — including the §6.5 test description that previously asked
for a proof about a salt that no longer exists.

## 11. Persisted-position sentinel rule

DEF-C10-5's real lesson was methodological: the corpus enumerated sensitive
VALUE CLASSES, was complete against its own model, and still missed a leak
because `routeTemplate` was a free-form string POSITION no sentinel occupied.

`persistedFieldInventory.ts` declares every persisted DTO position with a
disposition from a closed vocabulary — `CLOSED_VOCABULARY`, `SOURCE_PROVEN`,
`DERIVED_DIGEST`, `STRUCTURAL_RECURSION`, `SENTINEL_PROVEN` — and no
`ASSUMED_SAFE` or `REVIEWED` member exists. Enforcement is a two-way totality
cross-check against the DTO's real field vocabularies: a new persisted field
fails as uninventoried, a removed one fails as rotted. Negative-probed with a
free-form `operatorNote` field.

Sentinels are planted in the exact positions, not merely somewhere in the
payload — every string-capable evidence-root position, plus
`provenFields[].name`, plus an unknown-field position, plus an end-to-end
proof that no sentinel byte reaches disk. A further test asserts the tamper set
is TOTAL over string-capable root positions, so the DEF-C10-5 shape cannot
recur inside the coverage suite itself.

## 12. Regression totals

| Measure | Result |
| --- | --- |
| Full canonical regression | 2,975 total / 2,962 passed / 13 skipped / 0 failed |
| `test:semantic-compat` | 1,975 / 1,962 passed / 13 skipped / 0 failed |
| `campaign:synthetic` (local) | 16 files, 256 / 256, `deepContainmentLane: PROVEN` |
| `campaign:synthetic` (CI) | 256 / 256, `deepContainmentLane: NOT_EXERCISED_BWRAP_UNAVAILABLE` |
| Dedicated C-10.5 tests | 56 (34 provenance authority, 14 persisted-position, 8 project-state A10) |
| New skips introduced | 0 |

## 13. Local, clean and CI receipts

| Gate | Result | Receipt |
| --- | --- | --- |
| `gate:local` | PASS, eleven groups, Node 22, at `93d15b3` | `receipt:sha256:50f85aa10248ac17323c9290` |
| `gate:clean` | PASS, eleven groups, Node 20, `siblingWrites: 0`, at `93d15b3` | `clean-receipt:sha256:ed216b4c47ec9247d6507a40` (inner `receipt:sha256:8ebb52eacf14b0da3b36ca9b`) |
| `gate:clean` at the closure head `fd43ea4` | PASS on re-run, but see OBS-C105-1 | first run `TEST_FAILURE` (`clean-receipt:sha256:dbe34b8f71f2de2a6c80c317`); subsequent runs PASS |
| Exact-head CI (substantive) | PASS, eleven groups, Node 20, run `33627408962` / job `100238317324` at `4d59235` | `receipt:sha256:072d1ba432a39944aca0466c` |
| Exact-head CI (final, exact head of `main`) | PASS, eleven groups, Node 20, run `33635296271` / job `100268250381` at `29b9212` | `receipt:sha256:d64ef703c328a4d10d7e86f3` |

**On the exact-head fixpoint.** The commit RECORDING a receipt is necessarily a
descendant of the commit the run certified, since a field cannot name the SHA
of the commit containing it. The certification therefore covers `4d59235`, and
the documentation descendant carrying these numbers is a later commit whose own
run is reported separately. This matches the C-10 precedent.

## 14. Final Stage-A SHA

Substantive implementation: `c763c056d306172df3c03c03781f5ec5516944e9`.
CI-certified head: `4d59235c64ba8fbdd7d788a20f678378b06a4014`.

## Defects found and disposition

| ID | Defect | Disposition |
| --- | --- | --- |
| A2 (pre-existing) | `SOURCE_PROVEN_*` mintable from a caller-supplied label, fabricated digest and arbitrary members; shape-matching JSON revival trusted | CLOSED — authority relocated to trusted derivation with computed identity and a runtime brand |
| A9/A11 (pre-existing) | All five live project anchors stale at an ancestor; validator blind to it; C-10 certification and digest semantics stale in the master design | CLOSED — anchors reconciled per semantics, cross-authority invariant added, documentation reconciled with history preserved |
| A13 (pre-existing, methodological) | Privacy corpus organized by value class, blind to unlisted persisted positions | CLOSED — inventory-driven totality enforcement |
| **DEF-C105-1** (introduced by this campaign) | `assertProductionKeyVocabularyAuthority` written and exported but never called — dead code. A TEST_ONLY key vocabulary passed `isSourceProvenKey` membership and carried an arbitrary key literal into persisted evidence via `provenFields[].name` | CLOSED — guard wired into `toProductionEvidence`, two hardening rules added (guard exists; call site exists), regression test plus PRODUCTION counter-case, dead-guard rule negative-probed |
| Review finding (coverage) | A13 tamper set declared three CLOSED_VOCABULARY positions but planted no sentinel in them | CLOSED — all three planted (firewall rejects all three, so not a second defect), plus a totality assertion over the tamper set |
| Validator spelling | Cross-authority check read only the uppercase anchor field and silently did not fire on the prose spelling | CLOSED — both spellings accepted, canonical first |
| stdout pollution (introduced) | Importing the allowlist from `bin/agent-state.mjs` ran its CLI top-level code and corrupted the checker's JSON receipt, breaking 13 pre-existing tests | CLOSED — allowlist relocated to the side-effect-free protocol module |


## OBS-C105-1 — a non-deterministic clean-gate failure, probable cause identified

**Status: OPEN, with a probable cause.** The cause was identified only after an
independent failure supplied the evidence; the attribution is inference, not
proof, and is recorded as such.

### What happened

At the Stage-A closure commit `fd43ea4` (a documentation-only descendant of the
CI-certified `4d59235`), `npm run gate:clean` returned `TEST_FAILURE` once with
`clean-receipt:sha256:dbe34b8f71f2de2a6c80c317` and `siblingWrites: 0`. Two
subsequent runs at the SAME commit returned PASS, one under deliberate 4x CPU
load, and `gate:local` passed there
(`receipt:sha256:fb9a4b6d4f3034d815a76439`).

**The failing group was unrecoverable.** The command that observed the failure
piped the receipt through a filter printing only `finalResult`, discarding the
per-group detail. That was a process error on the executor's part, not a
tooling limitation, and it is why this observation needed an unrelated failure
to explain it.

### Probable cause

The exact-head CI run `33635296271` at `29b9212` subsequently failed with a
single, precisely located test failure:

```
SEMANTIC_COMPATIBILITY  TEST_FAILURE  1975 total / 1961 passed / 13 skipped / 1 failed
failedLocations: ["tests/unit/phase24ProxyLifecycle.test.ts:105"]
```

`tests/unit/phase24ProxyLifecycle.test.ts:105` derives its port from the
process id:

```ts
const preferred = 21000 + (process.pid % 500) * 2 + index;
```

then asserts `lease.port === preferred` and that the port is available. Any
process already holding that exact port fails the assertion. The port space is
1,000 wide and PID-derived, so collision is a function of host state, not of
repository content.

That test is a member of `SEMANTIC_COMPATIBILITY`, which runs in the `local`,
`clean` AND `ci` gate modes. So a single flaky member of that group explains a
`TEST_FAILURE` appearing in one clean run and not the next, at an identical
commit — which is exactly OBS-C105-1's shape.

**The earlier containment-lane hypothesis is retired.** It was the leading
candidate because `bin/quality-gate.mjs` forces
`SYNTHETIC_CAMPAIGN` to `TEST_FAILURE` outside CI when the deep lane is not
`PROVEN`, but `campaign:synthetic` reported `PROVEN` across six consecutive
runs, and the CI failure points elsewhere.

### Evidence that this is pre-existing and not caused by C-10.5

| Question | Evidence |
| --- | --- |
| Did this campaign change the test? | No — `git log cb631cc..29b9212 -- tests/unit/phase24ProxyLifecycle.test.ts` is empty |
| Did it change proxy, port or containment code? | No — the only `proxy`/`port` match in the campaign diff is the word inside this report |
| Does the test pass locally? | Yes — 5/5 across five consecutive runs |
| Did it pass in the campaign's own earlier CI runs? | Yes — green at `09c13fa` and `4d59235`, and in C-10's `cb631cc` |

### Disposition

Per owner decision: the flake is recorded as a known PRE-EXISTING defect and
the exact-head CI result was obtained by re-running the job, with **no change to
the test, no retry added to any test or gate, no timeout inflated and no gate
weakened**. A CI job re-run to confirm non-determinism is distinct from adding
a retry to code so a defect stops being visible; the first failure is reported
above rather than folded away.

**Recommended follow-up, deliberately NOT performed here** (it expands into
proxy/port test code the brief treats as sensitive, and belongs in its own
task):

1. Make the lifecycle test's port selection probe for a genuinely free port
   before asserting, so a collision cannot fail it while it still proves that a
   killed child's orphan lease is reclaimable.
2. Persist each quality-gate receipt to a file rather than only stdout, so a
   failing group is always attributable after the fact. Retaining evidence is
   not a retry.

This flake is load-bearing for C-11: that campaign adds substantial
proxy, containment and port-binding work, so an unrepaired PID-derived port
collision will recur there and should be fixed before it does.

## A15 Stage-A completion gate

| Requirement | Status | Evidence |
| --- | --- | --- |
| Source-proven vocabularies mechanically derived, not caller-asserted | PASS | derivation adapters; label constructors removed; `hardening:check` bounds the mint's importers |
| Provenance digest computed by trusted Nightwatch code | PASS | `computeProvenanceDigest`; no digest parameter exists |
| Vocabulary contents bound to evidence identity | PASS | length-prefixed canonical binding; member add/remove changes identity |
| Source identity bound | PASS | repository, root and source SHA in the binding; SHA change changes identity |
| Incomplete source evidence fails closed | PASS | completeness/currency/identity denials, all tested |
| Test-only construction cannot produce production authority | PASS | TEST_ONLY refused on both the route AND key paths (DEF-C105-1) |
| Pure privacy cone remains import-isolated | PASS | `hardening:check` C-10 boundary intact; `node:crypto` only |
| `CURRENT_STATE` live anchors reconciled | PASS | per-field semantics table; each anchor names its own checkpoint |
| Validator catches mutually consistent stale-baseline substitution | PASS | A10.2 and A10.8; fired against the real live drift |
| C-10 final counts and documentation reconciled | PASS | master task row; history retained |
| Master digest semantics reconciled | PASS | four sites, D-113 referenced |
| Persisted-free-form-field coverage mechanically enforced | PASS | two-way totality cross-check, negative-probed |
| Full regression zero failures | PASS | 2,975 / 2,962 / 13 skipped / 0 failed |
| Local gate PASS | PASS | `receipt:sha256:50f85aa10248ac17323c9290` |
| Clean gate PASS | PASS **with OBS-C105-1** | passes reproducibly at `fd43ea4`; one `TEST_FAILURE` observed at the same commit, probable cause the pre-existing `phase24ProxyLifecycle` port flake |
| Exact-head CI PASS | PASS | run `33635296271` / job `100268250381` at `29b9212`, the exact head of `main`; obtained by re-running a job failed by the pre-existing `phase24ProxyLifecycle` flake, recorded in OBS-C105-1 |
| All 11 gate groups PASS | PASS | every group PASS in the CI receipt |
| Canonical checkout clean | PASS | implementation only ever in the owned session worktree |
| `origin/main` synchronized | PASS | fast-forward integration through the C-00 tooling |

## Stage-A verdict

**Stage A is COMPLETE.** Every A15 item holds, including a green exact-head CI
at the exact head of `main`.

One qualification is recorded rather than resolved: OBS-C105-1, a
non-deterministic `gate:clean` failure whose probable cause is the PRE-EXISTING
`phase24ProxyLifecycle` PID-derived port collision. Per owner decision that
flake is recorded as a known pre-existing defect and the exact-head result was
obtained by re-running the failed job. No test was changed, no retry was added
to any test or gate, no timeout was inflated, and no gate was weakened; both
failures are reported above rather than folded away.

The deferred repair of that flake is flagged **load-bearing for C-11**, which
adds substantial proxy, containment and port-binding work and will meet the
same collision.

## Stage B authorization status

C-11 `PROD_OBSERVE` is **NOT started**, and no C-11 record, OpenSpec change or
code exists.

Stage A passing AUTHORIZES C-11 to begin, in a NEW separately recorded task
with its own SPEC/PLAN/STATE/REPORT and its own OpenSpec change, so the two
stages remain separately auditable as the brief requires. Stage A grants no
production connectivity of any kind: production remains absent from
`SUPPORTED_ENVIRONMENTS`, `config/environments/production.json` remains
non-loadable, C-06 is untouched and still fail-closed, and no real production,
DEV or NEXT contact occurred at any point in this campaign.
