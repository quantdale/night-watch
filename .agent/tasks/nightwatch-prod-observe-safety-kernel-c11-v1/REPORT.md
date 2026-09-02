# C-11 `PROD_OBSERVE` Safety Kernel — Report

- Starting SHA: `060fef41205b29210d9bd8416aca97c03b028e4f`
- Substantive implementation: `787966061beb91de0002fd114ca04e488b44be48`
- CI certification checkpoint: `150dfccb010ddc0a8f006819ca44b8104c22b66e`
- Task objective: implement and certify the `PROD_OBSERVE`
  production-qualification kernel against MOCK/SYNTHETIC production only.
- Safety events: NONE
- Remaining blockers: none.

Status: COMPLETE

---

## 14–17. Identity and certification

| | |
| --- | --- |
| C-11 starting SHA | `060fef41205b29210d9bd8416aca97c03b028e4f` (R-11 closure head) |
| Substantive implementation SHA | `787966061beb91de0002fd114ca04e488b44be48` |
| Final `origin/main` | Live HEAD: DISCOVER_FROM_GIT |
| Exact GitHub run / job | run `33665872548` / job `100367351818` at `150dfcc` |
| Conclusion | PASS, Node 20, `environmentClass: CI`, all eleven required groups |

## 18. Final quality-gate receipts

| Gate | Result | Receipt |
| --- | --- | --- |
| `gate:local` at `7879660` | PASS, eleven groups | `receipt:sha256:2ff143e71ea8974847053723` |
| `gate:clean` at `7879660` | PASS, Node 20, eleven groups, `siblingWrites: 0` | inner `receipt:sha256:997ebf6461843448173e889d`, outer `clean-receipt:sha256:5b366dd9f3dd05eb8cdd41f6` |
| Exact-head CI at `150dfcc` | PASS, eleven groups | `receipt:sha256:1d991b9a10d4cad618c0f533` |

The clean gate reported `gateReceiptSource: STRUCTURED_FILE` with
`gateReceiptStdoutDigest` equal to `gateReceiptDigest` — R-11's mechanism
working, so the inner receipt came from the file the gate wrote and stdout was
confirmed to agree.

Runs that FAILED on the way here, recorded rather than omitted: `33663495218`
at `77f3ac9` and `33665737015` at `b8cd4e8`, each `PROJECT_TRUTH` alone on the
baseline ordering constraint; and one `gate:clean` at `6dad89b` with 49
`SYNTHETIC_CAMPAIGN` failures, which found DEF-C11-6. No failure was re-run
into a pass.

## 19–20. Regression and test counts

| Measure | R-11 baseline | C-11 |
| --- | --- | --- |
| canonical regression | 3,032 / 3,019 / 13 / 0 | **3,141 / 3,128 / 13 / 0** |
| new skips | — | **0** (13 before, 13 after) |
| `SEMANTIC_COMPATIBILITY` | 2,032 / 2,019 / 13 / 0 | 2,032 / 2,019 / 13 / 0 |
| `SYNTHETIC_CAMPAIGN` | 256 / 256 | **366 / 366**, lane `PROVEN` locally |
| C-11 tests | — | **110**, all gate-registered |

## 21. The authoritative gate chain, in exact order

`nightwatch.production-admission-chain.v1`, eighteen named gates:

1. `G_KILL_SWITCH_ENTRY`
2. `G_OWNER_AUTHORIZATION`
3. `G_AUTHORIZATION_CLASS`
4. `G_CONFIGURATION_INTEGRITY`
5. `G_ORGANIZATION_WINDOW`
6. `G_OBSERVER_IDENTITY`
7. `G_SOURCE_CURRENCY`
8. `G_READ_ONLY_PROOF`
9. `G_ROUTE_AUTHORITY`
10. `G_HOST_ADMISSION`
11. `G_ADDRESS_POLICY`
12. `G_METHOD_AND_BODY`
13. `G_PARAMETER_PROVENANCE`
14. `G_PRIVACY_CAPABILITY`
15. `G_CONTAINMENT_READINESS`
16. `G_BUDGET_RESERVATION`
17. `G_BREAKER_STATE`
18. `G_KILL_SWITCH_PREDISPATCH`

Post-conditions: no redirect off the allowlist, no redirect loop, no unexpected
method, no WebSocket upgrade, no download, no response-size violation, no
mutation signal, no `Set-Cookie` write-back.

**On the eleven-versus-twelve ambiguity.** `design.md §5.2` said "eleven
ordered gates" and labelled them `G0`–`G11`, which is twelve, and the
master-plan acceptance criterion inherited the ambiguity by being phrased as a
COUNT. That is unfalsifiable evidence: eleven checks can run, a twelfth be
omitted, and "all eleven exercised" still hold. The review's additions make any
fixed number wrong anyway. So the NAMED chain is the authority, the count is
derived, and the receipt records every gate ID in order plus a digest over the
chain definition — a missing, duplicated, reordered or unknown gate fails
closed on identity. `HISTORICAL_GATE_MAPPING` keeps the mapping
machine-checkable in source: `G0`→2, `G1`→3, `G2`→6, `G3`→7, `G4`→8, `G5`→9,
`G6`→10 **and** 11 (split: host admission and resolved-address admission are
independent facts it conflated), `G7`→12, `G8`→16, `G9`→17, `G10`→14, `G11`→18
**and** 1 (the kill switch is evaluated twice). Added by the review: 4, 5, 13,
15.

