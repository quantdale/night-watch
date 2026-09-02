# Task State

## Identity

Task ID: nightwatch-proxy-gate-reliability-r11-v1
Phase: PROXY_GATE_RELIABILITY_R11_V1
Status: IN_PROGRESS
Starting SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
Last validated implementation SHA: 200221cf6c80fbab7f463680c44086e231bc034c
Last substantive checkpoint SHA: 200221cf6c80fbab7f463680c44086e231bc034c
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-proxy-gate-reliabilit-6e648bc4
Last checkpoint: 2026-09-02 — M1 through M7 closed. OBS-C105-1 reproduced and repaired; 20 deterministic adversarial lease cases plus a real-OS-TCP integration case green; bounded stress campaign green; durable confined atomic gate receipts wired into both gates with 30 adversarial cases; 29/29 hardening negative probes detected after repairing DEF-R11-1 and DEF-R11-2; Stage-A documentation truth and the obsolete T-30/T-41/T-42 digest semantics reconciled. The clean Node 20 gate then reproducibly falsified three defects in R-11's OWN new tests (DEF-R11-3/4/5), all repaired. Substantive checkpoint 200221c
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: c423e33e3384dd3ec34bfd4e9d57d863f58bc190
LAST_VALIDATED_IMPLEMENTATION_SHA: 200221cf6c80fbab7f463680c44086e231bc034c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 200221cf6c80fbab7f463680c44086e231bc034c
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PROXY_GATE_RELIABILITY_R11_V1_STATUS: IN_PROGRESS

## Objective

Close OBS-C105-1: make the proxy-lease tests deterministic and aligned with the
allocator's real contract, and make authoritative quality-gate receipts durable
and privacy-safe, so C-11 can be certified by a gate whose result carries
information and whose failures remain attributable.

## Current Milestone

Milestone ID: M8
Milestone status: IN_PROGRESS
What is being attempted: the full R-11 validation sequence — `gate:local`, the
complete canonical regression, and repeated independent `gate:clean`
invocations in the clean Node 20 topology, plus a deliberately induced real
TEST_FAILURE gate run to prove failure-receipt persistence end to end.

## Completed Milestones

- **M1 — Reproduce OBS-C105-1.** No repository file was edited first. Cases A–D
  exercised against the unmodified allocator: A returned the preferred port
  after reclaiming a stale lease; B advanced from `41010` to `41011` past a real
  occupying listener; C left a live-process lease byte-identical and advanced;
  D1 preserved malformed bytes and advanced; D2 preserved the symlink and its
  target and advanced. **Every allocator behavior is correct.** The current
  assertion `expect(lease.port).toBe(preferred)` was then evaluated on the
  Case-B lease and FAILED. End-to-end, with the exact PID-derived ports
  occupied, the real suite failed at
  `tests/unit/phase24ProxyLifecycle.test.ts:105` with
  `Expected: 21638 / Received: 21640` at line 128 — the same
  `failedLocations` value the exact-head CI receipt recorded. The same suite is
  5/5 green at the same commit with the ports free. Validation command:
  `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts --project=nightwatch --workers=1`.

- **M2 — Port-lease contract.** `7abe14e`. `proxyPortCandidates(preferred)`
  extracted as a pure function; the allocation loop factored into one core
  taking the availability predicate explicitly; `reserveProxyPortLease` binds
  the real `portAvailable` probe with no substitutable parameter;
  `reserveProxyPortLeaseWithAvailabilityForTest` added and branded TEST ONLY;
  `candidateOffset` and `preferredOutcome` added. Production behavior unchanged:
  `candidatePort` semantics are byte-identical. `typecheck` clean;
  `phase23PortLease` and `proxy` suites 9/9.

