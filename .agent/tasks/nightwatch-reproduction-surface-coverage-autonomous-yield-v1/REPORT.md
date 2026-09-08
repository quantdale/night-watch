# REPORT — nightwatch-reproduction-surface-coverage-autonomous-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W10 — REPRODUCTION SURFACE COVERAGE & AUTONOMOUS YIELD

## Starting truth

W10 was specified from terminal W9 documentation head `0664c69cc72acbbf848bf6dd64e7e9d868d80601`. W9's validated implementation checkpoint is `bb28480c6a6969a06744c75c4c947851d5bece7c`. The executing orchestrator must rediscover live Git/workspace/session truth and must not treat either SHA as live authority after the campaign starts.

## Mission

Measure the current owner-local reproduction coverage gap, expose neutral executable readiness to stateless autonomous reasoning, safely broaden execution only where local offline prerequisites prove it defensible, materially reduce wasted `NOT_AVAILABLE` verification work, run substantial live campaigns, and preserve all W7-W9 evidence/safety contracts.

## Accepted predecessor evidence

W9 established:

- safe host-derived `GO_VENDORED_PACKAGE_TEST` current-source reproduction;
- explicit `CURRENT_SOURCE_REPEATED_TEST_FAILURE` mechanical proof/admission;
- host-owned deterministic/environment/transient disposition and bounded retry;
- exact separated transport/tool-payload byte budgets;
- real current-source and real historical proofs;
- a full HOUR_1 Omen campaign ending on wall time rather than bytes.

W9 final live gap:

- 26 unique current-source targets;
- 28 grounded/verification-ready hypotheses;
- 7 reproduction attempts;
- 7 `NOT_AVAILABLE`;
- 1 candidate;
- 0 admissions / 1 `MISSING_REPRODUCTION` refusal.

W10 exists to reduce that reproduction-coverage/selection gap without manufacturing findings.

## Evidence ledger

### Root cause of the W9 gap (M0)

Established mechanically, not inferred. The owner-local source index is built
by `loadEligibleEntries` (`src/core/localInvestigation/ownerLocal.ts`) sorted by
`(repository, relativePath)`, and `runSourceIndex`
(`src/core/localInvestigation/session.ts`) hands the reasoner a fixed 32-entry
prefix of it.

A prefix of a repository-major ordering is not a sample of the universe; it is
the first repository. Measured on the live approved universe at base
`1942ea3`:

| Measure | Value |
|---|---:|
| eligible source files | 4,109 |
| entries the reasoner can see | 32 |
| repositories in those 32 | 1 (`alphauslabs/blue-sdk-go`) |
| `EXECUTABLE_NOW` in those 32 | 0 |
| ordered position of the first `mobingilabs/ouchan` entry | 75 |
| ordered position of the first `EXECUTABLE_NOW` entry | 83 |

`alphauslabs/blue-sdk-go` vendors nothing, so all 57 of its Go files refuse
`VENDOR_DIRECTORY_ABSENT`. The preserved `w9-endurance-omen-1` checkpoint
confirms all 32 observed source paths were in that one repository. W9's
7/7 `NOT_AVAILABLE` was therefore structurally guaranteed before the campaign
started — not a reasoning-quality result, and not evidence that reproduction
coverage is scarce.

### Reproduction-capability census (M0)

Coverage is not scarce: 1,120 of 4,109 eligible files (27.3%) map to
`EXECUTABLE_NOW` across 152 distinct executable targets under the unchanged
W9 executor. Refusals: `NO_SUPPORTED_EXECUTOR` 1,605, `PACKAGE_TEST_FILES_ABSENT`
1,327, `VENDOR_DIRECTORY_ABSENT` 57. Full aggregates in `M0-CENSUS.md`.

### Hypothesis verdicts

H1 DISPROVED as stated; H2 CONFIRMED; H3 DISPROVED; H4 DISPROVED; H5 UNPROVEN
(no qualifying reproduction exists yet to triage).