## 22–24. One-fault denial matrix

38 entries covering all eighteen gates. Each holds every other prerequisite
valid, breaks exactly one fact, and asserts: DENY; the categorical reason
belongs to that gate (`GATE_DENIAL_CODES` binds which codes each may emit, so
no gate can borrow another's); every later gate `NOT_EVALUATED`; the grant NOT
consumed; and **`mockServer.receivedRequestCount === 0`**.

| Total | Denied before dispatch | Verified zero-request |
| --- | --- | --- |
| 38 | 38 | **38** |

Every denial in the kernel is pre-dispatch by construction: the evaluator has
no dispatch path at all. The zero-contact assertion is made NETWORK-SIDE
against an instrumented loopback server that counts every request before any
handler logic, including upgrade attempts — an internal boolean would be
satisfied by a kernel that dispatched and then reported a denial.

A totality assertion fails if any gate has no falsifying case.

## 25–26. Positive synthetic PQ path

Non-vacuous. A fully synthetic qualification passes all eighteen gates and:

- exactly **one** request reaches mock production (`receivedRequestCount === 1`);
- method `GET`, no body, no upgrade, loopback destination;
- the route is a PROVEN MEMBER of a vocabulary DERIVED by
  `deriveOpenApiRouteVocabulary` — not a fixture object;
- parameters are opaque handles only;
- budget reserved **once, before** dispatch (`campaignRequestsUsed === 1` with
  `receivedRequestCount` still 0 at that point);
- no redirect, no `Set-Cookie`, no mutation;
- the one-shot grant ends `CONSUMED`;
- a planted sentinel parameter value appears nowhere in the decision or receipt.

Mock requests actually received across the whole suite: **1** — the positive
path's, and nothing else.

## 27–37. Gate-by-gate results

| Concern | Result |
| --- | --- |
| Route / source provenance identity | mechanically bound to C-10.5 `deriveOpenApiRouteVocabulary`; `assertSourceProvenRoute` refuses an unbranded, JSON-revived or TEST_ONLY capability and any non-member template |
| Read-only proof | two non-stale witnesses required; C-06 untouched and still truthfully zero proven PHP operations; the PQ path uses synthetic mechanically valid fixtures |
| Parameter provenance | opaque handles only; a raw string, a malformed handle and a concrete-path route each deny; sentinel absent from every surrounding channel |
| Observer identity | stage table, not branching prose; `ORDINARY_USER` denies at P2 with `OBSERVER_IDENTITY_BELOW_STAGE_MINIMUM`; `UNKNOWN` denies separately |
| Organization window | `G_ORGANIZATION_WINDOW`; not-yet-valid and expired deny separately; synthetic windows only |
| Privacy | production-cone policy REQUIRED with no default; a missing policy denies `PRIVACY_CAPABILITY_ABSENT` |
| Containment | reported categorically; `NOT_EXERCISED_BWRAP_UNAVAILABLE` admissible only in CI and never promoted to `PROVEN`; local/clean/predev enforce the stronger requirement |
| Budgets | reserve-before-dispatch; concurrency cannot oversubscribe; a failed request is NOT refunded; route/service/campaign/time/failure ceilings bind independently; keys cannot carry a customer value |
| Breakers | terminal, no reset method; first cause recorded; unknown category refused |
| Kill-switch race | qualification-entry probe absent, pre-dispatch probe engaged → `KILL_SWITCH_ENGAGED_BEFORE_DISPATCH`, zero contact; no cached ALLOW survives |
| Persistence audit | CLEAN; the cone has no persistence path and no `storageState` reference at all |
| PQ receipt digest | `pqreceipt:` over the canonical body; validated by identity; 16-entry tamper matrix all failing closed |

## 39. Defects found and disposition

| ID | Defect | Disposition |
| --- | --- | --- |
| Historical design (pre-existing) | `design.md §5.2` "eleven gates" labelled `G0`–`G11`; acceptance phrased as a count | CLOSED — versioned NAMED chain, count derived, mapping documented and machine-checkable |
| Historical design (pre-existing) | in-repo `config/observation/prod.v1.json` | SUPERSEDED by F-09 — external-only, with a hardening rule forbidding any in-repo `config/observation/` |
| Historical design (pre-existing) | invert `KNOWN_PRODUCTION_HOSTS` into an allow table | SUPERSEDED by F-10 — deny-only in every mode; the cone cannot import it |
| Historical design (pre-existing) | reuse or parameterize `realRunGate` | SUPERSEDED by F-11 — distinct kernel; hardening asserts no production branch and no mode parameter |
| Historical design (pre-existing) | "a separate launcher is separation" | SUPERSEDED by F-12 — import graph enforced both ways, injected policy with no default |
| **DEF-C11-1** (introduced) | `G_CONFIGURATION_INTEGRITY` UNFALSIFIABLE behind the window gate that reads its config | CLOSED — reordered; hardening enforces the order |
| **DEF-C11-2** (introduced) | `G_AUTHORIZATION_CLASS` could never deny — it compared the grant's class against itself | CLOSED — compares against the CLAIMED class; aliasing denies both ways |
| **DEF-C11-3** (introduced) | two import rules required a `core/` segment, so the relative form slipped past | CLOSED — patterns match either form |
| **DEF-C11-4** (introduced) | the `realRunGate` host rule matched a bare name present at declaration AND call site, so deleting the refusal left it green — DEF-R11-1's class again | CLOSED — anchored to both |
| **DEF-C11-5** (introduced) | the historical-mapping rule matched a PREFIX of any renamed variant | CLOSED — anchored to the export |
| **DEF-C11-6** (introduced) | both suites inferred the workspace root as `path.resolve(ROOT, '..')` — false in the clean topology, which clones directly into `os.tmpdir()`, making the inferred root `/tmp` and every disposable config "inside the workspace". 49 clean-gate failures | CLOSED — both roots constructed explicitly; verified in the exact failing topology |
| Probe harness (introduced) | restored with `git checkout -- .`, which does not remove a `git add`-ed file, so one probe's planted config survived into three others — three false positives | CLOSED — index reset, untracked clean, green-baseline check before each probe |
| Test expectation (not code) | expected `testOnlyProductionMarkedRouteVocabulary` to be refused; it is deliberately a VALID production capability | CLOSED — the adversarial case is the unmarked seam |

Six defects were introduced by this campaign and all are reported rather than
quietly fixed. Two were found only by building the one-fault matrix, three only
by negative probing, and one only by the clean Node 20 gate. **None by review.**

## 40. Negative hardening probes

22 probes, each mutating exactly one invariant on a disposable clone and
requiring `hardening:check` to fail. First pass: 18 detected, 4 vacuous
(DEF-C11-3/4/5 plus one shared pattern). After repair: **22/22 detected, 0
vacuous.** Covered: production cone importing the DEV orchestrator, the generic
`realRunGate`, the deny table, the DEV environment loader; the cone gaining an
HTTP client or a `storageState` path; the DEV cone importing production
machinery; `realRunGate` gaining a `PROD_OBSERVE` branch or losing its
production-host refusal; a gate removed from the chain; config integrity moved
after the window; the chain losing its version; the historical mapping deleted;
the kill switch evaluated once; the reservation removed; route authority no
longer consuming the C-10.5 guard; the privacy policy gaining a default; an
F-09 code removed; an in-repo observation config added; production joining
`SUPPORTED_ENVIRONMENTS`; the D-4 text weakened; a certification suite
unregistered.

Combined with R-11: **51 negative probes, 51 detected, 0 vacuous.**

## 41. Gate registration

Both C-11 suites are registered in `config/synthetic-campaign.v1.json`, which
the required `SYNTHETIC_CAMPAIGN` group executes — the same home as the C-10
and C-10.5 safety suites. `SYNTHETIC_CAMPAIGN` went 256 → 366, exactly the C-11
count. A hardening rule fails when either suite is unregistered, and it caught
both when they were. `gate:inventory` reports 11 groups, 167 unique test files,
zero duplicate executions.

## 42–46. Safety confirmations

- **D-4 preserved**, textually and mechanically: `SUPPORTED_ENVIRONMENTS` is
  exactly `local, dev, next`; `config/environments/production.json` exists as
  documentation and is rejected by name validation; the decision text is
  asserted present and unweakened; a hardening rule guards all three.
- **Production remains ordinarily non-loadable.** No repository-owned
  production allowlist exists; the only in-repo production artifact is the
  unloadable environment file; `KNOWN_PRODUCTION_HOSTS` is deny-only and
  unreachable from the cone; no production host literal appears in the cone.
- **Zero real production, DEV or NEXT contact.** Mock production is
  loopback-only with an OS-chosen port. The production cone contains no HTTP,
  socket or DNS client and no `fetch`, so it cannot contact anything even if
  every gate were bypassed. Exactly one request was dispatched in the entire
  campaign, to `127.0.0.1`.
- **Zero credentials inspected.** No credential, auth state, cookie, token or
  storage state is created, requested or read; asserted over the cone's source.
- **siblingWrites = 0**, reported by the clean gate.
- **C-06 not weakened**; `READ_ONLY_PROVEN` not increased. **C-10 privacy and
  C-10.5 provenance consumed, not modified.**
- **C-12 not begun.**

## 47. Final worktree and session state

Canonical checkout clean and synchronized with `origin/main`; session released;
worktree removed; `workspace verdict=PASS`, `attention=0`.