- **M3 — Deterministic adversarial suite.** `7abe14e`.
  `tests/unit/proxyPortLeaseDeterminism.test.ts`, 20 cases, all sixteen
  brief-specified conditions covered. The `phase24ProxyLifecycle` SIGTERM/SIGINT
  case no longer derives a port from `process.pid` and no longer asserts the
  preferred number; it asserts the orphan was re-owned with a fresh token, the
  endpoint is really available, and the reported outcome matches the candidate
  taken. A new case keeps REAL OS TCP coverage by binding port 0 and HOLDING
  that socket, so the occupied precondition exists by construction with no
  close-then-assume-free window. **Decisive check:** 26 tests pass with 18
  endpoints deliberately occupied, including the legacy PID-derived ports and
  the new fixed candidates — the condition that previously failed the required
  group.

- **M4 — Bounded stress campaign.** `7abe14e`.
  `tests/unit/proxyPortLeaseStress.test.ts`, 5 cases, exact asserted counts:
  200 real allocate/release cycles; 4 rounds x 6 parallel cross-process
  allocators (24 real leases) with no double assignment; 120 allocations against
  a real listener held on the preferred endpoint, all advancing; 60 child
  crashes between lease creation and release, all reclaimed; 1,000 rapid reclaim
  cycles yielding a singleton port set. 19.6s.

- **M5 — Durable gate receipts.** `1b9050b`. Confined validated destination with
  a safe automatic default; exclusive-create + fsync + atomic-rename write;
  ONE canonical string to both stdout and file; failure and environment
  receipts persisted; exit 3 on persistence failure; receipt path stripped from
  child environments. The clean wrapper reads the structured file, keeps stdout
  as a cross-check only, fails closed on digest disagreement, and writes outside
  the disposable clone. Verified live: the real gate's ENVIRONMENT_MISMATCH
  receipt persisted at mode 0600, byte-identical to stdout.

- **M6 — Adversarial receipt suite and hardening.** `1b9050b`, `22a2928`.
  `tests/unit/gateReceiptPersistence.test.ts`, 30 cases including every
  confinement refusal, symlink parent and destination with untouched sentinel,
  atomic write with no debris, a TEST_FAILURE round-trip preserving
  `failedLocations` / `didNotRun` / containment lane / NOT_RUN cascade, seven
  malformed-file refusals, stale head and mode, and two real gate spawns. One
  case reproduces the OBS-C105-1 channel failure directly: stdout polluted with
  a forged PASS receipt, scraping yields the forgery, the file yields the truth.
  `checkR11ProxyGateReliability` added. **29/29 negative probes detected** after
  DEF-R11-1 and DEF-R11-2 were found and repaired.

- **M7 — Stage-A and threat-model truth reconciliation.** `4649a29`. The false
  "EXACT head of `main`" claim about `29b9212` removed; run `33637832941` at
  `c423e33` recorded as the latest observed exact-head run; `29b9212` preserved
  as the C-10.5 certification checkpoint; the six checkpoint roles named
  explicitly to end the docs-certification regress; the stale `23523cc` prose
  cells reconciled to `c763c05`. T-30, T-41 and T-42 reconciled to D-113 after
  verifying `durableValueDigest: 'ABSENT'` and the absence of any salt in the
  production cone, each keeping its historical text under an explicit
  SUPERSEDED heading. `projectState` and `agent-state` suites 178/178.

## Work In Progress

M2 has not begun editing `src/proxy/portLease.ts`. The reproduction harness
lives in the session scratchpad only and is not a repository artifact.

## Exact Next Action