### Executor-class go/no-go

- **M4 `GO_LOCAL_CACHE_PACKAGE_TEST`: NO-GO.** The only non-vendored Go module
  under an approved root is `mobingilabs/ouchan/.github/mcp`, which is outside
  the approved roots (`services`, `pkg`). `alphauslabs/blue-sdk-go` has exactly
  one `_test.go`, in `session/`, which is not an approved service root. The
  class would unlock zero approved targets.
- **M5 non-Go class: NO-GO.** `ripple-api` and `wave-api` have no `vendor/bin`,
  so no local PHPUnit exists; `ripple-ui` has no `node_modules`, so its 43 spec
  files have no local runner. Every candidate needs a network install, which
  the safety boundary prohibits.

Both are recorded as measured NO-GO rather than forced, exactly as the SPEC
permits. All available W10 yield lives in selection, not executor breadth.

### Reproduction coverage before and after (live, end to end)

Measured through `createOwnerLocalInvestigationContext().source.index()` on the
real approved universe — the same call the campaign makes:

| Measure | W9 (before) | W10 (after) |
|---|---:|---:|
| repositories represented | 1 | 8 |
| `EXECUTABLE_NOW` entries | 0 | 5 |
| distinct executable targets | 0 | 5 |

An intermediate measurement is part of the evidence: repository round-robin
alone produced 8 repositories and 5 executable entries but only **1** distinct
target, because five sources in one Go package are one reproduction. Adding
executable-target spread took distinct targets from 1 to 5.

### Fixed-corpus benchmark (M7)

Same implementation, 59-case frozen corpus, identical 7-attempt budget:

| Metric | BASELINE (W9-like) | FINAL (W10) |
|---|---:|---:|
| repositories visible | 1 | 3 |
| executable visible | 0 | 7 |
| distinct executable targets | 0 | 6 |
| reproduction attempts | 7 | 7 |
| `NOT_AVAILABLE` rate | 1.0000 | 0.7143 |
| executable selection rate | 0.0000 | 0.2857 |
| attempts to first executable reproduction | never | 3 |

The attempt budget is identical in both arms, so the gain is selection quality
rather than activity volume.

### Real reproduction proofs (M8)

- W9 real owner-local proof, unchanged, on the integrated head: 1 passed,
  27.7 s, real allowlisted toolchain, real `go test` in fresh disposable trees.
- W10 generality proof on a second, mechanically distinct package selected
  through the capability surface: 2 passed, 18.8 s, sibling identity unchanged
  before and after, no temp residue.
- Repository diversity is honestly unavailable: the census proves only
  `mobingilabs/ouchan` contains any executable target under the approved roots.
  Package diversity is proven; the repository limitation is recorded rather
  than fabricated around.

### Regressions found and repaired

1. **Self-inflicted, caught by the existing suite.** Emitting the new
   `reproductionSurface` state field unconditionally broke seven W9 resume and
   byte-accounting tests: an always-present empty array changed checkpoint bytes
   and tripped the new validator. Repaired by omitting the field entirely when
   empty, so a campaign that learned no capability serializes byte-identically
   to a pre-W10 checkpoint. All seven pass.
2. **Pre-existing defect in Nightwatch tooling.** `nightwatch-agent test` was
   dead on arrival: it passes `NODE_OPTIONS=--expose-gc` to
   `buildChildEnvironment` as an explicit value, and the explicit-key guard
   rejected every key outside the `NIGHTWATCH_` namespace, so the subcommand
   threw `CHILD_ENV_EXPLICIT_KEY_INVALID:NODE_OPTIONS` before running a single
   suite. Repaired with a narrow host-fixed allowlist that keeps the real
   invariant intact — `NODE_OPTIONS` is still never inherited from the parent,
   and an arbitrary key is still rejected. Regression test asserts both halves.
