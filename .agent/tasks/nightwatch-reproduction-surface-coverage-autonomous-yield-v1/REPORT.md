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