Edit `src/proxy/portLease.ts`: add pure `proxyPortCandidates(preferred)`,
factor the allocation loop into a module-private core taking an
`available: (port: number) => boolean` predicate, keep `reserveProxyPortLease`
binding `portAvailable` with no substitutable parameter, add
`reserveProxyPortLeaseWithAvailabilityForTest` branded `TEST ONLY`, and add the
`candidateOffset` / `preferredOutcome` fields to `ProxyPortLease`.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/SPEC.md` | task scope, safety, acceptance | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/PLAN.md` | milestones, approach, decisions | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/STATE.md` | execution memory | ADDED |
| `.agent/tasks/nightwatch-proxy-gate-reliability-r11-v1/REPORT.md` | closure record | ADDED |
| `.agent/ACTIVE_TASK.md` | active campaign is now R-11 | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | R-11 handoff | MODIFIED |
| `openspec/changes/nightwatch-proxy-gate-reliability-r11-v1/**` | dedicated OpenSpec change | ADDED |
| `src/proxy/portLease.ts` | pure candidate selection, explicit availability predicate, named allocation outcome, TEST ONLY seam | MODIFIED |
| `tests/unit/proxyPortLeaseDeterminism.test.ts` | 20 deterministic adversarial lease cases | ADDED |
| `tests/unit/proxyPortLeaseStress.test.ts` | bounded stress campaign with exact counts | ADDED |
| `tests/unit/phase24ProxyLifecycle.test.ts` | contract-based assertions; PID-derived port removed; real-OS-TCP occupied-endpoint case | MODIFIED |
| `tests/unit/support/portLeaseChild.mjs` | cross-process real-allocator child | ADDED |
| `bin/lib/gate-receipt.mjs` | confined, atomic, fail-closed receipt persistence | MODIFIED |
| `bin/lib/gate-receipt.d.mts` | types for the receipt boundary | ADDED |
| `bin/quality-gate.mjs` | pre-group destination validation; single canonical emit path | MODIFIED |
| `bin/quality-gate-clean.mjs` | consumes the structured receipt file; digest cross-check | MODIFIED |
| `tests/unit/gateReceiptPersistence.test.ts` | 30 adversarial receipt cases | ADDED |
| `tests/unit/syntheticCampaignDiagnostics.test.ts` | explicit non-null assertions once the boundary became typed | MODIFIED |
| `bin/hardening-check.mjs` | `checkR11ProxyGateReliability`, 29 negative-probed rules | MODIFIED |
| `config/semantic-compatibility.v1.json` | registers the three new suites | MODIFIED |
| `docs/CURRENT_STATE.md` | Stage-A truth and the checkpoint-role model | MODIFIED |
| `docs/design/PRODUCTION-OBSERVABILITY-THREAT-MODEL.md` | T-30/T-41/T-42 reconciled to D-113 | MODIFIED |

## Validation Ledger

Command: `npx playwright test --project=nightwatch --workers=1` (complete canonical regression)
Result: PASS
When: 2026-09-02
Relevant failure/output summary: 3,031 total / 3,018 passed / 13 skipped / 0 failed. C-10.5 baseline was 2,975/2,962/13/0, so +56 tests and no new skip.

Command: `npm run gate:local`
Result: PASS at `5a4da2f`
When: 2026-09-02
Relevant failure/output summary: all eleven required groups PASS on Node 22, receipt `receipt:sha256:9bb74f33208cf27b0db4963a`; SEMANTIC_COMPATIBILITY 2,031/2,018/13/0, OWNER_PROVENANCE 91 passed, SYNTHETIC_CAMPAIGN 256/256 with `deepContainmentLane: PROVEN`.

Command: `npm run gate:clean` x2 (independent invocations) at `5a4da2f`
Result: FAIL both times, reproducibly, at SEMANTIC_COMPATIBILITY
When: 2026-09-02
Relevant failure/output summary: run 1 `clean-receipt:sha256:7bdcebf7c54432cd1c59c5d2` (3 failed, 14 skipped), run 2 `clean-receipt:sha256:c779cfcfccc2e2b87eb346b5` (2 failed, 14 skipped). `gateReceiptSource: STRUCTURED_FILE`, file and stdout receipt digests EQUAL, `siblingWrites: 0`, `cleanBefore`/`cleanAfter` true. Failing locations named directly by the receipt: `gateReceiptPersistence.test.ts:64`, `gateReceiptPersistence.test.ts:326`, `proxyPortLeaseDeterminism.test.ts:455`. All three are defects in R-11's own new tests — DEF-R11-3, DEF-R11-5 and the load-sensitive readiness deadline — plus DEF-R11-4, the 13→14 skip. Repaired at `200221c`.

Command: exact-head GitHub Actions run `33649946137` at `3c4756c`
Result: FAIL — one group, `PROJECT_TRUTH`
When: 2026-09-02
Relevant failure/output summary: receipt `receipt:sha256:97cd10d99d6eeaaa3c60ef43`, Node 20, `environmentClass: CI`; the seven later groups `NOT_RUN`. Cause was the baseline ordering constraint only: the CI anchor still named C-10.5's `29b9212` while the validated implementation had advanced. Diagnosed in one command against the retained job log.

Command: `npx playwright test <five proxy and receipt suites>` after the DEF-R11-3/4/5 repairs
Result: PASS
When: 2026-09-03
Relevant failure/output summary: 67 passed, 0 skipped.

Command: six independent invocations of `phase24ProxyLifecycle` + `proxyPortLeaseDeterminism` + `phase23PortLease`
Result: PASS 6/6
When: 2026-09-02
Relevant failure/output summary: 31 passed on every attempt; no runner retry configured anywhere.

Command: eight independent invocations of `proxyPortLeaseDeterminism` under Node 20 in a disposable /tmp clone
Result: PASS 8/8
When: 2026-09-02
Relevant failure/output summary: 20 passed on every attempt.

Command: `git rev-parse origin/main`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `c423e33e3384dd3ec34bfd4e9d57d863f58bc190`, matching the authorized starting truth.

Command: `gh run view 33637832941`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `conclusion: success`, `headSha: c423e33e…`, job `100273053129`, workflow `Nightwatch hardening`.

Command: `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts --project=nightwatch --workers=1`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: 5 passed with the preferred ports free — the baseline the reproduction is measured against.

Command: reproduction harness, Cases A–D, unmodified allocator
Result: PASS (allocator correct in all four cases); OBS-C105-1 REPRODUCED
When: 2026-09-02
Relevant failure/output summary: Case B `lease.port=41011` vs `preferred=41010`; the current test assertion fails on that lease while the allocator is correct.

Command: end-to-end reproduction with the PID-derived ports occupied
Result: REPRODUCED
When: 2026-09-02
Relevant failure/output summary: `tests/unit/phase24ProxyLifecycle.test.ts:105`, `Expected: 21638 / Received: 21640` at line 128 — identical to the CI receipt's `failedLocations`.

Command: `npm run project:check`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: baseline green before any edit; `ciObservedSha` `29b9212` recorded for M7 reconciliation.

Command: `npm run session:status`
Result: PASS
When: 2026-09-02
Relevant failure/output summary: `WORKSPACE_INTEGRITY_SATISFIED`; canonical clean; owned session worktree claimed as `sess-df51b93c3d63`.

## Decisions Made During This Task

Decision: Reproduce OBS-C105-1 both at unit level and end-to-end before editing.
Reason: The C-10.5 attribution was explicitly an inference, not proof.
Evidence/constraint: The end-to-end failure carries the same `failedLocations` value as the CI receipt.

Decision: Repair the test, not the allocator.
Reason: The allocator is correct in all four brief-specified cases; changing production behavior to preserve an over-strong assertion is forbidden by the brief and would be a real regression.
Evidence/constraint: Cases A–D observations above.

Decision: No GitHub Actions artifact upload.
Reason: `checkPhase23QualityGate` forbids `upload-artifact`, caps the workflow at two run commands, and admits only `actions/checkout@v4` and `actions/setup-node@v4`; weakening a hardening rule is forbidden.
Evidence/constraint: The rule text in `bin/hardening-check.mjs`; the brief permits justifying the artifact away.

## Discoveries

- The end-to-end reproduction advanced two candidates because both PID-derived
  ports were occupied. Correct bounded-search behavior, not a second defect.
- `docs/CURRENT_STATE.md` carried an independent staleness the validator cannot
  see: the project-state v2 prose table still named `23523cc` as the current
  `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA` while the machine-checked block said
  `c763c05`. Repaired in M7.
- Adding `bin/lib/gate-receipt.d.mts` typed a module that had been imported with
  `@ts-expect-error`, which immediately surfaced a latent nullability gap in
  `tests/unit/syntheticCampaignDiagnostics.test.ts`. Repaired by asserting
  presence explicitly, which is what those cases mean anyway.
- **DEF-R11-1 and DEF-R11-2, both introduced by this campaign and both found by
  negative probing rather than by review.** Two new hardening rules matched an
  identifier that also occurs elsewhere in the same file, so deleting the
  load-bearing occurrence left the rule satisfied. The live-owner rule would
  have permitted deleting a lease owned by a LIVE process; the
  child-environment rule would have permitted a child overwriting the run's own
  receipt. Both are anchored now and both mutations are detected. This is the
  concrete argument for the brief's "never merely trust regex presence".
- The workflow cannot host an Actions artifact without weakening three existing
  hardening rules (`upload-artifact` forbidden, exactly two run commands, only
  `actions/checkout@v4` and `actions/setup-node@v4`). Justified away rather than
  taken; CI attribution comes from the complete receipt in the retained job log.
- **DEF-R11-3.** A new receipt test asserted "the repository is never inside a
  permitted temporary root". FALSE in the clean topology, which clones into
  `os.tmpdir()`. It also hid something load-bearing: there, confinement alone
  would admit a destination inside the tracked tree, so the
  inside-repository refusal — and its ORDER before the confinement check — is
  the only thing protecting a tracked file. The replacement asserts exactly
  that, plus that a sibling directory in the same root is still accepted.
- **DEF-R11-4.** The byte-identity case keyed off "Node major is not 20" to
  reach a fast gate refusal, so it SKIPPED in the clean and CI topologies,
  taking skipped from 13 to 14 — a new skipped test, which R-11 must not
  introduce. Replaced with a minimal gate root carrying no `package-lock.json`,
  which reaches `ENVIRONMENT_MISMATCH` on any Node major.
- **DEF-R11-5.** Two cases spawned the gate with `{ ...process.env }` and
  asserted the child's stderr was exactly one JSON document. Root cause
  captured verbatim rather than inferred: `Warning: The 'NO_COLOR' env is
  ignored due to the 'FORCE_COLOR' env being set.` Playwright's worker exports
  `FORCE_COLOR` while the gate launcher sets `NO_COLOR=1`, and a child
  inheriting both makes Node 20 warn on stderr — hence passing under a bare
  `npx playwright test` and failing under the gate. This is the SAME defect
  class as OBS-C105-1: an uncontrolled ambient input. Fixed by giving the
  spawned gate a minimal explicit environment.
- Both proxy suites replaced poll-a-file-against-a-deadline waits with an
  explicit child readiness event. The SIGTERM/SIGINT case had failed once under
  the clean gate's load and passed otherwise. This is not timeout inflation: no
  assertion depends on elapsed time, so the remaining bounds are liveness
  guards documented as such, and correctness now rests on an observable event.
- The repository's own cross-authority invariant FORCES the closure ordering.
  `project:check` refuses a baseline whose CI anchor certifies a commit older
  than the validated implementation, so a campaign that changes implementation
  cannot have a self-consistent baseline — and therefore cannot pass
  `gate:local` or `gate:clean` — until CI has executed at that implementation.
  Integration necessarily precedes the CI and validation anchors, as in C-10.5.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- C-11 `PROD_OBSERVE`, gated behind the R-11 completion gate.

## Resume Recipe

1. Read SPEC.
2. Read PLAN, especially the Decision Log.
3. Read the OpenSpec `audit.md`; OBS-C105-1 is already reproduced — do not
   rediscover it.
4. Inspect `git status` and the current SHA in the owned session worktree.
5. Run `npx playwright test tests/unit/phase24ProxyLifecycle.test.ts tests/unit/phase23PortLease.test.ts --project=nightwatch --workers=1`.
6. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete — with real evidence, never placeholders.