3. **Live campaign-boundary defect, caught by Run C.** Capability-aware memory
   worked within an investigation, but `CampaignAccumulators` carried
   `knownTargets` and dropped `reproductionSurface` between investigations.
   Run C therefore ended with 32 known targets and zero persisted capability
   entries despite 31 source actions. The campaign accumulator now retains a
   bounded newest-wins capability map, omits the field when empty for old
   checkpoint byte compatibility, and has a two-case regression. Run D
   preserved all 32 entries across five investigations.

### Live campaign — Run B, broad owner-local HOUR_1 (M9.2)

Campaign `w10-broad-omen-1`, provider `opencode-go/omen-alpha` — the same
provider and model as the W9 reference — through the ordinary
`campaign run --reasoner=cli --duration=1h --max-turns=12` path.

| Metric | W9 `w9-endurance-omen-1` | W10 `w10-broad-omen-1` |
|---|---:|---:|
| wall time (ms) | 3,673,995 | 3,615,499 |
| investigations started / completed | 7 / 7 | 6 / 6 |
| reasoner calls | 79 | 68 |
| tool actions | 56 | 81 |
| unique source paths observed | 32 | 32 |
| **repositories represented** | **1** | **8** |
| reproduction attempts | 7 | 0 |
| `NOT_AVAILABLE` outcomes | 7 | 0 |
| candidates | 1 | 2 |
| admissions | 0 | 0 |
| refusals | 1 `MISSING_REPRODUCTION` | 2 `MISSING_REPRODUCTION` |
| outer termination | `BUDGET_EXHAUSTED` (wall) | `BUDGET_EXHAUSTED` (wall) |

Repository spread of the 32 observed paths: `mobingilabs/ouchan` 5,
`mobingilabs/ripple-api` 5, `mobingilabs/wave-api` 5, `mobingilabs/ripple-ui` 5,
`alphauslabs/blue-sdk-go` 5, `alphauslabs/blueapi` 5,
`alphauslabs/blueinternal` 1, `alphauslabs/grpc-chunk-parser` 1. W9's identical
32-path budget was 100% `alphauslabs/blue-sdk-go`.

**Honest reading of the zero.** Run B made ZERO reproduction attempts, so its
`NOT_AVAILABLE` count is zero because nothing was attempted — not because
attempts succeeded. It is NOT claimed as a 100%-to-0% waste reduction. What
Run B does prove on live evidence is the structural repair: the reasoner
reached five distinct executable `mobingilabs/ouchan` packages
(`pkg/almcreds`, `pkg/auth/rbac`, `pkg/awscostmanagement`, `pkg/almtemplate`,
`pkg/almuser`) that were unreachable for the whole of W9.

**Known limitation of Run B.** It launched from the integration head that
carried the diverse index and the surface annotation but NOT the M3
capability-aware memory lane, which integrated later. The reasoner therefore
saw a diverse index without any readiness signal or capability directive in
its working memory. Run C exists to measure the full stack.

### Live campaign — Run C, full capability-aware broad HOUR_1 (M9.2)

Campaign `w10-capability-omen-2`, `opencode-go/omen-alpha`, ordinary broad
owner-local path after the M3 memory lane integrated.

| Metric | Result |
|---|---:|
| wall time (ms) | 3,702,379 |
| investigations started / completed | 6 / 6 |
| reasoner calls | 63 |
| logged actions / charged tool actions | 71 / 39 |
| provider failures / retries | 7 / 8 |
| inspected targets | 21 across all 8 approved repositories |
| candidates / admissions | 2 / 0 |
| reproductions | 0 |
| refusals | 2 `MISSING_REPRODUCTION` |
| charged input / provider output / tool payload bytes | 841,348 / 32,431 / 896,477 |
| outer termination | `BUDGET_EXHAUSTED` (wall) |

Run C did not issue a reproduction attempt. It is preserved as a miss, not
reported as a lower refusal rate. It also exposed the cross-investigation
capability-carry defect described above: campaign strategy v2 was active, but
the terminal checkpoint contained zero `reproductionSurface` entries.

### Live campaign — Run D, robustness repeat after carry repair (M9.3)

Campaign `w10-repeat-omen-3`, `opencode-go/omen-alpha`, fresh id and ordinary
broad owner-local path. No second subscribed provider was available without
changing authority, so the primary provider/model was repeated as permitted.

| Metric | Result |
|---|---:|
| wall time (ms) | 3,696,810 |
| investigations started / completed | 5 / 5 |
| reasoner calls | 57 |
| logged actions / charged tool actions | 70 / 38 |
| provider failures / retries | 8 / 8 |
| inspected targets | 22 across all 8 approved repositories |
| persisted capability surface | 32 entries: 5 executable, 27 not executable |
| candidates / admissions | 1 / 0 |
| reproductions | 0 |
| refusals | 1 `MISSING_REPRODUCTION` |
| charged input / provider output / tool payload bytes | 802,203 / 28,652 / 944,890 |
| outer termination | `BUDGET_EXHAUSTED` (wall) |

This is the live proof of the carry repair: the terminal campaign checkpoint
retains the complete bounded surface across investigations. The provider still
chose zero reproduction attempts. That negative result is why M9.1 uses the
census-derived host-owned executable-rich scope rather than calling Run D a
yield success.

### Host-owned reproduction-rich scope (M9.1 preflight)

The campaign engine already accepted a host-built investigation context, but
the operator CLI always constructed the full-universe zero-option context.
`--repository=<approved-org/repo>` now forwards one host-owned repository id to
the existing owner-approved configuration boundary on both run and resume.
An unapproved value fails with exit 2 before the reasoner starts. There is no
path, command, argv or model-controlled scope input.

The M0 census selects `mobingilabs/ouchan`: it is the only approved repository
with executable targets. Live preflight through the production provider gives
32/32 `EXECUTABLE_NOW` entries across 18 distinct packages, versus 5/32 across
5 packages in the broad window. Campaign `w10-rich-omen-4` is the required
HOUR_1 Run A; its terminal result will be recorded without cherry-picking.

### Pre-carry certification checkpoint (not final M11 evidence)

Checkpoint `ed4e32602170e7e181b6e4841677fa8bff39d4ea` passed the following
before the live-discovered campaign carry repair and operator scope seam.
Final M11 certification must therefore run again on the terminal W10
implementation head.

| Check | Result |
|---|---|
| full `npm test` | 4,637 passed / 18 skipped / **0 failed** (W9 baseline: 4,565 / 16 / 0) |
| `npm run typecheck` | PASS |
| `npm run hardening:check` | PASS |
| `npm run agent:check` | PASS (3 advisory warnings) |
| `npm run handoff:check` | PASS |
| `npm run project:check` | PASS |
| `npm run workspace:check` | PASS |
| `npm run session:check` | PASS |
| `npm run gate:local` | FULL PASS, all 11 groups, `receipt:sha256:45349304b70ae8bab3de5a82` |
| fresh Node 20 `npm run gate:clean` | PASS, `nodeModulesReused=false`, `cleanBefore/cleanAfter=true`, `siblingWrites=0`, `clean-receipt:sha256:fb15a890643aa2be97fa0b7d` |
| real owner-local reproduction proof | PASS (1 passed, 27.7 s) |
| W10 real generality proof | PASS (2 passed, 18.8 s) |
| real historical ouchan product-path proof | PASS (1 passed, 1.6 m) |

### Lane provenance

All lanes ran in their own C-00 session worktrees, were reviewed by diff, were
reconciled against the integration head, and were re-validated after
reconciliation before integration. No lane integrated itself.

## Required non-claims

Until independently proven, do not claim:

- a previously unknown Alphaus defect;
- strict `EXACT_REDISCOVERY`;
- DEV/NEXT/production behavior;
- organizational approval;
- parent-programme completion.

## Programme verdict

`IN_PROGRESS` — W10 has been specified but no W10 implementation evidence exists yet.
